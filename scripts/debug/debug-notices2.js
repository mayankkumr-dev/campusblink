require('../env-loader');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: user } = await supabase.from('profiles').select('*').eq('username', 'teststudent').single();
  
  let query = supabase
      .from('official_notices')
      .select('id, title, target_year, college, is_fully_removed, is_deleted, created_at')
      .or('is_fully_removed.is.null,is_fully_removed.eq.false')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(0, 49);

  if (user.college) {
    query = query.in('college', [user.college, 'All']);
  } else {
    query = query.eq('college', 'All');
  }

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
  console.log('Filtered Notices titles:', data?.map(n => n.title));
}
run();
