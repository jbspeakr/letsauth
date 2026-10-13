---

description: "Task list for the MCP Atlas feature"
---

# Tasks: MCP Atlas

**Input**: Design documents from `/specs/001-mcp-atlas/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. The constitution (Principle VI) requires Vitest and Playwright with screenshot
comparison, and SC-006 and SC-002 are defined as tests. Unit tests for a story are written before
its implementation and must fail first.

**Organization**: Tasks are grouped by user story so each story is an independently testable
increment. Phases 1 and 2 also bootstrap the whole project, because this is the first feature.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1 to US5 from spec.md)
- Include exact file paths in descriptions

## Path Conventions

Single Astro project at the repository root as laid out in plan.md: `data/`, `src/`, `scripts/`,
`tests/`, `.github/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and tooling per research R1 and R9

- [ ] T001 Initialize the Astro 6 project with pnpm and strict TypeScript: `package.json` (scripts `dev`, `build`, `check`, `validate:data`, `test`, `test:e2e`, `lint`, `typecheck`), `astro.config.mjs`, `tsconfig.json` (extends `astro/tsconfigs/strict`), `.nvmrc` (22), `.gitignore`
- [ ] T002 Add the Svelte 5 integration (`@astrojs/svelte` 9) in `astro.config.mjs` and `svelte.config.js` with `vitePreprocess()`
- [ ] T003 [P] Configure Biome for lint and format in `biome.json` (recommended rules, 2-space indent, 100-column width) and wire `pnpm lint`
- [ ] T004 [P] Configure Vitest in `vitest.config.ts` (environment node, include `tests/unit/**`) and wire `pnpm test`
- [ ] T005 [P] Configure Playwright in `playwright.config.ts` (chromium, baseURL from `astro preview`, projects for light and dark `colorScheme`, `toHaveScreenshot` thresholds) and wire `pnpm test:e2e`
- [ ] T006 [P] Add `astro-pagefind` to `astro.config.mjs` for site search
- [ ] T007 [P] Write `CLAUDE.md` pointing at `.specify/memory/constitution.md`, `docs/data-model.md`, `specs/001-mcp-atlas/`, and the `pnpm` commands; state that `pnpm check` must pass before any push
- [ ] T008 [P] Create the design token system in `src/styles/tokens.css` (light values on `:root`, dark under `prefers-color-scheme` guarded by `:root:not([data-theme="light"])` and under `:root[data-theme="dark"]`, type scale, spacing, motion with `prefers-reduced-motion`) and a base layout in `src/layouts/Base.astro` that loads it and sets `<html lang>`, meta and the theme toggle
- [ ] T009 [P] Add the CI workflow `.github/workflows/ci.yml`: pnpm install with cache, `pnpm validate:data`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e`, Lighthouse CI with budgets performance ≥ 95, accessibility ≥ 95, JS ≤ 150 kB compressed on `/atlas/mcp`, one server page and one feature page (`lighthouserc.json`)
- [ ] T010 [P] Add the deploy workflow `.github/workflows/deploy.yml` per research R8: on push to `main`, build, upload `dist/` to the Bunny Storage Zone with HTTP PUT per file (`AccessKey` header from secret `BUNNY_STORAGE_KEY`, zone from `BUNNY_STORAGE_ZONE`, region host from `BUNNY_STORAGE_HOST`), then purge the pull zone (`BUNNY_PULL_ZONE_ID`, `BUNNY_API_KEY`); document the secrets in `docs/deploy.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared data model, data loading, validation and derivation that every story reads

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T011 [P] Implement the Spec and Revision schema in `src/schema/spec.ts`: `id` kebab-case, `body` enum (`ietf-oauth`, `ietf-wimse`, `ietf-other`, `openid`, `mcp`, `a2a`, `vendor`, `eu`), `family` enum (`protocol`, `profile`, `discovery`, `credential-format`, `regulation`), `url` HTTPS, `revisions[]` with `id` unique within the spec, `date` ISO `YYYY-MM-DD`, `status` enum (`draft`, `current`, `superseded`, `withdrawn`, `final`), `url` HTTPS, optional `supersedes`, optional `changes`; refine: exactly one revision has `status: current`
- [ ] T012 [P] Implement the Feature schema in `src/schema/feature.ts`: `id` matching `^[a-z0-9]+(\.[a-z0-9-]+)+$`, `name`, `definedBy { spec, revision, section (non-empty) }`, `level` enum (`MUST`, `SHOULD`, `MAY`, `DEPRECATED`, `REMOVED`), optional `levelNote`, `category` enum (`discovery`, `registration`, `authorization`, `token`, `session`, `transport`, `delegation`, `consent`), `party` enum (`mcp-server`, `authorization-server`, `client`), `description`, optional `supersedes`, `observable` enum (`passive`, `active`, `manual`)
- [ ] T013 [P] Implement the Server schema in `src/schema/server.ts`: `id` kebab-case, `name`, optional `vendor`, `url` HTTPS, optional `homepage`, `transport` enum (`streamable-http`, `sse`, `stdio-only`), `listed` enum (`opt-in`, `public-directory`, `maintainer-added`), `source` URL required unless `listed` is `opt-in`, optional `authClaimed` enum (`oauth2.1`, `oauth2.1-no-dcr`, `api-key`, `open`, `unknown`), optional `withdrawn { at, reason }`, optional `notes`
- [ ] T014 [P] Implement the Observation schema in `src/schema/observation.ts`: `server`, `feature`, `revision { spec, revision }`, `status` enum (`supported`, `partial`, `unsupported`, `unknown`, `not-applicable`), `method` enum (`manual`, `vendor-claim`, `passive-scan`, `active-scan`), `observedAt` ISO datetime, `observedBy` non-empty, `evidence` non-empty (URL or note); export the method strength order `active-scan > passive-scan > manual > vendor-claim`
- [ ] T015 Export all schemas and inferred types from `src/schema/index.ts` (depends on T011 to T014)
- [ ] T016 Define Astro content collections in `src/content.config.ts` with the `glob` loader over `data/specs/*.yaml`, `data/features/*.yaml`, `data/servers/*.yaml`, `data/observations/*.yaml` (observation files are lists keyed by server id) using the schemas from T015
- [ ] T017 Implement `scripts/validate-data.ts`: load every file under `data/`, run the schemas, then cross-reference checks from data-model.md (feature `definedBy` resolves to an existing revision; observation `server` equals its file name and exists; observation `feature` exists with party `mcp-server` or `authorization-server`; observation `revision` resolves and the feature is defined under it; `supersedes` resolves; one `current` revision per spec); print errors as `path[index].field: message`, exit non-zero on any error; wire `pnpm validate:data` and run it first in `pnpm build` and `pnpm check` (depends on T015)
- [ ] T018 [P] Implement the append-only check `scripts/check-observations-append-only.ts`: compare `data/observations/**` on the PR head against the merge base, fail naming any existing entry (by content hash) that was changed or removed; add it as a CI step in `.github/workflows/ci.yml` on pull requests (depends on T014)
- [ ] T019 [P] Write unit tests for the derivation rules in `tests/unit/atlas.test.ts` before T020: newest observation wins; equal timestamps broken by method strength; missing observation yields `{ status: "unknown", derived: true }` (SC-006); `stdio-only` server yields `not-applicable`; history is newest first; feature share excludes `unknown` and `not-applicable`; revision diff lists level changes and additions/removals; `client` features excluded from matrix columns
- [ ] T020 Implement the derivations in `src/lib/atlas.ts` as pure functions over the collection data: `currentCell`, `cellHistory`, `matrixFor(revisionId)`, `featureShare`, `revisionDiff(from, to)`, `matrixColumns`, `matrixRows` (excludes withdrawn), per data-model.md; make T019 pass (depends on T015, T019)
- [ ] T021 [P] Implement `src/lib/citations.ts`: resolve `definedBy` and `revision` refs to `{ url, revisionId, section }` and throw at build time on a dangling ref; unit test in `tests/unit/citations.test.ts` asserting every feature in `data/features` resolves (SC-002)
- [ ] T022 [P] Enter the spec data in `data/specs/mcp-authorization.yaml`: revisions `2025-11-25` (status `superseded`) and `2026-07-28` (status `current`, `supersedes: "2025-11-25"`, `changes` summarising CIMD over DCR, RFC 9207 `iss`, issuer-keyed credentials, session removal) with the canonical URLs
- [ ] T023 [P] Enter the 23 feature files under `data/features/` from research R3 (`mcp.prm`, `mcp.prm.well-known`, `mcp.prm.www-authenticate`, `mcp.prm.authorization-servers`, `mcp.prm.scopes-supported`, `mcp.prm.no-offline-access`, `mcp.as.metadata`, `mcp.as.issuer-match`, `mcp.as.https`, `mcp.as.pkce-s256`, `mcp.as.cimd`, `mcp.as.dcr`, `mcp.as.preregistration`, `mcp.as.iss-param`, `mcp.as.resource-indicator`, `mcp.as.refresh-rotation`, `mcp.rs.bearer-header`, `mcp.rs.audience-validation`, `mcp.rs.401-on-invalid`, `mcp.rs.scope-challenge`, `mcp.rs.insufficient-scope`, `mcp.rs.no-passthrough`, `mcp.proxy.consent`), each with `definedBy` section from the R3 table, `party`, `level`, `levelNote` where R3 qualifies it, `category`, `observable`; add the 2025-11-25 variants where the level differs (`mcp.as.dcr` at `SHOULD`) and omit features new in 2026-07-28 from that revision (`mcp.as.iss-param`)
- [ ] T024 [P] Enter the client-party features under `data/features/` (`mcp.client.pkce`, `mcp.client.scope-union`, `mcp.client.iss-compare-no-normalization`, `mcp.client.dcr-application-type`, `mcp.client.credentials-keyed-by-issuer`, `mcp.client.resource-param`) with `party: client` and citations, for later use by the explorer
- [ ] T025 Seed servers under `data/servers/` per research R4: at least 30 servers from the awesome-remote-mcp-servers list that advertise OAuth 2.1, each with `listed: public-directory`, `source` set to the list URL, `authClaimed` from the list's auth column, `transport` from the endpoint type; include at least 3 API-key or open servers with `authClaimed` set accordingly (depends on T013)
- [ ] T026 Seed observations under `data/observations/<server-id>.yaml`: for every seeded server, a `vendor-claim` observation for `mcp.as.dcr` derived from the list's "no DCR" marker (`unsupported` when marked, otherwise `unknown`), and `not-applicable` observations for every authorization-server and mcp-server feature on API-key-only and open servers, all against revision `2026-07-28`, `observedBy: jbspeakr`, `evidence` the list URL; `pnpm validate:data` must pass (depends on T017, T023, T025)

