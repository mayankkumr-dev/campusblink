import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf8')
const env = {}
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=')
  if (key && value) {
    env[key] = value.join('=').trim()
  }
})

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

async function test() {
  console.log('Testing auth as admin...')
  // I cannot login without email/password.
  // But wait! If the user says "authorised users delete notices but it show again and again",
  // it means they hit the delete button. If RLS blocked it, supabase returns an empty array OR an error?
  // Actually, for UPDATE statements with RLS, if the policy fails, Supabase returns success but 0 rows updated!
  // BUT supabase js v2 returns error if no rows are updated? NO! Supabase JS `.update().eq(...)` does NOT return an error if 0 rows are updated!
  // If 0 rows are updated due to RLS, error is null, but data is [].
}
test()
