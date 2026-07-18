/**
 * DiaryCreatorModal.tsx
 *
 * Full-screen physical journal writing experience tailored for MAIT with Moderated Photo Uploads.
 * Enforces a strict light-mode aesthetic with warm paper presets, faint ruled lines,
 * touch-friendly photo attachments, and live moderation feedback states.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Camera, Palette, X, Feather, Check, ShieldAlert, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { createDiaryEntry, uploadToQuarantine } from '../../api/diary';

/* ─── Font presets ───────────────────────────────────────────────── */
const FONTS = [
  { family: 'Caveat',             label: 'Classic Hand'  },
  { family: 'Shadows Into Light', label: 'Casual Note'   },
  { family: 'Dancing Script',     label: 'Elegant Script'},
  { family: 'Satisfy',            label: 'Fluid Script'  },
  { family: 'Playfair Display',   label: 'Serif Journal' },
  { family: 'Plus Jakarta Sans',  label: 'Clean Modern'  },
];

/* ─── Paper presets ──────────────────────────────────────────────── */
const PAPER_PRESETS = [
  { id: 'parchment',  bg: '#FFFDF2', text: '#2D1B10', label: 'Parchment'  },
  { id: 'cream',      bg: '#FFFBF0', text: '#2D2D1A', label: 'Warm Cream' },
  { id: 'ivory',      bg: '#FFFFFF', text: '#1A1A2E', label: 'Pure Ivory' },
  { id: 'rose',       bg: '#FFF2F6', text: '#3D1A24', label: 'Soft Rose'  },
  { id: 'sky',        bg: '#F0F6FF', text: '#1A2D3D', label: 'Sky Mist'   },
  { id: 'sage',       bg: '#F2F7F2', text: '#1A2D1E', label: 'Sage Leaf'  },
];

function getFontCss(family: string) {
  switch (family) {
    case 'Shadows Into Light': return `'Shadows Into Light', cursive`;
    case 'Dancing Script':     return `'Dancing Script', cursive`;
    case 'Satisfy':            return `'Satisfy', cursive`;
    case 'Playfair Display':   return `'Playfair Display', serif`;
    case 'Plus Jakarta Sans':  return `'Plus Jakarta Sans', sans-serif`;
    default:                   return `'Caveat', cursive`;
  }
}

interface DiaryCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (entry: any) => void;
}

