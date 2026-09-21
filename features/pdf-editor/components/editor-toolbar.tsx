'use client';

import { ColorPicker } from './color-picker';

import { type CSSProperties, type RefObject, useEffect, useRef, useState } from 'react';
import { type XfaFieldKind } from '../../../lib/xfa-template';
import { PaperlySelect } from './paperly-select';
import { normalFieldKindOptions, xfaFieldKindOptions } from '../constants';
import type { FormBlock, VectorKind } from '../types';
import type { PdfEditorController } from '../hooks/use-pdf-editor';

type Props = {
  motionEnabled: boolean;
  onMotionEnabledChange: (enabled: boolean) => void;
  editor: Pick<
    PdfEditorController,
    | 'imageUploadRef'
    | 'xfaImageReplaceRef'
    | 'documentTabs'
    | 'combineTitleAndTabs'
    | 'joinSplitCharacters'
    | 'setJoinSplitCharacters'
    | 'pdfBytes'
    | 'pages'
    | 'currentPage'
    | 'setSelectedVectorId'
    | 'setSelectedElements'
    | 'setSelected'
    | 'setSelectedForm'
    | 'setSelectedAddedId'
    | 'setSelectedImage'
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
    | 'moveShapeContents'
    | 'setMoveShapeContents'
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
    | 'ocrLanguage'
    | 'setOcrLanguage'
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
    | 'removeOriginalContent'
    | 'setRemoveOriginalContent'
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

export function EditorToolbar({ editor, motionEnabled, onMotionEnabledChange }: Props) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const drawPopoverRef = useRef<HTMLDetailsElement>(null);
  const ocrPopoverRef = useRef<HTMLDetailsElement>(null);
  const [autoCloseToolPopups, setAutoCloseToolPopups] = useState(false);
  const {
    imageUploadRef,
    xfaImageReplaceRef,
    documentTabs,
    combineTitleAndTabs,
    joinSplitCharacters,
    setJoinSplitCharacters,
    pdfBytes,
    pages,
    currentPage,
    setSelectedVectorId,
    setSelectedElements,
    setSelected,
    setSelectedForm,
    setSelectedAddedId,
    setSelectedImage,
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
    moveShapeContents,
    setMoveShapeContents,
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
    ocrLanguage,
    setOcrLanguage,
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
    removeOriginalContent,
    setRemoveOriginalContent,
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

  useEffect(() => {
    try {
      // Load after hydration so the server and first client render stay identical.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAutoCloseToolPopups(window.localStorage.getItem('paperly-auto-close-tool-popups') === 'true');
    } catch {
      /* local preference is optional */
    }
  }, []);

  useEffect(() => {
    const closePopovers = (event: PointerEvent) => {
      if (toolbarRef.current?.contains(event.target as Node)) return;
      toolbarRef.current
        ?.querySelectorAll<HTMLDetailsElement>('.toolbar-popover[open]')
        .forEach((popover) => popover.removeAttribute('open'));
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      toolbarRef.current
        ?.querySelectorAll<HTMLDetailsElement>('.toolbar-popover[open]')
        .forEach((popover) => popover.removeAttribute('open'));
    };
    document.addEventListener('pointerdown', closePopovers);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closePopovers);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const closeToolPopup = (popover: RefObject<HTMLDetailsElement | null>) => {
    if (autoCloseToolPopups) popover.current?.removeAttribute('open');
  };
  const currentPageData = pages[currentPage];
  const pageBackground = currentPageData?.vectors.findLast(
    (vector) =>
      !vector.added &&
      vector.kind === 'rectangle' &&
      vector.fill !== 'transparent' &&
      vector.width >= currentPageData.width * 0.98 &&
      vector.height >= currentPageData.height * 0.98,
  );

  return (
    <div
      ref={toolbarRef}
      className="formatbar"
      aria-label="PDF editing toolbar"
      onClick={(event) => {
        if (event.target instanceof Element) {
          const selectedPopover = event.target.closest<HTMLDetailsElement>('.toolbar-popover');
          if (selectedPopover && event.target.closest('summary')) {
            toolbarRef.current
              ?.querySelectorAll<HTMLDetailsElement>('.toolbar-popover[open]')
              .forEach((popover) => {
                if (popover !== selectedPopover) popover.removeAttribute('open');
              });
          }
        }
        if (!autoCloseToolPopups || !(event.target instanceof Element)) return;
        const button = event.target.closest('button');
        if (!button || button.classList.contains('paperly-color-trigger')) return;
        button.closest<HTMLDetailsElement>('.toolbar-popover[open]')?.removeAttribute('open');
      }}
    >
      <div className="toolbar-group insert-tools" aria-label="Insert tools">
        <button
          className={`tool select-tool-button ${tool === 'select' ? 'active' : ''}`}
          onClick={() => setTool('select')}
          title="Select and edit elements (Esc)"
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
      <details ref={drawPopoverRef} className="toolbar-popover draw-popover">
        <summary className={tool.startsWith('draw-') || selectPdfShapes ? 'active' : ''}>
          Draw <b>▾</b>
        </summary>
        <div className="toolbar-popover-panel">
          <strong>Drawing tools</strong>
          <label>Existing content</label>
          <button
            className={`shape-selection-toggle ${selectPdfShapes ? 'active' : ''}`}
            disabled={!pdfBytes}
            onClick={() => {
              setSelectPdfShapes((enabled) => {
                const next = !enabled;
                try {
                  window.localStorage.setItem('paperly-select-pdf-shapes', String(next));
                } catch {
                  /* local preference is optional */
                }
                return next;
              });
              setTool('select');
              closeToolPopup(drawPopoverRef);
            }}
          >
            <span>Select PDF shapes</span>
            <b>{selectPdfShapes ? 'On' : 'Off'}</b>
          </button>
          <small className="shape-selection-hint">
            When enabled, click or drag across existing lines, boxes, and colored regions to select them.
          </small>
          <button
            className={`shape-selection-toggle ${moveShapeContents ? 'active' : ''}`}
            onClick={() => setMoveShapeContents((enabled) => !enabled)}
          >
            <span>Select related shapes</span>
            <b>{moveShapeContents ? 'On' : 'Off'}</b>
          </button>
          <small className="shape-selection-hint">
            Include touching shapes and text contained inside them.
          </small>
          <button
            className="shape-selection-toggle"
            disabled={!pageBackground}
            title={
              pageBackground ? 'Select the detected full-page background' : 'No page background detected'
            }
            onClick={() => {
              if (!pageBackground) return;
              setSelectedVectorId(pageBackground.id);
              setSelectedElements([{ page: currentPage, kind: 'vector', id: pageBackground.id }]);
              setSelected(null);
              setSelectedForm(null);
              setSelectedAddedId(null);
              setSelectedImage(null);
              setSelectPdfShapes(true);
              setTool('select');
              closeToolPopup(drawPopoverRef);
            }}
          >
            <span>Select page background</span>
            <b>{pageBackground ? 'Ready' : 'None'}</b>
          </button>
          <label>New shapes</label>
          <div className="draw-tool-grid">
            {(['rectangle', 'ellipse', 'line', 'brush'] as VectorKind[]).map((kind) => (
              <button
                key={kind}
                className={tool === `draw-${kind}` ? 'active' : ''}
                disabled={!pdfBytes}
                onClick={() => {
                  setTool(`draw-${kind}` as typeof tool);
                  closeToolPopup(drawPopoverRef);
                }}
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
      <details ref={ocrPopoverRef} className="toolbar-popover ocr-popover">
        <summary className={ocrBusy || tool === 'ocr-region' ? 'active' : ''}>
          OCR <b>{ocrBusy ? `${ocrProgress}%` : isLikelyScannedPage ? 'Scan' : '▾'}</b>
        </summary>
        <div className="toolbar-popover-panel" aria-label="OCR tools" aria-busy={ocrBusy}>
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
          <div className="menu-segmented ocr-language-options" role="group" aria-label="Recognition language">
            <button
              className={ocrLanguage === 'eng' ? 'active' : ''}
              disabled={ocrBusy}
              aria-pressed={ocrLanguage === 'eng'}
              onClick={() => setOcrLanguage('eng')}
            >
              English
            </button>
            <button
              className={ocrLanguage === 'vie' ? 'active' : ''}
              disabled={ocrBusy}
              aria-pressed={ocrLanguage === 'vie'}
              onClick={() => setOcrLanguage('vie')}
            >
              Vietnamese
            </button>
          </div>
          <small className="ocr-language-note">Models are installed locally.</small>
          <button
            className={`menu-toggle ocr-layout-toggle ${ocrRecognizeLayout ? 'active' : ''}`}
            disabled={ocrBusy}
            onClick={() => setOcrRecognizeLayout((enabled) => !enabled)}
          >
            <span>
              <b>Recognize layout</b>
              <small>Images, logos, lines, and table grids</small>
            </span>
            <b className="ocr-toggle-state">{ocrRecognizeLayout ? 'On' : 'Off'}</b>
          </button>
          <button
            className="menu-toggle ocr-action"
            disabled={!pdfBytes || ocrBusy}
            onClick={() => void runOcr()}
          >
            <span>Recognize full page</span>
            <b>Run</b>
          </button>
          <button
            className={`menu-toggle ocr-action ${tool === 'ocr-region' ? 'active' : ''}`}
            disabled={!pdfBytes || ocrBusy}
            onClick={() => {
              setTool((current) => (current === 'ocr-region' ? 'select' : 'ocr-region'));
              closeToolPopup(ocrPopoverRef);
            }}
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
      <details className="toolbar-popover options-popover">
        <summary>
          Options <b>▾</b>
        </summary>
        <div className="toolbar-popover-panel align-right">
          <strong>Editor options</strong>
          <label>Document text</label>
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
            <span>Join nearby text boxes</span>
            <b>{joinSplitCharacters ? 'On' : 'Off'}</b>
          </button>
          <small className="shortcut-hint">
            Merge adjacent text boxes based on character spacing when opening a PDF.
          </small>
          <label>Export</label>
          <button
            className={`menu-toggle ${removeOriginalContent ? 'active' : ''}`}
            onClick={() => setRemoveOriginalContent((enabled) => !enabled)}
          >
            <span>Remove original content</span>
            <b>{removeOriginalContent ? 'On' : 'Off'}</b>
          </button>
          <small className="shortcut-hint">
            Remove selected original content on export while keeping unaffected PDF text interactive.
          </small>
          <label>Menu behavior</label>
          <button
            className={`menu-toggle ${autoCloseToolPopups ? 'active' : ''}`}
            onClick={() =>
              setAutoCloseToolPopups((enabled) => {
                const next = !enabled;
                try {
                  window.localStorage.setItem('paperly-auto-close-tool-popups', String(next));
                } catch {
                  /* local preference is optional */
                }
                return next;
              })
            }
          >
            <span>Auto-close menus</span>
            <b>{autoCloseToolPopups ? 'On' : 'Off'}</b>
          </button>
          <small className="shortcut-hint">Close any toolbar menu after choosing an action.</small>
        </div>
      </details>
      <details className="toolbar-popover view-popover">
        <summary className={panEnabled ? 'active' : ''}>
          View <b>▾</b>
        </summary>
        <div className="toolbar-popover-panel align-right">
          <strong>View options</strong>
          <label>Canvas</label>
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
          <button
            className={`menu-toggle ${showDeletedLabels ? 'active' : ''}`}
            disabled={!pdfBytes}
            onClick={() => setShowDeletedLabels((visible) => !visible)}
          >
            <span>Deleted elements</span>
            <b>{showDeletedLabels ? 'Shown' : 'Hidden'}</b>
          </button>
          <small className="shortcut-hint">Show or hide deleted regions on the canvas.</small>
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
          <label>Interface</label>
          <button
            className={`menu-toggle ${motionEnabled ? 'active' : ''}`}
            onClick={() => onMotionEnabledChange(!motionEnabled)}
          >
            <span>Interface animations</span>
            <b>{motionEnabled ? 'On' : 'Off'}</b>
          </button>
          <small className="shortcut-hint">Smooth menus and control feedback.</small>
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
