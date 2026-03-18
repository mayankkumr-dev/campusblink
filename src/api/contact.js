import { supabase } from '../lib/supabase';

export async function submitContactIssue(payload) {
  try {
    const { data: authData } = await supabase.auth.getSession();
    const sessionUserId = authData?.session?.user?.id || null;

    // Keep payload aligned with RLS expectations:
    // - anonymous requests must insert user_id = null
    // - authenticated requests should insert own auth uid
    const safePayload = {
      ...payload,
      user_id: sessionUserId,
      status: payload?.status || 'open',
    };

    const { error } = await supabase
      .from('contact_issues')
      .insert([safePayload])
      ;

    if (error) throw error;
    return { data: { inserted: true }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getContactIssues(status = 'all') {
  try {
    let query = supabase
      .from('contact_issues')
      .select('*')
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function updateContactIssueStatus(issueId, status, handledBy) {
  try {
    const nowIso = new Date().toISOString();
    const updates = {
      status,
      handled_by: handledBy || null,
      handled_at: status === 'resolved' ? nowIso : null,
      updated_at: nowIso,
    };

    const { data, error } = await supabase
      .from('contact_issues')
      .update(updates)
      .eq('id', issueId)
      .select('*')
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
