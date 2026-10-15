# Feature Specification: Delegation Chain Explorer

**Feature Branch**: `claude/roadmap-003-quv0t7`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "Roadmap item 003 (Delegation Chain Explorer): the flagship.
Step-through scenarios with the decoded token at each hop and attack toggles. Reuses features and
revisions from 001 and 002."

## What the explorer is

A visitor picks a scenario (an MCP client obtaining a token for an MCP server, an enterprise
identity provider brokering that token, an orchestrator agent delegating to a sub-agent) and reads
it hop by hop: who sends what to whom, which specification section says so, and what the token
carried at that hop looks like decoded, with the claims that changed since the previous hop marked.
A toggle turns one attack or misconfiguration on (token passthrough, a missing audience check, an
issuer mix-up, scope that grows across hops) and the chain shows what changes: which steps are
replaced, which disappear, and what the token looks like once the control is gone. Every step and
every toggle cites a specification revision and section, so the explorer is a reading of the
standards, not a story about them. The toggles name the requirements from the MCP auth atlas they
defeat, so a reader can jump from "this is what token passthrough does" to "these are the servers
that say they do not do it".

Scenarios are data (`data/scenarios/`), one file each, on the shared model's Scenario entity. The
sequence diagram, the step list and the token views are all rendered from that one definition, so
the picture and the text cannot drift apart.

## Honesty tests

- **Not summarisable**: the content is a cross-check of specific revisions against each other at
  claim level (what `aud` is at hop three under ID-JAG draft-04, what disappears under token
  exchange without an actor token), written as data that can be validated, not prose.
- **Compounding**: scenarios cite the same revisions as the atlases and name the same features as
  the matrix; a toggle links to the requirement it defeats and the matrix shows which servers meet
  it. Breach Anatomy (005) and the EU scenarios (006) are more scenario files on the same entity.
- **One maintainer**: a scenario is one YAML file; the build fails on a dangling citation, an
  unknown actor or a toggle that names a step that does not exist. No runtime, no backend.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read a delegation chain hop by hop (Priority: P1)

An engineer opens a scenario and sees the actors across the top, a sequence diagram of every
step, and under it the steps as a list: sender, receiver, the message in one line, a sentence of
context, the citation (spec, revision, section, linked to the document), and, where the message
carries a token, that token decoded with the claims that changed since the previous hop marked.
With JavaScript on, they can step through the chain one hop at a time with buttons or the arrow
keys; the current step is highlighted in the diagram and the list and the address bar carries it.
Without JavaScript the whole chain is on the page.

**Why this priority**: The chain with the decoded token at each hop is the product. Everything
else (toggles, the index, the export) is a view on it.

**Independent Test**: Open a scenario page with JavaScript off and confirm one lifeline per
actor, one diagram row and one list entry per step, a resolved citation link on every step and a
decoded token on every step that carries one, with the changed claims marked. Turn JavaScript on
and confirm stepping moves the highlight and the URL fragment.

**Acceptance Scenarios**:

1. **Given** a scenario with N actors and M steps, **When** the page renders, **Then** the diagram
   has N lifelines in the scenario's actor order and M arrows in step order, and the list has M
   entries with the same ids, sender, receiver and message as the diagram.
2. **Given** a step whose citation names a revision and section, **When** it renders, **Then** the
   citation links to that revision's document and shows the section and the revision id; a
   citation that does not resolve fails the build.
3. **Given** a step carrying a token, **When** it renders, **Then** the token's header and claims
   are shown decoded, with each claim marked added, changed or unchanged against the previous
   token in the chain, and removed claims named; the first token in the chain marks nothing.
4. **Given** JavaScript is off, **When** the page renders, **Then** every step, token and citation
   is visible and nothing on the page depends on a control that is not there.
5. **Given** JavaScript is on, **When** the reader presses Next or the right arrow, **Then** the
   next step becomes current in the diagram and the list, the step's entry scrolls into view and
   the URL fragment names it; reloading a URL with a fragment opens at that step.

---

### User Story 2 - Turn an attack or misconfiguration on (Priority: P1)

The reader picks a toggle (for example "Token passthrough") from the scenario's toggle bar. The
page becomes the same chain with that toggle applied: the replaced steps are marked and say which
step they replace, removed steps are shown struck out, and the tokens at the affected hops show
what changed. A notice above the chain says what the toggle does, whether it is an attack or a
misconfiguration, cites the section that forbids or warns against it, and lists the atlas
requirements it defeats, each with how many listed servers are observed to meet it.

