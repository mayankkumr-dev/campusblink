-- ============================================================================
-- FIX: Update public.get_user_id() to correctly read Clerk's "sub" claim
-- ============================================================================
-- It turns out PostgREST might not map Clerk's "sub" claim to 
-- request.jwt.claim.sub. The safest way according to Supabase docs is to
-- parse request.jwt.claims as JSON.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claim_sub  text;
  mapped_id  uuid;
BEGIN
  -- Safely extract the 'sub' claim from the JWT claims JSON object
  BEGIN
    claim_sub := current_setting('request.jwt.claims', true)::json->>'sub';
  EXCEPTION WHEN OTHERS THEN
    claim_sub := NULL;
  END;

  -- Fallback to request.jwt.claim.sub just in case
  IF claim_sub IS NULL OR claim_sub = '' THEN
    claim_sub := current_setting('request.jwt.claim.sub', true);
  END IF;

  -- No JWT present (anon request)
  IF claim_sub IS NULL OR claim_sub = '' THEN
    RETURN NULL;
  END IF;

  -- Already a standard UUID (Supabase-native auth, not Clerk)
  IF claim_sub ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN claim_sub::uuid;
  END IF;

  -- Clerk ID ("user_2xyz...") → look up the matching profiles row
  SELECT id INTO mapped_id
  FROM public.profiles
  WHERE clerk_user_id = claim_sub
  LIMIT 1;

  RETURN mapped_id;
END;
$$;

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
