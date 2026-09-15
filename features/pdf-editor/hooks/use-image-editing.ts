'use client';
import type { EditorHistorySnapshot } from '../types';

import { type PointerEvent as ReactPointerEvent } from 'react';
import { sampleFieldBackground, sampleImageBackground, sampleTextBlockVisual } from '../lib/appearance';
import { blockKey } from '../lib/text';
import type { AddedImage, ImageBlock, SelectedElementRef } from '../types';
import type { EditorState } from './use-editor-state';

type Context = Pick<
  EditorState,
  | 'pages'
  | 'currentPage'
  | 'setError'
  | 'setAddedImages'
  | 'setSelectedElements'
  | 'setSelectedImage'
  | 'setSelected'
  | 'setSelectedAddedId'
  | 'setSelectedForm'
  | 'setPanEnabled'
  | 'imageUploadRef'
  | 'imageCaptures'
  | 'canvasRef'
  | 'zoom'
  | 'setImageCaptures'
  | 'selectedElements'
  | 'imageEdits'
  | 'setImageEdits'
  | 'setEdits'
  | 'blockVisuals'
  | 'setBlockVisuals'
  | 'setFormEdits'
  | 'formBackgrounds'
  | 'setVectorEdits'
  | 'setAddedBoxes'
  | 'setSelectedVectorId'
  | 'setToast'
  | 'deleteSelectionRef'
> & {
  recordHistory: (snapshot?: EditorHistorySnapshot) => void;
  updateElementSelection: (item: SelectedElementRef, additive?: boolean) => void;
  isElementSelected: (kind: SelectedElementRef['kind'], id: string, page?: number) => boolean;
  startGroupDrag: (event: ReactPointerEvent) => void;
  createHistorySnapshot: () => EditorHistorySnapshot;
};

