import React from 'react';
import { CanvasElement, DailyPrompt } from '../types';
import { DiaryPromptCard } from './DiaryPromptCard';
import { DiaryDraggableText } from '../DiaryDraggableText';
import { DiaryDraggableSticker } from '../DiaryDraggableSticker';

interface DiaryCanvasProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  elements: CanvasElement[];
  activeNodeId: string | null;
  dailyPrompt: DailyPrompt;
  selectedBg: any;
  onFocusNode: (id: string) => void;
  onUpdateNode: (id: string, updates: Partial<CanvasElement>) => void;
  onDeleteNode: (id: string) => void;
  onParticipatePrompt: () => void;
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
}: DiaryCanvasProps) {
  const getCanvasStyle = (): React.CSSProperties => {
    if (selectedBg?.background) {
      return {
        background: selectedBg.background,
        boxShadow: selectedBg.boxShadow || 'var(--parchment-shadow)',
      };
    }
    return {
      backgroundColor: 'var(--parchment-bg)',
      backgroundImage: 'var(--parchment-texture-gradient)',
      boxShadow: 'var(--parchment-shadow)',
    };
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center p-3 sm:p-6 bg-[var(--parchment-outer-bg)] transition-colors duration-300">
      {/* Central Parchment Container with Torn Edges */}
      <div
        ref={canvasRef}
        className="relative w-full max-w-md h-full max-h-[88dvh] rounded-3xl shadow-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 border border-[var(--parchment-border)]"
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

        {/* Parchment Paper Inner Surface */}
        <div 
          className="relative w-full h-full overflow-hidden flex-1 cursor-default"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onFocusNode('');
            }
          }}
        >
          {/* Show Daily Prompt Card when no elements exist */}
          {elements.length === 0 && (
            <DiaryPromptCard prompt={dailyPrompt} onParticipate={onParticipatePrompt} />
          )}

          {/* Render Elements */}
          {elements.map((el) => {
            if (el.type === 'text') {
              return (
                <DiaryDraggableText
                  key={el.id}
                  element={el}
                  isActive={activeNodeId === el.id}
                  onFocus={() => onFocusNode(el.id)}
                  onChange={(updates) => onUpdateNode(el.id, updates)}
                  onDelete={() => onDeleteNode(el.id)}
                />
              );
            }

            return (
              <DiaryDraggableSticker
                key={el.id}
                element={el}
                isActive={activeNodeId === el.id}
                onFocus={() => onFocusNode(el.id)}
                onChange={(updates) => onUpdateNode(el.id, updates)}
                onDelete={() => onDeleteNode(el.id)}
              />
            );
          })}
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
    </div>
  );
}
