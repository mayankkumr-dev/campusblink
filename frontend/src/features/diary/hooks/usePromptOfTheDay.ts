import { useState, useEffect, useCallback } from 'react';
import { DailyPrompt } from '../types';
import { supabase } from '../../../lib/supabase';

interface UsePromptOfTheDayResult {
  prompt: DailyPrompt | null;
  isLoading: boolean;
  isParticipating: boolean;
  /** Record participation — call this on final publish, not on tap */
  recordParticipation: (diaryEntryId: string) => Promise<void>;
}

/**
 * usePromptOfTheDay
 *
 * Fetches today's active prompt from the backend (server date, not client date,
 * to avoid timezone disagreements). Returns null if no prompt exists for today —
 * DiaryPromptCard should be hidden entirely in that case.
 *
 * Participation is recorded on final publish (via recordParticipation), NOT on
 * the "Participate" tap — tapping is intent, not completion.
 */
export function usePromptOfTheDay(): UsePromptOfTheDayResult {
  const [prompt, setPrompt] = useState<DailyPrompt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isParticipating, setIsParticipating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    // Try the new DB-backed endpoint first
    fetch('/api/diary/prompt-of-day')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        if (!isMounted) return;
        if (data?.prompt) {
          setPrompt(data.prompt);
        } else {
          // No prompt for today — hide card
          setPrompt(null);
        }
      })
      .catch(async () => {
        if (!isMounted) return;
        // Fallback: try legacy static endpoint
        try {
          const res = await fetch('/api/diary/daily-prompt');
          if (res.ok) {
            const data = await res.json();
            if (data?.prompt && isMounted) {
              setPrompt(data.prompt);
            }
          } else {
            setPrompt(null);
          }
        } catch {
          if (isMounted) setPrompt(null);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  const recordParticipation = useCallback(async (diaryEntryId: string) => {
    if (!prompt?.id) return;
    try {
      const res = await fetch(`/api/diary/prompt-of-day/${prompt.id}/participate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diary_entry_id: diaryEntryId }),
      });
      if (res.ok) {
        setIsParticipating(true);
      }
    } catch (err) {
      // Non-critical — participation recording failure should not block publish
      console.warn('[usePromptOfTheDay] Failed to record participation:', err);
    }
  }, [prompt?.id]);

  return { prompt, isLoading, isParticipating, recordParticipation };
}
