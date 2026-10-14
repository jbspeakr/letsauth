## What this changes

<!-- One or two sentences. For data PRs: which server(s) and feature(s). -->

## Data checklist (delete if this PR touches no files under `data/`)

- [ ] Every new observation has `evidence` that a reviewer can open (URL) or verify (precise note).
- [ ] No existing observation entry was edited or removed; corrections are new entries with a newer `observedAt`.
- [ ] `observedBy` is my handle (or `scanner@<version>` for automated runs).
- [ ] `pnpm validate:data` passes locally.
- [ ] A new server has `listed`, `source` and, where I maintain it, `listed: opt-in`.

## Code checklist (delete if this PR touches no code)

- [ ] `pnpm check` passes.
- [ ] Pages still read fully without JavaScript; the island stays within the JS budget.
- [ ] Both themes checked; screenshots updated only for intended changes.
