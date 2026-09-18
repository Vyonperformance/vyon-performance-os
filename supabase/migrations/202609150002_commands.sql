-- Every command authorizes auth.uid(); none accepts a caller-selected identity.
create function private.require_permission(org uuid, code text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.has_permission(org,code) then raise exception 'Access denied' using errcode='42501'; end if;
end $$;

create function public.create_client(p_organization_id uuid, p_input jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare new_id uuid; manager uuid; item jsonb; catalog public.services;
begin
 perform private.require_permission(p_organization_id,'clients.manage');
 perform private.require_permission(p_organization_id,'clients.read');
 if coalesce(p_input->>'taxDocument','') ~ '[^0-9./[:space:]-]' then raise exception 'Invalid document' using errcode='23514'; end if;
 manager:=nullif(p_input->>'managerId','')::uuid;
 if not private.has_permission(p_organization_id,'clients.read_all') then
   if manager is not null and manager<>private.member_id(p_organization_id) then raise exception 'Access denied' using errcode='42501'; end if;
   manager:=private.member_id(p_organization_id);
 end if;
 if manager is not null and not exists(select 1 from public.organization_memberships where organization_id=p_organization_id and id=manager and status='active') then
   raise exception 'Responsible user is not active in this organization' using errcode='23514';
 end if;
 insert into public.clients(organization_id,person_type,legal_name,trade_name,tax_document,email,phone,
 postal_code,street,address_number,address_complement,district,city,state,country,manager_membership_id,entry_date,notes)
 values(p_organization_id,p_input->>'personType',btrim(p_input->>'legalName'),nullif(p_input->>'tradeName',''),
 nullif(regexp_replace(p_input->>'taxDocument','[^0-9]','','g'),''),nullif(p_input->>'email',''),nullif(p_input->>'phone',''),
 nullif(p_input->>'postalCode',''),nullif(p_input->>'street',''),nullif(p_input->>'addressNumber',''),nullif(p_input->>'addressComplement',''),
 nullif(p_input->>'district',''),nullif(p_input->>'city',''),nullif(p_input->>'state',''),coalesce(p_input->>'country','BR'),
 manager,coalesce(nullif(p_input->>'entryDate','')::date,current_date),nullif(p_input->>'notes','')) returning id into new_id;
 for item in select * from jsonb_array_elements(coalesce(p_input->'contacts','[]')) loop
   insert into public.client_contacts(organization_id,client_id,name,contact_type,email,phone,is_primary)
   values(p_organization_id,new_id,item->>'name',item->>'type',nullif(item->>'email',''),nullif(item->>'phone',''),coalesce((item->>'isPrimary')::boolean,false));
 end loop;
 for item in select * from jsonb_array_elements(coalesce(p_input->'services','[]')) loop
   perform private.require_permission(p_organization_id,'services.read');
   select * into catalog from public.services where organization_id=p_organization_id and id=(item->>'serviceId')::uuid and archived_at is null;
   if not found then raise exception 'Service not found' using errcode='23503'; end if;
   insert into public.client_services(organization_id,client_id,service_id,negotiated_unit_price_cents,quantity,currency,billing_kind,starts_on,ends_on)
   values(p_organization_id,new_id,catalog.id,(item->>'priceCents')::bigint,(item->>'quantity')::numeric,catalog.currency,catalog.billing_kind,
    nullif(item->>'startsOn','')::date,nullif(item->>'endsOn','')::date);
 end loop;
 return new_id;
end $$;

create function public.update_client(p_organization_id uuid,p_id uuid,p_expected_version integer,p_input jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 perform private.require_permission(p_organization_id,'clients.manage');
 if not private.can_read_client(p_organization_id,p_id) then raise exception 'Access denied' using errcode='42501'; end if;
 update public.clients set legal_name=p_input->>'legalName',trade_name=nullif(p_input->>'tradeName',''),email=nullif(p_input->>'email',''),
 phone=nullif(p_input->>'phone',''),notes=nullif(p_input->>'notes','')
 where organization_id=p_organization_id and id=p_id and version=p_expected_version returning id into result;
 if result is null then raise exception 'Version conflict' using errcode='40001'; end if;
 return result;
end $$;

create function public.save_service(p_organization_id uuid,p_input jsonb,p_id uuid default null,p_expected_version integer default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 perform private.require_permission(p_organization_id,'services.manage');
 if p_id is null then
   insert into public.services(organization_id,name,description,base_price_cents,currency,billing_kind)
   values(p_organization_id,btrim(p_input->>'name'),nullif(p_input->>'description',''),nullif(p_input->>'basePriceCents','')::bigint,
   p_input->>'currency',p_input->>'billingKind') returning id into result;
 else
   update public.services set name=btrim(p_input->>'name'),description=nullif(p_input->>'description',''),
   base_price_cents=nullif(p_input->>'basePriceCents','')::bigint,currency=p_input->>'currency',billing_kind=p_input->>'billingKind'
   where organization_id=p_organization_id and id=p_id and version=p_expected_version returning id into result;
   if result is null then raise exception 'Version conflict' using errcode='40001'; end if;
 end if;
 return result;
end $$;

create function public.add_client_service(p_organization_id uuid,p_client_id uuid,p_input jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare catalog public.services; result uuid;
begin
 perform private.require_permission(p_organization_id,'clients.manage');
 perform private.require_permission(p_organization_id,'services.read');
 if not private.can_read_client(p_organization_id,p_client_id) then raise exception 'Access denied' using errcode='42501'; end if;
 select * into catalog from public.services where organization_id=p_organization_id and id=(p_input->>'serviceId')::uuid and archived_at is null;
 if not found then raise exception 'Service not found' using errcode='23503'; end if;
 insert into public.client_services(organization_id,client_id,service_id,negotiated_unit_price_cents,quantity,currency,billing_kind,starts_on,ends_on)
 values(p_organization_id,p_client_id,catalog.id,(p_input->>'priceCents')::bigint,(p_input->>'quantity')::numeric,catalog.currency,catalog.billing_kind,
 nullif(p_input->>'startsOn','')::date,nullif(p_input->>'endsOn','')::date) returning id into result;
 return result;
end $$;

-- Administration remains through an explicitly scoped command, never arbitrary table updates.
create function public.set_team_member(p_organization_id uuid,p_id uuid,p_role_id uuid,p_status text,p_expected_version integer) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform private.require_permission(p_organization_id,'team.manage');
 if p_id=private.member_id(p_organization_id) then raise exception 'Cannot change your own role/status' using errcode='42501'; end if;
 if p_status not in ('active','disabled') then raise exception 'Invalid status' using errcode='23514'; end if;
 if not exists(select 1 from public.roles where organization_id=p_organization_id and id=p_role_id and archived_at is null) then raise exception 'Invalid role' using errcode='23514'; end if;
 update public.organization_memberships set role_id=p_role_id,status=p_status,disabled_at=case when p_status='disabled' then now() else null end
 where organization_id=p_organization_id and id=p_id and version=p_expected_version;
 if not found then raise exception 'Version conflict' using errcode='40001'; end if;
end $$;

-- Private bootstrap: only the database operator can execute, never anon/authenticated.
create function private.bootstrap_vyon(p_user_id uuid,p_organization_name text default 'Vyon Performance') returns uuid
language plpgsql security definer set search_path='' as $$
declare org uuid; role_uuid uuid; user_email text;
begin
 perform pg_advisory_xact_lock(4821004);
 select email into user_email from auth.users where id=p_user_id;
 if user_email is null then raise exception 'Create a real Auth user first'; end if;
 if exists(select 1 from public.organizations) then raise exception 'Bootstrap only allowed on an empty installation'; end if;
 insert into public.profiles(id,display_name) values(p_user_id,split_part(user_email,'@',1)) on conflict(id) do nothing;
 insert into public.organizations(name) values(p_organization_name) returning id into org;
 insert into public.roles(organization_id,name) values(org,'Administrador') returning id into role_uuid;
 insert into public.role_permissions(organization_id,role_id,permission_id) select org,role_uuid,id from public.permissions;
 insert into public.organization_memberships(organization_id,user_id,invited_email,role_id,status,accepted_at)
 values(org,p_user_id,user_email,role_uuid,'active',now());
 return org;
end $$;

create function private.on_auth_user_created() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,display_name) values(new.id,coalesce(nullif(new.raw_user_meta_data->>'display_name',''),split_part(new.email,'@',1),'Usuário')) on conflict(id) do nothing;
 return new;
end $$;
create trigger vyon_auth_profile after insert on auth.users for each row execute function private.on_auth_user_created();

revoke execute on function private.require_permission(uuid,text), private.bootstrap_vyon(uuid,text),private.on_auth_user_created() from public,anon,authenticated;
revoke execute on function public.create_client(uuid,jsonb),public.update_client(uuid,uuid,integer,jsonb),public.save_service(uuid,jsonb,uuid,integer),public.add_client_service(uuid,uuid,jsonb),public.set_team_member(uuid,uuid,uuid,text,integer) from public,anon;
grant execute on function public.create_client(uuid,jsonb),public.update_client(uuid,uuid,integer,jsonb),public.save_service(uuid,jsonb,uuid,integer),public.add_client_service(uuid,uuid,jsonb),public.set_team_member(uuid,uuid,uuid,text,integer) to authenticated;

-- An Auth-confirmed invite can only bind to its exact e-mail/user. Never accepts a role from the caller.
create function public.accept_invitation() returns void language plpgsql security definer set search_path='' as $$
declare verified_email text;
begin
 select email into verified_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if verified_email is null then return; end if;
 update public.organization_memberships set user_id=auth.uid(),status='active',accepted_at=now()
 where status='invited' and lower(invited_email)=lower(verified_email) and (user_id is null or user_id=auth.uid());
end $$;
revoke execute on function public.accept_invitation() from public,anon;
grant execute on function public.accept_invitation() to authenticated;
