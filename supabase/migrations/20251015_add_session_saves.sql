-- Session saves feature migration
-- Run with Supabase CLI: supabase db push

begin;

-- 1. Ensure sessions table has a save_count column for cached totals
alter table public.sessions
  add column if not exists save_count integer not null default 0;

-- Backfill any existing rows to zero (avoids nulls when column just added)
update public.sessions
set save_count = coalesce(save_count, 0);

-- 2. Create session_saves join table for user bookmarked sessions
create table if not exists public.session_saves (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh on change
create or replace function public.touch_session_saves_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger session_saves_touch_updated_at
before update on public.session_saves
for each row
execute procedure public.touch_session_saves_updated_at();

-- Prevent duplicate saves per user/session
create unique index if not exists session_saves_session_user_key
  on public.session_saves(session_id, user_id);

-- Optional helper index for listing a user's saves quickly
create index if not exists session_saves_user_id_idx
  on public.session_saves(user_id desc, created_at desc);

-- Optional helper index for counting saves per session
create index if not exists session_saves_session_id_idx
  on public.session_saves(session_id);

-- 3. RLS policies (leave table open to authenticated users only)
alter table public.session_saves enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'session_saves'
      and policyname = 'Allow users to view their own saves'
  ) then
    create policy "Allow users to view their own saves"
      on public.session_saves for select
      using (auth.uid() = user_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'session_saves'
      and policyname = 'Allow users to upsert their own saves'
  ) then
    create policy "Allow users to upsert their own saves"
      on public.session_saves for insert
      with check (auth.uid() = user_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'session_saves'
      and policyname = 'Allow users to delete their own saves'
  ) then
    create policy "Allow users to delete their own saves"
      on public.session_saves for delete
      using (auth.uid() = user_id);
  end if;
end;
$$;

commit;
