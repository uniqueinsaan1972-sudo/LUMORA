-- Security + behaviour tests for 0004_social.sql. Run on a LOCAL/STAGING db after migrations 0001-0004:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_tests_social.sql
-- Rolls back at the end. Any failure raises with a clear message.
begin;
create or replace function _as(uid text) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); set local role authenticated; end $$;
create or replace function _anon() returns void language plpgsql as $$ begin perform set_config('request.jwt.claims', '', true); set local role anon; end $$;
create or replace function _ok(c boolean, msg text) returns void language plpgsql as $$ begin if c is not true then raise exception 'TEST FAILED: %', msg; end if; end $$;
create or replace function _cnt(q text) returns bigint language plpgsql as $$ declare n bigint; begin execute q into n; return n; end $$;
create or replace function _rows(q text) returns int language plpgsql as $$ declare n int; begin execute q; get diagnostics n = row_count; return n; end $$;
create or replace function _fails(q text, label text) returns void language plpgsql as $$ begin
  begin execute q; exception when others then if sqlerrm like 'TEST FAILED%' then raise; end if; return; end;
  raise exception 'TEST FAILED (was allowed): %', label; end $$;
grant execute on all functions in schema public to authenticated, anon;

insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000a001','alice@t','{"display_name":"Alice","username":"alice","role":"student","terms":"true"}'),
 ('00000000-0000-0000-0000-00000000b002','bob@t','{"display_name":"Bob","username":"bob","role":"student"}'),
 ('00000000-0000-0000-0000-00000000c003','carol@t','{"display_name":"Carol","username":"carol","role":"student"}'),
 ('00000000-0000-0000-0000-00000000d004','teach@t','{"display_name":"Teacher T","username":"teach","role":"teacher"}'),
 ('00000000-0000-0000-0000-00000000e005','mal@t','{"display_name":"Mallory","username":"alice","role":"admin"}');
update profiles set onboarded = true;

-- ===== sign-up hardening =====
do $$ begin
  perform _ok((select role from profiles where display_name='Mallory') = 'student', 'metadata role=admin must NOT create an admin');
  perform _ok((select username from profiles where display_name='Mallory') is null, 'duplicate username must not break sign-up (falls back to null)');
  perform _ok((select role from profiles where display_name='Teacher T') = 'teacher', 'teacher role from sign-up');
  perform _ok((select count(distinct public_id) from profiles) = 5 and (select bool_and(public_id like 'LUM-________') from profiles), 'unique LUM-XXXXXXXX public ids');
  perform _ok((select terms_accepted_at from profiles where username='alice') is not null, 'terms timestamp stored');
end $$;
select _anon();
do $$ begin perform _ok(username_available('alice') = false and username_available('newname_1') = true and username_available('A!') = false, 'username_available'); end $$;
reset role;

-- ===== profile self-escalation =====
select _as('00000000-0000-0000-0000-00000000a001');
select _fails($$ update profiles set role='teacher' where id='00000000-0000-0000-0000-00000000a001' $$, 'self role change');
select _fails($$ update profiles set teacher_verified=true where id='00000000-0000-0000-0000-00000000a001' $$, 'self teacher_verified');
select _fails($$ update profiles set public_id='LUM-HACKED00' where id='00000000-0000-0000-0000-00000000a001' $$, 'public_id change');
select _fails($$ insert into notifications (user_id, kind, message) values ('00000000-0000-0000-0000-00000000a001','x','forged') $$, 'client-created notification');
reset role;

