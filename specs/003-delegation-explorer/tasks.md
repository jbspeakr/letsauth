# Tasks: Delegation Chain Explorer

**Input**: Design documents from `/specs/003-delegation-explorer/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/routes.md,
contracts/data-export.md

**Tests**: Unit tests first for the resolver, the diff and the layout; the bad-data fixture
extended before the cross-checks; e2e over the built site.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup (the model first)

- [x] T001 Amend `docs/data-model.md`: pin down Actor, Step, Citation, TokenView and Toggle under Scenario, add `summary` to Scenario and `summary`, `violates` to Toggle; note that `data/vulnerabilities/` is loaded (data-model.md of this feature)
- [x] T002 `src/schema/scenario.ts` and `src/schema/vulnerability.ts`, re-exported from `src/schema/index.ts`: enums, the recursive token value, unique actor, step and toggle ids within a file
- [x] T003 `src/lib/data.ts`: load `data/scenarios/` and `data/vulnerabilities/` into the dataset; `crossCheck` enforces every rule in data-model.md with the stated paths; `src/content.config.ts` gains the two collections
- [x] T004 [P] `tests/fixtures/bad-data/scenarios/broken.yaml` and the assertions in `tests/unit/validate-data.test.ts` (dangling citation, unknown actor, unknown step in a toggle, unknown feature)

## Phase 2: Foundational

- [x] T005 [P] Unit test `tests/unit/explorer.test.ts` before T006: `resolveChain` baseline order and indexes; a toggle replacing one step with two (position, `toggled`, `replaces` on the first); a toggle mapping to `[]` (step kept with `removed`, skipped by the diff); `diffClaims` added/changed/removed with nested values; the first token marks nothing; `featureSupport` counts from a small dataset and the client-side case; `buildExplorerExport` envelope
- [x] T006 Implement `src/lib/explorer.ts` per data-model.md
- [x] T007 [P] Unit test `tests/unit/sequence.test.ts` before T008: one lane per actor in order, one row per step, `self` when from equals to, x1/x2 follow the lanes, height grows with rows
- [x] T008 Implement `src/lib/sequence.ts`
- [x] T009 [P] `src/lib/labels.ts`: `ACTOR_KIND_LABEL`, `TOGGLE_KIND_LABEL`; `src/lib/citations.ts` and `src/components/Citation.astro` accept a plain `{ spec, revision, section }`

## Phase 3: User Story 1 - Read a delegation chain hop by hop (Priority: P1) 🎯 MVP

- [x] T010 [US1] `data/scenarios/mcp-authorization.yaml`: the MCP flow against 2026-07-28 with tokens at the token response, the bearer call and the upstream call (research R7); `pnpm validate:data`
- [x] T011 [US1] `src/components/SequenceDiagram.astro`: SVG from `layoutSequence` (lifelines, arrows, wrapped labels, self-message loops, `data-step` rows, `is-toggled`/`is-removed`), tokens only, scrolls in its own frame
- [x] T012 [US1] `src/components/TokenView.astro`: name, header and claims as a definition list with `data-claim`/`data-change`, removed claims struck, nested values as formatted JSON in mono
- [x] T013 [US1] `src/components/ChainPage.astro` and `src/pages/explorer/[scenario]/index.astro`: the anatomy in contracts/routes.md (toggle bar, diagram, step list with sender, receiver, message, note, citation, token; requirements section; data links)
- [x] T014 [US1] `src/components/Explorer.svelte` mounted `client:idle`: control bar, current step, classes on diagram rows, scroll with reduced-motion respected, URL fragment, arrow keys (research R6)

**Checkpoint**: `/explorer/mcp-authorization/` complete without JavaScript; stepping works with it

## Phase 4: User Story 2 - Turn an attack or misconfiguration on (Priority: P1)

- [x] T015 [US2] Toggles in `data/scenarios/mcp-authorization.yaml`: token passthrough, missing audience check, issuer mix-up, with `violates`
- [x] T016 [US2] `src/pages/explorer/[scenario]/[toggle].astro` on `ChainPage` with the toggle notice: kind pill, summary, citation, each violated requirement linked with `featureSupport` counts or the client-side sentence; replaced steps marked and naming the step replaced; removed steps struck in list and diagram
- [x] T017 [US2] `data/scenarios/mcp-enterprise-idp.yaml` (scope accumulation, ID-JAG audience) and `data/scenarios/token-exchange-chain.yaml` (token passthrough, scope accumulation, `may_act` unchecked); `pnpm validate:data`

**Checkpoint**: eight toggle pages render; every citation resolves

## Phase 5: User Story 3 - Find a scenario and take the data (Priority: P2)

- [x] T018 [P] [US3] `src/pages/explorer/index.astro`: one card per scenario (title, summary, actor pills, step count, toggle links, features exercised)
- [x] T019 [P] [US3] `src/pages/explorer/data.json.ts` with `buildExplorerExport`
- [x] T020 [P] [US3] `src/layouts/Base.astro` nav and footer; `src/pages/index.astro` call to action; `src/pages/about.astro` status Live with link; `README.md`; `docs/roadmap.md` 003 status; `docs/atlas-maintenance.md` "Add a scenario"; `CLAUDE.md` one line on scenarios
- [x] T021 [US3] `lighthouserc.json`: `/explorer/` and `/explorer/mcp-authorization/`

## Phase 6: Verification

- [x] T022 `tests/e2e/explorer.spec.ts`: index cards and toggle links; scenario page counts and ids match the resolved chain, citations resolve; toggle page marks, struck step, notice with counts; no-JS completeness; step-through and fragment; axe in light, dark, phone; no horizontal scroll at 412 px; screenshots of the index and a scenario page
- [ ] T023 `pnpm check`; `pnpm build && pnpm test:e2e` where Chromium allows; island size from the build output; add the `refresh-screenshots` label to the pull request for the new baselines; record the run in `checklists/quickstart-run.md`

## Dependencies

- T001 → T002 → T003; T004 with T003.
- T005 → T006; T007 → T008; T009 anytime after T002.
- T010 and T011–T014 need T006 and T008; T015–T017 need T013; T018–T021 need T006.
- T022–T023 last.
