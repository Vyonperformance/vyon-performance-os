-- Stage 5 only. Existing migration files are immutable.
create table public.integrations (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 name text not null check(length(btrim(name)) between 1 and 120), category text not null check(category in ('system','orchestrator','other')),
 status text not null default 'active' check(status in ('active','disabled')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,id)
);
create table public.api_keys (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), integration_id uuid not null,
 name text not null check(length(btrim(name)) between 1 and 120), prefix text not null unique check(prefix ~ '^vyon_[a-f0-9]{24}$'),
 key_hash text not null check(key_hash ~ '^[a-f0-9]{64}$'),
 scopes text[] not null check(cardinality(scopes) between 1 and 4 and scopes <@ array['clients.read','clients.create','services.read','webhooks.receive']::text[] and array_position(scopes,null) is null),
 status text not null default 'active' check(status in ('active','revoked')), expires_at timestamptz, revoked_at timestamptz, last_used_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,id), foreign key(organization_id,integration_id) references public.integrations(organization_id,id),
 check((status='revoked')=(revoked_at is not null))
);
create table public.webhook_events (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), integration_id uuid not null,
 external_event_id text not null check(length(external_event_id) between 1 and 160),
 event_type text not null check(event_type in ('client.create','unsupported')),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=65536),
 request_hash text not null check(request_hash ~ '^[a-f0-9]{64}$'), status text not null check(status in ('received','processed','failed')),
 response jsonb, response_status integer check(response_status between 200 and 599), error_code text check(error_code in ('unsupported_event','invalid_payload','domain_conflict','processing_failed')),
 received_at timestamptz not null default now(), processed_at timestamptz,
 unique(organization_id,id), unique(organization_id,integration_id,external_event_id),
 foreign key(organization_id,integration_id) references public.integrations(organization_id,id)
);
create table public.domain_events (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 event_type text not null, schema_version integer not null default 1 check(schema_version>0),
 aggregate_type text not null, aggregate_id uuid not null, payload jsonb not null check(jsonb_typeof(payload)='object'),
 occurred_at timestamptz not null default now(), unique(organization_id,id)
);
create table public.integration_logs (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), integration_id uuid not null,
 direction text not null check(direction in ('inbound','outbound')),
 operation text not null check(operation in ('clients.read','clients.create','services.read','webhooks.receive')),
 status text not null check(status in ('succeeded','failed','duplicate')),
 request_id uuid not null, webhook_event_id uuid,
 response_status integer not null check(response_status between 200 and 599),
 error_code text check(error_code in ('unsupported_event','invalid_payload','domain_conflict','processing_failed','idempotency_conflict','insufficient_scope','not_found','payload_too_large','invalid_request')),
 created_at timestamptz not null default now(),
 foreign key(organization_id,integration_id) references public.integrations(organization_id,id),
 foreign key(organization_id,webhook_event_id) references public.webhook_events(organization_id,id)
);
create index integrations_org_idx on public.integrations(organization_id,created_at,id);
create index api_keys_integration_idx on public.api_keys(organization_id,integration_id);
create index webhook_events_received_idx on public.webhook_events(organization_id,received_at,id);
create index domain_events_occurred_idx on public.domain_events(organization_id,occurred_at,id);
create index integration_logs_integration_idx on public.integration_logs(organization_id,integration_id,created_at);
create index integration_logs_event_idx on public.integration_logs(organization_id,webhook_event_id);
create trigger touch_row before insert or update on public.integrations for each row execute function private.touch_row();
create trigger touch_row before insert or update on public.api_keys for each row execute function private.touch_row();

alter table public.integrations enable row level security;
alter table public.api_keys enable row level security;
alter table public.webhook_events enable row level security;
alter table public.domain_events enable row level security;
alter table public.integration_logs enable row level security;
revoke all on public.integrations,public.api_keys,public.webhook_events,public.domain_events,public.integration_logs from public,anon,authenticated,service_role;
grant select on public.integrations,public.integration_logs to authenticated;
-- Column grant: SELECT * and key_hash are forbidden even to a human administrator.
grant select(id,organization_id,integration_id,name,prefix,scopes,status,expires_at,revoked_at,last_used_at,created_at,updated_at) on public.api_keys to authenticated;
create policy integrations_read on public.integrations for select to authenticated using(private.has_permission(organization_id,'integrations.manage'));
create policy api_keys_read on public.api_keys for select to authenticated using(private.has_permission(organization_id,'integrations.manage'));
create policy integration_logs_read on public.integration_logs for select to authenticated using(private.has_permission(organization_id,'integrations.manage'));
-- No human/Data API access policies for inbox payloads or immutable domain records.

