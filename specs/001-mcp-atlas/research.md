# Research: MCP Atlas

Phase 0 output of `/speckit.plan`. All Technical Context unknowns are resolved below.

## R1. Site framework and island runtime

**Decision**: Astro 6 with `@astrojs/svelte` 9 and Svelte 5 for the single interactive island.

**Rationale**: The constitution fixes Astro and Svelte. Astro 6 is the current major; its Svelte
integration is at major 9 and requires Svelte 5 (Svelte 3/4 need `@astrojs/svelte@5`). Content
collections render the matrix, server and feature pages as plain HTML; only the matrix filter
and cell detail need client JavaScript, which keeps the JS budget trivially satisfied.

**Alternatives considered**: SvelteKit with prerendering (would make every page a Svelte
component and pull more JS); Eleventy (no first-class islands or typed collections).

**Source**: Astro v6 Svelte integration guide (v6.docs.astro.build), checked 2026-10-13.

## R2. Loading YAML data into content collections

**Decision**: Astro content collections with the built-in `glob` loader over `data/**/*.yaml`,
with the Zod schemas from `src/schema/` passed as the collection schema. Cross-reference checks
(a feature's `revisions[]` entries must resolve, an observation's `server` and `feature` must exist) run in
`scripts/validate-data.ts`, which the build invokes before Astro.

**Rationale**: The `glob` loader reads YAML natively, so data files need no front matter or
conversion, and the schema validation happens once at build time. Cross-reference checks are
not expressible in a per-entry schema, so a separate script does them and prints field-level
errors (FR-010).

**Alternatives considered**: A custom loader that validates references inline (more code,
same result); converting YAML to JSON in a prebuild step (loses readability of the source).

## R3. Feature catalogue for revision 2026-07-28

**Decision**: The atlas launches with the features below, each keyed to the section of the
2026-07-28 authorization specification that defines it. Level is the requirement level the
specification puts on the party the feature is observed on (the MCP server, or its authorization
server). `observable` says how a status can be established within this feature's rules (no server
is contacted by the atlas; `passive` and `active` mark what the later scanner may do).

