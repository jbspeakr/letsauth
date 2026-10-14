# Feature Specification: Agent Auth Atlas

**Feature Branch**: `002-agent-auth-atlas`

**Created**: 2026-10-14

**Status**: Draft

**Input**: User description: "Agent Auth Atlas: the standards graph. A living map of every relevant spec and draft for agent authorization, drawn as a graph of builds-on, competes-with and solves-the-same-problem-as relations, with status per node and a what-changed diff per revision. Mostly data entry on the shared model, plus one graph view."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the map (Priority: P1)

An engineer or architect who keeps hearing new names (WIMSE, AAuth, ID-JAG, DAWN, auth.md, CIMD,
A2A) opens the atlas and sees one picture: every relevant specification, draft and regulation as
a node, grouped by the body that publishes it, with its maturity visible at a glance, and the
relations between them drawn as edges: what builds on what, what profiles what, what competes
with what, what solves the same problem as what, what replaces what. Every node opens the spec's
own page. The map reads top to bottom from foundations to profiles, and a legend explains the
edge and maturity styles.

**Why this priority**: This is the product. The gap the research found is that nobody shows how
the drafts across IETF, OpenID, MCP, A2A and the EU relate; the map is that view and it is
useful the moment it has thirty nodes.

**Independent Test**: Load the atlas with a seeded set of specs and relations, confirm every
non-withdrawn spec appears as exactly one node with its body and maturity, every relation appears
as exactly one edge with the right style, every node links to its spec page, and the map renders
without JavaScript.

**Acceptance Scenarios**:

1. **Given** at least one spec and one relation exist, **When** a visitor opens the atlas,
   **Then** they see every spec as a node labelled with its name, grouped by publishing body,
   with a maturity mark, and every relation as an edge styled by its type.
2. **Given** a node, **When** the visitor activates it, **Then** they land on that spec's page.
3. **Given** an edge, **When** the visitor hovers or focuses it, **Then** they see the relation
   type, both spec names and the relation's note.
4. **Given** the visitor has JavaScript disabled, **When** the atlas renders, **Then** the map,
   the legend and the list of specs are complete and every node is still a link.
5. **Given** the atlas is opened at phone width, **When** it renders, **Then** the map scrolls
   inside its own frame and the page has no horizontal scroll.

---

### User Story 2 - Read one spec's page (Priority: P2)

A visitor opens a spec's page and sees what it is (one neutral summary), who publishes it, its
family (protocol, profile, discovery, credential format, regulation, guidance), its maturity with
the publisher's own label (Proposed Standard, Implementer's Draft, Regulation, shipped revision),
every dated revision with a link to the exact document and an implementer-facing note on what
changed and what breaks, every relation in and out with its note and source, and the features
the spec defines in the shared model, each linking to its feature page in the MCP atlas.

**Why this priority**: Spec pages are what people link from issues, docs and talks. They turn a
picture into a reference and give every edge a place to show its evidence.

**Independent Test**: Open a spec page for a spec with several revisions and several relations
and confirm the revisions are listed newest first with dates and document links, the current
revision is marked, the relations show type, direction, note and source, and the feature list
matches the features citing that spec.

**Acceptance Scenarios**:

1. **Given** a spec with two or more revisions, **When** the visitor opens its page, **Then**
   the revisions are listed newest first, the current one is marked, each links to its document
   and shows its change note when one exists.
2. **Given** a spec with relations in both directions, **When** the visitor opens its page,
   **Then** outgoing and incoming relations are listed by type, each naming the other spec,
   linking to it and showing the relation's note and source.
3. **Given** a spec that defines features in the shared model, **When** the visitor opens its
   page, **Then** those features are listed with the level the current revision puts on them and
   link to their feature pages.
4. **Given** a spec whose revisions have a diff page in another atlas (the MCP Authorization
   spec), **When** the visitor opens its page, **Then** each revision pair links to that diff.

---

### User Story 3 - Compare alternatives (Priority: P3)

A visitor wants to answer "what else solves this problem?" or "which of these compete?". They
narrow the map to one or more relation types (for example only competes-with and
solves-the-same-problem-as) and to one or more publishing bodies, and the map and list narrow
accordingly. The narrowed view is shareable by link.

**Why this priority**: The map is dense by design. Filtering turns it from a poster into a tool,
but the unfiltered map already answers the first question people come with.

**Independent Test**: Open the atlas with a filter in the link, confirm only edges of the chosen
types and nodes of the chosen bodies are shown, confirm the count of shown specs and relations is
visible, and confirm clearing the filter restores everything.

**Acceptance Scenarios**:

1. **Given** the visitor selects only the competes-with type, **When** the filter applies,
   **Then** only competes-with edges are drawn and the count of shown relations updates.
