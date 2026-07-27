import React from 'react';
import { Trash2, AlignLeft, AlignCenter, AlignRight, Check } from 'lucide-react';
import { CanvasElement, FontStyleOption } from '../types';

interface DiaryTextFormattingBarProps {
  activeElement: CanvasElement;
  onUpdate: (updates: Partial<CanvasElement>) => void;
  onDelete: () => void;
  onDone: () => void;
}

const PALETTE = [
  '#3E2723', // Deep Sepia Ink
  '#000000', // Classic Black
  '#5D4037', // Warm Walnut
  '#8D6E63', // Soft Terracotta
  '#C62828', // Vintage Crimson
  '#E65100', // Antique Amber
  '#2E7D32', // Forest Sage
  '#1565C0', // Royal Indigo
  '#6A1B9A', // Deep Plum
  '#FFFFFF', // Parchment Chalk White
];

const FONTS: { label: string; value: FontStyleOption }[] = [
  { label: 'Handwriting', value: 'Caveat, cursive' },
  { label: 'Serif', value: 'Playfair Display, serif' },
  { label: 'Sans', value: 'Inter, sans-serif' },
  { label: 'Monospace', value: 'Courier New, monospace' },
];

export function DiaryTextFormattingBar({
  activeElement,
  onUpdate,
  onDelete,
  onDone,
}: DiaryTextFormattingBarProps) {
  const cycleAlignment = () => {
    const aligns = ['left', 'center', 'right'] as const;
    const currentIndex = aligns.indexOf(activeElement.textAlign || 'center');
    const nextAlign = aligns[(currentIndex + 1) % aligns.length];
    onUpdate({ textAlign: nextAlign });
  };

  const cycleFontFamily = () => {
    const fontValues = FONTS.map((f) => f.value);
    const currentIndex = fontValues.indexOf((activeElement.fontFamily as FontStyleOption) || FONTS[0].value);
    const nextFont = fontValues[(currentIndex + 1) % fontValues.length];
    onUpdate({ fontFamily: nextFont });
  };

  return (
    <>
      {/* Top Text Formatting Bar */}
      <div className="absolute top-0 inset-x-0 z-[60] flex flex-col pt-safe-top bg-[var(--parchment-toolbar-bg)] backdrop-blur-md border-b border-[var(--parchment-card-border)] shadow-md capture-ignore transition-all duration-200">
        <div className="flex items-center justify-between p-3 px-4">
          <button
            onClick={onDelete}
            aria-label="Delete text element"
            className="p-2 -ml-1 rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            {/* Font Family Cycle Pill */}
            <button
              onClick={cycleFontFamily}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--parchment-card-bg)] border border-[var(--parchment-card-border)] text-[var(--parchment-text-primary)] hover:bg-[var(--parchment-accent-soft)] transition-colors"
              style={{ fontFamily: activeElement.fontFamily || FONTS[0].value }}
            >
              {FONTS.find((f) => f.value === activeElement.fontFamily)?.label || 'Font'}
            </button>

            {/* Alignment Cycle Button */}
            <button
              onClick={cycleAlignment}
              className="p-2 rounded-full hover:bg-[var(--parchment-accent-soft)] text-[var(--parchment-text-primary)] transition-colors flex items-center justify-center"
              aria-label="Align text"
            >
              {(activeElement.textAlign || 'center') === 'left' && <AlignLeft className="w-5 h-5" />}
              {(activeElement.textAlign || 'center') === 'center' && <AlignCenter className="w-5 h-5" />}
              {(activeElement.textAlign || 'center') === 'right' && <AlignRight className="w-5 h-5" />}
            </button>
          </div>

          <button
            onClick={onDone}
            className="px-4 py-1.5 bg-[var(--parchment-text-primary)] text-[var(--parchment-bg)] rounded-full font-bold text-sm shadow-sm active:scale-95 transition-all flex items-center gap-1"
          >
            <Check className="w-4 h-4" />
            Done
          </button>
        </div>

        {/* Color Palette Selector */}
        <div className="w-full overflow-x-auto no-scrollbar flex items-center gap-3 px-4 pb-3">
          {PALETTE.map((color) => (
            <button
              key={color}
              onClick={() => onUpdate({ color })}
              className={`w-7 h-7 rounded-full flex-shrink-0 shadow-sm border-2 transition-transform ${
                activeElement.color === color ? 'border-[var(--parchment-text-primary)] scale-110' : 'border-gray-300 dark:border-gray-700 scale-100'
              }`}
              style={{ backgroundColor: color }}
              aria-label={`Select color ${color}`}
            />
          ))}
        </div>
      </div>

      {/* Vertical Font Size Slider */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-[60] h-64 w-8 flex flex-col items-center justify-center capture-ignore">
        <div className="absolute inset-y-0 w-2 flex justify-center py-2 pointer-events-none">
          <div className="w-full h-full bg-[var(--parchment-card-bg)] border border-[var(--parchment-card-border)] rounded-full shadow-inner" />
        </div>
        <input
          type="range"
          min="16"
          max="120"
          value={activeElement.fontSize || 32}
          onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
          className="w-56 h-8 -rotate-90 appearance-none bg-transparent outline-none cursor-pointer absolute m-0 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-[var(--parchment-text-primary)] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
        />
      </div>
    </>
  );
}
