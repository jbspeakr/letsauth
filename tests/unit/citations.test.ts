import { describe, expect, it } from "vitest";
import { resolveCitation, resolveRevision } from "@/lib/citations";
import { getDataset } from "@/lib/data";

describe("citations over the real data", () => {
  const data = getDataset();

  it("every feature revision entry resolves to a document and names a section (SC-002)", () => {
    for (const feature of data.features) {
      for (const entry of feature.revisions) {
        const cite = resolveCitation(data, entry);
        expect(cite.url).toMatch(/^https:\/\//);
        expect(cite.section?.length).toBeGreaterThan(0);
      }
    }
  });

  it("every observation's revision resolves", () => {
    for (const obs of data.observations)
      expect(() => resolveRevision(data, obs.revision)).not.toThrow();
  });

  it("throws on a dangling reference", () => {
    expect(() => resolveRevision(data, { spec: "nope", revision: "0" })).toThrow(/dangling/);
  });
});
