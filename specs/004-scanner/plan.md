# Implementation Plan: Scanner

**Branch**: `004-scanner` | **Date**: 2026-10-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-scanner/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

A passive scanner for the MCP auth atlas: a library under `src/scanner/` that derives the
well-known metadata locations from a server's URL, fetches only those (HTTPS, GET, no
credentials), judges the 12 passively observable requirements of the current MCP Authorization
revision by a published decision table, grades the result by a published rule, and writes the
outcome as append-only observations with the metadata URL as evidence. One command drives it
(`pnpm scan`), a scheduled workflow runs it nightly and opens one pull request when something
changed, a small HTTP service exposes it on demand for any URL (the site's only backend, shipped
as a container image for Scaleway), and two pre-rendered pages (`/scanner/`, `/scanner/{id}/`)
show each listed server's report and grade from the repository's data alone. No new entity, no
model amendment, no new dependency.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 22 LTS (global `fetch`, `node:http`, `node:dns`)

**Primary Dependencies**: Astro 7, Svelte 5, Zod 4, yaml, tsx, Biome, Vitest, Playwright (all installed; no new dependency)

**Storage**: Observations as YAML under `data/observations/`, appended only. The service stores nothing.

**Testing**: Vitest over recorded responses for checks, append rule, grade, guard and service (no network in tests); Playwright for the two pages including axe and screenshots; the data validator and the append-only check in CI; a `workflow_dispatch` run of the nightly workflow as the live test

**Target Platform**: Static HTML from Bunny CDN for the pages; GitHub Actions (scheduled) for the nightly run; a Node 22 container on Scaleway Serverless Containers (EU) for the on-demand service

**Project Type**: Static web application plus one small HTTP service and one command

**Performance Goals**: Lighthouse performance and accessibility ≥ 95 on `/scanner/` and a report page; ≤ 150 kB compressed JS; an on-demand scan answers within 15 s (SC-005); the nightly run finishes in minutes for ~40 servers

**Constraints**: Tests and the site build never contact a server (FR-015, CLAUDE.md); the scanner sends GET only, HTTPS only, to well-known paths only (FR-002); fetch failures are `unknown`, never `unsupported` (FR-003); observations are append-only (FR-005); the grade never ranks (FR-009)

**Scale/Scope**: ~40 servers × 12 checks per night; at most 5 requests per scan; 2 page types plus one JSON route; one service with 2 routes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How this plan complies |
|---|---|---|
| I. One Model, Many Views | PASS | The scanner reads Server, Feature, Spec and Revision through `src/lib/data.ts` and writes Observation through the same schema. A report is derived at render time from observations; no report, run or grade is stored anywhere. No field is added. |
| II. Every Claim Cites a Revision | PASS | Every observation carries `revision` and every check in a report carries the feature's `section` and the revision's document URL. The check list is derived from the features defined in the current revision, so a feature that leaves the revision stops being judged. |
| III. Neutral and Passive by Default | PASS | Passive means the two PRM and three AS well-known locations, nothing else (research R4); no request to the MCP endpoint; no credentials; `observable: active` and `manual` features are out of scope. `unknown` is written for every fetch failure (FR-003). The grade is derived from model data by a public rule, withheld when a MUST is unknown, and never used to sort or rank (FR-008, FR-009, research R7). |
| IV. Static First, Open Data | PASS | The pages are pre-rendered from `data/`; the nightly run writes data through a pull request that CI validates; the only backend is the on-demand service, which exists because a scan of a stranger's URL cannot be static, and whose output flows back only by the same pull-request path. |
| V. Craft and Budgets | PASS | Tokens only; light and dark; the grade letter is accompanied by text and reasons, never colour alone; one island (the form) mounted only when the service is configured; one report component for static and island rendering; Lighthouse budgets extended to the new pages; no horizontal scroll at phone width. |
| VI. Agent-Legible Repository | PASS | Strict TS, Biome, Vitest over fixtures, Playwright with screenshots; the decision table in `data-model.md` is the readable contract for every status; `pnpm check` covers the scanner; `docs/scanner.md` documents operation; the nightly pull request description names every cell appended. |
| VII. European by Default | PASS with one recorded deviation | The on-demand service is built for Scaleway Serverless Containers in an EU region and stores nothing. The nightly run executes on GitHub Actions at launch (see Complexity Tracking); it is a batch job that reads public metadata and opens a pull request, not hosting, storage or analytics, and the same image can run it as a Scaleway scheduled job later. |
| Honesty tests | PASS | Not summarisable: measured metadata of real servers, dated and re-checked, is original data no model can summarise from the web. Compounding: every scanner observation sharpens the atlas cells the matrix, feature pages, exports and the home page already render; the report pages are a new view on the same cells. One maintainer: one command, one workflow, one container; the nightly pull request is the maintainer's only chore. |

Post-design re-check (after Phase 1): PASS. The contracts add one backend with two routes and no
storage, one JSON route on the site, and no change to the model. The deviation (where the
nightly batch runs) is recorded below.

## Project Structure

### Documentation (this feature)

