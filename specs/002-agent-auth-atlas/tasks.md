---

description: "Task list for the Agent Auth Atlas feature"
---

# Tasks: Agent Auth Atlas

**Input**: Design documents from `/specs/002-agent-auth-atlas/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. The constitution (Principle VI) requires Vitest and Playwright with screenshot
comparison, and SC-002, SC-006 and SC-007 are defined as tests. Unit tests for a story are written
before its implementation and must fail first.

**Organization**: Tasks are grouped by user story so each story is an independently testable
increment. Phase 1 is the model amendment (plan.md, Complexity Tracking); Phase 2 is the shared
schema, loader and data entry every story reads.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1 to US5 from spec.md)
- Include exact file paths in descriptions

## Path Conventions

Single Astro project at the repository root as laid out in plan.md: `data/`, `src/`, `scripts/`,
`tests/`, `docs/`.

---

## Phase 1: Model amendment (first commit)

**Purpose**: The one change to the shared model, self-contained so it can be split out

- [ ] T001 Amend `docs/data-model.md`: add `maturity` (enum `individual-draft`, `working-group-draft`, `candidate`, `published`, `in-force`, `expired`, `withdrawn`, required) and `maturityNote` (string, optional) to the Spec table; add `other` to `body` and `guidance` to `family`; add a rule that a withdrawn spec stays in the data and is marked, never deleted; add the relation validation rules from `specs/002-agent-auth-atlas/data-model.md` (distinct ends, unique per pair with symmetric types counted once, note required on judgement types, dependency types acyclic)
- [ ] T002 Amend `src/schema/spec.ts`: `specMaturity` enum and type, `maturity` required and `maturityNote` optional on `specSchema`, `other` in `specBody`, `guidance` in `specFamily`
- [ ] T003 Add `maturity: published` and `maturityNote: "Specification revision 2026-07-28"` to `data/specs/mcp-authorization.yaml` and extend the spec fixture in `tests/fixtures/bad-data/specs/` so the existing validator test still exercises the same failures; `pnpm validate:data` and `pnpm test` pass

**Checkpoint**: One commit, every existing page unchanged

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The Relation schema, loader, cross-checks, derivations, labels and the launch data

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 [P] Implement `src/schema/relation.ts`: `relationType` enum (`builds-on`, `profiles`, `competes-with`, `solves-same-problem-as`, `references`, `replaces`), `relationSchema` (`from`, `to` kebab ids, `type`, optional `note` min 1, optional `source` HTTPS), `relationFileSchema` (array), `SYMMETRIC_TYPES`, `DEPENDENCY_TYPES`, `isSymmetric`, `isDependency`; export from `src/schema/index.ts`
- [ ] T005 [P] Unit test `tests/unit/relations.test.ts` before T006: schema rejects a non-HTTPS source and an unknown type; `crossCheck` reports `relations.yaml[i].to` for an unknown spec, `[i].to` for `from === to`, `[i]` duplicate for a repeated `(from, to, type)` and for the reverse of a symmetric type, `[i].note` for a `competes-with` without note, and names the cycle for `builds-on` A→B→A; a valid list yields no issue
- [ ] T006 Extend `src/lib/data.ts`: `Dataset.relations: Relation[]`; load `data/relations.yaml` (missing file is an empty list) entry by entry with `data/relations.yaml[i].field` paths; add the cross-checks from T005 to `crossCheck` (depends on T004)
- [ ] T007 [P] Add a `relations` collection to `src/content.config.ts` keyed `${from}-${type}-${to}` (depends on T006)
- [ ] T008 [P] Unit test `tests/unit/standards.test.ts` before T009: `specNodes` excludes `maturity: withdrawn` and orders by `BODY_ORDER`, first revision date, name (SC-006); `withdrawnSpecs` lists them; `relationsOf` groups outgoing and incoming by type and puts symmetric types in `related` regardless of storage direction; `featuresDefinedBy("mcp-authorization")` returns every non-client and client feature with a `revisions[]` entry for `2026-07-28` with that entry; `currentRevisionOf` returns the `current` one; `adjacentRevisionPairs` returns ascending pairs
- [ ] T009 Implement `src/lib/standards.ts` per data-model.md: `BODY_ORDER`, `specNodes`, `withdrawnSpecs`, `getSpecById`, `currentRevisionOf`, `revisionsNewestFirst(spec)`, `adjacentRevisionPairs(spec)`, `relationsOf`, `featuresDefinedBy`; make T008 pass (depends on T006)
- [ ] T010 [P] Unit test `tests/unit/graph.test.ts` before T011: a node's column equals its longest dependency path from a root; symmetric and `references` edges do not change columns; nodes in a column are grouped by `BODY_ORDER` then first revision date; the same input yields byte-identical output; an isolated node is placed; width and height cover every node; edge endpoints lie on node borders
- [ ] T011 Implement `src/lib/graph.ts`: `layoutGraph(nodes, relations, options?)` returning `{ nodes: PlacedNode[], edges: PlacedEdge[], width, height, columns }` with constants `NODE_W`, `NODE_H`, `COL_GAP`, `ROW_GAP`, `GROUP_GAP`; `PlacedEdge` carries a cubic path `d`, the relation, a `symmetric` flag and a midpoint for the title; make T010 pass (depends on T004)
- [ ] T012 [P] Extend `src/lib/labels.ts` with `BODY_LABEL`, `FAMILY_LABEL`, `MATURITY_LABEL`, `MATURITY_TAG`, `RELATION_LABEL` (`{ forward, backward }` per type; symmetric types have one phrase) per data-model.md
- [ ] T013 Enter the launch specs under `data/specs/` per research R8, one file per spec with `maturity`, `maturityNote`, `summary`, `url` and `revisions` (dated, `status: current` on the default one, earlier ones `superseded`, upcoming ones `draft`, with `url` per revision and `changes` where the publisher's changelog says what changed): `rfc6749`, `oauth-2-1`, `rfc7636`, `rfc7591`, `rfc7523`, `rfc8414`, `rfc8693`, `rfc8707`, `rfc9068`, `rfc9207`, `rfc9396`, `rfc9449`, `rfc9700`, `rfc9728`, `cimd`, `id-jag`, `transaction-tokens`, `sd-jwt`, `sd-jwt-vc`, `aauth`, `aiagent-auth`, `wimse-arch`, `wimse-s2s`, `wimse-ai-agent-identity`, `dawn`, `openid-connect-core`, `openid-connect-discovery`, `openid-federation`, `openid4vp`, `openid4vci`, `mcp-enterprise-managed-authorization`, `a2a-protocol`, `auth-md`, `cross-app-access`, `eidas-2`, `ai-act`, `nis2`, `eudi-arf`, `spiffe`, `w3c-vc-data-model-2`; facts from the publishers' pages only, a spec whose facts cannot be confirmed is left out (depends on T002)
- [ ] T014 Enter `data/relations.yaml` with at least 40 relations covering every spec from T013 at least once: `builds-on` and `profiles` for the OAuth and OpenID stack, `references` for what MCP, A2A and the EU acts cite, `replaces` where a draft or act supersedes another, and `competes-with` / `solves-same-problem-as` with a `note` for AAuth versus OAuth 2.1, CIMD versus DCR, ID-JAG versus Token Exchange for enterprise delegation, WIMSE agent identity versus the OAuth agent drafts, DAWN versus A2A agent cards versus auth.md for discovery, SD-JWT VC versus W3C VC for mandates; `source` where the document states the relation; `pnpm validate:data` passes (depends on T006, T013)

**Checkpoint**: `pnpm validate:data`, `pnpm test` and `pnpm build` pass with the new data and no page changes yet

---

## Phase 3: User Story 1 - See the map (Priority: P1) 🎯 MVP

**Goal**: `/atlas/standards/` renders the map with every spec as a linked node, every relation as a styled edge, a legend and the spec list, complete without JavaScript and scrollable in its frame at phone width.

**Independent Test**: Quickstart scenarios 1, 2, 3 (map part), 4 and 14.

### Tests for User Story 1

- [ ] T015 [P] [US1] Playwright test `tests/e2e/standards.spec.ts`: node count equals `specNodes().length`, edge count equals `relations.length`; every node `a[data-spec]` has an `href` of `/atlas/standards/{id}/` and an `aria-label` containing the body and maturity labels; an edge `[data-relation]` has a `<title>` containing both spec names; with JavaScript disabled the map and list render with the same counts; at phone width `document.documentElement.scrollWidth <= window.innerWidth`; the list has one entry per body group; `@axe-core/playwright` reports no serious or critical violations; screenshots `standards.png` in light, dark and phone

### Implementation for User Story 1

- [ ] T016 [P] [US1] Create `src/components/MaturityTag.astro`: renders `MATURITY_TAG` with a class per maturity (border style solid, dashed, dotted, muted and struck) and a `title` with `MATURITY_LABEL` plus `maturityNote`
- [ ] T017 [US1] Create `src/components/StandardsMap.astro`: calls `layoutGraph` over `specNodes` and `relations`; renders a labelled, focusable `<div class="map-frame" tabindex="0" role="region">` wrapping an `<svg viewBox>` with `<defs>` arrow markers per directed type, body group labels, edges as `<path data-relation data-type data-from data-to>` with `<title>` (type phrase, both names, note) and `aria-hidden`, nodes as `<a data-spec data-body data-maturity href aria-label>` with a rect (border style by maturity), the name (wrapped to two lines), the body short label and the maturity tag; a caption linking to the list; styles use tokens only, edge dash patterns and markers per type (depends on T011, T016)
- [ ] T018 [US1] Create `src/pages/atlas/standards/index.astro`: head with eyebrow, title, lede and counts; `StandardsMap`; a legend of edge types (line sample plus phrase) and maturity styles; the spec list grouped by `BODY_ORDER` with name link, family, `MaturityTag`, current revision date and a link to the canonical document, plus a "withdrawn" group when `withdrawnSpecs` is non-empty; a footer with the export and contribution links (depends on T017)
- [ ] T019 [US1] Add "Agent auth atlas" to the navigation in `src/layouts/Base.astro`, a second call to action and a fact card ("n specifications mapped") on `src/pages/index.astro`, and an "About this specification" link from the MCP atlas revision bar in `src/components/MatrixPage.astro` to `/atlas/standards/mcp-authorization/`

**Checkpoint**: The map is browsable, passes T015 and the Lighthouse budgets

---

## Phase 4: User Story 2 - Read one spec's page (Priority: P2)

**Goal**: `/atlas/standards/{id}/` shows the spec's identity, revisions newest first with change notes and diff links, relations in and out with notes and sources, and the features it defines.

**Independent Test**: Quickstart scenario 5.

### Tests for User Story 2

- [ ] T020 [P] [US2] Playwright test `tests/e2e/spec-page.spec.ts`: on `/atlas/standards/mcp-authorization/` the revisions list is newest first with `2026-07-28` marked current and its `changes` text shown, the pair links to `/atlas/mcp/changes/2025-11-25/2026-07-28/`, the "defines" list links to `/atlas/mcp/features/mcp.as.cimd/` with level `SHOULD`; on a spec with incoming and outgoing relations both groups are present with the other spec linked and the note shown; a withdrawn or expired spec (skip if none in the data) shows the notice; axe clean; screenshots `spec.png` in light, dark and phone

### Implementation for User Story 2

- [ ] T021 [P] [US2] Create `src/components/RelationList.astro`: takes `relationsOf(data, id)` and renders sections per direction and type with `RELATION_LABEL` phrases, the other spec's name linked, `MaturityTag`, the note and a `source` link when present; empty state "No relations recorded yet" (depends on T009, T012, T016)
- [ ] T022 [US2] Create `src/pages/atlas/standards/[id].astro` with `getStaticPaths` over all specs (withdrawn included, `noindex` when withdrawn): breadcrumb, eyebrow (body, family), name, `MaturityTag` with `maturityNote`, summary, canonical link; a notice for `withdrawn` and `expired`; revisions table newest first (id, date, status pill, document link, change note) with a link to `/atlas/mcp/changes/{from}/{to}/` per adjacent pair when the spec is `mcp-authorization`; `RelationList`; "Defines" section from `featuresDefinedBy` with level, party and a link to `/atlas/mcp/features/{id}/`; a "Correct this entry" link to the repository file (depends on T021)
- [ ] T023 [US2] Link node labels and list entries in `src/components/StandardsMap.astro` and `src/pages/atlas/standards/index.astro` to the spec page (already the node href; verify the list) and add a "Map" breadcrumb back (depends on T022)

**Checkpoint**: Every spec has a page and T020 passes

---

## Phase 5: User Story 3 - Compare alternatives (Priority: P3)

**Goal**: The map and list narrow by relation type and body; counts update; the state is in the URL; no-JS shows a note.

**Independent Test**: Quickstart scenarios 3 and 6.

### Tests for User Story 3

- [ ] T024 [P] [US3] Extend `tests/e2e/standards.spec.ts`: `?type=competes-with` in a fresh page hides every edge whose `data-type` differs, shows the count "n of m relations", and nodes without a shown edge stay visible; `?body=eu` hides nodes of other bodies and edges touching them; the checkbox form mirrors the URL; a filtered link with JavaScript disabled renders everything and the `<noscript>` note is present; hovering a node adds `is-near` to its neighbours and `is-far` to the rest

### Implementation for User Story 3

- [ ] T025 [US3] Add the filter form to `src/pages/atlas/standards/index.astro`: `<form id="map-filters" method="get">` with a checkbox per relation type (label with the edge sample) and per body, an "Apply" and "Reset" button, a count line `#map-count` and a `<noscript>` note (depends on T018)
- [ ] T026 [US3] Create `src/components/StandardsMap.svelte` and mount it `client:idle` in the index page: reads `type` and `body` from `location.search`, sets the checkboxes, hides edges and nodes (`hidden` attribute on SVG groups and list entries), updates `#map-count`, writes the state with `history.replaceState`, marks `data-enhanced` on the frame; hover and focus on a node toggle `is-near` / `is-far` classes on nodes and edges with `prefers-reduced-motion` honoured for any transition (depends on T025)

