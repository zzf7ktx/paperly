'use client';

import { useState } from 'react';

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
    toggleOcrCleanupCovers,
    reorderLayerObject,
    hideOcrSourceScan,
  } = editor;
  const [sourcePreview, setSourcePreview] = useState<OcrRun | null>(null);
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
    const canReorder =
      item.kind === 'added-text' ||
      item.kind === 'added-image' ||
      (item.kind === 'vector' &&
        Boolean(page?.vectors.find((entry) => entry.id === item.id && (entry.added || entry.ocrRunId)))) ||
      (item.kind === 'image' && Boolean(page?.images.find((entry) => entry.id === item.id)?.ocrRunId));
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
          {canReorder && (
            <button
              onClick={() => reorderLayerObject(item, -1)}
              aria-label={`Move ${name} up`}
              title="Move up"
            >
              ↑
            </button>
          )}
          {canReorder && (
            <button
              onClick={() => reorderLayerObject(item, 1)}
              aria-label={`Move ${name} down`}
              title="Move down"
            >
              ↓
            </button>
          )}
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
    const controls = [
      {
        key: 'text' as const,
        label: 'Text',
        count: text.length,
        visible: text.some((item) => !item.hidden),
        help: 'Editable words recognized from the scan.',
      },
      {
        key: 'shapes' as const,
        label: 'Shapes',
        count: shapes.length,
        visible: shapes.some((item) => !item.hidden),
        help: 'Detected table lines, borders, and boxes.',
      },
      {
        key: 'images' as const,
        label: 'Images',
        count: images.length,
        visible: images.some((item) => !item.hidden),
        help: 'Pictures and logos extracted from the scan.',
      },
    ];
    return (
      <details className="ocr-layer-group" open key={run.id}>
        <summary>
          <span>OCR result</span>
          <small>
            {text.length} text · {shapes.length} shapes · {images.length} images
          </small>
        </summary>
        <p className="ocr-group-intro">
          Choose which recognized parts appear on the page and in the exported PDF.
        </p>
        <button className="ocr-source-action" onClick={() => setSourcePreview(run)}>
          <span>Remove original scan</span>
          <small>Keep all recognized content</small>
        </button>
        <div className="ocr-layer-toggles" aria-label="OCR content visibility">
          {controls.map((control) => (
            <button
              key={control.key}
              className={control.visible ? '' : 'is-off'}
              disabled={!control.count}
              aria-pressed={control.visible}
              onClick={() => toggleOcrRunCategory(run, control.key)}
              title={control.help}
            >
              <span>{control.label}</span>
              <b>
                {control.visible ? 'Visible' : 'Hidden'} · {control.count}
              </b>
              <small>{control.help}</small>
            </button>
          ))}
          <button
            className={run.cleanupCoversVisible === false ? 'is-off' : ''}
            aria-pressed={run.cleanupCoversVisible !== false}
            onClick={() => toggleOcrCleanupCovers(run)}
            title="Background patches that conceal the old scanned letters behind editable OCR text."
          >
            <span>Covers</span>
            <b>
              {run.cleanupCoversVisible === false ? 'Hidden' : 'Visible'} · {run.cleanupCoverCount}
            </b>
            <small>Hide the old scanned letters behind editable text.</small>
          </button>
        </div>
        {!!text.length && (
          <details className="ocr-member-list">
            <summary>
              Text objects <b>{text.length}</b>
            </summary>
            {text.map((item) =>
              renderRow({ page: currentPage, kind: 'added-text', id: item.id }, 'OCR text'),
            )}
          </details>
        )}
        {!!shapes.length && (
          <details className="ocr-member-list">
            <summary>
              Shape objects <b>{shapes.length}</b>
            </summary>
            {shapes.map((item) => renderRow({ page: currentPage, kind: 'vector', id: item.id }, 'OCR shape'))}
          </details>
        )}
        {!!images.length && (
          <details className="ocr-member-list">
            <summary>
              Image objects <b>{images.length}</b>
            </summary>
            {images.map((item) => renderRow({ page: currentPage, kind: 'image', id: item.id }, 'OCR image'))}
          </details>
        )}
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
          {!rightPanelCollapsed && (
            <button className="panel-view-switch" onClick={onShowProperties} title="Show properties">
              Properties
            </button>
          )}
          <button
            className="panel-collapse-button"
            data-direction={rightPanelCollapsed ? 'left' : 'right'}
            onClick={() => setRightPanelCollapsed((value) => !value)}
            aria-label={rightPanelCollapsed ? 'Expand layers panel' : 'Collapse layers panel'}
            title={rightPanelCollapsed ? 'Expand layers panel' : 'Collapse layers panel'}
          >
            {rightPanelCollapsed ? '‹' : '›'}
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
      {sourcePreview && (
        <div
          className="ocr-source-preview-backdrop"
          role="presentation"
          onMouseDown={() => setSourcePreview(null)}
        >
          <section
            className="ocr-source-preview"
            role="dialog"
            aria-modal="true"
            aria-label="Preview source scan removal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <strong>Remove source scan?</strong>
              <button aria-label="Close preview" onClick={() => setSourcePreview(null)}>
                ×
              </button>
            </header>
            <p>
              The original full-page scan will be hidden. Recognized text, shapes, images, and cleanup covers
              remain.
            </p>
            <div className="ocr-preview-comparison">
              <div>
                <span className="ocr-preview-page before" />
                <b>Before</b>
                <small>Source scan + recognized content</small>
              </div>
              <div>
                <span className="ocr-preview-page after" />
                <b>After</b>
                <small>
                  {sourcePreview.textIds.length} text · {sourcePreview.vectorIds.length} shapes ·{' '}
                  {sourcePreview.imageIds.length} images
                </small>
              </div>
            </div>
            <footer>
              <button onClick={() => setSourcePreview(null)}>Cancel</button>
              <button
                className="danger"
                onClick={() => {
                  hideOcrSourceScan(sourcePreview);
                  setSourcePreview(null);
                }}
              >
                Hide source scan
              </button>
            </footer>
          </section>
        </div>
      )}
    </aside>
  );
}
