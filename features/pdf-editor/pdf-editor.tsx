'use client';
import { EditorCanvas } from './components/editor-canvas';
import { EditorToolbar } from './components/editor-toolbar';
import { PageRail } from './components/page-rail';
import { PropertiesPanel } from './components/properties-panel';
import { XfaXmlDialog } from './components/xfa-xml-dialog';
import './components/xfa-xml-dialog.css';

import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { usePdfEditor } from './hooks/use-pdf-editor';
import type { ThemeMode } from './types';

const APP_VERSION = '0.1.0';
const RELEASES_URL = 'https://github.com/zzf7ktx/paperly/releases';
const RELEASES_API_URL = 'https://api.github.com/repos/zzf7ktx/paperly/releases/latest';

type NativeUpdateStatus = {
  status: 'checking' | 'downloading' | 'downloaded' | 'latest' | 'error';
  version?: string;
  percent?: number;
};

declare global {
  interface Window {
    paperlyUpdater?: {
      check: () => Promise<void>;
      install: () => Promise<void>;
      onStatus: (listener: (status: NativeUpdateStatus) => void) => () => void;
    };
  }
}

function parseVersion(version: string) {
  const cleaned = version.replace(/^v/i, '').trim();
  const [major = '0', minor = '0', patch = '0'] = cleaned.split('.');
  return [Number(major), Number(minor), Number(patch)];
}

function isNewerVersion(current: string, latest: string) {
  const currentParts = parseVersion(current);
  const latestParts = parseVersion(latest);

  for (let index = 0; index < 3; index += 1) {
    if (latestParts[index] > currentParts[index]) return true;
    if (latestParts[index] < currentParts[index]) return false;
  }

  return false;
}

