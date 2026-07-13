-- Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS study_year TEXT,
ADD COLUMN IF NOT EXISTS branch TEXT,
ADD COLUMN IF NOT EXISTS hide_branch BOOLEAN DEFAULT false;

-- Create or replace the trigger function to include these new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    avatar_url, 
    role, 
    college,
    study_year,
    branch
  )
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url', 
    COALESCE(new.raw_user_meta_data->>'role', 'student'), 
    new.raw_user_meta_data->>'college',
    new.raw_user_meta_data->>'study_year',
    new.raw_user_meta_data->>'branch'
  );
  RETURN new;
END;
$$;
