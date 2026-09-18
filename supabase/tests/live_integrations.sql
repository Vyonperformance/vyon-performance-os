-- Operator-run homologation on the confirmed Vyon project. ALL fixtures are rolled back.
-- Uses the existing, owner-supplied Auth user; creates no Auth users or permanent credentials.
begin;
select set_config('request.jwt.claim.sub','b501890b-4521-412d-b7a5-d0946b8ad48f',true);
do $$
declare org uuid;
begin
 select organization_id into strict org from public.organization_memberships where user_id='b501890b-4521-412d-b7a5-d0946b8ad48f' and status='active';
 perform set_config('vyon.test_org',org::text,true);
 perform set_config('vyon.test_hash',encode(sha256(convert_to(gen_random_uuid()::text,'UTF8')),'hex'),true);
 perform set_config('vyon.test_prefix','vyon_'||substr(replace(gen_random_uuid()::text,'-',''),1,24),true);
end $$;
set local role authenticated;
do $$
declare i uuid; k uuid; org uuid:=current_setting('vyon.test_org')::uuid;
begin
 if current_user<>'authenticated' then raise exception 'Wrong test role'; end if;
 i:=public.save_integration(org,'Temporary homologation','system','active');
 k:=public.issue_integration_key(org,i,'Temporary key',current_setting('vyon.test_prefix'),current_setting('vyon.test_hash'),array['clients.read','clients.create','services.read','webhooks.receive'],null);
 perform set_config('vyon.test_integration',i::text,true); perform set_config('vyon.test_key',k::text,true);
 if not exists(select 1 from public.api_keys where id=k) then raise exception 'Metadata not visible'; end if;
 begin perform key_hash from public.api_keys where id=k; raise exception 'Hash leaked'; exception when insufficient_privilege then null; end;
 begin update public.integrations set status='disabled' where id=i; raise exception 'Direct write allowed'; exception when insufficient_privilege then null; end;
 begin perform public.integration_key_lookup(current_setting('vyon.test_prefix')); raise exception 'Bridge exposed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Unrelated organization and integration; no user account or membership in that organization.
do $$
declare o uuid; i uuid; k uuid;
begin
 insert into public.organizations(name) values('Temporary isolated organization') returning id into o;
 insert into public.integrations(organization_id,name,category) values(o,'Temporary other','other') returning id into i;
 insert into public.api_keys(organization_id,integration_id,name,prefix,key_hash,scopes)
 values(o,i,'Temporary other key','vyon_'||substr(replace(gen_random_uuid()::text,'-',''),1,24),current_setting('vyon.test_hash'),array['clients.read','clients.create','services.read','webhooks.receive']) returning id into k;
 perform set_config('vyon.test_other_org',o::text,true); perform set_config('vyon.test_other_key',k::text,true);
end $$;
set local role authenticated;
do $$
begin
 if exists(select 1 from public.integrations where organization_id=current_setting('vyon.test_other_org')::uuid) then raise exception 'Cross organization leak'; end if;
end $$;
set local role service_role;
do $$
declare a jsonb; b jsonb; request jsonb:='{"personType":"company","name":"Temporary client"}'; k uuid:=current_setting('vyon.test_key')::uuid; h text:=current_setting('vyon.test_hash');
begin
 if current_user<>'service_role' then raise exception 'Wrong test role'; end if;
 if public.integration_key_lookup(current_setting('vyon.test_prefix'))->>'hash'<>h then raise exception 'Lookup mismatch'; end if;
 a:=public.integration_request(k,h,'clients.create',request,'test-dedup',gen_random_uuid());
 if (a->>'status')::int<>201 then raise exception 'Create failed: %',a->>'error'; end if;
 perform set_config('vyon.test_client',a->'data'->>'id',true);
 b:=public.integration_request(k,h,'clients.create',request,'test-dedup',gen_random_uuid());
 if b->'data'<>a->'data' or b->>'duplicate'<>'true' then raise exception 'Dedup failed'; end if;
 b:=public.integration_request(k,h,'clients.create','{"personType":"company","name":"Changed"}','test-dedup',gen_random_uuid());
 if (b->>'status')::int<>409 then raise exception 'Conflict not detected'; end if;
 b:=public.integration_request(current_setting('vyon.test_other_key')::uuid,h,'clients.create',request,'test-dedup',gen_random_uuid());
 if (b->>'status')::int<>201 or b->'data'=a->'data' then raise exception 'Other tenant collision'; end if;
 b:=public.integration_request(current_setting('vyon.test_other_key')::uuid,h,'clients.read',jsonb_build_object('id',current_setting('vyon.test_client')),null,gen_random_uuid());
 if (b->>'status')::int<>404 then raise exception 'Tenant read leak'; end if;
 b:=public.integration_request(k,h,'webhooks.receive','{"type":"unsupported","fingerprint":"not retained content"}','unsupported',gen_random_uuid());
 if b->>'error'<>'unsupported_event' then raise exception 'Unsupported not tracked'; end if;
 b:=public.integration_request(k,h,'webhooks.receive','{"type":"client.create","data":{"personType":"company","name":"Webhook client"}}','webhook',gen_random_uuid());
 if (b->>'status')::int<>201 then raise exception 'Webhook failed'; end if;
 b:=public.integration_request(k,h,'clients.create','{"personType":"company","name":"Injected","organization_id":"00000000-0000-0000-0000-000000000000"}','injection',gen_random_uuid());
 if b->>'error'<>'invalid_payload' then raise exception 'Injection accepted'; end if;
 begin perform public.integration_request(k,repeat('0',64),'services.read','{}',null,gen_random_uuid()); raise exception 'Invalid key allowed'; exception when invalid_authorization_specification then null; end;
