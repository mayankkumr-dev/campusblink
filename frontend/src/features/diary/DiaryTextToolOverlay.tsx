import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AlignLeft, AlignCenter, AlignRight, Check } from 'lucide-react';
import { CanvasElement, TextStyleMode, TextAlignOption, FontStyleOption } from './types';
import { DiaryTextSizeSlider } from './DiaryTextSizeSlider';
import { DiaryColorSwatchRow } from './DiaryColorSwatchRow';

interface DiaryTextToolOverlayProps {
  /** Existing element to edit — null means creating a new text node */
  initialElement: Partial<CanvasElement> | null;
  /** Called with committed element data when user taps Done */
  onCommit: (element: Partial<CanvasElement>) => void;
  /** Called when the overlay should close without committing (back/cancel) */
  onClose: () => void;
}

const FONTS: { label: string; value: FontStyleOption }[] = [
  { label: 'Script', value: 'Caveat, cursive' },
  { label: 'Serif', value: 'Playfair Display, serif' },
  { label: 'Sans', value: 'Inter, sans-serif' },
  { label: 'Mono', value: 'Courier New, monospace' },
];

const DEFAULT_FILL_COLOR = '#1A1A1A';
const DEFAULT_PLAIN_COLOR = '#FFFFFF';
const DEFAULT_FONT_SIZE = 32;
const DEFAULT_FONT_FAMILY: FontStyleOption = 'Caveat, cursive';
const DEFAULT_ALIGN: TextAlignOption = 'center';
const MIN_FONT = 14;
const MAX_FONT = 72;

/**
 * DiaryTextToolOverlay
 *
 * Full-screen text editing surface. Opens when the user taps Aa on the toolbar
 * or taps an existing text element on the canvas.
 *
 * Features:
 *  - Fill mode: solid rounded-pill background, text always light/white
 *  - Plain mode: no background, text color = selected swatch color
 *  - Each mode remembers its own last-used color independently
 *  - Tapered vertical size slider (DiaryTextSizeSlider) on the left
 *  - Horizontal color swatches at the bottom (DiaryColorSwatchRow)
 *  - Aa button cycles font family AND live-previews current mode+color
 *  - Alignment cycles left → center → right without losing focus
 *  - Done commits without resetting cursor or losing focus
 */
