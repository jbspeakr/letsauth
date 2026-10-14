# Feature Specification: Scanner

**Feature Branch**: `004-scanner`

**Created**: 2026-10-14

**Status**: Draft

**Input**: User description: "Scanner: automates what the MCP Atlas (001) did by hand. Passive checks on public metadata, graded report, nightly PR with observations. First and only backend."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Wake up to a pull request of fresh observations (Priority: P1)

The maintainer no longer reads vendor documentation to fill the MCP auth atlas. Every night a
scanner reads the public authorization metadata of every listed server with an HTTP transport,
judges each passively observable requirement of the current MCP Authorization revision, and
opens one pull request that appends the results as observations, each with the metadata URL it
read as evidence. Nothing is merged without review; nothing is written to the data outside a pull
request; nothing is edited in place. A run that finds nothing new opens no pull request and says
so in its log.

**Why this priority**: This is the roadmap's definition of the feature ("automates what 001 did
by hand"). The atlas was seeded from documentation, which goes stale and often says nothing; the
scanner turns 12 of the 20 server-side requirements into measured, dated, re-checkable cells.

**Independent Test**: Run the scanner over the listed servers against recorded metadata
responses; confirm it produces one observation per passively observable requirement per server,
each citing the revision and section, with method `passive-scan`, observer `scanner@<version>`
and a URL as evidence; confirm that a second run over the same responses appends nothing; confirm
that a run where one server's metadata changed appends exactly the changed cells; confirm that an
unreachable server yields `unknown`, never `unsupported`.

**Acceptance Scenarios**:

1. **Given** a listed server whose protected resource metadata and authorization server metadata
   are reachable, **When** the nightly run completes, **Then** the pull request appends one
   observation per passively observable requirement with `status` derived from the metadata,
   `method: passive-scan`, the metadata URL as `evidence`, the current revision as `revision`,
   and a timestamp.
2. **Given** a server whose metadata cannot be fetched (timeout, connection refused, TLS
   failure), **When** the run completes, **Then** every requirement that depends on that
   document is recorded as `unknown` with the failure named in the evidence, and no cell is
   recorded as `unsupported` because of it.
3. **Given** a server whose current cell for a requirement already comes from the scanner with
   the same status and evidence, **When** the run completes, **Then** no new observation is
   appended for that cell.
4. **Given** a server whose current cell comes from documentation (`vendor-claim`) or a manual
   check, **When** the scanner judges the same requirement, **Then** a new observation is
   appended even when the status agrees, so the cell is now measured and dated.
5. **Given** a run that appends at least one observation, **When** it finishes, **Then** one pull
   request exists against `main` whose description lists each server scanned, the cells that
   changed, and the cells that could not be judged; CI runs the usual validation and the
   append-only check on it.
6. **Given** a run that appends nothing, **When** it finishes, **Then** no branch and no pull
   request are created.
7. **Given** a server with `transport: stdio-only` or a `withdrawn` entry, **When** the run
   starts, **Then** that server is not contacted.

---

### User Story 2 - Read a server's scan report (Priority: P2)

A visitor opens a server's report and sees, for the current revision, every requirement the
scanner can judge from public metadata: what was checked, which document and field decided it,
the status, when it was last confirmed, and the requirement's level and citation. The report
carries a grade computed from those results by a published rule, with the reasons listed under
it. A requirement the scanner could not judge is shown as unknown and never counts against the
server. A server that has not been scanned yet says so. An index lists every listed server with
its latest grade and the date of its newest scan.

**Why this priority**: The roadmap asks for a graded report; the positioning research calls the
product "SSL Labs for MCP auth". The report is where measured data becomes legible for the
engineer who runs a server, and the grade is what gets fixed.

**Independent Test**: With a server that has scanner observations for every passively observable
requirement, open its report and confirm the grade matches the published rule applied to those
statuses, every check shows status, evidence link, date, level and citation, and the index lists
the server with the same grade; with a server without scanner observations, confirm the report
says no scan has been recorded and shows no grade; with a server whose MUST-level cell is
unknown, confirm no letter grade is shown and the reason is named.

**Acceptance Scenarios**:

1. **Given** a server with scanner observations under the current revision, **When** the visitor
   opens its report, **Then** each passively observable requirement is listed with its level,
   citation, status, evidence link and the date of the newest scanner observation for it.
