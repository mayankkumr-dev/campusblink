/**
 * bloomFilter.js — Campus Blink Username Bloom Filter Utility
 *
 * Architecture:
 *   • Uses `bloom-filters` npm package (pure JS, zero native deps).
 *   • Singleton pattern: one shared filter instance for the entire process lifetime.
 *   • Hydrated on server startup by paginating through ALL existing profiles.username
 *     in Supabase Postgres via the service-role admin client.
 *   • Exposes three methods consumed by routes and controllers:
 *       - hydrate()    : Call once at startup (in index.js).
 *       - mightExist() : Fast in-memory probabilistic check — O(k) hash ops.
 *       - add()        : Synchronously insert a username after successful registration.
 *
 * False-positive behaviour:
 *   Configured at ~0.1% false-positive rate for up to 500,000 usernames.
 *   A "possibly taken" result ALWAYS falls back to a DB query to confirm.
 *   A "definitely available" result is returned instantly with zero DB I/O.
 */

const { BloomFilter } = require('bloom-filters');
const { supabaseAdmin } = require('../config/supabase');

// ---------------------------------------------------------------------------
// Filter configuration
// ---------------------------------------------------------------------------
const EXPECTED_ITEMS      = 500_000; // Expected max unique usernames
const FALSE_POSITIVE_RATE = 0.001;   // 0.1% false-positive probability

// ---------------------------------------------------------------------------
// Module-level singleton state
// ---------------------------------------------------------------------------
let _filter     = null;
let _isReady    = false;
let _isHydrating = false;
let _totalLoaded = 0;

/**
 * Paginate through every profile row and insert each username into the filter.
 * Uses batches of 1000 rows to avoid Supabase response-size limits.
 */
async function _hydrateFromSupabase() {
  if (!supabaseAdmin) {
    console.warn('[BloomFilter] supabaseAdmin not configured — filter will start empty.');
    return;
  }

  const BATCH_SIZE = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .not('username', 'is', null)
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      throw new Error(
        `[BloomFilter] Failed to fetch usernames batch at offset ${offset}: ${error.message}`
      );
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    for (const row of data) {
      if (row.username) {
        _filter.add(row.username.toLowerCase().trim());
        _totalLoaded++;
      }
    }

    if (data.length < BATCH_SIZE) {
      hasMore = false; // Last page — stop pagination
    } else {
      offset += BATCH_SIZE;
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * hydrate()
 *
 * Initialises the Bloom filter and populates it from the Supabase `profiles`
 * table. Safe to call multiple times — idempotent after the first successful call.
 *
 * @returns {Promise<void>}
 */
async function hydrate() {
  if (_isReady || _isHydrating) return;

  _isHydrating = true;
  _totalLoaded  = 0;

  try {
    console.log('[BloomFilter] Initialising filter...');
    _filter = BloomFilter.create(EXPECTED_ITEMS, FALSE_POSITIVE_RATE);

    console.log('[BloomFilter] Hydrating from Supabase profiles...');
    await _hydrateFromSupabase();

    _isReady = true;
    console.log(`[BloomFilter] Ready — loaded ${_totalLoaded.toLocaleString()} usernames.`);
    console.log(`[BloomFilter] In-memory size: ~${(_filter.size / 8 / 1024).toFixed(1)} KB`);
  } catch (err) {
    // Do NOT crash the server. Fail open: mightExist will return true,
    // so every check falls back to the DB — safe but slower.
    console.error('[BloomFilter] Hydration failed, falling back to DB-only mode:', err.message);
    _filter  = null;
    _isReady = false;
  } finally {
    _isHydrating = false;
  }
}

/**
 * mightExist(username)
 *
 * Probabilistic membership test.
 *   - Returns false → username is DEFINITELY available (no DB query needed).
 *   - Returns true  → username is POSSIBLY taken (trigger DB fallback).
 *
 * If the filter failed to hydrate, conservatively returns `true` so the
 * caller always falls back to the DB — no silent data integrity issues.
 *
 * @param {string} username
 * @returns {boolean}
 */
function mightExist(username) {
  if (!_filter || !_isReady) {
    // Fail-safe: conservatively treat every username as possibly taken
    return true;
  }
  return _filter.has(username.toLowerCase().trim());
}

/**
 * add(username)
 *
 * Synchronously adds a newly registered username to the in-memory filter.
 * Call this immediately after a successful Supabase `profiles` insert so the
 * filter stays consistent with the database without needing a server restart.
 *
 * @param {string} username
 * @returns {void}
 */
function add(username) {
  if (!_filter || !_isReady) return;
  _filter.add(username.toLowerCase().trim());
}

/**
 * stats()
 *
 * Returns diagnostic information about the current filter state.
 * Useful for /health or admin diagnostic endpoints.
 *
 * @returns {{ ready: boolean, hydrating: boolean, totalLoaded: number, expectedItems: number, falsePositiveRate: number, sizeKB: number }}
 */
function stats() {
  return {
    ready: _isReady,
    hydrating: _isHydrating,
    totalLoaded: _totalLoaded,
    expectedItems: EXPECTED_ITEMS,
    falsePositiveRate: FALSE_POSITIVE_RATE,
    sizeKB: _filter ? Math.round(_filter.size / 8 / 1024) : 0,
  };
}

module.exports = { hydrate, mightExist, add, stats };
