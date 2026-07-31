import React from 'react';
import { CanvasElement, DailyPrompt } from '../types';
import { DiaryPromptCard } from './DiaryPromptCard';
import { DiaryDraggableText } from '../DiaryDraggableText';
import { DiaryDraggableSticker } from '../DiaryDraggableSticker';

interface DiaryCanvasProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  elements: CanvasElement[];
  activeNodeId: string | null;
  dailyPrompt: DailyPrompt | null;
  selectedBg: any;
  onFocusNode: (id: string) => void;
  onUpdateNode: (id: string, updates: Partial<CanvasElement>) => void;
  onDeleteNode: (id: string) => void;
  onParticipatePrompt: () => void;
  /** Opens the full-screen text overlay for editing the given element id */
  onOpenTextOverlay: (elementId: string) => void;
}

export function DiaryCanvas({
  canvasRef,
  elements,
  activeNodeId,
  dailyPrompt,
  selectedBg,
  onFocusNode,
  onUpdateNode,
  onDeleteNode,
  onParticipatePrompt,
  onOpenTextOverlay,
}: DiaryCanvasProps) {
  const getCanvasStyle = (): React.CSSProperties => {
    if (selectedBg?.background) {
      const bgVal = selectedBg.background;
      return {
        background: bgVal,
        backgroundColor: typeof bgVal === 'string' && bgVal.startsWith('#') ? bgVal : '#1e293b',
        boxShadow: selectedBg.boxShadow || '0 20px 45px rgba(0, 0, 0, 0.2)',
      };
    }

    // Default Aged Vintage Parchment Paper Theme (with explicit fallbacks for html-to-image)
    return {
      backgroundColor: '#f5ead6',
      backgroundImage: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.5) 0%, rgba(215, 185, 145, 0.4) 100%)',
      boxShadow: '0 20px 45px rgba(101, 74, 42, 0.25)',
    };
  };

  const textElement = elements.find((el) => el.type === 'text');
  const stickerElements = elements.filter((el) => el.type !== 'text');
  const isContentEmpty = !textElement || !textElement.content.trim();

  return (
    <div className="relative w-full h-full flex items-center justify-center p-3 pt-20 pb-20 sm:p-6 sm:pt-24 sm:pb-24 bg-[var(--parchment-outer-bg)] transition-colors duration-300">
      {/* Central Parchment Container with Torn Edges */}
      <div
        ref={canvasRef}
        className="relative w-full max-w-md h-full max-h-[88dvh] rounded-3xl shadow-2xl overflow-hidden flex flex-col justify-between transition-all duration-300"
        style={getCanvasStyle()}
      >
        {/* Top Deckled / Torn SVG Edge Graphic */}
        <div className="absolute top-0 inset-x-0 z-20 pointer-events-none opacity-40 mix-blend-multiply dark:mix-blend-screen">
          <svg
            viewBox="0 0 1200 40"
            preserveAspectRatio="none"
            className="w-full h-4 sm:h-5 text-[var(--parchment-border)] fill-current"
          >
            <path d="M0,0 L1200,0 L1200,12 Q1150,32 1100,10 Q1050,38 1000,14 Q950,30 900,12 Q850,36 800,16 Q750,28 700,10 Q650,35 600,12 Q550,32 500,14 Q450,36 400,10 Q350,32 300,12 Q250,38 200,16 Q150,30 100,10 Q50,34 0,12 Z" />
          </svg>
        </div>

        {/* Parchment Paper Inner Surface (Full Page Scrollable Container) */}
        <div
          className="relative w-full flex-1 min-h-0 h-0 overflow-y-auto scroll-smooth cursor-text p-4 pt-6 text-page-scrollbar"
          onClick={() => {
            if (textElement) onFocusNode(textElement.id);
          }}
        >
          {/* Show Daily Prompt Card when text content is empty AND prompt is available */}
          {isContentEmpty && dailyPrompt && (
            <div className="mb-4">
              <DiaryPromptCard prompt={dailyPrompt} onParticipate={onParticipatePrompt} />
            </div>
          )}

          {/* Render Full Page Text Editor */}
          {textElement && (
            <DiaryDraggableText
              key={textElement.id}
              element={textElement}
              isActive={activeNodeId === textElement.id || !activeNodeId}
              onFocus={() => onFocusNode(textElement.id)}
              onChange={(updates) => onUpdateNode(textElement.id, updates)}
              onDelete={() => onDeleteNode(textElement.id)}
              onOpenOverlay={() => onOpenTextOverlay(textElement.id)}
            />
          )}

          {/* Render Floating Overlay Stickers & Images */}
          <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
            {stickerElements.map((el) => (
              <div key={el.id} className="pointer-events-auto">
                <DiaryDraggableSticker
                  element={el}
                  isActive={activeNodeId === el.id}
                  onFocus={() => onFocusNode(el.id)}
                  onChange={(updates) => onUpdateNode(el.id, updates)}
                  onDelete={() => onDeleteNode(el.id)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Deckled / Torn SVG Edge Graphic */}
        <div className="absolute bottom-0 inset-x-0 z-20 pointer-events-none opacity-40 mix-blend-multiply dark:mix-blend-screen rotate-180">
          <svg
            viewBox="0 0 1200 40"
            preserveAspectRatio="none"
            className="w-full h-4 sm:h-5 text-[var(--parchment-border)] fill-current"
          >
            <path d="M0,0 L1200,0 L1200,12 Q1150,32 1100,10 Q1050,38 1000,14 Q950,30 900,12 Q850,36 800,16 Q750,28 700,10 Q650,35 600,12 Q550,32 500,14 Q450,36 400,10 Q350,32 300,12 Q250,38 200,16 Q150,30 100,10 Q50,34 0,12 Z" />
          </svg>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .text-page-scrollbar::-webkit-scrollbar {
          width: 8px !important;
          height: 8px !important;
          display: block !important;
        }
        .text-page-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.08) !important;
          border-radius: 9999px !important;
        }
        .text-page-scrollbar::-webkit-scrollbar-thumb {
          background: #8b5cf6 !important;
          border-radius: 9999px !important;
          border: 1px solid rgba(255, 255, 255, 0.4) !important;
        }
        .text-page-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #7c3aed !important;
        }
      ` }} />
    </div>
  );
}
