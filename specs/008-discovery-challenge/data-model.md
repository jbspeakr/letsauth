# Data Model: Discovery challenge check

No entity or field changes. One feature file changes a value, the scanner's decision table gains
a row, and the probe gains the inputs that row needs.

## Feature file

`data/features/mcp.prm.www-authenticate.yaml`: `observable: active` → `observable: passive`.
Everything else (category `discovery`, party `mcp-server`, both revisions at level MUST with the
"one of two" note) stays. From that value alone the scanner's check list, the report pages'
rows and the "not checked" list change.

## Probe (inputs the checks read)

| Field | Meaning |
|---|---|
| `prm` | the protected resource metadata judged: the well-known document when one was found, else the document at the challenge's pointer; `location` is `path-aware`, `root` or `challenge` |
| `prmOutcome`, `prmLast` | whether any document was found; the decisive request (well-known or pointer) |
| `wellKnownOutcome`, `wellKnownLast` | the well-known locations alone: `found`, `absent` (definite 4xx or not JSON at both) or `error` |
| `challenge` | the endpoint's answer: `url`, `status`, the `WWW-Authenticate` header as received (if any), `resourceMetadata` (the pointer, if any), `schemes` |
| `challengeOutcome`, `challengeLast` | `found` when the endpoint answered 401; `absent` for any other definite status; `error` when the request failed |
| `pointerOutcome`, `pointerLast` | the fetch of the pointer, when one was followed |

Request order within a scan: the well-known PRM locations, the endpoint, the pointer (only when
no well-known document was found and the challenge carries one), the authorization server's
well-known locations. At most seven requests.

## Decision table (rows added to `specs/004-scanner/data-model.md`)

Inputs as in 004; `challenge` is the endpoint's answer to the unauthenticated `GET`.

| Feature | Supported when | Unsupported when | Unknown when |
|---|---|---|---|
| `mcp.prm.www-authenticate` | `challenge.status` is 401 and a `WWW-Authenticate` header carries `resource_metadata` | `challenge.status` is 401 and no header carries `resource_metadata` | the endpoint answered any other status (named), or the request failed (named) |
| `mcp.prm.well-known` | unchanged: a document at the path-aware or root location | unchanged: both locations answered a definite 4xx or not JSON; a document reached only through the pointer does not count | unchanged |
| `mcp.prm` and the other `mcp.prm.*` checks | judged from `prm`, whichever location it came from | as before | `prm` not found anywhere; the evidence names both the well-known tries and the challenge outcome, and the pointer fetch when one was tried |

Evidence for the challenge cell: `<endpoint> — HTTP 401; WWW-Authenticate resource_metadata:
<url>` when supported; `<endpoint> — HTTP 401; WWW-Authenticate: <header as received or absent>,
no resource_metadata parameter` when unsupported; `<endpoint> — HTTP <status>; no 401 challenge
to an unauthenticated GET, nothing to judge` or `<endpoint> — <failure>; could not reach the
endpoint` when unknown. Cut at 300 characters like every other evidence.

## Grade

The either-or rule becomes symmetric:

```
EITHER_OR = {
  "mcp.prm.well-known":        "mcp.prm.www-authenticate",
  "mcp.prm.www-authenticate":  "mcp.prm.well-known",
}
```

A member that is not `supported` counts as `supported` when the other is; a failing member
counts as `unknown` while the other is `unknown` or absent; both failing fail. The published rule
text says so in both directions.

## Observations written

As 004: `method: passive-scan`, `observedBy: scanner@0.2.0`, the current revision, the evidence
above. The version bump makes the append rule re-observe every cell on the next run.
