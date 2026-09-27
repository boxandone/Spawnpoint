-- Invite labels can be renamed, and a used household invite remembers which
-- household it created (shown to operators only as a short id, never a name).

alter table public.invites
  add column created_household_id uuid references public.households (id) on delete set null;

grant select (created_household_id) on public.invites to authenticated;

-- Operators rename household invites; owners rename their household's member invites.
create or replace function public.rename_invite(p_invite_id uuid, p_label text)
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
  update public.invites
  set label = nullif(left(btrim(coalesce(p_label, '')), 60), '')
  where id = p_invite_id;
end;
$$;

revoke execute on function public.rename_invite(uuid, text) from public, anon;
grant execute on function public.rename_invite(uuid, text) to authenticated;

-- Same as before, plus recording which household the invite created.
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
    update public.invites
    set use_count = use_count + 1, last_used_at = now(), created_household_id = hid
    where id = inv.id;
    perform private.record_invite_attempt(true);
  end if;

  return jsonb_build_object('ok', true, 'household_id', hid, 'member_id', mid);
end;
$$;
