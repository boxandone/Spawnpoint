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

-- Rewards are computed by the database (docs/SPEC.md 4.9, CLAUDE.md rule 4).
select plan(51);

-- Extra fixtures: tasks of each effort in A, one linked to a unit deed, one to a no-XP deed.
insert into public.tasks (id, household_id, title, schedule, effort, deed_key, unit, location_id, created_at) values
  ('51000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-00000000000a', 'Light', '{"type": "daily"}', 1, null, null, '40000000-0000-4000-8000-00000000000a', now() - interval '60 days'),
  ('51000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-00000000000a', 'Medium', '{"type": "daily"}', 2, null, null, '40000000-0000-4000-8000-00000000000a', now() - interval '60 days'),
  ('51000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-00000000000a', 'Heavy', '{"type": "daily"}', 3, null, null, '40000000-0000-4000-8000-00000000000a', now() - interval '60 days'),
  ('51000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-00000000000a', 'Filter', '{"type": "every_n_days", "n": 45}', 1, 'hvac_filter', null, null, now() - interval '60 days'),
  ('51000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-00000000000a', 'Valves', '{"type": "yearly_in", "months": [4, 10]}', 1, 'valve_exercise', 'valves', null, now() - interval '60 days'),
  ('51000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-00000000000a', 'Litter', '{"type": "daily"}', 1, 'litter_duty', null, null, now() - interval '60 days');
delete from public.completions;  -- start clean

-- Levels ----------------------------------------------------------------------
select is(public.level_for_xp(0), 1, 'level 1 at 0 XP');
select is(public.level_for_xp(99), 1, '99 XP is still level 1');
select is(public.level_for_xp(100), 2, '100 XP reaches level 2');
select is(public.level_for_xp(549), 4, '549 XP is level 4');
select is(public.level_for_xp(550), 5, 'level 5 at 550 XP');
select is(public.level_for_xp(1800), 10, 'level 10 at 1,800 XP');
select is(public.level_for_xp(6175), 20, 'level 20 at 6,175 XP');
select is(public.level_for_xp(17425), 35, 'level 35 at 17,425 XP');
select is(public.level_for_xp(34300), 50, 'level 50 at 34,300 XP');

-- Task XP ---------------------------------------------------------------------
insert into public.completions (id, household_id, task_id, done_on, done_by, logged_by) values
  ('61000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-00000000000a', '51000000-0000-4000-8000-000000000002', current_date - 20, '30000000-0000-4000-8000-0000000000a1', '30000000-0000-4000-8000-0000000000a1');
select is((select credited_xp from public.xp_events where completion_id = '61000000-0000-4000-8000-000000000001'), 20.00, 'effort 2 earns 20 XP');
select is((select xp_total from public.member_stats where member_id = '30000000-0000-4000-8000-0000000000a1'), 20.00, 'it adds to the member total');

insert into public.completions (household_id, task_id, done_on, done_by, logged_by, kind) values
  ('20000000-0000-4000-8000-00000000000a', '51000000-0000-4000-8000-000000000003', current_date - 20, '30000000-0000-4000-8000-0000000000a1', '30000000-0000-4000-8000-0000000000a1', 'skipped');
select is((select count(*)::int from public.xp_events where member_id = '30000000-0000-4000-8000-0000000000a1'), 1, 'a skip earns nothing');

-- Acceptance: the daily cap. 200 raw XP in one day credits 40 + 20 + 12 = 72.
insert into public.completions (household_id, task_id, done_on, done_by, logged_by)
select '20000000-0000-4000-8000-00000000000a', '51000000-0000-4000-8000-000000000003', current_date - 19, '30000000-0000-4000-8000-0000000000a2', '30000000-0000-4000-8000-0000000000a2'
from generate_series(1, 6);
insert into public.completions (id, household_id, task_id, done_on, done_by, logged_by) values
  ('61000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-00000000000a', '51000000-0000-4000-8000-000000000002', current_date - 19, '30000000-0000-4000-8000-0000000000a2', '30000000-0000-4000-8000-0000000000a2');
select is((select sum(raw_xp) from public.xp_events where member_id = '30000000-0000-4000-8000-0000000000a2' and day = current_date - 19), 200.00, '200 raw XP logged in one day');
select is((select sum(credited_xp) from public.xp_events where member_id = '30000000-0000-4000-8000-0000000000a2' and day = current_date - 19), 72.00, 'credits 40 + 20 + 12 = 72');

