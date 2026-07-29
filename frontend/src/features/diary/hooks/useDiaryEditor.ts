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
  const getInitialElements = (): CanvasElement[] => {
    const prevElements = initialState?.elements || [];
    const hasText = prevElements.some((el) => el.type === 'text');
    if (hasText) {
      return prevElements;
    }
    const defaultPageText: CanvasElement = {
      id: 'main-page-text',
      type: 'text',
      content: '',
      x: 0,
      y: 0,
      fontFamily: 'Caveat, cursive',
      bgMode: 'transparent',
      color: 'var(--parchment-text-primary)',
      fontSize: 32,
      textAlign: 'center',
    };
    return [defaultPageText, ...prevElements];
  };

  const [elements, setElements] = useState<CanvasElement[]>(getInitialElements);
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

  const mainTextNode = elements.find((el) => el.type === 'text') || elements[0];
  const activeElement = elements.find((el) => el.id === activeNodeId) || (activeNodeId === null ? null : mainTextNode);
  const isTextActive = activeNodeId !== null && activeElement?.type === 'text';

  const addTextNode = useCallback((initialContent: string = '') => {
    setElements((prev) => {
      const textIdx = prev.findIndex((el) => el.type === 'text');
      if (textIdx !== -1) {
        const existing = prev[textIdx];
        const updatedContent = initialContent
          ? existing.content
            ? `${existing.content}\n${initialContent}`
            : initialContent
          : existing.content;
        const updated = [...prev];
        updated[textIdx] = { ...existing, content: updatedContent };
        setActiveNodeId(existing.id);
        return updated;
      }
      const newEl: CanvasElement = {
        id: 'main-page-text',
        type: 'text',
        content: initialContent,
        x: 0,
        y: 0,
        fontFamily: 'Caveat, cursive',
        bgMode: 'transparent',
        color: 'var(--parchment-text-primary)',
        fontSize: 32,
        textAlign: 'center',
      };
      setActiveNodeId(newEl.id);
      return [newEl, ...prev];
    });
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
