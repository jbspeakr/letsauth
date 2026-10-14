# Data Model: Agent Auth Atlas

The atlas is a view on the shared model (`docs/data-model.md`, executable in `src/schema/`). This
file lists what the feature reads, the one amendment it makes, and the derivations it adds. Field
tables that already exist in `docs/data-model.md` are not repeated.

## Entities read

- **Spec** and **Revision** (`data/specs/*.yaml`): every spec is a node. `revisions[]` gives the
  dates, document links and change notes; the revision with `status: current` is the one the
  index dates a spec by.
- **Relation** (`data/relations.yaml`): every entry is an edge. Already defined in the shared
  model; this feature adds the schema file and the loader for it.
- **Feature** (`data/features/*.yaml`): read only to list, on a spec page, the features whose
  `revisions[]` cite that spec, with the level of the spec's current revision.

## Amendment to the shared model

Applied to `docs/data-model.md` and `src/schema/spec.ts` as this feature's first commit
(justified in plan.md, Complexity Tracking).

### Spec: new fields

| Field | Type | Notes |
|---|---|---|
| `maturity` | enum | `individual-draft`, `working-group-draft`, `candidate`, `published`, `in-force`, `expired`, `withdrawn`. The publisher's status for the spec as a whole; revision `status` keeps meaning "which revision is shown by default". Required. |
| `maturityNote` | string? | The publisher's own label, shown verbatim: "Proposed Standard", "Informational", "Best Current Practice", "Implementer's Draft 2", "Regulation (EU) 2024/1183". |

### Spec: enum additions

- `body` gains `other` (CNCF, W3C and any body the list does not name).
- `family` gains `guidance` (best current practice, architecture and threat-model documents
  that define no protocol).

### Relation: validation rules (no field change)

1. `from` and `to` resolve to specs in `data/specs` and are different.
2. `(from, to, type)` is unique. For `competes-with` and `solves-same-problem-as`, which are
   symmetric, `(to, from, type)` counts as the same relation and is rejected too.
3. `competes-with` and `solves-same-problem-as` require `note`.
4. The graph of `builds-on`, `profiles` and `replaces` edges is acyclic.

Errors print as `data/relations.yaml[i].field: message`.

## Derivations (`src/lib/standards.ts` and `src/lib/graph.ts`)

| Function | Input | Output | Rule |
|---|---|---|---|
| `specNodes(data)` | dataset | Spec[] | Every spec with `maturity` not `withdrawn` is a node; withdrawn specs are listed separately with the notice (FR-014). Order: body order, then first revision date, then name. |
| `relationsOf(data, specId)` | dataset, id | `{ outgoing, incoming }` grouped by type | Symmetric types appear under "related" on both pages without direction. |
| `featuresDefinedBy(data, specId)` | dataset, id | `{ feature, entry }[]` | Features with a `revisions[]` entry for the spec's current revision, with that entry; sorted by category order then id. |
| `currentRevisionOf(spec)` | spec | Revision | The one with `status: current` (schema guarantees exactly one). |
| `layoutGraph(nodes, relations)` | nodes, relations | `{ nodes: PlacedNode[], edges: PlacedEdge[], width, height }` | Column = longest path from a root along dependency edges; rows grouped by body in `BODY_ORDER`; deterministic for the same input. |
| `isSymmetric(type)` | type | boolean | `competes-with`, `solves-same-problem-as`. |
| `isDependency(type)` | type | boolean | `builds-on`, `profiles`, `replaces`. |

## Labels (`src/lib/labels.ts`)

Adds `BODY_LABEL`, `FAMILY_LABEL`, `MATURITY_LABEL` (with a short tag for the node:
"RFC/final" is not used; tags are `draft`, `WG draft`, `candidate`, `published`, `in force`,
`expired`, `withdrawn`) and `RELATION_LABEL` with a verb phrase per type and direction
("builds on" / "is built on by", "profiles" / "is profiled by", "references" / "is referenced
by", "replaces" / "is replaced by", "competes with", "solves the same problem as").

## Example

```yaml
# data/specs/rfc8693.yaml
id: rfc8693
name: OAuth 2.0 Token Exchange
body: ietf-oauth
family: protocol
maturity: published
maturityNote: Proposed Standard
summary: >
  Lets a client swap one security token for another at the authorization server, with
  delegation (act) and impersonation semantics, so a downstream call can carry who is acting
  for whom.
url: https://datatracker.ietf.org/doc/rfc8693/
revisions:
  - id: rfc
    date: 2020-01-16
    status: current
    url: https://www.rfc-editor.org/rfc/rfc8693
```

```yaml
# data/relations.yaml (excerpt)
- from: mcp-authorization
  to: rfc9728
  type: builds-on
  note: Protected Resource Metadata is how an MCP server announces its authorization servers.
  source: https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization
- from: aauth
  to: oauth-2-1
  type: competes-with
  note: >
    AAuth proposes a new agent-first protocol instead of profiling OAuth 2.1; both target the
    same client-to-resource authorization problem for agents.
  source: https://datatracker.ietf.org/doc/draft-hardt-oauth-aauth-protocol/
```
