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
(`pnpm scan`); a Scaleway Serverless Job runs it nightly from the repository's container image
and opens one pull request when something changed (the site's only backend, deployed by a
dedicated workflow); and two pre-rendered pages (`/scanner/`, `/scanner/{id}/`) show each listed
server's report and grade from the repository's data alone. Nothing a visitor does triggers a
scan. No new entity, no model amendment, no new dependency.

Revised 2026-10-14 on the owner's decisions: the on-demand service and its form were removed,
the nightly run moved from a GitHub Actions schedule to a Scaleway job, and deployment to
Scaleway became a dedicated workflow.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 22 LTS (global `fetch`, `node:dns`, `node:child_process`)

**Primary Dependencies**: Astro 7, Svelte 5, Zod 4, yaml, tsx, Biome, Vitest, Playwright (all installed; no new dependency)

**Storage**: Observations as YAML under `data/observations/`, appended only. The job stores nothing outside the repository.

**Testing**: Vitest over recorded responses for checks, append rule, grade and guard, and over an injected `fetch` for the job's pull request step (no network in tests); Playwright for the two pages including axe and screenshots; the data validator and the append-only check in CI; one manual start of the Scaleway job as the live test

**Target Platform**: Static HTML from Bunny CDN for the pages; a Node 22 container as a Scaleway Serverless Job (EU region, cron) for the nightly run; GitHub Actions only for CI and for deploying the image

**Project Type**: Static web application plus one scheduled job and one command

**Performance Goals**: Lighthouse performance and accessibility ≥ 95 on `/scanner/` and a report page; ≤ 150 kB compressed JS (the scanner pages ship none); the nightly run finishes within 30 minutes for ~40 servers (SC-005)

**Constraints**: Tests and the site build never contact a server (FR-015, CLAUDE.md); the scanner sends GET only, HTTPS only, to well-known paths only (FR-002); fetch failures are `unknown`, never `unsupported` (FR-003); observations are append-only (FR-005); the grade never ranks (FR-009)

**Scale/Scope**: ~40 servers × 12 checks per night; at most 5 requests per scan; 2 page types plus one JSON route; one job, no HTTP endpoint

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How this plan complies |
|---|---|---|
| I. One Model, Many Views | PASS | The scanner reads Server, Feature, Spec and Revision through `src/lib/data.ts` and writes Observation through the same schema. A report is derived at render time from observations; no report, run or grade is stored anywhere. No field is added. |
| II. Every Claim Cites a Revision | PASS | Every observation carries `revision` and every check in a report carries the feature's `section` and the revision's document URL. The check list is derived from the features defined in the current revision, so a feature that leaves the revision stops being judged. |
| III. Neutral and Passive by Default | PASS | Passive means the two PRM and three AS well-known locations, nothing else (research R4); no request to the MCP endpoint; no credentials; `observable: active` and `manual` features are out of scope. `unknown` is written for every fetch failure (FR-003). The grade is derived from model data by a public rule, withheld when a MUST is unknown, and never used to sort or rank (FR-008, FR-009, research R7). |
| IV. Static First, Open Data | PASS | The pages are pre-rendered from `data/`; the nightly run writes data through a pull request that CI validates; the only backend is the scheduled job, whose only output is that pull request; no endpoint, no visitor-triggered work. |
| V. Craft and Budgets | PASS | Tokens only; light and dark; the grade letter is accompanied by text and reasons, never colour alone; no island on the scanner pages; one report component rendered at build time; Lighthouse budgets extended to the new pages; no horizontal scroll at phone width. |
| VI. Agent-Legible Repository | PASS | Strict TS, Biome, Vitest over fixtures, Playwright with screenshots; the decision table in `data-model.md` is the readable contract for every status; `pnpm check` covers the scanner; `docs/scanner.md` documents operation; the nightly pull request description names every cell appended. |
| VII. European by Default | PASS | The nightly run is a Scaleway Serverless Job in an EU region built from the repository's image and deployed by a dedicated workflow; it stores nothing and keeps no visitor data. GitHub runs only CI and the deployment, never the scan. |
| Honesty tests | PASS | Not summarisable: measured metadata of real servers, dated and re-checked, is original data no model can summarise from the web. Compounding: every scanner observation sharpens the atlas cells the matrix, feature pages, exports and the home page already render; the report pages are a new view on the same cells. One maintainer: one command, one job, one deploy workflow; the nightly pull request is the maintainer's only chore. |

Post-design re-check (after Phase 1, and again after the 2026-10-14 revision): PASS. The
contracts add one scheduled job with no storage and no endpoint, one JSON route on the site, and
no change to the model. No deviation remains.

## Project Structure

### Documentation (this feature)

