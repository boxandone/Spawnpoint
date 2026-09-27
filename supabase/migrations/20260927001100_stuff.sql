-- Stuff (docs/SPEC.md 4.6): items, documents in a private Storage bucket, and
-- short codes for QR labels. Adding items and uploading paperwork earn XP, and
-- the Paper trail, Curator, Labeler, and Declutter badges start counting.

------------------------------------------------------------------------------
-- Helpers
------------------------------------------------------------------------------

-- 8 characters of Crockford base32 (no I, L, O, U): easy to read off a label.
create or replace function private.new_short_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  b bytea := extensions.gen_random_bytes(5);
  n bigint := 0;
  code text := '';
begin
  for i in 0..4 loop
    n := (n << 8) | get_byte(b, i);
  end loop;
  for i in 1..8 loop
    code := substr(alphabet, (n & 31)::integer + 1, 1) || code;
    n := n >> 5;
  end loop;
  return code;
end;
$$;

create or replace function private.valid_tags(tags text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_length(tags, 1), 0) <= 20
    and not exists (select 1 from unnest(tags) t where t is null or char_length(btrim(t)) not between 1 and 40);
$$;
grant execute on function private.valid_tags(text[]) to authenticated, service_role;

-- The household a Storage path belongs to: its first folder, when that's a uuid.
create or replace function private.path_household(path text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(path, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(path, '/', 1)::uuid
  end;
$$;
grant execute on function private.path_household(text) to authenticated, service_role;

-- The household storage quota in bytes (HOUSEHOLD_STORAGE_MB, default 250).
create or replace function private.storage_quota_bytes()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.config('household_storage_mb'), '250')::bigint * 1048576;
$$;
revoke all on function private.storage_quota_bytes() from public, anon;
grant execute on function private.storage_quota_bytes() to authenticated, service_role;

------------------------------------------------------------------------------
-- Tables
------------------------------------------------------------------------------

create table public.items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  category text not null default 'other' check (category in (
    'electronics', 'appliance', 'networking', 'furniture', 'tools', 'outdoor', 'other')),
  brand text check (char_length(brand) <= 80),
  model text check (char_length(model) <= 80),
  serial text check (char_length(serial) <= 80),
  purchased_on date,
  price numeric(12, 2) check (price >= 0 and price < 10000000),
  store text check (char_length(store) <= 80),
  warranty_until date,
  location_id uuid,
  spot text check (char_length(spot) <= 120),
  tags text[] not null default '{}' check (private.valid_tags(tags)),
  notes text check (char_length(notes) <= 4000),
  url text check (char_length(url) <= 500 and url ~* '^https?://[^\s]+$'),
  barcode text check (barcode ~ '^[0-9A-Za-z.-]{4,64}$'),
  status text not null default 'active' check (status in ('active', 'lent', 'sold', 'donated', 'disposed')),
  status_changed_at timestamptz,
  status_changed_by uuid,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (household_id, id),
  foreign key (household_id, location_id)
    references public.locations (household_id, id) on delete set null (location_id),
  foreign key (household_id, status_changed_by)
    references public.household_members (household_id, id) on delete set null (status_changed_by)
);
create index items_household on public.items (household_id) where archived_at is null;
create index items_location on public.items (location_id);
create index items_barcode on public.items (household_id, barcode) where barcode is not null;

-- Files live in Storage; this row says what they are. Path:
--   {household_id}/{item_id|household}/{uuid}.{ext}  (+ {uuid}_thumb.jpg for images)
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  item_id uuid,
  kind text not null check (kind in ('receipt', 'manual', 'warranty', 'photo', 'other')),
  title text check (char_length(btrim(title)) between 1 and 120),
  storage_path text not null unique,
  thumb_path text unique,
  mime_type text not null check (mime_type in (
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'application/pdf')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 20971520),
  -- Set once the file is in Storage (finalize_document).
  uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  foreign key (household_id, item_id) references public.items (household_id, id) on delete cascade
);
create index documents_household on public.documents (household_id, created_at desc);
create index documents_item on public.documents (item_id);

