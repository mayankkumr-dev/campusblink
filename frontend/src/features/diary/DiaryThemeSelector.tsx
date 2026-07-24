import React, { useState } from 'react';

// --- Configuration Data --- //

export const colorThemes = [
  { id: 'c-1', background: '#AEC6CF', name: 'Pastel Blue' },
  { id: 'c-2', background: '#98FF98', name: 'Mint Green' },
  { id: 'c-3', background: '#FFDAB9', name: 'Soft Peach' },
  { id: 'c-4', background: 'linear-gradient(135deg, #4b0082, #ffb6c1)', name: 'Purple to Pink' },
  { id: 'c-5', background: 'radial-gradient(circle at 100% 0%, #ff7e5f, #feb47b)', name: 'Sunset Orange' },
  { id: 'c-6', background: 'linear-gradient(135deg, #191970, #00ffff)', name: 'Midnight Cyan' },
  { id: 'c-7', background: 'linear-gradient(45deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)', name: 'Rosy Sunrise' },
  { id: 'c-8', background: 'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)', name: 'Cool Mint' },
];

export const imageThemes = [
  { 
    id: 'img-gallery', 
    type: 'gallery',
    background: '#1e293b',
    name: 'Custom Gallery'
  },
  {
    id: 'img-vintage',
    background: `
      radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.08) 100%), 
      radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 20%), 
      #e8d5a5
    `,
    boxShadow: 'inset 0 0 30px rgba(101, 74, 42, 0.4)',
    name: 'Vintage Scroll'
  },
  {
    id: 'img-ocean',
    background: `
      radial-gradient(circle at 75% 25%, #fff 3px, rgba(255,255,255,0.4) 8px, transparent 12%), 
      radial-gradient(circle at 20% 15%, #fff 1px, transparent 1px), 
      radial-gradient(circle at 45% 35%, #fff 1px, transparent 1px), 
      radial-gradient(circle at 80% 10%, #fff 1px, transparent 1px), 
      radial-gradient(circle at 50% 5%, #fff 1px, transparent 1px), 
      linear-gradient(to bottom, transparent 65%, #092e54 65%, #051c36 80%, #020c1a 100%), 
      linear-gradient(to bottom, #010614 0%, #0a1f42 100%)
    `,
    name: 'Midnight Ocean'
  },
  {
    id: 'img-beach',
    background: `
      radial-gradient(circle at 80% 25%, #ffd700 8%, rgba(255,215,0,0.3) 15%, transparent 20%), 
      linear-gradient(to bottom, #87ceeb 0%, #b0e0e6 60%, transparent 60%), 
      linear-gradient(to bottom, transparent 60%, #40e0d0 60%, #20b2aa 75%, #e5c99e 75%, #d4b47e 100%)
    `,
    name: 'Sunny Beach'
  },
  {
    id: 'img-paper',
    background: `
      linear-gradient(135deg, transparent 35%, rgba(0,0,0,0.04) 40%, rgba(255,255,255,0.1) 42%, transparent 45%), 
      linear-gradient(75deg, transparent 25%, rgba(0,0,0,0.03) 30%, rgba(255,255,255,0.08) 32%, transparent 35%), 
      linear-gradient(15deg, transparent 65%, rgba(0,0,0,0.05) 70%, rgba(255,255,255,0.1) 72%, transparent 75%), 
      linear-gradient(-45deg, transparent 50%, rgba(0,0,0,0.04) 55%, rgba(255,255,255,0.08) 57%, transparent 60%), 
      #ffc0cb
    `,
    name: 'Crumpled Pink'
  },
  {
    id: 'img-nautical',
    type: 'nautical',
    background: `
      repeating-linear-gradient(to bottom, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 4px, transparent 4px, transparent 16px), 
      #0077be
    `,
    name: 'Nautical'
  }
];

// --- Reusable Sub-components --- //

const ActiveCheckmarkOverlay = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-black/15 transition-opacity duration-300 pointer-events-none">
    <div className="w-8 h-8 rounded-full bg-white/40 backdrop-blur-md flex items-center justify-center border border-white/50 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
      <svg className="w-4 h-4 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  </div>
);

