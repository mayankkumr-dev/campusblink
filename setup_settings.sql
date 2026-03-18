-- SQL to create platform_settings table
REATE TABLE public.platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed defaults
INSERT INTO public.platform_settings (key, value) VALUES
('maintenance_mode', 'false'::jsonb),
('signups_enabled', 'true'::jsonb),
('default_credits', '100'::jsonb),
('max_listings_per_user', '5'::jsonb),
('platform_fee_percentage', '2.5'::jsonb);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "Enable update for admin" ON public.platform_settings FOR UPDATE USING (true);

