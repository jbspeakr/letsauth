# Data Model: Delegation Chain Explorer

The explorer is a view on the shared model (`docs/data-model.md`, executable in `src/schema/`).
It reads Spec, Revision, Feature, Server and Observation (for the toggle page's server counts) and
adds the executable form of two entities the model already defines: Scenario and Vulnerability.
This file lists the sub-entities as pinned down by this feature, the cross-reference rules the
validator enforces, and the derivations the pages use.

## Scenario (`data/scenarios/<id>.yaml`)

| Field | Type | Notes |
|---|---|---|
| `id` | kebab id | equals the file name |
| `title` | string | |
| `summary` | string | one or two sentences; the index card and the page lede |
| `actors` | Actor[] | at least two, ids unique; the diagram's lane order |
| `features` | feature id[] | requirements the scenario exercises; each must exist |
| `steps` | Step[] | at least one, ids unique |
| `toggles` | Toggle[] | may be empty, ids unique |

**Actor**: `{ id: kebab id, kind: user | agent | mcp-client | mcp-server | authorization-server |
resource | idp, name: string }`.

**Step**: `{ id: kebab id, from: actor id, to: actor id, message: string, note?: string, cites:
Citation, token?: TokenView }`. `from` and `to` may be equal (a self-message).

**Citation**: `{ spec: spec id, revision: revision id, section: string }`; the section is the
document's own heading or anchor.

**TokenView**: `{ name: string, header?: Record<string, scalar>, claims: Record<string, value>,
note?: string }` where a value is a string, number, boolean, a list of strings, or a nested record
of values (for `act`).

**Toggle**: `{ id: kebab id, name: string, kind: attack | misconfiguration, summary: string, cites:
Citation, replaces: Record<step id, Step[]>, violates?: feature id[], vulnerability?: id }`. A
key of `replaces` names a baseline step; its value is the list of steps that take its place, in
order; an empty list removes the step.

## Vulnerability (`data/vulnerabilities/<id>.yaml`)

As the model defines it: `{ id, title, class, affects[], features[], scenario?, sources[] }`.
Loaded and cross-checked so that `toggle.vulnerability` and `vulnerability.scenario` resolve; no
page renders it in this feature (005).

## Cross-reference rules (added to `crossCheck`)

| Rule | Message names |
|---|---|
| `scenario.features[i]` exists | `data/scenarios/<id>.yaml.features[i]` |
| `step.from` and `step.to` are declared actors (baseline and replacement steps) | `…steps[i].from`, `…toggles[j].replaces.<step>[k].to` |
| `step.cites` and `toggle.cites` resolve to a revision in `data/specs` | `…cites` |
| `toggle.replaces` keys name baseline steps | `…toggles[j].replaces.<step>` |
| ids are unique across the resolved chain for each toggle (a replacement may reuse the id of the step it replaces, no other) | `…toggles[j].replaces.<step>[k].id` |
| `toggle.violates[i]` exists | `…toggles[j].violates[i]` |
| `toggle.vulnerability` and `vulnerability.scenario`, `vulnerability.features[i]` exist | `…vulnerability`, `data/vulnerabilities/<id>.yaml.scenario` |

The per-file schema already enforces kebab ids, unique actor and step ids within a scenario,
unique toggle ids, non-empty strings and the enums.

## Derivations (`src/lib/explorer.ts`)

- **resolveChain(scenario, toggleId?)** → `{ scenario, toggle?, steps: ResolvedStep[] }`. A
  `ResolvedStep` is a Step plus `index` (1-based position in the rendered chain), `toggled`
  (true when the toggle introduced it), `replaces?` (the baseline step id, set on the first
  replacement of each), `removed` (true for a baseline step the toggle maps to `[]`; kept in
  place for display and skipped by the token diff), and `token?` extended with `diff`.
- **diffClaims(previous?, next)** → `{ added: string[], changed: string[], removed: string[] }`
  over top-level claim names, comparing values structurally; `previous` undefined marks nothing.
  Header fields are compared the same way into `headerDiff`.
- **scenarioList(data)** → scenarios ordered by id, each with step count, toggle list and the
  Feature objects it exercises.
- **featureSupport(data, featureId)** → `{ observed: true, counts: { supported, partial,
  unsupported, unknown, "not-applicable" } }` from the current revision's matrix, or
  `{ observed: false, reason }` for a client-side feature or one the current revision does not
  define.
- **buildExplorerExport(data)** → the export (contracts/data-export.md).
