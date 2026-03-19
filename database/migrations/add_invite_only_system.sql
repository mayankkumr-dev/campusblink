-- Invite-only system for Campus Blink
-- Run this script in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  created_by uuid references profiles(id) on delete set null,
  used_by uuid references profiles(id) on delete set null,
  is_used boolean default false,
  is_admin_generated boolean default false,
  expires_at timestamp with time zone,
  used_at timestamp with time zone,
  note text,
  created_at timestamp with time zone default now()
);

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  college text,
  created_at timestamp with time zone default now(),
  invited_at timestamp with time zone,
  is_invited boolean default false
);

alter table profiles
  add column if not exists invites_given integer default 0;

alter table profiles
  add column if not exists invites_available integer default 2;

alter table profiles
  add column if not exists next_invite_refresh_at timestamp with time zone;

alter table profiles
  add column if not exists invited_by uuid references profiles(id);

alter table profiles
  add column if not exists invite_code_used text;

create index if not exists idx_invite_codes_created_by on invite_codes(created_by);
create index if not exists idx_invite_codes_used_by on invite_codes(used_by);
create index if not exists idx_invite_codes_code on invite_codes(code);
create index if not exists idx_invite_codes_is_used on invite_codes(is_used);
create index if not exists idx_waitlist_email on waitlist(email);

alter table invite_codes enable row level security;
alter table waitlist enable row level security;

-- Admin helper: owner email or profile role = admin
create or replace function public.is_admin_user(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from profiles p
    where p.id = uid
      and (
        lower(coalesce(p.email, '')) = 'contactus.mayank@gmail.com'
        or p.role = 'admin'
      )
  );
$$;

-- Invite code policies

drop policy if exists "invite_codes_select_admin_all" on invite_codes;
create policy "invite_codes_select_admin_all"
on invite_codes for select
using (public.is_admin_user(auth.uid()));

drop policy if exists "invite_codes_select_own" on invite_codes;
create policy "invite_codes_select_own"
on invite_codes for select
using (
  auth.uid() is not null
  and (created_by = auth.uid() or used_by = auth.uid())
);

-- Required for code validation on signup by code value.
-- This exposes only currently valid, unused codes.
drop policy if exists "invite_codes_select_valid_for_signup" on invite_codes;
create policy "invite_codes_select_valid_for_signup"
on invite_codes for select
using (
  is_used = false
  and (expires_at is null or expires_at > now())
);

drop policy if exists "invite_codes_insert_admin_generated" on invite_codes;
create policy "invite_codes_insert_admin_generated"
on invite_codes for insert
with check (
  public.is_admin_user(auth.uid())
  and coalesce(is_admin_generated, false) = true
);

drop policy if exists "invite_codes_insert_user_own" on invite_codes;
create policy "invite_codes_insert_user_own"
on invite_codes for insert
with check (
  auth.uid() is not null
  and created_by = auth.uid()
  and coalesce(is_admin_generated, false) = false
);

drop policy if exists "invite_codes_update_admin" on invite_codes;
create policy "invite_codes_update_admin"
on invite_codes for update
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

drop policy if exists "invite_codes_update_consume" on invite_codes;
create policy "invite_codes_update_consume"
on invite_codes for update
using (
  is_used = false
  and (expires_at is null or expires_at > now())
)
with check (
  used_by is not null
  and (
    auth.uid() is null
    or used_by = auth.uid()
  )
  and is_used = true
);

-- Waitlist policies

drop policy if exists "waitlist_insert_anyone" on waitlist;
create policy "waitlist_insert_anyone"
on waitlist for insert
with check (true);

drop policy if exists "waitlist_admin_read" on waitlist;
create policy "waitlist_admin_read"
on waitlist for select
using (public.is_admin_user(auth.uid()));

drop policy if exists "waitlist_admin_update" on waitlist;
create policy "waitlist_admin_update"
on waitlist for update
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

-- Grants

grant usage on schema public to anon, authenticated;
grant select on invite_codes to anon, authenticated;
grant insert, update on invite_codes to authenticated;
grant insert on waitlist to anon, authenticated;
grant select, update on waitlist to authenticated;