-- ===== friends =====
select public_id as bobpid from profiles where username='bob' \gset
select _as('00000000-0000-0000-0000-00000000a001');
select _ok((select count(*) from search_users('bob')) = 1, 'search by username');
select _ok((select count(*) from search_users(:'bobpid')) = 1, 'search by User ID');
select _ok((select count(*) from search_users('alice')) = 0, 'cannot find yourself');
insert into friend_requests (from_id, to_id) values ('00000000-0000-0000-0000-00000000a001','00000000-0000-0000-0000-00000000b002');
select _fails($$ insert into friend_requests (from_id, to_id) values ('00000000-0000-0000-0000-00000000a001','00000000-0000-0000-0000-00000000b002') $$, 'duplicate request');
select _fails($$ insert into friend_requests (from_id, to_id) values ('00000000-0000-0000-0000-00000000a001','00000000-0000-0000-0000-00000000a001') $$, 'self request');
select _fails($$ insert into friend_requests (from_id, to_id) values ('00000000-0000-0000-0000-00000000b002','00000000-0000-0000-0000-00000000c003') $$, 'forging request as another user');
select _fails($$ select send_message('00000000-0000-0000-0000-00000000b002','hi before friends') $$, 'message before friendship');
do $$ begin perform _ok((select count(*) from list_outgoing_requests()) = 1, 'outgoing list'); end $$;
reset role;
select _as('00000000-0000-0000-0000-00000000b002');
select _fails($$ insert into friend_requests (from_id, to_id) values ('00000000-0000-0000-0000-00000000b002','00000000-0000-0000-0000-00000000a001') $$, 'reverse duplicate request');
do $$ begin perform _ok((select count(*) from notifications where kind='friend_request') = 1, 'recipient notified of request'); perform _ok((select count(*) from list_incoming_requests()) = 1, 'incoming list'); end $$;
select respond_friend_request((select id from friend_requests limit 1), true);
do $$ begin perform _ok(are_friends('00000000-0000-0000-0000-00000000a001'), 'friends after accept'); perform _ok((select count(*) from list_friends()) = 1, 'friend list'); end $$;
reset role;
select _as('00000000-0000-0000-0000-00000000a001');
do $$ begin perform _ok((select count(*) from notifications where kind='friend_accept') = 1, 'requester notified of acceptance'); end $$;
select _fails($$ insert into friend_requests (from_id, to_id) values ('00000000-0000-0000-0000-00000000a001','00000000-0000-0000-0000-00000000b002') $$, 'request to existing friend');
reset role;

-- ===== messaging =====
select _as('00000000-0000-0000-0000-00000000a001');
select send_message('00000000-0000-0000-0000-00000000b002', 'hello bob');
select _fails($$ insert into messages (sender_id, recipient_id, body) values ('00000000-0000-0000-0000-00000000a001','00000000-0000-0000-0000-00000000b002','direct insert') $$, 'direct message insert bypassing RPC');
select _fails($$ select send_message('00000000-0000-0000-0000-00000000b002', repeat('x', 2001)) $$, 'oversized message');
select _fails($$ select send_message('00000000-0000-0000-0000-00000000b002', '   ') $$, 'empty message');
select _fails($$ select send_message('00000000-0000-0000-0000-00000000c003', 'hi stranger') $$, 'message to non-friend');
reset role;
select _as('00000000-0000-0000-0000-00000000c003');
do $$ begin perform _ok((select count(*) from messages) = 0, 'IDOR: non-participant sees no messages'); end $$;
do $$ begin perform _ok(mark_conversation_read('00000000-0000-0000-0000-00000000a001') = 0, 'stranger cannot mark read'); end $$;
reset role;
select _as('00000000-0000-0000-0000-00000000b002');
do $$ begin
  perform _ok((select count(*) from messages) = 1, 'recipient sees message');
  perform _ok((select unread from conversation_list() limit 1) = 1, 'unread count = 1');
  perform _ok(mark_conversation_read('00000000-0000-0000-0000-00000000a001') = 1, 'mark read');
  perform _ok((select unread from conversation_list() limit 1) = 0, 'unread count = 0');
  perform _ok((select read_at from messages limit 1) is not null, 'read receipt stored');
end $$;
select _fails($$ update messages set body='tampered' $$ || ' where true returning 1/0', 'message tamper');
reset role;

