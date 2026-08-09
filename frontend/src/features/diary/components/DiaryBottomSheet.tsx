import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Check } from 'lucide-react';
import { colorThemes } from '../DiaryThemeSelector';

interface DiaryBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBgId?: string;
  onSelectBg: (bg: any) => void;
  onUploadImage: () => void;
}

export const PREBUILT_BACKGROUNDS = [
  { id: 'parchment-default', name: 'Yellow Parchment', isPremium: false },
  { id: 'scroll', name: 'Torn Scroll', isPremium: false },
  { id: 'flat-paper', name: 'Flat Paper', isPremium: false },
  { id: 'pink-paper', name: 'Soft Pink', isPremium: true },
  { id: 'white-paper', name: 'White Crumpled', isPremium: false },
];

export function DiaryBottomSheet({
  isOpen,
  onClose,
  selectedBgId,
  onSelectBg,
  onUploadImage,
}: DiaryBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  // Tracks whether the sheet should be in DOM (for exit animation)
  const [isMounted, setIsMounted] = useState(isOpen);

  // Mount immediately when opening; unmount after exit animation delay when closing
  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      setTranslateY(0);
    } else {
      // Wait for exit animation to finish before unmounting
      const t = setTimeout(() => setIsMounted(false), 350);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!isMounted) return null;

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setStartY(clientY);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const delta = Math.max(0, clientY - startY);
    setTranslateY(delta);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (translateY > 100) {
      onClose();
    } else {
      setTranslateY(0);
    }
  };

  // Pre-process backgrounds for display
  const swatches = colorThemes.filter(t => t.id !== 'parchment-default' && t.id !== 'white-paper');

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col justify-end transition-opacity duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Bottom Sheet Modal */}
      <div
        ref={sheetRef}
        className="relative w-full bg-[#030d1d] rounded-t-3xl border-t border-white/10 flex flex-col pb-safe-bottom"
        style={{
          transform: `translateY(${isOpen ? translateY : 100}%)`,
          transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
          maxHeight: '85vh',
        }}
      >
        {/* Drag Handle Area */}
        <div
          className="w-full flex justify-center py-4 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseMove={handleTouchMove}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
        >
          <div className="w-12 h-1.5 bg-white/20 rounded-full" />
        </div>

        <div className="overflow-y-auto px-5 pb-8 flex-1 custom-scrollbar">
          {/* Background Section */}
          <div className="mb-8">
            <h3 className="text-white text-[15px] font-semibold mb-4 opacity-90">Background</h3>
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x hide-scrollbar">
              {swatches.map((swatch) => {
                const isSelected = selectedBgId === swatch.id;
                return (
                  <button
                    key={swatch.id}
                    onClick={() => onSelectBg(swatch)}
                    className="relative flex-shrink-0 w-12 h-12 rounded-full snap-center shadow-md transition-transform hover:scale-105 active:scale-95"
                    style={{
                      background: swatch.background,
                      boxShadow: isSelected ? '0 0 0 2px #030d1d, 0 0 0 4px #fff' : 'none'
                    }}
                  >
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center text-white drop-shadow-md">
                        <Check className="w-5 h-5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Images Section */}
          <div>
            <h3 className="text-white text-[15px] font-semibold mb-4 opacity-90">Images</h3>
            <div className="grid grid-cols-3 gap-3">
              {/* Upload Card */}
              <button
                onClick={onUploadImage}
                className="aspect-[3/4] bg-[#1a2333] rounded-xl flex flex-col items-center justify-center gap-2 border border-white/10 hover:bg-[#202a3d] active:scale-[0.98] transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-white/70 stroke-[2]" />
                </div>
                <span className="text-white/60 text-xs font-medium">Upload</span>
              </button>

              {/* Pre-built Backgrounds */}
              {PREBUILT_BACKGROUNDS.map((bg) => {
                const isSelected = selectedBgId === bg.id;
                
                // Approximate visual preview for the thumbnails
                let previewStyle: React.CSSProperties = {};
                if (bg.id === 'parchment-default') previewStyle = { background: 'radial-gradient(circle at center, #e8d399, #d4b872)' };
                if (bg.id === 'scroll') previewStyle = { background: 'linear-gradient(to right, #cba575, #dcc095, #cca676)' };
                if (bg.id === 'flat-paper') previewStyle = { backgroundColor: '#e3dec9' };
                if (bg.id === 'pink-paper') previewStyle = { backgroundColor: '#f9cddc' };
                if (bg.id === 'white-paper') previewStyle = { backgroundColor: '#e8eaed' };

                return (
                  <button
                    key={bg.id}
                    onClick={() => onSelectBg({ id: bg.id, type: 'template' })}
                    className={`relative aspect-[3/4] rounded-xl overflow-hidden transition-all active:scale-[0.98] ${
                      isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#030d1d] scale-[0.98]' : 'hover:scale-[1.02]'
                    }`}
                  >
                    {/* Visual Preview */}
                    <div className="absolute inset-0 w-full h-full" style={previewStyle} />
                    
                    {/* Shadow overlay to make it look like a card */}
                    <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.1)]" />

                    {/* Dark tint when selected to make checkmark pop */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-black/20" />
                    )}

                    {/* Premium Indicator (Blue Diamond) */}
                    {bg.isPremium && (
                      <div className="absolute top-2 right-2 w-4 h-4 bg-[#3bb2ec] rotate-45 rounded-[2px] shadow-sm flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full opacity-50" />
                      </div>
                    )}

                    {/* Checkmark */}
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg">
                          <Check className="w-5 h-5 text-black stroke-[3]" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
