# Implementation Plan: Agent Auth Atlas

**Branch**: `002-agent-auth-atlas` | **Date**: 2026-10-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-agent-auth-atlas/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

A pre-rendered map of the specifications, drafts and regulations that govern agent
authorization, drawn from the shared model's Spec and Relation entities: one inline SVG laid out
at build time (columns by dependency depth, rows by publishing body), a legend, a filter form
enhanced by one small island, a list of every spec, and one page per spec with its revisions,
relations and the features it defines. The feature is mostly data entry: around 35 specs under
`data/specs/` and the relations between them in `data/relations.yaml`. It amends the shared
model once (`maturity` on Spec, two enum values), implements the Relation schema the model
already describes, and reuses the MCP atlas's layout, tokens, validation, export and test
patterns.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 22 LTS

**Primary Dependencies**: Astro 7, @astrojs/svelte 9 with Svelte 5, Zod 4, yaml, Biome, Vitest, Playwright (all already installed; no new dependency)

**Storage**: YAML files under `data/` (one spec per file, one relations list). Build-time JSON export.

**Testing**: Vitest for the relation rules, the layout and the derivations; Playwright for the map page and a spec page including axe checks and screenshot comparison; the data validator in CI

**Target Platform**: Static HTML/CSS/SVG served from Bunny CDN; built on GitHub Actions

**Project Type**: Static web application; one new interactive island

**Performance Goals**: Lighthouse performance and accessibility ≥ 95 on `/atlas/standards/` and a spec page; ≤ 150 kB compressed JS; the map page usable within 2 s on a mid-range phone over slow 4G (SC-004)

**Constraints**: No backend; no third-party request at build or run time; the map is complete without JavaScript; layout deterministic for the same data; every relation validated before the build

**Scale/Scope**: 35 to 80 specs, 40 to 200 relations, 2 page types plus the export

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How this plan complies |
|---|---|---|
| I. One Model, Many Views | PASS with one justified deviation | The atlas reads Spec, Revision, Relation and Feature from `data/` through the same loader the MCP atlas uses and keeps no private copy. It implements the Relation schema the model already describes. It needs one field the model lacks (`maturity`) and two enum values; the constitution asks for that amendment in its own pull request. See Complexity Tracking for why it is this pull request's first commit instead. The MCP atlas picks the field up by linking to the spec page. |
| II. Every Claim Cites a Revision | PASS | Every node is a spec with at least one dated revision and a document URL; every revision reference in features still resolves at build time. Relations cite a `source` where the document states the relation, and a judgement relation carries its reasoning in `note`. The spec page links every revision to its exact document. |
| III. Neutral and Passive by Default | PASS | Maturity is the publisher's status, shown with the publisher's own label; the atlas grades nothing (FR-013). Order is by date and name. Nothing is contacted. Withdrawn and expired specs stay visible, marked (FR-014). |
| IV. Static First, Open Data | PASS | Fully pre-rendered, including the SVG layout. Data is YAML changed by pull request. `data.json` publishes specs and relations under CC BY 4.0 (FR-012). |
| V. Craft and Budgets | PASS | Tokens from `src/styles/tokens.css` only; light and dark; reduced motion honoured by the island; maturity and edge type never conveyed by colour alone; the map scrolls in its frame at phone width; Lighthouse budgets extended to the new pages (R10); one island, budgeted. |
| VI. Agent-Legible Repository | PASS | Strict TS, Biome, Vitest, Playwright with screenshots; the Zod schema stays the readable contract and gains the Relation schema; `pnpm check` covers everything; `docs/atlas-maintenance.md` gains a section on specs and relations. |
| VII. European by Default | PASS | No hosting or analytics change. The EU acts (eIDAS 2.0, AI Act, NIS2, EUDI ARF) are first-class nodes with their own body on the map. |
| Honesty tests | PASS | Not summarisable: the relations are curated, typed, noted and dated, and the map is derived from them, not from prose. Compounding: every spec entered here is a citation target for the explorer (003), breach anatomies (005) and the EU pages (006), and the MCP atlas's spec gains a page. One maintainer: data entry is YAML with validation; the layout is automatic. |

