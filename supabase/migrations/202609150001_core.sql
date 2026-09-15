-- Stage 4: exactly eleven application tables. No activation engine yet.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create table public.organizations (
 id uuid primary key default gen_random_uuid(), name text not null check(btrim(name)<>''),
 legal_name text, tax_document text, timezone text not null default 'America/Sao_Paulo',
 currency text not null default 'BRL' check(currency ~ '^[A-Z]{3}$'),
 status text not null default 'active' check(status in ('active','inactive')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.profiles (
 id uuid primary key references auth.users(id) on delete restrict,
 display_name text not null check(btrim(display_name)<>''),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.permissions (id uuid primary key default gen_random_uuid(), code text not null unique, description text not null);
create table public.departments (
id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,id),
name text not null check(btrim(name)<>''), archived_at timestamptz
);
create table public.roles (
id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,id),
name text not null check(btrim(name)<>''), description text, archived_at timestamptz
);
create table public.organization_memberships (
id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,id),
version integer not null default 1 check(version>0),
user_id uuid references public.profiles(id), invited_email text not null check(invited_email ~ '^[^ @]+@[^ @]+\.[^ @]+$'),
 role_id uuid not null, department_id uuid, status text not null default 'invited' check(status in ('invited','active','disabled','revoked')),
 invited_by_membership_id uuid, accepted_at timestamptz, disabled_at timestamptz,
 foreign key(organization_id,role_id) references public.roles(organization_id,id),
 foreign key(organization_id,department_id) references public.departments(organization_id,id),
 foreign key(organization_id,invited_by_membership_id) references public.organization_memberships(organization_id,id),
 unique(organization_id,user_id), check(status<>'active' or (user_id is not null and accepted_at is not null))
);
create table public.role_permissions (
id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,id),
role_id uuid not null, permission_id uuid not null references public.permissions(id),
 foreign key(organization_id,role_id) references public.roles(organization_id,id), unique(organization_id,role_id,permission_id)
);
create table public.clients (
id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,id),
version integer not null default 1 check(version>0),
person_type text not null check(person_type in ('individual','company')),
 legal_name text not null check(btrim(legal_name)<>''), trade_name text, tax_document text,
 email text check(email is null or email ~ '^[^ @]+@[^ @]+\.[^ @]+$'), phone text,
 postal_code text, street text, address_number text, address_complement text, district text, city text, state text,
 country text not null default 'BR' check(country ~ '^[A-Z]{2}$'),
 manager_membership_id uuid, entry_date date not null default current_date,
 origin text not null default 'manual' check(origin in ('manual','crm')),
 notes text, operational_status text not null default 'activation_pending' check(operational_status in ('activation_pending','active','closed')),
 activated_at timestamptz, closed_at timestamptz, archived_at timestamptz,
 foreign key(organization_id,manager_membership_id) references public.organization_memberships(organization_id,id),
 check(operational_status<>'active' or activated_at is not null),
 check(operational_status<>'closed' or closed_at is not null)
);
create table public.client_contacts (
id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,id),
version integer not null default 1 check(version>0),
client_id uuid not null, name text not null check(btrim(name)<>''),
 contact_type text not null check(contact_type in ('principal','financial','marketing','administrative')),
 email text check(email is null or email ~ '^[^ @]+@[^ @]+\.[^ @]+$'), phone text,
 is_primary boolean not null default false, archived_at timestamptz,
 foreign key(organization_id,client_id) references public.clients(organization_id,id),
 check(nullif(btrim(email),'') is not null or nullif(btrim(phone),'') is not null)
);
create table public.services (
id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,id),
version integer not null default 1 check(version>0),
name text not null check(btrim(name)<>''), description text,
 base_price_cents bigint check(base_price_cents between 0 and 9007199254740991), currency text not null default 'BRL' check(currency ~ '^[A-Z]{3}$'),
 billing_kind text not null default 'monthly' check(billing_kind in ('monthly','one_time')), archived_at timestamptz
);
create table public.client_services (
id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,id),
version integer not null default 1 check(version>0),
client_id uuid not null, service_id uuid not null,
 status text not null default 'planned' check(status in ('planned','in_progress','completed','cancelled')),
 negotiated_unit_price_cents bigint not null check(negotiated_unit_price_cents between 0 and 9007199254740991),
 quantity numeric(12,4) not null default 1 check(quantity>0 and quantity<100000000),
 currency text not null default 'BRL' check(currency ~ '^[A-Z]{3}$'), billing_kind text not null check(billing_kind in ('monthly','one_time')),
 starts_on date, ends_on date, notes text, archived_at timestamptz,
 foreign key(organization_id,client_id) references public.clients(organization_id,id),
 foreign key(organization_id,service_id) references public.services(organization_id,id),
 check(ends_on is null or starts_on is null or ends_on>=starts_on)
);

