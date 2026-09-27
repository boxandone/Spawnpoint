-- Chores: tasks and completions (docs/SPEC.md 4.3).
-- Scheduling rules live in src/modules/chores/logic.ts; the database enforces
-- shape, household isolation, and the backdating limits.

create or replace function private.valid_schedule(s jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  t text := s ->> 'type';
begin
  if jsonb_typeof(s) <> 'object' then
    return false;
  end if;
  if t = 'daily' then
    return true;
  elsif t = 'every_n_days' then
    return jsonb_typeof(s -> 'n') = 'number' and (s ->> 'n')::numeric between 1 and 365
      and (s ->> 'n')::numeric = floor((s ->> 'n')::numeric);
  elsif t = 'weekly_on' then
    return jsonb_typeof(s -> 'days') = 'array' and jsonb_array_length(s -> 'days') between 1 and 7
      and not exists (
        select 1 from jsonb_array_elements(s -> 'days') d
        where jsonb_typeof(d) <> 'number' or d::text::numeric not in (0, 1, 2, 3, 4, 5, 6)
      );
  elsif t = 'monthly_on' then
    if s ? 'day' then
      return jsonb_typeof(s -> 'day') = 'number' and (s ->> 'day')::numeric in (
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
        26, 27, 28, 29, 30, 31);
    end if;
    return jsonb_typeof(s -> 'nth') = 'number' and (s ->> 'nth')::numeric in (1, 2, 3, 4, -1)
      and jsonb_typeof(s -> 'weekday') = 'number' and (s ->> 'weekday')::numeric in (0, 1, 2, 3, 4, 5, 6);
  elsif t = 'yearly_in' then
    return jsonb_typeof(s -> 'months') = 'array' and jsonb_array_length(s -> 'months') between 1 and 12
      and not exists (
        select 1 from jsonb_array_elements(s -> 'months') m
        where jsonb_typeof(m) <> 'number' or m::text::numeric not in (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)
      );
  end if;
  return false;
end;
$$;

-- Used in a CHECK constraint, so every role that writes tasks may run it.
grant execute on function private.valid_schedule(jsonb) to authenticated, service_role;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  notes text check (char_length(notes) <= 2000),
  location_id uuid,
  effort smallint not null default 1 check (effort between 1 and 3),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  schedule jsonb not null check (private.valid_schedule(schedule)),
  if_missed text not null default 'let_go' check (if_missed in ('carry', 'let_go')),
  assignee_id uuid,
  -- Permanent keys from src/modules/rewards/deeds.ts
  deed_key text check (deed_key ~ '^[a-z0-9_]{1,40}$'),
  unit text check (char_length(btrim(unit)) between 1 and 24),
  start_on date,
  library_key text check (char_length(library_key) <= 60),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (household_id, id),
  foreign key (household_id, location_id)
    references public.locations (household_id, id) on delete set null (location_id),
  foreign key (household_id, assignee_id)
    references public.household_members (household_id, id) on delete set null (assignee_id)
);
create index tasks_household on public.tasks (household_id) where archived_at is null;
create index tasks_location on public.tasks (location_id);

create or replace function private.tasks_defaults()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.start_on is null then
    new.start_on := public.household_today(new.household_id);
  end if;
  return new;
end;
$$;

create trigger tasks_defaults before insert on public.tasks
  for each row execute function private.tasks_defaults();
create trigger tasks_stamp before insert or update on public.tasks
  for each row execute function private.stamp_row();

create table public.completions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  task_id uuid not null,
  -- The day the work happened, in the household timezone.
  done_on date not null,
  logged_at timestamptz not null default now(),
  done_by uuid not null,
  logged_by uuid not null,
  kind text not null default 'done' check (kind in ('done', 'skipped')),
  quantity numeric(10, 2) check (quantity > 0 and quantity <= 100000),
  note text check (char_length(note) <= 280),
  source text not null default 'tap' check (source in ('tap', 'menu', 'catch_up')),
  catch_up_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  foreign key (household_id, task_id)
    references public.tasks (household_id, id) on delete cascade,
  foreign key (household_id, done_by) references public.household_members (household_id, id),
  foreign key (household_id, logged_by) references public.household_members (household_id, id)
);
create index completions_household_day on public.completions (household_id, done_on desc);
create index completions_task_day on public.completions (task_id, done_on desc);

-- Never a future date, never before the task existed, and logged_by is the caller.
create or replace function private.validate_completion()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  today date := public.household_today(new.household_id);
  created_day date;
  caller uuid;
begin
  if new.done_on > today then
    raise exception 'done_on can''t be in the future' using errcode = '23514';
  end if;

  select (t.created_at at time zone h.timezone)::date into created_day
  from public.tasks t join public.households h on h.id = t.household_id
  where t.id = new.task_id;
  if new.done_on < created_day then
    raise exception 'done_on can''t be before the task existed' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    new.logged_by := old.logged_by;
    new.logged_at := old.logged_at;
  elsif auth.uid() is not null then
    select m.id into caller from public.household_members m
    where m.household_id = new.household_id and m.user_id = auth.uid() and m.status = 'active';
    if caller is null or new.logged_by is distinct from caller then
      raise exception 'logged_by must be you' using errcode = '42501';
    end if;
    new.logged_at := now();
  end if;
  return new;
end;
$$;

create trigger completions_validate before insert or update on public.completions
  for each row execute function private.validate_completion();
create trigger completions_stamp before insert or update on public.completions
  for each row execute function private.stamp_row();

alter table public.tasks enable row level security;
alter table public.completions enable row level security;

create policy tasks_select on public.tasks
  for select to authenticated using (public.is_member_of(household_id));
create policy tasks_insert on public.tasks
  for insert to authenticated with check (public.is_member_of(household_id));
create policy tasks_update on public.tasks
  for update to authenticated
  using (public.is_member_of(household_id)) with check (public.is_member_of(household_id));
create policy tasks_delete on public.tasks
  for delete to authenticated using (public.is_member_of(household_id));

create policy completions_select on public.completions
  for select to authenticated using (public.is_member_of(household_id));
create policy completions_insert on public.completions
  for insert to authenticated with check (public.is_member_of(household_id));
create policy completions_update on public.completions
  for update to authenticated
  using (public.is_member_of(household_id)) with check (public.is_member_of(household_id));
-- Undo is a hard delete of the completion (Phase 2 recomputes rewards on delete).
create policy completions_delete on public.completions
  for delete to authenticated using (public.is_member_of(household_id));

revoke all on public.tasks, public.completions from anon, authenticated;
grant select, insert, update, delete on public.tasks, public.completions to authenticated;
