# Contract: Data Export

Fulfils FR-012. Generated at build time from the same data the pages use.

## `/atlas/standards/data.json`

```jsonc
{
  "version": 1,
  "generatedAt": "2026-10-14T09:00:00Z",
  "license": "CC BY 4.0",
  "source": "https://letsauth.eu/atlas/standards/",
  "specs": [
    { "id": "rfc8693", "name": "OAuth 2.0 Token Exchange", "body": "ietf-oauth",
      "family": "protocol", "maturity": "published", "maturityNote": "Proposed Standard",
      "summary": "…", "url": "https://datatracker.ietf.org/doc/rfc8693/",
      "revisions": [ { "id": "rfc", "date": "2020-01-16", "status": "current",
                       "url": "https://www.rfc-editor.org/rfc/rfc8693" } ] }, …
  ],
  "relations": [
    { "from": "mcp-authorization", "to": "rfc9728", "type": "builds-on",
      "note": "…", "source": "https://…" }, …
  ],
  "withdrawn": [ "some-withdrawn-spec" ]
}
```

- `specs` holds every spec whose `maturity` is not `withdrawn`, as the full record the schema
  defines (including `revisions[]`), so the export is a faithful copy of `data/specs`.
- `relations` holds every relation, including those touching withdrawn specs, so a consumer can
  reconstruct history; `withdrawn` lists the ids left out of `specs`.
- Field names and enums match `src/schema/`; a unit test validates the export against the same
  schemas and asserts it contains every spec and relation the map renders.
- Licence: CC BY 4.0, read from `LICENSE-DATA` as the MCP export does.

## Stability

`version` bumps on a breaking change of the shape. Adding fields is not breaking.
