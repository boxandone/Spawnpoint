-- Lists (docs/SPEC.md 4.4): one engine for Groceries, To buy, To-do, and
-- custom lists, plus staples and shopping trips. "Done shopping" earns 10 XP
-- (docs/SPEC.md 4.9), computed here like every other reward.

create or replace function private.valid_links(links text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_length(links, 1), 0) <= 5
    and not exists (
      select 1 from unnest(links) l
      where l is null or char_length(l) > 500 or l !~* '^https?://[^\s]+$'
    );
$$;
grant execute on function private.valid_links(text[]) to authenticated, service_role;

create table public.lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  -- Built-in lists take their names from the theme's copy; custom lists are named.
  kind text not null check (kind in ('groceries', 'to_buy', 'todo', 'custom')),
  name text check (char_length(btrim(name)) between 1 and 60),
  icon text check (icon ~ '^[a-z_]{1,24}$'),
  position double precision not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (household_id, id),
  check ((kind = 'custom') = (name is not null))
);
create unique index lists_one_builtin on public.lists (household_id, kind) where kind <> 'custom';

create table public.list_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  list_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  -- Groceries
  quantity text check (char_length(quantity) <= 40),
  category text check (category in (
    'produce', 'dairy', 'meat', 'bakery', 'pantry', 'frozen', 'drinks', 'household', 'pets', 'other')),
  -- To buy
  status text check (status in ('idea', 'to_buy', 'bought')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  target_price numeric(12, 2) check (target_price >= 0 and target_price < 10000000),
  links text[] not null default '{}' check (private.valid_links(links)),
  location_id uuid,
  bought_on date,
  -- To-do
  due_on date,
  assignee_id uuid,
  discuss boolean not null default false,
  -- Every list
  notes text check (char_length(notes) <= 2000),
  checked boolean not null default false,
  checked_at timestamptz,
  checked_by uuid,
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  foreign key (household_id, list_id) references public.lists (household_id, id) on delete cascade,
  foreign key (household_id, location_id)
    references public.locations (household_id, id) on delete set null (location_id),
  foreign key (household_id, assignee_id)
    references public.household_members (household_id, id) on delete set null (assignee_id),
  foreign key (household_id, checked_by)
    references public.household_members (household_id, id) on delete set null (checked_by)
);
create index list_items_list on public.list_items (list_id, position);
create index list_items_household on public.list_items (household_id);

-- Recurring grocery items you can re-add with one tap.
create table public.staples (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  quantity text check (char_length(quantity) <= 40),
  category text check (category in (
    'produce', 'dairy', 'meat', 'bakery', 'pantry', 'frozen', 'drinks', 'household', 'pets', 'other')),
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null
);
create unique index staples_name on public.staples (household_id, lower(btrim(name)));

-- "Done shopping" clears the cart into a trip. Trips feed suggestions and XP,
-- and hold the cleared items so the trip can be undone.
create table public.shopping_trips (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  member_id uuid not null,
  day date not null,
  items jsonb not null default '[]' check (jsonb_typeof(items) = 'array'),
  item_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  foreign key (household_id, member_id) references public.household_members (household_id, id)
);
create index shopping_trips_household on public.shopping_trips (household_id, day desc);

------------------------------------------------------------------------------
-- Triggers
------------------------------------------------------------------------------

create trigger lists_stamp before insert or update on public.lists
  for each row execute function private.stamp_row();
create trigger list_items_stamp before insert or update on public.list_items
  for each row execute function private.stamp_row();
create trigger staples_stamp before insert or update on public.staples
  for each row execute function private.stamp_row();
create trigger shopping_trips_stamp before insert or update on public.shopping_trips
  for each row execute function private.stamp_row();

-- Built-in lists keep their kind and can't be archived; only custom lists
-- change kind-specific fields.
create or replace function private.lists_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind is distinct from old.kind or new.household_id is distinct from old.household_id then
    raise exception 'a list keeps its kind and household' using errcode = '42501';
  end if;
  if old.kind <> 'custom' and (new.archived_at is not null or new.name is not null) then
    raise exception 'built-in lists can''t be renamed or archived' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger lists_guard before update on public.lists
  for each row execute function private.lists_guard();

