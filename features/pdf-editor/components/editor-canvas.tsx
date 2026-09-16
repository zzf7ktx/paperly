'use client';

import { Fragment, type CSSProperties, type MouseEvent as ReactMouseEvent, useEffect, useState } from 'react';
import { DemoDocument } from './demo-document';
import { FormBackdropLayer } from './form-backdrop-layer';
import { TextBoxControls } from './text-box-controls';
import {
  filledRectangleAt,
  needsFormCleanup,
  needsTextCleanup,
  vectorUnderlyingColor,
} from '../lib/appearance';
import {
  areaOverlapsDeletedImage,
  imageOverlapsEditedImages,
  imageOverlapsEditedVectors,
} from '../lib/native-image';
import { browserFontFamily } from '../lib/fonts';
import { formBackdropGeometry } from '../lib/pdf-geometry';
import { ocrCoverRects } from '../lib/ocr-covers';
import { blockKey } from '../lib/text';
import type { PdfEditorController } from '../hooks/use-pdf-editor';

type Props = {
  editor: Pick<
    PdfEditorController,
    | 'uploadRef'
    | 'canvasRef'
    | 'xfaLayerRef'
    | 'canvasWrapRef'
    | 'marqueeSuppressClickRef'
    | 'scheduleXfaRuntimeRef'
    | 'pdfBytes'
    | 'isXfaDocument'
    | 'xfaStructureEdits'
    | 'xfaDrawEdits'
    | 'setSelectedXfaDrawKey'
    | 'setSelectedXfaKey'
    | 'pages'
    | 'currentPage'
    | 'zoom'
    | 'panEnabled'
    | 'hideScrollbars'
    | 'isPanning'
    | 'edits'
    | 'selected'
    | 'setSelected'
    | 'setSelectedElements'
    | 'selectionMarquee'
    | 'selectedForm'
    | 'setSelectedForm'
    | 'formChanges'
    | 'formEdits'
    | 'formBackgrounds'
    | 'addedBoxes'
    | 'addedImages'
    | 'imageEdits'
    | 'vectorEdits'
    | 'selectedVectorId'
    | 'setSelectedVectorId'
    | 'selectPdfShapes'
    | 'moveShapeContents'
    | 'draftVector'
    | 'imageCaptures'
    | 'selectedImage'
    | 'setSelectedImage'
    | 'selectedAddedId'
    | 'setSelectedAddedId'
    | 'tool'
    | 'ocrConfidenceThreshold'
    | 'ocrRegion'
    | 'snapEnabled'
    | 'snapMode'
    | 'snapAnchor'
    | 'snapGuides'
    | 'blockVisuals'
    | 'activeKey'
    | 'activeBlock'
    | 'activeEdit'
    | 'activeXfaField'
    | 'activeXfaDraw'
    | 'activeFormEdit'
    | 'activeFormLabel'
    | 'isElementSelected'
    | 'isFormOwnedVector'
    | 'relatedShapeElements'
    | 'vectorBackgroundForText'
    | 'updateElementSelection'
    | 'commit'
    | 'selectExistingBlock'
    | 'measureAddedBox'
    | 'editableTextValue'
    | 'measureAddedBoxWrappedHeight'
    | 'updateAddedBox'
    | 'fitExistingBox'
    | 'handleTextFormatShortcut'
    | 'addTextBox'
    | 'addXfaField'
    | 'addNormalFormField'
    | 'updateAddedXfaValue'
    | 'updateFormValue'
    | 'selectNormalForm'
    | 'startFormDrag'
    | 'startFormResize'
    | 'startXfaDrawDrag'
    | 'startXfaDrawResize'
    | 'startXfaDrag'
    | 'startXfaResize'
    | 'startBoxDrag'
    | 'startBoxResize'
    | 'startExistingDrag'
    | 'startExistingResize'
    | 'selectExistingImage'
    | 'startImageDrag'
    | 'startImageResize'
    | 'startOcrRegionSelection'
    | 'startVectorDrawing'
    | 'startVectorDrag'
    | 'startVectorResize'
    | 'startMarqueeSelection'
    | 'startCanvasPan'
    | 'moveCanvasPan'
    | 'stopCanvasPan'
    | 'zoomCanvasWithWheel'
  >;
};