**Checkpoint**: `pnpm validate:data`, `pnpm test` and `pnpm build` pass with real data; user story work can begin

---

## Phase 3: User Story 1 - Browse the support matrix (Priority: P1) 🎯 MVP

**Goal**: `/atlas/mcp` renders the full matrix for the current revision with a status in every cell, cell detail with method, date, observer and evidence, filters and search shareable by link, and no JavaScript needed to read it.

**Independent Test**: Quickstart scenarios 1 to 4 and 13.

### Tests for User Story 1

- [ ] T027 [P] [US1] Playwright test `tests/e2e/matrix.spec.ts`: revision named at top; row count equals non-withdrawn servers; column count equals non-client features; every cell has a status; opening a cell shows status, method, date, observer, evidence link; closing returns focus to the cell; a seeded server with no observations shows `unknown` in every cell and never `unsupported`; `?level=MUST&q=stripe` in a fresh page yields the filtered view; with JavaScript disabled the full matrix renders; screenshots in light and dark

### Implementation for User Story 1

- [ ] T028 [P] [US1] Create `src/components/StatusCell.astro`: renders a status with its own token colour and an icon or glyph so status is not conveyed by colour alone; `unknown` and `not-applicable` styled distinctly from `unsupported`; `derived` cells marked
- [ ] T029 [P] [US1] Create `src/components/Citation.astro`: renders `section` as a link to the revision URL via `src/lib/citations.ts`
- [ ] T030 [US1] Create the server-rendered matrix in `src/pages/atlas/mcp/index.astro` using `matrixFor(currentRevision)` from `src/lib/atlas.ts`: a `<table>` with sticky server column and feature headers (level and category as abbreviated labels with `title`), cells via `StatusCell`, each cell wrapping a `<details>` with the observation detail so it works without JS; revision name and date in the header; `overflow-x: auto` wrapper (depends on T028, T029)
- [ ] T031 [US1] Create the island `src/components/Matrix.svelte` and mount it with `client:idle` over the table from T030: reads `level`, `category`, `party`, `q` from `location.search` on load, filters rows and columns, debounced search by server name, writes state with `history.replaceState`, opens cell detail in a dialog with focus return; keeps the DOM table as the source of truth so the no-JS view is identical (depends on T030)
- [ ] T032 [US1] Add filter controls (level, category, party selects; search input with stable `id`s) to `src/pages/atlas/mcp/index.astro` that the island binds to, with a visible "n of m servers" count (depends on T031)
- [ ] T033 [US1] Add the home page `src/pages/index.astro` with a one-paragraph description and a link to `/atlas/mcp`, and the site navigation in `src/layouts/Base.astro`

