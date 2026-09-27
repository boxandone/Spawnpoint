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

-- Operator functions work only for operators, and return counts and sizes only.
select plan(17);

set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
select ok(not public.is_operator(), 'a household owner is not an operator');
select throws_ok($$select public.operator_stats()$$, '42501', null, 'non-operator cannot read stats');
select throws_ok($$select public.create_household_invite()$$, '42501', null, 'non-operator cannot create household invites');
select throws_ok($$select public.revoke_invite('70000000-0000-4000-8000-0000000000e1')$$, '42501', null, 'non-operator cannot revoke household invites');
select throws_ok($$select public.sync_config(array['me@test.example'], '{}')$$, '42501', null, 'clients cannot make themselves operators');
select throws_ok($$select public.rename_invite('70000000-0000-4000-8000-0000000000e1', 'Mine now')$$, '42501', null, 'non-operator cannot rename household invites');

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000e1", "role": "authenticated"}';
select ok(public.is_operator(), 'the operator is recognized by email');
select cmp_ok((public.operator_stats() ->> 'households')::int, '>=', 2, 'operator sees a household count');
select is(
  (select array_agg(k order by k) from jsonb_object_keys(public.operator_stats()) k),
  array['households', 'members', 'open_household_invites', 'storage', 'storage_quota_mb'],
  'stats contain counts and sizes only');
select is(length(public.create_household_invite('For a friend') ->> 'code'), 12, 'operator creates a household invite');
select cmp_ok((select count(*)::int from public.invites where kind = 'household'), '>=', 2, 'operator sees household invites');
select is((select count(*)::int from public.invites where kind = 'member'), 0, 'operator cannot see member invites');
select is(
  (select count(*)::int from public.households) + (select count(*)::int from public.tasks)
    + (select count(*)::int from public.completions) + (select count(*)::int from public.locations)
    + (select count(*)::int from public.household_members),
  0, 'operator cannot read any household content');
select throws_ok($$select public.revoke_invite('70000000-0000-4000-8000-00000000000a')$$, '42501', null, 'operator cannot revoke a household''s member invite');
select lives_ok($$select public.rename_invite('70000000-0000-4000-8000-0000000000e1', '  For the lake house  ')$$, 'operator can rename a household invite');
select is((select label from public.invites where id = '70000000-0000-4000-8000-0000000000e1'), 'For the lake house', 'the new label is trimmed and saved');
select lives_ok($$select public.revoke_invite('70000000-0000-4000-8000-0000000000e1')$$, 'operator can revoke a household invite');

select * from finish();

rollback;
