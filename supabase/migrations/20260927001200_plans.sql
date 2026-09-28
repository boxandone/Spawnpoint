-- Plans (docs/SPEC.md 4.7) and the calendar feed (4.8, Phase A): plans with a
-- checklist and files, the talk-it-over queue, and private ICS feed tokens.
-- Moving a plan to booked or done earns 20 XP; resolving a talk-it-over item, 5.

------------------------------------------------------------------------------
-- Tables
------------------------------------------------------------------------------

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  type text not null default 'project' check (type in ('trip', 'project', 'decision', 'event')),
  status text not null default 'someday'
    check (status in ('someday', 'discussing', 'planning', 'booked', 'done')),
  starts_on date,
  ends_on date,
  tentative boolean not null default false,
  icon text check (icon ~ '^[a-z_]{1,24}$'),
  color text check (color in ('sky', 'mint', 'peach', 'lilac', 'lemon', 'rose', 'sage', 'sand')),
  notes text check (char_length(notes) <= 20000),
  links text[] not null default '{}' check (private.valid_links(links)),
  budget numeric(12, 2) check (budget >= 0 and budget < 1000000000),
  discuss boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (household_id, id),
  check (ends_on is null or (starts_on is not null and ends_on >= starts_on))
);
create index plans_household on public.plans (household_id) where archived_at is null;

create table public.plan_checklist_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  plan_id uuid not null,
  text text not null check (char_length(btrim(text)) between 1 and 200),
  done boolean not null default false,
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  foreign key (household_id, plan_id) references public.plans (household_id, id) on delete cascade
);
create index plan_checklist_plan on public.plan_checklist_items (plan_id, position);

-- The talk-it-over log: what was decided, about which plan or to-do.
create table public.discussions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  plan_id uuid,
  list_item_id uuid references public.list_items (id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  note text check (char_length(note) <= 1000),
  resolved_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  foreign key (household_id, plan_id) references public.plans (household_id, id) on delete set null (plan_id),
  foreign key (household_id, resolved_by) references public.household_members (household_id, id)
);
create index discussions_household on public.discussions (household_id, created_at desc);

