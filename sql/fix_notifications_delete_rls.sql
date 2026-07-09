-- Fix the missing delete policy for notifications so students can clear their alerts
alter table if exists public.notifications enable row level security;

drop policy if exists "notifications_delete_own" on public.notifications;

create policy "notifications_delete_own"
on public.notifications
for delete
using (auth.uid() = user_id);
