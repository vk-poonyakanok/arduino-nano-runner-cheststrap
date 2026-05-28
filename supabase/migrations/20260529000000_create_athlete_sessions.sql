create extension if not exists pgcrypto;

create table if not exists public.athlete_sessions (
  session_id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  mode text not null default 'demo' check (mode in ('demo', 'ble')),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_s integer not null default 0,
  distance_km double precision not null default 0,
  good_pct double precision not null default 0,
  good_windows integer not null default 0,
  bad_windows integer not null default 0,
  packet_count integer not null default 0,
  avg_cadence double precision,
  avg_vo_cm double precision,
  avg_gct_ms double precision,
  avg_vgrf_bw double precision,
  avg_peak_vgrf_bw double precision,
  avg_lean_deg double precision,
  avg_asym_pct double precision,
  avg_heel_likelihood double precision,
  foot_strike_dominant text check (foot_strike_dominant in ('heel', 'midfoot') or foot_strike_dominant is null),
  environment_summary jsonb not null default '{}'::jsonb,
  packets jsonb not null default '[]'::jsonb,
  upload_source text not null default 'formwings-web',
  client_version text,
  created_at timestamptz not null default now()
);

create index if not exists athlete_sessions_created_at_idx
  on public.athlete_sessions (created_at desc);

create index if not exists athlete_sessions_user_created_at_idx
  on public.athlete_sessions (user_id, created_at desc);

alter table public.athlete_sessions enable row level security;

drop policy if exists "anon demo inserts athlete sessions" on public.athlete_sessions;
create policy "anon demo inserts athlete sessions"
  on public.athlete_sessions
  for insert
  to anon
  with check (user_id is null);

drop policy if exists "authenticated users insert own athlete sessions" on public.athlete_sessions;
create policy "authenticated users insert own athlete sessions"
  on public.athlete_sessions
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "authenticated users read own athlete sessions" on public.athlete_sessions;
create policy "authenticated users read own athlete sessions"
  on public.athlete_sessions
  for select
  to authenticated
  using (user_id = auth.uid());
