# Research: Composable discovery strategies

## R1. Why eight endpoints gave no challenge

Reading the evidence of the 2026-10-16 run: Airtable, Attio, Figma and Zoom answered `GET` with
405; Linear and Sentry answered 404 and Cloudflare 410 on `/sse` paths; Stack Overflow's root
URL answered 302 to a documentation page. The streamable HTTP transport lets a server answer
`GET` with 405 when it offers no server-initiated stream, so the first four are compliant servers
the scanner's request shape could not reach. The vendors' documentation names `/mcp` endpoints
for the next three (Linear, Sentry and Cloudflare all deprecated `/sse`); Atlassian and Plaid,
whose well-known metadata was also missing, had moved to `/v2/mcp` and `/mcp/` as well. A public
probe of Stack Overflow's root with an anonymous `POST` returned 401 with a bare `Bearer`
challenge.

**Decision**: a ladder, `GET` then an empty `POST`; a note on stale URLs; the five listings
corrected.

## R2. The second step's shape

**Decision**: `POST`, `Content-Type: application/json`, `Content-Length: 0`, the same `Accept`
header as the `GET`, no body.

**Rationale**: Reference SDKs and gateways run authentication before parsing the body, so the
empty request receives the same 401 a client's `initialize` would, without sending a protocol
message. A server that parses first answers 400, recorded as `unknown`. `HEAD` and `OPTIONS` were
ruled out in 008 R2; `POST initialize` stays out as an MCP request.

**Alternatives**: a `POST` with an invalid JSON body (`{}`) would be parsed as a bad message by
servers that parse first and is no better at reaching authentication; a body-less `POST` is the
smallest request that a streamable HTTP server routes to its message handler.

## R3. When to take the second step

**Decision**: only after a definite non-401 status or a redirect the scanner would not follow;
never after a timeout, connection or TLS failure, or a 5xx.

**Rationale**: those failures say nothing about the method; repeating them costs a request and
can look like probing. A redirect off the host is a routing answer (a landing page), not a
failure.

## R4. Composition

**Decision**: a check is an ordered list of `Strategy { id, title, judge }`; `firstOf` takes the
first decision; the last strategy always decides. Sources stay eagerly discovered by the probe in
a fixed order, so request lists remain deterministic and testable.

**Rationale**: lazily fetching sources on demand would make the request order depend on the
check order and break the one-request-per-source guarantee the tests pin. The ladder is the one
place where discovery itself is composed; it has the same shape (declared steps with a `when`).

## R5. The scope SHOULD's sources

**Decision**: metadata `scopes_supported` → challenge `scope` → authorization server
`scopes_supported` (supported only) → `unknown`.

**Rationale**: the order follows how directly each source speaks for the MCP server. The
authorization server bounds what the server could request; it cannot show what it does request,
so it settles only the favourable case.

## R6. The scope challenge as a passive feature

**Decision**: flip `mcp.rs.scope-challenge` to `passive`; judge it from the challenge the scanner
already receives.

**Rationale**: no new request; the header is public metadata by 008's argument. The grade
consequence (a 401 without `scope` is a SHOULD `unsupported`) is the published rule applied to a
measured cell; recorded in the spec's assumptions for the owner.

## R7. Version

**Decision**: `SCANNER_VERSION` 0.2.0 → 0.3.0; every cell re-observed on the next run.
