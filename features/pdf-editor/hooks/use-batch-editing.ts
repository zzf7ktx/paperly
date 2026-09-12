'use client';

import { type XfaDrawEdit, type XfaTemplateEdit } from '../../../lib/xfa-template';
import { browserFontFamily, editableBlockFont } from '../lib/fonts';
import { blockKey, selectedElementKey, wrapTextForWidth } from '../lib/text';
import type {
  AddedImage,
  AddedTextBox,
  Edit,
  EditorHistorySnapshot,
  FormBlock,
  FormEdit,
  ImageBlock,
  ImageEdit,
  SelectedElementRef,
  TextAlignment,
  TextBlock,
  VectorBlock,
} from '../types';
import type { EditorState } from './use-editor-state';

type Context = Pick<
  EditorState,
  | 'pages'
  | 'currentPage'
  | 'xfaLayerRef'
  | 'setXfaStructureEdits'
  | 'setSelectedXfaKey'
  | 'setXfaChanged'
  | 'setToast'
  | 'selectedForm'
  | 'normalCloneMode'
  | 'formChanges'
  | 'setPages'
  | 'setFormChanges'
  | 'setSelectedElements'
  | 'setSelectedForm'
  | 'setAddedBoxes'
  | 'setSelectedAddedId'
  | 'setSelected'
  | 'setAddedImages'
  | 'setSelectedImage'
  | 'imageCaptures'
  | 'setXfaDrawEdits'
  | 'setSelectedXfaDrawKey'
  | 'selectedElements'
  | 'canvasRef'
  | 'zoom'
  | 'edits'
  | 'addedBoxes'
  | 'formEdits'
  | 'addedImages'
  | 'imageEdits'
  | 'vectorEdits'
  | 'setSelectedVectorId'
  | 'setEdits'
  | 'setFormEdits'
  | 'snapEnabled'
  | 'snapAnchor'
  | 'snapMode'
  | 'repeatTextSizing'
  | 'repeatColumnMap'
  | 'repeatRowGap'
  | 'repeatUseTemplateFirst'
  | 'setRepeatDataOpen'
> & {
  activeXfaField: XfaTemplateEdit | null;
  recordHistory: (snapshot?: EditorHistorySnapshot) => void;
  activeFormEdit: FormEdit | undefined;
  activeAdded: AddedTextBox | null;
  activeBlock: TextBlock | null | undefined;
  activeEdit: Edit | undefined;
  currentBlockVisual: (block: TextBlock) => { background: string; color: string };
  activeAddedImage: AddedImage | null;
  activeExistingImage: ImageBlock | null;
  activeImageKey: string | null;
  activeImageEdit: ImageEdit | undefined;
  activeXfaDraw: XfaDrawEdit | null;
  createHistorySnapshot: () => EditorHistorySnapshot;
  measureAddedBox: (box: AddedTextBox) => { width: number; height: number };
  repeatHeaders: string[];
  repeatRows: string[][];
  repeatableElements: { item: SelectedElementRef; x: number; top: number; label: string }[];
};

