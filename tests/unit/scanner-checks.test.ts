import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { currentRevision } from "@/lib/atlas";
import { getDataset } from "@/lib/data";
import { PASSIVE_CHECKS, runChecks } from "@/scanner/checks";
import { type Fixture, recordingFetcher } from "@/scanner/fetch";
import { probe } from "@/scanner/probe";
import { passiveFeatures, scan } from "@/scanner/report";
import type { ObservationStatus } from "@/schema";

const data = getDataset();
const revision = currentRevision(data).id;
const features = passiveFeatures(data, revision);

function fixture(name: string): Fixture {
  return JSON.parse(
    readFileSync(resolve(__dirname, `../fixtures/scanner/${name}.json`), "utf8"),
  ) as Fixture;
}

async function statuses(name: string) {
  const f = fixture(name);
  const fetcher = recordingFetcher(f);
  const p = await probe(f.target, { fetcher });
  const out: Record<string, { status: ObservationStatus; evidence: string }> = {};
  for (const run of runChecks(p, features)) out[run.feature.id] = run.outcome;
  return { probe: p, requests: fetcher.requests, out };
}

const PRM_PATH = "https://mcp.example.com/.well-known/oauth-protected-resource/mcp";
const PRM_ROOT = "https://mcp.example.com/.well-known/oauth-protected-resource";
const AS_RFC = "https://auth.example.com/.well-known/oauth-authorization-server";
const AS_OIDC = "https://auth.example.com/.well-known/openid-configuration";

describe("the passive features of the current revision", () => {
  it("are the twelve the decision table covers, server party first", () => {
    expect(features.map((f) => f.id)).toEqual([
      "mcp.prm",
      "mcp.prm.authorization-servers",
      "mcp.prm.scopes-supported",
      "mcp.prm.well-known",
      "mcp.prm.no-offline-access",
      "mcp.as.issuer-match",
      "mcp.as.metadata",
      "mcp.as.cimd",
      "mcp.as.dcr",
      "mcp.as.iss-param",
      "mcp.as.pkce-s256",
      "mcp.as.https",
    ]);
    for (const f of features) expect(PASSIVE_CHECKS[f.id], f.id).toBeDefined();
  });

  it("throws on a passive feature without a check (research R5)", async () => {
    const f = fixture("complete");
    const p = await probe(f.target, { fetcher: recordingFetcher(f) });
    const ghost = { ...features[0], id: "mcp.prm.ghost" } as (typeof features)[number];
    expect(() => runChecks(p, [ghost])).toThrow(/mcp\.prm\.ghost/);
  });
});

