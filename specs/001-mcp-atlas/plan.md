# Implementation Plan: MCP Atlas

**Branch**: `001-mcp-atlas` | **Date**: 2026-10-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-mcp-atlas/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

A pre-rendered matrix of public MCP servers against the features of the MCP authorization
specification (revision 2026-07-28 as current, 2025-11-25 as the prior revision), with server
pages, feature pages, a revision switcher and a reviewed contribution path. Data is YAML in the
repository validated by Zod schemas at build time; the site is Astro 7 with one Svelte 5 island
for the interactive matrix, deployed as static files to Bunny. This feature also bootstraps the
project: the Astro app, the shared schema, data validation, CI and deployment land here because
nothing else exists yet.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 22 LTS

**Primary Dependencies**: Astro 7, @astrojs/svelte 9 with Svelte 5, Zod 3, yaml, Pagefind (via astro-pagefind), Biome, Vitest, Playwright

**Storage**: YAML files under `data/` in the repository (no database). Build-time JSON export for reuse.

**Testing**: Vitest for schema and derivation logic; Playwright for the matrix, server and feature pages including screenshot comparison; a data validation script run in CI and as a pre-commit check

**Target Platform**: Static HTML/CSS/JS served from Bunny CDN (EU storage zone); built on GitHub Actions

**Project Type**: Static web application with content collections and one interactive island

**Performance Goals**: Lighthouse performance and accessibility ≥ 95 on `/atlas/mcp`, a server page and a feature page; matrix usable within 2 s on a mid-range phone over slow 4G (SC-004); ≤ 150 kB compressed JS on any page (constitution V)

**Constraints**: No backend; no server is contacted by the atlas (spec assumption); observations append-only; every feature carries a resolvable citation; works without JavaScript for reading (the island only adds filtering and cell detail without reload)

**Scale/Scope**: ~30 to 120 servers, ~20 features per revision, 2 revisions at launch, a few thousand observations over the first year; 3 page types plus the data export

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How this plan complies |
|---|---|---|
| I. One Model, Many Views | PASS | The feature adds no private entities. It implements the shared schema (`src/schema/`) that `docs/data-model.md` describes and reads `data/` through Astro content collections. Later features import the same schema. |
| II. Every Claim Cites a Revision | PASS | Every `Feature.revisions[]` entry is required to cite a section and is validated at build time against `data/specs`; the build fails on a dangling citation. Observations carry the revision they were judged against. The feature page renders the citation link. |
| III. Neutral and Passive by Default | PASS | The atlas contacts no server. Observations record `method` and `evidence`; `unknown` is explicit and rendered distinctly (FR-003). No vendor scoring (FR-014). |
| IV. Static First, Open Data | PASS | Fully pre-rendered. Data lives in `data/` and changes by PR. A JSON export is published (FR-013). No backend in this feature. |
| V. Craft and Budgets | PASS | One token system in `src/styles/tokens.css`; light and dark; reduced motion; Lighthouse CI with the stated budgets; the island is the only JS and is budgeted. |
| VI. Agent-Legible Repository | PASS | Strict TS, Biome, Vitest, Playwright with screenshots, `pnpm check` runs everything headless, `CLAUDE.md` points at the constitution, data model and commands. |
| VII. European by Default | PASS | Bunny storage zone in an EU region, Plausible EU, no cookies, fonts self-hosted. |
| Honesty tests | PASS | Not summarisable (original, dated observations); compounding (every observation and feature is reused by 002 to 004); one maintainer (data entry is YAML plus CI validation). |

Post-design re-check (after Phase 1): PASS. No principle is affected by the design artefacts; the
contracts add no backend and no private data.

## Project Structure

### Documentation (this feature)

```text
specs/001-mcp-atlas/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── routes.md        # URL contract for pages and exports
│   ├── data-export.md   # JSON export contract
│   └── contribution.md  # How an observation is contributed and validated
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
astro.config.mjs
svelte.config.js
biome.json
package.json                 # pnpm; scripts: dev, build, check, validate:data, test, test:e2e
tsconfig.json
CLAUDE.md                    # points at constitution, data model, commands

data/
├── specs/                   # mcp-authorization.yaml (revisions 2025-11-25, 2026-07-28)
├── features/                # one YAML per feature, e.g. mcp.cimd.yaml
├── servers/                 # one YAML per server
└── observations/            # one YAML list per server, append-only

src/
├── schema/                  # Zod schemas = the data model contract (shared by later features)
│   ├── spec.ts
│   ├── feature.ts
│   ├── server.ts
│   ├── observation.ts
│   └── index.ts
├── content.config.ts        # Astro content collections over data/ using the schemas
├── lib/
│   ├── atlas.ts             # derivations: current status per cell, history, revision diff, shares
│   └── citations.ts         # resolve revisions[] refs, fail build on dangling refs
├── layouts/
├── styles/tokens.css        # design tokens (light/dark, type, spacing, motion)
├── styles/fonts.css         # self-hosted @font-face declarations (constitution VII)
├── components/
│   ├── MatrixTable.astro    # server-rendered table, shared by the current and other revisions
│   ├── Matrix.svelte        # the one island: filter, search, cell detail
│   ├── StatusCell.astro
│   └── Citation.astro
└── pages/
    └── atlas/mcp/
        ├── index.astro                  # current revision matrix
        ├── [revision]/index.astro       # matrix for another revision
        ├── servers/[id].astro
        ├── features/[id].astro
        ├── changes/[from]/[to].astro    # revision diff
        ├── contribute.astro
        ├── data.json.ts                 # full export
        └── servers/[id].json.ts         # per-server export

scripts/
├── validate-data.ts         # loads data/, runs schemas and cross-reference checks, prints field-level errors
└── check-observations-append-only.ts

public/_redirects            # renamed ids (or Bunny edge rules, see docs/deploy.md)
docs/deploy.md               # Bunny secrets and the deploy workflow
docs/atlas-maintenance.md    # how to add revisions, features, servers; review data PRs
LICENSE                      # code licence
LICENSE-DATA                 # data licence (CC BY 4.0)

tests/
├── unit/                    # schema and atlas.ts derivations
└── e2e/                     # Playwright: matrix, server page, feature page, revision switch, screenshots

.github/
├── workflows/ci.yml         # install, validate:data, lint, typecheck, unit, build, e2e, lighthouse
├── workflows/deploy.yml     # on main: build, upload dist to Bunny Storage, purge pull zone
└── ISSUE_TEMPLATE/observation.yml   # structured form for contributors who don't open PRs
```

**Structure Decision**: A single Astro project at the repository root. Data (`data/`) and schema
(`src/schema/`) are separated from pages so that later features (standards atlas, explorer,
scanner) import the schema and read the same data without touching atlas pages. A package split
(`packages/schema`) is deferred until a second consumer that is not part of the Astro build
exists (the scanner, feature 004).

## Complexity Tracking

No constitution violations to justify.
