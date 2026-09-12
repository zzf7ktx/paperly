'use client';
import type { EditorHistorySnapshot } from '../types';

import { type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { type XfaDrawEdit, type XfaScriptLanguage, type XfaTemplateEdit } from '../../../lib/xfa-template';
import { sampleFieldBackground, sampleTextBlockVisual } from '../lib/appearance';
import { blockKey } from '../lib/text';
import type { AddedTextBox, FormBlock, FormEdit, SelectedElementRef, SnapGuides, TextBlock } from '../types';
import type { EditorState } from './use-editor-state';

type Context = Pick<
  EditorState,
  | 'tool'
  | 'pages'
  | 'currentPage'
  | 'zoom'
  | 'setAddedBoxes'
  | 'setSelectedElements'
  | 'setSelected'
  | 'setSelectedForm'
  | 'setSelectedAddedId'
  | 'setSelectedImage'
  | 'setSnapGuides'
  | 'setTool'
  | 'isXfaDocument'
  | 'xfaAddKind'
  | 'setXfaStructureEdits'
  | 'setSelectedXfaKey'
  | 'setXfaChanged'
  | 'normalAddKind'
  | 'setPages'
  | 'setFormChanges'
  | 'setToast'
  | 'selectedXfaKey'
  | 'xfaStructureEdits'
  | 'scheduleXfaRuntimeRef'
  | 'xfaEventActivity'
  | 'selectedForm'
  | 'canvasRef'
  | 'setFormBackgrounds'
  | 'formEdits'
  | 'setFormEdits'
  | 'edits'
  | 'setEdits'
  | 'formChanges'
  | 'setSelectedXfaDrawKey'
  | 'formBackgrounds'
  | 'selectedElements'
  | 'imageEdits'
  | 'addedBoxes'
  | 'vectorEdits'
  | 'addedImages'
  | 'blockVisuals'
  | 'setBlockVisuals'
  | 'setImageEdits'
  | 'setAddedImages'
  | 'setVectorEdits'
  | 'selectedXfaDrawKey'
  | 'xfaDrawEdits'
  | 'setXfaDrawEdits'
> & {
  measureAddedBox: (box: AddedTextBox) => { width: number; height: number };
  snapPosition: (
    x: number,
    top: number,
    box: Pick<AddedTextBox, 'id' | 'page' | 'width' | 'height'> & {
      size?: number;
      sourceBlockId?: number;
      snapId?: string;
      snapAs?: 'text' | 'box';
    },
  ) => { x: number; top: number; guides: SnapGuides };
  recordHistory: (snapshot?: EditorHistorySnapshot) => void;
  activeXfaField: XfaTemplateEdit | null;
  activeFormKey: string | null;
  activeFormLabel: TextBlock | null;
  updateElementSelection: (item: SelectedElementRef, additive?: boolean) => void;
  createHistorySnapshot: () => EditorHistorySnapshot;
  isElementSelected: (kind: SelectedElementRef['kind'], id: string, page?: number) => boolean;
  activeXfaDraw: XfaDrawEdit | null;
};

export function useFormEditing({
  tool,
  pages,
  currentPage,
  zoom,
  measureAddedBox,
  snapPosition,
  setAddedBoxes,
  setSelectedElements,
  setSelected,
  setSelectedForm,
  setSelectedAddedId,
  setSelectedImage,
  setSnapGuides,
  setTool,
  isXfaDocument,
  xfaAddKind,
  recordHistory,
  setXfaStructureEdits,
  setSelectedXfaKey,
  setXfaChanged,
  normalAddKind,
  setPages,
  setFormChanges,
  setToast,
  selectedXfaKey,
  activeXfaField,
  xfaStructureEdits,
  scheduleXfaRuntimeRef,
  xfaEventActivity,
  activeFormKey,
  selectedForm,
  canvasRef,
  setFormBackgrounds,
  formEdits,
  setFormEdits,
  activeFormLabel,
  edits,
  setEdits,
  formChanges,
  updateElementSelection,
  setSelectedXfaDrawKey,
  formBackgrounds,
  selectedElements,
  createHistorySnapshot,
  imageEdits,
  addedBoxes,
  vectorEdits,
  addedImages,
  blockVisuals,
  setBlockVisuals,
  setImageEdits,
  setAddedImages,
  setVectorEdits,
  isElementSelected,
  selectedXfaDrawKey,
  activeXfaDraw,
  xfaDrawEdits,
  setXfaDrawEdits,
}: Context) {
  const addTextBox = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (tool !== 'add-text' || !pages[currentPage]) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const id = `text-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const clickX = (event.clientX - bounds.left) / zoom;
    const clickTop = (event.clientY - bounds.top) / zoom;
    const nearest = pages[currentPage].blocks.reduce<TextBlock | null>((best, block) => {
      if (!best) return block;
      const blockDistance = Math.hypot(
        block.x + block.width / 2 - clickX,
        block.top + block.height / 2 - clickTop,
      );
      const bestDistance = Math.hypot(
        best.x + best.width / 2 - clickX,
        best.top + best.height / 2 - clickTop,
      );
      return blockDistance < bestDistance ? block : best;
    }, null);
    const width = Math.min(180, pages[currentPage].width - 24);
    const size = nearest ? Math.max(6, nearest.fontSize) : 16;
    const height = Math.max(28, size * 1.45);
    const draft: AddedTextBox = {
      id,
      page: currentPage,
      x: clickX,
      top: clickTop,
      width,
      height,
      size,
      text: 'Type something',
      font: nearest?.font || 'Helvetica',
      color: '#111111',
      bold: nearest?.bold || false,
      italic: nearest?.italic || false,
      underline: false,
      strike: false,
      alignment: 'left',
      autoFit: true,
    };
    const fitted = { ...draft, ...measureAddedBox(draft) };
    const rawX = Math.max(0, Math.min(clickX, pages[currentPage].width - fitted.width));
    const rawTop = Math.max(0, Math.min(clickTop, pages[currentPage].height - fitted.height));
    const snapped = snapPosition(rawX, rawTop, fitted);
    setAddedBoxes((boxes) => [...boxes, { ...fitted, x: snapped.x, top: snapped.top }]);
    setSelectedElements([{ page: currentPage, kind: 'added-text', id }]);
    setSelected(null);
    setSelectedForm(null);
    setSelectedAddedId(id);
    setSelectedImage(null);
    setSnapGuides({});
    setTool('select');
  };

  const addXfaField = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (tool !== 'add-xfa' || !isXfaDocument || !pages[currentPage]) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const rawX = (event.clientX - bounds.left) / zoom;
    const rawTop = (event.clientY - bounds.top) / zoom;
    const compact = xfaAddKind === 'checkbox';
    const width = compact ? 100 : xfaAddKind === 'radio' ? 120 : 160;
    const height = compact ? 20 : xfaAddKind === 'multiline' ? 76 : xfaAddKind === 'radio' ? 38 : 38;
    const boundedX = Math.max(0, Math.min(rawX, pages[currentPage].width - width));
    const boundedTop = Math.max(0, Math.min(rawTop, pages[currentPage].height - height));
    const suffix = Date.now().toString(36);
    const name = `Paperly_${xfaAddKind}_${suffix}`;
    const key = `added:${currentPage}:${suffix}`;
    const snapped = snapPosition(boundedX, boundedTop, {
      id: key,
      snapId: `xfa-field:${key}`,
      snapAs: 'box',
      page: currentPage,
      width,
      height,
    });
    const x = snapped.x;
    const top = snapped.top;
    const label =
      xfaAddKind === 'multiline'
        ? 'Details'
        : xfaAddKind === 'checkbox'
          ? 'Checkbox'
          : xfaAddKind === 'radio'
            ? 'Choose'
            : 'Text';
    const field: XfaTemplateEdit = {
      key,
      sourceName: name,
      occurrence: 0,
      name,
      kind: xfaAddKind,
      page: currentPage,
      x,
      top,
      width,
      height,
      originalX: x,
      originalTop: top,
      originalWidth: width,
      originalHeight: height,
      label,
      originalLabel: label,
      events: {},
      originalEvents: {},
      added: true,
      value: xfaAddKind === 'checkbox' ? false : '',
      font: 'Helvetica',
      originalFont: 'Helvetica',
      size: 11,
      originalSize: 11,
      color: '#111111',
      originalColor: '#111111',
      backgroundColor: '#ffffff',
      originalBackgroundColor: '#ffffff',
      borderColor: '#666666',
      originalBorderColor: '#666666',
      borderWidth: 1,
      originalBorderWidth: 1,
      alignment: 'left',
      originalAlignment: 'left',
      labelPlacement: xfaAddKind === 'checkbox' || xfaAddKind === 'radio' ? 'right' : 'top',
      originalLabelPlacement: xfaAddKind === 'checkbox' || xfaAddKind === 'radio' ? 'right' : 'top',
      labelReserve: xfaAddKind === 'checkbox' || xfaAddKind === 'radio' ? 64 : 12,
      originalLabelReserve: xfaAddKind === 'checkbox' || xfaAddKind === 'radio' ? 64 : 12,
      captionFont: 'Helvetica',
      originalCaptionFont: 'Helvetica',
      captionSize: 9,
      originalCaptionSize: 9,
      captionColor: '#111111',
      originalCaptionColor: '#111111',
      captionBold: false,
      originalCaptionBold: false,
      captionItalic: false,
      originalCaptionItalic: false,
      captionAlignment: 'left',
      originalCaptionAlignment: 'left',
      paddingTop: 1,
      originalPaddingTop: 1,
      paddingRight: 3,
      originalPaddingRight: 3,
      paddingBottom: 1,
      originalPaddingBottom: 1,
      paddingLeft: 3,
      originalPaddingLeft: 3,
    };
    recordHistory();
    setXfaStructureEdits((edits) => ({ ...edits, [key]: field }));
    setSelectedXfaKey(key);
    setSelected(null);
    setSelectedForm(null);
    setSelectedAddedId(null);
    setSelectedImage(null);
    setXfaChanged(true);
    setTool('select');
  };

  const addNormalFormField = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (tool !== 'add-form' || isXfaDocument || !pages[currentPage]) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const width = normalAddKind === 'checkbox' ? 18 : normalAddKind === 'radio' ? 20 : 160;
    const height =
      normalAddKind === 'choice' ? 28 : normalAddKind === 'checkbox' || normalAddKind === 'radio' ? 18 : 30;
    const x = Math.max(0, Math.min((event.clientX - bounds.left) / zoom, pages[currentPage].width - width));
    const top = Math.max(
      0,
      Math.min((event.clientY - bounds.top) / zoom, pages[currentPage].height - height),
    );
    const suffix = Date.now().toString(36);
    const name = `Paperly_${normalAddKind}_${suffix}`;
    const field: FormBlock = {
      id: `added-form-${suffix}`,
      name,
      kind: normalAddKind,
      x,
      top,
      width,
      height,
      value: normalAddKind === 'checkbox' ? false : '',
      option: normalAddKind === 'radio' ? 'Yes' : undefined,
      options:
        normalAddKind === 'choice'
          ? [
              { label: 'Option 1', value: 'Option 1' },
              { label: 'Option 2', value: 'Option 2' },
            ]
          : undefined,
      font: 'Helvetica',
      fontSize: 11,
      color: '#111111',
      backgroundColor: '#ffffff',
      borderColor: '#949b98',
      borderWidth: 1,
      alignment: 'left',
      added: true,
    };
    recordHistory();
    setPages((items) =>
      items.map((page, pageIndex) =>
        pageIndex === currentPage ? { ...page, forms: [...page.forms, field] } : page,
      ),
    );
    setFormChanges((values) => ({ ...values, [name]: field.value }));
    setSelectedElements([{ page: currentPage, kind: 'form', id: field.id }]);
    setSelectedForm(field);
    setSelected(null);
    setSelectedAddedId(null);
    setSelectedImage(null);
    setTool('select');
    setToast('New interactive form field added');
    window.setTimeout(() => setToast(''), 2200);
  };

  const updateXfaField = (patch: Partial<XfaTemplateEdit>) => {
    if (!selectedXfaKey || !activeXfaField) return;
    const prior = xfaStructureEdits[selectedXfaKey] || activeXfaField;
    if (JSON.stringify(prior) === JSON.stringify({ ...prior, ...patch })) return;
    recordHistory();
    setXfaStructureEdits((edits) => ({ ...edits, [selectedXfaKey]: { ...activeXfaField, ...patch } }));
    setXfaChanged(true);
  };

  const updateAddedXfaValue = (field: XfaTemplateEdit, value: string | boolean) => {
    if (field.value === value) return;
    recordHistory();
    setXfaStructureEdits((edits) => ({ ...edits, [field.key]: { ...field, ...edits[field.key], value } }));
    setXfaChanged(true);
    scheduleXfaRuntimeRef.current(field.key, 'change');
  };

  const removeSelectedAddedXfaField = () => {
    if (!selectedXfaKey) return;
    recordHistory();
    setXfaStructureEdits((edits) => {
      const next = { ...edits };
      delete next[selectedXfaKey];
      return next;
    });
    setSelectedXfaKey(null);
    setXfaChanged(true);
  };

  const updateXfaCalculation = (patch: { code?: string; language?: XfaScriptLanguage }) => {
    updateXfaField({
      calculation: {
        code: activeXfaField?.calculation?.code || '',
        language: activeXfaField?.calculation?.language || 'javascript',
        ...patch,
      },
    });
  };

  const updateXfaValidation = (patch: { code?: string; language?: XfaScriptLanguage }) => {
    updateXfaField({
      validation: {
        code: activeXfaField?.validation?.code || '',
        language: activeXfaField?.validation?.language || 'javascript',
        ...patch,
      },
    });
  };

  const updateXfaEventScript = (patch: { code?: string; language?: XfaScriptLanguage }) => {
    if (!activeXfaField) return;
    const prior = activeXfaField.events?.[xfaEventActivity] || {
      code: '',
      language: 'javascript' as XfaScriptLanguage,
    };
    updateXfaField({
      events: { ...(activeXfaField.events || {}), [xfaEventActivity]: { ...prior, ...patch } },
    });
  };

  const updateFormEdit = (patch: FormEdit) => {
    if (!activeFormKey) return;
    if (
      patch.deleted === true &&
      selectedForm &&
      !selectedForm.added &&
      canvasRef.current &&
      pages[currentPage]
    ) {
      const eraseColor = sampleFieldBackground(
        canvasRef.current,
        pages[currentPage].width,
        zoom,
        selectedForm,
      );
      patch = { ...patch, eraseOriginal: true, eraseColor };
      setFormBackgrounds((backgrounds) => ({ ...backgrounds, [activeFormKey]: eraseColor }));
    }
    const prior = formEdits[activeFormKey] || {};
    if (JSON.stringify(prior) === JSON.stringify({ ...prior, ...patch })) return;
    recordHistory();
    setFormEdits((edits) => ({ ...edits, [activeFormKey]: { ...edits[activeFormKey], ...patch } }));
    if (
      selectedForm &&
      activeFormLabel &&
      (patch.moveLabel ?? prior.moveLabel) !== false &&
      (patch.x !== undefined || patch.top !== undefined)
    ) {
      const labelKey = blockKey(currentPage, activeFormLabel.id);
      const labelEdit = edits[labelKey];
      const deltaX = (patch.x ?? prior.x ?? selectedForm.x) - (prior.x ?? selectedForm.x);
      const deltaY = (patch.top ?? prior.top ?? selectedForm.top) - (prior.top ?? selectedForm.top);
      setEdits((items) => ({
        ...items,
        [labelKey]: {
          ...(items[labelKey] || { text: activeFormLabel.str }),
          x: (labelEdit?.x ?? activeFormLabel.x) + deltaX,
          top: (labelEdit?.top ?? activeFormLabel.top) + deltaY,
        },
      }));
    }
    if (
      selectedForm &&
      ['readOnly', 'required', 'noExport', 'maxLength', 'multiline', 'tooltip', 'options'].some(
        (property) => property in patch,
      )
    ) {
      const metadata = (field: FormBlock): FormBlock => ({
        ...field,
        readOnly: patch.readOnly ?? field.readOnly,
        required: patch.required ?? field.required,
        noExport: patch.noExport ?? field.noExport,
        maxLength: patch.maxLength ?? field.maxLength,
        multiline: patch.multiline ?? field.multiline,
        tooltip: patch.tooltip ?? field.tooltip,
        options: patch.options ?? field.options,
      });
      setPages((items) =>
        items.map((page, pageIndex) =>
          pageIndex !== currentPage
            ? page
            : {
                ...page,
                forms: page.forms.map((field) => (field.id !== selectedForm.id ? field : metadata(field))),
              },
        ),
      );
      setSelectedForm((field) => (field ? metadata(field) : field));
    }
  };

  const updateFormValue = (name: string, value: string | boolean) => {
    if (formChanges[name] === value) return;
    recordHistory();
    setFormChanges((values) => ({ ...values, [name]: value }));
  };

  const selectNormalForm = (field: FormBlock, additive = false) => {
    updateElementSelection({ page: currentPage, kind: 'form', id: field.id }, additive);
    setSelectedForm(field);
    setSelected(null);
    setSelectedAddedId(null);
    setSelectedImage(null);
    setSelectedXfaKey(null);
    setSelectedXfaDrawKey(null);
    const key = `${currentPage}:${field.id}`;
    if (!field.added && !formBackgrounds[key] && canvasRef.current && pages[currentPage]) {
      const color = sampleFieldBackground(canvasRef.current, pages[currentPage].width, zoom, field);
      setFormBackgrounds((backgrounds) => ({ ...backgrounds, [key]: color }));
      setFormEdits((items) => ({
        ...items,
        [key]: { eraseOriginal: true, eraseColor: color, ...items[key] },
      }));
    }
  };

  const startGroupDrag = (event: ReactPointerEvent) => {
    const page = pages[currentPage];
    const items = selectedElements.filter((item) => item.page === currentPage);
    if (!page || items.length < 2) return;
    event.preventDefault();
    event.stopPropagation();
    const historyBeforeDrag = createHistorySnapshot();
    const origins = items.flatMap((item) => {
      if (item.kind === 'text') {
        const block = page.blocks.find((entry) => String(entry.id) === item.id);
        if (!block) return [];
        const edit = edits[blockKey(currentPage, block.id)];
        return [
          {
            item,
            x: edit?.x ?? block.x,
            top: edit?.top ?? block.top,
            width: edit?.width ?? block.width,
            height: edit?.height ?? block.height,
          },
        ];
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
      if (item.kind === 'added-text') {
        const box = addedBoxes.find((entry) => entry.id === item.id);
        return box ? [{ item, x: box.x, top: box.top, width: box.width, height: box.height }] : [];
      }
      if (item.kind === 'vector') {
        const vector = page.vectors.find((entry) => entry.id === item.id);
        if (!vector) return [];
        const edit = vectorEdits[`${currentPage}:${vector.id}`];
        return [
          {
            item,
            x: edit?.x ?? vector.x,
            top: edit?.top ?? vector.top,
            width: edit?.width ?? vector.width,
            height: edit?.height ?? vector.height,
          },
        ];
      }
      const image = addedImages.find((entry) => entry.id === item.id);
      return image ? [{ item, x: image.x, top: image.top, width: image.width, height: image.height }] : [];
    });
    if (origins.length < 2) return;
    const sampledGroupVisuals = new Map<string, { background: string; color: string }>();
    if (canvasRef.current) {
      origins
        .filter((origin) => origin.item.kind === 'text')
        .forEach((origin) => {
          const block = page.blocks.find((entry) => String(entry.id) === origin.item.id);
          if (!block) return;
          const key = blockKey(currentPage, block.id);
          sampledGroupVisuals.set(
            key,
            blockVisuals[key] || sampleTextBlockVisual(canvasRef.current!, page.width, zoom, block),
          );
        });
      if (sampledGroupVisuals.size)
        setBlockVisuals((visuals) => ({ ...visuals, ...Object.fromEntries(sampledGroupVisuals) }));
    }
    const linkedLabels = new Map<string, { x: number; top: number; text: string }>();
    origins
      .filter((origin) => origin.item.kind === 'form')
      .forEach((origin) => {
        const field = page.forms.find((entry) => entry.id === origin.item.id);
        const formEdit = field ? formEdits[`${currentPage}:${field.id}`] : undefined;
        const label =
          field?.labelBlockId === undefined || formEdit?.moveLabel === false
            ? null
            : page.blocks.find((block) => block.id === field.labelBlockId);
        if (!label) return;
        const key = blockKey(currentPage, label.id);
        const labelEdit = edits[key];
        linkedLabels.set(key, {
          x: labelEdit?.x ?? label.x,
          top: labelEdit?.top ?? label.top,
          text: labelEdit?.text ?? label.str,
        });
      });
    const minDx = Math.max(...origins.map((origin) => -origin.x));
    const maxDx = Math.min(...origins.map((origin) => page.width - origin.x - origin.width));
    const minDy = Math.max(...origins.map((origin) => -origin.top));
    const maxDy = Math.min(...origins.map((origin) => page.height - origin.top - origin.height));
    const startX = event.clientX;
    const startY = event.clientY;
    let moved = false;
    let dx = 0;
    let dy = 0;
    const movesVectors = origins.some((origin) => origin.item.kind === 'vector');
    const move = (pointerEvent: PointerEvent) => {
      dx = Math.max(minDx, Math.min(maxDx, (pointerEvent.clientX - startX) / zoom));
      dy = Math.max(minDy, Math.min(maxDy, (pointerEvent.clientY - startY) / zoom));
      moved ||= Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01;
      const textOrigins = origins.filter((origin) => origin.item.kind === 'text');
      if (textOrigins.length || linkedLabels.size)
        setEdits((changes) => {
          const next = { ...changes };
          textOrigins.forEach((origin) => {
            const key = blockKey(currentPage, Number(origin.item.id));
            const block = page.blocks.find((entry) => String(entry.id) === origin.item.id);
            const visual = sampledGroupVisuals.get(key);
            next[key] = {
              ...(next[key] || { text: block?.str || '' }),
              ...(next[key]?.color === undefined && visual ? { color: visual.color } : {}),
              x: origin.x + dx,
              top: origin.top + dy,
              vectorGroupMove: movesVectors || next[key]?.vectorGroupMove,
            };
          });
          linkedLabels.forEach((label, key) => {
            next[key] = { ...next[key], text: label.text, x: label.x + dx, top: label.top + dy };
          });
          return next;
        });
      const formOrigins = origins.filter((origin) => origin.item.kind === 'form');
      if (formOrigins.length)
        setFormEdits((changes) => {
          const next = { ...changes };
          formOrigins.forEach((origin) => {
            const key = `${currentPage}:${origin.item.id}`;
            next[key] = { ...next[key], x: origin.x + dx, top: origin.top + dy };
          });
          return next;
        });
      const imageOrigins = origins.filter((origin) => origin.item.kind === 'image');
      if (imageOrigins.length)
        setImageEdits((changes) => {
          const next = { ...changes };
          imageOrigins.forEach((origin) => {
            const key = `${currentPage}:${origin.item.id}`;
            next[key] = { ...next[key], x: origin.x + dx, top: origin.top + dy };
          });
          return next;
        });
      const addedTextOrigins = new Map(
        origins
          .filter((origin) => origin.item.kind === 'added-text')
          .map((origin) => [origin.item.id, origin]),
      );
      if (addedTextOrigins.size)
        setAddedBoxes((boxes) =>
          boxes.map((box) => {
            const origin = addedTextOrigins.get(box.id);
            return origin ? { ...box, x: origin.x + dx, top: origin.top + dy } : box;
          }),
        );
      const addedImageOrigins = new Map(
        origins
          .filter((origin) => origin.item.kind === 'added-image')
          .map((origin) => [origin.item.id, origin]),
      );
      if (addedImageOrigins.size)
        setAddedImages((images) =>
          images.map((image) => {
            const origin = addedImageOrigins.get(image.id);
            return origin ? { ...image, x: origin.x + dx, top: origin.top + dy } : image;
          }),
        );
      const vectorOrigins = origins.filter((origin) => origin.item.kind === 'vector');
      if (vectorOrigins.length)
        setVectorEdits((changes) => {
          const next = { ...changes };
          vectorOrigins.forEach((origin) => {
            const key = `${currentPage}:${origin.item.id}`;
            next[key] = { ...next[key], x: origin.x + dx, top: origin.top + dy };
          });
          return next;
        });
    };
    const stop = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stop);
      document.removeEventListener('pointercancel', cancel);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (moved) recordHistory(historyBeforeDrag);
    };
    const cancel = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stop);
      document.removeEventListener('pointercancel', cancel);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'move';
    document.body.style.userSelect = 'none';
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', stop, { once: true });
    document.addEventListener('pointercancel', cancel, { once: true });
  };

  const startFormDrag = (event: ReactPointerEvent, field: FormBlock) => {
    if (selectedElements.length > 1 && isElementSelected('form', field.id)) {
      startGroupDrag(event);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const page = pages[currentPage];
    if (!page) return;
    const key = `${currentPage}:${field.id}`;
    const edit = formEdits[key] || {};
    const label =
      field.labelBlockId === undefined || edit.moveLabel === false
        ? null
        : page.blocks.find((block) => block.id === field.labelBlockId) || null;
    const labelKey = label ? blockKey(currentPage, label.id) : null;
    const labelEdit = labelKey ? edits[labelKey] : undefined;
    const labelOrigin = label ? { x: labelEdit?.x ?? label.x, top: labelEdit?.top ?? label.top } : null;
    const historyBeforeDrag = createHistorySnapshot();
    const origin = {
      clientX: event.clientX,
      clientY: event.clientY,
      x: edit.x ?? field.x,
      top: edit.top ?? field.top,
    };
    const width = edit.width ?? field.width;
    const height = edit.height ?? field.height;
    let x = origin.x;
    let top = origin.top;
    let moved = false;
    const move = (pointerEvent: PointerEvent) => {
      const rawX = Math.max(
        0,
        Math.min(origin.x + (pointerEvent.clientX - origin.clientX) / zoom, page.width - width),
      );
      const rawTop = Math.max(
        0,
        Math.min(origin.top + (pointerEvent.clientY - origin.clientY) / zoom, page.height - height),
      );
      const snapped = snapPosition(rawX, rawTop, {
        id: field.id,
        page: currentPage,
        width,
        height,
        snapAs: 'box',
      });
      x = snapped.x;
      top = snapped.top;
      moved ||= x !== origin.x || top !== origin.top;
      setSnapGuides(snapped.guides);
      setFormEdits((edits) => ({ ...edits, [key]: { ...edits[key], x, top } }));
      if (label && labelKey && labelOrigin) {
        const deltaX = x - origin.x;
        const deltaY = top - origin.top;
        setEdits((items) => ({
          ...items,
          [labelKey]: {
            ...(items[labelKey] || { text: label.str }),
            x: labelOrigin.x + deltaX,
            top: labelOrigin.top + deltaY,
          },
        }));
      }
    };
    const stop = () => {
      setSnapGuides({});
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stop);
      document.removeEventListener('pointercancel', stop);
      if (moved) recordHistory(historyBeforeDrag);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', stop, { once: true });
    document.addEventListener('pointercancel', stop, { once: true });
  };

  const startFormResize = (event: ReactPointerEvent, field: FormBlock) => {
    event.preventDefault();
    event.stopPropagation();
    const page = pages[currentPage];
    if (!page) return;
    const key = `${currentPage}:${field.id}`;
    const edit = formEdits[key] || {};
    const historyBeforeResize = createHistorySnapshot();
    const x = edit.x ?? field.x;
    const top = edit.top ?? field.top;
    const origin = {
      clientX: event.clientX,
      clientY: event.clientY,
      width: edit.width ?? field.width,
      height: edit.height ?? field.height,
    };
    let resized = false;
    const move = (pointerEvent: PointerEvent) => {
      const width = Math.max(
        6,
        Math.min(origin.width + (pointerEvent.clientX - origin.clientX) / zoom, page.width - x),
      );
      const height = Math.max(
        6,
        Math.min(origin.height + (pointerEvent.clientY - origin.clientY) / zoom, page.height - top),
      );
      resized ||= width !== origin.width || height !== origin.height;
      setFormEdits((edits) => ({ ...edits, [key]: { ...edits[key], width, height } }));
    };
    const stop = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stop);
      document.removeEventListener('pointercancel', stop);
      if (resized) recordHistory(historyBeforeResize);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', stop, { once: true });
    document.addEventListener('pointercancel', stop, { once: true });
  };

  const updateXfaDraw = (patch: Partial<XfaDrawEdit>) => {
    if (!selectedXfaDrawKey || !activeXfaDraw) return;
    const prior = xfaDrawEdits[selectedXfaDrawKey] || activeXfaDraw;
    if (JSON.stringify(prior) === JSON.stringify({ ...prior, ...patch })) return;
    recordHistory();
    setXfaDrawEdits((edits) => ({ ...edits, [selectedXfaDrawKey]: { ...activeXfaDraw, ...patch } }));
    setXfaChanged(true);
  };

  return {
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
  };
}
