import { describe, expect, it } from "vitest";
import {
  branchFor,
  closeSuperseded,
  commitMessage,
  redact,
  runStamp,
  upsertPullRequest,
} from "@/scanner/nightly";

interface Call {
  url: string;
  method: string;
  body?: unknown;
  auth?: string;
}

function fakeFetch(existing: { number: number; html_url: string }[]) {
  const calls: Call[] = [];
  const fetchImpl = async (url: string, init?: RequestInit): Promise<Response> => {
    const method = init?.method ?? "GET";
    const headers = init?.headers as Record<string, string> | undefined;
    calls.push({
      url,
      method,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      auth: headers?.Authorization,
    });
    if (method === "GET") return Response.json(existing);
    if (method === "PATCH")
      return Response.json({ number: existing[0]?.number, html_url: existing[0]?.html_url });
    if (url.endsWith("/labels")) return new Response(null, { status: 422 });
    return Response.json(
      { number: 42, html_url: "https://github.com/o/r/pull/42" },
      { status: 201 },
    );
  };
  return { calls, fetchImpl };
}

describe("nightly pull request", () => {
  it("creates the pull request for the branch and adds the label", async () => {
    const { calls, fetchImpl } = fakeFetch([]);
    const result = await upsertPullRequest({
      repo: "o/r",
      token: "t",
      head: "scanner/2026-10-14",
      base: "main",
      title: "Scanner: 2026-10-14",
      body: "summary",
      labels: ["data"],
      fetch: fetchImpl,
    });
    expect(result).toEqual({
      action: "created",
      number: 42,
      url: "https://github.com/o/r/pull/42",
    });
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      "GET https://api.github.com/repos/o/r/pulls?state=open&head=o%3Ascanner%2F2026-10-14&base=main",
      "POST https://api.github.com/repos/o/r/pulls",
      "POST https://api.github.com/repos/o/r/issues/42/labels",
    ]);
    expect(calls[1]?.body).toEqual({
      title: "Scanner: 2026-10-14",
      head: "scanner/2026-10-14",
      base: "main",
      body: "summary",
    });
    expect(calls.every((c) => c.auth === "Bearer t")).toBe(true);
  });

  it("updates the open pull request for the branch instead of opening a second one", async () => {
    const { calls, fetchImpl } = fakeFetch([
      { number: 7, html_url: "https://github.com/o/r/pull/7" },
    ]);
    const result = await upsertPullRequest({
      repo: "o/r",
      token: "t",
      head: "scanner/2026-10-14",
      base: "main",
      title: "Scanner: 2026-10-14",
      body: "new summary",
      labels: ["data"],
      fetch: fetchImpl,
    });
    expect(result).toEqual({ action: "updated", number: 7, url: "https://github.com/o/r/pull/7" });
    expect(calls.map((c) => c.method)).toEqual(["GET", "PATCH"]);
    expect(calls[1]?.body).toEqual({ title: "Scanner: 2026-10-14", body: "new summary" });
  });

  it("fails loudly on an API error", async () => {
    const fetchImpl = async () => new Response("bad credentials", { status: 401 });
    await expect(
      upsertPullRequest({
        repo: "o/r",
        token: "t",
        head: "h",
        base: "main",
        title: "t",
        body: "b",
        fetch: fetchImpl,
      }),
    ).rejects.toThrow(/listing pull requests: HTTP 401 bad credentials/);
  });

  it("names a new branch per run and the commit by the run time", () => {
    const now = new Date("2026-10-15T09:08:47.762Z");
    expect(branchFor(now)).toBe("scanner/2026-10-15-0908");
    expect(runStamp(now)).toBe("2026-10-15 09:08 UTC");
    expect(commitMessage(runStamp(now), "| a | b |\n")).toBe(
      "Scanner: observations from the run of 2026-10-15 09:08 UTC\n\n| a | b |\n",
    );
  });
});

describe("superseded scanner pull requests", () => {
  it("closes the older open scanner pull requests and deletes their branches, nothing else", async () => {
    const calls: string[] = [];
    const fetchImpl = async (url: string, init?: RequestInit): Promise<Response> => {
      const method = init?.method ?? "GET";
      calls.push(`${method} ${url}`);
      if (method === "GET")
        return Response.json([
          { number: 15, head: { ref: "scanner/2026-10-15" } },
          { number: 17, head: { ref: "claude/roadmap" } },
          { number: 18, head: { ref: "scanner/2026-10-15-0908" } },
        ]);
      return Response.json({});
    };
    const closed = await closeSuperseded({
      repo: "o/r",
      token: "t",
      base: "main",
      keep: 18,
      fetch: fetchImpl,
    });
    expect(closed).toEqual([15]);
    expect(calls).toEqual([
      "GET https://api.github.com/repos/o/r/pulls?state=open&base=main&per_page=100",
      "POST https://api.github.com/repos/o/r/issues/15/comments",
      "PATCH https://api.github.com/repos/o/r/pulls/15",
      "DELETE https://api.github.com/repos/o/r/git/refs/heads/scanner/2026-10-15",
    ]);
  });
});

describe("redact", () => {
  it("removes the token and its basic-auth form from a failed command's message", () => {
    const token = "github_pat_example";
    const header = Buffer.from(`x-access-token:${token}`).toString("base64");
    const message = `Command failed: git -c http.extraheader=AUTHORIZATION: basic ${header} push (${token})`;
    const out = redact(message, [token]);
    expect(out).not.toContain(token);
    expect(out).not.toContain(header);
    expect(out).toBe("Command failed: git -c http.extraheader=AUTHORIZATION: basic *** push (***)");
  });
});
