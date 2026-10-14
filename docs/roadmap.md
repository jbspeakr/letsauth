# Roadmap

The constitution is the stable meta plan. This roadmap is the part that changes: the order of
features and the review point after each. Each feature gets its own spec under `specs/`.

| # | Feature | Why this order | Status |
|---|---|---|---|
| 001 | **MCP Atlas** | Quickest unique win. A curated matrix of public MCP servers against the features of the current MCP authorization revision forces the data model to be right and is useful on day one. | Implemented, live at letsauth.eu; documentation pass recorded October 2026 |
| 002 | **Agent Auth Atlas** | The standards graph. Mostly data entry on the same model, plus one graph view. | Planned |
| 003 | **Delegation Chain Explorer** | The flagship. Step-through scenarios with the decoded token at each hop and attack toggles. Reuses features and revisions from 001 and 002. | Planned |
| 004 | **Scanner** | Automates what 001 did by hand. Passive checks on public metadata, graded report, nightly PR with observations. First and only backend. | Planned |
| 005 | **Breach Anatomy** | Each agent-auth vulnerability as a scenario replay plus a reproducible lab. Cheap once 003 exists. | Planned |
| 006 | **Agents under EU rules** | eIDAS 2.0 and EUDI wallet mandates, AI Act oversight, NIS2 duties, as explorer scenarios and long-form pages. | Planned |
| 007 | **Changelog and newsletter** | Generated from merged data and content changes. Runs once there is something to report. | Planned |

Review after each feature: does it still pass the three honesty tests, and did it make the shared
model better or worse?
