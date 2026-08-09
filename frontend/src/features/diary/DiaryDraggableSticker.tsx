import React, { useState, useRef } from 'react';
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
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartAngle = useRef<number | null>(null);
  const startSize = useRef<{ width: number; height: number } | null>(null);
  const startRotation = useRef<number>(0);

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

  // Multi-touch pinch-to-scale helpers
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchAngle = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsHovered(true);
    if (onFocus) onFocus();

    if (e.touches.length === 2) {
      pinchStartDist.current = getTouchDistance(e.touches);
      pinchStartAngle.current = getTouchAngle(e.touches);
      startSize.current = { width: widthNum, height: heightNum };
      startRotation.current = element.rotation || 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDist.current && startSize.current && pinchStartAngle.current !== null) {
      const currentDist = getTouchDistance(e.touches);
      const currentAngle = getTouchAngle(e.touches);
      
      const scaleRatio = currentDist / pinchStartDist.current;
      const newWidth = Math.max(40, Math.min(400, Math.round(startSize.current.width * scaleRatio)));
      const newHeight = Math.max(40, Math.min(400, Math.round(startSize.current.height * scaleRatio)));
      
      let deltaAngle = currentAngle - pinchStartAngle.current;
      // Handle the wraparound at -180/180
      if (deltaAngle > 180) deltaAngle -= 360;
      if (deltaAngle < -180) deltaAngle += 360;
      const newRotation = startRotation.current + deltaAngle;

      onChange({ width: newWidth, height: newHeight, rotation: newRotation });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      pinchStartDist.current = null;
      pinchStartAngle.current = null;
      startSize.current = null;
    }
    setTimeout(() => setIsHovered(false), 2500);
  };

  const handleDeleteClick = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete();
  };

  return (
    <Rnd
      cancel=".capture-ignore"
      default={{
        x: xNum,
        y: yNum,
        width: widthNum,
        height: heightNum,
      }}
      lockAspectRatio={true}
      onDragStart={() => {
        setIsDragging(true);
        if (onFocus) onFocus();
      }}
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
      enableResizing={{
        top: true,
        right: true,
        bottom: true,
        left: true,
        topRight: true,
        bottomRight: true,
        bottomLeft: true,
        topLeft: true,
      }}
      className={`group ${isDragging || isActive ? 'z-50' : 'z-30'} cursor-grab active:cursor-grabbing`}
    >
      <div
        className="relative w-full h-full p-1 select-none cursor-grab active:cursor-grabbing"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          e.stopPropagation();
          if (onFocus) onFocus();
        }}
        style={{
          transform: element.rotation ? `rotate(${element.rotation}deg)` : 'none',
          transformOrigin: 'center center'
        }}
      >
        {/* Delete Button */}
        {(isHovered || isActive || true) && !isDragging && (
          <button
            onMouseDown={handleDeleteClick}
            onTouchEnd={handleDeleteClick}
            onClick={handleDeleteClick}
            aria-label="Remove sticker"
            className="absolute -top-3.5 -right-3.5 w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg flex items-center justify-center z-50 capture-ignore hover:scale-110 active:scale-95 transition-all cursor-pointer pointer-events-auto border-2 border-white"
          >
            <X className="w-4 h-4 text-white stroke-[2.5]" />
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
