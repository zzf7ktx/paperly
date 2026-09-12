'use client';

import { type PointerEvent as ReactPointerEvent } from 'react';
import { type XfaDrawEdit, type XfaTemplateEdit } from '../../../lib/xfa-template';
import { blockKey } from '../lib/text';
import type {
  AddedTextBox,
  EditableTextGeometry,
  EditorHistorySnapshot,
  SelectedElementRef,
  SnapGuides,
  TextBlock,
} from '../types';
import type { EditorState } from './use-editor-state';

type Context = Pick<
  EditorState,
  | 'xfaLayerRef'
  | 'pages'
  | 'zoom'
  | 'setSnapGuides'
  | 'setXfaDrawEdits'
  | 'setXfaChanged'
  | 'setError'
  | 'xfaImageReplaceRef'
  | 'setSelectedXfaKey'
  | 'setSelected'
  | 'setSelectedForm'
  | 'setSelectedAddedId'
  | 'setSelectedImage'
  | 'setXfaStructureEdits'
  | 'selectedElements'
  | 'setAddedBoxes'
  | 'currentPage'
  | 'edits'
  | 'setEdits'
> & {
  createHistorySnapshot: () => EditorHistorySnapshot;
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
  activeXfaDraw: XfaDrawEdit | null;
  updateXfaDraw: (patch: Partial<XfaDrawEdit>) => void;
  isElementSelected: (kind: SelectedElementRef['kind'], id: string, page?: number) => boolean;
  startGroupDrag: (event: ReactPointerEvent) => void;
};

