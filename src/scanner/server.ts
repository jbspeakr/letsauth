/**
 * The on-demand service (contracts/service.md): the site's only backend. Stateless; stores
 * nothing; sends only the well-known requests the scanner library makes. Run with
 * `pnpm scan:serve`; the container image runs the same.
 */

import {
  createServer as createHttpServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { fileURLToPath } from "node:url";
import type { Dataset } from "../lib/data";
import { type Fetcher, nodeFetcher } from "./fetch";
import { defaultResolver, type Guard, guardUrl, type Resolver } from "./guard";
import { scan } from "./report";
import { SCANNER_ID } from "./version";

export interface ServerOptions {
  data: Dataset;
  fetcher?: Fetcher;
  resolve?: Resolver;
  allowedOrigin?: string;
  ratePerMinute?: number;
  maxConcurrent?: number;
  maxBodyBytes?: number;
  now?: () => number;
}

interface Bucket {
  tokens: number;
  updated: number;
}

function clientAddress(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  return first || req.socket.remoteAddress || "unknown";
}

function readBody(req: IncomingMessage, maxBytes: number): Promise<string | undefined> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let over = false;
    // an oversized body is drained and discarded so the 400 can still be sent on the same socket
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) over = true;
      else chunks.push(chunk);
    });
    req.on("end", () => resolve(over ? undefined : Buffer.concat(chunks).toString("utf8")));
    req.on("error", () => resolve(undefined));
  });
}

export function createServer(options: ServerOptions) {
  const allowedOrigin = options.allowedOrigin ?? "https://letsauth.eu";
  const ratePerMinute = options.ratePerMinute ?? 6;
  const maxConcurrent = options.maxConcurrent ?? 4;
  const maxBodyBytes = options.maxBodyBytes ?? 4096;
  const now = options.now ?? (() => Date.now());
  const resolve = options.resolve ?? defaultResolver;
  const guard: Guard = (url) => guardUrl(url, resolve);
  const fetcher = options.fetcher ?? nodeFetcher({ timeoutMs: 10_000, guard });
  const buckets = new Map<string, Bucket>();
  let running = 0;

  function allow(address: string): boolean {
    const t = now();
    const b = buckets.get(address) ?? { tokens: ratePerMinute, updated: t };
    b.tokens = Math.min(ratePerMinute, b.tokens + ((t - b.updated) / 60_000) * ratePerMinute);
    b.updated = t;
    if (b.tokens < 1) {
      buckets.set(address, b);
      return false;
    }
    b.tokens -= 1;
    buckets.set(address, b);
    if (buckets.size > 10_000) buckets.clear(); // bounded memory; a flush only resets limits
    return true;
  }

  function send(res: ServerResponse, status: number, body: unknown): void {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    });
    res.end(JSON.stringify(body));
  }

  async function handleScan(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
    let target: string | undefined;
    if (req.method === "GET") {
      target = url.searchParams.get("url") ?? undefined;
    } else {
      const body = await readBody(req, maxBodyBytes);
      if (body === undefined)
        return send(res, 400, { error: "request body too large or unreadable" });
      try {
        const parsed: unknown = JSON.parse(body || "{}");
        target =
          typeof parsed === "object" && parsed !== null
            ? ((parsed as { url?: unknown }).url as string | undefined)
            : undefined;
      } catch {
        return send(res, 400, { error: "request body is not JSON" });
      }
    }
    if (typeof target !== "string" || target.trim() === "")
      return send(res, 400, { error: "url is required" });
    if (!allow(clientAddress(req)))
      return send(res, 429, { error: "rate limited; try again in a minute" });
    const guarded = await guard(target);
    if (!guarded.ok) return send(res, 400, { error: guarded.reason });
    if (running >= maxConcurrent) return send(res, 503, { error: "busy; try again shortly" });
    running += 1;
    try {
      const report = await scan({ url: guarded.url }, options.data, { fetcher, guard });
      send(res, 200, report);
    } catch (err) {
      send(res, 500, { error: `scan failed: ${(err as Error).message}` });
    } finally {
      running -= 1;
    }
  }

  return createHttpServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
      });
      res.end();
      return;
    }
    if (url.pathname === "/healthz" && req.method === "GET") {
      send(res, 200, { ok: true, scanner: SCANNER_ID });
      return;
    }
    if (url.pathname === "/scan" && (req.method === "GET" || req.method === "POST")) {
      void handleScan(req, res, url);
      return;
    }
    send(res, 404, { error: "not found" });
  });
}

async function main(): Promise<void> {
  const { getDataset } = await import("../lib/data");
  const port = Number(process.env.PORT ?? 8080);
  const server = createServer({
    data: getDataset(),
    allowedOrigin: process.env.SCANNER_ALLOWED_ORIGIN,
    ratePerMinute: process.env.SCANNER_RATE_PER_MINUTE
      ? Number(process.env.SCANNER_RATE_PER_MINUTE)
      : undefined,
    maxConcurrent: process.env.SCANNER_MAX_CONCURRENT
      ? Number(process.env.SCANNER_MAX_CONCURRENT)
      : undefined,
  });
  server.listen(port, () => console.log(`${SCANNER_ID} listening on :${port}`));
  const stop = () => server.close(() => process.exit(0));
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void main();
}
