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

-- A member of household A can't read or write anything in household B.
select plan(25);

set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';

select is((select count(*)::int from public.households where id <> '20000000-0000-4000-8000-00000000000a'), 0, 'households: only A');
select is((select count(*)::int from public.household_members where household_id <> '20000000-0000-4000-8000-00000000000a'), 0, 'members: only A');
select is((select count(*)::int from public.household_settings where household_id <> '20000000-0000-4000-8000-00000000000a'), 0, 'settings: only A');
select is((select count(*)::int from public.invites where household_id is distinct from '20000000-0000-4000-8000-00000000000a'), 0, 'invites: only A');
select is((select count(*)::int from public.locations where household_id <> '20000000-0000-4000-8000-00000000000a'), 0, 'locations: only A');
select is((select count(*)::int from public.tasks where household_id <> '20000000-0000-4000-8000-00000000000a'), 0, 'tasks: only A');
select is((select count(*)::int from public.completions where household_id <> '20000000-0000-4000-8000-00000000000a'), 0, 'completions: only A');
select is((select count(*)::int from public.tasks), 1, 'still sees its own task');
select is((select count(*)::int from public.task_last_done where household_id <> '20000000-0000-4000-8000-00000000000a'), 0, 'task_last_done: only A');
select ok(not public.is_member_of('20000000-0000-4000-8000-00000000000b'), 'is_member_of(B) is false');

select is_empty($$update public.tasks set title = 'hacked' where id = '50000000-0000-4000-8000-00000000000b' returning id$$, 'cannot update B''s task');
select is_empty($$delete from public.completions where id = '60000000-0000-4000-8000-00000000000b' returning id$$, 'cannot delete B''s completion');
select is_empty($$update public.households set name = 'hacked' where id = '20000000-0000-4000-8000-00000000000b' returning id$$, 'cannot rename B');
select is_empty($$update public.household_settings set weekly_target = 999 where household_id = '20000000-0000-4000-8000-00000000000b' returning id$$, 'cannot change B''s settings');
select is_empty($$delete from public.locations where household_id = '20000000-0000-4000-8000-00000000000b' returning id$$, 'cannot delete B''s locations');
select is_empty($$update public.household_members set display_name = 'hacked' where id = '30000000-0000-4000-8000-0000000000b1' returning id$$, 'cannot edit B''s members');

select throws_ok(
  $$insert into public.tasks (household_id, title, schedule) values ('20000000-0000-4000-8000-00000000000b', 'Sneaky', '{"type": "daily"}')$$,
  '42501', null, 'cannot insert a task into B');
select throws_ok(
  $$insert into public.completions (household_id, task_id, done_on, done_by, logged_by) values ('20000000-0000-4000-8000-00000000000b', '50000000-0000-4000-8000-00000000000b', current_date - 1, '30000000-0000-4000-8000-0000000000b1', '30000000-0000-4000-8000-0000000000b1')$$,
  '42501', null, 'cannot insert a completion into B');
select throws_ok(
  $$insert into public.tasks (household_id, title, schedule, location_id) values ('20000000-0000-4000-8000-00000000000a', 'Pointing at B', '{"type": "daily"}', '40000000-0000-4000-8000-00000000000b')$$,
  '23503', null, 'a task in A cannot use a location from B');
select throws_ok(
  $$insert into public.completions (household_id, task_id, done_on, done_by, logged_by) values ('20000000-0000-4000-8000-00000000000a', '50000000-0000-4000-8000-00000000000b', current_date - 1, '30000000-0000-4000-8000-0000000000a1', '30000000-0000-4000-8000-0000000000a1')$$,
  '23503', null, 'a completion in A cannot point at B''s task');
select throws_ok(
  $$insert into public.completions (household_id, task_id, done_on, done_by, logged_by) values ('20000000-0000-4000-8000-00000000000a', '50000000-0000-4000-8000-00000000000a', current_date - 1, '30000000-0000-4000-8000-0000000000b1', '30000000-0000-4000-8000-0000000000a1')$$,
  '23503', null, 'done_by cannot be a member of B');
select throws_ok(
  $$update public.tasks set household_id = '20000000-0000-4000-8000-00000000000b' where id = '50000000-0000-4000-8000-00000000000a'$$,
  '42501', null, 'cannot move a task into B');
select throws_ok(
  $$insert into public.locations (household_id, parent_id, kind, name) values ('20000000-0000-4000-8000-00000000000a', '40000000-0000-4000-8000-00000000000b', 'spot', 'Hidden')$$,
  '23503', null, 'a location in A cannot hang under a location in B');

reset role;
select is((select title from public.tasks where id = '50000000-0000-4000-8000-00000000000b'), 'Task B', 'B''s task is untouched');
select is((select count(*)::int from public.completions where household_id = '20000000-0000-4000-8000-00000000000b'), 1, 'B''s completion is untouched');

select * from finish();

rollback;
