# Tasks: Discovery challenge check

**Input**: Design documents from `/specs/008-discovery-challenge/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/report.md

**Tests**: Written first for the parser, the checks and the grade, as 004 did; the scanner must
never touch the network in tests.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [x] T001 Flip `observable` to `passive` in `data/features/mcp.prm.www-authenticate.yaml`; run `pnpm validate:data`
- [x] T002 Bump `SCANNER_VERSION` to `0.2.0` in `src/scanner/version.ts` (research R6)

## Phase 2: Foundational

- [x] T003 [P] Unit test `tests/unit/scanner-challenge.test.ts` before T004: `parseChallenge` finds `resource_metadata` as a quoted string and as a token, case-insensitively, in the first or a later challenge of a comma-joined value, returns the schemes seen, and returns no pointer for a header without the parameter or an empty header
- [x] T004 Implement `src/scanner/challenge.ts`: `parseChallenge(header: string): { resourceMetadata?: string; schemes: string[] }` (research R5)
- [x] T005 Extend `src/scanner/fetch.ts`: `Fetcher = (url, mode?: "json" | "challenge")`; `FetchResult` gains `wwwAuthenticate?: string`; in challenge mode `nodeFetcher` sends `Accept: application/json, text/event-stream`, follows redirects under the same rules, cancels the body before reading, returns `found` for 401 (with the header when present), `absent` for any other definite status, `error` for failures and 5xx; `recordingFetcher` answers challenge mode from the fixture's `status` and `headers["www-authenticate"]`

## Phase 3: User Story 1 - A server that announces its metadata only in the challenge gets a grade (Priority: P1) 🎯 MVP

- [x] T006 [P] [US1] Fixtures under `tests/fixtures/scanner/`: `challenge-pointer.json` (no well-known, 401 with a pointer to `https://mcp.example.com/oauth/prm.json`, that document, the AS), `challenge-no-pointer.json` (well-known present, 401 with `Bearer realm` only), `challenge-neither.json` (no well-known, 401 without a pointer), `challenge-405.json` (well-known present, endpoint 405), `challenge-timeout.json` (endpoint times out), `challenge-pointer-private.json` (pointer at `https://10.0.0.1/prm`), and a 401 with a pointer added to `complete.json`
- [x] T007 [P] [US1] Unit tests in `tests/unit/scanner-checks.test.ts` before T008–T009: the check list is thirteen with `mcp.prm.www-authenticate` after `mcp.prm.well-known`; every scenario of quickstart 1–8 with the exact request list (the endpoint once, the pointer only when followed); the endpoint record has `ok: false`; evidence starts with the endpoint URL and stays within 300 characters; existing scenarios updated for the endpoint request
- [x] T008 [US1] Extend `src/scanner/probe.ts`: new `Probe` fields per data-model.md; after the well-known step, `fetcher(target, "challenge")`; when nothing was found at a well-known location and the challenge has a pointer, guard it with `options.guard`, fetch it in JSON mode and use it as `prm` with `location: "challenge"`; `prmOutcome` and `prmLast` cover both paths; `wellKnownOutcome`/`wellKnownLast` keep the well-known result
- [x] T009 [US1] Extend `src/scanner/checks.ts`: `mcp.prm.www-authenticate` per the decision table; `mcp.prm.well-known` judged from `wellKnownOutcome` and `prm.location !== "challenge"`; `prmMissing` names the well-known tries, the challenge outcome and the pointer fetch
- [x] T010 [P] [US1] Unit test in `tests/unit/scanner-grade.test.ts` before T011: every combination of the two discovery statuses (supported/unsupported/unknown × same) grades as FR-005, including well-known `supported` with challenge `unsupported` → not F
- [x] T011 [US1] `src/scanner/grade.ts`: `EITHER_OR` symmetric; the rule text says the two mechanisms are alternatives in both directions and that the challenge is now read
- [x] T012 [US1] `src/scanner/report.ts`: `Discovered.protectedResource.location` gains `"challenge"`; `Discovered.challenge` per contracts/report.md; `src/scanner/observations.ts`: the summary names the endpoint request and that no body is read
- [x] T013 [US1] `tests/unit/scanner-view.test.ts`: thirteen checks; observer string from `OBSERVER`; any other test that spells `scanner@0.1.0`

**Checkpoint**: `pnpm test` green; `pnpm scan https://mcp.example.com/mcp` against a fixture server would list seven requests at most

## Phase 4: User Story 2 - The atlas shows which discovery mechanism each server offers (Priority: P2)

- [x] T014 [P] [US2] `src/pages/scanner/index.astro`: "What it reads" gains the endpoint request (status and headers only, body never read, why it is still passive); "at most seven" requests; the lede no longer says "no request to the endpoint itself"
- [x] T015 [P] [US2] `src/pages/atlas/mcp/contribute.astro`: replace "twelve" with the count derived from `passiveChecks`
- [x] T016 [P] [US2] `docs/scanner.md`: what it reads (the endpoint step and the pointer), the request count, the "never does" list, the version bump; `docs/atlas-maintenance.md`: `observable: passive` includes the challenge; `docs/roadmap.md`: 008 implemented (pull request open)
- [x] T017 [P] [US2] `specs/004-scanner/data-model.md`: a line pointing at the 008 rows and the new probe fields; `specs/004-scanner/contracts/report.md`: the additive fields
- [x] T018 [US2] `pnpm check`; `pnpm build && pnpm test:e2e` where Chromium allows; add the `refresh-screenshots` label to the pull request for the scanner page baselines (the check count changed)

**Checkpoint**: pages and docs say what the scanner sends; the challenge feature is a report row

## Dependencies

- T001–T002 first (the feature list and version drive every test expectation).
- T003 → T004; T005 before T008; T006–T007 before T008–T009; T010 before T011; T012 after T008.
- Phase 4 is prose and can run in parallel with Phase 3 once T001 is in.