export function DiaryTextToolOverlay({
  initialElement,
  onCommit,
  onClose,
}: DiaryTextToolOverlayProps) {
  // --- Derive initial state from existing element or defaults ---
  const initMode: TextStyleMode = (initialElement?.styleMode as TextStyleMode) ?? 'plain';
  const initFill = initialElement?.fillColor ?? DEFAULT_FILL_COLOR;
  const initPlain = initialElement?.plainColor ?? DEFAULT_PLAIN_COLOR;
  const initFontSize = initialElement?.fontSize ?? DEFAULT_FONT_SIZE;
  const initFont = (initialElement?.fontFamily as FontStyleOption) ?? DEFAULT_FONT_FAMILY;
  const initAlign = (initialElement?.textAlign as TextAlignOption) ?? DEFAULT_ALIGN;
  const initContent = initialElement?.content ?? '';

  // --- Per-mode color memory (each mode remembers its last color independently) ---
  const fillColorRef = useRef<string>(initMode === 'fill' ? initFill : DEFAULT_FILL_COLOR);
  const plainColorRef = useRef<string>(initMode === 'plain' ? initPlain : DEFAULT_PLAIN_COLOR);

  const [styleMode, setStyleMode] = useState<TextStyleMode>(initMode);
  const [fillColor, setFillColor] = useState<string>(initFill);
  const [plainColor, setPlainColor] = useState<string>(initPlain);
  const [fontSize, setFontSize] = useState<number>(initFontSize);
  const [fontFamily, setFontFamily] = useState<FontStyleOption>(initFont);
  const [textAlign, setTextAlign] = useState<TextAlignOption>(initAlign);
  const [content, setContent] = useState<string>(initContent);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Focus textarea on mount
  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  // Auto-grow textarea height
  const autoGrow = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    autoGrow();
  }, [content, fontSize, fontFamily, autoGrow]);

  /** Currently active color for the current mode */
  const activeColor = styleMode === 'fill' ? fillColor : plainColor;

  /** Update color for whichever mode is active, remembering it per mode */
  const handleColorSelect = useCallback(
    (color: string) => {
      if (styleMode === 'fill') {
        fillColorRef.current = color;
        setFillColor(color);
      } else {
        plainColorRef.current = color;
        setPlainColor(color);
      }
    },
    [styleMode]
  );

  /** Toggle style mode — restores that mode's last-used color */
  const toggleStyleMode = useCallback(() => {
    setStyleMode((prev) => {
      const next: TextStyleMode = prev === 'fill' ? 'plain' : 'fill';
      // Restore the other mode's remembered color
      if (next === 'fill') {
        setFillColor(fillColorRef.current);
      } else {
        setPlainColor(plainColorRef.current);
      }
      return next;
    });
    // Re-focus textarea after toggle — switching mode must not lose focus
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  /** Cycle through font families */
  const cycleFontFamily = useCallback(() => {
    const fontValues = FONTS.map((f) => f.value);
    const currentIndex = fontValues.indexOf(fontFamily);
    const nextFont = fontValues[(currentIndex + 1) % fontValues.length] as FontStyleOption;
    setFontFamily(nextFont);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [fontFamily]);

  /** Cycle alignment left → center → right */
  const cycleAlignment = useCallback(() => {
    const aligns: TextAlignOption[] = ['left', 'center', 'right'];
    const currentIndex = aligns.indexOf(textAlign);
    setTextAlign(aligns[(currentIndex + 1) % aligns.length]);
    // Re-focus without resetting cursor
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [textAlign]);

  /** Commit and close */
  const handleDone = useCallback(() => {
    if (!content.trim()) {
      onClose();
      return;
    }
    onCommit({
      content: content.trim(),
      fontFamily,
      fontSize,
      textAlign,
      styleMode,
      fillColor,
      plainColor,
    });
  }, [content, fontFamily, fontSize, textAlign, styleMode, fillColor, plainColor, onCommit, onClose]);

  // Keyboard shortcut: Cmd/Ctrl+Enter commits
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleDone();
      }
    },
    [handleDone]
  );

  // --- Derived rendering values ---
  const textColor = styleMode === 'fill' ? '#FFFFFF' : (plainColor || '#FFFFFF');
  const pillBg = styleMode === 'fill' ? fillColor : 'transparent';
  const currentFontLabel = FONTS.find((f) => f.value === fontFamily)?.label ?? 'Aa';

  // Aa button preview: show pill background if fill mode
  const aaBtnStyle: React.CSSProperties =
    styleMode === 'fill'
      ? {
          backgroundColor: fillColor,
          color: '#FFFFFF',
          fontFamily,
          borderRadius: '12px',
          padding: '2px 8px',
        }
      : {
          color: plainColor || '#FFFFFF',
          fontFamily,
        };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[70] flex flex-col"
      style={{ backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(20px)' }}
    >
      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-safe-top pb-3 mt-2">
        {/* Left: close/cancel */}
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-90 transition-all text-white text-sm font-medium"
          aria-label="Cancel"
        >
          ✕
        </button>

        {/* Center controls */}
        <div className="flex items-center gap-3">
          {/* Aa mode toggle — live-previews current mode + color */}
          <button
            onClick={toggleStyleMode}
            className="rounded-xl px-3 py-1.5 font-bold text-lg transition-all active:scale-90"
            style={aaBtnStyle}
            aria-label={`Text style: ${styleMode} mode. Tap to toggle.`}
            title={styleMode === 'fill' ? 'Fill mode — tap for Plain' : 'Plain mode — tap for Fill'}
          >
            {currentFontLabel}
          </button>

          {/* Font family cycle (separate Aa label) */}
          <button
            onClick={cycleFontFamily}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition-all flex items-center justify-center text-white text-xs font-semibold"
            aria-label="Cycle font"
            title="Change font"
          >
            Aa
          </button>

          {/* Alignment cycle */}
          <button
            onClick={cycleAlignment}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition-all flex items-center justify-center text-white"
            aria-label={`Alignment: ${textAlign}. Tap to cycle.`}
          >
            {textAlign === 'left' && <AlignLeft className="w-5 h-5" />}
            {textAlign === 'center' && <AlignCenter className="w-5 h-5" />}
            {textAlign === 'right' && <AlignRight className="w-5 h-5" />}
          </button>
        </div>

        {/* Right: Done */}
        <button
          onClick={handleDone}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black font-bold text-sm active:scale-90 transition-all shadow-lg"
          aria-label="Done — commit text"
        >
          <Check className="w-4 h-4" />
          Done
        </button>
      </div>

      {/* ── Main editing area ────────────────────────────────── */}
      <div className="flex-1 flex items-stretch overflow-hidden">
        {/* Left: Size slider */}
        <div className="flex items-center justify-center px-2 py-6" style={{ width: 52 }}>
          <DiaryTextSizeSlider
            value={fontSize}
            min={MIN_FONT}
            max={MAX_FONT}
            onSizeChange={setFontSize}
          />
        </div>

        {/* Center: Text input */}
        <div className="flex-1 flex items-center justify-center px-3 py-6 overflow-auto">
          <div
            className="w-full max-w-sm relative rounded-2xl transition-all duration-150"
            style={{
              backgroundColor: pillBg,
              padding: styleMode === 'fill' ? '12px 16px' : '0',
              borderRadius: styleMode === 'fill' ? '18px' : '0',
            }}
          >
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              onInput={autoGrow}
              placeholder="Type something..."
              className="w-full bg-transparent resize-none outline-none border-none leading-relaxed overflow-hidden min-h-[2em]"
              style={{
                fontFamily,
                fontSize: `${fontSize}px`,
                textAlign,
                color: textColor,
                caretColor: textColor,
                lineHeight: 1.35,
                // Placeholder color
                // (use ::placeholder pseudo if needed)
              }}
              rows={1}
              autoComplete="off"
              autoCorrect="on"
              spellCheck={true}
            />
          </div>
        </div>
      </div>

      {/* ── Bottom: Color swatches ───────────────────────────── */}
      <div className="shrink-0 pb-safe-bottom">
        <DiaryColorSwatchRow
          activeColor={activeColor}
          mode={styleMode}
          onSelect={handleColorSelect}
        />
      </div>

      {/* Placeholder color fix (injected inline style) */}
      <style>{`
        .diary-text-overlay-textarea::placeholder {
          color: rgba(255,255,255,0.35);
        }
      `}</style>
    </div>
  );
}
