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
    <div className="absolute top-0 inset-x-0 z-50 flex items-center justify-between px-4 py-4 pt-safe-top capture-ignore transition-all duration-200">
      {/* Back Button */}
      <button
        onClick={onBack}
        aria-label="Go back"
        className="w-[42px] h-[42px] rounded-full flex items-center justify-center bg-[#927a55]/70 text-white backdrop-blur-[4px] border-none shadow-sm hover:bg-[#927a55]/90 active:scale-95 transition-all"
      >
        <ArrowLeft className="w-5 h-5 stroke-2" />
      </button>

      {/* Right Action Icons Group */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onAddText}
          aria-label="Add Text"
          title="Add Text"
          className="w-[42px] h-[42px] rounded-full flex items-center justify-center bg-[#927a55]/70 text-white backdrop-blur-[4px] border-none shadow-sm hover:bg-[#927a55]/90 transition-colors font-sans font-medium text-[19px]"
        >
          Aa
        </button>

        <button
          onClick={onOpenImagePicker}
          aria-label="Add Image"
          title="Add Image"
          className="w-[42px] h-[42px] rounded-full flex items-center justify-center bg-[#927a55]/70 text-white backdrop-blur-[4px] border-none shadow-sm hover:bg-[#927a55]/90 transition-colors"
        >
          <ImageIcon className="w-5 h-5 stroke-2" />
        </button>

        <button
          onClick={onOpenStickerPicker}
          aria-label="Add Sticker"
          title="Add Sticker"
          className="w-[42px] h-[42px] rounded-full flex items-center justify-center bg-[#927a55]/70 text-white backdrop-blur-[4px] border-none shadow-sm hover:bg-[#927a55]/90 transition-colors"
        >
          <Smile className="w-5 h-5 stroke-2" />
        </button>

        <button
          onClick={onOpenMoreOptions}
          aria-label="More options"
          title="More options"
          className="w-[42px] h-[42px] rounded-full flex items-center justify-center bg-[#927a55]/70 text-white backdrop-blur-[4px] border-none shadow-sm hover:bg-[#927a55]/90 transition-colors"
        >
          <MoreHorizontal className="w-5 h-5 stroke-2" />
        </button>
      </div>
    </div>
  );
}
