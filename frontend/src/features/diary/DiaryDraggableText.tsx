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

  // ── Style resolution — new model takes priority, legacy fields are fallback ──

  /** styleMode defaults to 'plain' for entries created before this migration */
  const styleMode = element.styleMode ?? 'plain';

  /** Glyph color for plain mode — new field, then legacy color, then CSS var */
  const plainColor =
    element.plainColor ||
    (element.bgMode === 'transparent' || !element.bgMode ? element.color : undefined) ||
    'var(--parchment-text-primary)';

  /** Pill background color for fill mode */
  const fillColor = element.fillColor || element.color || '#1A1A1A';

  const textColor = styleMode === 'fill' ? '#FFFFFF' : plainColor;
  const containerBg = styleMode === 'fill' ? fillColor : 'transparent';
  const hasPill = styleMode === 'fill';

  // Active (editing) dashed border — only in plain mode (fill has its own bg)
  const activeBorder =
    isActive && styleMode === 'plain'
      ? { border: '1.5px dashed var(--parchment-border)', borderRadius: '6px' }
      : {};

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
    >
      <div
        className="relative w-full h-full flex flex-col justify-center cursor-pointer transition-all"
        style={{
          backgroundColor: containerBg,
          borderRadius: hasPill ? '18px' : '0',
          padding: hasPill ? '10px 14px' : '8px',
          ...activeBorder,
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
          {element.content || (isActive ? '' : '')}
        </div>

        {/* Tap hint on hover — shows a pencil indicator */}
        <div
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white/90 shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none capture-ignore"
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
