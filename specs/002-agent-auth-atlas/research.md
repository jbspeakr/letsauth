# Research: Agent Auth Atlas

Phase 0 of the plan. Each entry records a decision, why, and what was rejected.

## R1. Route and name

**Decision**: The atlas lives at `/atlas/standards/`, spec pages at `/atlas/standards/{specId}/`,
the export at `/atlas/standards/data.json`. The page title and navigation label is "Agent auth
atlas", the roadmap's name; the route says what the atlas maps.

**Rationale**: Every atlas on the site lives under `/atlas/` (`/atlas/mcp/` for 001). "Agent auth"
is the whole site's subject, so a route named after it would say nothing; "standards" names the
entities on the map. Ids are stable (constitution, data model rule 1), so the spec id is the
path segment.

**Rejected**: `/atlas/agent-auth/` (says nothing the site name does not); `/standards/` (outside
the atlas namespace).

## R2. Rendering the map

**Decision**: An inline SVG rendered at build time by an Astro component, from a layout computed
by pure functions in `src/lib/graph.ts`. Layout: a node's column is its depth along the directed
relation types that imply dependency (`builds-on`, `profiles`, `replaces`), so foundations sit
left and profiles right; within a column nodes are grouped by publishing body in a fixed body
order and then by the date of their first revision. Edges are cubic curves between node edges.
Symmetric relations (`competes-with`, `solves-same-problem-as`) do not affect depth and are drawn
without arrowheads. Node size and spacing are constants; the SVG has a `viewBox` and a minimum
width and sits in an `overflow-x: auto` frame, as the matrix table does.

**Rationale**: Static first (constitution IV) and identical with and without JavaScript (FR-006).
A deterministic layout makes screenshot comparison meaningful (constitution VI). Column-by-depth
answers the first question the map exists for: what builds on what. The data has one true DAG
(dependency) and a few symmetric edges, so a full crossing-minimisation algorithm is not needed
at 30 to 60 nodes.

**Rejected**: Client-side force layout (d3-force or similar): non-deterministic, needs
JavaScript to show anything, and the library alone is a large share of the 150 kB budget.
Graphviz at build time: a native dependency in CI, output not styleable with the token system.
HTML grid for nodes with an SVG overlay for edges: two coordinate systems to keep in sync.

## R3. Maturity per spec

**Decision**: Amend the Spec entity with `maturity` (enum: `individual-draft`,
`working-group-draft`, `candidate`, `published`, `in-force`, `expired`, `withdrawn`) and an
optional `maturityNote` carrying the publisher's own label ("Proposed Standard",
"Informational", "Implementer's Draft 2", "Regulation (EU) 2024/1183").

**Rationale**: The roadmap asks for "status per node". Revision `status` cannot carry it: the
model uses `current` to mean "the revision the atlases show by default", which every spec has,
RFC or draft. Inferring maturity from URLs (`datatracker` vs `rfc-editor`) is fragile and
unreadable for contributors. One explicit field keeps the Zod schema the readable contract
(constitution VI).

