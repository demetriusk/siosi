-- 001_add_user_id.sql
-- Add user_id column to sessions (nullable for migration)
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS user_id uuid NULL;

-- Add index for faster lookup
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions (user_id);
