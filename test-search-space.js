require('dotenv').config({ path: 'backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testSearch() {
  const safeTerm = 'test student';
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, username')
    .or(`name.ilike.%${safeTerm}%,username.ilike.%${safeTerm}%`);
  
  console.log('Error:', error);
}
testSearch();
