const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const q = `
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'professor', 'admin', 'canteen_owner', 'print_owner', 'society'));
  `;
  const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql_string: q });
  console.log("EXEC:", data, error);
}
test();
