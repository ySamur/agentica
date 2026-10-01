begin;

-- Supabase's auto-RLS option adds this SECURITY DEFINER event-trigger function to the exposed
-- schema, executable by every role. Only its event trigger `ensure_rls` calls it, and that
-- ignores EXECUTE, so browser roles lose it (Security Advisor lints 0028/0029).
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;

commit;
