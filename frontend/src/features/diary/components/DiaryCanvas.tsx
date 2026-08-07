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
  hideElements?: boolean;
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
  hideElements = false,
}: DiaryCanvasProps) {
  const getCanvasStyle = (): React.CSSProperties => {
    if (selectedBg?.background) {
      const bgVal = selectedBg.background;
      return {
        background: bgVal,
        backgroundColor: typeof bgVal === 'string' && bgVal.startsWith('#') ? bgVal : '#1e293b',
        boxShadow: selectedBg.boxShadow || '0 20px 45px rgba(0, 0, 0, 0.2)',
        borderRadius: '14px',
      };
    }

    // Default Diary Page Theme (matching user's HTML)
    return {
      background: 'radial-gradient(circle at center, #e8d399 0%, #dfc584 70%, #d4b872 100%)',
      borderRadius: '14px',
      boxShadow: 'inset 0 0 50px rgba(168, 137, 76, 0.45), inset 0 0 15px rgba(138, 107, 46, 0.3), 0 12px 30px rgba(0, 0, 0, 0.5)',
    };
  };

  const textElement = elements.find((el) => el.type === 'text');
  const stickerElements = elements.filter((el) => el.type !== 'text');
  const isContentEmpty = !textElement || !textElement.content.trim();

  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <clipPath id="paper-edges" clipPathUnits="objectBoundingBox">
            <path d="
              M 0,0 
              L 0.44, 0.00
              L 0.446, 0.012 
              L 0.455, 0.00 
              L 0.465, 0.015 
              L 0.47, 0.00
              L 1,0 
              Q 0.995, 0.5 1, 1 
              L 0.52, 1 
              L 0.51, 0.985 
              L 0.50, 1 
              L 0.485, 0.98 
              L 0.475, 1 
              L 0,1 
              Q 0.005, 0.5 0, 0 
              Z
            " />
          </clipPath>
        </defs>
      </svg>
      <div
        ref={canvasRef}
        className="absolute top-0 left-0 right-0 bottom-0 transition-all duration-300"
        style={{ ...getCanvasStyle(), clipPath: 'url(#paper-edges)' }}
      >
        {/* Parchment Paper Inner Surface (Full Page Scrollable Container) */}
        {/* Added pt-20 to clear the absolute top toolbar */}
        <div
          className="relative w-full h-full overflow-y-auto scroll-smooth cursor-text p-6 pt-20 text-page-scrollbar"
          onClick={() => {
            if (textElement) onFocusNode(textElement.id);
          }}
        >
          {/* Show Daily Prompt Card when text content is empty AND prompt is available */}
          {!hideElements && isContentEmpty && dailyPrompt && (
            <div className="mb-4">
              <DiaryPromptCard prompt={dailyPrompt} onParticipate={onParticipatePrompt} />
            </div>
          )}

          {/* Render Full Page Text Editor */}
          {!hideElements && textElement && (
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
          {!hideElements && (
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
          )}
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
    </>
  );
}
