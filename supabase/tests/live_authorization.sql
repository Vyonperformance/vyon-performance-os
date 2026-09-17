-- Run inside BEGIN with SET LOCAL vyon.test_user_id = '<REAL_AUTH_UUID>'.
-- The caller MUST ROLLBACK. No test users or credentials are created.
-- Temporarily modifies role permissions/membership only in this transaction.
do $$
declare
 uid uuid := current_setting('vyon.test_user_id')::uuid;
 org uuid; member uuid; role_id uuid; mail text;
 service_id uuid; test_client uuid; hidden_id uuid; foreign_org uuid; foreign_service uuid;
begin
 select m.organization_id,m.id,m.role_id,u.email into strict org,member,role_id,mail
 from public.organization_memberships m join auth.users u on u.id=m.user_id
 where m.user_id=uid and m.status='active';
 perform set_config('request.jwt.claim.sub',uid::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if current_user <> 'authenticated' or auth.uid() <> uid then raise exception 'Wrong test identity'; end if;
 if not private.has_permission(org,'clients.read_all') or not private.has_permission(org,'team.manage') then raise exception 'Admin grants missing'; end if;
 if (select count(*) from public.organizations where id=org)<>1 then raise exception 'Admin organization invisible'; end if;
 if (select count(*) from public.role_permissions where organization_id=org)<>20 then raise exception 'Permission catalog mismatch'; end if;
 service_id:=public.save_service(org,jsonb_build_object('name','Homologação temporária','currency','BRL','billingKind','monthly','basePriceCents','12345'));
 test_client:=public.create_client(org,jsonb_build_object('personType','company','legalName','Homologação temporária','managerId',member,'contacts',jsonb_build_array(jsonb_build_object('name','Homologação','email',mail,'type','principal','isPrimary',true)),'services',jsonb_build_array(jsonb_build_object('serviceId',service_id,'priceCents','12345','quantity','1'))));
 if (select count(*) from public.clients where id=test_client and version=1 and operational_status='activation_pending' and activated_at is null)<>1 then raise exception 'Client persistence failed'; end if;
 if (select count(*) from public.client_contacts cc where cc.client_id=test_client and cc.organization_id=org) < 1 then raise exception 'Contact persistence failed'; end if;
 if (select count(*) from public.client_services cs where cs.client_id=test_client)<>1 then raise exception 'Contracted service persistence failed'; end if;
 perform public.update_client(org,test_client,1,jsonb_build_object('legalName','Homologação atualizada'));
 if (select version from public.clients where id=test_client)<>2 then raise exception 'Version not incremented'; end if;
 begin
  perform public.update_client(org,test_client,1,jsonb_build_object('legalName','Stale'));
  raise exception 'Stale version accepted';
 exception when serialization_failure then null; end;
 begin
  update public.clients set version=999 where id=test_client;
  raise exception 'Direct write accepted';
 exception when insufficient_privilege then null; end;
 begin
  perform public.set_team_member(org,member,role_id,'disabled',1);
  raise exception 'Self role/status change accepted';
 exception when insufficient_privilege then null; end;
 begin
  perform private.bootstrap_vyon(uid);
  raise exception 'Public bootstrap accepted';
 exception when insufficient_privilege then null; end;
 execute 'reset role';
 insert into public.clients(organization_id,person_type,legal_name) values(org,'company','Carteira não atribuída temporária') returning id into hidden_id;
 insert into public.organizations(name) values('Organização temporária de homologação') returning id into foreign_org;
 insert into public.clients(organization_id,person_type,legal_name) values(foreign_org,'company','Outra organização temporária');
 insert into public.services(organization_id,name,billing_kind) values(foreign_org,'Serviço temporário externo','monthly') returning id into foreign_service;
 begin
  insert into public.client_services(organization_id,client_id,service_id,negotiated_unit_price_cents,billing_kind) values(org,test_client,foreign_service,100,'monthly');
  raise exception 'Cross-organization FK accepted';
 exception when foreign_key_violation then null; end;
 execute 'set local role authenticated';
 if (select count(*) from public.clients where id=hidden_id)<>1 then raise exception 'read_all not effective'; end if;
 if exists(select 1 from public.clients where organization_id=foreign_org) then raise exception 'Cross-organization read allowed'; end if;
 begin
  perform public.save_service(foreign_org,jsonb_build_object('name','Denied','currency','BRL','billingKind','monthly'));
  raise exception 'Cross-organization command allowed';
 exception when insufficient_privilege then null; end;
 execute 'reset role';
 delete from public.role_permissions rp using public.permissions p where rp.permission_id=p.id and rp.organization_id=org and p.code in ('clients.read_all','services.manage');
 execute 'set local role authenticated';
 if (select count(*) from public.clients where id=test_client)<>1 then raise exception 'Assigned client invisible'; end if;
 if exists(select 1 from public.clients where id=hidden_id) then raise exception 'Outside portfolio visible'; end if;
 begin
  perform public.update_client(org,hidden_id,1,jsonb_build_object('legalName','Denied'));
  raise exception 'Outside portfolio mutation allowed';
 exception when insufficient_privilege then null; end;
 begin
  perform public.save_service(org,jsonb_build_object('name','Denied','currency','BRL','billingKind','monthly'));
  raise exception 'Missing service permission ignored';
 exception when insufficient_privilege then null; end;
 execute 'reset role';
 update public.organization_memberships set status='disabled',disabled_at=now() where id=member;
 execute 'set local role authenticated';
 if exists(select 1 from public.organizations) or exists(select 1 from public.clients) then raise exception 'Disabled membership sees data'; end if;
 begin
  perform public.create_client(org,jsonb_build_object('personType','company','legalName','Denied'));
  raise exception 'Disabled membership can create';
 exception when insufficient_privilege then null; end;
 execute 'reset role';
end $$;