end $$;
reset role;
-- Revoke permissions temporarily to test the same real human with no integration management.
delete from public.role_permissions where organization_id=current_setting('vyon.test_org')::uuid and permission_id=(select id from public.permissions where code='integrations.manage');
set local role authenticated;
do $$
begin
 if exists(select 1 from public.integrations) then raise exception 'Unauthorized visibility'; end if;
 begin perform public.save_integration(current_setting('vyon.test_org')::uuid,'Denied','system','active'); raise exception 'Missing permission allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Denied machine states, rechecked by the command itself rather than only lookup.
update public.api_keys set scopes=array['services.read'] where id=current_setting('vyon.test_key')::uuid;
set local role service_role;
do $$ declare r jsonb; begin
 r:=public.integration_request(current_setting('vyon.test_key')::uuid,current_setting('vyon.test_hash'),'clients.create','{}','denied',gen_random_uuid());
 if r->>'error'<>'insufficient_scope' then raise exception 'Scope bypass'; end if;
end $$;
reset role;
update public.integrations set status='disabled' where id=current_setting('vyon.test_integration')::uuid;
set local role service_role;
do $$ begin
 begin perform public.integration_request(current_setting('vyon.test_key')::uuid,current_setting('vyon.test_hash'),'services.read','{}',null,gen_random_uuid()); raise exception 'Disabled integration allowed'; exception when invalid_authorization_specification then null; end;
end $$;
reset role;
update public.integrations set status='active' where id=current_setting('vyon.test_integration')::uuid;
update public.api_keys set expires_at=now()-interval '1 second' where id=current_setting('vyon.test_key')::uuid;
set local role service_role;
do $$ begin
 begin perform public.integration_request(current_setting('vyon.test_key')::uuid,current_setting('vyon.test_hash'),'services.read','{}',null,gen_random_uuid()); raise exception 'Expired key allowed'; exception when invalid_authorization_specification then null; end;
end $$;
reset role;
update public.api_keys set expires_at=null,status='revoked',revoked_at=now() where id=current_setting('vyon.test_key')::uuid;
set local role service_role;
do $$ begin
 if public.integration_key_lookup(current_setting('vyon.test_prefix')) is not null then raise exception 'Revoked lookup allowed'; end if;
 begin perform public.integration_request(current_setting('vyon.test_key')::uuid,current_setting('vyon.test_hash'),'services.read','{}',null,gen_random_uuid()); raise exception 'Revoked key allowed'; exception when invalid_authorization_specification then null; end;
end $$;
reset role;
do $$ begin
 if (select count(*) from public.domain_events where aggregate_id=current_setting('vyon.test_client')::uuid)<>1 then raise exception 'Domain event duplicate'; end if;
 if exists(select 1 from public.integration_logs l where to_jsonb(l)::text like '%'||current_setting('vyon.test_hash')||'%') then raise exception 'Hash leaked into logs'; end if;
 begin update public.domain_events set event_type='tampered' where aggregate_id=current_setting('vyon.test_client')::uuid; raise exception 'Event mutable'; exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'live integration assertions passed; all fixtures rolled back' as result;
