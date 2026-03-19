-- Fix for: new row violates row-level security policy for table "contact_issues"
-- Run this in Supabase SQL Editor.

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
