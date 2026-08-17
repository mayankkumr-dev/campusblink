const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  // Try authenticating as teststudent (if we don't have password, we can't easily, let's just do anon query)
  let query = supabase
    .from('official_notices')
    .select('*')
    .or('is_fully_removed.is.null,is_fully_removed.eq.false')
    .in('college', ['Maharaja Agrasen Institute of Technology (MAIT)', 'All'])
    
  const { data, error } = await query;
  console.log('data length:', data ? data.length : null);
  console.log('error:', error);
}
run();
