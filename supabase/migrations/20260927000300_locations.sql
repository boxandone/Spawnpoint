-- Locations: one tree shared by Chores and Stuff (docs/SPEC.md 4.2).
--   zone (Upstairs) > area (Kitchen) > spot (Hall closet top shelf)

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  parent_id uuid,
  kind text not null check (kind in ('zone', 'area', 'spot')),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  icon text check (char_length(icon) <= 32),
  sort integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (household_id, id),
  check (parent_id is null or parent_id <> id),
  -- A parent is always in the same household.
  foreign key (household_id, parent_id)
    references public.locations (household_id, id) on delete set null (parent_id)
);
create index locations_household on public.locations (household_id, sort);

create or replace function private.validate_location()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_kind text;
begin
  if new.parent_id is not null then
    select kind into parent_kind from public.locations
    where id = new.parent_id and household_id = new.household_id;
  end if;
  if new.kind = 'zone' and new.parent_id is not null then
    raise exception 'a zone has no parent' using errcode = '23514';
  elsif new.kind = 'area' and new.parent_id is not null and parent_kind <> 'zone' then
    raise exception 'an area can only sit inside a zone' using errcode = '23514';
  elsif new.kind = 'spot' and (new.parent_id is null or parent_kind <> 'area') then
    raise exception 'a spot must sit inside an area' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger locations_validate before insert or update of parent_id, kind on public.locations
  for each row execute function private.validate_location();
create trigger locations_stamp before insert or update on public.locations
  for each row execute function private.stamp_row();

alter table public.locations enable row level security;

create policy locations_select on public.locations
  for select to authenticated using (public.is_member_of(household_id));
create policy locations_insert on public.locations
  for insert to authenticated with check (public.is_member_of(household_id));
create policy locations_update on public.locations
  for update to authenticated
  using (public.is_member_of(household_id)) with check (public.is_member_of(household_id));
create policy locations_delete on public.locations
  for delete to authenticated using (public.is_member_of(household_id));

revoke all on public.locations from anon, authenticated;
grant select, insert, update, delete on public.locations to authenticated;
