const { supabaseAdmin } = require('../config/supabase');
const jwt = require('jsonwebtoken');
const https = require('https');

/**
 * Authentication middleware that validates Clerk JWTs.
 *
 * Strategy:
 *  1. Extract Bearer token from Authorization header or cookie.
 *  2. Decode the JWT to get the Clerk user ID (sub claim).
 *  3. Look up the corresponding profile in Supabase by clerk_user_id.
 *  4. Attach req.user and req.profile for downstream use.
 *
 * We verify the token against Clerk's JWKS endpoint for production security.
 * For speed, the JWKS keys are cached in memory.
 */

// Derive the Clerk instance domain from the publishable key
// pk_test_bW9kZXN0LWZvd2wtNTM1MS5jbGVyay5hY2NvdW50cy5kZXYk
// → base64 decode the part after pk_test_ → "modest-fowl-5351.clerk.accounts.dev"
function getClerkInstanceDomain() {
  const pk = process.env.CLERK_PUBLISHABLE_KEY || '';
  const prefix = pk.startsWith('pk_live_') ? 'pk_live_' : 'pk_test_';
  const encoded = pk.slice(prefix.length);
  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8').replace(/\0/g, '');
    // decoded looks like "modest-fowl-5351.clerk.accounts.dev$"
    return decoded.replace(/\$$/, '');
  } catch {
    return null;
  }
}

let cachedJwks = null;
let jwksFetchedAt = 0;
const JWKS_TTL_MS = 60 * 60 * 1000; // 1 hour

function fetchJwks(domain) {
  return new Promise((resolve, reject) => {
    const url = `https://${domain}/.well-known/jwks.json`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function getPublicKey(kid) {
  const now = Date.now();
  const domain = getClerkInstanceDomain();

  if (!domain) {
    throw new Error('Cannot derive Clerk domain from CLERK_PUBLISHABLE_KEY');
  }

  if (!cachedJwks || now - jwksFetchedAt > JWKS_TTL_MS) {
    cachedJwks = await fetchJwks(domain);
    jwksFetchedAt = now;
  }

  const jwk = cachedJwks.keys?.find(k => k.kid === kid);
  if (!jwk) throw new Error(`No JWK found for kid: ${kid}`);

  // Convert JWK to PEM
  const pem = jwkToPem(jwk);
  return pem;
}

// Minimal JWK (RSA) → PEM converter (no external deps)
function jwkToPem(jwk) {
  const { n, e } = jwk;
  if (!n || !e) throw new Error('Invalid RSA JWK');
  // Node's crypto can import JWK directly (Node 15+)
  const crypto = require('crypto');
  const keyObject = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  return keyObject.export({ type: 'spki', format: 'pem' });
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = req.cookies?.token || req.cookies?.access_token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required: Missing token' });
    }

    // 2. Decode header to get kid
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    const { header, payload } = decoded;

    // 3. Verify signature using Clerk's public key
    let clerkUserId;
    try {
      const publicKey = await getPublicKey(header.kid);
      const verified = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
      clerkUserId = verified.sub;
    } catch (verifyErr) {
      console.error('[AUTH_MIDDLEWARE] Token verification failed:', verifyErr.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (!clerkUserId) {
      return res.status(401).json({ error: 'Token missing subject claim' });
    }

    // 4. Fetch profile from Supabase by clerk_user_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle();

    if (profileError) {
      console.error('[AUTH_MIDDLEWARE] Profile fetch error:', profileError);
      return res.status(503).json({ error: 'User profile unavailable. Please try again.' });
    }

    if (!profile) {
      console.error('[AUTH_MIDDLEWARE] No profile found for clerk_user_id:', clerkUserId);
      return res.status(503).json({ error: 'User profile unavailable. Please try again.' });
    }

    // 5. Attach to request — keep backward compat: req.user.id = supabase profile id
    req.user = { id: profile.id, clerk_user_id: clerkUserId, email: profile.email };
    req.profile = profile;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = authMiddleware;
