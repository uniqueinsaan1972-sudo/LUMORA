-- Triggers + RPCs. Server time (now()) is the ONLY authority for test timing.
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1)), 80));
  insert into user_preferences (user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Role + suspension lock. Role only changes through claim_teacher_invite() (sets lumora.role_change) or manual admin SQL.
create or replace function guard_profile_update() returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role and coalesce(current_setting('lumora.role_change', true), '') <> '1' then
    raise exception 'role cannot be changed';
  end if;
  if new.suspended is distinct from old.suspended and not (auth.uid() is null or is_admin()) then
    raise exception 'not allowed';
  end if;
  if new.id <> old.id then raise exception 'not allowed'; end if;
  return new;
end $$;
create trigger profiles_guard before update on profiles for each row execute function guard_profile_update();

create or replace function touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger notes_touch before update on notes for each row execute function touch_updated_at();

create or replace function audit(p_action text, p_target text) returns void language sql security definer set search_path = public as
$$ insert into audit_logs (actor_id, action, target) values (auth.uid(), p_action, p_target) $$;
revoke all on function audit(text, text) from public, anon, authenticated;

create or replace function claim_teacher_invite(p_code text) returns void language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update teacher_invites set used_by = auth.uid(), used_at = now() where code = p_code and used_by is null;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'invalid or used invite'; end if;
  perform set_config('lumora.role_change', '1', true);
  update profiles set role = 'teacher' where id = auth.uid() and role = 'student';
  perform audit('teacher_invite_claimed', auth.uid()::text);
end $$;

create or replace function join_class(p_code text) returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if not is_role('student') then raise exception 'students only'; end if;
  select id into cid from teacher_classes where join_code = lower(trim(p_code));
  if cid is null then raise exception 'class not found'; end if;
  insert into class_members (class_id, student_id) values (cid, auth.uid()) on conflict do nothing;
  return cid;
end $$;

-- ---------- Timed tests ----------
create or replace function finalize_attempt(p_attempt uuid, p_status text) returns void language plpgsql security definer set search_path = public as $$
declare v_test uuid; v_total numeric; v_obt numeric; v_pending boolean;
begin
  select test_id into v_test from test_attempts where id = p_attempt;
  insert into test_answers (attempt_id, question_id)
    select p_attempt, q.id from test_questions q where q.test_id = v_test on conflict do nothing;
  update test_answers a set auto_marks = case when lower(trim(coalesce(a.answer,''))) = lower(trim(coalesce(q.correct_answer,'')))
        and q.kind in ('mcq','true_false') then q.marks when q.kind in ('mcq','true_false') then 0 else null end
    from test_questions q where q.id = a.question_id and a.attempt_id = p_attempt;
  update test_attempts set status = p_status, submitted_at = now() where id = p_attempt;
  perform recompute_result(p_attempt);
end $$;
revoke all on function finalize_attempt(uuid, text) from public, anon, authenticated;

create or replace function recompute_result(p_attempt uuid) returns void language plpgsql security definer set search_path = public as $$
declare v_test uuid; v_total numeric; v_obt numeric; v_pending boolean;
begin
  select test_id into v_test from test_attempts where id = p_attempt;
  select coalesce(sum(marks),0) into v_total from test_questions where test_id = v_test;
  select coalesce(sum(coalesce(a.awarded_marks, a.auto_marks, 0)),0),
         coalesce(bool_or(q.kind in ('short','long') and a.awarded_marks is null), false)
    into v_obt, v_pending from test_answers a join test_questions q on q.id = a.question_id where a.attempt_id = p_attempt;
  insert into test_results (attempt_id, total_marks, obtained_marks, pending_manual) values (p_attempt, v_total, v_obt, v_pending)
    on conflict (attempt_id) do update set total_marks = excluded.total_marks, obtained_marks = excluded.obtained_marks, pending_manual = excluded.pending_manual;
end $$;
revoke all on function recompute_result(uuid) from public, anon, authenticated;

create or replace function start_test_attempt(p_test uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare t teacher_tests; a test_attempts;
begin
  if not is_role('student') then raise exception 'students only'; end if;
  select * into t from teacher_tests where id = p_test and status = 'published';
  if t.id is null then raise exception 'test not available'; end if;
  if not exists (select 1 from test_assignments ta join class_members cm on cm.class_id = ta.class_id where ta.test_id = p_test and cm.student_id = auth.uid()) then
    raise exception 'not assigned'; end if;
  if now() < t.opens_at then raise exception 'test has not opened'; end if;
  select * into a from test_attempts where test_id = p_test and student_id = auth.uid();
  if a.id is not null then return a.id; end if;            -- resume or view existing; never a second attempt
  if now() >= t.closes_at then raise exception 'test is closed'; end if;
  insert into test_attempts (test_id, student_id, started_at, deadline_at)
    values (p_test, auth.uid(), now(), least(now() + make_interval(mins => t.duration_minutes), t.closes_at)) returning * into a;
  return a.id;
end $$;

create or replace function get_attempt(p_attempt uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare a test_attempts; t teacher_tests;
begin
  select * into a from test_attempts where id = p_attempt and student_id = auth.uid();
  if a.id is null then raise exception 'not found'; end if;
  if a.status = 'in_progress' and now() > a.deadline_at + interval '15 seconds' then
    perform finalize_attempt(a.id, 'expired'); select * into a from test_attempts where id = a.id; end if;
  select * into t from teacher_tests where id = a.test_id;
  return jsonb_build_object(
    'attempt', jsonb_build_object('id', a.id, 'status', a.status, 'deadline_at', a.deadline_at, 'server_now', now()),
    'test', jsonb_build_object('title', t.title, 'instructions', t.instructions, 'results_published', t.results_published),
    'questions', case when a.status = 'in_progress' then (select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'position', q.position, 'kind', q.kind,
        'prompt', q.prompt, 'options', q.options, 'marks', q.marks) order by q.position), '[]') from test_questions q where q.test_id = a.test_id) else '[]'::jsonb end,
    'answers', (select coalesce(jsonb_object_agg(x.question_id, x.answer), '{}') from test_answers x where x.attempt_id = a.id));
