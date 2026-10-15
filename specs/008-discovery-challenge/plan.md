# Implementation Plan: Discovery challenge check

**Branch**: `claude/discovery-challenge-check-srrhe4` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-discovery-challenge/spec.md`

## Summary

Extend the passive scanner (004) by one request per server: an unauthenticated `GET` to the MCP
endpoint whose status and `WWW-Authenticate` header are read and whose body is never read. From
it the scanner judges `mcp.prm.www-authenticate`, which becomes a passively observable feature in
the data, and, when no well-known document exists, follows the challenge's `resource_metadata`
pointer to the metadata document so the metadata checks can be judged. The grade rule's either-or
becomes symmetric. The scanner version is bumped so every cell is re-observed. No new entity, no
model amendment, no new dependency, no new page; prose on the scanner page, in `docs/scanner.md`
and in the nightly summary says what is now sent.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 22 (global `fetch`)

**Primary Dependencies**: unchanged (Astro, Zod, yaml, Vitest, Playwright, Biome)

**Storage**: observations as YAML under `data/observations/`, append-only, as before

**Testing**: Vitest over recorded responses (new fixtures for the challenge cases), a unit test for
the header parser, the grade test extended for symmetry; the existing Playwright tests derive the
check count from data and keep passing; the scanner page screenshots need a refresh because the
"checks per server" number changes

**Target Platform**: the same Scaleway job image; the site is unchanged in structure

**Project Type**: static site plus one scheduled job and one command

**Performance Goals**: one more request per server (at most seven per scan, from five); the
nightly run stays well within its 30-minute budget

**Constraints**: FR-001 of this spec (one request to the endpoint, headers only, no body read);
004 FR-002, FR-003, FR-005 and FR-015 continue to hold; tests never touch the network

**Scale/Scope**: ~40 servers × 13 checks per night; four source files and the feature file change

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How this plan complies |
|---|---|---|
| I. One Model, Many Views | PASS | No entity or field is added. One feature file flips `observable` from `active` to `passive`; the scanner, the report pages and the atlas derive the check from that value as they do for every other feature. |
| II. Every Claim Cites a Revision | PASS | The challenge cell cites the same revision and section as the well-known cell (the feature file already carries both revisions). Every observation names the endpoint URL and the status that decided it. |
| III. Neutral and Passive by Default | PASS, with a recorded decision | The request sends no credentials, cookies, token, body or flow and reads nothing but the status and headers; the challenge is metadata the specification requires the server to give every anonymous client (research R1). A non-401 answer and every failure are `unknown`, never a failure. The pointed-at document is fetched under the same guard as every other metadata URL. The owner can overturn the decision (Complexity Tracking). |
| IV. Static First, Open Data | PASS | Nothing changes in where scanning runs or how results flow back: the same job, the same pull request, the same data files. |
| V. Craft and Budgets | PASS | No new page or island; prose edits only. The screenshot baselines for the scanner page are refreshed through the repository's label workflow. |
| VI. Agent-Legible Repository | PASS | The decision table gains one row and the probe one documented step; fixtures record every case; the parser has its own test; `SCANNER_VERSION` is bumped as `docs/scanner.md` says to. |
| VII. European by Default | PASS | Unchanged: the request is made by the Scaleway job in the EU, stores nothing, and carries no visitor data. |
| Honesty tests | PASS | Not summarisable: which discovery mechanism each real server offers is measured, not readable from the web. Compounding: three withheld grades become grades and an empty atlas column fills, on the same cells every other view renders. One maintainer: one more request on the same code path. |

Post-design re-check (after Phase 1): PASS. The design adds one probe step, one check, one
fixture family and one parser; nothing else moves.

## Project Structure

### Documentation (this feature)

```text
specs/008-discovery-challenge/
├── plan.md              # This file
├── research.md          # R1–R7: the passive argument, the request, the pointer, the parser
├── data-model.md        # The decision-table row, the probe's new fields, the grade symmetry
├── quickstart.md        # Scenarios to verify by hand and by test
├── contracts/
│   └── report.md        # What the report shape gains (additive, version stays 1)
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
data/features/mcp.prm.www-authenticate.yaml   # observable: active → passive

src/scanner/
├── challenge.ts         # NEW: parseChallenge(header) → { resourceMetadata?, schemes[] }
├── fetch.ts             # Fetcher takes a mode: "json" (as today) | "challenge" (headers only, body cancelled)
├── probe.ts             # the endpoint step; the pointed-at PRM; new Probe fields
├── checks.ts            # the mcp.prm.www-authenticate check; well-known judged from well-known alone
├── grade.ts             # EITHER_OR symmetric; rule text
├── report.ts            # Discovered gains `challenge`; location gains "challenge"
├── observations.ts      # summary text names the endpoint request
└── version.ts           # 0.2.0

src/pages/scanner/index.astro          # "What it reads": the endpoint request; counts
src/pages/atlas/mcp/contribute.astro   # "twelve" → derived count
docs/scanner.md                        # what it reads and never does; the request count
docs/roadmap.md                        # 008 status
docs/atlas-maintenance.md              # what `observable: passive` covers
specs/004-scanner/data-model.md        # pointer to the 008 rows
specs/004-scanner/contracts/report.md  # the additive fields

tests/
├── fixtures/scanner/challenge-*.json  # NEW: pointer, no pointer, no challenge, 405, pointer refused, both
├── unit/scanner-challenge.test.ts     # NEW: the parser
├── unit/scanner-checks.test.ts        # the new check; request lists gain the endpoint
├── unit/scanner-grade.test.ts         # symmetry
└── unit/scanner-view.test.ts          # 13 checks; observer string from the constant
```

**Structure Decision**: Same boundary as 004: everything that contacts a server stays under
`src/scanner/`, imported only by `scripts/scan.ts` and the tests. The pages read the feature's
`observable` value from the data and need no code change beyond prose.

## Complexity Tracking

| Deviation or decision | Why | Alternative rejected because |
|---|---|---|
| One request to the MCP endpoint, beyond well-known metadata | The specification's second discovery mechanism lives only there; three listed servers use only it | Keeping the check active behind owner verification leaves the column empty and the grades withheld; a constitution amendment is offered to the owner but not required by the text (research R1) |
| Following the `resource_metadata` pointer (a seventh request) | Without the document, `mcp.prm` stays `unknown` and the grade stays withheld | Recording the challenge cell alone does not meet the roadmap's reason for the feature |

## Revision history

| Date | Change | Decided by |
|---|---|---|
| 2026-10-15 | Plan written | plan |
