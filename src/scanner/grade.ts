import type { FeatureLevel, ObservationStatus } from "../schema";

/**
 * The grade rule (spec FR-008). Applied to one report's checks with the level each feature has in
 * the judged revision. Derived from the statuses alone, published next to every grade, never
 * used to rank servers. `unknown` never lowers a grade: a MUST unknown withholds it instead.
 */

export type GradeLetter = "A" | "B" | "C" | "F";

export interface Grade {
  letter: GradeLetter | null;
  /** "A" … "F", "Withheld", "Not scanned" or "No OAuth". */
  label: string;
  reasons: string[];
}

export interface Gradable {
  /** The feature id; needed for the either-or rule below. */
  feature?: string;
  name: string;
  level: FeatureLevel;
  status: ObservationStatus;
}

export const GRADE_RULE: readonly string[] = [
  "F when a MUST-level check is unsupported or partial.",
  "Withheld (no letter) when a MUST-level check is unknown: the scanner could not establish it.",
  "C when every MUST-level check is supported and a SHOULD-level check is unsupported or partial.",
  "B when every MUST-level check is supported, no SHOULD-level check fails, and a SHOULD-level check is unknown.",
  "A when every MUST-level and SHOULD-level check is supported.",
  "A MUST the server may meet in either of two ways counts as unknown, not unsupported, while the other way is unknown: protected resource metadata missing from both well-known locations may still be announced in a WWW-Authenticate challenge, which a passive scan does not provoke.",
  "MAY-level and deprecated requirements are listed and never change the grade.",
  "Servers listed as open or API-key are not graded: there is no OAuth authorization to check.",
];

/**
 * MUST-level requirements a server meets through either of two mechanisms (feature → its
 * alternative). The specification asks for one of them, so one failing alone fails nothing.
 */
export const EITHER_OR: Readonly<Record<string, string>> = {
  "mcp.prm.well-known": "mcp.prm.www-authenticate",
};

const failing = (s: ObservationStatus) => s === "unsupported" || s === "partial";

/** The status a check counts with under the either-or rule; the alternative may be absent. */
function effective(c: Gradable, checks: readonly Gradable[]): ObservationStatus {
  const other = c.feature ? EITHER_OR[c.feature] : undefined;
  if (!other || !failing(c.status)) return c.status;
  const alt = checks.find((x) => x.feature === other)?.status ?? "unknown";
  if (alt === "supported") return "supported";
  return failing(alt) ? c.status : "unknown";
}

export function grade(input: readonly Gradable[]): Grade {
  const checks = input.map((c) => ({ ...c, status: effective(c, input) }));
  const must = checks.filter((c) => c.level === "MUST");
  const should = checks.filter((c) => c.level === "SHOULD");
  const mustFail = must.filter((c) => failing(c.status));
  if (mustFail.length > 0) {
    return {
      letter: "F",
      label: "F",
      reasons: mustFail.map((c) => `MUST-level check ${c.status}: ${c.name}`),
    };
  }
  const mustUnknown = must.filter((c) => c.status === "unknown");
  if (mustUnknown.length > 0) {
    return {
      letter: null,
      label: "Withheld",
      reasons: mustUnknown.map((c) => `MUST-level check unknown: ${c.name}`),
    };
  }
  const shouldFail = should.filter((c) => failing(c.status));
  if (shouldFail.length > 0) {
    return {
      letter: "C",
      label: "C",
      reasons: shouldFail.map((c) => `SHOULD-level check ${c.status}: ${c.name}`),
    };
  }
  const shouldUnknown = should.filter((c) => c.status === "unknown");
  if (shouldUnknown.length > 0) {
    return {
      letter: "B",
      label: "B",
      reasons: shouldUnknown.map((c) => `SHOULD-level check unknown: ${c.name}`),
    };
  }
  return {
    letter: "A",
    label: "A",
    reasons: ["Every MUST-level and SHOULD-level check is supported."],
  };
}

/** The grade shown for a server that has no scanner observation at all. */
export const NOT_SCANNED: Grade = { letter: null, label: "Not scanned", reasons: [] };

/** The grade shown for a server whose listing says it uses no OAuth; such servers are not scanned. */
export const NO_OAUTH: Grade = {
  letter: null,
  label: "No OAuth",
  reasons: ["Listed as open or API-key: there is no OAuth authorization to grade."],
};

/** True when the listing says the server uses no OAuth, so a scan has nothing to judge. */
export function claimsNoOAuth(authClaimed: string | undefined): boolean {
  return authClaimed === "open" || authClaimed === "api-key";
}