describe("decision table over recorded responses (FR-001, FR-003, SC-002)", () => {
  it("complete: every check supported except DCR, with the second issuer not checked", async () => {
    const { probe: p, requests, out } = await statuses("complete");
    expect(requests).toEqual([PRM_PATH, AS_RFC]);
    for (const [id, o] of Object.entries(out)) {
      expect(o.status, id).toBe(id === "mcp.as.dcr" ? "unsupported" : "supported");
      expect(o.evidence, id).toMatch(/^https:\/\//);
      expect(o.evidence, id).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
    }
    expect(p.othersNotChecked).toEqual(["https://auth2.example.com"]);
    expect(out["mcp.prm.well-known"]?.evidence).toContain("path-aware");
    expect(out["mcp.as.pkce-s256"]?.evidence).toContain("S256");
  });

  it("root-prm: finds the PRM at the root and the AS at the path-appended OIDC location", async () => {
    const { requests, out } = await statuses("root-prm");
    expect(requests).toEqual([
      PRM_PATH,
      PRM_ROOT,
      "https://auth.example.com/.well-known/oauth-authorization-server/tenant",
      "https://auth.example.com/.well-known/openid-configuration/tenant",
      "https://auth.example.com/tenant/.well-known/openid-configuration",
    ]);
    expect(out["mcp.prm.well-known"]?.status).toBe("supported");
    expect(out["mcp.prm.well-known"]?.evidence).toContain("root location");
    expect(out["mcp.as.metadata"]?.status).toBe("supported");
    expect(out["mcp.as.issuer-match"]?.status).toBe("supported");
  });

  it("no-prm: well-known unsupported, everything else unknown", async () => {
    const { requests, out } = await statuses("no-prm");
    expect(requests).toEqual([PRM_PATH, PRM_ROOT]);
    expect(out["mcp.prm.well-known"]?.status).toBe("unsupported");
    expect(out["mcp.prm.well-known"]?.evidence).toContain("HTTP 404");
    for (const id of Object.keys(out).filter((k) => k !== "mcp.prm.well-known")) {
      expect(out[id]?.status, id).toBe("unknown");
    }
  });

  it.each(["prm-5xx", "prm-timeout", "redirect-cross-host"])(
    "%s: every check unknown, never unsupported",
    async (name) => {
      const { out } = await statuses(name);
      for (const [id, o] of Object.entries(out)) expect(o.status, id).toBe("unknown");
    },
  );

  it("redirect-cross-host: the evidence names the redirect", async () => {
    const { out } = await statuses("redirect-cross-host");
    expect(out["mcp.prm.well-known"]?.evidence).toMatch(/redirect/);
    expect(out["mcp.prm.well-known"]?.evidence).toContain("elsewhere.example.net");
  });

  it("not-json: a 200 that is not JSON counts as absent at that location", async () => {
    const { out } = await statuses("not-json");
    expect(out["mcp.prm.well-known"]?.status).toBe("unsupported");
    expect(out["mcp.prm.well-known"]?.evidence).toContain("not JSON");
    expect(out["mcp.prm"]?.status).toBe("unknown");
  });

  it("no-as: PRM checks judged, AS metadata unsupported, the other AS checks unknown", async () => {
    const { requests, out } = await statuses("no-as");
    expect(requests).toEqual([PRM_PATH, AS_RFC, AS_OIDC]);
    expect(out["mcp.prm"]?.status).toBe("supported");
    expect(out["mcp.as.metadata"]?.status).toBe("unsupported");
    for (const id of [
      "mcp.as.issuer-match",
      "mcp.as.https",
      "mcp.as.pkce-s256",
      "mcp.as.cimd",
      "mcp.as.dcr",
      "mcp.as.iss-param",
    ]) {
      expect(out[id]?.status, id).toBe("unknown");
    }
  });

  it("as-timeout: AS metadata unknown with the failure named", async () => {
    const { out } = await statuses("as-timeout");
    expect(out["mcp.as.metadata"]?.status).toBe("unknown");
    expect(out["mcp.as.metadata"]?.evidence).toMatch(/timeout|connection/);
    expect(out["mcp.as.pkce-s256"]?.status).toBe("unknown");
  });

  it("empty-servers: authorization_servers unsupported and no issuer to check", async () => {
    const { requests, out } = await statuses("empty-servers");
    expect(requests).toEqual([PRM_PATH]);
    expect(out["mcp.prm.authorization-servers"]?.status).toBe("unsupported");
    expect(out["mcp.as.metadata"]?.status).toBe("unknown");
    expect(out["mcp.as.metadata"]?.evidence).toContain("no authorization server named");
  });

  it("offline-access: advertising offline_access fails the SHOULD", async () => {
    const { out } = await statuses("offline-access");
    expect(out["mcp.prm.no-offline-access"]?.status).toBe("unsupported");
    expect(out["mcp.prm.no-offline-access"]?.evidence).toContain("offline_access");
  });

  it("no-scopes: nothing advertised, so the offline_access check is unknown and scopes unsupported", async () => {
    const { out } = await statuses("no-scopes");
    expect(out["mcp.prm.no-offline-access"]?.status).toBe("unknown");
    expect(out["mcp.prm.scopes-supported"]?.status).toBe("unsupported");
  });

  it.each(["no-s256", "no-methods"])("%s: PKCE S256 unsupported", async (name) => {
    const { out } = await statuses(name);
    expect(out["mcp.as.pkce-s256"]?.status).toBe("unsupported");
  });

  it("http-endpoint: partial on the HTTPS check, naming the endpoint", async () => {
    const { out } = await statuses("http-endpoint");
    expect(out["mcp.as.https"]?.status).toBe("partial");
    expect(out["mcp.as.https"]?.evidence).toContain(
      "token_endpoint: http://auth.example.com/token",
    );
  });

  it("issuer-mismatch: unsupported, naming both values", async () => {
    const { out } = await statuses("issuer-mismatch");
    expect(out["mcp.as.issuer-match"]?.status).toBe("unsupported");
    expect(out["mcp.as.issuer-match"]?.evidence).toContain("https://other.example.com");
    expect(out["mcp.as.issuer-match"]?.evidence).toContain("https://auth.example.com");
  });

  it("dcr: registration endpoint supported, CIMD and iss parameter unsupported as absent", async () => {
    const { out } = await statuses("dcr");
    expect(out["mcp.as.dcr"]?.status).toBe("supported");
    expect(out["mcp.as.cimd"]?.status).toBe("unsupported");
    expect(out["mcp.as.cimd"]?.evidence).toContain("absent");
    expect(out["mcp.as.iss-param"]?.status).toBe("unsupported");
  });

  it("evidence never exceeds 300 characters", async () => {
    for (const name of ["complete", "no-prm", "redirect-cross-host", "http-endpoint"]) {
      const { out } = await statuses(name);
      for (const o of Object.values(out)) expect(o.evidence.length).toBeLessThanOrEqual(300);
    }
  });
});

describe("scan() shapes the report (contracts/report.md)", () => {
  it("fills checks, discovered, requests, grade and observations for a listed server", async () => {
    const f = fixture("complete");
    const report = await scan({ url: f.target, serverId: "example" }, data, {
      fetcher: recordingFetcher(f),
      now: "2026-10-15T03:17:04Z",
    });
    expect(report.version).toBe(1);
    expect(report.recorded).toBe(false);
    expect(report.target).toEqual({ url: f.target, server: "example" });
    expect(report.revision).toEqual({ spec: "mcp-authorization", revision });
    expect(report.checks.map((c) => c.feature)).toEqual(features.map((x) => x.id));
    expect(report.checks[0]?.citation).toMatch(/^https:\/\/modelcontextprotocol\.io/);
    expect(report.checks.every((c) => c.observedAt === "2026-10-15T03:17:04Z")).toBe(true);
    expect(report.discovered?.protectedResource?.authorizationServers).toEqual([
      "https://auth.example.com",
      "https://auth2.example.com",
    ]);
    expect(report.discovered?.authorizationServer?.codeChallengeMethodsSupported).toEqual(["S256"]);
    expect(report.grade.letter).toBe("A");
    expect(report.observations).toHaveLength(features.length);
    expect(report.observations[0]).toMatchObject({
      server: "example",
      method: "passive-scan",
      observedBy: "scanner@0.1.0",
      observedAt: "2026-10-15T03:17:04Z",
      revision: { spec: "mcp-authorization", revision },
    });
  });

  it("produces no observations for a target that is not a listed server", async () => {
    const f = fixture("complete");
    const report = await scan({ url: f.target }, data, { fetcher: recordingFetcher(f) });
    expect(report.target.server).toBeNull();
    expect(report.observations).toEqual([]);
  });

  it("caches the authorization server across targets within a run", async () => {
    const f = fixture("complete");
    const fetcher = recordingFetcher(f);
    const asCache = new Map();
    await scan({ url: f.target }, data, { fetcher, asCache });
    await scan({ url: f.target }, data, { fetcher, asCache });
    expect(fetcher.requests.filter((u) => u === AS_RFC)).toHaveLength(1);
  });
});
