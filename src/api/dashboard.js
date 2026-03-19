import { supabase } from '../lib/supabase';

/**
 * Fetches combined recent activity cards for student dashboard.
 * @param {string} profileId
 * @returns {Promise<{data: any[], error: any}>}
 */
export async function getStudentRecentActivity(profileId) {
  try {
    const [postsResp, listingsResp, canteenResp, printResp] = await Promise.all([
      supabase.from('posts').select('id, title, created_at').eq('author_id', profileId).order('created_at', { ascending: false }).limit(2),
      supabase.from('listings').select('id, title, created_at, is_sold').eq('seller_id', profileId).order('created_at', { ascending: false }).limit(2),
      supabase.from('canteen_orders').select('id, status, created_at, shop_id').eq('student_id', profileId).order('created_at', { ascending: false }).limit(2),
      supabase.from('print_orders').select('id, file_name, status, created_at').eq('student_id', profileId).order('created_at', { ascending: false }).limit(2),
    ]);

    const combined = [
      ...((postsResp.data || []).map((item) => ({ type: 'Community', title: item.title || 'Posted in community', time: item.created_at, status: 'posted' }))),
      ...((listingsResp.data || []).map((item) => ({ type: 'Buy/Sell', title: item.title || 'Marketplace listing', time: item.created_at, status: item.is_sold ? 'sold' : 'live' }))),
      ...((canteenResp.data || []).map((item) => ({ type: 'Canteen', title: `Order #${String(item.id).slice(0, 6)}`, time: item.created_at, status: item.status || 'placed' }))),
      ...((printResp.data || []).map((item) => ({ type: 'Print', title: item.file_name || 'Print order', time: item.created_at, status: item.status || 'queued' }))),
    ]
      .sort((left, right) => new Date(right.time).getTime() - new Date(left.time).getTime())
      .slice(0, 4)
      .map((item) => ({
        ...item,
        time: new Date(item.time).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      }));

    return { data: combined, error: null };
  } catch (error) {
    return { data: [], error };
  }
}
