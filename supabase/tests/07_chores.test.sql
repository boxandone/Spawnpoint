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

-- Chores rules the database enforces: dates, authorship, schedules, locations.
select plan(14);

set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
discard plans;

select throws_ok(
  $$insert into public.completions (household_id, task_id, done_on, done_by, logged_by) values ('20000000-0000-4000-8000-00000000000a', '50000000-0000-4000-8000-00000000000a', public.household_today('20000000-0000-4000-8000-00000000000a') + 1, '30000000-0000-4000-8000-0000000000a1', '30000000-0000-4000-8000-0000000000a1')$$,
  '23514', null, 'cannot log a completion in the future');
select throws_ok(
  $$insert into public.completions (household_id, task_id, done_on, done_by, logged_by) values ('20000000-0000-4000-8000-00000000000a', '50000000-0000-4000-8000-00000000000a', current_date - 30, '30000000-0000-4000-8000-0000000000a1', '30000000-0000-4000-8000-0000000000a1')$$,
  '23514', null, 'cannot log a completion before the task existed');
select throws_ok(
  $$insert into public.completions (household_id, task_id, done_on, done_by, logged_by) values ('20000000-0000-4000-8000-00000000000a', '50000000-0000-4000-8000-00000000000a', current_date - 1, '30000000-0000-4000-8000-0000000000a2', '30000000-0000-4000-8000-0000000000a2')$$,
  '42501', null, 'logged_by must be the caller');
select lives_ok(
  $$insert into public.completions (id, household_id, task_id, done_on, done_by, logged_by, quantity) values ('60000000-0000-4000-8000-0000000000f1', '20000000-0000-4000-8000-00000000000a', '50000000-0000-4000-8000-00000000000a', current_date - 2, '30000000-0000-4000-8000-0000000000a2', '30000000-0000-4000-8000-0000000000a1', 10)$$,
  'a member can log a completion done by someone else, with a quantity');
select lives_ok(
  $$insert into public.completions (household_id, task_id, done_on, done_by, logged_by, kind, note) values ('20000000-0000-4000-8000-00000000000a', '50000000-0000-4000-8000-00000000000a', current_date - 3, '30000000-0000-4000-8000-0000000000a1', '30000000-0000-4000-8000-0000000000a1', 'skipped', 'Away')$$,
  'a skip is recorded like any completion');
select cmp_ok(
  (select logged_at from public.completions where id = '60000000-0000-4000-8000-0000000000f1'), '>=', now() - interval '1 minute',
  'logged_at is set by the database');
select isnt_empty($$delete from public.completions where id = '60000000-0000-4000-8000-0000000000f1' returning id$$, 'undo deletes the completion');

select throws_ok($$insert into public.tasks (household_id, title, schedule) values ('20000000-0000-4000-8000-00000000000a', 'Bad', '{"type": "weekly_on", "days": []}')$$, '23514', null, 'weekly schedule needs at least one day');
select throws_ok($$insert into public.tasks (household_id, title, schedule) values ('20000000-0000-4000-8000-00000000000a', 'Bad', '{"type": "every_n_days", "n": 0}')$$, '23514', null, 'every_n_days needs n >= 1');
select throws_ok($$insert into public.tasks (household_id, title, schedule) values ('20000000-0000-4000-8000-00000000000a', 'Bad', '{"type": "hourly"}')$$, '23514', null, 'unknown schedule types are rejected');

insert into public.tasks (id, household_id, title, schedule, created_by)
values ('50000000-0000-4000-8000-0000000000f1', '20000000-0000-4000-8000-00000000000a', 'New', '{"type": "monthly_on", "nth": 1, "weekday": 6}', '10000000-0000-4000-8000-0000000000b1');
select is((select start_on from public.tasks where id = '50000000-0000-4000-8000-0000000000f1'), public.household_today('20000000-0000-4000-8000-00000000000a'), 'start_on defaults to the household''s today');
select is((select created_by from public.tasks where id = '50000000-0000-4000-8000-0000000000f1'), '10000000-0000-4000-8000-0000000000a1'::uuid, 'created_by is always the caller');

select throws_ok($$insert into public.locations (household_id, kind, name) values ('20000000-0000-4000-8000-00000000000a', 'spot', 'Floating shelf')$$, '23514', null, 'a spot must sit inside an area');
select lives_ok($$insert into public.locations (household_id, parent_id, kind, name) values ('20000000-0000-4000-8000-00000000000a', '40000000-0000-4000-8000-00000000000a', 'spot', 'Under the sink')$$, 'a spot inside an area is fine');

select * from finish();

rollback;
