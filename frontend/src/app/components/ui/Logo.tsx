import React from 'react';

const LIGHT_LOGO_SRC = '/logo2/Blue_transparent.png?v=8';
const DARK_LOGO_SRC = '/logo2/white_transparent.png?v=8';

export function Logo({ height = 34, className = '', alt = 'Campus Blink', ...rest }: any) {
  // Allow custom Tailwind h- classes to control height when passed
  const hasHeightClass = /\bh-/.test(className);
  const commonStyle = {
    ...(hasHeightClass ? {} : { height: typeof height === 'number' ? `${height}px` : height }),
    width: 'auto',
    maxWidth: '100%',
    objectFit: 'contain' as const,
    transition: 'opacity 0.2s ease',
    ...rest.style,
  };

  return (
    <>
      <img
        src={LIGHT_LOGO_SRC}
        alt={alt}
        {...rest}
        style={commonStyle}
        className={`${className} block dark:hidden`}
      />
      <img
        src={DARK_LOGO_SRC}
        alt={alt}
        {...rest}
        style={commonStyle}
        className={`${className} hidden dark:block`}
      />
    </>
  );
}

export function LogoIcon({ height = 34, className = '' }: any) {
  const style = {
    height: typeof height === 'number' ? `${height}px` : height,
    width: 'auto',
    objectFit: 'contain' as const,
  };

  return (
    <>
      <img
        src={LIGHT_LOGO_SRC}
        alt="Campus Blink"
        style={style}
        className={`${className} block dark:hidden`}
      />
      <img
        src={DARK_LOGO_SRC}
        alt="Campus Blink"
        style={style}
        className={`${className} hidden dark:block`}
      />
    </>
  );
}
