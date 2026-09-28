-- Fictional demo data for local development only. Every person, email, and
-- household here is made up (example.com addresses). Put anything personal in
-- supabase/seed.local.sql, which is gitignored.
--
-- Local sign-in (dev email login, see README): password "spawnpoint-demo" for
--   operator@example.com  (demo operator, no household)
--   alex@example.com      (Maple House owner, Classic theme)
--   sam@example.com       (Maple House member, Squad HQ theme)
--   jordan@example.com    (Unit 4B owner, apartment template)

------------------------------------------------------------------------------
-- Users
------------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('spawnpoint-demo', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}', jsonb_build_object('full_name', u.name),
  now() - interval '45 days', now(), '', '', '', ''
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'operator@example.com', 'Demo Operator'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'alex@example.com', 'Alex'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'sam@example.com', 'Sam'),
  ('a0000000-0000-4000-8000-000000000004'::uuid, 'jordan@example.com', 'Jordan')
) as u (id, email, name);

insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id::text, u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.email like '%@example.com';

------------------------------------------------------------------------------
-- Operator and config
------------------------------------------------------------------------------

insert into private.operators (email) values ('operator@example.com') on conflict do nothing;
update private.app_config set value = 'Demo Operator' where key = 'operator_name';

------------------------------------------------------------------------------
-- Maple House: Alex (Classic) and Sam (Squad HQ), house template
------------------------------------------------------------------------------

insert into public.households (id, name, timezone, created_at, created_by) values
  ('b0000000-0000-4000-8000-000000000001', 'Maple House', 'America/Los_Angeles',
   now() - interval '40 days', 'a0000000-0000-4000-8000-000000000002'),
  ('b0000000-0000-4000-8000-000000000002', 'Unit 4B', 'America/New_York',
   now() - interval '40 days', 'a0000000-0000-4000-8000-000000000004');

insert into public.household_settings (household_id, default_theme, weekly_target, zone_rotation) values
  ('b0000000-0000-4000-8000-000000000001', 'classic', 400,
   '{"1": ["c1000000-0000-4000-8000-000000000011"], "6": ["c1000000-0000-4000-8000-000000000031"]}'),
  ('b0000000-0000-4000-8000-000000000002', 'classic', 250, '{}');

insert into public.household_members (id, household_id, user_id, role, display_name, avatar, color, theme, joined_at) values
  ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000002', 'owner', 'Alex', 'classic/fox', 'peach', null,
   now() - interval '40 days'),
  ('d0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000003', 'member', 'Sam', 'squad-hq/goggle-fox', 'sky', 'squad-hq',
   now() - interval '39 days'),
  ('d0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002',
   'a0000000-0000-4000-8000-000000000004', 'owner', 'Jordan', 'classic/penguin', 'mint', null,
   now() - interval '40 days');

-- Zones, then areas, then spots (parents before children).
insert into public.locations (id, household_id, parent_id, kind, name, icon, sort) values
  ('c1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', null, 'zone', 'Downstairs', null, 1),
  ('c1000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', null, 'zone', 'Upstairs', null, 2),
  ('c1000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', null, 'zone', 'Outside', null, 3);

