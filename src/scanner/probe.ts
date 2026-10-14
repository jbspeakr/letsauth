import type { FetchError, Fetcher, FetchResult } from "./fetch";
import type { Guard } from "./guard";
import { wellKnownAsUrls, wellKnownPrmUrls } from "./urls";

/**
 * Reads the public metadata of one MCP server: the protected resource metadata at its two
 * well-known locations, then the first authorization server's metadata at its three. Records
 * every request. Judges nothing; the checks do that.
 */

export interface RequestRecord {
  url: string;
  status: number | null;
  /** True when a JSON object was fetched. */
  ok: boolean;
  contentType?: string;
  error?: FetchError;
  detail?: string;
}

export type Outcome = "found" | "absent" | "error";

export interface PrmInfo {
  url: string;
  location: "path-aware" | "root";
  doc: Record<string, unknown>;
  resource?: string;
  authorizationServers: string[];
  scopesSupported?: string[];
}

export interface AsInfo {
  issuer: string;
  url: string;
  doc: Record<string, unknown>;
  /** Every `*_endpoint` and `jwks_uri` value that is a string, by field name. */
  endpoints: Record<string, string>;
  codeChallengeMethodsSupported?: string[];
  clientIdMetadataDocumentSupported?: unknown;
  registrationEndpoint?: string;
  authorizationResponseIssParameterSupported?: unknown;
}

export interface Probe {
  target: string;
  requests: RequestRecord[];
  prm?: PrmInfo;
  prmOutcome: Outcome;
  /** The last request made for the PRM: the decisive one when absent or in error. */
  prmLast?: RequestRecord;
  /** The issuer judged, when the PRM named one. */
  issuer?: string;
  as?: AsInfo;
  asOutcome: Outcome | "no-issuer";
  asLast?: RequestRecord;
  /** Further issuers the PRM named; not checked by this scanner version. */
  othersNotChecked: string[];
}

/** One authorization server's metadata is fetched once per run even when many servers share it. */
export interface AsCacheEntry {
  requests: RequestRecord[];
  as?: AsInfo;
  outcome: Outcome;
  last?: RequestRecord;
}

export interface ProbeOptions {
  fetcher: Fetcher;
  /** Runs on the issuer before its metadata is fetched; the target is guarded by the caller. */
  guard?: Guard;
  asCache?: Map<string, AsCacheEntry>;
}

function toRecord(r: FetchResult): RequestRecord {
  const rec: RequestRecord = { url: r.url, status: r.status, ok: r.kind === "found" };
  if (r.contentType) rec.contentType = r.contentType;
  if (r.error) rec.error = r.error;
  if (r.detail) rec.detail = r.detail;
  return rec;
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.every((v) => typeof v === "string") ? (value as string[]) : undefined;
}

/** Tries locations in order; stops at the first JSON object. */
async function fetchFirst(
  urls: string[],
  fetcher: Fetcher,
  requests: RequestRecord[],
): Promise<{ outcome: Outcome; result?: FetchResult; last?: RequestRecord }> {
  let sawError = false;
  let last: RequestRecord | undefined;
  for (const url of urls) {
    const result = await fetcher(url);
    last = toRecord(result);
    requests.push(last);
    if (result.kind === "found") return { outcome: "found", result, last };
    if (result.kind === "error") sawError = true;
  }
  return { outcome: sawError ? "error" : "absent", last };
}

export function endpointsOf(doc: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(doc)) {
    if ((key.endsWith("_endpoint") || key === "jwks_uri") && typeof value === "string")
      out[key] = value;
  }
  return out;
}

async function probeAs(issuer: string, options: ProbeOptions): Promise<AsCacheEntry> {
  const cached = options.asCache?.get(issuer);
  if (cached) return cached;
  const requests: RequestRecord[] = [];
  let entry: AsCacheEntry;
  if (options.guard) {
    const g = await options.guard(issuer);
    if (!g.ok) {
      const last: RequestRecord = {
        url: issuer,
        status: null,
        ok: false,
        error: "refused",
        detail: g.reason,
      };
      requests.push(last);
      entry = { requests, outcome: "error", last };
      options.asCache?.set(issuer, entry);
      return entry;
    }
  }
  let urls: string[];
  try {
    urls = wellKnownAsUrls(issuer);
  } catch {
    const last: RequestRecord = {
      url: issuer,
      status: null,
      ok: false,
      error: "refused",
      detail: "issuer is not a valid URL",
    };
    requests.push(last);
    entry = { requests, outcome: "error", last };
    options.asCache?.set(issuer, entry);
    return entry;
  }
  const { outcome, result, last } = await fetchFirst(urls, options.fetcher, requests);
  if (outcome === "found" && result?.json) {
    const doc = result.json;
    const as: AsInfo = {
      issuer,
      url: result.url,
      doc,
      endpoints: endpointsOf(doc),
      codeChallengeMethodsSupported: stringList(doc.code_challenge_methods_supported),
      clientIdMetadataDocumentSupported: doc.client_id_metadata_document_supported,
      registrationEndpoint:
        typeof doc.registration_endpoint === "string" ? doc.registration_endpoint : undefined,
      authorizationResponseIssParameterSupported:
        doc.authorization_response_iss_parameter_supported,
    };
    entry = { requests, as, outcome, last };
  } else {
    entry = { requests, outcome, last };
  }
  options.asCache?.set(issuer, entry);
  return entry;
}

export async function probe(target: string, options: ProbeOptions): Promise<Probe> {
  const requests: RequestRecord[] = [];
  const out: Probe = {
    target,
    requests,
    prmOutcome: "absent",
    asOutcome: "no-issuer",
    othersNotChecked: [],
  };

  const prmUrls = wellKnownPrmUrls(target);
  const prm = await fetchFirst(prmUrls, options.fetcher, requests);
  out.prmOutcome = prm.outcome;
  out.prmLast = prm.last;
  if (prm.outcome === "found" && prm.result?.json) {
    const doc = prm.result.json;
    out.prm = {
      url: prm.result.url,
      location: prm.result.url === prmUrls[0] && prmUrls.length === 2 ? "path-aware" : "root",
      doc,
      resource: typeof doc.resource === "string" ? doc.resource : undefined,
      authorizationServers: stringList(doc.authorization_servers) ?? [],
      scopesSupported: stringList(doc.scopes_supported),
    };
  }

  const issuers = out.prm?.authorizationServers ?? [];
  const [first, ...others] = issuers;
  if (first) {
    out.issuer = first;
    out.othersNotChecked = others;
    const entry = await probeAs(first, options);
    requests.push(...entry.requests);
    out.asOutcome = entry.outcome;
    out.asLast = entry.last;
    if (entry.as) out.as = entry.as;
  }
  return out;
}
