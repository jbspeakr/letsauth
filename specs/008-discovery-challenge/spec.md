# Feature Specification: Discovery challenge check

**Feature Branch**: `claude/discovery-challenge-check-srrhe4`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "Roadmap item 008 (Discovery challenge check): the first nightly run
withheld grades for servers that publish no protected resource metadata at a well-known URL
(Atlassian, Plaid, Stack Overflow), because the other allowed mechanism, a `resource_metadata`
pointer in the 401 `WWW-Authenticate` challenge, needs a request the passive scanner does not
make. One unauthenticated request per server to its MCP endpoint, reading only the challenge
header, would fill `mcp.prm.www-authenticate` beside `mcp.prm.well-known`, so the atlas shows
which mechanism each server offers, or both. It is the first request beyond well-known metadata,
so the spec must justify it against the constitution before it runs."

## Why this is still a passive scan

The constitution (principle III) says scanning is passive by default: public metadata only, no
credentials, no authorization flows; active probes only against systems whose owner has proven
control. The scanner so far read five well-known documents and never touched the MCP endpoint.

The `WWW-Authenticate` challenge is public metadata in the same sense as the well-known
documents. RFC 9728 §5.1 and the MCP Authorization specification define it as one of the two
ways a server tells *every* unauthenticated client where its protected resource metadata is;
the specification requires the server to send it to any request that carries no token. Reading
it needs exactly what any client does before it has a token: one request with no credentials,
no cookies, no session, no authorization flow, and no body sent. Nothing is exercised on the
server: no tool is called, no session is opened, no token is presented or validated. The
response body is never read; the scanner closes the connection once the status line and headers
have arrived.

What stays active, and out of scope here: anything that needs a token, a bad token, a scope, or
a reading of how the server behaves on real calls (`mcp.rs.*`), which the constitution reserves
for owner-verified probes.

The decision this feature records: the challenge an endpoint returns to an unauthenticated
request counts as public metadata, so `mcp.prm.www-authenticate` becomes a passively observable
feature and no constitution amendment is needed. The owner may instead ask for a clarifying
sentence in principle III, or keep the check behind owner verification; both are listed in the
plan's Complexity Tracking as the alternatives considered.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A server that announces its metadata only in the challenge gets a grade (Priority: P1)

The maintainer reads the nightly pull request after this feature ships. Atlassian, Plaid and
Stack Overflow, which publish no protected resource metadata at a well-known location, are no
longer withheld for that reason: the scanner read the challenge their endpoint returns to an
unauthenticated request, followed the `resource_metadata` pointer in it to the metadata
document, and judged every metadata-based requirement from that document. The well-known cell
stays `unsupported` (it was measured and the document is not there), the challenge cell is
`supported`, and the grade rule treats the pair as one requirement met.

**Why this priority**: This is the roadmap's reason for the feature: three of the listed
servers had no grade because of a mechanism the scanner did not look at, and the atlas said
nothing about which discovery mechanism any server offers.

**Independent Test**: Run the scanner over recorded responses for a server with no well-known
metadata and a 401 challenge that points at a metadata document; confirm the well-known cell is
`unsupported`, the challenge cell `supported`, the metadata cells judged from the pointed-at
document, and the grade not withheld for discovery. Confirm the scanner sent exactly one request
to the endpoint, with no credentials, and read no body from it.

**Acceptance Scenarios**:

1. **Given** a server with no metadata at either well-known location whose endpoint answers an
   unauthenticated request with 401 and a `WWW-Authenticate` challenge carrying
   `resource_metadata`, **When** the scan completes, **Then** `mcp.prm.well-known` is
   `unsupported`, `mcp.prm.www-authenticate` is `supported` with the endpoint URL and the pointer
   as evidence, the metadata document at the pointer is fetched and every metadata-based check is
   judged from it, and the grade is not withheld on account of discovery.
2. **Given** a server whose metadata is at a well-known location and whose endpoint also sends
   the challenge, **When** the scan completes, **Then** both discovery cells are `supported` and
   the metadata checks are judged from the well-known document.
