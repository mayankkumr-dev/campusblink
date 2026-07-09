console.log("PLEASE GO TO YOUR SUPABASE DASHBOARD -> SQL EDITOR AND RUN:");
console.log(`CREATE OR REPLACE FUNCTION public.admin_approve_professor(target_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles SET role = 'professor', updated_at = NOW() WHERE id = target_user_id;
  UPDATE public.professor_requests SET status = 'approved', updated_at = NOW() WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`);