```text
specs/004-scanner/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── routes.md        # site routes and the service's routes
│   ├── report.md        # the one report shape
│   └── service.md       # the on-demand service: endpoints, limits, configuration, deployment
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── scanner/                 # NEW: the library and the service; the site build never imports it
│   ├── version.ts           # SCANNER_VERSION, USER_AGENT, observer string
│   ├── urls.ts              # wellKnownPrmUrls, wellKnownAsUrls, normaliseIssuer
│   ├── guard.ts             # guardUrl: https, no credentials, default port, public address
│   ├── fetch.ts             # Fetcher type, nodeFetcher (timeout, size cap, manual redirects), FetchResult
│   ├── probe.ts             # probe(target, fetcher): requests made, documents found, issuer judged
│   ├── checks.ts            # one check per passive feature (the decision table), runChecks
│   ├── grade.ts             # grade(results): letter, label, reasons
│   ├── report.ts            # Report types, scan(target, data, fetcher, now)
│   ├── observations.ts      # toAppend(report, data), appendObservations(file, entries), summary
│   └── server.ts            # the on-demand HTTP service (node:http), createServer(options)
├── lib/
│   ├── scanner.ts           # NEW: passiveChecks, latestScan, scannerIndex, gradeFromObservations
│   └── labels.ts            # + GRADE_LABEL, GRADE_RULE text
├── components/
│   ├── ScanReport.svelte    # NEW: the report table and grade block; rendered statically and by the island
│   ├── ScanForm.svelte      # NEW: the island: URL field, POST to the service, renders ScanReport
│   └── GradeBadge.astro     # NEW: letter with label text, never colour alone
├── pages/
│   ├── scanner/
│   │   ├── index.astro      # NEW: how it works, rule, form or note, index, run it yourself, opt out
│   │   ├── [id].astro       # NEW: report page
│   │   └── [id].json.ts     # NEW: report JSON
│   ├── atlas/mcp/servers/[id].astro  # + "Passive scan" line with grade and link
│   └── index.astro          # the roadmap sentence about the scanner now links to it
└── layouts/Base.astro       # + "Scanner" in navigation and footer

scripts/
└── scan.ts                  # NEW: `pnpm scan [<url>|<server-id>|--all] [--write] [--summary <file>] [--json]`

.github/workflows/scan.yml   # NEW: nightly schedule + workflow_dispatch; opens one pull request
Dockerfile                   # NEW: the service image for Scaleway Serverless Containers
docs/scanner.md              # NEW: what it does, running it, the workflow, deploying the service, opt-out
docs/roadmap.md              # 004 implemented (pull request open)
docs/atlas-maintenance.md    # + "Scanner observations" section (reviewing a scanner pull request)
README.md                    # + scanner link
lighthouserc.json            # + /scanner/ and /scanner/notion/
package.json                 # + scan, scan:serve scripts

tests/
├── fixtures/scanner/        # NEW: recorded metadata responses per scenario (JSON)
├── unit/
│   ├── scanner-urls.test.ts     # well-known derivations
│   ├── scanner-guard.test.ts    # URL guard by name and by address
│   ├── scanner-checks.test.ts   # decision table over fixtures, including failures
│   ├── scanner-grade.test.ts    # the rule over every level × status
│   ├── scanner-append.test.ts   # append rule and file writing on a scratch copy
│   ├── scanner-service.test.ts  # routes, refusals, recorded request list, rate limit
│   └── scanner-view.test.ts     # latestScan and scannerIndex over a synthetic dataset
└── e2e/
    └── scanner.spec.ts      # index and report page: content, no-JS, phone, axe, screenshots
```

**Structure Decision**: Same single Astro project. Everything that can contact a server lives
under `src/scanner/` and is imported only by `scripts/scan.ts` and by tests; the pages import
`src/lib/scanner.ts`, which reads observations and computes views. The boundary makes FR-015
checkable by inspection and keeps the service and the command on one code path with the pages'
derivations. A `Dockerfile` at the root is where Scaleway's build expects it.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Constitution VII and the Technology Constraints name Scaleway for the backend and its scheduled job; this feature runs the nightly batch on GitHub Actions at launch. | No Scaleway account, project or secret exists yet, and a scheduled workflow needs none: the repository token (or a fine-grained token in `SCANNER_TOKEN`) is enough to open the pull request. The batch reads public metadata and writes a pull request; it hosts nothing and stores nothing, so the EU hosting rule is not touched by where it runs. The on-demand service, which does serve visitors, ships as a Scaleway container image. | Waiting for the account would ship the scanner without its first deliverable (a nightly pull request). The same `pnpm scan --all --write` runs inside the container image, so moving the schedule to a Scaleway Serverless Job is a configuration change documented in `docs/scanner.md`, not a code change. |
| The nightly pull request is opened with a token; with the workflow token GitHub does not start CI on it. | A documented limitation of events created by the workflow token. | A fine-grained personal token in `SCANNER_TOKEN` (contents and pull requests, this repository) makes the pull request trigger CI; without it the maintainer reopens the pull request. Both paths are documented; neither needs a third-party action. |
