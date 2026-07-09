import React from 'react';
import { Logo } from './ui/Logo';

export function ThemeAwareLogo({ height = 52, className = '', ...props }: any) {
  // Return the Logo component directly to prevent unwanted wrapper styles breaking sizing rules
  return <Logo height={height} className={className} {...props} />;
}

export default ThemeAwareLogo;

