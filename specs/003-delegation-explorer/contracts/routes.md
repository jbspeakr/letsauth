# Routes: Delegation Chain Explorer

| Route | Renders | Notes |
|---|---|---|
| `/explorer/` | the index: one card per scenario | title, summary, actors, step count, toggles (links), features exercised (links) |
| `/explorer/<scenario>/` | the baseline chain | toggle bar with the baseline current |
| `/explorer/<scenario>/<toggle>/` | the chain with one toggle applied | notice, replaced steps marked, removed steps struck out |
| `/explorer/data.json` | the export | contracts/data-export.md |

Page anatomy (`ChainPage.astro`), in order: breadcrumb (Explorer / scenario), eyebrow and title,
lede (summary), the toggle bar (`nav[aria-label="Toggles"]`, links with `aria-current="page"` on
the current one, each toggle with its kind as a pill), the toggle notice (`[data-toggle-notice]`,
toggle pages only), the island's control bar (inserted before the diagram, `[data-enhanced]`),
the diagram (`figure#chain-diagram` with `svg[data-steps=N]` and one `g[data-step=<id>]` per
row), the step list (`ol#chain-steps` with one `li[data-step=<id>]` per resolved step, carrying
`data-toggled`, `data-removed` and `data-replaces` when set, the citation as `cite.citation a`,
the token as `[data-token]` with `[data-claim=<name>][data-change=added|changed|same]` rows and
`[data-removed-claim]` entries), the requirements section (`#requirements`, one entry per
exercised feature linking to the atlas), and the data links.
