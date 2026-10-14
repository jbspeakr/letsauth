# Quickstart run record: 001-mcp-atlas

Run on 2026-10-13 against a production build (`pnpm build`, served by `astro preview`) on the
implementation branch, before the pull request was opened. Browser: Chromium (Playwright,
projects `light`, `dark`, `phone` = Pixel 7 at 412 px). Lighthouse CI 0.15 with the budgets in
`lighthouserc.json`.

| # | Scenario | Result | Evidence |
|---|---|---|---|
| 1 | Matrix renders (US1, FR-001) | Pass | `tests/e2e/matrix.spec.ts` "names the revision and renders every server, feature and cell": revision `2026-07-28` at top, 39 rows, 23 columns, 897 cells, every cell with one of the five statuses. |
| 2 | Cell detail (US1, FR-002) | Pass | Same file, "cell detail shows the observation and returns focus on close": Atlassian × `mcp.as.dcr` opens a dialog with status, method, date, observer and an evidence link; Escape closes it and focus returns to the cell. |
| 3 | Unknown is distinct (FR-003, SC-006) | Pass | Unit: `tests/unit/atlas.test.ts` "yields derived unknown when nothing was observed". E2E: Airtable row has 23 `unknown` cells and no `unsupported`; the unknown glyph uses a dashed ring and `?`, unsupported a solid ring and `✕`. |
| 4 | Filters are shareable (FR-008) | Pass | E2E "filter state in the URL restores the filtered view": `/atlas/mcp?level=MUST&q=stripe` shows 1 of 39 servers and only MUST columns. "matrix page without JavaScript": all 39 rows render with JS disabled and the native `<details>` opens. |
| 5 | Server page history (US2, FR-004) | Not exercised by data | The seed has no server with two observations on one feature, so the e2e test skips itself (it runs as soon as such data exists). The rule is covered by `tests/unit/atlas.test.ts` "lists every other observation newest first" and the server page renders `cellHistory` into the per-feature history list. |
| 6 | Feature citation (US3, FR-005, SC-002) | Pass | Unit: `tests/unit/citations.test.ts` resolves every `revisions[]` entry of every feature. E2E: `mcp.as.dcr` cites "Client Registration › Dynamic Client Registration" linking to the 2026-07-28 authorization page. |
| 7 | Adoption share (US3) | Pass | E2E "share excludes unknown and not-applicable": `mcp.as.dcr` shows 0% of 7 servers with a recorded observation, with 27 unknown and 5 not applicable listed separately; server lists per status match the matrix column. |
| 8 | Contribution validation (US4, FR-010, SC-005) | Pass | `tests/unit/validate-data.test.ts`: fixture with an empty `evidence` exits 1 with `data/observations/stripe.yaml[1].evidence: required (URL or note)`; an unknown feature id reports `[2].feature`. |
| 9 | Append-only (FR-011) | Pass | Same file: a changed entry fails `check-observations-append-only.ts` with `stripe.yaml[0]: existing observation changed or removed`; an appended entry passes. CI runs the check on every pull request. |
| 10 | Revision switch and diff (US5, FR-006, FR-007) | Pass | `tests/e2e/revision.spec.ts`: `/atlas/mcp/2025-11-25` names that revision and has 21 columns (no `mcp.as.iss-param`); `/atlas/mcp/changes/2025-11-25/2026-07-28` lists `mcp.as.dcr` SHOULD → MAY and `mcp.as.iss-param` as added; `/atlas/mcp/2026-07-28` redirects to `/atlas/mcp`. |
| 11 | Withdrawal (US4) | Not exercised by data | No server is withdrawn in the seed, so the e2e test skips itself. `matrixRows` excludes withdrawn servers (unit test "rows exclude withdrawn servers"), `buildExport` omits them (unit test "omits withdrawn servers everywhere"), and the server page renders the notice branch when `withdrawn` is set. |
| 12 | Export matches model (FR-013) | Pass | `tests/unit/export.test.ts`: the export validates against `src/schema/`, its `cells` equal `matrixFor(currentRevision)`, and the built `dist/atlas/mcp/data.json` matches. |
| 13 | Budgets (SC-004, constitution V) | Pass | Lighthouse CI on `/atlas/mcp`, `/atlas/mcp/servers/stripe`, `/atlas/mcp/features/mcp.as.cimd`: performance 0.98 on all three, accessibility 1.0, best practices 1.0, SEO 1.0; script transfer 14.4 kB on the matrix page (budget 150 kB), 0 on the other two. |
| 14 | Both themes (constitution V) | Pass | Screenshot baselines in `tests/e2e/__screenshots__/` for matrix, server and feature pages in light, dark and phone; axe (WCAG 2.2 AA tags) reports no serious or critical violations on any of the three page types. |

Totals: unit tests 24 passed; end-to-end 55 passed, 6 skipped (scenarios 5 and 11, twice per
project), 0 failed; Lighthouse assertions all passed.

Open points carried to the pull request: no server in the seed has observation history or is
withdrawn, so scenarios 5 and 11 are covered by unit tests and code review only until real
data arrives.
