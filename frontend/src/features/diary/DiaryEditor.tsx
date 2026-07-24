import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../../app/components/ui/button';
import { X, Type, Image as ImageIcon, Palette, Lock, Globe, Check, Users, AlignLeft, AlignCenter, AlignRight, Trash2 } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { Drawer } from 'vaul';
import { Switch } from '../../app/components/ui/switch';
import { DiaryDraggableText } from './DiaryDraggableText';
import { DiaryDraggableSticker } from './DiaryDraggableSticker';
import DiaryThemeSelector, { colorThemes, imageThemes } from './DiaryThemeSelector';

export type CanvasElement = {
  id: string;
  type: 'text' | 'sticker' | 'image';
  content: string; // text content or image url
  x: number;
  y: number;
  width?: number | string;
  height?: number | string;
  scale?: number;
  fontFamily?: string;
  bgMode?: 'transparent' | 'solid-white' | 'solid-color';
  color?: string;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
};

const PALETTE = ['#000000', '#FFFFFF', '#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#A855F7', '#EC4899'];

interface DiaryEditorProps {
  initialState: any;
  onPublish: (dataUrl: string, visibility: string, canvasState: any) => void;
  onCancel: () => void;
  onSaveDraft: (state: any) => void;
}

const BACKGROUNDS = [
  ...colorThemes,
  ...imageThemes
];

