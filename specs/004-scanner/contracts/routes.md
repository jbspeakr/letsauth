# Contract: Routes

All site routes are pre-rendered and end in a slash (`build.format: "directory"`). Server ids are
the `id` fields from `data/servers/` and are stable.

| Route | Content | Notes |
|---|---|---|
| `/scanner/` | What the scanner checks and how, the grade rule, the on-demand form (island) or the "not configured" note, the index of every listed server with its latest grade and scan date, how to run the scanner yourself, how to opt out | Alphabetical by server name; never ordered by grade. Complete without JavaScript; the form carries a `<noscript>` note. |
| `/scanner/{serverId}/` | The server's report: identity, grade with reasons (or withheld / not scanned), every passive check with level, citation, status, evidence link and date, the rule, links to the atlas server page | Withdrawn servers get the page with the withdrawn notice and `noindex`, no report. |
| `/scanner/{serverId}.json` | The report as JSON (`report.md`) built from the newest scanner observations | `generatedAt` is the build time; `recorded: true`. |

Cross-links:

- The server page `/atlas/mcp/servers/{id}/` gains a "Passive scan" line in its status card:
  grade and date with a link to the report, or "not scanned yet" with the link.
- The site navigation gains "Scanner"; the footer links the scanner and the opt-out section.
- The home page's "what it refuses to be" paragraph, which said the scanner was on the roadmap,
  says it exists and links to it.

Query strings: none. Redirects: none.

## On-demand service (separate origin, `service.md`)

| Route | Method | Content |
|---|---|---|
| `/healthz` | GET | `{ "ok": true, "scanner": "letsauth-scanner/<version>" }` |
| `/scan` | POST (JSON body `{ "url": "https://…" }`) or GET (`?url=`) | The report (`report.md`) with `recorded: false`, or HTTP 400 `{ "error": "<reason>" }`, or HTTP 429 when rate-limited |