export default function PdfEditor() {
  const editor = usePdfEditor();
  const newPdfDialogRef = useRef<HTMLDialogElement>(null);
  const fileMenuRef = useRef<HTMLDetailsElement>(null);
  const moreMenuRef = useRef<HTMLDetailsElement>(null);
  const [newPdfSize, setNewPdfSize] = useState<'a4' | 'letter' | 'legal' | 'custom'>('a4');
  const [newPdfOrientation, setNewPdfOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [newPdfPages, setNewPdfPages] = useState(1);
  const [newPdfCustomWidth, setNewPdfCustomWidth] = useState(210);
  const [newPdfCustomHeight, setNewPdfCustomHeight] = useState(297);
  const [newPdfCustomUnit, setNewPdfCustomUnit] = useState<'mm' | 'in' | 'pt'>('mm');
  const [updateStatus, setUpdateStatus] = useState<
    'idle' | 'loading' | 'latest' | 'available' | 'downloading' | 'downloaded' | 'error'
  >('idle');
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const {
    uploadRef,
    documentTabs,
    activeDocumentId,
    combineTitleAndTabs,
    themeMode,
    setThemeMode,
    pdfBytes,
    fileName,
    isXfaDocument,
    xfaViewMode,
    switchingXfaView,
    switchXfaView,
    exportXfaWithEditedFallback,
    xfaChanged,
    xfaFields,
    xfaStructureEdits,
    activeXfaField,
    setSelectedXfaKey,
    setCurrentPage,
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
    setError,
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
    openStaticPdf,
    undo,
    redo,
    exportPdf,
    getXfaXmlBytes,
  } = editor;

  useEffect(() => {
    const updater = window.paperlyUpdater;
    if (!updater) return;

    return updater.onStatus(({ status, version, percent }) => {
      setUpdateStatus(status === 'checking' ? 'loading' : status);
      if (version) setLatestVersion(version);
      if (typeof percent === 'number') setDownloadProgress(percent);
    });
  }, []);

  const newPdfUnitScale = { mm: 72 / 25.4, in: 72, pt: 1 }[newPdfCustomUnit];
  const customWidthPoints = newPdfCustomWidth * newPdfUnitScale;
  const customHeightPoints = newPdfCustomHeight * newPdfUnitScale;
  const customSizeValid =
    customWidthPoints >= 36 &&
    customHeightPoints >= 36 &&
    customWidthPoints <= 14400 &&
    customHeightPoints <= 14400;

  const createNewPdf = async () => {
    if (newPdfSize === 'custom' && !customSizeValid) return;
    const sizes = { a4: [595.28, 841.89], letter: [612, 792], legal: [612, 1008] } as const;
    const selected = newPdfSize === 'custom' ? [customWidthPoints, customHeightPoints] : sizes[newPdfSize];
    const dimensions: [number, number] =
      newPdfSize === 'custom' || newPdfOrientation === 'portrait'
        ? [selected[0], selected[1]]
        : [selected[1], selected[0]];
    const { PDFDocument } = await import('pdf-lib');
    const pdf = await PDFDocument.create();
    for (let page = 0; page < newPdfPages; page += 1) pdf.addPage(dimensions);
    const bytes = await pdf.save();
    newPdfDialogRef.current?.close();
    await openFile(
      new File([bytes.slice().buffer as ArrayBuffer], 'Untitled.pdf', { type: 'application/pdf' }),
    );
  };

  const cycleTheme = () => {
    const next: ThemeMode = themeMode === 'system' ? 'light' : themeMode === 'light' ? 'dark' : 'system';
    setThemeMode(next);
    try {
      window.localStorage.setItem('paperly-theme-mode', next);
    } catch {
      /* optional preference */
    }
  };

  const handleUpdate = async () => {
    const nativeUpdater = window.paperlyUpdater;
    if (nativeUpdater) {
      if (updateStatus === 'downloaded') return nativeUpdater.install();
      setDownloadProgress(null);
      setUpdateStatus('loading');
      try {
        await nativeUpdater.check();
      } catch {
        setUpdateStatus('error');
      }
      return;
    }
    setUpdateStatus('loading');
    try {
      const response = await fetch(RELEASES_API_URL, { headers: { Accept: 'application/vnd.github+json' } });
      if (!response.ok) throw new Error('Unable to check for updates.');
      const data = (await response.json()) as {
        tag_name?: string;
        html_url?: string;
        assets?: Array<{ name?: string; browser_download_url?: string }>;
      };
      const tag = data.tag_name || 'v0.0.0';
      const installer = data.assets?.find((asset) => /\.exe$/i.test(asset.name || '')) || data.assets?.[0];
      const releaseUrl = data.html_url || RELEASES_URL;
      if (isNewerVersion(APP_VERSION, tag)) {
        setLatestVersion(tag);
        setUpdateStatus('available');
        const anchor = document.createElement('a');
        anchor.href = installer?.browser_download_url || releaseUrl;
        anchor.target = '_blank';
        anchor.rel = 'noreferrer';
        anchor.download = installer?.name || 'Paperly-Setup.exe';
        anchor.click();
      } else {
        setLatestVersion(tag);
        setUpdateStatus('latest');
        window.open(RELEASES_URL, '_blank', 'noopener,noreferrer');
      }
    } catch {
      setUpdateStatus('error');
      window.open(RELEASES_URL, '_blank', 'noopener,noreferrer');
    }
  };

  const renderDocumentTabs = (combined = false) => (
    <nav className={`document-tabs ${combined ? 'combined' : ''}`} aria-label="Open PDF documents">
      <div
        className="document-tab-list"
        tabIndex={documentTabs.length > 1 ? 0 : -1}
        onWheel={(event) => {
          if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
          event.currentTarget.scrollLeft += event.deltaY;
        }}
      >
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
        const file = event.dataTransfer.files[0];
        if (/\.(xdp|xml)$/i.test(file?.name || ''))
          window.dispatchEvent(new CustomEvent('paperly-open-xfa', { detail: file }));
        else openFile(file);
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
          {xfaViewMode && (
            <div className="xfa-view-switch" role="group" aria-label="XFA document view">
              <button
                className={xfaViewMode === 'xfa' ? 'active' : ''}
                onClick={() => switchXfaView('xfa')}
                disabled={switchingXfaView}
                aria-pressed={xfaViewMode === 'xfa'}
                title="Use the live XFA form"
              >
                XFA form
              </button>
              <button
                className={xfaViewMode === 'fallback' ? 'active' : ''}
                onClick={() => switchXfaView('fallback')}
                disabled={switchingXfaView}
                aria-pressed={xfaViewMode === 'fallback'}
                title="Edit the standard PDF fallback"
              >
                {switchingXfaView ? 'Preparing…' : 'Fallback'}
              </button>
            </div>
          )}
          {xfaViewMode === 'fallback' && (
            <button
              className="button secondary xfa-fallback-export"
              onClick={() => void exportXfaWithEditedFallback()}
              disabled={switchingXfaView}
              title="Export one XFA PDF containing these edited fallback pages"
            >
              Export XFA + fallback
            </button>
          )}
          <button
            className="icon-button history-action undo-action"
            onClick={undo}
            disabled={!past.length}
            aria-label="Undo"
          >
            ↶
          </button>
          <button
            className="icon-button history-action redo-action"
            onClick={redo}
            disabled={!future.length}
            aria-label="Redo"
          >
            ↷
          </button>
          <input
            ref={uploadRef}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={(event) => openFile(event.target.files?.[0])}
          />
          <div className="header-file-split">
            <button type="button" onClick={() => newPdfDialogRef.current?.showModal()}>
              New PDF
            </button>
            <details ref={fileMenuRef}>
              <summary role="button" aria-label="More new and open options">
                ▾
              </summary>
              <div className="header-file-menu">
                <button
                  onClick={() => {
                    fileMenuRef.current?.removeAttribute('open');
                    newPdfDialogRef.current?.showModal();
                  }}
                >
                  <b>＋</b>
                  <span>
                    New PDF<small>Create blank pages</small>
                  </span>
                </button>
                <button
                  onClick={() => {
                    fileMenuRef.current?.removeAttribute('open');
                    uploadRef.current?.click();
                  }}
                >
                  <b>↥</b>
                  <span>
                    Open PDF<small>Choose an existing document</small>
                  </span>
                </button>
                <button
                  onClick={() => {
                    fileMenuRef.current?.removeAttribute('open');
                    window.dispatchEvent(new Event('paperly-choose-xfa'));
                  }}
                >
                  <b>X</b>
                  <span>
                    Open XFA<small>Import XML or XDP</small>
                  </span>
                </button>
              </div>
            </details>
          </div>
          <button
            className={`button secondary update-button standalone-update update-${updateStatus}`}
            type="button"
            onClick={async () => {
              const nativeUpdater = window.paperlyUpdater;
              if (nativeUpdater) {
                if (updateStatus === 'downloaded') {
                  await nativeUpdater.install();
                  return;
                }

                setDownloadProgress(null);
                setUpdateStatus('loading');
                try {
                  await nativeUpdater.check();
                } catch {
                  setUpdateStatus('error');
                }
                return;
              }

              setUpdateStatus('loading');
              try {
                const response = await fetch(RELEASES_API_URL, {
                  headers: { Accept: 'application/vnd.github+json' },
                });
                if (!response.ok) throw new Error('Unable to check for updates.');
                const data = (await response.json()) as {
                  tag_name?: string;
                  html_url?: string;
                  assets?: Array<{ name?: string; browser_download_url?: string }>;
                };
                const tag = data.tag_name || 'v0.0.0';
                const installerAsset =
                  data.assets?.find((asset) => /\.exe$/i.test(asset.name || '')) || data.assets?.[0];
                const nextReleaseUrl = data.html_url || RELEASES_URL;

                if (isNewerVersion(APP_VERSION, tag)) {
                  setLatestVersion(tag);
                  setUpdateStatus('available');

                  const downloadUrl = installerAsset?.browser_download_url || nextReleaseUrl;
                  const anchor = document.createElement('a');
                  anchor.href = downloadUrl;
                  anchor.target = '_blank';
                  anchor.rel = 'noreferrer';
                  anchor.download = installerAsset?.name || 'Paperly-Setup.exe';
                  document.body.appendChild(anchor);
                  anchor.click();
                  document.body.removeChild(anchor);
                  return;
                }

                setLatestVersion(tag);
                setUpdateStatus('latest');
                window.open(RELEASES_URL, '_blank', 'noopener,noreferrer');
              } catch {
                setUpdateStatus('error');
                window.open(RELEASES_URL, '_blank', 'noopener,noreferrer');
              }
            }}
            aria-label={
              updateStatus === 'loading'
                ? 'Checking for updates'
                : updateStatus === 'downloading'
                  ? `Downloading update${downloadProgress === null ? '' : `: ${downloadProgress}%`}`
                  : updateStatus === 'downloaded'
                    ? `Install ${latestVersion ?? 'update'}`
                    : updateStatus === 'available'
                      ? `Update ${latestVersion ?? ''}`.trim()
                      : updateStatus === 'latest'
                        ? 'Paperly is up to date'
                        : updateStatus === 'error'
                          ? 'Try checking for updates again'
                          : 'Check for updates'
            }
            title={
              updateStatus === 'loading'
                ? 'Checking for updates…'
                : updateStatus === 'downloading'
                  ? `Downloading update${downloadProgress === null ? '…' : `: ${downloadProgress}%`}`
                  : updateStatus === 'downloaded'
                    ? 'Restart Paperly and install the downloaded update'
                    : updateStatus === 'available'
                      ? `Download ${latestVersion ?? 'the latest update'}`
                      : updateStatus === 'latest'
                        ? 'Paperly is up to date'
                        : updateStatus === 'error'
                          ? 'Try checking for updates again'
                          : 'Check for updates'
            }
          >
            {updateStatus === 'loading'
              ? 'Checking…'
              : updateStatus === 'downloading'
                ? `Downloading${downloadProgress === null ? '...' : ` ${downloadProgress}%`}`
                : updateStatus === 'downloaded'
                  ? `Install ${latestVersion ?? 'update'}`
                  : updateStatus === 'available'
                    ? `Update ${latestVersion ?? ''}`
                    : updateStatus === 'latest'
                      ? 'Up to date'
                      : updateStatus === 'error'
                        ? 'Try updates'
                        : 'Check for updates'}
          </button>
          <details ref={moreMenuRef} className="header-more-menu">
            <summary role="button" aria-label="More application options">
              •••
            </summary>
            <div>
              <button
                aria-label={`Theme: ${themeMode}. Click to change.`}
                onClick={() => {
                  cycleTheme();
                  moreMenuRef.current?.removeAttribute('open');
                }}
              >
                <b>{themeMode === 'system' ? 'A' : themeMode === 'light' ? '☀' : '◐'}</b>
                <span>
                  Theme
                  <small>
                    {themeMode === 'system' ? 'System' : themeMode === 'light' ? 'Light' : 'Dark'} · click to
                    change
                  </small>
                </span>
              </button>
              <button
                aria-label="Check for updates"
                disabled={updateStatus === 'loading' || updateStatus === 'downloading'}
                onClick={() => {
                  void handleUpdate();
                  moreMenuRef.current?.removeAttribute('open');
                }}
              >
                <b>↻</b>
                <span>
                  Updates
                  <small>
                    {updateStatus === 'downloaded'
                      ? `Install ${latestVersion ?? 'update'}`
                      : updateStatus === 'available'
                        ? `Download ${latestVersion ?? 'update'}`
                        : updateStatus === 'latest'
                          ? 'Paperly is up to date'
                          : updateStatus === 'error'
                            ? 'Check again'
                            : 'Check for updates'}
                  </small>
                </span>
              </button>
            </div>
          </details>
          <XfaXmlDialog
            fileName={fileName}
            hasXfaDocument={Boolean(xfaViewMode)}
            hideOpenTrigger
            getBytes={getXfaXmlBytes}
            onOpenPdf={async (file) => {
              await openFile(file);
            }}
            onOpenStaticPdf={openStaticPdf}
            activeFieldPath={activeXfaField?.nativePath}
            onJumpToControl={(name) => {
              const fields = Object.values({ ...xfaFields, ...xfaStructureEdits }).filter(
                (field) => !field.deleted && (field.name === name || field.nativePath === name),
              );
              const field = fields.find((candidate) => candidate.page === activeXfaField?.page) || fields[0];
              if (!field) {
                setError(`No rendered XFA control named “${name}” was found.`);
                return;
              }
              setCurrentPage(field.page);
              setSelectedXfaKey(field.key);
              window.setTimeout(() => {
                document
                  .querySelector<HTMLElement>(`[data-paperly-xfa-key="${CSS.escape(field.key)}"]`)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 50);
            }}
            onError={setError}
          />
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

      <dialog ref={newPdfDialogRef} className="new-pdf-dialog" aria-labelledby="new-pdf-title">
        <form method="dialog">
          <header>
            <div>
              <h2 id="new-pdf-title">New PDF</h2>
              <p>Start with clean, editable pages.</p>
            </div>
            <button className="icon-button" value="cancel" aria-label="Close new PDF dialog">
              ×
            </button>
          </header>
          <div className="new-pdf-options">
            <label>
              Page size
              <select
                value={newPdfSize}
                onChange={(event) => setNewPdfSize(event.target.value as typeof newPdfSize)}
              >
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
                <option value="legal">Legal</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            {newPdfSize === 'custom' ? (
              <label>
                Unit
                <select
                  value={newPdfCustomUnit}
                  onChange={(event) => setNewPdfCustomUnit(event.target.value as typeof newPdfCustomUnit)}
                >
                  <option value="mm">Millimetres</option>
                  <option value="in">Inches</option>
                  <option value="pt">Points</option>
                </select>
              </label>
            ) : (
              <label>
                Orientation
                <select
                  value={newPdfOrientation}
                  onChange={(event) => setNewPdfOrientation(event.target.value as typeof newPdfOrientation)}
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </label>
            )}
            {newPdfSize === 'custom' && (
              <>
                <label>
                  Width
                  <input
                    type="number"
                    min={36 / newPdfUnitScale}
                    max={14400 / newPdfUnitScale}
                    step={newPdfCustomUnit === 'pt' ? 1 : 0.1}
                    value={newPdfCustomWidth}
                    onChange={(event) => setNewPdfCustomWidth(Number(event.target.value))}
                  />
                </label>
                <label>
                  Height
                  <input
                    type="number"
                    min={36 / newPdfUnitScale}
                    max={14400 / newPdfUnitScale}
                    step={newPdfCustomUnit === 'pt' ? 1 : 0.1}
                    value={newPdfCustomHeight}
                    onChange={(event) => setNewPdfCustomHeight(Number(event.target.value))}
                  />
                </label>
              </>
            )}
            <label>
              Pages
              <input
                type="number"
                min="1"
                max="100"
                value={newPdfPages}
                onChange={(event) =>
                  setNewPdfPages(Math.max(1, Math.min(100, Number(event.target.value) || 1)))
                }
              />
            </label>
          </div>
          <footer>
            <button className="button secondary" value="cancel">
              Cancel
            </button>
            <button
              className="button primary"
              type="button"
              disabled={newPdfSize === 'custom' && !customSizeValid}
              onClick={() => void createNewPdf()}
            >
              Create PDF
            </button>
          </footer>
        </form>
      </dialog>

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
                      : `${xfaViewMode === 'fallback' ? 'Fallback PDF · ' : ''}${Object.keys(edits).length + addedBoxes.length} change${Object.keys(edits).length + addedBoxes.length === 1 ? '' : 's'} · ${addedBoxes.length} added text box${addedBoxes.length === 1 ? '' : 'es'}`
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
