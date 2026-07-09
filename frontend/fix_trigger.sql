create or replace function public.handle_new_user_with_username()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_requested_role text;
  v_staff_room text;
  v_role text := 'student';
  v_prof_status text := null;
  v_req_status text := null;
begin
  v_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', ''), '^@+', ''));
  v_username := regexp_replace(v_username, '\s+', '', 'g');
  v_username := nullif(trim(v_username), '');
  
  v_requested_role := new.raw_user_meta_data->>'requested_role';
  v_staff_room := new.raw_user_meta_data->>'staff_room_number';
  
  if v_requested_role = 'teacher' then
    v_role := 'professor';
    v_prof_status := 'pending';
    v_req_status := 'pending';
  end if;

  insert into public.profiles (
    id,
    email,
    name,
    username,
    college,
    role,
    campus_credits,
    cover_url,
    professor_status,
    requested_role,
    role_request_status,
    staff_room_number
  )
  values (
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
    '/banner%20background.png',
    v_prof_status,
    v_requested_role,
    v_req_status,
    v_staff_room
  )
  on conflict (id) do update set
    username = coalesce(excluded.username, profiles.username),
    name     = coalesce(excluded.name, profiles.name),
    college  = coalesce(excluded.college, profiles.college),
    role     = coalesce(excluded.role, profiles.role),
    professor_status = coalesce(excluded.professor_status, profiles.professor_status),
    requested_role = coalesce(excluded.requested_role, profiles.requested_role),
    role_request_status = coalesce(excluded.role_request_status, profiles.role_request_status),
    staff_room_number = coalesce(excluded.staff_room_number, profiles.staff_room_number);

  return new;
end;
$$;
