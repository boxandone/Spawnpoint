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


-- Plans (docs/SPEC.md 4.7), talk it over, and the calendar feed (4.8).
select plan(39);

create temp table t (k text primary key, v text);
grant select, insert, update on t to authenticated, service_role;

insert into public.plans (id, household_id, title, type, starts_on) values
  ('a1000000-0000-4000-8000-0000000000b1', '20000000-0000-4000-8000-00000000000b', 'B trip', 'trip', current_date + 10);

-- Member A1 ------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
discard plans;

insert into public.plans (id, household_id, title, type, starts_on, ends_on, discuss) values
  ('a1000000-0000-4000-8000-0000000000a1', '20000000-0000-4000-8000-00000000000a', 'Beach weekend', 'trip', current_date + 20, current_date + 22, true);
select is((select count(*)::int from public.plans), 1, 'A sees only its own plans');
select throws_ok(
  $$insert into public.plans (household_id, title) values ('20000000-0000-4000-8000-00000000000b', 'sneaky')$$,
  '42501', null, 'A can''t add plans to B');
select throws_ok(
  $$insert into public.plan_checklist_items (household_id, plan_id, text) values ('20000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-0000000000b1', 'x')$$,
  '23503', null, 'a checklist item can''t point at B''s plan');
select lives_ok(
  $$insert into public.plan_checklist_items (household_id, plan_id, text) values ('20000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-0000000000a1', 'Book the house')$$,
  'members add checklist items');
select throws_ok(
  $$insert into public.plans (household_id, title, starts_on, ends_on) values ('20000000-0000-4000-8000-00000000000a', 'x', current_date, current_date - 1)$$,
  '23514', null, 'a plan can''t end before it starts');
select throws_ok(
  $$delete from public.plans where id = 'a1000000-0000-4000-8000-0000000000a1'$$,
  '42501', null, 'plans are archived, never deleted');
select lives_ok(
  $$insert into public.documents (household_id, plan_id, kind, storage_path, mime_type, size_bytes)
    values ('20000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-0000000000a1', 'other',
            '20000000-0000-4000-8000-00000000000a/plan-a1000000-0000-4000-8000-0000000000a1/93000000-0000-4000-8000-000000000001.pdf', 'application/pdf', 10)$$,
  'files attach to a plan in its own folder');
select throws_ok(
  $$insert into public.documents (household_id, plan_id, kind, storage_path, mime_type, size_bytes)
    values ('20000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-0000000000a1', 'other',
            '20000000-0000-4000-8000-00000000000a/household/93000000-0000-4000-8000-000000000002.pdf', 'application/pdf', 10)$$,
  '23514', null, 'and nowhere else');

-- XP for booked and done, once each.
update public.plans set status = 'booked' where id = 'a1000000-0000-4000-8000-0000000000a1';
select is((select sum(raw_xp) from public.xp_events where source_kind = 'plan'), 20.00, 'booking a plan earns 20 XP');
select is((select tier from public.badge_progress where badge_key = 'trip_booked'), 1, 'Trip booked badge');
update public.plans set status = 'planning' where id = 'a1000000-0000-4000-8000-0000000000a1';
update public.plans set status = 'booked' where id = 'a1000000-0000-4000-8000-0000000000a1';
select is((select sum(raw_xp) from public.xp_events where source_kind = 'plan'), 20.00, 'moving back and forth earns nothing more');
update public.plans set status = 'done' where id = 'a1000000-0000-4000-8000-0000000000a1';
select is((select sum(raw_xp) from public.xp_events where source_kind = 'plan'), 40.00, 'finishing earns 20 more');
select is((select count from public.badge_progress where badge_key = 'plans_finished'), 1.00, 'Plans finished counts it');

