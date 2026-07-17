import { useCallback, useState } from 'react';

export interface ShareData {
  title?: string;
  text?: string;
  url?: string;
}

interface UseWebShareResult {
  /** True if the Web Share API is available on this device/browser. */
  isSupported: boolean;
  /** Share content using the native OS share sheet. Falls back to clipboard copy if unsupported. */
  share: (data: ShareData) => Promise<ShareResult>;
  /** Status of the last share attempt. */
  lastStatus: ShareStatus | null;
}

export type ShareStatus = 'shared' | 'copied' | 'cancelled' | 'error';

export interface ShareResult {
  status: ShareStatus;
  error?: Error;
}

/**
 * Web Share API hook for sharing campus content natively.
 *
 * Usage:
 * ```tsx
 * const { share, isSupported } = useWebShare();
 *
 * const handleShare = () => share({
 *   title: 'Check out this listing on Campus Blink!',
 *   text: item.title,
 *   url: `${window.location.origin}/student/campus-exchange/${item.id}`,
 * });
 * ```
 *
 * Behavior:
 * - On Android/iOS (Chrome, Safari): Opens the native OS share sheet
 * - On desktop or unsupported browsers: Falls back to copying the URL to clipboard
 * - AbortError (user cancelled) is handled silently (returns 'cancelled')
 */
export function useWebShare(): UseWebShareResult {
  const [lastStatus, setLastStatus] = useState<ShareStatus | null>(null);

  const isSupported =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const share = useCallback(async (data: ShareData): Promise<ShareResult> => {
    // Native share path — Android/iOS
    if (isSupported) {
      try {
        await navigator.share({
          title: data.title,
          text: data.text,
          url: data.url,
        });
        setLastStatus('shared');
        return { status: 'shared' };
      } catch (err) {
        const error = err as Error;
        // User tapped cancel — not an error, handle silently
        if (error.name === 'AbortError') {
          setLastStatus('cancelled');
          return { status: 'cancelled' };
        }
        // Fallback to clipboard if share fails for other reasons
      }
    }

    // Clipboard fallback for desktop / unsupported browsers
    try {
      const textToCopy = data.url || data.text || data.title || '';
      if (typeof navigator.clipboard?.writeText === 'function') {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Legacy execCommand fallback for very old browsers
        const el = document.createElement('textarea');
        el.value = textToCopy;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setLastStatus('copied');
      return { status: 'copied' };
    } catch (err) {
      const error = err as Error;
      setLastStatus('error');
      return { status: 'error', error };
    }
  }, [isSupported]);

  return { isSupported, share, lastStatus };
}
