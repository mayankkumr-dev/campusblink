-- 1. Update the profiles_role_check constraint to allow 'society'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'professor', 'admin', 'canteen_owner', 'print_owner', 'society'));

-- 2. Update the default new user trigger to allow assigning 'society' role
CREATE OR REPLACE FUNCTION public.handle_new_user_with_username()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
  v_role text;
BEGIN
  v_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', ''), '^@+', ''));
  v_username := regexp_replace(v_username, '\s+', '', 'g');
  v_username := nullif(trim(v_username), '');

  -- Allow custom role assignment exclusively if it's "society" to prevent abuse 
  v_role := coalesce(new.raw_user_meta_data->>'role', 'student');
  IF v_role NOT IN ('student', 'society') THEN
    v_role := 'student';
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    name,
    username,
    college,
    role,
    campus_credits,
    cover_url
  )
  VALUES (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(new.email, '@', 1)
    ),
    v_username,
    nullif(trim(new.raw_user_meta_data->>'college'), ''),
    v_role,
    0,
    '/banner%20background.png'
  )
  ON CONFLICT (id) DO UPDATE SET
    username = coalesce(excluded.username, profiles.username),
    name     = coalesce(excluded.name, profiles.name),
    college  = coalesce(excluded.college, profiles.college),
    role     = coalesce(excluded.role, profiles.role);

  RETURN new;
END;
$$;
