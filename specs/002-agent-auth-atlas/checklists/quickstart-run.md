# Quickstart run record: 002-agent-auth-atlas

Run on 2026-10-14 against a production build (`pnpm build`, served by `astro preview`) on the
implementation branch, after CI had committed the screenshot baselines through the
`refresh-screenshots` label. Browser: Chromium (Playwright, projects `light`, `dark`, `phone` =
Pixel 7 at 412 px). Lighthouse CI 0.15 with the budgets in `lighthouserc.json`. Data: 42 specs
(one withdrawn), 69 relations; the map lays out 41 nodes and 67 edges in 5 columns and 9 lanes.

| # | Scenario | Result | Evidence |
|---|---|---|---|
| 1 | Map renders (US1, FR-001, FR-002) | Pass | `tests/e2e/standards.spec.ts` "renders one node per spec and one edge per relation, every node a link": 41 `a[data-spec]` nodes and 67 `path[data-relation]` edges, every node an `<a href="/atlas/standards/{id}/">` with the body and maturity in its `aria-label`. |
| 2 | Edge detail (US1, FR-003) | Pass | Same file, "an edge names both specs and the relation in its title": each edge carries a `<title>` with the type, both spec names and the note; the island highlights the neighbourhood on hover and focus ("hovering a node highlights its neighbourhood"). |
| 3 | No JavaScript (FR-006) | Pass | Same file, "renders fully without JavaScript, filter note shown": with JS disabled at `/atlas/standards/?type=competes-with` the map, legend and list are complete and the `[data-noscript-note]` says the filter needs JavaScript. |
| 4 | Phone width (SC-004) | Pass | Same file, "has no horizontal page scroll at phone width": `scrollWidth` equals `innerWidth` on the `phone` project; the map scrolls inside `#map-frame`. |
| 5 | Spec page (US2, FR-008) | Pass | `tests/e2e/spec-page.spec.ts`: on `/atlas/standards/mcp-authorization/` the revisions list is newest first with `2026-07-28` marked current, its change note names Client ID Metadata Documents and the pair links to `/atlas/mcp/changes/2025-11-25/2026-07-28/`; `[data-defines]` lists every feature citing that revision with its level (`mcp.as.cimd` SHOULD); on `cimd`, outgoing and incoming groups match `relationsOf` with the other spec linked and the note shown. |
| 6 | Filter is shareable (US3, FR-007) | Pass | `tests/e2e/standards.spec.ts` "filter state in the URL restores the filtered view": `?type=competes-with` ticks only that box, shows the one competes-with edge, hides the other 66, and `#map-count` reads "1 of 67 relations"; "filtering by body ... is written to the URL" checks the reverse direction through `history.replaceState`. |
| 7 | Maturity is visible (US4, FR-002) | Pass | Same file, "lists every spec grouped by body with maturity and current revision": every `li[data-spec]` carries a maturity tag; the map nodes encode maturity in `data-maturity` and the border style (`StandardsMap.astro`), and the legend names each style. |
| 8 | Withdrawn spec stays (FR-014, SC-006) | Pass | `wimse-s2s` is withdrawn in the seed. `tests/e2e/spec-page.spec.ts` "a withdrawn or expired spec shows the notice and keeps its page": `#gone` is visible on its page, it has no map node and is listed under `[data-withdrawn]`. Unit: `tests/unit/standards.test.ts` "keeps expired specs on the map and lists withdrawn ones separately" and "drops relations touching a withdrawn spec from the map". |
| 9 | Dangling relation (US5, FR-011, SC-005) | Pass | `tests/unit/validate-data.test.ts` "names the field for a dangling, self or unexplained relation": the `tests/fixtures/bad-data` set exits 1 with `data/relations.yaml[0].to: spec "nope" does not exist`. |
| 10 | Judgement relation without a note (FR-010) | Pass | Same test: entry `[2]` (`competes-with` without `note`) is reported on `data/relations.yaml[2].note`; `tests/unit/relations.test.ts` "requires a note on judgement types". |
| 11 | Dependency cycle (FR-005) | Pass | `tests/unit/relations.test.ts` "names a dependency cycle": `a -> b -> c -> a` is reported with the three dependency types named; "ignores symmetric and reference edges when looking for cycles". |
| 12 | Export matches model (FR-012, SC-007) | Pass | `tests/unit/standards.test.ts` "validates against the schemas and holds every node and edge of the map" and "over the real data, every spec and relation is present": `buildStandardsExport` validates against `src/schema/` and contains the 41 rendered specs, all 69 relations and the withdrawn id. |
| 13 | Budgets (constitution V) | Pass | Lighthouse (local run, two passes each, after preloading the three fonts): `/atlas/standards/` performance 0.99, accessibility 1.0; `/atlas/standards/rfc8693/` performance 1.0, accessibility 1.0; cumulative layout shift 0 on both. Script on the map page: `StandardsMap` 2.7 kB plus the shared Svelte runtime 28.5 kB, about 31 kB against the 150 kB budget; 0 on the spec page. |
| 14 | Accessibility | Pass | axe (WCAG 2.2 AA tags) reports no serious or critical violations on `/atlas/standards/` and `/atlas/standards/rfc8693/` in `light`, `dark` and `phone`. |

Totals: unit tests 56 passed; end-to-end 91 passed, 6 skipped (the two data-dependent 001
scenarios, per project), 8 screenshot comparisons failed locally. All 8 are the screenshot
assertions only (3 to 4 % of pixels, on the 001 pages as well as the new ones) because the
local Chromium is an older build than the one CI pinned when it wrote the baselines; CI compares
with its own build.

Open points carried to the pull request: Lighthouse figures above come from a local run; the
pull request's CI run is the one that counts.
