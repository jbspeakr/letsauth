import { z } from "zod";

export const kebabId = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "kebab-case id expected");
export const httpsUrl = z.url({ protocol: /^https$/ });
export const isoDate = z.iso.date();
export const isoDateTime = z.iso.datetime({ offset: true });

export const revisionStatus = z.enum(["draft", "current", "superseded", "withdrawn", "final"]);
export type RevisionStatus = z.infer<typeof revisionStatus>;

export const revisionSchema = z.object({
  id: z.string().min(1),
  date: isoDate,
  status: revisionStatus,
  url: httpsUrl,
  supersedes: z.string().min(1).optional(),
  changes: z.string().min(1).optional(),
});
export type Revision = z.infer<typeof revisionSchema>;

export const specBody = z.enum([
  "ietf-oauth",
  "ietf-wimse",
  "ietf-other",
  "openid",
  "mcp",
  "a2a",
  "vendor",
  "eu",
]);
export const specFamily = z.enum([
  "protocol",
  "profile",
  "discovery",
  "credential-format",
  "regulation",
]);

export const specSchema = z
  .object({
    id: kebabId,
    name: z.string().min(1),
    body: specBody,
    family: specFamily,
    summary: z.string().min(1),
    url: httpsUrl,
    revisions: z.array(revisionSchema).min(1),
  })
  .superRefine((spec, ctx) => {
    const ids = new Set<string>();
    for (const [i, rev] of spec.revisions.entries()) {
      if (ids.has(rev.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["revisions", i, "id"],
          message: "duplicate revision id",
        });
      }
      ids.add(rev.id);
      if (rev.supersedes && !ids.has(rev.supersedes)) {
        ctx.addIssue({
          code: "custom",
          path: ["revisions", i, "supersedes"],
          message: `must name an earlier revision of this spec, got "${rev.supersedes}"`,
        });
      }
    }
    const current = spec.revisions.filter((r) => r.status === "current").length;
    if (current !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["revisions"],
        message: `exactly one revision must have status "current", found ${current}`,
      });
    }
  });
export type Spec = z.infer<typeof specSchema>;

/** Reference to one revision of one spec. */
export const revisionRefSchema = z.object({
  spec: kebabId,
  revision: z.string().min(1),
});
export type RevisionRef = z.infer<typeof revisionRefSchema>;