**Checkpoint**: Filtering works, is shareable and degrades to the full map

---

## Phase 6: User Story 4 - Follow a spec's status over time (Priority: P4)

**Goal**: Maturity is visible and non-colour-coded on the map and in the list; change notes show per revision; withdrawn and expired specs stay marked.

**Independent Test**: Quickstart scenarios 7 and 8.

- [ ] T027 [P] [US4] Unit test in `tests/unit/standards.test.ts`: a dataset with one `withdrawn` and one `expired` spec keeps the expired one in `specNodes` and lists the withdrawn one in `withdrawnSpecs`; `layoutGraph` keeps an edge to a withdrawn spec out of the map and marks the node absent (SC-006)
- [ ] T028 [US4] In `src/components/StandardsMap.astro` and `src/pages/atlas/standards/index.astro`: add a "Recently revised" line under the head listing the five specs whose current revision date is newest with their dates; mark `expired` nodes muted with a struck tag and keep them in the map; render relations touching withdrawn specs in the spec list only, with the notice (depends on T018, T027)

**Checkpoint**: Status is readable at a glance and over time

---

## Phase 7: User Story 5 - Contribute a spec or a relation (Priority: P5)

**Goal**: Both contribution paths are documented; CI rejects incomplete entries naming the field.

**Independent Test**: Quickstart scenarios 9, 10 and 11.