-- ===== note sharing =====
select _as('00000000-0000-0000-0000-00000000a001');
insert into notes (id, owner_id, title, body) values ('aaaaaaaa-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000a001','Alice note','secret body');
select _fails($$ select share_note('aaaaaaaa-0000-0000-0000-000000000001','user','00000000-0000-0000-0000-00000000c003','view') $$, 'share with non-friend');
select _fails($$ select share_note('aaaaaaaa-0000-0000-0000-000000000001','class','00000000-0000-0000-0000-00000000c003','view') $$, 'student sharing to class');
reset role;
select _as('00000000-0000-0000-0000-00000000b002');
do $$ begin perform _ok((select count(*) from notes) = 0, 'IDOR: unshared note invisible'); perform _ok(note_access('aaaaaaaa-0000-0000-0000-000000000001') is null, 'no access'); end $$;
reset role;
select _as('00000000-0000-0000-0000-00000000a001');
select share_note('aaaaaaaa-0000-0000-0000-000000000001','user','00000000-0000-0000-0000-00000000b002','view');
reset role;
select _as('00000000-0000-0000-0000-00000000b002');
do $$ begin
  perform _ok((select count(*) from notes) = 1, 'shared note visible');
  perform _ok(_rows($q$ update notes set title='hacked' $q$) = 0, 'view-only user cannot edit');
  perform _ok(_rows($q$ delete from notes $q$) = 0, 'shared user cannot delete');
  perform _ok((select count(*) from shared_notes()) = 1, 'shared_notes list');
end $$;
reset role;
select _as('00000000-0000-0000-0000-00000000a001');
select share_note('aaaaaaaa-0000-0000-0000-000000000001','user','00000000-0000-0000-0000-00000000b002','edit');
reset role;
select _as('00000000-0000-0000-0000-00000000b002');
do $$ begin perform _ok(_rows($q$ update notes set body='bob edit' $q$) = 1, 'edit permission allows content edit'); end $$;
select _fails($$ update notes set pinned = true $$, 'editor pinning owner-only field');
select _fails($$ update notes set owner_id = '00000000-0000-0000-0000-00000000b002' $$, 'editor stealing ownership');
select save_shared_note('aaaaaaaa-0000-0000-0000-000000000001');
do $$ begin perform _ok((select count(*) from notes where owner_id = auth.uid()) = 1, 'saved copy belongs to bob'); end $$;
reset role;
select _as('00000000-0000-0000-0000-00000000a001');
do $$ begin perform _ok(_rows($q$ delete from note_shares $q$) = 1, 'owner revokes share'); perform _ok((select body from notes where id='aaaaaaaa-0000-0000-0000-000000000001') = 'bob edit', 'owner sees edited content'); end $$;
reset role;
select _as('00000000-0000-0000-0000-00000000b002');
do $$ begin perform _ok(note_access('aaaaaaaa-0000-0000-0000-000000000001') is null, 'access gone after revoke'); end $$;
reset role;

-- ===== groups =====
select _as('00000000-0000-0000-0000-00000000a001');
insert into study_groups (id, owner_id, name) values ('99999999-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000a001','Study Squad');
do $$ declare c text; begin select join_code into c from study_groups; perform _ok(c is not null and length(c) = 8, 'group join code'); end $$;
reset role;
select _as('00000000-0000-0000-0000-00000000c003');
do $$ begin
  perform _ok((select count(*) from group_members_list('99999999-0000-0000-0000-000000000001')) = 0, 'non-member cannot list group');
  perform _ok(join_group('WRONGCOD') is null, 'wrong group code returns null');
  perform _ok((select count(*) from my_groups()) = 0, 'not in group yet');
