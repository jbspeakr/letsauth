# Quickstart: Scanner

How to run and validate the feature end to end. Implementation details belong in `tasks.md`.

## Prerequisites

- Node.js 22 LTS, pnpm 10
- Playwright's pinned Chromium (`pnpm exec playwright install chromium`) for screenshots
- Network access to the servers under test for the real-run scenarios (CI has none and needs
  none; every CI test runs over recorded responses)

## Setup

```sh
pnpm install
pnpm scan https://mcp.example.com/mcp        # report in the terminal, nothing written
pnpm scan notion                             # a listed server by id
pnpm scan notion --write                     # append the observations the nightly rule would
pnpm scan --all --write --summary out.md     # what the nightly workflow runs
pnpm scan:serve                              # the on-demand service on http://localhost:8080
pnpm dev                                     # http://localhost:4321/scanner/
```

## One command for everything

```sh
pnpm check              # validate:data, lint (Biome), typecheck, unit tests, build
pnpm test:e2e           # Playwright against the built site, including screenshots
```

## Validation scenarios

| # | Scenario | Steps | Expected |
|---|---|---|---|
| 1 | Checks over recorded responses (US1, FR-001, FR-003) | `pnpm test` (`tests/unit/scanner-checks.test.ts`) | For each fixture (complete metadata, PRM missing, AS missing, offline_access advertised, no S256, http endpoint, timeout, 5xx, redirect to another host) every check has the status the decision table says; no fetch failure yields `unsupported`. |
| 2 | Nothing new, nothing appended (FR-005, SC-003) | `tests/unit/scanner-append.test.ts` | Over a dataset whose current cells already hold the scanner's results, `toAppend` returns `[]`; over a dataset with a `vendor-claim` cell it returns that cell; over an older scanner version it returns every cell. |
| 3 | Grade rule (FR-008, SC-004) | `tests/unit/scanner-grade.test.ts` | Every level × status combination maps to the letter the rule gives; MAY never changes it; a MUST unknown withholds; reasons name the checks. |
| 4 | Only public well-known requests (FR-002, FR-010, SC-006) | `tests/unit/scanner-guard.test.ts`, `tests/unit/scanner-service.test.ts` | `guardUrl` refuses http, credentials, ports, `localhost`, `.local`, private and loopback addresses by name and by literal; the recorded request list for a fixture scan contains only the well-known URLs; a cross-host redirect is refused. |
| 5 | Command (US4, FR-012) | `pnpm scan <fixture url>` against a local fixture server; `pnpm scan <id> --write` on a scratch copy | Report printed, exit 0; the scratch file gains entries that `pnpm validate:data` accepts and `check:append-only` passes. |
| 6 | Service (US3, FR-010) | `pnpm scan:serve`; `curl -X POST localhost:8080/scan -d '{"url":"…"}'`; try `http://`, `https://127.0.0.1/`, `https://user:pw@…` | A report for the fixture; `400` with the reason for the others; `/healthz` ok. |
| 7 | Report page (US2, FR-007) | Open `/scanner/<id>/` for a server with scanner observations and one without | Checks listed with level, citation, status, evidence, date; grade and reasons match the rule; the unscanned server says no scan recorded and shows no grade. |
| 8 | Index (FR-009) | Open `/scanner/` | Every listed server, alphabetical, with grade or "not scanned" and date; nothing sorted by grade. |
| 9 | No JavaScript (FR-011) | Disable JS; open `/scanner/` | Rules, index and how-to complete; the form shows its `<noscript>` note (or the "not configured" note when `PUBLIC_SCANNER_URL` is unset). |
| 10 | Nightly workflow (US1, FR-006) | `workflow_dispatch` on the repository | One pull request `scanner/<date>` with the summary, or a log line "nothing to append" and no pull request. Requires network: run from GitHub, not CI's test job. |
| 11 | Budgets (constitution V) | Lighthouse CI | Performance and accessibility at or above 95 on `/scanner/` and a report page; JS at or below 150 kB. |
| 12 | Accessibility and screenshots | `pnpm test:e2e` (`tests/e2e/scanner.spec.ts`) | No serious or critical axe violations on both pages in light, dark and phone; no horizontal scroll at phone width; screenshots match. |
