import React, { useRef, useState, useEffect } from 'react';

interface DiaryFontSizeSliderProps {
  value: number; // 16 to 120
  onChange: (newSize: number) => void;
}

export function DiaryFontSizeSlider({ value, onChange }: DiaryFontSizeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const calculateSizeFromY = (clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    // Invert Y: top is max (120), bottom is min (16)
    const relativeY = Math.max(0, Math.min(rect.height, clientY - rect.top));
    const percentage = 1 - relativeY / rect.height; // 1 at top, 0 at bottom
    const minSize = 16;
    const maxSize = 120;
    const calculated = Math.round(minSize + percentage * (maxSize - minSize));
    onChange(calculated);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    calculateSizeFromY(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    calculateSizeFromY(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      setIsDragging(true);
      calculateSizeFromY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches[0]) {
      calculateSizeFromY(e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Percentage from bottom to top for thumb positioning
  const minSize = 16;
  const maxSize = 120;
  const clampedVal = Math.max(minSize, Math.min(maxSize, value || 32));
  const fillPercent = ((clampedVal - minSize) / (maxSize - minSize)) * 100;

  return (
    <div className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-[70] flex items-center capture-ignore">
      {/* Outer Slider Track Container */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="relative w-8 h-56 sm:h-64 flex items-center justify-center cursor-ns-resize touch-none select-none py-3"
      >
        {/* Track Bar Background */}
        <div className="w-2 h-full bg-[var(--parchment-card-bg)] border border-[var(--parchment-card-border)] rounded-full shadow-inner relative overflow-hidden pointer-events-none">
          {/* Filled Track Segment */}
          <div
            className="absolute bottom-0 inset-x-0 bg-[var(--parchment-text-primary)] rounded-full transition-all duration-75 opacity-60"
            style={{ height: `${fillPercent}%` }}
          />
        </div>

        {/* Draggable Thumb Knob */}
        <div
          className={`absolute w-7 h-7 rounded-full bg-[var(--parchment-card-bg)] border-2 border-[var(--parchment-text-primary)] shadow-lg flex items-center justify-center transition-transform ${
            isDragging ? 'scale-125 ring-4 ring-amber-500/20' : 'hover:scale-110'
          }`}
          style={{ bottom: `calc(${fillPercent}% - 14px + 12px)` }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--parchment-text-primary)]" />
        </div>
      </div>

      {/* Floating Font Size Badge */}
      <div
        className={`ml-2 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--parchment-text-primary)] text-[var(--parchment-bg)] shadow-md transition-all duration-200 pointer-events-none ${
          isDragging ? 'opacity-100 scale-110 translate-x-0' : 'opacity-80 translate-x-0'
        }`}
      >
        {clampedVal}px
      </div>
    </div>
  );
}