// --- Main Component --- //

interface DiaryThemeSelectorProps {
  onClose?: () => void;
  onSelect?: (themeId: string) => void;
}

export default function DiaryThemeSelector({ onClose, onSelect }: DiaryThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState('c-1');

  const handleSelect = (id: string) => {
    setSelectedTheme(id);
    if (onSelect) onSelect(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Bottom Sheet Modal / Overlay Container */}
      <div 
        className="relative w-full max-w-md bg-[#1e2434] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up z-10"
      >
        {/* Drag Handle */}
        <div 
          className="w-full flex justify-center pt-5 pb-2 cursor-pointer"
          onClick={onClose}
        >
          <div className="w-12 h-1.5 bg-slate-500/50 rounded-full" />
        </div>

        <div className="px-6 pb-10 pt-2 overflow-y-auto max-h-[85vh] hide-scrollbar">
          
          {/* Section 1: Background Colors */}
          <div className="mb-8">
            <h2 className="text-white text-lg font-bold mb-4 tracking-wide font-sans">Background</h2>
            <div className="flex space-x-4 overflow-x-auto pb-4 hide-scrollbar snap-x">
              {colorThemes.map((color) => {
                const isActive = selectedTheme === color.id;
                return (
                  <button
                    key={color.id}
                    onClick={() => handleSelect(color.id)}
                    className={`
                      relative flex-shrink-0 w-14 h-14 rounded-full snap-start transition-all duration-300 focus:outline-none overflow-hidden
                      ${isActive ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#1e2434]' : 'hover:scale-105 shadow-md'}
                    `}
                    style={{ background: color.background }}
                    aria-label={`Select ${color.name} color`}
                  >
                    {isActive && <ActiveCheckmarkOverlay />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Images (Code Generated) */}
          <div>
            <h2 className="text-white text-lg font-bold mb-4 tracking-wide font-sans">Images</h2>
            <div className="grid grid-cols-3 gap-4">
              {imageThemes.map((theme) => {
                const isActive = selectedTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => handleSelect(theme.id)}
                    className={`
                      relative w-full aspect-[2/3] rounded-2xl overflow-hidden transition-all duration-300 focus:outline-none group
                      ${isActive ? 'scale-105 ring-2 ring-white ring-offset-2 ring-offset-[#1e2434] shadow-xl' : 'hover:scale-105 shadow-lg hover:shadow-xl'}
                    `}
                    style={{ 
                      background: theme.background,
                      boxShadow: theme.boxShadow || undefined
                    }}
                    aria-label={`Select ${theme.name} theme`}
                  >
                    {/* Render specific inline SVGs based on theme type */}
                    
                    {/* 1. Custom Gallery Button */}
                    {theme.type === 'gallery' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-8 h-8 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    
                    {/* 2. Nautical Theme Inline Decor */}
                    {theme.type === 'nautical' && (
                      <div className="absolute inset-0 pointer-events-none">
                        {/* Anchor SVG */}
                        <svg className="absolute top-4 left-3 w-6 h-6 text-white/40 rotate-12" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2a2 2 0 100 4 2 2 0 000-4zm-2 5h4v2h-4V7zm2 3v9.09A7.001 7.001 0 015.43 14H8v-2H3v2h.25C4.24 18.52 7.76 22 12 22s7.76-3.48 8.75-8H21v-2h-5v2h2.57A7.001 7.001 0 0112 19.09V10h-1z" />
                        </svg>
                        {/* Sailboat SVG */}
                        <svg className="absolute bottom-5 right-2 w-7 h-7 text-white/30 -rotate-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 18h18v2H3v-2zm10-15v12l6-6-6-6zM9 15V7l-5 8h5z" />
                        </svg>
                      </div>
                    )}

                    {/* Active Checkmark overlay */}
                    {isActive && <ActiveCheckmarkOverlay />}
                  </button>
                );
              })}
            </div>
          </div>
          
        </div>
      </div>

      {/* Utility Styles for Hidden Scrollbars & Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </div>
  );
}
