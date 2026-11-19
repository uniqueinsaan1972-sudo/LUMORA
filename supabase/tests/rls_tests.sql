-- RLS / security tests. Run against a LOCAL or STAGING Supabase database only (never production):
--   psql "$DATABASE_URL" -f supabase/tests/rls_tests.sql
-- Everything runs inside a transaction that is rolled back. Each check RAISEs on failure.
begin;
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1','alice@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000b2','bob@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000c3','teacher@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
select set_config('lumora.role_change','1',true);
update profiles set role='teacher' where id='00000000-0000-0000-0000-0000000000c3';
select set_config('lumora.role_change','',true);

create or replace function _as(uid text) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); set local role authenticated; end $$;
create or replace function _expect_fail(sql text, label text) returns void language plpgsql as $$ begin
  begin execute sql; raise exception 'SECURITY TEST FAILED (was allowed): %', label; exception when raise_exception then
    if sqlerrm like 'SECURITY TEST FAILED%' then raise; end if; when others then null; end; end $$;
grant execute on function _as(text), _expect_fail(text, text) to authenticated;

-- Alice creates a private note
select _as('00000000-0000-0000-0000-0000000000a1');
insert into notes (owner_id, title) values ('00000000-0000-0000-0000-0000000000a1', 'alice secret');
do $$ begin if (select count(*) from notes) <> 1 then raise exception 'alice should see her own note'; end if; end $$;
select _expect_fail($$ update profiles set role='admin' where id='00000000-0000-0000-0000-0000000000a1' $$, 'student promoting self to admin');
select _expect_fail($$ update profiles set role='teacher' where id='00000000-0000-0000-0000-0000000000a1' $$, 'student promoting self to teacher');
select _expect_fail($$ select claim_teacher_invite('not-a-real-code') $$, 'claiming invalid teacher invite');
select _expect_fail($$ insert into quiz_attempts (owner_id, score, total) values ('00000000-0000-0000-0000-0000000000a1', 10, 10) $$, 'forging quiz score by direct insert');
select _expect_fail($$ insert into test_attempts (test_id, student_id, deadline_at) values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1', now() + interval '1 day') $$, 'direct insert into test_attempts');
reset role;

-- Bob must not see or touch Alice's note or profile
select _as('00000000-0000-0000-0000-0000000000b2');
do $$ begin if (select count(*) from notes) <> 0 then raise exception 'IDOR: bob can read alice notes'; end if; end $$;
do $$ declare n int; begin update notes set title='hacked'; get diagnostics n = row_count; if n <> 0 then raise exception 'IDOR: bob updated alice note'; end if; end $$;
do $$ declare n int; begin delete from notes; get diagnostics n = row_count; if n <> 0 then raise exception 'IDOR: bob deleted alice note'; end if; end $$;
do $$ begin if (select count(*) from profiles where id <> '00000000-0000-0000-0000-0000000000b2') <> 0 then raise exception 'bob can read other profiles'; end if; end $$;
do $$ declare n int; begin update profiles set display_name='pwned' where id='00000000-0000-0000-0000-0000000000a1'; get diagnostics n = row_count; if n <> 0 then raise exception 'bob edited alice profile'; end if; end $$;
do $$ begin if (select count(*) from teacher_invites) <> 0 then raise exception 'teacher_invites readable by clients'; end if; end $$;
reset role;

-- Teacher-only checks
select _as('00000000-0000-0000-0000-0000000000a1');
select _expect_fail($$ insert into teacher_classes (teacher_id, name) values ('00000000-0000-0000-0000-0000000000a1','x') $$, 'student creating a class');
select _expect_fail($$ insert into teacher_tests (teacher_id,title,duration_minutes,opens_at,closes_at) values ('00000000-0000-0000-0000-0000000000a1','t',10,now(),now()+interval '1 day') $$, 'student creating a test');
reset role;

-- Timed test flow: deadline enforced by server time
select _as('00000000-0000-0000-0000-0000000000c3');
insert into teacher_classes (id, teacher_id, name, join_code) values ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-0000000000c3','Class','abcde12345');
insert into teacher_tests (id, teacher_id, title, duration_minutes, opens_at, closes_at, status)
  values ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-0000000000c3','T',10, now()-interval '1 hour', now()+interval '1 day', 'published');
insert into test_questions (id, test_id, position, kind, prompt, options, correct_answer, marks) values ('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222',1,'mcq','2+2?','["3","4"]','4',2);
insert into test_assignments values ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111');
reset role;

select _as('00000000-0000-0000-0000-0000000000a1');
select join_class('abcde12345');
do $$ begin if (select count(*) from test_questions) <> 0 then raise exception 'student can read test_questions (answer leak)'; end if; end $$;
select _expect_fail($$ select start_test_attempt('99999999-9999-9999-9999-999999999999') $$, 'starting unassigned/nonexistent test');
create temp table _att as select start_test_attempt('22222222-2222-2222-2222-222222222222') as id;
grant all on _att to authenticated;
do $$ declare j jsonb; begin j := get_attempt((select id from _att)); if j::text like '%correct_answer%' then raise exception 'get_attempt leaked correct_answer'; end if; end $$;
select save_answer((select id from _att), '33333333-3333-3333-3333-333333333333', '4');
reset role;

-- Bob (not assigned) cannot start, read, or submit Alice's attempt
select _as('00000000-0000-0000-0000-0000000000b2');
select _expect_fail($$ select start_test_attempt('22222222-2222-2222-2222-222222222222') $$, 'unassigned student starting test');
select _expect_fail($$ select get_attempt((select id from _att)) $$, 'bob reading alice attempt');
select _expect_fail($$ select submit_attempt((select id from _att), '{}') $$, 'bob submitting alice attempt');
reset role;

-- Simulate the deadline passing (privileged update), then Alice tries to submit late
update test_attempts set deadline_at = now() - interval '1 minute' where id = (select id from _att);
select _as('00000000-0000-0000-0000-0000000000a1');
do $$ declare r text; begin r := submit_attempt((select id from _att), '{"33333333-3333-3333-3333-333333333333":"3"}');
  if r <> 'expired' then raise exception 'late submission should be rejected as expired, got %', r; end if; end $$;
reset role;
do $$ begin if (select answer from test_answers where attempt_id = (select id from _att)) <> '4' then raise exception 'late answers must not overwrite saved answers'; end if; end $$;

-- Duplicate submission
update test_attempts set status='in_progress', deadline_at = now() + interval '5 minutes' where id = (select id from _att);
select _as('00000000-0000-0000-0000-0000000000a1');
select submit_attempt((select id from _att), '{}');
select _expect_fail($$ select submit_attempt((select id from _att), '{}') $$, 'duplicate final submission');
reset role;

rollback;
select 'ALL SECURITY TESTS PASSED' as result;
