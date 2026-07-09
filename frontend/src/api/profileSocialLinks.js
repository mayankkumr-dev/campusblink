import { supabase } from '../lib/supabase';

function isMissingTable(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('does not exist') || message.includes('relation') && message.includes('does not exist');
}

function sanitizeLinks(links) {
  return (Array.isArray(links) ? links : [])
    .map((item, index) => ({
      platform: String(item?.platform || 'website').trim().toLowerCase(),
      url: String(item?.url || '').trim(),
      position: Number.isFinite(item?.position) ? Number(item.position) : index,
    }))
    .filter((item) => item.url)
    .slice(0, 5);
}

export async function getProfileSocialLinks(userId) {
  try {
    if (!userId) return { data: [], error: null };

    const { data, error } = await supabase
      .from('profile_social_links')
      .select('id, user_id, platform, url, position')
      .eq('user_id', userId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    if (isMissingTable(error)) {
      return { data: [], error: null };
    }
    return { data: null, error };
  }
}

export async function replaceProfileSocialLinks(userId, links) {
  try {
    if (!userId) throw new Error('Missing user id');

    const nextLinks = sanitizeLinks(links);

    const { error: deleteError } = await supabase
      .from('profile_social_links')
      .delete()
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    if (!nextLinks.length) {
      return { data: [], error: null };
    }

    const payload = nextLinks.map((item, index) => ({
      user_id: userId,
      platform: item.platform,
      url: item.url,
      position: index,
    }));

    const { data, error } = await supabase
      .from('profile_social_links')
      .insert(payload)
      .select('id, user_id, platform, url, position');

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: null, error };
  }
}