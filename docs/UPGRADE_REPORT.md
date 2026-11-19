# LUMORA — Social Learning Upgrade: Report

## How this was verified (read this first)
| Check | Result |
|---|---|
| All 4 migrations executed on a **real PostgreSQL 16** (with Supabase-style stubs for `auth`, `storage`, roles, `supabase_realtime`) | ✅ clean |
| `supabase/tests/rls_tests.sql` (original security tests, incl. timed-test deadline, duplicate submission, IDOR) | ✅ ALL PASSED |
| `supabase/tests/rls_tests_social.sql` (≈110 new assertions: sign-up hardening, friends, messaging, note sharing, groups, classes, tests/codes/grading, leaderboard, invitations, block) | ✅ ALL PASSED |
| TypeScript typecheck, ESLint, production `next build` (all 44 routes), 10 unit tests | ✅ |
| HTTP smoke test: public pages 200, protected pages redirect to /login, logo/favicon/manifest/PWA icons served without a session | ✅ |
| **Not verified:** running against a real Supabase project (Realtime delivery, Storage uploads, email), looking at the UI in a real browser/phone, the Android app | ⚠️ you must test these |

Bugs found *by the new tests* and fixed: infinite RLS recursion on `teacher_classes`/`class_members` (would have broken classes and class-assigned tests); column defaults failing for normal users; invitation re-open rejected after use; logo/manifest redirected to login for logged-out users; stale Router Cache (the "I have to refresh" bug).

## 1. Instant UI updates (no refresh)
Root causes found in the audit: (a) Next.js client Router Cache served stale pages after `redirect()`/back-navigation; (b) mutations waited for the server before the UI changed; (c) no realtime.
Fixes: `staleTimes.dynamic = 0`; `useList` optimistic hook (apply instantly → server action → **roll back + toast on failure**, duplicate-submit guard); Supabase **Realtime** subscriptions (`useLive`) for friends, requests, messages, notifications, groups, class members, leaderboards; `LiveRefresh` soft-refreshes dashboards/teacher pages when attempts/results change. No `window.location.reload` anywhere.
Optimistic: notes, flashcards, questions, friends/requests/blocks, groups, classes, announcements, invitations, notifications, messages. Plain server-action + revalidate (updates when the server answers, with spinners): planner, vocabulary, teacher grading.

## 2. Branding
Your approved logo is used unmodified: sidebar, mobile header, login/register/onboarding/landing, favicon (`app/favicon.ico`, `app/icon.png`), Apple touch icon, PWA manifest (192/512/maskable), Android launcher icon + adaptive icon + splash (`mobile/assets`, `mobile/app.json`). Maskable/adaptive variants pad the same artwork on a blurred copy of itself (no redraw).

## 3. Authentication
Redesigned register: full name, **unique username (live availability check)**, auto-generated unique **User ID** (`LUM-XXXXXXXX`), email, password + confirm, show/hide, **strength meter**, Student/Teacher cards, terms/privacy checkbox, email verification, inline validation. Profile picture is added in **onboarding** (a signed-out user cannot upload before verifying email). Separate student / teacher onboarding (3 steps). Admin can never be self-selected (DB trigger enforces; tested).

## 4–6. Student / teacher / tests / classes / leaderboards
- Teacher: classes with description + join code (regenerate), member management (remove), announcements (notify students), share notes to class, groups, tests with all six question types (MCQ, True/False, Fill-in-the-blank [auto-graded, `|` alternatives], Short, Long, Definition), description, instructions, total/passing marks, window, duration, **unique access code** (regenerate), assign to classes **and/or groups**, grading, publish (blocked until all written answers graded), stats.
- Student: join class by code, join test by code (**throttled: 8 wrong codes / 10 min**), 7 statuses (Upcoming, Active, Submitted, Under Evaluation, Graded, Results Published, Expired) computed from safe flags — no marks leak before publication. Server remains the timing authority (unchanged, re-tested).
- Leaderboard: real published+graded results only; filter by class/group/test; **ties share a rank**; shows marks, %, tests completed, improvement, achievements; opt-out respected; outsiders blocked.

## 7–8. Friends & messaging
Search by username or User ID, request/accept/reject/**cancel**/remove/block/unblock/report, duplicate + self + reverse-duplicate prevented, notifications both ways. Messaging: friends-only, DB-enforced (RPC only; direct inserts denied), 2000-char limit, 30 msg/min limit, timestamps, unread counts, read receipts (sent ✓ / read ✓✓), typing indicator, presence (only if both privacy settings allow), retry on failure, mobile layout. Conversation closes on unfriend/block.

## 9–11. Notes sharing, invitations, notifications
Share with friends / groups / classes (teachers) with view or edit; revoke; "Shared with me" tab; save a copy. Non-owners can never change ownership/pin/archive/folder (trigger, tested). Invitations: 192-bit token, **only SHA-256 hash stored**, expiry + max uses, revoke, usage count only (no redeemer identity), copy / WhatsApp / SMS / Email / native share — the UI never claims "sent", only that the app was opened. Notification center: realtime, unread badge, mark-all-read, click-through; types: friend request/accept, messages, group/class join & invites, new tests, reminders, results, shared notes, announcements.

## Database (migration `0004_social.sql`)
New: `messages`, `note_shares`, `announcements`, `invitations`, `invitation_redemptions`, `test_access`, `test_group_assignments`, `code_attempts`, `reminder_log`; extended `profiles` (public_id, onboarded, avatar_url, show_online, show_on_leaderboard, teacher_verified, terms_accepted_at), `teacher_tests` (description, access_code), `test_questions` (new kinds), `test_results` (graded_any), `study_groups`, `teacher_classes`, `notifications`. ~45 functions. RLS on every new table; Realtime publication; `avatars` bucket.

## Remaining limitations → see `docs/KNOWN_LIMITATIONS.md`

## Exact setup
1. **Database:** Supabase → SQL Editor → run `supabase/migrations/0004_social.sql` (0001–0003 are already applied). Run once.
2. **Auth settings:** Authentication → Providers → Email → keep "Confirm email" on (or off while developing). URL Configuration → Site URL `http://localhost:3000`; Redirect URLs add `http://localhost:3000/auth/callback`.
3. **Realtime:** Database → Publications → `supabase_realtime` should list notifications, messages, friend_requests, friendships, group_members, class_members … (the migration adds them). If Realtime is disabled for your project, enable it.
4. **Web:** replace your `web` folder with the new one, keep your `.env.local`, then `npm install && npm run dev`.
5. **Test it with two accounts** (use two browsers): register A (student) and B (student) → complete onboarding → A searches B's username → B accepts (instantly appears for B) → chat both ways → A shares a note with B (edit) → B edits → A revokes. Register a teacher → create class → copy code → students join → create test (publish) → student takes it → teacher grades → publish → check leaderboard.
6. **Security tests:** `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_tests.sql` then `rls_tests_social.sql` against a **staging** database (they roll back).
7. **Mobile:** `cd mobile && npm install && npx expo start --android` (icons only updated; see limitations).
