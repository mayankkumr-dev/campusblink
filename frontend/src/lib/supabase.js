import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = rawUrl && rawUrl.startsWith('http') ? rawUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = rawKey || 'placeholder-anon-key';

if (!rawUrl || !rawKey) {
  console.warn('Supabase URL or Anon Key is missing or invalid in frontend/.env. Using fallback client.');
}

let supabaseClient;
try {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  supabaseClient = createClient('https://placeholder.supabase.co', 'placeholder-anon-key');
}

export const supabase = supabaseClient;
