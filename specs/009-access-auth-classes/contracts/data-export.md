# Contract: Data export (additions)

`/atlas/mcp/data.json` and `/atlas/mcp/servers/<id>.json` carry each server as the schema
validates it, so a server gains, when stated:

```jsonc
{
  "id": "github",
  // …as before…
  "authClaimed": "oauth2.1-no-dcr",
  "access": {
    "class": "public",
    "method": "manual",
    "evidence": "https://docs.github.com/… — any GitHub account can authorize the server",
    "observedAt": "2026-10-17T00:00:00Z",
    "observedBy": "jbspeakr"
  },
  "auth": {
    "class": "oauth",
    "method": "manual",
    "evidence": "https://docs.github.com/… — OAuth sign-in from the client; a PAT is also accepted",
    "observedAt": "2026-10-17T00:00:00Z",
    "observedBy": "jbspeakr"
  }
}
```

Both fields are absent when not stated. `version` stays 1 (additive).