-- Acceptance: undoing a completion removes its XP and recomputes that day.
delete from public.completions where id = '61000000-0000-4000-8000-000000000002';
select is((select sum(credited_xp) from public.xp_events where member_id = '30000000-0000-4000-8000-0000000000a2' and day = current_date - 19), 70.00, 'after undo, 180 raw credits 40 + 20 + 10 = 70');
select is((select xp_total from public.member_stats where member_id = '30000000-0000-4000-8000-0000000000a2'), 70.00, 'and the total follows');

-- Changing the date moves the credit to the new day.
update public.completions set done_on = current_date - 18 where id = '61000000-0000-4000-8000-000000000001';
select is((select day from public.xp_events where completion_id = '61000000-0000-4000-8000-000000000001'), current_date - 18, 'XP is credited to the day the work was done');

-- Logging for someone else: the doer gets the task XP, the logger gets 2.
insert into public.completions (id, household_id, task_id, done_on, done_by, logged_by) values
  ('61000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-00000000000a', '51000000-0000-4000-8000-000000000001', current_date - 17, '30000000-0000-4000-8000-0000000000a2', '30000000-0000-4000-8000-0000000000a1');
select is((select credited_xp from public.xp_events where completion_id = '61000000-0000-4000-8000-000000000003' and member_id = '30000000-0000-4000-8000-0000000000a2'), 10.00, 'the doer gets the task XP');
select is((select credited_xp from public.xp_events where completion_id = '61000000-0000-4000-8000-000000000003' and member_id = '30000000-0000-4000-8000-0000000000a1'), 2.00, 'the logger gets 2');

-- Deeds ------------------------------------------------------------------------
insert into public.completions (id, household_id, task_id, done_on, done_by, logged_by) values
  ('61000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-00000000000a', '51000000-0000-4000-8000-000000000004', current_date - 16, '30000000-0000-4000-8000-0000000000a1', '30000000-0000-4000-8000-0000000000a1');
select is((select count(*)::int from public.deed_logs where completion_id = '61000000-0000-4000-8000-000000000004'), 1, 'a task linked to a deed logs the deed');
select is((select e.credited_xp from public.xp_events e join public.deed_logs d on d.id = e.deed_log_id where d.completion_id = '61000000-0000-4000-8000-000000000004'), 20.00, 'deed XP is added on top of the task XP');
insert into public.completions (household_id, task_id, done_on, done_by, logged_by) values
  ('20000000-0000-4000-8000-00000000000a', '51000000-0000-4000-8000-000000000004', current_date - 10, '30000000-0000-4000-8000-0000000000a1', '30000000-0000-4000-8000-0000000000a1');
select is((select count(*)::int from public.xp_events where member_id = '30000000-0000-4000-8000-0000000000a1' and source_kind = 'deed'), 1, 'a deed inside its cooldown earns no more XP');
select is((select count from public.badge_progress where member_id = '30000000-0000-4000-8000-0000000000a1' and badge_key = 'hvac_filter'), 2.00, 'but it still counts toward the badge');

insert into public.completions (household_id, task_id, done_on, done_by, logged_by, quantity) values
  ('20000000-0000-4000-8000-00000000000a', '51000000-0000-4000-8000-000000000005', current_date - 15, '30000000-0000-4000-8000-0000000000a1', '30000000-0000-4000-8000-0000000000a1', 10);
select is((select tier from public.badge_progress where member_id = '30000000-0000-4000-8000-0000000000a1' and badge_key = 'valve_exercise'), 1, 'exercising 10 valves counts 10 and earns bronze');
select is((select kind from public.feed_events where member_id = '30000000-0000-4000-8000-0000000000a1' and payload ->> 'badge_key' = 'valve_exercise'), 'badge', 'a new badge is shared in the household feed');

insert into public.completions (household_id, task_id, done_on, done_by, logged_by) values
  ('20000000-0000-4000-8000-00000000000a', '51000000-0000-4000-8000-000000000006', current_date - 15, '30000000-0000-4000-8000-0000000000a2', '30000000-0000-4000-8000-0000000000a2');
select is((select count(*)::int from public.xp_events e join public.deed_logs d on d.id = e.deed_log_id where d.deed_key = 'litter_duty'), 0, 'litter duty earns task XP only');

-- Welcome back: the first activity after 7+ quiet days earns 20.
insert into public.completions (household_id, task_id, done_on, done_by, logged_by) values
  ('20000000-0000-4000-8000-00000000000a', '51000000-0000-4000-8000-000000000001', current_date - 3, '30000000-0000-4000-8000-0000000000a2', '30000000-0000-4000-8000-0000000000a2');
