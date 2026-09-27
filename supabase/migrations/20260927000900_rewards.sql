-- Rewards (docs/SPEC.md 4.9): XP, the daily soft cap, levels, deeds, badges,
-- coins and personal reward shops, the household feed, and seasons.
--
-- Everything is computed here. Clients can read their own reward rows and
-- nothing else, and can never write XP, coins, or badges directly. The
-- constants are universal: the same for every household.

------------------------------------------------------------------------------
-- Universal constants
------------------------------------------------------------------------------

-- XP for finishing a task of effort 1, 2, 3.
create or replace function private.task_xp(effort integer)
returns integer language sql immutable set search_path = '' as $$
  select case effort when 1 then 10 when 2 then 20 when 3 then 30 else 10 end;
$$;

-- The daily soft cap: first 40 in full, next 40 at 50%, the rest at 10%.
-- `before` is the raw XP already counted that day; returns the credit for `raw`.
create or replace function private.cap_credit(before numeric, raw numeric)
returns numeric language sql immutable set search_path = '' as $$
  select
      greatest(0, least(before + raw, 40) - least(before, 40))
    + 0.5 * greatest(0, least(before + raw, 80) - greatest(before, 40) - greatest(0, 40 - (before + raw)))
    + 0.1 * greatest(0, (before + raw) - greatest(before, 80));
$$;

-- XP needed to go from level L to L+1 is 100 + 25 × (L − 1). No cap.
create or replace function public.level_for_xp(xp numeric)
returns integer language plpgsql immutable set search_path = '' as $$
declare
  lvl integer := 1;
  rest numeric := greatest(coalesce(xp, 0), 0);
  need numeric := 100;
begin
  while rest >= need loop
    rest := rest - need;
    lvl := lvl + 1;
    need := 100 + 25 * (lvl - 1);
  end loop;
  return lvl;
end;
$$;

create or replace function public.xp_for_level(lvl integer)
returns numeric language sql immutable set search_path = '' as $$
  -- Total XP needed to reach `lvl`.
  select coalesce(sum(100 + 25 * (l - 1)), 0) from generate_series(1, greatest(lvl, 1) - 1) l;
$$;

------------------------------------------------------------------------------
-- Badge catalog (deeds mirror src/modules/rewards/deeds.ts; keys are permanent)
------------------------------------------------------------------------------

create table public.badge_catalog (
  key text primary key check (key ~ '^[a-z0-9_]{1,40}$'),
  family text not null check (family in ('deed', 'milestone')),
  -- Tier thresholds in ascending order (logs, units, or milestone counts).
  thresholds numeric[] not null,
  unit text,
  xp integer not null default 0 check (xp between 0 and 60),
  cooldown_days integer,
  category text
);

alter table public.badge_catalog enable row level security;
create policy badge_catalog_read on public.badge_catalog for select to authenticated using (true);
revoke all on public.badge_catalog from anon, authenticated;
grant select on public.badge_catalog to authenticated;

