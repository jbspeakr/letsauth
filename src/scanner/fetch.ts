import type { Guard } from "./guard";
import { USER_AGENT } from "./version";

/**
 * The one way the scanner talks to the network (research R2): GET, HTTPS, a timeout, a body cap,
 * redirects followed only to the same host over HTTPS. `Fetcher` is injected so the whole
 * pipeline runs over recorded responses in tests, which must not touch the network.
 */

export type FetchError =
  | "timeout"
  | "connection"
  | "tls"
  | "redirect"
  | "not-json"
  | "too-large"
  | "refused"
  | "server-error";

/** found: 2xx and a JSON object. absent: a definite answer without one (4xx, or 2xx that is not JSON). error: no answer to judge by. */
export type FetchKind = "found" | "absent" | "error";

export interface FetchResult {
  url: string;
  kind: FetchKind;
  /** HTTP status, or null when no response arrived. */
  status: number | null;
  contentType?: string;
  /** The parsed JSON object when `kind` is "found". */
  json?: Record<string, unknown>;
  error?: FetchError;
  /** One line a reader can act on: the redirect target, the exception name, the byte count. */
  detail?: string;
}

export type Fetcher = (url: string) => Promise<FetchResult>;

export interface NodeFetcherOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  /** Re-run on every redirect target; the initial URL is guarded by the caller. */
  guard?: Guard;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Classifies a thrown fetch error by its cause, without depending on undici's types. */
function classify(err: unknown): { error: FetchError; detail: string } {
  const e = err as {
    name?: string;
    code?: string;
    cause?: { code?: string; message?: string };
    message?: string;
  };
  if (e?.name === "TimeoutError" || e?.name === "AbortError")
    return { error: "timeout", detail: "timed out" };
  const code = e?.cause?.code ?? e?.code ?? "";
  if (/CERT|TLS|SSL|EPROTO|UNABLE_TO_VERIFY|DEPTH_ZERO|SELF_SIGNED|HOSTNAME_MISMATCH/i.test(code)) {
    return { error: "tls", detail: code };
  }
  return { error: "connection", detail: code || e?.cause?.message || e?.message || "failed" };
}

async function readCapped(res: Response, maxBytes: number): Promise<string | undefined> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      return undefined;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/** Node 22's global fetch, dressed for the scanner. */
export function nodeFetcher(options: NodeFetcherOptions = {}): Fetcher {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxBytes = options.maxBytes ?? 1_048_576;
  const maxRedirects = options.maxRedirects ?? 3;
  return async (start) => {
    let url = start;
    for (let hop = 0; ; hop += 1) {
      let res: Response;
      try {
        res = await fetch(url, {
          method: "GET",
          redirect: "manual",
          headers: { Accept: "application/json", "User-Agent": USER_AGENT },
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        return { url, kind: "error", status: null, ...classify(err) };
      }
      const status = res.status;
      const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || undefined;
      if (status >= 300 && status < 400) {
        const location = res.headers.get("location");
        await res.body?.cancel().catch(() => {});
        if (!location)
          return { url, kind: "error", status, error: "redirect", detail: "no Location header" };
        let next: URL;
        try {
          next = new URL(location, url);
        } catch {
          return {
            url,
            kind: "error",
            status,
            error: "redirect",
            detail: `bad Location "${location}"`,
          };
        }
        const from = new URL(url);
        if (next.protocol !== "https:" || next.host !== from.host || hop >= maxRedirects) {
          return {
            url,
            kind: "error",
            status,
            error: "redirect",
            detail: `not followed to ${next.href}`,
          };
        }
        if (options.guard) {
          const g = await options.guard(next.href);
          if (!g.ok)
            return {
              url,
              kind: "error",
              status,
              error: "redirect",
              detail: `not followed to ${next.href}: ${g.reason}`,
            };
        }
        url = next.href;
        continue;
      }
      if (status >= 500) {
        await res.body?.cancel().catch(() => {});
        return {
          url,
          kind: "error",
          status,
          contentType,
          error: "server-error",
          detail: `HTTP ${status}`,
        };
      }
      if (status < 200 || status >= 300) {
        await res.body?.cancel().catch(() => {});
        return { url, kind: "absent", status, contentType };
      }
      const text = await readCapped(res, maxBytes);
      if (text === undefined)
        return {
          url,
          kind: "error",
          status,
          contentType,
          error: "too-large",
          detail: `body over ${maxBytes} bytes`,
        };
      try {
        const json: unknown = JSON.parse(text);
        if (!isObject(json))
          return {
            url,
            kind: "absent",
            status,
            contentType,
            error: "not-json",
            detail: "JSON but not an object",
          };
        return { url, kind: "found", status, contentType, json };
      } catch {
        return {
          url,
          kind: "absent",
          status,
          contentType,
          error: "not-json",
          detail: `${contentType ?? "unknown content type"}, not JSON`,
        };
      }
    }
  };
}

/** A recorded response for tests and the quickstart fixture server. */
export interface FixtureResponse {
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
  error?: "timeout" | "connection" | "tls";
}

export interface Fixture {
  /** The MCP server URL the fixture describes. */
  target: string;
  /** URL → response. A URL not listed answers 404. */
  responses: Record<string, FixtureResponse>;
}

export interface RecordingFetcher extends Fetcher {
  /** Every URL asked, in order. */
  requests: string[];
}

/** Answers from a fixture and records every URL asked; never touches the network. */
export function recordingFetcher(fixture: Fixture): RecordingFetcher {
  const requests: string[] = [];
  const fetcher = (async (url: string): Promise<FetchResult> => {
    requests.push(url);
    const r = fixture.responses[url];
    if (!r) return { url, kind: "absent", status: 404 };
    if (r.error) {
      const detail =
        r.error === "timeout"
          ? "timed out"
          : r.error === "tls"
            ? "CERT_HAS_EXPIRED"
            : "ECONNREFUSED";
      return { url, kind: "error", status: null, error: r.error, detail };
    }
    const status = r.status ?? 200;
    const contentType = r.headers?.["content-type"]?.split(";")[0]?.trim();
    if (status >= 300 && status < 400) {
      return {
        url,
        kind: "error",
        status,
        error: "redirect",
        detail: `not followed to ${r.headers?.location ?? "?"}`,
      };
    }
    if (status >= 500)
      return {
        url,
        kind: "error",
        status,
        contentType,
        error: "server-error",
        detail: `HTTP ${status}`,
      };
    if (status < 200 || status >= 300) return { url, kind: "absent", status, contentType };
    const body = typeof r.body === "string" ? safeParse(r.body) : r.body;
    if (!isObject(body))
      return {
        url,
        kind: "absent",
        status,
        contentType,
        error: "not-json",
        detail: `${contentType ?? "unknown content type"}, not JSON`,
      };
    return { url, kind: "found", status, contentType, json: body };
  }) as RecordingFetcher;
  fetcher.requests = requests;
  return fetcher;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
