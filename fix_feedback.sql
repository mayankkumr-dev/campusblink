ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS status text DEFAULT 'new';
ALTER TABLE public.feedback ALTER COLUMN rating TYPE text USING (rating::text);

-- Drop old policies to update them
DROP POLICY IF EXISTS "Admins can view feedback" ON public.feedback;
CREATE POLICY "Admins can view feedback" ON public.feedback FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update feedback" ON public.feedback;
CREATE POLICY "Admins can update feedback" ON public.feedback FOR UPDATE USING (
  exists (
    select 1 from profiles
    where id = auth.uid()
    and role = 'admin'
  )
);
