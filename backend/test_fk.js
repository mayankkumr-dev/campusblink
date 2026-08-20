const { supabaseAdmin } = require('./src/config/supabase');

async function test() {
  const { error } = await supabaseAdmin.from('profiles').delete().eq('id', 'nonexistent');
  console.log(error);
}
test();