insert into public.badge_catalog (key, family, thresholds, unit, xp, cooldown_days, category) values
  ('toilet_flapper', 'deed', '{1,3,10}', null, 40, 30, 'plumbing'),
  ('drain_unclog', 'deed', '{1,5,15}', null, 30, 7, 'plumbing'),
  ('faucet_fix', 'deed', '{1,3,10}', null, 40, 30, 'plumbing'),
  ('valve_exercise', 'deed', '{10,50,150}', 'valves', 20, 60, 'water'),
  ('spigot_winterize', 'deed', '{1,3,5}', null, 20, 180, 'water'),
  ('water_heater_flush', 'deed', '{1,3,5}', null, 50, 180, 'water'),
  ('recaulk', 'deed', '{1,3,8}', null, 40, 90, 'plumbing'),
  ('hvac_filter', 'deed', '{3,12,36}', 'filters', 20, 20, 'systems'),
  ('alarm_test', 'deed', '{3,12,36}', null, 10, 25, 'safety'),
  ('alarm_batteries', 'deed', '{1,3,5}', null, 20, 180, 'safety'),
  ('dryer_vent', 'deed', '{1,3,5}', null, 50, 180, 'safety'),
  ('fire_extinguisher', 'deed', '{1,4,10}', null, 10, 180, 'safety'),
  ('fridge_coils', 'deed', '{1,4,10}', null, 30, 90, 'appliances'),
  ('dishwasher_filter', 'deed', '{3,12,36}', null, 10, 20, 'appliances'),
  ('range_hood_filter', 'deed', '{3,12,36}', null, 15, 20, 'appliances'),
  ('washer_clean', 'deed', '{3,12,36}', null, 10, 20, 'appliances'),
  ('oven_deep_clean', 'deed', '{1,4,10}', null, 40, 60, 'appliances'),
  ('drywall_patch', 'deed', '{1,5,15}', null, 40, 14, 'repairs'),
  ('light_fixture', 'deed', '{1,5,15}', null, 50, 7, 'repairs'),
  ('door_fix', 'deed', '{1,5,15}', null, 30, 14, 'repairs'),
  ('furniture_assembly', 'deed', '{1,10,25}', null, 30, 1, 'repairs'),
  ('appliance_install', 'deed', '{1,5,15}', null, 40, 1, 'repairs'),
  ('gutters', 'deed', '{1,3,8}', null, 60, 90, 'outside'),
  ('pressure_wash', 'deed', '{1,4,10}', null, 50, 60, 'outside'),
  ('hedge_trim', 'deed', '{1,5,15}', null, 40, 30, 'outside'),
  ('sprinkler_fix', 'deed', '{1,5,15}', null, 30, 7, 'outside'),
  ('planted_something', 'deed', '{1,10,30}', null, 20, 7, 'outside'),
  ('pool_chemistry', 'deed', '{10,50,150}', null, 10, 2, 'pool'),
  ('pool_filter_deep_clean', 'deed', '{1,3,8}', null, 60, 90, 'pool'),
  ('litter_duty', 'deed', '{30,150,500}', null, 0, null, 'pets'),
  ('pet_bath', 'deed', '{1,10,30}', null, 20, 7, 'pets'),
  ('closet_reset', 'deed', '{1,5,20}', null, 30, 7, 'organizing'),
  ('garage_reset', 'deed', '{1,3,8}', null, 60, 30, 'organizing')
;

insert into public.badge_catalog (key, family, thresholds, category) values
  ('active_weeks', 'milestone', '{4,12,26,52}', 'habits'),
  ('early_bird', 'milestone', '{10}', 'habits'),
  ('night_owl', 'milestone', '{10}', 'habits'),
  ('helping_hand', 'milestone', '{10}', 'habits'),
  ('catch_up', 'milestone', '{5}', 'habits'),
  ('comeback', 'milestone', '{1}', 'habits'),
  ('clean_sweep', 'milestone', '{1}', 'habits'),
  ('seasonal', 'milestone', '{1,4,8}', 'seasons'),
  -- Earned in later phases (documents, stuff, labels, plans); defined now so keys are stable.
  ('paper_trail', 'milestone', '{10,50,100}', 'stuff'),
  ('curator', 'milestone', '{25,100,250}', 'stuff'),
  ('labeler', 'milestone', '{10}', 'stuff'),
  ('declutter', 'milestone', '{10}', 'stuff'),
  ('trip_booked', 'milestone', '{1}', 'plans'),
  ('plans_finished', 'milestone', '{1,5,20}', 'plans');

create or replace function private.tier_for(thresholds numeric[], cnt numeric)
returns integer language sql immutable set search_path = '' as $$
  select count(*)::integer from unnest(thresholds) t where cnt >= t;
$$;

------------------------------------------------------------------------------
-- Reward tables
------------------------------------------------------------------------------

-- Members choose whether their new badges are shared in the household feed.
alter table public.household_members add column share_badges boolean not null default true;
grant update (share_badges) on public.household_members to authenticated;

-- Deeds done (from a linked task or "Log a fix"). Household-visible like
-- completions ("who did what"); carries no XP numbers.
create table public.deed_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  member_id uuid not null,
  logged_by uuid not null,
  deed_key text not null references public.badge_catalog (key),
  day date not null,
  quantity numeric(10, 2) not null default 1 check (quantity > 0 and quantity <= 100000),
  completion_id uuid references public.completions (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  foreign key (household_id, member_id) references public.household_members (household_id, id),
  foreign key (household_id, logged_by) references public.household_members (household_id, id)
);
create index deed_logs_member on public.deed_logs (member_id, deed_key, day);
create index deed_logs_household on public.deed_logs (household_id, day desc);
create index deed_logs_completion on public.deed_logs (completion_id);

