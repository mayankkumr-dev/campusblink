-- Campus Blink post likes system

alter table if exists public.posts
  add column if not exists likes_count integer not null default 0;

create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (post_id, user_id)
);

create index if not exists post_likes_post_id_idx on public.post_likes(post_id);
create index if not exists post_likes_user_id_idx on public.post_likes(user_id);

update public.posts p
set likes_count = coalesce(source.total_likes, 0)
from (
  select post_id, count(*)::integer as total_likes
  from public.post_likes
  group by post_id
) source
where p.id = source.post_id;

update public.posts
set likes_count = 0
where likes_count is null;

create or replace function public.increment_post_likes(p_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.posts
  set likes_count = coalesce(likes_count, 0) + 1
  where id = p_id;
end;
$$;

create or replace function public.decrement_post_likes(p_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.posts
  set likes_count = greatest(coalesce(likes_count, 0) - 1, 0)
  where id = p_id;
end;
$$;

alter table public.post_likes enable row level security;

drop policy if exists "Users can view post likes" on public.post_likes;
create policy "Users can view post likes"
on public.post_likes
for select
to authenticated
using (true);

drop policy if exists "Users can like posts" on public.post_likes;
create policy "Users can like posts"
on public.post_likes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can unlike their likes" on public.post_likes;
create policy "Users can unlike their likes"
on public.post_likes
for delete
to authenticated
using (auth.uid() = user_id);
