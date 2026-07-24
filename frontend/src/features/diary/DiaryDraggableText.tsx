import React, { useRef, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { CanvasElement } from './DiaryEditor';

interface Props {
  element: CanvasElement;
  isActive: boolean;
  onFocus: () => void;
  onChange: (updates: Partial<CanvasElement>) => void;
  onDelete: () => void;
}

const FONTS = ['Caveat, cursive', 'Inter, sans-serif', 'Playfair Display, serif', 'Courier New, monospace'];

export function DiaryDraggableText({ element, isActive, onFocus, onChange, onDelete }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isActive && textareaRef.current) {
      textareaRef.current.focus();
    } else if (!isActive && textareaRef.current) {
      textareaRef.current.blur();
    }
  }, [isActive]);

  const handleBlur = () => {
    // If empty and blurred, remove it
    if (!element.content.trim()) {
      onDelete();
    }
  };

  const getBgClass = () => {
    switch (element.bgMode) {
      case 'solid-white': return 'bg-white rounded-xl shadow-sm p-3';
      case 'solid-color': return 'rounded-xl shadow-sm p-3';
      default: return 'bg-transparent p-3';
    }
  };

  const getContainerStyle = () => {
    if (element.bgMode === 'solid-color') {
      return { backgroundColor: element.color || '#000000' };
    }
    return {};
  };

  const getTextColorStyle = () => {
    if (element.bgMode === 'solid-color') {
      return { color: '#FFFFFF' };
    }
    return { color: element.color || '#000000' };
  };

  return (
    <Rnd
      default={{
        x: element.x,
        y: element.y,
        width: element.width || 200,
        height: element.height || 100,
      }}
      bounds="parent"
      onDragStop={(e, d) => onChange({ x: d.x, y: d.y })}
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
      onMouseDown={onFocus}
      onTouchStart={onFocus}
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
