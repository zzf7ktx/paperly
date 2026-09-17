import {
  type XfaDrawEdit,
  type XfaScriptMetadata,
  type XfaTemplateEdit,
  type XfaTemplateModel,
} from '../../lib/xfa-template';

export type TextBlock = {
  id: number;
  str: string;
  x: number;
  top: number;
  width: number;
  height: number;
  fontSize: number;
  baseline: number;
  editorTop: number;
  horizontalScale: number;
  font: string;
  sourceFont: string;
  cssFont: string;
  letterSpacing: number;
  bold: boolean;
  italic: boolean;
  embeddedFontData?: Uint8Array;
};

export type FormBlock = {
  id: string;
  name: string;
  kind: 'text' | 'checkbox' | 'radio' | 'choice';
  x: number;
  top: number;
  width: number;
  height: number;
  value: string | boolean;
  option?: string;
  options?: Array<{ label: string; value: string }>;
  multiline?: boolean;
  readOnly?: boolean;
  required?: boolean;
  noExport?: boolean;
  tooltip?: string;
  maxLength?: number;
  fontSize?: number;
  font?: string;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  alignment?: TextAlignment;
  added?: boolean;
  sharedField?: boolean;
  backdrop?: FormBackdrop;
  labelBlockId?: number;
  objectName?: string;
  locked?: boolean;
};

export type FormBackdropPrimitive = {
  x: number;
  top: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth: number;
};

export type FormBackdrop = {
  x: number;
  top: number;
  width: number;
  height: number;
  primitives: FormBackdropPrimitive[];
};

export type ImageBlock = {
  id: string;
  x: number;
  top: number;
  width: number;
  height: number;
  sourceName?: string;
  dataUrl?: string;
  objectName?: string;
  locked?: boolean;
  hidden?: boolean;
  ocrRunId?: string;
};

export type AddedImage = ImageBlock & { page: number; dataUrl: string; name: string };

export type ImageEdit = {
  x?: number;
  top?: number;
  width?: number;
  height?: number;
  deleted?: boolean;
  eraseColor?: string;
};

export type VectorKind = 'rectangle' | 'ellipse' | 'line' | 'brush' | 'polygon';

export type VectorPoint = { x: number; top: number };

export type VectorBlock = {
  id: string;
  kind: VectorKind;
  x: number;
  top: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  svgPath?: string;
  opacity?: number;
  points?: VectorPoint[];
  added?: boolean;
  objectName?: string;
  locked?: boolean;
  hidden?: boolean;
  ocrRunId?: string;
};

export type VectorEdit = Partial<Omit<VectorBlock, 'id' | 'kind'>> & { deleted?: boolean };

export type PageInfo = {
  width: number;
  height: number;
  blocks: TextBlock[];
  forms: FormBlock[];
  images: ImageBlock[];
  vectors: VectorBlock[];
};

export type TextAlignment = 'left' | 'center' | 'right' | 'justify';

export type ThemeMode = 'system' | 'light' | 'dark';

export type TextWeight = 400 | 500 | 600 | 700;

export type PropertyPanelMode = 'layout' | 'style' | 'advanced';

export type Edit = {
  text: string;
  font?: string;
  size?: number;
  fontWeight?: TextWeight;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  alignment?: TextAlignment;
  deleted?: boolean;
  x?: number;
  top?: number;
  width?: number;
  height?: number;
  autoFit?: boolean;
  vectorGroupMove?: boolean;
};

export type EditMap = Record<string, Edit>;

export type FormValueMap = Record<string, string | boolean>;

export type FormEdit = {
  x?: number;
  top?: number;
  width?: number;
  height?: number;
  deleted?: boolean;
  font?: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  alignment?: TextAlignment;
  eraseOriginal?: boolean;
  eraseColor?: string;
  moveLabel?: boolean;
  readOnly?: boolean;
  required?: boolean;
  noExport?: boolean;
  maxLength?: number;
  multiline?: boolean;
  tooltip?: string;
  options?: Array<{ label: string; value: string }>;
};

export type AddedTextBox = {
  id: string;
  page: number;
  x: number;
  top: number;
  width: number;
  height: number;
  text: string;
  font: string;
  size: number;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  alignment: TextAlignment;
  autoFit: boolean;
  reuseSourceFont?: boolean;
  sourceFontName?: string;
  sourceFontData?: Uint8Array;
  sourceCssFont?: string;
  ocrSource?: boolean;
  ocrConfidence?: number;
  ocrBackground?: string;
  ocrFontWeight?: number;
  ocrTextStroke?: number;
  ocrOriginalX?: number;
  ocrOriginalTop?: number;
  ocrOriginalWidth?: number;
  ocrOriginalHeight?: number;
  ocrBackgroundImage?: string;
  objectName?: string;
  locked?: boolean;
  hidden?: boolean;
  ocrRunId?: string;
};

