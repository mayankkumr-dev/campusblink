-- Campus Blink: Post Bookmarks System (hardened)
-- Targets the existing `bookmarks` table (created in sql_add_twitter_clone.sql).
-- Run this SQL in Supabase SQL Editor.
--
-- What this does:
--   1. Ensures the bookmarks table exists with proper constraints
--   2. Adds optimized indexes for the Saved Bookmarks page
--   3. Sets up strict RLS: users can only see/manage their OWN bookmarks
--   4. Creates SECURITY DEFINER RPCs for bookmarks_count updates
--      (same pattern as increment_post_likes / decrement_post_likes)

-- 1. Table (idempotent — already exists from twitter-clone migration)
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

-- 2. Indexes
-- Per-post lookups (e.g. "has this user bookmarked this post?")
create index if not exists bookmarks_post_id_idx on public.bookmarks(post_id);
-- Per-user lookups (e.g. "show me my bookmarks")
create index if not exists bookmarks_user_id_idx on public.bookmarks(user_id);
-- Composite index for the Saved Bookmarks page: user's bookmarks sorted newest-first
create index if not exists bookmarks_user_id_created_at_idx
  on public.bookmarks(user_id, created_at desc);

-- 3. RLS — strict: users see only their own bookmarks
alter table public.bookmarks enable row level security;

-- Drop any existing policies to ensure clean state
drop policy if exists "Users manage own bookmarks" on public.bookmarks;
drop policy if exists "Users can see all bookmarks" on public.bookmarks;
drop policy if exists "Users can insert their own bookmarks" on public.bookmarks;
drop policy if exists "Users can delete their own bookmarks" on public.bookmarks;
drop policy if exists "bookmarks_select_own" on public.bookmarks;
drop policy if exists "bookmarks_insert_own" on public.bookmarks;
drop policy if exists "bookmarks_delete_own" on public.bookmarks;

-- SELECT: users can only see their own bookmarks (bookmarks are private)
create policy "bookmarks_select_own"
  on public.bookmarks for select to authenticated
  using (auth.uid() = user_id);

-- INSERT: users can only create bookmarks for themselves
create policy "bookmarks_insert_own"
  on public.bookmarks for insert to authenticated
  with check (auth.uid() = user_id);

-- DELETE: users can only remove their own bookmarks
create policy "bookmarks_delete_own"
  on public.bookmarks for delete to authenticated
  using (auth.uid() = user_id);

-- 4. Ensure bookmarks_count column exists on posts
alter table public.posts add column if not exists bookmarks_count integer not null default 0;

-- 5. SECURITY DEFINER RPCs for bookmarks_count
-- These bypass RLS on the posts table so the count can be updated
-- even though the user doesn't "own" the post. This is the same pattern
-- used for likes (increment_post_likes / decrement_post_likes) and
-- comments (increment_post_comments_count / decrement_post_comments_count).
-- Tradeoff: SECURITY DEFINER runs as the function owner (superuser),
-- so the function body must be minimal and safe (just a count update).

create or replace function public.increment_post_bookmarks(p_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.posts
  set bookmarks_count = coalesce(bookmarks_count, 0) + 1
  where id = p_id;
end;
$$;

create or replace function public.decrement_post_bookmarks(p_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.posts
  set bookmarks_count = greatest(coalesce(bookmarks_count, 0) - 1, 0)
  where id = p_id;
end;
$$;

-- 6. Backfill existing bookmarks_count from actual bookmark rows
update public.posts p
set bookmarks_count = coalesce(source.total, 0)
from (
  select post_id, count(*)::integer as total
  from public.bookmarks
  group by post_id
) source
where p.id = source.post_id;
