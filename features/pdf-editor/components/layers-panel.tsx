'use client';

import type { PdfEditorController } from '../hooks/use-pdf-editor';
import { selectedElementKey } from '../lib/text';
import type { OcrRun, SelectedElementRef } from '../types';

type Props = { editor: PdfEditorController; onShowProperties: () => void };

export function LayersPanel({ editor, onShowProperties }: Props) {
  const {
    pages,
    currentPage,
    addedBoxes,
    addedImages,
    selectedElements,
    objectMetadata,
    ocrRuns,
    rightPanelCollapsed,
    setRightPanelCollapsed,
    selectLayerObject,
    renameLayerObject,
    toggleLayerObjectLock,
    isLayerObjectLocked,
    isLayerObjectHidden,
    toggleLayerObjectVisibility,
    deleteLayerObject,
    toggleOcrRunCategory,
    hideOcrSourceScan,
  } = editor;
  const page = pages[currentPage];
  const runs = ocrRuns.filter((run) => run.page === currentPage);
  const ocrIds = new Set(runs.flatMap((run) => [...run.textIds, ...run.vectorIds, ...run.imageIds]));
  const selectedKeys = new Set(selectedElements.map(selectedElementKey));

  const labelFor = (item: SelectedElementRef) => {
    if (item.kind === 'text') return 'PDF text';
    if (item.kind === 'form') return 'Form field';
    if (item.kind === 'image') return 'PDF image';
    if (item.kind === 'vector') return 'PDF shape';
    if (item.kind === 'added-image') return 'Added image';
    return 'Text box';
  };

  const renderRow = (item: SelectedElementRef, label = labelFor(item)) => {
    const key = selectedElementKey(item);
    const selected = selectedKeys.has(key);
    const role = selectedElements.find((entry) => selectedElementKey(entry) === key)?.selectionRole;
    const hidden = isLayerObjectHidden(item);
    const locked = isLayerObjectLocked(item);
    const name = objectMetadata[key]?.name || label;
    return (
      <div className={`layer-row ${selected ? 'is-selected' : ''}`} key={key} data-testid="layer-row">
        <button
          className="layer-main"
          onClick={(event) => selectLayerObject(item, event.shiftKey)}
          onDoubleClick={() => {
            const next = window.prompt('Rename object', name);
            if (next !== null) renameLayerObject(item, next);
          }}
          title="Select · Shift-click to add · Double-click to rename"
        >
          <span className="layer-name">{name}</span>
          <span className="layer-badges">
            {role === 'related' && <em>related</em>}
            {hidden && <em>hidden</em>}
          </span>
        </button>
        <div className="layer-actions">
          <button
            onClick={() => toggleLayerObjectVisibility(item)}
            aria-label={hidden ? `Show ${name}` : `Hide ${name}`}
            title={hidden ? 'Show' : 'Hide'}
          >
            {hidden ? '◌' : '●'}
          </button>
          <button
            onClick={() => toggleLayerObjectLock(item)}
            aria-label={locked ? `Unlock ${name}` : `Lock ${name}`}
            title={locked ? 'Unlock' : 'Lock'}
          >
            {locked ? '◆' : '◇'}
          </button>
          <button
            onClick={() => deleteLayerObject(item)}
            aria-label={`Delete ${name}`}
            title="Delete or hide"
          >
            ×
          </button>
        </div>
      </div>
    );
  };

  const renderRun = (run: OcrRun) => {
    const text = addedBoxes.filter((item) => run.textIds.includes(item.id));
    const shapes = page?.vectors.filter((item) => run.vectorIds.includes(item.id)) || [];
    const images = page?.images.filter((item) => run.imageIds.includes(item.id)) || [];
    return (
      <details className="ocr-layer-group" open key={run.id}>
        <summary>
          <span>OCR result</span>
          <small>
            {text.length} text · {shapes.length} shapes · {images.length} images
          </small>
        </summary>
        <p>Cleanup covers hide the original scanned text while recognized content stays editable.</p>
        <div className="ocr-layer-toggles" aria-label="OCR content visibility">
          <button onClick={() => toggleOcrRunCategory(run, 'text')}>Text</button>
          <button onClick={() => toggleOcrRunCategory(run, 'shapes')}>Shapes</button>
          <button onClick={() => toggleOcrRunCategory(run, 'images')}>Images</button>
        </div>
        {text.map((item) => renderRow({ page: currentPage, kind: 'added-text', id: item.id }, 'OCR text'))}
        {shapes.map((item) => renderRow({ page: currentPage, kind: 'vector', id: item.id }, 'OCR shape'))}
        {images.map((item) => renderRow({ page: currentPage, kind: 'image', id: item.id }, 'OCR image'))}
        <button className="ocr-source-action" onClick={() => hideOcrSourceScan(run)}>
          Remove source scan, keep recognized content
        </button>
      </details>
    );
  };

  const regularItems: SelectedElementRef[] = page
    ? [
        ...page.blocks.map((item) => ({ page: currentPage, kind: 'text' as const, id: String(item.id) })),
        ...page.forms.map((item) => ({ page: currentPage, kind: 'form' as const, id: item.id })),
        ...page.images
          .filter((item) => !ocrIds.has(item.id))
          .map((item) => ({ page: currentPage, kind: 'image' as const, id: item.id })),
        ...page.vectors
          .filter((item) => !ocrIds.has(item.id))
          .map((item) => ({ page: currentPage, kind: 'vector' as const, id: item.id })),
        ...addedBoxes
          .filter((item) => item.page === currentPage && !ocrIds.has(item.id))
          .map((item) => ({ page: currentPage, kind: 'added-text' as const, id: item.id })),
        ...addedImages
          .filter((item) => item.page === currentPage && !ocrIds.has(item.id))
          .map((item) => ({ page: currentPage, kind: 'added-image' as const, id: item.id })),
      ]
    : [];

  return (
    <aside
      className={`properties layers-panel ${rightPanelCollapsed ? 'is-collapsed' : ''}`}
      aria-label="Objects and layers panel"
    >
      <div className="property-head">
        <strong>{rightPanelCollapsed ? 'Layers' : `Objects · Page ${currentPage + 1}`}</strong>
        <div className="property-head-actions">
          {!rightPanelCollapsed && <button onClick={onShowProperties}>Properties</button>}
          <button
            className="panel-collapse-button"
            onClick={() => setRightPanelCollapsed((value) => !value)}
            aria-label={rightPanelCollapsed ? 'Expand layers panel' : 'Collapse layers panel'}
          >
            ‹
          </button>
        </div>
      </div>
      {!rightPanelCollapsed && (
        <div className="layers-content">
          <div className="layers-summary">
            {selectedElements.length
              ? `${selectedElements.length} selected`
              : `${regularItems.length + runs.length} objects and groups`}
          </div>
          {runs.map(renderRun)}
          {regularItems.map((item) => renderRow(item))}
          {!runs.length && !regularItems.length && (
            <p className="layers-empty">No editable objects on this page.</p>
          )}
        </div>
      )}
    </aside>
  );
}
