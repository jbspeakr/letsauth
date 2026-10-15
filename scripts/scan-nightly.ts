/**
 * The nightly run (specs/004-scanner, research R8): the command a Scaleway Serverless Job
 * executes on its cron schedule from the scanner image.
 *
 *   SCANNER_TOKEN     required: a fine-grained GitHub token with contents and pull requests
 *                     write on the repository
 *   SCANNER_REPO      owner/name (default jbspeakr/letsauth)
 *   SCANNER_BASE      base branch (default main)
 *   SCANNER_WORKDIR   where to clone (default a fresh directory under the system temp dir)
 *
 * Steps: shallow-clone the base branch, install, `pnpm scan --all --write --summary`, validate
 * the data and the append-only rule, and when anything under data/observations changed commit
 * to a new branch scanner/<date>-<hhmm>, push it, open one pull request whose description is the
 * run summary, and close the older open scanner pull requests it supersedes. Nothing is merged
 * without review. Exit 0 when nothing changed or the pull request is up; exit 1 when a step fails.
 *
 * The token never appears in a command line, a remote URL, the clone's config or a log line:
 * git reads the auth header from GIT_CONFIG_* environment variables, child processes never write
 * to the job's output directly (their output is captured and redacted first), and everything
 * this process writes to stdout and stderr passes through `redact`.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  branchFor,
  closeSuperseded,
  commitMessage,
  redact,
  runStamp,
  upsertPullRequest,
} from "../src/scanner/nightly";

function requireToken(): string {
  const value = process.env.SCANNER_TOKEN;
  if (!value) {
    console.error("SCANNER_TOKEN is not set; the nightly run cannot push or open a pull request");
    process.exit(1);
  }
  return value;
}

const token = requireToken();
const repo = process.env.SCANNER_REPO ?? "jbspeakr/letsauth";
const base = process.env.SCANNER_BASE ?? "main";
const workdir = process.env.SCANNER_WORKDIR ?? mkdtempSync(join(tmpdir(), "letsauth-scan-"));
const now = new Date();
const stamp = runStamp(now);
const branch = branchFor(now);

function withoutToken(): NodeJS.ProcessEnv {
  const { SCANNER_TOKEN: _, ...rest } = process.env;
  return rest;
}

// git takes the auth header from the environment (GIT_CONFIG_COUNT/KEY/VALUE), so it is never
// part of an argument list that an error message or a process listing could show
const gitEnv: NodeJS.ProcessEnv = {
  ...withoutToken(),
  GIT_CONFIG_COUNT: "1",
  GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
  GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`,
  GIT_TERMINAL_PROMPT: "0",
};
const safe = (text: string) => redact(text, [token]);

// last line of defence: whatever this process prints, by any path, is redacted on the way out
for (const stream of [process.stdout, process.stderr]) {
  const write = stream.write.bind(stream) as (chunk: unknown, ...rest: unknown[]) => boolean;
  stream.write = ((chunk: unknown, ...rest: unknown[]) =>
    write(
      typeof chunk === "string" || Buffer.isBuffer(chunk) ? safe(String(chunk)) : chunk,
      ...rest,
    )) as typeof stream.write;
}

interface RunOptions {
  cwd?: string;
}

/**
 * Runs a command with its output captured, never inherited, so it reaches the log only through
 * the redacting streams above. Throws on a non-zero exit with a redacted message.
 */
function run(cmd: string, args: string[], options: RunOptions = {}): string {
  console.log(`$ ${[cmd, ...args].join(" ")}`);
  // git gets the auth environment; pnpm and the scanner never see the token
  const env = cmd === "git" ? gitEnv : withoutToken();
  const result = spawnSync(cmd, args, {
    cwd: options.cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw new Error(safe(`${cmd}: ${result.error.message}`));
  if (result.status !== 0) {
    throw new Error(safe(`${cmd} ${args[0] ?? ""} exited with ${result.status ?? result.signal}`));
  }
  return result.stdout ?? "";
}

const inRepo: RunOptions = { cwd: workdir };

async function main(): Promise<void> {
  try {
    run("git", [
      "clone",
      "--depth",
      "1",
      "--branch",
      base,
      `https://github.com/${repo}.git`,
      workdir,
    ]);
    // --prod=false: the image sets NODE_ENV=production and tsx is a dev dependency
    run("pnpm", ["install", "--frozen-lockfile", "--prod=false", "--prefer-offline"], inRepo);

    // a refused or failing server exits 1 but the others are still written; the summary says which
    try {
      run("pnpm", ["scan", "--all", "--write", "--summary", "scan-summary.md"], inRepo);
    } catch {
      console.warn("some servers could not be scanned; see the summary");
    }

    run("pnpm", ["validate:data"], inRepo);
    run("pnpm", ["check:append-only", "HEAD"], inRepo);

    const changed = run("git", ["status", "--porcelain", "--", "data/observations"], inRepo).trim();
    if (!changed) {
      console.log("nothing to append");
      process.exit(0);
    }

    const summary = readFileSync(join(workdir, "scan-summary.md"), "utf8");
    run("git", ["config", "user.name", "letsauth scanner"], inRepo);
    run("git", ["config", "user.email", "scanner@letsauth.eu"], inRepo);
    run("git", ["checkout", "-B", branch], inRepo);
    run("git", ["add", "data/observations"], inRepo);
    run("git", ["commit", "-q", "-m", commitMessage(stamp, summary)], inRepo);
    // a new branch per run: a plain push, nothing to overwrite
    run("git", ["push", "origin", `HEAD:refs/heads/${branch}`], inRepo);

    const pr = await upsertPullRequest({
      repo,
      token,
      head: branch,
      base,
      title: `Scanner: ${stamp}`,
      body: summary,
      labels: ["data"],
    });
    console.log(`${pr.action} pull request #${pr.number}: ${pr.url}`);
    const closed = await closeSuperseded({ repo, token, base, keep: pr.number });
    if (closed.length > 0)
      console.log(`closed superseded: ${closed.map((n) => `#${n}`).join(", ")}`);
  } catch (error) {
    console.error(safe(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  } finally {
    if (!process.env.SCANNER_WORKDIR) rmSync(workdir, { recursive: true, force: true });
  }
}

main();
