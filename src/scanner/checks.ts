import type { Feature, ObservationStatus } from "../schema";
import type { Probe, RequestRecord } from "./probe";
import { sameIssuer } from "./urls";

/**
 * One check per passively observable feature: the decision table in
 * specs/004-scanner/data-model.md, as code. A check is a pure function of the probe. Evidence is
 * deterministic (URL, HTTP status or failure, the deciding field and value) so two runs over the
 * same responses write byte-identical observations.
 */

export interface CheckOutcome {
  status: ObservationStatus;
  evidence: string;
}

export type Check = (probe: Probe) => CheckOutcome;

const EVIDENCE_MAX = 300;

function httpWord(rec: RequestRecord | undefined): string {
  if (!rec) return "no request";
  if (rec.error === "refused") return `refused (${rec.detail})`;
  if (rec.status === null) return rec.error ?? "no response";
  if (rec.error === "server-error" || rec.error === "redirect" || rec.error === "too-large") {
    return `HTTP ${rec.status}, ${rec.error}${rec.detail ? ` (${rec.detail})` : ""}`;
  }
  if (rec.error === "not-json") return `HTTP ${rec.status}, not JSON`;
  return `HTTP ${rec.status}`;
}

function cap(text: string): string {
  return text.length > EVIDENCE_MAX ? `${text.slice(0, EVIDENCE_MAX - 1)}…` : text;
}

function evidence(url: string, rec: RequestRecord | undefined, note: string): string {
  return cap(`${url} — ${httpWord(rec)}; ${note}`);
}

function show(value: unknown): string {
  if (value === undefined) return "absent";
  if (Array.isArray(value))
    return `[${value.map((v) => (typeof v === "string" ? v : JSON.stringify(v))).join(", ")}]`;
  return typeof value === "string" ? value : JSON.stringify(value);
}

/** Why no PRM could be judged: the decisive request and a word for the reader. */
function prmMissing(probe: Probe): CheckOutcome {
  const last = probe.prmLast;
  const url = last?.url ?? probe.target;
  if (probe.prmOutcome === "error") {
    return {
      status: "unknown",
      evidence: evidence(url, last, "could not fetch the protected resource metadata"),
    };
  }
  const tried = probe.requests
    .filter((r) => r.url.includes("/.well-known/oauth-protected-resource"))
    .map((r) => httpWord(r))
    .join(", ");
  return {
    status: "unknown",
    evidence: evidence(
      url,
      last,
      `no protected resource metadata at a well-known location (${tried})`,
    ),
  };
}

/** Why no AS metadata could be judged. */
function asMissing(probe: Probe): CheckOutcome {
  if (probe.asOutcome === "no-issuer") {
    if (probe.prm) {
      return {
        status: "unknown",
        evidence: evidence(
          probe.prm.url,
          probe.requests.find((r) => r.url === probe.prm?.url),
          "no authorization server named in the protected resource metadata",
        ),
      };
    }
    return { ...prmMissing(probe), status: "unknown" };
  }
  const last = probe.asLast;
  const url = last?.url ?? probe.issuer ?? probe.target;
  if (probe.asOutcome === "error") {
    return {
      status: "unknown",
      evidence: evidence(url, last, "could not fetch the authorization server metadata"),
    };
  }
  const tried = probe.requests
    .filter(
      (r) =>
        probe.issuer &&
        r.url.startsWith(new URL(probe.issuer).origin) &&
        r.url.includes("/.well-known/"),
    )
    .map((r) => httpWord(r))
    .join(", ");
  return {
    status: "unknown",
    evidence: evidence(
      url,
      last,
      `no authorization server metadata at a well-known location (${tried})`,
    ),
  };
}

function withPrm(
  probe: Probe,
  judge: (prm: NonNullable<Probe["prm"]>, rec: RequestRecord | undefined) => CheckOutcome,
): CheckOutcome {
  if (!probe.prm) return prmMissing(probe);
  return judge(
    probe.prm,
    probe.requests.find((r) => r.url === probe.prm?.url),
  );
}

