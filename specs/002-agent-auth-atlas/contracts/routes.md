# Contract: Routes

All routes are pre-rendered and end in a slash (`build.format: "directory"`). Ids are the `id`
fields from the data files and are stable (constitution: renaming an id is a migration with a
redirect).

| Route | Content | Notes |
|---|---|---|
| `/atlas/standards/` | The map (inline SVG), legend, filter form, spec list grouped by body | Query string carries filter state: `type` (relation types, repeatable) and `body` (bodies, repeatable). Server-rendered content is complete without JS; a `<noscript>` note says filtering needs it. |
| `/atlas/standards/{specId}/` | Spec page: identity block, revisions newest first, relations out and in, features defined, contribution link | Withdrawn and expired specs render with a notice at the top. For `mcp-authorization` each adjacent revision pair links to `/atlas/mcp/changes/{from}/{to}/`. |
| `/atlas/standards/data.json` | Full export | See `data-export.md`. |

Cross-links:

- `/atlas/mcp/features/{featureId}/` is linked from a spec page's "defines" list.
- `/atlas/standards/mcp-authorization/` is linked from the MCP atlas revision bar ("About this
  specification") so both atlases point at each other.
- The site navigation gains "Agent auth atlas" next to "MCP auth atlas"; the home page gains a
  second call to action.

Redirects: none needed at launch. A renamed spec id follows `docs/deploy.md`.
