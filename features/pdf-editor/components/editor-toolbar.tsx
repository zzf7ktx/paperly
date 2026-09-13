'use client';

import { ColorPicker } from './color-picker';

import { type CSSProperties } from 'react';
import { type XfaFieldKind } from '../../../lib/xfa-template';
import { PaperlySelect } from './paperly-select';
import { normalFieldKindOptions, xfaFieldKindOptions } from '../constants';
import type { FormBlock, VectorKind } from '../types';
import type { PdfEditorController } from '../hooks/use-pdf-editor';

type Props = {
  editor: Pick<
    PdfEditorController,
    | 'imageUploadRef'
    | 'xfaImageReplaceRef'
    | 'documentTabs'
    | 'combineTitleAndTabs'
    | 'joinSplitCharacters'
    | 'setJoinSplitCharacters'
    | 'pdfBytes'
    | 'isXfaDocument'
    | 'xfaAddKind'
    | 'setXfaAddKind'
    | 'normalAddKind'
    | 'setNormalAddKind'
    | 'zoom'
    | 'setZoom'
    | 'fitMode'
    | 'setFitMode'
    | 'panEnabled'
    | 'setPanEnabled'
    | 'hideScrollbars'
    | 'setHideScrollbars'
    | 'selectPdfShapes'
    | 'setSelectPdfShapes'
    | 'drawFill'
    | 'setDrawFill'
    | 'drawStroke'
    | 'setDrawStroke'
    | 'drawStrokeWidth'
    | 'setDrawStrokeWidth'
    | 'tool'
    | 'setTool'
    | 'ocrBusy'
    | 'ocrProgress'
    | 'ocrStatus'
    | 'ocrConfidenceThreshold'
    | 'setOcrConfidenceThreshold'
    | 'ocrRecognizeLayout'
    | 'setOcrRecognizeLayout'
    | 'snapEnabled'
    | 'setSnapEnabled'
    | 'snapMode'
    | 'setSnapMode'
    | 'snapAnchor'
    | 'setSnapAnchor'
    | 'showDeletedLabels'
    | 'setShowDeletedLabels'
    | 'setSnapGuides'
    | 'activeKey'
    | 'activeEdit'
    | 'activeVisual'
    | 'activeAdded'
    | 'activeBold'
    | 'activeItalic'
    | 'activeUnderline'
    | 'activeStrike'
    | 'isLikelyScannedPage'
    | 'hasTextSelection'
    | 'commit'
    | 'updateAddedBox'
    | 'toggleFormat'
    | 'replaceXfaDrawImage'
    | 'addImageFile'
    | 'runOcr'
    | 'toggleTitleAndTabs'
  >;
};

