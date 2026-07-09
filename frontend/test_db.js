import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
        .from('posts')
        .select(`
      id,
      content,
      type,
      image_url,
      is_anonymous,
      likes_count,
      author:profiles!author_id (
        id,
        name,
        username,
        avatar_url,
        college:colleges (
          name,
          short_name
        )
      )
    `)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(3);
  
  if (error) console.error("FAILED", JSON.stringify(error, null, 2));
  else console.dir(data, {depth: null});
}
test();
