import React, { useRef, useEffect } from 'react';
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
  'Courier New, monospace',
];

export function DiaryDraggableText({
  element,
  isActive,
  onFocus,
  onChange,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus when activated
  useEffect(() => {
    if (isActive && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isActive]);

  const getContainerStyle = (): React.CSSProperties => {
    const mode = element.bgMode || 'transparent';

    if (mode === 'solid-white') {
      return {
        backgroundColor: '#FFFFFF',
        color: '#1E293B',
        borderRadius: '20px',
        padding: '16px 20px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
      };
    }

    if (mode === 'solid-color') {
      const bgCol = element.color || '#3E2723';
      return {
        backgroundColor: bgCol,
        color: '#FFFFFF',
        borderRadius: '20px',
        padding: '16px 20px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
      };
    }

    // Natural transparent parchment page mode
    return {
      backgroundColor: 'transparent',
      padding: '8px 12px',
    };
  };

  const getTextColorStyle = (): React.CSSProperties => {
    const mode = element.bgMode || 'transparent';
    if (mode === 'solid-white') {
      return { color: '#1E293B' };
    }
    if (mode === 'solid-color') {
      return { color: '#FFFFFF' };
    }
    return { color: element.color || 'var(--parchment-text-primary)' };
  };

  return (
    <div
      className="relative w-full h-full flex flex-col justify-start transition-all cursor-text py-2"
      style={getContainerStyle()}
      onClick={(e) => {
        e.stopPropagation();
        onFocus();
        if (textareaRef.current) textareaRef.current.focus();
      }}
    >
      <textarea
        ref={textareaRef}
        value={element.content}
        onChange={(e) => onChange({ content: e.target.value })}
        onFocus={onFocus}
        onClick={(e) => {
          e.stopPropagation();
          onFocus();
        }}
        placeholder="Dear Diary, write your thoughts freely..."
        className="diary-text-input w-full h-full bg-transparent resize-none outline-none border-none leading-relaxed overflow-y-auto overflow-x-hidden text-page-scrollbar break-words font-normal"
        style={{
          fontFamily: element.fontFamily || FONTS[0],
          fontSize: element.fontSize ? `${element.fontSize}px` : '32px',
          textAlign: element.textAlign || 'center',
          lineHeight: 1.5,
          ...getTextColorStyle(),
        }}
      />
    </div>
  );
}
