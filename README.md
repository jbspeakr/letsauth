# letsauth.eu

An open, vendor-neutral lab for seeing, testing and breaking how AI agents are authorized: MCP,
A2A and agent delegation meet OAuth, OpenID Connect and workload identity, with a European lens.

Live:

- [letsauth.eu/atlas/mcp](https://letsauth.eu/atlas/mcp/), the MCP auth atlas: which public MCP
  servers support which features of the MCP Authorization specification. Data export:
  [`/atlas/mcp/data.json`](https://letsauth.eu/atlas/mcp/data.json). Contribute:
  [letsauth.eu/atlas/mcp/contribute](https://letsauth.eu/atlas/mcp/contribute/).
- [letsauth.eu/atlas/standards](https://letsauth.eu/atlas/standards/), the agent auth atlas: the
  specifications, drafts and EU acts behind agent authorization as one map of what builds on,
  profiles, competes with and replaces what, with maturity and dated revisions per document.
  Data export: [`/atlas/standards/data.json`](https://letsauth.eu/atlas/standards/data.json).
- [letsauth.eu/explorer](https://letsauth.eu/explorer/), the delegation chain explorer: scenarios
  of how authority travels from a person to an agent to an API, step by step, with the decoded
  token at each hop and toggles for the attacks and misconfigurations that break the chain. Every
  step cites a specification revision. Data export: [`/explorer/data.json`](https://letsauth.eu/explorer/data.json).
- [letsauth.eu/scanner](https://letsauth.eu/scanner/), the passive scanner: reads each listed
  server's public OAuth metadata, grades it against the MCP Authorization specification and
  opens a nightly pull request of observations. Report per server at `/scanner/<id>/` and
  `/scanner/<id>.json`; the command behind it is `pnpm scan <url>` (see
  [`docs/scanner.md`](docs/scanner.md)).

Start here:

- [`.specify/memory/constitution.md`](.specify/memory/constitution.md) – the meta plan: mission,
  principles, stack, workflow.
- [`docs/data-model.md`](docs/data-model.md) – the shared model every product is a view on.
- [`docs/roadmap.md`](docs/roadmap.md) – feature order and status.
- [`specs/`](specs/) – one Spec Kit feature spec per product.
- [`docs/research/`](docs/research/) – the research that led here.

The project follows [Spec Kit](https://github.com/github/spec-kit): constitution → spec → plan →
tasks → implement.

## Working on the site

```sh
pnpm install
pnpm dev            # http://localhost:4321
pnpm validate:data  # after editing data/
pnpm check          # validate, lint, typecheck, unit tests, build
pnpm test:e2e       # Playwright against the built site
pnpm scan <url>     # passive scan of one MCP server (--write appends observations)
```

See [`CLAUDE.md`](CLAUDE.md) for conventions, [`docs/atlas-maintenance.md`](docs/atlas-maintenance.md)
for data changes and [`docs/deploy.md`](docs/deploy.md) for hosting.

## Licences

Code is [MIT](LICENSE). Data under `data/` and the JSON exports are [CC BY 4.0](LICENSE-DATA).
