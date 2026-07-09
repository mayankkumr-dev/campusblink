const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize clients with placeholder values if not provided
// Actual errors will occur when trying to use the clients
let supabaseAdmin = null;
let supabase = null;

if (supabaseUrl && supabaseServiceRoleKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
} else if (process.env.NODE_ENV === 'production') {
  throw new Error('Missing Supabase environment variables in production');
}

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

module.exports = {
  supabaseAdmin,
  supabase,
  supabaseUrl,
};
