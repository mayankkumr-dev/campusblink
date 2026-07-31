import { useState, useEffect, useRef, useCallback } from 'react';
import { CanvasElement, VisibilityOption, DiaryEditorState, DiaryEditorProps, getPromptText } from '../types';
import { usePromptOfTheDay } from './usePromptOfTheDay';

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

  /** ID of the prompt the user tapped Participate on — recorded on final publish */
  const [participatingPromptId, setParticipatingPromptId] = useState<string | null>(
    initialState?.participatingPromptId ?? null
  );

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use the new DB-backed prompt hook (falls back to legacy static endpoint automatically)
  const { prompt: dailyPrompt } = usePromptOfTheDay();

  // Autosave draft debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      onSaveDraft({ elements, selectedBg, visibility, allowComments, participatingPromptId });
    }, 1000);
    return () => clearTimeout(timer);
  }, [elements, selectedBg, visibility, allowComments, participatingPromptId, onSaveDraft]);

  const mainTextNode = elements.find((el) => el.type === 'text') || elements[0];
  const activeElement = elements.find((el) => el.id === activeNodeId) || (activeNodeId === null ? null : mainTextNode);
  const isTextActive = activeNodeId !== null && activeElement?.type === 'text';

  /**
   * addTextNode — creates a new text canvas element.
   * Accepts the committed overlay result (Partial<CanvasElement>) plus optional
   * position overrides. Called from DiaryEditor after the overlay's onCommit fires.
   */
  const addTextNode = useCallback((overrides: Partial<CanvasElement> = {}) => {
    const newEl: CanvasElement = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'text',
      content: overrides.content || '',
      x: overrides.x ?? 20,
      y: overrides.y ?? 40,
      width: overrides.width ?? 300,
      height: overrides.height ?? 140,
      fontFamily: overrides.fontFamily ?? 'Caveat, cursive',
      styleMode: overrides.styleMode ?? 'plain',
      fillColor: overrides.fillColor ?? '#1A1A1A',
      plainColor: overrides.plainColor ?? '#FFFFFF',
      fontSize: overrides.fontSize ?? 32,
      textAlign: overrides.textAlign ?? 'center',
    };
    setElements((prev) => [...prev, newEl]);
    setActiveNodeId(newEl.id);
    return newEl.id;
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

  /**
   * handleParticipatePrompt — called when user taps "Participate" on the prompt card.
   * Inserts a text node pre-filled with the prompt, marks participatingPromptId for
   * deferred recording on publish. Does NOT call the API yet.
   */
  const handleParticipatePrompt = useCallback(() => {
    if (!dailyPrompt) return;
    const text = getPromptText(dailyPrompt);
    const emoji = dailyPrompt.emoji || '';
    const promptContent = `${emoji} ${text}`.trim();

    addTextNode({
      content: promptContent,
      styleMode: 'plain',
      plainColor: '#FFFFFF',
      fontSize: 28,
      textAlign: 'center',
    });

    if (dailyPrompt.id) {
      setParticipatingPromptId(dailyPrompt.id);
    }
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
    participatingPromptId,
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
