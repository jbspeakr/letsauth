# Quickstart: Delegation Chain Explorer

How to run and validate the feature end to end. Implementation details belong in `tasks.md`.

## Setup

```sh
pnpm install
pnpm validate:data        # scenarios and vulnerabilities are checked with everything else
pnpm dev                  # http://localhost:4321/explorer/
```

## Scenarios to verify

1. **Validation**: `pnpm validate:data` passes on the real data; against
   `tests/fixtures/bad-data` it names `scenarios/broken.yaml` with the dangling citation, the
   unknown actor, the unknown step in a toggle and the unknown feature (unit test).
2. **Chain**: `/explorer/mcp-authorization/` shows one lifeline per actor, one diagram row and
   one list entry per step with the same ids; every citation is a link to the revision's document.
3. **Tokens**: on the same page the access token at the token response marks nothing, the bearer
   call marks nothing changed, and the server's upstream token marks `aud` changed and `act`
   added.
4. **Toggle**: `/explorer/mcp-authorization/token-passthrough/` marks the upstream call as
   changed by the toggle, names the step it replaces, shows the notice with the citation and the
   server counts for `mcp.rs.no-passthrough`; `/explorer/token-exchange-chain/may-act-unchecked/`
   shows a struck-out step.
5. **No JavaScript**: with JavaScript off, scenario and toggle pages are complete and no control
   bar is present.
6. **Step-through**: with JavaScript on, Next and the right arrow move the current step and set
   `#step-<id>`; loading that URL opens at the step.
7. **Index and export**: `/explorer/` lists three scenarios with their toggles;
   `/explorer/data.json` carries them.
8. **Budgets**: axe clean on the index, a scenario and a toggle page in light, dark and phone; no
   horizontal page scroll at 412 px; Lighthouse CI green on `/explorer/` and
   `/explorer/mcp-authorization/`; the island under 10 kB compressed in the build output.
