import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { appJwt, installationToken, normalisePem } from "@/scanner/github-app";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs1", format: "pem" }).toString();
const now = new Date("2026-10-15T03:17:00Z");

describe("GitHub App JWT", () => {
  it("is an RS256 token for the app, issued a minute back and valid for under ten minutes", () => {
    const jwt = appJwt({ appId: "123", privateKey: pem }, now);
    const [header, payload, signature] = jwt.split(".");
    expect(JSON.parse(Buffer.from(header ?? "", "base64url").toString())).toEqual({
      alg: "RS256",
      typ: "JWT",
    });
    const claims = JSON.parse(Buffer.from(payload ?? "", "base64url").toString());
    expect(claims).toEqual({
      iat: now.getTime() / 1000 - 60,
      exp: now.getTime() / 1000 + 540,
      iss: "123",
    });
    const ok = createVerify("RSA-SHA256")
      .update(`${header}.${payload}`)
      .verify(publicKey, Buffer.from(signature ?? "", "base64url"));
    expect(ok).toBe(true);
  });

  it("accepts the key as PEM, with escaped newlines, or base64", () => {
    expect(normalisePem(pem)).toBe(pem.trim());
    expect(normalisePem(pem.replace(/\n/g, "\\n"))).toBe(pem.trim());
    expect(normalisePem(Buffer.from(pem).toString("base64"))).toBe(pem.trim());
  });
});

describe("installation token", () => {
  it("mints a repository-scoped token and resolves the bot's git identity", async () => {
    const calls: { method: string; url: string; auth?: string; body?: unknown }[] = [];
    const fetchImpl = async (url: string, init?: RequestInit): Promise<Response> => {
      const method = init?.method ?? "GET";
      const auth = (init?.headers as Record<string, string>)?.Authorization;
      calls.push({
        method,
        url,
        auth,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      if (url.endsWith("/app")) return Response.json({ slug: "letsauth-scanner" });
      if (url.endsWith("/installation")) return Response.json({ id: 99 });
      if (url.endsWith("/access_tokens"))
        return Response.json(
          { token: "ghs_minted", expires_at: "2026-10-15T04:17:00Z" },
          { status: 201 },
        );
      if (url.includes("/users/")) return Response.json({ id: 4242 });
      return new Response(null, { status: 404 });
    };
    const result = await installationToken({
      credentials: { appId: "123", privateKey: pem },
      repo: "letsauthlab/letsauth",
      fetch: fetchImpl,
      now,
    });
    expect(result).toEqual({
      token: "ghs_minted",
      expiresAt: "2026-10-15T04:17:00Z",
      name: "letsauth-scanner[bot]",
      email: "4242+letsauth-scanner[bot]@users.noreply.github.com",
    });
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      "GET https://api.github.com/app",
      "GET https://api.github.com/repos/letsauthlab/letsauth/installation",
      "POST https://api.github.com/app/installations/99/access_tokens",
      "GET https://api.github.com/users/letsauth-scanner%5Bbot%5D",
    ]);
    expect(calls[2]?.body).toEqual({
      repositories: ["letsauth"],
      permissions: { contents: "write", pull_requests: "write" },
    });
    expect(calls[3]?.auth).toBe("Bearer ghs_minted");
  });

  it("names the step that failed", async () => {
    const fetchImpl = async () => new Response("Not Found", { status: 404 });
    await expect(
      installationToken({
        credentials: { appId: "1", privateKey: pem },
        repo: "o/r",
        fetch: fetchImpl,
      }),
    ).rejects.toThrow(/reading the app: HTTP 404/);
  });
});