Post-design re-check (after Phase 1): PASS. The contracts add no backend and no private data.
The one deviation (model amendment carried in this PR) is recorded below and is a sequencing
choice, not a design one: the amendment is self-contained in the first commit and could be split
out if the maintainer prefers.

## Project Structure

### Documentation (this feature)

```text
specs/002-agent-auth-atlas/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── routes.md        # URL contract for pages and export
│   └── data-export.md   # JSON export contract
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
data/
├── specs/                   # +~35 spec files (rfc6749.yaml, oauth-2-1.yaml, cimd.yaml, …)
└── relations.yaml           # NEW: one list of relations

docs/
├── data-model.md            # amended: Spec.maturity, maturityNote; body "other"; family "guidance"
└── atlas-maintenance.md     # amended: "Add a spec or a relation" section

src/
├── schema/
│   ├── spec.ts              # amended: maturity, maturityNote, enum additions
│   ├── relation.ts          # NEW: relationType, relationSchema, relationFileSchema, isSymmetric, isDependency
│   └── index.ts             # exports relation
├── lib/
│   ├── data.ts              # loads data/relations.yaml; cross-checks from R5
│   ├── standards.ts         # NEW: specNodes, relationsOf, featuresDefinedBy, BODY_ORDER, currentRevisionOf
│   ├── graph.ts             # NEW: layoutGraph (pure, deterministic)
│   ├── labels.ts            # + BODY_LABEL, FAMILY_LABEL, MATURITY_LABEL/TAG, RELATION_LABEL
│   └── standards-export.ts  # NEW: buildStandardsExport
├── components/
│   ├── StandardsMap.astro   # NEW: the SVG from layoutGraph, legend, frame
│   ├── StandardsMap.svelte  # NEW: the island: filters, counts, URL sync, neighbourhood highlight
│   ├── MaturityTag.astro    # NEW: maturity label with non-colour encoding
│   └── RelationList.astro   # NEW: relations grouped by type and direction, with note and source
├── pages/
│   ├── index.astro          # + second call to action and a fact card
│   └── atlas/standards/
│       ├── index.astro      # NEW: the map page
│       ├── [id].astro       # NEW: spec page
│       └── data.json.ts     # NEW: export
├── layouts/Base.astro       # + "Agent auth atlas" in navigation
└── content.config.ts        # + relations collection

scripts/validate-data.ts     # unchanged entry point; rules live in src/lib/data.ts

lighthouserc.json            # + /atlas/standards/ and /atlas/standards/rfc8693/

tests/
├── unit/
│   ├── relations.test.ts    # NEW: schema and cross-check rules (R5) incl. cycle and duplicate
│   ├── graph.test.ts        # NEW: layout depth, grouping, determinism
│   ├── standards.test.ts    # NEW: specNodes (withdrawn), relationsOf, featuresDefinedBy, export
│   └── validate-data.test.ts# + fixture with a bad relation
├── fixtures/bad-data/relations.yaml  # NEW
└── e2e/
    ├── standards.spec.ts    # NEW: map page: nodes, edges, links, filter, no-JS, phone, axe, screenshots
    └── spec-page.spec.ts    # NEW: spec page: revisions, relations, features, axe, screenshots
```

**Structure Decision**: Same single Astro project. Derivations for this atlas live in their
own modules (`standards.ts`, `graph.ts`) next to `atlas.ts` rather than inside it, so each atlas
owns its view logic while both read one dataset through `src/lib/data.ts`. The Relation schema
joins `src/schema/` so the scanner (004) and the explorer (003) import it from the same place.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Principle I asks for a model amendment "in its own PR"; this feature carries `Spec.maturity`, `Spec.maturityNote`, body `other` and family `guidance` as the first commit of its own pull request. | The maintainer asked for one pull request for the feature and the thread works on one designated branch. The amendment is one commit, touches only `docs/data-model.md`, `src/schema/spec.ts` and the existing MCP spec file (which gains `maturity: published`), and leaves every existing page unchanged. | Opening a second pull request from this thread would need a second branch, which the thread is not allowed to push. Omitting `maturity` and inferring status from URLs would put a false or fragile claim on every node (constitution II and III). The commit is self-contained so the maintainer can cherry-pick it into its own pull request first if preferred. |
