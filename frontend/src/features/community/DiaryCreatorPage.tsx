import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Type, Image as ImageIcon, Smile, MoreHorizontal, 
  Eye, Users, PenTool, Download, FileText, Check, X, Palette, Camera
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { createDiaryEntry } from '../../api/diary';

const FONTS = [
  { family: 'Caveat',             label: 'Classic Hand'  },
  { family: 'Shadows Into Light', label: 'Casual Note'   },
  { family: 'Dancing Script',     label: 'Elegant Script'},
  { family: 'Satisfy',            label: 'Fluid Script'  },
  { family: 'Playfair Display',   label: 'Serif Journal' },
  { family: 'Plus Jakarta Sans',  label: 'Clean Modern'  },
];

// Mock Swatches and Backgrounds
const COLOR_SWATCHES = ['#2563eb', '#dc2626', '#16a34a', '#eab308', '#9333ea', '#db2777', '#000000', '#ffffff'];
const BG_COLORS = ['#f8fafc', '#fef2f2', '#f0fdf4', '#fefce8', '#f5f3ff', '#fff1f2', 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)'];
const MOCK_THUMBNAILS = [
  'https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&w=300&q=80',
];

const MOCK_STICKERS = ['🔥', '✨', '💯', '❤️', '🙌', '💀', '👀', '🎉', '💡', '📌', '@Mention', '#Vibes', '#CampusLife'];

