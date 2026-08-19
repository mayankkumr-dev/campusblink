-- Run this in the Supabase SQL Editor.
-- This script fixes the issue where deleting a user account leaves their profile
-- and username intact, preventing the username from being reused.

-- 1. Try to modify the existing foreign key to include ON DELETE CASCADE
DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT tc.constraint_name INTO fk_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'profiles'
      AND kcu.column_name = 'id'
      AND tc.constraint_type = 'FOREIGN KEY';

    IF fk_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || fk_name;
        EXECUTE 'ALTER TABLE public.profiles ADD CONSTRAINT ' || fk_name || ' FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE';
    END IF;
END $$;

-- 2. Add a fallback trigger to explicitly delete the profile when the auth user is deleted
CREATE OR REPLACE FUNCTION public.handle_deleted_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete the profile associated with the deleted auth user.
  -- This will free up the username and remove the orphaned profile.
  DELETE FROM public.profiles WHERE id = old.id;
  RETURN old;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_deleted_user();
