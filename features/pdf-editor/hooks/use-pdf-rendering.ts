'use client';

import { useEffect } from 'react';
import type { EditorState } from './use-editor-state';

type Context = Pick<
  EditorState,
  | 'canvasWrapRef'
  | 'pages'
  | 'currentPage'
  | 'fitMode'
  | 'setZoom'
  | 'pdfRef'
  | 'canvasRef'
  | 'renderRevisionRef'
  | 'renderTaskRef'
  | 'zoom'
  | 'setError'
> & {};

export function usePdfRendering({
  canvasWrapRef,
  pages,
  currentPage,
  fitMode,
  setZoom,
  pdfRef,
  canvasRef,
  renderRevisionRef,
  renderTaskRef,
  zoom,
  setError,
}: Context) {
  useEffect(() => {
    const wrap = canvasWrapRef.current;
    const page = pages[currentPage];
    if (!wrap || !page || fitMode === 'manual') return;
    const applyFit = () => {
      const style = window.getComputedStyle(wrap);
      const horizontalPadding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const verticalPadding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const widthScale = Math.max(0.25, (wrap.clientWidth - horizontalPadding) / page.width);
      const contentScale = Math.min(
        widthScale,
        Math.max(0.25, (wrap.clientHeight - verticalPadding) / page.height),
      );
      const nextZoom = Math.min(3, fitMode === 'width' ? widthScale : contentScale);
      setZoom((current) => (Math.abs(current - nextZoom) < 0.001 ? current : nextZoom));
      requestAnimationFrame(() => {
        wrap.scrollLeft = 0;
        wrap.scrollTop = 0;
      });
    };
    applyFit();
    const observer = new ResizeObserver(applyFit);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [currentPage, fitMode, pages]);

  useEffect(() => {
    if (!pdfRef.current || !canvasRef.current || !pages[currentPage]) return;
    let cancelled = false;
    let renderTask: any = null;
    const revision = ++renderRevisionRef.current;
    (async () => {
      renderTaskRef.current?.cancel?.();
      const page = await pdfRef.current.getPage(currentPage + 1);
      if (cancelled || revision !== renderRevisionRef.current) return;
      const viewport = page.getViewport({ scale: zoom });
      const maxCanvasPixels = 4_000_000;
      const ratioLimit = Math.sqrt(maxCanvasPixels / Math.max(1, viewport.width * viewport.height));
      const ratio = Math.min(window.devicePixelRatio || 1, 2, Math.max(0.75, ratioLimit));
      const stagingCanvas = document.createElement('canvas');
      stagingCanvas.width = Math.max(1, Math.floor(viewport.width * ratio));
      stagingCanvas.height = Math.max(1, Math.floor(viewport.height * ratio));
      const context = stagingCanvas.getContext('2d');
      if (!context) return;
      renderTask = page.render({
        canvasContext: context,
        viewport,
        transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
        annotationMode: 0,
      });
      renderTaskRef.current = renderTask;
      await renderTask.promise;
      const canvas = canvasRef.current;
      if (cancelled || revision !== renderRevisionRef.current || !canvas) return;
      canvas.width = stagingCanvas.width;
      canvas.height = stagingCanvas.height;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      const visibleContext = canvas.getContext('2d');
      if (!visibleContext) return;
      visibleContext.clearRect(0, 0, canvas.width, canvas.height);
      visibleContext.drawImage(stagingCanvas, 0, 0);
    })().catch((reason) => {
      if (
        !cancelled &&
        revision === renderRevisionRef.current &&
        reason?.name !== 'RenderingCancelledException'
      )
        setError('This page could not be rendered.');
    });
    return () => {
      cancelled = true;
      renderTask?.cancel?.();
    };
  }, [currentPage, pages, zoom]);

  return {};
}