end $$;

create or replace function save_answer(p_attempt uuid, p_question uuid, p_answer text) returns void language plpgsql security definer set search_path = public as $$
declare a test_attempts;
begin
  select * into a from test_attempts where id = p_attempt and student_id = auth.uid();
  if a.id is null then raise exception 'not found'; end if;
  if a.status <> 'in_progress' then raise exception 'attempt closed'; end if;
  if now() > a.deadline_at + interval '15 seconds' then perform finalize_attempt(a.id, 'expired'); raise exception 'deadline passed'; end if;
  if not exists (select 1 from test_questions where id = p_question and test_id = a.test_id) then raise exception 'invalid question'; end if;
  insert into test_answers (attempt_id, question_id, answer) values (p_attempt, p_question, left(p_answer, 20000))
    on conflict (attempt_id, question_id) do update set answer = excluded.answer, updated_at = now();
end $$;

-- Policy: answers submitted within deadline+15s grace are accepted; later submissions are rejected and the attempt is
-- finalized as 'expired' using only the answers already saved before the deadline.
create or replace function submit_attempt(p_attempt uuid, p_answers jsonb default '{}') returns text language plpgsql security definer set search_path = public as $$
declare a test_attempts; k text;
begin
  select * into a from test_attempts where id = p_attempt and student_id = auth.uid() for update;
  if a.id is null then raise exception 'not found'; end if;
  if a.status <> 'in_progress' then raise exception 'already submitted'; end if;
  if now() > a.deadline_at + interval '15 seconds' then perform finalize_attempt(a.id, 'expired'); return 'expired'; end if;
  for k in select jsonb_object_keys(p_answers) loop
    if exists (select 1 from test_questions where id = k::uuid and test_id = a.test_id) then
      insert into test_answers (attempt_id, question_id, answer) values (p_attempt, k::uuid, left(p_answers->>k, 20000))
        on conflict (attempt_id, question_id) do update set answer = excluded.answer, updated_at = now();
    end if;
  end loop;
  perform finalize_attempt(a.id, 'submitted');
  return 'submitted';
