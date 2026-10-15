# Quickstart: Discovery challenge check

Everything that reads a real server runs on the Scaleway job or by the maintainer; the
implementation container has no outbound network to third-party hosts. The scenarios below run
against the recorded responses under `tests/fixtures/scanner/`.

| # | Scenario | How to verify |
|---|---|---|
| 1 | Pointer only: no well-known document, 401 with `resource_metadata` | `pnpm test` → `scanner-checks.test.ts` "challenge-pointer": well-known `unsupported`, challenge `supported`, PRM checks judged from the pointer, grade not withheld for discovery; requests: two well-known, the endpoint, the pointer, the AS |
| 2 | Both mechanisms | "complete" fixture now answers 401 with a pointer: both discovery cells `supported`, metadata judged from the well-known document, no pointer request |
| 3 | 401 without a pointer, well-known present | "challenge-no-pointer": challenge `unsupported`, grade unaffected |
| 4 | 401 without a pointer, no well-known | "challenge-neither": both `unsupported`, grade F with both reasons |
| 5 | Endpoint answers 403 / 405 | "challenge-405", every existing fixture without an endpoint entry (404): challenge `unknown`, status named |
| 6 | Endpoint unreachable | "challenge-timeout": `unknown`, failure named |
| 7 | Pointer refused by the guard | "challenge-pointer-private" with a refusing guard: challenge `supported`, PRM checks `unknown` with the refusal named, pointer not fetched |
| 8 | Headers only | `fetch.ts` challenge mode cancels the body before reading; `scanner-checks.test.ts` asserts the endpoint request record has `ok: false` and no JSON |
| 9 | Grade symmetry | `scanner-grade.test.ts`: every combination of the two discovery statuses |
| 10 | Pages | `pnpm build && pnpm test:e2e`: check counts derived from data; the scanner page names the endpoint request; the challenge feature is a report row, not a "not checked" entry |
| 11 | Live | After merge and deploy, the next nightly pull request shows Atlassian, Plaid and Stack Overflow with a measured challenge cell and, when their pointer resolves, a grade |
