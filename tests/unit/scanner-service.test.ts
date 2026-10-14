import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDataset } from "@/lib/data";
import { type Fixture, recordingFetcher } from "@/scanner/fetch";
import { createServer } from "@/scanner/server";

const fixture = JSON.parse(
  readFileSync(resolve(__dirname, "../fixtures/scanner/complete.json"), "utf8"),
) as Fixture;

const addresses: Record<string, string[]> = {
  "mcp.example.com": ["93.184.216.34"],
  "auth.example.com": ["93.184.216.34"],
  "internal.example.com": ["10.0.0.5"],
};

let clock = 0;
const fetcher = recordingFetcher(fixture);
const server = createServer({
  data: getDataset(),
  fetcher,
  resolve: async (host) => addresses[host] ?? [],
  ratePerMinute: 6,
  now: () => clock,
});
let base = "";

beforeAll(async () => {
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

const post = (body: unknown, raw = false) =>
  fetch(`${base}/scan`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.7" },
    body: raw ? (body as string) : JSON.stringify(body),
  });

describe("on-demand service (contracts/service.md)", () => {
  it("answers /healthz", async () => {
    const res = await fetch(`${base}/healthz`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, scanner: "letsauth-scanner/0.1.0" });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("scans a public target and makes only the well-known requests (SC-006)", async () => {
    fetcher.requests.length = 0;
    const res = await post({ url: fixture.target });
    expect(res.status).toBe(200);
    const report = await res.json();
    expect(report.recorded).toBe(false);
    expect(report.target).toEqual({ url: fixture.target, server: null });
    expect(report.grade.letter).toBe("A");
    expect(report.observations).toEqual([]);
    expect(fetcher.requests).toEqual([
      "https://mcp.example.com/.well-known/oauth-protected-resource/mcp",
      "https://auth.example.com/.well-known/oauth-authorization-server",
    ]);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://letsauth.eu");
  });

  it("accepts GET with a query string", async () => {
    const res = await fetch(`${base}/scan?url=${encodeURIComponent(fixture.target)}`, {
      headers: { "x-forwarded-for": "198.51.100.8" },
    });
    expect(res.status).toBe(200);
    expect((await res.json()).checks.length).toBeGreaterThan(0);
  });

  it.each([
    ["http://mcp.example.com/mcp", /https/],
    ["https://127.0.0.1/mcp", /IP address/],
    ["https://user:pw@mcp.example.com/mcp", /credentials/],
    ["https://mcp.example.com:8443/mcp", /port/],
    ["not a url", /not a valid URL/],
    ["https://internal.example.com/mcp", /non-public/],
  ])("refuses %s with the reason", async (url, reason) => {
    const res = await fetch(`${base}/scan`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200) + 20}`,
      },
      body: JSON.stringify({ url }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(reason);
  });

  it("refuses a missing url, a non-JSON body and an oversized body", async () => {
    expect((await post({})).status).toBe(400);
    expect((await post("{nope", true)).status).toBe(400);
    const big = await post(`{"url":"${"x".repeat(5000)}"}`, true);
    expect(big.status).toBe(400);
  });

  it("rate-limits the seventh scan within a minute from one address", async () => {
    clock = 60_000 * 10;
    const results: number[] = [];
    for (let i = 0; i < 7; i += 1) {
      const res = await fetch(`${base}/scan`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
        body: JSON.stringify({ url: fixture.target }),
      });
      results.push(res.status);
    }
    expect(results.slice(0, 6).every((s) => s === 200)).toBe(true);
    expect(results[6]).toBe(429);
    clock += 60_000;
    const later = await fetch(`${base}/scan`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
      body: JSON.stringify({ url: fixture.target }),
    });
    expect(later.status).toBe(200);
  });

  it("answers OPTIONS with the CORS headers and unknown paths with 404", async () => {
    const opt = await fetch(`${base}/scan`, { method: "OPTIONS" });
    expect(opt.status).toBe(204);
    expect(opt.headers.get("access-control-allow-methods")).toContain("POST");
    const missing = await fetch(`${base}/nope`);
    expect(missing.status).toBe(404);
  });
});