2. **Given** a filtered view, **When** its link is opened in a fresh page, **Then** the same
   filter is applied.
3. **Given** the visitor has JavaScript disabled, **When** they open a filtered link, **Then**
   the full map renders and a notice says the filter needs JavaScript.

---

### User Story 4 - Follow a spec's status over time (Priority: P4)

A visitor wants to know whether a spec is a draft, an adopted draft, a candidate, published or
in force, and what changed in its latest revision. The map shows maturity per node; the spec page
shows the revision history with change notes; and the atlas index lists, per spec, the date of its
current revision so a reader can see what moved recently.

**Why this priority**: Spec churn is the main cause of confusion in this field (research). Status
and dated revisions make the atlas a record of change, not a snapshot.

**Independent Test**: With a spec whose maturity is an individual draft and one that is a
published standard, confirm the map marks them differently and the spec list sorts or labels
them accordingly; with a spec whose newest revision has a change note, confirm the note is shown.

**Acceptance Scenarios**:

1. **Given** specs with different maturities, **When** the map renders, **Then** each node's
   maturity is distinguishable without colour alone and named in text on hover, focus and in the
   list.
2. **Given** a revision with a change note, **When** the spec page renders, **Then** the note is
   shown next to that revision.
3. **Given** a spec that has been withdrawn or has expired, **When** the atlas renders, **Then**
   the spec stays on the map and in the list, marked as withdrawn or expired, and nothing is
   silently removed.

---

### User Story 5 - Contribute a spec or a relation (Priority: P5)

A contributor adds a spec, a revision or a relation with a source link. If the submission is
incomplete (missing canonical URL, revision without a date or document link, relation to an
unknown spec, judgement relation without a note), they are told exactly what is missing before
review.

**Why this priority**: The atlas stays correct only if correction is easier than complaining, and
the standards move faster than one maintainer can watch.

**Independent Test**: Add a relation whose target does not exist and confirm validation rejects it
naming the field; add a competes-with relation without a note and confirm the same; add a complete
spec and relation and confirm they appear on the map after review.

**Acceptance Scenarios**:

1. **Given** a relation naming a spec that does not exist, **When** the data is checked, **Then**
   it is rejected with a message naming the file, the entry and the field.
2. **Given** a competes-with or solves-the-same-problem-as relation without a note, **When** the
   data is checked, **Then** it is rejected with a message naming the missing field.
3. **Given** a complete spec and relation are accepted, **When** the atlas is next published,
   **Then** the node and edge appear on the map and the spec has its page.

---

### Edge Cases

- A spec has no relations yet: it still appears on the map as an isolated node and in the list,
  and its page says no relations are recorded.
- A relation is declared in both directions (A competes-with B and B competes-with A): the data
  check rejects the duplicate; symmetric types are stored once and rendered without direction.
- A chain of builds-on, profiles or replaces relations forms a cycle: the data check rejects it,
  because the map's layering and the meaning of the relation both assume a direction.
- A relation names the same spec on both ends: rejected.
- A spec is withdrawn or an Internet-Draft expires: the spec stays, marked as such; relations to
  it stay and render muted; nothing is deleted.
- A spec's canonical home is not an HTTPS page (an old RFC served over HTTP): the atlas requires
  HTTPS and the maintainer uses the HTTPS mirror that every standards body now serves.
- Two specs have the same name from different bodies (a vendor profile named after the draft it
  implements): ids are distinct and the body is always shown next to the name.
- The MCP atlas's spec is one node among many: its revisions and features render on its page
  from the same data the MCP atlas uses, with nothing duplicated.
- A regulation has no "revision" in the IETF sense: its publication in the Official Journal is
  recorded as its one revision, and application dates go in the change note.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The atlas MUST render one node per non-withdrawn spec in the shared model and one
  edge per relation, with every node linking to that spec's page.
- **FR-002**: Every node MUST show the spec's name, its publishing body and its maturity, and the
  maturity MUST be distinguishable without colour alone.
- **FR-003**: Every edge MUST be styled by relation type, MUST be distinguishable without colour
  alone, and MUST expose its type, both spec names and its note on hover and focus.
- **FR-004**: Directed relation types (builds-on, profiles, references, replaces) MUST render
  with a direction; symmetric types (competes-with, solves-same-problem-as) MUST render without
  one and MUST be stored once per pair.
- **FR-005**: The map MUST group nodes by publishing body and order them so that a spec is
  placed after the specs it builds on, profiles or replaces.
- **FR-006**: The atlas MUST render fully without JavaScript: map, legend, spec list and links.
  Filtering may require JavaScript, and the page MUST say so when a filter is in the link and
  JavaScript is off.
