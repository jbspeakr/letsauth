import { describe, expect, it } from "vitest";
import { crossCheckRelations, type Dataset } from "@/lib/data";
import { type Relation, relationSchema, type Spec } from "@/schema";

function spec(id: string, body: Spec["body"] = "ietf-oauth"): Spec {
  return {
    id,
    name: id.toUpperCase(),
    body,
    family: "protocol",
    maturity: "published",
    summary: "s",
    url: `https://example.org/${id}`,
    revisions: [
      { id: "rfc", date: "2020-01-01", status: "current", url: `https://example.org/${id}/rfc` },
    ],
  };
}

function dataset(relations: Relation[]): Dataset {
  return {
    specs: [spec("a"), spec("b"), spec("c")],
    features: [],
    servers: [],
    observations: [],
    relations,
  };
}

describe("relation schema", () => {
  it("rejects a non-HTTPS source and an unknown type", () => {
    const bad = relationSchema.safeParse({
      from: "a",
      to: "b",
      type: "depends-on",
      source: "http://example.org",
    });
    expect(bad.success).toBe(false);
    const paths = bad.error?.issues.map((i) => i.path.join(".")) ?? [];
    expect(paths).toContain("type");
    expect(paths).toContain("source");
  });

  it("rejects a self relation on the `to` field", () => {
    const bad = relationSchema.safeParse({ from: "a", to: "a", type: "builds-on" });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0]?.path).toEqual(["to"]);
  });

  it("requires a note on judgement types", () => {
    const bad = relationSchema.safeParse({ from: "a", to: "b", type: "competes-with" });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0]?.path).toEqual(["note"]);
    const ok = relationSchema.safeParse({ from: "a", to: "b", type: "competes-with", note: "n" });
    expect(ok.success).toBe(true);
  });
});

describe("crossCheckRelations", () => {
  it("names the end that points at an unknown spec", () => {
    const issues = crossCheckRelations(dataset([{ from: "a", to: "nope", type: "builds-on" }]));
    expect(issues).toEqual([
      { path: "data/relations.yaml[0].to", message: 'spec "nope" does not exist' },
    ]);
  });

  it("rejects a repeated (from, to, type)", () => {
    const issues = crossCheckRelations(
      dataset([
        { from: "a", to: "b", type: "references" },
        { from: "a", to: "b", type: "references" },
      ]),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe("data/relations.yaml[1]");
    expect(issues[0]?.message).toMatch(/duplicates entry \[0\]/);
  });

  it("rejects the reverse of a symmetric relation but allows the reverse of a directed one", () => {
    const sym = crossCheckRelations(
      dataset([
        { from: "a", to: "b", type: "competes-with", note: "n" },
        { from: "b", to: "a", type: "competes-with", note: "n" },
      ]),
    );
    expect(sym).toHaveLength(1);
    expect(sym[0]?.message).toMatch(/symmetric/);
    const directed = crossCheckRelations(
      dataset([
        { from: "a", to: "b", type: "references" },
        { from: "b", to: "a", type: "references" },
      ]),
    );
    expect(directed).toEqual([]);
  });

  it("names a dependency cycle", () => {
    const issues = crossCheckRelations(
      dataset([
        { from: "a", to: "b", type: "builds-on" },
        { from: "b", to: "c", type: "profiles" },
        { from: "c", to: "a", type: "replaces" },
      ]),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe("data/relations.yaml[2]");
    expect(issues[0]?.message).toMatch(/dependency cycle a -> b -> c -> a/);
  });

  it("ignores symmetric and reference edges when looking for cycles", () => {
    const issues = crossCheckRelations(
      dataset([
        { from: "a", to: "b", type: "builds-on" },
        { from: "b", to: "a", type: "references" },
        { from: "b", to: "a", type: "solves-same-problem-as", note: "n" },
      ]),
    );
    expect(issues).toEqual([]);
  });

  it("accepts a valid list", () => {
    const issues = crossCheckRelations(
      dataset([
        { from: "a", to: "b", type: "builds-on", source: "https://example.org" },
        { from: "c", to: "b", type: "profiles" },
        { from: "a", to: "c", type: "competes-with", note: "n" },
      ]),
    );
    expect(issues).toEqual([]);
  });
});
