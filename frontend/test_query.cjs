const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
      .from('official_notices')
      .select(`
        id,
        title,
        content,
        target_year,
        attachments,
        is_pinned,
        pin_expires_at,
        is_deleted,
        created_at,
        author:profiles!official_notices_author_id_fkey(name, email, role),
        deleted_by:profiles!official_notices_deleted_by_id_fkey(name, email, role)
      `)
      .order('created_at', { ascending: false });

  console.log("Error:", error);
}
test();
