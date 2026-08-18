require('../env-loader');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabase.from('notes_content_items').update({ status: 'published' }).eq('id', 'ebc3e59e-f700-43a9-b246-ed2092cc9a9d').select().single();
  console.log('Error:', error);
  console.log('Data:', data);
}
test();
