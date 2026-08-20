-- Fix Clerk JWT type mismatch by rewriting RLS policies to use a wrapper function
-- Run this in the Supabase SQL Editor

DO $$ 
DECLARE 
    pol RECORD;
    new_qual text;
    new_with_check text;
    create_stmt text;
BEGIN
    -- 1. Create the helper function in public schema to safely get the UUID
    EXECUTE '
    CREATE OR REPLACE FUNCTION public.get_user_id() RETURNS uuid AS $func$
    DECLARE
      claim_sub text;
      mapped_uuid uuid;
    BEGIN
      claim_sub := current_setting(''request.jwt.claim.sub'', true);
      IF claim_sub IS NULL THEN
        RETURN NULL;
      END IF;
      
      IF claim_sub ~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'' THEN
        RETURN claim_sub::uuid;
      END IF;

      SELECT id INTO mapped_uuid FROM public.profiles WHERE clerk_user_id = claim_sub LIMIT 1;
      RETURN mapped_uuid;
    END;
    $func$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
    ';

    -- 2. Redefine app_private.current_user_college to use the new wrapper
    EXECUTE '
    CREATE OR REPLACE FUNCTION app_private.current_user_college()
    RETURNS text
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $func$
      SELECT p.college
      FROM public.profiles p
      WHERE p.id = public.get_user_id()
      LIMIT 1;
    $func$;
    ';

    -- 3. Loop through all policies in public schema and replace auth.uid()
    FOR pol IN 
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
    LOOP
        new_qual := replace(pol.qual, 'auth.uid()', 'public.get_user_id()');
        new_with_check := replace(pol.with_check, 'auth.uid()', 'public.get_user_id()');
        
        -- Drop the old policy
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
        
        -- Build the CREATE POLICY statement
        create_stmt := format('CREATE POLICY %I ON %I.%I AS %s FOR %s', pol.policyname, pol.schemaname, pol.tablename, pol.permissive, pol.cmd);
        
        IF pol.roles IS NOT NULL AND array_length(pol.roles, 1) > 0 AND pol.roles[1] != 'public' THEN
            create_stmt := create_stmt || ' TO ' || array_to_string(pol.roles, ', ');
        END IF;
        
        IF new_qual IS NOT NULL THEN
            create_stmt := create_stmt || ' USING (' || new_qual || ')';
        END IF;
        
        IF new_with_check IS NOT NULL THEN
            create_stmt := create_stmt || ' WITH CHECK (' || new_with_check || ')';
        END IF;
        
        -- Execute the creation
        EXECUTE create_stmt;
    END LOOP;
END $$;
