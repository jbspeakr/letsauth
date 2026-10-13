# Data Model: MCP Atlas

Phase 1 output of `/speckit.plan`. This feature implements the subset of the shared model
(`docs/data-model.md`) that the atlas needs: Spec, Revision, Feature, Server, Observation. The
Zod schemas in `src/schema/` are the normative form; this document records validation rules and
derived state for this feature. Relation, Scenario and Vulnerability are defined in the shared
model but not populated by this feature.

## Entities

### Spec / Revision (`data/specs/*.yaml`)

As in the shared model. Validation added here:

- Exactly one revision per spec has `status: current`.
- `revisions[].id` is unique within the spec; `supersedes` must name an earlier revision of the
  same spec.
- `revisions[].date` is ISO `YYYY-MM-DD`; `url` is HTTPS.

### Feature (`data/features/*.yaml`)

Fields as in the shared model, plus two atlas-specific fields:

| Field | Type | Notes |
|---|---|---|
| `party` | enum | `mcp-server`, `authorization-server`, `client`. The matrix shows `mcp-server` and `authorization-server` features; `client` features are stored for the explorer and hidden here. |
| `levelNote` | string? | Qualifier such as "one of two mechanisms" or "deprecated" rendered next to the level. |

Validation:

- `id` matches `^[a-z0-9]+(\.[a-z0-9-]+)+$` (dotted namespace, e.g. `mcp.as.cimd`).
- `definedBy.spec` and `definedBy.revision` must resolve to an existing revision (cross-reference
  check in `scripts/validate-data.ts`; build fails otherwise).
- `definedBy.section` is a non-empty string and is rendered verbatim with the revision link.
- `supersedes`, when present, must name an existing feature id.
- A feature id may appear once per revision. The same id under a later revision with a different
  `level` is how level changes are recorded; the revision diff lists these.

### Server (`data/servers/*.yaml`)

As in the shared model, plus:

| Field | Type | Notes |
|---|---|---|
| `source` | url | Where the listing came from (directory entry or vendor doc). Required when `listed` is `public-directory` or `maintainer-added`. |
| `authClaimed` | enum? | `oauth2.1`, `oauth2.1-no-dcr`, `api-key`, `open`, `unknown`: the directory's own claim, kept separate from observations. |
| `withdrawn` | object? | `{ at: date, reason: string }`. A withdrawn server is excluded from the matrix and export; its page states the withdrawal. |

Validation:

- `id` is kebab-case and unique; `url` is HTTPS.
- `transport: stdio-only` servers get `not-applicable` for every authorization feature by
  derivation; no observations are required for them.

### Observation (`data/observations/<server-id>.yaml`, a list)

As in the shared model. Validation:

- `server` must equal the file's server id and resolve to `data/servers`.
- `feature` must resolve to `data/features` and have party `mcp-server` or `authorization-server`.
- `revision` must resolve, and the feature must be defined under that revision.
- `status` ∈ {supported, partial, unsupported, unknown, not-applicable}.
- `method` ∈ {manual, vendor-claim, passive-scan, active-scan}.
- `observedAt` is an ISO datetime; `observedBy` non-empty; `evidence` non-empty (URL or note).
- Append-only is enforced in review, and by a CI check that fails if a PR removes or changes an
  existing observation entry (diff of the list by content hash).

## Derived state (`src/lib/atlas.ts`)

| Derivation | Rule |
|---|---|
| Current cell | Newest observation for `(server, feature, revision)`; tie on `observedAt` broken by method strength `active-scan > passive-scan > manual > vendor-claim`. |
| Cell with no observation | `{ status: "unknown", derived: true }`; rendered as unknown, never as unsupported (SC-006). |
| Cell for stdio-only server | `{ status: "not-applicable", derived: true }`. |
| History | All other observations for the cell, newest first. |
| Feature share | `supported / (supported + partial + unsupported)`; counts of `unknown` and `not-applicable` shown beside it. |
| Revision diff | For two revisions, features whose `level` differs, plus features present in only one. |
| Matrix columns | Features of the selected revision with party ≠ `client`, ordered by category then id. |
| Matrix rows | Servers not withdrawn, ordered by name. |

## State transitions

- **Revision**: `draft → current → superseded`; `withdrawn` from any state. Only one `current`
  per spec. Changing which revision is current is a data PR that also adds any new features.
- **Server**: `listed → withdrawn` (one-way, by maintainer on request). Re-listing requires a new
  opt-in and clears `withdrawn`.
- **Observation**: none. Entries are immutable; a new entry supersedes by date.
