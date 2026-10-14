# Quickstart run: Scanner

**Date**: 2026-10-14 (re-run after the owner's revision the same day) · **Branch**: `claude/scanner-004-ubcjp1` · **Scanner**: `letsauth-scanner/0.1.0`

Environment: the implementation container has no outbound network to third-party hosts, so
every scenario that reads a real server is recorded as "run from GitHub / by the maintainer".
Everything else ran locally against the recorded responses under `tests/fixtures/scanner/`.

| # | Scenario | Result | Notes |
|---|---|---|---|
| 1 | Checks over recorded responses | PASS | `tests/unit/scanner-checks.test.ts`: 17 fixtures, every status equals the decision table; no fetch failure yields `unsupported`. |
| 2 | Nothing new, nothing appended | PASS | `tests/unit/scanner-append.test.ts`: `[]` for an unchanged dataset, the one changed cell, every cell for an older scanner version, the cell over a `vendor-claim`. |
| 3 | Grade rule | PASS | `tests/unit/scanner-grade.test.ts`: every level × status combination, MAY ignored, MUST unknown withholds. |
| 4 | Only public well-known requests | PASS | `tests/unit/scanner-guard.test.ts` and `scanner-checks.test.ts`: the recorded request list for the `complete` fixture is the well-known URLs and nothing else; cross-host redirect refused. |
| 5 | Command | PARTIAL | `pnpm scan notion` prints the refusal (`"mcp.notion.com" does not resolve`) and exits 1 as FR-012 says; the write path is covered by `scanner-append.test.ts` on a scratch copy. A real `--write` run is the first job run (scenario 10). |
| 6 | Nightly job script | PASS | `tests/unit/scanner-nightly.test.ts` (create, update, API error, naming); `pnpm scan:nightly` without `SCANNER_TOKEN` exits 1 with `SCANNER_TOKEN is not set`. The on-demand service the first draft had was removed on the owner's decision. |
| 7 | Report page | PASS | `/scanner/notion/` (no scanner observation yet) shows `#not-scanned`, every check as a derived `unknown`, no grade letter; `tests/e2e/scanner.spec.ts` covers the scanned case and skips it until the first scanner pull request merges. |
| 8 | Index | PASS | `/scanner/` lists every listed server alphabetically with "Not scanned" and no date; order equals `scannerIndex` (e2e). |
| 9 | No JavaScript | PASS | e2e with JavaScript disabled: index and grade rule complete; no island on the page. |
| 10 | Nightly job on Scaleway | DEFERRED | Needs the Scaleway project, registry namespace, job definition and `SCANNER_TOKEN`, plus the repository secrets and variables `scanner-deploy.yml` reads (docs/scanner.md). Once set, a `workflow_dispatch` of the deploy workflow pushes the image and the job's first run opens the first scanner pull request. |
| 11 | Budgets | PASS | Build: the scanner pages ship no JavaScript (no island); no scanner library code in any page bundle. Lighthouse CI ran green on the pull request with `/scanner/` and `/scanner/notion/` in `lighthouserc.json`. |
| 12 | Accessibility and screenshots | PASS except baselines | axe clean on `/scanner/` and `/scanner/notion/` in light, dark and phone; no horizontal scroll at 412 px (a header overflow with the fourth nav item was fixed on the way). Screenshot baselines come from the pinned Chromium: the `refresh-screenshots` label on the pull request regenerated them in CI (commit "Refresh screenshot baselines from CI's Chromium"); the local build is a different revision, so its images were not committed. CI's first run passed 120 of 126 e2e tests, the six failures being the baselines that did not exist yet. |