-- One row per XP credit. Deleting a completion or deed log removes its rows.
create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  member_id uuid not null,
  source_kind text not null check (source_kind in ('task', 'helper', 'deed', 'welcome_back')),
  completion_id uuid references public.completions (id) on delete cascade,
  deed_log_id uuid references public.deed_logs (id) on delete cascade,
  day date not null,
  raw_xp numeric(8, 2) not null check (raw_xp >= 0),
  credited_xp numeric(8, 2) not null default 0 check (credited_xp >= 0),
  capped boolean not null default true,
  created_at timestamptz not null default clock_timestamp(),
  foreign key (household_id, member_id) references public.household_members (household_id, id)
);
create index xp_events_member_day on public.xp_events (member_id, day);
create index xp_events_household_day on public.xp_events (household_id, day);

create table public.member_stats (
  member_id uuid primary key references public.household_members (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  xp_total numeric(12, 2) not null default 0,
  level integer not null default 1,
  coins_spent integer not null default 0 check (coins_spent >= 0),
  updated_at timestamptz not null default now()
);

create table public.badge_progress (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  member_id uuid not null references public.household_members (id) on delete cascade,
  badge_key text not null references public.badge_catalog (key),
  count numeric(12, 2) not null default 0,
  -- Highest tier ever reached: badges are never taken away.
  tier integer not null default 0,
  tier_earned_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (member_id, badge_key)
);

-- A member's own reward shop (private to them).
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  member_id uuid not null references public.household_members (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  icon text not null default '🎁' check (char_length(icon) between 1 and 16),
  cost integer not null check (cost between 1 and 1000000),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null
);

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  member_id uuid not null references public.household_members (id) on delete cascade,
  reward_id uuid references public.rewards (id) on delete set null,
  name text not null,
  icon text not null,
  cost integer not null,
  posted boolean not null default false,
  created_at timestamptz not null default now()
);

-- Shared moments: new badges and (opt-in) redemptions. No numbers, no rankings.
create table public.feed_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  member_id uuid not null references public.household_members (id) on delete cascade,
  kind text not null check (kind in ('badge', 'redeem')),
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index feed_events_household on public.feed_events (household_id, created_at desc);

-- Internal bookkeeping (never exposed).
create table private.sweep_awards (
  member_id uuid not null,
  area_id uuid not null,
  week_start date not null,
  area_name text not null,
  created_at timestamptz not null default now(),
  primary key (member_id, area_id, week_start)
);
create table private.season_awards (
  member_id uuid not null,
  season text not null,
  created_at timestamptz not null default now(),
  primary key (member_id, season)
);
alter table private.sweep_awards enable row level security;
alter table private.season_awards enable row level security;
revoke all on private.sweep_awards, private.season_awards from public, anon, authenticated;

create trigger deed_logs_stamp before insert or update on public.deed_logs
  for each row execute function private.stamp_row();
create trigger rewards_stamp before insert or update on public.rewards
  for each row execute function private.stamp_row();

-- Rewards belong to the caller; household and member are filled in, never chosen.
create or replace function private.rewards_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  m public.household_members;
begin
  if auth.uid() is not null then
    select * into m from public.household_members where user_id = auth.uid() and status = 'active';
    if m.id is null then
      raise exception 'no household' using errcode = '42501';
    end if;
    if tg_op = 'INSERT' then
      new.member_id := m.id;
      new.household_id := m.household_id;
    else
      new.member_id := old.member_id;
      new.household_id := old.household_id;
    end if;
  end if;
  return new;
end;
$$;
create trigger rewards_owner before insert or update on public.rewards
  for each row execute function private.rewards_owner();

------------------------------------------------------------------------------
-- Computing XP
------------------------------------------------------------------------------

-- Reapply the daily cap to one member's day, in the order XP was earned, then
-- refresh their total and level. Deed XP is outside the cap.
create or replace function private.recompute_day(p_member uuid, p_day date)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r record;
  running numeric := 0;
  credit numeric;
  hid uuid;
  total numeric;
