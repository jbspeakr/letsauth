import { z } from "zod";
import { featureId } from "./feature";
import { isoDateTime, kebabId, revisionRefSchema } from "./spec";

export const observationStatus = z.enum([
  "supported",
  "partial",
  "unsupported",
  "unknown",
  "not-applicable",
]);
export type ObservationStatus = z.infer<typeof observationStatus>;

export const observationMethod = z.enum(["manual", "vendor-claim", "passive-scan", "active-scan"]);
export type ObservationMethod = z.infer<typeof observationMethod>;

/** Stronger methods win when two observations carry the same timestamp. */
export const methodStrength: Record<ObservationMethod, number> = {
  "active-scan": 4,
  "passive-scan": 3,
  manual: 2,
  "vendor-claim": 1,
};

export const observationSchema = z.object({
  server: kebabId,
  feature: featureId,
  revision: revisionRefSchema,
  status: observationStatus,
  method: observationMethod,
  observedAt: isoDateTime,
  observedBy: z.string().min(1),
  evidence: z.string().min(1, "required (URL or note)"),
});
export type Observation = z.infer<typeof observationSchema>;

/** A `data/observations/<server-id>.yaml` file is a list of observations for that server. */
export const observationFileSchema = z.array(observationSchema);
