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

-- Only owners manage members, invites, and household settings.
select plan(22);

-- As a plain member of A
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000a2", "role": "authenticated"}';
discard plans;

select throws_ok($$select public.create_member_invite('20000000-0000-4000-8000-00000000000a')$$, '42501', null, 'member cannot create invites');
select throws_ok($$select public.revoke_invite('70000000-0000-4000-8000-00000000000a')$$, '42501', null, 'member cannot revoke invites');
select throws_ok($$select public.rename_invite('70000000-0000-4000-8000-00000000000a', 'x')$$, '42501', null, 'member cannot rename invites');
select throws_ok($$select public.remove_member('30000000-0000-4000-8000-0000000000a1')$$, '42501', null, 'member cannot remove members');
select throws_ok($$select public.set_member_role('30000000-0000-4000-8000-0000000000a2', 'owner')$$, '42501', null, 'member cannot promote themselves');
select is((select count(*)::int from public.invites), 0, 'member cannot see invites');
select is_empty($$update public.household_settings set weekly_target = 999 returning id$$, 'member cannot change settings');
select is_empty($$update public.households set name = 'Renamed' returning id$$, 'member cannot rename the household');
select is_empty($$delete from public.households returning id$$, 'member cannot delete the household');
select is_empty($$update public.household_members set display_name = 'Nope' where id = '30000000-0000-4000-8000-0000000000a1' returning id$$, 'member cannot edit someone else''s profile');
select isnt_empty($$update public.household_members set display_name = 'Still Me', theme = 'squad-hq' where id = '30000000-0000-4000-8000-0000000000a2' returning id$$, 'member can edit their own profile');
select throws_ok($$update public.household_members set role = 'owner' where id = '30000000-0000-4000-8000-0000000000a2'$$, '42501', null, 'member cannot change their own role directly');

-- As the owner of A
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
discard plans;

select is(length(public.create_member_invite('20000000-0000-4000-8000-00000000000a') ->> 'code'), 12, 'owner creates a 12-character invite code');
select is((select count(*)::int from public.invites), 2, 'owner sees the household''s invites');
select lives_ok($$select public.rename_invite('70000000-0000-4000-8000-00000000000a', 'For Sam')$$, 'owner can rename their invite');
select lives_ok($$select public.revoke_invite('70000000-0000-4000-8000-00000000000a')$$, 'owner can revoke an invite');
select isnt_empty($$update public.household_settings set weekly_target = 500 returning id$$, 'owner can change settings');
select throws_ok($$select public.create_member_invite('20000000-0000-4000-8000-00000000000b')$$, '42501', null, 'owner of A cannot create invites for B');
select throws_ok($$select public.set_member_role('30000000-0000-4000-8000-0000000000a1', 'member')$$, '22023', null, 'the last owner cannot step down');
select lives_ok($$select public.remove_member('30000000-0000-4000-8000-0000000000a2')$$, 'owner can remove a member');

-- The removed member loses access immediately.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000a2", "role": "authenticated"}';
discard plans;
select is((select count(*)::int from public.tasks), 0, 'removed member sees no tasks');
select is((select count(*)::int from public.households), 0, 'removed member sees no household');

select * from finish();

rollback;
