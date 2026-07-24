import { useState, useEffect, useCallback } from 'react';

const GRACE_PERIOD_MS = 4500;
const LIE_FI_PING_URL = '/favicon.ico';

export function useSmartNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof window !== 'undefined' ? window.navigator.onLine : true
  );
  
  const pingNetwork = useCallback(async () => {
    try {
      // Use cache: 'no-store' and a timestamp to bypass any caching layers
      await fetch(`${LIE_FI_PING_URL}?_cb=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
      });
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let offlineTimeoutId: number | undefined;

    const handleOnline = async () => {
      // Optional: Verify actual connectivity before declaring online
      const trulyOnline = await pingNetwork();
      if (trulyOnline) {
        if (offlineTimeoutId) {
          window.clearTimeout(offlineTimeoutId);
          offlineTimeoutId = undefined;
        }
        setIsOnline(true);
      }
    };

    const handleOffline = () => {
      // Don't update immediately. Start a grace period.
      if (offlineTimeoutId) {
        window.clearTimeout(offlineTimeoutId);
      }
      
      offlineTimeoutId = window.setTimeout(() => {
        setIsOnline(false);
      }, GRACE_PERIOD_MS);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial Lie-Fi check if browser thinks it's online
    if (window.navigator.onLine) {
      pingNetwork().then(trulyOnline => {
        if (!trulyOnline) {
          handleOffline();
        }
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (offlineTimeoutId) {
        window.clearTimeout(offlineTimeoutId);
      }
    };
  }, [pingNetwork]);

  return isOnline;
}
