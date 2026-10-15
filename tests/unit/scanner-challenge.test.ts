import { describe, expect, it } from "vitest";
import { parseChallenge } from "@/scanner/challenge";

const PRM = "https://mcp.example.com/.well-known/oauth-protected-resource/mcp";

describe("parseChallenge (research R5)", () => {
  it("finds a quoted resource_metadata after a realm", () => {
    const c = parseChallenge(`Bearer realm="mcp", resource_metadata="${PRM}"`);
    expect(c.resourceMetadata).toBe(PRM);
    expect(c.schemes).toEqual(["Bearer"]);
  });

  it("finds an unquoted token value and a parameter-first challenge", () => {
    expect(parseChallenge(`Bearer resource_metadata=${PRM}`).resourceMetadata).toBe(PRM);
    expect(parseChallenge(`Bearer resource_metadata=${PRM}, scope="read"`).resourceMetadata).toBe(
      PRM,
    );
  });

  it("is case-insensitive on the parameter name and tolerant of spacing", () => {
    expect(parseChallenge(`Bearer  Resource_Metadata = "${PRM}"`).resourceMetadata).toBe(PRM);
  });

  it("finds the pointer in a later challenge of a comma-joined value", () => {
    const c = parseChallenge(`Basic realm="x", Bearer realm="mcp", resource_metadata="${PRM}"`);
    expect(c.resourceMetadata).toBe(PRM);
    expect(c.schemes).toEqual(["Basic", "Bearer"]);
  });

  it("unescapes a quoted-string value", () => {
    expect(
      parseChallenge(`Bearer resource_metadata="https://a.example/p\\"q"`).resourceMetadata,
    ).toBe('https://a.example/p"q');
  });

  it("returns no pointer for a header without the parameter, an empty header, or none", () => {
    expect(parseChallenge(`Bearer realm="mcp"`)).toEqual({ schemes: ["Bearer"] });
    expect(parseChallenge(`Bearer error="invalid_token", error_description="expired"`)).toEqual({
      schemes: ["Bearer"],
    });
    expect(parseChallenge("")).toEqual({ schemes: [] });
    expect(parseChallenge(undefined)).toEqual({ schemes: [] });
    expect(parseChallenge("Bearer")).toEqual({ schemes: ["Bearer"] });
  });

  it("does not take a parameter name for a scheme", () => {
    const c = parseChallenge(`Bearer realm="a, b", resource_metadata="${PRM}"`);
    expect(c.schemes).toEqual(["Bearer"]);
  });
});
