# Contract: Routes

All routes are pre-rendered. Ids are the `id` fields from the data files and are stable
(constitution: renaming an id is a migration with a redirect).

| Route | Content | Notes |
|---|---|---|
| `/atlas/mcp` | Matrix for the current revision | Query string carries filter state: `level`, `category`, `q`, `party`. Server-rendered content is complete without JS. |
| `/atlas/mcp/{revisionId}` | Matrix for another revision | `revisionId` as in `data/specs`, e.g. `2025-11-25`. The current revision also resolves here and canonicalises to `/atlas/mcp`. |
| `/atlas/mcp/servers/{serverId}` | Server page: profile, all features with current status, history per feature, listing source, contribution and withdrawal links | Withdrawn servers render a notice instead of the matrix row. |
| `/atlas/mcp/features/{featureId}` | Feature page: definition, level, citation, adoption share, servers by status, level across revisions | Client-party features render a page but are not linked from the matrix. |
| `/atlas/mcp/changes/{fromRevision}...{toRevision}` | Revision diff: features whose level changed or that were added or removed | Linked from the revision switcher. |
| `/atlas/mcp/data.json` | Full export | See `data-export.md`. |
| `/atlas/mcp/servers/{serverId}.json` | Per-server export | See `data-export.md`. |
| `/atlas/mcp/contribute` | How to contribute: both paths from research R7, with links to the issue form and the YAML format | Static page. |

Redirects (Bunny edge rule or `_redirects` equivalent): a renamed id maps old to new with 301.