**Why this priority**: The toggles are what make the explorer a lab rather than a diagram. They
are the roadmap's "attack toggles" and the hook for Breach Anatomy.

**Independent Test**: Open a scenario with a toggle on and confirm the replaced steps carry the
toggle mark and name the step they replace, a removed step is struck out, the notice cites the
section and links each defeated requirement to its atlas page with a server count, and the
baseline page shows none of it.

**Acceptance Scenarios**:

1. **Given** a toggle that replaces step S with steps S1 and S2, **When** its page renders,
   **Then** S is absent, S1 and S2 appear in S's position, both are marked as changed by the
   toggle and S1 names S as the step it replaces; every other step is unchanged.
2. **Given** a toggle that replaces step S with nothing, **When** its page renders, **Then** S is
   shown struck out in the list and the diagram, marked as removed by the toggle.
3. **Given** a toggle on, **When** the chain renders, **Then** claim marks are computed over the
   toggled chain, so a claim that the toggle changed is marked at the first hop where it differs.
4. **Given** a toggle that names requirements it defeats, **When** the notice renders, **Then**
   each requirement links to its atlas feature page and, for a server-side requirement in the
   current MCP Authorization revision, states how many listed servers are observed supported,
   partial, unsupported and unknown; a client-side requirement says the atlas does not observe
   clients.
5. **Given** a toggle, **When** the reader is on its page, **Then** the toggle bar marks it as
   current and offers the baseline and every other toggle as links; one toggle is on at a time.

---

### User Story 3 - Find a scenario and take the data (Priority: P2)

The explorer index lists every scenario with its title, summary, actors, number of steps, the
toggles it offers and the requirements it exercises. The scenarios are also published as one JSON
document under the data licence, the same way the atlases publish theirs. The site's navigation,
footer, home page and about page lead to the explorer.

**Why this priority**: Without an entry point the flagship is a hidden page; without the export
the scenarios are not open data.

**Independent Test**: Open the index and confirm one card per scenario with a link to its page and
the toggles listed; fetch the JSON and confirm every scenario is in it with its steps and toggles
unchanged; confirm the explorer is in the primary navigation.

**Acceptance Scenarios**:

1. **Given** K scenarios in the data, **When** the index renders, **Then** it shows K cards, each
   linking to its scenario page and listing its toggles, each a link to the toggle's page.
2. **Given** the export, **When** it is fetched, **Then** it carries a version, a generation time,
   the licence and every scenario as validated.
3. **Given** any page, **When** it renders, **Then** the primary navigation and the footer link
   to the explorer.

---

### Edge Cases

- A step's sender and receiver are the same actor (a server validating a token): drawn as a
  self-message on that lifeline and listed as "X, to itself".
- A toggle's replacement step carries a token with a claim removed: the removed claim is named at
  that hop, struck out.
- Two toggles would conflict (both replace the same step): one toggle at a time, so they never
  combine; combinations are a later feature if ever needed.
- A scenario with no toggles: the toggle bar shows the baseline only.
- A toggle names a vulnerability: the data allows it for 005; this feature renders nothing for it
  beyond validating that the id resolves.
- Long messages in the diagram: wrapped to two lines and cut with an ellipsis; the list carries
  the full text, so nothing is lost.
- A scenario cites a revision that is later superseded: the citation keeps naming the revision it
  was written against (constitution II); the spec page shows the newer revision as current.
- The page at phone width: the diagram scrolls horizontally inside its own frame; the page does
  not.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Scenarios MUST be data under `data/scenarios/`, one file per scenario, validated
  by the shared schema: actors (id, kind, name), features exercised, steps (id, sender, receiver,
  message, note, citation, optional token) and toggles (id, name, kind, summary, citation, the
  steps each replaces, optional requirements defeated, optional vulnerability).
- **FR-002**: The build MUST fail when a scenario's citation does not resolve to a revision in
  `data/specs`, a step names an actor the scenario does not declare, a toggle replaces a step
  that does not exist, a feature or vulnerability id does not exist, or ids collide within the
  resolved chain.
- **FR-003**: Every scenario MUST have a page showing its actors, a sequence diagram and the step
  list, both rendered from the same step definition, with the citation on every step linking to
  the cited revision's document.
- **FR-004**: A step carrying a token MUST render the token decoded (header and claims) with each
  claim marked as added, changed or unchanged against the previous token in the chain and removed
  claims named; the marks MUST be derived, not stored.
