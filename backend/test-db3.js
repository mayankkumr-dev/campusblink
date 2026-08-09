const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabase
    .from('notes_content_items')
    .select(`
      *,
      notes_subjects (
        name, semester, branch_id,
        notes_branches (name, course_id, notes_courses(name))
      )
    `)
    .order('created_at', { ascending: false });
  console.log('Error:', error);
  console.log('Data length:', data?.length);
}
test();
