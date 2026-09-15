'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { AddedTextBox, PageInfo, PagePreviewShape, VectorEdit } from '../types';

export function PdfThumbnail({
  page,
  addedText = [],
  vectorEdits = {},
  pdfRef,
  isXfa,
  index,
  active,
  onClick,
}: {
  page: PageInfo;
  addedText?: AddedTextBox[];
  vectorEdits?: Record<string, VectorEdit>;
  pdfRef: RefObject<PDFDocumentProxy | null>;
  isXfa?: boolean;
  index: number;
  active: boolean;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    const pdfDocument = pdfRef.current;
    if (isXfa || !canvas || !pdfDocument) return;
    let cancelled = false;
    let task: any;
    setRendered(false);
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void (async () => {
          const pdfPage = await pdfDocument.getPage(index + 1);
          if (cancelled) return;
          const viewport = pdfPage.getViewport({ scale: Math.min(300 / page.width, 380 / page.height) });
          const staging = document.createElement('canvas');
          staging.width = Math.ceil(viewport.width);
          staging.height = Math.ceil(viewport.height);
          const context = staging.getContext('2d');
          if (!context) return;
        task = pdfPage.render({ canvas: staging, canvasContext: context, viewport, annotationMode: 0 });
          await task.promise;
          if (cancelled) return;
          canvas.width = staging.width;
          canvas.height = staging.height;
          canvas.getContext('2d')?.drawImage(staging, 0, 0);
          setRendered(true);
        })().catch(() => {
          /* Keep the geometry preview if rendering fails. */
        });
      },
      { rootMargin: '200px' },
    );
    observer.observe(canvas);
    return () => {
      cancelled = true;
      observer.disconnect();
      task?.cancel?.();
    };
  }, [pdfRef, index, page.width, page.height, page.blocks, page.forms, page.images, isXfa]);
  const [xfaShapes, setXfaShapes] = useState<PagePreviewShape[]>([]);
  useEffect(() => {
    const pdf = pdfRef.current;
    if (!isXfa || !pdf) {
      return;
    }
    let cancelled = false;
    let host: HTMLDivElement | null = document.createElement('div');
    (async () => {
      const pdfjs = await import('pdfjs-dist');
      const pdfPage = await pdf.getPage(index + 1);
      const xfaHtml = await pdfPage.getXfa();
      if (cancelled || !xfaHtml || !host) return;
      const viewport = pdfPage.getViewport({ scale: 1 }).clone({ dontFlip: true });
      host.className = 'xfaLayer xfa-thumbnail-measure';
      host.setAttribute('aria-hidden', 'true');
      Object.assign(host.style, {
        position: 'fixed',
        left: '-10000px',
        top: '0',
        width: `${viewport.width}px`,
        height: `${viewport.height}px`,
        visibility: 'hidden',
        pointerEvents: 'none',
      });
      document.body.append(host);
      pdfjs.XfaLayer.render({
        viewport,
        div: host,
        xfaHtml,
        annotationStorage: pdf.annotationStorage,
        linkService: {
          addLinkAttributes(link: HTMLAnchorElement) {
            link.href = '#';
            link.tabIndex = -1;
          },
        } as any,
        intent: 'display',
      });
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (cancelled || !host) return;
      const hostRect = host.getBoundingClientRect();
      const shapes = Array.from(
        host.querySelectorAll<HTMLElement>('.xfaField, .xfaDraw'),
      ).flatMap<PagePreviewShape>((wrapper, shapeIndex) => {
        const rect = wrapper.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return [];
        const isField = wrapper.classList.contains('xfaField');
        const kind: PagePreviewShape['kind'] = isField
          ? 'xfa-form'
          : wrapper.querySelector('.xfaImage')
            ? 'xfa-image'
            : wrapper.textContent?.trim()
              ? 'xfa-text'
              : 'xfa-shape';
        return [
          {
            id: `${kind}-${shapeIndex}`,
            kind,
            x: rect.left - hostRect.left,
            top: rect.top - hostRect.top,
            width: rect.width,
            height: rect.height,
          },
        ];
      });
      if (!cancelled) setXfaShapes(shapes.slice(0, 120));
    })()
      .catch(() => {
        if (!cancelled) setXfaShapes([]);
      })
      .finally(() => {
        host?.remove();
        host = null;
      });
    return () => {
      cancelled = true;
      host?.remove();
      host = null;
    };
  }, [index, isXfa, pdfRef]);

  const position = (item: { x: number; top: number; width: number; height: number }) => ({
    left: `${Math.max(0, Math.min(100, (item.x / page.width) * 100))}%`,
    top: `${Math.max(0, Math.min(100, (item.top / page.height) * 100))}%`,
    width: `${Math.max(0.8, Math.min(100, (item.width / page.width) * 100))}%`,
    height: `${Math.max(0.6, Math.min(100, (item.height / page.height) * 100))}%`,
  });
  const textShapes = page.blocks.filter((block) => block.str.trim()).slice(0, 42);
  const ocrShapes = addedText.filter((box) => box.ocrSource && box.text.trim()).slice(0, 60);
  const formShapes = page.forms.slice(0, 24);
  const imageShapes = page.images.slice(0, 12);
  const vectors = page.vectors
    .map((vector) => ({ ...vector, ...vectorEdits[`${index}:${vector.id}`] }))
    .filter((vector) => !vector.deleted);
  const hasDetectedLayout =
    textShapes.length + ocrShapes.length + formShapes.length + imageShapes.length + xfaShapes.length > 0;
  return (
    <button
      className={`thumbnail ${active ? 'active' : ''}`}
      onClick={onClick}
      aria-label={`Open page ${index + 1}`}
    >
      <span className="page-number">{index + 1}</span>
      <span
        className="mini-page actual page-layout-preview"
        style={{ aspectRatio: `${page.width} / ${page.height}` }}
      >
        {!isXfa && (
          <canvas
            ref={canvasRef}
            className={`thumbnail-canvas ${rendered ? 'is-ready' : ''}`}
            aria-hidden="true"
          />
        )}
        {vectors.length > 0 && (
          <svg
            className="page-preview-vectors"
            viewBox={`0 0 ${page.width} ${page.height}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {vectors.map((vector) => {
              const common = {
                fill: vector.kind === 'line' || vector.kind === 'brush' ? 'none' : vector.fill,
                stroke: vector.stroke,
                strokeWidth: Math.max(0.75, vector.strokeWidth),
                vectorEffect: 'non-scaling-stroke' as const,
              };
              if (vector.kind === 'ellipse')
                return (
                  <ellipse
                    key={vector.id}
                    cx={vector.x + vector.width / 2}
                    cy={vector.top + vector.height / 2}
                    rx={vector.width / 2}
                    ry={vector.height / 2}
                    {...common}
                  />
                );
              if (vector.kind === 'line') {
                const [start, end] = vector.points || [];
                return (
                  <line
                    key={vector.id}
                    x1={start?.x ?? vector.x}
                    y1={start?.top ?? vector.top}
                    x2={end?.x ?? vector.x + vector.width}
                    y2={end?.top ?? vector.top + vector.height}
                    {...common}
                  />
                );
              }
              if (vector.kind === 'brush')
                return (
                  <polyline
                    key={vector.id}
                    points={(vector.points || []).map((point) => `${point.x},${point.top}`).join(' ')}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    {...common}
                  />
                );
              return (
                <rect
                  key={vector.id}
                  x={vector.x}
                  y={vector.top}
                  width={vector.width}
                  height={vector.height}
                  {...common}
                />
              );
            })}
          </svg>
        )}
        {imageShapes.map((image) => (
          <span
            key={`image-${image.id}`}
            className={`page-preview-shape image ${image.width * image.height >= page.width * page.height * 0.45 ? 'page-background' : ''}`}
            style={position(image)}
          />
        ))}
        {textShapes.map((block) => (
          <span
            key={`text-${block.id}`}
            className={`page-preview-shape text ${block.bold ? 'strong' : ''}`}
            style={position(block)}
          />
        ))}
        {ocrShapes.map((box) => (
          <span
            key={`ocr-${box.id}`}
            className={`page-preview-shape ocr-text ${box.bold ? 'strong' : ''}`}
            style={position(box)}
          />
        ))}
        {formShapes.map((field) => (
          <span key={`form-${field.id}`} className="page-preview-shape form" style={position(field)} />
        ))}
        {xfaShapes.map((shape) => (
          <span key={shape.id} className={`page-preview-shape ${shape.kind}`} style={position(shape)} />
        ))}
        {!hasDetectedLayout && (
          <span className="page-preview-fallback">
            <i className="heading" />
            <i />
            <i />
            <b />
            <i />
            <i className="short" />
          </span>
        )}
      </span>
    </button>
  );
}