- **FR-005**: Every toggle MUST have its own page with the toggled chain, replaced steps marked
  and naming the step they replace, removed steps struck out, and a notice with the toggle's kind,
  summary and citation.
- **FR-006**: A toggle that names requirements it defeats MUST link each to its atlas feature page
  and, for requirements the atlas observes, state the observed support counts over listed servers
  for the current MCP Authorization revision; `unknown` MUST be shown as unknown.
- **FR-007**: Scenario and toggle pages MUST read fully without JavaScript; the step-through
  controls are an enhancement that highlights the current step, scrolls to it and reflects it in
  the URL fragment.
- **FR-008**: The explorer index MUST list every scenario with title, summary, actors, step count,
  toggles and requirements exercised.
- **FR-009**: The scenarios MUST be exported as one JSON document with a version, generation
  time and licence, under the data licence.
- **FR-010**: The explorer MUST be reachable from the primary navigation, the footer, the home
  page and the about page.
- **FR-011**: Every explorer page MUST meet the constitution's budgets and craft rules: WCAG 2.2
  AA, light and dark, reduced motion respected, no horizontal page scroll at phone width,
  Lighthouse performance and accessibility at or above 95 on the index and a scenario page, and
  the step-through island well under the JavaScript budget.
- **FR-012**: The first release MUST ship at least three scenarios covering the MCP authorization
  flow against its current revision, the enterprise identity provider flow (ID-JAG and the MCP
  enterprise-managed authorization extension) and token-exchange delegation between agents, with
  at least two toggles each, among them token passthrough, a missing audience check, an issuer
  mix-up and scope accumulation.

### Key Entities

- **Scenario** (`docs/data-model.md`, already defined): this feature pins down its sub-entities.
  An **Actor** is `{ id, kind, name }`. A **Step** is `{ id, from, to, message, note?, cites,
  token? }`. A **Citation** is `{ spec, revision, section }`. A **TokenView** is `{ name,
  header?, claims, note? }`; the change marks are derived at build time. A **Toggle** is `{ id,
  name, kind, summary, cites, replaces, violates?, vulnerability? }` where `replaces` maps a step
  id to the list of steps that take its place (an empty list removes it). The scenario itself
  gains a `summary`.
- **Vulnerability** (already defined): loaded and validated so that a toggle's `vulnerability`
  resolves; no page renders it yet (005).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Three scenarios with eight toggles between them ship, every step and toggle with a
  citation that resolves; a seeded broken scenario (dangling citation, unknown actor, unknown
  step in a toggle, unknown feature) fails `pnpm validate:data` naming file and field.
- **SC-002**: For every scenario and toggle page, the number of diagram rows equals the number of
  list entries equals the resolved chain's length, and the ids match in order (end-to-end test).
- **SC-003**: Claim marks over a known chain equal the expected added, changed and removed sets
  at every hop (unit test), including a toggle that removes a claim.
- **SC-004**: With JavaScript off, every scenario and toggle page is complete; with it on,
  stepping changes the current step and the fragment (end-to-end test).
- **SC-005**: axe reports no serious or critical violation on the index, a scenario page and a
  toggle page in light, dark and phone; no horizontal page scroll at 412 px; Lighthouse CI passes
  on the index and a scenario page; the island ships under 10 kB compressed.
- **SC-006**: The export carries every scenario, and the index lists every scenario with its
  toggles (end-to-end test).

## Assumptions

- One toggle at a time. The data model's `replaces: stepId → Step[]` is per toggle; combining
  toggles would need conflict rules that no scenario needs yet. Each toggle is its own static page,
  which also makes every variant a shareable URL and keeps the page complete without JavaScript.
- Tokens are shown as the specification's own examples would show them: JWT header and claims,
  with placeholder issuers, subjects and audiences on `example` domains. No real token, key or
  signature is involved; the explorer is a reading of the specifications, not a running system.
- The change marks compare each token with the previous token in the chain, whoever holds it.
  "The token at each hop" is what the message carries; a hop that carries no token shows none.
- The explorer cites the revisions already in `data/specs`. Where a scenario needs a section of a
  spec the atlas cites only loosely (ID-JAG draft-04, RFC 8693), the section is the document's own
  heading, as the data model requires, and is checked against the document when the scenario is
  written.
- Vulnerabilities are validated but not rendered; Breach Anatomy (005) renders them.
- The scenarios are illustrative of the specifications, not of any vendor's product. Actor names
  are generic (an agent host, a tasks server, an enterprise identity provider).