**Checkpoint**: The matrix is browsable, filterable and passes T027 and the Lighthouse budgets

---

## Phase 4: User Story 2 - Read one server's profile (Priority: P2)

**Goal**: `/atlas/mcp/servers/{id}` shows the server's profile, every feature with current status, history per feature in date order, why it is listed, and the contribution and withdrawal links.

**Independent Test**: Quickstart scenarios 5 and 11.

### Tests for User Story 2

- [ ] T034 [P] [US2] Playwright test `tests/e2e/server-page.spec.ts`: for a server with two observations on one feature, current status equals the newest and the older one is listed under history with method and date; listing reason and source link shown; withdrawn server renders the withdrawal notice and no matrix row; screenshots in light and dark

### Implementation for User Story 2

- [ ] T035 [US2] Create `src/pages/atlas/mcp/servers/[id].astro` with `getStaticPaths` over all servers (withdrawn included): profile block (name, vendor, endpoint, transport, `listed` with `source` link, `authClaimed`), a feature table grouped by party with `StatusCell` and `Citation`, an expandable history list per feature from `cellHistory`, and a withdrawal notice branch when `withdrawn` is set (depends on T028, T029)
- [ ] T036 [US2] Link each matrix row's server name in `src/pages/atlas/mcp/index.astro` to its server page, and add "Contribute a correction" and "Withdraw this server" links on the server page pointing at `/atlas/mcp/contribute` (depends on T035)

