import { z } from "zod";
export const clientRow = z.object({
  id: z.string(),
  legal_name: z.string(),
  trade_name: z.string().nullable(),
  tax_document: z.string().nullable(),
  person_type: z.enum(["individual", "company"]),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  manager_membership_id: z.string().nullable(),
  entry_date: z.string(),
  operational_status: z.enum(["activation_pending", "active", "closed"]),
  activated_at: z.string().nullable(),
  notes: z.string().nullable(),
  version: z.number(),
});
export type Client = z.infer<typeof clientRow>;
export const serviceRow = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  base_price_cents: z.union([z.string(), z.number()]).nullable(),
  currency: z.string(),
  billing_kind: z.enum(["monthly", "one_time"]),
  version: z.number(),
});
export const teamRow = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  status: z.string(),
});
export const contactRow = z.object({
  id: z.string(),
  name: z.string(),
  contact_type: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  is_primary: z.boolean(),
});
export const contractedServiceRow = z.object({
  id: z.string(),
  service_id: z.string(),
  status: z.string(),
  negotiated_unit_price_cents: z.union([z.string(), z.number()]),
  quantity: z.union([z.string(), z.number()]),
  currency: z.string(),
  billing_kind: z.string(),
});
