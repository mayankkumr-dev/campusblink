-- Fix Clerk JWT type mismatch by gracefully overriding auth.uid()
-- Run this in the Supabase SQL Editor

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  claim_sub text;
  mapped_uuid uuid;
BEGIN
  -- Get the raw 'sub' claim from the JWT (e.g., 'user_2xyz...' or a standard UUID)
  claim_sub := current_setting('request.jwt.claim.sub', true);
  
  IF claim_sub IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- If the claim is already a standard UUID, return it directly
  IF claim_sub ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN claim_sub::uuid;
  END IF;

  -- If it is a Clerk ID (e.g., starts with 'user_'), map it to the Supabase profiles.id
  SELECT id INTO mapped_uuid FROM public.profiles WHERE clerk_user_id = claim_sub LIMIT 1;
  
  -- If not found (e.g., during early onboarding), returns NULL safely without crashing
  RETURN mapped_uuid;
END;
$$;

-- Note: In older Supabase projects, auth.uid() might be in a different schema, but usually it's in auth.
-- Make sure to run this as the postgres superuser.