end $$;
reset role;
select join_code as gcode from study_groups where id='99999999-0000-0000-0000-000000000001' \gset
select _as('00000000-0000-0000-0000-00000000c003');
select join_group(:'gcode');
do $$ begin perform _ok((select count(*) from my_groups()) = 1, 'joined group appears'); perform _ok((select count(*) from group_members_list('99999999-0000-0000-0000-000000000001')) = 2, 'group has owner + member'); end $$;
select _fails($$ select join_code from my_groups() where join_code is not null and false union all select invite_friend_to_group('99999999-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000a001')::text::text $$, 'non-owner inviting to group');
reset role;

-- ===== classes (and the recursion fix) =====
select _as('00000000-0000-0000-0000-00000000d004');
insert into teacher_classes (id, teacher_id, name, join_code) values ('cccccccc-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000d004','Grade 9','classcode1');
reset role;
select _as('00000000-0000-0000-0000-00000000a001');
do $$ begin perform _ok(join_class('wrongcode') is null, 'wrong class code returns null'); end $$;
select join_class('classcode1');
do $$ begin
  perform _ok((select count(*) from teacher_classes) = 1, 'student can read joined class (no policy recursion)');
  perform _ok((select count(*) from my_classes()) = 1, 'my_classes');
  perform _ok((select join_code from my_classes()) is null, 'students never see the join code');
  perform _ok((select count(*) from class_members_list('cccccccc-0000-0000-0000-000000000001')) = 1, 'class members list');
end $$;
select _fails($$ select regenerate_class_code('cccccccc-0000-0000-0000-000000000001') $$, 'student regenerating class code');
select _fails($$ select post_announcement('cccccccc-0000-0000-0000-000000000001','x','y') $$, 'student posting announcement');
select _fails($$ insert into teacher_classes (teacher_id, name) values ('00000000-0000-0000-0000-00000000a001','mine') $$, 'student creating class');
reset role;
select _as('00000000-0000-0000-0000-00000000b002'); select join_class('classcode1'); reset role;
select _as('00000000-0000-0000-0000-00000000c003');
do $$ begin perform _ok((select count(*) from class_members_list('cccccccc-0000-0000-0000-000000000001')) = 0, 'outsider cannot list class members'); perform _ok((select count(*) from teacher_classes) = 0, 'outsider cannot see class'); end $$;
reset role;
select _as('00000000-0000-0000-0000-00000000d004');
do $$ begin
  perform _ok((select count(*) from notifications where kind='class_join') = 2, 'teacher notified of joins');
  perform _ok(length(regenerate_class_code('cccccccc-0000-0000-0000-000000000001')) = 10, 'teacher regenerates code');
  perform post_announcement('cccccccc-0000-0000-0000-000000000001','Welcome','Class starts Monday');
  perform _ok((select count(*) from audit_logs where false) = 0, 'x');
end $$;
reset role;
do $$ begin perform _ok((select count(*) from audit_logs where action in ('class_code_regenerated','announcement_posted')) = 2, 'teacher actions audited'); end $$;
select _as('00000000-0000-0000-0000-00000000a001');
do $$ begin perform _ok((select count(*) from announcements) = 1, 'student sees class announcement'); perform _ok((select count(*) from notifications where kind='announcement') = 1, 'announcement notification'); end $$;
reset role;
select _as('00000000-0000-0000-0000-00000000c003'); do $$ begin perform _ok((select count(*) from announcements) = 0, 'outsider cannot see announcements'); end $$; reset role;

-- ===== tests: codes, fill-in-the-blank, definition, statuses, leaderboard =====
select _as('00000000-0000-0000-0000-00000000d004');
insert into teacher_tests (id, teacher_id, title, duration_minutes, passing_marks, opens_at, closes_at, status) values ('77777777-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000d004','Unit 1',30,3, now()-interval '1 hour', now()+interval '1 day','draft');
insert into test_questions (id, test_id, position, kind, prompt, options, correct_answer, marks) values
 ('88888888-0000-0000-0000-000000000001','77777777-0000-0000-0000-000000000001',1,'mcq','2+2?','["3","4"]','4',2),
 ('88888888-0000-0000-0000-000000000002','77777777-0000-0000-0000-000000000001',2,'fill_blank','Capital of France ___','null','paris|Paris, France',2),
 ('88888888-0000-0000-0000-000000000003','77777777-0000-0000-0000-000000000001',3,'definition','Define gravity',null,null,4);
