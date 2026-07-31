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

const DEFAULT_FILL_COLOR = '#3B82F6';
const DEFAULT_PLAIN_COLOR = '#FFFFFF';
const DEFAULT_FONT_SIZE = 32;
const DEFAULT_FONT_FAMILY: FontStyleOption = 'Caveat, cursive';
const DEFAULT_ALIGN: TextAlignOption = 'center';
const MIN_FONT = 16;
const MAX_FONT = 72;

/** 3-state cycle order for the Aa button */
const STYLE_MODES: TextStyleMode[] = ['none', 'solid', 'highlight'];

/**
 * Normalize legacy fill/plain values from saved entries to the new 3-state system.
 */
function normalizeMode(mode: TextStyleMode | undefined): 'none' | 'solid' | 'highlight' {
  if (mode === 'fill') return 'solid';
  if (mode === 'plain') return 'none';
  if (mode === 'highlight') return 'highlight';
  if (mode === 'solid') return 'solid';
  return 'none';
}

/**
 * Pick maximum-contrast text color (black or white) for a given background hex color.
 * Uses perceived luminance formula (WCAG).
 */
function autoContrastColor(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length < 6) return '#FFFFFF';
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  // Perceived luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#000000' : '#FFFFFF';
}

/**
 * DiaryTextToolOverlay
 *
 * Full-screen text editing surface. Opens when the user taps Aa on the toolbar
 * or taps an existing text element on the canvas.
 *
 * Features:
 *  - 3-state Aa cycler: none (plain) → solid (pill) → highlight (translucent pill)
 *  - none:      no background, text color = swatch color (plainColor)
 *  - solid:     filled rounded-pill bg (fillColor), text auto-contrasts for readability
 *  - highlight: semi-transparent pill bg (fillColor @ 0.3), text auto-contrasts
 *  - Per-mode color memory — each mode remembers its own last-used color
 *  - Instagram-style slim vertical size slider on the left
 *  - Horizontal color swatch bar at the bottom with native color picker wheel
 *  - Alignment cycles left → center → right without losing focus
 *  - Font family cycle (separate Aa label)
 *  - Done commits without resetting cursor or losing focus
 */
