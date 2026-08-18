import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = rawUrl && rawUrl.startsWith('http') ? rawUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = rawKey || 'placeholder-anon-key';

if (!rawUrl || !rawKey) {
  console.warn('Supabase URL or Anon Key is missing or invalid in frontend/.env. Using fallback client.');
}

// ---------------------------------------------------------------------------
// Clerk JWT bridge
// ---------------------------------------------------------------------------
// When the user is signed in via Clerk, their Clerk JWT is injected into every
// Supabase request as the Authorization header. This allows Supabase RLS
// policies to validate the user via the registered Clerk JWKS endpoint.
//
// Call setClerkToken(token) from App.tsx whenever the Clerk session changes.
// Call setClerkToken(null) on sign-out.
// ---------------------------------------------------------------------------
let _clerkToken = null;

export function setClerkToken(token) {
  _clerkToken = token;
}

export function getClerkToken() {
  return _clerkToken;
}

let supabaseClient;
try {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: async (url, options = {}) => {
        if (_clerkToken) {
          const headers = new Headers(options.headers || {});
          headers.set('Authorization', `Bearer ${_clerkToken}`);
          return fetch(url, { ...options, headers });
        }
        return fetch(url, options);
      },
    },
    auth: {
      // Disable Supabase's own auth management — Clerk handles auth now.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  supabaseClient = createClient('https://placeholder.supabase.co', 'placeholder-anon-key');
}

export const supabase = supabaseClient;
