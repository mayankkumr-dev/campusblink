import React, { useState, useEffect } from 'react';
import { useThemeStore } from '../../../store/themeStore';

function useIsDarkMode() {
  const storeIsDark = useThemeStore(s => s.isDark);
  const [domIsDark, setDomIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () => {
      const root = document.documentElement;
      setDomIsDark(
        root.classList.contains('dark') ||
        root.getAttribute('data-theme') === 'dark'
      );
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    });
    return () => observer.disconnect();
  }, []);

  return storeIsDark || domIsDark;
}

export function Logo({ height = 34, className = '', alt = 'Campus Blink', ...rest }: any) {
  const isDark = useIsDarkMode();
  const logoSrc = isDark ? '/logo2/white_transparent.png?v=8' : '/logo2/Blue_transparent.png?v=8';

  // Allow custom Tailwind h- classes to control height when passed
  const hasHeightClass = /\bh-/.test(className);

  return (
    <img
      src={logoSrc}
      alt={alt}
      {...rest}
      style={{
        ...(hasHeightClass ? {} : { height: typeof height === 'number' ? `${height}px` : height }),
        width: 'auto',
        maxWidth: '100%',
        objectFit: 'contain',
        transition: 'opacity 0.2s ease',
        ...rest.style
      }}
      className={className}
    />
  );
}

export function LogoIcon({ height = 34, className = '' }: any) {
  const isDark = useIsDarkMode();
  const logoSrc = isDark ? '/logo2/white_transparent.png?v=8' : '/logo2/Blue_transparent.png?v=8';

  return (
    <img
      src={logoSrc}
      alt="Campus Blink"
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        width: 'auto',
        objectFit: 'contain'
      }}
      className={className}
    />
  );
}

