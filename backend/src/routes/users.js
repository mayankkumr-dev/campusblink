/**
 * users.js — User-related routes: username availability check (Bloom Filter).
 *
 * Routes:
 *   GET /api/users/check-username?username=:username
 *     Public endpoint — called on every keystroke from the registration form.
 *     Uses a two-tier lookup strategy:
 *
 *     Tier 1 (Bloom Filter — O(k), in-memory):
 *       If the filter says "definitely NOT in set" → respond immediately as available.
 *       Estimated p99 latency: < 1ms.
 *
 *     Tier 2 (Supabase Postgres — fallback for probable positives):
 *       If the filter says "possibly in set" → query the DB to resolve the ambiguity
 *       caused by inherent Bloom Filter false positives.
 *       Estimated p99 latency: ~15–40ms (indexed unique lookup).
 *
 *   POST /api/users/register
 *     Thin registration endpoint that wraps Supabase Auth signup.
 *     On success, synchronously adds the new username to the Bloom Filter
 *     (write-sync) so subsequent checks are accurate without a restart.
 */

const express = require('express');
const router  = express.Router();
const rateLimit = require('express-rate-limit');
const { supabaseAdmin } = require('../config/supabase');
const bloomFilter = require('../utils/bloomFilter');

// ---------------------------------------------------------------------------
// Dedicated rate limiter for the username check endpoint.
// Real-time keystroke checks = high frequency; we allow up to 120 req/min per IP.
// This is separate from the general 100/15min limiter so it doesn't pollute
// quota for other API calls the client makes simultaneously.
// ---------------------------------------------------------------------------
const usernameLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1-minute rolling window
  max: 120,                   // 120 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many username checks. Please slow down.',
    retryAfter: 60,
  },
  // Key by IP + (optionally) a session fingerprint header for shared NAT fairness
  keyGenerator: (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip,
});

// ---------------------------------------------------------------------------
// Username validation rules (must mirror frontend validation exactly)
// ---------------------------------------------------------------------------
const USERNAME_REGEX       = /^[a-zA-Z0-9._]+$/;
const USERNAME_MIN_LENGTH  = 3;
const USERNAME_MAX_LENGTH  = 30;

// Reserved/system usernames that cannot be claimed
const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'root', 'support', 'help', 'info',
  'campus', 'campusblink', 'system', 'security', 'mod', 'moderator',
  'official', 'staff', 'team', 'bot', 'null', 'undefined',
]);

/**
 * Validate username format and return the first validation error, or null if valid.
 * @param {string} username
 * @returns {string|null}
 */
function validateUsernameFormat(username) {
  if (!username || typeof username !== 'string') return 'Username is required.';
  const trimmed = username.trim();
  if (trimmed.length < USERNAME_MIN_LENGTH) return `Username must be at least ${USERNAME_MIN_LENGTH} characters.`;
  if (trimmed.length > USERNAME_MAX_LENGTH) return `Username cannot exceed ${USERNAME_MAX_LENGTH} characters.`;
  if (!USERNAME_REGEX.test(trimmed))        return 'Username can only contain letters, numbers, dots, and underscores.';
  if (RESERVED_USERNAMES.has(trimmed.toLowerCase())) return 'This username is reserved.';
  return null; // valid
}

// ---------------------------------------------------------------------------
// GET /api/users/check-username?username=<value>
// ---------------------------------------------------------------------------
/**
 * @route   GET /api/users/check-username
 * @desc    Real-time username availability check using Bloom Filter + DB fallback.
 * @access  Public
 *
 * Response shape (HTTP 200 for all valid-format usernames):
 * {
 *   username:   string,  — normalised username checked
 *   available:  boolean, — true = definitely available, false = definitely taken
 *   source:     "bloom_filter" | "database",  — which tier answered the query
 *   message:    string   — human-readable status
 * }
 *
 * Response on invalid format (HTTP 400):
 * { error: string }
 */