**Checkpoint**: Server pages render for every seeded server and pass T034

---

## Phase 5: User Story 3 - Read one feature's definition and adoption (Priority: P3)

**Goal**: `/atlas/mcp/features/{id}` shows the definition, level with note, the citation, the adoption share with unknown and not-applicable counts, servers grouped by status, and the level across revisions.

**Independent Test**: Quickstart scenarios 6 and 7.

### Tests for User Story 3

- [ ] T037 [P] [US3] Playwright test `tests/e2e/feature-page.spec.ts`: citation link href equals the revision URL and the section text is shown; share excludes unknown and not-applicable and both counts are shown; server lists per status match the matrix column; screenshots in light and dark

### Implementation for User Story 3

- [ ] T038 [US3] Create `src/pages/atlas/mcp/features/[id].astro` with `getStaticPaths` over all features (client-party included but marked "not shown in the matrix"): definition, `level` plus `levelNote`, `party`, `category`, `observable`, `Citation`, adoption share from `featureShare` rendered as text plus a proportional bar with the counts, servers grouped by status with links, and a "level by revision" table (depends on T029)
- [ ] T039 [US3] Link each matrix column header in `src/pages/atlas/mcp/index.astro` to its feature page (depends on T038)

**Checkpoint**: Feature pages render for every feature and pass T037

