import React, { useState } from 'react';

export function ImageWithFallback({
  src,
  alt,
  className,
  fallbackSrc,
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement> & { fallbackSrc?: string }) {
  const [error, setError] = useState(false);
  return (
    <img
      src={error || !src ? (fallbackSrc || '/logo2/Blue_transparent.png?v=8') : src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      {...rest}
    />
  );
}