-- A plan reaching booked or done, once each, for XP and badges.
create table private.plan_milestones (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  status text not null check (status in ('booked', 'done')),
  member_id uuid not null references public.household_members (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (plan_id, status)
);
alter table private.plan_milestones enable row level security;
revoke all on private.plan_milestones from public, anon, authenticated;

-- One private calendar feed per member. Only a hash of the token is stored.
create table public.ics_tokens (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  member_id uuid not null unique,
  token_hash text not null unique,
  chores text not null default 'fixed' check (chores in ('none', 'high', 'fixed')),
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  foreign key (household_id, member_id) references public.household_members (household_id, id) on delete cascade
);

-- Files can belong to a plan: {household_id}/plan-{plan_id}/{uuid}.{ext}
alter table public.documents add column plan_id uuid;
alter table public.documents add foreign key (household_id, plan_id)
  references public.plans (household_id, id) on delete cascade;
alter table public.documents add check (item_id is null or plan_id is null);
create index documents_plan on public.documents (plan_id);

------------------------------------------------------------------------------
-- Triggers
------------------------------------------------------------------------------

create trigger plans_stamp before insert or update on public.plans
  for each row execute function private.stamp_row();
create trigger plan_checklist_stamp before insert or update on public.plan_checklist_items
  for each row execute function private.stamp_row();
create trigger discussions_stamp before insert or update on public.discussions
  for each row execute function private.stamp_row();
create trigger ics_tokens_stamp before insert or update on public.ics_tokens
  for each row execute function private.stamp_row();

create or replace function private.plans_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.household_id is distinct from old.household_id then
    raise exception 'a plan stays in its household' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger plans_guard before update on public.plans
  for each row execute function private.plans_guard();

-- Same as before, with plan folders.
create or replace function private.documents_validate()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  folder text := new.household_id::text || '/'
    || coalesce(new.item_id::text, 'plan-' || new.plan_id::text, 'household') || '/';
  used bigint;
  quota bigint;
begin
  if tg_op = 'UPDATE' then
    if current_user = 'authenticated' and (
      (new.household_id, new.item_id, new.plan_id, new.storage_path, new.thumb_path, new.mime_type, new.size_bytes, new.uploaded_at)
      is distinct from
      (old.household_id, old.item_id, old.plan_id, old.storage_path, old.thumb_path, old.mime_type, old.size_bytes, old.uploaded_at)
    ) then
      raise exception 'only the title and kind can change' using errcode = '42501';
    end if;
    return new;
  end if;

  if left(new.storage_path, length(folder)) <> folder
     or substr(new.storage_path, length(folder) + 1) !~ '^[0-9a-f-]{36}\.(jpg|jpeg|png|webp|gif|heic|heif|pdf)$' then
    raise exception 'bad file path' using errcode = '23514';
  end if;
  if new.thumb_path is not null and (left(new.thumb_path, length(folder)) <> folder
     or substr(new.thumb_path, length(folder) + 1) !~ '^[0-9a-f-]{36}_thumb\.jpg$') then
    raise exception 'bad thumbnail path' using errcode = '23514';
  end if;
  if current_user = 'authenticated' then
    new.uploaded_at := null;
  end if;

  -- Quota: finished files, plus reservations from the last day.
  select coalesce(sum(d.size_bytes), 0) into used from public.documents d
  where d.household_id = new.household_id
    and (d.uploaded_at is not null or d.created_at > now() - interval '1 day');
  quota := private.storage_quota_bytes();
  if used + new.size_bytes > quota then
    raise exception 'storage quota reached' using errcode = '53100';
  end if;
  return new;
end;
$$;

------------------------------------------------------------------------------
-- Rewards: 20 XP when a plan is booked or done (once each), 5 per talk-it-over
------------------------------------------------------------------------------

alter table public.xp_events drop constraint xp_events_source_kind_check;
alter table public.xp_events add constraint xp_events_source_kind_check check (source_kind in (
  'task', 'helper', 'deed', 'welcome_back', 'shopping', 'item', 'document', 'plan', 'discussion'));
alter table public.xp_events
  add column plan_milestone_id uuid references private.plan_milestones (id) on delete cascade;
alter table public.xp_events
  add column discussion_id uuid references public.discussions (id) on delete cascade;
create index xp_events_plan_milestone on public.xp_events (plan_milestone_id);
create index xp_events_discussion on public.xp_events (discussion_id);

-- Same as before, now counting Trip booked and Plans finished.
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
    elsif cat.key = 'paper_trail' then
      select count(*) into cnt from public.documents d
      where d.household_id = m.household_id and d.created_by = m.user_id
        and d.uploaded_at is not null and d.kind in ('receipt', 'manual', 'warranty');
    elsif cat.key = 'curator' then
      select count(*) into cnt from public.items i
      where i.household_id = m.household_id and i.created_by = m.user_id;
    elsif cat.key = 'labeler' then
      select coalesce(sum(l.labels), 0) into cnt from private.label_prints l where l.member_id = p_member;
    elsif cat.key = 'declutter' then
      select count(*) into cnt from public.items i
      where i.status_changed_by = p_member and i.status in ('donated', 'disposed');
    elsif cat.key = 'trip_booked' then
      select count(*) into cnt from private.plan_milestones pm
      join public.plans p on p.id = pm.plan_id
      where pm.member_id = p_member and pm.status = 'booked' and p.type = 'trip';
    elsif cat.key = 'plans_finished' then
      select count(*) into cnt from private.plan_milestones pm
      where pm.member_id = p_member and pm.status = 'done';
    else
      cnt := 0;
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

-- Whoever moves a plan to booked or done earns 20 XP, the first time only.
create or replace function private.plans_rewards()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid;
  milestone uuid;
  today date;
begin
  if new.status not in ('booked', 'done') or (tg_op = 'UPDATE' and new.status = old.status) then
    return null;
  end if;
  select m.id into me from public.household_members m
  where m.household_id = new.household_id and m.user_id = auth.uid() and m.status = 'active';
  if me is null then
    return null;
  end if;
  insert into private.plan_milestones (plan_id, status, member_id)
  values (new.id, new.status, me)
  on conflict (plan_id, status) do nothing
  returning id into milestone;
  if milestone is null then
    return null;
  end if;
  today := public.household_today(new.household_id);
  insert into public.xp_events (household_id, member_id, source_kind, plan_milestone_id, day, raw_xp, capped)
  values (new.household_id, me, 'plan', milestone, today, 20, true);
  perform private.recompute_day(me, today);
  perform private.refresh_badges(me, '');
  return null;
end;
$$;
create trigger plans_rewards after insert or update of status on public.plans
  for each row execute function private.plans_rewards();

------------------------------------------------------------------------------
-- Talk it over
------------------------------------------------------------------------------

-- Mark a flagged plan or to-do as discussed, with an optional decision note.
create or replace function public.resolve_discussion(
  p_plan_id uuid default null,
  p_list_item_id uuid default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.household_members;
  what text;
  new_id uuid;
  today date;
begin
  select * into me from public.household_members where user_id = auth.uid() and status = 'active';
  if me.id is null or (p_plan_id is null) = (p_list_item_id is null) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_plan_id is not null then
    update public.plans set discuss = false
    where id = p_plan_id and household_id = me.household_id and discuss
    returning title into what;
  else
    update public.list_items set discuss = false
    where id = p_list_item_id and household_id = me.household_id and discuss
    returning name into what;
  end if;
  if what is null then
    raise exception 'nothing to discuss' using errcode = 'P0002';
  end if;
  insert into public.discussions (household_id, plan_id, list_item_id, title, note, resolved_by)
  values (me.household_id, p_plan_id, p_list_item_id, left(what, 200), nullif(left(btrim(coalesce(p_note, '')), 1000), ''), me.id)
  returning id into new_id;
  today := public.household_today(me.household_id);
  insert into public.xp_events (household_id, member_id, source_kind, discussion_id, day, raw_xp, capped)
  values (me.household_id, me.id, 'discussion', new_id, today, 5, true);
  perform private.recompute_day(me.id, today);
  return new_id;
end;
$$;

-- Undo within 10 minutes: the item goes back in the queue and the XP comes off.
create or replace function public.undo_discussion(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.discussions;
  r record;
begin
  select * into d from public.discussions
  where id = p_id and resolved_by = public.current_member_id() and created_at > now() - interval '10 minutes';
  if d.id is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.plans set discuss = true where id = d.plan_id;
  update public.list_items set discuss = true where id = d.list_item_id;
  for r in delete from public.xp_events where discussion_id = d.id returning member_id, day loop
    perform private.recompute_day(r.member_id, r.day);
  end loop;
  delete from public.discussions where id = d.id;
end;
$$;

------------------------------------------------------------------------------
-- Calendar feed
------------------------------------------------------------------------------

create or replace function private.hash_ics_token(p_token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

-- A new private feed link for the caller. The old link stops working. The
-- token is returned once and only its hash is kept.
create or replace function public.create_ics_token()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.household_members;
  token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  select * into me from public.household_members where user_id = auth.uid() and status = 'active';
  if me.id is null then
    raise exception 'no household' using errcode = '42501';
  end if;
  insert into public.ics_tokens (household_id, member_id, token_hash)
  values (me.household_id, me.id, private.hash_ics_token(token))
  on conflict (member_id) do update
    set token_hash = excluded.token_hash, last_used_at = null, created_at = now();
  return token;
end;
$$;

create or replace function public.revoke_ics_token()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.ics_tokens where member_id = public.current_member_id();
$$;

create or replace function public.set_ics_chores(p_mode text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_mode not in ('none', 'high', 'fixed') then
    raise exception 'bad mode' using errcode = '22023';
  end if;
  update public.ics_tokens set chores = p_mode where member_id = public.current_member_id();
end;
$$;

-- Everything the feed needs, for the Netlify function (service role only).
-- An unknown or revoked token returns null.
create or replace function public.ics_feed(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.ics_tokens;
  h public.households;
  s public.household_settings;
  today date;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  select * into t from public.ics_tokens where token_hash = private.hash_ics_token(p_token);
  if t.id is null or not exists (
    select 1 from public.household_members m where m.id = t.member_id and m.status = 'active'
  ) then
    return null;
  end if;
  if t.last_used_at is null or t.last_used_at < now() - interval '1 hour' then
    update public.ics_tokens set last_used_at = now() where id = t.id;
  end if;
  select * into h from public.households where id = t.household_id;
  select * into s from public.household_settings where household_id = t.household_id;
  today := public.household_today(h.id);
  return jsonb_build_object(
    'timezone', h.timezone,
    'today', today,
    'chores', t.chores,
    'plans', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'type', p.type, 'status', p.status,
        'starts_on', p.starts_on, 'ends_on', p.ends_on, 'tentative', p.tentative))
      from public.plans p
      where p.household_id = h.id and p.archived_at is null and p.starts_on is not null
        and coalesce(p.ends_on, p.starts_on) >= today - 60
    ), '[]'),
    'todos', coalesce((
      select jsonb_agg(jsonb_build_object('id', li.id, 'title', li.name, 'due_on', li.due_on))
      from public.list_items li join public.lists l on l.id = li.list_id
      where li.household_id = h.id and l.kind = 'todo' and not li.checked and li.due_on is not null
    ), '[]'),
    'tasks', case when t.chores = 'none' then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object('id', k.id, 'title', k.title, 'schedule', k.schedule,
        'priority', k.priority, 'start_on', k.start_on, 'location_id', k.location_id))
      from public.tasks k
      where k.household_id = h.id and k.archived_at is null
        and (t.chores = 'fixed' or k.priority = 'high')
    ), '[]') end,
    'rotation', coalesce(s.zone_rotation, '{}'),
    'locations', coalesce((
      select jsonb_agg(jsonb_build_object('id', l.id, 'parent_id', l.parent_id))
      from public.locations l where l.household_id = h.id
    ), '[]')
  );
