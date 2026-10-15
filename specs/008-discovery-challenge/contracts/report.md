# Contract: Report (additions)

The report shape of `specs/004-scanner/contracts/report.md` gains two things. Both are additive;
`version` stays 1.

```jsonc
{
  "requests": [
    // …the well-known PRM requests…
    { "url": "https://mcp.example.com/mcp", "status": 401, "ok": false },   // the endpoint; never JSON
    { "url": "https://mcp.example.com/oauth/prm.json", "status": 200, "ok": true,
      "contentType": "application/json" },                                  // the pointer, when followed
    // …the authorization server requests…
  ],
  "discovered": {
    "protectedResource": {
      "url": "https://mcp.example.com/oauth/prm.json",
      "location": "challenge",             // "path-aware" | "root" | "challenge"
      // …as before
    },
    "challenge": {                         // or null when the endpoint was not reached
      "url": "https://mcp.example.com/mcp",
      "status": 401,
      "header": "Bearer realm=\"mcp\", resource_metadata=\"https://mcp.example.com/oauth/prm.json\"",
      "resourceMetadata": "https://mcp.example.com/oauth/prm.json"   // or null
    },
    // …
  }
}
```

A recorded report (`recorded: true`) keeps `requests` empty and `discovered` null, as before.
