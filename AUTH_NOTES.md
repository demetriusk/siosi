Auth & privacy notes

What I changed in-code:
- Added client auth UI pages: `app/[locale]/login`, `register`.
- Header now shows Login/Register when unauthenticated and Sessions/Profile + Logout when authenticated.
- Sessions are now created via a server API `app/api/sessions/route.ts` which accepts optional `user_id` and inserts into the `sessions` table.
- `lib/save-session.ts` and `lib/db.ts` updated to accept `user_id` when saving.
- `app/[locale]/sessions/page.tsx` is now a client component that fetches sessions for the current user using `.eq('user_id', userId)`.
- `app/[locale]/analyze/page.tsx` attempts to include the current user's id when creating a session.

Recommended Supabase changes (manual steps):
Run the provided SQL migrations in `supabase/migrations/` (or apply via Supabase SQL editor):

- `supabase/migrations/001_add_user_id.sql` — adds `user_id uuid` column and index
- `supabase/migrations/002_rls_sessions.sql` — enables row level security and adds SELECT/INSERT/UPDATE/DELETE policies so users only access their rows

Notes:
- Apply the migrations in a staging environment first and verify behavior before production.
- After applying RLS, client-side queries that don't include anon/public role will be restricted. Use your Supabase client with a valid session to query.
- If you need server-side inserts without a user context, use the Supabase service_role key in a server-only environment. Keep that key secret.

Next steps / follow-ups:
- Wire up a more robust auth state listener in `Header` (subscribe to `supabase.auth.onAuthStateChange`) so UI updates immediately after login/logout.
- Protect server API `/api/sessions` by validating a Supabase session cookie or using the Supabase service_role key if appropriate.
- Add tests covering session privacy and authenticated flows.

If you'd like, I can add SQL migration snippets and a minimal test for the sessions fetch flow.