# Design Spec: Campus Diary (/diary/create) Visual & Functional Redesign

**Date**: 2026-07-27  
**Status**: Draft  
**Target Route**: `/diary/create`  

## 1. Executive Summary
Redesign the existing Campus Diary entry creation page (`/diary/create`) to evoke an authentic vintage diary parchment page with warm sepia tones, aged paper texture, deckled/torn edges, and refined styling, while preserving and extending all current features (offline draft queueing, S3 image upload, visibility controls, HTML-to-Image capture, and theme Store integration).

---

## 2. Visual Design & Theme System

### 2.1 CSS Parchment & Torn Edges
- **Parchment Texture**: Built using CSS radial/linear gradients combined with SVG pattern overlays for subtle grain and vignette shadows. No external stock images or copyrighted assets required.
- **Torn Edges**: Top and bottom deckled edge SVG paths applied as background masks/overlays.
- **Theme Variables**: Added to `frontend/src/styles/theme.css` under `:root` (light mode) and `.dark` (dark mode):
  - `--parchment-bg`: Warm sepia/cream `#F4EAD5` (light) / Aged dark leather `#1C1814` (dark)
  - `--parchment-texture`: Vignette & grain gradients
  - `--parchment-border`: `#D7C4A5` (light) / `#3A3025` (dark)
  - `--parchment-text`: `#3E2723` (light) / `#E8DCC4` (dark)
  - `--parchment-card-bg`: `rgba(215, 196, 165, 0.4)` (light) / `rgba(58, 48, 37, 0.5)` (dark)
  - `--parchment-card-border`: `rgba(141, 110, 99, 0.3)` (light) / `rgba(180, 150, 120, 0.2)` (dark)
  - `--parchment-toolbar-bg`: `rgba(244, 234, 213, 0.85)` (light) / `rgba(28, 24, 20, 0.85)` (dark)
  - `--parchment-accent`: `#8D6E63` (light) / `#D4A373` (dark)

---

## 3. Sub-Component Deconstruction & Custom Hook

### 3.1 Custom Hook: `useDiaryEditor`
Location: `frontend/src/features/diary/hooks/useDiaryEditor.ts`
- **Responsibilities**:
  - Elements state (`CanvasElement[]` with text, image, sticker)
  - Active node tracking (`activeNodeId`)
  - Visibility (`'public' | 'friends' | 'private'`) & comment toggles
  - Selected background state
  - Text formatting state (font family, text color, alignment, font size)
  - Daily writing prompt state (fetching & insertion handler)
  - Auto-saving draft to localforage (`current_diary_draft`)
  - Exporting canvas snapshot to publish queue via `queuePublishTask`

### 3.2 Sub-Components
1. **`DiaryToolbar.tsx`**: Top bar with Back button, Text tool ("Aa"), Add Image, Add Sticker, and More Options button.
2. **`DiaryTextFormattingBar.tsx`**: Quick bar for text alignment (left/center/right), font family selector (`Caveat`, `Playfair Display`, `Inter`, `Ink`), color palette, and vertical font size slider.
3. **`DiaryStickerPicker.tsx`**: Modal/popover sheet for selecting stickers & emojis.
4. **`DiaryPromptCard.tsx`**: "Theme of the day" floating prompt card with "Participate 👈" CTA button.
5. **`DiaryCanvas.tsx`**: Parchment editor surface rendering torn SVG borders, draggable text nodes, images, and stickers.
6. **`DiaryVisibilitySelector.tsx`**: Bottom-left pill button opening privacy/visibility bottom sheet (`Everyone`, `Friends`, `Private`).
7. **`DiaryShareBar.tsx`**: Bottom-right "Share" action button triggering canvas snapshot export & save.

---

## 4. Backend Daily Prompt API

- **Endpoint**: `GET /api/diary/daily-prompt`
- **Controller**: `getDailyPrompt(req, res)` in `backend/src/controllers/diaryController.js`
- **Fallback**: Rich array of daily prompts client-side when backend is offline or unreachable.

---

## 5. Non-Functional & Compatibility Requirements

- **Zero Breaking Changes**:
  - `/diary/create` route remains intact in `routes.tsx`.
  - `CreateDiaryFlow.tsx` retains `loadDraft`, `saveDraft`, `clearDraft`, and `queuePublishTask`.
  - Image upload relies on existing `uploadImage` / S3 flow.
  - PWA offline caching via `offlineQueue.ts` unchanged.
- **TypeScript**: Strict typing for all components, props, prompt shapes, and elements (`CanvasElement`).
