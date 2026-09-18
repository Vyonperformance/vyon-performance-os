import { test, expect, beforeAll, afterAll } from "bun:test";
import { database, asUser } from "./database.mjs";
import { validDocument, createClientInput, cents } from "../src/modules/shared/schemas";
import { getClientDetail } from "../src/data/client-details";
let db: Awaited<ReturnType<typeof database>>;
const org = "10000000-0000-4000-8000-000000000001",
  org2 = "10000000-0000-4000-8000-000000000002";
const admin = "20000000-0000-4000-8000-000000000001",
  manager = "20000000-0000-4000-8000-000000000002",
  outsider = "20000000-0000-4000-8000-000000000003",
  disabled = "20000000-0000-4000-8000-000000000004";
const role = "30000000-0000-4000-8000-000000000001",
  role2 = "30000000-0000-4000-8000-000000000002",
  roleOther = "30000000-0000-4000-8000-000000000003";
const ma = "40000000-0000-4000-8000-000000000001",
  mm = "40000000-0000-4000-8000-000000000002";
const ca = "50000000-0000-4000-8000-000000000001",
  cm = "50000000-0000-4000-8000-000000000002",
  co = "50000000-0000-4000-8000-000000000003";
const s2 = "60000000-0000-4000-8000-000000000001",
  dep2 = "70000000-0000-4000-8000-000000000001";
beforeAll(async () => {
  db = await database();
  await db.exec(`insert into auth.users(id,email,email_confirmed_at) values ('${admin}','admin@example.test',now()),('${manager}','manager@example.test',now()),('${outsider}','outside@example.test',now()),('${disabled}','disabled@example.test',now());
 insert into public.organizations(id,name) values ('${org}','Test A'),('${org2}','Test B');
 insert into public.roles(id,organization_id,name) values ('${role}','${org}','Admin'),('${role2}','${org}','Manager'),('${roleOther}','${org2}','Other');
 insert into public.departments(id,organization_id,name) values ('${dep2}','${org2}','Other');
 insert into public.role_permissions(organization_id,role_id,permission_id) select '${org}','${role}',id from public.permissions;
 insert into public.role_permissions(organization_id,role_id,permission_id) select '${org}','${role2}',id from public.permissions where code in ('clients.read','clients.manage','services.read');
 insert into public.organization_memberships(id,organization_id,user_id,invited_email,role_id,status,accepted_at) values
 ('${ma}','${org}','${admin}','admin@example.test','${role}','active',now()),
 ('${mm}','${org}','${manager}','manager@example.test','${role2}','active',now()),
 ('40000000-0000-4000-8000-000000000004','${org}','${disabled}','disabled@example.test','${role}','disabled',now());
 insert into public.clients(id,organization_id,person_type,legal_name,manager_membership_id,tax_document) values
 ('${ca}','${org}','individual','Admin customer','${ma}','52998224725'),
 ('${cm}','${org}','company','Manager customer','${mm}','11222333000181'),
 ('${co}','${org2}','individual','Other customer',null,'52998224725');
 insert into public.services(id,organization_id,name,billing_kind) values ('${s2}','${org2}','Other service','monthly');`);
}, 30000);
afterAll(async () => {
  await db?.close();
});
test("exactly 11 application tables", async () => {
  const r = await db.query(
    "select count(*)::int n from information_schema.tables where table_schema='public' and table_type='BASE TABLE'",
  );
  expect(r.rows[0].n).toBe(11);
});
test("anonymous cannot SELECT customers", async () => {
  await db.exec("begin; set local role anon");
  try {
    await expect(db.query("select * from public.clients")).rejects.toThrow();
  } finally {
    await db.exec("rollback");
  }
});
test("authenticated without active membership sees no organization", async () =>
  expect((await asUser(db, outsider, "select * from public.organizations")).rows).toHaveLength(0));
test("disabled membership has no customer access", async () =>
  expect((await asUser(db, disabled, "select * from public.clients")).rows).toHaveLength(0));
test("admin reads own organization only", async () =>
  expect((await asUser(db, admin, "select * from public.clients")).rows).toHaveLength(2));
