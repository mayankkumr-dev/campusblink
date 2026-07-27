import { useState, useEffect, useRef, useCallback } from 'react';
import { CanvasElement, VisibilityOption, DailyPrompt, DiaryEditorState, DiaryEditorProps } from '../types';

const FALLBACK_PROMPTS: DailyPrompt[] = [
  { id: '1', title: 'My imaginary assistant', emoji: '🦜' },
  { id: '2', title: 'Campus life in 3 words', emoji: '🎓' },
  { id: '3', title: 'Late night library thoughts', emoji: '🌙' },
  { id: '4', title: 'Best cup of coffee today', emoji: '☕' },
  { id: '5', title: 'Unfiltered moment of the day', emoji: '✨' },
];

export function useDiaryEditor({ initialState, onSaveDraft }: Pick<DiaryEditorProps, 'initialState' | 'onSaveDraft'>) {
  const [elements, setElements] = useState<CanvasElement[]>(initialState?.elements || []);
  const [selectedBg, setSelectedBg] = useState<any>(initialState?.selectedBg || { id: 'parchment-default' });
  const [visibility, setVisibility] = useState<VisibilityOption>((initialState?.visibility as VisibilityOption) || 'public');
  const [allowComments, setAllowComments] = useState<boolean>(initialState?.allowComments ?? true);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState<boolean>(false);
  const [isPrivacyDrawerOpen, setIsPrivacyDrawerOpen] = useState<boolean>(false);
  const [dailyPrompt, setDailyPrompt] = useState<DailyPrompt>(FALLBACK_PROMPTS[0]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch daily prompt from backend with fallback
  useEffect(() => {
    let isMounted = true;
    fetch('/api/diary/daily-prompt')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.prompt) {
          setDailyPrompt(data.prompt);
        }
      })
      .catch(() => {
        // Graceful fallback to static prompt
        const dayIndex = new Date().getDate() % FALLBACK_PROMPTS.length;
        if (isMounted) setDailyPrompt(FALLBACK_PROMPTS[dayIndex]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Autosave draft debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      onSaveDraft({ elements, selectedBg, visibility, allowComments });
    }, 1000);
    return () => clearTimeout(timer);
  }, [elements, selectedBg, visibility, allowComments, onSaveDraft]);

  const activeElement = elements.find((el) => el.id === activeNodeId) || null;
  const isTextActive = activeElement?.type === 'text';

  const addTextNode = useCallback((initialContent: string = '') => {
    const newEl: CanvasElement = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'text',
      content: initialContent,
      x: 20,
      y: 40,
      width: 300,
      height: 140,
      fontFamily: 'Caveat, cursive',
      bgMode: 'transparent',
      color: 'var(--parchment-text-primary)',
      fontSize: 32,
      textAlign: 'center',
    };
    setElements((prev) => [...prev, newEl]);
    setActiveNodeId(newEl.id);
  }, []);

  const addImageNode = useCallback((url: string) => {
    const newEl: CanvasElement = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'image',
      content: url,
      x: 40,
      y: 120,
      width: 200,
      height: 200,
    };
    setElements((prev) => [...prev, newEl]);
  }, []);

  const addStickerNode = useCallback((stickerContent: string) => {
    const newEl: CanvasElement = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'sticker',
      content: stickerContent,
      x: 60,
      y: 100,
      width: 120,
      height: 120,
    };
    setElements((prev) => [...prev, newEl]);
    setIsStickerPickerOpen(false);
  }, []);

  const updateElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
    setElements((els) => els.map((el) => (el.id === id ? { ...el, ...updates } : el)));
  }, []);

  const removeElement = useCallback((id: string) => {
    setElements((els) => els.filter((el) => el.id !== id));
    setActiveNodeId((curr) => (curr === id ? null : curr));
  }, []);

  const handleParticipatePrompt = useCallback(() => {
    const promptText = `Theme of the day: ${dailyPrompt.title} ${dailyPrompt.emoji}\n\n`;
    addTextNode(promptText);
  }, [dailyPrompt, addTextNode]);

  return {
    elements,
    activeNodeId,
    activeElement,
    isTextActive,
    selectedBg,
    visibility,
    allowComments,
    isPublishing,
    isStickerPickerOpen,
    isPrivacyDrawerOpen,
    dailyPrompt,
    canvasRef,
    fileInputRef,
    setSelectedBg,
    setVisibility,
    setAllowComments,
    setActiveNodeId,
    setIsPublishing,
    setIsStickerPickerOpen,
    setIsPrivacyDrawerOpen,
    addTextNode,
    addImageNode,
    addStickerNode,
    updateElement,
    removeElement,
    handleParticipatePrompt,
  };
}
