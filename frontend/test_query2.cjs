const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
      .from('official_notices')
      .select(`
        id,
        title
      `)
      .or('is_fully_removed.is.null,is_fully_removed.eq.false')
      .order('created_at', { ascending: false });

  console.log("Error:", error);
}
test();
