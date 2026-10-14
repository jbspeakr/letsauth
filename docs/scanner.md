# The scanner

The scanner (roadmap 004, `specs/004-scanner/`) automates what the MCP auth atlas did by hand:
it reads the public authorization metadata of every listed server, judges the passively
observable requirements of the current MCP Authorization revision, and writes the result as
observations, each with the metadata URL it read as evidence. It is the one piece of the site
that contacts other servers, and it is passive by default (constitution III).

## What it reads, and never does

For a server URL `https://h/p` it fetches, with `GET` over HTTPS and no credentials:

1. `https://h/.well-known/oauth-protected-resource/p` (RFC 9728, path-aware), then
   `https://h/.well-known/oauth-protected-resource` (root);
2. for the first issuer in `authorization_servers`:
   `/.well-known/oauth-authorization-server<path>`, `/.well-known/openid-configuration<path>` and
   `<path>/.well-known/openid-configuration` (the three locations the MCP specification names).

That is all: at most five requests, never to the MCP endpoint itself, never with a token, never
an authorization flow. Redirects are followed only to the same host over HTTPS. The
`User-Agent` is `letsauth-scanner/<version> (+https://letsauth.eu/scanner/)`.

Every status is decided by the table in `specs/004-scanner/data-model.md`. A document that could
not be fetched (timeout, connection, TLS, 5xx, refused redirect) makes every check that depends
on it `unknown`; `unsupported` is written only when a document was fetched and the field is
absent or wrong. `partial` is written only when some but not all authorization server endpoints
use HTTPS.

## Running it

```sh
pnpm scan https://mcp.example.com/mcp     # a report in the terminal, nothing written
pnpm scan notion                          # a listed server by id
pnpm scan notion --write                  # append the observations the nightly rule would
pnpm scan --all --write --summary out.md  # what the nightly workflow runs
pnpm scan notion --json                   # the report as JSON (contracts/report.md)
pnpm scan:serve                           # the on-demand service on http://localhost:8080
```

`--write` appends only what the append rule says: a cell with no observation, a cell whose
current observation was not written by this scanner version, or a cell whose status or evidence
changed. Nothing is edited; `pnpm check:append-only` passes by construction.

## The nightly run

`.github/workflows/scan.yml` runs `pnpm scan --all --write --summary scan-summary.md` every
night (03:17 UTC) and on `workflow_dispatch`. When the data changed it commits to
`scanner/<date>`, pushes, and opens one pull request whose description is the run summary: per
server the grade, the cells appended and the checks that could not be judged. When nothing
changed it logs "nothing to append" and opens nothing.

**CI on the scanner's pull requests.** A pull request opened with the workflow's own token does
not start other workflows (a GitHub rule). Add a repository secret `SCANNER_TOKEN` holding a
fine-grained personal access token for this repository with *Contents: write* and *Pull
requests: write*; the workflow uses it when present and CI then runs as usual. Without it, close
and reopen the pull request, or push an empty-change commit to its branch, to start CI.

**Reviewing a scanner pull request.** Open each evidence URL in the diff; it is the metadata
document that decided the status. `unknown` means the scanner could not tell (the evidence names
the failure), not that the feature is missing. A wrong status is never fixed by editing the
entry: fix the check in `src/scanner/checks.ts`, bump `SCANNER_VERSION`, and the next run
re-observes every cell.

**When to bump `SCANNER_VERSION`** (`src/scanner/version.ts`): whenever a check's logic or its
evidence text changes. The append rule treats cells written by an older version as not yet
measured, so the next run rewrites them all.

## The grade

Shown on report pages and the scanner index, never used to sort or rank:

1. F when a MUST-level check is unsupported or partial.
2. Withheld (no letter) when a MUST-level check is unknown.
3. C when every MUST-level check is supported and a SHOULD-level check is unsupported or partial.
4. B when every MUST-level check is supported, no SHOULD-level check fails, and a SHOULD-level
   check is unknown.
5. A when every MUST-level and SHOULD-level check is supported.

MAY-level and deprecated requirements are listed and never change the grade.

## The on-demand service

`src/scanner/server.ts` is a small HTTP service: `GET /healthz`, `POST /scan` with
`{ "url": "https://…" }` (or `GET /scan?url=…`) returning the report JSON. It refuses URLs that
are not HTTPS, that carry credentials or a port, that are IP addresses or local names, or whose
host resolves to a private, loopback, link-local or otherwise non-public address. It stores
nothing, keeps a per-address rate limit in memory (six scans a minute), caps concurrent scans,
and answers with `Cache-Control: no-store`. Configuration: `PORT` (8080),
`SCANNER_ALLOWED_ORIGIN` (`https://letsauth.eu`), `SCANNER_RATE_PER_MINUTE` (6),
`SCANNER_MAX_CONCURRENT` (4).

### Deploying to Scaleway Serverless Containers

The constitution puts the backend on Scaleway in an EU region. Once:

1. Create a Scaleway project and a Container Registry namespace in an EU region (for example
   `fr-par` or `nl-ams`).
2. Build and push the image from the repository root:
   ```sh
   docker build -t rg.fr-par.scw.cloud/<namespace>/letsauth-scanner:<version> .
   docker push rg.fr-par.scw.cloud/<namespace>/letsauth-scanner:<version>
   ```
3. Create a Serverless Container from that image in the same region: port `8080`, minimum scale
   `0`, maximum scale `2`, memory `512 MB`, timeout `30 s`, no private network attached. Set
   `SCANNER_ALLOWED_ORIGIN=https://letsauth.eu`.
4. Attach a custom domain (for example `scanner.letsauth.eu`) or use the container's own URL.
5. In the repository's `production` environment, set the variable `PUBLIC_SCANNER_URL` to that
   base URL (no trailing slash). The next deploy mounts the form on `/scanner/`.

To move the nightly run onto Scaleway as well, create a Serverless Job from the same image with
the command `pnpm scan --all --write --summary scan-summary.md` and a wrapper that commits and
opens the pull request with a repository token; the GitHub workflow is the reference for those
steps. Until then the GitHub schedule is the nightly run (see `specs/004-scanner/plan.md`,
Complexity Tracking).

## Opting out

A server owner who does not want their server scanned withdraws it from the atlas through the
[issue form](https://github.com/jbspeakr/letsauth/issues/new?template=observation.yml) ("withdraw
my server"); a withdrawn server is never contacted again. The scanner only ever reads the
well-known documents a server publishes for every client, and identifies itself in every request.