| id | Name | Party | Level | Section (2026-07-28) | observable |
|---|---|---|---|---|---|
| `mcp.prm` | Protected Resource Metadata served (RFC 9728) | MCP server | MUST | Authorization Server Discovery › Authorization Server Location | passive |
| `mcp.prm.well-known` | PRM reachable at a well-known URI (path or root) | MCP server | MUST (one of two) | Authorization Server Discovery › Protected Resource Metadata Discovery Requirements | passive |
| `mcp.prm.www-authenticate` | `resource_metadata` in `WWW-Authenticate` on 401 | MCP server | MUST (one of two) | Authorization Server Discovery › Protected Resource Metadata Discovery Requirements | active |
| `mcp.prm.authorization-servers` | PRM lists at least one authorization server | MCP server | MUST | Authorization Server Discovery › Authorization Server Location | passive |
| `mcp.prm.scopes-supported` | PRM lists `scopes_supported` | MCP server | MAY | Authorization › Scope Selection Strategy | passive |
| `mcp.prm.no-offline-access` | `offline_access` absent from PRM scopes and challenges | MCP server | SHOULD | Authorization › Refresh Tokens | passive |
| `mcp.as.metadata` | AS metadata discoverable (RFC 8414 or OIDC Discovery) | Authorization server | MUST | Authorization Server Discovery › Authorization Server Metadata Discovery | passive |
| `mcp.as.issuer-match` | AS metadata `issuer` equals the issuer used to build the well-known URL | Authorization server | MUST | Authorization Server Discovery › Authorization Server Metadata Discovery | passive |
| `mcp.as.https` | All AS endpoints served over HTTPS | Authorization server | MUST | Security Considerations › Communication Security | passive |
| `mcp.as.pkce-s256` | `code_challenge_methods_supported` advertised and includes `S256` | Authorization server | MUST | Security Considerations › Authorization Code Protection | passive |
| `mcp.as.cimd` | Client ID Metadata Documents supported (`client_id_metadata_document_supported: true`) | Authorization server | SHOULD | Client Registration › Client ID Metadata Documents | passive |
| `mcp.as.dcr` | Dynamic Client Registration offered (`registration_endpoint`) | Authorization server | MAY (deprecated) | Client Registration › Dynamic Client Registration | passive |
| `mcp.as.preregistration` | Documented path to obtain pre-registered client credentials | Authorization server | SHOULD (client-side option) | Client Registration › Pre-registration | manual |
| `mcp.as.iss-param` | `authorization_response_iss_parameter_supported: true` (RFC 9207) | Authorization server | SHOULD | Authorization › Authorization Response Validation | passive |
| `mcp.as.resource-indicator` | Honours RFC 8707 `resource` and binds token audience | Authorization server | MUST (for binding) | Security Considerations › Token Audience Binding and Validation | manual |
| `mcp.as.refresh-rotation` | Rotates refresh tokens for public clients | Authorization server | MUST | Security Considerations › Token Theft | manual |
| `mcp.rs.bearer-header` | Accepts tokens only in the `Authorization: Bearer` header, never the query string | MCP server | MUST | Authorization › Access Token Usage | active |
| `mcp.rs.audience-validation` | Rejects tokens not issued for this server | MCP server | MUST | Security Considerations › Access Token Privilege Restriction | active |
| `mcp.rs.401-on-invalid` | Returns 401 for missing, invalid or expired tokens | MCP server | MUST | Authorization › Token Handling | active |
| `mcp.rs.scope-challenge` | Includes `scope` in the `WWW-Authenticate` challenge | MCP server | SHOULD | Authorization › Scope Selection Strategy | active |
| `mcp.rs.insufficient-scope` | Returns 403 with `error="insufficient_scope"` and required scopes | MCP server | SHOULD | Authorization › Scope Challenge Handling | active |
| `mcp.rs.no-passthrough` | Does not pass the client's token to upstream APIs | MCP server | MUST | Security Considerations › Access Token Privilege Restriction | manual |
| `mcp.proxy.consent` | Proxy with static upstream client obtains per-client user consent | MCP server (proxy) | MUST | Security Considerations › Confused Deputy Problem | manual |

Features that exist only on the client side (PKCE generation, scope union on step-up, `iss`
comparison without normalisation, `application_type` on DCR, credential keying by issuer) are
recorded in `data/features/` with party `client` so the explorer (003) can cite them, but the
atlas hides client-party features from the server matrix.

For the prior revision 2025-11-25 the same ids are reused where the requirement is unchanged;
`mcp.as.cimd` carries level `SHOULD` in both (it became the recommended method in 2025-11-25),
`mcp.as.dcr` moves from `SHOULD` (2025-11-25) to `MAY (deprecated)` (2026-07-28), and
`mcp.as.iss-param` plus the issuer-keyed credential requirements are new in 2026-07-28. The
revision diff view (User Story 5) is derived from these level changes.

**Rationale**: Every row above is a sentence in the specification with a MUST/SHOULD/MAY, so each
cell of the matrix cites a section (constitution II). Splitting PRM into its sub-requirements
matters because servers commonly serve PRM but omit `scopes_supported` or the 401 header.

**Alternatives considered**: One column per RFC (too coarse to be useful); mirroring the
`mcp-oauth-compliance` tester's check list (vendor-maintained and pinned to 2025-11-25).

**Sources**: MCP specification 2026-07-28, pages Authorization, Client Registration, Authorization
Server Discovery, Security Considerations (modelcontextprotocol.io), read 2026-10-13.

## R4. Seed list of public MCP servers

**Decision**: Seed from the `jaw9c/awesome-remote-mcp-servers` list (about 114 remote servers
with an authentication column: OAuth 2.1, OAuth 2.1 without DCR, API key, open), filtered to
servers that advertise OAuth 2.1, plus servers from vendor documentation that the maintainer
adds. Each server records `listed: public-directory` or `maintainer-added` and its source URL.
Servers that are API-key-only or open are listed with every authorization feature
`not-applicable` and a note, because their absence from the atlas would misrepresent the
ecosystem.

