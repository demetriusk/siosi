Integration test

This repo includes a small manual integration test script at `scripts/integration-test.js`.

Purpose:
- Create a temporary user in a test Supabase project.
- Sign in, obtain an access token.
- POST a session to `/api/sessions` using that access token.
- Use the service role to fetch the inserted session and assert `user_id` is set.

Environment variables required:
- TEST_SUPABASE_URL
- TEST_SUPABASE_ANON_KEY
- TEST_SUPABASE_SERVICE_ROLE_KEY

How to run (locally):

1) Start your Next dev server at http://localhost:3000

2) Run the script with test Supabase credentials:

TEST_SUPABASE_URL=https://your-project.supabase.co \
TEST_SUPABASE_ANON_KEY=... \
TEST_SUPABASE_SERVICE_ROLE_KEY=... \
node scripts/integration-test.js

Notes:
- Ensure CORS and Supabase project configuration allow the test flow.
- The script is intentionally minimal and intended to run in CI or local dev; expand it as needed for your CI environment.