- **FR-007**: Visitors MUST be able to narrow the map by relation type and by publishing body,
  the shown counts MUST update, and the narrowed view MUST be shareable by link.
- **FR-008**: Each spec MUST have its own page at a stable address showing name, body, family,
  maturity with the publisher's label, summary, canonical link, every revision (newest first,
  current marked, document link, change note), every relation in and out with note and source,
  and the features the spec defines with their current level and a link to each feature page.
- **FR-009**: Every spec MUST record a canonical URL and at least one dated revision with its
  own document URL; every revision reference in the model MUST resolve, and the build MUST fail
  otherwise.
- **FR-010**: Every relation MUST name two existing, distinct specs and a type from the model's
  list; competes-with and solves-same-problem-as relations MUST carry a note; a relation MAY
  carry a source URL and the page MUST show it when present.
- **FR-011**: Contributions MUST be checked for the rules in FR-009 and FR-010 before review,
  and a failed check MUST name the file, entry and field.
- **FR-012**: The atlas MUST publish its specs and relations in a machine-readable form at a
  stable address, under the data licence, so others can reuse the graph.
- **FR-013**: The atlas MUST NOT rank, score or recommend specs. Order within a group is by
  publication date or name; maturity is the publisher's status, not the atlas's judgement.
- **FR-014**: A withdrawn or expired spec MUST stay on the map and in the list, marked as such.
- **FR-015**: The atlas index MUST list every spec with its body, family, maturity and the date
  of its current revision, and MUST link to the spec page and the canonical document.
- **FR-016**: Where another atlas on the site renders a diff between two revisions of a spec,
  the spec page MUST link to it rather than render its own.

### Key Entities

Defined in the shared data model (`docs/data-model.md`); this atlas reads and writes these and
adds none of its own. It amends the Spec entity with one field (see Assumptions).

- **Spec**: a standard, draft, protocol document family or regulation, with body, family,
  summary, canonical URL, maturity and revisions.
- **Revision**: a dated version of a spec with its own document URL, status and change note.
- **Relation**: a typed edge between two specs with an optional note and source.
- **Feature**: a requirement defined by a revision; read here to list what a spec defines.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At launch the atlas maps at least 30 specs across at least five publishing bodies
  with at least 40 relations, and every spec has a canonical link and a dated revision.
- **SC-002**: 100% of relations resolve to two existing specs, and 100% of judgement relations
  (competes-with, solves-same-problem-as) carry a note.
- **SC-003**: A first-time visitor can find how two named specs relate within 30 seconds without
  instructions (post-launch hallway check, not a CI test).
- **SC-004**: The map page is usable within 2 seconds on a mid-range phone over a slow mobile
  connection, with no horizontal page scroll at phone width.
- **SC-005**: An incomplete contribution is rejected with a message naming file, entry and field
  before any human reviews it.
- **SC-006**: No spec is ever removed from the map by anything other than an explicit
  withdrawal field (verified by a test that marks a spec withdrawn and checks it is still listed
  with the notice).
- **SC-007**: The machine-readable export validates against the shared schema and contains every
  spec and relation the map shows.

## Assumptions

- The initial set of specs and relations is entered by the maintainer from the standards
  bodies' own pages (IETF Datatracker, RFC Editor, OpenID Foundation, the MCP and A2A
  specifications, EUR-Lex, vendor documentation). Relation types that are judgement calls
  (competes-with, solves-same-problem-as) are explained in the relation's note and, where a
  public statement exists, sourced.
- The shared model is amended, as part of this feature's first change, with a `maturity` field
  (and optional `maturityNote`) on Spec, a `guidance` family for best-current-practice and
  architecture documents, and an `other` body for documents from bodies the list does not name
  (CNCF, W3C). The constitution asks for model amendments in their own pull request; the plan's
  Complexity Tracking records why this feature carries it as its first commit instead.
- Maturity is the publisher's status: individual draft, working-group draft, candidate,
  published, in force, expired, withdrawn. The atlas does not grade specs.
- The map is pre-rendered. Layout is computed at build time from the data; nothing is laid out
  in the browser, so the map is identical with and without JavaScript.
- Only specs that touch agent authorization are in scope: OAuth and its extensions used by agent
  protocols, workload identity, agent protocols' auth sections, verifiable-credential formats
  used for agent mandates, and the EU acts that govern them. General web or enterprise identity
  standards without an agent angle are out of scope for the launch set.
- The MCP atlas's revision diff pages are reused; this atlas renders no diff of its own.
- Visitors are not identified. Contributors are identified by the handle on their pull request.
- Nothing in this feature contacts a third-party server at build or run time.