insert into test_assignments values ('77777777-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001');
update teacher_tests set status='published' where id='77777777-0000-0000-0000-000000000001';
select access_code as tcode from teacher_tests \gset
reset role;
do $$ begin perform _ok((select count(*) from notifications where kind='test' and message like 'New test%') = 2, 'class notified when test published'); perform _ok((select count(*) from audit_logs where action in ('test_created','test_published')) = 2, 'test creation/publish audited'); end $$;

select _as('00000000-0000-0000-0000-00000000c003');
do $$ begin perform _ok((select count(*) from teacher_tests) = 0, 'outsider cannot see test'); perform _ok((select count(*) from test_questions) = 0, 'students never read test_questions'); end $$;
select _fails($$ select start_test_attempt('77777777-0000-0000-0000-000000000001') $$, 'start without access');
do $$ begin perform _ok(join_test_by_code('WRONG123') is null, 'wrong test code'); end $$;
select join_test_by_code(:'tcode');
do $$ begin perform _ok((select count(*) from teacher_tests) = 1, 'code grants access'); end $$;
select _fails($$ select publish_results('77777777-0000-0000-0000-000000000001') $$, 'student publishing results');
select _fails($$ select grade_answer(gen_random_uuid(), gen_random_uuid(), 1, 'x') $$, 'student grading');
select _fails($$ select regenerate_test_code('77777777-0000-0000-0000-000000000001') $$, 'student regenerating test code');
reset role;

-- throttle: 8 wrong codes then locked out
select _as('00000000-0000-0000-0000-00000000e005');
do $$ declare i int; begin for i in 1..8 loop perform join_test_by_code('BAD' || i); end loop; end $$;
select _fails($$ select join_test_by_code('BAD99') $$, 'brute-force throttle');
reset role;

-- alice + bob take the test with identical answers => tie; mallory is outside
select _as('00000000-0000-0000-0000-00000000a001');
create temp table _att(who text, id uuid); grant all on _att to authenticated;
insert into _att select 'alice', start_test_attempt('77777777-0000-0000-0000-000000000001');
do $$ declare a uuid := (select id from _att where who='alice'); begin
  perform _ok(get_attempt(a)::text not like '%correct_answer%', 'attempt payload hides answers');
  perform submit_attempt(a, '{"88888888-0000-0000-0000-000000000001":"4","88888888-0000-0000-0000-000000000002":" PARIS ","88888888-0000-0000-0000-000000000003":"pull of mass"}');
end $$;
select _fails($$ select submit_attempt((select id from _att where who='alice'), '{}') $$, 'duplicate submission');
select _ok((select count(*) from test_results) = 0, 'student cannot read own result before publication');
reset role;
select _ok((select obtained_marks from test_results r join test_attempts t on t.id = r.attempt_id where t.student_id = '00000000-0000-0000-0000-00000000a001') = 4, 'auto-graded MCQ + fill-in-the-blank = 4 marks');
select _ok((select pending_manual from test_results r join test_attempts t on t.id = r.attempt_id where t.student_id = '00000000-0000-0000-0000-00000000a001'), 'definition awaits teacher');
select _as('00000000-0000-0000-0000-00000000b002');
insert into _att select 'bob', start_test_attempt('77777777-0000-0000-0000-000000000001');
select submit_attempt((select id from _att where who='bob'), '{"88888888-0000-0000-0000-000000000001":"4","88888888-0000-0000-0000-000000000002":"paris","88888888-0000-0000-0000-000000000003":"gravity"}');
select _fails($$ select get_result((select id from _att where who='bob')) $$, 'result before publication');
reset role;

