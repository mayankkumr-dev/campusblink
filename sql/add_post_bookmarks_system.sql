-- Campus Blink: Post Bookmarks System
-- Run this SQL in Supabase SQL Editor

create table if not exists public.post_bookmarks (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (post_id, user_id)
);

create index if not exists post_bookmarks_post_id_idx on public.post_bookmarks(post_id);
create index if not exists post_bookmarks_user_id_idx on public.post_bookmarks(user_id);

alter table public.post_bookmarks enable row level security;

drop policy if exists "Users can see all bookmarks" on public.post_bookmarks;
create policy "Users can see all bookmarks" on public.post_bookmarks for select using (true);

drop policy if exists "Users can insert their own bookmarks" on public.post_bookmarks;
create policy "Users can insert their own bookmarks" on public.post_bookmarks for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own bookmarks" on public.post_bookmarks;
create policy "Users can delete their own bookmarks" on public.post_bookmarks for delete using (auth.uid() = user_id);

-- Optional: Add bookmarks_count to posts
alter table public.posts add column if not exists bookmarks_count integer not null default 0;
