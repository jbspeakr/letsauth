import { type Challenge, parseChallenge } from "./challenge";
import type { FetchError, Fetcher, FetchResult } from "./fetch";
import type { Guard } from "./guard";
import { wellKnownAsUrls, wellKnownPrmUrls } from "./urls";

/**
 * Reads the public metadata of one MCP server: the protected resource metadata at its two
 * well-known locations; the challenge the endpoint returns to one unauthenticated request (008);
 * when no well-known document exists, the document the challenge points at; then the first
 * authorization server's metadata at its three locations. Records every request. Judges
 * nothing; the checks do that.
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

export type PrmLocation = "path-aware" | "root" | "challenge";

export interface PrmInfo {
  url: string;
  location: PrmLocation;
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

/** The endpoint's answer to the one unauthenticated request (008). */
export interface ChallengeInfo extends Challenge {
  url: string;
  status: number;
  /** The WWW-Authenticate header as received; absent when the server sent none. */
  header?: string;
}

export interface Probe {
  target: string;
  requests: RequestRecord[];
  /** The PRM judged: the well-known document when found, else the one the challenge points at. */
  prm?: PrmInfo;
  /** Whether any PRM was found, by either route. */
  prmOutcome: Outcome;
  /** The last request made for the PRM, by either route: the decisive one when absent or in error. */
  prmLast?: RequestRecord;
  /** The well-known locations alone. */
  wellKnownOutcome: Outcome;
  wellKnownLast?: RequestRecord;
  /** found: the endpoint answered 401. absent: any other definite status. error: no answer. */
  challengeOutcome: Outcome;
  challengeLast?: RequestRecord;
  challenge?: ChallengeInfo;
  /** The fetch of the challenge's `resource_metadata` pointer, when one was followed. */
  pointerOutcome?: Outcome;
  pointerLast?: RequestRecord;
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
  /** Runs on the issuer and on the challenge's pointer before they are fetched; the target is guarded by the caller. */
  guard?: Guard;
  asCache?: Map<string, AsCacheEntry>;
}

function toRecord(r: FetchResult): RequestRecord {
  const rec: RequestRecord = {
    url: r.url,
    status: r.status,
    ok: r.kind === "found" && r.json !== undefined,
  };
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

function refusedRecord(url: string, detail: string): RequestRecord {
  return { url, status: null, ok: false, error: "refused", detail };
}

function prmInfoOf(result: FetchResult, location: PrmLocation): PrmInfo | undefined {
  if (!result.json) return undefined;
  const doc = result.json;
  return {
    url: result.url,
    location,
    doc,
    resource: typeof doc.resource === "string" ? doc.resource : undefined,
    authorizationServers: stringList(doc.authorization_servers) ?? [],
    scopesSupported: stringList(doc.scopes_supported),
  };
}

export async function probe(target: string, options: ProbeOptions): Promise<Probe> {
  const requests: RequestRecord[] = [];
  const out: Probe = {
    target,
    requests,
    prmOutcome: "absent",
    wellKnownOutcome: "absent",
    challengeOutcome: "absent",
    asOutcome: "no-issuer",
    othersNotChecked: [],
  };

  // 1. the well-known locations
  const prmUrls = wellKnownPrmUrls(target);
  const wellKnown = await fetchFirst(prmUrls, options.fetcher, requests);
  out.wellKnownOutcome = wellKnown.outcome;
  out.wellKnownLast = wellKnown.last;
  out.prmOutcome = wellKnown.outcome;
  out.prmLast = wellKnown.last;
  if (wellKnown.outcome === "found" && wellKnown.result) {
    const location =
      wellKnown.result.url === prmUrls[0] && prmUrls.length === 2 ? "path-aware" : "root";
    out.prm = prmInfoOf(wellKnown.result, location);
  }

  // 2. the endpoint: one unauthenticated GET, headers only (008 FR-001)
  const answer = await options.fetcher(target, "challenge");
  const challengeRec = toRecord(answer);
  requests.push(challengeRec);
  out.challengeOutcome = answer.kind;
  out.challengeLast = challengeRec;
  if (answer.status !== null && answer.kind !== "error") {
    const parsed = parseChallenge(answer.wwwAuthenticate);
    out.challenge = { url: answer.url, status: answer.status, ...parsed };
    if (answer.wwwAuthenticate) out.challenge.header = answer.wwwAuthenticate;
  }

  // 3. the pointer, only when the well-known locations gave nothing (008 FR-003)
  const pointer = out.challenge?.resourceMetadata;
  if (!out.prm && pointer) {
    let allowed = true;
    if (options.guard) {
      const g = await options.guard(pointer);
      if (!g.ok) {
        allowed = false;
        const last = refusedRecord(pointer, g.reason);
        requests.push(last);
        out.pointerOutcome = "error";
        out.pointerLast = last;
      }
    }
    if (allowed) {
      const result = await options.fetcher(pointer, "json");
      const last = toRecord(result);
      requests.push(last);
      out.pointerOutcome = result.kind;
      out.pointerLast = last;
      if (result.kind === "found") out.prm = prmInfoOf(result, "challenge");
    }
    if (out.prm) {
      out.prmOutcome = "found";
    } else if (out.pointerOutcome === "error" || out.wellKnownOutcome === "error") {
      out.prmOutcome = "error";
    }
    out.prmLast = out.pointerLast;
  }

  // 4. the first authorization server the PRM names
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
