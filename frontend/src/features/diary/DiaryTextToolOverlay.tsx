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
  return 'solid';
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
      className="absolute inset-0 z-[70]"
      style={{ touchAction: 'none', borderRadius: '14px', clipPath: 'url(#paper-edges)', overflow: 'hidden' }}
    >
      {/* Dimming Background */}
      <div 
        className="overlay" 
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 10 }}
        onClick={onClose}
      />

      {/* Top Navigation Bar */}
      <div 
        className="top-bar" 
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', padding: '24px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 20 }}
      >
        <div className="tools-left" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div 
            className="color-wheel" 
            onClick={cycleStyleMode} 
            style={{ width: 28, height: 28, borderRadius: '50%', background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)', border: '2px solid white', cursor: 'pointer' }}
          ></div>
          <div 
            className="icon-aa" 
            onClick={cycleFontFamily} 
            style={{ backgroundColor: 'white', color: 'black', width: 28, height: 28, display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 700, fontSize: 15, borderRadius: 6, cursor: 'pointer' }}
          >
            Aa
          </div>
          <div 
            className="icon-align" 
            onClick={cycleAlignment} 
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingLeft: 2, cursor: 'pointer' }}
          >
            <span style={{ display: 'block', height: 2, backgroundColor: 'white', borderRadius: 2, width: 22 }}></span>
            <span style={{ display: 'block', height: 2, backgroundColor: 'white', borderRadius: 2, width: 14 }}></span>
            <span style={{ display: 'block', height: 2, backgroundColor: 'white', borderRadius: 2, width: 22 }}></span>
            <span style={{ display: 'block', height: 2, backgroundColor: 'white', borderRadius: 2, width: 14 }}></span>
          </div>
        </div>
        <div 
          className="btn-done" 
          onClick={handleDone} 
          style={{ color: 'white', fontWeight: 'bold', fontSize: 16, textShadow: '0 1px 2px rgba(0,0,0,0.5)', cursor: 'pointer' }}
        >
          Done
        </div>
      </div>

      {/* Left Tapered Slider */}
      <div 
        className="slider-wrapper" 
        style={{ position: 'absolute', left: 20, top: 130, height: 180, width: 20, display: 'flex', justifyContent: 'center', zIndex: 20, touchAction: 'none' }}
      >
        <DiaryTextSizeSlider
          value={fontSize}
          min={MIN_FONT}
          max={MAX_FONT}
          onSizeChange={setFontSize}
        />
      </div>

      {/* Center White Box with Cyan Cursor */}
      <div 
        className="text-box-container" 
        style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 20 }}
      >
        <div 
          className="fake-input-box" 
          style={{ backgroundColor: 'white', borderRadius: 6, width: 190, minHeight: 48, display: 'flex', alignItems: 'center', paddingLeft: 20, paddingRight: 20, boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)' }}
        >
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={autoGrow}
            placeholder=""
            className="w-full bg-transparent resize-none outline-none border-none overflow-hidden"
            style={{
              color: 'black',
              caretColor: '#6ebbb5',
              fontSize: `${fontSize}px`,
              fontFamily,
              textAlign,
              minHeight: '22px'
            }}
            rows={1}
            autoComplete="off"
            autoCorrect="on"
            spellCheck={true}
          />
        </div>
      </div>
    </div>
  );
}