3. **Given** a server whose metadata is at a well-known location and whose endpoint answers 401
   without a `resource_metadata` parameter, **When** the scan completes, **Then**
   `mcp.prm.www-authenticate` is `unsupported` with the challenge quoted as evidence, and the
   grade is unaffected, because the well-known mechanism is met.
4. **Given** a server whose endpoint answers 401 without any challenge, or with a challenge
   lacking `resource_metadata`, and no well-known metadata, **When** the scan completes, **Then**
   both discovery cells are `unsupported` and the grade is F, with both named as reasons.
5. **Given** an endpoint that answers an unauthenticated request with something other than 401
   (for example 403, 404, 405 or 200), **When** the scan completes, **Then**
   `mcp.prm.www-authenticate` is `unknown` with the status named, because no challenge was
   issued to judge, and no other cell changes because of it.
6. **Given** an endpoint that cannot be reached (timeout, connection, TLS, refused redirect,
   5xx), **When** the scan completes, **Then** `mcp.prm.www-authenticate` is `unknown` with the
   failure named, never `unsupported`.
7. **Given** a challenge whose `resource_metadata` pointer is not HTTPS, names a non-public host
   or address, or carries credentials or a port, **When** the scan completes, **Then** the pointer
   is not followed, the challenge cell is still judged from the header alone, and the metadata
   cells are `unknown` with the refusal named.

---

### User Story 2 - The atlas shows which discovery mechanism each server offers (Priority: P2)

A visitor opens the MCP auth atlas or a server's scan report and sees two measured cells for
discovery: metadata at a well-known location, and metadata announced in the challenge. A server
may support one, both, or neither; the report lists both with evidence, the grade rule explains
that one of the two is enough, and the scanner page says that one unauthenticated request to the
endpoint is made and why that is still passive.

**Why this priority**: The atlas already had the column; it was empty. Filling it is what makes
the "either of two ways" rule legible instead of a footnote.

**Independent Test**: Open the scanner page and confirm the list of what it reads includes the
challenge request and the request count; open a report for a server with both discovery cells
and confirm both appear with their evidence; confirm the challenge feature no longer appears
under "not checked by the scanner".

**Acceptance Scenarios**:

1. **Given** the scanner page, **When** it renders, **Then** "What it reads" lists the
   unauthenticated request to the endpoint, says the body is not read, and the request count and
   check count are correct.
2. **Given** a server report, **When** it renders, **Then** the challenge requirement is a check
   row with level, citation, status, evidence and date like every other, and is absent from the
   "not checked" list.
3. **Given** the grade rule as published, **When** a reader compares it with a report where one
   discovery cell is `unsupported` and the other `supported`, **Then** the rule's text explains
   why the grade is not F.

---

### Edge Cases

- The challenge names several schemes or several challenges in one header: the first
  `resource_metadata` parameter found is used; the whole header is quoted in the evidence, cut
  at the evidence limit.
- The `resource_metadata` pointer is the same URL as a well-known location that answered 404:
  it is fetched anyway (a server may serve it only when asked after a challenge); the result
  decides.
- The pointer is followed and the document is not JSON or cannot be fetched: the challenge cell
  stays `supported` (the pointer was announced), the metadata cells are `unknown` with the
  failure named.
- Both the well-known location and the pointer yield a document: the well-known document is
  judged; the report names the pointer as also found.
- The endpoint redirects: followed under the same rules as every other request (same host,
  HTTPS, at most three hops); otherwise the request is an error and the cell is `unknown`.
- The endpoint streams a response (a server with no authentication at all answers 200 with an
  event stream): the body is never read and the connection is closed after the headers; the cell
  is `unknown` with the status named. Such a server is a case for roadmap item 009, not for
  this check.
- The endpoint answers 405 to the request method used: `unknown` with the status named; a later
  scanner version may send the request the way a client's first call does. No second request is
  made in this version.
- The scanner version changes with this feature, so every cell is re-observed on the next run.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The scanner MUST make exactly one request to each scanned server's MCP endpoint
  per run, with no credentials, cookies, token or body, MUST read only the response's status and
  headers, and MUST close the connection without reading the body.
