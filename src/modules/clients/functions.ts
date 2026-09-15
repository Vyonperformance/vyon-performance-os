import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireMember } from "../auth/service.server";
import {
  createClientInput,
  optionalEmail,
  optionalText,
  uuid,
  clientServiceInput,
} from "../shared/schemas";
import { databaseError } from "../shared/errors";
import { listClients, findClient } from "./repository.server";
export const getClients = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      search: z.string().max(200).default(""),
      page: z.number().int().min(1).max(100000).default(1),
    }),
  )
  .handler(async ({ data }) => {
    const { db, member } = await requireMember("clients.read");
    return listClients(db, member.organizationId, data.search, data.page);
  });
export const getClient = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: uuid }))
  .handler(async ({ data }) => {
    const { db, member } = await requireMember("clients.read");
    return findClient(db, member.organizationId, data.id);
  });
export const createClient = createServerFn({ method: "POST" })
  .inputValidator(createClientInput)
  .handler(async ({ data }) => {
    const { db, member } = await requireMember("clients.manage");
    const { data: id, error } = await db.rpc("create_client", {
      p_organization_id: member.organizationId,
      p_input: data,
    });
    if (error) throw databaseError(error);
    return { id: uuid.parse(id) };
  });
export const updateClient = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: uuid,
      expectedVersion: z.number().int().positive(),
      legalName: z.string().trim().min(1).max(200),
      tradeName: optionalText,
      email: optionalEmail,
      phone: optionalText,
      notes: optionalText,
    }),
  )
  .handler(async ({ data }) => {
    const { db, member } = await requireMember("clients.manage");
    const { error } = await db.rpc("update_client", {
      p_organization_id: member.organizationId,
      p_id: data.id,
      p_expected_version: data.expectedVersion,
      p_input: data,
    });
    if (error) throw databaseError(error);
    return { id: data.id };
  });
export const addClientService = createServerFn({ method: "POST" })
  .inputValidator(z.object({ clientId: uuid, service: clientServiceInput }))
  .handler(async ({ data }) => {
    const { db, member } = await requireMember("clients.manage");
    const { error } = await db.rpc("add_client_service", {
      p_organization_id: member.organizationId,
      p_client_id: data.clientId,
      p_input: data.service,
    });
    if (error) throw databaseError(error);
    return { id: data.clientId };
  });
