CREATE OR REPLACE FUNCTION public.admin_approve_professor(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    role = 'professor',
    requested_role = NULL,
    role_request_status = 'approved',
    professor_status = 'approved',
    professor_verified_at = NOW(),
    updated_at = NOW()
  WHERE id = target_user_id;

  IF to_regclass('public.professor_requests') IS NOT NULL THEN
    UPDATE public.professor_requests
    SET status = 'approved', updated_at = NOW()
    WHERE user_id = target_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_professor(UUID) TO authenticated;
