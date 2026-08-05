import React from 'react';
import * as htmlToImage from 'html-to-image';
import toast from 'react-hot-toast';
import { DiaryEditorProps, CanvasElement } from './types';
export type { CanvasElement } from './types';
import { useDiaryEditor } from './hooks/useDiaryEditor';
import { DiaryToolbar } from './components/DiaryToolbar';
import { DiaryCanvas } from './components/DiaryCanvas';
import { DiaryVisibilitySelector } from './components/DiaryVisibilitySelector';
import { DiaryShareBar } from './components/DiaryShareBar';
import { DiaryStickerPicker } from './components/DiaryStickerPicker';
import { DiaryTextToolOverlay } from './DiaryTextToolOverlay';
import DiaryThemeSelector, { colorThemes, imageThemes } from './DiaryThemeSelector';

const BACKGROUNDS = [...colorThemes, ...imageThemes];

export function DiaryEditor({ initialState, onPublish, onCancel, onSaveDraft }: DiaryEditorProps) {
  const {
    elements,
    activeNodeId,
    activeElement,
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
  } = useDiaryEditor({ initialState, onSaveDraft });

  const [isBgDrawerOpen, setIsBgDrawerOpen] = React.useState(false);

  // ── Text Overlay State ──────────────────────────────────────────────────────
  /** null = closed, '' = creating new, 'elementId' = editing existing */
  const [textOverlayTarget, setTextOverlayTarget] = React.useState<string | null>(null);
  const isOverlayOpen = textOverlayTarget !== null;
  const overlayInitialElement = React.useMemo<Partial<CanvasElement> | null>(() => {
    if (textOverlayTarget === null || textOverlayTarget === '') return null;
    return elements.find((el) => el.id === textOverlayTarget) ?? null;
  }, [textOverlayTarget, elements]);

  const openNewTextOverlay = () => {
    setTextOverlayTarget('');
  };

  const openEditTextOverlay = (elementId: string) => {
    setTextOverlayTarget(elementId);
  };

  const closeTextOverlay = () => {
    setTextOverlayTarget(null);
  };

  /** Called when user taps Done in the overlay */
  const handleTextOverlayCommit = (overlayData: Partial<CanvasElement>) => {
    if (textOverlayTarget === '') {
      // Creating new
      addTextNode(overlayData);
    } else if (textOverlayTarget) {
      // Editing existing — restore saved mode/colors/size/align exactly
      updateElement(textOverlayTarget, overlayData);
    }
    setTextOverlayTarget(null);
  };

  // ── File upload ─────────────────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      addImageNode(url);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Publish ─────────────────────────────────────────────────────────────────
  const handlePublishClick = async () => {
    if (!canvasRef.current) return;
    setIsPublishing(true);

    const uiElements = document.querySelectorAll('.capture-ignore');
    uiElements.forEach((el) => ((el as HTMLElement).style.opacity = '0'));

    let dataUrl = '';
    try {
      // 50ms pause to ensure UI elements are hidden before canvas capture
      await new Promise((resolve) => setTimeout(resolve, 50));

      try {
        dataUrl = await htmlToImage.toPng(canvasRef.current, {
          quality: 0.85,
          pixelRatio: 1.5,
          cacheBust: true,
          style: { transform: 'none' },
        });
      } catch (snapshotErr) {
        console.warn('[DiaryEditor] htmlToImage snapshot failed on mobile/PWA, publishing without image snapshot:', snapshotErr);
      }
    } finally {
      // Always restore UI elements regardless of snapshot success/failure
      uiElements.forEach((el) => ((el as HTMLElement).style.opacity = '1'));
    }

    try {
      await onPublish(dataUrl, visibility, {
        elements,
        selectedBg,
        visibility,
        allowComments,
        participatingPromptId,
      });
    } catch (err: any) {
      console.error('[DiaryEditor] Failed to publish entry:', err);
      toast.error(err?.message || 'Failed to publish entry. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] min-h-[100dvh] w-full bg-[#020b18] relative overflow-hidden font-sans select-none touch-manipulation">
      {/* Hidden File Input for Image Insertion */}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileUpload}
      />

      <div className="flex-1 flex flex-col w-full h-full relative">
        <div className="flex-grow w-full relative mb-1" style={{ filter: 'drop-shadow(0px 8px 16px rgba(0, 0, 0, 0.5))' }}>
          {/* Canvas Area */}
          <DiaryCanvas
            canvasRef={canvasRef}
            elements={elements}
            activeNodeId={activeNodeId}
            dailyPrompt={dailyPrompt}
            selectedBg={selectedBg}
            onFocusNode={(id) => setActiveNodeId(id)}
            onUpdateNode={(id, updates) => updateElement(id, updates)}
            onDeleteNode={(id) => removeElement(id)}
            onParticipatePrompt={handleParticipatePrompt}
            onOpenTextOverlay={openEditTextOverlay}
          />

          {/* Top Toolbar */}
          {!isOverlayOpen && (
            <DiaryToolbar
              onBack={onCancel}
              onAddText={openNewTextOverlay}
              onOpenImagePicker={() => fileInputRef.current?.click()}
              onOpenStickerPicker={() => setIsStickerPickerOpen(true)}
              onOpenMoreOptions={() => setIsBgDrawerOpen(true)}
            />
          )}
        </div>

        {/* Bottom Floating Bar (Visibility Selector & Share Button) */}
        {!isOverlayOpen && (
          <div className="w-full flex justify-between items-center px-4 py-3 pb-safe-bottom bg-[#020b18] z-10 capture-ignore pointer-events-auto">
            <DiaryVisibilitySelector
              visibility={visibility}
              allowComments={allowComments}
              isOpen={isPrivacyDrawerOpen}
              onOpen={() => setIsPrivacyDrawerOpen(true)}
              onClose={() => setIsPrivacyDrawerOpen(false)}
              onSelectVisibility={(vis) => {
                setVisibility(vis);
                setIsPrivacyDrawerOpen(false);
              }}
              onToggleComments={setAllowComments}
            />

            <DiaryShareBar isPublishing={isPublishing} onPublish={handlePublishClick} />
          </div>
        )}
      </div>

      {/* Sticker Picker Drawer */}
      <DiaryStickerPicker
        isOpen={isStickerPickerOpen}
        onClose={() => setIsStickerPickerOpen(false)}
        onSelectSticker={(sticker) => addStickerNode(sticker)}
      />

      {/* Background Selector Drawer */}
      {isBgDrawerOpen && (
        <DiaryThemeSelector
          onClose={() => setIsBgDrawerOpen(false)}
          onSelect={(themeId) => {
            if (themeId === 'img-gallery') {
              fileInputRef.current?.click();
              setIsBgDrawerOpen(false);
              return;
            }
            const bg = BACKGROUNDS.find((t) => t.id === themeId);
            if (bg) setSelectedBg(bg);
          }}
        />
      )}

      {/* Full-screen Text Tool Overlay */}
      {isOverlayOpen && (
        <DiaryTextToolOverlay
          initialElement={overlayInitialElement}
          onCommit={handleTextOverlayCommit}
          onClose={closeTextOverlay}
        />
      )}
    </div>
  );
}
