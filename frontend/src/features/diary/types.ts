export type CanvasElementType = 'text' | 'sticker' | 'image';

export type FontStyleOption = 'Caveat, cursive' | 'Playfair Display, serif' | 'Inter, sans-serif' | 'Courier New, monospace';

export type TextAlignOption = 'left' | 'center' | 'right';

/**
 * TextStyleMode — 3-state background style for text elements.
 *  'none'      — no background, glyph color = plainColor (was 'plain')
 *  'solid'     — solid rounded-pill bg (fillColor), text auto-contrasts (was 'fill')
 *  'highlight' — semi-transparent pill bg (fillColor @ 0.3), text auto-contrasts
 *
 * Legacy values 'plain' and 'fill' are still accepted at runtime and mapped
 * to 'none' and 'solid' respectively to avoid breaking existing diary entries.
 */
export type TextStyleMode = 'none' | 'solid' | 'highlight' | 'plain' | 'fill';

/** Legacy type kept for backward-compat with DiaryTextFormattingBar */
export type TextBgMode = 'solid-white' | 'solid-color' | 'transparent';

export type VisibilityOption = 'public' | 'friends' | 'private';

export interface CanvasElement {
  id: string;
  type: CanvasElementType;
  content: string; // text string or image URL
  x: number;
  y: number;
  width?: number | string;
  height?: number | string;
  scale?: number;
  rotation?: number;
  fontFamily?: FontStyleOption | string;
  fontSize?: number;          // px, 14–72
  textAlign?: TextAlignOption;
  // --- New text style model (styleMode replaces old bgMode/color) ---
  styleMode?: TextStyleMode;  // 'fill' = pill background, 'plain' = glyph color only
  fillColor?: string;         // pill background color (used when styleMode === 'fill')
  plainColor?: string;        // glyph color (used when styleMode === 'plain')
  // --- Legacy fields kept for backward compat with pre-migration entries ---
  bgMode?: string;
  color?: string;
}

export interface DailyPrompt {
  id: string;
  /** DB column is prompt_text; fallback to title for legacy static prompts */
  prompt_text?: string;
  title?: string;
  emoji: string;
  category?: string;
  active_date?: string;
}

/** Helper to safely get prompt display text regardless of source shape */
export function getPromptText(prompt: DailyPrompt): string {
  return prompt.prompt_text || prompt.title || '';
}

export interface DiaryEditorState {
  elements: CanvasElement[];
  selectedBg: any;
  visibility: VisibilityOption;
  allowComments: boolean;
  /** ID of the daily prompt the user tapped Participate on (recorded on final publish) */
  participatingPromptId?: string | null;
}

export interface DiaryEditorProps {
  initialState: Partial<DiaryEditorState> | null;
  onPublish: (dataUrl: string, visibility: string, canvasState: DiaryEditorState) => void;
  onCancel: () => void;
  onSaveDraft: (state: DiaryEditorState) => void;
}
