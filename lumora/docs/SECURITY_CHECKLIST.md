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
## Must do before launch
- ☐ Run `supabase/tests/rls_tests.sql` and add more cases; fix any failure.
- ☐ Replace in-memory rate limiter with Redis/Upstash; set Supabase Auth rate limits and CAPTCHA.
- ☐ Enable email confirmation, leaked-password protection, MFA for teachers/admin.
- ☐ Attachment upload route with magic-byte validation + malware scan before enabling uploads.
- ☐ Penetration test / independent review; dependency audit (`npm audit`).
- ☐ Legal review of privacy policy/terms; parental-consent rules if minors use it.
- ☐ Monitoring (Sentry etc.) with PII scrubbing; backup + restore drill.
- ☐ Remove `'unsafe-inline'` from CSP by adopting nonces.
