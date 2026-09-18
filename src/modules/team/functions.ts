import { createServerFn } from "@tanstack/react-start";
import { requireMember } from "../auth/service.server";
import { databaseError } from "../shared/errors";
export const getTeam = createServerFn({ method: "GET" }).handler(async () => {
  const { db, member } = await requireMember("team.read");
  const [users, profiles, roles] = await Promise.all([
    db
      .from("organization_memberships")
      .select("id,user_id,role_id,status")
      .eq("organization_id", member.organizationId)
      .eq("status", "active"),
    db.from("profiles").select("id,display_name"),
    db.from("roles").select("id,name").eq("organization_id", member.organizationId),
  ]);
  if (users.error) throw databaseError(users.error);
  if (profiles.error) throw databaseError(profiles.error);
  if (roles.error) throw databaseError(roles.error);
  return users.data.map((u) => ({
    id: u.id,
    name: profiles.data.find((p) => p.id === u.user_id)?.display_name ?? "Usuário",
    role: roles.data.find((r) => r.id === u.role_id)?.name ?? "",
    status: u.status,
  }));
});
export const getRoles = createServerFn({ method: "GET" }).handler(async () => {
  const { db, member } = await requireMember("team.read");
  const { data, error } = await db
    .from("roles")
    .select("id,name")
    .eq("organization_id", member.organizationId)
    .is("archived_at", null);
  if (error) throw databaseError(error);
  return data;
});
