-- "As needed" tasks: something to check, and do only if it needs doing (like
-- running the dishwasher). Doing it counts as done; leaving it records nothing.
-- It is never carried over, never "waiting", and isn't counted against an
-- area's freshness or a clean sweep.

alter table public.tasks drop constraint tasks_if_missed_check;
alter table public.tasks add constraint tasks_if_missed_check
  check (if_missed in ('carry', 'let_go', 'if_needed'));

-- The starter dishwasher task was a daily chore; it's really a check.
update public.tasks set if_missed = 'if_needed'
where library_key = 'kitchen.dishwasher' and if_missed = 'carry';

-- Same as before, without "as needed" tasks in the clean-sweep count.
create or replace function private.check_clean_sweep(p_completion public.completions)
returns void language plpgsql security definer set search_path = '' as $$
declare
  area public.locations;
  wk_start date := date_trunc('week', p_completion.done_on)::date;
  wk_end date := wk_start + 6;
  missing integer;
begin
  select l.* into area from public.tasks t
  join public.locations loc on loc.id = t.location_id
  join public.locations l on l.id = case when loc.kind = 'spot' then loc.parent_id else loc.id end
  where t.id = p_completion.task_id and l.kind = 'area';
  if area.id is null then
    return;
  end if;
  select count(*) into missing
  from public.tasks t
  join public.locations loc on loc.id = t.location_id
  where t.household_id = p_completion.household_id and t.archived_at is null
    and t.if_missed <> 'if_needed'
    and (loc.id = area.id or loc.parent_id = area.id)
    and not exists (
      select 1 from public.completions c
      where c.task_id = t.id and c.kind = 'done' and c.done_on between wk_start and wk_end
    );
  if missing = 0 then
    insert into private.sweep_awards (member_id, area_id, week_start, area_name)
    values (p_completion.done_by, area.id, wk_start, area.name)
    on conflict do nothing;
  end if;
end;
$$;
