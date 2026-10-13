# Contract: Contributing an Observation

Fulfils FR-010, FR-011, SC-005 and User Story 4. Two paths, both ending in a reviewed pull
request. Nothing is published without review.

## Path A: pull request

1. Append an entry to `data/observations/<server-id>.yaml` (create the file if the server has
   none). Never edit or remove existing entries.
2. CI runs `pnpm validate:data`. On failure the job output names the file, the entry index and
   the field, e.g. `data/observations/stripe.yaml[3].evidence: required (URL or note)`.
3. CI also fails if any existing observation entry was changed or removed (append-only check).
4. A maintainer reviews the evidence and merges. The next deploy publishes it.

Entry format:

```yaml
- server: stripe                     # must equal the file's server id
  feature: mcp.as.cimd               # existing feature id with party mcp-server or authorization-server
  revision: { spec: mcp-authorization, revision: "2026-07-28" }
  status: supported                  # supported | partial | unsupported | unknown | not-applicable
  method: passive-scan               # manual | vendor-claim | passive-scan | active-scan
  observedAt: 2026-10-13T18:40:00Z
  observedBy: jbspeakr               # handle, or scanner@<version>
  evidence: https://auth.stripe.com/.well-known/oauth-authorization-server
```

## Path B: issue form

`.github/ISSUE_TEMPLATE/observation.yml` with required fields that mirror the entry format
(server, feature, revision, status, method, date, evidence, your handle) and a type selector:
`new observation`, `correction`, `withdraw my server`. A maintainer turns an accepted issue into
a PR on Path A; the issue is linked from the observation's `evidence` when the evidence is the
issue itself.

## Adding a server

A new file `data/servers/<id>.yaml` with `listed`, `source` and, where the maintainer of the
server is the contributor, `listed: opt-in`. Validation as in `data-model.md`.

## Withdrawal

A request from the server's maintainer (issue form, type `withdraw my server`) leads to a PR that
sets `withdrawn: { at, reason }` on the server. Observations are kept in the repository but are
excluded from the site and the export.
