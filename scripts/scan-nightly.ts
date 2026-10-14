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
 * to scanner/<date>, push and open (or update) one pull request whose description is the run
 * summary. Nothing is merged without review. Exit 0 when nothing changed or the pull request is
 * up; exit 1 when a step fails.
 */
import { type ExecFileSyncOptions, execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { branchFor, commitMessage, upsertPullRequest } from "../src/scanner/nightly";

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
const date = new Date().toISOString().slice(0, 10);
const branch = branchFor(date);

// git authenticates with the token in an extra header, so the token never lands in a remote URL
// or in the clone's config
const auth = `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`;
const gitAuth = ["-c", `http.https://github.com/.extraheader=${auth}`];

function run(cmd: string, args: string[], options: ExecFileSyncOptions = {}): string {
  const printable = [cmd, ...args].map((a) => (a.includes(auth) ? "-c http.extraheader=***" : a));
  console.log(`$ ${printable.join(" ")}`);
  return String(execFileSync(cmd, args, { stdio: ["ignore", "pipe", "inherit"], ...options }));
}

const inRepo: ExecFileSyncOptions = { cwd: workdir };

async function main(): Promise<void> {
  try {
    run("git", [
      ...gitAuth,
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
      run("pnpm", ["scan", "--all", "--write", "--summary", "scan-summary.md"], {
        ...inRepo,
        stdio: "inherit",
      });
    } catch {
      console.warn("some servers could not be scanned; see the summary");
    }

    run("pnpm", ["validate:data"], { ...inRepo, stdio: "inherit" });
    run("pnpm", ["check:append-only", "HEAD"], { ...inRepo, stdio: "inherit" });

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
    run("git", ["commit", "-q", "-m", commitMessage(date, summary)], inRepo);
    run("git", [...gitAuth, "push", "--force-with-lease", "origin", branch], inRepo);

    const pr = await upsertPullRequest({
      repo,
      token,
      head: branch,
      base,
      title: `Scanner: ${date}`,
      body: summary,
      labels: ["data"],
    });
    console.log(`${pr.action} pull request #${pr.number}: ${pr.url}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    if (!process.env.SCANNER_WORKDIR) rmSync(workdir, { recursive: true, force: true });
  }
}

main();