end;
$$;

------------------------------------------------------------------------------
-- Row level security
------------------------------------------------------------------------------

alter table public.plans enable row level security;
alter table public.plan_checklist_items enable row level security;
alter table public.discussions enable row level security;
alter table public.ics_tokens enable row level security;

create policy plans_select on public.plans
  for select to authenticated using (public.is_member_of(household_id));
create policy plans_insert on public.plans
  for insert to authenticated with check (public.is_member_of(household_id));
create policy plans_update on public.plans
  for update to authenticated
  using (public.is_member_of(household_id)) with check (public.is_member_of(household_id));

create policy plan_checklist_select on public.plan_checklist_items
  for select to authenticated using (public.is_member_of(household_id));
create policy plan_checklist_insert on public.plan_checklist_items
  for insert to authenticated with check (public.is_member_of(household_id));
create policy plan_checklist_update on public.plan_checklist_items
  for update to authenticated
  using (public.is_member_of(household_id)) with check (public.is_member_of(household_id));
create policy plan_checklist_delete on public.plan_checklist_items
  for delete to authenticated using (public.is_member_of(household_id));

-- Decisions are household reading; written only by resolve/undo.
create policy discussions_select on public.discussions
  for select to authenticated using (public.is_member_of(household_id));

-- Your own feed settings only.
create policy ics_tokens_select on public.ics_tokens
  for select to authenticated using (member_id = public.current_member_id());

revoke all on public.plans, public.plan_checklist_items, public.discussions, public.ics_tokens
  from anon, authenticated;
grant select, insert, update on public.plans to authenticated;
grant select, insert, update, delete on public.plan_checklist_items to authenticated;
grant select on public.discussions to authenticated;
grant select (id, member_id, chores, last_used_at, created_at) on public.ics_tokens to authenticated;

revoke all on function
  public.resolve_discussion(uuid, uuid, text), public.undo_discussion(uuid),
  public.create_ics_token(), public.revoke_ics_token(), public.set_ics_chores(text),
  public.ics_feed(text)
  from public, anon, authenticated;
grant execute on function
  public.resolve_discussion(uuid, uuid, text), public.undo_discussion(uuid),
  public.create_ics_token(), public.revoke_ics_token(), public.set_ics_chores(text)
  to authenticated;
grant execute on function public.ics_feed(text) to service_role;
revoke all on function private.hash_ics_token(text) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.plans, public.plan_checklist_items, public.discussions;
  end if;
end;
$$;