-- Who checked an item, and when. Items stay in their list and household.
create or replace function private.list_items_checked()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (new.list_id is distinct from old.list_id
      or new.household_id is distinct from old.household_id) then
    raise exception 'an item stays in its list' using errcode = '42501';
  end if;
  if new.checked and (tg_op = 'INSERT' or not old.checked) then
    new.checked_at := coalesce(case when tg_op = 'INSERT' then new.checked_at end, now());
    if auth.uid() is not null then
      select m.id into new.checked_by from public.household_members m
      where m.household_id = new.household_id and m.user_id = auth.uid() and m.status = 'active';
    end if;
  elsif not new.checked then
    new.checked_at := null;
    new.checked_by := null;
  elsif tg_op = 'UPDATE' then
    new.checked_at := old.checked_at;
    new.checked_by := old.checked_by;
  end if;
  if new.status = 'bought' and new.bought_on is null then
    new.bought_on := public.household_today(new.household_id);
  elsif new.status is distinct from 'bought' then
    new.bought_on := null;
  end if;
  return new;
end;
$$;
create trigger list_items_checked before insert or update on public.list_items
  for each row execute function private.list_items_checked();

-- Every household gets Groceries, To buy, and To-do.
create or replace function private.households_lists()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.lists (household_id, kind, position)
  values (new.id, 'groceries', 0), (new.id, 'to_buy', 1), (new.id, 'todo', 2)
  on conflict do nothing;
  return null;
end;
$$;
create trigger households_lists after insert on public.households
  for each row execute function private.households_lists();

insert into public.lists (household_id, kind, position)
select h.id, k.kind, k.pos
from public.households h
cross join (values ('groceries', 0), ('to_buy', 1), ('todo', 2)) as k (kind, pos)
on conflict do nothing;

------------------------------------------------------------------------------
-- Rewards: a finished shopping trip earns 10 XP (under the daily cap)
------------------------------------------------------------------------------

alter table public.xp_events drop constraint xp_events_source_kind_check;
alter table public.xp_events add constraint xp_events_source_kind_check
  check (source_kind in ('task', 'helper', 'deed', 'welcome_back', 'shopping'));
alter table public.xp_events
  add column shopping_trip_id uuid references public.shopping_trips (id) on delete cascade;
create index xp_events_trip on public.xp_events (shopping_trip_id);

-- Same as before, and also skips rows whose shopping trip is being removed.
create or replace function private.recompute_day(p_member uuid, p_day date)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r record;
  running numeric := 0;
  credit numeric;
  hid uuid;
  total numeric;
begin
  for r in
    select e.id, e.raw_xp, e.credited_xp, e.capped from public.xp_events e
    where e.member_id = p_member and e.day = p_day
      and (e.completion_id is null or exists (select 1 from public.completions c where c.id = e.completion_id))
      and (e.deed_log_id is null or exists (select 1 from public.deed_logs d where d.id = e.deed_log_id))
      and (e.shopping_trip_id is null or exists (select 1 from public.shopping_trips s where s.id = e.shopping_trip_id))
    order by e.created_at, e.id
  loop
    if r.capped then
      credit := private.cap_credit(running, r.raw_xp);
      running := running + r.raw_xp;
    else
      credit := r.raw_xp;
    end if;
    if credit is distinct from r.credited_xp then
      update public.xp_events set credited_xp = credit where id = r.id;
    end if;
  end loop;

  select household_id into hid from public.household_members where id = p_member;
  if hid is null then
    return;
  end if;
  select coalesce(sum(e.credited_xp), 0) into total from public.xp_events e
  where e.member_id = p_member
    and (e.completion_id is null or exists (select 1 from public.completions c where c.id = e.completion_id))
    and (e.deed_log_id is null or exists (select 1 from public.deed_logs d where d.id = e.deed_log_id))
    and (e.shopping_trip_id is null or exists (select 1 from public.shopping_trips s where s.id = e.shopping_trip_id));
  insert into public.member_stats (member_id, household_id, xp_total, level)
  values (p_member, hid, total, public.level_for_xp(total))
  on conflict (member_id) do update
    set xp_total = excluded.xp_total, level = excluded.level, updated_at = now();
end;
$$;

