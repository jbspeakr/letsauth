# Research: Delegation Chain Explorer

Phase 0 of the plan. Each entry records a decision, why, and what was rejected.

## R1. One page per toggle

**Decision**: `/explorer/<scenario>/` is the baseline chain and `/explorer/<scenario>/<toggle>/`
the chain with that one toggle applied, every page pre-rendered from the same component. The
toggle bar is a row of links; the current one carries `aria-current="page"`.

**Rationale**: Constitution V says pages read fully without JavaScript, and the roadmap wants
toggles to be the thing people share ("look what happens with passthrough"). A page per variant
gives both. It also keeps the island small: it never needs the scenario data, only the DOM.

**Rejected**: Client-side toggling over a hidden JSON blob (no-JS page would show only the
baseline; the resolver and the data ship to every visitor). Query-string toggles rendered by an
edge script (a dynamic path for a static product, against constitution IV).

## R2. Change marks are derived

**Decision**: A `TokenView` in the data is `{ name, header?, claims, note? }`. `diffClaims(prev,
next)` in `src/lib/explorer.ts` computes `added`, `changed` and `removed` claim names against the
previous step in the resolved chain that carries a token; nested claims (`act`) are compared by
value. The first token marks nothing.

**Rationale**: The model calls them "annotations on claims that changed since the previous hop",
which is a function of two tokens; storing it would let the mark and the token drift. Deriving
over the *resolved* chain also makes toggles honest: a claim the toggle changes is marked where
it first differs.

**Rejected**: Stored `changed: [...]` lists (drift; a toggle would need its own copy).

## R3. The diagram is rendered from the chain

**Decision**: the diagram and the step list are one element. `ChainPage.astro` renders each
resolved step as a row: a lanes cell (one CSS grid column per actor, in the scenario's order,
dashed lifelines, one arrow placed from sender to receiver by `--start`/`--span`, a loop when
they coincide, the step number on the arrow) beside the step's body (sender, receiver, message,
note, citation, token). A sticky head names the actors over the lanes and carries the island's
controls. No layout library and no SVG: positions come from the actor index, so the chain takes
the page's full width and reflows to one column on a phone. Replaced steps carry `is-toggled`,
removed steps `is-removed` (dashed arrow, struck message). An earlier draft drew a separate
SVG (`src/lib/sequence.ts`); it was dropped because a diagram above a list read as two views of
the same thing and could not take the full width.

**Rationale**: Constitution's technology constraints: "sequence diagrams are rendered from the
machine definition so diagram and behaviour cannot drift". Server-rendered SVG, as the standards
map does, costs no JavaScript and is accessible through the step list, which carries the same
information as text.

**Rejected**: Mermaid or another diagram library (a client script, no tokens, no control over
accessibility). Canvas (no DOM for the island or the tests).

## R4. Removed steps stay visible

**Decision**: A toggle that maps a step to `[]` removes it from the chain, but the page keeps it
in place, struck out and labelled "removed by this toggle", in both the list and the diagram.
`resolveChain` returns such a step with `removed: true` so one pass produces the page.

**Rationale**: The point of a "skipped consent" or "no token validation" toggle is to show the
absence. A silently shorter chain would hide it.

**Rejected**: Dropping removed steps (the absence becomes invisible); rendering the baseline
beside the toggled chain (twice the page, hard at phone width).

## R5. Toggles reference features, the page counts servers

**Decision**: A toggle may list `violates: [feature ids]`. The toggle page links each to
`/atlas/mcp/features/<id>/` and, for a feature on a server-side party that the current MCP
Authorization revision defines, uses `matrixFor(data, current)` from `src/lib/atlas.ts` to count
listed servers by status (supported, partial, unsupported, unknown, with derived unknowns
counted as unknown). A client-side feature gets the sentence "a client requirement; the atlas
does not observe clients".

**Rationale**: This is the compounding step the roadmap asks for ("reuses features from 001"):
the attack and the measurement meet on one page. The counts are the matrix's, so there is no
second judgement of any server.

**Rejected**: Listing server names on the toggle page (ranks servers by an attack, against
constitution III). A separate "which servers are vulnerable" page (same problem).

## R6. The island