export const DiaryCreatorPage: React.FC = () => {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);

  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState<'everyone' | 'friends'>('everyone');
  
  // Text Tool: 0 = White Box, 1 = Dynamic Color Box, 2 = Transparent
  const [textBgMode, setTextBgMode] = useState<0 | 1 | 2>(2);
  const [activeTextColor, setActiveTextColor] = useState('#000000');
  const [activeFontFamily, setActiveFontFamily] = useState('Plus Jakarta Sans');
  
  // Background state
  const [activeBg, setActiveBg] = useState<string>('#f8fafc');
  
  // UI Sheets & Menus
  const [isBgSheetOpen, setIsBgSheetOpen] = useState(false);
  const [isStickerSheetOpen, setIsStickerSheetOpen] = useState(false);
  const [isTextSheetOpen, setIsTextSheetOpen] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setActiveBg(url);
    }
  };

  useEffect(() => {
    // Focus textarea on mount
    setTimeout(() => textareaRef.current?.focus(), 300);
  }, []);

  const handleTextBgClick = () => {
    setTextBgMode((prev) => ((prev + 1) % 3) as 0 | 1 | 2);
  };

  const handlePublish = async () => {
    if (!content.trim()) {
      toast.error('Write something first!');
      return;
    }
    
    setIsPublishing(true);
    try {
      // In a real app, this creates the diary entry.
      const res = await createDiaryEntry({
        content: content.trim(),
        text_color: activeTextColor,
        bg_color: activeBg.startsWith('#') ? activeBg : '#f8fafc',
        font_family: activeFontFamily,
        image_url: activeBg.startsWith('blob:') || activeBg.startsWith('http') ? activeBg : null,
        // privacy flag could be added here depending on backend implementation
      });
      
      if (res.error) throw res.error;
      toast.success('Diary published successfully!');
      navigate(-1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish diary.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Determine text background style based on mode
  const getTextBgStyle = () => {
    if (textBgMode === 0) return { backgroundColor: '#ffffff', color: '#000000' };
    if (textBgMode === 1) return { backgroundColor: activeTextColor, color: '#ffffff' };
    return { backgroundColor: 'transparent', color: activeTextColor };
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 text-slate-900 font-sans safe-area-top overflow-hidden">
      
      {/* ── Header ──────────────────────────────────────── */}
      <header className="flex h-14 items-center justify-between px-4 shrink-0 pointer-events-auto bg-transparent z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-slate-700 active:scale-95 transition-transform"
        >
          <ArrowLeft size={24} />
        </button>
        
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleTextBgClick}
            className="p-2 text-slate-700 bg-white/50 backdrop-blur-md rounded-full shadow-xs active:scale-95 transition-transform relative"
            aria-label="Text Tool"
          >
            <Type size={20} />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-900 text-white rounded-full flex items-center justify-center text-[9px] font-bold">
              {textBgMode === 0 ? 'W' : textBgMode === 1 ? 'C' : 'T'}
            </div>
          </button>
          <button
            onClick={() => setIsTextSheetOpen(true)}
            className="p-2 text-slate-700 bg-white/50 backdrop-blur-md rounded-full shadow-xs active:scale-95 transition-transform"
          >
            <Palette size={20} />
          </button>
          <button
            onClick={() => setIsBgSheetOpen(true)}
            className="p-2 text-slate-700 bg-white/50 backdrop-blur-md rounded-full shadow-xs active:scale-95 transition-transform"
          >
            <ImageIcon size={20} />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-700 bg-white/50 backdrop-blur-md rounded-full shadow-xs active:scale-95 transition-transform"
          >
            <Camera size={20} />
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          </button>
          <button
            onClick={() => setIsStickerSheetOpen(true)}
            className="p-2 text-slate-700 bg-white/50 backdrop-blur-md rounded-full shadow-xs active:scale-95 transition-transform"
          >
            <Smile size={20} />
          </button>
          
          <div className="relative ml-1">
            <button
              onClick={() => setIsContextMenuOpen(!isContextMenuOpen)}
              className="p-2 text-slate-700 bg-white/50 backdrop-blur-md rounded-full shadow-xs active:scale-95 transition-transform"
            >
              <MoreHorizontal size={20} />
            </button>

            {/* Context Menu Dropdown */}
            <AnimatePresence>
              {isContextMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsContextMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-12 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
                  >
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-gray-50 transition-colors">
                      <PenTool size={16} /> Draw
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-gray-50 transition-colors">
                      <Download size={16} /> Save
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-gray-50 transition-colors border-t border-gray-50">
                      <FileText size={16} /> Text only Diary
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ── Canvas Editor ────────────────────────────────────── */}
      <div 
        className="flex-1 relative flex flex-col items-center justify-center p-4 transition-all duration-500 ease-in-out bg-cover bg-center"
        style={{ 
          background: activeBg.startsWith('http') ? `url(${activeBg}) center/cover no-repeat` : activeBg 
        }}
      >
        <div 
          className="max-w-md w-full relative transition-all rounded-2xl overflow-hidden"
          style={{
            ...getTextBgStyle(),
            padding: textBgMode === 2 ? '0px' : '16px',
            boxShadow: textBgMode !== 2 ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' : 'none'
          }}
        >
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your diary entry..."
            className="w-full min-h-[120px] bg-transparent outline-none resize-none text-center text-xl sm:text-2xl font-bold placeholder:text-current/40 leading-relaxed"
            style={{ color: 'inherit', fontFamily: activeFontFamily }}
          />
        </div>
      </div>

      {/* ── Bottom Toolbar ────────────────────────────────────── */}
      <div className="safe-area-bottom bg-white/80 backdrop-blur-xl border-t border-gray-200/60 p-4 flex items-center justify-between shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => setPrivacy(p => p === 'everyone' ? 'friends' : 'everyone')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gray-100/80 hover:bg-gray-200 text-slate-700 font-bold text-sm transition-colors"
        >
          {privacy === 'everyone' ? (
            <><Eye size={16} /> Everyone</>
          ) : (
            <><Users size={16} /> Friends</>
          )}
        </button>
        
        <button
          onClick={handlePublish}
          disabled={isPublishing}
          className="flex items-center justify-center min-w-[100px] px-6 py-2.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-extrabold text-sm shadow-md transition-all active:scale-95 disabled:opacity-70"
        >
          {isPublishing ? 'Publishing...' : 'Share'}
        </button>
      </div>

      {/* ── Typography & Color Bottom Sheet ──────────────────── */}
      <AnimatePresence>
        {isTextSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-xs z-40"
              onClick={() => setIsTextSheetOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 inset-x-0 bg-white rounded-t-3xl z-50 p-5 safe-area-bottom max-h-[70vh] flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.15)]"
            >
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-5 shrink-0" />
              <h3 className="text-lg font-bold text-slate-800 mb-4 px-1">Typography & Color</h3>
              
              <div className="flex-1 overflow-y-auto no-scrollbar">
                <h4 className="text-sm font-bold text-slate-500 mt-2 mb-3 px-1 uppercase tracking-wider">Colors</h4>
                <div className="flex gap-3 overflow-x-auto pb-4 px-1 no-scrollbar shrink-0">
                  {COLOR_SWATCHES.map((color, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveTextColor(color)}
                      className={`w-12 h-12 rounded-full shrink-0 border-2 transition-transform ${activeTextColor === color ? 'border-blue-500 scale-110' : 'border-transparent shadow-sm'}`}
                      style={{ background: color }}
                    />
                  ))}
                </div>

                <h4 className="text-sm font-bold text-slate-500 mt-4 mb-3 px-1 uppercase tracking-wider">Fonts</h4>
                <div className="grid grid-cols-2 gap-3 px-1 pb-4">
                  {FONTS.map((f, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveFontFamily(f.family)}
                      className={`px-4 py-3 rounded-xl border text-left transition-all ${activeFontFamily === f.family ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                    >
                      <span className="block text-lg font-bold text-slate-900" style={{ fontFamily: f.family }}>Ag</span>
                      <span className="block text-xs font-semibold text-slate-500 mt-1">{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Background Selector Bottom Sheet ──────────────────── */}
      <AnimatePresence>
        {isBgSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-xs z-40"
              onClick={() => setIsBgSheetOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 inset-x-0 bg-white rounded-t-3xl z-50 p-5 safe-area-bottom max-h-[70vh] flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.15)]"
            >
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-5 shrink-0" />
              <h3 className="text-lg font-bold text-slate-800 mb-4 px-1">Background</h3>
              
              <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="flex gap-3 overflow-x-auto pb-4 px-1 no-scrollbar shrink-0">
                  {BG_COLORS.map((bg, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveBg(bg)}
                      className={`w-14 h-14 rounded-full shrink-0 border-2 transition-transform ${activeBg === bg ? 'border-blue-500 scale-110' : 'border-transparent shadow-sm'}`}
                      style={{ background: bg }}
                    />
                  ))}
                </div>

                <h4 className="text-sm font-bold text-slate-500 mt-2 mb-3 px-1 uppercase tracking-wider">Images</h4>
                <div className="grid grid-cols-3 gap-3 px-1 pb-4">
                  {MOCK_THUMBNAILS.map((thumb, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveBg(thumb)}
                      className="aspect-[3/4] rounded-xl overflow-hidden relative shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-95"
                    >
                      <img src={thumb} alt={`bg-${idx}`} className="w-full h-full object-cover" />
                      {activeBg === thumb && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <Check className="text-white" size={24} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Stickers Bottom Sheet ──────────────────────────────── */}
      <AnimatePresence>
        {isStickerSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-xs z-40"
              onClick={() => setIsStickerSheetOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 inset-x-0 bg-white rounded-t-3xl z-50 p-5 safe-area-bottom max-h-[70vh] flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.15)]"
            >
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4 shrink-0" />
              
              <div className="bg-amber-100/50 rounded-2xl p-4 mb-5 text-center border border-amber-200/50 shadow-xs">
                <p className="text-sm font-semibold text-amber-800/70 mb-1">Theme of the day:</p>
                <h4 className="text-lg font-extrabold text-amber-900 mb-3">Treasuring my peaceful time 😌</h4>
                <button className="px-5 py-1.5 bg-white rounded-full font-bold text-amber-700 shadow-sm text-sm hover:shadow active:scale-95">
                  Participate 👉
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar pb-4">
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-4 px-2">
                  {MOCK_STICKERS.map((sticker, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setContent((prev) => prev + ' ' + sticker);
                        setIsStickerSheetOpen(false);
                      }}
                      className="aspect-square bg-gray-50 rounded-2xl flex items-center justify-center text-3xl hover:bg-gray-100 active:scale-90 transition-all shadow-sm border border-gray-100"
                    >
                      {sticker.startsWith('#') || sticker.startsWith('@') ? (
                        <span className="text-sm font-extrabold text-blue-500">{sticker}</span>
                      ) : (
                        sticker
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};