-- One short code per item and per location, unique across the deployment.
create table public.short_codes (
  code text primary key check (code ~ '^[0-9A-HJKMNP-TV-Z]{8}$'),
  household_id uuid not null references public.households (id) on delete cascade,
  item_id uuid unique,
  location_id uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  check ((item_id is null) <> (location_id is null)),
  foreign key (household_id, item_id) references public.items (household_id, id) on delete cascade,
  foreign key (household_id, location_id) references public.locations (household_id, id) on delete cascade
);
create index short_codes_household on public.short_codes (household_id);

-- "Bought → Add to Stuff" remembers which item a To buy entry became.
alter table public.list_items add column item_id uuid;
alter table public.list_items add foreign key (household_id, item_id)
  references public.items (household_id, id) on delete set null (item_id);

-- Labels printed, for the Labeler badge.
create table private.label_prints (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.household_members (id) on delete cascade,
  labels integer not null check (labels between 1 and 300),
  created_at timestamptz not null default now()
);
alter table private.label_prints enable row level security;
revoke all on private.label_prints from public, anon, authenticated;

------------------------------------------------------------------------------
-- Triggers
------------------------------------------------------------------------------

create trigger items_stamp before insert or update on public.items
  for each row execute function private.stamp_row();
create trigger documents_stamp before insert or update on public.documents
  for each row execute function private.stamp_row();
create trigger short_codes_stamp before insert or update on public.short_codes
  for each row execute function private.stamp_row();

