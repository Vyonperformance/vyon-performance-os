import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireMember } from "../auth/service.server";
import { databaseError } from "../shared/errors";
import { integrationInput, keyInput, integrationRow, keyRow } from "./contracts";
import { generateIntegrationKey } from "./keys.server";
export const getIntegrations = createServerFn({ method: "GET" }).handler(async () => {
  const { db, member } = await requireMember("integrations.manage");
  const [integrations, keys, logs] = await Promise.all([
    db
      .from("integrations")
      .select("*")
      .eq("organization_id", member.organizationId)
      .order("created_at"),
    db
      .from("api_keys")
      .select("id,integration_id,name,prefix,scopes,status,expires_at,last_used_at")
      .eq("organization_id", member.organizationId)
      .order("created_at", { ascending: false }),
    db
      .from("integration_logs")
      .select("id,integration_id,operation,status,response_status,error_code,created_at,request_id")
      .eq("organization_id", member.organizationId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (integrations.error || keys.error || logs.error)
    throw new Error("Não foi possível carregar as integrações.");
  return {
    integrations: integrationRow.array().parse(integrations.data),
    keys: keyRow.array().parse(keys.data),
    logs: logs.data,
  };
});
export const saveIntegration = createServerFn({ method: "POST" })
  .inputValidator(integrationInput)
  .handler(async ({ data }) => {
    const { db, member } = await requireMember("integrations.manage");
    const { data: id, error } = await db.rpc("save_integration", {
      p_org: member.organizationId,
      p_name: data.name,
      p_category: data.category,
      p_status: data.status,
      p_id: data.id ?? null,
    });
    if (error) throw databaseError(error);
    return { id: String(id) };
  });
export const issueKey = createServerFn({ method: "POST" })
  .inputValidator(keyInput)
  .handler(async ({ data }) => {
    const { db, member } = await requireMember("integrations.manage");
    const generated = generateIntegrationKey();
    const { data: id, error } = await db.rpc("issue_integration_key", {
      p_org: member.organizationId,
      p_integration: data.integrationId,
      p_name: data.name,
      p_prefix: generated.prefix,
      p_hash: generated.hash,
      p_scopes: data.scopes,
      p_expires: data.expiresAt || null,
    });
    if (error) throw databaseError(error);
    return { id: String(id), key: generated.key }; // Only this no-store response contains the full key.
  });
export const revokeKey = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }).strict())
  .handler(async ({ data }) => {
    const { db, member } = await requireMember("integrations.manage");
    const { error } = await db.rpc("revoke_integration_key", {
      p_org: member.organizationId,
      p_id: data.id,
    });
    if (error) throw databaseError(error);
    return { ok: true };
  });