test("manager sees assigned client only", async () => {
  const r = await asUser(db, manager, "select id from public.clients");
  expect(r.rows).toEqual([{ id: cm }]);
});
test("manager cannot read or update another portfolio", async () => {
  expect(
    (await asUser(db, manager, "select * from public.clients where id=$1", [ca])).rows,
  ).toHaveLength(0);
  await expect(
    asUser(db, manager, "select public.update_client($1,$2,1,$3)", [org, ca, { legalName: "no" }]),
  ).rejects.toThrow();
});
test("duplicate document in same organization fails; cross-org original fixture succeeds", async () => {
  await expect(
    db.query(
      "insert into public.clients(organization_id,person_type,legal_name,tax_document) values($1,'individual','duplicate','52998224725')",
      [org],
    ),
  ).rejects.toThrow();
  expect(
    (await db.query("select count(*)::int n from public.clients where tax_document='52998224725'"))
      .rows[0].n,
  ).toBe(2);
});
test("cross-organization ClientService fails at FK", async () => {
  await expect(
    db.query(
      "insert into public.client_services(organization_id,client_id,service_id,negotiated_unit_price_cents,billing_kind) values($1,$2,$3,100,'monthly')",
      [org, ca, s2],
    ),
  ).rejects.toThrow();
});
test("membership cannot reference foreign role or department", async () => {
  await expect(
    db.query("update public.organization_memberships set role_id=$1 where id=$2", [roleOther, mm]),
  ).rejects.toThrow();
  await expect(
    db.query("update public.organization_memberships set department_id=$1 where id=$2", [dep2, mm]),
  ).rejects.toThrow();
});
test("no direct version manipulation or activation writes", async () => {
  await expect(
    asUser(db, admin, "update public.clients set version=999 where id=$1", [ca]),
  ).rejects.toThrow();
  await expect(
    asUser(
      db,
      admin,
      "update public.clients set operational_status='active',activated_at=now() where id=$1",
      [ca],
    ),
  ).rejects.toThrow();
});
test("version increment is database owned and stale update fails", async () => {
  await asUser(db, admin, "select public.update_client($1,$2,1,$3)", [
    org,
    ca,
    { legalName: "Updated", version: 999, organization_id: org2, activated_at: "2026-01-01" },
  ]);
  const r = await db.query(
    "select version,organization_id,activated_at from public.clients where id=$1",
    [ca],
  );
  expect(r.rows[0]).toEqual({ version: 2, organization_id: org, activated_at: null });
  await expect(
    asUser(db, admin, "select public.update_client($1,$2,1,$3)", [org, ca, { legalName: "Stale" }]),
  ).rejects.toThrow();
});
test("service creation and reads enforce permissions", async () => {
  const input = {
    name: "New service",
    basePriceCents: "10000",
    currency: "BRL",
    billingKind: "monthly",
  };
  await expect(
    asUser(db, manager, "select public.save_service($1,$2)", [org, input]),
  ).rejects.toThrow();
  await asUser(db, admin, "select public.save_service($1,$2)", [org, input]);
  expect((await asUser(db, manager, "select name from public.services")).rows).toEqual([
    { name: "New service" },
  ]);
  expect((await asUser(db, outsider, "select name from public.services")).rows).toHaveLength(0);
});
test("composite create persists client/contact/service and never accepts activation input", async () => {
  const service = (await db.query("select id from public.services where organization_id=$1", [org]))
    .rows[0].id;
  const r = await asUser(db, manager, "select public.create_client($1,$2) id", [
    org,
    {
      personType: "company",
      legalName: "Created",
      activated_at: "2026-01-01",
      operational_status: "active",
      contacts: [
        { name: "Contact", type: "principal", email: "contact@example.test", isPrimary: true },
      ],
      services: [{ serviceId: service, priceCents: "20000", quantity: "1" }],
    },
  ]);
  const id = r.rows[0].id;
  expect(
    (await asUser(db, manager, "select id from public.clients where id=$1", [id])).rows,
  ).toHaveLength(1);
  expect(
    (await db.query("select * from public.client_contacts where client_id=$1", [id])).rows,
  ).toHaveLength(1);
  expect(
    (await db.query("select * from public.client_services where client_id=$1", [id])).rows,
  ).toHaveLength(1);
  expect(
    (await db.query("select operational_status from public.clients where id=$1", [id])).rows[0]
      .operational_status,
  ).toBe("activation_pending");
});
test("failed child insert rolls back the entire create", async () => {
  await expect(
    asUser(db, admin, "select public.create_client($1,$2)", [
      org,
      {
        personType: "company",
        legalName: "Must rollback",
        services: [{ serviceId: s2, priceCents: "1", quantity: "1" }],
      },
    ]),
  ).rejects.toThrow();
  expect(
    (await db.query("select id from public.clients where legal_name='Must rollback'")).rows,
  ).toHaveLength(0);
});
test("unknown client does not fallback to Boreal", () => {
  expect(getClientDetail("unknown")).toBeNull();
  expect(getClientDetail("gamma")).toBeNull();
});
test("CPF/CNPJ and input validation", () => {
  expect(validDocument("529.982.247-25", "individual")).toBe(true);
  expect(validDocument("11.222.333/0001-81", "company")).toBe(true);
  expect(validDocument("11111111111", "individual")).toBe(false);
  expect(
    createClientInput.safeParse({
      personType: "company",
      legalName: "Test",
      taxDocument: "11222333000180",
      entryDate: "2026-02-30",
    }).success,
  ).toBe(false);
});
test("raw SQL invalid CPF, quantity, date range and duplicate primary contacts fail", async () => {
  await expect(
    db.query(
      "insert into public.clients(organization_id,person_type,legal_name,tax_document) values($1,'individual','Invalid','11111111111')",
      [org],
    ),
  ).rejects.toThrow();
  await db.query(
    "insert into public.client_contacts(organization_id,client_id,name,contact_type,email,is_primary) values($1,$2,'First','principal','a@example.test',true)",
    [org, cm],
  );
  await expect(
    db.query(
      "insert into public.client_contacts(organization_id,client_id,name,contact_type,email,is_primary) values($1,$2,'Second','principal','b@example.test',true)",
      [org, cm],
    ),
  ).rejects.toThrow();
});
test("self promotion and private bootstrap execution are denied", async () => {
  await expect(
    asUser(db, manager, "select public.set_team_member($1,$2,$3,$4,1)", [org, mm, role, "active"]),
  ).rejects.toThrow();
  await expect(asUser(db, admin, "select private.bootstrap_vyon($1)", [admin])).rejects.toThrow();
});