- [ ] T029 [P] [US5] Add `tests/fixtures/bad-data/relations.yaml` with a dangling `to`, a self relation and a `competes-with` without note, and extend `tests/unit/validate-data.test.ts` to assert `relations.yaml[0].to`, `relations.yaml[1].to` and `relations.yaml[2].note` appear in stderr
- [ ] T030 [P] [US5] Add an "Add a specification or a relation" section to `docs/atlas-maintenance.md`: the spec file format with `maturity` values and what each means, the revision rules (one `current`, `draft` for an upcoming revision), where facts come from, the relation types with when to use each and the note rule, and the validation command
- [ ] T031 [US5] Add a "Contribute" block to `src/pages/atlas/standards/index.astro` and a "Correct this entry" link on the spec page pointing at the repository file and the maintenance doc; extend `.github/pull_request_template.md`'s data checklist with "a new relation of a judgement type carries a note and, where one exists, a source" (depends on T018, T022)

**Checkpoint**: A contributor can add a spec or relation and CI names any missing field

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Export, budgets, docs, roadmap and the full quickstart run

- [ ] T032 [P] Implement `src/lib/standards-export.ts` (`buildStandardsExport`: `version: 1`, `generatedAt`, `license` from `LICENSE-DATA`, `source`, `specs` without withdrawn, `relations`, `withdrawn` ids) and `src/pages/atlas/standards/data.json.ts`; unit test in `tests/unit/standards.test.ts` validates the export against `specSchema` and `relationSchema` and asserts it holds every node and edge the map renders (SC-007)
- [ ] T033 [P] Add `http://localhost/atlas/standards/index.html` and `http://localhost/atlas/standards/rfc8693/index.html` to `lighthouserc.json`
- [ ] T034 [P] Update `docs/roadmap.md` (002 implemented, pull request open), `README.md` (link to the live atlas and its export) and `CLAUDE.md` if a convention changed (none expected)
- [ ] T035 [P] Update `src/layouts/Base.astro` footer "Download the data" to list both exports
- [ ] T036 Run every quickstart.md scenario (1 to 14) against a production build and record results in `specs/002-agent-auth-atlas/checklists/quickstart-run.md`; refresh screenshot baselines through the `refresh-screenshots` label on the pull request

