const { supabaseAdmin } = require('../config/supabase');

/**
 * Authentication middleware that verifies bearer tokens or cookies exclusively
 * using Supabase Auth (supabaseAdmin.auth.getUser(token)).
 * Custom JWT verification has been removed as authentication is handled by Supabase Auth exclusively.
 */
const authMiddleware = async (req, res, next) => {
  try {
    // 1. Prioritize secure cookie token, fallback to Authorization Bearer header
    let token = req.cookies?.token || req.cookies?.access_token;
    const authHeader = req.headers.authorization;

    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required: Missing token' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase admin client not configured' });
    }

    // 2. Verify token exclusively using Supabase Auth
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // 3. Fetch full profile with role information
    let profile = null;
    try {
      const { data: dbProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('[AUTH_MIDDLEWARE_ERROR] Profile query failure:', profileError);
        return res.status(503).json({ error: 'User profile unavailable. Please try again.' });
      }

      if (dbProfile) {
        profile = dbProfile;
      }
    } catch (profileQueryError) {
      console.error('[AUTH_MIDDLEWARE_ERROR] Profile query threw exception:', profileQueryError);
      return res.status(503).json({ error: 'User profile unavailable. Please try again.' });
    }

    if (!profile) {
      console.error(JSON.stringify({
        level: 'error',
        event: 'MISSING_USER_PROFILE',
        message: 'Valid authentication token presented but no corresponding DB profile found',
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString()
      }));
      return res.status(503).json({ error: 'User profile unavailable. Please try again.' });
    }

    // Attach to request
    req.user = user;
    req.profile = profile;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = authMiddleware;
