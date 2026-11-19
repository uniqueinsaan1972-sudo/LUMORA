-- 0004_social.sql — Social learning upgrade. Run AFTER 0001-0003.
-- Contents: RLS recursion fix, profiles (public id, onboarding, avatar), friends/blocks, private messaging, note sharing,
-- groups, classes, announcements, test access codes + groups + new question types, leaderboard, invitations, notifications, realtime.

-- ============ A. RLS recursion fix (teacher_classes <-> class_members) ============
create or replace function is_class_member(cid uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from class_members where class_id = cid and student_id = auth.uid()) $$;
create or replace function teaches_class(cid uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from teacher_classes where id = cid and teacher_id = auth.uid()) $$;
drop policy if exists classes_member_select on teacher_classes;
create policy classes_member_select on teacher_classes for select using (is_class_member(id));
drop policy if exists members_select on class_members;
drop policy if exists members_delete on class_members;
create policy members_select on class_members for select using (student_id = auth.uid() or teaches_class(class_id));
create policy members_delete on class_members for delete using (student_id = auth.uid() or teaches_class(class_id));

-- ============ B. Helpers ============
create or replace function gen_code(n int) returns text language plpgsql volatile set search_path = public, extensions as $$
declare alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; res text := ''; b bytea := gen_random_bytes(n); i int;
begin for i in 0..n-1 loop res := res || substr(alphabet, (get_byte(b, i) % 32) + 1, 1); end loop; return res; end $$;
revoke all on function gen_code(int) from public, anon;
grant execute on function gen_code(int) to authenticated;  -- needed: used as a column DEFAULT (join/access codes) evaluated as the inserting user

create or replace function are_friends(o uuid) returns boolean language sql stable security definer set search_path = public as
$$ select auth.uid() is not null and exists (select 1 from friendships where user_a = least(auth.uid(), o) and user_b = greatest(auth.uid(), o)) $$;
create or replace function is_blocked_pair(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)) $$;

-- notifications: extra columns + central, preference-aware creator (internal only)
alter table notifications add column if not exists link text;
alter table notifications add column if not exists data jsonb not null default '{}';
create index if not exists notifications_user_idx on notifications (user_id, read, created_at desc);
create or replace function notify(p_user uuid, p_kind text, p_msg text, p_link text default null, p_data jsonb default '{}') returns void language plpgsql security definer set search_path = public as $$
declare ok boolean := true;
begin
  select case when p_kind in ('friend_request','friend_accept','message') then notify_friends when p_kind in ('test','reminder_test') then notify_tests
    when p_kind = 'reminder' then notify_reminders when p_kind = 'results' then notify_results else true end into ok from user_preferences where user_id = p_user;
  if coalesce(ok, true) then insert into notifications (user_id, kind, message, link, data) values (p_user, p_kind, left(p_msg, 300), p_link, p_data); end if;
end $$;
revoke all on function notify(uuid, text, text, text, jsonb) from public, anon, authenticated;

-- ============ C. Profiles ============
alter table profiles add column if not exists public_id text;
update profiles set public_id = 'LUM-' || gen_code(8) where public_id is null;
create or replace function gen_public_id() returns text language plpgsql volatile set search_path = public, extensions as $$
declare v text; begin loop v := 'LUM-' || gen_code(8); exit when not exists (select 1 from profiles where public_id = v); end loop; return v; end $$;
revoke all on function gen_public_id() from public, anon, authenticated;
alter table profiles alter column public_id set default gen_public_id(), alter column public_id set not null;
do $$ begin alter table profiles add constraint profiles_public_id_key unique (public_id); exception when duplicate_table or duplicate_object then null; end $$;
alter table profiles add column if not exists onboarded boolean not null default false;
alter table profiles add column if not exists avatar_url text check (avatar_url is null or (avatar_url ~ '^https://' and char_length(avatar_url) <= 500));
alter table profiles add column if not exists show_online boolean not null default true;
alter table profiles add column if not exists show_on_leaderboard boolean not null default true;
alter table profiles add column if not exists teacher_verified boolean not null default false;
alter table profiles add column if not exists terms_accepted_at timestamptz;
alter table profiles alter column discoverable set default true;
update profiles set onboarded = true where created_at < now() - interval '1 second' and onboarded = false;  -- existing users skip onboarding

create or replace function username_available(u text) returns boolean language sql stable security definer set search_path = public as
$$ select lower(trim(u)) ~ '^[a-z0-9_]{3,24}$' and not exists (select 1 from profiles where username = lower(trim(u))) $$;

-- Sign-up: role may only be 'student' or 'teacher' (never admin). Unique username with graceful fallback.
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'); v_role user_role := 'student'; v_user text := lower(nullif(trim(m->>'username'), ''));
  v_name text := left(coalesce(nullif(trim(m->>'display_name'), ''), split_part(new.email, '@', 1)), 80); v_terms timestamptz := case when m->>'terms' = 'true' then now() end;
begin
  if m->>'role' = 'teacher' then v_role := 'teacher'; end if;
  if v_user is not null and v_user !~ '^[a-z0-9_]{3,24}$' then v_user := null; end if;
  begin
    insert into profiles (id, role, display_name, username, terms_accepted_at) values (new.id, v_role, v_name, v_user, v_terms);
  exception when unique_violation then
    insert into profiles (id, role, display_name, username, terms_accepted_at) values (new.id, v_role, v_name, null, v_terms);
  end;
  insert into user_preferences (user_id) values (new.id);
  return new;
end $$;

create or replace function guard_profile_update() returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role and coalesce(current_setting('lumora.role_change', true), '') <> '1' then raise exception 'role cannot be changed'; end if;
  if new.teacher_verified is distinct from old.teacher_verified and coalesce(current_setting('lumora.role_change', true), '') <> '1' and not (auth.uid() is null or is_admin()) then raise exception 'not allowed'; end if;
  if new.suspended is distinct from old.suspended and not (auth.uid() is null or is_admin()) then raise exception 'not allowed'; end if;
  if new.id <> old.id or new.public_id is distinct from old.public_id then raise exception 'not allowed'; end if;
  return new;
end $$;

