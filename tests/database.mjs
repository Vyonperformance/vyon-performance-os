import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
export async function database() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
 create schema auth;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated;
 grant execute on function auth.uid() to anon,authenticated;`);
  for (const file of (await readdir("supabase/migrations"))
    .filter((x) => x.endsWith(".sql"))
    .sort())
    await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
  return db;
}
export async function asUser(db, id, sql, params = []) {
  await db.exec("begin; set local role authenticated;");
  try {
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [id ?? ""]);
    const result = await db.query(sql, params);
    await db.exec("commit");
    return result;
  } catch (e) {
    await db.exec("rollback");
    throw e;
  }
}
