require('../env-loader');

const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (users.users.length > 0) {
    const user = users.users[0];
    console.log("User:", user.id);
    const { data: updated, error: err2 } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, test_meta: true }
    });
    console.log("Update Error:", err2?.message);
    console.log("Updated metadata:", updated.user?.user_metadata?.test_meta);
  }
}
check();
