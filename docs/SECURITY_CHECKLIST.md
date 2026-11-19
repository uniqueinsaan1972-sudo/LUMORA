# Security checklist  (☑ = implemented in code, ☐ = must be done/verified before launch)
## Implemented
- ☑ Supabase Auth; server verifies JWT with `getUser()` in middleware and every page/action.
- ☑ RLS enabled+forced on all tables; explicit policies; role/suspension lock trigger; no client path to admin/teacher.
- ☑ Test timing authoritative on the server; one attempt per student; duplicate/late submission rejected; answers hidden until publication.
- ☑ Practice quiz scores calculated server-side (no direct insert policy).
- ☑ Zod validation on server actions; DB CHECK constraints; PostgREST parameterization (no string SQL).
- ☑ Generic login errors; no account enumeration on reset; open-redirect guard on auth callback; in-memory rate limits on auth/friends/search/join.
- ☑ CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy; notes rendered as text (no `dangerouslySetInnerHTML` of user content).
- ☑ Private storage bucket with per-user folder policies; mobile tokens in SecureStore.
## Added in the social upgrade (all covered by supabase/tests/rls_tests_social.sql)
- ☑ Admin role impossible at sign-up; role/teacher_verified/public_id immutable by users.
- ☑ Messages: RPC-only inserts, friends-only reads/writes, closes on block/unfriend, DB rate limit.
- ☑ Note sharing: owner-only share/revoke; editors cannot change ownership/pin/archive/folder; non-members get no access.
- ☑ Test/class/group/invite codes: DB throttle (8 wrong / 10 min), codes regenerable; invitation tokens stored only as SHA-256.
- ☑ Leaderboard: membership check, published+graded only, opt-out honored; no emails or private data exposed.
- ☑ Teacher actions audited (test create/publish, grading, class code/member changes, announcements, class note shares).
- ☑ Fixed RLS recursion on class tables.

## Must do before launch
- ☐ Run `supabase/tests/rls_tests.sql` and add more cases; fix any failure.
- ☐ Replace in-memory rate limiter with Redis/Upstash; set Supabase Auth rate limits and CAPTCHA.
- ☐ Enable email confirmation, leaked-password protection, MFA for teachers/admin.
- ☐ Attachment upload route with magic-byte validation + malware scan before enabling uploads.
- ☐ Penetration test / independent review; dependency audit (`npm audit`).
- ☐ Legal review of privacy policy/terms; parental-consent rules if minors use it.
- ☐ Monitoring (Sentry etc.) with PII scrubbing; backup + restore drill.
- ☐ Remove `'unsafe-inline'` from CSP by adopting nonces.
