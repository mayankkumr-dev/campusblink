import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fsbcwsqgkdlaebtzmuop.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzYmN3c3Fna2RsYWVidHptdW9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTc5NjMsImV4cCI6MjA4ODk5Mzk2M30.qDhdCI_r_sJhIj0QaksgMF1gHh3wbm3BBYhaOiu-ZqI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data, error } = await supabase
      .from('official_notices')
      .select(`
        id,
        author:profiles!fake_relationship(name)
      `)
      .limit(1)

  console.log('Result:', JSON.stringify({ data, error }, null, 2))
}
test()
