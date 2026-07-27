import React, { useState, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { X } from 'lucide-react';
import { CanvasElement } from './types';

interface Props {
  element: CanvasElement;
  isActive?: boolean;
  onFocus?: () => void;
  onChange: (updates: Partial<CanvasElement>) => void;
  onDelete: () => void;
}

export function DiaryDraggableSticker({ element, isActive, onFocus, onChange, onDelete }: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const parseNumeric = (val: string | number | undefined, fallback: number) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return fallback;
  };

  const xNum = parseNumeric(element.x, 60);
  const yNum = parseNumeric(element.y, 100);
  const widthNum = parseNumeric(element.width, 120);
  const heightNum = parseNumeric(element.height, 120);

  const isImageUrl =
    element.content.startsWith('http://') ||
    element.content.startsWith('https://') ||
    element.content.startsWith('blob:') ||
    element.content.startsWith('data:') ||
    element.content.startsWith('/');

  return (
    <Rnd
      default={{
        x: xNum,
        y: yNum,
        width: widthNum,
        height: heightNum,
      }}
      lockAspectRatio={true}
      onDragStart={() => setIsDragging(true)}
      onDragStop={(e, d) => {
        setIsDragging(false);
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
      className={`group ${isDragging ? 'z-50' : 'z-30'} cursor-grab active:cursor-grabbing`}
    >
      <div 
        className="relative w-full h-full p-1"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => setIsHovered(true)}
        onTouchEnd={() => setTimeout(() => setIsHovered(false), 2000)}
      >
        {/* Delete Button (Only visible on hover/touch) */}
        {isHovered && !isDragging && (
          <button 
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
            onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
            className="absolute -top-3 -right-3 p-1.5 bg-white shadow-md text-red-500 rounded-full z-10 capture-ignore hover:scale-110 active:scale-95 transition-transform"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {isImageUrl ? (
          <img 
            src={element.content} 
            alt="sticker" 
            className="w-full h-full object-contain drop-shadow-sm pointer-events-none select-none" 
            draggable={false} 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl sm:text-6xl drop-shadow-md select-none pointer-events-none">
            {element.content}
          </div>
        )}
      </div>
    </Rnd>
  );
}