router.get('/check-username', usernameLimiter, async (req, res) => {
  const raw = req.query.username;

  // ── Step 1: Format validation ───────────────────────────────────────────
  const validationError = validateUsernameFormat(raw);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const username = raw.trim().toLowerCase();

  // ── Step 2: Bloom Filter tier (O(k) hash ops, zero I/O) ─────────────────
  const possiblyTaken = bloomFilter.mightExist(username);

  if (!possiblyTaken) {
    // DEFINITELY AVAILABLE — Bloom Filter guarantees no false negatives.
    // Return immediately without touching the database.
    return res.json({
      username,
      available: true,
      source: 'bloom_filter',
      message: `@${username} is available!`,
    });
  }

  // ── Step 3: DB Fallback tier — resolve Bloom Filter true/false positives ─
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('username')          // minimal projection — only the column we need
      .eq('username', username)    // exact match (case-normalised)
      .maybeSingle();              // returns null if not found (no error for 0 rows)

    if (error) {
      console.error('[check-username] Supabase query error:', error.message);
      return res.status(500).json({ error: 'Could not check username availability. Please try again.' });
    }

    const isTaken = data !== null;

    return res.json({
      username,
      available: !isTaken,
      source: 'database',
      message: isTaken
        ? `@${username} is already taken.`
        : `@${username} is available!`,
    });
  } catch (err) {
    console.error('[check-username] Unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/users/register
// ---------------------------------------------------------------------------
/**
 * @route   POST /api/users/register
 * @desc    Register a new user via Supabase Auth, then sync the new username
 *          into the Bloom Filter for immediate cache consistency.
 * @access  Public
 *
 * Request body:
 * {
 *   email:    string,
 *   password: string,
 *   username: string,
 *   fullName: string,   (optional)
 *   role:     string,   (optional, defaults to 'student')
 *   collegeId: string,  (optional)
 * }
 */
router.post('/register', async (req, res) => {
  const { email, password, username, fullName, role = 'student', collegeId } = req.body;

  // ── Validate required fields ─────────────────────────────────────────────
  if (!email || !password || !username) {
    return res.status(400).json({ error: 'email, password, and username are required.' });
  }

  const usernameValidationError = validateUsernameFormat(username);
  if (usernameValidationError) {
    return res.status(400).json({ error: usernameValidationError });
  }

  const normalisedUsername = username.trim().toLowerCase();

  // ── Pre-flight: quick username availability check before touching Auth ───
  // This is not strictly necessary (DB has a unique constraint) but it gives
  // a fast, friendly error before an expensive Auth call.
  const possiblyTaken = bloomFilter.mightExist(normalisedUsername);
  if (possiblyTaken) {
    // Confirm against DB before rejecting
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('username', normalisedUsername)
      .maybeSingle();

    if (existingUser) {
      return res.status(409).json({
        error: 'This username is already taken. Please choose another.',
        field: 'username',
      });
    }
  }

  // ── Create the auth user in Supabase ─────────────────────────────────────
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: false, // user must verify their email
    user_metadata: {
      username: normalisedUsername,
      full_name: fullName || '',
      role,
      college_id: collegeId || null,
    },
  });

  if (authError) {
    // Supabase Auth returns a descriptive message (e.g., "User already registered")
    return res.status(400).json({ error: authError.message });
  }

  const userId = authData.user.id;

  // ── Upsert the profile row ───────────────────────────────────────────────
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id:         userId,
      email:      email.toLowerCase().trim(),
      username:   normalisedUsername,
      name:       fullName || normalisedUsername,
      role,
      college_id: collegeId || null,
      status:     'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select('id, email, username, name, role, status, created_at')
    .single();

  if (profileError) {
    // Auth user was created but profile insert failed — still sync the filter
    // conservatively (treat as if the username is now taken in Auth).
    bloomFilter.add(normalisedUsername);
    console.error('[register] Profile upsert error:', profileError.message);
    return res.status(500).json({ error: 'Account created but profile setup failed. Please contact support.' });
  }

  // ── ★ Write-Sync: add username to Bloom Filter immediately ───────────────
  // This is the critical step that keeps the filter consistent without a restart.
  // Must happen AFTER a confirmed successful DB write.
  bloomFilter.add(normalisedUsername);

  return res.status(201).json({
    message: 'Registration successful. Please check your email to verify your account.',
    user: {
      id:       profile.id,
      email:    profile.email,
      username: profile.username,
      name:     profile.name,
      role:     profile.role,
    },
  });
});

module.exports = router;
