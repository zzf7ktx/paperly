'use client';

import { useEffect, useRef, useState } from 'react';
import { PdfThumbnail } from './pdf-thumbnail';
import './page-rail.css';
import type { PdfEditorController } from '../hooks/use-pdf-editor';

type Props = {
  editor: Pick<
    PdfEditorController,
    | 'pdfRef'
    | 'changePages'
    | 'insertPdfFiles'
    | 'copyPageToTab'
    | 'documentTabs'
    | 'loading'
    | 'ocrBusy'
    | 'activeDocumentId'
    | 'pdfBytes'
    | 'isXfaDocument'
    | 'setSelectedXfaDrawKey'
    | 'setSelectedXfaKey'
    | 'pages'
    | 'currentPage'
    | 'setCurrentPage'
    | 'setSelected'
    | 'setSelectedElements'
    | 'setSelectedForm'
    | 'addedBoxes'
    | 'setSelectedImage'
    | 'setSelectedAddedId'
    | 'setSelectedVectorId'
    | 'setTool'
    | 'leftPanelCollapsed'
    | 'setLeftPanelCollapsed'
    | 'error'
  >;
};

function PageIcon({ name }: { name: 'copy' | 'remove' | 'up' | 'down' | 'add' }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      {name === 'copy' ? (
        <>
          <rect x="7" y="7" width="10" height="10" rx="2" />
          <path d="M13 7V3H3v10h4" />
        </>
      ) : name === 'remove' ? (
        <path d="M3 5h14M7 5V3h6v2M5 5l1 12h8l1-12M8 8v6M12 8v6" />
      ) : name === 'add' ? (
        <path d="M10 3v14M3 10h14" />
      ) : name === 'up' ? (
        <path d="M10 16V4M5 9l5-5 5 5" />
      ) : (
        <path d="M10 4v12M5 11l5 5 5-5" />
      )}
    </svg>
  );
}

