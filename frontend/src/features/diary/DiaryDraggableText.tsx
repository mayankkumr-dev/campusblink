import React, { useRef, useEffect, useState } from 'react';
import { Rnd } from 'react-rnd';
import { Trash2 } from 'lucide-react';
import { CanvasElement } from './types';

interface Props {
  element: CanvasElement;
  isActive: boolean;
  onFocus: () => void;
  onBlur?: () => void;
  onChange: (updates: Partial<CanvasElement>) => void;
  onDelete: () => void;
}

const FONTS = [
  'Caveat, cursive',
  'Playfair Display, serif',
  'Inter, sans-serif',
  'monospace',
];

export function DiaryDraggableText({
  element,
  isActive,
  onFocus,
  onBlur,
  onChange,
  onDelete,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isActive && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isActive]);

  const handleBlur = (e: React.FocusEvent) => {
    if (!element.content.trim()) {
      onDelete();
    } else if (onBlur) {
      onBlur();
    }
  };

  const getBgClass = () => {
    if (element.bgMode === 'solid-white') return 'bg-white rounded-xl shadow-sm p-3';
    if (element.bgMode === 'solid-color') return 'rounded-xl shadow-sm p-3';
    return 'bg-transparent p-3';
  };

  const getContainerStyle = () => {
    if (element.bgMode === 'solid-color') {
      return { backgroundColor: element.color || '#000000' };
    }
    if (isActive && element.bgMode === 'transparent') {
      return { border: '1.5px dashed var(--parchment-border)', borderRadius: '6px' };
    }
    return {};
  };

  const getTextColorStyle = () => {
    if (element.bgMode === 'solid-white') {
      return { color: '#1E293B' };
    }
    return { color: element.color || 'var(--parchment-text-primary)' };
  };

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
        top: false, right: true, bottom: false, left: true, 
        topRight: false, bottomRight: false, bottomLeft: false, topLeft: false
      }}
      disableDragging={isActive}
      className={`group ${isActive ? 'z-50' : 'z-10'}`}
    >
      <div 
        className={`relative w-full h-full flex flex-col justify-center ${getBgClass()} transition-all cursor-text`}
        style={getContainerStyle()}
        onClick={onFocus}
      >
        <textarea
          ref={textareaRef}
          value={element.content}
          onChange={(e) => onChange({ content: e.target.value })}
          onFocus={onFocus}
          onClick={(e) => e.stopPropagation()}
          onBlur={handleBlur}
          placeholder={isActive ? 'Type something...' : ''}
          className={`w-full h-full bg-transparent resize-none outline-none border-none leading-relaxed overflow-hidden`}
          style={{ 
            fontFamily: element.fontFamily || FONTS[0], 
            fontSize: element.fontSize ? `${element.fontSize}px` : '32px',
            textAlign: element.textAlign || 'center',
            ...getTextColorStyle()
          }}
        />
      </div>
    </Rnd>
  );
}