export function DiaryEditor({ initialState, onPublish, onCancel, onSaveDraft }: DiaryEditorProps) {
  const [elements, setElements] = useState<CanvasElement[]>(initialState?.elements || []);
  const [selectedBg, setSelectedBg] = useState(initialState?.selectedBg || BACKGROUNDS[0]);
  const [visibility, setVisibility] = useState<'public' | 'friends'>(initialState?.visibility || 'public');
  const [allowComments, setAllowComments] = useState(initialState?.allowComments ?? true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isBgDrawerOpen, setIsBgDrawerOpen] = useState(false);
  const [isPrivacyDrawerOpen, setIsPrivacyDrawerOpen] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-save
  useEffect(() => {
    const timeout = setTimeout(() => {
      onSaveDraft({ elements, selectedBg, visibility, allowComments });
    }, 1000);
    return () => clearTimeout(timeout);
  }, [elements, selectedBg, visibility, allowComments, onSaveDraft]);

  const addText = () => {
    const newEl: CanvasElement = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'text',
      content: '',
      x: window.innerWidth / 2 - 100,
      y: window.innerHeight / 2 - 50,
      width: 200,
      height: 100,
      fontFamily: 'Caveat, cursive',
      bgMode: 'transparent',
      color: '#000000',
      fontSize: 32,
      textAlign: 'center',
    };
    setElements([...elements, newEl]);
    setActiveNodeId(newEl.id);
  };

  const activeElement = elements.find(el => el.id === activeNodeId);
  const isTextActive = activeElement && activeElement.type === 'text';

  const cycleAlignment = () => {
    if (!activeElement) return;
    const aligns = ['left', 'center', 'right'] as const;
    const currentIndex = aligns.indexOf(activeElement.textAlign || 'center');
    const nextAlign = aligns[(currentIndex + 1) % aligns.length];
    updateElement(activeElement.id, { textAlign: nextAlign });
  };

  const cycleBgMode = () => {
    if (!activeElement) return;
    const modes = ['transparent', 'solid-white', 'solid-color'] as const;
    const currentIndex = modes.indexOf(activeElement.bgMode || 'transparent');
    const nextMode = modes[(currentIndex + 1) % modes.length];
    updateElement(activeElement.id, { bgMode: nextMode });
  };

  const addImage = (url: string) => {
    const newEl: CanvasElement = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'image',
      content: url,
      x: window.innerWidth / 2 - 100,
      y: window.innerHeight / 2 - 100,
      width: 200,
      height: 200,
    };
    setElements([...elements, newEl]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      addImage(url);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateElement = (id: string, updates: Partial<CanvasElement>) => {
    setElements(els => els.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const removeElement = (id: string) => {
    setElements(els => els.filter(el => el.id !== id));
  };

  const handlePublishClick = async () => {
    if (!canvasRef.current) return;
    setIsPublishing(true);

    try {
      // Temporarily hide UI elements using a data attribute or class
      const uiElements = document.querySelectorAll('.capture-ignore');
      uiElements.forEach(el => (el as HTMLElement).style.opacity = '0');
      
      // Allow DOM to update
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const dataUrl = await htmlToImage.toPng(canvasRef.current, {
        quality: 0.9,
        pixelRatio: 2, // High quality
        cacheBust: true,
        style: {
           transform: 'none',
        }
      });
      
      uiElements.forEach(el => (el as HTMLElement).style.opacity = '1');
      // Pass the entire canvas state including visibility and allowComments
      onPublish(dataUrl, visibility, { elements, selectedBg, visibility, allowComments });
    } catch (err) {
      console.error('Failed to capture image', err);
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-gray-50 relative overflow-hidden font-sans">
      
      {/* Dynamic Top Header */}
      {isTextActive && activeElement ? (
        <div className="absolute top-0 inset-x-0 z-[60] flex flex-col pt-safe-top bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm capture-ignore transition-all duration-200">
          <div className="flex items-center justify-between p-4">
            <button onClick={() => { removeElement(activeElement.id); setActiveNodeId(null); }} className="p-2 -ml-2 rounded-full hover:bg-gray-100/50 transition-colors text-red-500">
              <Trash2 className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2">
              <button onClick={cycleAlignment} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-800 flex items-center justify-center w-10 h-10">
                {(activeElement.textAlign || 'center') === 'left' && <AlignLeft className="w-5 h-5" />}
                {(activeElement.textAlign || 'center') === 'center' && <AlignCenter className="w-5 h-5" />}
                {(activeElement.textAlign || 'center') === 'right' && <AlignRight className="w-5 h-5" />}
              </button>
              <button onClick={cycleBgMode} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-800 font-bold font-serif w-10 h-10 flex items-center justify-center border border-gray-200 bg-white shadow-sm">
                Aa
              </button>
            </div>

            <button onClick={() => setActiveNodeId(null)} className="px-4 py-1.5 bg-gray-900 text-white rounded-full font-bold text-sm shadow-sm active:scale-95 transition-transform">
              Done
            </button>
          </div>

          {/* Horizontal Color Palette */}
          <div className="w-full overflow-x-auto no-scrollbar flex items-center gap-3 px-4 pb-4">
            {PALETTE.map(color => (
              <button
                key={color}
                onClick={() => updateElement(activeElement.id, { color })}
                className={`w-8 h-8 rounded-full flex-shrink-0 shadow-sm border-2 transition-transform ${activeElement.color === color ? 'border-gray-400 scale-110' : 'border-gray-200 scale-100'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Original Top Header */
        <div className="absolute top-0 inset-x-0 z-50 flex items-center justify-between p-4 pt-safe-top bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm capture-ignore transition-opacity duration-200">
          <button onClick={onCancel} className="p-2 -ml-2 rounded-full hover:bg-gray-100/50 transition-colors">
            <X className="w-6 h-6 text-gray-700" />
          </button>
          
          <div className="flex items-center gap-1 bg-gray-100/50 rounded-full p-1 border border-gray-200/50">
            <button onClick={addText} className="p-2 rounded-full hover:bg-white hover:shadow-sm transition-all text-gray-700">
              <Type className="w-5 h-5" />
            </button>
            <button onClick={() => setIsBgDrawerOpen(true)} className="p-2 rounded-full hover:bg-white hover:shadow-sm transition-all text-gray-700">
              <Palette className="w-5 h-5" />
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-white hover:shadow-sm transition-all text-gray-700">
              <ImageIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="w-10"></div>
        </div>
      )}

      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />

      {/* The Canvas */}
      <div 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full flex items-center justify-center transition-all duration-300"
        style={{ 
          background: selectedBg.background || selectedBg.color,
          boxShadow: selectedBg.boxShadow,
          zIndex: 0
        }}
      >
        {/* Immersive Empty State */}
        {elements.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center pointer-events-none transition-opacity duration-300 opacity-100 capture-ignore">
            <p className="text-gray-600/80 font-serif italic text-xl max-w-sm mb-8 leading-relaxed">
              Share your adventures with the world... add some elements from above to create your diary
            </p>
            
            <div className="bg-black/5 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/20 pointer-events-auto">
              <p className="text-gray-800 font-medium mb-3">Theme of the day: <span className="font-bold text-gray-900">Campus Life</span></p>
              <button onClick={addText} className="px-5 py-2.5 bg-white rounded-full shadow-sm text-gray-900 font-bold text-sm active:scale-95 transition-transform">
                Participate 👉
              </button>
            </div>
          </div>
        )}

        {elements.map(el => (
          el.type === 'text' ? (
            <DiaryDraggableText 
              key={el.id} 
              element={el}
              isActive={activeNodeId === el.id}
              onFocus={() => setActiveNodeId(el.id)}
              onChange={(updates) => updateElement(el.id, updates)} 
              onDelete={() => { removeElement(el.id); if (activeNodeId === el.id) setActiveNodeId(null); }} 
            />
          ) : (
            <DiaryDraggableSticker 
              key={el.id} 
              element={el} 
              onChange={(updates) => updateElement(el.id, updates)} 
              onDelete={() => removeElement(el.id)} 
            />
          )
        ))}
      </div>

      {/* Vertical Text Size Slider */}
      {isTextActive && activeElement && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-[60] h-64 w-8 flex flex-col items-center justify-center capture-ignore group">
          {/* Tapering track background */}
          <div className="absolute inset-y-0 w-2.5 flex justify-center py-2 pointer-events-none">
             <div className="w-full h-full bg-white/50 backdrop-blur-sm shadow-sm" style={{ clipPath: 'polygon(0 0, 100% 0, 65% 100%, 35% 100%)', borderRadius: '4px' }}></div>
          </div>
          {/* Range input */}
          <input
            type="range"
            min="16"
            max="120"
            value={activeElement.fontSize || 32}
            onChange={(e) => updateElement(activeElement.id, { fontSize: parseInt(e.target.value) })}
            className="w-64 h-8 -rotate-90 appearance-none bg-transparent outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(0,0,0,0.15)] cursor-pointer absolute m-0"
          />
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="absolute bottom-0 inset-x-0 z-50 p-4 pb-safe-bottom bg-gradient-to-t from-white via-white/80 to-transparent pt-12 capture-ignore transition-opacity duration-200 pointer-events-none">
        <div className="flex items-center justify-between max-w-md mx-auto w-full gap-4 pointer-events-auto">
          <button 
            onClick={() => setIsPrivacyDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-3 bg-white rounded-full shadow-sm border border-gray-200 text-sm font-medium text-gray-700 active:scale-95 transition-transform"
          >
            {visibility === 'public' ? <Globe className="w-4 h-4 text-gray-500" /> : <Users className="w-4 h-4 text-gray-500" />}
            {visibility === 'public' ? 'Everyone' : 'Friends'}
          </button>
          
          <Button 
            onClick={handlePublishClick} 
            disabled={isPublishing}
            className="flex-1 rounded-full py-6 bg-gray-900 text-white hover:bg-black shadow-md font-semibold text-base transition-all active:scale-95"
          >
            {isPublishing ? 'Publishing...' : 'Publish'}
            {!isPublishing && <Check className="w-5 h-5 ml-2" />}
          </Button>
        </div>
      </div>

      {/* Background Selector Drawer */}
      {isBgDrawerOpen && (
        <DiaryThemeSelector
          onClose={() => setIsBgDrawerOpen(false)}
          onSelect={(themeId) => {
            if (themeId === 'img-gallery') {
              fileInputRef.current?.click();
              setIsBgDrawerOpen(false);
              return;
            }
            const theme = BACKGROUNDS.find(t => t.id === themeId);
            if (theme) setSelectedBg(theme);
          }}
        />
      )}
      
      {/* Privacy & Settings Bottom Sheet */}
      <Drawer.Root open={isPrivacyDrawerOpen} onOpenChange={setIsPrivacyDrawerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[60]" />
          <Drawer.Content className="bg-white flex flex-col rounded-t-[32px] fixed bottom-0 left-0 right-0 z-[70] outline-none shadow-2xl">
            <div className="p-6 bg-white rounded-t-[32px] flex-1 pb-safe-bottom">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mb-6" />
              
              <h3 className="text-xl font-bold text-gray-900 mb-6">Who can see this Diary?</h3>
              
              <div className="space-y-3 mb-8">
                <button
                  onClick={() => setVisibility('friends')}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${visibility === 'friends' ? 'border-gray-900 bg-gray-100' : 'border-gray-100 bg-gray-50'}`}
                >
                  <div className={`p-3 rounded-full ${visibility === 'friends' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-bold text-gray-900">My friends only</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${visibility === 'friends' ? 'border-gray-900' : 'border-gray-300'}`}>
                    {visibility === 'friends' && <div className="w-3 h-3 bg-gray-900 rounded-full" />}
                  </div>
                </button>

                <button
                  onClick={() => setVisibility('public')}
                  className={`w-full flex flex-col gap-1 p-4 rounded-2xl border-2 transition-all text-left ${visibility === 'public' ? 'border-gray-900 bg-gray-100' : 'border-gray-100 bg-gray-50'}`}
                >
                  <div className="flex items-center gap-4 w-full">
                    <div className={`p-3 rounded-full ${visibility === 'public' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'}`}>
                      <Globe className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-bold text-gray-900">Everyone</p>
                      <p className="text-xs text-gray-500">(You may appear in Popular Diaries)</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${visibility === 'public' ? 'border-gray-900' : 'border-gray-300'}`}>
                      {visibility === 'public' && <div className="w-3 h-3 bg-gray-900 rounded-full" />}
                    </div>
                  </div>
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-gray-50">
                <div className="pr-4">
                  <p className="text-base font-bold text-gray-900">Turn on Comments</p>
                  <p className="text-xs text-gray-500">(Comments are private and only you can see them)</p>
                </div>
                <Switch 
                  checked={allowComments} 
                  onCheckedChange={setAllowComments} 
                />
              </div>

            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
      
    </div>
  );
}
