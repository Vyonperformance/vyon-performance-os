import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireMember } from "../auth/service.server";
import { serviceInput, uuid } from "../shared/schemas";
import { serviceRow } from "../clients/models";
import { databaseError } from "../shared/errors";
export const getServices = createServerFn({ method: "GET" }).handler(async () => {
  const { db, member } = await requireMember("services.read");
  const { data, error } = await db
    .from("services")
    .select("*")
    .eq("organization_id", member.organizationId)
    .is("archived_at", null)
    .order("name");
  if (error) throw databaseError(error);
  return serviceRow.array().parse(data);
});
export const saveService = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      input: serviceInput,
      id: uuid.optional(),
      expectedVersion: z.number().int().positive().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { db, member } = await requireMember("services.manage");
    const { data: id, error } = await db.rpc("save_service", {
      p_organization_id: member.organizationId,
      p_input: data.input,
      p_id: data.id ?? null,
      p_expected_version: data.expectedVersion ?? null,
    });
    if (error) throw databaseError(error);
    return { id: uuid.parse(id) };
  });
