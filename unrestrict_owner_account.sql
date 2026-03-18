-- Emergency owner account recovery
-- Run this in Supabase SQL Editor if owner account is restricted/banned.

update public.profiles
set
  status = 'active',
  ban_reason = null,
  banned_by = null,
  banned_at = null,
  updated_at = now()
where lower(email) = 'contactus.mayank@gmail.com';
