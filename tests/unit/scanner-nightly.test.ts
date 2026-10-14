import { describe, expect, it } from "vitest";
import { branchFor, commitMessage, upsertPullRequest } from "@/scanner/nightly";

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

  it("names the branch and the commit by the run date", () => {
    expect(branchFor("2026-10-14")).toBe("scanner/2026-10-14");
    expect(commitMessage("2026-10-14", "| a | b |\n")).toBe(
      "Scanner: observations from the run of 2026-10-14\n\n| a | b |\n",
    );
  });
});
