require('../env-loader');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabase
    .from('notes_content_items')
    .select('*');
  console.log('Error:', error);
  console.log('Data length:', data?.length);
  console.log('First 2 items:', data?.slice(0, 2));
}
test();