---

## Phase 6: User Story 4 - Contribute or correct an observation (Priority: P4)

**Goal**: Both contribution paths from contracts/contribution.md exist; an incomplete submission is rejected by CI with a message naming the field; withdrawal is a documented request.

**Independent Test**: Quickstart scenarios 8, 9 and 11.

### Tests for User Story 4

- [ ] T040 [P] [US4] Unit test `tests/unit/validate-data.test.ts`: running the validator over a fixture directory with an observation missing `evidence` exits non-zero and the message contains `evidence: required`; an unknown feature id names the field `feature`; a changed existing entry fails the append-only check with the entry index

### Implementation for User Story 4

- [ ] T041 [P] [US4] Create the issue form `.github/ISSUE_TEMPLATE/observation.yml` with required fields mirroring the entry format (type selector `new observation` / `correction` / `withdraw my server`, server, feature, revision, status, method, date, evidence, handle) and `.github/ISSUE_TEMPLATE/config.yml` disabling blank issues
- [ ] T042 [P] [US4] Create the contribution page `src/pages/atlas/mcp/contribute.astro` from contracts/contribution.md: both paths, the YAML entry format, the append-only rule, how withdrawal works, with links to the issue form and the repository
- [ ] T043 [US4] Add `.github/pull_request_template.md` with a checklist for data PRs (evidence link per new observation, no edited entries) and make `scripts/validate-data.ts` message format match T040 exactly (depends on T017, T040)

**Checkpoint**: A contributor can submit through either path and CI rejects incomplete entries with a field-level message

---

## Phase 7: User Story 5 - View the matrix against another revision (Priority: P5)

**Goal**: `/atlas/mcp/{revisionId}` renders the matrix for any revision with features defined, and `/atlas/mcp/changes/{from}...{to}` lists features whose level changed or that were added or removed.

**Independent Test**: Quickstart scenario 10.

### Tests for User Story 5

- [ ] T044 [P] [US5] Playwright test `tests/e2e/revision.spec.ts`: `/atlas/mcp/2025-11-25` shows that revision's name and feature set; the changes page lists `mcp.as.dcr` with old and new level and `mcp.as.iss-param` as added; the current revision redirects or canonicalises to `/atlas/mcp`

### Implementation for User Story 5

- [ ] T045 [US5] Create `src/pages/atlas/mcp/[revision]/index.astro` reusing the matrix rendering from T030 (extract the table into `src/components/MatrixTable.astro` and use it from both pages) with `getStaticPaths` over non-current revisions, and a revision switcher in the header of both pages (depends on T030)
- [ ] T046 [US5] Create `src/pages/atlas/mcp/changes/[range].astro` with `getStaticPaths` over adjacent revision pairs, rendering `revisionDiff(from, to)` as three lists: level changed (old → new), added, removed, each with `Citation` (depends on T020, T029)
- [ ] T047 [US5] Mark changed-level columns in the matrix header with a "changed in this revision" badge linking to the changes page (depends on T045, T046)

**Checkpoint**: All five stories are independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Export, search, analytics, documentation and the full quickstart run