2. **Given** the same server, **When** the report renders, **Then** it shows a grade with the
   rule's reasons (which MUST or SHOULD requirements are unsupported or unknown), and the grade
   equals the published rule applied to the shown statuses.
3. **Given** a server where a MUST-level requirement is unknown, **When** the report renders,
   **Then** no letter grade is shown, the report says the grade is withheld and names the unknown
   requirement.
4. **Given** a server without any scanner observation, **When** the visitor opens its report,
   **Then** the report says no scan has been recorded, shows no grade, and links to the
   documentation-based cells on the server's atlas page.
5. **Given** the index, **When** it renders, **Then** every listed server appears in alphabetical
   order with its latest grade (or "not scanned" / "not graded") and newest scan date, and nothing
   is sorted or ranked by grade.
6. **Given** JavaScript is disabled, **When** either page renders, **Then** every report, grade,
   rule and link is present.

---

### User Story 3 - Scan any MCP server URL on demand (Priority: P3)

An engineer who runs an MCP server that is not in the atlas, or who has just changed one, enters
its URL and gets the same report within seconds: the metadata the scanner found, each
requirement's status and evidence, and the grade with its reasons. The on-demand scan reads only
public metadata, sends no credentials, starts no authorization flow, and stores nothing. The
result is not added to the atlas; the page says how a listed server's data changes (by pull
request) and how to list a server.

**Why this priority**: This is the backend the constitution reserves for the scanner, and the
reason the feature cannot be static. It makes the scanner useful to people whose server is not
listed and gives listed servers' owners a way to check a fix before the nightly run.

**Independent Test**: Request a scan for a URL served by a test fixture and confirm the response
is a report with the same shape and the same statuses the nightly scanner produces for that
fixture; request a scan for a non-HTTPS, private, loopback or malformed URL and confirm it is
refused with a message; confirm no request is sent anywhere but the well-known metadata
locations derived from the URL and from the discovered authorization server.

**Acceptance Scenarios**:

1. **Given** a reachable HTTPS MCP server URL, **When** the visitor submits it, **Then** the page
   shows a report with the same checks, statuses, evidence and grade rule as a listed server's
   report, labelled as not recorded.
2. **Given** an HTTP URL, a URL with a private, loopback or link-local address, a URL with
   credentials, or text that is not a URL, **When** it is submitted, **Then** the scan is refused
   and the message says why.
3. **Given** a URL whose metadata cannot be fetched, **When** the scan completes, **Then** the
   affected checks are unknown with the failure named, and the grade is withheld.
4. **Given** JavaScript is disabled, **When** the visitor opens the page, **Then** the form is
   shown with a note that the on-demand scan needs JavaScript, and the rest of the page (rules,
   index, how to run the scanner yourself) is complete.
5. **Given** the on-demand service is not configured for the site, **When** the page renders,
   **Then** the form is replaced by a note saying so and pointing at the command-line route.

---

### User Story 4 - Run the scanner yourself (Priority: P4)

A contributor runs one command against a server URL or a listed server id and sees the report in
the terminal. With a flag, the command appends the observations for a listed server to its data
file, in the same format and with the same rules the nightly run uses, so a pull request can be
opened by hand. The same command is what the nightly run and the container image execute.

**Why this priority**: One maintainer with agent support has to be able to reproduce any cell the
scanner wrote, and the contribution path for scanner data should be the same tool, not a parallel
one.

**Independent Test**: Run the command against the fixture server and a listed server id;
confirm the report in the terminal matches the report page's checks and grade; run it with the
write flag against a scratch copy of the data and confirm the appended entries validate and the
append-only check passes.

**Acceptance Scenarios**:

1. **Given** a server URL, **When** the command runs, **Then** it prints the report (checks,
   statuses, evidence, grade and reasons) and exits zero.
2. **Given** a listed server id and the write flag, **When** the command runs, **Then** the
   observations that the nightly rule would append are appended to that server's data file, and
   `pnpm validate:data` and the append-only check pass afterwards.
3. **Given** a URL that is refused by the on-demand rules, **When** the command runs, **Then** it
   prints the reason and exits non-zero.

---

### Edge Cases

- The protected resource metadata is not at either well-known location: the well-known
  requirement is unsupported (it is a MUST), the "metadata served" requirement is unknown (the
  document may be announced only in a challenge the passive scan does not provoke), and every
  authorization-server check is unknown because no authorization server was discovered.
