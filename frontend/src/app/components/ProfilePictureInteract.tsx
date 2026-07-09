import React, { useCallback, useEffect, useRef, useState } from 'react';

type ProfilePictureInteractProps = {
  children: React.ReactNode;
  imageUrl?: string | null;
  alt?: string;
  className?: string;
  longPressMs?: number;
  enabled?: boolean;
};

const MOVE_THRESHOLD_PX = 12;

export function ProfilePictureInteract({
  children,
  imageUrl,
  alt = 'Profile picture',
  className = '',
  longPressMs = 450,
  enabled = true,
}: ProfilePictureInteractProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const endPress = useCallback(() => {
    clearTimer();
    touchStartRef.current = null;
  }, [clearTimer]);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (!enabled) return;

    const touch = event.touches?.[0];
    if (!touch) return;

    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    clearTimer();

    timerRef.current = setTimeout(() => {
      suppressClickRef.current = true;
      setIsPreviewOpen(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, longPressMs);
  }, [clearTimer, enabled, longPressMs]);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (!enabled) return;

    const start = touchStartRef.current;
    const touch = event.touches?.[0];
    if (!start || !touch) return;

    const distanceX = Math.abs(touch.clientX - start.x);
    const distanceY = Math.abs(touch.clientY - start.y);

    if (distanceX > MOVE_THRESHOLD_PX || distanceY > MOVE_THRESHOLD_PX) {
      clearTimer();
    }
  }, [clearTimer, enabled]);

  const handleClickCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressClickRef.current = false;
    }
  }, []);

  useEffect(() => () => {
    clearTimer();
  }, [clearTimer]);

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
    suppressClickRef.current = true;
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  }, []);

  const fallbackInitial = alt.trim().charAt(0).toUpperCase() || '?';

  return (
    <>
      <div
        className={className}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={endPress}
        onTouchCancel={endPress}
        onPointerUp={endPress}
        onPointerCancel={endPress}
        onClickCapture={handleClickCapture}
      >
        {children}
      </div>

      {isPreviewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xl" onClick={closePreview}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={alt}
              onClick={(event) => event.stopPropagation()}
              className="h-64 w-64 rounded-full object-cover shadow-[0_24px_60px_rgba(0,0,0,0.35)] ring-4 ring-white/80"
            />
          ) : (
            <div onClick={(event) => event.stopPropagation()} className="flex h-64 w-64 items-center justify-center rounded-full bg-[var(--text-primary)] text-7xl font-black text-white shadow-[0_24px_60px_rgba(0,0,0,0.35)] ring-4 ring-white/80">
              {fallbackInitial}
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}

export default ProfilePictureInteract;