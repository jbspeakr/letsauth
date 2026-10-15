import { z } from "zod";
import { featureId } from "./feature";
import { kebabId, revisionRefSchema } from "./spec";

export const actorKind = z.enum([
  "user",
  "agent",
  "mcp-client",
  "mcp-server",
  "authorization-server",
  "resource",
  "idp",
]);
export type ActorKind = z.infer<typeof actorKind>;

export const actorSchema = z.object({
  id: kebabId,
  kind: actorKind,
  name: z.string().min(1),
});
export type Actor = z.infer<typeof actorSchema>;

/** A revision reference plus the document's own heading or anchor. */
export const citationSchema = revisionRefSchema.extend({ section: z.string().min(1) });
export type Citation = z.infer<typeof citationSchema>;

/** A claim value: scalar, list of strings, or a nested map (for `act`). */
export type TokenValue = string | number | boolean | string[] | { [key: string]: TokenValue };
export const tokenValueSchema: z.ZodType<TokenValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.record(z.string(), tokenValueSchema),
  ]),
);

/** A decoded token as the message carries it; change marks are derived, never stored. */
export const tokenViewSchema = z.object({
  name: z.string().min(1),
  header: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  claims: z.record(z.string(), tokenValueSchema),
  note: z.string().min(1).optional(),
});
export type TokenView = z.infer<typeof tokenViewSchema>;

export const stepSchema = z.object({
  id: kebabId,
  from: kebabId,
  to: kebabId,
  message: z.string().min(1),
  note: z.string().min(1).optional(),
  cites: citationSchema,
  token: tokenViewSchema.optional(),
});
export type Step = z.infer<typeof stepSchema>;

export const toggleKind = z.enum(["attack", "misconfiguration"]);
export type ToggleKind = z.infer<typeof toggleKind>;

export const toggleSchema = z.object({
  id: kebabId,
  name: z.string().min(1),
  kind: toggleKind,
  summary: z.string().min(1),
  cites: citationSchema,
  /** Baseline step id → the steps that take its place; an empty list removes the step. */
  replaces: z.record(kebabId, z.array(stepSchema)),
  violates: z.array(featureId).optional(),
  vulnerability: kebabId.optional(),
});
export type Toggle = z.infer<typeof toggleSchema>;

function uniqueIds(
  ctx: z.RefinementCtx,
  items: { id: string }[],
  path: (string | number)[],
  what: string,
) {
  const seen = new Set<string>();
  for (const [i, item] of items.entries()) {
    if (seen.has(item.id)) {
      ctx.addIssue({
        code: "custom",
        path: [...path, i, "id"],
        message: `${what} id "${item.id}" listed twice`,
      });
    }
    seen.add(item.id);
  }
}

export const scenarioSchema = z
  .object({
    id: kebabId,
    title: z.string().min(1),
    summary: z.string().min(1),
    actors: z.array(actorSchema).min(2),
    features: z.array(featureId),
    steps: z.array(stepSchema).min(1),
    toggles: z.array(toggleSchema).default([]),
  })
  .superRefine((scenario, ctx) => {
    uniqueIds(ctx, scenario.actors, ["actors"], "actor");
    uniqueIds(ctx, scenario.steps, ["steps"], "step");
    uniqueIds(ctx, scenario.toggles, ["toggles"], "toggle");
  });
export type Scenario = z.infer<typeof scenarioSchema>;
