# Maintaining the MCP auth atlas

Everything the atlas shows is derived from YAML under `data/`. This page says how to change
it. The rules come from the constitution and `docs/data-model.md`; the executable form is
`src/schema/` and `scripts/validate-data.ts`.

## Daily commands

```sh
pnpm validate:data        # after every data edit; prints `path[index].field: message`
pnpm check:append-only    # compares data/observations against origin/main
pnpm check                # everything CI runs except the browser tests
pnpm build && pnpm test:e2e
```

## Add a specification revision

1. Append the revision to `data/specs/mcp-authorization.yaml`: `id` (the date as the spec names
   it), `date`, `status: current`, `supersedes` (the previous id), `url`, `changes`.
2. Set the previous revision's `status` to `superseded`. Exactly one revision is `current`.
3. For every feature that the new revision still defines, append an entry to its `revisions`
   list with the new `revision`, the `section` heading as the document names it, the `level`
   and, where the text qualifies it, a `levelNote`. A feature with no entry for the new revision
   is treated as removed in that revision.
4. Add new features (next section) for requirements the revision introduces.
5. `pnpm validate:data`, then `pnpm build`: the changes page for the new pair of revisions and
   the matrix for the new revision are generated from the data. Observations against the old
   revision stay visible under `/atlas/mcp/<old-id>`; cells under the new revision start as
   `unknown` until someone observes them again.

## Add or change a feature

- One file per feature in `data/features/<id>.yaml`. Ids are dotted, lower case, and stable
  once published (`mcp.<party>.<thing>`): `mcp.prm.*` and `mcp.rs.*` for the MCP server,
  `mcp.as.*` for its authorization server, `mcp.client.*` for client-side requirements, which
  never appear in the matrix.
- `revisions` lists every revision that defines the feature, oldest first. The level is what
  the specification says about the party named in `party`; `levelNote` carries qualifiers such
  as "one of two" or "deprecated".
- `observable` is `passive` when published metadata shows it, `active` when a request is
  needed, `manual` when only documentation or source can show it. The atlas itself never sends
  requests (constitution III); `observable` tells the later scanner what it may do.
- A feature that replaces another sets `supersedes`. Never delete a feature file that has
  observations; mark it removed by leaving it out of the newer revision.

## Seed or list a server

- One file per server in `data/servers/<id>.yaml`. `listed` says why it is in the atlas and
  `source` is the public page that lists it (required unless `listed: opt-in`).
- `authClaimed` is the source's own label (`oauth2.1`, `oauth2.1-no-dcr`, `api-key`, `open`),
  shown on the server page as a claim, never as an observation.
- `transport: stdio-only` makes every cell `not-applicable` without observations.
- The seed list came from `jaw9c/awesome-remote-mcp-servers` (research R4). To re-seed from a
  newer copy of that list, regenerate only servers that do not yet have a file; never overwrite
  files that carry observations.

## Record an observation

Append to `data/observations/<server-id>.yaml`; never edit or remove an entry. The newest
`observedAt` wins; equal timestamps are broken by method strength (`active-scan` over
`passive-scan` over `manual` over `vendor-claim`). Use `unknown` to record that you looked and
could not tell, `not-applicable` when the feature cannot apply to that server.

## Withdraw a server

Set `withdrawn: { at: <date>, reason: <text> }` on the server. It leaves the matrix, the feature
pages, the sitemap and `data.json`; its page shows the notice; its observations stay in git.

## Review a data pull request

1. CI is green: schema and cross-reference validation, and the append-only check against the
   base branch.
2. Open every `evidence` URL. It has to show the claimed behaviour for that server and feature
   under that revision. A note instead of a URL is acceptable only for `manual` observations
   and must say what was done.
3. `observedAt` is plausible and `observedBy` identifies the contributor.
4. The status is the right one: `partial` needs a note in `evidence` saying what is missing;
   `unsupported` must not be used for "could not tell" (that is `unknown`).
5. Merge. The deploy workflow publishes on `main`.

## Rename an id

Ids are public URLs and export keys. If a rename is unavoidable, add a redirect (see
`docs/deploy.md`), keep the old id in `supersedes` where the model allows it, and mention it in
the pull request description.
