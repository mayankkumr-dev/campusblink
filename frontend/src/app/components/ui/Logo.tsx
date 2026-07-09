import React from 'react';
import { useThemeStore } from '../../../store/themeStore';

export function Logo({ height = 40, className = '', alt = 'Campus Blink', ...rest }: any) {
  const isDark = useThemeStore(s => s.isDark)
  const logoSrc = isDark ? '/logo2/white_transparent.png' : '/logo2/Blue_transparent.png?v=4'

  return (
    <img
      src={logoSrc}
      alt={alt}
      height={height}
      {...rest}
      style={{
        height: height,
        width: 'auto',
        objectFit: 'contain',
        transition: 'opacity 0.2s ease',
        ...rest.style
      }}
      className={className}
    />
  )
}

export function LogoIcon({ height = 36, className = '' }) {
  const isDark = useThemeStore(s => s.isDark)
  const logoSrc = isDark ? '/logo2/white_transparent.png' : '/logo2/Blue_transparent.png?v=4'

  return (
    <img
      src={logoSrc}
      alt="Campus Blink"
      height={height}
      style={{
        height: height,
        width: 'auto',
        objectFit: 'contain'
      }}
      className={className}
    />
  )
}
