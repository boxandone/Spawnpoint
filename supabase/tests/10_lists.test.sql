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


-- Lists (docs/SPEC.md 4.4): built-ins, isolation, shopping trips, and trip XP.
select plan(33);

create temp table ids (k text primary key, v uuid);
insert into ids select 'a_groc', id from public.lists where household_id = '20000000-0000-4000-8000-00000000000a' and kind = 'groceries';
insert into ids select 'a_todo', id from public.lists where household_id = '20000000-0000-4000-8000-00000000000a' and kind = 'todo';
insert into ids select 'b_groc', id from public.lists where household_id = '20000000-0000-4000-8000-00000000000b' and kind = 'groceries';
grant select on ids to authenticated;

select is((select count(*)::int from public.lists where household_id = '20000000-0000-4000-8000-00000000000a'), 3,
  'a new household gets Groceries, To buy, and To-do');

insert into public.list_items (id, household_id, list_id, name, category) values
  ('80000000-0000-4000-8000-0000000000b1', '20000000-0000-4000-8000-00000000000b', (select v from ids where k = 'b_groc'), 'B secret item', 'other');
insert into public.staples (household_id, name) values ('20000000-0000-4000-8000-00000000000b', 'B staple');

-- Member of A ----------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';

select is((select count(*)::int from public.lists), 3, 'A sees only its own lists');
select is((select count(*)::int from public.list_items), 0, 'A can''t read B''s items');
select is((select count(*)::int from public.staples), 0, 'A can''t read B''s staples');

select throws_ok(
  $$insert into public.list_items (household_id, list_id, name) values ('20000000-0000-4000-8000-00000000000b', (select v from ids where k = 'b_groc'), 'sneaky')$$,
  '42501', null, 'A can''t add items to B''s list');
select throws_ok(
  $$insert into public.list_items (household_id, list_id, name) values ('20000000-0000-4000-8000-00000000000a', (select v from ids where k = 'b_groc'), 'sneaky')$$,
  '23503', null, 'an item can''t point at another household''s list');
update public.list_items set name = 'changed' where id = '80000000-0000-4000-8000-0000000000b1';
delete from public.list_items where id = '80000000-0000-4000-8000-0000000000b1';
select throws_ok(
  $$insert into public.staples (household_id, name) values ('20000000-0000-4000-8000-00000000000b', 'sneaky')$$,
  '42501', null, 'A can''t add B''s staples');
select throws_ok(
  $$insert into public.lists (household_id, kind) values ('20000000-0000-4000-8000-00000000000a', 'groceries')$$,
  '42501', null, 'clients can''t add a built-in list');
select lives_ok(
  $$insert into public.lists (id, household_id, kind, name) values ('81000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-00000000000a', 'custom', 'Packing')$$,
  'members can add a custom list');
select lives_ok(
  $$update public.lists set archived_at = now() where id = '81000000-0000-4000-8000-000000000001'$$,
  'and archive it');
select throws_ok(
  $$update public.lists set archived_at = now() where id = (select v from ids where k = 'a_groc')$$,
  '42501', null, 'built-in lists can''t be archived');
select throws_ok(
  $$delete from public.lists where id = '81000000-0000-4000-8000-000000000001'$$,
  '42501', null, 'lists are archived, never deleted');
select throws_ok(
  $$insert into public.shopping_trips (household_id, member_id, day) values ('20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-0000000000a1', current_date)$$,
  '42501', null, 'clients can''t write shopping trips');
select throws_ok(
  $$insert into public.list_items (household_id, list_id, name, links) values ('20000000-0000-4000-8000-00000000000a', (select v from ids where k = 'a_todo'), 'bad link', '{"javascript:alert(1)"}')$$,
  '23514', null, 'links must be http(s)');
select throws_ok(
  $$insert into public.list_items (household_id, list_id, name) values ('20000000-0000-4000-8000-00000000000a', (select v from ids where k = 'a_todo'), '   ')$$,
  '23514', null, 'names can''t be blank');

-- Shopping: add, check, done.
insert into public.list_items (id, household_id, list_id, name, quantity, category, position) values
  ('82000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-00000000000a', (select v from ids where k = 'a_groc'), 'Milk', '2', 'dairy', 1),
  ('82000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-00000000000a', (select v from ids where k = 'a_groc'), 'Apples', null, 'produce', 2),
  ('82000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-00000000000a', (select v from ids where k = 'a_groc'), 'Bread', null, 'bakery', 3);
update public.list_items set checked = true where id in ('82000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000002');
select is((select checked_by from public.list_items where id = '82000000-0000-4000-8000-000000000001'),
  '30000000-0000-4000-8000-0000000000a1'::uuid, 'checking records who put it in the cart');

create temp table trip on commit drop as select public.done_shopping((select v from ids where k = 'a_groc')) as r;
select is((select (r ->> 'count')::int from trip), 2, 'Done shopping clears the 2 items in the cart');
select is((select count(*)::int from public.list_items where list_id = (select v from ids where k = 'a_groc')), 1,
  'the unchecked item stays on the list');
select is((select (r ->> 'xp')::boolean from trip), true, 'the first trip of the day earns XP');
select is((select credited_xp from public.xp_events where shopping_trip_id = (select (r ->> 'trip_id')::uuid from trip)), 10.00,
  'a shopping trip is worth 10 XP');
select is((select count(*)::int from public.grocery_suggestions('20000000-0000-4000-8000-00000000000a') where name in ('Milk', 'Apples')), 2,
  'bought items become suggestions');
select is((select count(*)::int from public.grocery_suggestions('20000000-0000-4000-8000-00000000000b')), 0,
  'no suggestions from another household');

update public.list_items set checked = true where id = '82000000-0000-4000-8000-000000000003';
select is((public.done_shopping((select v from ids where k = 'a_groc')) ->> 'xp')::boolean, false,
  'a second trip the same day is recorded without more XP');
select is((public.done_shopping((select v from ids where k = 'a_groc')) ->> 'count')::int, 0,
  'an empty cart makes no trip');

-- Another member can't undo my trip.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000a2", "role": "authenticated"}';
select throws_ok(
  format('select public.undo_done_shopping(%L)', (select r ->> 'trip_id' from trip)),
  '42501', null, 'only the shopper can undo a trip');

-- Member of B ----------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000b1", "role": "authenticated"}';
select throws_ok(
  format('select public.done_shopping(%L)', (select v from ids where k = 'a_groc')),
  '42501', null, 'B can''t finish A''s shopping');
select throws_ok(
  format('select public.undo_done_shopping(%L)', (select r ->> 'trip_id' from trip)),
  '42501', null, 'B can''t undo A''s trip');
select is((select count(*)::int from public.shopping_trips), 0, 'B can''t see A''s trips');
select is((select name from public.list_items where id = '80000000-0000-4000-8000-0000000000b1'), 'B secret item',
  'A''s update and delete never touched B''s item');

-- Back to A: undo brings the items back and removes the XP.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
select lives_ok(format('select public.undo_done_shopping(%L)', (select r ->> 'trip_id' from trip)), 'the shopper can undo');
select is((select count(*)::int from public.list_items where id in ('82000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000002') and checked), 2,
  'undo puts the items back in the cart');
select is((select count(*)::int from public.xp_events where source_kind = 'shopping'), 0, 'and removes the trip''s XP');

reset role;
select is((select xp_total from public.member_stats where member_id = '30000000-0000-4000-8000-0000000000a1'),
  (select coalesce(sum(credited_xp), 0) from public.xp_events where member_id = '30000000-0000-4000-8000-0000000000a1'),
  'the member total matches after undo');

select * from finish();
rollback;
