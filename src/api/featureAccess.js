import { supabase } from '../lib/supabase';
import { logAdminAction } from './admin';

export const FEATURE_ACCESS_ITEMS = [
  { key: 'search', label: 'Search' },
  { key: 'exchange', label: 'Campus Exchange' },
  { key: 'canteen', label: 'Canteen' },
  { key: 'print', label: 'Print' },
  { key: 'community', label: 'Community' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'profile', label: 'Profile' },
  { key: 'chats', label: 'Chats' },
  { key: 'ordering', label: 'Ordering' },
  { key: 'listing_creation', label: 'Listing Creation' },
  { key: 'community_posting', label: 'Community Posting' },
];

export const PLATFORM_TOGGLE_ITEMS = [
  { key: 'search', label: 'Search' },
  { key: 'exchange', label: 'Campus Exchange' },
  { key: 'canteen', label: 'Canteen' },
  { key: 'print', label: 'Print' },
  { key: 'community', label: 'Community' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'ordering', label: 'Ordering' },
  { key: 'listing_creation', label: 'Listing Creation' },
  { key: 'community_posting', label: 'Community Posting' },
  { key: 'registrations_enabled', label: 'New Registrations' },
  { key: 'maintenance_mode', label: 'Maintenance Mode' },
];

const FEATURE_KEY_ALIASES = {
  marketplace_access: 'exchange',
  canteen_access: 'canteen',
  print_access: 'print',
  community_access: 'community',
  search_access: 'search',
  alerts_access: 'alerts',
};

function isMissingTable(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('does not exist') || (message.includes('relation') && message.includes('does not exist'));
}

function normalizeFeatureKey(featureKey) {
  const raw = String(featureKey || '').trim().toLowerCase();
  if (!raw) return '';
  if (FEATURE_KEY_ALIASES[raw]) return FEATURE_KEY_ALIASES[raw];
  if (raw.endsWith('_access')) {
    const base = raw.slice(0, -7);
    return FEATURE_KEY_ALIASES[raw] || base;
  }
  return raw;
}

function normalizeDisabledFeatures(features) {
  const allowed = new Set(FEATURE_ACCESS_ITEMS.map((item) => item.key));
  return Array.from(new Set(Array.isArray(features) ? features : []))
    .map((item) => normalizeFeatureKey(item))
    .filter((item) => allowed.has(item));
}

function normalizePlatformValue(value, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Boolean(value);
  if (value && typeof value === 'object' && typeof value.enabled === 'boolean') return value.enabled;
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (['true', '1', 'enabled', 'on'].includes(lowered)) return true;
    if (['false', '0', 'disabled', 'off'].includes(lowered)) return false;
  }
  return fallback;
}

function getPlatformSetting(platformSettings, featureKey) {
  const normalized = normalizeFeatureKey(featureKey);
  const direct = platformSettings?.[normalized];
  if (typeof direct !== 'undefined') return normalizePlatformValue(direct, true);
  const suffixed = platformSettings?.[`${normalized}_enabled`];
  return normalizePlatformValue(suffixed, true);
}

export function resolveFeatureAccess(featureKey, disabledFeatures = [], platformSettings = {}) {
  const normalized = normalizeFeatureKey(featureKey);
  if (!normalized) return true;
  return !disabledFeatures.includes(normalized) && getPlatformSetting(platformSettings, normalized);
}

export async function getPlatformAccess() {
  try {
    const { data, error } = await supabase.from('platform_settings').select('key, value');
    if (error) throw error;

    const platformSettings = PLATFORM_TOGGLE_ITEMS.reduce((accumulator, item) => {
      accumulator[item.key] = true;
      return accumulator;
    }, {});

    (data || []).forEach((row) => {
      const rawKey = String(row.key || '');
      const normalizedKey = rawKey.endsWith('_enabled') ? rawKey.slice(0, -8) : rawKey;
      platformSettings[normalizeFeatureKey(normalizedKey)] = normalizePlatformValue(row.value, platformSettings[normalizedKey]);
    });

    return { data: platformSettings, error: null };
  } catch (error) {
    if (isMissingTable(error)) {
      return {
        data: PLATFORM_TOGGLE_ITEMS.reduce((accumulator, item) => {
          accumulator[item.key] = true;
          return accumulator;
        }, {}),
        error: null,
      };
    }
    return { data: null, error };
  }
}

