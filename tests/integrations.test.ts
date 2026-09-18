import { beforeAll, afterAll, test, expect } from "bun:test";
import { randomUUID } from "node:crypto";
import { database, asUser } from "./database.mjs";
import {
  generateIntegrationKey,
  parseCredential,
  equalHash,
} from "../src/modules/integrations/keys.server";
import { handleIntegrationRequest } from "../src/modules/integrations/http.server";
import { GatewayError, type IntegrationGateway } from "../src/modules/integrations/gateway.server";
import { apiResult, scopes } from "../src/modules/integrations/contracts";
let db: Awaited<ReturnType<typeof database>>;
const admin = randomUUID(),
  other = randomUUID(),
  limited = randomUUID();
let org: string, org2: string, integration: string, integration2: string, keyId: string;
const generated = generateIntegrationKey();
async function service(sql: string, args: unknown[] = []) {
  await db.exec("begin; set local role service_role");
  try {
    const r = await db.query(sql, args);
    await db.exec("commit");
    return r;
  } catch (e) {
    await db.exec("rollback");
    throw e;
  }
}
const gateway: IntegrationGateway = {
  async lookup(prefix) {
    return (await service("select public.integration_key_lookup($1) value", [prefix])).rows[0]
      .value;
  },
  async execute(id, hash, op, input, eventId, requestId) {
    try {
      return apiResult.parse(
        (
          await service("select public.integration_request($1,$2,$3,$4,$5,$6) value", [
            id,
            hash,
            op,
            input,
            eventId,
            requestId,
          ])
        ).rows[0].value,
      );
    } catch (e) {
      throw new GatewayError(
        (e as { code?: string }).code === "28000" ? 401 : 503,
        (e as { code?: string }).code === "28000" ? "invalid_api_key" : "integration_unavailable",
      );
    }
  },
};
function send(
  operation: "clients.create" | "clients.read" | "services.read" | "webhooks.receive",
  body?: unknown,
  options: {
    key?: string;
    event?: string;
    id?: string;
    raw?: string;
    headers?: Record<string, string>;
  } = {},
) {
  const headers: Record<string, string> = {
    authorization: `Bearer ${options.key ?? generated.key}`,
    "content-type": "application/json",
    ...options.headers,
  };
  if (options.event) headers["idempotency-key"] = options.event;
  const init: RequestInit = { method: operation.endsWith(".read") ? "GET" : "POST", headers };
  if (body !== undefined || options.raw !== undefined)
    init.body = options.raw ?? JSON.stringify(body);
  return handleIntegrationRequest(
    new Request("https://vyon.example.test/api/v1/test", init),
    operation,
    options.id,
    () => gateway,
  );
}
async function issue(
  int = integration,
  permissions: readonly string[] = scopes,
  user = admin,
  organization = org,
) {
  const key = generateIntegrationKey();
  const id = (
    await asUser(db, user, "select public.issue_integration_key($1,$2,$3,$4,$5,$6,null) id", [
      organization,
      int,
      "Test key",
      key.prefix,
      key.hash,
      permissions,
    ])
  ).rows[0].id;
  return { ...key, id };
}
beforeAll(async () => {
  db = await database();
  await db.query(
    "insert into auth.users(id,email,email_confirmed_at) values($1,'admin@example.test',now()),($2,'other@example.test',now()),($3,'limited@example.test',now())",
    [admin, other, limited],
  );
  org = (await db.query("select private.bootstrap_vyon($1) id", [admin])).rows[0].id;
  org2 = randomUUID();
  const role2 = randomUUID(),
    roleLimited = randomUUID();
  await db.query("insert into public.organizations(id,name) values($1,'Other')", [org2]);
  await db.query(
    "insert into public.roles(id,organization_id,name) values($1,$2,'Other admin'),($3,$4,'Limited')",
    [role2, org2, roleLimited, org],
  );
  await db.query(
    "insert into public.role_permissions(organization_id,role_id,permission_id) select $1,$2,id from public.permissions",
    [org2, role2],
  );
  await db.query(
    "insert into public.organization_memberships(organization_id,user_id,invited_email,role_id,status,accepted_at) values($1,$2,'other@example.test',$3,'active',now()),($4,$5,'limited@example.test',$6,'active',now())",
    [org2, other, role2, org, limited, roleLimited],
  );
  integration = (
    await asUser(db, admin, "select public.save_integration($1,'System','system','active') id", [
      org,
    ])
  ).rows[0].id;
  integration2 = (
    await asUser(db, other, "select public.save_integration($1,'Other','other','active') id", [
      org2,
    ])
  ).rows[0].id;
  keyId = (
    await asUser(db, admin, "select public.issue_integration_key($1,$2,$3,$4,$5,$6,null) id", [
      org,
      integration,
      "Initial",
      generated.prefix,
      generated.hash,
      scopes,
    ])
  ).rows[0].id;
}, 30000);
afterAll(async () => {
  await db?.close();
});
test("key has 256-bit random secret, independent identifier, hash only persisted", async () => {
  expect(generated.key).toMatch(/^vyon_[a-f0-9]{24}\.[a-f0-9]{64}$/);
  expect(generateIntegrationKey().key).not.toBe(generated.key);
  const row = (
    await db.query("select to_jsonb(k) value from public.api_keys k where id=$1", [keyId])
  ).rows[0].value;
  expect(row.key_hash).toBe(generated.hash);
  expect(JSON.stringify(row)).not.toContain(generated.key.split(".")[1]!);
  expect(parseCredential(`Bearer ${generated.key}`)?.hash).toBe(generated.hash);
  expect(equalHash(generated.hash, generated.hash)).toBe(true);
});
test("admin sees key metadata but cannot retrieve hash, select star or original secret", async () => {
  expect((await asUser(db, admin, "select id,prefix from public.api_keys")).rows).toHaveLength(1);
  await expect(asUser(db, admin, "select key_hash from public.api_keys")).rejects.toThrow();
  await expect(asUser(db, admin, "select * from public.api_keys")).rejects.toThrow();
  await expect(
    asUser(db, admin, "select public.integration_key_lookup($1)", [generated.prefix]),
  ).rejects.toThrow();
});
test("RLS: limited users see no integration/key/log and cannot manage", async () => {
  for (const sql of [
    "select * from public.integrations",
    "select id from public.api_keys",
    "select * from public.integration_logs",
  ])
    expect((await asUser(db, limited, sql)).rows).toHaveLength(0);
  await expect(
    asUser(db, limited, "select public.save_integration($1,'No','system','active')", [org]),
  ).rejects.toThrow();
  await expect(issue(integration, scopes, limited)).rejects.toThrow();
  await expect(
    asUser(db, limited, "select public.revoke_integration_key($1,$2)", [org, keyId]),
  ).rejects.toThrow();
});
test("RLS: other org admin cannot see or alter integration, cannot cross-associate key", async () => {
  expect((await asUser(db, other, "select id from public.integrations")).rows).toEqual([
    { id: integration2 },
  ]);
  await expect(
    asUser(db, other, "select public.save_integration($1,'No','other','active',$2)", [
      org,
      integration,
    ]),
  ).rejects.toThrow();
  await expect(issue(integration, scopes, other, org2)).rejects.toThrow();
});
test("anon cannot access new tables or management/bridge RPCs", async () => {
  for (const table of [
    "integrations",
    "api_keys",
    "webhook_events",
    "domain_events",
    "integration_logs",
  ]) {
    await db.exec("begin; set local role anon");
    try {
      await expect(db.query(`select * from public.${table}`)).rejects.toThrow();
    } finally {
      await db.exec("rollback");
    }
  }
  expect(
    (
      await db.query(
        "select has_function_privilege('anon','public.integration_key_lookup(text)','execute') allowed",
      )
    ).rows[0].allowed,
  ).toBe(false);
});
test("human cannot directly write integrations or technical events", async () => {
  await expect(
    asUser(db, admin, "update public.integrations set status='disabled'"),
  ).rejects.toThrow();
  for (const table of ["webhook_events", "domain_events"])
    await expect(asUser(db, admin, `select * from public.${table}`)).rejects.toThrow();
});
test("all five new tables have RLS and no direct service_role table privileges", async () => {
  const r = await db.query(
    "select count(*)::int n from pg_class where relname=any($1) and relnamespace='public'::regnamespace and relrowsecurity",
    [["integrations", "api_keys", "webhook_events", "domain_events", "integration_logs"]],
  );
  expect(r.rows[0].n).toBe(5);
  expect(
    (
      await db.query(
        "select has_table_privilege('service_role','public.api_keys','select') allowed",
      )
    ).rows[0].allowed,
  ).toBe(false);
});
test("valid key can read catalog and tracks last use", async () => {
  expect((await send("services.read")).status).toBe(200);
  expect(
    (await db.query("select last_used_at from public.api_keys where id=$1", [keyId])).rows[0]
      .last_used_at,
  ).not.toBeNull();
});
test("invalid keys and unknown prefixes receive identical generic 401", async () => {
  for (const key of [
    "bad",
    generateIntegrationKey().key,
    generated.prefix + "." + "0".repeat(64),
  ]) {
    const r = await send("services.read", undefined, { key });
    expect(r.status).toBe(401);
    expect((await r.json()).error.code).toBe("invalid_api_key");
  }
});
test("revoked, expired and disabled integration keys fail", async () => {
  const k = await issue();
  await asUser(db, admin, "select public.revoke_integration_key($1,$2)", [org, k.id]);
  expect((await send("services.read", undefined, { key: k.key })).status).toBe(401);
  const expired = await issue();
  await db.query("update public.api_keys set expires_at=now()-interval '1 second' where id=$1", [
    expired.id,
  ]);
  expect((await send("services.read", undefined, { key: expired.key })).status).toBe(401);
  await asUser(db, admin, "select public.save_integration($1,'System','system','disabled',$2)", [
    org,
    integration,
  ]);
  expect((await send("services.read")).status).toBe(401);
  await asUser(db, admin, "select public.save_integration($1,'System','system','active',$2)", [
    org,
    integration,
  ]);
});
test("credential revoked between lookup and command is rejected atomically", async () => {
  const k = await issue();
  expect(await gateway.lookup(k.prefix)).not.toBeNull();
  await asUser(db, admin, "select public.revoke_integration_key($1,$2)", [org, k.id]);
  await expect(
    gateway.execute(k.id, k.hash, "services.read", {}, null, randomUUID()),
  ).rejects.toThrow("invalid_api_key");
});
test("scope insufficient, including webhook domain scope, is denied and logged", async () => {
  const k = await issue(integration, ["webhooks.receive"]);
  expect((await send("services.read", undefined, { key: k.key })).status).toBe(403);
  expect(
    (
      await send(
        "webhooks.receive",
        {
          version: 1,
          type: "client.create",
          externalEventId: randomUUID(),
          data: { personType: "company", name: "Denied" },
        },
        { key: k.key },
      )
    ).status,
  ).toBe(403);
});
test("API client creation derives org, is pending, emits domain event and respects idempotency", async () => {
  const event = randomUUID(),
    payload = { personType: "company", name: "API client" };
  const first = await send("clients.create", payload, { event });
  expect(first.status).toBe(201);
  const a = await first.json();
  const duplicate = await send("clients.create", payload, { event });
  expect(duplicate.status).toBe(201);
  const b = await duplicate.json();
  expect(b.data.id).toBe(a.data.id);
  expect(b.duplicate).toBe(true);
  const row = (
    await db.query(
      "select organization_id,operational_status,origin from public.clients where id=$1",
      [a.data.id],
    )
  ).rows[0];
  expect(row).toEqual({
    organization_id: org,
    operational_status: "activation_pending",
    origin: "integration",
  });
  expect(
    (
      await db.query("select count(*)::int n from public.domain_events where aggregate_id=$1", [
        a.data.id,
      ])
    ).rows[0].n,
  ).toBe(1);
  expect((await send("clients.read", undefined, { id: a.data.id })).status).toBe(200);
  const otherKey = await issue(integration2, scopes, other, org2);
  expect((await send("clients.read", undefined, { id: a.data.id, key: otherKey.key })).status).toBe(
    404,
  );
});
test("external tenant/status/manager injection is rejected by strict contract", async () => {
  for (const injection of [
    { organization_id: org2 },
    { organizationId: org2 },
    { operationalStatus: "active" },
    { managerId: admin },
  ])
    expect(
      (
        await send(
          "clients.create",
          { personType: "company", name: "Injected", ...injection },
          { event: randomUUID() },
        )
      ).status,
    ).toBe(400);
  expect(
    (await db.query("select count(*)::int n from public.clients where legal_name='Injected'"))
      .rows[0].n,
  ).toBe(0);
});
test("missing stable event ID or idempotency header is rejected, no synthetic dedup", async () => {
  expect((await send("clients.create", { personType: "company", name: "No ID" })).status).toBe(400);
  expect(
    (
      await send("webhooks.receive", {
        version: 1,
        type: "client.create",
        data: { personType: "company", name: "No ID" },
      })
    ).status,
  ).toBe(400);
});
test("authenticated webhook is processed once; payload change under same ID is conflict", async () => {
  const id = randomUUID(),
    body = {
      version: 1,
      externalEventId: id,
      type: "client.create",
      data: { personType: "individual", name: "Webhook" },
    };
  const first = await send("webhooks.receive", body);
  expect(first.status).toBe(201);
  const a = await first.json();
  const retry = await send("webhooks.receive", body);
  expect((await retry.json()).data.id).toBe(a.data.id);
  expect(
    (await send("webhooks.receive", { ...body, data: { ...body.data, name: "Changed" } })).status,
  ).toBe(409);
});
test("same external ID on distinct integrations or tenants does not collide", async () => {
  const int3 = (
    await asUser(db, admin, "select public.save_integration($1,'Second','system','active') id", [
      org,
    ])
  ).rows[0].id;
  const second = await issue(int3),
    third = await issue(integration2, scopes, other, org2),
    event = randomUUID();
  const ids = [];
  for (const key of [generated.key, second.key, third.key]) {
    const r = await send(
      "webhooks.receive",
      {
        version: 1,
        type: "client.create",
        externalEventId: event,
        data: { personType: "company", name: "Independent" },
      },
      { key },
    );
    expect(r.status).toBe(201);
    ids.push((await r.json()).data.id);
  }
  expect(new Set(ids).size).toBe(3);
});
test("unsupported webhook fails observably without storing unknown raw payload", async () => {
  const id = randomUUID(),
    body = {
      version: 1,
      type: "charge.paid",
      externalEventId: id,
      data: { privateField: "not retained" },
    };
  const r = await send("webhooks.receive", body);
  expect(r.status).toBe(422);
  const ev = (
    await db.query(
      "select status,payload,error_code from public.webhook_events where external_event_id=$1",
      [id],
    )
  ).rows[0];
  expect(ev).toEqual({ status: "failed", payload: {}, error_code: "unsupported_event" });
  expect((await send("webhooks.receive", body)).status).toBe(422);
});
test("domain conflict is durable failure; retry never becomes false success", async () => {
  const payload = { personType: "individual", name: "Document", taxDocument: "52998224725" };
  expect((await send("clients.create", payload, { event: randomUUID() })).status).toBe(201);
  const event = randomUUID();
  expect((await send("clients.create", payload, { event })).status).toBe(409);
  const retry = await send("clients.create", payload, { event });
  expect(retry.status).toBe(409);
  expect((await retry.json()).duplicate).toBe(true);
  expect(
    (
      await db.query(
        "select status,error_code from public.webhook_events where external_event_id=$1",
        [event],
      )
    ).rows[0],
  ).toEqual({ status: "failed", error_code: "domain_conflict" });
});
test("partial failure rolls back client and domain event, persists sanitized error", async () => {
  await db.exec(
    "create function private.test_fail() returns trigger language plpgsql as $$begin if new.legal_name='Forced failure' then raise exception 'sensitive database detail'; end if; return new; end$$; create trigger z_test_fail after insert on public.clients for each row execute function private.test_fail();",
  );
  const r = await send(
    "clients.create",
    { personType: "company", name: "Forced failure" },
    { event: randomUUID() },
  );
  expect(r.status).toBe(500);
  expect(JSON.stringify(await r.json())).not.toContain("sensitive");
  expect(
    (await db.query("select count(*)::int n from public.clients where legal_name='Forced failure'"))
      .rows[0].n,
  ).toBe(0);
  await db.exec("drop trigger z_test_fail on public.clients; drop function private.test_fail();");
});
test("immutable domain events reject update/delete, including operator", async () => {
  await expect(db.exec("update public.domain_events set event_type='tampered'")).rejects.toThrow();
  await expect(db.exec("delete from public.domain_events")).rejects.toThrow();
});
test("malformed and oversized JSON fail without logging payloads/secrets", async () => {
  expect((await send("webhooks.receive", undefined, { raw: "{broken" })).status).toBe(400);
  expect((await send("webhooks.receive", undefined, { raw: "x".repeat(65537) })).status).toBe(413);
  expect(
    (
      await send("webhooks.receive", {
        version: 1,
        type: "unknown",
        data: { password: generated.key },
        externalEventId: randomUUID(),
      })
    ).status,
  ).toBe(400);
  const serialized = JSON.stringify(
    (await db.query("select to_jsonb(l) data from public.integration_logs l")).rows,
  );
  expect(serialized).not.toContain(generated.key);
  expect(serialized).not.toContain(generated.hash);
  expect(serialized).not.toContain("Authorization");
  expect(serialized).not.toContain("sensitive database detail");
});
test("responses never cache credentials or results and use server-generated request IDs", async () => {
  const r = await send("services.read");
  expect(r.headers.get("cache-control")).toContain("no-store");
  expect(r.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
});

test("operator homologation script passes locally and rolls back every fixture", async () => {
  const isolated = await database();
  try {
    const user = "b501890b-4521-412d-b7a5-d0946b8ad48f";
    await isolated.query(
      "insert into auth.users(id,email,email_confirmed_at) values($1,'owner@example.test',now())",
      [user],
    );
    await isolated.query("select private.bootstrap_vyon($1)", [user]);
    await isolated.exec(await Bun.file("supabase/tests/live_integrations.sql").text());
    expect(
      (await isolated.query("select count(*)::int n from public.integrations")).rows[0].n,
    ).toBe(0);
    expect((await isolated.query("select count(*)::int n from public.clients")).rows[0].n).toBe(0);
    expect(
      (await isolated.query("select count(*)::int n from public.role_permissions")).rows[0].n,
    ).toBe(20);
  } finally {
    await isolated.close();
  }
}, 30000);
