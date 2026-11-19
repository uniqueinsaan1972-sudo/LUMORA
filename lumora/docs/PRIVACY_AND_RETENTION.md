# Privacy & retention (draft policy to implement)
- Data collected: email, display name, optional grade/school, user-created study content, quiz/test results.
- Visibility: private by default; discoverable=false by default; emails never exposed to other users; teachers see only their class members + test data.
- Export: Settings → Download my data (`export_my_data()`).
- Deletion: request sets `profiles.deletion_requested_at`. An operator deletes the auth user within 30 days (`delete from auth.users where id=...` cascades to all user data).
- Uploads/OCR temp files (when built): delete within 24 hours of processing.
- Audit logs: keep 12 months; never log passwords, tokens or note contents.
- Minors: obtain required parental consent per local law before onboarding under-age users.
