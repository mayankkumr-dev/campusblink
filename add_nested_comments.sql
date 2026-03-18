-- Campus Blink: Nested comments, comment likes, comment delete permissions
-- Run this SQL in Supabase SQL Editor

-- 1. Add parent_comment_id for nesting
alter table public.comments
  add column if not exists parent_comment_id uuid references public.comments(id) on delete cascade;

-- 2. Add replies_count
alter table public.comments
  add column if not exists replies_count integer not null default 0;

-- 3. Add likes_count to comments
alter table public.comments
  add column if not exists likes_count integer not null default 0;

-- 4. Useful index for nesting queries
create index if not exists comments_parent_comment_id_idx on public.comments(parent_comment_id);

-- 5. Comment likes table
create table if not exists public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (comment_id, user_id)
);

create index if not exists comment_likes_comment_id_idx on public.comment_likes(comment_id);
create index if not exists comment_likes_user_id_idx on public.comment_likes(user_id);

-- 6. RLS for comment_likes
alter table public.comment_likes enable row level security;

drop policy if exists "Anyone can view comment likes" on public.comment_likes;
create policy "Anyone can view comment likes"
  on public.comment_likes for select using (true);

drop policy if exists "Users can like comments" on public.comment_likes;
create policy "Users can like comments"
  on public.comment_likes for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can unlike their comment likes" on public.comment_likes;
create policy "Users can unlike their comment likes"
  on public.comment_likes for delete to authenticated
  using (auth.uid() = user_id);

-- 7. Comment delete RLS (owner, post owner, or admin)
drop policy if exists "Comment delete permission" on public.comments;
create policy "Comment delete permission"
  on public.comments for delete
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.posts
      where posts.id = comments.post_id
        and posts.author_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- 8. Ensure comments are readable publicly (needed for PostDetailPage without auth)
drop policy if exists "Comments are viewable by anyone" on public.comments;
create policy "Comments are viewable by anyone"
  on public.comments for select
  using (true);

-- 9. RPCs for counter management

create or replace function public.increment_post_comments_count(p_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.posts
  set comments_count = coalesce(comments_count, 0) + 1
  where id = p_id;
end;
$$;

create or replace function public.decrement_post_comments_count(p_id uuid, amount integer default 1)
returns void language plpgsql security definer as $$
begin
  update public.posts
  set comments_count = greatest(coalesce(comments_count, 0) - amount, 0)
  where id = p_id;
end;
$$;

create or replace function public.increment_comment_replies_count(c_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.comments
  set replies_count = coalesce(replies_count, 0) + 1
  where id = c_id;
end;
$$;

create or replace function public.decrement_comment_replies_count(c_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.comments
  set replies_count = greatest(coalesce(replies_count, 0) - 1, 0)
  where id = c_id;
end;
$$;

create or replace function public.increment_comment_likes(c_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.comments
  set likes_count = coalesce(likes_count, 0) + 1
  where id = c_id;
end;
$$;

create or replace function public.decrement_comment_likes(c_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.comments
  set likes_count = greatest(coalesce(likes_count, 0) - 1, 0)
  where id = c_id;
end;
$$;
