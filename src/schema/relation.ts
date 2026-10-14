import { z } from "zod";
import { httpsUrl, kebabId } from "./spec";

export const relationType = z.enum([
  "builds-on",
  "profiles",
  "competes-with",
  "solves-same-problem-as",
  "references",
  "replaces",
]);
export type RelationType = z.infer<typeof relationType>;

/** Types with no direction: stored once per pair, rendered without an arrowhead. */
export const SYMMETRIC_TYPES: readonly RelationType[] = ["competes-with", "solves-same-problem-as"];

/** Directed types that place a spec after the spec it depends on in the standards map. */
export const DEPENDENCY_TYPES: readonly RelationType[] = ["builds-on", "profiles", "replaces"];

/** Judgement calls: the data model requires a `note` saying what they are based on. */
export const NOTE_REQUIRED_TYPES: readonly RelationType[] = [
  "competes-with",
  "solves-same-problem-as",
];

export const isSymmetric = (type: RelationType) => SYMMETRIC_TYPES.includes(type);
export const isDependency = (type: RelationType) => DEPENDENCY_TYPES.includes(type);

export const relationSchema = z
  .object({
    from: kebabId,
    to: kebabId,
    type: relationType,
    note: z.string().min(1).optional(),
    source: httpsUrl.optional(),
  })
  .superRefine((relation, ctx) => {
    if (relation.from === relation.to) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: `must differ from "from" (a spec cannot relate to itself)`,
      });
    }
    if (NOTE_REQUIRED_TYPES.includes(relation.type) && !relation.note) {
      ctx.addIssue({
        code: "custom",
        path: ["note"],
        message: `required for a "${relation.type}" relation (say what the judgement is based on)`,
      });
    }
  });
export type Relation = z.infer<typeof relationSchema>;

/** `data/relations.yaml` is one list of relations. */
export const relationFileSchema = z.array(relationSchema);