select is((select credited_xp from public.xp_events where member_id = '30000000-0000-4000-8000-0000000000a2' and source_kind = 'welcome_back'), 20.00, 'welcome back after a quiet week: +20');
select is((select tier from public.badge_progress where member_id = '30000000-0000-4000-8000-0000000000a2' and badge_key = 'comeback'), 1, 'and the Comeback badge');

-- Privacy -----------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
discard plans;
select is((select count(*)::int from public.xp_events where member_id <> '30000000-0000-4000-8000-0000000000a1'), 0, 'a member cannot see a housemate''s XP');
select is((select count(*)::int from public.member_stats), 1, 'or their level and coins');
select is((select count(*)::int from public.badge_progress where member_id <> '30000000-0000-4000-8000-0000000000a1'), 0, 'or their badge progress');
select cmp_ok((select count(*)::int from public.feed_events), '>=', 1, 'but the household feed is shared');
select throws_ok($$insert into public.xp_events (household_id, member_id, source_kind, day, raw_xp) values ('20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-0000000000a1', 'task', current_date, 1000)$$, '42501', null, 'clients cannot insert XP');
select throws_ok($$update public.member_stats set coins_spent = 0, xp_total = 99999$$, '42501', null, 'clients cannot change coins or totals');
select throws_ok($$update public.badge_progress set tier = 3$$, '42501', null, 'clients cannot award badges');
select throws_ok($$insert into public.feed_events (household_id, member_id, kind) values ('20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-0000000000a1', 'badge')$$, '42501', null, 'clients cannot post to the feed directly');

-- "Log a fix": XP for the doer, +2 for the logger, undo removes both.
create temp table fix as select public.log_deed('toilet_flapper', current_date - 1, 1, '30000000-0000-4000-8000-0000000000a2') as id;
select is((select member_id from public.deed_logs where id = (select id from fix)), '30000000-0000-4000-8000-0000000000a2'::uuid, 'a fix can be logged for a housemate');
select is((select credited_xp from public.xp_events where deed_log_id = (select id from fix) and source_kind = 'helper'), 2.00, 'the logger gets 2 for logging it');
select throws_ok($$select public.log_deed('toilet_flapper', current_date + 1)$$, '23514', null, 'a fix cannot be dated in the future');
select throws_ok($$select public.log_deed('not_a_deed', current_date)$$, '22023', null, 'unknown deeds are rejected');
select lives_ok($$select public.undo_deed_log((select id from fix))$$, 'the logger can undo a fix');

-- Coins and the reward shop: spending checks the balance in the database.
insert into public.rewards (name, cost) values ('Sleep in Saturday', 30), ('Big treat', 100000);
select is((select count(*)::int from public.rewards), 2, 'members build their own shop');
select is((public.redeem_reward((select id from public.rewards where name = 'Sleep in Saturday'), true) ->> 'balance')::int,
  (select floor(xp_total)::int - 30 from public.member_stats), 'redeeming spends coins');
select throws_ok($$select public.redeem_reward((select id from public.rewards where name = 'Big treat'))$$, 'P0001', null, 'the balance can never go below zero');
select lives_ok($$select public.undo_redemption((select id from public.redemptions limit 1))$$, 'a redemption can be undone right away');
select is((select coins_spent from public.member_stats), 0, 'and the coins come back');

-- Someone else's shop is private.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000a2", "role": "authenticated"}';
discard plans;
select is((select count(*)::int from public.rewards), 0, 'a housemate cannot see your reward shop');
select is((public.my_rewards() ->> 'level')::int, public.level_for_xp((select xp_total from public.member_stats)), 'my_rewards reports your own level');

-- Household B can see none of it.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000b1", "role": "authenticated"}';
discard plans;
select is(
  (select count(*)::int from public.feed_events where household_id <> '20000000-0000-4000-8000-00000000000b')
  + (select count(*)::int from public.deed_logs where household_id <> '20000000-0000-4000-8000-00000000000b'),
  0, 'another household sees none of A''s feed or deeds');
select is((select payload ->> 'badge_key' from public.feed_events limit 1), 'clean_sweep', 'B''s own feed shows B''s clean sweep of its only area');
select throws_ok($$select public.household_week_xp('20000000-0000-4000-8000-00000000000a', current_date)$$, '42501', null, 'or its weekly meter');

select * from finish();
rollback;
