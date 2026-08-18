const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const targetYear = '1st Year';
  const yrDigit = targetYear.match(/\d/)?.[0] || targetYear.split(':')[0].trim();
  
  let query = supabaseAdmin.from('profiles').select('id, username, study_year, academic_year').eq('status', 'active');
  query = query.or(`study_year.eq.${yrDigit},study_year.eq.${yrDigit}st Year,study_year.eq.${yrDigit}nd Year,study_year.eq.${yrDigit}rd Year,study_year.eq.${yrDigit}th Year,academic_year.eq.${yrDigit}`);
  
  const { data, error } = await query;
  console.log('Error:', error);
  console.log('Profiles found:', data.length);
  const teststudent = data.find(p => p.username === 'teststudent');
  console.log('teststudent found:', !!teststudent);
}
run();
