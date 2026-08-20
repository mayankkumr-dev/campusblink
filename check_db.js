const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://fsbcwsqgkdlaebtzmuop.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzYmN3c3Fna2RsYWVidHptdW9wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQxNzk2MywiZXhwIjoyMDg4OTkzOTYzfQ.okV2nZgz3an8vAWGS0yzGFqYRxGMKs5ciifq0UIs0mg'
);

async function check() {
  const { data, error } = await supabase.from('profiles').select('email, clerk_user_id, status').order('created_at', { ascending: false }).limit(5);
  console.log(data);
}
check();
