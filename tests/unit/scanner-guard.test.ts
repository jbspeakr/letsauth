import { describe, expect, it } from "vitest";
import { guardUrl, isPublicAddress, type Resolver } from "@/scanner/guard";

const publicV4 = "93.184.216.34";
const publicV6 = "2606:2800:220:1:248:1893:25c8:1946";
const resolving =
  (addresses: string[]): Resolver =>
  async () =>
    addresses;

describe("isPublicAddress", () => {
  it.each([
    "10.0.0.1",
    "127.0.0.1",
    "169.254.1.1",
    "100.64.0.1",
    "172.16.5.5",
    "192.168.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "::",
    "fc00::1",
    "fd12::1",
    "fe80::1",
    "::ffff:192.168.0.1",
    "::ffff:10.1.1.1",
    "64:ff9b::a00:1",
    "2001:db8::1",
    "ff02::1",
    "not an address",
  ])("rejects %s", (ip) => {
    expect(isPublicAddress(ip)).toBe(false);
  });

  it.each([publicV4, publicV6, "::ffff:93.184.216.34", "1.1.1.1"])("accepts %s", (ip) => {
    expect(isPublicAddress(ip)).toBe(true);
  });
});

describe("guardUrl (FR-010, SC-006)", () => {
  it("accepts a public HTTPS URL and strips the fragment", async () => {
    const r = await guardUrl("https://mcp.example.com/mcp#x", resolving([publicV4, publicV6]));
    expect(r).toEqual({ ok: true, url: "https://mcp.example.com/mcp" });
  });

  it.each([
    ["http://mcp.example.com/mcp", /https/],
    ["https://user:pw@mcp.example.com/mcp", /credentials/],
    ["https://mcp.example.com:8443/mcp", /port/],
    ["https://localhost/mcp", /public host name/],
    ["https://svc.local/mcp", /public host name/],
    ["https://svc.internal/mcp", /public host name/],
    ["https://foo.localhost/mcp", /public host name/],
    ["https://intranet/mcp", /public host name/],
    ["https://127.0.0.1/mcp", /IP address/],
    ["https://[::1]/mcp", /IP address/],
    ["not a url", /not a valid URL/],
    ["", /not a valid URL/],
  ])("refuses %s", async (url, reason) => {
    const r = await guardUrl(url, resolving([publicV4]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(reason);
  });

  it.each([
    "10.0.0.1",
    "127.0.0.1",
    "169.254.1.1",
    "100.64.0.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:192.168.0.1",
  ])("refuses a name that resolves to %s", async (ip) => {
    const r = await guardUrl("https://mcp.example.com/mcp", resolving([publicV4, ip]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/non-public address/);
  });

  it("refuses a name that does not resolve", async () => {
    expect((await guardUrl("https://mcp.example.com/", resolving([]))).ok).toBe(false);
    const failing: Resolver = async () => {
      throw new Error("ENOTFOUND");
    };
    const r = await guardUrl("https://mcp.example.com/", failing);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/does not resolve/);
  });
});