create unique index departments_name_uq on public.departments(organization_id,lower(btrim(name)));
create unique index roles_name_uq on public.roles(organization_id,lower(btrim(name)));
create unique index services_name_uq on public.services(organization_id,lower(btrim(name)));
create unique index members_email_uq on public.organization_memberships(organization_id,lower(btrim(invited_email)));
create unique index clients_document_uq on public.clients(organization_id,tax_document) where tax_document is not null;
create unique index contacts_primary_uq on public.client_contacts(organization_id,client_id) where is_primary and archived_at is null;
create index members_user_status_idx on public.organization_memberships(user_id,status);
create index members_role_idx on public.organization_memberships(organization_id,role_id);
create index members_department_idx on public.organization_memberships(organization_id,department_id);
create index role_permissions_permission_idx on public.role_permissions(permission_id);
create index clients_manager_idx on public.clients(organization_id,manager_membership_id,operational_status);
create index clients_status_idx on public.clients(organization_id,operational_status);
create index clients_entry_idx on public.clients(organization_id,entry_date,id);
create index contacts_client_idx on public.client_contacts(organization_id,client_id);
create index client_services_client_idx on public.client_services(organization_id,client_id,status);
create index client_services_service_idx on public.client_services(organization_id,service_id);

create function private.touch_row() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' and to_jsonb(new)->'organization_id' is distinct from to_jsonb(old)->'organization_id' then
   raise exception 'organization_id is immutable' using errcode='23514';
 end if;
 if tg_op='UPDATE' and new.id is distinct from old.id then raise exception 'id is immutable' using errcode='23514'; end if;
 new.updated_at:=now();
 if to_jsonb(new) ? 'version' then
   new:=jsonb_populate_record(new,jsonb_build_object('version',case when tg_op='INSERT' then 1 else (to_jsonb(old)->>'version')::integer+1 end));
 end if;
 return new;
end $$;

-- Numeric CPF/CNPJ check digits; normalized documents are also checked in application inputs.
create function private.valid_document(doc text, kind text) returns boolean
language plpgsql immutable set search_path='' as $$
declare n integer; i integer; j integer; total integer; weight integer; digit integer;
begin
 if doc is null then return true; end if;
 n:=case kind when 'individual' then 11 when 'company' then 14 else 0 end;
 if length(doc)<>n or doc !~ '^[0-9]+$' or doc=repeat(substr(doc,1,1),n) then return false; end if;
 for j in n-1..n loop
   total:=0;
   for i in 1..j-1 loop
     weight:=case when n=11 then j+1-i else ((j-1-i)%8)+2 end;
     total:=total+substr(doc,i,1)::integer*weight;
   end loop;
   digit:=case when total%11<2 then 0 else 11-total%11 end;
   if substr(doc,j,1)::integer<>digit then return false; end if;
 end loop;
 return true;
end $$;
alter table public.clients add constraint clients_document_check check(private.valid_document(tax_document,person_type));

-- Narrow authorization predicates avoid recursive membership/role RLS.
create function private.member_id(org uuid) returns uuid language sql stable security definer set search_path='' as $$
 select m.id from public.organization_memberships m
 join public.organizations o on o.id=m.organization_id and o.status='active'
 join public.roles r on r.id=m.role_id and r.organization_id=m.organization_id and r.archived_at is null
 where m.organization_id=org and m.user_id=auth.uid() and m.status='active'
$$;
create function private.has_permission(org uuid, permission_code text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.organization_memberships m
 join public.role_permissions rp on rp.role_id=m.role_id and rp.organization_id=m.organization_id
 join public.permissions p on p.id=rp.permission_id
 where m.id=private.member_id(org) and p.code=permission_code)