- The metadata lists several authorization servers: the first is checked and the report names the
  others as not checked; a later revision of the scanner may check all of them.
- The authorization server metadata is found under one well-known location but not the others:
  found is found; the report names the location.
- The metadata document is served with the wrong content type but parses as JSON: it is used and
  the report notes the content type. A document that does not parse is "not found" at that URL.
- A redirect leads to a different host or to plain HTTP: the fetch is treated as failed and the
  check is unknown, with the redirect target named.
- A server answers slowly or not at all: the fetch times out and the check is unknown.
- A server returns an error status (5xx) for the well-known URL: unknown, not unsupported, because
  the document may exist and the server may be unhealthy.
- The MCP endpoint URL has no path: the path-aware well-known URL and the root well-known URL are
  the same; it is fetched once.
- The scanner version changes: every cell is re-observed on the next run, because the observer
  string differs and the rule treats a cell written by an older scanner as not yet measured by
  this one.
- The current revision changes: observations cite the revision they were made against; the nightly
  run scans against the new current revision and the old cells stay under the old revision.
- Two listed servers share an authorization server: the metadata is fetched once per server,
  cached within a run, and each server's observations cite it.
- A listed server is withdrawn between runs: it is skipped; its earlier scanner observations stay
  in history.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The scanner MUST judge every feature of the current MCP Authorization revision whose
  `observable` is `passive` and whose `party` is the MCP server or its authorization server, and
  MUST NOT judge any other feature.
- **FR-002**: The scanner MUST send only `GET` requests, only over HTTPS, only to the well-known
  metadata locations derived from the server URL and from the discovered authorization server
  issuer, with no credentials, no cookies, no authorization flow, and MUST follow no redirect to
  another host or to plain HTTP.
- **FR-003**: Every status the scanner writes MUST be one of supported, partial, unsupported,
  unknown; a document that could not be fetched or parsed MUST yield `unknown` for every check that
  depends on it, with the failure named in the evidence; `unsupported` MUST be written only when
  a document was fetched and the required field or value is absent or wrong.
- **FR-004**: Every observation the scanner writes MUST carry `method: passive-scan`,
  `observedBy: scanner@<version>`, the revision and feature it judged against, the metadata URL it
  read as the start of `evidence`, and a short deterministic note of the field and value that
  decided the status, so two runs over the same responses produce byte-identical evidence.
- **FR-005**: The scanner MUST append an observation for a cell only when the cell's current
  observation is not from the same scanner version or differs in status or evidence; it MUST
  never edit or remove an existing observation.
- **FR-006**: The nightly run MUST scan every listed server that is not withdrawn and has an HTTP
  transport, MUST open at most one pull request per run, MUST open none when nothing was
  appended, and the pull request description MUST list the servers scanned, the cells appended
  and the checks that could not be judged.
- **FR-007**: Each listed server MUST have a report page at a stable address showing, for the
  current revision, every passively observable requirement with its level, citation, status,
  evidence link and the date of the newest scanner observation, and the report MUST show a grade
  with its reasons or say why the grade is withheld; a server without scanner observations MUST
  say so and show no grade.
- **FR-008**: The grade MUST be derived only from the statuses the report shows, by this rule, and
  the rule MUST be published next to every grade: a MUST-level check that is unsupported or partial
  gives F; otherwise a MUST-level check that is unknown withholds the grade; otherwise a
  SHOULD-level check that is unsupported or partial gives C; otherwise a SHOULD-level check that is
  unknown gives B; otherwise A. MAY-level and deprecated requirements never affect the grade.
- **FR-009**: The scanner index MUST list every listed server alphabetically with its latest grade
  (or that it is not scanned or not graded) and the date of its newest scanner observation, MUST
  link each to its report, and MUST NOT order or rank servers by grade anywhere on the site.
- **FR-010**: The on-demand service MUST accept an MCP server URL and return the same report
  shape as the report page, MUST refuse URLs that are not HTTPS, that resolve to private,
  loopback, link-local or otherwise non-public addresses, that carry credentials, or that are
  malformed, MUST store nothing about the request beyond operational logs, and MUST rate-limit
  callers.
- **FR-011**: The on-demand page MUST read fully without JavaScript, MUST say that the on-demand
  scan itself needs JavaScript, and MUST say when the service is not configured.
