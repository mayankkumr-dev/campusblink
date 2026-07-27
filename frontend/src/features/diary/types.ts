export type CanvasElementType = 'text' | 'sticker' | 'image';

export type FontStyleOption = 'Caveat, cursive' | 'Playfair Display, serif' | 'Inter, sans-serif' | 'Courier New, monospace';

export type TextAlignOption = 'left' | 'center' | 'right';

export type TextBgMode = 'transparent' | 'solid-white' | 'solid-color';

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
  fontFamily?: FontStyleOption | string;
  bgMode?: TextBgMode;
  color?: string;
  fontSize?: number;
  textAlign?: TextAlignOption;
}

export interface DailyPrompt {
  id: string;
  title: string;
  emoji: string;
  category?: string;
}

export interface DiaryEditorState {
  elements: CanvasElement[];
  selectedBg: any;
  visibility: VisibilityOption;
  allowComments: boolean;
}

export interface DiaryEditorProps {
  initialState: Partial<DiaryEditorState> | null;
  onPublish: (dataUrl: string, visibility: string, canvasState: DiaryEditorState) => void;
  onCancel: () => void;
  onSaveDraft: (state: DiaryEditorState) => void;
}
