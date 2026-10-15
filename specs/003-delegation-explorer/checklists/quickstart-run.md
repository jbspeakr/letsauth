# Quickstart run: Delegation Chain Explorer

**Date**: 2026-10-15 · **Branch**: `claude/roadmap-003-quv0t7`

Environment: the implementation container, with the pre-installed Chromium (not Playwright's
pinned build), so screenshot baselines were not generated locally.

| # | Scenario | Result | Notes |
|---|---|---|---|
| 1 | Validation | PASS | `pnpm validate:data`: 3 scenarios; `tests/unit/validate-data.test.ts` names file and field for the dangling citation, the unknown actor, the unknown step in a toggle, the unknown feature and the colliding id in `tests/fixtures/bad-data/scenarios/broken.yaml`. |
| 2 | Chain | PASS | `tests/e2e/explorer.spec.ts`: lifelines equal actors, diagram rows equal list entries equal the resolved chain, ids in order; every citation an https link. |
| 3 | Tokens | PASS | e2e: the upstream token marks `aud` changed and `act` added, `iss` unchanged; the first token marks nothing. `tests/unit/explorer.test.ts` covers the diff, nested values and a removed claim. |
| 4 | Toggle | PASS | e2e: replaced steps carry the mark and name the step replaced; the notice cites the section and lists each defeated requirement with its atlas link and server counts; the removed steps of `token-exchange-chain/token-passthrough` are struck in list and diagram. |
| 5 | No JavaScript | PASS | e2e with JavaScript disabled: all steps and rows present, no control bar, the toggle bar complete. |
| 6 | Step-through | PASS | e2e: Next and the right arrow move `aria-current="step"` and the diagram's `is-current`, the fragment follows, and loading a fragment opens at that step. |
| 7 | Index and export | PASS | e2e: three cards with toggle links; `/explorer/data.json` version 1, CC BY 4.0, scenarios in id order; the explorer is in the primary navigation and the footer. |
| 8 | Budgets | PASS except baselines | axe clean on the index, a scenario and a toggle page in light, dark and phone; no horizontal page scroll at 412 px. The island is 2.1 kB raw, about 1 kB compressed. Lighthouse runs in CI on `/explorer/` and `/explorer/mcp-authorization/`. Screenshot baselines for the two new screenshots, and for every existing page (the header gained a navigation item), come from the `refresh-screenshots` label on the pull request. |

Full run: `pnpm check` green (319 unit tests); `pnpm test:e2e` 190 passed, 14 failed, all 14
being screenshot comparisons (6 missing baselines, 8 header changes).
