import React, { useRef, useState, useCallback } from 'react';

interface DiaryTextSizeSliderProps {
  value: number;       // current font size in px (min–max)
  min?: number;
  max?: number;
  onSizeChange: (px: number) => void;
}

const DEFAULT_MIN = 16;
const DEFAULT_MAX = 72;

/**
 * DiaryTextSizeSlider — Instagram-style vertical font-size slider.
 *
 * Visual design:
 *  • Track: thin semi-transparent white line (w-1, rounded-full, h-64)
 *  • Thumb: clean white circle (w-6 h-6) with drop shadow
 *  • Active thumb: scales to 125% for tactile feedback
 *
 * Interaction:
 *  • Uses Pointer Events API exclusively (covers mouse, touch, stylus).
 *  • setPointerCapture ensures dragging never loses focus on mobile Safari/Chrome.
 *  • Updates are throttled to requestAnimationFrame to prevent stutter.
 *  • touch-action: none prevents accidental page scroll.
 *  • Drag up → larger font, drag down → smaller font.
 */
export function DiaryTextSizeSlider({
  value,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
  onSizeChange,
}: DiaryTextSizeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const rafId = useRef<number | null>(null);
  const pendingSize = useRef<number>(value);

  /** Convert font-size → thumb Y% (0% = top = max size, 100% = bottom = min size) */
  const sizeToPercent = useCallback(
    (size: number) => {
      const clamped = Math.max(min, Math.min(max, size));
      return ((max - clamped) / (max - min)) * 100;
    },
    [min, max]
  );

  /** Convert clientY within the track → font-size px */
  const clientYToSize = useCallback(
    (clientY: number) => {
      if (!trackRef.current) return value;
      const rect = trackRef.current.getBoundingClientRect();
      const relY = Math.max(0, Math.min(rect.height, clientY - rect.top));
      return Math.round(max - (relY / rect.height) * (max - min));
    },
    [min, max, value]
  );

  const flushSize = useCallback(() => {
    rafId.current = null;
    onSizeChange(pendingSize.current);
  }, [onSizeChange]);

  const scheduleUpdate = useCallback(
    (clientY: number) => {
      pendingSize.current = clientYToSize(clientY);
      if (rafId.current !== null) return; // already scheduled
      rafId.current = requestAnimationFrame(flushSize);
    },
    [clientYToSize, flushSize]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      // Capture pointer so moves/up fire even if cursor leaves element
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      setIsDragging(true);
      scheduleUpdate(e.clientY);
    },
    [scheduleUpdate]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      e.preventDefault();
      scheduleUpdate(e.clientY);
    },
    [isDragging, scheduleUpdate]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      setIsDragging(false);
      // Flush any pending animation frame immediately
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
        onSizeChange(pendingSize.current);
      }
    },
    [onSizeChange]
  );

  const thumbPercent = sizeToPercent(value);

  return (
    <div
      className="relative flex justify-center select-none w-full h-full"
      style={{ touchAction: 'none' }}
    >
      {/* Invisible full-height pointer-capture zone */}
      <div
        ref={trackRef}
        className="absolute inset-0 cursor-ns-resize"
        style={{ touchAction: 'none', zIndex: 10, margin: '-10px' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="slider"
        aria-label="Font size"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        tabIndex={0}
      />

      {/* The wedge shape */}
      <div
        className="pointer-events-none relative"
        style={{
          width: 12,
          height: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
        }}
      />

      {/* The circular handle */}
      <div
        className="absolute left-1/2 pointer-events-none z-20"
        style={{
          top: `${thumbPercent}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div
          className={`rounded-full bg-white transition-transform duration-100 ${
            isDragging ? 'scale-125' : 'scale-100'
          }`}
          style={{
            width: 18,
            height: 18,
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
          }}
        />
      </div>

      {/* Floating size badge — shows only while dragging */}
      {isDragging && (
        <div
          className="absolute left-8 px-2 py-0.5 rounded-full text-xs font-bold bg-white text-black shadow-md pointer-events-none whitespace-nowrap transition-all animate-fadeIn z-20"
          style={{
            top: `${thumbPercent}%`,
            transform: 'translateY(-50%)',
          }}
        >
          {value}px
        </div>
      )}
    </div>
  );
}
