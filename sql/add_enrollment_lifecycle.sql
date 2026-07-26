-- =============================================================================
-- Student Enrollment Lifecycle — Additive Schema
-- Run this in Supabase SQL Editor.
-- All statements are idempotent; safe to re-run.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1.1 New columns on profiles
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists roll_number        text,
  add column if not exists enrollment_number  text,
  add column if not exists college_email      text,
  add column if not exists branch             text,
  add column if not exists section            text,
  add column if not exists academic_year      smallint,   -- 1, 2, 3, 4
  add column if not exists batch_year         smallint,   -- admission year, immutable
  add column if not exists enrollment_status  text not null default 'active';
  -- enrollment_status values: 'active' | 'dropped' | 'graduated'
  -- NOTE: This is SEPARATE from profiles.status (platform moderation).
  --       Do NOT conflate the two.

-- Partial unique index: one enrollment_number globally (NULLs excluded)
create unique index if not exists profiles_enrollment_number_unique
  on public.profiles (enrollment_number)
  where enrollment_number is not null;

-- Partial unique index: one college_email globally (NULLs excluded)
create unique index if not exists profiles_college_email_unique
  on public.profiles (college_email)
  where college_email is not null;

-- Partial unique index: roll_number uniqueness scoped to active students
-- in the same branch+section+academic_year. Allows the same roll number to
-- be reused across cohorts (different batch_year or after a student drops).
create unique index if not exists profiles_active_roll_number_unique
  on public.profiles (branch, section, academic_year, roll_number)
  where enrollment_status = 'active' and roll_number is not null;

-- ---------------------------------------------------------------------------
-- 1.2 roll_number_history — audit trail for every roll number ever held
-- ---------------------------------------------------------------------------

create table if not exists public.roll_number_history (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  roll_number  text not null,
  branch       text not null,
  section      text not null,
  academic_year smallint not null,
  valid_from   date not null default current_date,
  valid_to     date,          -- NULL means currently active for this profile
  created_at   timestamptz not null default now()
);

-- Index for per-profile lookups
create index if not exists roll_number_history_profile_id_idx
  on public.roll_number_history (profile_id);

-- Index for reverse lookup (who had this roll number at this time?)
create index if not exists roll_number_history_lookup_idx
  on public.roll_number_history (branch, section, academic_year, roll_number);

-- RLS: students read their own rows; all writes go through service-role (backend)
alter table public.roll_number_history enable row level security;

drop policy if exists "roll_number_history_select_own" on public.roll_number_history;
create policy "roll_number_history_select_own"
  on public.roll_number_history for select
  using (profile_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies — writes happen via supabaseAdmin (service role)
-- which bypasses RLS entirely.

-- ---------------------------------------------------------------------------
-- 1.3 batch_promotions — audit log for each promote-batch run
-- ---------------------------------------------------------------------------

create table if not exists public.batch_promotions (
  id              uuid primary key default gen_random_uuid(),
  run_by          uuid not null references public.profiles(id),
  branch          text not null,
  section         text not null,
  from_year       smallint not null,
  to_year         smallint not null,
  total_rows      int not null default 0,
  matched_count   int not null default 0,
  unmatched_count int not null default 0,
  unmatched_rows  jsonb,       -- array of { rollNumber, reason, ... }
  created_at      timestamptz not null default now()
);

-- RLS: no direct client access; all reads/writes via service-role (backend)
alter table public.batch_promotions enable row level security;

-- Admin-only read via service-role; no client-facing policies needed.
-- (The backend never exposes this table directly to the browser.)

-- ---------------------------------------------------------------------------
-- 1.4 New columns on invite_codes
-- Roster-tied codes carry the student's expected academic metadata.
-- ---------------------------------------------------------------------------

alter table public.invite_codes
  add column if not exists branch               text,
  add column if not exists section              text,
  add column if not exists academic_year        smallint,
  add column if not exists expected_roll_number text;

-- ---------------------------------------------------------------------------
-- Done. Verify with:
--   select column_name from information_schema.columns
--   where table_name = 'profiles' and column_name in
--     ('roll_number','enrollment_number','college_email','branch','section',
--      'academic_year','batch_year','enrollment_status');
-- ---------------------------------------------------------------------------
