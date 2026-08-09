-- notes_courses
CREATE TABLE IF NOT EXISTS public.notes_courses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'coming_soon')),
    semester_count INTEGER NOT NULL DEFAULT 8,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- notes_branches
CREATE TABLE IF NOT EXISTS public.notes_branches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    course_id UUID REFERENCES public.notes_courses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- notes_subjects
CREATE TABLE IF NOT EXISTS public.notes_subjects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    branch_id UUID REFERENCES public.notes_branches(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    credits INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- notes_content_items
CREATE TABLE IF NOT EXISTS public.notes_content_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    subject_id UUID REFERENCES public.notes_subjects(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('syllabus_unit', 'note', 'pyq', 'lab', 'aakash', 'video')),
    title TEXT NOT NULL,
    file_url TEXT,
    embed_url TEXT,
    file_type TEXT,
    file_size_bytes BIGINT,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    download_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.notes_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes_content_items ENABLE ROW LEVEL SECURITY;

-- Read access (public/student)
DROP POLICY IF EXISTS "Public read active courses" ON public.notes_courses;
CREATE POLICY "Public read active courses" ON public.notes_courses FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read branches" ON public.notes_branches;
CREATE POLICY "Public read branches" ON public.notes_branches FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read subjects" ON public.notes_subjects;
CREATE POLICY "Public read subjects" ON public.notes_subjects FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read published content items" ON public.notes_content_items;
CREATE POLICY "Public read published content items" ON public.notes_content_items FOR SELECT USING (status = 'published');
DROP POLICY IF EXISTS "Admins read all content items" ON public.notes_content_items;
CREATE POLICY "Admins read all content items" ON public.notes_content_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Admin access (profiles.role = 'admin')
DROP POLICY IF EXISTS "Admins full access to courses" ON public.notes_courses;
CREATE POLICY "Admins full access to courses" ON public.notes_courses FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins full access to branches" ON public.notes_branches;
CREATE POLICY "Admins full access to branches" ON public.notes_branches FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins full access to subjects" ON public.notes_subjects;
CREATE POLICY "Admins full access to subjects" ON public.notes_subjects FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins full access to content items" ON public.notes_content_items;
CREATE POLICY "Admins full access to content items" ON public.notes_content_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notes_branches_course ON public.notes_branches(course_id);
CREATE INDEX IF NOT EXISTS idx_notes_subjects_branch_sem ON public.notes_subjects(branch_id, semester);
CREATE INDEX IF NOT EXISTS idx_notes_content_subject_cat ON public.notes_content_items(subject_id, category);
CREATE INDEX IF NOT EXISTS idx_notes_content_status ON public.notes_content_items(status);

-- Seed Data for B.Tech
DO $$ 
DECLARE
    v_btech_id UUID;
BEGIN
    INSERT INTO public.notes_courses (name, slug, status, semester_count) 
    VALUES ('B.Tech', 'btech', 'active', 8) 
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_btech_id;

    -- Add branches if they don't exist for this course
    IF v_btech_id IS NOT NULL THEN
        INSERT INTO public.notes_branches (course_id, name, code, sort_order, icon) VALUES 
        (v_btech_id, 'Artificial Intelligence & Data Science', 'AIDS', 1, 'cpu'),
        (v_btech_id, 'Artificial Intelligence & Machine Learning', 'AIML', 2, 'brain'),
        (v_btech_id, 'Civil Engineering', 'CIVIL', 3, 'building-2'),
        (v_btech_id, 'Computer Science & Engineering', 'CSE', 4, 'code-2'),
        (v_btech_id, 'Electronics & Communication', 'ECE', 5, 'circuit-board'),
        (v_btech_id, 'Electrical & Electronics', 'EEE', 6, 'zap'),
        (v_btech_id, 'Information Technology', 'IT', 7, 'monitor'),
        (v_btech_id, 'Mechanical Engineering', 'MECH', 8, 'settings')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ==============================================
-- STORAGE BUCKET FOR NOTES
-- ==============================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('notes_content', 'notes_content', true) 
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
DROP POLICY IF EXISTS "notes_public_read" ON storage.objects;
CREATE POLICY "notes_public_read" ON storage.objects FOR SELECT 
USING (bucket_id = 'notes_content');

-- Allow authenticated users to upload
DROP POLICY IF EXISTS "notes_auth_upload" ON storage.objects;
CREATE POLICY "notes_auth_upload" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'notes_content' AND auth.role() = 'authenticated');

