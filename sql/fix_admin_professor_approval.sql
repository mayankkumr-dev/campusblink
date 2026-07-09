CREATE OR REPLACE FUNCTION public.admin_approve_professor(p_admin_id UUID, p_professor_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prof JSONB;
BEGIN
  -- Verify admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE profiles
  SET professor_status = 'approved',
      role = 'professor',
      professor_verified_at = now(),
      professor_verified_by = p_admin_id
  WHERE id = p_professor_id
  RETURNING to_jsonb(profiles.*) INTO v_prof;

  RETURN v_prof;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_professor(p_admin_id UUID, p_professor_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prof JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE profiles
  SET professor_status = 'rejected',
      professor_rejection_reason = p_reason
  WHERE id = p_professor_id
  RETURNING to_jsonb(profiles.*) INTO v_prof;

  RETURN v_prof;
END;
$$;