$$;
create function private.can_read_client(org uuid, client uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.has_permission(org,'clients.read') and exists(select 1 from public.clients c where c.id=client and c.organization_id=org
 and (private.has_permission(org,'clients.read_all') or c.manager_membership_id=private.member_id(org)))
$$;
create function private.can_read_profile(profile uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.organization_memberships target where target.user_id=profile
 and private.member_id(target.organization_id) is not null
 and (target.user_id=auth.uid() or private.has_permission(target.organization_id,'team.read')))
$$;
create trigger touch_row before insert or update on public.organizations for each row execute function private.touch_row();
create trigger touch_row before insert or update on public.profiles for each row execute function private.touch_row();
create trigger touch_row before insert or update on public.departments for each row execute function private.touch_row();
create trigger touch_row before insert or update on public.roles for each row execute function private.touch_row();
create trigger touch_row before insert or update on public.organization_memberships for each row execute function private.touch_row();
create trigger touch_row before insert or update on public.role_permissions for each row execute function private.touch_row();
create trigger touch_row before insert or update on public.clients for each row execute function private.touch_row();
create trigger touch_row before insert or update on public.client_contacts for each row execute function private.touch_row();
create trigger touch_row before insert or update on public.services for each row execute function private.touch_row();
create trigger touch_row before insert or update on public.client_services for each row execute function private.touch_row();
alter table public.organizations enable row level security;
revoke all on public.organizations from anon, authenticated;
grant select on public.organizations to authenticated;
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
alter table public.permissions enable row level security;
revoke all on public.permissions from anon, authenticated;
grant select on public.permissions to authenticated;
alter table public.departments enable row level security;
revoke all on public.departments from anon, authenticated;
grant select on public.departments to authenticated;
alter table public.roles enable row level security;
revoke all on public.roles from anon, authenticated;
grant select on public.roles to authenticated;
alter table public.organization_memberships enable row level security;
revoke all on public.organization_memberships from anon, authenticated;
grant select on public.organization_memberships to authenticated;
alter table public.role_permissions enable row level security;
revoke all on public.role_permissions from anon, authenticated;
grant select on public.role_permissions to authenticated;
alter table public.clients enable row level security;
revoke all on public.clients from anon, authenticated;
grant select on public.clients to authenticated;
alter table public.client_contacts enable row level security;
revoke all on public.client_contacts from anon, authenticated;
grant select on public.client_contacts to authenticated;
alter table public.services enable row level security;
revoke all on public.services from anon, authenticated;
grant select on public.services to authenticated;
alter table public.client_services enable row level security;
revoke all on public.client_services from anon, authenticated;
grant select on public.client_services to authenticated;
create policy organizations_read on public.organizations for select to authenticated using (private.member_id(id) is not null);
create policy profiles_read on public.profiles for select to authenticated using (private.can_read_profile(id));
create policy permissions_read on public.permissions for select to authenticated using (exists(select 1 from public.organization_memberships m where m.user_id=auth.uid() and m.status='active'));
create policy organization_memberships_read on public.organization_memberships for select to authenticated using (private.member_id(organization_id) is not null and (user_id=auth.uid() or private.has_permission(organization_id,'team.read')));
create policy roles_read on public.roles for select to authenticated using (private.member_id(organization_id) is not null);
create policy departments_read on public.departments for select to authenticated using (private.member_id(organization_id) is not null);
create policy role_permissions_read on public.role_permissions for select to authenticated using (private.member_id(organization_id) is not null);
create policy clients_read on public.clients for select to authenticated using (private.can_read_client(organization_id,id));
create policy client_contacts_read on public.client_contacts for select to authenticated using (private.can_read_client(organization_id,client_id));
create policy client_services_read on public.client_services for select to authenticated using (private.can_read_client(organization_id,client_id));
create policy services_read on public.services for select to authenticated using (private.has_permission(organization_id,'services.read'));

-- No direct INSERT/UPDATE/DELETE grants. Narrow RPC commands below are the write boundary.
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.member_id(uuid), private.has_permission(uuid,text), private.can_read_client(uuid,uuid), private.can_read_profile(uuid), private.valid_document(text,text) to authenticated;