-- Talk it over
insert into t select 'disc', public.resolve_discussion('a1000000-0000-4000-8000-0000000000a1', null, 'Go in June')::text;
select is((select discuss from public.plans where id = 'a1000000-0000-4000-8000-0000000000a1'), false, 'resolving clears the flag');
select is((select note from public.discussions), 'Go in June', 'and records the decision');
select is((select raw_xp from public.xp_events where source_kind = 'discussion'), 5.00, 'resolving earns 5 XP');
select throws_ok($$select public.resolve_discussion('a1000000-0000-4000-8000-0000000000a1')$$, 'P0002', null,
  'an item that isn''t flagged can''t be resolved');
select throws_ok($$select public.resolve_discussion('a1000000-0000-4000-8000-0000000000b1')$$, 'P0002', null,
  'B''s plans can''t be resolved from A');
select throws_ok($$select public.resolve_discussion()$$, '42501', null, 'something must be picked');
select throws_ok($$insert into public.discussions (household_id, title, resolved_by) values ('20000000-0000-4000-8000-00000000000a', 'x', '30000000-0000-4000-8000-0000000000a1')$$,
  '42501', null, 'clients can''t write decisions directly');

insert into public.list_items (id, household_id, list_id, name, discuss)
select 'a2000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-00000000000a', id, 'Paint color', true
from public.lists where kind = 'todo';
select lives_ok($$select public.resolve_discussion(null, 'a2000000-0000-4000-8000-000000000001', '')$$, 'to-dos can be talked over too');
select is((select note from public.discussions where list_item_id = 'a2000000-0000-4000-8000-000000000001'), null, 'an empty note is fine');

-- Calendar feed tokens
insert into t select 'token', public.create_ics_token();
select ok((select v from t where k = 'token') ~ '^[0-9a-f]{64}$', 'a feed token is 32 random bytes');
select is((select count(*)::int from public.ics_tokens), 1, 'you can see your own feed settings');
select throws_ok($$select token_hash from public.ics_tokens$$, '42501', null, 'but never the stored hash');
select throws_ok(format('select public.ics_feed(%L)', (select v from t where k = 'token')), '42501', null,
  'clients can''t read feeds directly');
select lives_ok($$select public.set_ics_chores('high')$$, 'choose which chores to include');
select throws_ok($$select public.set_ics_chores('everything')$$, '22023', null, 'only known modes');

-- Member A2: can't undo A1's decision or see A1's feed ---------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000a2", "role": "authenticated"}';
discard plans;
select throws_ok(format('select public.undo_discussion(%L)', (select v from t where k = 'disc')), '42501', null,
  'only the person who resolved it can undo');
select is((select count(*)::int from public.ics_tokens), 0, 'feed settings are private to each member');

-- Member B -----------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000b1", "role": "authenticated"}';
discard plans;
select is((select count(*)::int from public.discussions), 0, 'B can''t see A''s decisions');
select is((select count(*)::int from public.plan_checklist_items), 0, 'B can''t see A''s checklists');

-- Back to A1: undo --------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
discard plans;
select lives_ok(format('select public.undo_discussion(%L)', (select v from t where k = 'disc')), 'undo works');
select is((select discuss from public.plans where id = 'a1000000-0000-4000-8000-0000000000a1'), true, 'the plan is back in the queue');

-- The feed itself (as the Netlify function) --------------------------------------
reset role;
set local role service_role;
discard plans;
select is((public.ics_feed((select v from t where k = 'token')) -> 'plans' -> 0 ->> 'title'), 'Beach weekend',
  'the feed has the household''s dated plans');
select is(jsonb_array_length(public.ics_feed((select v from t where k = 'token')) -> 'plans'), 1,
  'and nothing from other households');
select is(public.ics_feed(repeat('a', 64)), null, 'an unknown token gets nothing');

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
discard plans;
select public.revoke_ics_token();
reset role;
select is(public.ics_feed((select v from t where k = 'token')), null, 'a revoked link stops working');

select is((select xp_total from public.member_stats where member_id = '30000000-0000-4000-8000-0000000000a1'),
  (select coalesce(sum(credited_xp), 0) from public.xp_events where member_id = '30000000-0000-4000-8000-0000000000a1'),
  'the member total matches the XP rows');

select * from finish();
rollback;
