-- Foundation: households, members, settings, invites, operators, and app config.
--
-- Rules (docs/SPEC.md §6):
--   * every household-owned table is guarded by RLS built on is_member_of();
--   * members and invites are managed by owners only, through RPCs;
--   * operators and app config are unreachable from the client API.

create extension if not exists pgcrypto with schema extensions;

-- Internal objects that the Data API never exposes.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

------------------------------------------------------------------------------
-- Row stamping: created_by, created_at, updated_at
------------------------------------------------------------------------------

create or replace function private.stamp_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- Clients can't forge authorship or creation time. Seeds (no JWT) may set them.
    if auth.uid() is not null then
      new.created_by := auth.uid();
      new.created_at := now();
    end if;
    new.updated_at := now();
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

------------------------------------------------------------------------------
-- Operator-only data
------------------------------------------------------------------------------

create table private.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into private.app_config (key, value) values
  ('household_creation', 'invite_only'),
  ('household_storage_mb', '250'),
  ('operator_name', '');

create table private.operators (
  email text primary key check (email = lower(email) and email like '%@%'),
  created_at timestamptz not null default now()
);

create table private.invite_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  attempted_at timestamptz not null default now(),
  ok boolean not null
);
create index invite_attempts_user_time on private.invite_attempts (user_id, attempted_at);

alter table private.app_config enable row level security;
alter table private.operators enable row level security;
alter table private.invite_attempts enable row level security;
revoke all on all tables in schema private from public, anon, authenticated;

------------------------------------------------------------------------------
-- Households
------------------------------------------------------------------------------

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null
);

create or replace function private.validate_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'unknown timezone: %', new.timezone using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger households_timezone before insert or update of timezone on public.households
  for each row execute function private.validate_timezone();
create trigger households_stamp before insert or update on public.households
  for each row execute function private.stamp_row();

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'active' check (status in ('active', 'left', 'removed')),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  avatar text check (avatar ~ '^[a-z0-9-]+/[a-z0-9-]+$'),
  color text not null default 'sky' check (color ~ '^[a-z]{2,16}$'),
  theme text check (theme ~ '^[a-z0-9-]{1,32}$'),
  mode text not null default 'system' check (mode in ('system', 'light', 'dark')),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (household_id, id)
);

-- v1: a user belongs to one household at a time.
create unique index household_members_one_active on public.household_members (user_id)
  where status = 'active';
create index household_members_household on public.household_members (household_id);

create trigger household_members_stamp before insert or update on public.household_members
  for each row execute function private.stamp_row();

create table public.household_settings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null unique references public.households (id) on delete cascade,
  modules jsonb not null default
    '{"chores": true, "lists": true, "stuff": true, "plans": true, "pantry": false, "rewards": true, "calendar": true}',
  default_theme text not null default 'classic' check (default_theme ~ '^[a-z0-9-]{1,32}$'),
  weekly_target integer not null default 400 check (weekly_target between 50 and 100000),
  zone_rotation jsonb not null default '{}' check (jsonb_typeof(zone_rotation) = 'object'),
  digest_time time not null default '08:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  check (jsonb_typeof(modules) = 'object')
);

create trigger household_settings_stamp before insert or update on public.household_settings
  for each row execute function private.stamp_row();

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('household', 'member')),
  household_id uuid references public.households (id) on delete cascade,
  code_hash text not null unique,
  label text check (char_length(label) <= 60),
  expires_at timestamptz not null,
  max_uses integer not null default 1 check (max_uses between 1 and 20),
  use_count integer not null default 0 check (use_count >= 0),
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  -- Operator invites create a household; member invites join one.
  check ((kind = 'household') = (household_id is null))
);
create index invites_household on public.invites (household_id);

create trigger invites_stamp before insert or update on public.invites
  for each row execute function private.stamp_row();

------------------------------------------------------------------------------
-- Access helpers
------------------------------------------------------------------------------

create or replace function public.is_member_of(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = auth.uid() and m.status = 'active'
  );
$$;

create or replace function public.is_owner_of(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = auth.uid()
      and m.status = 'active' and m.role = 'owner'
  );
$$;

create or replace function public.is_operator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.operators o
    join auth.users u on lower(u.email) = o.email
    where u.id = auth.uid()
  );
$$;

create or replace function public.current_member_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.id from public.household_members m
  where m.user_id = auth.uid() and m.status = 'active'
  limit 1;
$$;

-- The current calendar day in a household's timezone (docs: CLAUDE.md rule 7).
create or replace function public.household_today(hid uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (now() at time zone h.timezone)::date from public.households h where h.id = hid;
$$;

revoke execute on function
  public.is_member_of(uuid), public.is_owner_of(uuid), public.is_operator(),
  public.current_member_id(), public.household_today(uuid)
  from public, anon;
grant execute on function
  public.is_member_of(uuid), public.is_owner_of(uuid), public.is_operator(),
  public.current_member_id(), public.household_today(uuid)
  to authenticated, service_role;

------------------------------------------------------------------------------
-- Row level security
------------------------------------------------------------------------------

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_settings enable row level security;
alter table public.invites enable row level security;

create policy households_select on public.households
  for select to authenticated using (public.is_member_of(id));
create policy households_update on public.households
  for update to authenticated using (public.is_owner_of(id)) with check (public.is_owner_of(id));
create policy households_delete on public.households
  for delete to authenticated using (public.is_owner_of(id));

create policy members_select on public.household_members
  for select to authenticated using (public.is_member_of(household_id));
-- Members edit only their own profile; column grants below limit which fields.
create policy members_update_self on public.household_members
  for update to authenticated
  using (user_id = auth.uid() and status = 'active' and public.is_member_of(household_id))
  with check (user_id = auth.uid() and public.is_member_of(household_id));

create policy settings_select on public.household_settings
  for select to authenticated using (public.is_member_of(household_id));
create policy settings_update on public.household_settings
  for update to authenticated
  using (public.is_owner_of(household_id)) with check (public.is_owner_of(household_id));

create policy invites_select on public.invites
  for select to authenticated using (
    (kind = 'member' and public.is_owner_of(household_id))
    or (kind = 'household' and public.is_operator())
  );

------------------------------------------------------------------------------
-- Privileges: anon gets nothing; authenticated gets only what RLS can guard.
------------------------------------------------------------------------------

revoke all on public.households, public.household_members, public.household_settings, public.invites
  from anon, authenticated;

grant select, delete on public.households to authenticated;
grant update (name, timezone) on public.households to authenticated;

grant select on public.household_members to authenticated;
grant update (display_name, avatar, color, theme, mode) on public.household_members to authenticated;

grant select on public.household_settings to authenticated;
grant update (modules, default_theme, weekly_target, zone_rotation, digest_time)
  on public.household_settings to authenticated;

-- Code hashes are never readable, even by the owner.
grant select (id, kind, household_id, label, expires_at, max_uses, use_count, revoked_at,
  last_used_at, created_at, created_by) on public.invites to authenticated;
