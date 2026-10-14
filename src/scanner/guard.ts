import { promises as dns } from "node:dns";
import { isIP } from "node:net";

/**
 * Decides whether a URL may be scanned at all (research R3): HTTPS, no credentials, the default
 * port, a host name (not an address) that is not local, and only public addresses behind it.
 * The on-demand service takes URLs from strangers; the well-known paths derived from them must
 * not become a way to read an internal network's metadata.
 */

export type Resolver = (hostname: string) => Promise<string[]>;

export type GuardResult = { ok: true; url: string } | { ok: false; reason: string };

export const defaultResolver: Resolver = async (hostname) => {
  const found = await dns.lookup(hostname, { all: true, verbatim: true });
  return found.map((a) => a.address);
};

const LOCAL_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa", ".lan"];

function ipv4Octets(ip: string): number[] | undefined {
  const parts = ip.split(".");
  if (parts.length !== 4) return undefined;
  const octets = parts.map((p) => Number(p));
  return octets.every((o) => Number.isInteger(o) && o >= 0 && o <= 255) ? octets : undefined;
}

function isPublicIpv4(ip: string): boolean {
  const o = ipv4Octets(ip);
  if (!o) return false;
  const [a, b, c] = o as [number, number, number, number];
  if (a === 0 || a === 10 || a === 127) return false; // this network, private, loopback
  if (a === 100 && b >= 64 && b <= 127) return false; // carrier-grade NAT
  if (a === 169 && b === 254) return false; // link-local
  if (a === 172 && b >= 16 && b <= 31) return false; // private
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return false; // IETF assignments, TEST-NET-1
  if (a === 192 && b === 168) return false; // private
  if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking
  if (a === 198 && b === 51 && c === 100) return false; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return false; // TEST-NET-3
  if (a >= 224) return false; // multicast, reserved, broadcast
  return true;
}

/** Expands an IPv6 address to eight 16-bit groups; undefined when it does not parse. */
function ipv6Groups(ip: string): number[] | undefined {
  let text = ip;
  const zone = text.indexOf("%");
  if (zone >= 0) text = text.slice(0, zone);
  // an embedded IPv4 tail (::ffff:1.2.3.4) becomes two groups
  const v4 = text.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const o = ipv4Octets(v4[2] ?? "");
    if (!o) return undefined;
    const [a, b, c, d] = o as [number, number, number, number];
    text = `${v4[1]}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return undefined;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return undefined;
  const groups = [...head, ...Array<string>(missing).fill("0"), ...tail].map((g) =>
    /^[0-9a-f]{1,4}$/i.test(g) ? Number.parseInt(g, 16) : Number.NaN,
  );
  return groups.some((g) => Number.isNaN(g)) ? undefined : groups;
}

function isPublicIpv6(ip: string): boolean {
  const g = ipv6Groups(ip);
  if (!g) return false;
  const [g0, g1, g2, g3, g4, g5, g6, g7] = g as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const leading = g.slice(0, 5).every((x) => x === 0);
  if (leading && g5 === 0 && g6 === 0 && (g7 === 0 || g7 === 1)) return false; // :: and ::1
  if (leading && g5 === 0xffff) {
    // IPv4-mapped: judge the embedded address
    return isPublicIpv4(`${g6 >> 8}.${g6 & 0xff}.${g7 >> 8}.${g7 & 0xff}`);
  }
  if (g0 === 0x64 && g1 === 0xff9b && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0) {
    return isPublicIpv4(`${g6 >> 8}.${g6 & 0xff}.${g7 >> 8}.${g7 & 0xff}`); // NAT64
  }
  if ((g0 & 0xfe00) === 0xfc00) return false; // unique local fc00::/7
  if ((g0 & 0xffc0) === 0xfe80) return false; // link-local fe80::/10
  if ((g0 & 0xffc0) === 0xfec0) return false; // site-local (deprecated) fec0::/10
  if ((g0 & 0xff00) === 0xff00) return false; // multicast
  if (g0 === 0x2001 && g1 === 0x0db8) return false; // documentation
  if (g0 === 0 && !leading) return false; // other ::/8 oddities
  return true;
}

/** True for a globally routable unicast address; false for anything private, local or reserved. */
export function isPublicAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isPublicIpv4(ip);
  if (kind === 6) return isPublicIpv6(ip);
  return false;
}

export async function guardUrl(
  input: string,
  resolve: Resolver = defaultResolver,
): Promise<GuardResult> {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { ok: false, reason: "not a valid URL" };
  }
  if (url.protocol !== "https:") return { ok: false, reason: "only https: URLs are scanned" };
  if (url.username || url.password)
    return { ok: false, reason: "the URL must not carry credentials" };
  if (url.port !== "") return { ok: false, reason: "only the default HTTPS port (443) is scanned" };
  const host = url.hostname.toLowerCase();
  const bare = host.replace(/^\[|\]$/g, "");
  if (isIP(bare)) return { ok: false, reason: "IP addresses are not scanned; use a host name" };
  if (host === "localhost" || LOCAL_SUFFIXES.some((s) => host.endsWith(s)) || !host.includes(".")) {
    return { ok: false, reason: `"${host}" is not a public host name` };
  }
  let addresses: string[];
  try {
    addresses = await resolve(host);
  } catch {
    return { ok: false, reason: `"${host}" does not resolve` };
  }
  if (addresses.length === 0) return { ok: false, reason: `"${host}" does not resolve` };
  const hidden = addresses.find((a) => !isPublicAddress(a));
  if (hidden) return { ok: false, reason: `"${host}" resolves to a non-public address` };
  url.hash = "";
  return { ok: true, url: url.href };
}

export type Guard = (url: string) => Promise<GuardResult>;