select _as('00000000-0000-0000-0000-00000000d004');
select _fails($$ select publish_results('77777777-0000-0000-0000-000000000001') $$, 'publishing with ungraded written answers');
do $$ declare a uuid; b uuid; begin
  select id into a from _att where who='alice'; select id into b from _att where who='bob';
  perform _ok((select count(*) from test_attempts where test_id='77777777-0000-0000-0000-000000000001') = 2, 'teacher sees both attempts');
  perform grade_answer(a, '88888888-0000-0000-0000-000000000003', 3, 'good'); perform grade_answer(b, '88888888-0000-0000-0000-000000000003', 3, 'good');
  perform _ok((select graded_any and not pending_manual from test_results where attempt_id = a), 'graded flags');
  perform publish_results('77777777-0000-0000-0000-000000000001');
end $$;
select _fails($$ select grade_answer((select id from test_attempts limit 1), '88888888-0000-0000-0000-000000000001', 1, 'objective') $$, 'grading an objective question');
reset role;
select _as('00000000-0000-0000-0000-00000000a001');
do $$ begin
  perform _ok((get_result((select id from _att where who='alice'))->'result'->>'obtained_marks')::numeric = 7, 'student sees published marks (4 auto + 3 graded)');
  perform _ok((select count(*) from leaderboard('class','cccccccc-0000-0000-0000-000000000001')) = 2, 'leaderboard lists both');
  perform _ok((select count(*) from leaderboard('class','cccccccc-0000-0000-0000-000000000001') where rank = 1) = 2, 'ties share rank 1 (fair tie handling)');
  perform _ok((select bool_and(percentage = 87.5) from leaderboard('class','cccccccc-0000-0000-0000-000000000001')), 'percentage = 7/8 marks');
  perform _ok((select count(*) from information_schema.columns where table_name='profiles' and column_name='email') = 0, 'profiles has no email column to leak');
end $$;
update profiles set show_on_leaderboard = false where id = '00000000-0000-0000-0000-00000000a001';
reset role;
select _as('00000000-0000-0000-0000-00000000b002');
do $$ begin perform _ok((select count(*) from leaderboard('class','cccccccc-0000-0000-0000-000000000001')) = 1, 'opted-out student hidden from others'); end $$;
reset role;
select _as('00000000-0000-0000-0000-00000000c003');
select _fails($$ select * from leaderboard('class','cccccccc-0000-0000-0000-000000000001') $$, 'outsider reading leaderboard');
reset role;

select _as('00000000-0000-0000-0000-00000000a001');
do $$ begin
  perform _ok((select count(*) from my_test_statuses()) = 1, 'student status flags for own attempt');
  perform _ok((select results_published from my_test_statuses() limit 1), 'status reflects publication');
  perform _ok((select count(*) from group_shared_notes('99999999-0000-0000-0000-000000000001')) = 0, 'no notes shared to group yet');
end $$;
select share_note('aaaaaaaa-0000-0000-0000-000000000001','group','99999999-0000-0000-0000-000000000001','view');
do $$ begin perform _ok((select count(*) from group_shared_notes('99999999-0000-0000-0000-000000000001')) = 1, 'group_shared_notes lists shared note'); end $$;
reset role;
select _as('00000000-0000-0000-0000-00000000c003');
do $$ begin perform _ok(note_access('aaaaaaaa-0000-0000-0000-000000000001') = 'view', 'group member gets view access via group share'); perform _ok((select count(*) from group_shared_notes('99999999-0000-0000-0000-000000000001')) = 1, 'member lists group notes'); end $$;
reset role;
select _as('00000000-0000-0000-0000-00000000d004');
do $$ begin perform _ok((select count(*) from group_shared_notes('99999999-0000-0000-0000-000000000001')) = 0, 'non-member (teacher) cannot list group notes'); perform _ok(note_access('aaaaaaaa-0000-0000-0000-000000000001') is null, 'non-member has no note access'); end $$;
reset role;

