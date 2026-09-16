'use client';

import { useCallback, useRef, useState } from 'react';
import {
  type XfaDrawEdit,
  type XfaFieldKind,
  type XfaScriptMetadata,
  type XfaTemplateEdit,
  type XfaTemplateModel,
} from '../../../lib/xfa-template';
import type {
  AddedImage,
  AddedTextBox,
  DocumentSession,
  DocumentTab,
  EditMap,
  EditorHistorySnapshot,
  FontWarning,
  FormBlock,
  FormEdit,
  FormValueMap,
  ImageEdit,
  PageInfo,
  PropertyPanelMode,
  SelectedElementRef,
  SnapGuides,
  TextAlignment,
  ThemeMode,
  UploadedFont,
  VectorBlock,
  VectorEdit,
} from '../types';

export function useEditorState() {
  const uploadRef = useRef<HTMLInputElement>(null);
  const repeatDataFileRef = useRef<HTMLInputElement>(null);
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const xfaImageReplaceRef = useRef<HTMLInputElement>(null);
  const fontUploadRef = useRef<HTMLInputElement>(null);
  const xfaRichEditorRef = useRef<HTMLDivElement>(null);
  const xfaRichSelectionRef = useRef<Range | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const xfaLayerRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const pdfRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);
  const renderRevisionRef = useRef(0);
  const xfaRuntimeBusyRef = useRef(false);
  const xfaRuntimeRevisionRef = useRef(0);
  const xfaRuntimePendingRef = useRef<{ triggerKey?: string; activity: string } | null>(null);
  const xfaApplyingValuesRef = useRef(false);
  const xfaRuntimeTimerRef = useRef<number | null>(null);
  const xfaLiveValuesRef = useRef<Record<string, string | number | boolean | null>>({});
  const xfaInitializedDocumentsRef = useRef<WeakMap<object, Set<number>>>(new WeakMap());
  const deleteSelectionRef = useRef<() => void>(() => undefined);
  const deleteVectorRef = useRef<() => void>(() => undefined);
  const marqueeSuppressClickRef = useRef(false);
  const ocrWorkerRef = useRef<any>(null);
  const ocrWorkerLanguageRef = useRef<'eng' | 'vie' | null>(null);
  const documentSessionsRef = useRef<Map<string, DocumentSession>>(new Map());
  const scheduleXfaRuntimeRef = useRef<(triggerKey?: string, activity?: string) => void>(() => undefined);
  const [fileName, setFileName] = useState('Try the example, or open your PDF');
  const [documentTabs, setDocumentTabs] = useState<DocumentTab[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [combineTitleAndTabs, setCombineTitleAndTabs] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [systemDarkMode, setSystemDarkMode] = useState(false);
  const [joinSplitCharacters, setJoinSplitCharacters] = useState(true);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [isXfaDocument, setIsXfaDocument] = useState(false);
  const [xfaChanged, setXfaChanged] = useState(false);
  const [xfaFields, setXfaFields] = useState<Record<string, XfaTemplateEdit>>({});
  const [xfaStructureEdits, setXfaStructureEdits] = useState<Record<string, XfaTemplateEdit>>({});
  const [xfaDraws, setXfaDraws] = useState<Record<string, XfaDrawEdit>>({});
  const [xfaDrawEdits, setXfaDrawEdits] = useState<Record<string, XfaDrawEdit>>({});
  const [selectedXfaDrawKey, setSelectedXfaDrawKey] = useState<string | null>(null);
  const [xfaScriptMetadata, setXfaScriptMetadata] = useState<Record<string, XfaScriptMetadata>>({});
  const [xfaTemplateModel, setXfaTemplateModel] = useState<XfaTemplateModel>({
    nodes: [],
    fields: [],
    draws: [],
    regions: [],
    warnings: [],
  });
  const [selectedXfaKey, setSelectedXfaKey] = useState<string | null>(null);
  const [xfaAddKind, setXfaAddKind] = useState<XfaFieldKind>('text');
  const [normalAddKind, setNormalAddKind] = useState<FormBlock['kind']>('text');
  const [xfaEventActivity, setXfaEventActivity] = useState('change');
  const [liveXfaScripts, setLiveXfaScripts] = useState(false);
  const [xfaRuntimeStatus, setXfaRuntimeStatus] = useState('Live scripts are off');
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [fitMode, setFitMode] = useState<'manual' | 'width' | 'content'>('manual');
  const [panEnabled, setPanEnabled] = useState(false);
  const [hideScrollbars, setHideScrollbars] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [edits, setEdits] = useState<EditMap>({});
  const [past, setPast] = useState<EditorHistorySnapshot[]>([]);
  const [future, setFuture] = useState<EditorHistorySnapshot[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedElements, setSelectedElements] = useState<SelectedElementRef[]>([]);
  const [selectionMarquee, setSelectionMarquee] = useState<{
    x: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [batchFont, setBatchFont] = useState('Helvetica');
  const [batchSize, setBatchSize] = useState(11);
  const [batchColor, setBatchColor] = useState('#111111');
  const [batchBold, setBatchBold] = useState(false);
  const [batchItalic, setBatchItalic] = useState(false);
  const [batchAlignment, setBatchAlignment] = useState<TextAlignment>('left');
  const [repeatDataOpen, setRepeatDataOpen] = useState(false);
  const [repeatDataText, setRepeatDataText] = useState('');
  const [repeatColumnMap, setRepeatColumnMap] = useState<Record<string, number>>({});
  const [repeatRowGap, setRepeatRowGap] = useState(4);
  const [repeatUseTemplateFirst, setRepeatUseTemplateFirst] = useState(true);
  const [repeatTextSizing, setRepeatTextSizing] = useState<'fixed' | 'wrap-height' | 'fit-width'>('fixed');
  const [selectedForm, setSelectedForm] = useState<FormBlock | null>(null);
  const [formChanges, setFormChanges] = useState<FormValueMap>({});
  const [formEdits, setFormEdits] = useState<Record<string, FormEdit>>({});
  const [formBackgrounds, setFormBackgrounds] = useState<Record<string, string>>({});
  const [normalCloneMode, setNormalCloneMode] = useState<'independent' | 'shared'>('independent');
  const [addedBoxes, setAddedBoxes] = useState<AddedTextBox[]>([]);
  const [addedImages, setAddedImages] = useState<AddedImage[]>([]);
  const [imageEdits, setImageEdits] = useState<Record<string, ImageEdit>>({});
  const [vectorEdits, setVectorEdits] = useState<Record<string, VectorEdit>>({});
  const [selectedVectorId, setSelectedVectorId] = useState<string | null>(null);
  const [selectPdfShapes, setSelectPdfShapes] = useState(false);
  const [moveShapeContents, setMoveShapeContents] = useState(false);
  const [drawFill, setDrawFill] = useState('#dceee8');
  const [drawStroke, setDrawStroke] = useState('#286d5b');
  const [drawStrokeWidth, setDrawStrokeWidth] = useState(1.5);
  const setDraftVector = useCallback((draftVector: VectorBlock | null) => {
    window.dispatchEvent(new CustomEvent('paperly-draft-vector', { detail: draftVector }));
  }, []);
  const [imageCaptures, setImageCaptures] = useState<Record<string, string>>({});
  const [selectedImage, setSelectedImage] = useState<{ kind: 'existing' | 'added'; id: string } | null>(null);
  const [selectedAddedId, setSelectedAddedId] = useState<string | null>(null);
  const [tool, setTool] = useState<
    | 'select'
    | 'add-text'
    | 'add-xfa'
    | 'add-form'
    | 'ocr-region'
    | 'draw-rectangle'
    | 'draw-ellipse'
    | 'draw-line'
    | 'draw-brush'
  >('select');
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('Ready for local OCR');
  const [ocrLanguage, setOcrLanguage] = useState<'eng' | 'vie'>('eng');
  const [ocrConfidenceThreshold, setOcrConfidenceThreshold] = useState(65);
  const [ocrRecognizeLayout, setOcrRecognizeLayout] = useState(true);
  const [ocrRegion, setOcrRegion] = useState<{
    x: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [snapMode, setSnapMode] = useState<'text' | 'box'>('text');
  const [snapAnchor, setSnapAnchor] = useState<'start' | 'center' | 'end'>('start');
  const [showDeletedLabels, setShowDeletedLabels] = useState(true);
  const [removeOriginalContent, setRemoveOriginalContent] = useState(false);
  const [fontWarnings, setFontWarnings] = useState<FontWarning[]>([]);
  const [uploadedFonts, setUploadedFonts] = useState<UploadedFont[]>([]);
  const [snapGuides, setSnapGuides] = useState<SnapGuides>({});
  const [blockVisuals, setBlockVisuals] = useState<Record<string, { background: string; color: string }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [leftPanelWidth, setLeftPanelWidth] = useState(164);
  const [rightPanelWidth, setRightPanelWidth] = useState(300);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [propertyPanelMode, setPropertyPanelMode] = useState<PropertyPanelMode>('layout');

  return {
    uploadRef,
    repeatDataFileRef,
    imageUploadRef,
    xfaImageReplaceRef,
    fontUploadRef,
    xfaRichEditorRef,
    xfaRichSelectionRef,
    canvasRef,
    xfaLayerRef,
    canvasWrapRef,
    panRef,
    pdfRef,
    renderTaskRef,
    renderRevisionRef,
    xfaRuntimeBusyRef,
    xfaRuntimeRevisionRef,
    xfaRuntimePendingRef,
    xfaApplyingValuesRef,
    xfaRuntimeTimerRef,
    xfaLiveValuesRef,
    xfaInitializedDocumentsRef,
    deleteSelectionRef,
    deleteVectorRef,
    marqueeSuppressClickRef,
    ocrWorkerRef,
    ocrWorkerLanguageRef,
    documentSessionsRef,
    scheduleXfaRuntimeRef,
    fileName,
    setFileName,
    documentTabs,
    setDocumentTabs,
    activeDocumentId,
    setActiveDocumentId,
    combineTitleAndTabs,
    setCombineTitleAndTabs,
    themeMode,
    setThemeMode,
    systemDarkMode,
    setSystemDarkMode,
    joinSplitCharacters,
    setJoinSplitCharacters,
    pdfBytes,
    setPdfBytes,
    isXfaDocument,
    setIsXfaDocument,
    xfaChanged,
    setXfaChanged,
    xfaFields,
    setXfaFields,
    xfaStructureEdits,
    setXfaStructureEdits,
    xfaDraws,
    setXfaDraws,
    xfaDrawEdits,
    setXfaDrawEdits,
    selectedXfaDrawKey,
    setSelectedXfaDrawKey,
    xfaScriptMetadata,
    setXfaScriptMetadata,
    xfaTemplateModel,
    setXfaTemplateModel,
    selectedXfaKey,
    setSelectedXfaKey,
    xfaAddKind,
    setXfaAddKind,
    normalAddKind,
    setNormalAddKind,
    xfaEventActivity,
    setXfaEventActivity,
    liveXfaScripts,
    setLiveXfaScripts,
    xfaRuntimeStatus,
    setXfaRuntimeStatus,
    pages,
    setPages,
    currentPage,
    setCurrentPage,
    zoom,
    setZoom,
    fitMode,
    setFitMode,
    panEnabled,
    setPanEnabled,
    hideScrollbars,
    setHideScrollbars,
    isPanning,
    setIsPanning,
    edits,
    setEdits,
    past,
    setPast,
    future,
    setFuture,
    selected,
    setSelected,
    selectedElements,
    setSelectedElements,
    selectionMarquee,
    setSelectionMarquee,
    batchFont,
    setBatchFont,
    batchSize,
    setBatchSize,
    batchColor,
    setBatchColor,
    batchBold,
    setBatchBold,
    batchItalic,
    setBatchItalic,
    batchAlignment,
    setBatchAlignment,
    repeatDataOpen,
    setRepeatDataOpen,
    repeatDataText,
    setRepeatDataText,
    repeatColumnMap,
    setRepeatColumnMap,
    repeatRowGap,
    setRepeatRowGap,
    repeatUseTemplateFirst,
    setRepeatUseTemplateFirst,
    repeatTextSizing,
    setRepeatTextSizing,
    selectedForm,
    setSelectedForm,
    formChanges,
    setFormChanges,
    formEdits,
    setFormEdits,
    formBackgrounds,
    setFormBackgrounds,
    normalCloneMode,
    setNormalCloneMode,
    addedBoxes,
    setAddedBoxes,
    addedImages,
    setAddedImages,
    imageEdits,
    setImageEdits,
    vectorEdits,
    setVectorEdits,
    selectedVectorId,
    setSelectedVectorId,
    selectPdfShapes,
    setSelectPdfShapes,
    moveShapeContents,
    setMoveShapeContents,
    drawFill,
    setDrawFill,
    drawStroke,
    setDrawStroke,
    drawStrokeWidth,
    setDrawStrokeWidth,
    draftVector: null as VectorBlock | null,
    setDraftVector,
    imageCaptures,
    setImageCaptures,
    selectedImage,
    setSelectedImage,
    selectedAddedId,
    setSelectedAddedId,
    tool,
    setTool,
    ocrBusy,
    setOcrBusy,
    ocrProgress,
    setOcrProgress,
    ocrStatus,
    setOcrStatus,
    ocrLanguage,
    setOcrLanguage,
    ocrConfidenceThreshold,
    setOcrConfidenceThreshold,
    ocrRecognizeLayout,
    setOcrRecognizeLayout,
    ocrRegion,
    setOcrRegion,
    snapEnabled,
    setSnapEnabled,
    snapMode,
    setSnapMode,
    snapAnchor,
    setSnapAnchor,
    showDeletedLabels,
    setShowDeletedLabels,
    removeOriginalContent,
    setRemoveOriginalContent,
    fontWarnings,
    setFontWarnings,
    uploadedFonts,
    setUploadedFonts,
    snapGuides,
    setSnapGuides,
    blockVisuals,
    setBlockVisuals,
    loading,
    setLoading,
    error,
    setError,
    toast,
    setToast,
    leftPanelWidth,
    setLeftPanelWidth,
    rightPanelWidth,
    setRightPanelWidth,
    leftPanelCollapsed,
    setLeftPanelCollapsed,
    rightPanelCollapsed,
    setRightPanelCollapsed,
    propertyPanelMode,
    setPropertyPanelMode,
  };
}

export type EditorState = ReturnType<typeof useEditorState>;
