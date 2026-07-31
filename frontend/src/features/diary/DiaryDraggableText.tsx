import React, { useRef } from 'react';
import { Rnd } from 'react-rnd';
import { CanvasElement } from './types';

interface Props {
  element: CanvasElement;
  isActive: boolean;
  onFocus: () => void;
  onBlur?: () => void;
  onChange: (updates: Partial<CanvasElement>) => void;
  onDelete: () => void;
  /** Called when the user taps an existing text element to open the overlay editor */
  onOpenOverlay?: () => void;
}

/**
 * Pick maximum-contrast text color (black or white) for a given hex background.
 * Identical to the helper in DiaryTextToolOverlay — kept local to avoid shared module.
 */
function autoContrastColor(hex: string): string {
  const clean = (hex || '').replace('#', '');
  if (clean.length < 6) return '#FFFFFF';
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#000000' : '#FFFFFF';
}

export function DiaryDraggableText({
  element,
  isActive,
  onFocus,
  onChange,
  onDelete,
  onOpenOverlay,
}: Props) {
  const parseNumeric = (val: string | number | undefined, fallback: number) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return fallback;
  };

  const xNum = parseNumeric(element.x, 20);
  const yNum = parseNumeric(element.y, 40);
  const widthNum = parseNumeric(element.width, 300);
  const heightNum = parseNumeric(element.height, 120);

  // ── Style resolution — new 3-state model takes priority, legacy fallback below ──

  /**
   * Normalize legacy 'fill'/'plain' to new 3-state system.
   * Entries saved before the migration are transparently handled.
   */
  const rawMode = element.styleMode ?? 'none';
  const styleMode: 'none' | 'solid' | 'highlight' =
    rawMode === 'fill' ? 'solid' :
    rawMode === 'plain' ? 'none' :
    (rawMode as 'none' | 'solid' | 'highlight');

  /** Pill background color for solid/highlight modes */
  const fillColor =
    element.fillColor ||
    (element.bgMode !== 'transparent' && element.bgMode ? element.color : undefined) ||
    '#3B82F6';

  /** Glyph color for none mode */
  const plainColor =
    element.plainColor ||
    (element.bgMode === 'transparent' || !element.bgMode ? element.color : undefined) ||
    'var(--parchment-text-primary)';

  // Compute container background and text color based on mode
  let containerBg: string;
  let textColor: string;

  if (styleMode === 'solid') {
    containerBg = fillColor;
    textColor = autoContrastColor(fillColor);
  } else if (styleMode === 'highlight') {
    const clean = (fillColor || '').replace('#', '');
    if (clean.length >= 6) {
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      containerBg = `rgba(${r},${g},${b},0.3)`;
    } else {
      containerBg = 'rgba(59,130,246,0.3)';
    }
    textColor = autoContrastColor(fillColor);
  } else {
    // none mode
    containerBg = 'transparent';
    textColor = plainColor;
  }

  const hasPill = styleMode === 'solid' || styleMode === 'highlight';

  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    onFocus();
    // Open full-screen overlay on tap
    if (onOpenOverlay) {
      onOpenOverlay();
    }
  };

  return (
    <Rnd
      default={{
        x: xNum,
        y: yNum,
        width: widthNum,
        height: heightNum,
      }}
      onDragStop={(e, d) => {
        onChange({ x: d.x, y: d.y });
      }}
      onResizeStop={(e, direction, ref, delta, position) => {
        onChange({
          width: ref.offsetWidth,
          height: ref.offsetHeight,
          x: position.x,
          y: position.y,
        });
      }}
      enableResizing={{
        top: false, right: true, bottom: true, left: true,
        topRight: false, bottomRight: true, bottomLeft: true, topLeft: false,
      }}
      disableDragging={isActive}
      className={`group ${isActive ? 'z-50' : 'z-10'}`}
      style={{ touchAction: 'none' }}
    >
      <div
        className="relative w-full h-full flex flex-col justify-center cursor-pointer transition-all duration-150"
        style={{
          backgroundColor: containerBg,
          borderRadius: hasPill ? '18px' : '0',
          padding: hasPill ? '10px 14px' : '8px',
          // NO dashed/dotted border — active state is communicated only via the pencil icon
        }}
        onClick={handleTap}
      >
        <div
          className="w-full h-full leading-relaxed pointer-events-none select-none break-words whitespace-pre-wrap overflow-hidden"
          style={{
            fontFamily: element.fontFamily || 'Caveat, cursive',
            fontSize: element.fontSize ? `${element.fontSize}px` : '32px',
            textAlign: element.textAlign || 'center',
            color: textColor,
            lineHeight: 1.35,
          }}
        >
          {element.content}
        </div>

        {/* Pencil indicator — visible on hover/active to signal editability */}
        <div
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white/90 shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none capture-ignore"
          aria-hidden="true"
        >
          <svg className="w-3 h-3 text-gray-600" viewBox="0 0 16 16" fill="currentColor">
            <path d="M12.85 1.15a1.5 1.5 0 0 1 0 2.12L5.1 11.02 2 12l.98-3.1 7.75-7.75a1.5 1.5 0 0 1 2.12 0z" />
          </svg>
        </div>
      </div>
    </Rnd>
  );
}
