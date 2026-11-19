# Database setup
1. Supabase SQL Editor → run in order: `0001_schema.sql`, `0002_rls.sql`, `0003_functions.sql`.
2. Authentication → Providers → Email: enable "Confirm email". Set password minimum to 10.
3. Storage: bucket `note-attachments` is created (private, 5 MB, jpeg/png/webp/pdf). Attachment UI is not built yet.
4. `FORCE ROW LEVEL SECURITY` is enabled; Supabase's `postgres` role has BYPASSRLS so SECURITY DEFINER functions work. Do not run migrations as a role without BYPASSRLS.
5. Optional: enable `pg_cron` to finalize expired attempts proactively:
   `select cron.schedule('expire-attempts','* * * * *', $$ select finalize_attempt(id,'expired') from test_attempts where status='in_progress' and now() > deadline_at + interval '15 seconds' $$);`
   (Without it, expiry is applied lazily on the student's next request or when a teacher publishes results.)
6. Run `supabase/tests/rls_tests.sql` on staging.
