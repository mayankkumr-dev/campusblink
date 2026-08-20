const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const userId = 'fake-user-id'; // Just to see if it compiles and runs without syntax errors, or we can get a real user id.
  
  // Let's just find the user ID of 'akash.abhishek144@gmail.com'
  const { data: user } = await supabaseAdmin.from('profiles').select('id').eq('email', 'akash.abhishek144@gmail.com').maybeSingle();
  if (!user) return console.log('User not found');
  
  console.log('Trying to delete dependencies for user', user.id);
  try {
    // just test one of the deletes that might fail
    const { error } = await supabaseAdmin.from('diary_bookmarks').delete().eq('user_id', user.id);
    console.log('Diary bookmarks delete error:', error);
  } catch (e) {
    console.error(e);
  }
}
check();
