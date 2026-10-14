# Quickstart: Agent Auth Atlas

How to run and validate the feature end to end. Implementation details belong in `tasks.md`.

## Prerequisites

- Node.js 22 LTS, pnpm 10
- Playwright's pinned Chromium (`pnpm exec playwright install chromium`) for screenshots

## Setup

```sh
pnpm install
pnpm validate:data      # schemas, cross-references and the relation rules over data/
pnpm dev                # http://localhost:4321/atlas/standards/
```

## One command for everything

```sh
pnpm check              # validate:data, lint (Biome), typecheck, unit tests, build
pnpm test:e2e           # Playwright against the built site, including screenshots
```

## Validation scenarios

| # | Scenario | Steps | Expected |
|---|---|---|---|
| 1 | Map renders (US1, FR-001, FR-002) | Open `/atlas/standards/` | One node per non-withdrawn spec with name, body group and maturity tag; one edge per relation; every node is a link to its spec page. |
| 2 | Edge detail (US1, FR-003) | Hover or focus an edge | Tooltip names the type, both specs and the note. |
| 3 | No JavaScript (FR-006) | Disable JS; open `/atlas/standards/?type=competes-with` | Map, legend and list are complete; a note says the filter needs JavaScript. |
| 4 | Phone width (SC-004) | Open the map at 412 px wide | The map scrolls inside its frame; `document.documentElement.scrollWidth` equals the viewport width. |
| 5 | Spec page (US2, FR-008) | Open `/atlas/standards/mcp-authorization/` | Revisions newest first with `2026-07-28` marked current, change notes shown, the pair links to `/atlas/mcp/changes/2025-11-25/2026-07-28/`, relations in and out listed with notes, features defined listed with levels and links. |
| 6 | Filter is shareable (US3, FR-007) | Tick only `competes-with`; copy the URL into a new tab | Only competes-with edges are shown; the count line reads "n of m relations"; the new tab shows the same. |
| 7 | Maturity is visible (US4, FR-002) | Compare an RFC node and an individual-draft node | Different border styles and tags; aria-label names the maturity. |
| 8 | Withdrawn spec stays (FR-014, SC-006) | Set `maturity: withdrawn` on a spec in a scratch copy; build | The spec is listed under "withdrawn" with the notice; its page renders the notice; relations to it render muted. Covered by a unit test on `specNodes`. |
| 9 | Dangling relation (US5, FR-011, SC-005) | Add a relation to `nope`; run `pnpm validate:data` | Non-zero exit; `data/relations.yaml[i].to: spec "nope" does not exist`. |
| 10 | Judgement relation without a note (FR-010) | Add a `competes-with` relation without `note`; validate | Non-zero exit; message names `note`. |
| 11 | Dependency cycle (FR-005) | Add `builds-on` edges A→B and B→A in a fixture; validate | Non-zero exit; message names the cycle. |
| 12 | Export matches model (FR-012, SC-007) | Build; run the export unit test | `data.json` validates against `src/schema/`; it contains every rendered spec and relation. |
| 13 | Budgets (constitution V) | Run Lighthouse CI | Performance and accessibility at or above 95 on `/atlas/standards/` and a spec page; JS at or below 150 kB. |
| 14 | Accessibility | Run the e2e axe checks on both pages | No serious or critical violations in light and dark. |
