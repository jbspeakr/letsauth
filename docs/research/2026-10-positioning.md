# letsauth.eu positioning research (October 2026)

Desk research from public sources. Scores are judgement calls, not measurements.

## Recommendation

Skip the auth news aggregator. Make letsauth.eu the open, vendor-neutral lab where you can see,
test and break agent authorization, with a European lens: SSL Labs plus an interactive flow
reference, for MCP, A2A and agent delegation. Lead with an interactive Delegation Chain Explorer,
add a passive MCP auth scanner second, and turn the newsletter into the changelog of what the lab
learned.

## Why the aggregator idea is weak now

The original plan (OIDC, OAuth, passkeys, MFA, SSO, vulnerabilities) covers ground that is
already saturated. Vendors such as WorkOS, Descope, Auth0, Scalekit, Nango and Stytch publish
detailed explainers within days of every spec change. Analysts (Forrester, CSA) publish recaps.
Several generic "agentic AI" newsletters exist.

Three structural problems follow. A summary of other people's writing is what an LLM produces for
free, so it has no defensible value. A newsletter does not compound: issue 40 is not more useful
because issue 1 exists. And a one-person aggregator cannot outpace funded vendor content teams.

What does compound is an asset people return to and link from their own docs, issues and talks: a
tool, a test, a reference.

## What is moving in agent auth

| Item | Status | Why it matters |
|---|---|---|
| MCP authorization spec 2026-07-28 | shipped | Deprecates Dynamic Client Registration in favour of Client ID Metadata Documents, requires RFC 9207 `iss` checks and issuer-keyed credentials, removes sessions. Many existing clients break silently. |
| Enterprise-managed authorization (ID-JAG, Cross App Access) | shipping | The enterprise IdP issues an identity assertion that the agent swaps for an access token. Okta, WorkOS and Scalekit ship it. Few people can explain the flow. |
| IETF WIMSE and agent drafts (draft-klrc-aiagent-auth, draft-ietf-wimse-aims, draft-ni-wimse-ai-agent-identity) | drafts | Workload identity, SPIFFE-style trust domains and token exchange applied to agents. Terminology has not converged. |
| AAuth (draft-hardt-oauth-aauth-protocol, rev. 09) | draft | A new agent-first auth protocol proposal from one of OAuth 2.0's editors. Competes with the "profile OAuth" approach. |
| DAWN (agent discovery) | proposed WG | Discovery only. Explicitly does not define agent identity, which the press often gets wrong. |
| A2A 1.0 signed Agent Cards | shipped | Agent-to-agent discovery with declared security schemes and signatures. |
| auth.md (WorkOS) | new | A Markdown file that tells agents how to sign up for an API and get credentials on a user's behalf. |
| NIST NCCoE concept paper on software and AI agent identity | consultation | Regulators expect agent identity and authorization to become auditable. |
| CVE-2026-27124 (FastMCP OAuthProxy) | disclosed | A confused-deputy consent bypass. The first of a class of bugs created by proxying OAuth for MCP. |

## What already exists, and what it leaves open

| Category | Examples | Limit |
|---|---|---|
| News and analysis | Vendor blogs, Forrester and CSA notes, generic agentic newsletters | Vendor-tilted, text only, no way to try anything |
| Flow references | Auth0's Identiflows (Sept 2026), WebSequenceDiagrams MCP page | Identiflows covers 8 classic flows. No agent, MCP, token exchange or multi-hop delegation flows yet |
| Conformance testers | mcp-oauth-compliance (npm), online MCP security scanners, MCP Inspector | Run against one server by its owner. Pinned to older spec revisions. No public, over-time picture of the ecosystem |
| Vendor hubs | Descope Agentic Identity Hub, Auth0 for AI Agents docs, Entra Agent ID | Good docs, but they explain the flow through one product |
| Standards tracking | IETF Datatracker, one-off research notes | Raw or point-in-time. No map of how the drafts across IETF, OpenID, MCP and A2A relate |

Gaps:

- **Delegation is invisible.** Nobody shows what a token looks like at each hop of user, agent,
  sub-agent, MCP server and API, or where scope should narrow and doesn't.
- **No neutral conformance picture.** Nobody answers "how many public MCP servers validate `iss`,
  bind audience, or still rely on DCR?" over time.
- **No map of the standards.** WIMSE, AAuth, ID-JAG, DAWN, auth.md and A2A overlap. Practitioners
  need one view of what solves what.
- **Vulnerabilities are news, not lessons.** CVEs get headlines but no reproducible anatomy.
- **No European lens.** eIDAS 2.0 and the EUDI wallet, the AI Act and NIS2 all touch agent
  delegation. US-centric vendors rarely cover this.

## Candidate concepts

Scored for uniqueness, compounding value, audience pull, and effort (higher is more effort).

| Concept | Uniqueness | Compounding | Pull | Effort |
|---|---|---|---|---|
| A. Delegation Chain Explorer (recommended first build) | 5 | 4 | 5 | 3 |
| B. Agent Auth Observatory / scanner | 4 | 5 | 4 | 4 |
| C. Agent Auth Atlas | 4 | 4 | 3 | 2 |
| D. Breach Anatomy | 4 | 3 | 4 | 2 |
| E. Agents under EU rules | 5 | 3 | 3 | 3 |