export const DiaryCreatorModal: React.FC<DiaryCreatorModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const profile = useAuthStore((s) => s.profile);
  const [content, setContent] = useState('');
  const [paper, setPaper] = useState(PAPER_PRESETS[0]);
  const [font, setFont] = useState(FONTS[0]);
  
  // Photo states
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  
  // Moderation & submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moderationStep, setModerationStep] = useState<string | null>(null);
  
  // UI toggles
  const [showPaperPicker, setShowPaperPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Focus and reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setContent('');
      setPhotoFile(null);
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
      setPhotoPreviewUrl(null);
      setIsSubmitting(false);
      setModerationStep(null);
      setShowPaperPicker(false);
      setShowFontPicker(false);
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid image type. Please select a JPEG, PNG, WebP, or GIF.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Photo size exceeds 10MB limit.');
      return;
    }

    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }

    setPhotoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreviewUrl(objectUrl);
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoFile(null);
    setPhotoPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePost = async () => {
    if (!profile?.id) {
      toast.error('Please sign in to post a diary entry.');
      return;
    }
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error('Write something first!');
      return;
    }

    setIsSubmitting(true);

    try {
      let stagedQuarantinePath: string | null = null;

      // Step 1: If photo attached, stage it to Quarantine bucket
      if (photoFile) {
        setModerationStep('Staging photo to private Quarantine bucket...');
        const { data: qData, error: qError } = await uploadToQuarantine(photoFile, profile.id);
        if (qError || !qData?.quarantine_path) {
          throw new Error(qError?.message || 'Failed to upload image to quarantine bucket');
        }
        stagedQuarantinePath = qData.quarantine_path;
        setModerationStep('Running AWS Rekognition Visual Safety Check...');
      } else {
        setModerationStep('Verifying text safety against community guidelines...');
      }

      // Step 2: Submit to backend for moderation & DB insertion
      const entryPayload = {
        author_id: profile.id,
        content: trimmed,
        font_family: font.family,
        text_color: paper.text,
        bg_color: paper.bg,
        gradient: null,
        scale: 1.0,
        ...(stagedQuarantinePath ? { quarantine_path: stagedQuarantinePath } : {}),
      };

      // If we already staged to quarantine, we send JSON. Otherwise if sending raw file fallback, createDiaryEntry handles it.
      const { data, error, moderated } = await createDiaryEntry(entryPayload);

      setIsSubmitting(false);
      setModerationStep(null);

      if (error) {
        if (moderated || error.moderated || error.message.includes('safety guidelines') || error.message.includes('violates')) {
          toast.error(error.message || 'Content violates community safety guidelines.', {
            duration: 6500,
            icon: '🛡️',
            style: {
              background: '#FFF1F2',
              border: '1px solid #FECDD3',
              color: '#881337',
              fontWeight: 600,
            },
          });
        } else {
          toast.error(error.message || 'Failed to post diary entry.');
        }
        return;
      }

      toast.success('Recorded in Campus Diaries! 📔', {
        duration: 4000,
        style: {
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          color: '#166534',
          fontWeight: 600,
        },
      });
      onCreated(data);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setModerationStep(null);
      toast.error(err?.message || 'Error occurred while posting diary entry.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto p-3 md:p-6 select-none font-sans"
          style={{ background: 'rgba(24, 24, 27, 0.45)', backdropFilter: 'blur(10px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-2xl bg-white rounded-[32px] shadow-[0_25px_80px_rgba(0,0,0,0.18)] border border-stone-200/80 flex flex-col overflow-hidden relative my-auto"
            style={{ maxHeight: 'calc(100vh - 40px)' }}
            initial={{ scale: 0.94, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 24 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Hidden file input for image attachment (must be inside stopPropagation container) */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoSelect}
              onClick={(e) => e.stopPropagation()}
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
            />

            {/* ── Top bar ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200/60 bg-stone-50/70 flex-shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="w-9 h-9 rounded-full bg-white hover:bg-stone-100 border border-stone-200/80 flex items-center justify-center text-stone-600 transition-all shadow-sm disabled:opacity-50"
                  aria-label="Close"
                >
                  <ArrowLeft size={18} strokeWidth={1.8} />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center">
                    <Feather size={16} strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-stone-900 tracking-tight leading-none">
                      New Journal Page
                    </h2>
                    <p className="text-[11px] font-medium text-stone-400 mt-0.5">
                      MAIT Campus Diaries
                    </p>
                  </div>
                </div>
              </div>

              {/* Post button */}
              <button
                onClick={handlePost}
                disabled={isSubmitting || !content.trim()}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm ${
                  content.trim() && !isSubmitting
                    ? 'bg-stone-900 hover:bg-stone-800 text-white cursor-pointer'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed opacity-60'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-amber-400" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Post Entry</span>
                    <Check size={16} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </div>

            {/* ── Moderation feedback loading overlay / progress bar ──── */}
            <AnimatePresence>
              {isSubmitting && moderationStep && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-amber-50/90 border-b border-amber-200/60 px-6 py-2.5 flex items-center gap-3 text-xs font-bold text-amber-900 overflow-hidden"
                >
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 animate-pulse">
                    <Sparkles size={13} className="text-amber-700 animate-spin" />
                  </div>
                  <span className="truncate">{moderationStep}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Paper canvas with ruled horizontal lines ─────────── */}
            <div className="flex-1 overflow-y-auto px-6 py-8 md:px-10 flex flex-col justify-center min-h-[340px] relative">
              <motion.div
                className="w-full relative flex flex-col rounded-2xl border border-stone-200/70 shadow-sm overflow-hidden transition-colors"
                style={{
                  background: paper.bg,
                  minHeight: '360px',
                }}
                animate={{ backgroundColor: paper.bg }}
                transition={{ duration: 0.25 }}
              >
                {/* Top notebook binding strip */}
                <div className="h-4 bg-gradient-to-r from-stone-200/40 via-amber-200/40 to-stone-200/40 border-b border-stone-200/40 flex items-center justify-around px-12 opacity-80">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="w-2.5 h-1.5 rounded-full bg-stone-400/30" />
                  ))}
                </div>

                {/* Ruled lines & writing area */}
                <div
                  className="flex-1 px-8 pt-6 pb-6 relative flex flex-col justify-between"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(transparent, transparent 33px, rgba(168, 162, 158, 0.2) 34px)',
                  }}
                >
                  {/* Left margin line */}
                  <div className="absolute top-0 bottom-0 left-5 w-[1px] bg-rose-300/40 pointer-events-none" />

                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Dear Campus Diary, today at MAIT..."
                    disabled={isSubmitting}
                    className="w-full flex-1 resize-none outline-none bg-transparent pt-[2px] pl-2 placeholder-opacity-40 select-text disabled:opacity-70"
                    style={{
                      fontFamily: getFontCss(font.family),
                      fontSize: font.family === 'Plus Jakarta Sans' ? 17 : 21,
                      color: paper.text,
                      caretColor: paper.text,
                      minHeight: photoPreviewUrl ? '160px' : '280px',
                      lineHeight: '34px',
                    }}
                    maxLength={1200}
                  />

                  {/* Attached photo preview within physical page */}
                  <AnimatePresence>
                    {photoPreviewUrl && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.94, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: 10 }}
                        className="mt-4 mb-2 relative group rounded-2xl overflow-hidden border border-stone-200/80 shadow-[0_6px_22px_rgba(0,0,0,0.065)] bg-white/70 max-h-64 flex items-center justify-center z-10"
                      >
                        <img
                          src={photoPreviewUrl}
                          alt="Attached memory preview"
                          className="w-full max-h-64 object-cover transition-transform duration-300 group-hover:scale-[1.015]"
                        />
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          disabled={isSubmitting}
                          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-stone-900/80 hover:bg-rose-600 text-white flex items-center justify-center transition-all shadow-md cursor-pointer disabled:opacity-50"
                          aria-label="Remove photo"
                        >
                          <X size={15} strokeWidth={2.5} />
                        </button>
                        <div className="absolute bottom-2.5 left-2.5 px-3 py-1 rounded-full bg-stone-900/75 text-white text-[10px] font-bold backdrop-blur-sm flex items-center gap-1.5 shadow-sm">
                          <Camera size={12} className="text-amber-400" />
                          <span>Attached Memory • Ready for Moderation</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Character count & style footer */}
                <div className="px-6 py-2 border-t border-stone-200/30 flex justify-between items-center bg-stone-50/30">
                  <span className="text-[11px] font-semibold text-stone-400">
                    Style: {font.label} • {paper.label}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      content.length > 1000 ? 'text-amber-600' : 'text-stone-400'
                    }`}
                  >
                    {content.length} / 1200
                  </span>
                </div>
              </motion.div>
            </div>

            {/* ── Bottom toolbar (Style, Paper & Photo Attachment) ─── */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-stone-50/90 border-t border-stone-200/70">
              <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                {/* Photo attachment trigger */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  disabled={isSubmitting}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all border shadow-sm cursor-pointer disabled:opacity-50 ${
                    photoPreviewUrl
                      ? 'bg-amber-100/90 border-amber-300 text-amber-900'
                      : 'bg-white hover:bg-stone-100 border-stone-200 text-stone-700'
                  }`}
                >
                  <Camera size={15} className="text-amber-600" strokeWidth={2} />
                  <span>{photoPreviewUrl ? 'Change Photo' : 'Attach Photo'}</span>
                </button>

                {/* Paper color picker trigger */}
                <button
                  type="button"
                  onClick={() => { setShowPaperPicker((v) => !v); setShowFontPicker(false); }}
                  disabled={isSubmitting}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all border shadow-sm cursor-pointer disabled:opacity-50 ${
                    showPaperPicker
                      ? 'bg-amber-100/80 border-amber-300 text-amber-900'
                      : 'bg-white hover:bg-stone-100 border-stone-200 text-stone-700'
                  }`}
                  aria-label="Change paper tone"
                >
                  <Palette size={15} className="text-amber-600" strokeWidth={2} />
                  <span>{paper.label}</span>
                </button>

                {/* Font picker trigger */}
                <button
                  type="button"
                  onClick={() => { setShowFontPicker((v) => !v); setShowPaperPicker(false); }}
                  disabled={isSubmitting}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all border shadow-sm cursor-pointer disabled:opacity-50 ${
                    showFontPicker
                      ? 'bg-amber-100/80 border-amber-300 text-amber-900'
                      : 'bg-white hover:bg-stone-100 border-stone-200 text-stone-700'
                  }`}
                  aria-label="Change font style"
                >
                  <span className="text-sm font-extrabold leading-none text-amber-700" style={{ fontFamily: getFontCss(font.family) }}>
                    Aa
                  </span>
                  <span>{font.label}</span>
                </button>
              </div>

              {/* Optional hint */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-stone-400">
                <ShieldAlert size={14} className="text-amber-500" />
                <span>Protected by AWS Moderation</span>
              </div>
            </div>

            {/* ── Paper color picker sheet ─────────────────────────── */}
            <AnimatePresence>
              {showPaperPicker && (
                <motion.div
                  className="absolute bottom-20 left-6 right-6 rounded-2xl p-4 bg-white border border-stone-200 shadow-xl z-20"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ type: 'spring', damping: 24, stiffness: 320 }}
                >
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-xs font-extrabold text-stone-600 uppercase tracking-wider">
                      Select Paper Tone
                    </p>
                    <button onClick={() => setShowPaperPicker(false)} className="text-stone-400 hover:text-stone-600">
                      <X size={15} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {PAPER_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setPaper(p); setShowPaperPicker(false); }}
                        className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-stone-50 transition-all border border-transparent hover:border-stone-200"
                      >
                        <div
                          className="w-10 h-10 rounded-full border-2 transition-all shadow-sm flex items-center justify-center"
                          style={{
                            background: p.bg,
                            borderColor: paper.id === p.id ? '#18181B' : '#E7E5E4',
                          }}
                        >
                          {paper.id === p.id && <Check size={16} className="text-stone-900" strokeWidth={2.5} />}
                        </div>
                        <span className="text-[11px] font-bold text-stone-700">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Font picker sheet ─────────────────────────────────── */}
            <AnimatePresence>
              {showFontPicker && (
                <motion.div
                  className="absolute bottom-20 left-6 right-6 rounded-2xl p-4 bg-white border border-stone-200 shadow-xl z-20"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ type: 'spring', damping: 24, stiffness: 320 }}
                >
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-xs font-extrabold text-stone-600 uppercase tracking-wider">
                      Select Handwriting Style
                    </p>
                    <button onClick={() => setShowFontPicker(false)} className="text-stone-400 hover:text-stone-600">
                      <X size={15} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {FONTS.map((f) => (
                      <button
                        key={f.family}
                        onClick={() => { setFont(f); setShowFontPicker(false); }}
                        className={`p-3 rounded-xl flex items-center justify-between transition-all border ${
                          font.family === f.family
                            ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-sm'
                            : 'bg-stone-50 hover:bg-stone-100/80 border-stone-200/60 text-stone-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span
                            className="text-xl leading-none font-medium flex-shrink-0"
                            style={{ fontFamily: getFontCss(f.family) }}
                          >
                            Aa
                          </span>
                          <span className="text-xs font-bold truncate">
                            {f.label}
                          </span>
                        </div>
                        {font.family === f.family && <Check size={14} className="text-amber-700 flex-shrink-0 ml-1" strokeWidth={2.5} />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
