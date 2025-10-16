-- Colorimetry guidance table
-- Run with: supabase db push

begin;

create table if not exists public.colorimetry (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  photo_undertone text not null check (photo_undertone in ('warm', 'cool', 'neutral')),
  photo_detected jsonb not null default '[]'::jsonb,
  photo_recommended jsonb not null default '[]'::jsonb,
  photo_avoid jsonb not null default '[]'::jsonb,
  photo_notes text,
  profile_undertone text check (profile_undertone in ('warm', 'cool', 'neutral') or profile_undertone is null),
  profile_recommended jsonb default '[]'::jsonb,
  profile_avoid jsonb default '[]'::jsonb,
  profile_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id)
);

-- Ensure legacy tables have the same defaults/constraints
alter table public.colorimetry
  alter column id set default gen_random_uuid(),
  alter column photo_detected set default '[]'::jsonb,
  alter column photo_recommended set default '[]'::jsonb,
  alter column photo_avoid set default '[]'::jsonb,
  alter column created_at set default now(),
  alter column updated_at set default now();

update public.colorimetry
set photo_detected = '[]'::jsonb
where photo_detected is null;

update public.colorimetry
set photo_recommended = '[]'::jsonb
where photo_recommended is null;

update public.colorimetry
set photo_avoid = '[]'::jsonb
where photo_avoid is null;

create index if not exists idx_colorimetry_session_id on public.colorimetry(session_id);

create or replace function public.touch_colorimetry_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger colorimetry_set_updated_at
before update on public.colorimetry
for each row
execute procedure public.touch_colorimetry_updated_at();

alter table public.colorimetry enable row level security;

-- Allow reads from anywhere (sessions are already public)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'colorimetry'
      and policyname = 'Colorimetry is publicly readable'
  ) then
    create policy "Colorimetry is publicly readable"
      on public.colorimetry for select
      using (true);
  end if;
end;
$$;

-- Allow inserts from service role / edge functions
-- (client inserts are protected by storage rules and tokens)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'colorimetry'
      and policyname = 'Colorimetry is insertable'
  ) then
    create policy "Colorimetry is insertable"
      on public.colorimetry for insert
      with check (true);
  end if;
end;
$$;

-- Allow updates for service processes
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'colorimetry'
      and policyname = 'Colorimetry is updatable'
  ) then
    create policy "Colorimetry is updatable"
      on public.colorimetry for update
      using (true)
      with check (true);
  end if;
end;
$$;

commit;
