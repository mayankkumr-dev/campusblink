import React from 'react';
import { ArrowLeft, Type, Image as ImageIcon, Smile, MoreHorizontal } from 'lucide-react';

interface DiaryToolbarProps {
  onBack: () => void;
  onAddText: () => void;
  onOpenImagePicker: () => void;
  onOpenStickerPicker: () => void;
  onOpenMoreOptions: () => void;
}

export function DiaryToolbar({
  onBack,
  onAddText,
  onOpenImagePicker,
  onOpenStickerPicker,
  onOpenMoreOptions,
}: DiaryToolbarProps) {
  return (
    <div className="absolute top-0 inset-x-0 z-50 flex items-center justify-between px-4 py-3 pt-safe-top capture-ignore transition-all duration-200">
      {/* Back Button */}
      <button
        onClick={onBack}
        aria-label="Go back"
        className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--parchment-card-bg)] border border-[var(--parchment-card-border)] text-[var(--parchment-text-primary)] shadow-sm hover:scale-105 active:scale-95 transition-all"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Right Action Icons Group */}
      <div className="flex items-center gap-2 p-1 rounded-full bg-[var(--parchment-toolbar-bg)] border border-[var(--parchment-card-border)] shadow-sm backdrop-blur-md">
        <button
          onClick={onAddText}
          aria-label="Add Text"
          title="Add Text"
          className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--parchment-text-primary)] hover:bg-[var(--parchment-accent-soft)] transition-colors font-serif font-bold text-sm"
        >
          Aa
        </button>

        <button
          onClick={onOpenImagePicker}
          aria-label="Add Image"
          title="Add Image"
          className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--parchment-text-primary)] hover:bg-[var(--parchment-accent-soft)] transition-colors"
        >
          <ImageIcon className="w-5 h-5" />
        </button>

        <button
          onClick={onOpenStickerPicker}
          aria-label="Add Sticker"
          title="Add Sticker"
          className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--parchment-text-primary)] hover:bg-[var(--parchment-accent-soft)] transition-colors"
        >
          <Smile className="w-5 h-5" />
        </button>

        <button
          onClick={onOpenMoreOptions}
          aria-label="More options"
          title="More options"
          className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--parchment-text-primary)] hover:bg-[var(--parchment-accent-soft)] transition-colors"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
