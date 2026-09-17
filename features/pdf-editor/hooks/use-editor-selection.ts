'use client';

import { fontOptions } from '../constants';
import { editableBlockFont, fontFamilyIdentity, isSupportedTypeface } from '../lib/fonts';
import { blockKey, parseDelimitedText } from '../lib/text';
import type { PropertyPanelMode, SelectedElementRef, TextBlock, TextWeight, VectorBlock } from '../types';
import type { EditorState } from './use-editor-state';

type Context = Pick<
  EditorState,
  | 'selected'
  | 'currentPage'
  | 'pages'
  | 'edits'
  | 'blockVisuals'
  | 'addedBoxes'
  | 'selectedAddedId'
  | 'selectedImage'
  | 'addedImages'
  | 'imageEdits'
  | 'selectedVectorId'
  | 'vectorEdits'
  | 'selectedXfaKey'
  | 'xfaStructureEdits'
  | 'xfaFields'
  | 'selectedXfaDrawKey'
  | 'xfaDrawEdits'
  | 'xfaDraws'
  | 'selectedForm'
  | 'formEdits'
  | 'xfaEventActivity'
  | 'selectedElements'
  | 'pdfBytes'
  | 'repeatDataText'
  | 'formChanges'
  | 'fontWarnings'
  | 'propertyPanelMode'
  | 'moveShapeContents'
  | 'uploadedFonts'
  | 'setSelectedElements'
> & {};

