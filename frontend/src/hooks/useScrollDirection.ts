import { useState, useEffect, useRef } from 'react';

export type ScrollDirection = 'up' | 'down';

interface UseScrollDirectionOptions {
  /** Threshold in pixels before updating scroll direction state to prevent jitter */
  threshold?: number;
  /** Initial scroll direction */
  initialDirection?: ScrollDirection;
}

/**
 * Custom React hook that tracks scroll direction ('up' or 'down') across window
 * and any scrollable containers (like `<main className="overflow-y-auto">`).
 *
 * Uses event capturing ({ capture: true }) so scroll events triggered inside inner
 * flexbox containers are caught reliably.
 */
export function useScrollDirection(options: UseScrollDirectionOptions = {}): ScrollDirection {
  const { threshold = 12, initialDirection = 'up' } = options;
  const [scrollDir, setScrollDir] = useState<ScrollDirection>(initialDirection);
  const prevScrollYRef = useRef<number>(0);

  useEffect(() => {
    let ticking = false;

    const updateScrollDirection = (event: Event) => {
      const target = event.target as HTMLElement | Document;
      const currentScrollY =
        target instanceof HTMLElement
          ? target.scrollTop
          : window.scrollY || document.documentElement.scrollTop || 0;

      // Always show navigation when at the top of the page
      if (currentScrollY <= 20) {
        if (scrollDir !== 'up') {
          setScrollDir('up');
        }
        prevScrollYRef.current = currentScrollY;
        ticking = false;
        return;
      }

      // Check if scroll difference exceeds threshold
      const diff = currentScrollY - prevScrollYRef.current;
      if (Math.abs(diff) > threshold) {
        const newDirection: ScrollDirection = diff > 0 ? 'down' : 'up';
        if (newDirection !== scrollDir) {
          setScrollDir(newDirection);
        }
        prevScrollYRef.current = currentScrollY;
      }
      ticking = false;
    };

    const handleScroll = (event: Event) => {
      if (!ticking) {
        window.requestAnimationFrame(() => updateScrollDirection(event));
        ticking = true;
      }
    };

    // Attach with capture: true to catch scrolls inside overflow-y-auto <main> containers
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [scrollDir, threshold]);

  return scrollDir;
}