```text
specs/004-scanner/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── routes.md        # site routes
│   ├── report.md        # the one report shape
│   └── job.md           # the nightly job: steps, schedule, secret, and the deployment workflow
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── scanner/                 # NEW: the library and the job's GitHub step; the site build never imports it
│   ├── version.ts           # SCANNER_VERSION, USER_AGENT, observer string
│   ├── urls.ts              # wellKnownPrmUrls, wellKnownAsUrls, normaliseIssuer
│   ├── guard.ts             # guardUrl: https, no credentials, default port, public address
│   ├── fetch.ts             # Fetcher type, nodeFetcher (timeout, size cap, manual redirects), FetchResult
│   ├── probe.ts             # probe(target, fetcher): requests made, documents found, issuer judged
│   ├── checks.ts            # one check per passive feature (the decision table), runChecks
│   ├── grade.ts             # grade(results): letter, label, reasons
│   ├── report.ts            # Report types, scan(target, data, fetcher, now)
│   ├── observations.ts      # toAppend(report, data), appendObservations(file, entries), summary
│   └── nightly.ts           # upsertPullRequest (GitHub REST, injected fetch), branch and commit naming
├── lib/
│   ├── scanner.ts           # NEW: passiveChecks, latestScan, scannerIndex, gradeFromObservations
│   └── labels.ts            # + GRADE_LABEL, GRADE_RULE text
├── components/
│   ├── ScanReport.svelte    # NEW: the report table and grade block, rendered at build time
│   └── GradeBadge.astro     # NEW: letter with label text, never colour alone
├── pages/
│   ├── scanner/
│   │   ├── index.astro      # NEW: how it works, rule, index, run it yourself, opt out
│   │   ├── [id].astro       # NEW: report page
│   │   └── [id].json.ts     # NEW: report JSON
│   ├── atlas/mcp/servers/[id].astro  # + "Passive scan" line with grade and link
│   └── index.astro          # the roadmap sentence about the scanner now links to it
└── layouts/Base.astro       # + "Scanner" in navigation and footer

scripts/
├── scan.ts                  # NEW: `pnpm scan [<url>|<server-id>|--all] [--write] [--summary <file>] [--json]`
└── scan-nightly.ts          # NEW: `pnpm scan:nightly`, what the Scaleway job executes: clone, scan, validate, push, pull request

.github/workflows/scanner-deploy.yml  # NEW: build the image, push to the Scaleway registry, update the job definition
Dockerfile                   # NEW: the job image (Node 22, git, pnpm, the repository)
docs/scanner.md              # NEW: what it does, running it, the job, the deploy workflow, opt-out
docs/roadmap.md              # 004 implemented (pull request open)
docs/atlas-maintenance.md    # + "Scanner observations" section (reviewing a scanner pull request)
README.md                    # + scanner link
lighthouserc.json            # + /scanner/ and /scanner/notion/
package.json                 # + scan, scan:nightly scripts

tests/
├── fixtures/scanner/        # NEW: recorded metadata responses per scenario (JSON)
├── unit/
│   ├── scanner-urls.test.ts     # well-known derivations
│   ├── scanner-guard.test.ts    # URL guard by name and by address
│   ├── scanner-checks.test.ts   # decision table over fixtures, including failures
│   ├── scanner-grade.test.ts    # the rule over every level × status
│   ├── scanner-append.test.ts   # append rule and file writing on a scratch copy
│   ├── scanner-nightly.test.ts  # the job's pull request step over an injected fetch
│   └── scanner-view.test.ts     # latestScan and scannerIndex over a synthetic dataset
└── e2e/
    └── scanner.spec.ts      # index and report page: content, no-JS, phone, axe, screenshots
```

**Structure Decision**: Same single Astro project. Everything that can contact a server lives
under `src/scanner/` and is imported only by `scripts/scan.ts` and by tests; the pages import
`src/lib/scanner.ts`, which reads observations and computes views. The boundary makes FR-015
checkable by inspection and keeps the job and the command on one code path with the pages'
derivations. A `Dockerfile` at the root builds the job image the deploy workflow pushes.

## Complexity Tracking

None. The first draft of this plan recorded one deviation (the nightly batch on GitHub Actions
instead of Scaleway) and one limitation (pull requests opened with the workflow token do not
start CI). Both disappeared with the 2026-10-14 revision: the job runs on Scaleway as the
constitution's technology constraints say, and it opens its pull request with a personal token.

## Revision history

| Date | Change | Decided by |
|---|---|---|
| 2026-10-14 | Plan written: library, command, nightly workflow on GitHub Actions, on-demand service as a Scaleway container, report pages | plan |
| 2026-10-14 | On-demand scanning removed entirely (no service, no form, no endpoint): all scanning in scheduled backend jobs, feeding the repository only | owner |
| 2026-10-14 | Nightly run moved to a Scaleway Serverless Job from the repository's image; the GitHub schedule deleted | owner |
| 2026-10-14 | Deployment to Scaleway through a dedicated workflow (`scanner-deploy.yml`) | owner |
| 2026-10-15 | After the first run: open and API-key servers skipped and shown as "No OAuth"; a missing well-known PRM withholds the grade instead of failing it (either-or MUST) | owner |
| 2026-10-15 | A branch per run (`scanner/<date>-<hhmm>`), older scanner pull requests closed as superseded; the token moved out of git's arguments after a failed push printed it | owner |
| 2026-10-15 | The scanner index folded into the atlas: the grade shows next to each server in the matrix and on server pages; `/scanner/` keeps the method only and leaves the main navigation, since two pages listing the same servers read as two products | owner |
