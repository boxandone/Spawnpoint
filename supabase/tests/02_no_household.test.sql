begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

-- Fixtures: two households (A, B), an owner and a member in A, an owner in B,
-- a signed-in user with no household, and an operator.
insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-0000000000a1', 'a1@test.example'),
  ('10000000-0000-4000-8000-0000000000a2', 'a2@test.example'),
  ('10000000-0000-4000-8000-0000000000b1', 'b1@test.example'),
  ('10000000-0000-4000-8000-0000000000c1', 'none1@test.example'),
  ('10000000-0000-4000-8000-0000000000c2', 'none2@test.example'),
  ('10000000-0000-4000-8000-0000000000e1', 'op@test.example');
insert into private.operators (email) values ('op@test.example');
insert into public.households (id, name, timezone, created_at) values
  ('20000000-0000-4000-8000-00000000000a', 'House A', 'UTC', now() - interval '30 days'),
  ('20000000-0000-4000-8000-00000000000b', 'House B', 'UTC', now() - interval '30 days');
insert into public.household_settings (household_id) values
  ('20000000-0000-4000-8000-00000000000a'), ('20000000-0000-4000-8000-00000000000b');
insert into public.household_members (id, household_id, user_id, role, display_name) values
  ('30000000-0000-4000-8000-0000000000a1', '20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-0000000000a1', 'owner', 'A One'),
  ('30000000-0000-4000-8000-0000000000a2', '20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-0000000000a2', 'member', 'A Two'),
  ('30000000-0000-4000-8000-0000000000b1', '20000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-0000000000b1', 'owner', 'B One');
insert into public.locations (id, household_id, kind, name) values
  ('40000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000a', 'area', 'Kitchen A'),
  ('40000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-00000000000b', 'area', 'Kitchen B');
insert into public.tasks (id, household_id, title, schedule, location_id, created_at) values
  ('50000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000a', 'Task A', '{"type": "daily"}', '40000000-0000-4000-8000-00000000000a', now() - interval '10 days'),
  ('50000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-00000000000b', 'Task B', '{"type": "daily"}', '40000000-0000-4000-8000-00000000000b', now() - interval '10 days');
insert into public.completions (id, household_id, task_id, done_on, done_by, logged_by) values
  ('60000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000a', '50000000-0000-4000-8000-00000000000a', current_date - 1, '30000000-0000-4000-8000-0000000000a1', '30000000-0000-4000-8000-0000000000a1'),
  ('60000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-00000000000b', '50000000-0000-4000-8000-00000000000b', current_date - 1, '30000000-0000-4000-8000-0000000000b1', '30000000-0000-4000-8000-0000000000b1');
insert into public.invites (id, kind, household_id, code_hash, expires_at) values
  ('70000000-0000-4000-8000-00000000000a', 'member', '20000000-0000-4000-8000-00000000000a', private.hash_invite_code('AAAAAAAAAAAA'), now() + interval '7 days'),
  ('70000000-0000-4000-8000-00000000000b', 'member', '20000000-0000-4000-8000-00000000000b', private.hash_invite_code('BBBBBBBBBBBB'), now() + interval '7 days'),
  ('70000000-0000-4000-8000-0000000000e1', 'household', null, private.hash_invite_code('HHHHHHHHHHHH'), now() + interval '14 days');

-- A signed-in user with no household reads nothing and can't create a household
-- without an operator invite while HOUSEHOLD_CREATION is invite_only.
select plan(14);

set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000c1", "role": "authenticated"}';
discard plans;

select is((select count(*)::int from public.households), 0, 'no households visible');
select is((select count(*)::int from public.household_members), 0, 'no members visible');
select is((select count(*)::int from public.household_settings), 0, 'no settings visible');
select is((select count(*)::int from public.invites), 0, 'no invites visible');
select is((select count(*)::int from public.locations), 0, 'no locations visible');
select is((select count(*)::int from public.tasks), 0, 'no tasks visible');
select is((select count(*)::int from public.completions), 0, 'no completions visible');
select ok(public.current_member_id() is null, 'no current member');

select throws_ok(
  $$insert into public.locations (household_id, kind, name) values ('20000000-0000-4000-8000-00000000000a', 'area', 'Sneaky')$$,
  '42501', null, 'cannot add a location to someone else''s household');

select is(
  public.create_household('Mine', 'UTC', 'Me') ->> 'error', 'invite_required',
  'cannot create a household without an invite when invite_only');

select is(
  public.create_household('Mine', 'UTC', 'Me', 'WRONGCODE000') ->> 'error', 'invalid',
  'a wrong operator code is rejected');

reset role;
update private.app_config set value = 'open' where key = 'household_creation';
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000c1", "role": "authenticated"}';
discard plans;

select is(
  (public.create_household('Mine', 'UTC', 'Me') ->> 'ok')::boolean, true,
  'with HOUSEHOLD_CREATION=open anyone can create a household');
select is((select count(*)::int from public.households), 1, 'and then sees exactly one household');
select is((select name from public.households), 'Mine', 'which is their own');

select * from finish();

rollback;