create or replace function claim_teacher_invite(p_code text) returns void language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update teacher_invites set used_by = auth.uid(), used_at = now() where code = p_code and used_by is null;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'invalid or used invite'; end if;
  perform set_config('lumora.role_change', '1', true);
  update profiles set role = 'teacher', teacher_verified = true where id = auth.uid() and role in ('student', 'teacher');
  perform audit('teacher_invite_claimed', auth.uid()::text);
end $$;

-- avatars: public-read bucket, each user writes only inside their own folder
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
drop policy if exists avatars_select on storage.objects; drop policy if exists avatars_insert on storage.objects; drop policy if exists avatars_update on storage.objects; drop policy if exists avatars_delete on storage.objects;
create policy avatars_select on storage.objects for select using (bucket_id = 'avatars');
create policy avatars_insert on storage.objects for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update on storage.objects for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete on storage.objects for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============ D. Friends ============
drop function if exists search_users(text); drop function if exists list_friends(); drop function if exists list_incoming_requests();
create or replace function search_users(q text) returns table (id uuid, display_name text, username text, public_id text, avatar_url text, role user_role, relation text)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.username, p.public_id, p.avatar_url, p.role,
    case when are_friends(p.id) then 'friend'
         when exists (select 1 from friend_requests r where r.from_id = auth.uid() and r.to_id = p.id and r.status = 'pending') then 'pending_out'
         when exists (select 1 from friend_requests r where r.from_id = p.id and r.to_id = auth.uid() and r.status = 'pending') then 'pending_in' else 'none' end
  from profiles p
  where auth.uid() is not null and char_length(trim(q)) >= 3 and p.discoverable and not p.suspended and p.id <> auth.uid() and p.onboarded
    and (p.public_id = upper(trim(q)) or p.username like lower(trim(q)) || '%' or p.display_name ilike trim(q) || '%')
    and not is_blocked_pair(p.id, auth.uid())
  order by (p.public_id = upper(trim(q)) or p.username = lower(trim(q))) desc, p.display_name limit 20 $$;