- **FR-002**: The scanner MUST judge `mcp.prm.www-authenticate` from that response: `supported`
  when the status is 401 and a `WWW-Authenticate` header carries a `resource_metadata`
  parameter; `unsupported` when the status is 401 and no such parameter is present; `unknown`
  when the status is anything else or the request failed, with the status or failure named in
  the evidence.
- **FR-003**: When no metadata document was found at a well-known location and the challenge
  carries a `resource_metadata` pointer, the scanner MUST fetch the document at that pointer
  under the same rules as every other metadata fetch (HTTPS, GET, no credentials, public host,
  same-host redirects only) and judge every metadata-based requirement from it; a document found
  at a well-known location MUST take precedence when both exist.
- **FR-004**: `mcp.prm.well-known` MUST continue to be judged from the well-known locations
  alone; a document reached only through the challenge MUST NOT make it `supported`.
- **FR-005**: The grade rule MUST treat the two discovery requirements as alternatives in both
  directions: a failing one counts as met when the other is `supported`, as `unknown` when the
  other is `unknown`, and as failing only when both fail.
- **FR-006**: The feature `mcp.prm.www-authenticate` MUST be marked passively observable in the
  data model, so the atlas, the report pages and the scanner derive the check from the data
  without a hard-coded list.
- **FR-007**: The scanner page, the scanner documentation and the nightly pull request summary
  MUST say that one unauthenticated request is sent to the endpoint, that no body is read, and
  how many requests a scan makes at most.
- **FR-008**: The scanner version MUST change with this feature, so that every cell is
  re-observed and no cell written by the previous version is mistaken for a measured one.
- **FR-009**: The evidence for the challenge cell MUST start with the endpoint URL, name the HTTP
  status, and quote the `resource_metadata` value or the header as received, deterministically
  and within the evidence length limit.

### Key Entities

No new entity and no new field. The feature file for `mcp.prm.www-authenticate` changes its
`observable` value from `active` to `passive`. Observations are written exactly as the scanner
writes every other cell (`method: passive-scan`, `observedBy: scanner@<version>`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After the first nightly run with this feature, every scanned server has a measured
  cell for `mcp.prm.www-authenticate`, and no server is withheld solely because its protected
  resource metadata is announced in the challenge rather than at a well-known location.
- **SC-002**: Over recorded responses, 100% of endpoint responses other than 401 and 100% of
  endpoint failures yield `unknown`; `unsupported` is written only for a 401 without a pointer
  (verified by unit tests).
- **SC-003**: The recorded request list for every fixture contains the endpoint URL exactly once,
  and the endpoint request carries no `Authorization` header and no body (verified by unit
  tests over the recording fetcher and by inspection of the one fetch function).
- **SC-004**: The grade rule over every combination of the two discovery statuses matches FR-005
  (verified by a unit test).
- **SC-005**: The scanner page and every report page still meet the site's budgets and pass the
  existing end-to-end tests with the check count derived from data.

## Assumptions

- The request to the endpoint is a `GET` with the `Accept` header an MCP client sends
  (`application/json, text/event-stream`), because that is the one request shape both transports
  accept (the SSE transport's endpoint is opened with `GET`; a streamable HTTP server's `GET`
  opens its listening stream, and its authorization check runs before either). A server that
  rejects `GET` with 405 before authenticating is recorded as `unknown`; a later version may
  send the first JSON-RPC call a client would, which is a wider step and is not taken here.
- Following the `resource_metadata` pointer is part of this feature, because without the
  document the metadata-based MUST-level checks stay `unknown` and the grade stays withheld, which
  would leave the roadmap's reason for the feature unmet. The pointer is a metadata URL the server
  itself published; fetching it is the same kind of request as the well-known fetches.
- The pointer may name another host than the endpoint (RFC 9728 does not forbid it); it is
  guarded like an issuer URL, not required to be on the endpoint's host.
- Servers listed as open or API-key are still neither scanned nor graded; nothing about that
  changes here (roadmap item 009 addresses it).
- Owner-verified active probes remain out of scope.
