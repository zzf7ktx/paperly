'use client';
import { EditorCanvas } from './components/editor-canvas';
import { EditorToolbar } from './components/editor-toolbar';
import { PageRail } from './components/page-rail';
import { PropertiesPanel } from './components/properties-panel';

import { type CSSProperties } from 'react';
import { usePdfEditor } from './hooks/use-pdf-editor';
import type { ThemeMode } from './types';

export default function PdfEditor() {
  const editor = usePdfEditor();
  const {
    uploadRef,
    documentTabs,
    activeDocumentId,
    combineTitleAndTabs,
    themeMode,
    setThemeMode,
    pdfBytes,
    isXfaDocument,
    xfaChanged,
    xfaAddKind,
    edits,
    past,
    future,
    addedBoxes,
    tool,
    snapEnabled,
    snapMode,
    snapAnchor,
    showDeletedLabels,
    loading,
    error,
    toast,
    leftPanelWidth,
    setLeftPanelWidth,
    rightPanelWidth,
    setRightPanelWidth,
    leftPanelCollapsed,
    rightPanelCollapsed,
    darkMode,
    resizePanelWithKeyboard,
    startPanelResize,
    switchDocument,
    closeDocument,
    openFile,
    undo,
    redo,
    exportPdf,
  } = editor;
  const renderDocumentTabs = (combined = false) => (
    <nav className={`document-tabs ${combined ? 'combined' : ''}`} aria-label="Open PDF documents">
      <div className="document-tab-list">
        {documentTabs.map((tab) => (
          <div key={tab.id} className={`document-tab ${tab.id === activeDocumentId ? 'active' : ''}`}>
            <button
              className="document-tab-select"
              onClick={() => switchDocument(tab.id)}
              aria-current={tab.id === activeDocumentId ? 'page' : undefined}
              title={tab.name}
            >
              <span className="document-tab-icon">{tab.isXfa ? 'X' : 'P'}</span>
              <span className="document-tab-name">{tab.name}</span>
              <small>{tab.pageCount}</small>
            </button>
            <button
              className="document-tab-close"
              onClick={() => closeDocument(tab.id)}
              aria-label={`Close ${tab.name}`}
              title={`Close ${tab.name}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        className="document-tab-add"
        onClick={() => uploadRef.current?.click()}
        aria-label="Open another PDF"
        title="Open another PDF"
      >
        ＋
      </button>
    </nav>
  );

  return (
    <main
      className={`app-shell ${darkMode ? 'dark-mode' : ''} ${documentTabs.length && !combineTitleAndTabs ? 'has-document-tabs' : ''} ${combineTitleAndTabs ? 'tabs-combined' : ''} ${leftPanelCollapsed ? 'left-panel-collapsed' : ''} ${rightPanelCollapsed ? 'right-panel-collapsed' : ''} ${showDeletedLabels ? '' : 'hide-deleted-labels'}`}
      style={
        {
          '--left-panel-width': `${leftPanelCollapsed ? 42 : leftPanelWidth}px`,
          '--right-panel-width': `${rightPanelCollapsed ? 42 : rightPanelWidth}px`,
        } as CSSProperties
      }
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        openFile(event.dataTransfer.files[0]);
      }}
    >
      <header className="topbar">
        <a className="brand" href="#" aria-label="Paperly home">
          <span className="brand-word">Paperly</span>
        </a>
        {combineTitleAndTabs && documentTabs.length ? (
          renderDocumentTabs(true)
        ) : (
          <div className="header-fill" aria-hidden="true" />
        )}
        <div className="header-actions">
          <button
            className="button secondary theme-toggle"
            onClick={() => {
              const next: ThemeMode =
                themeMode === 'system' ? 'light' : themeMode === 'light' ? 'dark' : 'system';
              setThemeMode(next);
              try {
                window.localStorage.setItem('paperly-theme-mode', next);
              } catch {
                /* local preference is optional */
              }
            }}
            aria-label={`Theme: ${themeMode}. Click to change.`}
            title={`Theme: ${themeMode}. Click for ${themeMode === 'system' ? 'light' : themeMode === 'light' ? 'dark' : 'system'} mode.`}
          >
            {themeMode === 'system' ? 'Auto' : themeMode === 'light' ? 'Light' : 'Dark'}
          </button>
          <button className="icon-button" onClick={undo} disabled={!past.length} aria-label="Undo">
            ↶
          </button>
          <button className="icon-button" onClick={redo} disabled={!future.length} aria-label="Redo">
            ↷
          </button>
          <input
            ref={uploadRef}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={(event) => openFile(event.target.files?.[0])}
          />
          {documentTabs.length === 0 && (
            <button className="button secondary" onClick={() => uploadRef.current?.click()}>
              Open PDF
            </button>
          )}
          <button
            className="button primary export-button"
            onClick={exportPdf}
            aria-label={pdfBytes ? 'Export PDF' : 'Edit my PDF'}
            title={pdfBytes ? 'Export PDF' : 'Edit my PDF'}
          >
            {pdfBytes ? 'Export PDF' : 'Edit my PDF'}
          </button>
        </div>
      </header>

      {documentTabs.length > 0 && !combineTitleAndTabs && renderDocumentTabs()}

      <section
        className={`editor-grid ${leftPanelCollapsed ? 'left-panel-collapsed' : ''} ${rightPanelCollapsed ? 'right-panel-collapsed' : ''}`}
        style={
          {
            '--left-panel-width': `${leftPanelCollapsed ? 42 : leftPanelWidth}px`,
            '--right-panel-width': `${rightPanelCollapsed ? 42 : rightPanelWidth}px`,
          } as CSSProperties
        }
      >
        <PageRail editor={editor} />

        <div
          className="panel-resizer left-panel-resizer"
          role="separator"
          aria-label="Resize pages panel"
          aria-orientation="vertical"
          tabIndex={leftPanelCollapsed ? -1 : 0}
          onPointerDown={(event) => startPanelResize(event, 'left')}
          onDoubleClick={() => setLeftPanelWidth(164)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') resizePanelWithKeyboard('left', -12);
            if (event.key === 'ArrowRight') resizePanelWithKeyboard('left', 12);
          }}
        />

        <section className="workspace">
          <EditorToolbar editor={editor} />

          <EditorCanvas editor={editor} />
        </section>

        <div
          className="panel-resizer right-panel-resizer"
          role="separator"
          aria-label="Resize properties panel"
          aria-orientation="vertical"
          tabIndex={rightPanelCollapsed ? -1 : 0}
          onPointerDown={(event) => startPanelResize(event, 'right')}
          onDoubleClick={() => setRightPanelWidth(300)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') resizePanelWithKeyboard('right', 12);
            if (event.key === 'ArrowRight') resizePanelWithKeyboard('right', -12);
          }}
        />

        <PropertiesPanel editor={editor} />
      </section>
      <div className={`status-pill ${error ? 'error' : ''}`}>
        <span />{' '}
        {error ||
          (loading
            ? 'Working on your document…'
            : toast ||
              (tool === 'add-xfa'
                ? `Click the page to place a native ${xfaAddKind} XFA field`
                : tool === 'add-text'
                  ? `Click the page to place a text box · ${snapEnabled ? `${snapAnchor} by ${snapMode}` : 'Snap off'}`
                  : pdfBytes
                    ? isXfaDocument
                      ? `XFA form · ${xfaChanged ? 'Unsaved field changes' : 'Ready to fill and export'}`
                      : `${Object.keys(edits).length + addedBoxes.length} change${Object.keys(edits).length + addedBoxes.length === 1 ? '' : 's'} · ${addedBoxes.length} added text box${addedBoxes.length === 1 ? '' : 'es'}`
                    : 'Text editing preview · Open your own PDF'))}
      </div>
      {loading && (
        <div className="loading-overlay" role="status">
          <div className="loader" />
          <strong>{pdfBytes ? 'Preparing your PDF…' : 'Reading your PDF…'}</strong>
          <span>Everything is happening on this device.</span>
        </div>
      )}
    </main>
  );
}
