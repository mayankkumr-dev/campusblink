-- Contact issues system migration
-- Run this in Supabase SQL editor

create extension if not exists pgcrypto;

create table if not exists public.contact_issues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  email text not null,
  category text not null default 'general',
  subject text,
  message text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  handled_by uuid references public.profiles(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contact_issues_created_at_idx on public.contact_issues (created_at desc);
create index if not exists contact_issues_status_idx on public.contact_issues (status);
create index if not exists contact_issues_user_id_idx on public.contact_issues (user_id);

alter table public.contact_issues enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert on public.contact_issues to anon, authenticated;
grant update on public.contact_issues to authenticated;

do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'contact_issues'
  loop
    execute format('drop policy if exists %I on public.contact_issues', pol.policyname);
  end loop;
end $$;

-- Anyone logged in can create contact issue
-- and guests can create if your project allows anon inserts with this policy.
create policy "Anon users can submit contact issues"
on public.contact_issues
for insert
to anon
with check (
  user_id is null
  and coalesce(status, 'open') = 'open'
);

create policy "Authenticated users can submit contact issues"
on public.contact_issues
for insert
to authenticated
with check (
  user_id is null or user_id = auth.uid()
);

-- Admin can read and manage all issues
create policy "Admins can read contact issues"
on public.contact_issues
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'admin' or lower(p.email) = 'contactus.mayank@gmail.com')
  )
);

create policy "Admins can update contact issues"
on public.contact_issues
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'admin' or lower(p.email) = 'contactus.mayank@gmail.com')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'admin' or lower(p.email) = 'contactus.mayank@gmail.com')
  )
);
