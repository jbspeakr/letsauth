# Research: Scanner

Phase 0 of the plan. Each entry records a decision, why, and what was rejected.

## R1. Where the code lives

**Decision**: The scanner is a library under `src/scanner/` (probing, checks, grading,
observation writing, the nightly job's pull request step), driven by one command, `scripts/scan.ts`
(`pnpm scan`). Site-side derivations (the report view built from observations) live in
`src/lib/scanner.ts` next to `atlas.ts` and `standards.ts`. The library imports the schema from
`src/schema/` and reads the dataset through `src/lib/data.ts`, as every product does.

**Rationale**: Constitution I and VI: one model, one readable schema, one repository that an
agent can work on. The scanner needs the feature list, the current revision and the servers;
reading them through the same loader keeps it a view on the model, not a second model. A
package split (`packages/scanner`) is what the constitution allows "until a package split is
justified"; one importer (the command) does not justify it.

**Rejected**: A separate repository or package for the backend (two places to keep the feature
list in sync; the constitution's agent-legibility principle wants one `pnpm check`). Putting the
checks in `src/lib/` next to the page derivations (the site build must never import code that
performs network requests, FR-015; a separate directory makes the boundary visible).

## R2. Fetching

**Decision**: Node 22's global `fetch` with `redirect: "manual"`, an `AbortSignal.timeout` of
10 s per request, a 1 MiB body cap, `Accept: application/json`, and a `User-Agent` of
`letsauth-scanner/<version> (+https://letsauth.eu/scanner/)`. Redirects are followed by the
scanner itself, at most three, only to HTTPS URLs on the same host; anything else is a failed
fetch. The fetch function is injected (`Fetcher` type) so unit tests run the whole pipeline over
recorded responses and the checks test records every request made.

**Rationale**: FR-002 and FR-014. No dependency is needed; the injection point is what makes
SC-002, SC-003 and SC-006 testable without a network, which CI must not have (CLAUDE.md:
nothing in this repo contacts third-party servers at build or test time).

**Rejected**: `undici` directly for a custom DNS hook (not a dependency of the project; Node's
fetch is undici anyway). Following cross-host redirects (a redirect to another host is a
different server's metadata and would be misattributed).

## R3. Public-host guard

**Decision**: Before any request, the target URL must be `https:`, carry no credentials, use the
default port, and have a hostname that is not `localhost`, not under `.local`, `.internal` or
`.localhost`, and not an IP literal; the hostname is then resolved and every address must be
public (not RFC 1918, loopback, link-local, carrier-grade NAT, unique-local, IPv4-mapped
private). The same guard runs on the issuer URL found in the metadata before the authorization
server is fetched. A failed guard refuses the scan with the reason (on demand) or records
`unknown` (nightly, for a listed server whose issuer fails the guard).

**Rationale**: SC-006: the issuer URL comes from a third party's metadata document, and a listed
server's URL is data anyone can propose in a pull request; the well-known paths derived from
either must not become a way to read the job's own network. Nothing a visitor enters ever reaches
the scanner (FR-010), so the guard is a second line of defence, not the first.

**Known limit**: Node's fetch resolves the name again when it connects, so a name that changes
its answer between the check and the connection (DNS rebinding) could reach a private address
once. The job runs with no private network attached (Scaleway Serverless Jobs by default) and
only ever against URLs that are in the repository or in a listed server's own metadata, which
bounds the damage; a resolver hook can close the window in a later revision.

**Rejected**: Resolving and connecting to the IP (breaks TLS name validation and SNI). Skipping
the guard because targets come from the repository (the issuer URL does not; it is read from the
server's metadata at run time).

## R4. Well-known locations

**Decision**: For an MCP server URL `https://h/p/a/t/h` the scanner tries the protected
resource metadata at `https://h/.well-known/oauth-protected-resource/p/a/t/h` (path-aware,
RFC 9728 §3) and then at `https://h/.well-known/oauth-protected-resource` (root); with no path
the two coincide and one request is made. For the first authorization server issuer
`https://a/i` it tries `https://a/.well-known/oauth-authorization-server/i`,
`https://a/.well-known/openid-configuration/i` and `https://a/i/.well-known/openid-configuration`
in that order (the three locations the MCP specification names); with no path the first two,
without the suffix. The first document that parses as a JSON object wins; the report lists every
request with its status.

**Rationale**: These are exactly the locations the specification tells clients to try, which is
what "public metadata" means (constitution III). Query strings and fragments of the server URL are
dropped; a trailing slash is removed before the path is appended.

**Rejected**: Guessing other paths (`/oauth/.well-known/…`) that no specification names. Sending
a request to the MCP endpoint to read `WWW-Authenticate` (an unauthenticated request to the
service itself; the feature data marks it `active`, and the constitution reserves active probes
for verified owners).

## R5. One check per passive feature

**Decision**: The scanner has one check per feature with `observable: passive` and a server
party (12 at the current revision), keyed by feature id, each a pure function of the probe
result. The check list is derived from the data at run time, so a new passive feature fails the
run with a clear message until a check is written for it, and a feature that leaves the revision
is no longer judged. The decision table is in `data-model.md`.

**Rationale**: FR-001 and FR-003. Deriving the list from the data keeps the model the source of
truth; a check that exists for a feature the data no longer lists is dead code, and a feature
without a check is an honest gap to be closed, not silently skipped.

**Rejected**: A hard-coded list in the scanner that ignores the data (drift). Judging
`active` or `manual` features from metadata hints (a claim the method cannot support).

## R6. What is appended, and when

**Decision**: For each (server, feature) the scanner compares its result with the cell's current
observation (newest, ties by method strength, as the atlas computes it). It appends when there is
no observation, when the current one was not written by this scanner version, or when status or
evidence differ. It never appends otherwise and never edits. Evidence strings are deterministic
(URL, HTTP status, the deciding field and its value) so the comparison is exact.

**Rationale**: FR-004 and FR-005, SC-003. Appending every night would bury the history the atlas
renders. Re-appending once per scanner version means every cell says which scanner judged it.

**Rejected**: A separate "last checked" record outside the observation list (a new entity, and a
private copy of state, constitution I). Re-appending on a fixed cadence (noise without new
information; the pull request's description is the record of the run).

## R7. The grade

**Decision**: The rule in FR-008, applied to the report's checks and their levels in the current
revision, and published next to every grade. The grade is computed at render time from the
newest scanner observations; it is not stored. It appears on report pages and in the scanner
index, which stays alphabetical.

**Rationale**: The roadmap asks for a graded report; constitution III and 001's FR-014 forbid
ranking servers by anything but the data and forbid turning missing data into failure. Deriving
the letter from model data by a public rule, withholding it when a MUST is unknown, and never
sorting by it satisfies both.

**Rejected**: A numeric score (false precision). Counting `unknown` against the server (the
absence of data is never a failure). Showing the grade in the atlas matrix (the matrix is
neutral by design; the report is where the letter belongs).

## R8. The nightly run

**Decision**: The scan runs in one place only: a Scaleway Serverless Job in an EU region on the
cron schedule `17 3 * * *`, from the image `Dockerfile` builds, with the command
`pnpm scan:nightly` (`scripts/scan-nightly.ts`). The job shallow-clones `main`, runs
`pnpm scan --all --write --summary`, validates the data and the append-only rule, and when
anything was appended commits to `scanner/<date>`, pushes and opens one pull request with the run
summary as its description (or updates the open one for that branch). It authenticates to GitHub
with a fine-grained token (`SCANNER_TOKEN`, the job's secret) sent as an `Authorization` header,
so the pull request triggers CI like any other. `contracts/job.md` is the contract.

**Rationale**: Constitution VII names Scaleway for the backend and its scheduled job; the owner
confirmed on 2026-10-14 that all scanning happens in scheduled backend jobs that only feed data
back into the repository, and that none of it runs on GitHub's runners. FR-006 (one pull request
a night, nothing merged without review).

**Rejected**: A scheduled GitHub Actions workflow (the first draft of this plan): the scan is not
part of building or testing the repository, so it does not belong on CI runners, and the
constitution places it on Scaleway. A third-party "create pull request" action (the job calls
GitHub's REST API directly, `src/scanner/nightly.ts`, tested with an injected `fetch`).
Committing to `main` directly (every change is a pull request, data changes included).

## R9. Deployment of the job

**Decision**: A dedicated workflow, `.github/workflows/scanner-deploy.yml`, is the only path to
Scaleway: on a push to `main` that touches the scanner, or by hand, it builds the image, pushes it
to the Scaleway Container Registry tagged with the commit, and updates the Serverless Job
definition's image through the Scaleway CLI. The job definition itself (schedule, resources,
`SCANNER_REPO`, the `SCANNER_TOKEN` secret) is created once by the owner and recorded as the
repository variable `SCW_JOB_DEFINITION_ID`; Scaleway credentials are repository secrets in the
`production` environment, like the Bunny credentials of the site deploy.

**Rationale**: The owner's requirement (2026-10-14) that Scaleway deployment happens through a
dedicated workflow, and the site deploy's precedent (`deploy.yml`: the platform's own API from a
workflow, credentials in secrets, nothing deployed by hand).

**Rejected**: Building the image on Scaleway from the repository (one more place with repository
access). Creating the job definition from the workflow on every run (the definition carries the
secret and the schedule, which are set once; the workflow only moves the image forward).

## R10. One report, one renderer

**Decision**: The report is one TypeScript shape (`contracts/report.md`), produced by the library
for the command and by `src/lib/scanner.ts` from observations for the pages. One Svelte
component, `ScanReport.svelte`, renders it on the report page at build time without hydration:
plain HTML, no JavaScript shipped, no island anywhere on the scanner pages.

**Rationale**: FR-007 and FR-013: only one markup has to meet the budgets and the token rules.
Islands only where interaction needs them (constitution V), and nothing on these pages needs
interaction.

**Rejected**: An on-demand scan form backed by an HTTP service (the first draft of this plan): the
owner ruled out scanning triggered by visitors on 2026-10-14; all scanning is scheduled and feeds
the repository only. Rendering the report in an Astro component instead of Svelte would also
work; Svelte was kept because `StatusCell`'s chip markup and classes are reused as is.

## R11. Scanner version and observer

**Decision**: `SCANNER_VERSION` is a constant in `src/scanner/version.ts`; observations carry
`observedBy: scanner@<version>`. The version bumps when a check's logic or evidence format
changes, which re-observes every cell on the next run (R6).

**Rationale**: SC-007 of 001 (every change is attributable to a named automated process) and
R6's append rule.
