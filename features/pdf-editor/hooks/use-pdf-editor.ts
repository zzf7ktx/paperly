'use client';

import { useCanvasInteraction } from './use-canvas-interaction';

import { useImageEditing } from './use-image-editing';

import { useFormEditing } from './use-form-editing';

import { useEditorSelection } from './use-editor-selection';

import { useEditorPreferences } from './use-editor-preferences';

import { useBatchEditing } from './use-batch-editing';

import { useElementDrag } from './use-element-drag';

import { useTextEditing } from './use-text-editing';

import { useDocumentSessions } from './use-document-sessions';
import { usePageManagement } from './use-page-management';

import { useXfaRendering } from './use-xfa-rendering';

import { usePdfRendering } from './use-pdf-rendering';

import { useEditorHistory } from './use-editor-history';

import { useCallback, type PointerEvent as ReactPointerEvent } from 'react';
import { sampleTextBlockVisual } from '../lib/appearance';
import { blockKey } from '../lib/text';
import { sanitizeXfaRichHtml } from '../lib/xfa-dom';
import { exportDocument } from '../services/export-pdf';
import { recognizeText } from '../services/recognize-text';
import type { AddedTextBox, SnapGuides, TextBlock } from '../types';
import { useEditorState } from './use-editor-state';

export function usePdfEditor() {
  const state = useEditorState();
  const {
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
    pdfRef,
    marqueeSuppressClickRef,
    scheduleXfaRuntimeRef,
    documentTabs,
    activeDocumentId,
    combineTitleAndTabs,
    setCombineTitleAndTabs,
    themeMode,
    setThemeMode,
    joinSplitCharacters,
    setJoinSplitCharacters,
    pdfBytes,
    isXfaDocument,
    xfaChanged,
    xfaFields,
    xfaStructureEdits,
    xfaDraws,
    xfaDrawEdits,
    setSelectedXfaDrawKey,
    xfaTemplateModel,
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
    pages,
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
    edits,
    past,
    setPast,
    future,
    setFuture,
    selected,
    setSelected,
    selectedElements,
    setSelectedElements,
    selectionMarquee,
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
    formEdits,
    formBackgrounds,
    setFormBackgrounds,
    normalCloneMode,
    setNormalCloneMode,
    addedBoxes,
    setAddedBoxes,
    addedImages,
    imageEdits,
    vectorEdits,
    setVectorEdits,
    selectedVectorId,
    setSelectedVectorId,
    selectPdfShapes,
    setSelectPdfShapes,
    moveShapeContents,
    drawFill,
    setDrawFill,
    drawStroke,
    setDrawStroke,
    drawStrokeWidth,
    setDrawStrokeWidth,
    draftVector,
    imageCaptures,
    selectedImage,
    setSelectedImage,
    selectedAddedId,
    setSelectedAddedId,
    tool,
    setTool,
    ocrBusy,
    ocrProgress,
    ocrStatus,
    ocrConfidenceThreshold,
    setOcrConfidenceThreshold,
    ocrRecognizeLayout,
    setOcrRecognizeLayout,
    ocrRegion,
    snapEnabled,
    setSnapEnabled,
    snapMode,
    setSnapMode,
    snapAnchor,
    setSnapAnchor,
    showDeletedLabels,
    setShowDeletedLabels,
    fontWarnings,
    setFontWarnings,
    uploadedFonts,
    snapGuides,
    setSnapGuides,
    blockVisuals,
    loading,
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
    setPropertyPanelMode,
  } = state;
  const { darkMode } = useEditorPreferences({ ...state });

  const {
    activeKey,
    activeBlock,
    activeEdit,
    activeVisual,
    activeAdded,
    activeAddedImage,
    activeExistingImage,
    activeImageKey,
    activeImageEdit,
    activeVector,
    activeVectorKey,
    activeVectorEdit,
    activeXfaField,
    activeXfaDraw,
    activeFormKey,
    activeFormEdit,
    activeFormLabel,
    xfaEventActivities,
    activeXfaEvent,
    activeBold,
    activeWeight,
    activeItalic,
    activeUnderline,
    activeStrike,
    activeAlignment,
    batchStyleCount,
    batchTextBoxCount,
    batchAutoFitEnabled,
    isLikelyScannedPage,
    repeatHeaders,
    repeatRows,
    repeatableElements,
    hasTextSelection,
    availablePropertyModes,
    effectivePropertyPanelMode,
    isElementSelected,
    isFormOwnedVector,
    relatedShapeElements,
    vectorBackgroundForText,
    activeTypeface,
    activeTypefaceUnsupported,
    activeSourceFontImported,
    availableFontOptions,
    updateElementSelection,
  } = useEditorSelection({ ...state });

  const resizePanelWithKeyboard = (side: 'left' | 'right', delta: number) => {
    if (side === 'left') setLeftPanelWidth((width) => Math.max(120, Math.min(340, width + delta)));
    else setRightPanelWidth((width) => Math.max(250, Math.min(520, width + delta)));
  };

  const startPanelResize = (event: ReactPointerEvent, side: 'left' | 'right') => {
    if ((side === 'left' && leftPanelCollapsed) || (side === 'right' && rightPanelCollapsed)) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = side === 'left' ? leftPanelWidth : rightPanelWidth;
    const move = (pointerEvent: PointerEvent) => {
      const delta = (pointerEvent.clientX - startX) * (side === 'left' ? 1 : -1);
      const width =
        side === 'left'
          ? Math.max(120, Math.min(340, startWidth + delta))
          : Math.max(250, Math.min(520, startWidth + delta));
      if (side === 'left') setLeftPanelWidth(width);
      else setRightPanelWidth(width);
    };
    const stop = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stop);
      document.removeEventListener('pointercancel', stop);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', stop, { once: true });
    document.addEventListener('pointercancel', stop, { once: true });
  };

  const { createHistorySnapshot, recordHistory, restoreHistorySnapshot } = useEditorHistory({ ...state });

  usePdfRendering({ ...state });

  useXfaRendering({ ...state });

  const { switchDocument, closeDocument, openFile, prepareDocument } = useDocumentSessions({ ...state });
  const { changePages, insertPdfFiles, copyPageToTab } = usePageManagement(state, prepareDocument, recordHistory,
    () => exportDocument({ ...state, vectorBackgroundForText }, { bytesOnly: true }));

  const {
    commit,
    selectExistingBlock,
    measureAddedBox,
    editableTextValue,
    measureAddedBoxWrappedHeight,
    updateAddedBox,
    fitAddedBox,
    fitExistingBox,
    uploadFontFiles,
    setSelectedTextWeight,
    toggleFormat,
    handleTextFormatShortcut,
    setTextAlignment,
  } = useTextEditing({ ...state, createHistorySnapshot, recordHistory, activeAdded, activeKey });

  const snapPosition = useCallback(
    (
      x: number,
      top: number,
      box: Pick<AddedTextBox, 'id' | 'page' | 'width' | 'height'> & {
        size?: number;
        sourceBlockId?: number;
        snapId?: string;
        snapAs?: 'text' | 'box';
      },
    ) => {
      if (!snapEnabled) return { x, top, guides: {} as SnapGuides };
      const anchorOffset = (length: number) =>
        snapAnchor === 'start' ? 0 : snapAnchor === 'center' ? length / 2 : length;
      const textTargets = (pages[box.page]?.blocks || [])
        .filter((entry) => entry.id !== box.sourceBlockId)
        .map((entry) => {
          const entryEdit = edits[blockKey(box.page, entry.id)];
          const entryTop = entryEdit?.top ?? entry.top;
          return {
            ...entry,
            x: entryEdit?.x ?? entry.x,
            top: entryTop,
            baseline: entryTop + (entry.baseline - entry.top),
          };
        });
      const peerTargets = addedBoxes.filter((entry) => entry.page === box.page && entry.id !== box.id);
      const formTargets = (pages[box.page]?.forms || [])
        .filter((entry) => entry.id !== box.id)
        .map((entry) => {
          const edit = formEdits[`${box.page}:${entry.id}`] || {};
          return {
            x: edit.x ?? entry.x,
            top: edit.top ?? entry.top,
            width: edit.width ?? entry.width,
            height: edit.height ?? entry.height,
          };
        });
      const xfaFieldTargets = Object.values({ ...xfaFields, ...xfaStructureEdits }).filter(
        (entry) => entry.page === box.page && !entry.deleted && `xfa-field:${entry.key}` !== box.snapId,
      );
      const xfaDrawTargets = Object.values({ ...xfaDraws, ...xfaDrawEdits }).filter(
        (entry) => entry.page === box.page && !entry.deleted && `xfa-draw:${entry.key}` !== box.snapId,
      );
      const targetX: number[] = [];
      const targetY: number[] = [];
      textTargets.forEach((entry) => {
        if (snapMode === 'text') {
          targetX.push(entry.x + anchorOffset(entry.width));
          targetY.push(entry.baseline);
        } else {
          targetX.push(entry.x + anchorOffset(entry.width));
          targetY.push(entry.top + anchorOffset(entry.height));
        }
      });
      peerTargets.forEach((entry) => {
        if (snapMode === 'text') {
          targetX.push(entry.x + anchorOffset(entry.width));
          targetY.push(entry.top + entry.size);
        } else {
          targetX.push(entry.x + anchorOffset(entry.width));
          targetY.push(entry.top + anchorOffset(entry.height));
        }
      });
      formTargets.forEach((entry) => {
        targetX.push(entry.x + anchorOffset(entry.width));
        targetY.push(entry.top + anchorOffset(entry.height));
      });
      xfaFieldTargets.forEach((entry) => {
        targetX.push(entry.x + anchorOffset(entry.width));
        targetY.push(entry.top + anchorOffset(entry.height));
      });
      xfaDrawTargets.forEach((entry) => {
        targetX.push(entry.x + anchorOffset(entry.width));
        const textBaseline = entry.top + (entry.size || entry.height * 0.69);
        targetY.push(
          snapMode === 'text' && entry.kind === 'text'
            ? textBaseline
            : entry.top + anchorOffset(entry.height),
        );
      });
      const threshold = 7 / zoom;
      let snappedX = x;
      let snappedTop = top;
      let bestX = threshold;
      let bestY = threshold;
      let guideX: number | undefined;
      let guideY: number | undefined;
      const baselineOffset = box.size || box.height * 0.69;
      const xOffset = anchorOffset(box.width);
      const yOffset = snapMode === 'text' && box.snapAs !== 'box' ? baselineOffset : anchorOffset(box.height);
      const movingX = [{ value: x + xOffset, offset: xOffset }];
      const movingY = [{ value: top + yOffset, offset: yOffset }];
      targetX.forEach((target) =>
        movingX.forEach((moving) => {
          const distance = Math.abs(target - moving.value);
          if (distance < bestX) {
            bestX = distance;
            snappedX = target - moving.offset;
            guideX = target;
          }
        }),
      );
      targetY.forEach((target) =>
        movingY.forEach((moving) => {
          const distance = Math.abs(target - moving.value);
          if (distance < bestY) {
            bestY = distance;
            snappedTop = target - moving.offset;
            guideY = target;
          }
        }),
      );
      return { x: snappedX, top: snappedTop, guides: { x: guideX, y: guideY } };
    },
    [
      addedBoxes,
      edits,
      formEdits,
      pages,
      snapAnchor,
      snapEnabled,
      snapMode,
      xfaDrawEdits,
      xfaDraws,
      xfaFields,
      xfaStructureEdits,
      zoom,
    ],
  );

  const {
    addTextBox,
    addXfaField,
    addNormalFormField,
    updateXfaField,
    updateAddedXfaValue,
    removeSelectedAddedXfaField,
    updateXfaCalculation,
    updateXfaValidation,
    updateXfaEventScript,
    updateFormEdit,
    updateFormValue,
    selectNormalForm,
    startGroupDrag,
    startFormDrag,
    startFormResize,
    updateXfaDraw,
  } = useFormEditing({
    ...state,
    measureAddedBox,
    snapPosition,
    recordHistory,
    activeXfaField,
    activeFormKey,
    activeFormLabel,
    updateElementSelection,
    createHistorySnapshot,
    isElementSelected,
    activeXfaDraw,
  });

  const currentBlockVisual = (block: TextBlock) => {
    const key = blockKey(currentPage, block.id);
    return (
      blockVisuals[key] ||
      (canvasRef.current && pages[currentPage]
        ? sampleTextBlockVisual(canvasRef.current, pages[currentPage].width, zoom, block)
        : { background: '#ffffff', color: '#111111' })
    );
  };

  const {
    cloneSelectedElement,
    cloneSelectedElements,
    applyBatchStyle,
    fitSelectedTextBoxes,
    setSelectedTextBoxesAutoFit,
    generateRepeatedRows,
  } = useBatchEditing({
    ...state,
    activeXfaField,
    recordHistory,
    activeFormEdit,
    activeAdded,
    activeBlock,
    activeEdit,
    currentBlockVisual,
    activeAddedImage,
    activeExistingImage,
    activeImageKey,
    activeImageEdit,
    activeXfaDraw,
    createHistorySnapshot,
    measureAddedBox,
    repeatHeaders,
    repeatRows,
    repeatableElements,
  });

  const rememberXfaRichSelection = () => {
    const editor = xfaRichEditorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) xfaRichSelectionRef.current = range.cloneRange();
  };

  const restoreXfaRichSelection = () => {
    const range = xfaRichSelectionRef.current;
    if (!range) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  const syncXfaRichEditor = () => {
    const editor = xfaRichEditorRef.current;
    if (!editor) return;
    const html = sanitizeXfaRichHtml(editor.innerHTML);
    if (html !== editor.innerHTML) editor.innerHTML = html;
    updateXfaDraw({ html, text: editor.innerText });
  };

  const formatXfaRichText = (command: string, value?: string) => {
    const editor = xfaRichEditorRef.current;
    if (!editor) return;
    editor.focus();
    restoreXfaRichSelection();
    document.execCommand(command, false, value);
    rememberXfaRichSelection();
    syncXfaRichEditor();
  };

  const addXfaRichLink = () => {
    restoreXfaRichSelection();
    const href = window.prompt('Link address (https://, mailto:, or tel:):', 'https://');
    if (href === null) return;
    if (!/^(https?:|mailto:|tel:|#)/i.test(href.trim())) {
      setError('Please enter an https, mailto, or tel link.');
      return;
    }
    formatXfaRichText('createLink', href.trim());
  };

  const {
    startXfaDrawDrag,
    startXfaDrawResize,
    replaceXfaDrawImage,
    startXfaDrag,
    startXfaResize,
    startBoxDrag,
    startBoxResize,
    startExistingDrag,
    startExistingResize,
  } = useElementDrag({
    ...state,
    createHistorySnapshot,
    snapPosition,
    recordHistory,
    activeXfaDraw,
    updateXfaDraw,
    isElementSelected,
    startGroupDrag,
  });

  const {
    addImageFile,
    selectExistingImage,
    startImageDrag,
    startImageResize,
    toggleExistingImageDeleted,
    removeAddedImage,
    deleteSelectedElements,
  } = useImageEditing({
    ...state,
    recordHistory,
    updateElementSelection,
    isElementSelected,
    startGroupDrag,
    createHistorySnapshot,
  });

  const runOcr = (region?: { x: number; top: number; width: number; height: number }) =>
    recognizeText({ ...state, recordHistory }, region);

  const {
    startOcrRegionSelection,
    startVectorDrawing,
    startVectorDrag,
    startVectorResize,
    cloneVector,
    deleteVector,
    startMarqueeSelection,
    updateSelectedImageSize,
    startCanvasPan,
    moveCanvasPan,
    stopCanvasPan,
    zoomCanvasWithWheel,
  } = useCanvasInteraction({
    ...state,
    runOcr,
    createHistorySnapshot,
    recordHistory,
    isElementSelected,
    startGroupDrag,
    activeVector,
    activeVectorEdit,
    activeVectorKey,
    isFormOwnedVector,
    relatedShapeElements,
    activeAddedImage,
    activeImageKey,
  });

  const undo = () => {
    if (!past.length) return;
    const previous = past[past.length - 1];
    setFuture((items) => [createHistorySnapshot(), ...items].slice(0, 40));
    setPast((items) => items.slice(0, -1));
    restoreHistorySnapshot(previous);
  };
  const redo = () => {
    if (!future.length) return;
    const next = future[0];
    setPast((items) => [...items.slice(-39), createHistorySnapshot()]);
    setFuture((items) => items.slice(1));
    restoreHistorySnapshot(next);
  };

  const exportPdf = () => exportDocument({ ...state, vectorBackgroundForText });

  const toggleTitleAndTabs = () => {
    setCombineTitleAndTabs((combined) => {
      const next = !combined;
      try {
        window.localStorage.setItem('paperly-combine-title-tabs', String(next));
      } catch {
        /* local preference is optional */
      }
      return next;
    });
  };

  return {
    uploadRef,
    repeatDataFileRef,
    imageUploadRef,
    xfaImageReplaceRef,
    fontUploadRef,
    xfaRichEditorRef,
    canvasRef,
    xfaLayerRef,
    canvasWrapRef,
    pdfRef,
    marqueeSuppressClickRef,
    scheduleXfaRuntimeRef,
    documentTabs,
    activeDocumentId,
    combineTitleAndTabs,
    themeMode,
    setThemeMode,
    joinSplitCharacters,
    setJoinSplitCharacters,
    pdfBytes,
    isXfaDocument,
    xfaChanged,
    xfaStructureEdits,
    xfaDrawEdits,
    setSelectedXfaDrawKey,
    xfaTemplateModel,
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
    pages,
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
    edits,
    past,
    future,
    selected,
    setSelected,
    selectedElements,
    setSelectedElements,
    selectionMarquee,
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
    formEdits,
    formBackgrounds,
    setFormBackgrounds,
    normalCloneMode,
    setNormalCloneMode,
    addedBoxes,
    setAddedBoxes,
    addedImages,
    imageEdits,
    vectorEdits,
    setVectorEdits,
    selectedVectorId,
    setSelectedVectorId,
    selectPdfShapes,
    setSelectPdfShapes,
    moveShapeContents,
    drawFill,
    setDrawFill,
    drawStroke,
    setDrawStroke,
    drawStrokeWidth,
    setDrawStrokeWidth,
    draftVector,
    imageCaptures,
    selectedImage,
    setSelectedImage,
    selectedAddedId,
    setSelectedAddedId,
    tool,
    setTool,
    ocrBusy,
    ocrProgress,
    ocrStatus,
    ocrConfidenceThreshold,
    setOcrConfidenceThreshold,
    ocrRecognizeLayout,
    setOcrRecognizeLayout,
    ocrRegion,
    snapEnabled,
    setSnapEnabled,
    snapMode,
    setSnapMode,
    snapAnchor,
    setSnapAnchor,
    showDeletedLabels,
    setShowDeletedLabels,
    fontWarnings,
    setFontWarnings,
    uploadedFonts,
    snapGuides,
    setSnapGuides,
    blockVisuals,
    loading,
    error,
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
    setPropertyPanelMode,
    darkMode,
    activeKey,
    activeBlock,
    activeEdit,
    activeVisual,
    activeAdded,
    activeAddedImage,
    activeExistingImage,
    activeImageKey,
    activeImageEdit,
    activeVector,
    activeVectorKey,
    activeVectorEdit,
    activeXfaField,
    activeXfaDraw,
    activeFormKey,
    activeFormEdit,
    activeFormLabel,
    xfaEventActivities,
    activeXfaEvent,
    activeBold,
    activeWeight,
    activeItalic,
    activeUnderline,
    activeStrike,
    activeAlignment,
    batchStyleCount,
    batchTextBoxCount,
    batchAutoFitEnabled,
    isLikelyScannedPage,
    repeatHeaders,
    repeatRows,
    repeatableElements,
    hasTextSelection,
    availablePropertyModes,
    effectivePropertyPanelMode,
    isElementSelected,
    isFormOwnedVector,
    relatedShapeElements,
    vectorBackgroundForText,
    activeTypeface,
    activeTypefaceUnsupported,
    activeSourceFontImported,
    availableFontOptions,
    updateElementSelection,
    resizePanelWithKeyboard,
    startPanelResize,
    switchDocument,
    changePages,
    insertPdfFiles,
    copyPageToTab,
    closeDocument,
    openFile,
    commit,
    selectExistingBlock,
    measureAddedBox,
    editableTextValue,
    measureAddedBoxWrappedHeight,
    updateAddedBox,
    fitAddedBox,
    fitExistingBox,
    uploadFontFiles,
    setSelectedTextWeight,
    toggleFormat,
    handleTextFormatShortcut,
    setTextAlignment,
    addTextBox,
    addXfaField,
    addNormalFormField,
    updateXfaField,
    updateAddedXfaValue,
    removeSelectedAddedXfaField,
    updateXfaCalculation,
    updateXfaValidation,
    updateXfaEventScript,
    updateFormEdit,
    updateFormValue,
    selectNormalForm,
    startFormDrag,
    startFormResize,
    updateXfaDraw,
    cloneSelectedElement,
    cloneSelectedElements,
    applyBatchStyle,
    fitSelectedTextBoxes,
    setSelectedTextBoxesAutoFit,
    generateRepeatedRows,
    rememberXfaRichSelection,
    syncXfaRichEditor,
    formatXfaRichText,
    addXfaRichLink,
    startXfaDrawDrag,
    startXfaDrawResize,
    replaceXfaDrawImage,
    startXfaDrag,
    startXfaResize,
    startBoxDrag,
    startBoxResize,
    startExistingDrag,
    startExistingResize,
    addImageFile,
    selectExistingImage,
    startImageDrag,
    startImageResize,
    toggleExistingImageDeleted,
    removeAddedImage,
    deleteSelectedElements,
    runOcr,
    startOcrRegionSelection,
    startVectorDrawing,
    startVectorDrag,
    startVectorResize,
    cloneVector,
    deleteVector,
    startMarqueeSelection,
    updateSelectedImageSize,
    startCanvasPan,
    moveCanvasPan,
    stopCanvasPan,
    zoomCanvasWithWheel,
    undo,
    redo,
    exportPdf,
    toggleTitleAndTabs,
  };
}

export type PdfEditorController = ReturnType<typeof usePdfEditor>;
