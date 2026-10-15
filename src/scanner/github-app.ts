/**
 * The scanner's GitHub identity (docs/scanner.md, "GitHub App"): the nightly job signs a
 * short-lived JWT with the App's private key and exchanges it for an installation token that is
 * valid for one hour, limited to the one repository and to contents and pull requests write.
 * Commits and pull requests then show up as `<app-slug>[bot]`. `fetch` is injected for tests.
 */
import { createPrivateKey, createSign } from "node:crypto";
import type { FetchLike } from "./nightly";

export interface AppCredentials {
  appId: string;
  /** PEM, PEM with literal `\n` escapes, or the PEM base64-encoded as one line */
  privateKey: string;
}

export interface InstallationToken {
  token: string;
  expiresAt: string;
  /** git author for the bot, e.g. `letsauth-scanner[bot]` */
  name: string;
  email: string;
}

/** Accepts the forms a key survives in an environment variable and returns a PEM. */
export function normalisePem(value: string): string {
  const trimmed = value.trim();
  if (trimmed.includes("-----BEGIN")) return trimmed.replace(/\\n/g, "\n").trim();
  return Buffer.from(trimmed, "base64").toString("utf8").trim();
}

const b64url = (input: Buffer | string) => Buffer.from(input).toString("base64url");

/** An RS256 JWT for the App, valid from a minute ago (clock drift) for nine minutes. */
export function appJwt(credentials: AppCredentials, now: Date = new Date()): string {
  const iat = Math.floor(now.getTime() / 1000) - 60;
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ iat, exp: iat + 600, iss: credentials.appId }));
  const key = createPrivateKey(normalisePem(credentials.privateKey));
  const signature = createSign("RSA-SHA256").update(`${header}.${payload}`).sign(key);
  return `${header}.${payload}.${b64url(signature)}`;
}

async function json(response: Response, what: string): Promise<unknown> {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`${what}: HTTP ${response.status}${text ? ` ${text.slice(0, 300)}` : ""}`);
  }
  return response.json();
}

/**
 * Mints an installation token for `repo` (owner/name), restricted to that repository and to
 * contents and pull requests write, and resolves the bot's git identity.
 */
export async function installationToken(options: {
  credentials: AppCredentials;
  repo: string;
  fetch?: FetchLike;
  apiBase?: string;
  now?: Date;
}): Promise<InstallationToken> {
  const fetchImpl = options.fetch ?? fetch;
  const api = (options.apiBase ?? "https://api.github.com").replace(/\/+$/, "");
  const jwt = appJwt(options.credentials, options.now);
  const h = {
    Authorization: `Bearer ${jwt}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
    "User-Agent": "letsauth-scanner-nightly",
  };
  const app = (await json(await fetchImpl(`${api}/app`, { headers: h }), "reading the app")) as {
    slug: string;
  };
  const installation = (await json(
    await fetchImpl(`${api}/repos/${options.repo}/installation`, { headers: h }),
    `finding the app's installation on ${options.repo}`,
  )) as { id: number };
  const [, name] = options.repo.split("/");
  const minted = (await json(
    await fetchImpl(`${api}/app/installations/${installation.id}/access_tokens`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({
        repositories: [name],
        permissions: { contents: "write", pull_requests: "write" },
      }),
    }),
    "creating the installation token",
  )) as { token: string; expires_at: string };
  const login = `${app.slug}[bot]`;
  const user = (await json(
    // the JWT only works on /app endpoints; the bot's public profile is read with the new token
    await fetchImpl(`${api}/users/${encodeURIComponent(login)}`, {
      headers: { ...h, Authorization: `Bearer ${minted.token}` },
    }),
    `reading the bot user ${login}`,
  )) as { id: number };
  return {
    token: minted.token,
    expiresAt: minted.expires_at,
    name: login,
    email: `${user.id}+${login}@users.noreply.github.com`,
  };
}
