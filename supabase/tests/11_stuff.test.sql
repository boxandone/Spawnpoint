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


-- Stuff (docs/SPEC.md 4.6): items, documents, Storage, short codes, and rewards.
select plan(43);

create temp table t (k text primary key, v text);
grant select, insert, update on t to authenticated;

insert into public.items (id, household_id, name) values
  ('90000000-0000-4000-8000-0000000000b1', '20000000-0000-4000-8000-00000000000b', 'B drill');
insert into public.documents (id, household_id, item_id, kind, storage_path, mime_type, size_bytes, uploaded_at) values
  ('91000000-0000-4000-8000-0000000000b1', '20000000-0000-4000-8000-00000000000b', '90000000-0000-4000-8000-0000000000b1', 'receipt',
   '20000000-0000-4000-8000-00000000000b/90000000-0000-4000-8000-0000000000b1/91000000-0000-4000-8000-0000000000b1.pdf', 'application/pdf', 1000, now());
insert into storage.objects (bucket_id, name, metadata) values
  ('docs', '20000000-0000-4000-8000-00000000000b/90000000-0000-4000-8000-0000000000b1/91000000-0000-4000-8000-0000000000b1.pdf', '{"size": 1000}');

select ok((select count(*) from public.short_codes where location_id = '40000000-0000-4000-8000-00000000000a') = 1,
  'a new location gets a short code');
select ok((select code from public.short_codes where item_id = '90000000-0000-4000-8000-0000000000b1') ~ '^[0-9A-HJKMNP-TV-Z]{8}$',
  'a new item gets an 8-character base32 code');
select is((select public from storage.buckets where id = 'docs'), false, 'the docs bucket is private');

-- Member A1 ------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';

insert into public.items (id, household_id, name, location_id, tags) values
  ('90000000-0000-4000-8000-0000000000a1', '20000000-0000-4000-8000-00000000000a', 'Router', '40000000-0000-4000-8000-00000000000a', '{network,upstairs}');
select is((select count(*)::int from public.items), 1, 'A sees only its own items');
select is((select count(*)::int from public.short_codes where item_id is not null), 1, 'A sees only its own short codes');
select is((select count(*)::int from public.documents), 0, 'A can''t see B''s documents');
select is((select count(*)::int from storage.objects), 0, 'A can''t see B''s files');
select is((select raw_xp from public.xp_events where item_id = '90000000-0000-4000-8000-0000000000a1'), 5.00,
  'adding an item earns 5 XP');
select is((select count from public.badge_progress where badge_key = 'curator'), 1.00, 'Curator counts the item');

select throws_ok(
  $$insert into public.items (household_id, name) values ('20000000-0000-4000-8000-00000000000b', 'sneaky')$$,
  '42501', null, 'A can''t add items to B');
select throws_ok(
  $$insert into public.items (household_id, name, location_id) values ('20000000-0000-4000-8000-00000000000a', 'x', '40000000-0000-4000-8000-00000000000b')$$,
  '23503', null, 'an item can''t sit in B''s location');
select throws_ok(
  $$delete from public.items where id = '90000000-0000-4000-8000-0000000000a1'$$,
  '42501', null, 'items are archived, never deleted');
select throws_ok(
  $$insert into public.short_codes (code, household_id, item_id) values ('ABCDEFGH', '20000000-0000-4000-8000-00000000000a', '90000000-0000-4000-8000-0000000000a1')$$,
  '42501', null, 'clients can''t write short codes');
select throws_ok(
  $$insert into public.items (household_id, name, url) values ('20000000-0000-4000-8000-00000000000a', 'x', 'javascript:alert(1)')$$,
  '23514', null, 'item links must be http(s)');
select lives_ok(
  $$insert into public.list_items (household_id, list_id, name, item_id) select '20000000-0000-4000-8000-00000000000a', id, 'Router', '90000000-0000-4000-8000-0000000000a1' from public.lists where kind = 'to_buy'$$,
  'a To buy entry can point at the item it became');
select throws_ok(
  $$update public.list_items set item_id = '90000000-0000-4000-8000-0000000000b1' where household_id = '20000000-0000-4000-8000-00000000000a'$$,
  '23503', null, 'a To buy entry can''t point at B''s item');

update public.items set status = 'donated' where id = '90000000-0000-4000-8000-0000000000a1';
select is((select status_changed_by from public.items where id = '90000000-0000-4000-8000-0000000000a1'),
  '30000000-0000-4000-8000-0000000000a1'::uuid, 'status changes record who made them');
select is((select count from public.badge_progress where badge_key = 'declutter'), 1.00, 'Declutter counts a donation');

-- Documents and Storage
insert into t values ('path', '20000000-0000-4000-8000-00000000000a/90000000-0000-4000-8000-0000000000a1/92000000-0000-4000-8000-000000000001.jpg');
insert into t values ('thumb', '20000000-0000-4000-8000-00000000000a/90000000-0000-4000-8000-0000000000a1/92000000-0000-4000-8000-000000000001_thumb.jpg');
select lives_ok(
  $$insert into public.documents (id, household_id, item_id, kind, storage_path, thumb_path, mime_type, size_bytes, uploaded_at)
    values ('92000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-00000000000a', '90000000-0000-4000-8000-0000000000a1', 'receipt',
            (select v from t where k = 'path'), (select v from t where k = 'thumb'), 'image/jpeg', 5000, now())$$,
  'a member reserves a document');
