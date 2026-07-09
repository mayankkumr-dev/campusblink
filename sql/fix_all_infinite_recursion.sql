-- Fix Infinite Recursion Across the App!
-- This drops the recursive policies that crash profiles, admin panels, and announcements.

-- 1. Drop bad profiles policies that cause direct recursion
drop policy if exists "Admins read all profiles" on profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Admins can update all profiles" on public.profiles;

-- Ensure standard authenticated read access for profiles is present
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles for select using (auth.role() = 'authenticated');

-- 2. Drop and replace bad announcements policies
drop policy if exists "Admins can manage announcements" on public.announcements;

-- Notice: Instead of querying profiles and triggering recursion, we use the JWT email claim.
create policy "Admins can manage announcements"
    on public.announcements
    for all
    to authenticated
    using ((auth.jwt() ->> 'email') = 'contactus.mayank@gmail.com')
    with check ((auth.jwt() ->> 'email') = 'contactus.mayank@gmail.com');

-- Re-create read policy for users based on campus scoping
drop policy if exists "Users can read allowed announcements" on public.announcements;
drop policy if exists "Enable read access for all users" on public.announcements;
create policy "Enable read access for all users"
    on public.announcements
    for select
    to public
    using (true);

-- 3. Replace Professor admin policies
drop policy if exists "Admins can view all payments" on professor_pending_payments;
create policy "Admins can view all payments" on professor_pending_payments for select
using ((auth.jwt() ->> 'email') = 'contactus.mayank@gmail.com');

drop policy if exists "Admins can manage features" on professor_feature_access;
create policy "Admins can manage features" on professor_feature_access for all
using ((auth.jwt() ->> 'email') = 'contactus.mayank@gmail.com');

-- 4. Check for any contact tracking policies
drop policy if exists "Admins can manage contact issues" on public.contact_issues;
create policy "Admins can manage contact issues" on public.contact_issues for all
using ((auth.jwt() ->> 'email') = 'contactus.mayank@gmail.com')
with check ((auth.jwt() ->> 'email') = 'contactus.mayank@gmail.com');

