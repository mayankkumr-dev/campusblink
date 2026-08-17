import { useCallback, useEffect, useState } from 'react';
import {
  dismissPromptForSevenDays,
  getPushUnavailableReason,
  isPushSubscribed,
  shouldSuppressPrompt,
  subscribeToPush,
  unsubscribeFromPush,
} from '../lib/pushNotifications';
import { isStandaloneMode } from './usePWAInstall';

export interface PushNotificationHookResult {
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
  isLoading: boolean;
  unavailableReason: string | null;
  shouldShowPrompt: boolean;
  isStandalone: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<void>;
  dismiss: () => void;
}

/**
 * usePushNotifications
 *
 * Encapsulates all push notification state and actions for a logged-in user.
 * Explicitly verifies secure HTTPS contexts and standalone PWA installations on Android/Mobile.
 *
 * @param {string | null | undefined} userId - Supabase user ID from auth store
 */
export function usePushNotifications(userId?: string | null): PushNotificationHookResult {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null);
  const [suppressed, setSuppressed] = useState(() => shouldSuppressPrompt());

  const isStandalone = typeof window !== 'undefined' && isStandaloneMode();
  const isSecure = typeof window !== 'undefined' && Boolean(window.isSecureContext);

  // Sync state whenever userId changes (login/logout)
  useEffect(() => {
    let active = true;

    const sync = async () => {
      if (!userId) {
        if (active) {
          setIsSubscribed(false);
          setUnavailableReason(null);
        }
        return;
      }

      const reason = await getPushUnavailableReason();

      if (!active) return;
      setUnavailableReason(reason);

      if (!reason) {
        const subscribed = await isPushSubscribed();
        if (active) {
          setIsSubscribed(subscribed);
          setPermission(
            'Notification' in window ? Notification.permission : 'unsupported'
          );
        }
      }
    };

    sync();

    return () => {
      active = false;
    };
  }, [userId]);

  // Re-sync permission state when the window regains focus
  // (user may have changed browser settings)
  useEffect(() => {
    const onFocus = () => {
      if ('Notification' in window) {
        setPermission(Notification.permission);
        if (Notification.permission === 'denied') setIsSubscribed(false);
      }
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Listen for automatic subscription renewal messages from the Service Worker
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const onMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGE' && userId) {
        console.log('[usePushNotifications] Service worker renewed push subscription; re-registering with backend...');
        await subscribeToPush(userId);
      }
    };

    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [userId]);

  /** Request permission and save the subscription to the backend. */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!userId || isLoading) return false;

    setIsLoading(true);
    try {
      const success = await subscribeToPush(userId);
      if (success) {
        setIsSubscribed(true);
        setPermission('granted');
        setSuppressed(false);
      } else {
        // Re-read permission in case the user denied the OS dialog
        if ('Notification' in window) setPermission(Notification.permission);
      }
      return success;
    } finally {
      setIsLoading(false);
    }
  }, [userId, isLoading]);

  /** Revoke the subscription from PushManager and remove from backend. */
  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!userId || isLoading) return;

    setIsLoading(true);
    try {
      await unsubscribeFromPush(userId);
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, [userId, isLoading]);

  /** Store a 7-day dismiss so the prompt doesn't re-appear immediately. */
  const dismiss = useCallback((): void => {
    dismissPromptForSevenDays();
    setSuppressed(true);
  }, []);

  const shouldShowPrompt = Boolean(
    userId &&
      !isSubscribed &&
      !suppressed &&
      !unavailableReason &&
      isSecure &&
      permission !== 'denied' &&
      permission !== 'unsupported'
  );

  return {
    permission,
    isSubscribed,
    isLoading,
    unavailableReason,
    shouldShowPrompt,
    isStandalone,
    subscribe,
    unsubscribe,
    dismiss,
  };
}
