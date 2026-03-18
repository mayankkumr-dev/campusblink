import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getUserFeatureAccess, resolveFeatureAccess } from '../api/featureAccess';
import { useAuthStore } from '../store/authStore';

export function useFeatureAccess(profileOrFeature) {
  const storeProfile = useAuthStore((state) => state.profile);
  const featureKey = typeof profileOrFeature === 'string' ? profileOrFeature : null;
  const profile = featureKey ? storeProfile : profileOrFeature;

  const [disabledFeatures, setDisabledFeatures] = useState([]);
  const [platformSettings, setPlatformSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id && !profile?.email) {
      setDisabledFeatures([]);
      setPlatformSettings({});
      setIsLoading(false);
      return undefined;
    }

    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      const { data } = await getUserFeatureAccess(profile?.id);
      if (!mounted) return;
      setDisabledFeatures(data?.disabledFeatures || []);
      setPlatformSettings(data?.platformSettings || {});
      setIsLoading(false);
    };

    load();

    const channel = supabase
      .channel(`feature-access-${profile?.id || profile?.email}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_restrictions' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_settings' }, load)
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [profile?.email, profile?.id]);

  const api = useMemo(() => ({
    disabledFeatures,
    platformSettings,
    isLoading,
    isAllowed: (featureKey) => !disabledFeatures.includes(featureKey),
    resolve: (featureKey) => resolveFeatureAccess(featureKey, disabledFeatures, platformSettings),
  }), [disabledFeatures, platformSettings, isLoading]);

  if (featureKey) {
    const hasAccess = resolveFeatureAccess(featureKey, disabledFeatures, platformSettings);
    return {
      hasAccess,
      isChecking: isLoading,
      disabledFeatures,
      platformSettings,
      isLoading,
      isAllowed: api.isAllowed,
      resolve: api.resolve,
    };
  }

  return api;
}