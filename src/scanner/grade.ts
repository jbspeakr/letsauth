import type { FeatureLevel, ObservationStatus } from "../schema";

/**
 * The grade rule (spec FR-008). Applied to one report's checks with the level each feature has in
 * the judged revision. Derived from the statuses alone, published next to every grade, never
 * used to rank servers. `unknown` never lowers a grade: a MUST unknown withholds it instead.
 */

export type GradeLetter = "A" | "B" | "C" | "F";

export interface Grade {
  letter: GradeLetter | null;
  /** "A" … "F", "Withheld" or "Not scanned". */
  label: string;
  reasons: string[];
}

export interface Gradable {
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
  "MAY-level and deprecated requirements are listed and never change the grade.",
];

const failing = (s: ObservationStatus) => s === "unsupported" || s === "partial";

export function grade(checks: readonly Gradable[]): Grade {
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
