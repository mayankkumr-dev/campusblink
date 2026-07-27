import React from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '../../../app/components/ui/button';

interface DiaryShareBarProps {
  isPublishing: boolean;
  onPublish: () => void;
}

export function DiaryShareBar({ isPublishing, onPublish }: DiaryShareBarProps) {
  return (
    <Button
      onClick={onPublish}
      disabled={isPublishing}
      className="px-6 py-3 h-12 rounded-2xl bg-[#38BDF8] hover:bg-[#0284C7] text-white shadow-lg font-bold text-base transition-all active:scale-95 flex items-center justify-center gap-2 border border-white/20 pointer-events-auto"
    >
      {isPublishing ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Saving...</span>
        </>
      ) : (
        <>
          <span>Share</span>
          <Send className="w-4 h-4 ml-0.5" />
        </>
      )}
    </Button>
  );
}
