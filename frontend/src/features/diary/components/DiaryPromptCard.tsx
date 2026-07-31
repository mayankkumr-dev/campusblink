import React from 'react';
import { DailyPrompt, getPromptText } from '../types';

interface DiaryPromptCardProps {
  prompt: DailyPrompt | null;
  onParticipate: () => void;
}

/**
 * DiaryPromptCard
 *
 * Shows today's daily prompt on the empty canvas state.
 * Hidden entirely when prompt is null (no prompt for today — no broken state).
 * Participates via the callback which defers API recording to publish time.
 */
export function DiaryPromptCard({ prompt, onParticipate }: DiaryPromptCardProps) {
  // If no prompt for today, hide entirely (don't show a broken card)
  if (!prompt) return null;

  const displayText = getPromptText(prompt);
  if (!displayText) return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center pointer-events-none transition-opacity duration-300 opacity-100 capture-ignore z-10">
      <p className="text-[var(--parchment-text-secondary)] font-serif italic text-lg max-w-sm mb-6 leading-relaxed">
        Capture a quiet moment or start writing on your page...
      </p>

      <div className="bg-[var(--parchment-card-bg)] backdrop-blur-md rounded-2xl p-5 shadow-lg border border-[var(--parchment-card-border)] max-w-xs w-full pointer-events-auto transition-transform hover:scale-[1.02]">
        <p className="text-[var(--parchment-text-secondary)] text-xs uppercase tracking-wider font-semibold mb-1">
          Prompt of the Day
        </p>
        <p className="text-[var(--parchment-text-primary)] font-serif font-bold text-lg mb-4 flex items-center justify-center gap-2 leading-snug">
          {prompt.emoji && <span className="text-xl">{prompt.emoji}</span>}
          <span>{displayText}</span>
        </p>

        <button
          onClick={onParticipate}
          className="w-full py-2.5 px-4 bg-[var(--parchment-accent)] hover:opacity-90 text-[var(--parchment-bg)] rounded-full font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <span>Participate</span>
          <span>✍️</span>
        </button>
      </div>
    </div>
  );
}