function withAs(
  probe: Probe,
  judge: (as: NonNullable<Probe["as"]>, rec: RequestRecord | undefined) => CheckOutcome,
): CheckOutcome {
  if (!probe.as) return asMissing(probe);
  return judge(
    probe.as,
    probe.requests.find((r) => r.url === probe.as?.url),
  );
}

export const PASSIVE_CHECKS: Record<string, Check> = {
  "mcp.prm.well-known": (probe) => {
    if (probe.prm) {
      const rec = probe.requests.find((r) => r.url === probe.prm?.url);
      return {
        status: "supported",
        evidence: evidence(probe.prm.url, rec, `found at the ${probe.prm.location} location`),
      };
    }
    if (probe.prmOutcome === "absent") {
      const tried = probe.requests
        .map(
          (r) =>
            `${r.url.endsWith("/oauth-protected-resource") ? "root" : "path-aware"} ${httpWord(r)}`,
        )
        .join(", ");
      return {
        status: "unsupported",
        evidence: evidence(
          probe.prmLast?.url ?? probe.target,
          probe.prmLast,
          `not at either well-known location (${tried})`,
        ),
      };
    }
    return prmMissing(probe);
  },

  "mcp.prm": (probe) =>
    withPrm(probe, (prm, rec) => ({
      status: "supported",
      evidence: evidence(prm.url, rec, `resource: ${show(prm.resource)}`),
    })),

  "mcp.prm.authorization-servers": (probe) =>
    withPrm(probe, (prm, rec) =>
      prm.authorizationServers.length > 0
        ? {
            status: "supported",
            evidence: evidence(
              prm.url,
              rec,
              `authorization_servers: ${show(prm.authorizationServers)}`,
            ),
          }
        : {
            status: "unsupported",
            evidence: evidence(
              prm.url,
              rec,
              `authorization_servers: ${show(prm.doc.authorization_servers)}`,
            ),
          },
    ),

  "mcp.prm.scopes-supported": (probe) =>
    withPrm(probe, (prm, rec) =>
      prm.scopesSupported && prm.scopesSupported.length > 0
        ? {
            status: "supported",
            evidence: evidence(prm.url, rec, `scopes_supported: ${show(prm.scopesSupported)}`),
          }
        : {
            status: "unsupported",
            evidence: evidence(prm.url, rec, `scopes_supported: ${show(prm.doc.scopes_supported)}`),
          },
    ),

  "mcp.prm.no-offline-access": (probe) =>
    withPrm(probe, (prm, rec) => {
      if (!prm.scopesSupported) {
        return {
          status: "unknown",
          evidence: evidence(
            prm.url,
            rec,
            "scopes_supported: absent, so no scope is advertised to judge",
          ),
        };
      }
      return prm.scopesSupported.includes("offline_access")
        ? {
            status: "unsupported",
            evidence: evidence(
              prm.url,
              rec,
              `scopes_supported includes offline_access: ${show(prm.scopesSupported)}`,
            ),
          }
        : {
            status: "supported",
            evidence: evidence(
              prm.url,
              rec,
              `scopes_supported without offline_access: ${show(prm.scopesSupported)}`,
            ),
          };
    }),

  "mcp.as.metadata": (probe) => {
    if (probe.as) {
      const rec = probe.requests.find((r) => r.url === probe.as?.url);
      return {
        status: "supported",
        evidence: evidence(probe.as.url, rec, `issuer: ${show(probe.as.doc.issuer)}`),
      };
    }
    if (probe.asOutcome === "absent") {
      const tried = probe.requests
        .filter((r) => probe.issuer && r.url.startsWith(new URL(probe.issuer).origin))
        .map((r) => httpWord(r))
        .join(", ");
      return {
        status: "unsupported",
        evidence: evidence(
          probe.asLast?.url ?? probe.issuer ?? probe.target,
          probe.asLast,
          `not at any of the three well-known locations (${tried})`,
        ),
      };
    }
    return asMissing(probe);
  },

  "mcp.as.issuer-match": (probe) =>
    withAs(probe, (as, rec) =>
      typeof as.doc.issuer === "string" && sameIssuer(as.doc.issuer, as.issuer)
        ? {
            status: "supported",
            evidence: evidence(
              as.url,
              rec,
              `issuer: ${as.doc.issuer} equals the issuer the PRM named`,
            ),
          }
        : {
            status: "unsupported",
            evidence: evidence(
              as.url,
              rec,
              `issuer: ${show(as.doc.issuer)}, PRM named ${as.issuer}`,
            ),
          },
    ),

  "mcp.as.https": (probe) =>
    withAs(probe, (as, rec) => {
      const entries = Object.entries(as.endpoints);
      const plain = entries
        .filter(([, v]) => !v.startsWith("https://"))
        .map(([k, v]) => `${k}: ${v}`);
      if (entries.length === 0)
        return {
          status: "unknown",
          evidence: evidence(as.url, rec, "no endpoint fields in the metadata"),
        };
      if (plain.length === 0)
        return {
          status: "supported",
          evidence: evidence(as.url, rec, `all ${entries.length} endpoints use https`),
        };
      if (plain.length === entries.length)
        return {
          status: "unsupported",
          evidence: evidence(as.url, rec, `no endpoint uses https: ${plain.join(", ")}`),
        };
      return {
        status: "partial",
        evidence: evidence(
          as.url,
          rec,
          `${plain.length} of ${entries.length} endpoints not https: ${plain.join(", ")}`,
        ),
      };
    }),

  "mcp.as.pkce-s256": (probe) =>
    withAs(probe, (as, rec) =>
      as.codeChallengeMethodsSupported?.includes("S256")
        ? {
            status: "supported",
            evidence: evidence(
              as.url,
              rec,
              `code_challenge_methods_supported: ${show(as.codeChallengeMethodsSupported)}`,
            ),
          }
        : {
            status: "unsupported",
            evidence: evidence(
              as.url,
              rec,
              `code_challenge_methods_supported: ${show(as.doc.code_challenge_methods_supported)}`,
            ),
          },
    ),

  "mcp.as.cimd": (probe) =>
    withAs(probe, (as, rec) =>
      as.clientIdMetadataDocumentSupported === true
        ? {
            status: "supported",
            evidence: evidence(as.url, rec, "client_id_metadata_document_supported: true"),
          }
        : {
            status: "unsupported",
            evidence: evidence(
              as.url,
              rec,
              `client_id_metadata_document_supported: ${show(as.clientIdMetadataDocumentSupported)}`,
            ),
          },
    ),

  "mcp.as.dcr": (probe) =>
    withAs(probe, (as, rec) =>
      as.registrationEndpoint
        ? {
            status: "supported",
            evidence: evidence(as.url, rec, `registration_endpoint: ${as.registrationEndpoint}`),
          }
        : {
            status: "unsupported",
            evidence: evidence(
              as.url,
              rec,
              `registration_endpoint: ${show(as.doc.registration_endpoint)}`,
            ),
          },
    ),

  "mcp.as.iss-param": (probe) =>
    withAs(probe, (as, rec) =>
      as.authorizationResponseIssParameterSupported === true
        ? {
            status: "supported",
            evidence: evidence(as.url, rec, "authorization_response_iss_parameter_supported: true"),
          }
        : {
            status: "unsupported",
            evidence: evidence(
              as.url,
              rec,
              `authorization_response_iss_parameter_supported: ${show(as.authorizationResponseIssParameterSupported)}`,
            ),
          },
    ),
};

export interface CheckRun {
  feature: Feature;
  outcome: CheckOutcome;
}

/** Runs the check for every given feature; throws when a passive feature has no check (research R5). */
export function runChecks(probe: Probe, features: Feature[]): CheckRun[] {
  return features.map((feature) => {
    const check = PASSIVE_CHECKS[feature.id];
    if (!check) {
      throw new Error(
        `feature "${feature.id}" is observable: passive but the scanner has no check for it; add one to src/scanner/checks.ts or mark the feature manual`,
      );
    }
    return { feature, outcome: check(probe) };
  });
}
