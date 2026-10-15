import { describe, expect, it } from "vitest";
import { GRADE_RULE, grade } from "@/scanner/grade";
import type { FeatureLevel, ObservationStatus } from "@/schema";

const STATUSES: ObservationStatus[] = [
  "supported",
  "partial",
  "unsupported",
  "unknown",
  "not-applicable",
];

function expected(must: ObservationStatus, should: ObservationStatus): string | null {
  const fails = (s: ObservationStatus) => s === "unsupported" || s === "partial";
  if (fails(must)) return "F";
  if (must === "unknown") return null;
  if (fails(should)) return "C";
  if (should === "unknown") return "B";
  return "A";
}

describe("grade rule (FR-008, SC-004)", () => {
  for (const must of STATUSES) {
    for (const should of STATUSES) {
      for (const may of STATUSES) {
        it(`MUST ${must}, SHOULD ${should}, MAY ${may} → ${expected(must, should) ?? "withheld"}`, () => {
          const g = grade([
            { name: "m", level: "MUST", status: must },
            { name: "s", level: "SHOULD", status: should },
            { name: "y", level: "MAY", status: may },
            { name: "d", level: "DEPRECATED", status: may },
          ]);
          expect(g.letter).toBe(expected(must, should));
          expect(g.reasons.length).toBeGreaterThan(0);
        });
      }
    }
  }

  it("names the checks in its reasons", () => {
    const g = grade([
      { name: "PRM served", level: "MUST", status: "supported" },
      { name: "CIMD", level: "SHOULD", status: "unsupported" },
      { name: "iss", level: "SHOULD", status: "unknown" },
    ]);
    expect(g.letter).toBe("C");
    expect(g.reasons).toEqual(["SHOULD-level check unsupported: CIMD"]);
  });

  it("withholds rather than lowers when a MUST is unknown", () => {
    const g = grade([
      { name: "a", level: "MUST", status: "unknown" },
      { name: "b", level: "SHOULD", status: "unsupported" },
    ]);
    expect(g.letter).toBeNull();
    expect(g.label).toBe("Withheld");
    expect(g.reasons).toEqual(["MUST-level check unknown: a"]);
  });

  it("does not fail a server on one of two discovery mechanisms while the other is unknown", () => {
    const wellKnown = {
      feature: "mcp.prm.well-known",
      name: "PRM well-known",
      level: "MUST" as const,
    };
    const header = {
      feature: "mcp.prm.www-authenticate",
      name: "PRM header",
      level: "MUST" as const,
    };
    const missing = grade([{ ...wellKnown, status: "unsupported" }]);
    expect(missing.letter).toBeNull();
    expect(missing.label).toBe("Withheld");
    expect(
      grade([
        { ...wellKnown, status: "unsupported" },
        { ...header, status: "supported" },
      ]).letter,
    ).toBe("A");
    expect(
      grade([
        { ...wellKnown, status: "unsupported" },
        { ...header, status: "unsupported" },
      ]).letter,
    ).toBe("F");
  });

  it("treats the two discovery mechanisms as alternatives in both directions (008 FR-005)", () => {
    const wellKnown = {
      feature: "mcp.prm.well-known",
      name: "PRM well-known",
      level: "MUST" as const,
    };
    const header = {
      feature: "mcp.prm.www-authenticate",
      name: "PRM header",
      level: "MUST" as const,
    };
    const statuses = ["supported", "unsupported", "unknown"] as const;
    const expected = (a: string, b: string): string => {
      if (a === "supported" || b === "supported") return "A";
      if (a === "unknown" || b === "unknown") return "Withheld";
      return "F";
    };
    for (const a of statuses) {
      for (const b of statuses) {
        const g = grade([
          { ...wellKnown, status: a },
          { ...header, status: b },
        ]);
        expect(g.label, `${a} / ${b}`).toBe(expected(a, b));
      }
    }
    // the case the one-directional rule got wrong: a challenge without a pointer next to a
    // well-known document is not a failure
    const g = grade([
      { ...wellKnown, status: "supported" },
      { ...header, status: "unsupported" },
    ]);
    expect(g.letter).toBe("A");
    expect(g.reasons).not.toContain("MUST-level check unsupported: PRM header");
  });

  it("publishes its rule lines", () => {
    expect(GRADE_RULE).toHaveLength(8);
    const levels: FeatureLevel[] = ["MUST", "SHOULD", "MAY"];
    for (const l of levels) expect(GRADE_RULE.join(" ")).toContain(l);
  });
});
