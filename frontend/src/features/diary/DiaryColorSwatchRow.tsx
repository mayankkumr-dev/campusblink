import React, { useRef } from 'react';
import { TextStyleMode } from './types';

interface DiaryColorSwatchRowProps {
  /** Currently selected color (hex string) */
  activeColor: string;
  /** Which mode we're in — determines label and "no color" semantic */
  mode: TextStyleMode;
  onSelect: (color: string) => void;
}

// Curated palette matching the Instagram-style spec
const SWATCHES = [
  '#FFFFFF', // White
  '#000000', // Black
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#3B82F6', // Blue
  '#A855F7', // Purple
  '#EC4899', // Pink
];


/**
 * DiaryColorSwatchRow
 *
 * Horizontal row of preset color swatches + a "no color" option (⊘) +
 * a color-wheel icon that opens the OS native color picker.
 *
 * Controlled component — parent owns color state per mode.
 */
export function DiaryColorSwatchRow({ activeColor, mode, onSelect }: DiaryColorSwatchRowProps) {
  const nativePickerRef = useRef<HTMLInputElement>(null);

  const openNativePicker = () => {
    nativePickerRef.current?.click();
  };

  const isNoColor = activeColor === 'transparent' || activeColor === '';

  return (
    <div className="w-full flex items-center gap-2.5 px-4 pb-4 pt-2 overflow-x-auto"
      style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>

      {/* Hidden native color picker */}
      <input
        ref={nativePickerRef}
        type="color"
        value={isNoColor ? '#ffffff' : activeColor}
        onChange={(e) => onSelect(e.target.value)}
        className="sr-only"
        aria-label="Custom color picker"
      />

      {/* Color wheel icon → opens picker */}
      <button
        onClick={openNativePicker}
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center border-2 border-white/30 hover:border-white/60 transition-all active:scale-90 relative overflow-hidden"
        style={{
          background: 'conic-gradient(from 0deg, #f72585, #7209b7, #3a0ca3, #4361ee, #4cc9f0, #80ed99, #f4d35e, #f72585)',
        }}
        aria-label="Open custom color picker"
        title="Custom color"
      >
        <div className="w-4 h-4 rounded-full bg-white/20 backdrop-blur-sm" />
      </button>

      {/* "No color" / transparent swatch */}
      <button
        onClick={() => onSelect('transparent')}
        className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all active:scale-90 ${
          isNoColor ? 'border-white scale-110 shadow-lg' : 'border-white/30'
        }`}
        style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
        aria-label="No color"
        title="No color"
      >
        <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5">
          <circle cx="8" cy="8" r="6" />
          <line x1="3" y1="13" x2="13" y2="3" />
        </svg>
      </button>

      {/* Preset swatches */}
      {SWATCHES.map((color) => {
        const isActive = activeColor === color;
        return (
          <button
            key={color}
            onClick={() => onSelect(color)}
            className={`flex-shrink-0 rounded-full transition-all active:scale-90 ${
              isActive
                ? 'scale-110 shadow-lg'
                : 'scale-100 hover:scale-105'
            }`}
            style={{
              width: isActive ? 36 : 32,
              height: isActive ? 36 : 32,
              backgroundColor: color,
              // Ring/halo for active swatch
              outline: isActive ? '3px solid white' : '2px solid rgba(255,255,255,0.25)',
              outlineOffset: isActive ? '2px' : '0',
              boxShadow: isActive ? '0 0 0 1px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.4)' : undefined,
              // Special border for white swatch so it's visible
              border: color === '#FFFFFF' ? '1px solid rgba(0,0,0,0.2)' : 'none',
            }}
            aria-label={`Select color ${color}`}
            aria-pressed={isActive}
          />
        );
      })}
    </div>
  );
}
