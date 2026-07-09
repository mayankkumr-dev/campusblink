CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, college, username, avatar_url, role, custom_title, is_blocked, study_year, branch, hide_branch)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'college',
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_user_meta_data->>'role', 'student'),
    new.raw_user_meta_data->>'custom_title',
    COALESCE((new.raw_user_meta_data->>'is_blocked')::boolean, false),
    new.raw_user_meta_data->>'study_year',
    new.raw_user_meta_data->>'branch',
    COALESCE((new.raw_user_meta_data->>'hide_branch')::boolean, false)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
