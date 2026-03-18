-- Drop any potentially overly-restrictive RLS policies on menu_items
DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'menu_items'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.menu_items', p.policyname);
  END LOOP;
END $$;

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read
CREATE POLICY "menu_items_select_all" ON public.menu_items FOR SELECT USING (true);

-- Allow authenticated users (like admins and owners) to insert/update/delete
CREATE POLICY "menu_items_all_authenticated" ON public.menu_items FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

