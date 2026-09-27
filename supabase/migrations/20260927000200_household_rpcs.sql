-- Household, invite, member, and operator functions.
--
-- Invite codes are random, shown once, stored as SHA-256 hashes, expire, and are
-- rate-limited per user. Functions that take a code return {ok, error} instead of
-- raising, so a failed attempt is still recorded for the rate limit.

------------------------------------------------------------------------------
-- Internal helpers
------------------------------------------------------------------------------

-- 12 characters of Crockford base32 (no I, L, O, U): about 60 bits of randomness.
create or replace function private.new_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  bytes bytea := extensions.gen_random_bytes(12);
  code text := '';
begin
  for i in 0..11 loop
    code := code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return code;
end;
$$;

create or replace function private.hash_invite_code(code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(
    sha256(convert_to(upper(regexp_replace(coalesce(code, ''), '[^0-9A-Za-z]', '', 'g')), 'UTF8')),
    'hex'
  );
$$;

create or replace function private.invite_rate_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) < 10 from private.invite_attempts
  where user_id = auth.uid() and not ok and attempted_at > now() - interval '1 hour';
$$;

create or replace function private.record_invite_attempt(p_ok boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.invite_attempts (user_id, ok) values (auth.uid(), p_ok);
$$;

create or replace function private.config(p_key text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select value from private.app_config where key = p_key;
$$;

-- A usable invite of the given kind, locked for update, or null.
create or replace function private.find_invite(p_code text, p_kind text)
returns public.invites
language sql
security definer
set search_path = ''
as $$
  select i.* from public.invites i
  where i.code_hash = private.hash_invite_code(p_code)
    and i.kind = p_kind
    and i.revoked_at is null
    and i.expires_at > now()
    and i.use_count < i.max_uses
  for update;
$$;

create or replace function private.clean_theme(p_theme text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_theme ~ '^[a-z0-9-]{1,32}$' then p_theme else null end;
$$;

create or replace function private.clean_avatar(p_avatar text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_avatar ~ '^[a-z0-9-]+/[a-z0-9-]+$' then p_avatar else null end;
$$;

create or replace function private.clean_color(p_color text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_color ~ '^[a-z]{2,16}$' then p_color else 'sky' end;
$$;

------------------------------------------------------------------------------
-- Public config and config sync
------------------------------------------------------------------------------

create or replace function public.public_config()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'household_creation', coalesce(private.config('household_creation'), 'invite_only'),
    'household_storage_mb', coalesce(private.config('household_storage_mb'), '250')::int,
    'operator_name', coalesce(private.config('operator_name'), '')
  );
$$;

-- Called only by the sync-config Netlify Function with the service role.
create or replace function public.sync_config(p_operator_emails text[], p_config jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  emails text[] := array(
    select distinct lower(btrim(e)) from unnest(coalesce(p_operator_emails, '{}')) e
    where btrim(e) like '%@%'
  );
  k text;
begin
  delete from private.operators where email <> all (emails);
  insert into private.operators (email) select unnest(emails) on conflict do nothing;

  foreach k in array array['household_creation', 'household_storage_mb', 'operator_name'] loop
    if p_config ? k then
      if k = 'household_creation' and (p_config ->> k) not in ('invite_only', 'open') then
        continue;
      end if;
      if k = 'household_storage_mb' and (p_config ->> k) !~ '^[0-9]{1,6}$' then
        continue;
      end if;
      insert into private.app_config (key, value) values (k, left(p_config ->> k, 120))
      on conflict (key) do update set value = excluded.value, updated_at = now();
    end if;
  end loop;

  return jsonb_build_object('operators', cardinality(emails));
end;
$$;

------------------------------------------------------------------------------
-- Invites
------------------------------------------------------------------------------

create or replace function public.peek_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invites;
  hname text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;
  if not private.invite_rate_ok() then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  select i.* into inv from public.invites i
  where i.code_hash = private.hash_invite_code(p_code)
    and i.revoked_at is null and i.expires_at > now() and i.use_count < i.max_uses;

  if inv.id is null then
    perform private.record_invite_attempt(false);
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  if inv.kind = 'member' then
    select h.name into hname from public.households h where h.id = inv.household_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'kind', inv.kind,
    'household_name', hname,
    'expires_at', inv.expires_at,
    'already_member', public.current_member_id() is not null
  );
end;
$$;

create or replace function public.create_member_invite(
  p_household_id uuid,
  p_max_uses integer default 1,
  p_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  code text := private.new_invite_code();
  inv public.invites;
begin
  if not public.is_owner_of(p_household_id) then
    raise exception 'only the household owner can create invites' using errcode = '42501';
  end if;
  insert into public.invites (kind, household_id, code_hash, label, expires_at, max_uses)
  values ('member', p_household_id, private.hash_invite_code(code), left(p_label, 60),
          now() + interval '7 days', greatest(1, least(coalesce(p_max_uses, 1), 20)))
  returning * into inv;
  return jsonb_build_object('ok', true, 'id', inv.id, 'code', code, 'expires_at', inv.expires_at);
end;
$$;

create or replace function public.create_household_invite(p_label text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  code text := private.new_invite_code();
  inv public.invites;
begin
  if not public.is_operator() then
    raise exception 'operators only' using errcode = '42501';
  end if;
  insert into public.invites (kind, household_id, code_hash, label, expires_at, max_uses)
  values ('household', null, private.hash_invite_code(code), left(p_label, 60),
          now() + interval '14 days', 1)
  returning * into inv;
  return jsonb_build_object('ok', true, 'id', inv.id, 'code', code, 'expires_at', inv.expires_at);
end;
$$;

create or replace function public.revoke_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invites;
begin
  select * into inv from public.invites where id = p_invite_id;
  if inv.id is null
     or (inv.kind = 'member' and not public.is_owner_of(inv.household_id))
     or (inv.kind = 'household' and not public.is_operator()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.invites set revoked_at = coalesce(revoked_at, now()) where id = p_invite_id;
end;
$$;

------------------------------------------------------------------------------
-- Creating and joining households
------------------------------------------------------------------------------

create or replace function public.create_household(
  p_name text,
  p_timezone text,
  p_display_name text,
  p_code text default null,
  p_avatar text default null,
  p_color text default null,
  p_theme text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  inv public.invites;
  hid uuid;
  mid uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;
  if public.current_member_id() is not null then
    return jsonb_build_object('ok', false, 'error', 'already_member');
  end if;

  if p_code is not null and btrim(p_code) <> '' then
    if not private.invite_rate_ok() then
      return jsonb_build_object('ok', false, 'error', 'rate_limited');
    end if;
    inv := private.find_invite(p_code, 'household');
    if inv.id is null then
      perform private.record_invite_attempt(false);
      return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;
  elsif coalesce(private.config('household_creation'), 'invite_only') <> 'open' then
    return jsonb_build_object('ok', false, 'error', 'invite_required');
  end if;

  insert into public.households (name, timezone)
  values (btrim(p_name), coalesce(nullif(btrim(p_timezone), ''), 'UTC'))
  returning id into hid;

  insert into public.household_settings (household_id, default_theme)
  values (hid, coalesce(private.clean_theme(p_theme), 'classic'));

  insert into public.household_members (household_id, user_id, role, display_name, avatar, color)
  values (hid, uid, 'owner', btrim(p_display_name), private.clean_avatar(p_avatar),
          private.clean_color(p_color))
  returning id into mid;

  if inv.id is not null then
    update public.invites set use_count = use_count + 1, last_used_at = now() where id = inv.id;
    perform private.record_invite_attempt(true);
  end if;

  return jsonb_build_object('ok', true, 'household_id', hid, 'member_id', mid);
end;
$$;

create or replace function public.accept_member_invite(
  p_code text,
  p_display_name text,
  p_avatar text default null,
  p_color text default null,
  p_theme text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  inv public.invites;
  mid uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;
  if public.current_member_id() is not null then
    return jsonb_build_object('ok', false, 'error', 'already_member');
  end if;
  if not private.invite_rate_ok() then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  inv := private.find_invite(p_code, 'member');
  if inv.id is null then
    perform private.record_invite_attempt(false);
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  insert into public.household_members (household_id, user_id, role, display_name, avatar, color, theme)
  values (inv.household_id, uid, 'member', btrim(p_display_name), private.clean_avatar(p_avatar),
          private.clean_color(p_color), private.clean_theme(p_theme))
  returning id into mid;

  update public.invites set use_count = use_count + 1, last_used_at = now() where id = inv.id;
  perform private.record_invite_attempt(true);

  return jsonb_build_object('ok', true, 'household_id', inv.household_id, 'member_id', mid);
end;
$$;

------------------------------------------------------------------------------
-- Managing members (owner only)
------------------------------------------------------------------------------

create or replace function public.remove_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.household_members;
begin
  select * into m from public.household_members where id = p_member_id and status = 'active';
  if m.id is null or not public.is_owner_of(m.household_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if m.user_id = auth.uid() then
    raise exception 'use leave_household to leave' using errcode = '22023';
  end if;
  update public.household_members set status = 'removed' where id = p_member_id;
end;
$$;

create or replace function public.set_member_role(p_member_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.household_members;
  owners integer;
begin
  if p_role not in ('owner', 'member') then
    raise exception 'unknown role' using errcode = '22023';
  end if;
  select * into m from public.household_members where id = p_member_id and status = 'active';
  if m.id is null or not public.is_owner_of(m.household_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_role = 'member' and m.role = 'owner' then
    select count(*) into owners from public.household_members
    where household_id = m.household_id and status = 'active' and role = 'owner';
    if owners <= 1 then
      raise exception 'a household needs at least one owner' using errcode = '22023';
    end if;
  end if;
  update public.household_members set role = p_role where id = p_member_id;
end;
$$;

create or replace function public.leave_household()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.household_members;
  owners integer;
begin
  select * into m from public.household_members where user_id = auth.uid() and status = 'active';
  if m.id is null then
    return;
  end if;
  if m.role = 'owner' then
    select count(*) into owners from public.household_members
    where household_id = m.household_id and status = 'active' and role = 'owner';
    if owners <= 1 then
      raise exception 'make someone else an owner first' using errcode = '22023';
    end if;
  end if;
  update public.household_members set status = 'left' where id = m.id;
end;
$$;

------------------------------------------------------------------------------
-- Operator: counts and sizes only
------------------------------------------------------------------------------

create or replace function public.operator_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  storage jsonb := '[]'::jsonb;
begin
  if not public.is_operator() then
    raise exception 'operators only' using errcode = '42501';
  end if;

  -- Storage arrives in Phase 4; sizes come from the private `docs` bucket paths.
  if to_regclass('storage.objects') is not null then
    execute $q$
      select coalesce(jsonb_agg(jsonb_build_object('household_ref', ref, 'bytes', bytes) order by bytes desc), '[]')
      from (
        select left(h.id::text, 8) as ref,
               coalesce(sum((o.metadata ->> 'size')::bigint), 0) as bytes
        from public.households h
        left join storage.objects o
          on o.bucket_id = 'docs' and split_part(o.name, '/', 1) = h.id::text
        group by h.id
      ) s
    $q$ into storage;
  end if;

  return jsonb_build_object(
    'households', (select count(*) from public.households),
    'members', (select count(*) from public.household_members where status = 'active'),
    'open_household_invites', (
      select count(*) from public.invites
      where kind = 'household' and revoked_at is null and expires_at > now() and use_count < max_uses
    ),
    'storage', storage,
    'storage_quota_mb', coalesce(private.config('household_storage_mb'), '250')::int
  );
end;
$$;

------------------------------------------------------------------------------
-- Privileges
------------------------------------------------------------------------------

revoke execute on all functions in schema private from public, anon, authenticated;

revoke execute on function
  public.public_config(),
  public.sync_config(text[], jsonb),
  public.peek_invite(text),
  public.create_member_invite(uuid, integer, text),
  public.create_household_invite(text),
  public.revoke_invite(uuid),
  public.create_household(text, text, text, text, text, text, text),
  public.accept_member_invite(text, text, text, text, text),
  public.remove_member(uuid),
  public.set_member_role(uuid, text),
  public.leave_household(),
  public.operator_stats()
  from public, anon;

grant execute on function
  public.public_config(),
  public.peek_invite(text),
  public.create_member_invite(uuid, integer, text),
  public.create_household_invite(text),
  public.revoke_invite(uuid),
  public.create_household(text, text, text, text, text, text, text),
  public.accept_member_invite(text, text, text, text, text),
  public.remove_member(uuid),
  public.set_member_role(uuid, text),
  public.leave_household(),
  public.operator_stats()
  to authenticated;

revoke execute on function public.sync_config(text[], jsonb) from authenticated;
grant execute on function public.sync_config(text[], jsonb) to service_role;