-- Clear the cart: checked Groceries items become a trip. The first trip each
-- person finishes in a day earns 10 XP; later ones that day are still recorded.
create or replace function public.done_shopping(p_list_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me public.household_members;
  l public.lists;
  today date;
  trip_id uuid;
  n integer;
  earned boolean := false;
begin
  select * into me from public.household_members where user_id = auth.uid() and status = 'active';
  select * into l from public.lists where id = p_list_id;
  if me.id is null or l.id is null or l.household_id <> me.household_id or l.kind <> 'groceries' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select count(*) into n from public.list_items where list_id = l.id and checked;
  if n = 0 then
    return jsonb_build_object('trip_id', null, 'count', 0, 'xp', false);
  end if;
  today := public.household_today(me.household_id);
  insert into public.shopping_trips (household_id, member_id, day, items, item_count)
  select me.household_id, me.id, today, jsonb_agg(to_jsonb(li) order by li.position), n
  from public.list_items li where li.list_id = l.id and li.checked
  returning id into trip_id;
  delete from public.list_items where list_id = l.id and checked;

  if not exists (
    select 1 from public.xp_events
    where member_id = me.id and day = today and source_kind = 'shopping'
  ) then
    insert into public.xp_events (household_id, member_id, source_kind, shopping_trip_id, day, raw_xp, capped)
    values (me.household_id, me.id, 'shopping', trip_id, today, 10, true);
    perform private.recompute_day(me.id, today);
    earned := true;
  end if;
  return jsonb_build_object('trip_id', trip_id, 'count', n, 'xp', earned);
end;
$$;

-- Undo "Done shopping" within 10 minutes: the items go back in the cart.
create or replace function public.undo_done_shopping(p_trip_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  t public.shopping_trips;
begin
  select * into t from public.shopping_trips
  where id = p_trip_id and member_id = public.current_member_id()
    and created_at > now() - interval '10 minutes';
  if t.id is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.list_items
  select * from jsonb_populate_recordset(null::public.list_items, t.items) r
  where exists (select 1 from public.lists l where l.id = r.list_id and l.household_id = t.household_id)
  on conflict (id) do nothing;
  delete from public.shopping_trips where id = t.id;
  perform private.recompute_day(t.member_id, t.day);
end;
$$;

-- What this household buys most, from the last year of trips.
create or replace function public.grocery_suggestions(p_household_id uuid)
returns table (name text, quantity text, category text, times integer, last_day date)
language sql stable security invoker set search_path = '' as $$
  select
    (array_agg(i ->> 'name' order by t.day desc))[1],
    (array_agg(i ->> 'quantity' order by t.day desc))[1],
    (array_agg(i ->> 'category' order by t.day desc))[1],
    count(*)::integer,
    max(t.day)
  from public.shopping_trips t
  cross join lateral jsonb_array_elements(t.items) i
  where t.household_id = p_household_id and t.day > public.household_today(p_household_id) - 365
  group by lower(btrim(i ->> 'name'))
  order by count(*) desc, max(t.day) desc
  limit 200;
$$;

------------------------------------------------------------------------------
-- Row level security
------------------------------------------------------------------------------

alter table public.lists enable row level security;
alter table public.list_items enable row level security;
alter table public.staples enable row level security;
alter table public.shopping_trips enable row level security;

create policy lists_select on public.lists
  for select to authenticated using (public.is_member_of(household_id));
-- Clients add custom lists only; the built-ins come with the household.
create policy lists_insert on public.lists
  for insert to authenticated with check (public.is_member_of(household_id) and kind = 'custom');
create policy lists_update on public.lists
  for update to authenticated
  using (public.is_member_of(household_id)) with check (public.is_member_of(household_id));

create policy list_items_select on public.list_items
  for select to authenticated using (public.is_member_of(household_id));
create policy list_items_insert on public.list_items
  for insert to authenticated with check (public.is_member_of(household_id));
create policy list_items_update on public.list_items
  for update to authenticated
  using (public.is_member_of(household_id)) with check (public.is_member_of(household_id));
create policy list_items_delete on public.list_items
  for delete to authenticated using (public.is_member_of(household_id));

create policy staples_select on public.staples
  for select to authenticated using (public.is_member_of(household_id));
create policy staples_insert on public.staples
  for insert to authenticated with check (public.is_member_of(household_id));
create policy staples_update on public.staples
  for update to authenticated
  using (public.is_member_of(household_id)) with check (public.is_member_of(household_id));
create policy staples_delete on public.staples
  for delete to authenticated using (public.is_member_of(household_id));

-- Trips are written only by done_shopping and undo_done_shopping.
create policy shopping_trips_select on public.shopping_trips
  for select to authenticated using (public.is_member_of(household_id));

revoke all on public.lists, public.list_items, public.staples, public.shopping_trips
  from anon, authenticated;
grant select, insert, update on public.lists to authenticated;
grant select, insert, update, delete on public.list_items, public.staples to authenticated;
grant select on public.shopping_trips to authenticated;

revoke all on function public.done_shopping(uuid), public.undo_done_shopping(uuid),
  public.grocery_suggestions(uuid) from public, anon;
grant execute on function public.done_shopping(uuid), public.undo_done_shopping(uuid),
  public.grocery_suggestions(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.lists, public.list_items, public.staples, public.shopping_trips;
  end if;
end;
$$;
