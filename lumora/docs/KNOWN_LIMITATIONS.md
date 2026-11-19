# Known limitations — honest status per phase
## Phase 1 Foundation — DONE (untested against a live Supabase project)
Brand/logo, light/dark theme, schema, RLS, auth (register/login/logout/reset/global sign-out), roles, responsive nav, dashboards. Profile photo upload NOT built.
## Phase 2 Core learning — MOSTLY DONE
Notes (autosave, search, pin/bookmark/archive, tags, pagination), Questions bank, Flashcards (flip, prev/next/random, practice/revision, spaced repetition, add/edit/delete), practice quizzes, planner, performance.
Missing: note attachments UI, rich-text formatting (plain text only, by design for XSS safety), note folders UI/filters beyond field, question→quiz selection of specific questions, true/false & short answers in *practice* quizzes (only MCQ is scored), difficulty levels, chapter-wise stats, "learning achievements".
## Phase 3 Teacher system — DONE core
Classes, test builder, assignment, server-timed attempts, autosave, grading, publish results, basic analytics (class average). Missing: edit published tests, per-student assignment, cheating-detection signals, CSV export. Online tests cannot be made cheat-proof; mitigations are server timing, one attempt, hidden answers.
## Phase 4 Community — PARTIAL
Friend search (opt-in discoverable), requests, accept/reject, remove, block, report. NOT built: study groups UI, sharing notes/quizzes, challenges, leaderboards (tables exist).
## Phase 5 Advanced — PARTIAL
Vocabulary lab (dictionaryapi.dev lookup, save, user-entered Urdu meaning, word of the day from saved words), Comeback Mode (data-driven, needs ≥3 quizzes/subject). NOT built: Handwriting Improvement Studio (needs an OCR provider + secure Edge Function — nothing is faked), vocabulary quizzes, advanced analytics. Languages: only English + Urdu have reviewed strings; Arabic/Hindi/Spanish/French/Chinese deliberately disabled until human-reviewed translations exist.
## Phase 6 Release — NOT DONE
No admin panel UI, no e2e tests, no accessibility audit, no load testing, no Play Store build. Mobile app is a minimal starter (login, notes, flashcards) and has not been run.
## Verification status
Verified here: TypeScript typecheck, `next build`, unit tests (scoring/streak/SM-2). SQL syntax parsed. **Not verified: SQL executed on a real Postgres, RLS tests, any runtime flow in a browser, the Expo app.** Expect to fix some bugs on first run.

## UI transformation (premium design pass)
Verified: typecheck, ESLint, build, unit tests, and a production-server smoke test (public pages 200, protected routes redirect, aurora/markup rendered).
**Not verified:** visual appearance in a real browser/device, Urdu RTL appearance, animation smoothness on low-end Android, Lighthouse/axe accessibility scores. Please review every page in both themes and on a phone, and report anything that looks off.
Accordions use `<details>` with a fade/slide reveal (height does not animate). Dashboard/performance charts are simple bar charts built from real data (no chart library). The collapsed-sidebar tooltips are hover/focus based.