export function PageRail({ editor }: Props) {
  const importRef = useRef<HTMLInputElement>(null);
  const importMenu = useRef<HTMLDetailsElement>(null);
  const insertAfter = useRef(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const sizeDialogRef = useRef<HTMLDialogElement>(null);
  const [dragPage, setDragPage] = useState<number | null>(null);
  const [dropPage, setDropPage] = useState<number | null>(null);
  const [copyPage, setCopyPage] = useState<number | null>(null);
  const [targetId, setTargetId] = useState('');
  const [position, setPosition] = useState(0);
  const [copyFailed, setCopyFailed] = useState(false);
  const [pageWidth, setPageWidth] = useState(595.28);
  const [pageHeight, setPageHeight] = useState(841.89);
  const [pageUnit, setPageUnit] = useState<'mm' | 'in' | 'pt'>('mm');
  const busy = editor.loading || editor.ocrBusy;
  const disabled = busy || editor.isXfaDocument;
  const targets = editor.documentTabs.filter((tab) => tab.id !== editor.activeDocumentId && !tab.isXfa);
  const target = targets.find((tab) => tab.id === targetId);
  const { pages, currentPage, leftPanelCollapsed, pdfBytes } = editor;
  useEffect(() => {
    if (copyPage !== null) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [copyPage]);
  const chooseFiles = (after: number) => {
    insertAfter.current = after;
    if (importMenu.current) importMenu.current.open = false;
    importRef.current?.click();
  };
  const pageUnitScale = pageUnit === 'mm' ? 72 / 25.4 : pageUnit === 'in' ? 72 : 1;
  const openPageSizeDialog = () => {
    const page = pages[currentPage];
    if (!page) return;
    setPageWidth(page.width);
    setPageHeight(page.height);
    importMenu.current?.removeAttribute('open');
    sizeDialogRef.current?.showModal();
  };
  const selectPage = (index: number) => {
    editor.setCurrentPage(index);
    editor.setSelectedElements([]);
    editor.setSelected(null);
    editor.setSelectedForm(null);
    editor.setSelectedAddedId(null);
    editor.setSelectedImage(null);
    editor.setSelectedVectorId(null);
    editor.setSelectedXfaKey(null);
    editor.setSelectedXfaDrawKey(null);
    editor.setTool('select');
  };
  return (
    <aside className={`page-rail ${leftPanelCollapsed ? 'is-collapsed' : ''}`} aria-label="Pages panel">
      <div className="page-rail-top">
        <div className="rail-heading">
          <span>{leftPanelCollapsed ? 'P' : 'Pages'}</span>
          {!leftPanelCollapsed && <span className="page-count">{pages.length || 2}</span>}
          <button
            className="panel-collapse-button"
            data-direction={leftPanelCollapsed ? 'right' : 'left'}
            onClick={() => editor.setLeftPanelCollapsed((value) => !value)}
            aria-label={leftPanelCollapsed ? 'Expand pages panel' : 'Collapse pages panel'}
          >
            {leftPanelCollapsed ? '›' : '‹'}
          </button>
        </div>
        {!leftPanelCollapsed && pdfBytes && (
          <>
            <div className="page-rail-toolbar">
              <button
                className="page-add-button"
                disabled={disabled}
                aria-label="Add blank page"
                title="Insert a blank page after the current page"
                onClick={() => void editor.changePages({ kind: 'blank', after: currentPage })}
              >
                <PageIcon name="add" />
                Add page
              </button>
              <details ref={importMenu} className="page-import-menu">
                <summary aria-label="Import pages">
                  Import <b>▾</b>
                </summary>
                <div className="page-import-options">
                  <button
                    disabled={disabled}
                    onClick={() => chooseFiles(currentPage)}
                    aria-label="Insert PDF pages"
                  >
                    Insert PDF pages<small>After page {currentPage + 1}</small>
                  </button>
                  <button
                    disabled={disabled}
                    onClick={() => chooseFiles(pages.length - 1)}
                    aria-label="Combine PDFs"
                  >
                    Combine PDFs<small>Append files to this document</small>
                  </button>
                  <button disabled={disabled} onClick={openPageSizeDialog} aria-label="Resize current page">
                    Resize current page<small>Set a custom page canvas</small>
                  </button>
                  <p>Imported form values become page content.</p>
                </div>
              </details>
              <input
                ref={importRef}
                type="file"
                accept=".pdf"
                multiple
                hidden
                aria-label="PDF files to combine"
                onChange={(event) => {
                  const files = Array.from(event.currentTarget.files || []);
                  event.currentTarget.value = '';
                  void editor.insertPdfFiles(files, insertAfter.current);
                }}
              />
            </div>
            <p className="page-rail-hint">
              {editor.isXfaDocument ? 'Page tools require a standard PDF.' : 'Drag to reorder'}
            </p>
          </>
        )}
      </div>
      {!leftPanelCollapsed &&
        (pdfBytes && pages.length ? (
          pages.map((page, index) => (
            <div
              key={`${editor.activeDocumentId}:${index}`}
              className={`page-item ${currentPage === index ? 'is-current' : ''} ${dragPage === index ? 'is-dragging' : ''} ${dropPage === index && dragPage !== index ? 'is-drop-target' : ''}`}
              draggable={!disabled}
              onDragStart={(event) => {
                if (disabled) {
                  event.preventDefault();
                  return;
                }
                setDragPage(index);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('application/x-paperly-page', String(index));
              }}
              onDragEnd={() => {
                setDragPage(null);
                setDropPage(null);
              }}
              onDragOver={(event) => {
                if (dragPage !== null) {
                  event.preventDefault();
                  event.stopPropagation();
                  setDropPage(index);
                  event.dataTransfer.dropEffect = 'move';
                }
              }}
              onDrop={(event) => {
                if (dragPage === null) return;
                event.preventDefault();
                event.stopPropagation();
                if (dragPage !== index) void editor.changePages({ kind: 'move', from: dragPage, to: index });
                setDragPage(null);
                setDropPage(null);
              }}
            >
              <PdfThumbnail
                page={page}
                addedText={editor.addedBoxes.filter((box) => box.page === index)}
                pdfRef={editor.pdfRef}
                isXfa={editor.isXfaDocument}
                index={index}
                active={currentPage === index}
                onClick={() => selectPage(index)}
              />
              <div className="page-item-footer">
                <span className="page-item-label">{index + 1}</span>
                <div className="page-item-actions">
                  <button
                    disabled={disabled}
                    aria-label={`Copy page ${index + 1} to tab`}
                    title="Copy to another tab"
                    onClick={() => {
                      setTargetId(targets[0]?.id || '');
                      setPosition(targets[0]?.pageCount || 0);
                      setCopyFailed(false);
                      setCopyPage(index);
                    }}
                  >
                    <PageIcon name="copy" />
                  </button>
                  <button
                    disabled={disabled || index === 0}
                    aria-label={`Move page ${index + 1} earlier`}
                    title="Move earlier"
                    onClick={() => void editor.changePages({ kind: 'move', from: index, to: index - 1 })}
                  >
                    <PageIcon name="up" />
                  </button>
                  <button
                    disabled={disabled || index === pages.length - 1}
                    aria-label={`Move page ${index + 1} later`}
                    title="Move later"
                    onClick={() => void editor.changePages({ kind: 'move', from: index, to: index + 1 })}
                  >
                    <PageIcon name="down" />
                  </button>
                  <button
                    className="page-remove-button"
                    disabled={disabled || pages.length <= 1}
                    aria-label={`Remove page ${index + 1}`}
                    title="Remove page"
                    onClick={() => void editor.changePages({ kind: 'remove', index })}
                  >
                    <PageIcon name="remove" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="page-rail-empty">Open a PDF to organize its pages.</div>
        ))}
      <dialog
        ref={dialogRef}
        className="copy-page-dialog"
        aria-labelledby="copy-page-title"
        onCancel={(event) => {
          if (busy) event.preventDefault();
          else setCopyPage(null);
        }}
        onClose={() => setCopyPage(null)}
      >
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (copyPage === null || !target) return;
            const copied = await editor.copyPageToTab(
              copyPage,
              target.id,
              Math.min(position, target.pageCount) - 1,
            );
            if (copied) setCopyPage(null);
            else setCopyFailed(true);
          }}
        >
          <div className="copy-page-heading">
            <div>
              <h2 id="copy-page-title">Copy page {(copyPage ?? 0) + 1}</h2>
              <p>Send a copy to another open PDF.</p>
            </div>
            <button
              type="button"
              disabled={busy}
              aria-label="Close copy page dialog"
              onClick={() => setCopyPage(null)}
            >
              ×
            </button>
          </div>
          {targets.length ? (
            <>
              <label>
                Destination tab
                <select
                  autoFocus
                  value={targetId}
                  disabled={busy}
                  onChange={(event) => {
                    setTargetId(event.target.value);
                    setPosition(targets.find((tab) => tab.id === event.target.value)?.pageCount || 0);
                  }}
                >
                  {targets.map((tab) => (
                    <option key={tab.id} value={tab.id}>
                      {tab.name} · {tab.pageCount} pages
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Insert position
                <select
                  value={Math.min(position, target?.pageCount || 0)}
                  disabled={busy}
                  onChange={(event) => setPosition(Number(event.target.value))}
                >
                  <option value={0}>At the beginning</option>
                  {Array.from({ length: target?.pageCount || 0 }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      After page {index + 1}
                      {index + 1 === target?.pageCount ? ' (at the end)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <p className="copy-page-note">
                Includes current edits. Copied form values become page content. You can undo the copy in the
                destination tab.
              </p>
            </>
          ) : (
            <p className="copy-page-note">Open another standard PDF in a tab to copy this page into it.</p>
          )}
          {copyFailed && (
            <p role="alert">{editor.error || 'The page could not be copied. Please try again.'}</p>
          )}
          <div className="copy-page-footer">
            <button type="button" disabled={busy} onClick={() => setCopyPage(null)}>
              Cancel
            </button>
            <button className="copy-page-submit" type="submit" disabled={busy || !target}>
              {busy ? 'Copying…' : 'Copy page'}
            </button>
          </div>
        </form>
      </dialog>
      <dialog
        ref={sizeDialogRef}
        className="copy-page-dialog page-size-dialog"
        aria-labelledby="page-size-title"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void editor.changePages({
              kind: 'resize',
              index: currentPage,
              width: pageWidth,
              height: pageHeight,
            });
            sizeDialogRef.current?.close();
          }}
        >
          <div className="copy-page-heading">
            <div>
              <h2 id="page-size-title">Resize page {currentPage + 1}</h2>
              <p>Change the canvas while keeping content anchored at the top-left.</p>
            </div>
            <button
              type="button"
              aria-label="Close page size dialog"
              onClick={() => sizeDialogRef.current?.close()}
            >
              Ã—
            </button>
          </div>
          <label>
            Unit
            <select value={pageUnit} onChange={(event) => setPageUnit(event.target.value as typeof pageUnit)}>
              <option value="mm">Millimetres</option>
              <option value="in">Inches</option>
              <option value="pt">Points</option>
            </select>
          </label>
          <div className="page-size-fields">
            <label>
              Width
              <input
                aria-label="Page width"
                type="number"
                min={36 / pageUnitScale}
                max={14400 / pageUnitScale}
                step={pageUnit === 'pt' ? 1 : 0.1}
                value={Number((pageWidth / pageUnitScale).toFixed(2))}
                onChange={(event) => setPageWidth(Number(event.target.value) * pageUnitScale)}
              />
            </label>
            <label>
              Height
              <input
                aria-label="Page height"
                type="number"
                min={36 / pageUnitScale}
                max={14400 / pageUnitScale}
                step={pageUnit === 'pt' ? 1 : 0.1}
                value={Number((pageHeight / pageUnitScale).toFixed(2))}
                onChange={(event) => setPageHeight(Number(event.target.value) * pageUnitScale)}
              />
            </label>
          </div>
          <p className="copy-page-note">Reducing the size can crop content along the right or bottom edge.</p>
          <div className="copy-page-footer">
            <button type="button" onClick={() => sizeDialogRef.current?.close()}>
              Cancel
            </button>
            <button
              className="copy-page-submit"
              type="submit"
              disabled={pageWidth < 36 || pageHeight < 36 || pageWidth > 14400 || pageHeight > 14400}
            >
              Resize page
            </button>
          </div>
        </form>
      </dialog>
    </aside>
  );
}
