require('../env-loader');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: user } = await supabase.from('profiles').select('*').eq('username', 'teststudent').single();
  console.log('teststudent college:', user.college);
  console.log('teststudent study_year:', user.study_year);
  console.log('teststudent academic_year:', user.academic_year);
  
  let query = supabase
      .from('official_notices')
      .select('id, title, target_year, college, is_fully_removed, is_deleted, created_at')
      .or('is_fully_removed.is.null,is_fully_removed.eq.false')
      .order('created_at', { ascending: false });

  // college filter
  query = query.in('college', [user.college, 'All']);

  const studyYear = user.study_year || user.academic_year;
  if (studyYear) {
      const yrStr = String(studyYear);
      const yrDigit = yrStr.match(/\d/)?.[0] || yrStr.split(':')[0].trim();
      
      const targetYearFormats = [
        'all', 
        yrDigit,
        `${yrDigit}st Year`,
        `${yrDigit}nd Year`,
        `${yrDigit}rd Year`,
        `${yrDigit}th Year`
      ];
      query = query.in('target_year', targetYearFormats);
  }

  const { data, error } = await query;
  console.log('Filtered Notices length:', data ? data.length : null);
  console.log('Filtered Notices:', data?.map(n => ({title: n.title, target_year: n.target_year})));
  
  // also fetch all raw notices
  const { data: allData } = await supabase.from('official_notices').select('title, target_year, college, is_fully_removed, is_deleted');
  console.log('ALL notices in DB length:', allData.length);
  console.log('ALL notices in DB:', allData);
}
run();
