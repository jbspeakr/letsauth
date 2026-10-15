# Implementation Plan: Delegation Chain Explorer

**Branch**: `claude/roadmap-003-quv0t7` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-delegation-explorer/spec.md`

## Summary

Add the Scenario entity's executable form (`src/schema/scenario.ts`, plus the Vulnerability
schema so toggles can reference one), load `data/scenarios/` and `data/vulnerabilities/` through
the one dataset loader with cross-reference checks, and render three pages from it: the explorer
index, one page per scenario and one page per toggle. A pure library (`src/lib/explorer.ts`)
resolves a chain (scenario plus at most one toggle) into ordered steps with derived claim marks;
`src/lib/sequence.ts` lays the chain out as a sequence diagram that an Astro component draws as
SVG, from the same resolved steps the step list and token views use. One small Svelte island adds
step-through on top of the complete server-rendered page. Three scenario files ship: the MCP
authorization flow against revision 2026-07-28, the enterprise identity provider flow (ID-JAG
draft-04 with the MCP enterprise-managed authorization extension), and token-exchange delegation
between agents (RFC 8693). Toggles name the atlas features they defeat; the toggle page shows how
many listed servers meet each.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 22

**Primary Dependencies**: unchanged (Astro, Svelte 5, Zod, yaml, Vitest, Playwright, Biome)

**Storage**: YAML under `data/scenarios/` (and `data/vulnerabilities/`, empty for now)

**Testing**: Vitest for the chain resolver, the claim diff, the layout and the export; the bad-data
fixture extended for scenario validation; Playwright for the pages (counts, citations, no-JS,
step-through, axe, screenshots); Lighthouse CI on the index and one scenario page

**Target Platform**: the static site; no backend

**Project Type**: static site with one progressive-enhancement island

**Performance Goals**: the island under 10 kB compressed; scenario pages under 150 kB total
JavaScript (the island is the only script besides the theme toggle)

**Constraints**: constitution II (every step and toggle cites a revision and section, the build
fails otherwise), V (budgets, no-JS, phone width), the diagram and the text from one definition

**Scale/Scope**: 3 scenarios, 40 steps, 8 toggles; 2 schema files, 2 lib files, 3 components, 4
routes, 1 island; about a dozen touched files beyond that

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How this plan complies |
|---|---|---|
| I. One Model, Many Views | PASS, with a recorded amendment | Scenario and Vulnerability are entities the model already defines; this feature writes their Zod form and pins down the sub-entities the model only sketched (actor, step, citation, token view, toggle). The amendment to `docs/data-model.md` is the first commit of the pull request, before any code reads the new fields. Toggles reference Feature ids, so the explorer reuses the matrix rather than describing requirements a second time. |
| II. Every Claim Cites a Revision | PASS | Each step and each toggle carries `cites: { spec, revision, section }`; `crossCheck` fails the build when the revision does not exist in `data/specs`. The page links every citation to the revision's document and shows the section. Scenarios keep citing the revision they were written against when a newer one arrives. |
| III. Neutral and Passive by Default | PASS | No server is contacted; scenarios use example domains and generic actors; the server counts a toggle shows come from observations the atlas already has, with `unknown` rendered as unknown. |
| IV. Static First, Open Data | PASS | Every scenario and toggle is a pre-rendered page; `/explorer/data.json` publishes the scenarios under CC BY 4.0. |
| V. Craft and Budgets | PASS | Server-rendered SVG and HTML; the island only highlights and scrolls. Tokens, no literal colours; status glyphs unchanged; reduced motion honoured; diagram scrolls in its own frame at phone width. Lighthouse adds the index and one scenario page. |
| VI. Agent-Legible Repository | PASS | The schema is the readable contract for a scenario; the validator names file and field; `docs/atlas-maintenance.md` gains "Add a scenario"; unit tests cover the resolver and the diff; e2e covers counts and no-JS. |
| VII. European by Default | PASS | Nothing new is hosted or collected. The enterprise scenario is the hook for 006's EUDI and AI Act scenarios on the same entity. |
| Honesty tests | PASS | See the spec's section; summarised: claim-level cross-checks of revisions as validated data, on the same features and revisions as the atlases, maintained as YAML files. |

Post-design re-check (after Phase 1): PASS. The design adds two schema modules, two pure library
modules, three components, four routes and one island; no new dependency and no runtime.

## Project Structure

### Documentation (this feature)

```text
specs/003-delegation-explorer/
├── plan.md              # This file
├── research.md          # R1–R8: pages per toggle, derived marks, diagram from the chain, island
├── data-model.md        # The pinned-down Scenario sub-entities and the cross-reference rules
├── quickstart.md        # Scenarios to verify by hand and by test
├── contracts/
│   ├── routes.md        # /explorer/, /explorer/<scenario>/, /explorer/<scenario>/<toggle>/
│   └── data-export.md   # /explorer/data.json
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
docs/data-model.md                      # Scenario sub-entities pinned down; data/vulnerabilities loaded
data/scenarios/
├── mcp-authorization.yaml              # the MCP flow against 2026-07-28, 3 toggles
├── mcp-enterprise-idp.yaml             # ID-JAG via the enterprise IdP, 2 toggles
└── token-exchange-chain.yaml           # orchestrator → sub-agent → API with RFC 8693, 3 toggles

