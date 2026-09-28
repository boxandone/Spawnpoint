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

-- Feedback goes from a person to the operator only.
select plan(14);

-- A signed-in user with no household can still ask for help.
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000c1", "role": "authenticated"}';
discard plans;
select lives_ok($$insert into public.feedback (kind, message) values ('question', 'How do I get an invite?')$$, 'a user without a household can send a question');

-- A member of household A reports a bug.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
discard plans;
select lives_ok($$insert into public.feedback (kind, message, page, app_version) values ('bug', 'The undo button hid behind my thumb', '/', '0.3.0')$$, 'a member can report a bug');
select is((select household_id from public.feedback where user_id = auth.uid()), '20000000-0000-4000-8000-00000000000a'::uuid, 'the household is filled in by the database');
select is((select count(*)::int from public.feedback), 1, 'a sender sees only their own feedback');
select throws_ok($$insert into public.feedback (kind, message, user_id) values ('idea', 'Pretend to be someone else', '10000000-0000-4000-8000-0000000000b1')$$, '42501', null, 'senders cannot choose whose feedback it is');
select throws_ok($$insert into public.feedback (kind, message, status) values ('idea', 'Mark my own as done', 'done')$$, '42501', null, 'senders cannot set the status');
select throws_ok($$update public.feedback set message = 'edited'$$, '42501', null, 'senders cannot edit feedback after sending');
select throws_ok($$select public.set_feedback_status((select id from public.feedback limit 1), 'done')$$, '42501', null, 'non-operators cannot resolve feedback');
select throws_ok($$insert into public.feedback (kind, message) values ('rant', 'Not a kind')$$, '23514', null, 'unknown kinds are rejected');

-- Another household member cannot read it.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000a2", "role": "authenticated"}';
discard plans;
select is((select count(*)::int from public.feedback), 0, 'housemates cannot read each other''s feedback');

-- The operator reads everything and resolves it with a note.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000e1", "role": "authenticated"}';
discard plans;
select is((select count(*)::int from public.feedback), 2, 'the operator sees all feedback');
select lives_ok($$select public.set_feedback_status((select id from public.feedback where kind = 'bug'), 'done', 'Fixed in the next update')$$, 'the operator can mark feedback done');

-- The sender sees the reply; a flood is stopped.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
discard plans;
select is((select operator_note from public.feedback), 'Fixed in the next update', 'the sender sees the operator''s note');
reset role;
insert into public.feedback (user_id, kind, message) select '10000000-0000-4000-8000-0000000000a1', 'idea', 'Idea number ' || g from generate_series(1, 19) g;
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
discard plans;
select throws_ok($$insert into public.feedback (kind, message) values ('idea', 'One too many')$$, '54000', null, 'at most 20 messages a day per person');

select * from finish();
rollback;