**A. Delegation Chain Explorer.** Interactive step-through simulator. Pick a scenario (MCP with
enterprise IdP via ID-JAG, A2A orchestrator to sub-agent, agent signup via auth.md, workload to
workload via WIMSE), watch each request, see the decoded token at every hop, toggle attacks or
misconfigurations (token passthrough, missing audience binding, skipped consent as in
CVE-2026-27124, scope accumulation across hops, missing `iss` check). Every step links to the exact
spec section and revision. Runs in the browser.

**B. Agent Auth Observatory.** An "SSL Labs for MCP auth". Enter a server URL and get a graded
report against the current revision: protected resource metadata, authorization server metadata,
PKCE S256, resource indicators, CIMD support, `iss` handling. Passive checks on public metadata by
default, active tests only for verified owners. The aggregate becomes original research.

**C. Agent Auth Atlas.** A living map of every relevant spec and draft, drawn as a graph of
"builds on", "competes with" and "solves the same problem as", with status per node and a "what
changed and what breaks" diff per revision.

**D. Breach Anatomy.** Each agent-auth vulnerability becomes an interactive replay inside the
Explorer plus a small lab to reproduce and fix it. Can grow into a kata track for workshops.

**E. Agents under EU rules.** Agent mandates and power-of-attorney credentials with the EUDI
wallet, SD-JWT VCs as agent credentials, AI Act oversight, NIS2 duties, as Explorer scenarios plus
long-form explainers.

After discussion, the MCP Atlas (servers against spec features) was added as the first build,
because it is the quickest unique win and forces the shared data model to be right. See
`docs/roadmap.md`.

## Value proposition

For engineers building MCP servers, agent platforms and IdP integrations, and the architects who
approve them, letsauth.eu is the place to see and test how authority flows through agent systems.
Unlike vendor hubs and newsletters, it is neutral, hands-on, tied to the exact spec revision, and
covers European regulation that others ignore.

Three tests keep it honest: an LLM cannot produce the content by summarising the web; each piece
of work makes the whole site more useful; one person can maintain it.

## Risks

- **Spec churn.** The MCP spec changed its auth model twice in a year. Version every scenario and
  observation against a revision so old pages stay correct.
- **Scanning third parties.** Keep default checks passive. Active probes only with proven
  ownership, as SSL Labs and Hardenize do.
- **Vendor competition.** Auth0 started Identiflows in September 2026 and could add agent flows.
  Neutrality, attack toggles and the EU lens are things a vendor is unlikely to copy.
- **Bandwidth.** Start small. Later features reuse earlier engines and data.

## Sources

- [MCP Authorization Spec 2026-07-28: What Changed and What Breaks](https://ssojet.com/blog/mcp-authorization-spec-2026-07-28-what-changed) (SSOJet)
- [MCP specification 2026-07-28, Authorization](https://modelcontextprotocol.net/specification/2026-07-28/basic/authorization.md)
- [MCP specification ships enterprise-managed authorization](https://startwithidentity.com/blog/2026-07-28-mcp-specification-ships-enterprise-managed-authorization/) (Start with Identity)
- [MCP enterprise-managed authorization and ID-JAG](https://workos.com/blog/mcp-enterprise-managed-authorization-id-jag) (WorkOS)
- [Cross App Access (XAA) product update](https://www.scalekit.com/product-updates/cross-app-access-xaa) (Scalekit)
- [IETF's Race to Standardize AI Agent Identity](https://labs.cloudsecurityalliance.org/research/csa-research-note-ietf-agent-identity-standards-20260902-csa/) (CSA, Sept 2026)
- [draft-klrc-aiagent-auth](https://datatracker.ietf.org/doc/draft-klrc-aiagent-auth/02/) (IETF)
- [draft-ietf-wimse-aims](https://datatracker.ietf.org/doc/html/draft-ietf-wimse-aims) (IETF)
- [draft-hardt-oauth-aauth-protocol-09](https://www.ietf.org/archive/id/draft-hardt-oauth-aauth-protocol-09.html) (IETF)
- [A2A Protocol 1.0: Identity and Signed Agent Cards](https://api7.ai/blog/a2a-protocol-gateway-layer) (API7)
- [auth.md agent signup](https://zuplo.com/blog/auth-md-agent-signup) (Zuplo)
- [NIST NCCoE concept paper on software and AI agent identity](https://www.nccoe.nist.gov/sites/default/files/2026-02/accelerating-the-adoption-of-software-and-ai-agent-identity-and-authorization-concept-paper.pdf)
- [CVE-2026-27124](https://nvd.nist.gov/vuln/detail/CVE-2026-27124) (NVD)
- [Identiverse 2026 Recap](https://www.forrester.com/blogs/identiverse-2026-recap-identity-security-for-agentic-ai-dominates/) (Forrester)
- [Introducing Identiflows](https://auth0.com/blog/introducing-identiflows-a-visual-reference-for-identity-flows/) (Auth0)
- [mcp-oauth-compliance README](https://cdn.jsdelivr.net/npm/mcp-oauth-compliance@0.2.1/README.md) (npm)
- [MCP Security Scanner](https://mcpplaygroundonline.com/mcp-security-scanner.md) (MCP Playground)
- [Descope Agentic Identity Hub](https://docs.descope.com/agentic-identity-hub/use-cases)
