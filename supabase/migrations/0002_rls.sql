-- Row Level Security. Default = deny. Every table has RLS enabled.
-- Helper functions are SECURITY DEFINER so policies don't recurse.
create or replace function is_role(r user_role) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = r and not suspended) $$;
create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as $$ select is_role('admin') $$;
create or replace function is_teacher() returns boolean language sql stable security definer set search_path = public as $$ select is_role('teacher') $$;
create or replace function teaches_student(sid uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from class_members cm join teacher_classes tc on tc.id = cm.class_id where cm.student_id = sid and tc.teacher_id = auth.uid()) $$;
create or replace function teaches_test(tid uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from teacher_tests where id = tid and teacher_id = auth.uid()) $$;
create or replace function in_group(gid uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from group_members where group_id = gid and user_id = auth.uid()) or exists (select 1 from study_groups where id = gid and owner_id = auth.uid()) $$;

do $$ declare t text; begin
  for t in select unnest(array['profiles','user_preferences','subjects','chapters','notes','note_attachments','questions','flashcards',
    'quiz_attempts','study_goals','study_sessions','vocabulary_words','teacher_invites','teacher_classes','class_members','teacher_tests',
    'test_questions','test_assignments','test_attempts','test_answers','test_results','friend_requests','friendships','blocks',
    'study_groups','group_members','challenges','achievements','notifications','reports','audit_logs']) loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
  end loop;
end $$;

-- profiles: own row, teacher's own students, admins. Role/suspension changes are blocked by trigger.
create policy profiles_select_own on profiles for select using (id = auth.uid());
create policy profiles_select_teacher on profiles for select using (teaches_student(id));
create policy profiles_select_admin on profiles for select using (is_admin());
create policy profiles_update_own on profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy prefs_own on user_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- strictly-private owner tables
do $$ declare t text; begin
  for t in select unnest(array['subjects','chapters','notes','note_attachments','questions','flashcards','study_goals','study_sessions','vocabulary_words']) loop
    execute format('create policy %I_owner on %I for all using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t, t);
  end loop;
end $$;

-- quiz_attempts: read-only for owner (written only by record_practice_quiz RPC => no faked scores)
create policy quiz_attempts_select on quiz_attempts for select using (owner_id = auth.uid());
create policy quiz_attempts_delete on quiz_attempts for delete using (owner_id = auth.uid());

-- teacher_invites: no policies => unreadable by clients

create policy classes_teacher on teacher_classes for all using (teacher_id = auth.uid() and is_teacher()) with check (teacher_id = auth.uid() and is_teacher());
create policy classes_member_select on teacher_classes for select using (exists (select 1 from class_members where class_id = id and student_id = auth.uid()));
create policy members_select on class_members for select using (student_id = auth.uid() or exists (select 1 from teacher_classes tc where tc.id = class_id and tc.teacher_id = auth.uid()));
create policy members_delete on class_members for delete using (student_id = auth.uid() or exists (select 1 from teacher_classes tc where tc.id = class_id and tc.teacher_id = auth.uid()));

create policy tests_teacher on teacher_tests for all using (teacher_id = auth.uid() and is_teacher()) with check (teacher_id = auth.uid() and is_teacher());
create policy tests_student_select on teacher_tests for select using (status = 'published' and exists (
  select 1 from test_assignments ta join class_members cm on cm.class_id = ta.class_id where ta.test_id = id and cm.student_id = auth.uid()));
-- test_questions hold correct answers: teacher only. Students read via get_attempt() which strips answers.
create policy tq_teacher on test_questions for all using (teaches_test(test_id) and is_teacher()) with check (teaches_test(test_id) and is_teacher());
create policy ta_teacher on test_assignments for all using (teaches_test(test_id) and is_teacher())
  with check (teaches_test(test_id) and exists (select 1 from teacher_classes c where c.id = class_id and c.teacher_id = auth.uid()));
create policy ta_student_select on test_assignments for select using (exists (select 1 from class_members cm where cm.class_id = test_assignments.class_id and cm.student_id = auth.uid()));

-- attempts/answers/results: NO insert/update policies. Only security-definer RPCs write (server time authority).
create policy attempts_select on test_attempts for select using (student_id = auth.uid() or teaches_test(test_id));
create policy answers_teacher on test_answers for select using (exists (select 1 from test_attempts a where a.id = attempt_id and teaches_test(a.test_id)));
create policy answers_student on test_answers for select using (exists (select 1 from test_attempts a join teacher_tests t on t.id = a.test_id where a.id = attempt_id and a.student_id = auth.uid() and t.results_published));
create policy results_teacher on test_results for select using (exists (select 1 from test_attempts a where a.id = attempt_id and teaches_test(a.test_id)));
create policy results_student on test_results for select using (exists (select 1 from test_attempts a join teacher_tests t on t.id = a.test_id where a.id = attempt_id and a.student_id = auth.uid() and t.results_published));

create policy fr_select on friend_requests for select using (from_id = auth.uid() or to_id = auth.uid());
create policy fr_insert on friend_requests for insert with check (from_id = auth.uid() and status = 'pending');
create policy fr_delete on friend_requests for delete using (from_id = auth.uid() or to_id = auth.uid());
create policy fs_select on friendships for select using (user_a = auth.uid() or user_b = auth.uid());
create policy fs_delete on friendships for delete using (user_a = auth.uid() or user_b = auth.uid());
create policy blocks_own on blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy sg_owner on study_groups for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy sg_member_select on study_groups for select using (in_group(id));
create policy gm_select on group_members for select using (in_group(group_id));
create policy gm_owner_write on group_members for insert with check (exists (select 1 from study_groups g where g.id = group_id and g.owner_id = auth.uid()));
create policy gm_delete on group_members for delete using (user_id = auth.uid() or exists (select 1 from study_groups g where g.id = group_id and g.owner_id = auth.uid()));
create policy ch_select on challenges for select using (from_id = auth.uid() or to_id = auth.uid());
create policy ch_insert on challenges for insert with check (from_id = auth.uid() and exists (
  select 1 from friendships f where (f.user_a = least(auth.uid(), to_id) and f.user_b = greatest(auth.uid(), to_id))));
create policy ach_select on achievements for select using (user_id = auth.uid());
create policy notif_select on notifications for select using (user_id = auth.uid());
create policy notif_update on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notif_delete on notifications for delete using (user_id = auth.uid());
create policy reports_insert on reports for insert with check (reporter_id = auth.uid());
create policy reports_select on reports for select using (reporter_id = auth.uid() or is_admin());
create policy reports_admin_update on reports for update using (is_admin()) with check (is_admin());
create policy audit_admin on audit_logs for select using (is_admin());

-- Storage: private bucket; each user may only touch files under "<their uid>/"
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('note-attachments','note-attachments', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
  on conflict (id) do nothing;
create policy att_obj_select on storage.objects for select using (bucket_id = 'note-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy att_obj_insert on storage.objects for insert with check (bucket_id = 'note-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy att_obj_delete on storage.objects for delete using (bucket_id = 'note-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