export function useBatchEditing({
  pages,
  currentPage,
  activeXfaField,
  xfaLayerRef,
  recordHistory,
  setXfaStructureEdits,
  setSelectedXfaKey,
  setXfaChanged,
  setToast,
  selectedForm,
  activeFormEdit,
  normalCloneMode,
  formChanges,
  setPages,
  setFormChanges,
  setSelectedElements,
  setSelectedForm,
  activeAdded,
  setAddedBoxes,
  setSelectedAddedId,
  activeBlock,
  activeEdit,
  currentBlockVisual,
  setSelected,
  activeAddedImage,
  setAddedImages,
  setSelectedImage,
  activeExistingImage,
  activeImageKey,
  imageCaptures,
  activeImageEdit,
  activeXfaDraw,
  setXfaDrawEdits,
  setSelectedXfaDrawKey,
  selectedElements,
  createHistorySnapshot,
  canvasRef,
  zoom,
  edits,
  addedBoxes,
  formEdits,
  addedImages,
  imageEdits,
  vectorEdits,
  setSelectedVectorId,
  setEdits,
  setFormEdits,
  measureAddedBox,
  snapEnabled,
  snapAnchor,
  snapMode,
  repeatTextSizing,
  repeatHeaders,
  repeatRows,
  repeatableElements,
  repeatColumnMap,
  repeatRowGap,
  repeatUseTemplateFirst,
  setRepeatDataOpen,
}: Context) {
  const cloneSelectedElement = () => {
    const page = pages[currentPage];
    if (!page) return;
    const shifted = (x: number, top: number, width: number, height: number) => ({
      x: Math.min(Math.max(0, x + 12), Math.max(0, page.width - width)),
      top: Math.min(Math.max(0, top + 12), Math.max(0, page.height - height)),
    });
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    if (activeXfaField) {
      const position = shifted(
        activeXfaField.x,
        activeXfaField.top,
        activeXfaField.width,
        activeXfaField.height,
      );
      const name = `${activeXfaField.name}_copy_${suffix.replace('-', '_')}`;
      const key = `added:${currentPage}:${suffix}`;
      const liveControl = xfaLayerRef.current
        ?.querySelector<HTMLElement>(`[data-paperly-xfa-key="${CSS.escape(activeXfaField.key)}"]`)
        ?.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
          'input, textarea, select',
        );
      const liveValue =
        liveControl instanceof HTMLInputElement &&
        (liveControl.type === 'checkbox' || liveControl.type === 'radio')
          ? liveControl.checked
          : liveControl?.value;
      const cloneOriginals =
        activeXfaField.added && !activeXfaField.cloneSourceName
          ? {
              originalLabel: activeXfaField.label,
              originalCalculation: activeXfaField.calculation ? { ...activeXfaField.calculation } : undefined,
              originalValidation: activeXfaField.validation ? { ...activeXfaField.validation } : undefined,
              originalEvents: { ...(activeXfaField.events || {}) },
              originalFont: activeXfaField.font,
              originalSize: activeXfaField.size,
              originalColor: activeXfaField.color,
              originalBackgroundColor: activeXfaField.backgroundColor,
              originalBorderColor: activeXfaField.borderColor,
              originalBorderWidth: activeXfaField.borderWidth,
              originalAlignment: activeXfaField.alignment,
              originalCaptionFont: activeXfaField.captionFont,
              originalCaptionSize: activeXfaField.captionSize,
              originalCaptionColor: activeXfaField.captionColor,
              originalCaptionBold: activeXfaField.captionBold,
              originalCaptionItalic: activeXfaField.captionItalic,
              originalCaptionAlignment: activeXfaField.captionAlignment,
              originalPaddingTop: activeXfaField.paddingTop,
              originalPaddingRight: activeXfaField.paddingRight,
              originalPaddingBottom: activeXfaField.paddingBottom,
              originalPaddingLeft: activeXfaField.paddingLeft,
            }
          : {};
      const clone: XfaTemplateEdit = {
        ...activeXfaField,
        ...position,
        ...cloneOriginals,
        key,
        sourceName: name,
        name,
        occurrence: 0,
        value: liveValue ?? activeXfaField.value ?? '',
        originalX: position.x,
        originalTop: position.top,
        originalWidth: activeXfaField.width,
        originalHeight: activeXfaField.height,
        cloneSourceName: activeXfaField.added ? activeXfaField.cloneSourceName : activeXfaField.sourceName,
        cloneSourceOccurrence: activeXfaField.added
          ? activeXfaField.cloneSourceOccurrence
          : activeXfaField.occurrence,
        cloneSourceX: activeXfaField.cloneSourceX ?? activeXfaField.originalX,
        cloneSourceTop: activeXfaField.cloneSourceTop ?? activeXfaField.originalTop,
        cloneSourceWidth: activeXfaField.cloneSourceWidth ?? activeXfaField.originalWidth,
        cloneSourceHeight: activeXfaField.cloneSourceHeight ?? activeXfaField.originalHeight,
        deleted: false,
        added: true,
      };
      recordHistory();
      setXfaStructureEdits((items) => ({ ...items, [key]: clone }));
      setSelectedXfaKey(key);
      setXfaChanged(true);
      setToast('XFA field cloned');
    } else if (selectedForm) {
      const edit = activeFormEdit || {};
      const width = edit.width ?? selectedForm.width;
      const height = edit.height ?? selectedForm.height;
      const position = shifted(edit.x ?? selectedForm.x, edit.top ?? selectedForm.top, width, height);
      const name =
        normalCloneMode === 'shared'
          ? selectedForm.name
          : `${selectedForm.name}_copy_${suffix.replace('-', '_')}`;
      const clone: FormBlock = {
        ...selectedForm,
        ...edit,
        ...position,
        id: `added-form-${suffix}`,
        name,
        width,
        height,
        value: formChanges[selectedForm.name] ?? selectedForm.value,
        added: true,
        sharedField: normalCloneMode === 'shared',
        labelBlockId: undefined,
      };
      recordHistory();
      setPages((items) =>
        items.map((entry, index) =>
          index === currentPage ? { ...entry, forms: [...entry.forms, clone] } : entry,
        ),
      );
      setFormChanges((values) => ({ ...values, [name]: clone.value }));
      setSelectedElements([{ page: currentPage, kind: 'form', id: clone.id }]);
      setSelectedForm(clone);
      setToast(normalCloneMode === 'shared' ? 'Shared form widget cloned' : 'Independent form field cloned');
    } else if (activeAdded) {
      const position = shifted(activeAdded.x, activeAdded.top, activeAdded.width, activeAdded.height);
      const clone = { ...activeAdded, ...position, id: `added-${suffix}` };
      recordHistory();
      setAddedBoxes((boxes) => [...boxes, clone]);
      setSelectedElements([{ page: currentPage, kind: 'added-text', id: clone.id }]);
      setSelectedAddedId(clone.id);
      setToast('Text box cloned');
    } else if (activeBlock) {
      const edit = activeEdit || { text: activeBlock.str };
      const width = edit.width ?? activeBlock.width;
      const height = edit.height ?? activeBlock.height;
      const position = shifted(edit.x ?? activeBlock.x, edit.top ?? activeBlock.top, width, height);
      const clone: AddedTextBox = {
        id: `added-${suffix}`,
        page: currentPage,
        ...position,
        width,
        height,
        text: edit.text,
        font: edit.font || editableBlockFont(activeBlock),
        size: edit.size || activeBlock.fontSize,
        color: edit.color || currentBlockVisual(activeBlock).color,
        bold: edit.bold ?? activeBlock.bold,
        italic: edit.italic ?? activeBlock.italic,
        underline: edit.underline || false,
        strike: edit.strike || false,
        alignment: edit.alignment || 'left',
        autoFit: false,
        reuseSourceFont: !edit.font,
        sourceFontName: activeBlock.sourceFont,
        sourceFontData: activeBlock.embeddedFontData,
        sourceCssFont: activeBlock.cssFont,
      };
      recordHistory();
      setAddedBoxes((boxes) => [...boxes, clone]);
      setSelectedElements([{ page: currentPage, kind: 'added-text', id: clone.id }]);
      setSelected(null);
      setSelectedAddedId(clone.id);
      setToast('Text cloned');
    } else if (activeAddedImage) {
      const position = shifted(
        activeAddedImage.x,
        activeAddedImage.top,
        activeAddedImage.width,
        activeAddedImage.height,
      );
      const clone = {
        ...activeAddedImage,
        ...position,
        id: `added-image-${suffix}`,
        name: `${activeAddedImage.name} copy`,
      };
      recordHistory();
      setAddedImages((images) => [...images, clone]);
      setSelectedElements([{ page: currentPage, kind: 'added-image', id: clone.id }]);
      setSelectedImage({ kind: 'added', id: clone.id });
      setToast('Image cloned');
    } else if (activeExistingImage && activeImageKey && imageCaptures[activeImageKey]) {
      const width = activeImageEdit?.width ?? activeExistingImage.width;
      const height = activeImageEdit?.height ?? activeExistingImage.height;
      const position = shifted(
        activeImageEdit?.x ?? activeExistingImage.x,
        activeImageEdit?.top ?? activeExistingImage.top,
        width,
        height,
      );
      const clone: AddedImage = {
        id: `added-image-${suffix}`,
        page: currentPage,
        ...position,
        width,
        height,
        dataUrl: imageCaptures[activeImageKey],
        name: 'Cloned PDF image',
      };
      recordHistory();
      setAddedImages((images) => [...images, clone]);
      setSelectedElements([{ page: currentPage, kind: 'added-image', id: clone.id }]);
      setSelectedImage({ kind: 'added', id: clone.id });
      setToast('Image cloned');
    } else if (activeXfaDraw) {
      let dataUrl = activeXfaDraw.dataUrl;
      if (activeXfaDraw.kind === 'image' && !dataUrl) {
        const image = xfaLayerRef.current
          ?.querySelector<HTMLElement>(`[data-paperly-xfa-draw-key="${CSS.escape(activeXfaDraw.key)}"]`)
          ?.querySelector<HTMLImageElement>('img');
        if (image?.naturalWidth) {
          const canvas = document.createElement('canvas');
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          canvas.getContext('2d')?.drawImage(image, 0, 0);
          try {
            dataUrl = canvas.toDataURL('image/png');
          } catch {
            /* cloning remains unavailable */
          }
        }
      }
      if (activeXfaDraw.kind === 'image' && !dataUrl) {
        setToast('This XFA image cannot be cloned');
        return;
      }
      const position = shifted(activeXfaDraw.x, activeXfaDraw.top, activeXfaDraw.width, activeXfaDraw.height);
      const key = `added:draw:${currentPage}:${suffix}`;
      const clone: XfaDrawEdit = {
        ...activeXfaDraw,
        ...position,
        key,
        sourceName: `Paperly_${activeXfaDraw.kind}_${suffix}`,
        occurrence: 0,
        originalX: position.x,
        originalTop: position.top,
        originalWidth: activeXfaDraw.width,
        originalHeight: activeXfaDraw.height,
        dataUrl,
        cloneSourcePath: activeXfaDraw.cloneSourcePath || activeXfaDraw.nativePath,
        cloneSourceX: activeXfaDraw.cloneSourceX ?? activeXfaDraw.originalX,
        cloneSourceTop: activeXfaDraw.cloneSourceTop ?? activeXfaDraw.originalTop,
        cloneSourceWidth: activeXfaDraw.cloneSourceWidth ?? activeXfaDraw.originalWidth,
        cloneSourceHeight: activeXfaDraw.cloneSourceHeight ?? activeXfaDraw.originalHeight,
        deleted: false,
        added: true,
      };
      recordHistory();
      setXfaDrawEdits((items) => ({ ...items, [key]: clone }));
      setSelectedXfaDrawKey(key);
      setXfaChanged(true);
      setToast(`XFA ${activeXfaDraw.kind} cloned`);
    }
    window.setTimeout(() => setToast(''), 2200);
  };

  const cloneSelectedElements = () => {
    if (selectedElements.length <= 1) {
      cloneSelectedElement();
      return;
    }
    const page = pages[currentPage];
    if (!page) return;
    const snapshot = createHistorySnapshot();
    const stamp = Date.now().toString(36);
    const shifted = (x: number, top: number, width: number, height: number) => ({
      x: Math.min(Math.max(0, x + 12), Math.max(0, page.width - width)),
      top: Math.min(Math.max(0, top + 12), Math.max(0, page.height - height)),
    });
    const textClones: AddedTextBox[] = [];
    const formClones: FormBlock[] = [];
    const imageClones: AddedImage[] = [];
    const vectorClones: VectorBlock[] = [];
    const cloneRefs: SelectedElementRef[] = [];
    const captureExistingImage = (image: ImageBlock) => {
      const key = `${currentPage}:${image.id}`;
      if (imageCaptures[key]) return imageCaptures[key];
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const pixelScale = canvas.width / (page.width * zoom);
      const sourceX = Math.max(0, image.x * zoom * pixelScale);
      const sourceY = Math.max(0, image.top * zoom * pixelScale);
      const sourceWidth = Math.max(1, Math.min(canvas.width - sourceX, image.width * zoom * pixelScale));
      const sourceHeight = Math.max(
        1,
        Math.min(canvas.height - sourceY, image.height * zoom * pixelScale) - 1,
      );
      const crop = document.createElement('canvas');
      crop.width = Math.max(1, Math.round(sourceWidth));
      crop.height = Math.max(1, Math.round(sourceHeight));
      crop
        .getContext('2d')
        ?.drawImage(canvas, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, crop.width, crop.height);
      try {
        return crop.toDataURL('image/png');
      } catch {
        return null;
      }
    };
    selectedElements
      .filter((item) => item.page === currentPage)
      .forEach((item, index) => {
        const suffix = `${stamp}-${index}-${Math.random().toString(36).slice(2, 5)}`;
        if (item.kind === 'text') {
          const block = page.blocks.find((entry) => String(entry.id) === item.id);
          if (!block) return;
          const key = blockKey(currentPage, block.id);
          const edit = edits[key] || { text: block.str };
          const width = edit.width ?? block.width;
          const height = edit.height ?? block.height;
          const position = shifted(edit.x ?? block.x, edit.top ?? block.top, width, height);
          const clone: AddedTextBox = {
            id: `added-${suffix}`,
            page: currentPage,
            ...position,
            width,
            height,
            text: edit.text ?? block.str,
            font: edit.font || editableBlockFont(block),
            size: edit.size || block.fontSize,
            color: edit.color || currentBlockVisual(block).color,
            bold: edit.bold ?? block.bold,
            italic: edit.italic ?? block.italic,
            underline: edit.underline || false,
            strike: edit.strike || false,
            alignment: edit.alignment || 'left',
            autoFit: false,
            reuseSourceFont: !edit.font,
            sourceFontName: block.sourceFont,
            sourceFontData: block.embeddedFontData,
            sourceCssFont: block.cssFont,
          };
          textClones.push(clone);
          cloneRefs.push({ page: currentPage, kind: 'added-text', id: clone.id });
        } else if (item.kind === 'added-text') {
          const source = addedBoxes.find((box) => box.id === item.id);
          if (!source) return;
          const clone = {
            ...source,
            ...shifted(source.x, source.top, source.width, source.height),
            id: `added-${suffix}`,
          };
          textClones.push(clone);
          cloneRefs.push({ page: currentPage, kind: 'added-text', id: clone.id });
        } else if (item.kind === 'form') {
          const source = page.forms.find((field) => field.id === item.id);
          if (!source) return;
          const edit = formEdits[`${currentPage}:${source.id}`] || {};
          const width = edit.width ?? source.width;
          const height = edit.height ?? source.height;
          const name =
            normalCloneMode === 'shared' ? source.name : `${source.name}_copy_${suffix.replaceAll('-', '_')}`;
          const clone: FormBlock = {
            ...source,
            ...edit,
            ...shifted(edit.x ?? source.x, edit.top ?? source.top, width, height),
            id: `added-form-${suffix}`,
            name,
            width,
            height,
            value: formChanges[source.name] ?? source.value,
            added: true,
            sharedField: normalCloneMode === 'shared',
            labelBlockId: undefined,
          };
          formClones.push(clone);
          cloneRefs.push({ page: currentPage, kind: 'form', id: clone.id });
        } else if (item.kind === 'added-image') {
          const source = addedImages.find((image) => image.id === item.id);
          if (!source) return;
          const clone = {
            ...source,
            ...shifted(source.x, source.top, source.width, source.height),
            id: `added-image-${suffix}`,
            name: `${source.name} copy`,
          };
          imageClones.push(clone);
          cloneRefs.push({ page: currentPage, kind: 'added-image', id: clone.id });
        } else if (item.kind === 'image') {
          const source = page.images.find((image) => image.id === item.id);
          if (!source) return;
          const dataUrl = captureExistingImage(source);
          if (!dataUrl) return;
          const edit = imageEdits[`${currentPage}:${source.id}`] || {};
          const width = edit.width ?? source.width;
          const height = edit.height ?? source.height;
          const clone: AddedImage = {
            id: `added-image-${suffix}`,
            page: currentPage,
            ...shifted(edit.x ?? source.x, edit.top ?? source.top, width, height),
            width,
            height,
            dataUrl,
            name: 'Cloned PDF image',
          };
          imageClones.push(clone);
          cloneRefs.push({ page: currentPage, kind: 'added-image', id: clone.id });
        } else if (item.kind === 'vector') {
          const source = page.vectors.find((vector) => vector.id === item.id);
          if (!source) return;
          const edit = vectorEdits[`${currentPage}:${source.id}`] || {};
          const width = edit.width ?? source.width;
          const height = edit.height ?? source.height;
          const clone = {
            ...source,
            ...edit,
            ...shifted(edit.x ?? source.x, edit.top ?? source.top, width, height),
            id: `drawing-${suffix}`,
            width,
            height,
            deleted: undefined,
            added: true,
          } as VectorBlock;
          vectorClones.push(clone);
          cloneRefs.push({ page: currentPage, kind: 'vector', id: clone.id });
        }
      });
    if (!cloneRefs.length) {
      setToast('The selected elements could not be cloned');
      window.setTimeout(() => setToast(''), 2200);
      return;
    }
    recordHistory(snapshot);
    if (textClones.length) setAddedBoxes((boxes) => [...boxes, ...textClones]);
    if (imageClones.length) setAddedImages((images) => [...images, ...imageClones]);
    if (formClones.length || vectorClones.length) {
      setPages((items) =>
        items.map((entry, index) =>
          index === currentPage
            ? {
                ...entry,
                forms: [...entry.forms, ...formClones],
                vectors: [...entry.vectors, ...vectorClones],
              }
            : entry,
        ),
      );
      setFormChanges((values) => ({
        ...values,
        ...Object.fromEntries(formClones.map((field) => [field.name, field.value])),
      }));
    }
    setSelectedElements(cloneRefs);
    const primary = cloneRefs[cloneRefs.length - 1];
    setSelected(null);
    setSelectedForm(
      primary.kind === 'form' ? formClones.find((field) => field.id === primary.id) || null : null,
    );
    setSelectedAddedId(primary.kind === 'added-text' ? primary.id : null);
    setSelectedImage(primary.kind === 'added-image' ? { kind: 'added', id: primary.id } : null);
    setSelectedVectorId(primary.kind === 'vector' ? primary.id : null);
    setToast(`${cloneRefs.length} elements cloned`);
    window.setTimeout(() => setToast(''), 2200);
  };

  const applyBatchStyle = (patch: {
    font?: string;
    size?: number;
    color?: string;
    bold?: boolean;
    italic?: boolean;
    alignment?: TextAlignment;
  }) => {
    const textItems = selectedElements.filter((item) => item.kind === 'text');
    const addedTextIds = new Set(
      selectedElements.filter((item) => item.kind === 'added-text').map((item) => item.id),
    );
    const formItems = selectedElements.filter((item) => item.kind === 'form');
    if (!textItems.length && !addedTextIds.size && !formItems.length) return;
    recordHistory();
    if (textItems.length)
      setEdits((changes) => {
        const next = { ...changes };
        textItems.forEach((item) => {
          const block = pages[item.page]?.blocks.find((entry) => String(entry.id) === item.id);
          if (!block) return;
          const key = blockKey(item.page, block.id);
          next[key] = { ...(next[key] || { text: block.str }), ...patch };
        });
        return next;
      });
    if (addedTextIds.size)
      setAddedBoxes((boxes) => boxes.map((box) => (addedTextIds.has(box.id) ? { ...box, ...patch } : box)));
    if (formItems.length)
      setFormEdits((changes) => {
        const next = { ...changes };
        const formPatch: Partial<FormEdit> = {
          ...(patch.font !== undefined ? { font: patch.font } : {}),
          ...(patch.size !== undefined ? { fontSize: patch.size } : {}),
          ...(patch.color !== undefined ? { color: patch.color } : {}),
          ...(patch.alignment !== undefined ? { alignment: patch.alignment } : {}),
        };
        formItems.forEach((item) => {
          const key = `${item.page}:${item.id}`;
          next[key] = { ...next[key], ...formPatch };
        });
        return next;
      });
  };

  const fitSelectedTextBoxes = () => {
    const ids = new Set(selectedElements.filter((item) => item.kind === 'added-text').map((item) => item.id));
    if (!ids.size) return;
    recordHistory();
    setAddedBoxes((boxes) =>
      boxes.map((box) => {
        if (!ids.has(box.id)) return box;
        const dimensions = measureAddedBox(box);
        const preserveAnchor = snapEnabled && snapAnchor !== 'start';
        const anchorDelta = (before: number, after: number) =>
          snapAnchor === 'center' ? (before - after) / 2 : before - after;
        return {
          ...box,
          ...dimensions,
          x: preserveAnchor ? box.x + anchorDelta(box.width, dimensions.width) : box.x,
          top:
            preserveAnchor && snapMode === 'box'
              ? box.top + anchorDelta(box.height, dimensions.height)
              : box.top,
        };
      }),
    );
  };

  const setSelectedTextBoxesAutoFit = (autoFit: boolean) => {
    const ids = new Set(selectedElements.filter((item) => item.kind === 'added-text').map((item) => item.id));
    if (!ids.size) return;
    recordHistory();
    setAddedBoxes((boxes) => boxes.map((box) => (ids.has(box.id) ? { ...box, autoFit } : box)));
  };

  const sizeRepeatedTextBox = (box: AddedTextBox, text: string) => {
    if (repeatTextSizing === 'fixed') return { ...box, text, autoFit: false };
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return { ...box, text, autoFit: false };
    context.font = `${box.italic ? 'italic ' : ''}${box.bold ? `${box.ocrFontWeight ?? 700} ` : '400 '}${box.size}px ${browserFontFamily(box.font)}`;
    const lineHeight = box.size * 1.2;
    if (repeatTextSizing === 'fit-width') {
      const lines = (text || ' ').split(/\r?\n/);
      const measuredWidth = Math.max(...lines.map((line) => context.measureText(line || ' ').width));
      const pageWidth = pages[box.page]?.width || box.x + box.width;
      return {
        ...box,
        text,
        width: Math.max(4, Math.min(Math.ceil(measuredWidth + 2), pageWidth - box.x)),
        height: Math.max(box.size, Math.ceil(lines.length * lineHeight)),
        autoFit: true,
      };
    }
    const wrapped = wrapTextForWidth(
      text || ' ',
      Math.max(4, box.width - 1),
      (value) => context.measureText(value).width,
    );
    return {
      ...box,
      text,
      height: Math.max(box.size, Math.ceil(Math.max(1, wrapped.length) * lineHeight)),
      autoFit: false,
    };
  };

  const generateRepeatedRows = () => {
    const page = pages[currentPage];
    if (!page || !repeatHeaders.length || !repeatRows.length || !repeatableElements.length) {
      setToast('Add CSV headers and at least one data row first');
      window.setTimeout(() => setToast(''), 2400);
      return;
    }
    const mapping = new Map(
      repeatableElements.map((entry, index) => [
        selectedElementKey(entry.item),
        repeatColumnMap[selectedElementKey(entry.item)] ?? index,
      ]),
    );
    const valueFor = (item: SelectedElementRef, row: string[]) =>
      row[mapping.get(selectedElementKey(item)) ?? -1] ?? '';
    const measuredTemplateTextWidth = (block: TextBlock, edit?: Edit, sampleText?: string) => {
      const context = document.createElement('canvas').getContext('2d');
      if (!context) return block.width;
      const size = edit?.size || block.fontSize;
      const font = edit?.font ? browserFontFamily(edit.font) : block.cssFont;
      const weight = edit?.fontWeight ?? ((edit?.bold ?? block.bold) ? 700 : 400);
      context.font = `${(edit?.italic ?? block.italic) ? 'italic ' : ''}${weight} ${size}px ${font}`;
      const measured = Math.max(
        context.measureText(edit?.text ?? block.str).width,
        context.measureText(sampleText || '').width,
      );
      return Math.max(block.width, Math.ceil(measured + 2));
    };
    const origins = selectedElements
      .filter((item) => item.page === currentPage)
      .flatMap((item) => {
        if (item.kind === 'text') {
          const block = page.blocks.find((entry) => String(entry.id) === item.id);
          if (!block) return [];
          const edit = edits[blockKey(currentPage, block.id)];
          const firstValue = valueFor(item, repeatRows[0] || []);
          return [
            {
              item,
              x: edit?.x ?? block.x,
              top: edit?.top ?? block.top,
              width: Math.min(
                page.width - (edit?.x ?? block.x),
                measuredTemplateTextWidth(block, edit, firstValue),
              ),
              height: block.height,
            },
          ];
        }
        if (item.kind === 'added-text') {
          const box = addedBoxes.find((entry) => entry.id === item.id);
          return box ? [{ item, x: box.x, top: box.top, width: box.width, height: box.height }] : [];
        }
        if (item.kind === 'form') {
          const field = page.forms.find((entry) => entry.id === item.id);
          if (!field) return [];
          const edit = formEdits[`${currentPage}:${field.id}`];
          return [
            {
              item,
              x: edit?.x ?? field.x,
              top: edit?.top ?? field.top,
              width: edit?.width ?? field.width,
              height: edit?.height ?? field.height,
            },
          ];
        }
        if (item.kind === 'image') {
          const image = page.images.find((entry) => entry.id === item.id);
          if (!image) return [];
          const edit = imageEdits[`${currentPage}:${image.id}`];
          return [
            {
              item,
              x: edit?.x ?? image.x,
              top: edit?.top ?? image.top,
              width: edit?.width ?? image.width,
              height: edit?.height ?? image.height,
            },
          ];
        }
        const image = addedImages.find((entry) => entry.id === item.id);
        return image ? [{ item, x: image.x, top: image.top, width: image.width, height: image.height }] : [];
      });
    if (!origins.length) return;
    const templateTop = Math.min(...origins.map((origin) => origin.top));
    const templateBottom = Math.max(...origins.map((origin) => origin.top + origin.height));
    const textBoxForOrigin = (origin: (typeof origins)[number], text: string) => {
      if (origin.item.kind === 'text') {
        const block = page.blocks.find((entry) => String(entry.id) === origin.item.id);
        if (!block) return null;
        const edit = edits[blockKey(currentPage, block.id)] || { text: block.str };
        return {
          id: 'repeat-measure',
          page: currentPage,
          x: origin.x,
          top: origin.top,
          width: origin.width,
          height: origin.height,
          text,
          font: edit.font || editableBlockFont(block),
          size: edit.size || block.fontSize,
          color: edit.color || '#111111',
          bold: edit.bold ?? block.bold,
          italic: edit.italic ?? block.italic,
          underline: edit.underline || false,
          strike: edit.strike || false,
          alignment: edit.alignment || 'left',
          autoFit: false,
        } as AddedTextBox;
      }
      if (origin.item.kind === 'added-text') {
        const source = addedBoxes.find((entry) => entry.id === origin.item.id);
        return source
          ? { ...source, x: origin.x, top: origin.top, width: origin.width, height: origin.height, text }
          : null;
      }
      return null;
    };
    const rowContentHeight = (row: string[]) =>
      Math.max(
        templateBottom - templateTop,
        ...origins.map((origin) => {
          const box = textBoxForOrigin(origin, valueFor(origin.item, row));
          const height = box ? sizeRepeatedTextBox(box, box.text).height : origin.height;
          return origin.top - templateTop + height;
        }),
      );
    const maximumRowHeight = Math.max(1, ...repeatRows.map(rowContentHeight));
    const rowStep = maximumRowHeight + repeatRowGap;
    const finalOffset = (repeatUseTemplateFirst ? repeatRows.length - 1 : repeatRows.length) * rowStep;
    if (templateTop + finalOffset + maximumRowHeight > page.height) {
      setToast(
        'These resized rows do not fit on this page. Reduce the row gap, use fewer records, or choose a smaller text size.',
      );
      window.setTimeout(() => setToast(''), 3600);
      return;
    }
    const snapshot = createHistorySnapshot();
    const stamp = Date.now().toString(36);
    const textClones: AddedTextBox[] = [];
    const formClones: FormBlock[] = [];
    const imageClones: AddedImage[] = [];
    const generatedRefs: SelectedElementRef[] = repeatUseTemplateFirst ? [...selectedElements] : [];
    const captureImage = (image: ImageBlock) => {
      const key = `${currentPage}:${image.id}`;
      if (imageCaptures[key]) return imageCaptures[key];
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const scale = canvas.width / (page.width * zoom);
      const sourceX = image.x * zoom * scale;
      const sourceY = image.top * zoom * scale;
      const sourceWidth = Math.max(1, image.width * zoom * scale);
      const sourceHeight = Math.max(1, image.height * zoom * scale - 1);
      const crop = document.createElement('canvas');
      crop.width = Math.round(sourceWidth);
      crop.height = Math.round(sourceHeight);
      crop
        .getContext('2d')
        ?.drawImage(canvas, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, crop.width, crop.height);
      try {
        return crop.toDataURL('image/png');
      } catch {
        return null;
      }
    };
    if (repeatUseTemplateFirst) {
      const firstRow = repeatRows[0];
      setEdits((changes) => {
        const next = { ...changes };
        repeatableElements
          .filter((entry) => entry.item.kind === 'text')
          .forEach((entry) => {
            const block = page.blocks.find((item) => String(item.id) === entry.item.id);
            if (block) {
              const key = blockKey(currentPage, block.id);
              next[key] = { ...next[key], text: valueFor(entry.item, firstRow) };
            }
          });
        return next;
      });
      const addedIds = new Set(
        repeatableElements.filter((entry) => entry.item.kind === 'added-text').map((entry) => entry.item.id),
      );
      if (addedIds.size)
        setAddedBoxes((boxes) =>
          boxes.map((box) =>
            addedIds.has(box.id)
              ? sizeRepeatedTextBox(
                  box,
                  valueFor({ page: currentPage, kind: 'added-text', id: box.id }, firstRow),
                )
              : box,
          ),
        );
      setFormChanges((values) => {
        const next = { ...values };
        repeatableElements
          .filter((entry) => entry.item.kind === 'form')
          .forEach((entry) => {
            const field = page.forms.find((item) => item.id === entry.item.id);
            if (field) next[field.name] = valueFor(entry.item, firstRow);
          });
        return next;
      });
    }
    const rowsToClone = repeatUseTemplateFirst ? repeatRows.slice(1) : repeatRows;
    rowsToClone.forEach((row, rowIndex) => {
      const offset = (rowIndex + 1) * rowStep;
      origins.forEach((origin, elementIndex) => {
        const suffix = `${stamp}-${rowIndex}-${elementIndex}`;
        const top = origin.top + offset;
        const item = origin.item;
        if (item.kind === 'text') {
          const block = page.blocks.find((entry) => String(entry.id) === item.id);
          if (!block) return;
          const key = blockKey(currentPage, block.id);
          const edit = edits[key] || { text: block.str };
          const clone = sizeRepeatedTextBox(
            {
              id: `repeat-text-${suffix}`,
              page: currentPage,
              x: origin.x,
              top,
              width: origin.width,
              height: origin.height,
              text: valueFor(item, row),
              font: edit.font || editableBlockFont(block),
              size: edit.size || block.fontSize,
              color: edit.color || currentBlockVisual(block).color,
              bold: edit.bold ?? block.bold,
              italic: edit.italic ?? block.italic,
              underline: edit.underline || false,
              strike: edit.strike || false,
              alignment: edit.alignment || 'left',
              autoFit: false,
            },
            valueFor(item, row),
          );
          textClones.push(clone);
          generatedRefs.push({ page: currentPage, kind: 'added-text', id: clone.id });
        } else if (item.kind === 'added-text') {
          const source = addedBoxes.find((entry) => entry.id === item.id);
          if (!source) return;
          const clone = sizeRepeatedTextBox(
            { ...source, id: `repeat-text-${suffix}`, top },
            valueFor(item, row),
          );
          textClones.push(clone);
          generatedRefs.push({ page: currentPage, kind: 'added-text', id: clone.id });
        } else if (item.kind === 'form') {
          const source = page.forms.find((entry) => entry.id === item.id);
          if (!source) return;
          const edit = formEdits[`${currentPage}:${source.id}`] || {};
          const name = `${source.name}_row_${stamp}_${rowIndex + 1}_${elementIndex}`;
          const clone: FormBlock = {
            ...source,
            ...edit,
            id: `repeat-form-${suffix}`,
            name,
            x: origin.x,
            top,
            width: origin.width,
            height: origin.height,
            value: valueFor(item, row),
            added: true,
            sharedField: false,
            labelBlockId: undefined,
          };
          formClones.push(clone);
          generatedRefs.push({ page: currentPage, kind: 'form', id: clone.id });
        } else if (item.kind === 'added-image') {
          const source = addedImages.find((entry) => entry.id === item.id);
          if (!source) return;
          const clone = {
            ...source,
            id: `repeat-image-${suffix}`,
            top,
            name: `${source.name} row ${rowIndex + 1}`,
          };
          imageClones.push(clone);
          generatedRefs.push({ page: currentPage, kind: 'added-image', id: clone.id });
        } else {
          const source = page.images.find((entry) => entry.id === item.id);
          if (!source) return;
          const dataUrl = captureImage(source);
          if (!dataUrl) return;
          const clone: AddedImage = {
            id: `repeat-image-${suffix}`,
            page: currentPage,
            x: origin.x,
            top,
            width: origin.width,
            height: origin.height,
            dataUrl,
            name: `Repeated PDF image ${rowIndex + 1}`,
          };
          imageClones.push(clone);
          generatedRefs.push({ page: currentPage, kind: 'added-image', id: clone.id });
        }
      });
    });
    recordHistory(snapshot);
    if (textClones.length) setAddedBoxes((boxes) => [...boxes, ...textClones]);
    if (imageClones.length) setAddedImages((images) => [...images, ...imageClones]);
    if (formClones.length) {
      setPages((items) =>
        items.map((entry, index) =>
          index === currentPage ? { ...entry, forms: [...entry.forms, ...formClones] } : entry,
        ),
      );
      setFormChanges((values) => ({
        ...values,
        ...Object.fromEntries(formClones.map((field) => [field.name, field.value])),
      }));
    }
    setSelectedElements(generatedRefs);
    const primary = generatedRefs[generatedRefs.length - 1];
    setSelected(primary?.kind === 'text' ? Number(primary.id) : null);
    setSelectedAddedId(primary?.kind === 'added-text' ? primary.id : null);
    setSelectedForm(
      primary?.kind === 'form'
        ? formClones.find((field) => field.id === primary.id) ||
            page.forms.find((field) => field.id === primary.id) ||
            null
        : null,
    );
    setSelectedImage(
      primary?.kind === 'added-image'
        ? { kind: 'added', id: primary.id }
        : primary?.kind === 'image'
          ? { kind: 'existing', id: primary.id }
          : null,
    );
    setRepeatDataOpen(false);
    setToast(`${repeatRows.length} data rows generated`);
    window.setTimeout(() => setToast(''), 2600);
  };

  return {
    cloneSelectedElement,
    cloneSelectedElements,
    applyBatchStyle,
    fitSelectedTextBoxes,
    setSelectedTextBoxesAutoFit,
    generateRepeatedRows,
  };
}
