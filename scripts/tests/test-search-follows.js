require('../env-loader');

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testSearch() {
  const currentUserId = 'f5ee05fe-76fe-458d-aa27-17c54e652eae';
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', currentUserId);
  
  console.log('Error:', error);
  console.log('Data:', data);
}
testSearch();
