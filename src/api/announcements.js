import { supabase } from '../lib/supabase';

export async function getActiveAnnouncementForUser(userId) {
  try {
    if (!userId) return { data: null, error: null };

    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const now = Date.now();
    const visible = (data || []).find((row) => {
      const allowedTarget = row.target === 'all' || row.target_user_id === userId;
      const allowedExpiry = !row.expires_at || new Date(row.expires_at).getTime() > now;
      return allowedTarget && allowedExpiry;
    });

    return { data: visible || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
