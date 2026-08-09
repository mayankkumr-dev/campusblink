import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CanvasElement, TextAlignOption, FontStyleOption } from './types';
import { DiaryTextSizeSlider } from './DiaryTextSizeSlider';

interface DiaryTextToolOverlayProps {
  /** Existing element to edit — null means creating a new text node */
  initialElement: Partial<CanvasElement> | null;
  /** Called with committed element data when user taps Done */
  onCommit: (element: Partial<CanvasElement>) => void;
  /** Called when the overlay should close without committing (back/cancel) */
  onClose: () => void;
}

// ── Swatch palette ────────────────────────────────────────────────────────────
const SWATCHES = [
  { color: '#4ab3e5', label: 'Blue' },
  { color: '#ffffff', label: 'White' },
  { color: '#000000', label: 'Black' },
  { color: '#6bb22e', label: 'Green' },
  { color: '#ff754c', label: 'Orange' },
  { color: '#fdd04c', label: 'Yellow' },
  { color: '#e9334b', label: 'Red' },
  { color: '#d1197c', label: 'Pink' },
];

// ── Aa mode cycle: white bg → blue bg → no bg ────────────────────────────────
type AaMode = 'white' | 'blue' | 'none';
const AA_CYCLE: AaMode[] = ['white', 'blue', 'none'];

const BLUE_COLOR  = '#4ab3e5';
const WHITE_COLOR = '#ffffff';

const DEFAULT_FONT_SIZE  = 32;
const DEFAULT_FONT_FAMILY: FontStyleOption = 'Inter, sans-serif';
const DEFAULT_ALIGN: TextAlignOption = 'center';
const MIN_FONT = 12;
const MAX_FONT = 96;

/** WCAG perceived-luminance: returns '#000000' or '#FFFFFF' for best contrast */
function autoContrastColor(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length < 6) return '#FFFFFF';
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#000000' : '#FFFFFF';
}

/**
 * DiaryTextToolOverlay — Instagram-style full-screen text editor.
 *
 * Aa cycles:  white bg → blue bg → no bg (plain text)
 *
 * Color-wheel icon (top-left):
 *   • Tap → shows horizontal swatch row just below the top bar
 *   • In white/blue mode → swatches change the box background color
 *   • In none mode       → swatches change the text color
 */
