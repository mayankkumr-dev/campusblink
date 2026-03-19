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

-- 1. Trigger function -------------------------------------------------------
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

-- 2. Attach trigger to auth.users -------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Also ensure the username update path works:
--    If username was passed in raw_user_meta_data, update the profile row.
create or replace function public.handle_new_user_with_username()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  v_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', ''), '^@+', ''));
  v_username := regexp_replace(v_username, '\s+', '', 'g');
  v_username := nullif(trim(v_username), '');

  insert into public.profiles (
    id,
    email,
    name,
    username,
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
    v_username,
    nullif(trim(new.raw_user_meta_data->>'college'), ''),
    'student',
    0,
    '/banner%20background.png'
  )
  on conflict (id) do update set
    username = coalesce(excluded.username, profiles.username),
    name     = coalesce(excluded.name, profiles.name),
    college  = coalesce(excluded.college, profiles.college);

  return new;
end;
$$;

-- Replace the simpler trigger with this one that also handles username:
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user_with_username();
