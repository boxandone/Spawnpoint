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

-- Invite codes are hashed, single-use, expire, can be revoked, and are rate-limited.
select plan(17);

-- Owner creates a code: only its hash is stored.
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
create temp table issued as select public.create_member_invite('20000000-0000-4000-8000-00000000000a') as r;
reset role;
select is((select count(*)::int from public.invites where code_hash = (select r ->> 'code' from issued)), 0, 'the plain code is never stored');
select is((select count(*)::int from public.invites where code_hash = private.hash_invite_code((select r ->> 'code' from issued))), 1, 'the hash is stored');
select cmp_ok((select expires_at from public.invites where id = (select (r ->> 'id')::uuid from issued)), '<=', now() + interval '7 days', 'member invites expire within 7 days');

-- A user with no household peeks, then joins with a lowercase, dashed code.
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000c1", "role": "authenticated"}';
select is(public.peek_invite('BBBBBBBBBBBB') ->> 'household_name', 'House B', 'peek shows the household name');
select is((public.accept_member_invite('bbbb-bbbb-bbbb', 'Newcomer') ->> 'ok')::boolean, true, 'codes are case and dash insensitive');
select is((select count(*)::int from public.tasks), 1, 'the new member can now read B''s task');
select is(public.accept_member_invite('AAAAAAAAAAAA', 'Again') ->> 'error', 'already_member', 'one household per user');

-- Single use: the next person can't reuse it.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000c2", "role": "authenticated"}';
select is(public.accept_member_invite('BBBBBBBBBBBB', 'Late') ->> 'error', 'invalid', 'a used invite is rejected');

-- Expired and revoked invites fail.
reset role;
update public.invites set expires_at = now() - interval '1 minute' where id = '70000000-0000-4000-8000-00000000000a';
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000c2", "role": "authenticated"}';
select is(public.accept_member_invite('AAAAAAAAAAAA', 'Late') ->> 'error', 'invalid', 'an expired invite is rejected');
reset role;
update public.invites set revoked_at = now() where id = '70000000-0000-4000-8000-0000000000e1';
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000c2", "role": "authenticated"}';
select is(public.create_household('Mine', 'UTC', 'Me', 'HHHHHHHHHHHH') ->> 'error', 'invalid', 'a revoked operator invite is rejected');

-- Operator invites start a household, once.
reset role;
update public.invites set revoked_at = null where id = '70000000-0000-4000-8000-0000000000e1';
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000c2", "role": "authenticated"}';
select is((public.create_household('Fresh Start', 'America/Chicago', 'Founder', 'HHHHHHHHHHHH') ->> 'ok')::boolean, true, 'an operator invite creates a household');
select is((select role from public.household_members where user_id = auth.uid()), 'owner', 'the creator is the owner');
select is((select timezone from public.households), 'America/Chicago', 'with the chosen timezone');
reset role;
select is(
  (select created_household_id from public.invites where id = '70000000-0000-4000-8000-0000000000e1'),
  (select household_id from public.household_members where user_id = '10000000-0000-4000-8000-0000000000c2' and status = 'active'),
  'the invite remembers which household it created');
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000c2", "role": "authenticated"}';

reset role;
delete from public.household_members where user_id = '10000000-0000-4000-8000-0000000000c2';
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000c2", "role": "authenticated"}';
select is(public.create_household('Again', 'UTC', 'Me', 'HHHHHHHHHHHH') ->> 'error', 'invalid', 'an operator invite works only once');

-- Rate limit: after 10 failed attempts in an hour, even valid codes wait.
reset role;
insert into private.invite_attempts (user_id, ok)
select '10000000-0000-4000-8000-0000000000c2', false from generate_series(1, 10);
insert into public.invites (kind, household_id, code_hash, expires_at)
values ('member', '20000000-0000-4000-8000-00000000000a', private.hash_invite_code('CCCCCCCCCCCC'), now() + interval '7 days');
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000c2", "role": "authenticated"}';
select is(public.peek_invite('CCCCCCCCCCCC') ->> 'error', 'rate_limited', 'peek is rate-limited');
select is(public.accept_member_invite('CCCCCCCCCCCC', 'Me') ->> 'error', 'rate_limited', 'joining is rate-limited');

select * from finish();

rollback;
