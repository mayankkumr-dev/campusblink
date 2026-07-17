import { useEffect } from 'react';

export function useThemeColor() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const updateThemeColor = () => {
      const isDark = document.documentElement.classList.contains('dark');
      const color = isDark ? '#101113' : '#F9FAFB';

      let metaThemeColor = document.querySelector('meta[name="theme-color"]:not([media])') as HTMLMetaElement;
      
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.name = 'theme-color';
        document.head.appendChild(metaThemeColor);
      }
      
      metaThemeColor.content = color;
      
      // Also update the media-specific one if it exists to be safe
      const mediaThemeColor = document.querySelector('meta[name="theme-color"][media]') as HTMLMetaElement;
      if (mediaThemeColor) {
        mediaThemeColor.content = color;
      }
    };

    // Initial update
    updateThemeColor();

    // Observe class changes on html element
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          updateThemeColor();
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);
}