export function useEditorSelection({
  selected,
  currentPage,
  pages,
  edits,
  blockVisuals,
  addedBoxes,
  selectedAddedId,
  selectedImage,
  addedImages,
  imageEdits,
  selectedVectorId,
  vectorEdits,
  selectedXfaKey,
  xfaStructureEdits,
  xfaFields,
  selectedXfaDrawKey,
  xfaDrawEdits,
  xfaDraws,
  selectedForm,
  formEdits,
  xfaEventActivity,
  selectedElements,
  pdfBytes,
  repeatDataText,
  formChanges,
  fontWarnings,
  propertyPanelMode,
  moveShapeContents,
  uploadedFonts,
  setSelectedElements,
}: Context) {
  const activeKey = selected === null ? null : blockKey(currentPage, selected);
  const activeBlock =
    selected === null ? null : pages[currentPage]?.blocks.find((entry) => entry.id === selected);
  const activeEdit = activeKey ? edits[activeKey] : undefined;
  const activeVisual = activeKey ? blockVisuals[activeKey] : undefined;
  const activeAdded = addedBoxes.find((box) => box.id === selectedAddedId) || null;
  const activeAddedImage =
    selectedImage?.kind === 'added'
      ? addedImages.find((image) => image.id === selectedImage.id) || null
      : null;
  const activeExistingImage =
    selectedImage?.kind === 'existing'
      ? pages[currentPage]?.images.find((image) => image.id === selectedImage.id) || null
      : null;
  const activeImageKey = activeExistingImage ? `${currentPage}:${activeExistingImage.id}` : null;
  const activeImageEdit = activeImageKey ? imageEdits[activeImageKey] : undefined;
  const activeVector = selectedVectorId
    ? pages[currentPage]?.vectors.find((vector) => vector.id === selectedVectorId) || null
    : null;
  const activeVectorKey = activeVector ? `${currentPage}:${activeVector.id}` : null;
  const activeVectorEdit = activeVectorKey ? vectorEdits[activeVectorKey] || {} : {};
  const activeXfaField = selectedXfaKey
    ? xfaStructureEdits[selectedXfaKey] || xfaFields[selectedXfaKey]
    : null;
  const activeXfaDraw = selectedXfaDrawKey
    ? xfaDrawEdits[selectedXfaDrawKey] || xfaDraws[selectedXfaDrawKey]
    : null;
  const activeFormKey = selectedForm ? `${currentPage}:${selectedForm.id}` : null;
  const activeFormEdit = activeFormKey ? formEdits[activeFormKey] : undefined;
  const activeFormLabel =
    selectedForm?.labelBlockId === undefined
      ? null
      : pages[currentPage]?.blocks.find((block) => block.id === selectedForm.labelBlockId) || null;
  const xfaEventActivities = Array.from(
    new Set([
      'change',
      'click',
      'enter',
      'exit',
      'initialize',
      'ready',
      ...Object.keys(activeXfaField?.events || {}),
    ]),
  );
  const activeXfaEvent = activeXfaField?.events?.[xfaEventActivity];
  const activeBold = activeAdded?.bold ?? activeEdit?.bold ?? activeBlock?.bold ?? false;
  const activeWeight: TextWeight = activeAdded
    ? !activeAdded.bold
      ? 400
      : activeAdded.ocrTextStroke
        ? activeAdded.ocrTextStroke >= 0.25
          ? 600
          : 500
        : (activeAdded.ocrFontWeight === 400 ? 600 : (activeAdded.ocrFontWeight as TextWeight)) || 700
    : activeEdit?.fontWeight || ((activeEdit?.bold ?? activeBlock?.bold) ? 700 : 400);
  const activeItalic = activeAdded?.italic ?? activeEdit?.italic ?? activeBlock?.italic ?? false;
  const activeUnderline = activeAdded?.underline ?? activeEdit?.underline ?? false;
  const activeStrike = activeAdded?.strike ?? activeEdit?.strike ?? false;
  const activeAlignment = activeAdded?.alignment ?? activeEdit?.alignment ?? 'left';
  const formCount = pages.reduce((total, page) => total + page.forms.length, 0);
  const batchStyleCount = selectedElements.filter(
    (item) => item.kind === 'text' || item.kind === 'added-text' || item.kind === 'form',
  ).length;
  const batchTextBoxIds = new Set(
    selectedElements.filter((item) => item.kind === 'added-text').map((item) => item.id),
  );
  const batchTextBoxCount = batchTextBoxIds.size;
  const batchAutoFitEnabled =
    batchTextBoxCount > 0 &&
    addedBoxes.filter((box) => batchTextBoxIds.has(box.id)).every((box) => box.autoFit);
  const isLikelyScannedPage = Boolean(pdfBytes && pages[currentPage] && pages[currentPage].blocks.length < 3);
  const repeatTable = parseDelimitedText(repeatDataText);
  const repeatHeaders = repeatTable[0] || [];
  const repeatRows = repeatTable.slice(1);
  const repeatableElements = selectedElements
    .filter(
      (item) =>
        item.page === currentPage &&
        (item.kind === 'text' || item.kind === 'added-text' || item.kind === 'form'),
    )
    .flatMap((item) => {
      if (item.kind === 'text') {
        const block = pages[currentPage]?.blocks.find((entry) => String(entry.id) === item.id);
        if (!block) return [];
        const edit = edits[blockKey(currentPage, block.id)];
        return [{ item, x: edit?.x ?? block.x, top: edit?.top ?? block.top, label: edit?.text ?? block.str }];
      }
      if (item.kind === 'added-text') {
        const box = addedBoxes.find((entry) => entry.id === item.id);
        return box ? [{ item, x: box.x, top: box.top, label: box.text }] : [];
      }
      const field = pages[currentPage]?.forms.find((entry) => entry.id === item.id);
      if (!field) return [];
      const edit = formEdits[`${currentPage}:${field.id}`];
      return [
        {
          item,
          x: edit?.x ?? field.x,
          top: edit?.top ?? field.top,
          label: String(formChanges[field.name] ?? field.value ?? field.name),
        },
      ];
    })
    .sort((first, second) => first.x - second.x || first.top - second.top);
  const hasTextSelection = Boolean(activeAdded || (activeKey && activeBlock));
  const availablePropertyModes: PropertyPanelMode[] =
    selectedElements.length > 1
      ? ['layout', 'style']
      : activeXfaField || selectedForm
        ? ['layout', 'style', 'advanced']
        : activeXfaDraw || selectedImage
          ? ['layout']
          : activeVector
            ? ['layout', 'style']
            : hasTextSelection
              ? fontWarnings.length > 0
                ? ['layout', 'style', 'advanced']
                : ['layout', 'style']
              : pdfBytes
                ? ['advanced']
                : [];
  const effectivePropertyPanelMode = availablePropertyModes.includes(propertyPanelMode)
    ? propertyPanelMode
    : availablePropertyModes[0] || 'layout';
  const isElementSelected = (kind: SelectedElementRef['kind'], id: string, page = currentPage) =>
    selectedElements.some((item) => item.page === page && item.kind === kind && item.id === id);
  const isFormOwnedVector = (pageIndex: number, vector: VectorBlock) => {
    const page = pages[pageIndex];
    if (!page || vector.added) return false;
    const tolerance = 3;
    return page.forms.some((field) => {
      const bounds = field.backdrop || field;
      return (
        vector.x >= bounds.x - tolerance &&
        vector.top >= bounds.top - tolerance &&
        vector.x + vector.width <= bounds.x + bounds.width + tolerance &&
        vector.top + vector.height <= bounds.top + bounds.height + tolerance
      );
    });
  };
  const relatedShapeElements = (pageIndex: number, seedIds: string[]) => {
    const page = pages[pageIndex];
    if (!page || !seedIds.length) return [] as SelectedElementRef[];
    const geometry = (vector: VectorBlock) => {
      const edit = vectorEdits[`${pageIndex}:${vector.id}`] || {};
      return {
        vector,
        x: edit.x ?? vector.x,
        top: edit.top ?? vector.top,
        width: edit.width ?? vector.width,
        height: edit.height ?? vector.height,
        deleted: edit.deleted,
      };
    };
    const seedSet = new Set(seedIds);
    const selectedIds = new Set(seedIds);
    const candidates = page.vectors
      .map(geometry)
      .filter(
        (entry) =>
          !entry.deleted &&
          !isFormOwnedVector(pageIndex, entry.vector) &&
          (selectedIds.has(entry.vector.id) ||
            entry.width < page.width * 0.98 ||
            entry.height < page.height * 0.98),
      );
    const touches = (first: ReturnType<typeof geometry>, second: ReturnType<typeof geometry>) => {
      const gap = 2.5;
      const horizontalOverlap =
        first.x <= second.x + second.width + gap && first.x + first.width + gap >= second.x;
      const verticalOverlap =
        first.top <= second.top + second.height + gap && first.top + first.height + gap >= second.top;
      const verticalEdgesTouch =
        Math.abs(first.x - (second.x + second.width)) <= gap ||
        Math.abs(first.x + first.width - second.x) <= gap;
      const horizontalEdgesTouch =
        Math.abs(first.top - (second.top + second.height)) <= gap ||
        Math.abs(first.top + first.height - second.top) <= gap;
      return (verticalOverlap && verticalEdgesTouch) || (horizontalOverlap && horizontalEdgesTouch);
    };
    let expanded = true;
    while (expanded) {
      expanded = false;
      const selectedGeometry = candidates.filter((entry) => selectedIds.has(entry.vector.id));
      for (const candidate of candidates)
        if (
          !selectedIds.has(candidate.vector.id) &&
          selectedGeometry.some((entry) => touches(entry, candidate))
        ) {
          selectedIds.add(candidate.vector.id);
          expanded = true;
        }
    }
    const selectedGeometry = candidates.filter((entry) => selectedIds.has(entry.vector.id));
    const refs: SelectedElementRef[] = selectedGeometry.map((entry) => ({
      page: pageIndex,
      kind: 'vector',
      id: entry.vector.id,
      selectionRole: seedSet.has(entry.vector.id) ? 'direct' : 'related',
    }));
    if (moveShapeContents && selectedGeometry.length) {
      const left = Math.min(...selectedGeometry.map((entry) => entry.x));
      const top = Math.min(...selectedGeometry.map((entry) => entry.top));
      const right = Math.max(...selectedGeometry.map((entry) => entry.x + entry.width));
      const bottom = Math.max(...selectedGeometry.map((entry) => entry.top + entry.height));
      page.blocks.forEach((block) => {
        const edit = edits[blockKey(pageIndex, block.id)];
        const x = edit?.x ?? block.x;
        const blockTop = edit?.top ?? block.top;
        const centerX = x + block.width / 2;
        const centerY = blockTop + block.height / 2;
        if (
          !edit?.deleted &&
          centerX >= left - 1 &&
          centerX <= right + 1 &&
          centerY >= top - 1 &&
          centerY <= bottom + 1
        )
          refs.push({ page: pageIndex, kind: 'text', id: String(block.id), selectionRole: 'related' });
      });
    }
    return refs;
  };
  const vectorBackgroundForText = (pageIndex: number, block: TextBlock) => {
    const centerX = block.x + block.width / 2;
    const centerY = block.top + block.height / 2;
    return pages[pageIndex]?.vectors.findLast(
      (vector) =>
        !vector.added &&
        vector.kind === 'rectangle' &&
        vector.fill !== 'transparent' &&
        !vectorEdits[`${pageIndex}:${vector.id}`]?.deleted &&
        centerX >= vector.x &&
        centerX <= vector.x + vector.width &&
        centerY >= vector.top &&
        centerY <= vector.top + vector.height,
    )?.fill;
  };
  const activeTypeface =
    activeAdded?.font || activeEdit?.font || (activeBlock ? editableBlockFont(activeBlock) : 'Helvetica');
  const activeTypefaceUnsupported = Boolean(
    activeBlock &&
    !activeEdit?.font &&
    !isSupportedTypeface(activeBlock.sourceFont) &&
    !uploadedFonts.some(
      (font) => fontFamilyIdentity(font.name) === fontFamilyIdentity(activeBlock.sourceFont),
    ),
  );
  const activeSourceFontImported = Boolean(
    activeAdded?.sourceFontName &&
    uploadedFonts.some(
      (font) => fontFamilyIdentity(font.name) === fontFamilyIdentity(activeAdded.sourceFontName),
    ),
  );
  const availableFontOptions = Array.from(
    new Set([
      ...fontOptions,
      ...uploadedFonts.map((font) => font.name),
      ...(activeTypeface ? [activeTypeface] : []),
    ]),
  );
  const updateElementSelection = (item: SelectedElementRef, additive = false) => {
    const directItem = { ...item, selectionRole: 'direct' as const };
    setSelectedElements((current) => {
      if (!additive) return [directItem];
      const exists = current.some(
        (entry) => entry.page === item.page && entry.kind === item.kind && entry.id === item.id,
      );
      return exists
        ? current.filter(
            (entry) => !(entry.page === item.page && entry.kind === item.kind && entry.id === item.id),
          )
        : [...current, directItem];
    });
  };

  return {
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
  };
}
