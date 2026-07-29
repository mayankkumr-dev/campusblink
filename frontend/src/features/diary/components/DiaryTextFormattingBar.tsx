import React, { useState } from 'react';
import { Trash2, AlignLeft, AlignCenter, AlignRight, Check, Palette } from 'lucide-react';
import { CanvasElement, FontStyleOption, TextBgMode } from '../types';
import { DiaryFontSizeSlider } from './DiaryFontSizeSlider';

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
  const [showColorPalette, setShowColorPalette] = useState(true);

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

  const cycleBgMode = () => {
    const modes: TextBgMode[] = ['solid-white', 'solid-color', 'transparent'];
    const currentMode = activeElement.bgMode || 'transparent';
    const currentIndex = modes.indexOf(currentMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    onUpdate({ bgMode: nextMode });
  };

  const currentBgMode = activeElement.bgMode || 'transparent';

  return (
    <>
      {/* Top Text Formatting Bar */}
      <div className="absolute top-0 inset-x-0 z-[60] flex flex-col pt-safe-top bg-[var(--parchment-toolbar-bg)] backdrop-blur-md border-b border-[var(--parchment-card-border)] shadow-md capture-ignore transition-all duration-200">
        <div className="flex items-center justify-between p-3 px-4 gap-2">
          {/* Delete Button */}
          <button
            onClick={onDelete}
            aria-label="Delete text element"
            className="p-2 -ml-1 rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex-shrink-0"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          {/* Action Tools Group */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {/* 3-State "Aa" Text Background Toggle Button */}
            <button
              onClick={cycleBgMode}
              title="Toggle Text Background Style (White, Color, Transparent)"
              className={`px-3 py-1 rounded-full text-sm font-serif font-bold transition-all border flex items-center justify-center ${
                currentBgMode === 'solid-white'
                  ? 'bg-white text-slate-900 border-slate-300 shadow-sm'
                  : currentBgMode === 'solid-color'
                  ? 'text-white border-white/50 shadow-sm'
                  : 'bg-transparent text-[var(--parchment-text-primary)] border-dashed border-[var(--parchment-border)]'
              }`}
              style={{
                backgroundColor: currentBgMode === 'solid-color' ? (activeElement.color || '#3E2723') : undefined,
              }}
            >
              Aa
            </button>

            {/* Color Palette Toggle Button */}
            <button
              onClick={() => setShowColorPalette((prev) => !prev)}
              title="Select Color"
              className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center flex-shrink-0 transition-transform active:scale-95"
              style={{ backgroundColor: activeElement.color || '#3E2723' }}
            >
              <Palette className="w-4 h-4 text-white drop-shadow-sm opacity-80" />
            </button>

            {/* Font Family Cycle Pill */}
            <button
              onClick={cycleFontFamily}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--parchment-card-bg)] border border-[var(--parchment-card-border)] text-[var(--parchment-text-primary)] hover:bg-[var(--parchment-accent-soft)] transition-colors flex-shrink-0"
              style={{ fontFamily: activeElement.fontFamily || FONTS[0].value }}
            >
              {FONTS.find((f) => f.value === activeElement.fontFamily)?.label || 'Font'}
            </button>

            {/* Alignment Cycle Button */}
            <button
              onClick={cycleAlignment}
              className="p-2 rounded-full hover:bg-[var(--parchment-accent-soft)] text-[var(--parchment-text-primary)] transition-colors flex items-center justify-center flex-shrink-0"
              aria-label="Align text"
            >
              {(activeElement.textAlign || 'center') === 'left' && <AlignLeft className="w-5 h-5" />}
              {(activeElement.textAlign || 'center') === 'center' && <AlignCenter className="w-5 h-5" />}
              {(activeElement.textAlign || 'center') === 'right' && <AlignRight className="w-5 h-5" />}
            </button>
          </div>

          {/* Done Button */}
          <button
            onClick={onDone}
            className="px-4 py-1.5 bg-[var(--parchment-text-primary)] text-[var(--parchment-bg)] rounded-full font-bold text-sm shadow-sm active:scale-95 transition-all flex items-center gap-1 flex-shrink-0"
          >
            <Check className="w-4 h-4" />
            Done
          </button>
        </div>

        {/* Color Palette Strip */}
        {showColorPalette && (
          <div className="w-full overflow-x-auto no-scrollbar flex items-center gap-3 px-4 pb-3 animate-fadeIn">
            {PALETTE.map((color) => (
              <button
                key={color}
                onClick={() => onUpdate({ color })}
                className={`w-7 h-7 rounded-full flex-shrink-0 shadow-sm border-2 transition-transform ${
                  activeElement.color === color
                    ? 'border-[var(--parchment-text-primary)] scale-125 ring-2 ring-amber-500/30'
                    : 'border-gray-300 dark:border-gray-700 scale-100'
                }`}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Smooth Touch & Pointer Vertical Font Size Slider */}
      <DiaryFontSizeSlider
        value={activeElement.fontSize || 32}
        onChange={(newSize) => onUpdate({ fontSize: newSize })}
      />
    </>
  );
}