create or replace function list_friends() returns table (id uuid, display_name text, username text, public_id text, avatar_url text, show_online boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.username, p.public_id, p.avatar_url, p.show_online from friendships f
  join profiles p on p.id = case when f.user_a = auth.uid() then f.user_b else f.user_a end where auth.uid() in (f.user_a, f.user_b) order by p.display_name $$;
create or replace function list_incoming_requests() returns table (id uuid, from_id uuid, from_name text, username text, avatar_url text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, p.id, p.display_name, p.username, p.avatar_url, r.created_at from friend_requests r join profiles p on p.id = r.from_id where r.to_id = auth.uid() and r.status = 'pending' order by r.created_at desc $$;
create or replace function list_outgoing_requests() returns table (id uuid, to_id uuid, to_name text, username text, avatar_url text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, p.id, p.display_name, p.username, p.avatar_url, r.created_at from friend_requests r join profiles p on p.id = r.to_id where r.from_id = auth.uid() and r.status = 'pending' order by r.created_at desc $$;
create or replace function list_blocked() returns table (id uuid, display_name text, username text) language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.username from blocks b join profiles p on p.id = b.blocked_id where b.blocker_id = auth.uid() order by p.display_name $$;

create or replace function guard_friend_request() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if is_blocked_pair(new.from_id, new.to_id) then raise exception 'cannot send request'; end if;
  if not exists (select 1 from profiles where id = new.to_id and discoverable and not suspended) then raise exception 'cannot send request'; end if;
  if exists (select 1 from friendships where user_a = least(new.from_id, new.to_id) and user_b = greatest(new.from_id, new.to_id)) then raise exception 'already friends'; end if;
  if exists (select 1 from friend_requests where from_id = new.to_id and to_id = new.from_id and status = 'pending') then raise exception 'this person already sent you a request'; end if;
  return new;
end $$;
create or replace function friend_request_notify() returns trigger language plpgsql security definer set search_path = public as $$
declare n text;
begin
  if tg_op = 'INSERT' then
    select display_name into n from profiles where id = new.from_id; perform notify(new.to_id, 'friend_request', n || ' sent you a friend request', '/friends');
  elsif new.status = 'accepted' and old.status = 'pending' then
    select display_name into n from profiles where id = new.to_id; perform notify(new.from_id, 'friend_accept', n || ' accepted your friend request', '/friends');
  end if; return new;
end $$;
drop trigger if exists fr_notify_ins on friend_requests; drop trigger if exists fr_notify_upd on friend_requests;
create trigger fr_notify_ins after insert on friend_requests for each row execute function friend_request_notify();
create trigger fr_notify_upd after update on friend_requests for each row execute function friend_request_notify();

create or replace function remove_friend(p_other uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  delete from friendships where user_a = least(auth.uid(), p_other) and user_b = greatest(auth.uid(), p_other);
  delete from friend_requests where (from_id = auth.uid() and to_id = p_other) or (from_id = p_other and to_id = auth.uid());
end $$;
create or replace function block_user(p_other uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_other = auth.uid() then raise exception 'cannot block yourself'; end if;
  insert into blocks (blocker_id, blocked_id) values (auth.uid(), p_other) on conflict do nothing;
  perform remove_friend(p_other);
end $$;
create or replace function unblock_user(p_other uuid) returns void language sql security definer set search_path = public as
$$ delete from blocks where blocker_id = auth.uid() and blocked_id = p_other $$;

-- ============ E. Private messaging ============
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles on delete cascade, recipient_id uuid not null references profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 2000), created_at timestamptz not null default now(), read_at timestamptz,
  check (sender_id <> recipient_id)
);
create index if not exists messages_pair_idx on messages (sender_id, recipient_id, created_at desc);
create index if not exists messages_unread_idx on messages (recipient_id, read_at) where read_at is null;
alter table messages enable row level security; alter table messages force row level security;
drop policy if exists messages_select on messages;
-- only the two participants, and only while they are still friends (unfriend/block closes the conversation)
create policy messages_select on messages for select using ((sender_id = auth.uid() and are_friends(recipient_id)) or (recipient_id = auth.uid() and are_friends(sender_id)));

create or replace function send_message(p_to uuid, p_body text) returns messages language plpgsql security definer set search_path = public as $$
declare m messages; b text := trim(p_body);
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if b is null or char_length(b) < 1 or char_length(b) > 2000 then raise exception 'message must be 1-2000 characters'; end if;
  if not are_friends(p_to) or is_blocked_pair(auth.uid(), p_to) then raise exception 'you can only message friends'; end if;
  if (select count(*) from messages where sender_id = auth.uid() and created_at > now() - interval '1 minute') >= 30 then raise exception 'slow down: too many messages'; end if;
  insert into messages (sender_id, recipient_id, body) values (auth.uid(), p_to, b) returning * into m;
  if not exists (select 1 from notifications where user_id = p_to and kind = 'message' and not read and data->>'from' = auth.uid()::text) then
    perform notify(p_to, 'message', (select display_name from profiles where id = auth.uid()) || ' sent you a message', '/messages?with=' || auth.uid()::text, jsonb_build_object('from', auth.uid()));
  end if;
  return m;
end $$;
create or replace function mark_conversation_read(p_other uuid) returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not are_friends(p_other) then return 0; end if;
  update messages set read_at = now() where sender_id = p_other and recipient_id = auth.uid() and read_at is null; get diagnostics n = row_count;
  update notifications set read = true where user_id = auth.uid() and kind = 'message' and data->>'from' = p_other::text;
  return n;
end $$;
create or replace function conversation_list() returns table (id uuid, display_name text, username text, avatar_url text, show_online boolean, last_body text, last_at timestamptz, last_mine boolean, unread int)
language sql stable security definer set search_path = public as $$
  select f.id, f.display_name, f.username, f.avatar_url, f.show_online, lm.body, lm.created_at, lm.sender_id = auth.uid(), coalesce(u.n, 0)::int
  from list_friends() f
  left join lateral (select m.body, m.created_at, m.sender_id from messages m where (m.sender_id = auth.uid() and m.recipient_id = f.id) or (m.sender_id = f.id and m.recipient_id = auth.uid()) order by m.created_at desc limit 1) lm on true
  left join lateral (select count(*) n from messages m where m.sender_id = f.id and m.recipient_id = auth.uid() and m.read_at is null) u on true
  order by lm.created_at desc nulls last, f.display_name $$;

-- ============ F. Note sharing ============
create table if not exists note_shares (
  id uuid primary key default gen_random_uuid(), note_id uuid not null references notes on delete cascade, owner_id uuid not null references profiles on delete cascade,
  target_type text not null check (target_type in ('user','group','class')), target_id uuid not null, permission text not null default 'view' check (permission in ('view','edit')),
  created_at timestamptz not null default now(), unique (note_id, target_type, target_id)
);
create index if not exists note_shares_target_idx on note_shares (target_type, target_id);
alter table note_shares enable row level security; alter table note_shares force row level security;
drop policy if exists note_shares_owner_select on note_shares; drop policy if exists note_shares_owner_delete on note_shares;
create policy note_shares_owner_select on note_shares for select using (owner_id = auth.uid());
create policy note_shares_owner_delete on note_shares for delete using (owner_id = auth.uid());   -- revoke access

create or replace function note_access(p_note uuid) returns text language sql stable security definer set search_path = public as $$
  select case when n.owner_id = auth.uid() then 'owner' else (
    select case when bool_or(s.permission = 'edit') then 'edit' else 'view' end from note_shares s where s.note_id = n.id and (
      (s.target_type = 'user' and s.target_id = auth.uid()) or (s.target_type = 'group' and in_group(s.target_id))
      or (s.target_type = 'class' and (is_class_member(s.target_id) or teaches_class(s.target_id)))) having count(*) > 0) end
  from notes n where n.id = p_note and auth.uid() is not null $$;

drop policy if exists notes_shared_select on notes; drop policy if exists notes_shared_update on notes;
create policy notes_shared_select on notes for select using (note_access(id) in ('view', 'edit'));
create policy notes_shared_update on notes for update using (note_access(id) = 'edit') with check (note_access(id) = 'edit');
-- non-owners (edit permission) may change content only; ownership/organisation fields stay with the owner
create or replace function notes_guard() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and auth.uid() <> old.owner_id then
    if new.owner_id <> old.owner_id or new.pinned <> old.pinned or new.bookmarked <> old.bookmarked or new.archived <> old.archived or new.folder is distinct from old.folder then
      raise exception 'only the owner can change these fields'; end if;
  elsif new.owner_id <> old.owner_id then raise exception 'owner cannot change'; end if;
  return new;
end $$;
drop trigger if exists notes_guard_trg on notes; create trigger notes_guard_trg before update on notes for each row execute function notes_guard();

create or replace function share_note(p_note uuid, p_type text, p_target uuid, p_perm text default 'view') returns uuid language plpgsql security definer set search_path = public as $$
declare sid uuid; v_title text; me text; r record;
begin
  if not exists (select 1 from notes where id = p_note and owner_id = auth.uid()) then raise exception 'only the owner can share a note'; end if;
  if p_perm not in ('view', 'edit') then raise exception 'invalid permission'; end if;
  if p_type = 'user' then
    if not are_friends(p_target) or is_blocked_pair(auth.uid(), p_target) then raise exception 'you can only share with friends'; end if;
  elsif p_type = 'group' then if not in_group(p_target) then raise exception 'you are not in that group'; end if;
  elsif p_type = 'class' then if not teaches_class(p_target) then raise exception 'only the class teacher can share to a class'; end if;
  else raise exception 'invalid target'; end if;
  insert into note_shares (note_id, owner_id, target_type, target_id, permission) values (p_note, auth.uid(), p_type, p_target, p_perm)
    on conflict (note_id, target_type, target_id) do update set permission = excluded.permission returning id into sid;
  select display_name into me from profiles where id = auth.uid();
  if p_type = 'user' then perform notify(p_target, 'note_shared', me || ' shared a note with you', '/notes?tab=shared');
  elsif p_type = 'group' then for r in select user_id as u from group_members where group_id = p_target and user_id <> auth.uid() union select owner_id from study_groups where id = p_target and owner_id <> auth.uid() loop perform notify(r.u, 'note_shared', me || ' shared a note in a group', '/notes?tab=shared'); end loop;
  else for r in select student_id as u from class_members where class_id = p_target loop perform notify(r.u, 'note_shared', me || ' shared study material with your class', '/notes?tab=shared'); end loop;
       perform audit('class_note_shared', p_target::text); end if;
  return sid;
end $$;

create or replace function shared_notes() returns table (id uuid, title text, subject text, chapter text, updated_at timestamptz, owner_name text, permission text)
language sql stable security definer set search_path = public as $$
  select n.id, n.title, n.subject, n.chapter, n.updated_at, p.display_name, note_access(n.id) from notes n join profiles p on p.id = n.owner_id
  where n.owner_id <> auth.uid() and note_access(n.id) in ('view', 'edit') order by n.updated_at desc $$;
create or replace function save_shared_note(p_note uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare nid uuid;
begin
  if coalesce(note_access(p_note), '') not in ('view', 'edit') then raise exception 'not allowed'; end if;
  insert into notes (owner_id, title, body, subject, chapter, tags) select auth.uid(), left(title || ' (saved copy)', 200), body, subject, chapter, tags from notes where id = p_note returning id into nid;
  return nid;
end $$;

-- ============ G. Groups ============
alter table study_groups add column if not exists description text check (description is null or char_length(description) <= 500);
alter table study_groups add column if not exists join_code text unique default gen_code(8);
create or replace function my_groups() returns table (id uuid, name text, description text, join_code text, owner_name text, member_count int, is_owner boolean)
language sql stable security definer set search_path = public as $$
  select g.id, g.name, g.description, case when g.owner_id = auth.uid() then g.join_code end, p.display_name,
    (1 + (select count(*) from group_members m where m.group_id = g.id))::int, g.owner_id = auth.uid()
  from study_groups g join profiles p on p.id = g.owner_id where in_group(g.id) order by g.created_at desc $$;
create or replace function group_members_list(p_group uuid) returns table (id uuid, display_name text, username text, avatar_url text, is_owner boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.username, p.avatar_url, p.id = g.owner_id from study_groups g join profiles p on p.id = g.owner_id or p.id in (select user_id from group_members where group_id = g.id)
  where g.id = p_group and in_group(g.id) order by (p.id = g.owner_id) desc, p.display_name $$;
create table if not exists code_attempts (id bigint generated always as identity primary key, user_id uuid not null, kind text not null, ok boolean not null, at timestamptz not null default now());
alter table code_attempts enable row level security; alter table code_attempts force row level security;   -- no policies: internal only
create or replace function check_code_throttle(p_kind text) returns void language plpgsql security definer set search_path = public as $$
begin if (select count(*) from code_attempts where user_id = auth.uid() and kind = p_kind and not ok and at > now() - interval '10 minutes') >= 8 then raise exception 'too many wrong codes, try again in a few minutes'; end if; end $$;
revoke all on function check_code_throttle(text) from public, anon, authenticated;
create or replace function log_code_attempt(p_kind text, p_ok boolean) returns void language sql security definer set search_path = public as $$ insert into code_attempts (user_id, kind, ok) values (auth.uid(), p_kind, p_ok) $$;
revoke all on function log_code_attempt(text, boolean) from public, anon, authenticated;
create or replace function join_group(p_code text) returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid; o uuid;
begin
  perform check_code_throttle('group');
  select id, owner_id into gid, o from study_groups where join_code = upper(trim(p_code));
  perform log_code_attempt('group', gid is not null);
  if gid is null then return null; end if;
  if o <> auth.uid() then insert into group_members (group_id, user_id) values (gid, auth.uid()) on conflict do nothing;
    perform notify(o, 'group_join', (select display_name from profiles where id = auth.uid()) || ' joined your group', '/groups'); end if;
  return gid;
end $$;
create or replace function invite_friend_to_group(p_group uuid, p_user uuid) returns void language plpgsql security definer set search_path = public as $$
declare g study_groups;
begin
  select * into g from study_groups where id = p_group and owner_id = auth.uid();
  if g.id is null then raise exception 'only the group owner can invite'; end if;
  if not are_friends(p_user) then raise exception 'you can only invite friends'; end if;
  perform notify(p_user, 'group_invite', (select display_name from profiles where id = auth.uid()) || ' invited you to the group "' || g.name || '"', '/groups?code=' || g.join_code);
end $$;

create or replace function group_shared_notes(p_group uuid) returns table (id uuid, title text, subject text, updated_at timestamptz, permission text, owner_name text)
language sql stable security definer set search_path = public as $$
  select n.id, n.title, n.subject, n.updated_at, s.permission, p.display_name from note_shares s join notes n on n.id = s.note_id join profiles p on p.id = n.owner_id
  where s.target_type = 'group' and s.target_id = p_group and in_group(p_group) order by n.updated_at desc $$;

-- ============ H. Classes, announcements ============
alter table teacher_classes add column if not exists description text check (description is null or char_length(description) <= 500);
create or replace function join_class(p_code text) returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid; t uuid;
begin
  if not is_role('student') then raise exception 'students only'; end if;
  perform check_code_throttle('class');
  select id, teacher_id into cid, t from teacher_classes where join_code = lower(trim(p_code));
  perform log_code_attempt('class', cid is not null);
  if cid is null then return null; end if;
  insert into class_members (class_id, student_id) values (cid, auth.uid()) on conflict do nothing;
  if found then perform notify(t, 'class_join', (select display_name from profiles where id = auth.uid()) || ' joined your class', '/teacher/classes/' || cid::text); end if;
  return cid;
end $$;
create or replace function regenerate_class_code(p_class uuid) returns text language plpgsql security definer set search_path = public as $$
declare c text := lower(gen_code(10));
begin
  if not teaches_class(p_class) or not is_teacher() then raise exception 'not allowed'; end if;
  update teacher_classes set join_code = c where id = p_class; perform audit('class_code_regenerated', p_class::text); return c;
end $$;
create or replace function remove_class_member(p_class uuid, p_student uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not teaches_class(p_class) or not is_teacher() then raise exception 'not allowed'; end if;
  delete from class_members where class_id = p_class and student_id = p_student;
  perform audit('class_member_removed', p_class::text || ':' || p_student::text);
  perform notify(p_student, 'class_removed', 'You were removed from a class', '/classes');
end $$;
create or replace function my_classes() returns table (id uuid, name text, description text, join_code text, teacher_name text, member_count int, is_teacher boolean)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.description, case when c.teacher_id = auth.uid() then c.join_code end, p.display_name, (select count(*) from class_members m where m.class_id = c.id)::int, c.teacher_id = auth.uid()
  from teacher_classes c join profiles p on p.id = c.teacher_id where c.teacher_id = auth.uid() or is_class_member(c.id) order by c.created_at desc $$;
create or replace function class_members_list(p_class uuid) returns table (id uuid, display_name text, username text, avatar_url text, joined_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.username, p.avatar_url, m.joined_at from class_members m join profiles p on p.id = m.student_id
  where m.class_id = p_class and (is_class_member(p_class) or teaches_class(p_class)) order by p.display_name $$;
create or replace function class_shared_notes(p_class uuid) returns table (id uuid, title text, subject text, updated_at timestamptz, permission text)
language sql stable security definer set search_path = public as $$
  select n.id, n.title, n.subject, n.updated_at, s.permission from note_shares s join notes n on n.id = s.note_id
  where s.target_type = 'class' and s.target_id = p_class and (is_class_member(p_class) or teaches_class(p_class)) order by n.updated_at desc $$;

create table if not exists announcements (id uuid primary key default gen_random_uuid(), class_id uuid not null references teacher_classes on delete cascade, author_id uuid not null references profiles on delete cascade,
  title text not null check (char_length(title) between 1 and 150), body text not null check (char_length(body) between 1 and 3000), created_at timestamptz not null default now());
create index if not exists announcements_class_idx on announcements (class_id, created_at desc);
alter table announcements enable row level security; alter table announcements force row level security;
drop policy if exists announcements_select on announcements;
create policy announcements_select on announcements for select using (is_class_member(class_id) or teaches_class(class_id));
create or replace function post_announcement(p_class uuid, p_title text, p_body text) returns uuid language plpgsql security definer set search_path = public as $$
declare aid uuid; r record;
begin
  if not teaches_class(p_class) or not is_teacher() then raise exception 'not allowed'; end if;
  insert into announcements (class_id, author_id, title, body) values (p_class, auth.uid(), trim(p_title), trim(p_body)) returning id into aid;
  for r in select student_id from class_members where class_id = p_class loop perform notify(r.student_id, 'announcement', 'Announcement: ' || trim(p_title), '/classes/' || p_class::text); end loop;
  perform audit('announcement_posted', p_class::text); return aid;
end $$;

-- ============ I. Tests: description, access codes, groups, new question types, statuses ============
alter table teacher_tests add column if not exists description text check (description is null or char_length(description) <= 2000);
alter table teacher_tests add column if not exists access_code text;
update teacher_tests set access_code = gen_code(8) where access_code is null;
alter table teacher_tests alter column access_code set default gen_code(8), alter column access_code set not null;
do $$ begin alter table teacher_tests add constraint teacher_tests_access_code_key unique (access_code); exception when duplicate_table or duplicate_object then null; end $$;
alter table test_questions drop constraint if exists test_questions_kind_check;
alter table test_questions add constraint test_questions_kind_check check (kind in ('mcq','true_false','fill_blank','short','long','definition'));
alter table test_results add column if not exists graded_any boolean not null default false;

create table if not exists test_access (test_id uuid not null references teacher_tests on delete cascade, student_id uuid not null references profiles on delete cascade, joined_at timestamptz not null default now(), primary key (test_id, student_id));
create table if not exists test_group_assignments (test_id uuid not null references teacher_tests on delete cascade, group_id uuid not null references study_groups on delete cascade, primary key (test_id, group_id));
alter table test_access enable row level security; alter table test_access force row level security;
alter table test_group_assignments enable row level security; alter table test_group_assignments force row level security;
drop policy if exists test_access_select on test_access; drop policy if exists tga_teacher on test_group_assignments; drop policy if exists tga_member_select on test_group_assignments;
create policy test_access_select on test_access for select using (student_id = auth.uid() or teaches_test(test_id));
create policy tga_teacher on test_group_assignments for all using (teaches_test(test_id) and is_teacher())
  with check (teaches_test(test_id) and exists (select 1 from study_groups g where g.id = group_id and g.owner_id = auth.uid()));
create policy tga_member_select on test_group_assignments for select using (in_group(group_id));

create or replace function can_access_test(tid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from teacher_tests t where t.id = tid and t.status = 'published' and (
    exists (select 1 from test_assignments ta join class_members cm on cm.class_id = ta.class_id where ta.test_id = t.id and cm.student_id = auth.uid())
    or exists (select 1 from test_group_assignments tg where tg.test_id = t.id and in_group(tg.group_id))
    or exists (select 1 from test_access x where x.test_id = t.id and x.student_id = auth.uid()))) $$;
drop policy if exists tests_student_select on teacher_tests;
create policy tests_student_select on teacher_tests for select using (can_access_test(id));

create or replace function join_test_by_code(p_code text) returns uuid language plpgsql security definer set search_path = public as $$
declare tid uuid;
begin
  if not is_role('student') then raise exception 'students only'; end if;
  perform check_code_throttle('test');
  select id into tid from teacher_tests where access_code = upper(trim(p_code)) and status = 'published';
  perform log_code_attempt('test', tid is not null);
  if tid is null then return null; end if;
  insert into test_access (test_id, student_id) values (tid, auth.uid()) on conflict do nothing;
  return tid;
end $$;
create or replace function regenerate_test_code(p_test uuid) returns text language plpgsql security definer set search_path = public as $$
declare c text := gen_code(8);
begin
  if not teaches_test(p_test) or not is_teacher() then raise exception 'not allowed'; end if;
  update teacher_tests set access_code = c where id = p_test; perform audit('test_code_regenerated', p_test::text); return c;
end $$;

create or replace function start_test_attempt(p_test uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare t teacher_tests; a test_attempts;
begin
  if not is_role('student') then raise exception 'students only'; end if;
  select * into t from teacher_tests where id = p_test and status = 'published';
  if t.id is null or not can_access_test(p_test) then raise exception 'test not available'; end if;
  if now() < t.opens_at then raise exception 'test has not opened'; end if;
  select * into a from test_attempts where test_id = p_test and student_id = auth.uid();
  if a.id is not null then return a.id; end if;
  if now() >= t.closes_at then raise exception 'test is closed'; end if;
  insert into test_attempts (test_id, student_id, started_at, deadline_at) values (p_test, auth.uid(), now(), least(now() + make_interval(mins => t.duration_minutes), t.closes_at)) returning * into a;
  return a.id;
end $$;

create or replace function finalize_attempt(p_attempt uuid, p_status text) returns void language plpgsql security definer set search_path = public as $$
declare v_test uuid;
begin
  select test_id into v_test from test_attempts where id = p_attempt;
  insert into test_answers (attempt_id, question_id) select p_attempt, q.id from test_questions q where q.test_id = v_test on conflict do nothing;
  update test_answers a set auto_marks = case
      when q.kind in ('mcq','true_false') then case when lower(trim(coalesce(a.answer,''))) = lower(trim(coalesce(q.correct_answer,''))) then q.marks else 0 end
      when q.kind = 'fill_blank' then case when exists (select 1 from unnest(string_to_array(coalesce(q.correct_answer,''), '|')) c where length(trim(c)) > 0 and lower(trim(c)) = lower(trim(coalesce(a.answer,'')))) then q.marks else 0 end
      else null end
    from test_questions q where q.id = a.question_id and a.attempt_id = p_attempt;
  update test_attempts set status = p_status, submitted_at = now() where id = p_attempt;
  perform recompute_result(p_attempt);
end $$;
create or replace function recompute_result(p_attempt uuid) returns void language plpgsql security definer set search_path = public as $$
declare v_test uuid; v_total numeric; v_obt numeric; v_pending boolean; v_any boolean;
begin
  select test_id into v_test from test_attempts where id = p_attempt;
  select coalesce(sum(marks), 0) into v_total from test_questions where test_id = v_test;
  select coalesce(sum(coalesce(a.awarded_marks, a.auto_marks, 0)), 0),
         coalesce(bool_or(q.kind in ('short','long','definition') and a.awarded_marks is null), false),
         coalesce(bool_or(q.kind in ('short','long','definition') and a.awarded_marks is not null), false)
    into v_obt, v_pending, v_any from test_answers a join test_questions q on q.id = a.question_id where a.attempt_id = p_attempt;
  insert into test_results (attempt_id, total_marks, obtained_marks, pending_manual, graded_any) values (p_attempt, v_total, v_obt, v_pending, v_any)
    on conflict (attempt_id) do update set total_marks = excluded.total_marks, obtained_marks = excluded.obtained_marks, pending_manual = excluded.pending_manual, graded_any = excluded.graded_any;
end $$;

create or replace function grade_answer(p_attempt uuid, p_question uuid, p_marks numeric, p_feedback text) returns void language plpgsql security definer set search_path = public as $$
declare v_test uuid; v_max numeric; v_kind text;
begin
  select test_id into v_test from test_attempts where id = p_attempt;
  if v_test is null or not teaches_test(v_test) or not is_teacher() then raise exception 'not allowed'; end if;
  select marks, kind into v_max, v_kind from test_questions where id = p_question and test_id = v_test;
  if v_kind not in ('short','long','definition') then raise exception 'not a written question'; end if;
  if p_marks < 0 or p_marks > v_max then raise exception 'marks out of range'; end if;
  update test_answers set awarded_marks = p_marks, feedback = left(p_feedback, 5000) where attempt_id = p_attempt and question_id = p_question;
  perform recompute_result(p_attempt); perform audit('graded_answer', p_attempt::text);
end $$;

create or replace function publish_results(p_test uuid) returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if not teaches_test(p_test) or not is_teacher() then raise exception 'not allowed'; end if;
  if exists (select 1 from test_attempts where test_id = p_test and status = 'in_progress' and now() <= deadline_at) then raise exception 'attempts still in progress'; end if;
  for r in select id from test_attempts where test_id = p_test and status = 'in_progress' loop perform finalize_attempt(r.id, 'expired'); end loop;
  if exists (select 1 from test_attempts a join test_results x on x.attempt_id = a.id where a.test_id = p_test and x.pending_manual) then raise exception 'grade all written answers before publishing'; end if;
  update teacher_tests set results_published = true where id = p_test;
  for r in select a.student_id, x.obtained_marks, x.total_marks from test_attempts a join test_results x on x.attempt_id = a.id where a.test_id = p_test loop
    perform notify(r.student_id, 'results', 'Your test results are published', '/quizzes');
    insert into achievements (user_id, code) values (r.student_id, 'first_test') on conflict do nothing;
    if r.total_marks > 0 and r.obtained_marks = r.total_marks then insert into achievements (user_id, code) values (r.student_id, 'perfect_score') on conflict do nothing; end if;
    if r.total_marks > 0 and r.obtained_marks / r.total_marks >= 0.9 then insert into achievements (user_id, code) values (r.student_id, 'high_achiever') on conflict do nothing; end if;
  end loop;
  perform audit('results_published', p_test::text);
end $$;

create or replace function get_result(p_attempt uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare a test_attempts; t teacher_tests;
begin
  select * into a from test_attempts where id = p_attempt and student_id = auth.uid();
  select * into t from teacher_tests where id = a.test_id;
  if a.id is null or not t.results_published then raise exception 'results not published'; end if;
  return jsonb_build_object('title', t.title, 'passing_marks', t.passing_marks, 'result', (select to_jsonb(r) from test_results r where r.attempt_id = a.id),
    'items', (select coalesce(jsonb_agg(jsonb_build_object('prompt', q.prompt, 'kind', q.kind, 'marks', q.marks, 'your_answer', x.answer,
        'correct_answer', case when q.kind in ('mcq','true_false','fill_blank') then replace(q.correct_answer, '|', ' / ') end, 'explanation', q.explanation,
        'awarded', coalesce(x.awarded_marks, x.auto_marks), 'feedback', x.feedback) order by q.position), '[]')
      from test_questions q left join test_answers x on x.question_id = q.id and x.attempt_id = a.id where q.test_id = a.test_id));
end $$;

-- notify students when a test is published (assignments exist by then because the app publishes last)
create or replace function notify_test_published() returns trigger language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if new.status = 'published' and old.status <> 'published' then
    for r in select cm.student_id as u from test_assignments ta join class_members cm on cm.class_id = ta.class_id where ta.test_id = new.id
             union select gm.user_id from test_group_assignments tg join group_members gm on gm.group_id = tg.group_id where tg.test_id = new.id loop
      perform notify(r.u, 'test', 'New test: ' || new.title, '/quizzes'); end loop;
  end if; return new;
end $$;
drop trigger if exists teacher_tests_notify on teacher_tests;
create trigger teacher_tests_notify after update of status on teacher_tests for each row execute function notify_test_published();
create or replace function audit_test_changes() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then insert into audit_logs (actor_id, action, target) values (auth.uid(), 'test_created', new.id::text);
  elsif new.status is distinct from old.status then insert into audit_logs (actor_id, action, target) values (auth.uid(), 'test_' || new.status, new.id::text); end if; return new;
end $$;
drop trigger if exists teacher_tests_audit on teacher_tests;
create trigger teacher_tests_audit after insert or update on teacher_tests for each row execute function audit_test_changes();

create table if not exists reminder_log (user_id uuid not null, test_id uuid not null, kind text not null, primary key (user_id, test_id, kind));
alter table reminder_log enable row level security; alter table reminder_log force row level security;
-- Opportunistic reminders (no background scheduler): called when the user opens the app/notifications.
create or replace function refresh_my_reminders() returns int language plpgsql security definer set search_path = public as $$
declare t record; n int := 0; ins int;
begin
  for t in select * from teacher_tests tt where tt.status = 'published' and can_access_test(tt.id) and
      ((tt.opens_at > now() and tt.opens_at < now() + interval '24 hours') or (tt.closes_at > now() and tt.closes_at < now() + interval '24 hours')) loop
    if t.opens_at > now() then
      insert into reminder_log values (auth.uid(), t.id, 'opens') on conflict do nothing; get diagnostics ins = row_count;
      if ins > 0 then perform notify(auth.uid(), 'reminder_test', '"' || t.title || '" opens within 24 hours', '/quizzes'); n := n + 1; end if;
    elsif not exists (select 1 from test_attempts a where a.test_id = t.id and a.student_id = auth.uid() and a.status <> 'in_progress') then
      insert into reminder_log values (auth.uid(), t.id, 'closes') on conflict do nothing; get diagnostics ins = row_count;
      if ins > 0 then perform notify(auth.uid(), 'reminder_test', '"' || t.title || '" closes within 24 hours', '/quizzes'); n := n + 1; end if;
    end if;
  end loop; return n;
end $$;

-- ============ J. Leaderboard (published, fully graded results only; ties share a rank) ============
create or replace function leaderboard(p_scope text, p_scope_id uuid, p_test uuid default null)
returns table (rank bigint, user_id uuid, display_name text, username text, avatar_url text, tests_completed int, obtained numeric, total numeric, percentage numeric, improvement numeric, achievements int, is_me boolean)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if p_scope = 'class' then if not (is_class_member(p_scope_id) or teaches_class(p_scope_id)) then raise exception 'not allowed'; end if;
  elsif p_scope = 'group' then if not in_group(p_scope_id) then raise exception 'not allowed'; end if;
  else raise exception 'bad scope'; end if;
  return query
  with members as (
    select cm.student_id as uid from class_members cm where p_scope = 'class' and cm.class_id = p_scope_id
    union select gm.user_id from group_members gm where p_scope = 'group' and gm.group_id = p_scope_id
  ), scoped as (
    select ta.test_id from test_assignments ta where p_scope = 'class' and ta.class_id = p_scope_id
    union select tg.test_id from test_group_assignments tg where p_scope = 'group' and tg.group_id = p_scope_id
  ), res as (
    select a.student_id as uid, r.obtained_marks as ob, r.total_marks as tt, case when r.total_marks > 0 then r.obtained_marks / r.total_marks * 100 else 0 end as pc,
      row_number() over (partition by a.student_id order by t.closes_at) as rn_asc, row_number() over (partition by a.student_id order by t.closes_at desc) as rn_desc
    from test_attempts a join test_results r on r.attempt_id = a.id join teacher_tests t on t.id = a.test_id
    where t.results_published and not r.pending_manual and a.test_id in (select test_id from scoped) and a.student_id in (select uid from members) and (p_test is null or a.test_id = p_test)
  ), agg as (
    select uid, count(*)::int as n, sum(ob) as ob, sum(tt) as tt, case when sum(tt) > 0 then round(sum(ob) / sum(tt) * 100, 1) else 0 end as pc,
      case when count(*) >= 2 then round(max(pc) filter (where rn_desc = 1) - max(pc) filter (where rn_asc = 1), 1) end as imp from res group by uid
  )
  select (rank() over (order by g.pc desc))::bigint, g.uid, p.display_name, p.username, p.avatar_url, g.n, g.ob, g.tt, g.pc, g.imp,
    (select count(*)::int from achievements x where x.user_id = g.uid), g.uid = auth.uid()
  from agg g join profiles p on p.id = g.uid where p.role = 'student' and (p.show_on_leaderboard or g.uid = auth.uid()) order by 1, p.display_name;
end $$;

-- ============ K. Invitations (token never stored, only its SHA-256 hash) ============
create table if not exists invitations (
  id uuid primary key default gen_random_uuid(), inviter_id uuid not null references profiles on delete cascade, token_hash text not null unique,
  kind text not null default 'app' check (kind in ('app','class','group')), target_id uuid, expires_at timestamptz not null,
  max_uses int not null default 10 check (max_uses between 1 and 1000), uses int not null default 0, revoked boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists invitation_redemptions (invitation_id uuid not null references invitations on delete cascade, user_id uuid not null references profiles on delete cascade, redeemed_at timestamptz not null default now(), primary key (invitation_id, user_id));
alter table invitations enable row level security; alter table invitations force row level security;
alter table invitation_redemptions enable row level security; alter table invitation_redemptions force row level security;
drop policy if exists invitations_owner_select on invitations; drop policy if exists invitations_owner_update on invitations; drop policy if exists invitations_owner_delete on invitations;
create policy invitations_owner_select on invitations for select using (inviter_id = auth.uid());
create policy invitations_owner_delete on invitations for delete using (inviter_id = auth.uid());
-- (no insert/update policy: created via create_invitation, revoked via revoke_invitation; redemptions are not readable => no private data leak)
create or replace function create_invitation(p_hash text, p_kind text, p_target uuid, p_days int, p_max int) returns uuid language plpgsql security definer set search_path = public as $$
declare iid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid token'; end if;
  if p_days not between 1 and 30 or p_max not between 1 and 1000 then raise exception 'invalid limits'; end if;
  if (select count(*) from invitations where inviter_id = auth.uid() and not revoked and expires_at > now()) >= 20 then raise exception 'too many active invitations'; end if;
  if p_kind = 'class' and not teaches_class(p_target) then raise exception 'not allowed'; end if;
  if p_kind = 'group' and not in_group(p_target) then raise exception 'not allowed'; end if;
  if p_kind not in ('app','class','group') then raise exception 'invalid kind'; end if;
  insert into invitations (inviter_id, token_hash, kind, target_id, expires_at, max_uses) values (auth.uid(), p_hash, p_kind, p_target, now() + make_interval(days => p_days), p_max) returning id into iid;
  return iid;
end $$;
create or replace function revoke_invitation(p_id uuid) returns void language sql security definer set search_path = public as $$ update invitations set revoked = true where id = p_id and inviter_id = auth.uid() $$;
create or replace function invitation_info(p_hash text) returns table (inviter_name text, kind text, valid boolean) language sql stable security definer set search_path = public as $$
  select p.display_name, i.kind, (not i.revoked and i.expires_at > now() and i.uses < i.max_uses) from invitations i join profiles p on p.id = i.inviter_id where i.token_hash = p_hash $$;
create or replace function redeem_invitation(p_hash text) returns text language plpgsql security definer set search_path = public as $$
declare i invitations; me text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  perform check_code_throttle('invite');
  select * into i from invitations where token_hash = p_hash for update;
  if i.id is null or i.revoked or i.expires_at <= now() then perform log_code_attempt('invite', false); return null; end if;
  if i.inviter_id = auth.uid() then return 'self'; end if;
  if exists (select 1 from invitation_redemptions where invitation_id = i.id and user_id = auth.uid()) then return i.kind; end if;  -- already redeemed by this user: idempotent
  if i.uses >= i.max_uses then perform log_code_attempt('invite', false); return null; end if;
  insert into invitation_redemptions (invitation_id, user_id) values (i.id, auth.uid()); update invitations set uses = uses + 1 where id = i.id;
  select display_name into me from profiles where id = auth.uid();
  if i.kind = 'app' then
    begin insert into friend_requests (from_id, to_id) values (i.inviter_id, auth.uid()); exception when others then null; end;   -- a request to accept, never an automatic friendship
    perform notify(i.inviter_id, 'invite_used', me || ' joined LUMORA with your invitation', '/invite');
  elsif i.kind = 'class' and is_role('student') then insert into class_members (class_id, student_id) values (i.target_id, auth.uid()) on conflict do nothing;
    perform notify((select teacher_id from teacher_classes where id = i.target_id), 'class_join', me || ' joined your class', '/teacher/classes/' || i.target_id::text);
  elsif i.kind = 'group' then insert into group_members (group_id, user_id) values (i.target_id, auth.uid()) on conflict do nothing;
    perform notify((select owner_id from study_groups where id = i.target_id), 'group_join', me || ' joined your group', '/groups'); end if;
  return i.kind;
end $$;

-- ============ L. Account deletion request stays; delete function for messages/notes not needed (cascade) ============

-- Student-safe status flags for their own attempts (no marks leaked before publication)
create or replace function my_test_statuses() returns table (test_id uuid, attempt_id uuid, attempt_status text, pending_manual boolean, graded_any boolean, results_published boolean)
language sql stable security definer set search_path = public as $$
  select a.test_id, a.id, a.status, coalesce(r.pending_manual, false), coalesce(r.graded_any, false), t.results_published
  from test_attempts a join teacher_tests t on t.id = a.test_id left join test_results r on r.attempt_id = a.id where a.student_id = auth.uid() $$;

-- ============ M. Realtime publication (Realtime enforces RLS on what each subscriber receives) ============
do $$ declare t text; begin
  for t in select unnest(array['notifications','messages','friend_requests','friendships','group_members','class_members','note_shares','notes','test_attempts','test_results','teacher_tests','announcements','study_groups','flashcards','study_goals','questions']) loop
    begin execute format('alter publication supabase_realtime add table %I', t); exception when duplicate_object then null; when undefined_object then null; end;
  end loop;
end $$;
alter table notifications replica identity full; alter table messages replica identity full;

-- ============ N. Function privileges ============
do $$ declare f text; begin
  for f in select unnest(array['username_available(text)','invitation_info(text)']) loop execute format('revoke all on function %s from public', f); execute format('grant execute on function %s to anon, authenticated', f); end loop;
  for f in select unnest(array['search_users(text)','list_friends()','list_incoming_requests()','list_outgoing_requests()','list_blocked()','remove_friend(uuid)','block_user(uuid)','unblock_user(uuid)',
    'send_message(uuid,text)','mark_conversation_read(uuid)','conversation_list()','share_note(uuid,text,uuid,text)','shared_notes()','save_shared_note(uuid)','my_groups()','group_members_list(uuid)','group_shared_notes(uuid)',
    'join_group(text)','invite_friend_to_group(uuid,uuid)','join_class(text)','regenerate_class_code(uuid)','remove_class_member(uuid,uuid)','my_classes()','class_members_list(uuid)','class_shared_notes(uuid)',
    'post_announcement(uuid,text,text)','join_test_by_code(text)','regenerate_test_code(uuid)','start_test_attempt(uuid)','grade_answer(uuid,uuid,numeric,text)','publish_results(uuid)','get_result(uuid)',
    'refresh_my_reminders()','my_test_statuses()','leaderboard(text,uuid,uuid)','create_invitation(text,text,uuid,int,int)','revoke_invitation(uuid)','redeem_invitation(text)','claim_teacher_invite(text)',
    'are_friends(uuid)','is_blocked_pair(uuid,uuid)','note_access(uuid)','is_class_member(uuid)','teaches_class(uuid)','can_access_test(uuid)']) loop
    execute format('revoke all on function %s from public, anon', f); execute format('grant execute on function %s to authenticated', f); end loop;
  for f in select unnest(array['finalize_attempt(uuid,text)','recompute_result(uuid)','notify(uuid,text,text,text,jsonb)','check_code_throttle(text)','log_code_attempt(text,boolean)','gen_public_id()']) loop
    execute format('revoke all on function %s from public, anon, authenticated', f); end loop;
end $$;