export type OcrRun = {
  id: string;
  page: number;
  createdAt: number;
  region: { x: number; top: number; width: number; height: number };
  textIds: string[];
  vectorIds: string[];
  imageIds: string[];
  sourceImageId?: string;
  cleanupCoverCount: number;
  cleanupCoversVisible?: boolean;
};

export type ObjectMetadata = {
  name?: string;
  locked?: boolean;
};

export type EditableTextGeometry = {
  page: number;
  x: number;
  top: number;
  width: number;
  height: number;
  minHeight: number;
};

export type SnapGuides = { x?: number; y?: number };

export type FontWarning = { name: string; fallback: string; installed: boolean };

export type UploadedFont = {
  id: string;
  name: string;
  fileName: string;
  data: Uint8Array;
  weight: number;
  italic: boolean;
};

export type EditorHistorySnapshot = {
  pageSource?: {
    pdf: any;
    bytes: Uint8Array;
    pages: PageInfo[];
    currentPage: number;
    imageCaptures: Record<string, string>;
    blockVisuals: Record<string, { background: string; color: string }>;
  };
  edits: EditMap;
  formChanges: FormValueMap;
  formEdits: Record<string, FormEdit>;
  formBackgrounds: Record<string, string>;
  pageForms: FormBlock[][];
  pageVectors: VectorBlock[][];
  pageImages?: ImageBlock[][];
  addedBoxes: AddedTextBox[];
  addedImages: AddedImage[];
  imageEdits: Record<string, ImageEdit>;
  vectorEdits: Record<string, VectorEdit>;
  objectMetadata?: Record<string, ObjectMetadata>;
  ocrRuns?: OcrRun[];
  xfaStructureEdits: Record<string, XfaTemplateEdit>;
  xfaDrawEdits: Record<string, XfaDrawEdit>;
  xfaChanged: boolean;
};

export type DocumentTab = { id: string; name: string; pageCount: number; isXfa: boolean };

export type SelectedElementRef = {
  page: number;
  kind: 'text' | 'form' | 'image' | 'added-text' | 'added-image' | 'vector';
  id: string;
  selectionRole?: 'direct' | 'related';
};

export type DocumentSession = {
  id: string;
  name: string;
  pdf: any;
  pdfBytes: Uint8Array;
  isXfaDocument: boolean;
  xfaViewMode?: 'xfa' | 'fallback';
  xfaCounterpartId?: string;
  xfaSourceBytes?: Uint8Array;
  xfaChanged: boolean;
  xfaFields: Record<string, XfaTemplateEdit>;
  xfaStructureEdits: Record<string, XfaTemplateEdit>;
  xfaDraws: Record<string, XfaDrawEdit>;
  xfaDrawEdits: Record<string, XfaDrawEdit>;
  xfaScriptMetadata: Record<string, XfaScriptMetadata>;
  xfaTemplateModel: XfaTemplateModel;
  xfaLiveValues: Record<string, string | number | boolean | null>;
  liveXfaScripts: boolean;
  xfaRuntimeStatus: string;
  pages: PageInfo[];
  currentPage: number;
  zoom: number;
  fitMode: 'manual' | 'width' | 'content';
  edits: EditMap;
  past: EditorHistorySnapshot[];
  future: EditorHistorySnapshot[];
  formChanges: FormValueMap;
  formEdits: Record<string, FormEdit>;
  formBackgrounds: Record<string, string>;
  addedBoxes: AddedTextBox[];
  addedImages: AddedImage[];
  imageEdits: Record<string, ImageEdit>;
  vectorEdits: Record<string, VectorEdit>;
  objectMetadata: Record<string, ObjectMetadata>;
  ocrRuns: OcrRun[];
  imageCaptures: Record<string, string>;
  blockVisuals: Record<string, { background: string; color: string }>;
  fontWarnings: FontWarning[];
};

export type PagePreviewShape = {
  id: string;
  kind: 'xfa-text' | 'xfa-form' | 'xfa-image' | 'xfa-shape';
  x: number;
  top: number;
  width: number;
  height: number;
};