**Decision**: `Explorer.svelte`, mounted with `client:idle`, reads the `[data-step]` rows of the
chain, inserts a stepper (Previous, Next, "step i of n") marked `data-enhanced` into the chain's
head, sets `aria-current="step"` on the current row, dims the rows after it once the reader has
started stepping (`is-future`), scrolls the row into view (respecting reduced motion), and reflects
the step in the URL fragment (`#step-<id>`); loading with a fragment starts there. Arrow keys
work when focus is on the page, not inside a form control. Without JavaScript there is no bar and
nothing is hidden.

**Rationale**: The same pattern as the standards map island: DOM is the source of truth, the
island only annotates. It needs no scenario data and stays well under 10 kB.

**Rejected**: Hiding future steps until stepped to (breaks no-JS and printing; dimming suffices).
A full Svelte-rendered explorer (data in the bundle; duplicates the server rendering).

## R7. Which scenarios, which citations

**Decision**: Three scenarios, chosen so that the three delegation shapes the positioning paper
names are each covered once and every toggle the roadmap names exists:

1. `mcp-authorization`: user → MCP client → MCP server, against MCP Authorization 2026-07-28:
   the unauthenticated request and the challenge, protected resource metadata, authorization
   server metadata, the authorization request with a client ID metadata document, PKCE and a
   resource indicator, the response with `iss`, the token request, the access token (RFC 9068
   shape, `aud` the MCP server), the bearer call, the server's validation, and the server's own
   token for the upstream API. Toggles: token passthrough (misconfiguration, defeats
   `mcp.rs.no-passthrough`), missing audience check (attack: a token for another server is
   accepted, defeats `mcp.rs.audience-validation`), issuer mix-up (attack: the response comes
   without a matching `iss` and the client sends the code to the wrong server, defeats
   `mcp.as.iss-param` and `mcp.client.iss-compare-no-normalization`).
2. `mcp-enterprise-idp`: the same client and server with an enterprise identity provider in the
   loop: sign-in at the IdP, token exchange for an ID-JAG (draft-04 §4.3, `typ` `oauth-id-jag+jwt`,
   `aud` the MCP server's authorization server), the JWT bearer grant at that server (§4.4), the
   access token, the bearer call. Toggles: scope accumulation (misconfiguration: the resource
   authorization server grants more than the ID-JAG's `scope`), missing audience check on the
   ID-JAG (attack: an ID-JAG minted for another authorization server is accepted, §4.4.1).
3. `token-exchange-chain`: user → orchestrator agent → sub-agent → documents API with RFC 8693:
   the exchange with subject and actor tokens, the `act` claim, the second exchange with a nested
   `act`, the bearer call and the API's validation. Toggles: token passthrough (attack: the
   orchestrator hands the user's token to the sub-agent unchanged, no `act`), scope accumulation
   (misconfiguration: the exchange grants scope the subject token did not have, §2.1 and §2.2.1),
   missing `may_act` check (misconfiguration: the authorization server exchanges for an actor the
   subject never authorised, §4.4).

Citations use the documents' own headings: the MCP Authorization sections the features already
cite; ID-JAG draft-04 "3.1. ID-JAG Claims", "4.3. Token Exchange", "4.3.3. Processing Rules",
"4.4. Access Token Request", "4.4.1. Processing Rules"; the MCP extension's "How it works" and
"Implementation guide › For MCP Authorization Servers"; RFC 8693 "1.1. Delegation vs.
Impersonation Semantics", "2.1. Request", "2.2.1. Successful Response", "4.1. act (Actor) Claim",
"4.4. may_act (Authorized Actor) Claim"; RFC 9068 "2.2. Data Structure" and "4. Validating JWT
Access Tokens"; RFC 7636 "4.3", "4.5" and "4.6"; RFC 9207 "2. Response Parameter iss"; RFC 8414
"3. Obtaining Authorization Server Metadata"; RFC 9728 "3. Protected Resource Metadata" and "5.1.
WWW-Authenticate Response". The headings were checked against the documents on 2026-10-15.

**Rejected**: An A2A and a WIMSE scenario in this release (each needs features and sections the
atlas does not carry yet; they are more files on the same entity once 002's data grows). Real
vendor names for actors (constitution III).

## R8. Export

**Decision**: `/explorer/data.json` is `{ version: 1, generatedAt, license, source, scenarios }`
with the scenarios exactly as validated, built by `buildExplorerExport` in `src/lib/explorer.ts`,
the same shape of envelope as the two atlas exports.

**Rejected**: Exporting resolved chains per toggle (derivable; triples the document).