create function public.save_integration(p_org uuid,p_name text,p_category text,p_status text,p_id uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 perform private.require_permission(p_org,'integrations.manage');
 if p_id is null then
  insert into public.integrations(organization_id,name,category,status) values(p_org,btrim(p_name),p_category,p_status) returning id into result;
 else
  update public.integrations set name=btrim(p_name),category=p_category,status=p_status where organization_id=p_org and id=p_id returning id into result;
  if result is null then raise exception 'Not found' using errcode='P0002'; end if;
 end if;
 return result;
end $$;
create function public.issue_integration_key(p_org uuid,p_integration uuid,p_name text,p_prefix text,p_hash text,p_scopes text[],p_expires timestamptz default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 perform private.require_permission(p_org,'integrations.manage');
 perform 1 from public.integrations where organization_id=p_org and id=p_integration and status='active' for share;
 if not found then raise exception 'Integration unavailable' using errcode='42501'; end if;
 if p_expires is not null and p_expires<=now() then raise exception 'Invalid expiry' using errcode='23514'; end if;
 insert into public.api_keys(organization_id,integration_id,name,prefix,key_hash,scopes,expires_at)
 values(p_org,p_integration,btrim(p_name),p_prefix,p_hash,p_scopes,p_expires) returning id into result;
 return result;
end $$;
create function public.revoke_integration_key(p_org uuid,p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform private.require_permission(p_org,'integrations.manage');
 update public.api_keys set status='revoked',revoked_at=coalesce(revoked_at,now()) where organization_id=p_org and id=p_id;
 if not found then raise exception 'Not found' using errcode='P0002'; end if;
end $$;

-- Backend-only lookup. The hash must never be returned through an application route.
create function public.integration_key_lookup(p_prefix text) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',k.id,'hash',k.key_hash) from public.api_keys k
 join public.integrations i on i.id=k.integration_id and i.organization_id=k.organization_id
 join public.organizations o on o.id=k.organization_id
 where k.prefix=p_prefix and k.status='active' and (k.expires_at is null or k.expires_at>now()) and i.status='active' and o.status='active'
$$;

create function private.reject_domain_event_change() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Domain events are immutable' using errcode='42501'; end $$;
create trigger domain_events_immutable before update or delete on public.domain_events for each row execute function private.reject_domain_event_change();
create function private.emit_client_created() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.domain_events(organization_id,event_type,aggregate_type,aggregate_id,payload)
 values(new.organization_id,'client.created','client',new.id,jsonb_build_object('clientId',new.id,'version',new.version));
 return new;
end $$;
create trigger client_created_event after insert on public.clients for each row execute function private.emit_client_created();
-- Preserve manual/CRM origins while distinguishing externally created records.
alter table public.clients drop constraint clients_origin_check;
alter table public.clients add constraint clients_origin_check check(origin in ('manual','crm','integration'));

-- One transaction for authentication recheck, inbox, domain write, event and log.
-- No caller-selected tenant. No Supabase user impersonation. This RPC is backend-only.
create function public.integration_request(p_key uuid,p_hash text,p_operation text,p_input jsonb,p_event_id text,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare k public.api_keys; ev public.webhook_events; new_event uuid; client_id uuid; result jsonb; code text; http integer; fingerprint text; etype text; body jsonb; required_scope text;
begin
 select * into k from public.api_keys where id=p_key for update;
 if not found or k.key_hash is distinct from p_hash or k.status<>'active' or (k.expires_at is not null and k.expires_at<=clock_timestamp()) then
  raise exception 'Invalid credential' using errcode='28000';
 end if;
 perform 1 from public.integrations where id=k.integration_id and organization_id=k.organization_id and status='active' for share;
 if not found then raise exception 'Invalid credential' using errcode='28000'; end if;
 perform 1 from public.organizations where id=k.organization_id and status='active' for share;
 if not found then raise exception 'Invalid credential' using errcode='28000'; end if;
 if p_operation not in ('clients.read','clients.create','services.read','webhooks.receive') or p_operation is null then raise exception 'Invalid operation' using errcode='42501'; end if;
 update public.api_keys set last_used_at=now() where id=k.id;
 required_scope:=case when p_operation='webhooks.receive' and p_input->>'type'='client.create' then 'clients.create' else p_operation end;
 if not (p_operation=any(k.scopes) and required_scope=any(k.scopes)) then
  http:=403; code:='insufficient_scope';
 elsif p_input ? 'rejection' then
  code:=p_input->>'rejection';
  if code not in ('invalid_payload','payload_too_large','invalid_request') then code:='invalid_request'; end if;
  http:=case when code='payload_too_large' then 413 else 400 end;
 elsif p_operation='clients.read' then
  select jsonb_build_object('id',id,'name',legal_name,'personType',person_type,'version',version,'operationalStatus',operational_status) into result
  from public.clients where organization_id=k.organization_id and id=(p_input->>'id')::uuid and archived_at is null;
  http:=case when result is null then 404 else 200 end; code:=case when result is null then 'not_found' end;
 elsif p_operation='services.read' then
  select jsonb_build_object('items',coalesce(jsonb_agg(row_data),'[]'::jsonb)) into result from (
   select jsonb_build_object('id',id,'name',name,'priceCents',base_price_cents::text,'currency',currency,'billingKind',billing_kind) row_data
   from public.services where organization_id=k.organization_id and archived_at is null
   and (nullif(p_input->>'after','') is null or id>(p_input->>'after')::uuid) order by id limit 50
  ) s;
  http:=200;
 else
  if p_event_id is null or length(p_event_id) not between 1 and 160 then
   http:=400; code:='invalid_request';
  else
   etype:=case when p_operation='clients.create' then 'client.create' when p_input->>'type'='client.create' then 'client.create' else 'unsupported' end;
   body:=case when etype='unsupported' then '{}'::jsonb when p_operation='clients.create' then p_input else p_input->'data' end;
   fingerprint:=encode(sha256(convert_to(jsonb_build_object('operation',p_operation,'input',p_input)::text,'UTF8')),'hex');
   insert into public.webhook_events(organization_id,integration_id,external_event_id,event_type,payload,request_hash,status)
   values(k.organization_id,k.integration_id,p_event_id,etype,body,fingerprint,'received')
   on conflict(organization_id,integration_id,external_event_id) do nothing returning id into new_event;
   if new_event is null then
    select * into ev from public.webhook_events where organization_id=k.organization_id and integration_id=k.integration_id and external_event_id=p_event_id for update;
    if ev.request_hash<>fingerprint then
     http:=409; code:='idempotency_conflict';
    else
     insert into public.integration_logs(organization_id,integration_id,direction,operation,status,request_id,webhook_event_id,response_status,error_code)
     values(k.organization_id,k.integration_id,'inbound',p_operation,'duplicate',p_request_id,ev.id,ev.response_status,ev.error_code);
     return jsonb_build_object('status',ev.response_status,'data',ev.response,'error',ev.error_code,'eventId',ev.id,'duplicate',true);
    end if;
   else
    if etype='unsupported' then http:=422; code:='unsupported_event';
    else
     begin
      -- Minimal external command: no tenant, manager, status, role or activation input.
      if jsonb_typeof(body)<>'object' or body - array['personType','name','taxDocument','email','phone']::text[]<>'{}'::jsonb
       or length(coalesce(btrim(body->>'name'),'')) not between 1 and 200 then
       raise exception 'Invalid payload' using errcode='23514';
      end if;
      insert into public.clients(organization_id,person_type,legal_name,tax_document,email,phone,origin)
      values(k.organization_id,body->>'personType',btrim(body->>'name'),nullif(body->>'taxDocument',''),nullif(body->>'email',''),nullif(body->>'phone',''),'integration') returning id into client_id;
      result:=jsonb_build_object('id',client_id,'operationalStatus','activation_pending'); http:=201;
     exception
      when unique_violation then http:=409; code:='domain_conflict';
      when check_violation or not_null_violation or invalid_text_representation then http:=422; code:='invalid_payload';
      when others then http:=500; code:='processing_failed';
     end;
    end if;
    update public.webhook_events set status=case when code is null then 'processed' else 'failed' end,
     response=result,response_status=http,error_code=code,processed_at=now() where id=new_event;
   end if;
  end if;
 end if;
 insert into public.integration_logs(organization_id,integration_id,direction,operation,status,request_id,webhook_event_id,response_status,error_code)
 values(k.organization_id,k.integration_id,'inbound',p_operation,case when code is null then 'succeeded' else 'failed' end,p_request_id,new_event,http,code);
 return jsonb_build_object('status',http,'data',result,'error',code,'eventId',new_event,'duplicate',false);
end $$;

revoke all on function private.reject_domain_event_change(),private.emit_client_created() from public,anon,authenticated,service_role;
revoke all on function public.save_integration(uuid,text,text,text,uuid),public.issue_integration_key(uuid,uuid,text,text,text,text[],timestamptz),public.revoke_integration_key(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.save_integration(uuid,text,text,text,uuid),public.issue_integration_key(uuid,uuid,text,text,text,text[],timestamptz),public.revoke_integration_key(uuid,uuid) to authenticated;
revoke all on function public.integration_key_lookup(text),public.integration_request(uuid,text,text,jsonb,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.integration_key_lookup(text),public.integration_request(uuid,text,text,jsonb,text,uuid) to service_role;