**Rationale**: Meets SC-001 (≥ 30 servers) from public sources and satisfies the confirmed
curated-with-opt-out listing policy. The list's auth column gives a first `vendor-claim`
observation for `mcp.as.dcr` on many servers.

**Alternatives considered**: The official MCP registry (not yet a reliable source for remote
auth details); vendor marketplaces (biased toward one client).

## R5. Status derivation and conflict rules

**Decision**: The current status of a cell is the newest observation for `(server, feature,
revision)`. On equal timestamps the stronger method wins: `active-scan` > `passive-scan` >
`manual` > `vendor-claim`. History is every other observation, newest first. Shares on feature
pages exclude `unknown` and `not-applicable` from the denominator and show both counts.

**Rationale**: Encodes the spec's edge cases as one pure function (`src/lib/atlas.ts`) that unit
tests pin down, so the matrix, server page and export cannot disagree.

**Alternatives considered**: Letting the newest observation always win regardless of method
(a stale manual note could then mask a scan done the same day).

## R6. Shareable filter state

**Decision**: Filters and search live in the URL query string (`?level=MUST&category=discovery&q=stripe`),
read by the island on load and written with `history.replaceState`. The server-rendered matrix
is complete without any parameters.

**Rationale**: FR-008 requires shareable links; query strings are the conventional, bookmarkable
form on a static host and need no client routing.

**Alternatives considered**: Hash state (works but is invisible to analytics and some link
previews); separate pre-rendered pages per filter (combinatorial).

## R7. Contribution path

**Decision**: Two paths, both ending in a PR. Contributors comfortable with git add an entry to
`data/observations/<server>.yaml` and open a PR; CI runs `validate:data` and fails with the
field-level message (FR-010, SC-005). Everyone else fills a GitHub issue form
(`.github/ISSUE_TEMPLATE/observation.yml`) whose required fields mirror the schema; the
maintainer converts it to a PR. Withdrawal requests use the same form with a dedicated type.

**Rationale**: Keeps the repository as the only write path (constitution IV) and gives
non-git contributors a form with the same required fields.

**Alternatives considered**: A hosted form writing to the repo via a bot (a backend, not needed
until the scanner exists).

## R8. Deployment to Bunny

**Decision**: GitHub Actions on push to `main`: `pnpm build`, then upload `dist/` to the Bunny
Storage Zone with the Storage API (HTTP `PUT` per file with the zone access key in the
`AccessKey` header), then purge the pull zone through the Bunny API. Storage zone in an EU
region; the pull zone's origin is the storage zone. Secrets: storage zone name and key, pull zone
id, API key.

**Rationale**: Bunny's own static-hosting guide uses storage zone + pull zone with Storage API
uploads; it does not document a purge step or a GitHub Action, so the workflow adds the purge
call explicitly. No third-party action is needed, which keeps the supply chain small.

**Alternatives considered**: Community Bunny deploy actions (convenient but an extra dependency
with repo-wide secrets); Bunny Edge Scripting as origin (not needed for a static site).

**Source**: Bunny static site hosting guide (bunny.net/docs/storage/static-site-hosting), read
2026-10-13.

## R9. Tooling baseline

**Decision**: pnpm, Node 22 LTS, Biome for lint and format, Vitest, Playwright with
`toHaveScreenshot` for the three page types in light and dark, `astro-pagefind` for search,
Lighthouse CI with the constitution's budgets, `pnpm check` as the one command that runs
validate:data, lint, typecheck, unit tests and build.

**Rationale**: Constitution VI. Each tool runs headless and prints actionable output for agents.

**Alternatives considered**: ESLint + Prettier (two tools, slower); Bun as runtime (less
predictable with Playwright and Astro at the time of writing).
