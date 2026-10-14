import { z } from "zod";
import { httpsUrl, isoDate, kebabId } from "./spec";

export const serverTransport = z.enum(["streamable-http", "sse", "stdio-only"]);
export type ServerTransport = z.infer<typeof serverTransport>;

export const serverListed = z.enum(["opt-in", "public-directory", "maintainer-added"]);
export type ServerListed = z.infer<typeof serverListed>;

export const authClaimed = z.enum(["oauth2.1", "oauth2.1-no-dcr", "api-key", "open", "unknown"]);
export type AuthClaimed = z.infer<typeof authClaimed>;

export const serverSchema = z
  .object({
    id: kebabId,
    name: z.string().min(1),
    vendor: z.string().min(1).optional(),
    url: httpsUrl,
    homepage: httpsUrl.optional(),
    transport: serverTransport,
    listed: serverListed,
    source: httpsUrl.optional(),
    authClaimed: authClaimed.optional(),
    withdrawn: z
      .object({
        at: isoDate,
        reason: z.string().min(1),
      })
      .optional(),
    notes: z.string().min(1).optional(),
  })
  .superRefine((server, ctx) => {
    if (server.listed !== "opt-in" && !server.source) {
      ctx.addIssue({
        code: "custom",
        path: ["source"],
        message: `required when listed is "${server.listed}"`,
      });
    }
  });
export type Server = z.infer<typeof serverSchema>;