export async function getUserFeatureAccess(userId) {
  try {
    if (!userId) {
      const { data: platformSettings } = await getPlatformAccess();
      return { data: { disabledFeatures: [], restrictedFeatures: [], platformSettings: platformSettings || {}, reason: null }, error: null };
    }

    const { data: rows, error } = await supabase
      .from('user_restrictions')
      .select('feature, is_enabled, reason')
      .eq('user_id', userId);

    if (error) throw error;

    const restrictedFeatures = normalizeDisabledFeatures(
      (rows || [])
        .filter((row) => row.is_enabled === false)
        .map((row) => row.feature)
    );

    const reason = (rows || []).find((row) => row.reason)?.reason || null;

    const { data: platformSettings } = await getPlatformAccess();
    const platformDisabled = FEATURE_ACCESS_ITEMS
      .map((item) => item.key)
      .filter((key) => !getPlatformSetting(platformSettings, key));

    return {
      data: {
        restrictedFeatures,
        disabledFeatures: Array.from(new Set([...restrictedFeatures, ...platformDisabled])),
        platformSettings: platformSettings || {},
        reason,
      },
      error: null,
    };
  } catch (error) {
    if (isMissingTable(error)) {
      const { data: platformSettings } = await getPlatformAccess();
      return { data: { disabledFeatures: [], restrictedFeatures: [], platformSettings: platformSettings || {}, reason: null }, error: null };
    }
    return { data: null, error };
  }
}

export async function toggleUserFeatureAccess(adminId, userId, featureKey, currentlyEnabled, reason = null) {
  try {
    const normalizedFeature = normalizeFeatureKey(featureKey);
    if (!userId) throw new Error('A user id is required.');
    if (!normalizedFeature) throw new Error('A valid feature key is required.');

    if (currentlyEnabled) {
      const { error } = await supabase
        .from('user_restrictions')
        .upsert({
          user_id: userId,
          feature: normalizedFeature,
          is_enabled: false,
          restricted_by: adminId || null,
          reason: reason || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,feature',
        });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('user_restrictions')
        .delete()
        .eq('user_id', userId)
        .eq('feature', normalizedFeature);
      if (error) throw error;
    }

    if (adminId) {
      await logAdminAction(
        adminId,
        currentlyEnabled ? 'FEATURE_DISABLED' : 'FEATURE_ENABLED',
        'profile',
        userId,
        `feature:${normalizedFeature}`,
        { feature: normalizedFeature, reason: reason || null }
      );
    }

    return { data: { feature: normalizedFeature, enabled: !currentlyEnabled }, error: null };
  } catch (error) {
    console.error('[featureAccess.toggleUserFeatureAccess] failed', {
      userId,
      featureKey,
      currentlyEnabled,
      error,
    });

    const message = String(error?.message || '');
    if (message.toLowerCase().includes('row-level security')) {
      return {
        data: null,
        error: new Error('Feature access update blocked by database policy. Run the updated SQL policy for user_restrictions and ensure your admin profile is recognized in profiles.'),
      };
    }

    return { data: null, error };
  }
}

