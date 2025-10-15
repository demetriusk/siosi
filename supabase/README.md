# Supabase database notes

This app persists data in Supabase. Anytime you pull updates from `main`, peek at the SQL scripts in `supabase/migrations/`—you may need to reapply them to keep your instance in sync.

## Session save feature (October 2025)

New routes now let users save each others' sessions. Make sure your database has:

- A `save_count` column on `public.sessions`
- A `public.session_saves` table with RLS policies

Run the migration with the Supabase CLI (requires the project to be linked first):

```bash
supabase db push
```

If you're using a local Postgres instance, execute the SQL directly instead.
