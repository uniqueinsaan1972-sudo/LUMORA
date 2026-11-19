-- LUMORA schema. All tables live in public and are protected by RLS (see 0002).
create extension if not exists pgcrypto;
create type user_role as enum ('student','teacher','admin');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role user_role not null default 'student',
  display_name text not null check (char_length(display_name) between 1 and 80),
  username text unique check (username ~ '^[a-z0-9_]{3,24}$'),
  avatar_path text, grade text check (char_length(grade) <= 40), school text check (char_length(school) <= 120),
  subjects text[] not null default '{}',
  language text not null default 'en' check (language in ('en','ur','ar','hi','es','fr','zh')),
  theme text not null default 'system' check (theme in ('light','dark','system')),
  discoverable boolean not null default false,
  share_achievements boolean not null default false,
  suspended boolean not null default false,
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now()
);

create table user_preferences (
  user_id uuid primary key references profiles on delete cascade,
  notify_tests boolean not null default true, notify_friends boolean not null default true,
  notify_reminders boolean not null default true, notify_results boolean not null default true,
  daily_goal_minutes int not null default 30 check (daily_goal_minutes between 5 and 600)
);

create table subjects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  unique (owner_id, name)
);
create table chapters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  subject_id uuid not null references subjects on delete cascade,
  name text not null check (char_length(name) between 1 and 120)
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  title text not null default 'Untitled' check (char_length(title) <= 200),
  body text not null default '' check (char_length(body) <= 100000),
  subject text check (char_length(subject) <= 80), chapter text check (char_length(chapter) <= 120),
  folder text check (char_length(folder) <= 80),
  tags text[] not null default '{}',
  pinned boolean not null default false, bookmarked boolean not null default false, archived boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on notes (owner_id, archived, updated_at desc);
create table note_attachments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  note_id uuid not null references notes on delete cascade,
  storage_path text not null, mime text not null, size_bytes int not null check (size_bytes <= 5242880),
  created_at timestamptz not null default now()
);

create type question_type as enum ('mcq','short','long','definition','word_meaning','numerical','qa');
create table questions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  type question_type not null,
  prompt text not null check (char_length(prompt) between 1 and 5000),
  options jsonb check (options is null or jsonb_typeof(options) = 'array'),
  answer text check (char_length(answer) <= 10000),
  explanation text check (char_length(explanation) <= 10000),
  subject text, chapter text,
  important boolean not null default false, bookmarked boolean not null default false,
  status text not null default 'new' check (status in ('new','learned','revise')),
  created_at timestamptz not null default now()
);
create index on questions (owner_id, subject);

create table flashcards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  front text not null check (char_length(front) between 1 and 2000),
  back text not null check (char_length(back) between 1 and 5000),
  subject text, chapter text,
  bookmarked boolean not null default false,
  status text not null default 'new' check (status in ('new','learned','revise')),
  ease numeric not null default 2.5, interval_days int not null default 0, due_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index on flashcards (owner_id, due_at);

create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  subject text, chapter text,
  score int not null check (score >= 0), total int not null check (total > 0),
  details jsonb not null default '[]',
  created_at timestamptz not null default now(),
  check (score <= total)
);
create index on quiz_attempts (owner_id, created_at desc);

create table study_goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  kind text not null default 'daily' check (kind in ('daily','weekly','subject','exam')),
  subject text, due_date date,
  status text not null default 'open' check (status in ('open','done','missed')),
  created_at timestamptz not null default now()
);
create table study_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  subject text, minutes int not null check (minutes between 1 and 1440),
  studied_on date not null default current_date
);
create index on study_sessions (owner_id, studied_on);

create table vocabulary_words (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  word text not null check (char_length(word) between 1 and 80),
  meaning text check (char_length(meaning) <= 2000), meaning_ur text check (char_length(meaning_ur) <= 2000),
  example text, list_name text default 'My words',
  source text not null default 'user',
  created_at timestamptz not null default now(),
  unique (owner_id, word)
);

create table teacher_invites (
  code text primary key check (char_length(code) >= 8),
  created_at timestamptz not null default now(), used_by uuid references profiles, used_at timestamptz
);
create table teacher_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  join_code text not null unique default encode(gen_random_bytes(5), 'hex'),
  created_at timestamptz not null default now()
);
create table class_members (
  class_id uuid not null references teacher_classes on delete cascade,
  student_id uuid not null references profiles on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);
create table teacher_tests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  instructions text check (char_length(instructions) <= 5000),
  subject text, duration_minutes int not null check (duration_minutes between 1 and 600),
  passing_marks numeric not null default 0 check (passing_marks >= 0),
  opens_at timestamptz not null, closes_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft','published','cancelled')),
  results_published boolean not null default false,
  created_at timestamptz not null default now(),
  check (closes_at > opens_at)
);
create table test_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references teacher_tests on delete cascade,
  position int not null,
  kind text not null check (kind in ('mcq','true_false','short','long')),
  prompt text not null check (char_length(prompt) between 1 and 5000),
  options jsonb, correct_answer text,
  marks numeric not null default 1 check (marks > 0),
  explanation text,
  unique (test_id, position)
);
create table test_assignments (
  test_id uuid not null references teacher_tests on delete cascade,
  class_id uuid not null references teacher_classes on delete cascade,
  primary key (test_id, class_id)
);
create table test_attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references teacher_tests on delete cascade,
  student_id uuid not null references profiles on delete cascade,
  started_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  submitted_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress','submitted','expired')),
  unique (test_id, student_id)
);
create table test_answers (
  attempt_id uuid not null references test_attempts on delete cascade,
  question_id uuid not null references test_questions on delete cascade,
  answer text check (char_length(answer) <= 20000),
  auto_marks numeric, awarded_marks numeric, feedback text check (char_length(feedback) <= 5000),
  updated_at timestamptz not null default now(),
  primary key (attempt_id, question_id)
);
create table test_results (
  attempt_id uuid primary key references test_attempts on delete cascade,
  total_marks numeric not null, obtained_marks numeric not null default 0,
  pending_manual boolean not null default false
);

create table friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references profiles on delete cascade,
  to_id uuid not null references profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  check (from_id <> to_id), unique (from_id, to_id)
);
create table friendships (
  user_a uuid not null references profiles on delete cascade,
  user_b uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b), check (user_a < user_b)
);
create table blocks (
  blocker_id uuid not null references profiles on delete cascade,
  blocked_id uuid not null references profiles on delete cascade,
  primary key (blocker_id, blocked_id), check (blocker_id <> blocked_id)
);
create table study_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now()
);
create table group_members (
  group_id uuid not null references study_groups on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  primary key (group_id, user_id)
);
create table challenges (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references profiles on delete cascade,
  to_id uuid not null references profiles on delete cascade,
  subject text, created_at timestamptz not null default now()
);
create table achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  code text not null, earned_at timestamptz not null default now(), unique (user_id, code)
);
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  kind text not null, message text not null, read boolean not null default false,
  created_at timestamptz not null default now()
);
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles on delete cascade,
  target_user uuid references profiles on delete set null,
  reason text not null check (char_length(reason) between 5 and 2000),
  status text not null default 'open' check (status in ('open','reviewed','closed')),
  created_at timestamptz not null default now()
);
create table audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid, action text not null, target text, created_at timestamptz not null default now()
);
