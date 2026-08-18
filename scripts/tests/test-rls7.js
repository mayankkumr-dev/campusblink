require('../env-loader');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');


const fs = require('fs');
const envContent = fs.readFileSync('frontend/.env', 'utf-8');
const anonKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: user } = await supabaseAdmin.from('profiles').select('*').eq('username', 'teststudent').single();
  
  // Sign JWT
  const token = jwt.sign({
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + (60 * 60),
    sub: user.id,
    role: 'authenticated',
    email: user.email
  }, process.env.JWT_SECRET);
  
  // Create client with token
  const supabaseAnon = createClient(process.env.SUPABASE_URL, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  
  let query = supabaseAnon
      .from('official_notices')
      .select('id, title, target_year, college, is_fully_removed, is_deleted, created_at')
      .or('is_fully_removed.is.null,is_fully_removed.eq.false')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(0, 49);
      
  if (user.college) query = query.in('college', [user.college, 'All']);
  const studyYear = user.study_year || user.academic_year;
  if (studyYear) {
      const yrStr = String(studyYear);
      const yrDigit = yrStr.match(/\d/)?.[0] || yrStr.split(':')[0].trim();
      const targetYearFormats = ['all', yrDigit, `${yrDigit}st Year`, `${yrDigit}nd Year`, `${yrDigit}rd Year`, `${yrDigit}th Year`];
      query = query.in('target_year', targetYearFormats);
  }
  
  const { data, error } = await query;
  console.log('Teststudent Authorized Data Length:', data ? data.length : null);
  console.log('Error:', error);
  if(data) console.log(data.map(d => d.title));
}
run();