test("invalid quantities and reversed dates fail in PostgreSQL", async () => {
  const service = (await db.query("select id from public.services where organization_id=$1", [org]))
    .rows[0].id;
  for (const [quantity, start, end] of [
    [0, "2026-01-01", "2026-01-02"],
    [1, "2026-02-01", "2026-01-01"],
  ]) {
    await expect(
      db.query(
        "insert into public.client_services(organization_id,client_id,service_id,negotiated_unit_price_cents,quantity,billing_kind,starts_on,ends_on) values($1,$2,$3,100,$4,'monthly',$5,$6)",
        [org, cm, service, quantity, start, end],
      ),
    ).rejects.toThrow();
  }
});
test("revocation takes effect for the same authenticated identity", async () => {
  await asUser(db, admin, "select public.set_team_member($1,$2,$3,'disabled',1)", [org, mm, role2]);
  expect((await asUser(db, manager, "select * from public.clients")).rows).toHaveLength(0);
  await expect(
    asUser(db, manager, "select public.create_client($1,$2)", [
      org,
      { personType: "company", legalName: "Denied" },
    ]),
  ).rejects.toThrow();
  await asUser(db, admin, "select public.set_team_member($1,$2,$3,'active',2)", [org, mm, role2]);
});
test("only confirmed exact email can accept an invitation", async () => {
  const invited = "20000000-0000-4000-8000-000000000005";
  await db.query("insert into auth.users(id,email) values($1,'invite@example.test')", [invited]);
  await db.query(
    "insert into public.organization_memberships(organization_id,invited_email,role_id) values($1,'invite@example.test',$2)",
    [org, role2],
  );
  await asUser(db, outsider, "select public.accept_invitation()");
  await asUser(db, invited, "select public.accept_invitation()");
  expect((await asUser(db, invited, "select * from public.organizations")).rows).toHaveLength(0);
  await db.query("update auth.users set email_confirmed_at=now() where id=$1", [invited]);
  await asUser(db, invited, "select public.accept_invitation()");
  expect((await asUser(db, invited, "select * from public.organizations")).rows).toHaveLength(1);
  const row = (
    await db.query("select version from public.organization_memberships where user_id=$1", [
      invited,
    ])
  ).rows[0];
  await asUser(db, invited, "select public.accept_invitation()");
  expect(
    (
      await db.query("select version from public.organization_memberships where user_id=$1", [
        invited,
      ])
    ).rows[0],
  ).toEqual(row);
});
test("administrator cannot change own role even with team.manage", async () => {
  await expect(
    asUser(db, admin, "select public.set_team_member($1,$2,$3,'active',1)", [org, ma, role2]),
  ).rejects.toThrow();
});

test("malformed money/document yields validation error without throwing", () => {
  expect(cents.safeParse("abc").success).toBe(false);
  expect(cents.safeParse("1.5").success).toBe(false);
  expect(validDocument("abc", "company")).toBe(false);
});