insert into public.locations (id, household_id, parent_id, kind, name, icon, sort) values
  ('c1000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'area', 'Kitchen', 'kitchen', 1),
  ('c1000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'area', 'Living room', 'sofa', 2),
  ('c1000000-0000-4000-8000-000000000013', 'b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'area', 'Laundry', 'laundry', 3),
  ('c1000000-0000-4000-8000-000000000021', 'b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000002', 'area', 'Main bedroom', 'bed', 1),
  ('c1000000-0000-4000-8000-000000000022', 'b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000002', 'area', 'Bathroom', 'bath', 2),
  ('c1000000-0000-4000-8000-000000000031', 'b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000003', 'area', 'Yard', 'yard', 1),
  ('c1000000-0000-4000-8000-000000000032', 'b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000003', 'area', 'Driveway', 'driveway', 2),
  ('c1000000-0000-4000-8000-000000000041', 'b0000000-0000-4000-8000-000000000001', null, 'area', 'Whole home', 'home', 9);

insert into public.locations (id, household_id, parent_id, kind, name, sort) values
  ('c1000000-0000-4000-8000-000000000051', 'b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000011', 'spot', 'Under-sink cabinet', 1);

insert into public.tasks (id, household_id, title, location_id, effort, priority, schedule, if_missed, assignee_id, deed_key, unit, start_on, library_key, created_at, created_by) values
  ('e1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Wipe counters, stovetop, and sink',
   'c1000000-0000-4000-8000-000000000011', 1, 'normal', '{"type": "daily"}', 'let_go', null, null, null,
   current_date - 30, 'kitchen.wipe-counters', now() - interval '30 days', 'a0000000-0000-4000-8000-000000000002'),
  ('e1000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Run dishwasher at night, empty in the morning',
   'c1000000-0000-4000-8000-000000000011', 1, 'normal', '{"type": "daily"}', 'if_needed', null, null, null,
   current_date - 30, 'kitchen.dishwasher', now() - interval '30 days', 'a0000000-0000-4000-8000-000000000002'),
  ('e1000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'Mop kitchen floor',
   'c1000000-0000-4000-8000-000000000011', 2, 'normal', '{"type": "weekly_on", "days": [6]}', 'let_go', null, null, null,
   current_date - 30, 'kitchen.mop', now() - interval '30 days', 'a0000000-0000-4000-8000-000000000002'),
  ('e1000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'Clean dishwasher filter',
   'c1000000-0000-4000-8000-000000000011', 1, 'normal', '{"type": "monthly_on", "nth": 1, "weekday": 6}', 'let_go', null, 'dishwasher_filter', null,
   current_date - 30, 'kitchen.dishwasher-filter', now() - interval '30 days', 'a0000000-0000-4000-8000-000000000002'),
  ('e1000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000001', 'Vacuum floors and stairs',
   'c1000000-0000-4000-8000-000000000012', 2, 'normal', '{"type": "weekly_on", "days": [6]}', 'carry', 'd0000000-0000-4000-8000-000000000002', null, null,
   current_date - 30, 'living.vacuum', now() - interval '30 days', 'a0000000-0000-4000-8000-000000000002'),
  ('e1000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000001', 'Wash, dry, fold, put away',
   'c1000000-0000-4000-8000-000000000013', 2, 'normal', '{"type": "weekly_on", "days": [0]}', 'carry', null, null, null,
   current_date - 30, 'laundry.wash', now() - interval '30 days', 'a0000000-0000-4000-8000-000000000002'),
  ('e1000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000001', 'Change sheets',
   'c1000000-0000-4000-8000-000000000021', 2, 'normal', '{"type": "every_n_days", "n": 10}', 'carry', null, null, null,
   current_date - 30, 'bedrooms.sheets', now() - interval '30 days', 'a0000000-0000-4000-8000-000000000002'),
  ('e1000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000001', 'Clean toilet, sink, mirror, shower',
   'c1000000-0000-4000-8000-000000000022', 2, 'high', '{"type": "weekly_on", "days": [3]}', 'carry', null, null, null,
   current_date - 30, 'bathrooms.clean', now() - interval '30 days', 'a0000000-0000-4000-8000-000000000002'),
  ('e1000000-0000-4000-8000-000000000009', 'b0000000-0000-4000-8000-000000000001', 'Water potted plants',
   'c1000000-0000-4000-8000-000000000031', 1, 'normal', '{"type": "every_n_days", "n": 2}', 'carry', null, null, null,
   current_date - 30, 'yard.water-plants', now() - interval '30 days', 'a0000000-0000-4000-8000-000000000002'),
  ('e1000000-0000-4000-8000-000000000010', 'b0000000-0000-4000-8000-000000000001', 'Trash and recycling to the curb',
   'c1000000-0000-4000-8000-000000000032', 1, 'high', '{"type": "weekly_on", "days": [2]}', 'carry', 'd0000000-0000-4000-8000-000000000001', null, null,
   current_date - 30, 'yard.trash', now() - interval '30 days', 'a0000000-0000-4000-8000-000000000002'),
  ('e1000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000001', 'Check HVAC filter, replace if dirty',
   'c1000000-0000-4000-8000-000000000041', 1, 'normal', '{"type": "every_n_days", "n": 45}', 'carry', null, 'hvac_filter', null,
   current_date - 30, 'systems.hvac-filter', now() - interval '30 days', 'a0000000-0000-4000-8000-000000000002'),
  ('e1000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000001', 'Exercise water shutoff valves',
   'c1000000-0000-4000-8000-000000000041', 1, 'normal', '{"type": "yearly_in", "months": [4, 10]}', 'carry', null, 'valve_exercise', 'valves',
   current_date - 30, 'systems.valves', now() - interval '30 days', 'a0000000-0000-4000-8000-000000000002'),
  ('e1000000-0000-4000-8000-000000000013', 'b0000000-0000-4000-8000-000000000001', 'Test smoke and CO alarms',
   'c1000000-0000-4000-8000-000000000041', 1, 'normal', '{"type": "monthly_on", "day": 1}', 'carry', null, 'alarm_test', null,
   current_date - 30, 'systems.alarm-test', now() - interval '30 days', 'a0000000-0000-4000-8000-000000000002');

-- Backdated completions: a mix of on-time, late-logged, logged-for-someone, and skipped.
insert into public.completions (household_id, task_id, done_on, logged_at, done_by, logged_by, kind, quantity, note, source) values
  ('b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', current_date - 1, now() - interval '1 day',  'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'done', null, null, 'tap'),
  ('b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', current_date - 2, now() - interval '1 day',  'd0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'done', null, null, 'menu'),
  ('b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', current_date - 4, now() - interval '2 days', 'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'done', null, null, 'catch_up'),
  ('b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000002', current_date - 1, now() - interval '1 day',  'd0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'done', null, null, 'tap'),
  ('b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000003', current_date - 6, now() - interval '5 days', 'd0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'done', null, null, 'menu'),
  ('b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000005', current_date - 9, now() - interval '9 days', 'd0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'done', null, null, 'tap'),
  ('b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000006', current_date - 7, now() - interval '6 days', 'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'done', null, null, 'menu'),
  ('b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000007', current_date - 8, now() - interval '8 days', 'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'done', null, null, 'tap'),
  ('b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000008', current_date - 12, now() - interval '11 days', 'd0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'skipped', null, 'Away for the weekend', 'menu'),
  ('b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000009', current_date - 3, now() - interval '3 days', 'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'done', null, null, 'tap'),
  ('b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000010', current_date - 5, now() - interval '5 days', 'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'done', null, null, 'tap'),
  ('b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000011', current_date - 20, now() - interval '19 days', 'd0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'done', null, null, 'menu'),
  ('b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000012', current_date - 25, now() - interval '25 days', 'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'done', 6, null, 'menu');

------------------------------------------------------------------------------
-- Unit 4B: Jordan, apartment template
------------------------------------------------------------------------------

insert into public.locations (id, household_id, parent_id, kind, name, icon, sort) values
  ('c2000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000002', null, 'area', 'Kitchen', 'kitchen', 1),
  ('c2000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000002', null, 'area', 'Living room', 'sofa', 2),
  ('c2000000-0000-4000-8000-000000000013', 'b0000000-0000-4000-8000-000000000002', null, 'area', 'Bedroom', 'bed', 3),
  ('c2000000-0000-4000-8000-000000000014', 'b0000000-0000-4000-8000-000000000002', null, 'area', 'Bathroom', 'bath', 4),
  ('c2000000-0000-4000-8000-000000000015', 'b0000000-0000-4000-8000-000000000002', null, 'area', 'Whole home', 'home', 9);

insert into public.tasks (id, household_id, title, location_id, effort, priority, schedule, if_missed, deed_key, start_on, library_key, created_at, created_by) values
  ('e2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'Wipe counters, stovetop, and sink',
   'c2000000-0000-4000-8000-000000000011', 1, 'normal', '{"type": "daily"}', 'let_go', null,
   current_date - 20, 'kitchen.wipe-counters', now() - interval '20 days', 'a0000000-0000-4000-8000-000000000004'),
  ('e2000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', '10-minute pickup',
   'c2000000-0000-4000-8000-000000000012', 1, 'normal', '{"type": "daily"}', 'let_go', null,
   current_date - 20, 'living.pickup', now() - interval '20 days', 'a0000000-0000-4000-8000-000000000004'),
  ('e2000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002', 'Change sheets',
   'c2000000-0000-4000-8000-000000000013', 2, 'normal', '{"type": "every_n_days", "n": 10}', 'carry', null,
   current_date - 20, 'bedrooms.sheets', now() - interval '20 days', 'a0000000-0000-4000-8000-000000000004'),
  ('e2000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000002', 'Clean toilet, sink, mirror, shower',
   'c2000000-0000-4000-8000-000000000014', 2, 'normal', '{"type": "weekly_on", "days": [0]}', 'carry', null,
   current_date - 20, 'bathrooms.clean', now() - interval '20 days', 'a0000000-0000-4000-8000-000000000004'),
  ('e2000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000002', 'Test smoke and CO alarms',
   'c2000000-0000-4000-8000-000000000015', 1, 'normal', '{"type": "monthly_on", "day": 1}', 'carry', 'alarm_test',
   current_date - 20, 'systems.alarm-test', now() - interval '20 days', 'a0000000-0000-4000-8000-000000000004');

insert into public.completions (household_id, task_id, done_on, logged_at, done_by, logged_by, kind, source) values
  ('b0000000-0000-4000-8000-000000000002', 'e2000000-0000-4000-8000-000000000001', current_date - 1, now() - interval '1 day', 'd0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003', 'done', 'tap'),
  ('b0000000-0000-4000-8000-000000000002', 'e2000000-0000-4000-8000-000000000003', current_date - 4, now() - interval '3 days', 'd0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003', 'done', 'menu');

------------------------------------------------------------------------------
-- Lists (the built-in lists are created with each household)
------------------------------------------------------------------------------

insert into public.list_items (household_id, list_id, name, quantity, category, position, checked)
select 'b0000000-0000-4000-8000-000000000001', l.id, v.name, v.qty, v.cat, v.pos, v.checked
from public.lists l
cross join (values
  ('Milk', '2', 'dairy', 1, false),
  ('Bananas', null, 'produce', 2, false),
  ('Sourdough bread', null, 'bakery', 3, false),
  ('Coffee', null, 'drinks', 4, true),
  ('Dog food', '1 bag', 'pets', 5, false)
) as v (name, qty, cat, pos, checked)
where l.household_id = 'b0000000-0000-4000-8000-000000000001' and l.kind = 'groceries';

insert into public.staples (household_id, name, quantity, category) values
  ('b0000000-0000-4000-8000-000000000001', 'Eggs', '12', 'dairy'),
  ('b0000000-0000-4000-8000-000000000001', 'Milk', '2', 'dairy'),
  ('b0000000-0000-4000-8000-000000000001', 'Paper towels', null, 'household');

insert into public.list_items (household_id, list_id, name, status, priority, target_price, position)
select 'b0000000-0000-4000-8000-000000000001', l.id, v.name, v.status, v.priority, v.price, v.pos
from public.lists l
cross join (values
  ('Porch light', 'to_buy', 'high', 45.00, 1),
  ('Standing desk', 'idea', 'normal', 300.00, 2)
) as v (name, status, priority, price, pos)
where l.household_id = 'b0000000-0000-4000-8000-000000000001' and l.kind = 'to_buy';

insert into public.list_items (household_id, list_id, name, due_on, discuss, position)
select 'b0000000-0000-4000-8000-000000000001', l.id, v.name, v.due, v.discuss, v.pos
from public.lists l
cross join (values
  ('Book the chimney sweep', current_date + 5, false, 1),
  ('Pick a paint color for the hallway', null, true, 2)
) as v (name, due, discuss, pos)
where l.household_id = 'b0000000-0000-4000-8000-000000000001' and l.kind = 'todo';

------------------------------------------------------------------------------
-- Stuff (fictional things; each gets a short code automatically)
------------------------------------------------------------------------------

insert into public.locations (id, household_id, parent_id, kind, name, sort) values
  ('c1000000-0000-4000-8000-000000000052', 'b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000013', 'spot', 'Shelf above the dryer', 1);

insert into public.items (household_id, name, category, brand, model, purchased_on, price, store, warranty_until, location_id, spot, tags, barcode) values
  ('b0000000-0000-4000-8000-000000000001', 'Cordless drill', 'tools', 'Demo Tools', 'CD-18', current_date - 400, 89.00, 'Hardware store', null,
   'c1000000-0000-4000-8000-000000000052', 'Blue bin', '{tools,garage}', null),
  ('b0000000-0000-4000-8000-000000000001', 'Stand mixer', 'appliance', 'Demo Kitchen', 'SM-5', current_date - 330, 249.00, 'Kitchen shop', current_date + 35,
   'c1000000-0000-4000-8000-000000000011', 'Corner counter', '{baking}', '0123456789012'),
  ('b0000000-0000-4000-8000-000000000001', 'Wi-Fi router', 'networking', 'Demo Net', 'AX-3', current_date - 200, 129.00, null, current_date + 165,
   'c1000000-0000-4000-8000-000000000012', 'TV stand', '{network}', null),
  ('b0000000-0000-4000-8000-000000000001', 'Spare house key', 'other', null, null, null, null, null, null,
   'c1000000-0000-4000-8000-000000000051', 'Small tin', '{keys}', null);

------------------------------------------------------------------------------
-- Plans (fictional)
------------------------------------------------------------------------------

insert into public.plans (id, household_id, title, type, status, starts_on, ends_on, tentative, icon, color, notes, budget, discuss) values
  ('f1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Beach weekend', 'trip', 'planning',
   current_date + 24, current_date + 26, true, 'map', 'sky',
   E'# Packing\n- Sunscreen\n- Towels\n\nCheck the **tide times** before we go: https://example.com/tides', 450, false),
  ('f1000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Repaint the hallway', 'project', 'discussing',
   null, null, false, 'wrench', 'mint', null, 120, true),
  ('f1000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'New couch?', 'decision', 'someday',
   null, null, false, null, 'peach', null, null, false),
  ('f1000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'Game night', 'event', 'booked',
   current_date + 5, null, false, 'star', 'lilac', null, null, false);

insert into public.plan_checklist_items (household_id, plan_id, text, done, position) values
  ('b0000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'Book the cabin', true, 1),
  ('b0000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'Ask a neighbor to feed the dog', false, 2);
