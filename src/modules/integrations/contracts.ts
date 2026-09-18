import { z } from "zod";
import { validDocument } from "../shared/schemas";
export const scopes = [
  "clients.read",
  "clients.create",
  "services.read",
  "webhooks.receive",
] as const;
export const scope = z.enum(scopes);
export const integrationInput = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(120),
    category: z.enum(["system", "orchestrator", "other"]),
    status: z.enum(["active", "disabled"]),
  })
  .strict();
export const keyInput = z
  .object({
    integrationId: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
    scopes: z
      .array(scope)
      .min(1)
      .max(4)
      .refine((v) => new Set(v).size === v.length),
    expiresAt: z.union([z.literal(""), z.string().datetime({ offset: true })]).default(""),
  })
  .strict();
export const externalClient = z
  .object({
    personType: z.enum(["individual", "company"]),
    name: z.string().trim().min(1).max(200),
    taxDocument: z.string().max(18).default(""),
    email: z.union([z.literal(""), z.string().email().max(254)]).default(""),
    phone: z.string().max(40).default(""),
  })
  .strict()
  .refine((v) => validDocument(v.taxDocument, v.personType), "Invalid document")
  .transform((v) => ({ ...v, taxDocument: v.taxDocument.replace(/\D/g, "") }));
export const eventId = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/);
export const webhookEnvelope = z
  .object({
    version: z.literal(1),
    externalEventId: eventId.optional(),
    type: z.string().regex(/^[a-z][a-z0-9_.-]{0,79}$/),
    data: z.record(z.unknown()),
  })
  .strict();
export const integrationRow = integrationInput.extend({
  id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
  organization_id: z.string().uuid(),
});
export const keyRow = z.object({
  id: z.string().uuid(),
  integration_id: z.string().uuid(),
  name: z.string(),
  prefix: z.string(),
  scopes: z.array(scope),
  status: z.enum(["active", "revoked"]),
  expires_at: z.string().nullable(),
  last_used_at: z.string().nullable(),
});
export const apiResult = z.object({
  status: z.number().int().min(200).max(599),
  data: z.unknown(),
  error: z.string().nullable(),
  eventId: z.string().uuid().nullable(),
  duplicate: z.boolean(),
});
export type ApiResult = z.infer<typeof apiResult>;
export type Operation = "clients.read" | "clients.create" | "services.read" | "webhooks.receive";