**Rejected**: A `final` revision status in place of `current` for RFCs (breaks "exactly one
current revision", and `final` still says nothing about drafts versus adopted drafts). A
separate `maturity.yaml` (a private copy of spec state, constitution I).

## R4. Body and family enums

**Decision**: Add `other` to `body` (for CNCF SPIFFE and W3C documents) and `guidance` to
`family` (for best-current-practice and architecture documents such as RFC 9700 and the WIMSE
architecture, which define no protocol).

**Rationale**: The model's enums were written for the MCP atlas's one spec. The launch set
includes documents that fit none of the values, and mislabelling them would be a false claim.

**Rejected**: One value per missing body (`cncf`, `w3c`): more columns on the map for one node
each. A free-text body (loses grouping).

## R5. Relations file and rules

**Decision**: `data/relations.yaml` is one YAML list, as `docs/data-model.md` lays out. The
validator enforces: `from` and `to` exist and differ; no duplicate `(from, to, type)`; for
symmetric types no reverse duplicate either; `competes-with` and `solves-same-problem-as` carry a
`note`; the directed dependency types (`builds-on`, `profiles`, `replaces`) form no cycle. Errors
print as `data/relations.yaml[i].field: message`, the same format as the other checks.

**Rationale**: FR-010 and FR-011. The cycle rule protects the layout (R2) and the meaning of the
relation. The note rule is constitution III: a judgement call must say what it is based on.

**Rejected**: One file per relation (hundreds of tiny files for a list that is edited together).
A relations list inside each spec file (an edge has two owners; a single list has one place to
check for duplicates).

## R6. Interactivity

**Decision**: One Svelte island, `StandardsMap.svelte`, mounted `client:idle` over the
server-rendered SVG and list, as `Matrix.svelte` is over the table. It binds to a `<form>` of
checkboxes for relation types and bodies, hides edges and nodes that fall outside the filter,
updates a "n of m specs, n of m relations" count, mirrors the state in the query string with
`replaceState`, and highlights a node's neighbourhood on hover and focus. Without JavaScript the
form is inert; a `<noscript>` note next to it says filtering needs JavaScript (FR-006).

**Rationale**: Islands only where interaction needs them (constitution V). The DOM is the source
of truth, so the no-JS view is identical. Reusing the matrix's pattern keeps one way of doing
things.

**Rejected**: Pre-rendering every filter combination (hundreds of pages). A CSS-only
`:checked` filter (cannot reach the SVG from a form outside it without JavaScript-free sibling
tricks that break the DOM order the no-JS page needs).

## R7. Export

**Decision**: `/atlas/standards/data.json` with `version: 1`, `generatedAt`, `license`, `source`,
`specs` (every non-withdrawn spec, full record including `maturity` and `revisions`), `relations`
(every relation) and `withdrawn` (ids of withdrawn specs, so a consumer can tell absence from
withdrawal). Validated against `src/schema/` in a unit test, as the MCP export is.

**Rationale**: FR-012 and constitution IV. Same shape rules as contracts/data-export.md of 001.

## R8. Launch data set

**Decision**: Around 35 specs across the bodies the model names, chosen because an agent
protocol, an agent identity draft or an EU act cites them. Facts (titles, revision ids, dates,
URLs, maturity) are taken from the publishers' own pages: IETF Datatracker and RFC Editor,
openid.net, modelcontextprotocol.io, a2a-protocol.org, EUR-Lex, the vendor's own page for vendor
documents. Relations are entered with a note; a `source` is added where the relating document
itself states the relation (a draft's introduction naming what it builds on, an MCP revision
naming the RFCs it requires).

| Body | Specs |
|---|---|
| `ietf-oauth` | OAuth 2.0 (RFC 6749), OAuth 2.1 (draft), PKCE (RFC 7636), Dynamic Client Registration (RFC 7591), JWT bearer assertions (RFC 7523), AS Metadata (RFC 8414), Token Exchange (RFC 8693), Resource Indicators (RFC 8707), JWT access tokens (RFC 9068), `iss` in authorization responses (RFC 9207), Rich Authorization Requests (RFC 9396), DPoP (RFC 9449), Security BCP (RFC 9700), Protected Resource Metadata (RFC 9728), Client ID Metadata Documents (draft), Identity Assertion Authorization Grant (draft), Transaction Tokens (draft), SD-JWT, SD-JWT VC (draft), AAuth (individual draft), AI agent authorization (individual draft) |
| `ietf-wimse` | WIMSE architecture, WIMSE service-to-service, AI agent identity (individual draft) |
| `ietf-other` | DAWN agent discovery (BoF or proposed WG draft) |
| `openid` | OpenID Connect Core, OpenID Connect Discovery, OpenID Federation, OpenID4VP, OpenID4VCI |
| `mcp` | MCP Authorization (already in data), MCP Enterprise-Managed Authorization |
| `a2a` | Agent2Agent Protocol |
| `vendor` | auth.md (WorkOS), Cross App Access (Okta) |
| `eu` | eIDAS 2.0 (Regulation (EU) 2024/1183), AI Act (Regulation (EU) 2024/1689), NIS2 (Directive (EU) 2022/2555), EUDI Wallet Architecture and Reference Framework |
| `other` | SPIFFE (CNCF), W3C Verifiable Credentials Data Model 2.0 |

A spec whose facts could not be confirmed from the publisher's page at entry time is left out
rather than entered from memory. The list is a floor (SC-001), not a ceiling.

## R9. Accessibility of the map

**Decision**: Each node is an SVG `<a>` with an `aria-label` of "name, body, maturity" so a
screen reader reads the same three facts a sighted reader sees. Edges are `aria-hidden` and carry
a `<title>` for pointer users; the spec list under the map, with its relations, is the accessible
equivalent and is linked from the map's caption. Maturity is encoded by node border style (solid
for published and in-force, dashed for drafts, dotted for candidates, muted and struck for
expired or withdrawn) plus a short text tag inside the node, never by colour alone. Edge types
are encoded by dash pattern and arrowhead plus the legend. Focus is visible on nodes. The frame
scrolls horizontally with the keyboard because it is a focusable region with a label.

**Rationale**: Constitution V (WCAG 2.2 AA). The matrix made the same choices for status cells.

## R10. Budgets

**Decision**: Add `/atlas/standards/` and one spec page to `lighthouserc.json` so the budgets
(performance and accessibility at or above 95, JS at or below 150 kB) are enforced on the new
pages. The island is the only JavaScript on the page.

## R11. Screenshot baselines

**Decision**: New Playwright specs take screenshots of the map page and a spec page in light,
dark and phone projects. Adding a navigation link changes the header of every existing baseline,
so the baselines are refreshed with CI's Chromium through the `refresh-screenshots` label
(`docs/atlas-maintenance.md`), never from a local browser build.
