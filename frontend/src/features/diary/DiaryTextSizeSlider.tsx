import React from 'react';

interface DiaryTextSizeSliderProps {
  value: number;
  min?: number;
  max?: number;
  onSizeChange: (px: number) => void;
}

const DEFAULT_MIN = 16;
const DEFAULT_MAX = 72;

/**
 * DiaryTextSizeSlider — Instagram-style vertical font-size slider.
 *
 * Uses a native <input type="range"> rotated -90deg so drag-up = bigger.
 * The native input is invisible (opacity:0) and sits over the visual wedge+thumb.
 * This guarantees reliable touch/pointer interaction on every browser/device.
 */
export function DiaryTextSizeSlider({
  value,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
  onSizeChange,
}: DiaryTextSizeSliderProps) {
  // 0% = top = max size, 100% = bottom = min size
  const thumbPercent = ((max - value) / (max - min)) * 100;
  const sizeFraction = Math.max(0, Math.min(1, (value - min) / (max - min)));

  const THUMB_MIN = 8;
  const THUMB_MAX = 28;
  const thumbSize = Math.round(THUMB_MIN + sizeFraction * (THUMB_MAX - THUMB_MIN));

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {/* Tapered wedge — visual only */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 16,
          height: '100%',
          backgroundColor: 'rgba(255,255,255,0.75)',
          clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Dynamic thumb — visual only */}
      <div
        style={{
          position: 'absolute',
          top: `${thumbPercent}%`,
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: thumbSize,
          height: thumbSize,
          borderRadius: '50%',
          backgroundColor: 'white',
          boxShadow: '0 2px 10px rgba(0,0,0,0.45)',
          pointerEvents: 'none',
          transition: 'top 0.05s, width 0.08s, height 0.08s',
        }}
      />

      {/*
        Native range input — INVISIBLE but captures all interaction.
        Rotated -90deg so:
          • left end = min = bottom of slider
          • right end = max = top of slider
          → Drag UP increases font size ✓
        Width is set to the container height (220px) so after rotation
        it fills the full vertical space.
      */}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        step={1}
        onChange={(e) => onSizeChange(Number(e.target.value))}
        style={{
          position: 'absolute',
          width: 220,   // becomes the vertical height after rotation
          height: 44,   // becomes the horizontal width after rotation
          margin: 0,
          padding: 0,
          transform: 'rotate(-90deg)',
          WebkitAppearance: 'none',
          appearance: 'none',
          background: 'transparent',
          outline: 'none',
          border: 'none',
          opacity: 0,   // invisible — visual is handled by the wedge+thumb above
          cursor: 'ns-resize',
          touchAction: 'none',
          zIndex: 20,
        }}
        aria-label="Font size"
      />
    </div>
  );
}
