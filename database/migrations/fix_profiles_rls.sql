-- Run this in the Supabase SQL Editor for your project.
-- It removes recursive profiles policies and replaces them with direct, non-recursive rules.

alter table public.profiles enable row level security;

-- Drop existing policies if they exist.
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Admins can update all profiles" on public.profiles;
drop policy if exists "Enable read access for users based on user_id" on public.profiles;
drop policy if exists "Enable insert for authenticated users only" on public.profiles;
drop policy if exists "Enable update for users based on email" on public.profiles;
drop policy if exists "Enable update for users based on id" on public.profiles;
drop policy if exists "Enable select for authenticated users" on public.profiles;
drop policy if exists "Enable insert for users based on id" on public.profiles;
drop policy if exists "Enable delete for users based on id" on public.profiles;

-- Read policy used by joins like posts -> profiles and listings -> profiles.
-- This does not recurse because it does not query profiles from inside the policy.
create policy "profiles_select_authenticated"
on public.profiles
for select
using (auth.role() = 'authenticated');

create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Recommended: do NOT implement admin checks here by querying public.profiles again.
-- If admin-specific access is needed, use a JWT claim, a separate security-definer function,
-- or handle elevated reads via server-side/service-role operations.
