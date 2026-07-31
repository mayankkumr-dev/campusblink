import React, { useRef, useEffect, useCallback } from 'react';

interface DiaryTextSizeSliderProps {
  value: number;          // current font size in px (14–72)
  min?: number;
  max?: number;
  onSizeChange: (px: number) => void;
}

const DEFAULT_MIN = 14;
const DEFAULT_MAX = 72;

/**
 * DiaryTextSizeSlider
 *
 * Candle-shaped (tapered) vertical drag slider pinned to the left edge of the
 * text overlay. Dragging up → larger font, dragging down → smaller.
 *
 * Implementation notes:
 *  - Uses Pointer Events API (pointerdown/pointermove/pointerup) — no separate
 *    mouse + touch handlers. Avoids the classic double-fire on hybrid devices.
 *  - touch-action: none on the track prevents page scroll under the thumb on
 *    mobile Safari/Chrome.
 *  - onSizeChange is throttled to requestAnimationFrame to prevent stutter on
 *    mid-range Android devices.
 *  - Track height is measured from the component's actual rendered size at mount
 *    (not 100vh) so it stays correct when the mobile keyboard is open.
 *  - Handle Y is clamped to track bounds.
 */
export function DiaryTextSizeSlider({
  value,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
  onSizeChange,
}: DiaryTextSizeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const rafId = useRef<number | null>(null);
  const pendingSize = useRef<number>(value);

  /** Convert font-size px → Y position in track (0 = top = max, trackH = bottom = min) */
  const sizeToY = useCallback(
    (size: number, trackH: number) => {
      const clamped = Math.max(min, Math.min(max, size));
      // Invert: big size → top → small Y
      return ((max - clamped) / (max - min)) * trackH;
    },
    [min, max]
  );

  /** Convert Y position in track → font-size px */
  const yToSize = useCallback(
    (y: number, trackH: number) => {
      const clamped = Math.max(0, Math.min(trackH, y));
      return Math.round(max - (clamped / trackH) * (max - min));
    },
    [min, max]
  );

  const getTrackHeight = () => {
    return trackRef.current?.getBoundingClientRect().height ?? 200;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    isDragging.current = true;
    updateFromEvent(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    e.preventDefault();
    updateFromEvent(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false;
    // Flush any pending RAF
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
      onSizeChange(pendingSize.current);
    }
  };

  const updateFromEvent = (clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const y = clientY - rect.top;
    const trackH = rect.height;
    const newSize = yToSize(y, trackH);
    pendingSize.current = newSize;

    // Throttle to RAF
    if (rafId.current !== null) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      onSizeChange(pendingSize.current);
    });
  };

  // Compute handle position
  const trackHeight = trackRef.current?.getBoundingClientRect().height ?? 200;
  const handleY = sizeToY(value, trackHeight);

  // Taper widths at top and bottom (candle shape)
  const topWidth = 28;
  const bottomWidth = 10;

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: topWidth + 8, height: '100%', touchAction: 'none' }}
    >
      {/* SVG taper track */}
      <svg
        viewBox={`0 0 ${topWidth + 8} 100`}
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      >
        {/* Gradient fill for the taper */}
        <defs>
          <linearGradient id="taper-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
          </linearGradient>
        </defs>
        <polygon
          points={`${(topWidth + 8) / 2 - topWidth / 2},0 ${(topWidth + 8) / 2 + topWidth / 2},0 ${(topWidth + 8) / 2 + bottomWidth / 2},100 ${(topWidth + 8) / 2 - bottomWidth / 2},100`}
          fill="url(#taper-grad)"
          stroke="rgba(255,255,255,0.20)"
          strokeWidth="1"
          rx="4"
        />
      </svg>

      {/* Invisible pointer-capture track overlay */}
      <div
        ref={trackRef}
        className="absolute inset-x-0 inset-y-0 cursor-ns-resize"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="slider"
        aria-label="Font size"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />

      {/* Drag handle — round pill, visually centered on the track */}
      <div
        className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-10 transition-none"
        style={{ top: `${(handleY / Math.max(trackHeight, 1)) * 100}%`, transform: 'translate(-50%, -50%)' }}
      >
        <div
          className="rounded-full bg-white shadow-lg border-2 border-white/40 flex items-center justify-center"
          style={{ width: 26, height: 26, boxShadow: '0 2px 8px rgba(0,0,0,0.35)' }}
        >
          {/* Tiny size indicator dots */}
          <div className="flex flex-col gap-[2px] items-center">
            <div className="w-2.5 h-[1.5px] bg-gray-400 rounded-full" />
            <div className="w-2 h-[1.5px] bg-gray-400 rounded-full" />
            <div className="w-1.5 h-[1.5px] bg-gray-400 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
