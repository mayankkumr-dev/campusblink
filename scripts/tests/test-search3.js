require('../env-loader');

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testSearch() {
  const safeTerm = 'test';
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, username, avatar_url, bio, campus_credits, college')
    .or(`name.ilike.%${safeTerm}%,username.ilike.%${safeTerm}%`)
    .limit(5);
  
  console.log('Error:', error);
  console.log('Data:', data);
}
testSearch();
