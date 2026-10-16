---

description: "Task list for the Scanner feature"
---

# Tasks: Scanner

**Input**: Design documents from `/specs/004-scanner/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. The constitution (Principle VI) requires Vitest and Playwright with screenshot
comparison, and SC-002, SC-003, SC-004 and SC-006 are defined as tests over recorded responses.
Unit tests for a story are written before its implementation and must fail first. No test
contacts a server.

**Organization**: Tasks are grouped by user story so each story is an independently testable
increment. Phase 1 is setup (scripts, fixtures); Phase 2 is the library core every story reads:
URLs, guard, fetcher, probe, checks, grade, report.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1 to US4 from spec.md)
- Include exact file paths in descriptions

## Path Conventions

Single Astro project at the repository root as laid out in plan.md: `src/scanner/` (library and
job step), `src/lib/scanner.ts` (page derivations), `scripts/`, `tests/`, `docs/`.

---

## Phase 1: Setup

**Purpose**: Scripts, version constant and the recorded responses every test uses

- [x] T001 Add `scan` (`tsx scripts/scan.ts`) and `scan:nightly` (`tsx scripts/scan-nightly.ts`, T017) to `package.json` scripts; add `src/scanner/version.ts` with `SCANNER_VERSION = "0.1.0"`, `SCANNER_NAME = "letsauth-scanner"`, `OBSERVER = "scanner@0.1.0"` and `USER_AGENT = "letsauth-scanner/0.1.0 (+https://letsauth.eu/scanner/)"`
- [x] T002 [P] Create recorded responses under `tests/fixtures/scanner/`: `complete.json` (PRM at the path-aware location with two authorization servers and scopes, AS metadata at the first RFC 8414 location with S256, CIMD, iss parameter, no registration endpoint, all HTTPS endpoints), `root-prm.json` (PRM only at the root location, AS only at the OIDC path-appended location), `no-prm.json` (both PRM locations 404), `prm-5xx.json`, `prm-timeout.json`, `no-as.json` (PRM found, every AS location 404), `as-timeout.json`, `offline-access.json` (scopes include `offline_access`), `no-s256.json` (methods `plain` only), `no-methods.json` (field absent), `http-endpoint.json` (one `http:` endpoint), `issuer-mismatch.json`, `dcr.json` (registration endpoint present, CIMD absent), `redirect-cross-host.json` (PRM 302 to another host), `not-json.json` (200 with HTML); each file maps a URL to `{ status, headers, body }` or `{ error: "timeout" | "connection" | "tls" }` and includes a `target` URL

**Checkpoint**: `pnpm scan` is a script that fails because `scripts/scan.ts` is missing; fixtures load

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The library core: URL derivation, the guard, the fetcher, the probe, the checks, the grade and the report shape

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Unit test `tests/unit/scanner-urls.test.ts` before T004: `wellKnownPrmUrls("https://h/p/a/t/h")` is the path-aware URL then the root; a trailing slash, a query and a fragment are dropped; `https://h` and `https://h/` yield one URL; `wellKnownAsUrls("https://a/i")` is the three MCP locations in order; `https://a` yields two; `normaliseIssuer` removes one trailing slash
- [x] T004 Implement `src/scanner/urls.ts`: `wellKnownPrmUrls`, `wellKnownAsUrls`, `normaliseIssuer`, `sameIssuer(a, b)`; make T003 pass
- [x] T005 [P] Unit test `tests/unit/scanner-guard.test.ts` before T006: `guardUrl` refuses `http:`, credentials, a non-default port, `localhost`, `*.local`, `*.internal`, `*.localhost`, IP literals, and names whose injected resolver returns `10.0.0.1`, `127.0.0.1`, `169.254.1.1`, `100.64.0.1`, `::1`, `fc00::1`, `fe80::1`, `::ffff:192.168.0.1`; accepts a name resolving to `93.184.216.34` and `2606:2800:220:1:248:1893:25c8:1946`; the reason names the rule; the resolver is injected
- [x] T006 Implement `src/scanner/guard.ts`: `guardUrl(url, resolve = dns.lookup all)`, `isPublicAddress(ip)`; make T005 pass (depends on T004)
- [x] T007 Implement `src/scanner/fetch.ts`: `Fetcher = (url: string) => Promise<FetchResult>` with `FetchResult = { url, status, ok, contentType?, json?: unknown, error?: "timeout" | "connection" | "tls" | "redirect" | "not-json" | "too-large" | "refused", location? }`; `nodeFetcher(options)` using global `fetch` with `redirect: "manual"`, `AbortSignal.timeout(10_000)`, `Accept: application/json`, `User-Agent`, a 1 MiB cap read from the stream, manual redirects (at most 3, same host, `https:` only, guard re-run), JSON parse with `not-json` on failure; `recordingFetcher(fixture)` for tests that answers from a fixture map and records every URL asked
- [x] T008 [P] Unit test `tests/unit/scanner-checks.test.ts` before T009 and T010: for each fixture from T002 the `probe` result lists exactly the requests the research (R4) says and the `runChecks` statuses equal the decision table in data-model.md; assert in particular: `prm-timeout` and `prm-5xx` give `unknown` on every check; `no-prm` gives `unsupported` on `mcp.prm.well-known` and `unknown` on `mcp.prm` and every AS check; `redirect-cross-host` gives `unknown` with evidence naming `redirect`; `not-json` is "not found" at that URL; `http-endpoint` gives `partial` on `mcp.as.https`; `no-methods` and `no-s256` give `unsupported` on `mcp.as.pkce-s256`; `offline-access` gives `unsupported` on `mcp.prm.no-offline-access` and `complete` gives `supported`; a fixture without `scopes_supported` gives `unknown` there; `complete` lists the second issuer under `othersNotChecked`; every evidence starts with `https://` and contains no timestamp; a passive feature with no check throws naming the feature
- [x] T009 Implement `src/scanner/probe.ts`: `probe(targetUrl, fetcher, guard)` returning `Probe = { target, requests: RequestRecord[], prm?: { url, doc, resource?, authorizationServers: string[], scopesSupported?: string[] }, prmOutcome: "found" | "absent" | "error", as?: { issuer, url, doc, endpoints, … }, asOutcome: "found" | "absent" | "error" | "no-issuer", othersNotChecked: string[] }`; PRM locations tried in order until one parses as a JSON object; the first issuer is guarded then its locations tried in order; an issuer that fails the guard is `asOutcome: "error"` with the reason in the last request record (depends on T004, T006, T007)
- [x] T010 Implement `src/scanner/checks.ts`: `PASSIVE_CHECKS: Record<featureId, (probe) => { status, evidence }>` for the 12 features per the decision table; `runChecks(probe, features)` where `features` are the passive server-party features of the judged revision, throwing on a feature without a check; evidence formatted as `<url> — HTTP <status>; <field>: <value>` capped at 300 characters; make T008 pass (depends on T009)
- [x] T011 [P] Unit test `tests/unit/scanner-grade.test.ts` before T012: every combination of one MUST, one SHOULD and one MAY check across the five statuses maps to the letter FR-008 gives; `partial` counts as unsupported; MAY and DEPRECATED never change the letter; a MUST unknown withholds unless a MUST is unsupported; reasons name the feature names
- [x] T012 Implement `src/scanner/grade.ts`: `grade(checks: { level, status, name }[]): Grade = { letter: "A" | "B" | "C" | "F" | null, label, reasons: string[] }`; make T011 pass
- [x] T013 Implement `src/scanner/report.ts`: `Report`, `CheckResult`, `Discovered` types per contracts/report.md; `passiveFeatures(data, revisionId)` (the features judged, in `CATEGORY_ORDER` then id, `mcp-server` party first); `scan({ url, serverId? }, data, fetcher, now)` → `Report` with `recorded: false` and `observations[]` filled when `serverId` is set (depends on T010, T012)