src/schema/
├── scenario.ts                         # NEW: actor, citation, token view, step, toggle, scenario
├── vulnerability.ts                    # NEW: the model's Vulnerability entity
└── index.ts                            # re-exports
src/lib/
├── data.ts                             # loads scenarios and vulnerabilities; cross-checks (data-model.md)
├── citations.ts                        # resolveCitation accepts { spec, revision, section }
├── explorer.ts                         # NEW: resolveChain, diffClaims, scenarioList, featureSupport, export
├── sequence.ts                         # NEW: layoutSequence (lanes, rows, self-messages)
└── labels.ts                           # ACTOR_KIND_LABEL, TOGGLE_KIND_LABEL
src/components/
├── Citation.astro                      # accepts a plain citation
├── SequenceDiagram.astro               # NEW: SVG from the resolved chain
├── TokenView.astro                     # NEW: decoded token with change marks
├── ChainPage.astro                     # NEW: the scenario/toggle page body (shared by both routes)
└── Explorer.svelte                     # NEW: step-through island (client:idle)
src/pages/explorer/
├── index.astro                         # NEW
├── data.json.ts                        # NEW
├── [scenario]/index.astro              # NEW
└── [scenario]/[toggle].astro           # NEW
src/layouts/Base.astro                  # nav and footer entries
src/pages/index.astro                   # a call to action for the explorer
src/pages/about.astro                   # explorer status Live, linked
lighthouserc.json                       # /explorer/ and /explorer/mcp-authorization/
README.md, CLAUDE.md, docs/roadmap.md, docs/atlas-maintenance.md

tests/
├── fixtures/bad-data/scenarios/broken.yaml   # NEW: dangling cite, unknown actor, unknown step, unknown feature
├── unit/explorer.test.ts                     # NEW: resolveChain, diffClaims, export, featureSupport
├── unit/sequence.test.ts                     # NEW: layout
├── unit/validate-data.test.ts                # the scenario messages
└── e2e/explorer.spec.ts                      # NEW: index, scenario, toggle, no-JS, step-through, axe, screenshots
```

**Structure Decision**: Same shape as the two atlases: schema in `src/schema/`, pure derivations
in `src/lib/`, server-rendered components in `src/components/`, one island mounted with
`client:idle` that reads the DOM it enhances. The two routes share one `ChainPage` component so a
toggle page and a baseline page cannot diverge.

## Complexity Tracking

| Deviation or decision | Why | Alternative rejected because |
|---|---|---|
| The data-model amendment ships in this pull request (first commit) rather than its own | The Scenario entity already exists; only its sub-entities needed pinning down, and nothing else reads them | A separate pull request for a dozen lines the explorer alone consumes would be review ceremony without a second reader; the commit is reviewable on its own |
| One page per toggle instead of client-side toggling | Pages read fully without JavaScript (constitution V); every variant gets a URL; the island stays tiny | Client-side toggling needs the whole scenario and the resolver in the bundle and leaves the no-JS page with only the baseline |

## Revision history

| Date | Change | Decided by |
|---|---|---|
| 2026-10-15 | Plan written | plan |
