require('../env-loader');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data } = await supabase.from('official_notices').select('title, target_year, college, is_fully_removed, is_deleted').or('is_fully_removed.is.null,is_fully_removed.eq.false');
  console.log('All active notices globally:');
  console.log(data);
}
run();
