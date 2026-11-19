# LUMORA — Where Learning Meets Possibility.

Secure education platform for students and teachers. **Web:** Next.js 14 + TypeScript + Tailwind. **Backend:** Supabase (Postgres, Auth, Storage, RLS). **Android:** Expo starter.

> **Status: working foundation (alpha), NOT production-ready.** See `docs/KNOWN_LIMITATIONS.md` for exactly what is and isn't built, and `docs/SECURITY_CHECKLIST.md` for what must be verified before launch.

## Structure
```
web/        Next.js app (App Router, server actions, Supabase SSR auth)
mobile/     Expo (Android) starter: login, notes, flashcards
supabase/   migrations (schema, RLS, RPC functions) + SQL security tests
docs/       setup, security checklist, privacy/retention, known limitations
```

## Quick start
1. Create a free project at https://supabase.com. From *Project Settings → API* copy the **Project URL** and **anon public key**.
2. Apply the database (see `docs/DATABASE_SETUP.md`): run `supabase/migrations/0001_schema.sql`, `0002_rls.sql`, `0003_functions.sql` in order (SQL Editor, or `supabase db push` with the CLI).
3. Web:
   ```bash
   cd web && cp .env.example .env.local   # fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
   npm install && npm run dev             # http://localhost:3000
   npm test                               # unit tests (scoring, streaks, spaced repetition)
   ```
4. In Supabase *Authentication → URL Configuration* set Site URL `http://localhost:3000` and add `http://localhost:3000/auth/callback` to Redirect URLs.
5. **First teacher:** there is no default admin/teacher. Create an invite in the SQL editor, then register with that code:
   ```sql
   insert into teacher_invites (code) values ('choose-a-long-random-code');
   ```
6. **Admin (optional, manual only):**
   ```sql
   select set_config('lumora.role_change','1',false);
   update profiles set role='admin' where id='<user uuid>';
   ```
7. Mobile: `cd mobile && cp .env.example .env && npm install && npx expo start --android` (needs Android emulator/device or Expo Go).

## Testing
- Unit: `cd web && npm test`. Typecheck: `npm run typecheck`. Build: `npm run build`.
- Database security tests: `psql "$DATABASE_URL" -f supabase/tests/rls_tests.sql` against a **local/staging** DB (rolls back; prints `ALL SECURITY TESTS PASSED`). **These have not been executed yet — run them and fix any failure before trusting the policies.**

## Deployment
Web: Vercel (set the two public env vars; set `NEXT_PUBLIC_SITE_URL` to your https domain; update Supabase redirect URLs). Database: your Supabase project. Enable backups (Supabase Pro PITR or scheduled `pg_dump`). Mobile: `eas build -p android`.

## Key security design
- RLS on every table (default deny); role column locked by trigger; teacher role only via one-time invite.
- Timed tests: attempts/answers can only be written through `SECURITY DEFINER` functions using server `now()`. Correct answers never reach students before results are published.
- Private storage bucket, per-user folders; validation with Zod on every server action; generic auth errors; CSP + security headers.