- [ ] T048 [P] Implement the full export `src/pages/atlas/mcp/data.json.ts` and per-server export `src/pages/atlas/mcp/servers/[id].json.ts` per contracts/data-export.md (`version: 1`, `generatedAt`, `license`, `spec`, `features`, `servers`, `cells`, `observations`; withdrawn servers omitted)
- [ ] T049 [P] Unit test `tests/unit/export.test.ts`: the built `data.json` validates against `src/schema/` and its `cells` equal `matrixFor(currentRevision)`
- [ ] T050 [P] Add Plausible (EU) script tag to `src/layouts/Base.astro` behind a `PUBLIC_PLAUSIBLE_DOMAIN` env var so local builds load nothing
- [ ] T051 [P] Add redirect support `public/_redirects` or Bunny edge rule notes in `docs/deploy.md` for renamed ids, per contracts/routes.md
- [ ] T052 [P] Add `robots.txt`, `sitemap` (via `@astrojs/sitemap`) and Open Graph meta in `src/layouts/Base.astro`
- [ ] T053 [P] Write `docs/atlas-maintenance.md`: how to add a revision, add or change a feature, seed servers, review a data PR, and run the append-only check locally
- [ ] T054 Update `docs/roadmap.md` status for 001 and the README links to the live atlas
- [ ] T055 Run every quickstart.md scenario (1 to 14) against a production build and record results in `specs/001-mcp-atlas/checklists/quickstart-run.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; T003 to T010 can run in parallel after T001 and T002
- **Foundational (Phase 2)**: Depends on Setup; BLOCKS all user stories. Order inside: schemas (T011 to T014, parallel) → T015 → T016, T017 → data entry (T022 to T024 parallel, then T025, T026) with T019 → T020 and T018, T021 alongside
- **User Stories (Phase 3 to 7)**: All depend on Phase 2. US1 is the MVP. US2, US3 and US4 depend only on Phase 2 and the two shared components (T028, T029) and can run in parallel after US1's T028 and T029 exist. US5 depends on US1 (T030) for the table extraction
- **Polish (Phase 8)**: Depends on the stories it touches; T048 and T049 need only Phase 2

### User Story Dependencies

- **US1 (P1)**: After Phase 2. No story dependencies
- **US2 (P2)**: After Phase 2 and T028, T029. Integrates with US1 by linking row names
- **US3 (P3)**: After Phase 2 and T029. Integrates with US1 by linking column headers
- **US4 (P4)**: After Phase 2 (T017). Independent of pages except the contribute page
- **US5 (P5)**: After US1 (T030), because it reuses the matrix table

### Within Each User Story

- Tests are written first and must fail before implementation
- Components before pages, pages before cross-links
- Story complete and its checkpoint green before moving on

### Parallel Opportunities

- Phase 1: T003 to T010 in parallel
- Phase 2: T011 to T014 in parallel; T018, T019, T021 to T024 in parallel with each other
- Phase 3: T027, T028, T029 in parallel before T030
- After T028 and T029: US2, US3 and US4 in parallel
- Phase 8: T048 to T053 in parallel

---

## Parallel Example: User Story 1

```bash
# Before implementation, launch in parallel:
Task: "Playwright test tests/e2e/matrix.spec.ts"
Task: "Create src/components/StatusCell.astro"
Task: "Create src/components/Citation.astro"

# Then sequentially:
Task: "Create the server-rendered matrix in src/pages/atlas/mcp/index.astro"
Task: "Create the island src/components/Matrix.svelte"
Task: "Add filter controls to src/pages/atlas/mcp/index.astro"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational, including real seed data (≥ 30 servers, SC-001)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: quickstart scenarios 1 to 4 and 13; deploy to Bunny
5. The deployed matrix is already unique and useful (constitution honesty test 1)

### Incremental Delivery

1. Setup + Foundational → data validates and derivations are tested
2. US1 → matrix live (MVP)
3. US2 → server pages, the pages people link to
4. US3 → feature pages, the pages that teach
5. US4 → contribution path, the atlas can be corrected by others
6. US5 → revision switcher and diff
7. Polish → export, search, analytics, maintenance docs

### Parallel Team Strategy

One maintainer with agent support: run Phase 1 and 2 as one batch, then US1, then US2 to US4 as
parallel agent tasks (they touch different files), then US5 and Polish.

---

## Notes

- [P] tasks = different files, no dependencies
- Every task with a schema field quotes the constraint from data-model.md so nothing is left to
  implementation-time discretion
- `pnpm check` must pass before each commit; commit after each task or logical group
- Stop at any checkpoint to validate the story independently
- No task contacts a third-party server; seed observations are `vendor-claim` or `not-applicable`
