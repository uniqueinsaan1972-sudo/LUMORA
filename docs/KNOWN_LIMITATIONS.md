# Known limitations (honest status)

## Not verified in this environment
Real Supabase behaviour (Realtime delivery, Storage uploads, email), actual rendering in browsers/phones, Urdu RTL appearance, animation smoothness on low-end devices, Lighthouse/axe scores, the Android app. Database logic **was** executed and tested on real PostgreSQL.

## Product gaps
- **Not built:** Handwriting Improvement Studio (needs an OCR provider), admin panel UI, note attachments UI, vocabulary quizzes, friend quiz *challenges* (tables exist), service worker/offline mode (PWA = manifest + icons only), end-to-end browser tests.
- **Android app:** launcher icon/splash updated; the app is still the starter (login, notes, flashcards). Messaging/friends/classes are web-only for now.
- **Languages:** only English + Urdu have reviewed strings, and only navigation/major labels are translated; page content is English. RTL layout works.
- **Not optimistic yet:** planner, vocabulary, grading forms (they update when the server answers; no page reload).
- **Teacher sign-up:** as requested, anyone may choose "Teacher" at registration. Teachers only affect their own classes/tests, but consider requiring approval (teacher_verified badge is awarded by invite code today).
- **Group invitations** add a notification with a join link; there is no separate pending-invite state. Students cannot share notes to a class (teachers only).
- **Reminders** are generated when a student opens Quizzes/Notifications (no background scheduler). Enable `pg_cron` for true scheduled reminders.
- **Message status:** sent / read only (no "delivered" state). History is capped to the latest 60 messages per open thread (no infinite scroll yet).

## Security notes
- Presence and typing indicators use Realtime *broadcast/presence* channels that are not RLS-protected (they carry only user IDs / a "typing" event, and presence is shared only if the user's privacy setting allows). Message content is never sent over them.
- Server-action rate limits are in-memory per server instance (use Redis/Upstash in production). Code guessing (test/class/group/invite codes), messages and invitations are throttled **in the database**. Reads through browser RPCs (e.g. user search) are not rate-limited.
- Avatars live in a **public-read** bucket (unguessable path under the user's id). Image type is checked by file signature in the browser and by the bucket's MIME allow-list; there is no malware scan.
- Online tests can't be made cheat-proof: protections are server timing, one attempt, hidden answers.
- Email enumeration: sign-up errors are generic except username availability (needed for the live check).
- See `docs/SECURITY_CHECKLIST.md` for the pre-launch list.
