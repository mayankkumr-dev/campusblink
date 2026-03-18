-- Run this in the Supabase SQL Editor.
-- Purpose: Extend canteen_orders status CHECK constraint to support reorder workflow.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.canteen_orders'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.canteen_orders DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.canteen_orders
  ADD CONSTRAINT canteen_orders_status_check
  CHECK (status IN (
    'placed',
    'preparing',
    'ready',
    'picked_up',
    'completed',
    'cancelled',
    'reorder_requested',
    'reorder_completed'
  ));

SELECT status, count(*) FROM public.canteen_orders GROUP BY status ORDER BY count DESC;
