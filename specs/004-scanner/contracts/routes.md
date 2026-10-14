# Contract: Routes

All site routes are pre-rendered and end in a slash (`build.format: "directory"`). Server ids are
the `id` fields from `data/servers/` and are stable. The site has no scanner endpoint: every
page reads the repository's observations, and nothing a visitor does triggers a scan.

| Route | Content | Notes |
|---|---|---|
| `/scanner/` | What the scanner checks and how, the grade rule, the index of every listed server with its latest grade and scan date, how a contributor runs the scanner, how to opt out | Alphabetical by server name; never ordered by grade. Complete without JavaScript; no island. |
| `/scanner/{serverId}/` | The server's report: identity, grade with reasons (or withheld / not scanned), every passive check with level, citation, status, evidence link and date, the rule, links to the atlas server page | Withdrawn servers get the page with the withdrawn notice and `noindex`, no report. |
| `/scanner/{serverId}.json` | The report as JSON (`report.md`) built from the newest scanner observations | `generatedAt` is the build time; `recorded: true`. |

Cross-links:

- The server page `/atlas/mcp/servers/{id}/` gains a "Passive scan" line in its status card:
  grade and date with a link to the report, or "not scanned yet" with the link.
- The site navigation gains "Scanner"; the footer links the scanner and the opt-out section.
- The home page's "what it refuses to be" paragraph, which said the scanner was on the roadmap,
  says it exists and links to it.

Query strings: none. Redirects: none. Everything that runs outside the site is in `job.md`.
