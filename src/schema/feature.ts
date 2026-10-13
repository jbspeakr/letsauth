import { z } from "zod";
import { kebabId } from "./spec";

export const featureId = z
  .string()
  .regex(/^[a-z0-9]+(\.[a-z0-9-]+)+$/, "dotted feature id expected, e.g. mcp.as.cimd");

export const featureLevel = z.enum(["MUST", "SHOULD", "MAY", "DEPRECATED", "REMOVED"]);
export type FeatureLevel = z.infer<typeof featureLevel>;

export const featureCategory = z.enum([
  "discovery",
  "registration",
  "authorization",
  "token",
  "session",
  "transport",
  "delegation",
  "consent",
]);
export type FeatureCategory = z.infer<typeof featureCategory>;

export const featureParty = z.enum(["mcp-server", "authorization-server", "client"]);
export type FeatureParty = z.infer<typeof featureParty>;

export const featureObservable = z.enum(["passive", "active", "manual"]);

/** One revision in which a feature is defined, with the level that revision puts on it. */
export const featureRevisionSchema = z.object({
  spec: kebabId,
  revision: z.string().min(1),
  section: z.string().min(1),
  level: featureLevel,
  levelNote: z.string().min(1).optional(),
});
export type FeatureRevision = z.infer<typeof featureRevisionSchema>;

export const featureSchema = z
  .object({
    id: featureId,
    name: z.string().min(1),
    description: z.string().min(1),
    category: featureCategory,
    party: featureParty,
    observable: featureObservable,
    supersedes: featureId.optional(),
    revisions: z.array(featureRevisionSchema).min(1),
  })
  .superRefine((feature, ctx) => {
    const seen = new Set<string>();
    for (const [i, rev] of feature.revisions.entries()) {
      const key = `${rev.spec}@${rev.revision}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["revisions", i, "revision"],
          message: `revision "${rev.revision}" listed twice for this feature`,
        });
      }
      seen.add(key);
    }
  });
export type Feature = z.infer<typeof featureSchema>;
