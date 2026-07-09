require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log("URL:", process.env.SUPABASE_URL ? "Present" : "Missing");
console.log("Role Key:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "Present" : "Missing");

let supabaseAdmin = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log("Admin client initialized?", !!supabaseAdmin);
  console.log("Admin auth exists?", !!supabaseAdmin.auth);
} else {
  console.log("Failed conditions to init!");
}

const config = require('./src/config/supabase.js');
console.log("Exported admin is null?", config.supabaseAdmin === null);
