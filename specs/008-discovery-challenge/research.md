# Research: Discovery challenge check

## R1. Is the challenge public metadata? (constitution III)

**Decision**: Yes. The check is passive and needs no constitution amendment.

**Rationale**: RFC 9728 §5.1 defines the `resource_metadata` parameter of the `WWW-Authenticate`
challenge as the way a protected resource points an unauthenticated client at its metadata; the
MCP Authorization specification lists it as one of the two discovery mechanisms a server MUST
offer and requires a 401 with that challenge for any request without a token. It is addressed
to everyone, carries no secret, and reading it needs no credential, session, cookie or flow.
Principle III's wording ("public metadata only, no credentials, no authorization flows") is met
on every count; what it forbids is exercising the server (tokens, scopes, flows) without the
owner's consent, which this request does not do.

**Alternatives considered**:

1. Amend the constitution (PATCH) to say "public metadata, including the challenge an
   unauthenticated request receives". Clearer, but it would make the constitution enumerate
   mechanisms, which it otherwise avoids. Offered to the owner as an option.
2. Keep the check active and run it only for owner-verified servers. Leaves the three servers
   withheld indefinitely and the atlas column empty; the roadmap item would not be met.
3. Record the challenge cell only, without following the pointer. Keeps the request count at
   six, but leaves `mcp.prm` (a MUST) `unknown`, so the grade stays withheld and the roadmap's
   reason for the feature is not met.

## R2. Which request to send to the endpoint

**Decision**: One `GET` with `Accept: application/json, text/event-stream`, the scanner's
`User-Agent`, no other header, no body. Redirects under the existing rules. The body is never
read: the response is cancelled once the headers are in.

**Rationale**: The SSE transport's endpoint is opened with `GET`; a streamable HTTP server's
`GET` opens its listening stream. Authorization middleware in the reference SDKs and in common
gateways runs before the method is dispatched, so an unauthenticated `GET` gets the same 401 the
first JSON-RPC `POST` would, without sending a JSON-RPC message. A `POST` with an `initialize`
call is what a client does, but it is an MCP request, which the constitution's passive posture
does not cover for unverified servers.

**Alternatives considered**: `HEAD` (many frameworks do not route it and answer 404 or 405
before authentication); `POST initialize` (sends a protocol message: active); `OPTIONS` (not an
authenticated request on most servers, so no challenge).

## R3. What a non-401 answer means

**Decision**: `unknown`, with the status named. Never `unsupported`.

**Rationale**: A 403 may come from a WAF or geo rule, a 404 or 405 from routing that runs before
authentication, a 200 from a server with no authentication at all. None of them says the server
cannot issue a challenge; the request simply did not reach the authentication step the
specification describes. Treating them as a failure would turn infrastructure into grades, which
principle III forbids ("the absence of data is never rendered as a failure").

## R4. Following the pointer

**Decision**: When no well-known document was found, fetch the `resource_metadata` URL through
the existing guard and fetcher, record it as the protected resource metadata with location
`challenge`, and judge the metadata checks from it. A well-known document takes precedence.

**Rationale**: It is a metadata document the server itself named for exactly this purpose; the
fetch is the same `GET` the well-known locations get. Without it the roadmap's reason is unmet
(R1, alternative 3). The guard applies because the URL is data from a third party, like an
issuer in the metadata; it may name another host, as RFC 9728 allows.

## R5. Parsing `WWW-Authenticate`

**Decision**: Scan the header value for an auth-param named `resource_metadata` (case-insensitive
name, RFC 9110 §11.2 grammar: token or quoted-string value); take the first. Record every scheme
seen for the evidence. Do not reject a header the parser finds odd; quote it.

**Rationale**: Servers send `Bearer realm="…", resource_metadata="…"`, sometimes several
challenges joined by commas, sometimes several headers (which `fetch` joins with commas). A
tolerant scan finds the parameter in all of these; a strict parser would write `unsupported`
for a formatting quirk, which is a claim the evidence would not support.

## R6. Version and append rule

**Decision**: `SCANNER_VERSION` 0.1.0 → 0.2.0. Every cell is re-observed on the next run.

**Rationale**: The check list changed and the evidence for the PRM checks can now come from a
pointed-at document; the append rule treats an older version's cells as unmeasured, which is
what the maintainer wants here.

## R7. Grade rule symmetry

**Decision**: The either-or map becomes symmetric (`well-known` ↔ `www-authenticate`).

**Rationale**: The 004 map only covered the well-known side because the challenge cell was never
measured. Once it is, a server with a well-known document and a challenge without a pointer
would get F from the one-directional rule, which contradicts the specification's "one of two".