---

## Dependencies & Execution Order

### Phase Dependencies

- **Model amendment (Phase 1)**: No dependencies; one commit
- **Foundational (Phase 2)**: Depends on Phase 1; BLOCKS all user stories. Order inside: T004 → T005, T006 → T007; T008 → T009; T010 → T011; T012 alongside; T013 after T002; T014 after T006 and T013
- **User Stories (Phase 3 to 7)**: All depend on Phase 2. US1 is the MVP. US2 needs T016 from US1. US3 needs T018 from US1. US4 and US5 need US1 and US2 pages
- **Polish (Phase 8)**: T032 needs only Phase 2; T033 to T035 need US1 and US2; T036 last

### User Story Dependencies

- **US1 (P1)**: After Phase 2. No story dependencies
- **US2 (P2)**: After Phase 2 and T016. Integrates with US1 by the node links
- **US3 (P3)**: After US1 (T018)
- **US4 (P4)**: After US1 and T009; small additions to US1's components
- **US5 (P5)**: After Phase 2 (T006) for validation; docs after US1 and US2 pages exist

### Within Each User Story

- Tests are written first and must fail before implementation
- Components before pages, pages before cross-links
- Story complete and its checkpoint green before moving on

### Parallel Opportunities

- Phase 2: T004, T005, T008, T010, T012 in parallel; T013 in parallel with the code tasks
- Phase 3: T015 and T016 in parallel before T017
- After T016: US2 (T020, T021) in parallel with T018
- Phase 8: T032 to T035 in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and 2 with the real launch data (SC-001)
2. Complete Phase 3: the map
3. **STOP and VALIDATE**: quickstart scenarios 1 to 4 and 14; deploy
4. The deployed map is already unique and useful (constitution honesty test 1)

### Incremental Delivery

1. Model amendment + Foundational → data validates, derivations and layout tested
2. US1 → the map (MVP)
3. US2 → spec pages, the pages people link to
4. US3 → filters
5. US4 → status over time
6. US5 → contribution path
7. Polish → export, budgets, docs

---

## Notes

- [P] tasks = different files, no dependencies
- Every task with a schema field quotes the constraint from data-model.md so nothing is left to
  implementation-time discretion
- `pnpm check` must pass before each commit; commit after each task or logical group
- No task contacts a third-party server; spec facts are entered from the publishers' pages by
  the maintainer and carry the document URLs as evidence
