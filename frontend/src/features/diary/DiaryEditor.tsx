import React from 'react';
import * as htmlToImage from 'html-to-image';
import { DiaryEditorProps } from './types';
export type { CanvasElement } from './types';
import { useDiaryEditor } from './hooks/useDiaryEditor';
import { DiaryToolbar } from './components/DiaryToolbar';
import { DiaryTextFormattingBar } from './components/DiaryTextFormattingBar';
import { DiaryCanvas } from './components/DiaryCanvas';
import { DiaryVisibilitySelector } from './components/DiaryVisibilitySelector';
import { DiaryShareBar } from './components/DiaryShareBar';
import { DiaryStickerPicker } from './components/DiaryStickerPicker';
import DiaryThemeSelector, { colorThemes, imageThemes } from './DiaryThemeSelector';

const BACKGROUNDS = [...colorThemes, ...imageThemes];

export function DiaryEditor({ initialState, onPublish, onCancel, onSaveDraft }: DiaryEditorProps) {
  const {
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
  } = useDiaryEditor({ initialState, onSaveDraft });

  const [isBgDrawerOpen, setIsBgDrawerOpen] = React.useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      addImageNode(url);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePublishClick = async () => {
    if (!canvasRef.current) return;
    setIsPublishing(true);

    try {
      // Temporarily hide UI capture-ignore elements
      const uiElements = document.querySelectorAll('.capture-ignore');
      uiElements.forEach((el) => ((el as HTMLElement).style.opacity = '0'));

      await new Promise((resolve) => setTimeout(resolve, 50));

      const dataUrl = await htmlToImage.toPng(canvasRef.current, {
        quality: 0.92,
        pixelRatio: 2,
        cacheBust: true,
        style: { transform: 'none' },
      });

      uiElements.forEach((el) => ((el as HTMLElement).style.opacity = '1'));

      onPublish(dataUrl, visibility, { elements, selectedBg, visibility, allowComments });
    } catch (err) {
      console.error('Failed to capture canvas image snapshot', err);
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[var(--parchment-outer-bg)] relative overflow-hidden font-sans select-none">
      {/* Hidden File Input for Image Insertion */}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileUpload}
      />

      {/* Top Header / Formatting Bar */}
      {isTextActive && activeElement ? (
        <DiaryTextFormattingBar
          activeElement={activeElement}
          onUpdate={(updates) => updateElement(activeElement.id, updates)}
          onDelete={() => removeElement(activeElement.id)}
          onDone={() => setActiveNodeId(null)}
        />
      ) : (
        <DiaryToolbar
          onBack={onCancel}
          onAddText={() => addTextNode('')}
          onOpenImagePicker={() => fileInputRef.current?.click()}
          onOpenStickerPicker={() => setIsStickerPickerOpen(true)}
          onOpenMoreOptions={() => setIsBgDrawerOpen(true)}
        />
      )}

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
      />

      {/* Bottom Floating Bar (Visibility Selector & Share Button) */}
      {!isTextActive && (
        <div className="absolute bottom-4 inset-x-4 z-50 flex items-center justify-between max-w-md mx-auto pointer-events-none capture-ignore">
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
            const theme = BACKGROUNDS.find((t) => t.id === themeId);
            if (theme) setSelectedBg(theme);
          }}
        />
      )}
    </div>
  );
}
