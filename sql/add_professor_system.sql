-- ============================================
-- PROFESSOR SYSTEM — Schema Changes
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Profile columns for professor accounts
alter table profiles
  add column if not exists
  staff_room_number text;

alter table profiles
  add column if not exists
  professor_status text default null
  check (professor_status in (
    'pending', 'approved', 'rejected'
  ));

alter table profiles
  add column if not exists
  professor_rejection_reason text;

alter table profiles
  add column if not exists
  professor_verified_at
    timestamp with time zone;

alter table profiles
  add column if not exists
  professor_verified_by uuid
    references profiles(id);

-- 2. Professor pending payments
create table if not exists
  professor_pending_payments (
  id uuid primary key
    default gen_random_uuid(),
  professor_id uuid
    references profiles(id)
    on delete cascade,
  order_id uuid not null,
  order_type text check (order_type in (
    'canteen', 'print'
  )),
  amount numeric not null,
  shop_name text,
  items jsonb,
  is_paid boolean default false,
  paid_at timestamp with time zone,
  created_at timestamp with time zone
    default now()
);

-- 3. Professor feature access
create table if not exists
  professor_feature_access (
  id uuid primary key
    default gen_random_uuid(),
  professor_id uuid
    references profiles(id)
    on delete cascade,
  feature text not null,
  is_enabled boolean default false,
  enabled_by uuid
    references profiles(id),
  created_at timestamp with time zone
    default now(),
  unique(professor_id, feature)
);

-- 4. Canteen order columns
alter table canteen_orders
  add column if not exists
  is_professor_order boolean
    default false;
alter table canteen_orders
  add column if not exists
  delivery_room_number text;
alter table canteen_orders
  add column if not exists
  is_delivery_order boolean
    default false;
alter table canteen_orders
  add column if not exists
  professor_pay_later boolean
    default false;

-- 5. Print order columns
alter table print_orders
  add column if not exists
  is_professor_order boolean
    default false;
alter table print_orders
  add column if not exists
  delivery_room_number text;
alter table print_orders
  add column if not exists
  is_delivery_order boolean
    default false;
alter table print_orders
  add column if not exists
  professor_pay_later boolean
    default false;

-- 6. RLS policies for professor_pending_payments
alter table professor_pending_payments enable row level security;

create policy "Professors can view own payments"
  on professor_pending_payments for select
  using (auth.uid() = professor_id);

create policy "Professors can insert own payments"
  on professor_pending_payments for insert
  with check (auth.uid() = professor_id);

create policy "Professors can update own payments"
  on professor_pending_payments for update
  using (auth.uid() = professor_id);

create policy "Admins can view all payments"
  on professor_pending_payments for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- 7. RLS policies for professor_feature_access
alter table professor_feature_access enable row level security;

create policy "Professors can view own features"
  on professor_feature_access for select
  using (auth.uid() = professor_id);

create policy "Admins can manage features"
  on professor_feature_access for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
