-- 1. Ensure required columns exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS requested_role TEXT,
ADD COLUMN IF NOT EXISTS role_request_status TEXT,
ADD COLUMN IF NOT EXISTS professor_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS staff_room_number TEXT;

-- 2. Update the DB trigger to instantly assign pending professors 
-- their proper roles and status during sign-up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    name,
    avatar_url, 
    role, 
    college,
    username,
    study_year,
    branch,
    staff_room_number,
    requested_role,
    role_request_status,
    professor_status,
    hide_branch
  )
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'avatar_url', 
    COALESCE(
      (CASE WHEN new.raw_user_meta_data->>'requested_role' = 'teacher' THEN 'professor' ELSE NULL END),
      new.raw_user_meta_data->>'role', 
      'student'
    ), 
    new.raw_user_meta_data->>'college',
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'study_year',
    new.raw_user_meta_data->>'branch',
    new.raw_user_meta_data->>'staff_room_number',
    new.raw_user_meta_data->>'requested_role',
    new.raw_user_meta_data->>'role_request_status',
    (CASE WHEN new.raw_user_meta_data->>'requested_role' = 'teacher' THEN 'pending' ELSE NULL END),
    COALESCE((new.raw_user_meta_data->>'hide_branch')::boolean, false)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix any professors who got stuck as 'student' due to the old trigger.
UPDATE public.profiles p
SET 
  role = 'professor',
  professor_status = 'pending',
  requested_role = 'teacher',
  role_request_status = 'pending',
  staff_room_number = auth.users.raw_user_meta_data->>'staff_room_number'
FROM auth.users
WHERE p.id = auth.users.id 
  AND auth.users.raw_user_meta_data->>'requested_role' = 'teacher'
  AND p.role = 'student';
