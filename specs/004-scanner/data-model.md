# Data Model: Scanner

The scanner is a view on the shared model (`docs/data-model.md`, executable in `src/schema/`). It
reads Server, Feature, Spec and Revision and writes Observation. It adds no entity and amends no
field. This file lists what it reads, how it decides each status, what it writes, and the
derivations the pages use.

## Entities read

- **Server** (`data/servers/*.yaml`): `url` is the MCP endpoint the well-known locations are
  derived from. Servers with `withdrawn` or `transport: stdio-only` are skipped.
- **Spec** and **Revision** (`data/specs/mcp-authorization.yaml`): the revision with
  `status: current` is the one judged against; its `revisions[]` entry on each feature gives the
  level and section cited in the report.
- **Feature** (`data/features/*.yaml`): every feature with `observable: passive` and `party` of
  `mcp-server` or `authorization-server` that has an entry for the current revision is a check.

## Decision table (one check per passive feature)

Inputs: `prm` is the protected resource metadata document if one was fetched and parsed from a
well-known location; `as` is the authorization server metadata document for the first issuer in
`prm.authorization_servers` if fetched and parsed; `err(x)` means the fetch of `x` failed
(network, timeout, TLS, redirect refused, 5xx, body too large or not JSON) as opposed to a
definite `404`/`4xx`.

| Feature | Supported when | Unsupported when | Unknown when |
|---|---|---|---|
| `mcp.prm.well-known` | `prm` found at the path-aware or root location | both locations answered a definite 4xx | any location errored and none was found |
| `mcp.prm` | `prm` found | never (the document may be announced only in a `WWW-Authenticate` challenge, which a passive scan does not provoke) | `prm` not found |
| `mcp.prm.authorization-servers` | `prm.authorization_servers` is a non-empty array of strings | `prm` found and the field is absent, empty or not an array of strings | `prm` not found |
| `mcp.prm.scopes-supported` | `prm.scopes_supported` is a non-empty array of strings | `prm` found and the field is absent or empty | `prm` not found |
| `mcp.prm.no-offline-access` | `prm.scopes_supported` is present and does not contain `offline_access` | `prm.scopes_supported` contains `offline_access` | `prm` not found, or `scopes_supported` absent (nothing is advertised, so nothing can be judged) |
| `mcp.as.metadata` | `as` found at any of the three locations | every location answered a definite 4xx | no issuer known, or any location errored and none was found |
| `mcp.as.issuer-match` | `as.issuer` equals the issuer used to build the URL (string equality after removing one trailing slash from both) | `as` found and `issuer` differs or is absent | `as` not found |
| `mcp.as.https` | every `*_endpoint` value (and `jwks_uri`) in `as` is an `https:` URL | none of them is `https:` | `as` not found; **partial** when some but not all are `https:` |
| `mcp.as.pkce-s256` | `as.code_challenge_methods_supported` contains `S256` | `as` found and the field is absent or lacks `S256` | `as` not found |
| `mcp.as.cimd` | `as.client_id_metadata_document_supported === true` | `as` found and the field is absent or not `true` | `as` not found |
| `mcp.as.dcr` | `as.registration_endpoint` is a string | `as` found and the field is absent | `as` not found |
| `mcp.as.iss-param` | `as.authorization_response_iss_parameter_supported === true` | `as` found and the field is absent or not `true` | `as` not found |

A check for a passive feature that this table does not cover fails the run with a message naming
the feature, so a new passive feature cannot be silently skipped (research R5).

## Observations written

| Field | Value |
|---|---|
| `server` | the server id (nightly and `--write`); absent when `pnpm scan <url>` prints a report for a URL that is not a listed server (such a report is never written) |
| `feature` | the feature id |
| `revision` | `{ spec: mcp-authorization, revision: <current> }` |
| `status` | from the table; `partial` only for `mcp.as.https` |
| `method` | `passive-scan` |
| `observedAt` | the run's start time, one timestamp per run, ISO 8601 UTC |
| `observedBy` | `scanner@<version>` |
| `evidence` | `<url> — HTTP <status>; <field>: <value>` where `url` is the document that decided the status (or the last location tried), `status` the HTTP status or the failure name (`timeout`, `connection`, `tls`, `redirect`, `not-json`, `too-large`), and the rest names the deciding field and its value or `absent`. No timestamp, no request id. At most 300 characters; longer values are cut with `…`. |

### Append rule

Let `current` be the atlas's current cell for (server, feature, revision): the newest
observation, ties broken by method strength. The scanner appends its observation when
`current` is absent, when `current.observedBy` is not `scanner@<this version>`, or when
`current.status` or `current.evidence` differ from the scanner's. It never appends otherwise and
never edits or removes an entry. The file is written by appending YAML entries to the end of
`data/observations/<server>.yaml`, so `pnpm check:append-only` passes by construction.

## Derivations

### Library (`src/scanner/`)

| Function | Input | Output | Rule |
|---|---|---|---|
| `wellKnownPrmUrls(serverUrl)` | URL | string[] | path-aware then root (research R4); one entry when the path is empty |
| `wellKnownAsUrls(issuer)` | URL | string[] | the three MCP locations in order; two when the issuer has no path |
| `guardUrl(url, resolve)` | string, resolver | `{ ok: true, url } \| { ok: false, reason }` | research R3 |
| `probe(target, fetcher)` | URL, fetcher | `Probe` | every request made, the documents found, the issuer judged |
| `runChecks(probe, checks)` | probe, check list | `CheckResult[]` | the decision table |
| `grade(results)` | results with levels | `Grade` | FR-008 |
| `scan(target, data, fetcher, now)` | | `Report` | `probe` → `runChecks` → `grade`, plus the observations |
| `toAppend(report, data)` | report, dataset | `Observation[]` | the append rule |
| `appendObservations(file, entries)` | path, entries | void | appends YAML entries; creates the file when missing |

### Site (`src/lib/scanner.ts`)

| Function | Input | Output | Rule |
|---|---|---|---|
| `passiveChecks(data, revisionId)` | dataset, revision | `{ feature, entry }[]` | the features the scanner judges, in `CATEGORY_ORDER` then id, server party first |
| `latestScan(data, server)` | dataset, server | `ScanView` | per check the newest `passive-scan` observation by `scanner@*` under the current revision, or none; `scannedAt` is the newest such date; `grade` from the statuses (unknown for a check without observation) |
| `scannerIndex(data)` | dataset | `{ server, view }[]` | every non-withdrawn server by name with its `ScanView` |

`ScanView` is turned into the same `Report` shape the command prints (`reportFromView`), so the
page, the JSON route and the command share one contract (research R10).

## Grade

Applied to the checks of one report with the level each feature has in the judged revision:

1. Any MUST-level check `unsupported` or `partial` → **F**.
2. Otherwise any MUST-level check `unknown` → **withheld** (no letter).
3. Otherwise any SHOULD-level check `unsupported` or `partial` → **C**.
4. Otherwise any SHOULD-level check `unknown` → **B**.
5. Otherwise → **A**.

MAY and DEPRECATED levels are listed in the report and never change the grade. The reasons list
names every check that triggered a rule.
