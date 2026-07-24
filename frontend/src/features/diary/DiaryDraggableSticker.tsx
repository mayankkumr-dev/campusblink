import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import { X } from 'lucide-react';
import { CanvasElement } from './DiaryEditor';

interface Props {
  element: CanvasElement;
  onChange: (updates: Partial<CanvasElement>) => void;
  onDelete: () => void;
}

export function DiaryDraggableSticker({ element, onChange, onDelete }: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <Rnd
      default={{
        x: element.x,
        y: element.y,
        width: element.width || 200,
        height: element.height || 200,
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
      className={`group ${isDragging ? 'z-50' : 'z-20'}`}
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
            className="absolute -top-3 -right-3 p-1.5 bg-white shadow-md text-red-500 rounded-full z-10 capture-ignore"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <img 
          src={element.content} 
          alt="sticker" 
          className="w-full h-full object-contain drop-shadow-sm pointer-events-none select-none" 
          draggable={false} 
        />
      </div>
    </Rnd>
  );
}
