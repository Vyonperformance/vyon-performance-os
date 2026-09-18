import { supabaseConfig } from "@/lib/supabase/config";
import { serverSupabase } from "@/lib/supabase/client.server";
import type { SessionState } from "./types";

export async function readSession(): Promise<SessionState> {
  if (!supabaseConfig()) return { status: "unconfigured", member: null };
  const db = serverSupabase();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) return { status: "anonymous", member: null };
  const { data: links, error: linkError } = await db
    .from("organization_memberships")
    .select("id,organization_id,role_id,invited_email")
    .eq("user_id", user.id)
    .eq("status", "active");
  if (linkError) throw new Error("Não foi possível verificar o acesso.");
  // A single operational organization is intentional; never choose an arbitrary tenant.
  if (!links || links.length !== 1) return { status: "no_access", member: null };
  const link = links[0]!;
  const [org, role, profile, grants] = await Promise.all([
    db.from("organizations").select("name").eq("id", link.organization_id).single(),
    db.from("roles").select("name").eq("id", link.role_id).is("archived_at", null).single(),
    db.from("profiles").select("display_name").eq("id", user.id).single(),
    db
      .from("role_permissions")
      .select("permission_id")
      .eq("organization_id", link.organization_id)
      .eq("role_id", link.role_id),
  ]);
  if (org.error || role.error || profile.error || grants.error)
    return { status: "no_access", member: null };
  const { data: permissions, error: permissionError } = await db
    .from("permissions")
    .select("id,code");
  if (permissionError) throw new Error("Não foi possível carregar permissões.");
  const ids = new Set(grants.data.map((g) => g.permission_id));
  return {
    status: "authenticated",
    member: {
      id: link.id,
      userId: user.id,
      organizationId: link.organization_id,
      organizationName: org.data.name,
      name: profile.data.display_name,
      email: user.email ?? link.invited_email,
      roleId: link.role_id,
      roleName: role.data.name,
      permissions: (permissions ?? []).filter((p) => ids.has(p.id)).map((p) => p.code),
    },
  };
}
export async function requireMember(permission?: string) {
  const session = await readSession();
  if (!session.member || (permission && !session.member.permissions.includes(permission)))
    throw new Error("Acesso não permitido.");
  return { member: session.member, db: serverSupabase() };
}
