import { z } from "zod";

export const uuid = z.string().uuid();
export const optionalText = z.string().trim().max(2000).optional().default("");
export const optionalEmail = z
  .union([z.literal(""), z.string().email()])
  .optional()
  .default("");
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + "T00:00:00Z");
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Data inválida");
export const cents = z
  .string()
  .regex(/^\d+$/, "Informe centavos inteiros")
  .refine((v) => /^\d+$/.test(v) && BigInt(v) <= 9007199254740991n, "Valor muito alto");
export const quantity = z
  .string()
  .regex(/^\d{1,8}(\.\d{1,4})?$/)
  .refine((v) => Number(v) > 0 && Number(v) < 100000000, "Quantidade inválida");

export function validDocument(value: string, kind: "individual" | "company") {
  if (value.trim() && !/^[0-9./\s-]+$/.test(value)) return false;
  const doc = value.replace(/\D/g, "");
  if (!doc) return true;
  const n = kind === "individual" ? 11 : 14;
  if (doc.length !== n || /^(\d)\1+$/.test(doc)) return false;
  for (let j = n - 1; j < n + 1; j++) {
    let total = 0;
    for (let i = 1; i < j; i++) {
      const weight = n === 11 ? j + 1 - i : ((j - 1 - i) % 8) + 2;
      total += Number(doc[i - 1]) * weight;
    }
    const digit = total % 11 < 2 ? 0 : 11 - (total % 11);
    if (Number(doc[j - 1]) !== digit) return false;
  }
  return true;
}

export const contactInput = z
  .object({
    name: z.string().trim().min(1).max(200),
    type: z.enum(["principal", "financial", "marketing", "administrative"]),
    email: optionalEmail,
    phone: optionalText,
    isPrimary: z.boolean().default(false),
  })
  .refine((c) => !!(c.email || c.phone), "Informe e-mail ou telefone");
export const clientServiceInput = z
  .object({
    serviceId: uuid,
    priceCents: cents,
    quantity,
    startsOn: z
      .union([z.literal(""), date])
      .optional()
      .default(""),
    endsOn: z
      .union([z.literal(""), date])
      .optional()
      .default(""),
  })
  .refine((s) => !s.startsOn || !s.endsOn || s.endsOn >= s.startsOn, "Período inválido");
export const createClientInput = z
  .object({
    personType: z.enum(["individual", "company"]),
    legalName: z.string().trim().min(1).max(200),
    tradeName: optionalText,
    taxDocument: optionalText,
    email: optionalEmail,
    phone: optionalText,
    postalCode: optionalText,
    street: optionalText,
    addressNumber: optionalText,
    addressComplement: optionalText,
    district: optionalText,
    city: optionalText,
    state: optionalText,
    country: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .default("BR"),
    managerId: z.union([uuid, z.literal("")]).default(""),
    entryDate: date,
    notes: optionalText,
    contacts: z.array(contactInput).max(30).default([]),
    services: z.array(clientServiceInput).max(50).default([]),
  })
  .superRefine((c, ctx) => {
    if (!validDocument(c.taxDocument, c.personType))
      ctx.addIssue({ code: "custom", path: ["taxDocument"], message: "CPF/CNPJ inválido" });
    if (c.contacts.filter((x) => x.isPrimary).length > 1)
      ctx.addIssue({
        code: "custom",
        path: ["contacts"],
        message: "Escolha apenas um contato principal",
      });
  })
  .transform((c) => ({ ...c, taxDocument: c.taxDocument.replace(/\D/g, "") }));
export type CreateClientInput = z.input<typeof createClientInput>;
export const serviceInput = z.object({
  name: z.string().trim().min(1).max(200),
  description: optionalText,
  basePriceCents: z.union([cents, z.literal("")]),
  currency: z.string().regex(/^[A-Z]{3}$/),
  billingKind: z.enum(["monthly", "one_time"]),
});
export const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(256),
});
