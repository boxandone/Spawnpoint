-- Live updates: members see each other's check-offs within a couple of seconds.
-- Realtime respects RLS, so subscribers only receive their own household's rows.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.households,
      public.household_members,
      public.household_settings,
      public.locations,
      public.tasks,
      public.completions;
  end if;
end;
$$;
