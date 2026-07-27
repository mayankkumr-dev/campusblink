import React from 'react';
import { Drawer } from 'vaul';

interface DiaryStickerPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSticker: (stickerContent: string) => void;
}

const STICKER_EMOJIS = [
  '🦜', '🎓', '☕', '📖', '✨', '🌿', '🌙', '💌',
  '📌', '🎨', '🐾', '💫', '🍂', '🍁', '🕯️', '✍️',
  '📜', '🗝️', '⭐', '🌸', '🍕', '🎧', '📷', '💡',
];

export function DiaryStickerPicker({ isOpen, onClose, onSelectSticker }: DiaryStickerPickerProps) {
  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[70] backdrop-blur-xs" />
        <Drawer.Content className="bg-[var(--parchment-bg)] border-t border-[var(--parchment-border)] flex flex-col rounded-t-[32px] fixed bottom-0 left-0 right-0 z-[80] outline-none shadow-2xl">
          <div className="p-6 pb-safe-bottom max-w-lg mx-auto w-full">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-[var(--parchment-text-secondary)] opacity-30 mb-6" />

            <h3 className="text-lg font-bold font-serif text-[var(--parchment-text-primary)] mb-4 text-center">
              Decorate Your Diary
            </h3>

            <div className="grid grid-cols-6 gap-4 py-4 max-h-[40vh] overflow-y-auto">
              {STICKER_EMOJIS.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => onSelectSticker(emoji)}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-3xl hover:bg-[var(--parchment-card-bg)] hover:scale-110 active:scale-95 transition-all shadow-xs border border-transparent hover:border-[var(--parchment-card-border)]"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
