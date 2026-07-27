# Campus Diary (/diary/create) Visual & Functional Redesign Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the `/diary/create` page into a vintage parchment diary aesthetic with torn edges, warm sepia/cream light mode and dark leather dark mode, text formatting, sticker picker, daily prompt CTA, visibility selector, and share button while maintaining full backwards compatibility.

**Architecture:** Deconstruct the page into clean presentational components (`DiaryToolbar`, `DiaryCanvas`, `DiaryTextFormattingBar`, `DiaryStickerPicker`, `DiaryPromptCard`, `DiaryVisibilitySelector`, `DiaryShareBar`) driven by a custom state hook `useDiaryEditor`. Extend existing CSS variable theme system with `--parchment-*` tokens.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, Zustand (`useThemeStore`), localforage, html-to-image, Lucide Icons, Express API.

## Global Constraints
- Do not break existing `/diary/create` route or `CreateDiaryFlow.tsx` API contract.
- Preserve draft autosave to localforage key `current_diary_draft`.
- Do not hardcode hex colors; reference theme CSS variables `var(--parchment-*)`.
- Ensure strict TypeScript typing (`no any`).

---

### Task 1: Extend Theme System with Vintage Parchment Tokens

**Files:**
- Modify: `frontend/src/styles/theme.css:64` and `frontend/src/styles/theme.css:220`

**Interfaces:**
- Produces: CSS Variables (`--parchment-bg`, `--parchment-texture`, `--parchment-border`, `--parchment-text-primary`, `--parchment-card-bg`, etc.)

- [ ] **Step 1: Add light mode parchment tokens under `:root` in `theme.css`**
- [ ] **Step 2: Add dark mode parchment tokens under `.dark` in `theme.css`**
- [ ] **Step 3: Verify CSS variable availability**

---

### Task 2: Create TypeScript Interfaces & Custom Hook (`useDiaryEditor`)

**Files:**
- Create: `frontend/src/features/diary/types.ts`
- Create: `frontend/src/features/diary/hooks/useDiaryEditor.ts`

**Interfaces:**
- Produces: `CanvasElement`, `DiaryEditorState`, `DailyPrompt`, `useDiaryEditor()` hook

- [ ] **Step 1: Create `types.ts` with strict TypeScript definitions**
- [ ] **Step 2: Implement `useDiaryEditor.ts` with state, autosave, daily prompt, and publish logic**

---

### Task 3: Create Presentational Components

**Files:**
- Create: `frontend/src/features/diary/components/DiaryToolbar.tsx`
- Create: `frontend/src/features/diary/components/DiaryTextFormattingBar.tsx`
- Create: `frontend/src/features/diary/components/DiaryStickerPicker.tsx`
- Create: `frontend/src/features/diary/components/DiaryPromptCard.tsx`
- Create: `frontend/src/features/diary/components/DiaryVisibilitySelector.tsx`
- Create: `frontend/src/features/diary/components/DiaryShareBar.tsx`

- [ ] **Step 1: Build `DiaryToolbar.tsx`**
- [ ] **Step 2: Build `DiaryTextFormattingBar.tsx`**
- [ ] **Step 3: Build `DiaryStickerPicker.tsx`**
- [ ] **Step 4: Build `DiaryPromptCard.tsx`**
- [ ] **Step 5: Build `DiaryVisibilitySelector.tsx`**
- [ ] **Step 6: Build `DiaryShareBar.tsx`**

---

### Task 4: Create Parchment Canvas with Torn Edges (`DiaryCanvas.tsx`)

**Files:**
- Create: `frontend/src/features/diary/components/DiaryCanvas.tsx`

- [ ] **Step 1: Implement `DiaryCanvas.tsx` with torn SVG top/bottom deckled edge clips and elements rendering**

---

### Task 5: Refactor `DiaryEditor.tsx` & Backend Daily Prompt Endpoint

**Files:**
- Modify: `frontend/src/features/diary/DiaryEditor.tsx`
- Modify: `backend/src/controllers/diaryController.js`
- Modify: `backend/src/routes/diary.js`

- [ ] **Step 1: Update `DiaryEditor.tsx` to assemble all sub-components**
- [ ] **Step 2: Add `getDailyPrompt` in backend controller & route**

---

### Task 6: Manual Verification & Testing

- [ ] **Step 1: Test light and dark theme switching**
- [ ] **Step 2: Test daily prompt CTA insertion**
- [ ] **Step 3: Test sticker picker and image addition**
- [ ] **Step 4: Test text formatting tools**
- [ ] **Step 5: Test visibility selector and share/publish snapshot flow**
