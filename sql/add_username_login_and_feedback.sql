-- 1. Function to bypass RLS and allow logging in via username
create or replace function public.get_email_by_username(p_username text)
returns text
language plpgsql security definer
as $$
declare
  v_email text;
begin
  select email into v_email from public.profiles where username = p_username limit 1;
  return v_email;
end;
$$;

-- 2. Feedback system table
create table if not exists public.feedback (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  message text not null,
  rating integer,
  created_at timestamptz default now()
);

alter table public.feedback enable row level security;

drop policy if exists "Users can insert feedback" on public.feedback;
create policy "Users can insert feedback" on public.feedback for insert with check (auth.uid() = user_id);

drop policy if exists "Admins can view feedback" on public.feedback;
create policy "Admins can view feedback" on public.feedback for select using (auth.role() = 'authenticated');
