# Quickstart: MCP Atlas

How to run and validate the feature end to end. Implementation details belong in `tasks.md`.

## Prerequisites

- Node.js 22 LTS, pnpm 9+
- Playwright browsers (`pnpm exec playwright install chromium`)

## Setup

```sh
pnpm install
pnpm validate:data      # schemas + cross-references over data/
pnpm dev                # http://localhost:4321/atlas/mcp
```

## One command for everything

```sh
pnpm check              # validate:data, lint (Biome), typecheck, unit tests, build
pnpm test:e2e           # Playwright against the built site, including screenshots
```

## Validation scenarios

| # | Scenario | Steps | Expected |
|---|---|---|---|
| 1 | Matrix renders (US1, FR-001) | Open `/atlas/mcp` | Revision `2026-07-28` named at top; one row per non-withdrawn server; one column per non-client feature; every cell has a status. |
| 2 | Cell detail (US1, FR-002) | Click a cell with an observation | Status, method, date, observer, evidence link shown; closing returns focus to the cell. |
| 3 | Unknown is distinct (FR-003, SC-006) | Seed a server with no observations; open the matrix | Every cell reads "unknown" with the unknown style; none reads "unsupported". Covered by a unit test on `atlas.ts` and an e2e assertion. |
| 4 | Filters are shareable (FR-008) | Filter by `level=MUST`, search `stripe`; copy the URL into a new tab | Same filtered view. With JS disabled the full matrix still renders. |
| 5 | Server page history (US2, FR-004) | Open a server with two observations for one feature | Current status equals the newest; the older one appears under history with its method. |
| 6 | Feature citation (US3, FR-005, SC-002) | Open any feature page | Citation links to the revision URL and names the section. A unit test asserts every feature's `definedBy` resolves. |
| 7 | Adoption share (US3) | Feature page with mixed statuses | Share excludes unknown and not-applicable; both counts are shown. |
| 8 | Contribution validation (US4, FR-010, SC-005) | Add an observation without `evidence`; run `pnpm validate:data` | Non-zero exit; message names file, index and field. |
| 9 | Append-only (FR-011) | Change an existing observation entry in a branch; run the CI append-only check | Check fails naming the changed entry. |
| 10 | Revision switch and diff (US5, FR-006, FR-007) | Open `/atlas/mcp/2025-11-25`, then the changes link | Older revision's features and observations shown; diff lists `mcp.as.dcr` level change and the features new in 2026-07-28. |
| 11 | Withdrawal (US4) | Set `withdrawn` on a server; build | Server absent from matrix and `data.json`; its page shows the withdrawal notice. |
| 12 | Export matches model (FR-013) | Build; run the export unit test | `data.json` validates against `src/schema/` and its `cells` equal the matrix. |
| 13 | Budgets (SC-004, constitution V) | Run Lighthouse CI on `/atlas/mcp`, a server page, a feature page | Performance and accessibility ≥ 95; JS ≤ 150 kB compressed. |
| 14 | Both themes (constitution V) | Playwright screenshots in light and dark for the three page types | Screenshots match baselines; no unreadable text. |

## Deploy check

After a merge to `main`, the deploy workflow uploads `dist/` to the Bunny storage zone and
purges the pull zone. Confirm `https://letsauth.eu/atlas/mcp` serves the new `generatedAt` in
`/atlas/mcp/data.json`.
