import type { Citation, RevisionRef } from "../schema";
import type { Dataset } from "./data";

export interface ResolvedCitation {
  specId: string;
  specName: string;
  revisionId: string;
  revisionDate: string;
  url: string;
  section?: string;
}

/** Resolves a revision reference to its document, or throws so the build fails on a dangling ref. */
export function resolveRevision(data: Dataset, ref: RevisionRef): ResolvedCitation {
  const spec = data.specs.find((s) => s.id === ref.spec);
  const revision = spec?.revisions.find((r) => r.id === ref.revision);
  if (!spec || !revision) {
    throw new Error(`dangling citation: revision "${ref.revision}" of spec "${ref.spec}"`);
  }
  return {
    specId: spec.id,
    specName: spec.name,
    revisionId: revision.id,
    revisionDate: revision.date,
    url: revision.url,
  };
}

/** Resolves a citation (a feature's per-revision entry, or a scenario step's) with its section. */
export function resolveCitation(data: Dataset, entry: Citation): ResolvedCitation {
  return { ...resolveRevision(data, entry), section: entry.section };
}
