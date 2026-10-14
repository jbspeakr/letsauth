# The scanner

The scanner (roadmap 004, `specs/004-scanner/`) automates what the MCP auth atlas did by hand:
it reads the public authorization metadata of every listed server, judges the passively
observable requirements of the current MCP Authorization revision, and writes the result as
observations, each with the metadata URL it read as evidence. It is the one piece of the project
that contacts other servers, and it runs in exactly one place: a scheduled job on the project's
own backend (Scaleway, EU region). Nothing on the site triggers a scan, and the only output of a
run is a pull request against this repository.

## What it reads, and never does

For a server URL `https://h/p` it fetches, with `GET` over HTTPS and no credentials:

1. `https://h/.well-known/oauth-protected-resource/p` (RFC 9728, path-aware), then
   `https://h/.well-known/oauth-protected-resource` (root);
2. for the first issuer in `authorization_servers`:
   `/.well-known/oauth-authorization-server<path>`, `/.well-known/openid-configuration<path>` and
   `<path>/.well-known/openid-configuration` (the three locations the MCP specification names).

That is all: at most five requests, never to the MCP endpoint itself, never with a token, never
an authorization flow. Redirects are followed only to the same host over HTTPS. URLs that are not
HTTPS, carry credentials or a port, name an IP address or a local name, or resolve to a private
address are refused, whether they are a listed server's URL or an issuer found in metadata. The
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
pnpm scan --all --write --summary out.md  # what the nightly job runs
pnpm scan notion --json                   # the report as JSON (contracts/report.md)
```

`--write` appends only what the append rule says: a cell with no observation, a cell whose
current observation was not written by this scanner version, or a cell whose status or evidence
changed. Nothing is edited; `pnpm check:append-only` passes by construction. A contributor who
runs `--write` opens a pull request with the result like any other data change.

## The nightly job

A Scaleway Serverless Job runs `pnpm scan:nightly` (`scripts/scan-nightly.ts`) every night at
03:17 UTC from the image `Dockerfile` builds. One run:

1. shallow-clones `main` with the job's GitHub token and installs dependencies;
2. runs `pnpm scan --all --write --summary scan-summary.md` over every listed server that is not
   withdrawn and has an HTTP transport (a server that fails is recorded as `unknown`);
3. runs `pnpm validate:data` and `pnpm check:append-only`; a failure aborts the run and nothing
   is pushed;
4. when nothing under `data/observations/` changed, logs "nothing to append" and stops;
5. otherwise commits to `scanner/<date>`, pushes, and opens one pull request `Scanner: <date>`
   whose description is the run summary (per server the grade, the cells appended and the checks
   that could not be judged), or updates the open pull request for that branch.

The pull request is opened with a personal token, so CI runs on it like on any other. Nothing is
merged without review. `specs/004-scanner/contracts/job.md` is the contract.

**Environment of the job**: `SCANNER_REPO` (`jbspeakr/letsauth`), `SCANNER_BASE` (`main`), and
the secret `SCANNER_TOKEN`: a fine-grained GitHub personal access token for this repository with
*Contents: write* and *Pull requests: write*, nothing else. It lives in the job definition on
Scaleway, never in the image or the repository.

**Reviewing a scanner pull request.** Open each evidence URL in the diff; it is the metadata
document that decided the status. `unknown` means the scanner could not tell (the evidence names
the failure), not that the feature is missing. A wrong status is never fixed by editing the
entry: fix the check in `src/scanner/checks.ts`, bump `SCANNER_VERSION`, and the next run
re-observes every cell.

**When to bump `SCANNER_VERSION`** (`src/scanner/version.ts`): whenever a check's logic or its
evidence text changes. The append rule treats cells written by an older version as not yet
measured, so the next run rewrites them all.

## Deploying to Scaleway

The image reaches Scaleway only through `.github/workflows/scanner-deploy.yml`, which runs on a
push to `main` that touches the scanner (`Dockerfile`, `src/scanner/`, the scan scripts, the
lockfile) or by hand from the Actions tab. It builds the image, pushes it to the project's
Scaleway Container Registry as `letsauth-scanner:<commit>` and `:latest`, and points the job
definition at the new tag. The scan itself never runs on GitHub.

Set up once, by the owner:

1. Create a Scaleway project in an EU region (`fr-par` or `nl-ams`) and a Container Registry
   namespace in it. Create an API key for the project with permissions to push to the registry
   and to manage Serverless Jobs.
2. Create the Serverless Job definition (console: Serverless → Jobs → Create job definition, or
   `scw jobs definition create`; check `scw jobs definition create --help` for the exact option
   names of your CLI version):
   - image: `rg.<region>.scw.cloud/<namespace>/letsauth-scanner:latest` (the first deploy run
     pushes it; the definition can be created before or after that),
   - command: `pnpm scan:nightly`,
   - cron schedule: `17 3 * * *` (UTC),
   - resources: 1 vCPU, 1 GB memory, timeout 30 minutes, no private network,
   - environment variables: `SCANNER_REPO=jbspeakr/letsauth`, `SCANNER_BASE=main`,
   - secret: `SCANNER_TOKEN` as a secret reference (Secret Manager) or, where the definition
     offers no secret field, as an environment variable; the value is the fine-grained GitHub
     token described above.
3. In the repository's `production` environment, set the secrets `SCW_ACCESS_KEY`,
   `SCW_SECRET_KEY`, `SCW_DEFAULT_PROJECT_ID`, `SCW_DEFAULT_ORGANIZATION_ID` and the variables
   `SCW_REGION` (if not `fr-par`), `SCW_REGISTRY_NAMESPACE` and `SCW_JOB_DEFINITION_ID` (the id
   of the definition from step 2).
4. Run the "Scanner deploy" workflow once by hand. From then on every merge that touches the
   scanner redeploys, and the job's next run uses the new image. Start the job once from the
   console to get the first scanner pull request without waiting for the night.

The workflow never creates or changes the job's schedule, resources or secret; it only moves
the image forward, so those settings stay where the owner put them.

## The grade

Shown on report pages and the scanner index, never used to sort or rank:

1. F when a MUST-level check is unsupported or partial.
2. Withheld (no letter) when a MUST-level check is unknown.
3. C when every MUST-level check is supported and a SHOULD-level check is unsupported or partial.
4. B when every MUST-level check is supported, no SHOULD-level check fails, and a SHOULD-level
   check is unknown.
5. A when every MUST-level and SHOULD-level check is supported.

MAY-level and deprecated requirements are listed and never change the grade.

## What there is not

There is no on-demand scanning. The site has no endpoint that accepts a URL, the scanner pages
ship no JavaScript, and no visitor can cause a request to any server. A server owner who wants
to see their server's report asks for it to be listed; a contributor who wants fresh cells runs
`pnpm scan <id> --write` and opens a pull request.

## Opting out

A server owner who does not want their server scanned withdraws it from the atlas through the
[issue form](https://github.com/jbspeakr/letsauth/issues/new?template=observation.yml) ("withdraw
my server"); a withdrawn server is never contacted again. The scanner only ever reads the
well-known documents a server publishes for every client, and identifies itself in every request.