begin
  -- Rows whose completion or deed log is being deleted in this same statement
  -- (their cascade hasn't run yet) are skipped, so they never count.
  for r in
    select e.id, e.raw_xp, e.credited_xp, e.capped from public.xp_events e
    where e.member_id = p_member and e.day = p_day
      and (e.completion_id is null or exists (select 1 from public.completions c where c.id = e.completion_id))
      and (e.deed_log_id is null or exists (select 1 from public.deed_logs d where d.id = e.deed_log_id))
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
    and (e.deed_log_id is null or exists (select 1 from public.deed_logs d where d.id = e.deed_log_id));
  insert into public.member_stats (member_id, household_id, xp_total, level)
  values (p_member, hid, total, public.level_for_xp(total))
  on conflict (member_id) do update
    set xp_total = excluded.xp_total, level = excluded.level, updated_at = now();
end;
$$;

-- Days with real activity: finished tasks or deeds (skips don't count).
create or replace function private.activity_days(p_member uuid)
returns table (day date) language sql stable security definer set search_path = '' as $$
  select done_on from public.completions where done_by = p_member and kind = 'done'
  union
  select d.day from public.deed_logs d where d.member_id = p_member;
$$;

-- +20 for the first activity after 7 or more quiet days (never for a first-ever day).
create or replace function private.maybe_welcome_back(p_member uuid, p_day date, p_completion uuid, p_deed_log uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  hid uuid;
begin
  if exists (select 1 from public.xp_events where member_id = p_member and day = p_day and source_kind = 'welcome_back') then
    return;
  end if;
  if exists (select 1 from private.activity_days(p_member) a where a.day between p_day - 7 and p_day - 1) then
    return;
  end if;
  if not exists (select 1 from private.activity_days(p_member) a where a.day < p_day - 7) then
    return;
  end if;
  select household_id into hid from public.household_members where id = p_member;
  insert into public.xp_events (household_id, member_id, source_kind, completion_id, deed_log_id, day, raw_xp, capped)
  values (hid, p_member, 'welcome_back', p_completion, p_deed_log, p_day, 20, true);
end;
$$;

------------------------------------------------------------------------------
-- Badges
------------------------------------------------------------------------------

create or replace function private.season_of(d date)
returns text language sql immutable set search_path = '' as $$
  select extract(year from d)::int || '-Q' || extract(quarter from d)::int;
$$;

-- Progress on the 10 seasonal goals for the quarter containing p_day.
create or replace function private.season_goals(p_member uuid, p_day date)
returns table (key text, progress numeric, target numeric)
language plpgsql stable security definer set search_path = '' as $$
declare
  q_start date := date_trunc('quarter', p_day)::date;
  q_end date := (date_trunc('quarter', p_day) + interval '3 months - 1 day')::date;
begin
  return query
  with c as (
    select c.* from public.completions c
    where c.done_by = p_member and c.kind = 'done' and c.done_on between q_start and q_end
  ),
  dl as (
    select d.* from public.deed_logs d where d.member_id = p_member and d.day between q_start and q_end
  ),
  act as (
    select a.day from private.activity_days(p_member) a where a.day between q_start and q_end
  ),
  weeks as (
    select date_trunc('week', act.day)::date wk from act group by 1 having count(distinct act.day) >= 3
  ),
  runs as (
    select wk, wk - (row_number() over (order by wk))::int * 7 as grp from weeks
  )
  select 'days_20', (select count(distinct act.day) from act)::numeric, 20::numeric
  union all select 'tasks_40', (select count(*) from c)::numeric, 40
  union all select 'effort_15', (select count(*) from c join public.tasks t on t.id = c.task_id where t.effort >= 2)::numeric, 15
  union all select 'deeds_3', (select count(*) from dl)::numeric, 3
  union all select 'weeks_6', (select count(*) from weeks)::numeric, 6
  union all select 'run_3', coalesce((select max(n) from (select count(*) n from runs group by grp) x), 0)::numeric, 3
  union all select 'areas_5', (
      select count(distinct coalesce(l.parent_id, l.id)) from c
      join public.tasks t on t.id = c.task_id
      join public.locations l on l.id = t.location_id
    )::numeric, 5
  union all select 'catchup_2', (
      select count(distinct c2.catch_up_id) from public.completions c2
      where c2.logged_by = p_member and c2.catch_up_id is not null and c2.done_on between q_start and q_end
    )::numeric, 2
  union all select 'fix_2', (select count(*) from dl where dl.completion_id is null)::numeric, 2
  union all select 'xp_1000', (
      select coalesce(sum(e.credited_xp), 0) from public.xp_events e
      where e.member_id = p_member and e.day between q_start and q_end
    ), 1000;
end;
$$;

-- Recount a member's badges from the source tables. Tiers only ever go up.
-- New tiers are posted to the household feed if the member shares badges.
create or replace function private.refresh_badges(p_member uuid, p_deed_key text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  m public.household_members;
  tz text;
  cat record;
  cnt numeric;
  new_tier integer;
  old public.badge_progress;
  payload jsonb;
  season_key text;
begin
  select * into m from public.household_members where id = p_member;
  if m.id is null then
    return;
  end if;
  select timezone into tz from public.households where id = m.household_id;

  -- Seasonal: award the current season once 5 of 10 goals are done.
  season_key := private.season_of((now() at time zone tz)::date);
  if (select count(*) from private.season_goals(p_member, (now() at time zone tz)::date) g where g.progress >= g.target) >= 5 then
    insert into private.season_awards (member_id, season) values (p_member, season_key) on conflict do nothing;
  end if;

  for cat in
    select * from public.badge_catalog b
    where (b.family = 'milestone') or (b.family = 'deed' and (p_deed_key is null or b.key = p_deed_key))
  loop
    if cat.family = 'deed' then
      select coalesce(sum(case when cat.unit is null then 1 else d.quantity end), 0) into cnt
      from public.deed_logs d where d.member_id = p_member and d.deed_key = cat.key;
    elsif cat.key = 'active_weeks' then
      select count(*) into cnt from (
        select date_trunc('week', a.day) from private.activity_days(p_member) a group by 1 having count(*) >= 3
      ) w;
    elsif cat.key in ('early_bird', 'night_owl') then
      select count(*) into cnt from public.completions c
      where c.done_by = p_member and c.logged_by = p_member and c.kind = 'done'
        and c.done_on = (c.logged_at at time zone tz)::date
        and case when cat.key = 'early_bird'
                 then extract(hour from c.logged_at at time zone tz) < 8
                 else extract(hour from c.logged_at at time zone tz) >= 21 end;
    elsif cat.key = 'helping_hand' then
      select count(*) into cnt from public.completions c
      where c.logged_by = p_member and c.done_by <> p_member and c.kind = 'done';
    elsif cat.key = 'catch_up' then
      select count(distinct c.catch_up_id) into cnt from public.completions c
      where c.logged_by = p_member and c.catch_up_id is not null;
    elsif cat.key = 'comeback' then
      select count(*) into cnt from public.xp_events e where e.member_id = p_member and e.source_kind = 'welcome_back';
    elsif cat.key = 'clean_sweep' then
      select count(*) into cnt from private.sweep_awards s where s.member_id = p_member;
    elsif cat.key = 'seasonal' then
      select count(*) into cnt from private.season_awards s where s.member_id = p_member;
    else
      cnt := 0; -- later phases
    end if;

    select * into old from public.badge_progress where member_id = p_member and badge_key = cat.key;
    if old.id is null and cnt = 0 then
      continue;
    end if;
    new_tier := greatest(coalesce(old.tier, 0), private.tier_for(cat.thresholds, cnt));

    insert into public.badge_progress (household_id, member_id, badge_key, count, tier, tier_earned_at)
    values (m.household_id, p_member, cat.key, cnt, new_tier, case when new_tier > 0 then now() end)
    on conflict (member_id, badge_key) do update
      set count = excluded.count,
          tier = excluded.tier,
          tier_earned_at = case when excluded.tier > public.badge_progress.tier then now()
                                else public.badge_progress.tier_earned_at end,
          updated_at = now();

    if new_tier > coalesce(old.tier, 0) and m.share_badges then
      payload := jsonb_build_object('badge_key', cat.key, 'tier', new_tier, 'tiers', cardinality(cat.thresholds));
      if cat.key = 'clean_sweep' then
        payload := payload || jsonb_build_object('area', (
          select s.area_name from private.sweep_awards s where s.member_id = p_member order by s.created_at desc limit 1));
      end if;
      insert into public.feed_events (household_id, member_id, kind, payload)
      values (m.household_id, p_member, 'badge', payload);
    end if;
  end loop;
end;
$$;

-- Clean sweep: every live task in an area (and its spots) done in the same Mon–Sun week.
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

------------------------------------------------------------------------------
-- Triggers: completions and deed logs earn XP and badges
------------------------------------------------------------------------------

create or replace function private.award_completion(c public.completions)
returns void language plpgsql security definer set search_path = '' as $$
declare
  t public.tasks;
begin
  if c.kind <> 'done' then
    return;
  end if;
  select * into t from public.tasks where id = c.task_id;
  insert into public.xp_events (household_id, member_id, source_kind, completion_id, day, raw_xp, capped)
  values (c.household_id, c.done_by, 'task', c.id, c.done_on, private.task_xp(t.effort), true);
  if c.logged_by <> c.done_by then
    insert into public.xp_events (household_id, member_id, source_kind, completion_id, day, raw_xp, capped)
    values (c.household_id, c.logged_by, 'helper', c.id, c.done_on, 2, true);
  end if;
  perform private.maybe_welcome_back(c.done_by, c.done_on, c.id, null);
  if t.deed_key is not null and exists (select 1 from public.badge_catalog where key = t.deed_key and family = 'deed') then
    insert into public.deed_logs (household_id, member_id, logged_by, deed_key, day, quantity, completion_id, created_by)
    values (c.household_id, c.done_by, c.logged_by, t.deed_key, c.done_on, coalesce(c.quantity, 1), c.id, c.created_by);
  end if;
  perform private.check_clean_sweep(c);
end;
$$;

create or replace function private.completions_rewards()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  deed text;
begin
  -- Deleting a whole household cascades here; there's nothing left to reward.
  if not exists (select 1 from public.households where id = coalesce(new.household_id, old.household_id)) then
    return null;
  end if;
  if tg_op = 'UPDATE' then
    if (new.done_on, new.done_by, new.logged_by, new.kind, new.quantity, new.task_id)
       is not distinct from (old.done_on, old.done_by, old.logged_by, old.kind, old.quantity, old.task_id) then
      return null;
    end if;
    delete from public.xp_events where completion_id = old.id;
    delete from public.deed_logs where completion_id = old.id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform private.award_completion(new);
    perform private.recompute_day(new.done_by, new.done_on);
    perform private.recompute_day(new.logged_by, new.done_on);
    select deed_key into deed from public.tasks where id = new.task_id;
    perform private.refresh_badges(new.done_by, coalesce(deed, ''));
    if new.logged_by <> new.done_by then
      perform private.refresh_badges(new.logged_by, '');
    end if;
  end if;
  if tg_op in ('DELETE', 'UPDATE') then
    perform private.recompute_day(old.done_by, old.done_on);
    perform private.recompute_day(old.logged_by, old.done_on);
    select deed_key into deed from public.tasks where id = old.task_id;
    perform private.refresh_badges(old.done_by, coalesce(deed, ''));
  end if;
  return null;
end;
$$;

create trigger completions_rewards after insert or update or delete on public.completions
  for each row execute function private.completions_rewards();

create or replace function private.deed_logs_rewards()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  cat public.badge_catalog;
  earns boolean;
begin
  if not exists (select 1 from public.households where id = coalesce(new.household_id, old.household_id)) then
    return null;
  end if;
  if tg_op = 'INSERT' then
    select * into cat from public.badge_catalog where key = new.deed_key;
    -- Deed XP is outside the cap, but only once per cooldown window.
    earns := cat.xp > 0 and cat.cooldown_days is not null and not exists (
      select 1 from public.deed_logs d
      join public.xp_events e on e.deed_log_id = d.id
      where d.member_id = new.member_id and d.deed_key = new.deed_key and d.id <> new.id
        and e.raw_xp > 0 and abs(d.day - new.day) < cat.cooldown_days
    );
    if earns then
      insert into public.xp_events (household_id, member_id, source_kind, deed_log_id, day, raw_xp, capped)
      values (new.household_id, new.member_id, 'deed', new.id, new.day, cat.xp, false);
    end if;
    if new.completion_id is null then
      perform private.maybe_welcome_back(new.member_id, new.day, null, new.id);
      if new.logged_by <> new.member_id then
        insert into public.xp_events (household_id, member_id, source_kind, deed_log_id, day, raw_xp, capped)
        values (new.household_id, new.logged_by, 'helper', new.id, new.day, 2, true);
        perform private.recompute_day(new.logged_by, new.day);
      end if;
      perform private.recompute_day(new.member_id, new.day);
      perform private.refresh_badges(new.member_id, new.deed_key);
    end if;
    return null;
  end if;
  -- DELETE: the xp_events rows are already gone (cascade).
  if old.completion_id is null then
    perform private.recompute_day(old.member_id, old.day);
    perform private.recompute_day(old.logged_by, old.day);
    perform private.refresh_badges(old.member_id, old.deed_key);
  end if;
  return null;
end;
$$;

create trigger deed_logs_rewards after insert or delete on public.deed_logs
  for each row execute function private.deed_logs_rewards();

------------------------------------------------------------------------------
-- Client functions
------------------------------------------------------------------------------

-- "Log a fix": record a deed for yourself or someone in your household.
create or replace function public.log_deed(p_deed_key text, p_day date, p_quantity numeric default 1, p_done_by uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me public.household_members;
  doer public.household_members;
  today date;
  id uuid;
begin
  select * into me from public.household_members where user_id = auth.uid() and status = 'active';
  if me.id is null then
    raise exception 'no household' using errcode = '42501';
  end if;
  select * into doer from public.household_members
  where id = coalesce(p_done_by, me.id) and household_id = me.household_id and status = 'active';
  if doer.id is null then
    raise exception 'not in your household' using errcode = '42501';
  end if;
  if not exists (select 1 from public.badge_catalog where key = p_deed_key and family = 'deed') then
    raise exception 'unknown deed' using errcode = '22023';
  end if;
  today := public.household_today(me.household_id);
  if p_day > today or p_day < today - 30 then
    raise exception 'pick a day in the last month' using errcode = '23514';
  end if;
  insert into public.deed_logs (household_id, member_id, logged_by, deed_key, day, quantity)
  values (me.household_id, doer.id, me.id, p_deed_key, p_day, greatest(coalesce(p_quantity, 1), 0.01))
  returning deed_logs.id into id;
  return id;
end;
$$;

-- Undo a "Log a fix" (task-linked deeds are undone by undoing the task).
create or replace function public.undo_deed_log(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.deed_logs d
  where d.id = p_id and d.completion_id is null
    and public.current_member_id() in (d.logged_by, d.member_id);
  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;
end;
$$;

-- Spend coins (= credited XP) on one of your own rewards. Never below zero.
create or replace function public.redeem_reward(p_reward_id uuid, p_post boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.current_member_id();
  r public.rewards;
  s public.member_stats;
  balance integer;
  rid uuid;
begin
  select * into r from public.rewards where id = p_reward_id and member_id = me and archived_at is null;
  if r.id is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.member_stats (member_id, household_id) values (me, r.household_id) on conflict do nothing;
  select * into s from public.member_stats where member_id = me for update;
  balance := floor(s.xp_total)::integer - s.coins_spent;
  if balance < r.cost then
    raise exception 'not enough coins' using errcode = 'P0001', hint = 'not_enough_coins';
  end if;
  update public.member_stats set coins_spent = coins_spent + r.cost, updated_at = now() where member_id = me;
  insert into public.redemptions (household_id, member_id, reward_id, name, icon, cost, posted)
  values (r.household_id, me, r.id, r.name, r.icon, r.cost, coalesce(p_post, false))
  returning id into rid;
  if coalesce(p_post, false) then
    insert into public.feed_events (household_id, member_id, kind, payload)
    values (r.household_id, me, 'redeem', jsonb_build_object('name', r.name, 'icon', r.icon, 'redemption_id', rid));
  end if;
  return jsonb_build_object('id', rid, 'balance', balance - r.cost);
end;
$$;

-- Undo a redemption within 10 minutes: coins come back, the feed post goes.
create or replace function public.undo_redemption(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.current_member_id();
  rd public.redemptions;
begin
  select * into rd from public.redemptions
  where id = p_id and member_id = me and created_at > now() - interval '10 minutes';
  if rd.id is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  delete from public.redemptions where id = rd.id;
  update public.member_stats set coins_spent = greatest(coins_spent - rd.cost, 0), updated_at = now() where member_id = me;
  delete from public.feed_events where kind = 'redeem' and payload ->> 'redemption_id' = rd.id::text;
end;
$$;

-- Everything the Me page needs, for the caller only.
create or replace function public.my_rewards()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me public.household_members;
  s public.member_stats;
  today date;
  lvl integer;
  weeks date[];
  run integer := 0;
  wk date;
  goals jsonb;
begin
  select * into me from public.household_members where user_id = auth.uid() and status = 'active';
  if me.id is null then
    return null;
  end if;
  today := public.household_today(me.household_id);
  select * into s from public.member_stats where member_id = me.id;
  lvl := public.level_for_xp(coalesce(s.xp_total, 0));

  select coalesce(array_agg(w order by w desc), '{}') into weeks from (
    select date_trunc('week', a.day)::date w from private.activity_days(me.id) a group by 1 having count(*) >= 3
  ) x;
  -- Current run of active weeks, counting back from this week (or last, if this one isn't active yet).
  wk := date_trunc('week', today)::date;
  if not (wk = any (weeks)) then
    wk := wk - 7;
  end if;
  while wk = any (weeks) loop
    run := run + 1;
    wk := wk - 7;
  end loop;

  select jsonb_agg(jsonb_build_object('key', g.key, 'progress', g.progress, 'target', g.target))
  into goals from private.season_goals(me.id, today) g;

  return jsonb_build_object(
    'xp_total', floor(coalesce(s.xp_total, 0)),
    'level', lvl,
    'level_start', public.xp_for_level(lvl),
    'level_next', public.xp_for_level(lvl + 1),
    'coins', greatest(floor(coalesce(s.xp_total, 0))::integer - coalesce(s.coins_spent, 0), 0),
    'active_weeks', cardinality(weeks),
    'current_run', run,
    'season', jsonb_build_object(
      'key', private.season_of(today),
      'start', date_trunc('quarter', today)::date,
      'end', (date_trunc('quarter', today) + interval '3 months - 1 day')::date,
      'goals', goals,
      'done', (select count(*) from jsonb_array_elements(coalesce(goals, '[]')) x where (x.value ->> 'progress')::numeric >= (x.value ->> 'target')::numeric)
    )
  );
end;
$$;

-- The household weekly meter: the household total only, never a split.
create or replace function public.household_week_xp(p_household_id uuid, p_week_start date)
returns numeric language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_member_of(p_household_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return (
    select floor(coalesce(sum(credited_xp), 0)) from public.xp_events
    where household_id = p_household_id and day between p_week_start and p_week_start + 6
  );
end;
$$;

------------------------------------------------------------------------------
-- Row level security and privileges
------------------------------------------------------------------------------

alter table public.deed_logs enable row level security;
alter table public.xp_events enable row level security;
alter table public.member_stats enable row level security;
alter table public.badge_progress enable row level security;
alter table public.rewards enable row level security;
alter table public.redemptions enable row level security;
alter table public.feed_events enable row level security;

create policy deed_logs_select on public.deed_logs
  for select to authenticated using (public.is_member_of(household_id));

-- Your XP, level, coins, badges, and shop are visible only to you.
create policy xp_events_own on public.xp_events
  for select to authenticated using (member_id = public.current_member_id());
create policy member_stats_own on public.member_stats
  for select to authenticated using (member_id = public.current_member_id());
create policy badge_progress_own on public.badge_progress
  for select to authenticated using (member_id = public.current_member_id());
create policy redemptions_own on public.redemptions
  for select to authenticated using (member_id = public.current_member_id());
create policy rewards_select_own on public.rewards
  for select to authenticated using (member_id = public.current_member_id());
create policy rewards_insert_own on public.rewards
  for insert to authenticated with check (member_id = public.current_member_id());
create policy rewards_update_own on public.rewards
  for update to authenticated
  using (member_id = public.current_member_id()) with check (member_id = public.current_member_id());

create policy feed_events_household on public.feed_events
  for select to authenticated using (public.is_member_of(household_id));

revoke all on public.deed_logs, public.xp_events, public.member_stats, public.badge_progress,
  public.rewards, public.redemptions, public.feed_events from anon, authenticated;
grant select on public.deed_logs, public.xp_events, public.member_stats, public.badge_progress,
  public.redemptions, public.feed_events to authenticated;
grant select on public.rewards to authenticated;
grant insert (name, icon, cost) on public.rewards to authenticated;
grant update (name, icon, cost, archived_at) on public.rewards to authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
-- Needed by CHECK constraints (valid_schedule) and table defaults at write time.
grant execute on function private.valid_schedule(jsonb) to authenticated, service_role;

revoke execute on function
  public.level_for_xp(numeric), public.xp_for_level(integer),
  public.log_deed(text, date, numeric, uuid), public.undo_deed_log(uuid),
  public.redeem_reward(uuid, boolean), public.undo_redemption(uuid),
  public.my_rewards(), public.household_week_xp(uuid, date)
  from public, anon;
grant execute on function
  public.level_for_xp(numeric), public.xp_for_level(integer),
  public.log_deed(text, date, numeric, uuid), public.undo_deed_log(uuid),
  public.redeem_reward(uuid, boolean), public.undo_redemption(uuid),
  public.my_rewards(), public.household_week_xp(uuid, date)
  to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.deed_logs, public.member_stats, public.badge_progress, public.feed_events;
  end if;
end;
$$;