export function DiaryTextToolOverlay({
  initialElement,
  onCommit,
  onClose,
}: DiaryTextToolOverlayProps) {
  // ── Derive initial mode from saved element ───────────────────────────────
  const deriveInitMode = (): AaMode => {
    const sm = initialElement?.styleMode;
    if (sm === 'none' || sm === 'plain') return 'none';
    const bg = initialElement?.fillColor ?? '';
    if (bg.toLowerCase() === WHITE_COLOR) return 'white';
    return 'blue'; // solid / fill / highlight → blue
  };

  const [aaMode,     setAaMode]     = useState<AaMode>(deriveInitMode());
  const [bgColor,    setBgColor]    = useState<string>(
    initialElement?.fillColor ?? (deriveInitMode() === 'white' ? WHITE_COLOR : BLUE_COLOR)
  );
  const [textColor,  setTextColor]  = useState<string>(
    initialElement?.plainColor ?? '#FFFFFF'
  );
  const [fontSize,   setFontSize]   = useState<number>(initialElement?.fontSize    ?? DEFAULT_FONT_SIZE);
  const fontFamily                  = (initialElement?.fontFamily as FontStyleOption) ?? DEFAULT_FONT_FAMILY;
  const [textAlign,  setTextAlign]  = useState<TextAlignOption>((initialElement?.textAlign as TextAlignOption) ?? DEFAULT_ALIGN);
  const [content,    setContent]    = useState<string>(initialElement?.content ?? '');
  const [swatchOpen, setSwatchOpen] = useState(false);

  const textareaRef     = useRef<HTMLTextAreaElement>(null);
  const nativePickerRef = useRef<HTMLInputElement>(null);

  // Focus on mount
  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  // Auto-grow textarea
  const autoGrow = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);
  useEffect(() => { autoGrow(); }, [content, fontSize, autoGrow]);

  // ── Aa mode cycle ─────────────────────────────────────────────────────────
  const cycleAa = useCallback(() => {
    setAaMode((prev) => {
      const next = AA_CYCLE[(AA_CYCLE.indexOf(prev) + 1) % AA_CYCLE.length];
      // Set a sensible default bg when switching to white/blue
      if (next === 'white') setBgColor(WHITE_COLOR);
      if (next === 'blue')  setBgColor(BLUE_COLOR);
      return next;
    });
    setSwatchOpen(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  // ── Color-wheel toggle ────────────────────────────────────────────────────
  const handleColorWheelClick = useCallback(() => {
    setSwatchOpen((prev) => !prev);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  // ── Swatch / picker color select ─────────────────────────────────────────
  const handleColorSelect = useCallback((color: string) => {
    if (aaMode === 'none') {
      setTextColor(color);
    } else {
      setBgColor(color);
    }
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [aaMode]);

  // ── Native picker value for color-wheel input ─────────────────────────────
  const pickerValue = aaMode === 'none' ? textColor : bgColor;

  // ── Alignment ─────────────────────────────────────────────────────────────
  const cycleAlignment = useCallback(() => {
    const aligns: TextAlignOption[] = ['left', 'center', 'right'];
    setTextAlign((prev) => aligns[(aligns.indexOf(prev) + 1) % aligns.length]);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  // ── Done ──────────────────────────────────────────────────────────────────
  const handleDone = useCallback(() => {
    if (!content.trim()) { onClose(); return; }
    const styleMode = aaMode === 'none' ? 'none' : 'solid';
    onCommit({
      content:    content.trim(),
      fontFamily,
      fontSize,
      textAlign,
      styleMode,
      fillColor:  aaMode === 'none' ? 'transparent' : bgColor,
      plainColor: aaMode === 'none' ? textColor : autoContrastColor(bgColor),
    });
  }, [content, fontFamily, fontSize, textAlign, aaMode, bgColor, textColor, onCommit, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleDone(); }
  }, [handleDone]);

  // ── Derived rendering values ──────────────────────────────────────────────
  const alignWidths =
    textAlign === 'left'  ? [22, 16, 22, 10] :
    textAlign === 'right' ? [10, 22, 10, 22] :
    [22, 14, 22, 14];

  // Aa button appearance
  const aaBtnBg: string =
    aaMode === 'white' ? WHITE_COLOR :
    aaMode === 'blue'  ? BLUE_COLOR  :
    'transparent';
  const aaBtnTextColor =
    aaMode === 'none' ? '#FFFFFF' : autoContrastColor(aaBtnBg);
  const aaBtnBorder =
    aaMode === 'none' ? '2px solid rgba(255,255,255,0.7)' : '1px solid rgba(255,255,255,0.35)';

  // Text box appearance
  const boxBg  = aaMode === 'none' ? 'transparent' : bgColor;
  const dispTextColor =
    aaMode === 'none'
      ? textColor
      : autoContrastColor(bgColor);

  // Active color for swatch highlight
  const activeSwatchColor = aaMode === 'none' ? textColor : bgColor;

  return (
    <div
      className="absolute inset-0 z-[70]"
      style={{ touchAction: 'none', overflow: 'hidden', borderRadius: 14 }}
    >
      {/* Dimming background */}
      <div
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 10 }}
        onClick={onClose}
      />

      {/* ── ① Top bar ────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%',
          padding: '24px 20px 15px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>

          {/* Color-wheel — toggles swatch row */}
          <input
            ref={nativePickerRef}
            type="color"
            value={pickerValue}
            onChange={(e) => handleColorSelect(e.target.value)}
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
            aria-hidden
          />
          <div
            onClick={handleColorWheelClick}
            title="Change color"
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
              border: swatchOpen ? '2.5px solid white' : '2px solid rgba(255,255,255,0.6)',
              cursor: 'pointer', flexShrink: 0,
              boxShadow: swatchOpen ? '0 0 0 2px rgba(255,255,255,0.25)' : 'none',
              transition: 'border 0.15s ease',
            }}
          />

          {/* Aa — cycles white → blue → none */}
          <div
            onClick={cycleAa}
            title="Toggle text background"
            style={{
              backgroundColor: aaBtnBg,
              color: aaBtnTextColor,
              width: 28, height: 28,
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              fontWeight: 700, fontSize: 15,
              borderRadius: 6,
              border: aaBtnBorder,
              flexShrink: 0, cursor: 'pointer', userSelect: 'none',
              transition: 'background-color 0.2s ease, border 0.2s ease',
            }}
          >
            Aa
          </div>

          {/* Alignment lines */}
          <div
            onClick={cycleAlignment}
            title={`Alignment: ${textAlign}`}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 4, paddingLeft: 2, paddingRight: 2, cursor: 'pointer',
            }}
          >
            {alignWidths.map((w, i) => (
              <span key={i} style={{ display: 'block', height: 2, backgroundColor: 'white', borderRadius: 2, width: w }} />
            ))}
          </div>
        </div>

        {/* Done */}
        <div
          onClick={handleDone}
          style={{
            color: 'white', fontWeight: 700, fontSize: 16,
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            cursor: 'pointer', padding: '4px 2px',
          }}
        >
          Done
        </div>
      </div>

      {/* ── ② Swatch row — only visible when color-wheel is tapped ──────── */}
      <div
        style={{
          position: 'absolute', top: 75, left: 0, width: '100%',
          padding: '0 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          zIndex: 20,
          opacity: swatchOpen ? 1 : 0,
          pointerEvents: swatchOpen ? 'auto' : 'none',
          transform: swatchOpen ? 'translateY(0)' : 'translateY(-8px)',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
        }}
      >
        {/* ✕ close swatches (also opens native picker) */}
        <div
          onClick={() => { setSwatchOpen(false); nativePickerRef.current?.click(); }}
          title="Custom color"
          style={{
            width: 26, height: 26, borderRadius: '50%',
            border: '1.5px solid white',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}>
            <line x1="6" y1="6" x2="18" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <line x1="18" y1="6" x2="6" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {/* Colour swatches */}
        {SWATCHES.map(({ color, label }) => {
          const isActive = activeSwatchColor === color;
          return (
            <div
              key={color}
              onClick={() => handleColorSelect(color)}
              title={label}
              style={{
                width: 26, height: 26, borderRadius: '50%',
                border: '1.5px solid white',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                cursor: 'pointer', flexShrink: 0,
                backgroundColor: isActive ? 'transparent' : color,
                outline: isActive ? '2px solid white' : 'none',
                outlineOffset: isActive ? 2 : 0,
                transform: isActive ? 'scale(1.15)' : 'scale(1)',
                transition: 'transform 0.15s ease',
              }}
            >
              {isActive && <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: color }} />}
            </div>
          );
        })}
      </div>

      {/* ── ③ Left tapered font-size slider ─────────────────────────────── */}
      <div
        style={{
          position: 'absolute', left: 8, top: 130,
          height: 220, width: 44,
          display: 'flex', justifyContent: 'center', alignItems: 'stretch',
          zIndex: 30, touchAction: 'none',
        }}
      >
        <DiaryTextSizeSlider
          value={fontSize}
          min={MIN_FONT}
          max={MAX_FONT}
          onSizeChange={setFontSize}
        />
      </div>

      {/* ── ④ Centred text box ───────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 20, maxWidth: '75%', minWidth: 160,
        }}
      >
        <div
          style={{
            backgroundColor: boxBg,
            borderRadius: aaMode === 'none' ? 0 : 6,
            padding: '14px 20px',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            boxShadow: aaMode === 'none' ? 'none' : '0 4px 15px rgba(0,0,0,0.15)',
            transition: 'background-color 0.2s ease, border-radius 0.2s ease',
          }}
        >
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={autoGrow}
            placeholder="Start typing..."
            rows={1}
            autoComplete="off"
            autoCorrect="on"
            spellCheck={true}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              overflow: 'hidden',
              width: '100%',
              color: dispTextColor,
              caretColor: dispTextColor,
              fontSize: `${fontSize}px`,
              fontFamily,
              textAlign,
              minHeight: 22,
              letterSpacing: '-0.374px',
              lineHeight: 1.47,
              fontWeight: 500,
              textShadow: aaMode === 'none' ? '0 1px 3px rgba(0,0,0,0.6)' : 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}

