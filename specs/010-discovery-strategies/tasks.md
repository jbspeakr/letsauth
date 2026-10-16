# Tasks: Composable discovery strategies

**Input**: `specs/010-discovery-strategies/` · **Tests**: unit tests over recorded responses; the
scanner never touches the network in tests.

## Phase 1: Setup

- [x] T001 Flip `observable` to `passive` in `data/features/mcp.rs.scope-challenge.yaml`
- [x] T002 Correct `url` and `transport` of `atlassian`, `plaid`, `linear`, `sentry`, `cloudflare-workers` to their documented `/mcp` endpoints (FR-007)
- [x] T003 Bump `SCANNER_VERSION` to `0.3.0` (R7)

## Phase 2: Foundational

- [x] T004 `src/scanner/strategies.ts`: `Strategy`, `strategy()`, `firstOf()`, `CheckOutcome.via` (FR-002)
- [x] T005 `src/scanner/discovery.ts`: `ENDPOINT_LADDER` (`get`, `post-empty`), `routedElsewhere`, `endpointNote`, `MAX_REQUESTS` (FR-001, FR-005)
- [x] T006 `src/scanner/fetch.ts`: mode `challenge-post` (POST, empty body, JSON content type), `method` on results, fixture key `POST <url>`
- [x] T007 `src/scanner/challenge.ts`: parse the `scope` parameter into a list

## Phase 3: User Stories 1 to 4

- [x] T008 [US1] `src/scanner/probe.ts`: run the ladder, record `endpointRequests`, `challenge.method/step/scope`, `as.scopesSupported`, `endpointNote`
- [x] T009 [US2] `src/scanner/checks.ts`: every check as a strategy list (`CHECK_STRATEGIES`), `PASSIVE_CHECKS` derived with `firstOf`
- [x] T010 [US3] Strategies `challenge.scope` for `mcp.rs.scope-challenge`; `prm.scopes` → `challenge.scope` → `as.scopes` → `prm.silent` for `mcp.prm.no-offline-access` (FR-003, FR-004)
- [x] T011 [US4] `src/scanner/report.ts`: `via`, `challenge.method/step/scope`, `endpointNote`; `src/scanner/observations.ts`: the summary's Notes column and wording
- [x] T012 Fixtures `challenge-post`, `stale-sse`, `redirect-landing`, `as-scopes`, `as-scopes-offline`, `challenge-scope-offline`; `complete` gains a scope; tests in `scanner-checks`, `scanner-challenge`, `scanner-view` (fourteen checks)

## Phase 4: Prose

- [x] T013 `src/pages/scanner/index.astro`: the ladder in "What it reads", the request count from `MAX_REQUESTS`, the strategies sentence
- [x] T014 `docs/scanner.md` (what it reads, strategies section, version note), `docs/atlas-maintenance.md`, `docs/roadmap.md` (row 010), `specs/004-scanner/data-model.md` and `contracts/report.md`
- [ ] T015 `pnpm check`; refresh the scanner page screenshot through the `refresh-screenshots` label on the pull request; verify quickstart row 10 on the next nightly run
