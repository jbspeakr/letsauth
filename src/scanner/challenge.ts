/**
 * Reads a `WWW-Authenticate` value for the `resource_metadata` pointer RFC 9728 §5.1 defines
 * (research R5). Tolerant on purpose: several challenges may be joined by commas, several
 * headers may have been joined by `fetch`, and a server's formatting quirk must not become an
 * `unsupported` cell. The header is quoted in the evidence either way.
 */

export interface Challenge {
  /** The first `resource_metadata` value found, unquoted. */
  resourceMetadata?: string;
  /** Every authentication scheme the value names, in order (for example `Bearer`). */
  schemes: string[];
}

const SCHEME = /(?:^|,)\s*([A-Za-z][A-Za-z0-9._~+/-]*)(?=\s*(?:,|$)|\s+[^=\s,]+\s*=)/g;
const PARAM = /resource_metadata\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^\s,;"]+))/i;

export function parseChallenge(header: string | undefined | null): Challenge {
  const text = (header ?? "").trim();
  const schemes: string[] = [];
  if (text === "") return { schemes };
  for (const m of text.matchAll(SCHEME)) {
    const scheme = m[1];
    if (scheme && !/^[^=]+=/.test(scheme)) schemes.push(scheme);
  }
  const p = PARAM.exec(text);
  const raw = p?.[1] !== undefined ? p[1].replace(/\\(.)/g, "$1") : p?.[2];
  const resourceMetadata = raw?.trim();
  return resourceMetadata ? { resourceMetadata, schemes } : { schemes };
}