-- Who changed an item's status, and when (for Declutter).
create or replace function private.items_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.household_id is distinct from old.household_id then
    raise exception 'an item stays in its household' using errcode = '42501';
  end if;
  if (tg_op = 'INSERT' and new.status <> 'active')
     or (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    new.status_changed_at := now();
    new.status_changed_by := (
      select m.id from public.household_members m
      where m.household_id = new.household_id and m.user_id = auth.uid() and m.status = 'active');
  elsif tg_op = 'UPDATE' then
    new.status_changed_at := old.status_changed_at;
    new.status_changed_by := old.status_changed_by;
  end if;
  return new;
end;
$$;
create trigger items_status before insert or update on public.items
  for each row execute function private.items_status();

-- Paths must sit under the document's household and item; clients can only
-- change a document's title and kind; quota is checked when a file is added.
create or replace function private.documents_validate()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  folder text := new.household_id::text || '/' || coalesce(new.item_id::text, 'household') || '/';
  used bigint;
  quota bigint;
begin
  if tg_op = 'UPDATE' then
    if current_user = 'authenticated' and (
      (new.household_id, new.item_id, new.storage_path, new.thumb_path, new.mime_type, new.size_bytes, new.uploaded_at)
      is distinct from
      (old.household_id, old.item_id, old.storage_path, old.thumb_path, old.mime_type, old.size_bytes, old.uploaded_at)
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
create trigger documents_validate before insert or update on public.documents
  for each row execute function private.documents_validate();

-- Every item and location gets a short code when it's created.
create or replace function private.assign_short_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  for attempt in 1..8 loop
    begin
      if tg_table_name = 'items' then
        insert into public.short_codes (code, household_id, item_id)
        values (private.new_short_code(), new.household_id, new.id);
      else
        insert into public.short_codes (code, household_id, location_id)
        values (private.new_short_code(), new.household_id, new.id);
      end if;
      return null;
    exception when unique_violation then
      if exists (select 1 from public.short_codes where item_id = new.id or location_id = new.id) then
        return null;
      end if;
    end;
  end loop;
  raise exception 'could not make a short code';
end;
$$;
create trigger items_short_code after insert on public.items
  for each row execute function private.assign_short_code();
create trigger locations_short_code after insert on public.locations
  for each row execute function private.assign_short_code();

insert into public.short_codes (code, household_id, location_id)
select private.new_short_code(), l.household_id, l.id
from public.locations l
where not exists (select 1 from public.short_codes s where s.location_id = l.id);

------------------------------------------------------------------------------
-- Rewards: 5 XP for adding an item, 5 for a receipt, manual, or warranty
------------------------------------------------------------------------------

alter table public.xp_events drop constraint xp_events_source_kind_check;
alter table public.xp_events add constraint xp_events_source_kind_check
  check (source_kind in ('task', 'helper', 'deed', 'welcome_back', 'shopping', 'item', 'document'));
alter table public.xp_events add column item_id uuid references public.items (id) on delete cascade;
alter table public.xp_events add column document_id uuid references public.documents (id) on delete cascade;
create index xp_events_item on public.xp_events (item_id);
create index xp_events_document on public.xp_events (document_id);

-- Same as before, and also skips rows whose item or document is being removed.
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
      and (e.item_id is null or exists (select 1 from public.items i where i.id = e.item_id))
      and (e.document_id is null or exists (select 1 from public.documents d where d.id = e.document_id))
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
    and (e.shopping_trip_id is null or exists (select 1 from public.shopping_trips s where s.id = e.shopping_trip_id))
    and (e.item_id is null or exists (select 1 from public.items i where i.id = e.item_id))
    and (e.document_id is null or exists (select 1 from public.documents d where d.id = e.document_id));
  insert into public.member_stats (member_id, household_id, xp_total, level)
  values (p_member, hid, total, public.level_for_xp(total))
  on conflict (member_id) do update
    set xp_total = excluded.xp_total, level = excluded.level, updated_at = now();
end;
$$;

-- Same as before, now counting Paper trail, Curator, Labeler, and Declutter.
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

-- XP for a new item goes to whoever added it.
create or replace function private.items_rewards()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid;
  today date;
begin
  if tg_op = 'INSERT' then
    select m.id into me from public.household_members m
    where m.household_id = new.household_id and m.user_id = new.created_by and m.status = 'active';
    if me is null then
      return null;
    end if;
    today := public.household_today(new.household_id);
    insert into public.xp_events (household_id, member_id, source_kind, item_id, day, raw_xp, capped)
    values (new.household_id, me, 'item', new.id, today, 5, true);
    perform private.recompute_day(me, today);
    perform private.refresh_badges(me, '');
  elsif new.status is distinct from old.status and new.status_changed_by is not null then
    perform private.refresh_badges(new.status_changed_by, '');
  end if;
  return null;
end;
$$;
create trigger items_rewards after insert or update of status on public.items
  for each row execute function private.items_rewards();

-- Removing a document takes its XP back out of that day (nothing else changes).
create or replace function private.documents_unreward()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in delete from public.xp_events where document_id = old.id returning member_id, day loop
    perform private.recompute_day(r.member_id, r.day);
  end loop;
  return old;
end;
$$;
create trigger documents_unreward before delete on public.documents
  for each row execute function private.documents_unreward();

------------------------------------------------------------------------------
-- Client functions
------------------------------------------------------------------------------

-- After the upload: record the real size, mark the file present, and award XP
-- for receipts, manuals, and warranties.
create or replace function public.finalize_document(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.documents;
  me uuid;
  actual bigint;
  present integer;
  today date;
begin
  select * into d from public.documents where id = p_id;
  me := public.current_member_id();
  if d.id is null or me is null or not public.is_member_of(d.household_id) or d.created_by is distinct from auth.uid() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if d.uploaded_at is not null then
    return jsonb_build_object('ok', true);
  end if;
  if to_regclass('storage.objects') is not null then
    execute $q$
      select sum(coalesce((o.metadata ->> 'size')::bigint, 0)), count(*) filter (where o.name = $1)
      from storage.objects o where o.bucket_id = 'docs' and o.name in ($1, $2)
    $q$ into actual, present using d.storage_path, coalesce(d.thumb_path, '');
    if present = 0 then
      raise exception 'upload missing' using errcode = 'P0002';
    end if;
  end if;
  update public.documents
  set uploaded_at = now(), size_bytes = greatest(1, least(20971520, coalesce(nullif(actual, 0), d.size_bytes)))
  where id = d.id;

  if d.kind in ('receipt', 'manual', 'warranty') then
    today := public.household_today(d.household_id);
    insert into public.xp_events (household_id, member_id, source_kind, document_id, day, raw_xp, capped)
    values (d.household_id, me, 'document', d.id, today, 5, true);
    perform private.recompute_day(me, today);
    perform private.refresh_badges(me, '');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Printing labels counts toward the Labeler badge.
create or replace function public.record_labels_printed(p_count integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := public.current_member_id();
begin
  if me is null then
    raise exception 'no household' using errcode = '42501';
  end if;
  if p_count is null or p_count < 1 then
    return;
  end if;
  insert into private.label_prints (member_id, labels) values (me, least(p_count, 300));
  perform private.refresh_badges(me, '');
end;
$$;

------------------------------------------------------------------------------
-- Row level security
------------------------------------------------------------------------------

alter table public.items enable row level security;
alter table public.documents enable row level security;
alter table public.short_codes enable row level security;

create policy items_select on public.items
  for select to authenticated using (public.is_member_of(household_id));
create policy items_insert on public.items
  for insert to authenticated with check (public.is_member_of(household_id));
create policy items_update on public.items
  for update to authenticated
  using (public.is_member_of(household_id)) with check (public.is_member_of(household_id));

create policy documents_select on public.documents
  for select to authenticated using (public.is_member_of(household_id));
create policy documents_insert on public.documents
  for insert to authenticated with check (public.is_member_of(household_id));
create policy documents_update on public.documents
  for update to authenticated
  using (public.is_member_of(household_id)) with check (public.is_member_of(household_id));
create policy documents_delete on public.documents
  for delete to authenticated using (public.is_member_of(household_id));

-- Written only by triggers; a code alone reveals nothing to anyone else.
create policy short_codes_select on public.short_codes
  for select to authenticated using (public.is_member_of(household_id));

revoke all on public.items, public.documents, public.short_codes from anon, authenticated;
grant select, insert, update on public.items to authenticated;
grant select, insert, update, delete on public.documents to authenticated;
grant select on public.short_codes to authenticated;

revoke all on function public.finalize_document(uuid), public.record_labels_printed(integer) from public, anon;
grant execute on function public.finalize_document(uuid), public.record_labels_printed(integer) to authenticated;

------------------------------------------------------------------------------
-- Storage: the private `docs` bucket, walled off by household folder
------------------------------------------------------------------------------

insert into storage.buckets (id, name, public) values ('docs', 'docs', false)
on conflict (id) do update set public = false;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'storage' and table_name = 'buckets' and column_name = 'file_size_limit') then
    execute $q$update storage.buckets set file_size_limit = 20971520 where id = 'docs'$q$;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'storage' and table_name = 'buckets' and column_name = 'allowed_mime_types') then
    execute $q$update storage.buckets set allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'application/pdf']
      where id = 'docs'$q$;
  end if;
end;
$$;

-- Read and delete: members of the household in the path's first folder.
create policy spawnpoint_docs_select on storage.objects
  for select to authenticated
  using (bucket_id = 'docs' and public.is_member_of(private.path_household(name)));
create policy spawnpoint_docs_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'docs' and public.is_member_of(private.path_household(name)));
-- Upload: only to a path a document row has reserved (which checked the quota).
create policy spawnpoint_docs_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'docs'
    and public.is_member_of(private.path_household(name))
    and exists (
      select 1 from public.documents d
      where d.household_id = private.path_household(name)
        and d.uploaded_at is null
        and (d.storage_path = name or d.thumb_path = name)
    )
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.items, public.documents;
  end if;
end;
$$;
