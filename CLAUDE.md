# letsauth.eu — working notes for coding agents

Read first, in this order:

1. `.specify/memory/constitution.md` — the rules. Every PR must comply; plans justify deviations.
2. `docs/data-model.md` — the shared data model. `src/schema/` is its executable form.
3. `specs/<feature>/` — the Spec Kit artifacts for the feature you are working on
   (`spec.md`, `plan.md`, `tasks.md`). Mark tasks `[x]` in `tasks.md` as you complete them.

## Commands

- `pnpm install` — Node 22, pnpm 10.
- `pnpm dev` — dev server on http://localhost:4321.
- `pnpm validate:data` — schema and cross-reference checks over `data/`. Run after any data edit.
- `pnpm check` — validate:data, lint (Biome), typecheck, unit tests, build. Must pass before a push.
- `pnpm test:e2e` — Playwright against `astro preview` (run `pnpm build` first). Screenshot
  baselines live in `tests/e2e/__screenshots__` and must come from Playwright's pinned Chromium:
  `pnpm test:e2e --update-snapshots` with that build, or the `refresh-screenshots` label on the
  pull request (see `docs/atlas-maintenance.md`). Update them only for intended changes.
- `pnpm check:append-only` — fails if an existing observation entry was edited or removed.

## Conventions

- Data is YAML under `data/`, one entity per file; observations are append-only lists per server.
- Every feature cites a spec revision and section; the build fails on a dangling citation.
- `unknown` is a real status. Never render missing data as `unsupported`.
- Nothing in this repo contacts third-party servers. Seed data is `vendor-claim` or `manual`.
- One token system: `src/styles/tokens.css`. Components use tokens, never literal colours.
- Islands only where interaction needs them. Pages must read fully without JavaScript.
