import type { SupabaseClient } from "@supabase/supabase-js";
import { clientRow, contactRow, contractedServiceRow } from "./models";
import { databaseError } from "../shared/errors";
export async function listClients(db: SupabaseClient, org: string, search: string, page: number) {
  let request = db
    .from("clients")
    .select("*", { count: "exact" })
    .eq("organization_id", org)
    .is("archived_at", null);
  if (search) request = request.ilike("legal_name", `%${search.replace(/[%_\\]/g, "\\$&")}%`);
  const { data, error, count } = await request
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * 20, page * 20 - 1);
  if (error) throw databaseError(error);
  return { items: clientRow.array().parse(data), total: count ?? 0, page };
}
export async function findClient(db: SupabaseClient, org: string, id: string) {
  const { data, error } = await db
    .from("clients")
    .select("*")
    .eq("organization_id", org)
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw databaseError(error);
  if (!data) return null;
  const [contacts, services] = await Promise.all([
    db
      .from("client_contacts")
      .select("*")
      .eq("organization_id", org)
      .eq("client_id", id)
      .is("archived_at", null),
    db
      .from("client_services")
      .select("*")
      .eq("organization_id", org)
      .eq("client_id", id)
      .is("archived_at", null),
  ]);
  if (contacts.error) throw databaseError(contacts.error);
  if (services.error) throw databaseError(services.error);
  return {
    client: clientRow.parse(data),
    contacts: contactRow.array().parse(contacts.data),
    services: contractedServiceRow.array().parse(services.data),
  };
}
