const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const dependencies = [
      { table: 'post_likes', col: 'user_id' },
      { table: 'comment_likes', col: 'user_id' },
      { table: 'notifications', col: 'user_id' },
      { table: 'notifications', col: 'actor_id' },
      { table: 'notification_preferences', col: 'user_id' },
      { table: 'follows', col: 'follower_id' },
      { table: 'follows', col: 'following_id' },
      { table: 'bookmarks', col: 'user_id' },
      { table: 'wishlists', col: 'user_id' },
      { table: 'canteen_orders', col: 'user_id' },
      { table: 'print_orders', col: 'user_id' },
      { table: 'community_reports', col: 'reporter_id' },
      { table: 'community_reports', col: 'reported_user_id' },
      { table: 'marketplace_reports', col: 'reporter_id' },
      { table: 'marketplace_reports', col: 'reported_user_id' },
      { table: 'reports', col: 'reporter_id' },
      { table: 'reports', col: 'reported_user_id' },
      { table: 'diary_bookmarks', col: 'user_id' },
      { table: 'profile_social_links', col: 'profile_id' },
      { table: 'push_subscriptions', col: 'user_id' },
      { table: 'user_restrictions', col: 'user_id' },
      { table: 'professor_requests', col: 'user_id' },
      { table: 'professor_pending_payments', col: 'user_id' },
      { table: 'admin_audit_log', col: 'admin_id' },
      { table: 'admin_email_log', col: 'admin_id' },
      { table: 'app_feedback', col: 'user_id' },
      { table: 'feedback', col: 'user_id' },
      { table: 'contact_issues', col: 'user_id' }
  ];

  for (const dep of dependencies) {
    try {
      const { error } = await supabaseAdmin.from(dep.table).select('id').limit(1);
      if (error && error.code === 'PGRST205') {
        console.log('MISSING TABLE:', dep.table);
      }
    } catch (e) {
      // ignore
    }
  }
}
check();
