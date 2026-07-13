-- Migration: Split orders table into canteen_orders and print_orders
-- Creates separate tables for canteen and print shop orders with explicit columns and matching RLS policies.

-- 1. Create canteen_orders table
CREATE TABLE IF NOT EXISTS public.canteen_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  canteen_id UUID REFERENCES public.canteen_shops(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  total_amount NUMERIC(10,2),
  delivery_type TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  priority BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- 2. Create print_orders table
CREATE TABLE IF NOT EXISTS public.print_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  print_shop_id UUID,
  specification JSONB,
  file_url TEXT,
  total_amount NUMERIC(10,2),
  delivery_type TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  priority BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_canteen_orders_user_id ON public.canteen_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_canteen_orders_canteen_id ON public.canteen_orders(canteen_id);
CREATE INDEX IF NOT EXISTS idx_canteen_orders_status ON public.canteen_orders(status);

CREATE INDEX IF NOT EXISTS idx_print_orders_user_id ON public.print_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_print_orders_print_shop_id ON public.print_orders(print_shop_id);
CREATE INDEX IF NOT EXISTS idx_print_orders_status ON public.print_orders(status);

-- 4. Enable Row Level Security (RLS) on both tables
ALTER TABLE public.canteen_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_orders ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for canteen_orders
DROP POLICY IF EXISTS "canteen_orders_insert_own" ON public.canteen_orders;
DROP POLICY IF EXISTS "canteen_orders_select_access" ON public.canteen_orders;
DROP POLICY IF EXISTS "canteen_orders_update_authenticated" ON public.canteen_orders;
DROP POLICY IF EXISTS "canteen_orders_delete_authenticated" ON public.canteen_orders;

CREATE POLICY "canteen_orders_insert_own"
ON public.canteen_orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "canteen_orders_select_access"
ON public.canteen_orders
FOR SELECT
USING (
  auth.uid() = user_id
  OR auth.role() = 'authenticated'
);

CREATE POLICY "canteen_orders_update_authenticated"
ON public.canteen_orders
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "canteen_orders_delete_authenticated"
ON public.canteen_orders
FOR DELETE
USING (auth.role() = 'authenticated');

-- 6. RLS Policies for print_orders
DROP POLICY IF EXISTS "print_orders_insert_own" ON public.print_orders;
DROP POLICY IF EXISTS "print_orders_select_access" ON public.print_orders;
DROP POLICY IF EXISTS "print_orders_update_authenticated" ON public.print_orders;
DROP POLICY IF EXISTS "print_orders_delete_authenticated" ON public.print_orders;

CREATE POLICY "print_orders_insert_own"
ON public.print_orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "print_orders_select_access"
ON public.print_orders
FOR SELECT
USING (
  auth.uid() = user_id
  OR auth.role() = 'authenticated'
);

CREATE POLICY "print_orders_update_authenticated"
ON public.print_orders
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "print_orders_delete_authenticated"
ON public.print_orders
FOR DELETE
USING (auth.role() = 'authenticated');
