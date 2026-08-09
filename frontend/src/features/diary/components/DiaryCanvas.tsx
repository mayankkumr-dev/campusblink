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
    return {
      background: 'radial-gradient(circle at center, #e8d399 0%, #dfc584 70%, #d4b872 100%)',
      borderRadius: '14px',
      boxShadow: 'inset 0 0 50px rgba(168, 137, 76, 0.45), inset 0 0 15px rgba(138, 107, 46, 0.3), 0 12px 30px rgba(0, 0, 0, 0.5)',
    };
  };

  const textElement = elements.find((el) => el.type === 'text');
  const stickerElements = elements.filter((el) => el.type !== 'text');
  const isContentEmpty = !textElement || !textElement.content.trim();

  const InnerContent = (
    <div
      className="relative w-full h-full overflow-y-auto scroll-smooth cursor-text p-6 pt-20 text-page-scrollbar"
      onClick={() => {
        if (textElement) onFocusNode(textElement.id);
      }}
    >
      {!hideElements && isContentEmpty && dailyPrompt && (
        <div className="mb-4">
          <DiaryPromptCard prompt={dailyPrompt} onParticipate={onParticipatePrompt} />
        </div>
      )}
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
  );

  const scrollbarStyles = (
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
        background: rgba(255, 255, 255, 0.25) !important;
        border-radius: 9999px !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
      }
      .text-page-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.4) !important;
      }
    ` }} />
  );

  if (selectedBg?.type === 'template') {
    if (selectedBg.id === 'scroll') {
      return (
        <>
          <div ref={canvasRef} className="absolute inset-0 flex flex-col justify-center items-center bg-[#030d1d] overflow-hidden">
            <div className="scroll-container flex-1 w-[96%] mx-auto mt-[35px] mb-[80px] flex flex-col relative z-5">
              <div className="scroll-top-roll h-[38px] w-full rounded-t-[12px] bg-gradient-to-b from-[#cfab7a] via-[#ecd0a6] to-[#c49964] shadow-md relative z-10" />
              <div className="scroll-body flex-1 w-[95%] mx-auto -mt-[10px] -mb-[15px] bg-gradient-to-r from-[#cba575] via-[#dcc095] to-[#cca676] z-5 relative" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 16%, 95% 18%, 100% 21%, 100% 55%, 96% 57%, 100% 59%, 100% 74%, 96% 76%, 100% 78%, 100% 100%, 0 100%, 0 56%, 4% 54%, 0 52%, 0 0)' }}>
                {InnerContent}
              </div>
              <div className="scroll-bottom-roll h-[42px] w-full rounded-b-[14px] bg-gradient-to-t from-[#b78a56] via-[#ecd0a6] to-[#c19762] shadow-[0_-3px_6px_rgba(0,0,0,0.2),0_10px_15px_rgba(0,0,0,0.5)] relative z-10" />
            </div>
          </div>
          {scrollbarStyles}
        </>
      );
    }
    
    if (selectedBg.id === 'flat-paper') {
      return (
        <>
          <div ref={canvasRef} className="absolute inset-0 flex flex-col bg-[#030d1d] overflow-hidden rounded-[16px]">
            <div className="paper-sheet flex-1 w-full rounded-t-[20px] bg-[#e3dec9] relative z-5 shadow-[0_4px_10px_rgba(0,0,0,0.3)]" style={{ backgroundImage: `radial-gradient(circle at 20% 30%, rgba(0,0,0,0.03) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(139, 69, 19, 0.04) 0%, transparent 40%), url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E")` }}>
              {InnerContent}
            </div>
          </div>
          {scrollbarStyles}
        </>
      );
    }
    
    if (selectedBg.id === 'pink-paper') {
      return (
        <>
          <div ref={canvasRef} className="absolute inset-0 flex flex-col bg-[#030d1d] overflow-hidden rounded-[16px]">
            <div className="paper-sheet flex-1 w-full rounded-t-[20px] bg-[#f9cddc] relative z-5 shadow-[0_4px_10px_rgba(0,0,0,0.3)]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Cfilter id='crumple'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.012' numOctaves='3' result='noise' /%3E%3CfeDiffuseLighting in='noise' lighting-color='%23fff' surfaceScale='1.5'%3E%3CfeDistantLight azimuth='60' elevation='40' /%3E%3C/feDiffuseLighting%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23f9cddc' /%3E%3Crect width='100%25' height='100%25' filter='url(%23crumple)' opacity='0.45' style='mix-blend-mode: multiply;' /%3E%3C/svg%3E")` }}>
              {InnerContent}
            </div>
          </div>
          {scrollbarStyles}
        </>
      );
    }

    if (selectedBg.id === 'white-paper') {
      return (
        <>
          <div ref={canvasRef} className="absolute inset-0 flex flex-col bg-[#030d1d] overflow-hidden rounded-[16px]">
            <div className="paper-sheet flex-1 w-full rounded-t-[20px] bg-[#e8eaed] relative z-5 shadow-[0_4px_10px_rgba(0,0,0,0.3)]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Cfilter id='crumple'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.015' numOctaves='4' result='noise' /%3E%3CfeDiffuseLighting in='noise' lighting-color='%23fff' surfaceScale='2'%3E%3CfeDistantLight azimuth='60' elevation='40' /%3E%3C/feDiffuseLighting%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23e8eaed' /%3E%3Crect width='100%25' height='100%25' filter='url(%23crumple)' opacity='0.55' style='mix-blend-mode: multiply;' /%3E%3C/svg%3E")` }}>
              {InnerContent}
            </div>
          </div>
          {scrollbarStyles}
        </>
      );
    }
  }

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
        {InnerContent}
      </div>
      {scrollbarStyles}
    </>
  );
}
