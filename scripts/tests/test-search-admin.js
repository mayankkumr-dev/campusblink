require('../env-loader');

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testSearch() {
  const searchQuery = '%test%';
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, name, username, email, role')
    .or(`username.ilike.${searchQuery},email.ilike.${searchQuery},name.ilike.${searchQuery},full_name.ilike.${searchQuery}`)
    .limit(10);
  
  console.log('Error:', error);
}
testSearch();
