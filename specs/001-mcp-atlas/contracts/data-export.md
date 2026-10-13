# Contract: Data Export

Fulfils FR-013. Generated at build time from the same data the pages use.

## `/atlas/mcp/data.json`

```jsonc
{
  "generatedAt": "2026-10-13T20:00:00Z",
  "spec": { "id": "mcp-authorization", "currentRevision": "2026-07-28",
            "revisions": [ { "id": "2026-07-28", "date": "2026-07-28", "status": "current", "url": "…" }, … ] },
  "features": [ { "id": "mcp.as.cimd", "name": "…", "party": "authorization-server",
                  "category": "registration", "observable": "passive",
                  "revisions": [ { "spec": "mcp-authorization", "revision": "2026-07-28", "section": "…", "level": "SHOULD" } ] }, … ],
  "servers": [ { "id": "stripe", "name": "Stripe", "url": "https://mcp.stripe.com/",
                 "transport": "streamable-http", "listed": "public-directory", "source": "…" }, … ],
  "cells": [ { "server": "stripe", "feature": "mcp.as.cimd", "revision": "2026-07-28",
               "status": "unknown", "derived": true }, … ],
  "observations": [ { "server": "stripe", "feature": "mcp.as.dcr", "revision": "2026-07-28",
                      "status": "supported", "method": "vendor-claim",
                      "observedAt": "2026-10-13T00:00:00Z", "observedBy": "jbspeakr",
                      "evidence": "https://github.com/jaw9c/awesome-remote-mcp-servers" }, … ]
}
```

- `cells` is the derived current state (one entry per server × feature × revision, including
  derived `unknown` and `not-applicable`); `observations` is the raw append-only history.
- Withdrawn servers are omitted from `servers`, `cells` and `observations`.
- Field names and enums match `src/schema/`; the export is validated against the same schemas
  in a unit test so the file cannot drift from the model.
- Licence: data is published under CC BY 4.0 (stated in the file as `"license"`), subject to the
  owner's confirmation; code licence is separate.

## `/atlas/mcp/servers/{serverId}.json`

The same shape restricted to one server: `server`, `features` (for every revision), `cells`,
`observations`.

## Stability

Additive changes (new fields, new enum values) are allowed without notice. Renames and removals
are announced in the changelog and keep the old field for one revision of the export
(`"version": 1` at the top level increments on a breaking change).
