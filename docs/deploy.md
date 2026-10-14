# Deployment

letsauth.eu is a static site served by a Bunny CDN pull zone whose origin is a Bunny Storage
Zone in an EU region (constitution VII). `.github/workflows/deploy.yml` runs after the CI workflow
has passed on `main` (a red commit is never deployed), builds that commit, uploads `dist/` with
the Bunny Storage API (one HTTP `PUT` per file) and purges the pull zone. No third-party deploy action is involved.

## One-time setup in Bunny

1. Create a **Storage Zone** in an EU region (for example Falkenstein, `DE`). Note its name and
   the region host shown in its FTP & API Access panel (for example `storage.bunnycdn.com` for
   Falkenstein, `uk.storage.bunnycdn.com` for London).
2. Create a **Pull Zone** with the storage zone as origin and attach the `letsauth.eu` hostname
   with a free SSL certificate. Note the pull zone id (in the URL of its dashboard page).
3. In the pull zone, enable **Optimizer** only if wanted; enable **Brotli** and set the default
   cache time to one day. No URL rewriting is needed: the build writes every page as
   `<path>/index.html` and links with a trailing slash, which the storage zone serves as is.
   Optional: add an edge rule that redirects a request without an extension and without a
   trailing slash to `{{path}}/`, so hand-typed URLs like `/atlas/mcp` land on the page too.

## GitHub secrets and variables

Set these in the repository's `production` environment (Settings → Environments → production):

| Name | Kind | Value |
|---|---|---|
| `BUNNY_STORAGE_KEY` | secret | The storage zone's password (API access key). |
| `BUNNY_STORAGE_ZONE` | secret | The storage zone name. |
| `BUNNY_STORAGE_HOST` | secret | The region host, for example `storage.bunnycdn.com`. |
| `BUNNY_PULL_ZONE_ID` | secret | Numeric id of the pull zone. |
| `BUNNY_API_KEY` | secret | Account API key (Account → API), used only for the purge call. |
| `PLAUSIBLE_DOMAIN` | variable | `letsauth.eu`. When unset, no analytics script is emitted. |

The storage key only grants access to that one zone; the account API key is used for the purge
call alone. Rotate both from the Bunny dashboard and update the secrets.

## Manual deploy

`workflow_dispatch` runs the same workflow from the Actions tab. To deploy from a laptop, run
`pnpm build` and the two shell steps in the workflow with the same environment variables.

## Renamed ids

A server or feature id is stable once published (data-model.md). If one must change, keep the
old page as a redirect: add a Bunny edge rule (Redirect, 301) from the old path to the new one.