select is((select uploaded_at from public.documents where id = '92000000-0000-4000-8000-000000000001'), null,
  'clients can''t mark their own upload finished');
select throws_ok(
  $$insert into public.documents (household_id, item_id, kind, storage_path, mime_type, size_bytes)
    values ('20000000-0000-4000-8000-00000000000a', null, 'other', '20000000-0000-4000-8000-00000000000b/household/92000000-0000-4000-8000-000000000009.pdf', 'application/pdf', 10)$$,
  '23514', null, 'a document path must be in its own household folder');
select throws_ok(
  $$insert into public.documents (household_id, kind, storage_path, mime_type, size_bytes)
    values ('20000000-0000-4000-8000-00000000000a', 'other', '20000000-0000-4000-8000-00000000000a/household/../x.pdf', 'application/pdf', 10)$$,
  '23514', null, 'no tricks in the file name');
select throws_ok(
  $$insert into public.documents (household_id, kind, storage_path, mime_type, size_bytes)
    values ('20000000-0000-4000-8000-00000000000a', 'other', '20000000-0000-4000-8000-00000000000a/household/92000000-0000-4000-8000-000000000008.exe', 'application/x-msdownload', 10)$$,
  '23514', null, 'only images and PDFs');

select lives_ok(
  $$insert into storage.objects (bucket_id, name, metadata) values ('docs', (select v from t where k = 'path'), '{"size": 4000}')$$,
  'the file uploads to its reserved path');
select lives_ok(
  $$insert into storage.objects (bucket_id, name, metadata) values ('docs', (select v from t where k = 'thumb'), '{"size": 300}')$$,
  'and its thumbnail');
select throws_ok(
  $$insert into storage.objects (bucket_id, name, metadata) values ('docs', '20000000-0000-4000-8000-00000000000a/household/92000000-0000-4000-8000-000000000007.pdf', '{"size": 1}')$$,
  '42501', null, 'no upload without a reservation');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('docs', '20000000-0000-4000-8000-00000000000b/household/92000000-0000-4000-8000-000000000006.pdf')$$,
  '42501', null, 'no upload into another household''s folder');

-- Another member can't finish my upload.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000a2", "role": "authenticated"}';
select throws_ok($$select public.finalize_document('92000000-0000-4000-8000-000000000001')$$, '42501', null,
  'only the uploader finishes an upload');

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
select lives_ok($$select public.finalize_document('92000000-0000-4000-8000-000000000001')$$, 'the uploader finishes it');
select is((select size_bytes from public.documents where id = '92000000-0000-4000-8000-000000000001'), 4300::bigint,
  'the size comes from the stored files, not the client');
select is((select raw_xp from public.xp_events where document_id = '92000000-0000-4000-8000-000000000001'), 5.00,
  'a receipt earns 5 XP');
select is((select count from public.badge_progress where badge_key = 'paper_trail'), 1.00, 'Paper trail counts it');
select is((select count(*)::int from storage.objects), 2, 'A sees its own files');

insert into public.documents (id, household_id, kind, storage_path, mime_type, size_bytes) values
  ('92000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-00000000000a', 'manual',
   '20000000-0000-4000-8000-00000000000a/household/92000000-0000-4000-8000-000000000002.pdf', 'application/pdf', 100);
select throws_ok($$select public.finalize_document('92000000-0000-4000-8000-000000000002')$$, 'P0002', null,
  'a missing upload can''t be finished');

select lives_ok($$update public.documents set title = 'Router receipt' where id = '92000000-0000-4000-8000-000000000001'$$,
  'the title can change');
select throws_ok($$update public.documents set storage_path = '20000000-0000-4000-8000-00000000000a/household/x.pdf' where id = '92000000-0000-4000-8000-000000000001'$$,
  '42501', null, 'the path can''t');

select lives_ok($$select public.record_labels_printed(12)$$, 'printing labels is recorded');
select is((select tier from public.badge_progress where badge_key = 'labeler'), 1, 'Labeler earned at 10 labels');

delete from public.documents where id = '92000000-0000-4000-8000-000000000001';
select is((select count(*)::int from public.xp_events where document_id is not null), 0, 'deleting a document removes its XP');

-- Member of B -----------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000b1", "role": "authenticated"}';
select is((select count(*)::int from storage.objects), 1, 'B sees only its own file');
delete from storage.objects where name like '20000000-0000-4000-8000-00000000000a/%';
reset role;
select is((select count(*)::int from storage.objects where name like '20000000-0000-4000-8000-00000000000a/%'), 2,
  'B can''t delete A''s files');

-- Quota: a 1 MB household limit refuses a 2 MB file.
update private.app_config set value = '1' where key = 'household_storage_mb';
set local role authenticated;
set local request.jwt.claims = '{"sub": "10000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
select throws_ok(
  $$insert into public.documents (household_id, kind, storage_path, mime_type, size_bytes)
    values ('20000000-0000-4000-8000-00000000000a', 'other', '20000000-0000-4000-8000-00000000000a/household/92000000-0000-4000-8000-000000000005.pdf', 'application/pdf', 2097152)$$,
  '53100', null, 'uploads past the household quota are refused');

reset role;
select is((select xp_total from public.member_stats where member_id = '30000000-0000-4000-8000-0000000000a1'),
  (select coalesce(sum(credited_xp), 0) from public.xp_events where member_id = '30000000-0000-4000-8000-0000000000a1'),
  'the member total matches the XP rows');

select * from finish();
rollback;