export async function updateUserFeatureAccess(adminId, payload) {
  try {
    const userId = String(payload?.userId || '').trim();
    const restrictedFeatures = normalizeDisabledFeatures(payload?.restrictedFeatures ?? payload?.disabledFeatures);
    const reason = String(payload?.reason || '').trim() || null;

    if (!userId) {
      throw new Error('A user id is required.');
    }

    const { error: deleteError } = await supabase
      .from('user_restrictions')
      .delete()
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    if (restrictedFeatures.length > 0) {
      const rows = restrictedFeatures.map((feature) => ({
        user_id: userId,
        feature,
        is_enabled: false,
        reason,
        restricted_by: adminId || null,
        updated_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from('user_restrictions')
        .upsert(rows, { onConflict: 'user_id,feature' });

      if (insertError) throw insertError;
    }

    if (adminId) {
      await logAdminAction(adminId, 'UPDATED_FEATURE_ACCESS', 'profile', userId, payload?.userName || userId, {
        restricted_features: restrictedFeatures,
        reason,
      });
    }

    return {
      data: {
        restrictedFeatures,
        disabledFeatures: restrictedFeatures,
        reason,
      },
      error: null,
    };
  } catch (error) {
    console.error('[featureAccess.updateUserFeatureAccess] failed', {
      adminId,
      payload,
      error,
    });

    const message = String(error?.message || '');
    if (message.toLowerCase().includes('row-level security')) {
      return {
        data: null,
        error: new Error('Feature access update blocked by database policy. Apply the updated user_restrictions RLS SQL first.'),
      };
    }

    return { data: null, error };
  }
}

export async function bulkUpdateUserRestrictions(adminId, userIds, payload) {
  try {
    const ids = Array.from(new Set((Array.isArray(userIds) ? userIds : []).filter(Boolean)));
    if (!ids.length) throw new Error('Select at least one user.');

    const restrictedFeatures = normalizeDisabledFeatures(payload?.restrictedFeatures);
    if (!restrictedFeatures.length) throw new Error('Select at least one feature.');

    const reason = String(payload?.reason || '').trim() || null;
    const mode = String(payload?.mode || 'disable').toLowerCase();

    if (mode === 'enable') {
      const { error } = await supabase
        .from('user_restrictions')
        .delete()
        .in('user_id', ids)
        .in('feature', restrictedFeatures);
      if (error) throw error;
    } else {
      const rows = [];
      ids.forEach((userId) => {
        restrictedFeatures.forEach((feature) => {
          rows.push({
            user_id: userId,
            feature,
            is_enabled: false,
            reason,
            restricted_by: adminId || null,
            updated_at: new Date().toISOString(),
          });
        });
      });

      const { error } = await supabase
        .from('user_restrictions')
        .upsert(rows, { onConflict: 'user_id,feature' });
      if (error) throw error;
    }

    if (adminId) {
      await logAdminAction(adminId, mode === 'enable' ? 'BULK_ENABLED_FEATURES' : 'BULK_DISABLED_FEATURES', 'profile', null, 'bulk-user-restrictions', {
        user_ids: ids,
        restricted_features: restrictedFeatures,
        reason,
      });
    }

    return { data: { userIds: ids, restrictedFeatures, reason }, error: null };
  } catch (error) {
    console.error('[featureAccess.bulkUpdateUserRestrictions] failed', {
      adminId,
      userIds,
      payload,
      error,
    });

    const message = String(error?.message || '');
    if (message.toLowerCase().includes('row-level security')) {
      return {
        data: null,
        error: new Error('Bulk feature update blocked by database policy. Apply the updated user_restrictions RLS SQL first.'),
      };
    }

    return { data: null, error };
  }
}

export async function updatePlatformAccess(adminId, settings) {
  try {
    const entries = Object.entries(settings || {});
    if (!entries.length) {
      return { data: {}, error: null };
    }

    for (const [key, value] of entries) {
      const normalizedKey = normalizeFeatureKey(key);
      const normalizedValue = Boolean(value);

      const { data: existing, error: existingError } = await supabase
        .from('platform_settings')
        .select('key')
        .eq('key', normalizedKey)
        .maybeSingle();

      if (existingError && !isMissingTable(existingError)) {
        throw existingError;
      }

      if (existing) {
        const { error } = await supabase
          .from('platform_settings')
          .update({ value: normalizedValue, updated_by: adminId, updated_at: new Date().toISOString() })
          .eq('key', normalizedKey);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('platform_settings')
          .insert([{ key: normalizedKey, value: normalizedValue, updated_by: adminId }]);
        if (error) throw error;
      }
    }

    if (adminId) {
      await logAdminAction(adminId, 'UPDATED_PLATFORM_ACCESS', 'platform_setting', null, 'platform-access', settings);
    }

    return { data: settings, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
