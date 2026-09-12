'use client';
import type { EditorHistorySnapshot, VectorEdit } from '../types';

import { type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { blockKey } from '../lib/text';
import type { AddedImage, ImageBlock, SelectedElementRef, VectorBlock, VectorKind } from '../types';
import type { EditorState } from './use-editor-state';

type Context = Pick<
  EditorState,
  | 'tool'
  | 'ocrBusy'
  | 'pages'
  | 'currentPage'
  | 'zoom'
  | 'setOcrRegion'
  | 'setTool'
  | 'drawFill'
  | 'drawStroke'
  | 'drawStrokeWidth'
  | 'setDraftVector'
  | 'setPages'
  | 'setSelectedVectorId'
  | 'setSelected'
  | 'setSelectedForm'
  | 'setSelectedAddedId'
  | 'setSelectedImage'
  | 'selectedElements'
  | 'vectorEdits'
  | 'setVectorEdits'
  | 'deleteVectorRef'
  | 'panEnabled'
  | 'setSelectionMarquee'
  | 'marqueeSuppressClickRef'
  | 'selectPdfShapes'
  | 'edits'
  | 'formEdits'
  | 'imageEdits'
  | 'addedBoxes'
  | 'addedImages'
  | 'moveShapeContents'
  | 'setSelectedElements'
  | 'setSelectedXfaKey'
  | 'setSelectedXfaDrawKey'
  | 'setAddedImages'
  | 'setImageEdits'
  | 'canvasWrapRef'
  | 'panRef'
  | 'setIsPanning'
  | 'pdfBytes'
  | 'setFitMode'
  | 'setZoom'
> & {
  runOcr: (region?: { x: number; top: number; width: number; height: number }) => Promise<void>;
  createHistorySnapshot: () => EditorHistorySnapshot;
  recordHistory: (snapshot?: EditorHistorySnapshot) => void;
  isElementSelected: (kind: SelectedElementRef['kind'], id: string, page?: number) => boolean;
  startGroupDrag: (event: ReactPointerEvent) => void;
  activeVector: VectorBlock | null;
  activeVectorEdit: VectorEdit;
  activeVectorKey: string | null;
  isFormOwnedVector: (pageIndex: number, vector: VectorBlock) => boolean;
  relatedShapeElements: (pageIndex: number, seedIds: string[]) => SelectedElementRef[];
  activeAddedImage: AddedImage | null;
  activeImageKey: string | null;
};

export function useCanvasInteraction({
  tool,
  ocrBusy,
  pages,
  currentPage,
  zoom,
  setOcrRegion,
  runOcr,
  setTool,
  createHistorySnapshot,
  drawFill,
  drawStroke,
  drawStrokeWidth,
  setDraftVector,
  recordHistory,
  setPages,
  setSelectedVectorId,
  setSelected,
  setSelectedForm,
  setSelectedAddedId,
  setSelectedImage,
  selectedElements,
  isElementSelected,
  startGroupDrag,
  vectorEdits,
  setVectorEdits,
  activeVector,
  activeVectorEdit,
  activeVectorKey,
  deleteVectorRef,
  panEnabled,
  setSelectionMarquee,
  marqueeSuppressClickRef,
  selectPdfShapes,
  isFormOwnedVector,
  edits,
  formEdits,
  imageEdits,
  addedBoxes,
  addedImages,
  moveShapeContents,
  relatedShapeElements,
  setSelectedElements,
  setSelectedXfaKey,
  setSelectedXfaDrawKey,
  activeAddedImage,
  activeImageKey,
  setAddedImages,
  setImageEdits,
  canvasWrapRef,
  panRef,
  setIsPanning,
  pdfBytes,
  setFitMode,
  setZoom,
}: Context) {
  const startOcrRegionSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (tool !== 'ocr-region' || event.button !== 0 || ocrBusy) return;
    event.preventDefault();
    event.stopPropagation();
    const page = pages[currentPage];
    if (!page) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const point = (pointerEvent: { clientX: number; clientY: number }) => ({
      x: Math.max(0, Math.min((pointerEvent.clientX - bounds.left) / zoom, page.width)),
      top: Math.max(0, Math.min((pointerEvent.clientY - bounds.top) / zoom, page.height)),
    });
    const origin = point(event);
    let rectangle = { x: origin.x, top: origin.top, width: 0, height: 0 };
    const move = (pointerEvent: PointerEvent) => {
      const current = point(pointerEvent);
      rectangle = {
        x: Math.min(origin.x, current.x),
        top: Math.min(origin.top, current.top),
        width: Math.abs(current.x - origin.x),
        height: Math.abs(current.top - origin.top),
      };
      setOcrRegion(rectangle);
    };
    const stop = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stop);
      document.removeEventListener('pointercancel', cancel);
      if (rectangle.width > 4 && rectangle.height > 4) void runOcr(rectangle);
      else {
        setOcrRegion(null);
        setTool('select');
      }
    };
    const cancel = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stop);
      document.removeEventListener('pointercancel', cancel);
      setOcrRegion(null);
      setTool('select');
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', stop, { once: true });
    document.addEventListener('pointercancel', cancel, { once: true });
  };

  const startVectorDrawing = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!tool.startsWith('draw-') || event.button !== 0 || !pages[currentPage]) return;
    event.preventDefault();
    event.stopPropagation();
    const page = pages[currentPage];
    const bounds = event.currentTarget.getBoundingClientRect();
    const kind = tool.replace('draw-', '') as VectorKind;
    const point = (input: { clientX: number; clientY: number }) => ({
      x: Math.max(0, Math.min((input.clientX - bounds.left) / zoom, page.width)),
      top: Math.max(0, Math.min((input.clientY - bounds.top) / zoom, page.height)),
    });
    const origin = point(event);
    const id = `drawing-${Date.now()}`;
    const before = createHistorySnapshot();
    let draft: VectorBlock = {
      id,
      kind,
      x: origin.x,
      top: origin.top,
      width: 1,
      height: 1,
      fill: kind === 'line' || kind === 'brush' ? 'transparent' : drawFill,
      stroke: drawStroke,
      strokeWidth: drawStrokeWidth,
      points: kind === 'line' ? [origin, origin] : kind === 'brush' ? [origin] : undefined,
    };
    setDraftVector(draft);
    const move = (input: PointerEvent) => {
      const current = point(input);
      if (kind === 'brush') {
        const points = [...(draft.points || []), current];
        const xs = points.map((entry) => entry.x);
        const ys = points.map((entry) => entry.top);
        draft = {
          ...draft,
          points,
          x: Math.min(...xs),
          top: Math.min(...ys),
          width: Math.max(1, Math.max(...xs) - Math.min(...xs)),
          height: Math.max(1, Math.max(...ys) - Math.min(...ys)),
        };
      } else
        draft = {
          ...draft,
          x: Math.min(origin.x, current.x),
          top: Math.min(origin.top, current.top),
          width: Math.max(1, Math.abs(current.x - origin.x)),
          height: Math.max(1, Math.abs(current.top - origin.top)),
          points: kind === 'line' ? [origin, current] : undefined,
        };
      setDraftVector({ ...draft });
    };
    const cancel = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', cancel);
      setDraftVector(null);
    };
    const finish = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', cancel);
      setDraftVector(null);
      if (draft.width <= 1 && draft.height <= 1) return;
      recordHistory(before);
      const completed = { ...draft, added: true };
      setPages((items) =>
        items.map((entry, index) =>
          index === currentPage ? { ...entry, vectors: [...entry.vectors, completed] } : entry,
        ),
      );
      setSelectedVectorId(id);
      setSelected(null);
      setSelectedForm(null);
      setSelectedAddedId(null);
      setSelectedImage(null);
      setTool('select');
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', finish, { once: true });
    document.addEventListener('pointercancel', cancel, { once: true });
  };

  const startVectorDrag = (event: ReactPointerEvent, vector: VectorBlock) => {
    if (selectedElements.length > 1 && isElementSelected('vector', vector.id)) {
      startGroupDrag(event);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const page = pages[currentPage];
    if (!page) return;
    const key = `${currentPage}:${vector.id}`;
    const edit = vectorEdits[key] || {};
    const before = createHistorySnapshot();
    const origin = {
      clientX: event.clientX,
      clientY: event.clientY,
      x: edit.x ?? vector.x,
      top: edit.top ?? vector.top,
    };
    let moved = false;
    const move = (input: PointerEvent) => {
      const x = Math.max(
        0,
        Math.min(
          origin.x + (input.clientX - origin.clientX) / zoom,
          page.width - (edit.width ?? vector.width),
        ),
      );
      const top = Math.max(
        0,
        Math.min(
          origin.top + (input.clientY - origin.clientY) / zoom,
          page.height - (edit.height ?? vector.height),
        ),
      );
      moved ||= x !== origin.x || top !== origin.top;
      setVectorEdits((items) => ({ ...items, [key]: { ...items[key], x, top } }));
    };
    const stop = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stop);
      if (moved) recordHistory(before);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', stop, { once: true });
  };

  const startVectorResize = (event: ReactPointerEvent, vector: VectorBlock) => {
    event.preventDefault();
    event.stopPropagation();
    const page = pages[currentPage];
    if (!page) return;
    const key = `${currentPage}:${vector.id}`;
    const edit = vectorEdits[key] || {};
    const before = createHistorySnapshot();
    const origin = {
      clientX: event.clientX,
      clientY: event.clientY,
      width: edit.width ?? vector.width,
      height: edit.height ?? vector.height,
    };
    let resized = false;
    const move = (input: PointerEvent) => {
      const width = Math.max(
        1,
        Math.min(origin.width + (input.clientX - origin.clientX) / zoom, page.width - (edit.x ?? vector.x)),
      );
      const height = Math.max(
        1,
        Math.min(
          origin.height + (input.clientY - origin.clientY) / zoom,
          page.height - (edit.top ?? vector.top),
        ),
      );
      resized ||= width !== origin.width || height !== origin.height;
      setVectorEdits((items) => ({ ...items, [key]: { ...items[key], width, height } }));
    };
    const stop = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stop);
      if (resized) recordHistory(before);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', stop, { once: true });
  };

  const cloneVector = () => {
    if (!activeVector) return;
    const id = `drawing-${Date.now()}`;
    const clone = {
      ...activeVector,
      ...activeVectorEdit,
      id,
      x: (activeVectorEdit.x ?? activeVector.x) + 12,
      top: (activeVectorEdit.top ?? activeVector.top) + 12,
      added: true,
    } as VectorBlock;
    recordHistory();
    setPages((items) =>
      items.map((page, index) =>
        index === currentPage ? { ...page, vectors: [...page.vectors, clone] } : page,
      ),
    );
    setSelectedVectorId(id);
  };
  const deleteVector = () => {
    if (!activeVectorKey) return;
    recordHistory();
    setVectorEdits((items) => ({
      ...items,
      [activeVectorKey]: { ...items[activeVectorKey], deleted: !activeVectorEdit.deleted },
    }));
  };
  deleteVectorRef.current = deleteVector;

  const startMarqueeSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (tool !== 'select' || panEnabled || event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (
      target.closest(
        '.text-block,.added-text-box,.pdf-form-control,.form-deleted-field,.form-selection-box,.xfaLayer,.xfa-edit-layer,.image-drag-handle,.image-resize-handle,.image-delete-control',
      )
    )
      return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const point = (pointerEvent: { clientX: number; clientY: number }) => ({
      x: Math.max(0, Math.min((pointerEvent.clientX - bounds.left) / zoom, pages[currentPage].width)),
      top: Math.max(0, Math.min((pointerEvent.clientY - bounds.top) / zoom, pages[currentPage].height)),
    });
    const origin = point(event);
    let rectangle = { x: origin.x, top: origin.top, width: 0, height: 0 };
    const move = (pointerEvent: PointerEvent) => {
      const current = point(pointerEvent);
      rectangle = {
        x: Math.min(origin.x, current.x),
        top: Math.min(origin.top, current.top),
        width: Math.abs(current.x - origin.x),
        height: Math.abs(current.top - origin.top),
      };
      setSelectionMarquee(rectangle);
    };
    const stop = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stop);
      document.removeEventListener('pointercancel', cancel);
      setSelectionMarquee(null);
      if (rectangle.width <= 3 && rectangle.height <= 3) return;
      marqueeSuppressClickRef.current = true;
      window.setTimeout(() => {
        marqueeSuppressClickRef.current = false;
      }, 0);
      const intersects = (x: number, top: number, width: number, height: number) =>
        x < rectangle.x + rectangle.width &&
        x + width > rectangle.x &&
        top < rectangle.top + rectangle.height &&
        top + height > rectangle.top;
      const contains = (x: number, top: number, width: number, height: number) =>
        rectangle.x <= x &&
        rectangle.top <= top &&
        rectangle.x + rectangle.width >= x + width &&
        rectangle.top + rectangle.height >= top + height;
      const hits: SelectedElementRef[] = [];
      if (rectangle.width > 3 || rectangle.height > 3) {
        if (selectPdfShapes) {
          pages[currentPage].vectors.forEach((vector) => {
            const edit = vectorEdits[`${currentPage}:${vector.id}`];
            if (
              !edit?.deleted &&
              !isFormOwnedVector(currentPage, vector) &&
              intersects(
                edit?.x ?? vector.x,
                edit?.top ?? vector.top,
                edit?.width ?? vector.width,
                edit?.height ?? vector.height,
              )
            )
              hits.push({ page: currentPage, kind: 'vector', id: vector.id });
          });
        }
        pages[currentPage].blocks.forEach((block) => {
          const edit = edits[blockKey(currentPage, block.id)];
          if (
            !edit?.deleted &&
            intersects(
              edit?.x ?? block.x,
              edit?.top ?? block.top,
              edit?.width ?? block.width,
              edit?.height ?? block.height,
            )
          )
            hits.push({ page: currentPage, kind: 'text', id: String(block.id) });
        });
        pages[currentPage].forms.forEach((field) => {
          const edit = formEdits[`${currentPage}:${field.id}`];
          if (
            !edit?.deleted &&
            intersects(
              edit?.x ?? field.x,
              edit?.top ?? field.top,
              edit?.width ?? field.width,
              edit?.height ?? field.height,
            )
          )
            hits.push({ page: currentPage, kind: 'form', id: field.id });
        });
        pages[currentPage].images.forEach((image) => {
          const edit = imageEdits[`${currentPage}:${image.id}`];
          if (
            !edit?.deleted &&
            contains(
              edit?.x ?? image.x,
              edit?.top ?? image.top,
              edit?.width ?? image.width,
              edit?.height ?? image.height,
            )
          )
            hits.push({ page: currentPage, kind: 'image', id: image.id });
        });
        addedBoxes
          .filter((box) => box.page === currentPage)
          .forEach((box) => {
            if (intersects(box.x, box.top, box.width, box.height))
              hits.push({ page: currentPage, kind: 'added-text', id: box.id });
          });
        addedImages
          .filter((image) => image.page === currentPage)
          .forEach((image) => {
            if (contains(image.x, image.top, image.width, image.height))
              hits.push({ page: currentPage, kind: 'added-image', id: image.id });
          });
      }
      const shapeSeeds = hits.filter((hit) => hit.kind === 'vector').map((hit) => hit.id);
      const expandedShapeHits =
        selectPdfShapes && moveShapeContents && shapeSeeds.length
          ? relatedShapeElements(currentPage, shapeSeeds)
          : [];
      const resolvedHits = [...hits];
      expandedShapeHits.forEach((hit) => {
        if (
          !resolvedHits.some((item) => item.page === hit.page && item.kind === hit.kind && item.id === hit.id)
        )
          resolvedHits.push(hit);
      });
      const combined = event.shiftKey ? [...selectedElements] : [];
      resolvedHits.forEach((hit) => {
        if (!combined.some((item) => item.page === hit.page && item.kind === hit.kind && item.id === hit.id))
          combined.push(hit);
      });
      setSelectedElements(combined);
      const primary = combined[combined.length - 1];
      setSelected(primary?.kind === 'text' ? Number(primary.id) : null);
      setSelectedForm(
        primary?.kind === 'form'
          ? pages[primary.page].forms.find((field) => field.id === primary.id) || null
          : null,
      );
      setSelectedAddedId(primary?.kind === 'added-text' ? primary.id : null);
      setSelectedImage(
        primary?.kind === 'image'
          ? { kind: 'existing', id: primary.id }
          : primary?.kind === 'added-image'
            ? { kind: 'added', id: primary.id }
            : null,
      );
      setSelectedVectorId(primary?.kind === 'vector' ? primary.id : null);
      setSelectedXfaKey(null);
      setSelectedXfaDrawKey(null);
    };
    const cancel = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stop);
      document.removeEventListener('pointercancel', cancel);
      setSelectionMarquee(null);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', stop, { once: true });
    document.addEventListener('pointercancel', cancel, { once: true });
  };

  const updateSelectedImageSize = (patch: Pick<ImageBlock, 'width'> | Pick<ImageBlock, 'height'>) => {
    if (!activeAddedImage && !activeImageKey) return;
    recordHistory();
    if (activeAddedImage)
      setAddedImages((images) =>
        images.map((image) => (image.id === activeAddedImage.id ? { ...image, ...patch } : image)),
      );
    else if (activeImageKey)
      setImageEdits((changes) => ({
        ...changes,
        [activeImageKey]: { ...changes[activeImageKey], ...patch },
      }));
  };

  const startCanvasPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const wrap = canvasWrapRef.current;
    const temporaryPan = event.button === 1 || (event.button === 0 && event.altKey);
    const persistentPan = panEnabled && event.button === 0;
    if ((!temporaryPan && !persistentPan) || !wrap) return;
    event.preventDefault();
    event.stopPropagation();
    panRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      scrollLeft: wrap.scrollLeft,
      scrollTop: wrap.scrollTop,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPanning(true);
  };

  const moveCanvasPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const wrap = canvasWrapRef.current;
    const origin = panRef.current;
    if (!wrap || !origin || origin.pointerId !== event.pointerId) return;
    wrap.scrollLeft = origin.scrollLeft - (event.clientX - origin.clientX);
    wrap.scrollTop = origin.scrollTop - (event.clientY - origin.clientY);
  };

  const stopCanvasPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!panRef.current || panRef.current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    panRef.current = null;
    setIsPanning(false);
  };

  const zoomCanvasWithWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    const wrap = canvasWrapRef.current;
    const pageElement = wrap?.querySelector<HTMLElement>('.live-page');
    if (!wrap || !pageElement || !pdfBytes) return;
    event.preventDefault();
    const clientX = event.clientX;
    const clientY = event.clientY;
    const deltaY = event.deltaY;
    const pageBounds = pageElement.getBoundingClientRect();
    setFitMode('manual');
    setZoom((current) => {
      const factor = Math.exp(-deltaY * 0.0015);
      const next = Math.max(0.25, Math.min(3, current * factor));
      const pageX = (clientX - pageBounds.left) / current;
      const pageY = (clientY - pageBounds.top) / current;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const nextBounds = pageElement.getBoundingClientRect();
          wrap.scrollLeft += nextBounds.left + pageX * next - clientX;
          wrap.scrollTop += nextBounds.top + pageY * next - clientY;
        }),
      );
      return next;
    });
  };

  return {
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
  };
}