export function useImageEditing({
  pages,
  currentPage,
  setError,
  recordHistory,
  setAddedImages,
  setSelectedElements,
  setSelectedImage,
  setSelected,
  setSelectedAddedId,
  setSelectedForm,
  setPanEnabled,
  imageUploadRef,
  updateElementSelection,
  imageCaptures,
  canvasRef,
  zoom,
  setImageCaptures,
  selectedElements,
  isElementSelected,
  startGroupDrag,
  imageEdits,
  createHistorySnapshot,
  setImageEdits,
  setEdits,
  blockVisuals,
  setBlockVisuals,
  setFormEdits,
  formBackgrounds,
  setVectorEdits,
  setAddedBoxes,
  setSelectedVectorId,
  setToast,
  deleteSelectionRef,
}: Context) {
  const addImageFile = async (file?: File) => {
    const page = pages[currentPage];
    if (!file || !page) return;
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
    const source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = dataUrl;
    });
    const width = Math.min(source.naturalWidth, page.width * 0.4, 260);
    const height = (width * source.naturalHeight) / source.naturalWidth;
    const image: AddedImage = {
      id: `added-image-${Date.now()}`,
      page: currentPage,
      x: (page.width - width) / 2,
      top: (page.height - height) / 2,
      width,
      height,
      dataUrl,
      name: file.name,
    };
    recordHistory();
    setAddedImages((images) => [...images, image]);
    setSelectedElements([{ page: currentPage, kind: 'added-image', id: image.id }]);
    setSelectedImage({ kind: 'added', id: image.id });
    setSelected(null);
    setSelectedAddedId(null);
    setSelectedForm(null);
    setPanEnabled(false);
    if (imageUploadRef.current) imageUploadRef.current.value = '';
  };

  const selectExistingImage = (image: ImageBlock, additive = false) => {
    updateElementSelection({ page: currentPage, kind: 'image', id: image.id }, additive);
    const key = `${currentPage}:${image.id}`;
    if (!imageCaptures[key] && canvasRef.current && pages[currentPage]) {
      const canvas = canvasRef.current;
      const pixelScale = canvas.width / (pages[currentPage].width * zoom);
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
      setImageCaptures((captures) => ({ ...captures, [key]: crop.toDataURL('image/png') }));
    }
    setSelectedImage({ kind: 'existing', id: image.id });
    setSelected(null);
    setSelectedAddedId(null);
    setSelectedForm(null);
  };

  const startImageDrag = (
    event: ReactPointerEvent,
    kind: 'existing' | 'added',
    image: ImageBlock & { page?: number },
  ) => {
    const selectionKind: SelectedElementRef['kind'] = kind === 'added' ? 'added-image' : 'image';
    if (
      selectedElements.length > 1 &&
      isElementSelected(selectionKind, image.id, kind === 'added' ? image.page : currentPage)
    ) {
      startGroupDrag(event);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const pageIndex = kind === 'added' ? image.page! : currentPage;
    const page = pages[pageIndex];
    if (!page) return;
    const key = `${pageIndex}:${image.id}`;
    const edit = imageEdits[key];
    const width = kind === 'added' ? image.width : (edit?.width ?? image.width);
    const height = kind === 'added' ? image.height : (edit?.height ?? image.height);
    const origin = {
      clientX: event.clientX,
      clientY: event.clientY,
      x: edit?.x ?? image.x,
      top: edit?.top ?? image.top,
    };
    const historyBeforeDrag = createHistorySnapshot();
    let moved = false;
    setSelectedImage({ kind, id: image.id });
    const move = (pointerEvent: PointerEvent) => {
      const x = Math.max(
        0,
        Math.min(origin.x + (pointerEvent.clientX - origin.clientX) / zoom, page.width - width),
      );
      const top = Math.max(
        0,
        Math.min(origin.top + (pointerEvent.clientY - origin.clientY) / zoom, page.height - height),
      );
      moved ||= x !== origin.x || top !== origin.top;
      if (kind === 'added')
        setAddedImages((images) =>
          images.map((entry) => (entry.id === image.id ? { ...entry, x, top } : entry)),
        );
      else setImageEdits((changes) => ({ ...changes, [key]: { ...changes[key], x, top } }));
    };
    const stop = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stop);
      document.removeEventListener('pointercancel', stop);
      if (moved) recordHistory(historyBeforeDrag);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', stop, { once: true });
    document.addEventListener('pointercancel', stop, { once: true });
  };

  const startImageResize = (
    event: ReactPointerEvent,
    kind: 'existing' | 'added',
    image: ImageBlock & { page?: number },
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const pageIndex = kind === 'added' ? image.page! : currentPage;
    const page = pages[pageIndex];
    if (!page) return;
    const key = `${pageIndex}:${image.id}`;
    const edit = imageEdits[key];
    const left = kind === 'added' ? image.x : (edit?.x ?? image.x);
    const top = kind === 'added' ? image.top : (edit?.top ?? image.top);
    const width = kind === 'added' ? image.width : (edit?.width ?? image.width);
    const height = kind === 'added' ? image.height : (edit?.height ?? image.height);
    const aspect = width / height;
    const origin = { clientX: event.clientX, clientY: event.clientY, width, height };
    const historyBeforeResize = createHistorySnapshot();
    let resized = false;
    const move = (pointerEvent: PointerEvent) => {
      const deltaX = (pointerEvent.clientX - origin.clientX) / zoom;
      const deltaY = (pointerEvent.clientY - origin.clientY) / zoom;
      let nextWidth = Math.max(
        12,
        origin.width + (Math.abs(deltaX) >= Math.abs(deltaY) ? deltaX : deltaY * aspect),
      );
      let nextHeight = nextWidth / aspect;
      const scale = Math.min(1, (page.width - left) / nextWidth, (page.height - top) / nextHeight);
      nextWidth *= scale;
      nextHeight *= scale;
      resized ||= nextWidth !== origin.width || nextHeight !== origin.height;
      if (kind === 'added')
        setAddedImages((images) =>
          images.map((entry) =>
            entry.id === image.id ? { ...entry, width: nextWidth, height: nextHeight } : entry,
          ),
        );
      else
        setImageEdits((changes) => ({
          ...changes,
          [key]: { ...changes[key], width: nextWidth, height: nextHeight },
        }));
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

  const toggleExistingImageDeleted = (key: string) => {
    recordHistory();
    setImageEdits((changes) => {
      const deleted = !changes[key]?.deleted;
      const imageId = key.slice(key.indexOf(':') + 1);
      const image = pages[currentPage]?.images.find((entry) => entry.id === imageId);
      const eraseColor =
        deleted && image && canvasRef.current && pages[currentPage]
          ? sampleImageBackground(canvasRef.current, pages[currentPage].width, zoom, image)
          : changes[key]?.eraseColor;
      return { ...changes, [key]: { ...changes[key], deleted, ...(eraseColor ? { eraseColor } : {}) } };
    });
  };

  const removeAddedImage = (id: string) => {
    recordHistory();
    setAddedImages((images) => images.filter((entry) => entry.id !== id));
    setSelectedImage(null);
  };

  const deleteSelectedElements = () => {
    if (!selectedElements.length) return;
    const snapshot = createHistorySnapshot();
    const selectedText = selectedElements.filter((item) => item.kind === 'text');
    const selectedForms = selectedElements.filter((item) => item.kind === 'form');
    const selectedImages = selectedElements.filter((item) => item.kind === 'image');
    const selectedVectors = selectedElements.filter((item) => item.kind === 'vector');
    const selectedAddedText = new Set(
      selectedElements.filter((item) => item.kind === 'added-text').map((item) => item.id),
    );
    const selectedAddedImages = new Set(
      selectedElements.filter((item) => item.kind === 'added-image').map((item) => item.id),
    );
    recordHistory(snapshot);
    // Capture every selected block before its cleanup cover is rendered. Additive and
    // marquee selection do not necessarily sample each block on their own.
    if (selectedText.length && canvasRef.current && pages[currentPage]) {
      const sampledVisuals: typeof blockVisuals = {};
      selectedText.forEach((item) => {
        if (item.page !== currentPage) return;
        const block = pages[item.page]?.blocks.find((entry) => String(entry.id) === item.id);
        if (!block) return;
        const key = blockKey(item.page, block.id);
        if (!blockVisuals[key])
          sampledVisuals[key] = sampleTextBlockVisual(
            canvasRef.current!,
            pages[item.page].width,
            zoom,
            block,
          );
      });
      if (Object.keys(sampledVisuals).length)
        setBlockVisuals((visuals) => ({ ...sampledVisuals, ...visuals }));
    }
    if (selectedText.length)
      setEdits((items) => {
        const next = { ...items };
        selectedText.forEach((item) => {
          const block = pages[item.page]?.blocks.find((entry) => String(entry.id) === item.id);
          if (block)
            next[blockKey(item.page, block.id)] = {
              ...(next[blockKey(item.page, block.id)] || { text: block.str }),
              deleted: true,
            };
        });
        return next;
      });
    if (selectedForms.length)
      setFormEdits((items) => {
        const next = { ...items };
        selectedForms.forEach((item) => {
          const key = `${item.page}:${item.id}`;
          const field = pages[item.page]?.forms.find((entry) => entry.id === item.id);
          const eraseColor =
            field && item.page === currentPage && canvasRef.current
              ? sampleFieldBackground(canvasRef.current, pages[item.page].width, zoom, field)
              : next[key]?.eraseColor || formBackgrounds[key] || '#ffffff';
          next[key] = { ...next[key], deleted: true, eraseOriginal: true, eraseColor };
        });
        return next;
      });
    if (selectedImages.length)
      setImageEdits((items) => {
        const next = { ...items };
        selectedImages.forEach((item) => {
          const key = `${item.page}:${item.id}`;
          const image = pages[item.page]?.images.find((entry) => entry.id === item.id);
          const eraseColor =
            image && item.page === currentPage && canvasRef.current
              ? sampleImageBackground(canvasRef.current, pages[item.page].width, zoom, image)
              : next[key]?.eraseColor || '#ffffff';
          next[key] = { ...next[key], deleted: true, eraseColor };
        });
        return next;
      });
    if (selectedVectors.length)
      setVectorEdits((items) => {
        const next = { ...items };
        selectedVectors.forEach((item) => {
          const key = `${item.page}:${item.id}`;
          next[key] = { ...next[key], deleted: true };
        });
        return next;
      });
    if (selectedAddedText.size)
      setAddedBoxes((boxes) => boxes.filter((box) => !selectedAddedText.has(box.id)));
    if (selectedAddedImages.size)
      setAddedImages((images) => images.filter((image) => !selectedAddedImages.has(image.id)));
    const count = selectedElements.length;
    setSelectedElements([]);
    setSelected(null);
    setSelectedForm(null);
    setSelectedAddedId(null);
    setSelectedImage(null);
    setSelectedVectorId(null);
    setToast(`${count} element${count === 1 ? '' : 's'} deleted`);
    setTimeout(() => setToast(''), 2200);
  };
  deleteSelectionRef.current = deleteSelectedElements;

  return {
    addImageFile,
    selectExistingImage,
    startImageDrag,
    startImageResize,
    toggleExistingImageDeleted,
    removeAddedImage,
    deleteSelectedElements,
  };
}