export function EditorCanvas({ editor }: Props) {
  const {
    uploadRef,
    canvasRef,
    xfaLayerRef,
    canvasWrapRef,
    marqueeSuppressClickRef,
    scheduleXfaRuntimeRef,
    pdfBytes,
    isXfaDocument,
    xfaStructureEdits,
    xfaDrawEdits,
    setSelectedXfaDrawKey,
    setSelectedXfaKey,
    pages,
    currentPage,
    zoom,
    panEnabled,
    hideScrollbars,
    isPanning,
    edits,
    selected,
    setSelected,
    setSelectedElements,
    selectionMarquee,
    selectedForm,
    setSelectedForm,
    formChanges,
    formEdits,
    formBackgrounds,
    addedBoxes,
    addedImages,
    imageEdits,
    vectorEdits,
    selectedVectorId,
    setSelectedVectorId,
    selectPdfShapes,
    moveShapeContents,
    draftVector,
    imageCaptures,
    selectedImage,
    setSelectedImage,
    selectedAddedId,
    setSelectedAddedId,
    tool,
    ocrConfidenceThreshold,
    ocrRegion,
    snapEnabled,
    snapMode,
    snapAnchor,
    snapGuides,
    blockVisuals,
    activeKey,
    activeBlock,
    activeEdit,
    activeXfaField,
    activeXfaDraw,
    activeFormEdit,
    activeFormLabel,
    isElementSelected,
    isFormOwnedVector,
    relatedShapeElements,
    vectorBackgroundForText,
    updateElementSelection,
    commit,
    selectExistingBlock,
    measureAddedBox,
    editableTextValue,
    measureAddedBoxWrappedHeight,
    updateAddedBox,
    fitExistingBox,
    handleTextFormatShortcut,
    addTextBox,
    addXfaField,
    addNormalFormField,
    updateAddedXfaValue,
    updateFormValue,
    selectNormalForm,
    startFormDrag,
    startFormResize,
    startXfaDrawDrag,
    startXfaDrawResize,
    startXfaDrag,
    startXfaResize,
    startBoxDrag,
    startBoxResize,
    startExistingDrag,
    startExistingResize,
    selectExistingImage,
    startImageDrag,
    startImageResize,
    startOcrRegionSelection,
    startVectorDrawing,
    startVectorDrag,
    startVectorResize,
    startMarqueeSelection,
    startCanvasPan,
    moveCanvasPan,
    stopCanvasPan,
    zoomCanvasWithWheel,
  } = editor;
  const [canvasDraftVector, setCanvasDraftVector] = useState(draftVector);

  useEffect(() => {
    const updateDraft = (event: Event) =>
      setCanvasDraftVector((event as CustomEvent<typeof draftVector>).detail);
    window.addEventListener('paperly-draft-vector', updateDraft);
    return () => window.removeEventListener('paperly-draft-vector', updateDraft);
  }, []);
  const selectGraphicAtPointer = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (tool !== 'select' || panEnabled || marqueeSuppressClickRef.current) return;
    const target = event.target as Element;
    if (target.closest('button,.pdf-form-control,.xfaLayer,.xfa-edit-layer')) return;
    const candidates = document
      .elementsFromPoint(event.clientX, event.clientY)
      .map((element) => element.closest<HTMLElement>('[data-graphic-kind][data-graphic-id]'))
      .filter(
        (element, index, elements): element is HTMLElement =>
          Boolean(element) && elements.indexOf(element) === index,
      );
    if (!candidates.length || target.closest('[contenteditable="true"]')) return;
    let chosen = candidates.reduce((smallest, candidate) =>
      Number(candidate.dataset.graphicArea) < Number(smallest.dataset.graphicArea) ? candidate : smallest,
    );
    if (chosen.dataset.graphicKind === 'image' && !chosen.dataset.graphicId?.startsWith('ocr-image-')) {
      const addedVectors = [
        ...event.currentTarget.querySelectorAll<HTMLElement>('[data-graphic-added="true"]'),
      ].filter((element) => {
        const bounds = element.getBoundingClientRect();
        return (
          event.clientX >= bounds.left &&
          event.clientX <= bounds.right &&
          event.clientY >= bounds.top &&
          event.clientY <= bounds.bottom
        );
      });
      if (addedVectors.length)
        chosen = addedVectors.reduce((smallest, candidate) =>
          Number(candidate.dataset.graphicArea) < Number(smallest.dataset.graphicArea) ? candidate : smallest,
        );
    }
    const kind = chosen.dataset.graphicKind;
    const id = chosen.dataset.graphicId!;
    event.preventDefault();
    event.stopPropagation();
    if (kind === 'vector') {
      const vector = pages[currentPage].vectors.find((entry) => entry.id === id);
      if (!vector) return;
      if (moveShapeContents && !event.shiftKey) setSelectedElements(relatedShapeElements(currentPage, [id]));
      else updateElementSelection({ page: currentPage, kind: 'vector', id }, event.shiftKey);
      setSelectedVectorId(id);
      setSelected(null);
      setSelectedForm(null);
      setSelectedAddedId(null);
      setSelectedImage(null);
      return;
    }
    if (kind === 'image') {
      const image = pages[currentPage].images.find((entry) => entry.id === id);
      if (image) selectExistingImage(image, event.shiftKey);
      return;
    }
    const image = addedImages.find((entry) => entry.page === currentPage && entry.id === id);
    if (!image) return;
    updateElementSelection({ page: currentPage, kind: 'added-image', id }, event.shiftKey);
    setSelectedImage({ kind: 'added', id });
    setSelected(null);
    setSelectedAddedId(null);
    setSelectedForm(null);
  };
  return (
    <div
      ref={canvasWrapRef}
      className={`canvas-wrap ${panEnabled ? 'pan-mode' : ''} ${isPanning ? 'is-panning' : ''} ${hideScrollbars ? 'hide-scrollbars' : ''}`}
      onPointerDownCapture={startCanvasPan}
      onPointerMove={moveCanvasPan}
      onPointerUp={stopCanvasPan}
      onPointerCancel={stopCanvasPan}
      onWheel={zoomCanvasWithWheel}
    >
      {pdfBytes && panEnabled && (
        <div className="canvas-pan-hint" role="status">
          <span>
            <b>Pan mode</b> · Drag anywhere to move around · Scroll to zoom
          </span>
        </div>
      )}
      {!pdfBytes ? (
        <DemoDocument />
      ) : (
        pages[currentPage] && (
          <div
            className={`live-page ${tool === 'add-text' ? 'placing-text' : ''} ${tool === 'add-xfa' ? 'placing-xfa' : ''} ${tool === 'add-form' ? 'placing-form' : ''} ${tool === 'ocr-region' ? 'placing-ocr' : ''} ${tool.startsWith('draw-') ? 'placing-vector' : ''}`}
            onClickCapture={selectGraphicAtPointer}
            onPointerDown={(event) => {
              startMarqueeSelection(event);
              startOcrRegionSelection(event);
              startVectorDrawing(event);
            }}
            onClick={(event) => {
              addTextBox(event);
              addXfaField(event);
              addNormalFormField(event);
            }}
            style={{ width: pages[currentPage].width * zoom, height: pages[currentPage].height * zoom }}
          >
            <canvas ref={canvasRef} />
            <div className="text-cleanup-layer" aria-hidden="true">
              {pages[currentPage].blocks.map((block) => {
                const edit = edits[blockKey(currentPage, block.id)];
                if (!edit || !needsTextCleanup(block, edit)) return null;
                const cleanupBackground = edit.vectorGroupMove
                  ? '#ffffff'
                  : vectorBackgroundForText(currentPage, block) ||
                    blockVisuals[blockKey(currentPage, block.id)]?.background ||
                    '#ffffff';
                return (
                  <span
                    key={block.id}
                    className="text-block-eraser"
                    style={{
                      left: Math.max(0, block.x * zoom - 1),
                      top: Math.max(0, block.top * zoom - 1),
                      width: Math.max(block.width * zoom + 3, 4),
                      height: Math.max(block.height, block.fontSize) * zoom + 4,
                      backgroundColor: cleanupBackground,
                    }}
                  />
                );
              })}
            </div>
            <svg
              className={`vector-layer ${selectedVectorId ? 'has-selection' : ''} ${pages[currentPage].images.some((image) => imageEdits[`${currentPage}:${image.id}`]?.deleted) ? 'above-image-cleanup' : ''}`}
              viewBox={`0 0 ${pages[currentPage].width} ${pages[currentPage].height}`}
              aria-label="Editable vector shapes"
            >
              {pages[currentPage].vectors.map((vector) => {
                if (isFormOwnedVector(currentPage, vector)) return null;
                const edit = vectorEdits[`${currentPage}:${vector.id}`] || {};
                const changed = !vector.added && Object.keys(edit).some((property) => property !== 'deleted');
                if (vector.added || (!changed && !edit.deleted)) return null;
                const eraseFill = vectorUnderlyingColor(
                  pages[currentPage].vectors,
                  vector,
                  vectorEdits,
                  currentPage,
                );
                const eraseLeft = Math.max(0, vector.x - 1);
                const eraseTop = Math.max(0, vector.top - 1);
                const eraseRight = Math.min(pages[currentPage].width, vector.x + vector.width + 1);
                const eraseBottom = Math.min(pages[currentPage].height, vector.top + vector.height + 1);
                return vector.kind === 'polygon' && vector.svgPath ? (
                  <path
                    key={`erase-${vector.id}`}
                    d={vector.svgPath}
                    transform={`translate(${vector.x} ${vector.top})`}
                    fill={eraseFill}
                    stroke={eraseFill}
                    strokeWidth={0.4}
                  />
                ) : eraseRight > eraseLeft && eraseBottom > eraseTop ? (
                  <rect
                    key={`erase-${vector.id}`}
                    x={eraseLeft}
                    y={eraseTop}
                    width={eraseRight - eraseLeft}
                    height={eraseBottom - eraseTop}
                    fill={eraseFill}
                  />
                ) : null;
              })}
              {pages[currentPage].images.map((image) => {
                const key = `${currentPage}:${image.id}`;
                const capture = imageCaptures[key];
                if (
                  !capture ||
                  Object.keys(imageEdits[key] || {}).length ||
                  !imageOverlapsEditedVectors(image, pages[currentPage], currentPage, vectorEdits)
                )
                  return null;
                return (
                  <image
                    key={`restore-${image.id}`}
                    href={capture}
                    x={image.x}
                    y={image.top}
                    width={image.width}
                    height={image.height}
                    pointerEvents="none"
                  />
                );
              })}
              {[...pages[currentPage].vectors, ...(canvasDraftVector ? [canvasDraftVector] : [])].map(
                (vector) => {
                  const key = `${currentPage}:${vector.id}`;
                  const edit = vectorEdits[key] || {};
                  if (edit.deleted) return null;
                  const x = edit.x ?? vector.x;
                  const top = edit.top ?? vector.top;
                  const width = edit.width ?? vector.width;
                  const height = edit.height ?? vector.height;
                  const fill = edit.fill ?? vector.fill;
                  const stroke = edit.stroke ?? vector.stroke;
                  const strokeWidth = edit.strokeWidth ?? vector.strokeWidth;
                  const changed =
                    vector.added ||
                    canvasDraftVector?.id === vector.id ||
                    Object.keys(edit).some((property) => property !== 'deleted');
                  const selectedVector = selectedVectorId === vector.id;
                  const pageBackdrop =
                    !vector.added &&
                    vector.width >= pages[currentPage].width * 0.98 &&
                    vector.height >= pages[currentPage].height * 0.98;
                  const formOwnedVector = isFormOwnedVector(currentPage, vector);
                  const selectShape = (event: ReactMouseEvent<SVGElement>) => {
                    if (marqueeSuppressClickRef.current) return;
                    if (formOwnedVector || (!vector.added && !selectPdfShapes)) return;
                    if (!selectPdfShapes) event.stopPropagation();
                    if (moveShapeContents && !event.shiftKey)
                      setSelectedElements(relatedShapeElements(currentPage, [vector.id]));
                    else
                      updateElementSelection(
                        { page: currentPage, kind: 'vector', id: vector.id },
                        event.shiftKey,
                      );
                    setSelectedVectorId(vector.id);
                    setSelected(null);
                    setSelectedForm(null);
                    setSelectedAddedId(null);
                    setSelectedImage(null);
                  };
                  const selectableShape = Boolean(
                    !formOwnedVector &&
                    (vector.added || (selectPdfShapes && !pageBackdrop) || selectedVector),
                  );
                  const common = {
                    className: selectableShape ? 'editable-vector' : undefined,
                    'data-graphic-kind': selectableShape ? 'vector' : undefined,
                    'data-graphic-id': selectableShape ? vector.id : undefined,
                    'data-graphic-area': selectableShape ? Math.max(width * height, 1) : undefined,
                    'data-graphic-added': selectableShape && vector.added ? 'true' : undefined,
                    onClick: selectShape,
                    style: {
                      pointerEvents: selectableShape ? ('all' as const) : ('none' as const),
                      cursor: selectableShape ? 'pointer' : 'default',
                    },
                    opacity: changed && !formOwnedVector ? (edit.opacity ?? vector.opacity ?? 1) : 0,
                  };
                  const renderedPoints = (vector.points || []).map((point) => ({
                    x: x + ((point.x - vector.x) * width) / Math.max(1, vector.width),
                    top: top + ((point.top - vector.top) * height) / Math.max(1, vector.height),
                  }));
                  const lineStart = renderedPoints[0];
                  const lineEnd = renderedPoints[renderedPoints.length - 1];
                  return (
                    <Fragment key={vector.id}>
                      {vector.kind === 'polygon' && vector.svgPath ? (
                        <path
                          {...common}
                          d={vector.svgPath}
                          transform={`translate(${x} ${top}) scale(${width / Math.max(0.5, vector.width)} ${height / Math.max(0.5, vector.height)})`}
                          fill={fill}
                          stroke={stroke}
                          strokeWidth={strokeWidth}
                        />
                      ) : vector.kind === 'ellipse' ? (
                        <ellipse
                          {...common}
                          cx={x + width / 2}
                          cy={top + height / 2}
                          rx={width / 2}
                          ry={height / 2}
                          fill={fill}
                          stroke={stroke}
                          strokeWidth={strokeWidth}
                        />
                      ) : vector.kind === 'line' ? (
                        <line
                          {...common}
                          x1={lineStart?.x ?? x}
                          y1={lineStart?.top ?? top}
                          x2={lineEnd?.x ?? x + width}
                          y2={lineEnd?.top ?? top + height}
                          stroke={stroke}
                          strokeWidth={Math.max(strokeWidth, changed ? strokeWidth : 8)}
                        />
                      ) : vector.kind === 'brush' ? (
                        <polyline
                          {...common}
                          points={renderedPoints.map((point) => `${point.x},${point.top}`).join(' ')}
                          fill="none"
                          stroke={stroke}
                          strokeWidth={strokeWidth}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ) : (
                        <rect
                          {...common}
                          x={x}
                          y={top}
                          width={width}
                          height={height}
                          fill={fill}
                          stroke={stroke}
                          strokeWidth={strokeWidth}
                        />
                      )}
                      {selectedVector && !formOwnedVector && (
                        <foreignObject
                          x={x}
                          y={top}
                          width={Math.max(width, 1)}
                          height={Math.max(height, 1)}
                          className={`vector-selection-object ${pageBackdrop ? 'page-backdrop-selection' : ''} ${x * zoom < 22 ? 'edge-left' : ''}`}
                        >
                          <div className="vector-selection-box">
                            <button
                              className="vector-drag-handle"
                              onPointerDown={(event) => startVectorDrag(event, vector)}
                            >
                              ⠿
                            </button>
                            <button
                              className="vector-resize-handle"
                              onPointerDown={(event) => startVectorResize(event, vector)}
                            />
                          </div>
                        </foreignObject>
                      )}
                    </Fragment>
                  );
                },
              )}
            </svg>
            {isXfaDocument && (
              <div ref={xfaLayerRef} aria-label={`Interactive XFA form on page ${currentPage + 1}`} />
            )}
            <div className="image-layer" aria-label={`Images on page ${currentPage + 1}`}>
              {pages[currentPage].images.map((image) => {
                const key = `${currentPage}:${image.id}`;
                const edit = imageEdits[key];
                const changed =
                  edit?.x !== undefined ||
                  edit?.top !== undefined ||
                  edit?.width !== undefined ||
                  edit?.height !== undefined;
                const isPrimary = selectedImage?.kind === 'existing' && selectedImage.id === image.id;
                const isSelected = isPrimary || isElementSelected('image', image.id);
                const left = (edit?.x ?? image.x) * zoom;
                const top = (edit?.top ?? image.top) * zoom;
                return (
                  <Fragment key={image.id}>
                    {(changed || edit?.deleted) && (
                      <span
                        className="pdf-image-eraser"
                        style={{
                          left: image.x * zoom - 1,
                          top: image.top * zoom - 1,
                          width: image.width * zoom + 2,
                          height: image.height * zoom + 3,
                          backgroundColor:
                            filledRectangleAt(
                              pages[currentPage].vectors,
                              image.x + image.width / 2,
                              image.top + image.height / 2,
                              vectorEdits,
                              currentPage,
                            ) ||
                            edit?.eraseColor ||
                            '#ffffff',
                        }}
                      />
                    )}
                    <div
                      className={`pdf-image-box existing ${isSelected ? 'is-selected' : ''} ${left < 22 ? 'edge-left' : ''} ${edit?.deleted ? 'is-deleted' : ''}`}
                      data-graphic-kind="image"
                      data-graphic-id={image.id}
                      data-graphic-area={Math.max(
                        (edit?.width ?? image.width) * (edit?.height ?? image.height),
                        1,
                      )}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!marqueeSuppressClickRef.current) selectExistingImage(image, event.shiftKey);
                      }}
                      style={{
                        left,
                        top,
                        width: (edit?.width ?? image.width) * zoom,
                        height: (edit?.height ?? image.height) * zoom,
                      }}
                    >
                      {!edit?.deleted &&
                        (image.dataUrl || imageCaptures[key]) &&
                        (changed ||
                          image.id.startsWith('ocr-image-') ||
                          imageOverlapsEditedImages(image, pages[currentPage], currentPage, imageEdits)) && (
                          <img
                            src={image.dataUrl || imageCaptures[key]}
                            alt="Edited PDF image"
                            draggable={false}
                          />
                        )}
                      {edit?.deleted && <span className="image-deleted-label">Deleted image</span>}
                      {isPrimary && !edit?.deleted && (
                        <>
                          <button
                            className="image-drag-handle"
                            aria-label="Move existing image"
                            onPointerDown={(event) => startImageDrag(event, 'existing', image)}
                          >
                            ⠿
                          </button>
                          <button
                            className="image-resize-handle"
                            aria-label="Resize existing image"
                            onPointerDown={(event) => startImageResize(event, 'existing', image)}
                          />
                        </>
                      )}
                    </div>
                  </Fragment>
                );
              })}
              {addedImages
                .filter((image) => image.page === currentPage)
                .map((image) => {
                  const isPrimary = selectedImage?.kind === 'added' && selectedImage.id === image.id;
                  const isSelected = isPrimary || isElementSelected('added-image', image.id);
                  return (
                    <div
                      key={image.id}
                      className={`pdf-image-box added ${isSelected ? 'is-selected' : ''} ${image.x * zoom < 22 ? 'edge-left' : ''}`}
                      data-graphic-kind="added-image"
                      data-graphic-id={image.id}
                      data-graphic-area={Math.max(image.width * image.height, 1)}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (marqueeSuppressClickRef.current) return;
                        updateElementSelection(
                          { page: currentPage, kind: 'added-image', id: image.id },
                          event.shiftKey,
                        );
                        setSelectedImage({ kind: 'added', id: image.id });
                        setSelected(null);
                        setSelectedAddedId(null);
                        setSelectedForm(null);
                      }}
                      style={{
                        left: image.x * zoom,
                        top: image.top * zoom,
                        width: image.width * zoom,
                        height: image.height * zoom,
                      }}
                    >
                      <img src={image.dataUrl} alt={image.name} draggable={false} />
                      {isPrimary && (
                        <>
                          <button
                            className="image-drag-handle"
                            aria-label="Move added image"
                            onPointerDown={(event) => startImageDrag(event, 'added', image)}
                          >
                            ⠿
                          </button>
                          <button
                            className="image-resize-handle"
                            aria-label="Resize added image"
                            onPointerDown={(event) => startImageResize(event, 'added', image)}
                          />
                        </>
                      )}
                    </div>
                  );
                })}
            </div>
            <div
              className={`text-layer ${activeFormLabel && activeFormEdit?.moveLabel !== false ? 'above-form-cleanup' : ''}`}
              aria-label={`Editable text on page ${currentPage + 1}`}
              onBlurCapture={(event) => {
                if (
                  !activeKey ||
                  !activeBlock ||
                  !activeEdit?.autoFit ||
                  !(event.target instanceof HTMLElement) ||
                  !event.target.classList.contains('text-block')
                )
                  return;
                const text = editableTextValue(event.target);
                window.setTimeout(() => fitExistingBox(activeKey, activeBlock, text), 0);
              }}
            >
              {pages[currentPage].blocks.map((block) => {
                const key = blockKey(currentPage, block.id);
                const edit = edits[key];
                const isPrimary = selected === block.id;
                const isSelected = isPrimary || isElementSelected('text', String(block.id));
                const isLinkedFormLabel =
                  selectedForm?.labelBlockId === block.id && activeFormEdit?.moveLabel !== false;
                const visual = blockVisuals[key];
                const cleanupBackground =
                  vectorBackgroundForText(currentPage, block) || visual?.background || '#ffffff';
                const drawX = edit?.x ?? block.x;
                const drawTop = edit?.top ?? block.top;
                const moved = edit?.x !== undefined || edit?.top !== undefined;
                const geometryChanged = moved || edit?.width !== undefined || edit?.height !== undefined;
                const hasRenderedEdit =
                  moved ||
                  Boolean(
                    edit &&
                    (edit.deleted ||
                      edit.text !== block.str ||
                      edit.font !== undefined ||
                      edit.size !== undefined ||
                      edit.fontWeight !== undefined ||
                      edit.color !== undefined ||
                      edit.bold !== undefined ||
                      edit.italic !== undefined ||
                      edit.underline !== undefined ||
                      edit.strike !== undefined ||
                      edit.alignment !== undefined ||
                      edit.width !== undefined ||
                      edit.height !== undefined),
                  );
                const displayTop =
                  drawTop + (block.editorTop - block.top) + block.fontSize * 0.025 + (moved ? 1 / zoom : 0);
                const horizontalScale = edit?.font ? 1 : block.horizontalScale;
                const visualWidth = edit?.width ?? block.width;
                const visualHeight = edit?.height ?? block.height;
                const editorWidth = Math.max((visualWidth * zoom) / horizontalScale, 3);
                const editorHeight = visualHeight * zoom;
                return (
                  <Fragment key={block.id}>
                    <span
                      className={`text-block ${isSelected ? 'is-selected' : ''} ${isLinkedFormLabel ? 'is-form-linked-label' : ''} ${hasRenderedEdit ? 'is-edited' : ''} ${geometryChanged ? 'is-moved' : ''} ${edit?.deleted ? 'is-deleted' : ''}`}
                      contentEditable={!edit?.deleted}
                      suppressContentEditableWarning
                      spellCheck
                      onKeyDown={(event) =>
                        handleTextFormatShortcut(
                          event,
                          {
                            bold: (edit?.fontWeight ?? ((edit?.bold ?? block.bold) ? 700 : 400)) !== 400,
                            italic: edit?.italic ?? block.italic,
                            underline: edit?.underline || false,
                            strike: edit?.strike || false,
                          },
                          (format, enabled) =>
                            format === 'bold'
                              ? commit(key, { bold: enabled, fontWeight: enabled ? 700 : 400 })
                              : commit(key, { [format]: enabled }),
                        )
                      }
                      onPointerDown={(event) => {
                        if (event.shiftKey) {
                          event.preventDefault();
                          window.getSelection()?.removeAllRanges();
                        }
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        selectExistingBlock(block, event.shiftKey);
                      }}
                      onInput={(event) => {
                        const text = editableTextValue(event.currentTarget);
                        const liveHeight = Math.max(
                          visualHeight,
                          event.currentTarget.scrollHeight / zoom,
                          Math.max(1, text.split('\n').length) * (edit?.size || block.fontSize) * 1.2,
                        );
                        event.currentTarget.dataset.paperlyHeight = String(liveHeight);
                        event.currentTarget.style.height = `${liveHeight * zoom}px`;
                        const resizeHandle = event.currentTarget.parentElement?.querySelector<HTMLElement>(
                          `[data-existing-resize-key="${CSS.escape(key)}"]`,
                        );
                        if (resizeHandle)
                          resizeHandle.style.top = `${(displayTop + liveHeight) * zoom - 6}px`;
                        if (!hasRenderedEdit) {
                          event.currentTarget.style.color = visual?.color || '#111111';
                          event.currentTarget.style.backgroundColor = cleanupBackground;
                        }
                      }}
                      onBlur={(event) => {
                        if (edit?.deleted) return;
                        const text = editableTextValue(event.currentTarget);
                        const liveHeight = Number(event.currentTarget.dataset.paperlyHeight);
                        commit(key, {
                          text,
                          ...(text.includes('\n') || edit?.width !== undefined || edit?.height !== undefined
                            ? {
                                width: visualWidth,
                                height:
                                  Number.isFinite(liveHeight) && liveHeight > 0 ? liveHeight : visualHeight,
                              }
                            : {}),
                        });
                      }}
                      style={{
                        left: drawX * zoom,
                        top: displayTop * zoom,
                        width: editorWidth,
                        minWidth: editorWidth,
                        height: editorHeight,
                        fontSize: (edit?.size || block.fontSize) * zoom,
                        fontFamily: edit?.font ? browserFontFamily(edit.font) : block.cssFont,
                        fontWeight:
                          edit?.fontWeight === 500 || edit?.fontWeight === 600
                            ? 400
                            : (edit?.fontWeight ?? ((edit?.bold ?? block.bold) ? 700 : 400)),
                        WebkitTextStroke:
                          edit?.fontWeight === 500
                            ? `${0.14 * zoom}px currentColor`
                            : edit?.fontWeight === 600
                              ? `${0.28 * zoom}px currentColor`
                              : undefined,
                        fontStyle: (edit?.italic ?? block.italic) ? 'italic' : 'normal',
                        letterSpacing: 0,
                        lineHeight:
                          edit?.text.includes('\n') || edit?.width !== undefined || edit?.height !== undefined
                            ? 1.2
                            : 1,
                        whiteSpace: 'pre-wrap',
                        textAlign: edit?.alignment || 'left',
                        textDecoration:
                          `${edit?.underline ? 'underline ' : ''}${edit?.strike ? 'line-through' : ''}`.trim() ||
                          'none',
                        transform: horizontalScale === 1 ? undefined : `scaleX(${horizontalScale})`,
                        backgroundColor:
                          hasRenderedEdit && !geometryChanged ? cleanupBackground : 'transparent',
                        color: hasRenderedEdit ? edit?.color || visual?.color || '#111111' : 'transparent',
                        caretColor: edit?.color || visual?.color || '#111111',
                      }}
                    >
                      {edit?.deleted ? '' : (edit?.text ?? block.str)}
                    </span>
                    {isPrimary && !edit?.deleted && (
                      <TextBoxControls
                        mode="page"
                        x={drawX}
                        top={displayTop}
                        width={visualWidth}
                        height={visualHeight}
                        zoom={zoom}
                        resizeKey={key}
                        onMove={(event) => startExistingDrag(event, block)}
                        onResize={(event) => startExistingResize(event, block)}
                      />
                    )}
                  </Fragment>
                );
              })}
            </div>
            {snapGuides.x !== undefined && (
              <span className="snap-guide vertical" style={{ left: snapGuides.x * zoom }} />
            )}
            {snapGuides.y !== undefined && (
              <span className="snap-guide horizontal" style={{ top: snapGuides.y * zoom }} />
            )}
            <div className="added-text-layer">
              {addedBoxes
                .filter((box) => box.page === currentPage)
                .map((box) => {
                  const isPrimary = selectedAddedId === box.id;
                  const isSelected = isPrimary || isElementSelected('added-text', box.id);
                  const sourceScanDeleted =
                    box.ocrSource &&
                    areaOverlapsDeletedImage(
                      {
                        x: box.ocrOriginalX ?? box.x,
                        top: box.ocrOriginalTop ?? box.top,
                        width: box.ocrOriginalWidth ?? box.width,
                        height: box.ocrOriginalHeight ?? box.height,
                      },
                      pages[currentPage],
                      currentPage,
                      imageEdits,
                    );
                  return (
                    <div
                      key={box.id}
                      className={`added-text-box ${box.ocrSource ? 'ocr-text-box' : ''} ${(box.ocrConfidence ?? 100) < ocrConfidenceThreshold ? 'low-confidence' : ''} ${isSelected ? 'is-selected' : ''}`}
                      onPointerDown={(event) => {
                        if (event.shiftKey) {
                          event.preventDefault();
                          window.getSelection()?.removeAllRanges();
                        }
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        updateElementSelection(
                          { page: currentPage, kind: 'added-text', id: box.id },
                          event.shiftKey,
                        );
                        setSelectedAddedId(box.id);
                        setSelected(null);
                        setSelectedForm(null);
                        setSelectedImage(null);
                      }}
                      style={{
                        left: box.x * zoom,
                        top: box.top * zoom,
                        width: box.width * zoom,
                        minHeight: box.height * zoom,
                        backgroundColor: box.ocrSource ? undefined : box.ocrBackground || undefined,
                      }}
                    >
                      {box.ocrSource &&
                        !sourceScanDeleted &&
                        ocrCoverRects(box, pages[currentPage].vectors, vectorEdits).map((piece, index) => (
                          <span
                            key={index}
                            className="ocr-background-cover"
                            aria-hidden="true"
                            style={{
                              left: ((box.ocrOriginalX ?? box.x) - box.x + piece.x) * zoom,
                              top: ((box.ocrOriginalTop ?? box.top) - box.top + piece.top) * zoom,
                              width: piece.width * zoom,
                              height: piece.height * zoom,
                              backgroundColor: box.ocrBackground || '#ffffff',
                              backgroundImage: box.ocrBackgroundImage
                                ? `url(${box.ocrBackgroundImage})`
                                : undefined,
                              backgroundSize: `${(box.ocrOriginalWidth ?? box.width) * zoom}px ${(box.ocrOriginalHeight ?? box.height) * zoom}px`,
                              backgroundPosition: `${-piece.x * zoom}px ${-piece.top * zoom}px`,
                            }}
                          />
                        ))}
                      {isPrimary && (
                        <TextBoxControls
                          mode="local"
                          x={box.x}
                          top={box.top}
                          width={box.width}
                          height={box.height}
                          zoom={zoom}
                          onMove={(event) => startBoxDrag(event, box)}
                          onResize={(event) => startBoxResize(event, box)}
                        />
                      )}
                      <div
                        className="added-text-content"
                        contentEditable
                        suppressContentEditableWarning
                        spellCheck
                        onFocus={() => {
                          setSelectedAddedId(box.id);
                          setSelected(null);
                          setSelectedForm(null);
                        }}
                        onKeyDown={(event) =>
                          handleTextFormatShortcut(
                            event,
                            {
                              bold: box.bold,
                              italic: box.italic,
                              underline: box.underline,
                              strike: box.strike,
                            },
                            (format, enabled) =>
                              updateAddedBox(
                                box.id,
                                format === 'bold'
                                  ? {
                                      bold: enabled,
                                      ocrFontWeight: enabled ? 700 : undefined,
                                      ocrTextStroke: undefined,
                                    }
                                  : { [format]: enabled },
                              ),
                          )
                        }
                        onInput={(event) => {
                          const text = editableTextValue(event.currentTarget);
                          const dimensions = measureAddedBox({ ...box, text });
                          const height = box.autoFit
                            ? dimensions.height
                            : Math.max(box.height, measureAddedBoxWrappedHeight(box, text));
                          const width = box.autoFit ? dimensions.width : box.width;
                          event.currentTarget.dataset.paperlyHeight = String(height);
                          const container = event.currentTarget.parentElement;
                          if (container) {
                            const keepAnchor = box.autoFit && snapEnabled && snapAnchor !== 'start';
                            const anchorDelta = (before: number, after: number) =>
                              snapAnchor === 'center' ? (before - after) / 2 : before - after;
                            container.style.width = `${width * zoom}px`;
                            container.style.minHeight = `${height * zoom}px`;
                            if (keepAnchor)
                              container.style.left = `${(box.x + anchorDelta(box.width, width)) * zoom}px`;
                            if (keepAnchor && snapMode === 'box')
                              container.style.top = `${(box.top + anchorDelta(box.height, height)) * zoom}px`;
                          }
                        }}
                        onBlur={(event) => {
                          const height = Number(event.currentTarget.dataset.paperlyHeight);
                          updateAddedBox(box.id, {
                            text: editableTextValue(event.currentTarget),
                            ...(Number.isFinite(height) && height > 0 ? { height } : {}),
                          });
                        }}
                        style={{
                          fontFamily: browserFontFamily(box.font),
                          fontSize: box.size * zoom,
                          fontWeight: box.bold ? (box.ocrFontWeight ?? 700) : 400,
                          fontStyle: box.italic ? 'italic' : 'normal',
                          WebkitTextStroke:
                            box.bold && box.ocrTextStroke
                              ? `${box.ocrTextStroke * zoom}px currentColor`
                              : undefined,
                          lineHeight: box.ocrSource ? 1 : undefined,
                          whiteSpace: box.ocrSource ? 'pre' : undefined,
                          transform: box.ocrSource ? 'translateY(-.12em)' : undefined,
                          textAlign: box.alignment,
                          textDecoration:
                            `${box.underline ? 'underline ' : ''}${box.strike ? 'line-through' : ''}`.trim() ||
                            'none',
                          color: box.color,
                        }}
                      >
                        {box.text}
                      </div>
                      {isPrimary && (
                        <span className="box-size">
                          {Math.round(box.width)} × {Math.round(box.height)}
                        </span>
                      )}
                      {box.ocrSource && (box.ocrConfidence ?? 100) < ocrConfidenceThreshold && (
                        <span className="ocr-confidence" title="Review this OCR text">
                          {Math.round(box.ocrConfidence || 0)}%
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
            <div className="form-cleanup-layer" aria-hidden="true">
              {pages[currentPage].forms.map((field) => {
                const key = `${currentPage}:${field.id}`;
                const edit = formEdits[key] || {};
                if (!needsFormCleanup(field, edit)) return null;
                const backdrop = formBackdropGeometry(field);
                return (
                  <span
                    key={field.id}
                    style={{
                      left: backdrop.x * zoom - 2,
                      top: backdrop.top * zoom - 2,
                      width: backdrop.width * zoom + 4,
                      height: backdrop.height * zoom + 4,
                      backgroundColor: edit.eraseColor || formBackgrounds[key] || '#ffffff',
                    }}
                  />
                );
              })}
            </div>
            <div className="form-layer" aria-label={`PDF form fields on page ${currentPage + 1}`}>
              {pages[currentPage].forms.map((field) => {
                const currentValue = formChanges[field.name] ?? field.value;
                const isPrimary = selectedForm?.id === field.id;
                const isSelected = isPrimary || isElementSelected('form', field.id);
                const key = `${currentPage}:${field.id}`;
                const edit = formEdits[key] || {};
                const selectField = (additive = false) => selectNormalForm(field, additive);
                const maskOriginal = needsFormCleanup(field, edit);
                const geometryStyle: CSSProperties = {
                  left: (edit.x ?? field.x) * zoom,
                  top: (edit.top ?? field.top) * zoom,
                  width: (edit.width ?? field.width) * zoom,
                  height: (edit.height ?? field.height) * zoom,
                };
                const hasEditedFrame =
                  edit.backgroundColor !== undefined ||
                  edit.borderColor !== undefined ||
                  edit.borderWidth !== undefined;
                const useCapturedAppearance = Boolean(
                  field.backdrop && maskOriginal && !field.added && !hasEditedFrame && !edit.deleted,
                );
                const fieldStyle: CSSProperties = {
                  ...geometryStyle,
                  fontSize: (edit.fontSize ?? field.fontSize ?? 11) * zoom,
                  fontFamily: browserFontFamily(edit.font || field.font || 'Helvetica'),
                  color: edit.color || field.color || '#111111',
                  backgroundColor: edit.backgroundColor || field.backgroundColor || '#ffffff',
                  borderColor: edit.borderColor || field.borderColor || '#949b98',
                  borderWidth: (edit.borderWidth ?? field.borderWidth ?? 1) * zoom,
                  textAlign: edit.alignment || field.alignment || 'left',
                };
                let control;
                const capturedClass = '';
                if (field.kind === 'text' && field.multiline)
                  control = (
                    <textarea
                      className={`pdf-form-control pdf-form-text multiline ${capturedClass} ${isSelected ? 'is-selected' : ''}`}
                      aria-label={field.name}
                      title={field.name}
                      readOnly={field.readOnly}
                      required={field.required}
                      maxLength={field.maxLength}
                      value={String(currentValue)}
                      onClick={(event) => {
                        event.stopPropagation();
                        selectField(event.shiftKey);
                      }}
                      onChange={(event) => updateFormValue(field.name, event.target.value)}
                      style={fieldStyle}
                    />
                  );
                else if (field.kind === 'text')
                  control = (
                    <input
                      className={`pdf-form-control pdf-form-text ${capturedClass} ${isSelected ? 'is-selected' : ''}`}
                      aria-label={field.name}
                      title={field.name}
                      type="text"
                      readOnly={field.readOnly}
                      required={field.required}
                      maxLength={field.maxLength}
                      value={String(currentValue)}
                      onClick={(event) => {
                        event.stopPropagation();
                        selectField(event.shiftKey);
                      }}
                      onChange={(event) => updateFormValue(field.name, event.target.value)}
                      style={fieldStyle}
                    />
                  );
                else if (field.kind === 'checkbox')
                  control = (
                    <input
                      className={`pdf-form-control pdf-form-checkbox ${capturedClass} ${isSelected ? 'is-selected' : ''}`}
                      aria-label={field.name}
                      title={field.name}
                      type="checkbox"
                      disabled={field.readOnly}
                      required={field.required}
                      checked={Boolean(currentValue)}
                      onClick={(event) => {
                        event.stopPropagation();
                        selectField(event.shiftKey);
                      }}
                      onChange={(event) => updateFormValue(field.name, event.target.checked)}
                      style={fieldStyle}
                    />
                  );
                else if (field.kind === 'choice')
                  control = (
                    <select
                      className={`pdf-form-control pdf-form-choice ${capturedClass} ${isSelected ? 'is-selected' : ''}`}
                      aria-label={field.name}
                      title={field.name}
                      disabled={field.readOnly}
                      required={field.required}
                      value={String(currentValue)}
                      onClick={(event) => {
                        event.stopPropagation();
                        selectField(event.shiftKey);
                      }}
                      onChange={(event) => updateFormValue(field.name, event.target.value)}
                      style={fieldStyle}
                    >
                      {!field.options?.some((option) => option.value === String(currentValue)) && (
                        <option value={String(currentValue)}>{String(currentValue)}</option>
                      )}
                      {field.options?.map((option) => (
                        <option key={`${option.value}:${option.label}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  );
                else
                  control = (
                    <input
                      className={`pdf-form-control pdf-form-radio ${capturedClass} ${isSelected ? 'is-selected' : ''}`}
                      aria-label={`${field.name}: ${field.option || 'option'}`}
                      title={`${field.name}: ${field.option || 'option'}`}
                      type="radio"
                      name={`pdf-field-${currentPage}-${field.name}`}
                      value={field.option || ''}
                      disabled={field.readOnly}
                      required={field.required}
                      checked={String(currentValue) === String(field.option || '')}
                      onClick={(event) => {
                        event.stopPropagation();
                        selectField(event.shiftKey);
                      }}
                      onChange={() => updateFormValue(field.name, field.option || '')}
                      style={fieldStyle}
                    />
                  );
                return (
                  <Fragment key={field.id}>
                    {useCapturedAppearance && <FormBackdropLayer field={field} edit={edit} zoom={zoom} />}
                    {!edit.deleted && control}
                    {edit.deleted && (
                      <button
                        className="form-deleted-field"
                        onClick={(event) => {
                          event.stopPropagation();
                          selectField(event.shiftKey);
                        }}
                        style={fieldStyle}
                      >
                        Deleted form field
                      </button>
                    )}
                    {isPrimary && !edit.deleted && (
                      <div className="form-selection-box" style={geometryStyle}>
                        <button
                          className="form-drag-handle"
                          aria-label="Move form field"
                          onPointerDown={(event) => startFormDrag(event, field)}
                        >
                          ⠿
                        </button>
                        <button
                          className="form-resize-handle"
                          aria-label="Resize form field"
                          onPointerDown={(event) => startFormResize(event, field)}
                        />
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
            {isXfaDocument && (
              <div
                className="xfa-edit-layer"
                aria-label={`XFA field editing controls on page ${currentPage + 1}`}
              >
                {activeXfaDraw && activeXfaDraw.page === currentPage && !activeXfaDraw.deleted && (
                  <div
                    className="xfa-selection-box xfa-draw-selection"
                    style={{
                      left: activeXfaDraw.x * zoom,
                      top: activeXfaDraw.top * zoom,
                      width: activeXfaDraw.width * zoom,
                      height: activeXfaDraw.height * zoom,
                    }}
                  >
                    <button
                      className="xfa-drag-handle"
                      aria-label={`Move XFA ${activeXfaDraw.kind}`}
                      onPointerDown={(event) => startXfaDrawDrag(event, activeXfaDraw)}
                    >
                      ⠿
                    </button>
                    <button
                      className="xfa-resize-handle"
                      aria-label={`Resize XFA ${activeXfaDraw.kind}`}
                      onPointerDown={(event) => startXfaDrawResize(event, activeXfaDraw)}
                    />
                    <span className="xfa-selection-label">XFA {activeXfaDraw.kind}</span>
                  </div>
                )}
                {Object.values(xfaDrawEdits)
                  .filter((draw) => draw.page === currentPage && draw.deleted && !draw.added)
                  .map((draw) => (
                    <button
                      key={draw.key}
                      className="xfa-deleted-field"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedXfaDrawKey(draw.key);
                        setSelectedXfaKey(null);
                      }}
                      style={{
                        left: draw.x * zoom,
                        top: draw.top * zoom,
                        width: Math.max(32, draw.width * zoom),
                        height: Math.max(18, draw.height * zoom),
                      }}
                    >
                      Deleted XFA {draw.kind}
                    </button>
                  ))}
                {activeXfaField && activeXfaField.page === currentPage && !activeXfaField.deleted && (
                  <div
                    className="xfa-selection-box"
                    style={{
                      left: activeXfaField.x * zoom,
                      top: activeXfaField.top * zoom,
                      width: activeXfaField.width * zoom,
                      height: activeXfaField.height * zoom,
                    }}
                  >
                    <button
                      className="xfa-drag-handle"
                      aria-label="Move XFA field"
                      title="Drag to move form field"
                      onPointerDown={(event) => startXfaDrag(event, activeXfaField)}
                    >
                      ⠿
                    </button>
                    <button
                      className="xfa-resize-handle"
                      aria-label="Resize XFA field"
                      title="Drag to resize form field"
                      onPointerDown={(event) => startXfaResize(event, activeXfaField)}
                    />
                    {activeXfaField.label && (
                      <span className="xfa-selection-label">{activeXfaField.label}</span>
                    )}
                  </div>
                )}
                {Object.values(xfaStructureEdits)
                  .filter((field) => field.page === currentPage && field.deleted && !field.added)
                  .map((field) => (
                    <button
                      key={field.key}
                      className="xfa-deleted-field"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedXfaKey(field.key);
                      }}
                      style={{
                        left: field.x * zoom,
                        top: field.top * zoom,
                        width: Math.max(32, field.width * zoom),
                        height: Math.max(18, field.height * zoom),
                      }}
                    >
                      Deleted XFA field
                    </button>
                  ))}
                {Object.values(xfaStructureEdits)
                  .filter(
                    (field) =>
                      field.page === currentPage && field.added && !field.deleted && !field.cloneSourceName,
                  )
                  .map((field) => {
                    const selectField = (event: ReactMouseEvent) => {
                      event.stopPropagation();
                      setSelectedXfaKey(field.key);
                      setSelected(null);
                      setSelectedForm(null);
                      setSelectedAddedId(null);
                      setSelectedImage(null);
                    };
                    const style = {
                      left: field.x * zoom,
                      top: field.top * zoom,
                      width: field.width * zoom,
                      height: field.height * zoom,
                      fontFamily: browserFontFamily(field.font || 'Helvetica'),
                      fontSize: (field.size || 11) * zoom,
                      color: field.color || '#111111',
                      backgroundColor: field.backgroundColor || '#ffffff',
                      borderColor: field.borderColor || '#666666',
                      borderWidth: (field.borderWidth ?? 1) * zoom,
                      textAlign: field.alignment || 'left',
                    };
                    const changeValue = (value: string | boolean) => updateAddedXfaValue(field, value);
                    if (field.kind === 'multiline')
                      return (
                        <div
                          key={field.key}
                          data-xfa-added-key={field.key}
                          className="xfa-added-field xfa-added-stacked"
                          onClick={selectField}
                          style={style}
                        >
                          {field.label && <span className="xfa-added-label">{field.label}</span>}
                          <textarea
                            aria-label={field.label || field.name}
                            value={String(field.value || '')}
                            onChange={(event) => changeValue(event.target.value)}
                          />
                        </div>
                      );
                    if (field.kind === 'text')
                      return (
                        <div
                          key={field.key}
                          data-xfa-added-key={field.key}
                          className="xfa-added-field xfa-added-stacked"
                          onClick={selectField}
                          style={style}
                        >
                          {field.label && <span className="xfa-added-label">{field.label}</span>}
                          <input
                            aria-label={field.label || field.name}
                            type="text"
                            value={String(field.value || '')}
                            onChange={(event) => changeValue(event.target.value)}
                          />
                        </div>
                      );
                    if (field.kind === 'numeric' || field.kind === 'decimal')
                      return (
                        <div
                          key={field.key}
                          data-xfa-added-key={field.key}
                          className="xfa-added-field xfa-added-stacked"
                          onClick={selectField}
                          style={style}
                        >
                          {field.label && <span className="xfa-added-label">{field.label}</span>}
                          <input
                            aria-label={field.label || field.name}
                            type="number"
                            step={field.kind === 'decimal' ? 'any' : '1'}
                            value={String(field.value || '')}
                            onChange={(event) => changeValue(event.target.value)}
                          />
                        </div>
                      );
                    if (field.kind === 'date')
                      return (
                        <div
                          key={field.key}
                          data-xfa-added-key={field.key}
                          className="xfa-added-field xfa-added-stacked"
                          onClick={selectField}
                          style={style}
                        >
                          {field.label && <span className="xfa-added-label">{field.label}</span>}
                          <input
                            aria-label={field.label || field.name}
                            type="date"
                            value={String(field.value || '')}
                            onChange={(event) => changeValue(event.target.value)}
                          />
                        </div>
                      );
                    if (field.kind === 'password')
                      return (
                        <div
                          key={field.key}
                          data-xfa-added-key={field.key}
                          className="xfa-added-field xfa-added-stacked"
                          onClick={selectField}
                          style={style}
                        >
                          {field.label && <span className="xfa-added-label">{field.label}</span>}
                          <input
                            aria-label={field.label || field.name}
                            type="password"
                            value={String(field.value || '')}
                            onChange={(event) => changeValue(event.target.value)}
                          />
                        </div>
                      );
                    if (field.kind === 'choice')
                      return (
                        <div
                          key={field.key}
                          data-xfa-added-key={field.key}
                          className="xfa-added-field xfa-added-stacked"
                          onClick={selectField}
                          style={style}
                        >
                          {field.label && <span className="xfa-added-label">{field.label}</span>}
                          <select
                            aria-label={field.label || field.name}
                            value={String(field.value || '')}
                            onChange={(event) => changeValue(event.target.value)}
                          >
                            <option value="">Choose…</option>
                            <option value="Option 1">Option 1</option>
                            <option value="Option 2">Option 2</option>
                          </select>
                        </div>
                      );
                    if (field.kind === 'button')
                      return (
                        <button
                          key={field.key}
                          data-xfa-added-key={field.key}
                          className="xfa-added-field xfa-added-button"
                          onClick={(event) => {
                            selectField(event);
                            scheduleXfaRuntimeRef.current(field.key, 'click');
                          }}
                          style={style}
                        >
                          {field.label || 'Button'}
                        </button>
                      );
                    if (field.kind === 'signature' || field.kind === 'barcode' || field.kind === 'image')
                      return (
                        <div
                          key={field.key}
                          data-xfa-added-key={field.key}
                          className="xfa-added-field xfa-added-placeholder"
                          onClick={selectField}
                          style={style}
                        >
                          <b>{field.label || field.name}</b>
                          <span>
                            {field.kind === 'signature'
                              ? 'Signature field'
                              : field.kind === 'barcode'
                                ? 'Barcode field'
                                : 'Image field'}
                          </span>
                        </div>
                      );
                    if (field.kind === 'checkbox')
                      return (
                        <label
                          key={field.key}
                          data-xfa-added-key={field.key}
                          className="xfa-added-field xfa-added-check"
                          onClick={selectField}
                          style={style}
                        >
                          <input
                            aria-label={field.label || field.name}
                            type="checkbox"
                            checked={Boolean(field.value)}
                            onChange={(event) => changeValue(event.target.checked)}
                          />
                          <span>{field.label}</span>
                        </label>
                      );
                    return (
                      <div
                        key={field.key}
                        data-xfa-added-key={field.key}
                        className="xfa-added-field xfa-added-stacked"
                        onClick={selectField}
                        style={style}
                      >
                        {field.label && <span className="xfa-added-label">{field.label}</span>}
                        <div className="xfa-added-radio">
                          <label>
                            <input
                              type="radio"
                              name={field.key}
                              checked={field.value === 'Yes'}
                              onChange={() => changeValue('Yes')}
                            />{' '}
                            Yes
                          </label>
                          <label>
                            <input
                              type="radio"
                              name={field.key}
                              checked={field.value === 'No'}
                              onChange={() => changeValue('No')}
                            />{' '}
                            No
                          </label>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
            {selectionMarquee && (
              <div
                className="selection-marquee"
                aria-hidden="true"
                style={{
                  left: selectionMarquee.x * zoom,
                  top: selectionMarquee.top * zoom,
                  width: selectionMarquee.width * zoom,
                  height: selectionMarquee.height * zoom,
                }}
              />
            )}
            {ocrRegion && (
              <div
                className="ocr-region"
                aria-hidden="true"
                style={{
                  left: ocrRegion.x * zoom,
                  top: ocrRegion.top * zoom,
                  width: ocrRegion.width * zoom,
                  height: ocrRegion.height * zoom,
                }}
              >
                <span>OCR area</span>
              </div>
            )}
          </div>
        )
      )}
      {!pdfBytes && (
        <button className="drop-hint" onClick={() => uploadRef.current?.click()}>
          <span>↑</span>
          <b>Drop a PDF here to start editing</b>
          <small>or click to choose a file</small>
        </button>
      )}
    </div>
  );
}
