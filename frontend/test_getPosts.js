import { supabase } from './src/lib/supabase.js';
import { getPosts } from './src/api/community.js';

async function test() {
  try {
    const res = await getPosts('all');
    console.log(res);
  } catch (e) {
    console.error("FAILED", e);
  }
}
test();
