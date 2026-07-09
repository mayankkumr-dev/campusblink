create table if not exists bookmarks (
  id uuid primary key
    default gen_random_uuid(),
  user_id uuid references profiles(id)
    on delete cascade,
  post_id uuid references posts(id)
    on delete cascade,
  created_at timestamp with time zone
    default now(),
  unique(user_id, post_id)
);

create table if not exists reposts (
  id uuid primary key
    default gen_random_uuid(),
  user_id uuid references profiles(id)
    on delete cascade,
  post_id uuid references posts(id)
    on delete cascade,
  created_at timestamp with time zone
    default now(),
  unique(user_id, post_id)
);

alter table posts
  add column if not exists
  bookmarks_count integer default 0;

alter table posts
  add column if not exists
  reposts_count integer default 0;

alter table posts
  add column if not exists
  views_count integer default 0;

alter table bookmarks enable row level security;
alter table reposts enable row level security;

drop policy if exists "Users manage own bookmarks" on bookmarks;
create policy "Users manage own bookmarks"
  on bookmarks for all
  using (user_id = auth.uid());

drop policy if exists "Anyone can view reposts" on reposts;
create policy "Anyone can view reposts"
  on reposts for select
  using (true);

drop policy if exists "Users manage own reposts" on reposts;
create policy "Users manage own reposts"
  on reposts for all
  using (user_id = auth.uid());
