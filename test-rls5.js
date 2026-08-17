const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabaseAdmin.rpc('exec_sql', {
    sql: `SELECT cmd, qual, with_check FROM pg_policies WHERE tablename = 'official_notices';`
  });
  if (error) {
    console.log('rpc failed, trying postgres directly if possible or fetching by other means.');
    console.log(error);
  } else {
    console.log(data);
  }
}
run();
