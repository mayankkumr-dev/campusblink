import React, { useEffect, useState } from 'react';

type AdaptivePostImageProps = {
  key?: React.Key;
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;
};

const DEFAULT_ASPECT_CLASS = 'aspect-square';

function pickAspectClass(width: number, height: number) {
  if (!width || !height) return DEFAULT_ASPECT_CLASS;

  const ratio = width / height;
  if (ratio >= 1.3) return 'aspect-[16/9]';
  if (ratio <= 0.85) return 'aspect-[4/5]';
  return DEFAULT_ASPECT_CLASS;
}

export function AdaptivePostImage({ src, alt, className = '', imgClassName = 'h-full w-full object-contain', onClick, children }: AdaptivePostImageProps) {
  const [aspectClass, setAspectClass] = useState(DEFAULT_ASPECT_CLASS);

  useEffect(() => {
    if (!src) {
      setAspectClass(DEFAULT_ASPECT_CLASS);
      return;
    }

    let active = true;
    const image = new Image();
    image.onload = () => {
      if (!active) return;
      setAspectClass(pickAspectClass(image.naturalWidth, image.naturalHeight));
    };
    image.onerror = () => {
      if (!active) return;
      setAspectClass(DEFAULT_ASPECT_CLASS);
    };
    image.src = src;

    return () => {
      active = false;
    };
  }, [src]);

  const wrapperClassName = `relative overflow-hidden ${aspectClass} ${className}`.trim();

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={wrapperClassName}>
        <img loading="lazy" src={src} alt={alt} className={imgClassName} />
        {children}
      </button>
    );
  }

  return (
    <div className={wrapperClassName}>
      <img loading="lazy" src={src} alt={alt} className={imgClassName} />
      {children}
    </div>
  );
}