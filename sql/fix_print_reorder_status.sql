-- Run this in the Supabase SQL Editor.
-- Purpose: Extend the print_orders status CHECK constraint to include
-- 'reorder_requested' and 'reorder_completed'.

-- Step 1: Drop ALL existing CHECK constraints on print_orders.status
-- (catches any name Supabase auto-generated, e.g. "print_orders_status_check")
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.print_orders'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.print_orders DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

-- Step 2: Add updated constraint with all valid statuses
ALTER TABLE public.print_orders
  ADD CONSTRAINT print_orders_status_check
  CHECK (status IN (
    'pending',
    'printing',
    'ready',
    'collected',
    'cancelled',
    'reorder_requested',
    'reorder_completed'
  ));

-- Step 3: Verify
SELECT status, count(*) FROM public.print_orders GROUP BY status ORDER BY count DESC;
