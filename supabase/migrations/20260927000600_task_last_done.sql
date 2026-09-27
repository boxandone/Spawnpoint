-- The latest completion per task. Today loads recent completions plus this,
-- which is all the scheduling logic needs for long intervals (a 45-day filter,
-- a yearly window) without downloading a year of history.
-- security_invoker makes the view obey the caller's RLS on completions.

create view public.task_last_done
with (security_invoker = true)
as
select distinct on (c.task_id)
  c.task_id, c.household_id, c.id as completion_id, c.done_on, c.kind
from public.completions c
order by c.task_id, c.done_on desc, c.logged_at desc;

revoke all on public.task_last_done from anon, authenticated;
grant select on public.task_last_done to authenticated;
