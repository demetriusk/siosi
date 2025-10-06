-- 002_rls_sessions.sql
-- Enable row level security and add policies for sessions table

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Allow full access to the service_role (if you use it) via a policy that checks for a custom claim or role.
-- For general authenticated users, allow SELECT only for rows that belong to the user
CREATE POLICY "select_own_sessions" ON public.sessions
FOR SELECT
USING (user_id IS NOT NULL AND auth.uid() = user_id);

-- Allow INSERT where the user_id equals the authenticated user
CREATE POLICY "insert_own_sessions" ON public.sessions
FOR INSERT
WITH CHECK (user_id IS NOT NULL AND auth.uid() = user_id);

-- Optionally, allow authenticated users to update/delete only their rows
CREATE POLICY "update_own_sessions" ON public.sessions
FOR UPDATE
USING (user_id IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (user_id IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "delete_own_sessions" ON public.sessions
FOR DELETE
USING (user_id IS NOT NULL AND auth.uid() = user_id);

-- Note: If you want server processes to insert sessions without a user context,
-- consider using the Supabase service_role key on the server and keep RLS active.
