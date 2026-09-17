-- Supabase-hosted projects may contain this pre-existing event trigger helper.
-- Event trigger execution remains intact; untrusted API roles must not execute it.
-- PGlite/local databases without the helper need no change.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