end $$;

create or replace function grade_answer(p_attempt uuid, p_question uuid, p_marks numeric, p_feedback text) returns void language plpgsql security definer set search_path = public as $$
declare v_test uuid; v_max numeric; v_kind text;
begin
  select test_id into v_test from test_attempts where id = p_attempt;
  if v_test is null or not teaches_test(v_test) or not is_teacher() then raise exception 'not allowed'; end if;
  select marks, kind into v_max, v_kind from test_questions where id = p_question and test_id = v_test;
  if v_kind not in ('short','long') then raise exception 'not a written question'; end if;
  if p_marks < 0 or p_marks > v_max then raise exception 'marks out of range'; end if;
  update test_answers set awarded_marks = p_marks, feedback = left(p_feedback, 5000) where attempt_id = p_attempt and question_id = p_question;
  perform recompute_result(p_attempt);
  perform audit('graded_answer', p_attempt::text);
end $$;

create or replace function publish_results(p_test uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not teaches_test(p_test) or not is_teacher() then raise exception 'not allowed'; end if;
  if exists (select 1 from test_attempts where test_id = p_test and status = 'in_progress' and now() <= deadline_at) then raise exception 'attempts still in progress'; end if;
  update test_attempts set status = 'expired', submitted_at = now() where test_id = p_test and status = 'in_progress';
  update teacher_tests set results_published = true where id = p_test;
  insert into notifications (user_id, kind, message)
    select student_id, 'results', 'Results are published for a test.' from test_attempts where test_id = p_test;
  perform audit('results_published', p_test::text);
end $$;

create or replace function get_result(p_attempt uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare a test_attempts; t teacher_tests;
begin
  select * into a from test_attempts where id = p_attempt and student_id = auth.uid();
  select * into t from teacher_tests where id = a.test_id;
  if a.id is null or not t.results_published then raise exception 'results not published'; end if;
  return jsonb_build_object('title', t.title, 'passing_marks', t.passing_marks,
    'result', (select to_jsonb(r) from test_results r where r.attempt_id = a.id),
    'items', (select coalesce(jsonb_agg(jsonb_build_object('prompt', q.prompt, 'kind', q.kind, 'marks', q.marks, 'your_answer', x.answer,
        'correct_answer', case when q.kind in ('mcq','true_false') then q.correct_answer end, 'explanation', q.explanation,
        'awarded', coalesce(x.awarded_marks, x.auto_marks), 'feedback', x.feedback) order by q.position), '[]')
      from test_questions q left join test_answers x on x.question_id = q.id and x.attempt_id = a.id where q.test_id = a.test_id));
end $$;

-- ---------- Practice quiz (own questions; objective MCQ scored on the server so scores can't be forged) ----------
create or replace function record_practice_quiz(p_subject text, p_answers jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare k text; q questions; sc int := 0; tot int := 0; det jsonb := '[]';
begin
  for k in select jsonb_object_keys(p_answers) loop
    select * into q from questions where id = k::uuid and owner_id = auth.uid() and type = 'mcq';
    if q.id is not null then
      tot := tot + 1;
      if lower(trim(p_answers->>k)) = lower(trim(coalesce(q.answer,''))) then sc := sc + 1; end if;
      det := det || jsonb_build_array(jsonb_build_object('question_id', q.id, 'correct', lower(trim(p_answers->>k)) = lower(trim(coalesce(q.answer,'')))));
    end if;
  end loop;
  if tot = 0 then raise exception 'no scorable MCQs'; end if;
  insert into quiz_attempts (owner_id, subject, score, total, details) values (auth.uid(), nullif(p_subject,''), sc, tot, det);
  return jsonb_build_object('score', sc, 'total', tot, 'details', det);
end $$;

-- ---------- Community ----------
create or replace function search_users(q text) returns table (id uuid, display_name text, username text) language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.username from profiles p
  where length(trim(q)) >= 3 and p.discoverable and not p.suspended and p.id <> auth.uid()
    and (p.username ilike trim(q) || '%' or p.display_name ilike trim(q) || '%')
    and not exists (select 1 from blocks b where (b.blocker_id = p.id and b.blocked_id = auth.uid()) or (b.blocker_id = auth.uid() and b.blocked_id = p.id))
  limit 20 $$;

create or replace function guard_friend_request() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from blocks where (blocker_id = new.to_id and blocked_id = new.from_id) or (blocker_id = new.from_id and blocked_id = new.to_id)) then
    raise exception 'cannot send request'; end if;
  if not exists (select 1 from profiles where id = new.to_id and discoverable and not suspended) then raise exception 'cannot send request'; end if;
  return new;
end $$;
create trigger fr_guard before insert on friend_requests for each row execute function guard_friend_request();

create or replace function respond_friend_request(p_id uuid, p_accept boolean) returns void language plpgsql security definer set search_path = public as $$
declare r friend_requests;
begin
  select * into r from friend_requests where id = p_id and to_id = auth.uid() and status = 'pending';
  if r.id is null then raise exception 'not found'; end if;
  update friend_requests set status = case when p_accept then 'accepted' else 'rejected' end where id = p_id;
  if p_accept then insert into friendships (user_a, user_b) values (least(r.from_id, r.to_id), greatest(r.from_id, r.to_id)) on conflict do nothing; end if;
end $$;

create or replace function list_friends() returns table (id uuid, display_name text, username text) language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.username from friendships f join profiles p on p.id = case when f.user_a = auth.uid() then f.user_b else f.user_a end
  where auth.uid() in (f.user_a, f.user_b) $$;

create or replace function list_incoming_requests() returns table (id uuid, from_name text) language sql stable security definer set search_path = public as $$
  select r.id, p.display_name from friend_requests r join profiles p on p.id = r.from_id where r.to_id = auth.uid() and r.status = 'pending' $$;

-- Privacy / account
create or replace function request_account_deletion() returns void language sql security definer set search_path = public as
$$ update profiles set deletion_requested_at = now() where id = auth.uid() $$;
create or replace function export_my_data() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('profile', (select to_jsonb(p) from profiles p where p.id = auth.uid()),
    'notes', (select coalesce(jsonb_agg(to_jsonb(n)), '[]') from notes n where owner_id = auth.uid()),
    'questions', (select coalesce(jsonb_agg(to_jsonb(q)), '[]') from questions q where owner_id = auth.uid()),
    'flashcards', (select coalesce(jsonb_agg(to_jsonb(f)), '[]') from flashcards f where owner_id = auth.uid()),
    'quiz_attempts', (select coalesce(jsonb_agg(to_jsonb(z)), '[]') from quiz_attempts z where owner_id = auth.uid()),
    'goals', (select coalesce(jsonb_agg(to_jsonb(g)), '[]') from study_goals g where owner_id = auth.uid()),
    'vocabulary', (select coalesce(jsonb_agg(to_jsonb(v)), '[]') from vocabulary_words v where owner_id = auth.uid())) $$;

-- Lock down: RPCs callable by signed-in users only
do $$ declare f text; begin
  for f in select unnest(array['claim_teacher_invite(text)','join_class(text)','start_test_attempt(uuid)','get_attempt(uuid)','save_answer(uuid,uuid,text)',
    'submit_attempt(uuid,jsonb)','grade_answer(uuid,uuid,numeric,text)','publish_results(uuid)','get_result(uuid)','record_practice_quiz(text,jsonb)',
    'search_users(text)','respond_friend_request(uuid,boolean)','list_friends()','list_incoming_requests()','request_account_deletion()','export_my_data()']) loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