export function DiaryTextToolOverlay({
  initialElement,
  onCommit,
  onClose,
}: DiaryTextToolOverlayProps) {
  // --- Derive initial state from existing element or defaults ---
  const initMode = normalizeMode(initialElement?.styleMode as TextStyleMode);
  const initFill = initialElement?.fillColor ?? DEFAULT_FILL_COLOR;
  const initPlain = initialElement?.plainColor ?? DEFAULT_PLAIN_COLOR;
  const initFontSize = initialElement?.fontSize ?? DEFAULT_FONT_SIZE;
  const initFont = (initialElement?.fontFamily as FontStyleOption) ?? DEFAULT_FONT_FAMILY;
  const initAlign = (initialElement?.textAlign as TextAlignOption) ?? DEFAULT_ALIGN;
  const initContent = initialElement?.content ?? '';

  // --- Per-mode color memory ---
  // fillColor    → used by 'solid' and 'highlight' modes
  // plainColor   → used by 'none' mode
  const fillColorRef = useRef<string>(initMode !== 'none' ? initFill : DEFAULT_FILL_COLOR);
  const plainColorRef = useRef<string>(initMode === 'none' ? initPlain : DEFAULT_PLAIN_COLOR);

  const [styleMode, setStyleMode] = useState<'none' | 'solid' | 'highlight'>(initMode);
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

  // --- Derived rendering values ---

  /** Current active color depends on mode */
  const activeColor = styleMode === 'none' ? plainColor : fillColor;

  /**
   * Update color for whichever mode is active, persisting it per-mode.
   * 'solid' and 'highlight' share the same fillColor.
   */
  const handleColorSelect = useCallback(
    (color: string) => {
      if (styleMode === 'none') {
        plainColorRef.current = color;
        setPlainColor(color);
      } else {
        fillColorRef.current = color;
        setFillColor(color);
      }
    },
    [styleMode]
  );

  /**
   * Cycle Aa button through: none → solid → highlight → none → ...
   * Restores each mode's remembered color on switch.
   */
  const cycleStyleMode = useCallback(() => {
    setStyleMode((prev) => {
      const currentIndex = STYLE_MODES.indexOf(prev);
      const next = STYLE_MODES[(currentIndex + 1) % STYLE_MODES.length] as 'none' | 'solid' | 'highlight';
      // Restore the switched-to mode's remembered color
      if (next === 'none') {
        setPlainColor(plainColorRef.current);
      } else {
        setFillColor(fillColorRef.current);
      }
      return next;
    });
    // Preserve textarea focus across mode switch
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

  // --- Compute textarea preview styles ---

  const textColor: string =
    styleMode === 'none'
      ? (plainColor && plainColor !== 'transparent' ? plainColor : DEFAULT_PLAIN_COLOR)
      : autoContrastColor(fillColor && fillColor !== 'transparent' ? fillColor : DEFAULT_FILL_COLOR);

  const pillBgStyle: React.CSSProperties = (() => {
    if (styleMode === 'solid') {
      return {
        backgroundColor: fillColor && fillColor !== 'transparent' ? fillColor : DEFAULT_FILL_COLOR,
        borderRadius: 18,
        padding: '12px 16px',
      };
    }
    if (styleMode === 'highlight') {
      const base = fillColor && fillColor !== 'transparent' ? fillColor : DEFAULT_FILL_COLOR;
      // Convert hex to rgba with 0.3 opacity
      const clean = base.replace('#', '');
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      return {
        backgroundColor: `rgba(${r},${g},${b},0.3)`,
        borderRadius: 18,
        padding: '12px 16px',
      };
    }
    return {};
  })();

  // --- Aa button live preview style ---

  const currentFontLabel = FONTS.find((f) => f.value === fontFamily)?.label ?? 'Aa';

  const aaBtnStyle: React.CSSProperties = (() => {
    if (styleMode === 'solid') {
      return {
        backgroundColor: fillColor && fillColor !== 'transparent' ? fillColor : DEFAULT_FILL_COLOR,
        color: autoContrastColor(fillColor && fillColor !== 'transparent' ? fillColor : DEFAULT_FILL_COLOR),
        fontFamily,
        borderRadius: 12,
        padding: '2px 10px',
      };
    }
    if (styleMode === 'highlight') {
      const base = fillColor && fillColor !== 'transparent' ? fillColor : DEFAULT_FILL_COLOR;
      const clean = base.replace('#', '');
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      return {
        backgroundColor: `rgba(${r},${g},${b},0.35)`,
        color: '#FFFFFF',
        fontFamily,
        borderRadius: 12,
        padding: '2px 10px',
        border: '1.5px solid rgba(255,255,255,0.3)',
      };
    }
    // none mode
    return {
      color: plainColor && plainColor !== 'transparent' ? plainColor : DEFAULT_PLAIN_COLOR,
      fontFamily,
    };
  })();

  // Aa button aria label
  const modeLabel = styleMode === 'none' ? 'Plain' : styleMode === 'solid' ? 'Solid fill' : 'Highlight';

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[70] flex flex-col transition-all duration-200 ease-out"
      style={{ backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(20px)', touchAction: 'none' }}
    >
      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-safe-top pb-3 mt-2 transition-all duration-200 ease-out">
        {/* Left: close/cancel */}
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-90 transition-all duration-150 text-white text-sm font-medium"
          aria-label="Cancel"
        >
          ✕
        </button>

        {/* Center controls */}
        <div className="flex items-center gap-3">
          {/* Aa style cycler — live-previews current mode + color, cycles none→solid→highlight */}
          <button
            onClick={cycleStyleMode}
            className="rounded-xl px-3 py-1.5 font-bold text-lg transition-all duration-150 active:scale-90"
            style={aaBtnStyle}
            aria-label={`Text background: ${modeLabel}. Tap to cycle.`}
            title={`Style: ${modeLabel}. Tap to cycle.`}
          >
            {currentFontLabel}
          </button>

          {/* Font family cycle */}
          <button
            onClick={cycleFontFamily}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition-all duration-150 flex items-center justify-center text-white text-xs font-semibold"
            aria-label="Cycle font family"
            title="Change font"
          >
            Aa
          </button>

          {/* Alignment cycle */}
          <button
            onClick={cycleAlignment}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition-all duration-150 flex items-center justify-center text-white"
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
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black font-bold text-sm active:scale-90 transition-all duration-150 shadow-lg"
          aria-label="Done — commit text"
        >
          <Check className="w-4 h-4" />
          Done
        </button>
      </div>

      {/* ── Main editing area ────────────────────────────────── */}
      <div className="flex-1 flex items-stretch overflow-hidden" style={{ touchAction: 'none' }}>
        {/* Left: Size slider — slim Instagram-style vertical track */}
        <div className="flex items-center justify-center px-2 py-6" style={{ width: 52, touchAction: 'none' }}>
          <DiaryTextSizeSlider
            value={fontSize}
            min={MIN_FONT}
            max={MAX_FONT}
            onSizeChange={setFontSize}
          />
        </div>

        {/* Center: Text input */}
        <div className="flex-1 flex items-center justify-center px-4 py-6 overflow-auto" style={{ touchAction: 'pan-y' }}>
          <div
            className="w-full max-w-sm transition-all duration-200 ease-out"
            style={pillBgStyle}
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
              className="diary-text-overlay-textarea w-full bg-transparent resize-none outline-none border-none leading-relaxed overflow-hidden min-h-[2em]"
              style={{
                fontFamily,
                fontSize: `${fontSize}px`,
                textAlign,
                color: textColor,
                caretColor: textColor,
                lineHeight: 1.35,
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
      <div className="shrink-0 pb-safe-bottom transition-all duration-200 ease-out">
        <DiaryColorSwatchRow
          activeColor={activeColor}
          mode={styleMode === 'none' ? 'plain' : 'fill'}
          onSelect={handleColorSelect}
        />
      </div>

      {/* Placeholder styling */}
      <style>{`
        .diary-text-overlay-textarea::placeholder {
          color: rgba(255,255,255,0.35);
        }
      `}</style>
    </div>
  );
}
