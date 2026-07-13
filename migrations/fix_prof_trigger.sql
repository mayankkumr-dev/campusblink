CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
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
    professor_status,
    staff_room_number,
    requested_role,
    role_request_status
  )
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'), 
    new.raw_user_meta_data->>'avatar_url', 
    COALESCE(new.raw_user_meta_data->>'role', 'student'), 
    new.raw_user_meta_data->>'college',
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'study_year',
    new.raw_user_meta_data->>'branch',
    new.raw_user_meta_data->>'professor_status',
    new.raw_user_meta_data->>'staff_room_number',
    new.raw_user_meta_data->>'requested_role',
    new.raw_user_meta_data->>'role_request_status'
  );
  RETURN new;
END;
$$;
