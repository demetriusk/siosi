#!/usr/bin/env node
/*
  Simple integration test (manual run)
  Requires env:
    TEST_SUPABASE_URL
    TEST_SUPABASE_ANON_KEY
    TEST_SUPABASE_SERVICE_ROLE_KEY

  Run: TEST_SUPABASE_URL=... TEST_SUPABASE_ANON_KEY=... TEST_SUPABASE_SERVICE_ROLE_KEY=... node scripts/integration-test.js

*/

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

async function run() {
  const url = process.env.TEST_SUPABASE_URL;
  const anon = process.env.TEST_SUPABASE_ANON_KEY;
  const service = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon || !service) {
    console.error('Missing TEST_SUPABASE_* env vars');
    process.exit(2);
  }

  const supabase = createClient(url, anon);

  const email = `testuser+${Date.now()}@example.com`;
  const password = 'password123!';

  console.log('Signing up user', email);
  const { data: _signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
  if (signUpError) {
    console.error('Sign up error', signUpError);
    process.exit(1);
  }

  // Sign in to get access token
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    console.error('Sign in error', signInError);
    process.exit(1);
  }

  const accessToken = signInData?.session?.access_token;
  if (!accessToken) {
    console.error('No access token');
    process.exit(1);
  }

  console.log('Posting session via /api/sessions with token...');

  const payload = {
    photo_url: 'https://example.com/dummy.jpg',
    analyses: [],
    overall_score: 5.5,
    confidence_avg: 60,
    critical_count: 0
  };

  const res = await fetch('http://localhost:3000/api/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  const resp = await res.json();
  console.log('API response:', resp);

  if (!resp?.id) {
    console.error('Failed to create session');
    process.exit(1);
  }

  // Verify with service_role key
  const svc = createClient(url, service);
  const { data: rows, error: rowsErr } = await svc.from('sessions').select('*').eq('id', resp.id).single();
  if (rowsErr) {
    console.error('Error fetching session with service_role', rowsErr);
    process.exit(1);
  }

  console.log('Inserted session row (service role):', rows);
  if (!rows.user_id) {
    console.error('user_id not set on inserted session');
    process.exit(1);
  }

  console.log('Integration test passed — session associated with user:', rows.user_id);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