export function EditorToolbar({ editor }: Props) {
  const {
    imageUploadRef,
    xfaImageReplaceRef,
    documentTabs,
    combineTitleAndTabs,
    joinSplitCharacters,
    setJoinSplitCharacters,
    pdfBytes,
    isXfaDocument,
    xfaAddKind,
    setXfaAddKind,
    normalAddKind,
    setNormalAddKind,
    zoom,
    setZoom,
    fitMode,
    setFitMode,
    panEnabled,
    setPanEnabled,
    hideScrollbars,
    setHideScrollbars,
    selectPdfShapes,
    setSelectPdfShapes,
    drawFill,
    setDrawFill,
    drawStroke,
    setDrawStroke,
    drawStrokeWidth,
    setDrawStrokeWidth,
    tool,
    setTool,
    ocrBusy,
    ocrProgress,
    ocrStatus,
    ocrConfidenceThreshold,
    setOcrConfidenceThreshold,
    ocrRecognizeLayout,
    setOcrRecognizeLayout,
    snapEnabled,
    setSnapEnabled,
    snapMode,
    setSnapMode,
    snapAnchor,
    setSnapAnchor,
    showDeletedLabels,
    setShowDeletedLabels,
    setSnapGuides,
    activeKey,
    activeEdit,
    activeVisual,
    activeAdded,
    activeBold,
    activeItalic,
    activeUnderline,
    activeStrike,
    isLikelyScannedPage,
    hasTextSelection,
    commit,
    updateAddedBox,
    toggleFormat,
    replaceXfaDrawImage,
    addImageFile,
    runOcr,
    toggleTitleAndTabs,
  } = editor;
  return (
    <div className="formatbar" aria-label="Text formatting toolbar">
      <div className="toolbar-group insert-tools" aria-label="Insert tools">
        <button
          className={`tool select-tool-button ${tool === 'select' ? 'active' : ''}`}
          onClick={() => setTool('select')}
          title="Select and edit elements"
        >
          <span aria-hidden="true">↖</span>
          <b>Select</b>
        </button>
        <button
          className={`tool add-text-tool ${tool === 'add-text' ? 'active' : ''}`}
          disabled={!pdfBytes}
          onClick={() => setTool((current) => (current === 'add-text' ? 'select' : 'add-text'))}
        >
          ＋<span>Text</span>
        </button>
        <input
          ref={imageUploadRef}
          type="file"
          accept="image/png,image/jpeg,.png,.jpg,.jpeg"
          hidden
          onChange={(event) => addImageFile(event.target.files?.[0])}
        />
        <input
          ref={xfaImageReplaceRef}
          type="file"
          accept="image/png,image/jpeg,.png,.jpg,.jpeg"
          hidden
          onChange={(event) => replaceXfaDrawImage(event.target.files?.[0])}
        />
        <button
          className="tool add-image-tool"
          disabled={!pdfBytes}
          onClick={() => imageUploadRef.current?.click()}
        >
          ▧<span>Image</span>
        </button>
      </div>
      <details className="toolbar-popover draw-popover">
        <summary className={tool.startsWith('draw-') || selectPdfShapes ? 'active' : ''}>
          Draw <b>▾</b>
        </summary>
        <div className="toolbar-popover-panel">
          <strong>Drawing tools</strong>
          <button
            className={`shape-selection-toggle ${selectPdfShapes ? 'active' : ''}`}
            disabled={!pdfBytes}
            onClick={() => {
              setSelectPdfShapes((enabled) => !enabled);
              setTool('select');
            }}
          >
            <span>Select PDF shapes</span>
            <b>{selectPdfShapes ? 'On' : 'Off'}</b>
          </button>
          <small className="shape-selection-hint">
            When enabled, click or drag across existing lines, boxes, and colored regions to select them.
          </small>
          <div className="draw-tool-grid">
            {(['rectangle', 'ellipse', 'line', 'brush'] as VectorKind[]).map((kind) => (
              <button
                key={kind}
                className={tool === `draw-${kind}` ? 'active' : ''}
                disabled={!pdfBytes}
                onClick={() => setTool(`draw-${kind}` as typeof tool)}
              >
                {kind}
              </button>
            ))}
          </div>
          <label>
            Fill
            <ColorPicker aria-label="Fill color" value={drawFill} onChange={setDrawFill} />
          </label>
          <label>
            Stroke
            <ColorPicker aria-label="Stroke color" value={drawStroke} onChange={setDrawStroke} />
          </label>
          <label>
            Stroke width
            <input
              type="number"
              min="0.25"
              max="20"
              step="0.25"
              value={drawStrokeWidth}
              onChange={(event) => setDrawStrokeWidth(Math.max(0.25, Number(event.target.value)))}
            />
          </label>
        </div>
      </details>
      {isXfaDocument && (
        <div className="xfa-add-control compact-field-control">
          <PaperlySelect
            label="XFA field type"
            value={xfaAddKind}
            options={xfaFieldKindOptions}
            onChange={(value) => setXfaAddKind(value as XfaFieldKind)}
          />
          <button
            className={tool === 'add-xfa' ? 'active' : ''}
            onClick={() => setTool((current) => (current === 'add-xfa' ? 'select' : 'add-xfa'))}
          >
            ＋ Add
          </button>
        </div>
      )}
      {pdfBytes && !isXfaDocument && (
        <div className="xfa-add-control form-add-control compact-field-control">
          <PaperlySelect
            label="Normal form field type"
            value={normalAddKind}
            options={normalFieldKindOptions}
            onChange={(value) => setNormalAddKind(value as FormBlock['kind'])}
          />
          <button
            className={tool === 'add-form' ? 'active' : ''}
            onClick={() => setTool((current) => (current === 'add-form' ? 'select' : 'add-form'))}
          >
            ＋ Add
          </button>
        </div>
      )}
      <span className="toolbar-separator" />
      <details className="toolbar-popover snap-popover">
        <summary className={snapEnabled ? 'active' : ''}>
          <span aria-hidden="true">⌁</span> Snap <b>{snapEnabled ? 'On' : 'Off'}</b>
        </summary>
        <div className="toolbar-popover-panel">
          <strong>Snapping</strong>
          <button
            className={`menu-toggle ${snapEnabled ? 'active' : ''}`}
            onClick={() => {
              setSnapEnabled((enabled) => !enabled);
              setSnapGuides({});
            }}
          >
            <span>Enable snapping</span>
            <b>{snapEnabled ? 'On' : 'Off'}</b>
          </button>
          <label>Snap by</label>
          <div className="menu-segmented">
            <button
              className={snapMode === 'text' ? 'active' : ''}
              disabled={!snapEnabled}
              onClick={() => {
                setSnapMode('text');
                setSnapGuides({});
              }}
            >
              Text
            </button>
            <button
              className={snapMode === 'box' ? 'active' : ''}
              disabled={!snapEnabled}
              onClick={() => {
                setSnapMode('box');
                setSnapGuides({});
              }}
            >
              Box
            </button>
          </div>
          <label>Align using</label>
          <div className="menu-segmented">
            <button
              className={snapAnchor === 'start' ? 'active' : ''}
              disabled={!snapEnabled}
              onClick={() => {
                setSnapAnchor('start');
                setSnapGuides({});
              }}
            >
              Start
            </button>
            <button
              className={snapAnchor === 'center' ? 'active' : ''}
              disabled={!snapEnabled}
              onClick={() => {
                setSnapAnchor('center');
                setSnapGuides({});
              }}
            >
              Center
            </button>
            <button
              className={snapAnchor === 'end' ? 'active' : ''}
              disabled={!snapEnabled}
              onClick={() => {
                setSnapAnchor('end');
                setSnapGuides({});
              }}
            >
              End
            </button>
          </div>
        </div>
      </details>
      <details className="toolbar-popover ocr-popover">
        <summary className={ocrBusy || tool === 'ocr-region' ? 'active' : ''}>
          OCR <b>{ocrBusy ? `${ocrProgress}%` : isLikelyScannedPage ? 'Scan' : '▾'}</b>
        </summary>
        <div className="toolbar-popover-panel">
          <div className="ocr-popover-heading">
            <strong>Scanned text</strong>
            <span>Offline</span>
          </div>
          {isLikelyScannedPage && (
            <span className="ocr-scan-hint">
              <b aria-hidden="true">!</b>
              <span>This page appears to be scanned.</span>
            </span>
          )}
          <label>Recognition language</label>
          <PaperlySelect
            label="Recognition language"
            value="eng"
            disabled
            className="ocr-language-select"
            options={[{ value: 'eng', label: 'English' }]}
            onChange={() => undefined}
          />
          <small className="ocr-language-note">English model installed locally</small>
          <button
            className={`menu-toggle ocr-layout-toggle ${ocrRecognizeLayout ? 'active' : ''}`}
            disabled={ocrBusy}
            onClick={() => setOcrRecognizeLayout((enabled) => !enabled)}
          >
            <span>
              <b>Recognize layout</b>
              <small>Lines, shapes, and table grids</small>
            </span>
            <strong>{ocrRecognizeLayout ? 'On' : 'Off'}</strong>
          </button>
          <button className="menu-toggle" disabled={!pdfBytes || ocrBusy} onClick={() => void runOcr()}>
            <span>Recognize full page</span>
            <b>Run</b>
          </button>
          <button
            className={`menu-toggle ${tool === 'ocr-region' ? 'active' : ''}`}
            disabled={!pdfBytes || ocrBusy}
            onClick={() => setTool((current) => (current === 'ocr-region' ? 'select' : 'ocr-region'))}
          >
            <span>Select an area</span>
            <b>{tool === 'ocr-region' ? 'Cancel' : 'Draw'}</b>
          </button>
          <div className="ocr-confidence-control">
            <div>
              <label htmlFor="ocr-confidence-threshold">Low-confidence warning</label>
              <output htmlFor="ocr-confidence-threshold">{ocrConfidenceThreshold}%</output>
            </div>
            <input
              id="ocr-confidence-threshold"
              type="range"
              min="30"
              max="95"
              value={ocrConfidenceThreshold}
              style={
                { '--ocr-range-progress': `${((ocrConfidenceThreshold - 30) / 65) * 100}%` } as CSSProperties
              }
              onChange={(event) => setOcrConfidenceThreshold(Number(event.target.value))}
            />
            <small>Highlight recognized text below this score.</small>
          </div>
          {ocrBusy && (
            <div className="ocr-progress">
              <i style={{ width: `${ocrProgress}%` }} />
            </div>
          )}
          <div className="ocr-status">
            <i aria-hidden="true" />
            <span>
              <b>{ocrStatus}</b>
              <small>Processing stays in this browser.</small>
            </span>
          </div>
        </div>
      </details>
      {hasTextSelection && (
        <>
          <span className="toolbar-separator" />
          <div className="toolbar-group contextual-format" aria-label="Selected text formatting">
            <span className="context-label">Text</span>
            <button
              className={`simple-tool ${activeBold ? 'active' : ''}`}
              onClick={() => toggleFormat('bold', activeBold)}
              aria-label="Bold"
              aria-pressed={activeBold}
            >
              <b>B</b>
            </button>
            <button
              className={`simple-tool ${activeItalic ? 'active' : ''}`}
              onClick={() => toggleFormat('italic', activeItalic)}
              aria-label="Italic"
              aria-pressed={activeItalic}
            >
              <i>I</i>
            </button>
            <button
              className={`simple-tool ${activeUnderline ? 'active' : ''}`}
              onClick={() => toggleFormat('underline', activeUnderline)}
              aria-label="Underline"
              aria-pressed={activeUnderline}
            >
              <u>U</u>
            </button>
            <button
              className={`simple-tool ${activeStrike ? 'active' : ''}`}
              onClick={() => toggleFormat('strike', activeStrike)}
              aria-label="Strikethrough"
              aria-pressed={activeStrike}
            >
              <s>S</s>
            </button>
            <label className="color-tool" aria-label="Text color">
              A
              <i
                style={{
                  background: activeAdded?.color || activeEdit?.color || activeVisual?.color || '#16302b',
                }}
              />
              <ColorPicker
                aria-label="Text color"
                value={activeAdded?.color || activeEdit?.color || activeVisual?.color || '#16302b'}
                onChange={(color) =>
                  activeAdded
                    ? updateAddedBox(activeAdded.id, { color: color })
                    : activeKey && commit(activeKey, { color: color })
                }
              />
            </label>
          </div>
        </>
      )}
      <span className="spacer" />
      <details className="toolbar-popover view-popover">
        <summary className={panEnabled ? 'active' : ''}>
          View <b>▾</b>
        </summary>
        <div className="toolbar-popover-panel align-right">
          <strong>View options</strong>
          <button
            className={`menu-toggle ${panEnabled ? 'active' : ''}`}
            disabled={!pdfBytes}
            onClick={() => setPanEnabled((enabled) => !enabled)}
          >
            <span>Pan with drag</span>
            <b>{panEnabled ? 'On' : 'Off'}</b>
          </button>
          <small className="shortcut-hint">
            <kbd>Alt</kbd> + drag or middle-mouse drag temporarily pans
          </small>
          <button
            className={`menu-toggle ${hideScrollbars ? 'active' : ''}`}
            onClick={() =>
              setHideScrollbars((hidden) => {
                const next = !hidden;
                try {
                  window.localStorage.setItem('paperly-hide-scrollbars', String(next));
                } catch {
                  /* local preference is optional */
                }
                return next;
              })
            }
          >
            <span>Canvas scrollbars</span>
            <b>{hideScrollbars ? 'Hidden' : 'Shown'}</b>
          </button>
          <small className="shortcut-hint">Scrolling, wheel zoom, and panning still work while hidden.</small>
          <label>Fit page</label>
          <div className="menu-segmented">
            <button
              className={fitMode === 'width' ? 'active' : ''}
              disabled={!pdfBytes}
              onClick={() => setFitMode('width')}
            >
              Width
            </button>
            <button
              className={fitMode === 'content' ? 'active' : ''}
              disabled={!pdfBytes}
              onClick={() => setFitMode('content')}
            >
              Content
            </button>
          </div>
          <button
            className={`menu-toggle ${joinSplitCharacters ? 'active' : ''}`}
            onClick={() =>
              setJoinSplitCharacters((enabled) => {
                const next = !enabled;
                try {
                  window.localStorage.setItem('paperly-join-split-characters', String(next));
                } catch {
                  /* local preference is optional */
                }
                return next;
              })
            }
          >
            <span>Join split characters</span>
            <b>{joinSplitCharacters ? 'On' : 'Off'}</b>
          </button>
          <small className="shortcut-hint">Applies when opening or reopening a PDF.</small>
          <button
            className={`menu-toggle ${showDeletedLabels ? 'active' : ''}`}
            disabled={!pdfBytes}
            onClick={() => setShowDeletedLabels((visible) => !visible)}
          >
            <span>Deleted elements</span>
            <b>{showDeletedLabels ? 'Shown' : 'Hidden'}</b>
          </button>
          <small className="shortcut-hint">
            Hide deleted regions completely so they cannot block selecting content underneath.
          </small>
          {documentTabs.length > 0 && (
            <button
              className={`menu-toggle ${combineTitleAndTabs ? 'active' : ''}`}
              onClick={toggleTitleAndTabs}
            >
              <span>Tabs in title bar</span>
              <b>{combineTitleAndTabs ? 'On' : 'Off'}</b>
            </button>
          )}
        </div>
      </details>
      <div className="zoom-cluster" role="group" aria-label="PDF zoom">
        <button
          className="zoom"
          disabled={!pdfBytes}
          onClick={() => {
            setFitMode('manual');
            setZoom((value) => Math.max(0.25, value - 0.1));
          }}
        >
          −
        </button>
        <span className="zoom-value">{Math.round(zoom * 100)}%</span>
        <button
          className="zoom"
          disabled={!pdfBytes}
          onClick={() => {
            setFitMode('manual');
            setZoom((value) => Math.min(3, value + 0.1));
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}
