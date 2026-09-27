-- Feedback: bug reports, questions, and ideas sent from the app to the operator.
-- This is person-to-operator mail, not household data: the sender and the
-- operator can read it; nobody else can, including the sender's household.

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Filled in by the trigger so the operator can tell reports apart (shown as a short id only).
  household_id uuid references public.households (id) on delete set null,
  kind text not null check (kind in ('bug', 'question', 'idea')),
  message text not null check (char_length(btrim(message)) between 3 and 2000),
  page text check (char_length(page) <= 200),
  app_version text check (char_length(app_version) <= 20),
  user_agent text check (char_length(user_agent) <= 300),
  status text not null default 'open' check (status in ('open', 'done')),
  operator_note text check (char_length(operator_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index feedback_user on public.feedback (user_id, created_at desc);
create index feedback_status on public.feedback (status, created_at desc);

create or replace function private.feedback_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
    if (select count(*) from public.feedback
        where user_id = auth.uid() and created_at > now() - interval '1 day') >= 20 then
      raise exception 'too much feedback today; try again tomorrow' using errcode = '54000';
    end if;
  end if;
  new.household_id := (
    select m.household_id from public.household_members m
    where m.user_id = new.user_id and m.status = 'active' limit 1
  );
  new.status := 'open';
  new.operator_note := null;
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

create trigger feedback_before_insert before insert on public.feedback
  for each row execute function private.feedback_before_insert();

alter table public.feedback enable row level security;

create policy feedback_insert_own on public.feedback
  for insert to authenticated with check (user_id = auth.uid());
create policy feedback_select on public.feedback
  for select to authenticated using (user_id = auth.uid() or public.is_operator());

revoke all on public.feedback from anon, authenticated;
grant select on public.feedback to authenticated;
-- Senders choose only these columns; everything else is set by the trigger.
grant insert (kind, message, page, app_version, user_agent) on public.feedback to authenticated;

-- Operators mark feedback done (or reopen it), with an optional note the sender can see.
create or replace function public.set_feedback_status(p_id uuid, p_status text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_operator() then
    raise exception 'operators only' using errcode = '42501';
  end if;
  if p_status not in ('open', 'done') then
    raise exception 'unknown status' using errcode = '22023';
  end if;
  update public.feedback
  set status = p_status,
      operator_note = nullif(left(btrim(coalesce(p_note, '')), 500), ''),
      updated_at = now()
  where id = p_id;
end;
$$;

revoke execute on function public.set_feedback_status(uuid, text, text) from public, anon;
grant execute on function public.set_feedback_status(uuid, text, text) to authenticated;
