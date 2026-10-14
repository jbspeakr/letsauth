# Research: Scanner

Phase 0 of the plan. Each entry records a decision, why, and what was rejected.

## R1. Where the code lives

**Decision**: The scanner is a library under `src/scanner/` (probing, checks, grading,
observation writing, the on-demand HTTP service), driven by one command, `scripts/scan.ts`
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
recorded responses and the service test records every request made.

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

**Rationale**: FR-010 and SC-006: the on-demand service takes URLs from strangers; the well-known
paths it derives must not become a way to read an internal network's metadata.

**Known limit**: Node's fetch resolves the name again when it connects, so a name that changes
its answer between the check and the connection (DNS rebinding) could reach a private address
once. The service runs with no private network attached (Scaleway Serverless Containers by
default), which bounds the damage; a resolver hook can close the window in a later revision.

**Rejected**: Resolving and connecting to the IP (breaks TLS name validation and SNI). An allow
list of hosts (defeats the on-demand use case).

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

**Decision**: A scheduled GitHub Actions workflow (`.github/workflows/scan.yml`) runs
`pnpm scan --all --write` and, when the data changed, commits to a branch named
`scanner/<date>` and opens one pull request with the run summary as its description. It uses a
fine-grained token from the `SCANNER_TOKEN` secret when present (so the pull request triggers CI
like any other) and falls back to the workflow token (CI then starts when a maintainer pushes to
or reopens the pull request, a documented GitHub limitation). `workflow_dispatch` runs it by hand.

**Rationale**: FR-006 and the honesty test "maintainable by one person": no account, no infra and
no secret beyond what the repository already has. The constitution names Scaleway for the
backend; the on-demand service ships as a container image for it (R9), and the same image can
run the nightly command as a Scaleway scheduled job once an account exists. The plan's
Complexity Tracking records this.

**Rejected**: A third-party "create pull request" action (the deploy workflow's precedent is to
use the platform's own API). Committing to `main` directly (constitution: every change is a
pull request, data changes included).

## R9. The on-demand service

**Decision**: A small HTTP service on `node:http` in `src/scanner/server.ts`: `GET /healthz`,
`POST /scan` with `{ "url": … }` (and `GET /scan?url=…` for curl), returning the report JSON
with `Cache-Control: no-store` and CORS headers for the site's origin. It keeps an in-memory
token bucket per client address (six scans a minute), caps concurrent scans, refuses URLs that
fail the guard with HTTP 400 and the reason, and stores nothing. A `Dockerfile` at the repository
root builds the image for Scaleway Serverless Containers; the port comes from `PORT`. The site
reads the service's base URL from `PUBLIC_SCANNER_URL` at build time; when it is unset, the page
shows a note instead of the form.

**Rationale**: FR-010, FR-011, constitution IV (a backend only for what cannot be static) and VII
(Scaleway in an EU region). No framework is needed for two routes.

**Rejected**: Storing results for shareable URLs (needs object storage and an edge rule; deferred,
recorded in the spec's assumptions). Running the scan in the visitor's browser (CORS forbids
reading other origins' metadata, and a passive scan from the lab's own address is what the
report should describe).

## R10. One report, two renderers

**Decision**: The report is one TypeScript shape (`contracts/report.md`), produced by the library
for the command and the service, and by `src/lib/scanner.ts` from observations for the pages.
One Svelte component, `ScanReport.svelte`, renders it: the static report page renders it at
build time without hydration (plain HTML, no JavaScript shipped), and the on-demand island
renders the same component in the browser for a fresh result.

**Rationale**: FR-007, FR-011 and FR-013: the visitor sees the same table for a listed server and
for an on-demand scan, and only one markup has to meet the budgets and the token rules. Islands
only where interaction needs them (constitution V): the island is the form, not the report.

**Rejected**: Two renderers (an Astro table for the pages and a Svelte one for the island) that
would drift.

## R11. Scanner version and observer

**Decision**: `SCANNER_VERSION` is a constant in `src/scanner/version.ts`; observations carry
`observedBy: scanner@<version>`. The version bumps when a check's logic or evidence format
changes, which re-observes every cell on the next run (R6).

**Rationale**: SC-007 of 001 (every change is attributable to a named automated process) and
R6's append rule.
