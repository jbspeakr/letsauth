# Contract: The nightly job and its deployment

The scanner runs in exactly one place: a Scaleway Serverless Job in an EU region, on a cron
schedule, from the image the repository's `Dockerfile` builds. It produces nothing but a pull
request against this repository. There is no HTTP endpoint, no on-demand scan and no scanning
triggered by visitors (owner decision, 2026-10-14).

## The job

| Item | Value |
|---|---|
| Image | `rg.<region>.scw.cloud/<namespace>/letsauth-scanner:<commit>` built from `Dockerfile` |
| Command | `pnpm scan:nightly` (`scripts/scan-nightly.ts`) |
| Schedule | `17 3 * * *` (03:17 UTC, once a night) |
| Resources | 1 vCPU, 1 GB memory, timeout 30 minutes; no network listener; nothing persisted |
| Environment | `SCANNER_REPO` (`jbspeakr/letsauth`), `SCANNER_BASE` (`main`) |
| Secret | `SCANNER_TOKEN`: a fine-grained GitHub token for this repository with *Contents: write* and *Pull requests: write*, stored as the job's secret, never in the image or the repository |

What one run does, in order:

1. Shallow-clones the base branch of `SCANNER_REPO` with the token (sent as an `Authorization`
   header, never placed in a remote URL) and installs dependencies.
2. Runs `pnpm scan --all --write --summary scan-summary.md`: every listed server that is not
   withdrawn and has an HTTP transport, sequentially, at most five `GET` requests each to the
   well-known metadata locations, the authorization server metadata cached per issuer. A server
   that fails is recorded as `unknown` and does not stop the run.
3. Runs `pnpm validate:data` and `pnpm check:append-only HEAD`; a failure aborts the run with
   exit 1 and nothing is pushed.
4. When nothing under `data/observations/` changed: logs `nothing to append`, exit 0.
5. Otherwise commits the appended entries to the branch `scanner/<date>` with the summary as the
   commit body, pushes it (force-with-lease: a second run on the same day replaces its own
   branch), and opens one pull request `Scanner: <date>` against the base branch with the summary
   as its description and the label `data`; when an open pull request for that branch exists its
   description is updated instead. Exit 0.

The pull request is opened with a personal token, so CI runs on it like on any other pull
request. Nothing is merged without review.

## The run summary (pull request description)

A Markdown table with one row per scanned server: name, grade (letter, "withheld" or "not
graded"), cells appended, checks `unknown`, and the first failure reason when one exists;
followed by the scanner version, the revision judged and the start time.

## The deployment workflow

`.github/workflows/scanner-deploy.yml` is the only path by which the image reaches Scaleway. It
runs on a push to `main` that touches the scanner (`Dockerfile`, `src/scanner/`, the two scripts,
the lockfile) and on `workflow_dispatch`, in the `production` environment:

1. Builds the image and pushes it to the Scaleway Container Registry as `<commit>` and `latest`.
2. Updates the Serverless Job definition so its next run uses `<commit>`.

| Configuration | Where | Meaning |
|---|---|---|
| `SCW_ACCESS_KEY`, `SCW_SECRET_KEY` | repository secrets | an API key of the Scaleway project, with registry push and Serverless Jobs write |
| `SCW_DEFAULT_PROJECT_ID`, `SCW_DEFAULT_ORGANIZATION_ID` | repository secrets | the project and organisation the job lives in |
| `SCW_REGION` | repository variable | an EU region, default `fr-par` |
| `SCW_REGISTRY_NAMESPACE` | repository variable | the Container Registry namespace |
| `SCW_JOB_DEFINITION_ID` | repository variable | the Serverless Job definition created once by the owner (`docs/scanner.md`) |

The job definition (schedule, resources, environment, the `SCANNER_TOKEN` secret) is created once
by the owner; the workflow only ever changes its image. The scan never runs on GitHub's runners.
