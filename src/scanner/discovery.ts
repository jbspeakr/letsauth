import type { FetchMode, FetchResult } from "./fetch";

/**
 * How the probe discovers each source (010). The endpoint is asked in a ladder: one request per
 * step, the next step only when the previous answer says the request did not reach the
 * authentication step. Every step is unauthenticated, sends no JSON-RPC message, and reads only
 * the status and the WWW-Authenticate header. Adding a way to reach a server's challenge is
 * adding a step here; the checks never know which step answered, only the report does.
 */

export interface EndpointStep {
  /** Short and stable; named in the report and the evidence. */
  id: string;
  /** The request, in words, for the documentation and the scanner page. */
  title: string;
  mode: FetchMode;
  /** Whether to take this step, given the answers so far (in order). */
  when: (previous: readonly FetchResult[]) => boolean;
}

/**
 * A definite answer that is not a challenge, or a redirect the scanner would not follow: the
 * request was routed somewhere other than the authentication step. A failure to connect, a
 * timeout, TLS or a 5xx says nothing about the method, so the ladder stops there.
 */
export function routedElsewhere(answer: FetchResult | undefined): boolean {
  if (!answer) return false;
  return answer.kind === "absent" || answer.error === "redirect";
}

export const ENDPOINT_LADDER: readonly EndpointStep[] = [
  {
    id: "get",
    title:
      "one unauthenticated GET with the Accept header an MCP client sends: the request that opens an SSE transport or a streamable HTTP server's listening stream",
    mode: "challenge",
    when: () => true,
  },
  {
    id: "post-empty",
    title:
      "when the GET answered with any status but 401, or a redirect away from the host: one unauthenticated POST with an empty body and the JSON content type, which a streamable HTTP server that answers GET with 405 (as the transport allows) authenticates like a client's first call; it carries no JSON-RPC message, so there is nothing to act on",
    mode: "challenge-post",
    when: (previous) => routedElsewhere(previous[previous.length - 1]),
  },
];

/** The most requests one scan can make: PRM (2), the endpoint ladder, the pointer (1), the AS (3). */
export const MAX_REQUESTS = 2 + ENDPOINT_LADDER.length + 1 + 3;

/**
 * A note for the maintainer when the listed URL itself looks wrong: every step of the ladder got
 * a "gone" answer, or a redirect off the host. Never an observation; the summary carries it.
 */
export function endpointNote(answers: readonly FetchResult[]): string | undefined {
  if (answers.length === 0) return undefined;
  const statuses = answers.map((a) => a.status);
  if (statuses.every((s) => s === 404 || s === 410)) {
    const hint = /\/sse\/?$/.test(answers[0]?.url ?? "")
      ? "; servers that retired an /sse path usually answer at /mcp"
      : "";
    return `the listed URL answered HTTP ${statuses.join(" and ")} to every request; the endpoint may have moved${hint}`;
  }
  const redirect = answers.find((a) => a.error === "redirect");
  if (redirect && answers.every((a) => a.error === "redirect")) {
    return `the listed URL redirects (${redirect.detail ?? "not followed"}); it may be a landing page rather than the endpoint`;
  }
  return undefined;
}