export function useElementDrag({
  xfaLayerRef,
  pages,
  createHistorySnapshot,
  zoom,
  snapPosition,
  setSnapGuides,
  setXfaDrawEdits,
  setXfaChanged,
  recordHistory,
  activeXfaDraw,
  setError,
  updateXfaDraw,
  xfaImageReplaceRef,
  setSelectedXfaKey,
  setSelected,
  setSelectedForm,
  setSelectedAddedId,
  setSelectedImage,
  setXfaStructureEdits,
  selectedElements,
  isElementSelected,
  startGroupDrag,
  setAddedBoxes,
  currentPage,
  edits,
  setEdits,
}: Context) {
  const prepareRenderedXfaGeometry = (
    rendered: HTMLElement | null,
    geometry: { x: number; top: number; width: number; height: number },
    kind: 'field' | 'draw',
  ) => {
    const container = xfaLayerRef.current;
    if (!rendered || !container) return;
    if (rendered.parentElement !== container) {
      const placeholder = rendered.cloneNode(true) as HTMLElement;
      placeholder.classList.remove(kind === 'field' ? 'xfaField' : 'xfaDraw');
      placeholder.classList.add('paperly-xfa-layout-placeholder');
      placeholder.removeAttribute(kind === 'field' ? 'data-paperly-xfa-key' : 'data-paperly-xfa-draw-key');
      placeholder.setAttribute('aria-hidden', 'true');
      placeholder.style.visibility = 'hidden';
      placeholder.style.pointerEvents = 'none';
      rendered.parentElement?.insertBefore(placeholder, rendered);
      container.append(rendered);
    }
    rendered.style.position = 'absolute';
    rendered.style.left = `${geometry.x}px`;
    rendered.style.top = `${geometry.top}px`;
    rendered.style.right = 'auto';
    rendered.style.bottom = 'auto';
    rendered.style.margin = '0';
    rendered.style.translate = 'none';
    rendered.style.transform = 'none';
    rendered.style.boxSizing = 'border-box';
    rendered.style.width = `${geometry.width}px`;
    rendered.style.height = `${geometry.height}px`;
    rendered.style.zIndex = kind === 'field' ? '3' : '2';
  };

  const startXfaDrawDrag = (event: ReactPointerEvent, draw: XfaDrawEdit) => {
    event.preventDefault();
    event.stopPropagation();
    const page = pages[draw.page];
    if (!page) return;
    const selection = event.currentTarget.parentElement as HTMLElement | null;
    const rendered =
      xfaLayerRef.current?.querySelector<HTMLElement>(
        `[data-paperly-xfa-draw-key="${CSS.escape(draw.key)}"]`,
      ) || null;
    prepareRenderedXfaGeometry(rendered, draw, 'draw');
    const historyBeforeDrag = createHistorySnapshot();
    const origin = { clientX: event.clientX, clientY: event.clientY, x: draw.x, top: draw.top };
    let x = draw.x;
    let top = draw.top;
    let moved = false;
    const move = (pointerEvent: PointerEvent) => {
      const rawX = Math.max(
        0,
        Math.min(origin.x + (pointerEvent.clientX - origin.clientX) / zoom, page.width - draw.width),
      );
      const rawTop = Math.max(
        0,
        Math.min(origin.top + (pointerEvent.clientY - origin.clientY) / zoom, page.height - draw.height),
      );
      const snapped = snapPosition(rawX, rawTop, {
        id: draw.key,
        snapId: `xfa-draw:${draw.key}`,
        snapAs: draw.kind === 'text' ? 'text' : 'box',
        page: draw.page,
        width: draw.width,
        height: draw.height,
        size: draw.kind === 'text' ? draw.size : undefined,
      });
      x = snapped.x;
      top = snapped.top;
      setSnapGuides(snapped.guides);
      moved ||= x !== origin.x || top !== origin.top;
      if (selection) {
        selection.style.left = `${x * zoom}px`;
        selection.style.top = `${top * zoom}px`;
      }
      if (rendered) {
        rendered.style.left = `${x}px`;
        rendered.style.top = `${top}px`;
      }
    };
    const stop = () => {
      setSnapGuides({});
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stop);
      document.removeEventListener('pointercancel', stop);
      if (!moved) return;
      setXfaDrawEdits((edits) => ({ ...edits, [draw.key]: { ...draw, ...edits[draw.key], x, top } }));
      setXfaChanged(true);
      recordHistory(historyBeforeDrag);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', stop, { once: true });
    document.addEventListener('pointercancel', stop, { once: true });
  };

  const startXfaDrawResize = (event: ReactPointerEvent, draw: XfaDrawEdit) => {
    event.preventDefault();
    event.stopPropagation();
    const page = pages[draw.page];
    if (!page) return;
    const selection = event.currentTarget.parentElement as HTMLElement | null;
    const rendered =
      xfaLayerRef.current?.querySelector<HTMLElement>(
        `[data-paperly-xfa-draw-key="${CSS.escape(draw.key)}"]`,
      ) || null;
    prepareRenderedXfaGeometry(rendered, draw, 'draw');
    const historyBeforeResize = createHistorySnapshot();
    const origin = { clientX: event.clientX, clientY: event.clientY, width: draw.width, height: draw.height };
    let width = draw.width;
    let height = draw.height;
    let resized = false;
    const move = (pointerEvent: PointerEvent) => {
      width = Math.max(
        6,
        Math.min(origin.width + (pointerEvent.clientX - origin.clientX) / zoom, page.width - draw.x),
      );
      height = Math.max(
        6,
        Math.min(origin.height + (pointerEvent.clientY - origin.clientY) / zoom, page.height - draw.top),
      );
      resized ||= width !== origin.width || height !== origin.height;
      if (selection) {
        selection.style.width = `${width * zoom}px`;
        selection.style.height = `${height * zoom}px`;
      }
      if (rendered) {
        rendered.style.width = `${width}px`;
        rendered.style.height = `${height}px`;
      }
    };
    const stop = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stop);
      document.removeEventListener('pointercancel', stop);
      if (!resized) return;
      setXfaDrawEdits((edits) => ({ ...edits, [draw.key]: { ...draw, ...edits[draw.key], width, height } }));
      setXfaChanged(true);
      recordHistory(historyBeforeResize);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', stop, { once: true });
    document.addEventListener('pointercancel', stop, { once: true });
  };

  const replaceXfaDrawImage = async (file?: File) => {
    if (!file || !activeXfaDraw || activeXfaDraw.kind !== 'image') return;
    if (!/^image\/(png|jpeg)$/.test(file.type)) {
      setError('Please choose a PNG or JPEG image.');
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    updateXfaDraw({ dataUrl });
    if (xfaImageReplaceRef.current) xfaImageReplaceRef.current.value = '';
  };

  const startXfaDrag = (event: ReactPointerEvent, field: XfaTemplateEdit) => {
    event.preventDefault();
    event.stopPropagation();
    const page = pages[field.page];
    if (!page) return;
    setSelectedXfaKey(field.key);
    setSelected(null);
    setSelectedForm(null);
    setSelectedAddedId(null);
    setSelectedImage(null);
    const selection = event.currentTarget.parentElement as HTMLElement | null;
    const rendered =
      xfaLayerRef.current?.querySelector<HTMLElement>(`[data-paperly-xfa-key="${CSS.escape(field.key)}"]`) ||
      null;
    const added = document.querySelector<HTMLElement>(`[data-xfa-added-key="${CSS.escape(field.key)}"]`);
    prepareRenderedXfaGeometry(rendered, field, 'field');
    const historyBeforeDrag = createHistorySnapshot();
    const origin = { clientX: event.clientX, clientY: event.clientY, x: field.x, top: field.top };
    let nextX = field.x;
    let nextTop = field.top;
    let moved = false;
    const move = (pointerEvent: PointerEvent) => {
      const rawX = Math.max(
        0,
        Math.min(origin.x + (pointerEvent.clientX - origin.clientX) / zoom, page.width - field.width),
      );
      const rawTop = Math.max(
        0,
        Math.min(origin.top + (pointerEvent.clientY - origin.clientY) / zoom, page.height - field.height),
      );
      const snapped = snapPosition(rawX, rawTop, {
        id: field.key,
        snapId: `xfa-field:${field.key}`,
        snapAs: 'box',
        page: field.page,
        width: field.width,
        height: field.height,
      });
      nextX = snapped.x;
      nextTop = snapped.top;
      setSnapGuides(snapped.guides);
      moved ||= nextX !== origin.x || nextTop !== origin.top;
      if (selection) {
        selection.style.left = `${nextX * zoom}px`;
        selection.style.top = `${nextTop * zoom}px`;
      }
      if (added) {
        added.style.left = `${nextX * zoom}px`;
        added.style.top = `${nextTop * zoom}px`;
      }
      if (rendered) {
        rendered.style.left = `${nextX}px`;
        rendered.style.top = `${nextTop}px`;
      }
    };
    const stop = () => {
      setSnapGuides({});
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stop);
      document.removeEventListener('pointercancel', stop);
      if (moved) {
        setXfaStructureEdits((edits) => ({
          ...edits,
          [field.key]: { ...field, ...edits[field.key], x: nextX, top: nextTop },
        }));
        setXfaChanged(true);
        recordHistory(historyBeforeDrag);
      }
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', stop, { once: true });
    document.addEventListener('pointercancel', stop, { once: true });
  };

  const startXfaResize = (event: ReactPointerEvent, field: XfaTemplateEdit) => {
    event.preventDefault();
    event.stopPropagation();
    const page = pages[field.page];
    if (!page) return;
    const selection = event.currentTarget.parentElement as HTMLElement | null;
    const rendered =
      xfaLayerRef.current?.querySelector<HTMLElement>(`[data-paperly-xfa-key="${CSS.escape(field.key)}"]`) ||
      null;
    const added = document.querySelector<HTMLElement>(`[data-xfa-added-key="${CSS.escape(field.key)}"]`);
    prepareRenderedXfaGeometry(rendered, field, 'field');
    const historyBeforeResize = createHistorySnapshot();
    const origin = {
      clientX: event.clientX,
      clientY: event.clientY,
      width: field.width,
      height: field.height,
    };
    let nextWidth = field.width;
    let nextHeight = field.height;
    let resized = false;
    const move = (pointerEvent: PointerEvent) => {
      nextWidth = Math.max(
        6,
        Math.min(origin.width + (pointerEvent.clientX - origin.clientX) / zoom, page.width - field.x),
      );
      nextHeight = Math.max(
        6,
        Math.min(origin.height + (pointerEvent.clientY - origin.clientY) / zoom, page.height - field.top),
      );
      resized ||= nextWidth !== origin.width || nextHeight !== origin.height;
      if (selection) {
        selection.style.width = `${nextWidth * zoom}px`;
        selection.style.height = `${nextHeight * zoom}px`;
      }
      if (added) {
        added.style.width = `${nextWidth * zoom}px`;
        added.style.height = `${nextHeight * zoom}px`;
      }
      if (rendered) {
        rendered.style.width = `${nextWidth}px`;
        rendered.style.height = `${nextHeight}px`;
      }
    };
    const stop = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stop);
      document.removeEventListener('pointercancel', stop);
      if (resized) {
        setXfaStructureEdits((edits) => ({
          ...edits,
          [field.key]: { ...field, ...edits[field.key], width: nextWidth, height: nextHeight },
        }));
        setXfaChanged(true);
        recordHistory(historyBeforeResize);
      }
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', stop, { once: true });
    document.addEventListener('pointercancel', stop, { once: true });
  };

  const startTextDrag = (
    event: ReactPointerEvent,
    geometry: EditableTextGeometry,
    snapBox: Parameters<typeof snapPosition>[2],
    apply: (x: number, top: number) => void,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const page = pages[geometry.page];
    if (!page) return;
    const historyBeforeDrag = createHistorySnapshot();
    const origin = { clientX: event.clientX, clientY: event.clientY, x: geometry.x, top: geometry.top };
    let moved = false;
    const move = (pointerEvent: PointerEvent) => {
      const rawX = Math.max(
        0,
        Math.min(origin.x + (pointerEvent.clientX - origin.clientX) / zoom, page.width - geometry.width),
      );
      const rawTop = Math.max(
        0,
        Math.min(origin.top + (pointerEvent.clientY - origin.clientY) / zoom, page.height - geometry.height),
      );
      const snapped = snapPosition(rawX, rawTop, snapBox);
      moved ||= Math.abs(snapped.x - origin.x) > 0.01 || Math.abs(snapped.top - origin.top) > 0.01;
      apply(snapped.x, snapped.top);
      setSnapGuides(snapped.guides);
    };
    const stop = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stop);
      document.removeEventListener('pointercancel', stop);
      setSnapGuides({});
      if (moved) recordHistory(historyBeforeDrag);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', stop, { once: true });
    document.addEventListener('pointercancel', stop, { once: true });
  };

  const startBoxDrag = (event: ReactPointerEvent, box: AddedTextBox) => {
    if (selectedElements.length > 1 && isElementSelected('added-text', box.id, box.page)) {
      startGroupDrag(event);
      return;
    }
    setSelectedAddedId(box.id);
    setSelected(null);
    setSelectedForm(null);
    setSelectedImage(null);
    startTextDrag(
      event,
      { page: box.page, x: box.x, top: box.top, width: box.width, height: box.height, minHeight: box.size },
      box,
      (x, top) => {
        setAddedBoxes((boxes) => boxes.map((entry) => (entry.id === box.id ? { ...entry, x, top } : entry)));
      },
    );
  };

  const startTextResize = (
    event: ReactPointerEvent,
    geometry: EditableTextGeometry,
    apply: (width: number, height: number) => void,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const page = pages[geometry.page];
    if (!page) return;
    const historyBeforeResize = createHistorySnapshot();
    const origin = {
      clientX: event.clientX,
      clientY: event.clientY,
      width: geometry.width,
      height: geometry.height,
    };
    let resized = false;
    const move = (pointerEvent: PointerEvent) => {
      const width = Math.max(
        6,
        Math.min(origin.width + (pointerEvent.clientX - origin.clientX) / zoom, page.width - geometry.x),
      );
      const height = Math.max(
        geometry.minHeight,
        Math.min(origin.height + (pointerEvent.clientY - origin.clientY) / zoom, page.height - geometry.top),
      );
      resized ||= Math.abs(width - origin.width) > 0.01 || Math.abs(height - origin.height) > 0.01;
      apply(width, height);
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

  const startBoxResize = (event: ReactPointerEvent, box: AddedTextBox) =>
    startTextResize(
      event,
      { page: box.page, x: box.x, top: box.top, width: box.width, height: box.height, minHeight: box.size },
      (width, height) => {
        setAddedBoxes((boxes) =>
          boxes.map((entry) => (entry.id === box.id ? { ...entry, width, height, autoFit: false } : entry)),
        );
      },
    );

  const startExistingDrag = (event: ReactPointerEvent, block: TextBlock) => {
    if (selectedElements.length > 1 && isElementSelected('text', String(block.id))) {
      startGroupDrag(event);
      return;
    }
    const key = blockKey(currentPage, block.id);
    const page = pages[currentPage];
    if (!page) return;
    setSelected(block.id);
    setSelectedAddedId(null);
    setSelectedForm(null);
    setSelectedImage(null);
    const prior = edits[key] || { text: block.str };
    const x = prior.x ?? block.x;
    const top = prior.top ?? block.top;
    const width = prior.width ?? block.width;
    const height = prior.height ?? block.height;
    const snapBox = {
      id: `existing-${block.id}`,
      page: currentPage,
      width,
      height,
      size: block.baseline - block.top,
      sourceBlockId: block.id,
    };
    startTextDrag(
      event,
      { page: currentPage, x, top, width, height, minHeight: prior.size ?? block.fontSize },
      snapBox,
      (nextX, nextTop) => {
        setEdits((current) => ({
          ...current,
          [key]: { ...(current[key] || prior), x: nextX, top: nextTop },
        }));
      },
    );
  };

  const startExistingResize = (event: ReactPointerEvent, block: TextBlock) => {
    const key = blockKey(currentPage, block.id);
    const prior = edits[key] || { text: block.str };
    const x = prior.x ?? block.x;
    const top = prior.top ?? block.top;
    startTextResize(
      event,
      {
        page: currentPage,
        x,
        top,
        width: prior.width ?? block.width,
        height: prior.height ?? block.height,
        minHeight: prior.size ?? block.fontSize,
      },
      (width, height) => {
        setEdits((items) => ({ ...items, [key]: { ...(items[key] || prior), width, height } }));
      },
    );
  };

  return {
    startXfaDrawDrag,
    startXfaDrawResize,
    replaceXfaDrawImage,
    startXfaDrag,
    startXfaResize,
    startBoxDrag,
    startBoxResize,
    startExistingDrag,
    startExistingResize,
  };
}
