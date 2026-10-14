# Contract: On-demand service

The only backend of the site (constitution IV). Stateless; stores nothing; sends only the
requests `research.md` R2 to R4 describe.

## Endpoints

| Method and path | Request | Response |
|---|---|---|
| `GET /healthz` | – | `200` `{ "ok": true, "scanner": "letsauth-scanner/<version>" }` |
| `POST /scan` | `Content-Type: application/json`, body `{ "url": "https://…" }` | `200` report (`report.md`, `recorded: false`); `400` `{ "error": "<reason>" }` when the URL fails the guard or the body is malformed; `429` `{ "error": "rate limited" }`; `503` `{ "error": "busy" }` when the concurrency cap is reached |
| `GET /scan?url=…` | query | same as `POST /scan` |
| `OPTIONS /scan` | – | `204` with the CORS headers |
| anything else | – | `404` `{ "error": "not found" }` |

## Headers

- Responses carry `Content-Type: application/json; charset=utf-8`, `Cache-Control: no-store`,
  `X-Content-Type-Options: nosniff`.
- CORS: `Access-Control-Allow-Origin` is the value of `SCANNER_ALLOWED_ORIGIN` (default
  `https://letsauth.eu`); `Access-Control-Allow-Methods: GET, POST, OPTIONS`;
  `Access-Control-Allow-Headers: Content-Type`.

## Limits

- Six scans per minute per client address (`X-Forwarded-For`'s first entry when present, else
  the socket address); a token bucket in memory.
- At most four scans at a time per instance; more get `503`.
- A scan has 15 s in total: 10 s per request, at most five requests (two PRM, three AS).
- Request bodies above 4 KiB are refused.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `8080` | listen port (Scaleway sets it) |
| `SCANNER_ALLOWED_ORIGIN` | `https://letsauth.eu` | CORS origin |
| `SCANNER_RATE_PER_MINUTE` | `6` | token bucket refill |
| `SCANNER_MAX_CONCURRENT` | `4` | concurrency cap |

## Site integration

The site reads `PUBLIC_SCANNER_URL` at build time (the service's base URL, no trailing slash).
When set, `/scanner/` mounts the form island, which `POST`s to `${PUBLIC_SCANNER_URL}/scan` and
renders the report with the same component the static pages use. When unset, the page shows a
note that the on-demand scanner is not configured and points at `pnpm scan`.

## Deployment

`Dockerfile` at the repository root builds the image (Node 22, pnpm, the repository, the command
`pnpm scan:serve`). `docs/scanner.md` says how to push it to Scaleway Serverless Containers in an
EU region, set the variables, and how to point the site at it. The same image runs the nightly
command (`pnpm scan --all --write`) if the schedule moves to a Scaleway job (research R8).