**Checkpoint**: `pnpm test` passes for urls, guard, checks and grade; `scan()` returns a full report over the `complete` fixture

---

## Phase 3: User Story 1 - Wake up to a pull request of fresh observations (Priority: P1) 🎯 MVP

**Goal**: `pnpm scan --all --write` appends exactly the observations the append rule says and prints a summary; the Scaleway job runs it every night and opens one pull request when something changed.

**Independent Test**: Quickstart scenarios 2, 5 (write part) and 10.

### Tests for User Story 1

- [x] T014 [P] [US1] Unit test `tests/unit/scanner-append.test.ts` before T015: `toAppend(report, data)` returns every check when the dataset has no observation for the server; returns `[]` when the dataset's current cells are the same scanner version with equal status and evidence; returns the one changed cell when one evidence differs; returns every cell when the current cells are `scanner@0.0.9`; returns the cell when the current one is `vendor-claim` with the same status; respects method-strength ties; `appendObservations` on a scratch copy of `data/observations/<id>.yaml` keeps the existing text byte-identical as a prefix and the result parses with `observationFileSchema`; `appendObservations` creates the file when missing; `summarise(runs)` renders the Markdown the pull request uses with per-server appended and unknown counts
- [x] T015 [US1] Implement `src/scanner/observations.ts`: `currentCellOf(data, serverId, featureId, revisionId)` reusing `currentCell` from `src/lib/atlas.ts`; `toAppend(report, data)`; `appendObservations(filePath, entries)` writing YAML entries with `yaml`'s `stringify` on a list and appending the text after the existing content (adding a trailing newline when missing); `summarise(results: { server, report, appended }[])` → Markdown (depends on T013)
- [x] T016 [US1] Implement `scripts/scan.ts`: arguments `<url> | <server-id> | --all`, flags `--write`, `--summary <file>`, `--json`, `--timeout <ms>`; loads the dataset with `getDataset()`; resolves a server id to its URL; skips withdrawn and `stdio-only` servers under `--all`; runs scans sequentially with the AS metadata cached per issuer within the run; prints a terminal report (grade, reasons, one line per check with status glyph word, level, evidence) or JSON; with `--write` appends per server and prints the count; writes the summary file; exits 1 on a guard refusal or a thrown error, 0 otherwise (depends on T015)
- [x] T017 [US1] Implement the nightly job: `src/scanner/nightly.ts` (`upsertPullRequest` over GitHub's REST API with an injected `fetch`, `branchFor`, `commitMessage`) with `tests/unit/scanner-nightly.test.ts` first; `scripts/scan-nightly.ts` (`pnpm scan:nightly`): shallow-clone `SCANNER_BASE` of `SCANNER_REPO` with `SCANNER_TOKEN` as an `Authorization` header, install, `pnpm scan --all --write --summary scan-summary.md`, `pnpm validate:data`, `pnpm check:append-only HEAD`, exit 0 with "nothing to append" when `data/observations` is unchanged, else commit to `scanner/<date>`, push `--force-with-lease`, open or update the pull request `Scanner: <date>` with the summary and the label `data`; exit 1 on any failure. (Revised 2026-10-14: replaced the GitHub Actions schedule the first draft had.)
- [x] T018 [US1] Write `docs/scanner.md`: what the scanner reads and never does, the decision table pointer, the append rule, running the command, the Scaleway job (creating it once, `SCANNER_TOKEN` as its secret), the deploy workflow and its secrets and variables, reviewing a scanner pull request, how a server owner opts out, and the scanner's `User-Agent` string

**Checkpoint**: `pnpm scan notion --write` on a scratch copy appends validating entries; `pnpm scan:nightly` without `SCANNER_TOKEN` exits 1 with the reason; `docs/scanner.md` exists

---

## Phase 4: User Story 2 - Read a server's scan report (Priority: P2)

**Goal**: `/scanner/{id}/`, `/scanner/{id}.json` and `/scanner/` render from observations alone, with the grade rule published next to every grade.

**Independent Test**: Quickstart scenarios 7, 8, 9, 11 and 12.

### Tests for User Story 2

- [x] T019 [P] [US2] Unit test `tests/unit/scanner-view.test.ts` before T020: `passiveChecks(data, current)` returns the 12 features, server party first; `latestScan` over a synthetic dataset picks the newest `passive-scan` observation by `scanner@*` per feature, ignores `vendor-claim` and `manual` ones, reports `unknown` without `observedAt` for a feature without one, sets `scannedAt` to the newest date, and grades by FR-008; a server with no scanner observation yields `grade.letter null` with label "Not scanned"; `scannerIndex` is ordered by server name and excludes withdrawn servers; `reportFromView` validates against the report contract shape
- [x] T020 [US2] Implement `src/lib/scanner.ts`: `passiveChecks`, `latestScan`, `scannerIndex`, `reportFromView(data, server, generatedAt)` (contracts/report.md with `recorded: true`, empty `requests`, `discovered` null); import `grade` from `src/scanner/grade.ts` (pure, no network) and `GRADE_RULE` text from `src/lib/labels.ts`; make T019 pass
- [x] T021 [P] [US2] Playwright test `tests/e2e/scanner.spec.ts`: `/scanner/` lists every non-withdrawn server alphabetically (`li[data-server]` count and order equal `scannerIndex`), each with a grade cell whose text is a letter, "Withheld" or "Not scanned", and a link to `/scanner/{id}/`; the rule section `#grade-rule` lists the five rules; with JavaScript disabled the page has the same list and either the `<noscript>` note or the "not configured" note; at phone width no horizontal scroll; axe clean; screenshot `scanner.png`; a report page for a server with scanner observations (skip when none) shows `[data-check]` rows equal to the passive feature count with level, status and evidence link and the grade's reasons; a report page for a server without scanner observations shows `#not-scanned` and no `[data-grade-letter]`; axe clean; screenshot `report.png`
- [x] T022 [P] [US2] Create `src/components/GradeBadge.astro`: props `grade`; renders the letter in a large display-font tile with the label text beside it ("Grade A", "Grade withheld", "Not scanned"), `data-grade-letter` when a letter exists, a class per letter for the token colour, and the reasons as a list when present; never colour alone
- [x] T023 [US2] Create `src/components/ScanReport.svelte`: props `report` (checks, grade, target, revision, recorded); renders the grade block (letter tile, label, reasons), then a table of checks grouped by party with feature name linked to `/atlas/mcp/features/{id}/`, level tag, status (filled chip for observed, dashed ring for unknown, reusing the `StatusCell` markup and classes), evidence (URL linked, note after it), date; a "not scanned" block when `recorded` and no check has `observedAt`; styles with tokens only; no `onMount` or browser API so it renders at build time (depends on T020)
- [x] T024 [US2] Create `src/pages/scanner/[id].astro` with `getStaticPaths` over all servers (withdrawn get `noindex` and the withdrawn notice): breadcrumb (Scanner / server), eyebrow, name, the revision judged and the newest scan date, `ScanReport` rendered without a client directive, the grade rule (`GRADE_RULE`), a "What the scanner does not check" note listing the active and manual requirements with links, links to the atlas server page and the JSON, and "Run it yourself" with the command (depends on T022, T023)
- [x] T025 [P] [US2] Create `src/pages/scanner/[id].json.ts` returning `reportFromView` for every non-withdrawn server (depends on T020)
- [x] T026 [US2] Create `src/pages/scanner/index.astro`: head (eyebrow, title, lede, facts: servers scanned, checks per server, newest run date), "How it works" (the five well-known locations, GET only, no credentials, `unknown` on failure, the `User-Agent`), the grade rule `#grade-rule`, the form slot (T030 fills it; until then the "not configured" note), the index table `#scanner-index` (server, grade badge small, newest scan date, link) alphabetical, "Run it yourself", "Opt out" (withdraw via the issue form), links to docs (depends on T022, T020)
- [x] T027 [US2] Add "Scanner" to the navigation and footer in `src/layouts/Base.astro`; add the "Passive scan" line to the status card in `src/pages/atlas/mcp/servers/[id].astro` (grade and date linked to the report, or "not scanned yet"); update the scanner sentence on `src/pages/index.astro` to link `/scanner/`; add `/scanner/index.html` and `/scanner/notion/index.html` to `lighthouserc.json` (depends on T024, T026)

**Checkpoint**: Both pages render from data alone, T021 passes except the data-dependent report test (skipped until the first scanner pull request merges), budgets hold

---

## Phase 5: The job image and its deployment (User Story 3 removed 2026-10-14)

**Goal**: The image the Scaleway job runs is built from the repository and reaches Scaleway only through a dedicated workflow. The first draft of this phase built an on-demand HTTP service (`src/scanner/server.ts`), its island form (`ScanForm.svelte`) and their test; the owner removed on-demand scanning on 2026-10-14 and those files were deleted. The task ids are kept.

**Independent Test**: Quickstart scenarios 6 and 10.

- [x] T028 [P] Add `Dockerfile` (Node 22 alpine, `git`, corepack pnpm, copy the repository, `pnpm install --frozen-lockfile --prod=false`, `USER node`, `CMD ["pnpm", "scan:nightly"]`, no port) and `.dockerignore` (`node_modules`, `dist`, `.astro`, `tests/e2e/__screenshots__`, `playwright-report`, `test-results`, `.git`)
- [x] T029 Add `.github/workflows/scanner-deploy.yml`: on `push` to `main` touching the scanner paths and on `workflow_dispatch`, environment `production`; check that `SCW_REGISTRY_NAMESPACE`, `SCW_JOB_DEFINITION_ID` and `SCW_SECRET_KEY` are set; `docker login rg.<region>.scw.cloud -u nologin`; build and push `letsauth-scanner:<sha>` and `:latest`; `scw jobs definition update <id> image-uri=<image>:<sha>` through `scaleway/action-scw`
- [x] T030 Write `specs/004-scanner/contracts/job.md` (job steps, schedule, resources, environment, secret, the run summary, the deployment workflow and its configuration) and delete `contracts/service.md`; remove the on-demand routes from `contracts/routes.md`
- [x] T031 Remove on-demand scanning: delete `src/scanner/server.ts`, `src/components/ScanForm.svelte`, `tests/unit/scanner-service.test.ts` and the `scan:serve` script; remove the form, the `PUBLIC_SCANNER_URL` switch and the no-JS note from `src/pages/scanner/index.astro`; drop the live-report branch from `ScanReport.svelte`; update `tests/e2e/scanner.spec.ts`

**Checkpoint**: `docker build .` succeeds; the deploy workflow lints; no page bundle contains scanner code

---

## Phase 6: User Story 4 - Run the scanner yourself (Priority: P4)

**Goal**: The command is documented and its output matches the pages; a contributor can append by hand.

**Independent Test**: Quickstart scenario 5.

- [x] T032 [US4] Extend `scripts/scan.ts` terminal output: a header with target, revision, grade and reasons, the check table aligned, the request list with statuses, and a closing line naming how many observations `--write` would append; `--json` prints the report contract; exit codes per FR-012 (depends on T016)
- [x] T033 [P] [US4] Add a "Scanner observations" section to `docs/atlas-maintenance.md` (reviewing a scanner pull request: open each evidence URL, what `unknown` means, when to bump `SCANNER_VERSION`) and a "Run the scanner" paragraph to `src/pages/atlas/mcp/contribute.astro` pointing at `pnpm scan <id> --write` as the preferred path for passive cells
- [x] T034 [P] [US4] Extend `.github/pull_request_template.md`'s data checklist with "Scanner observations come from `pnpm scan` and were not edited by hand"

**Checkpoint**: A contributor can reproduce every scanner cell with one command

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Docs, roadmap, budgets, the full quickstart run

- [x] T035 [P] Update `docs/roadmap.md` (004 implemented, pull request open), `README.md` (scanner link and the command), `CLAUDE.md` (`pnpm scan` in Commands; the note that `src/scanner/` is the only code that may contact a server and the site build never imports it; "Seed data is vendor-claim or manual" becomes "Seed data is vendor-claim or manual; scanner cells arrive by pull request")
- [x] T036 [P] Confirm Biome, typecheck and the build include `src/scanner/` and `scripts/scan.ts` without pulling the scanner into any page bundle (`pnpm build` output lists no `scanner` or `ScanForm` chunk; the scanner pages ship no JavaScript)
- [x] T038 Fold the scanner index into the atlas: the matrix server cell carries the latest grade (`GradeBadge` variant `cell`, linked to the report, masked in the matrix screenshot), `/scanner/` loses its server table and gains "Where the results show", report breadcrumbs lead through the atlas, "Scanner" leaves the main navigation; e2e and spec updated (FR-009, scenario 5)
- [x] T037 Run every quickstart.md scenario (1 to 12) and record results in `specs/004-scanner/checklists/quickstart-run.md`; scenarios 10 and the live part of 6 are recorded as "run from GitHub / by the maintainer" when the environment has no network; refresh screenshot baselines through the `refresh-screenshots` label on the pull request
- [x] T039 Append rule against the scanner's own last observation (FR-005 as amended 2026-10-16): `toAppend` reads `newestScannerObservation`, `heldCells` names the cells a newer human observation holds against the scan, the run summary lists them under Notes; `pnpm observe` appends one validated manual observation; Figma's DCR recorded as `partial` (`tests/unit/scanner-append.test.ts`, quickstart scenario 13)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Phase 1; BLOCKS all user stories. Order inside: T003 → T004; T005 → T006; T007 alongside; T008 → T009 → T010; T011 → T012; T013 last
- **User Stories (Phase 3 to 6)**: All depend on Phase 2. US1 is the MVP. US2 needs only T012 and T013 from Phase 2 plus the dataset. US3 needs T013 and T006, and T023 for the island. US4 extends T016
- **Polish (Phase 7)**: T035 and T036 after the stories; T037 last

### User Story Dependencies

- **US1 (P1)**: After Phase 2. No story dependencies
- **US2 (P2)**: After Phase 2. Independent of US1 (renders from whatever observations exist)
- **Phase 5**: After US1 (T017); no story of its own since 2026-10-14
- **US4 (P4)**: After US1 (T016)

### Within Each User Story

- Tests are written first and must fail before implementation
- Library before command, command before workflow; components before pages, pages before cross-links
- Story complete and its checkpoint green before moving on

### Parallel Opportunities

- Phase 1: T001 and T002 in parallel
- Phase 2: T003, T005, T007, T008, T011 in parallel; then T004, T006; then T009, T010, T012; then T013
- Phase 4: T019, T021, T022, T025 in parallel; T023 after T020; T024 and T026 after T022 and T023
- Phase 5: T028 and T031 in parallel with T029
- Phase 7: T035 and T036 in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and 2 with the recorded responses
2. Complete Phase 3: the command and the workflow
3. **STOP and VALIDATE**: quickstart scenarios 1, 2, 3, 4 and 5; dispatch the workflow once
4. The first pull request of measured cells is already the feature's promise (roadmap 004)

### Incremental Delivery

1. Setup + Foundational → every check and the grade tested over fixtures
2. US1 → the command, the append rule, the nightly pull request (MVP)
3. US2 → the report pages and the index, the grade published
4. Phase 5 → the job image, the deploy workflow and the job contract (on-demand scanning removed)
5. US4 → the contributor path
6. Polish → docs, roadmap, budgets, quickstart run

---

## Notes

- [P] tasks = different files, no dependencies
- Every status a check writes is quoted from the decision table in data-model.md; nothing is
  left to implementation-time discretion
- `pnpm check` must pass before each commit; commit after each task or logical group
- No test and no build step contacts a server; the live scenarios run from GitHub or by the
  maintainer and are recorded as such in the quickstart run