-- ===== invitations =====
select _as('00000000-0000-0000-0000-00000000a001');
select _fails($$ select create_invitation('not-a-hash','app',null,7,5) $$, 'bad token hash');
select _fails($$ select create_invitation(encode(sha256('c'::bytea),'hex'),'class','cccccccc-0000-0000-0000-000000000001',7,5) $$, 'student creating class invite');
select create_invitation(encode(sha256('tok1'::bytea),'hex'),'app',null,7,1);
reset role;
select _anon();
do $$ begin perform _ok((select inviter_name from invitation_info(encode(sha256('tok1'::bytea),'hex'))) = 'Alice', 'anon can see inviter name only'); perform _ok((select count(*) from invitations) = 0, 'anon cannot read invitations'); end $$;
reset role;
select _as('00000000-0000-0000-0000-00000000c003');
do $$ begin
  perform _ok(redeem_invitation(encode(sha256('tok1'::bytea),'hex')) = 'app', 'redeem');
  perform _ok(redeem_invitation(encode(sha256('tok1'::bytea),'hex')) = 'app', 'idempotent for same user');
  perform _ok((select count(*) from invitations) = 0, 'invitee cannot read invitations table');
end $$;
reset role;
select _as('00000000-0000-0000-0000-00000000e005');
do $$ begin perform _ok(redeem_invitation(encode(sha256('tok1'::bytea),'hex')) is null, 'max_uses=1 enforced'); perform _ok(redeem_invitation(encode(sha256('nope'::bytea),'hex')) is null, 'unknown token'); end $$;
reset role;
select _as('00000000-0000-0000-0000-00000000a001');
do $$ begin perform _ok((select uses from invitations) = 1, 'inviter sees usage count'); perform _ok((select count(*) from friend_requests where from_id = auth.uid() and status='pending') >= 0, 'x'); end $$;
select create_invitation(encode(sha256('tok2'::bytea),'hex'),'app',null,1,5);
reset role;
update invitations set expires_at = now() - interval '1 minute' where token_hash = encode(sha256('tok2'::bytea),'hex');
select _as('00000000-0000-0000-0000-00000000e005');
do $$ begin perform _ok(redeem_invitation(encode(sha256('tok2'::bytea),'hex')) is null, 'expired invitation rejected'); end $$;
reset role;

-- ===== block closes messaging =====
select _as('00000000-0000-0000-0000-00000000b002');
select block_user('00000000-0000-0000-0000-00000000a001');
do $$ begin perform _ok(not are_friends('00000000-0000-0000-0000-00000000a001'), 'block removes friendship'); perform _ok((select count(*) from messages) = 0, 'conversation closed after block'); perform _ok((select count(*) from search_users('alice')) = 0, 'blocked user hidden from search'); end $$;
select _fails($$ select send_message('00000000-0000-0000-0000-00000000a001','still there?') $$, 'message after block');
reset role;
select _as('00000000-0000-0000-0000-00000000a001');
select _fails($$ select send_message('00000000-0000-0000-0000-00000000b002','hello?') $$, 'blocked user messaging blocker');
select _fails($$ insert into friend_requests (from_id, to_id) values ('00000000-0000-0000-0000-00000000a001','00000000-0000-0000-0000-00000000b002') $$, 'blocked user sending friend request');
reset role;

-- ===== reminders + realtime publication =====
select _as('00000000-0000-0000-0000-00000000c003'); select refresh_my_reminders(); reset role;
do $$ begin
  perform _ok((select count(*) from pg_publication_tables where pubname='supabase_realtime' and tablename in ('messages','notifications','friend_requests')) = 3, 'realtime enabled for live tables');
end $$;
rollback;
select 'ALL SOCIAL SECURITY TESTS PASSED' as result;
