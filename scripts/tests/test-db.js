require('../env-loader');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabase
    .from('notes_content_items')
    .select(`
      id, category, title, file_url, embed_url, file_type, file_size_bytes, 
      uploaded_at, download_count, view_count, sort_order, metadata,
      uploaded_by, profiles!notes_content_items_uploaded_by_fkey(name, avatar_url)
    `)
    .eq('status', 'published');
  console.log('Error:', error);
  console.log('Data:', data);
}
test();
