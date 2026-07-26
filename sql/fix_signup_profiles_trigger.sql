-- Run this in Supabase SQL Editor.
-- Fixes: "new row violates row-level security policy for table profiles" on signup.
--
-- Root cause: When email confirmation is enabled, supabase.auth.signUp() does NOT
-- return a session. The client-side upsert runs without auth.uid(), so the
-- INSERT policy ("auth.uid() = id") rejects it.
--
-- Fix: A SECURITY DEFINER trigger runs as the DB owner (bypasses RLS) and
-- auto-creates the profile row immediately when a new auth user is created.
-- The client-side ensureProfile() call then becomes a no-op (on conflict do nothing).

-- 0. Username uniqueness + public availability check ------------------------
create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null and btrim(username) <> '';

create or replace function public.check_username_availability(candidate_username text)
returns table (
  available boolean,
  normalized_username text,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized text;
begin
  v_normalized := lower(regexp_replace(coalesce(candidate_username, ''), '^@+', ''));
  v_normalized := regexp_replace(v_normalized, '\s+', '', 'g');
  v_normalized := nullif(trim(v_normalized), '');

  if v_normalized is null then
    return query select false, null::text, 'Username is required.'::text;
    return;
  end if;

  if v_normalized !~ '^[a-z0-9._]{3,20}$' then
    return query select false, v_normalized, 'Use 3-20 letters, numbers, dots, or underscores.'::text;
    return;
  end if;

  if exists (
    select 1
    from public.profiles
    where lower(username) = v_normalized
  ) then
    return query select false, v_normalized, 'This username is already taken.'::text;
    return;
  end if;

  return query select true, v_normalized, 'Username is available.'::text;
end;
$$;

grant execute on function public.check_username_availability(text) to anon, authenticated;

-- 1. Simple trigger function (kept for reference, not used) ------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    name,
    college,
    role,
    campus_credits,
    cover_url
  )
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(new.email, '@', 1)
    ),
    nullif(trim(new.raw_user_meta_data->>'college'), ''),
    'student',
    0,
    '/banner%20background.png'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- 2. Full trigger function — handles username + enrollment lifecycle fields ---
--    This is the active trigger function attached to auth.users.
create or replace function public.handle_new_user_with_username()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username    text;
  v_roll_number text;
  v_branch      text;
  v_section     text;
  v_acad_year   smallint;
  v_batch_year  smallint;
begin
  -- Normalize username
  v_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', ''), '^@+', ''));
  v_username := regexp_replace(v_username, '\s+', '', 'g');
  v_username := nullif(trim(v_username), '');

  -- Enrollment lifecycle fields (only present for invite-code signups with roster metadata)
  v_roll_number := nullif(trim(new.raw_user_meta_data->>'roll_number'), '');
  v_branch      := nullif(trim(new.raw_user_meta_data->>'branch'), '');
  v_section     := nullif(trim(new.raw_user_meta_data->>'section'), '');

  -- Numeric fields: guard against missing/non-numeric values from non-roster signups
  begin
    v_acad_year := (new.raw_user_meta_data->>'academic_year')::smallint;
  exception when others then
    v_acad_year := null;
  end;

  begin
    v_batch_year := (new.raw_user_meta_data->>'batch_year')::smallint;
  exception when others then
    v_batch_year := null;
  end;

  -- Upsert profile row
  insert into public.profiles (
    id,
    email,
    name,
    username,
    college,
    role,
    campus_credits,
    cover_url,
    roll_number,
    branch,
    section,
    academic_year,
    batch_year,
    enrollment_status
  )
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(new.email, '@', 1)
    ),
    v_username,
    nullif(trim(new.raw_user_meta_data->>'college'), ''),
    'student',
    0,
    '/banner%20background.png',
    v_roll_number,
    v_branch,
    v_section,
    v_acad_year,
    v_batch_year,
    'active'
  )
  on conflict (id) do update set
    username        = coalesce(excluded.username,      profiles.username),
    name            = coalesce(excluded.name,          profiles.name),
    college         = coalesce(excluded.college,       profiles.college),
    roll_number     = coalesce(excluded.roll_number,   profiles.roll_number),
    branch          = coalesce(excluded.branch,        profiles.branch),
    section         = coalesce(excluded.section,       profiles.section),
    academic_year   = coalesce(excluded.academic_year, profiles.academic_year),
    batch_year      = coalesce(excluded.batch_year,    profiles.batch_year),
    enrollment_status = coalesce(excluded.enrollment_status, profiles.enrollment_status);

  -- Insert the first roll_number_history row when all required fields are present.
  -- This is the authoritative first entry for this student's roll-number audit trail.
  -- The trigger is SECURITY DEFINER so this INSERT bypasses RLS.
  if v_roll_number is not null
     and v_branch   is not null
     and v_section  is not null
     and v_acad_year is not null
  then
    insert into public.roll_number_history (
      profile_id,
      roll_number,
      branch,
      section,
      academic_year,
      valid_from
    )
    values (
      new.id,
      v_roll_number,
      v_branch,
      v_section,
      v_acad_year,
      current_date
    )
    on conflict do nothing;  -- idempotent guard
  end if;

  return new;
end;
$$;

-- 3. Attach the full trigger to auth.users ----------------------------------
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user_with_username();