- **FR-012**: One command MUST run the scanner against a URL or a listed server id, print the
  report, and with a flag append the observations the nightly rule would append; the nightly run
  and the container image MUST use that same command.
- **FR-013**: The report MUST be available as JSON at a stable address per listed server and from
  the on-demand service, with one documented shape and a version field.
- **FR-014**: The scanner MUST identify itself in a `User-Agent` header that names the project and
  links to a page explaining what it does and how to opt out.
- **FR-015**: Nothing the scanner does MUST contact a server during the site build; the site reads
  scanner results only from the repository's data.

### Key Entities

Defined in the shared data model (`docs/data-model.md`); the scanner reads Server, Feature, Spec
and Revision and writes Observation. It adds no entity. A report is a derived view: the set of
newest scanner observations per (server, feature) under the current revision, plus a grade
computed from them at render time.

- **Observation** (written): one dated statement per server and feature with method
  `passive-scan`, observer `scanner@<version>`, evidence starting with the metadata URL.
- **Report** (derived, not stored): target, revision, the checks with their statuses and evidence,
  the requests made, the documents discovered, and the grade with reasons.
- **Grade** (derived): a letter A, B, C or F, or withheld, with the reasons that produced it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After the first nightly run, every listed server with an HTTP transport has a
  scanner observation for each of the 12 passively observable requirements of the current
  revision, each with a URL as evidence, and `pnpm validate:data` and the append-only check pass
  on the pull request.
- **SC-002**: 100% of scanner observations with status `unsupported` cite a document that was
  fetched; 100% of fetch failures are recorded as `unknown` (verified by unit tests over recorded
  responses, including timeouts and error statuses).
- **SC-003**: A second run over unchanged responses appends zero observations (verified by a unit
  test).
- **SC-004**: The grade on every report equals the published rule applied to the shown statuses
  (verified by a unit test over every combination of levels and statuses).
- **SC-005**: An on-demand scan of a reachable server returns within 15 seconds; a refused URL is
  answered within 1 second with the reason.
- **SC-006**: The on-demand service sends requests only to HTTPS well-known metadata URLs on public
  hosts (verified by a unit test that records every request the service makes for fixture
  servers, private addresses and redirecting responses).
- **SC-007**: Report pages and the index meet the site's budgets: Lighthouse performance and
  accessibility at or above 95, no horizontal scroll at phone width, no serious accessibility
  violation.
- **SC-008**: Every cell the scanner wrote is reproducible by one command from the repository
  (verified by running the command against a listed server and comparing with the report page).

## Assumptions

- Passive means: public metadata only. The scanner reads the protected resource metadata at the
  two well-known locations RFC 9728 and the MCP specification derive from the server URL, and the
  authorization server metadata at the well-known locations RFC 8414 and OpenID Connect Discovery
  derive from the issuer. It never sends a request to the MCP endpoint itself, so the
  `WWW-Authenticate` challenge and every token-handling requirement (`observable: active`) stay out
  of scope; they belong to a later feature with owner verification.
- The nightly run executes as a scheduled GitHub Actions workflow at launch, because the project
  already runs its checks there and no account or secret is needed beyond the repository token.
  The constitution names Scaleway Serverless Containers and Object Storage for the backend; the
  on-demand service ships as a container image built for that platform, and the nightly run can
  move to a Scaleway scheduled job running the same image once the owner sets the account up.
  The plan records this in Complexity Tracking.
- The on-demand service stores nothing, so shareable report URLs (results in object storage,
  edge redirects) are deferred to a later revision of the scanner; the report JSON can be saved
  by the visitor.
- Active probes and owner verification (proving control of a server to run requests against its
  endpoint) are out of scope for this feature.
- The grade is a property of one report at one time, computed from data in the model by a
  published rule; it is shown on report pages and in the scanner index, never used to sort or
  rank servers, and never shown in the atlas matrix.
- The scanner judges against the current revision only. Older revisions are not re-scanned.
- When the metadata lists several authorization servers, the first is judged in this revision of
  the scanner.
- `partial` is written only for the HTTPS check when some but not all endpoints use HTTPS.
- Evidence strings are deterministic: they contain the URL, the HTTP status, and the field and
  value that decided the status, and never a timestamp or a request id.
- Visitors of the on-demand page are not identified; the service keeps only short-lived rate-limit
  counters in memory and standard access logs.
