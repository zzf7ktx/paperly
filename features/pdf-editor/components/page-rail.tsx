'use client';

import { PdfThumbnail } from './pdf-thumbnail';
import type { PdfEditorController } from '../hooks/use-pdf-editor';

type Props = {
  editor: Pick<
    PdfEditorController,
    | 'pdfRef'
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
    | 'setTool'
    | 'leftPanelCollapsed'
    | 'setLeftPanelCollapsed'
  >;
};

export function PageRail({ editor }: Props) {
  const {
    pdfRef,
    pdfBytes,
    isXfaDocument,
    setSelectedXfaDrawKey,
    setSelectedXfaKey,
    pages,
    currentPage,
    setCurrentPage,
    setSelected,
    setSelectedElements,
    setSelectedForm,
    addedBoxes,
    setSelectedImage,
    setSelectedAddedId,
    setTool,
    leftPanelCollapsed,
    setLeftPanelCollapsed,
  } = editor;
  return (
    <aside className={`page-rail ${leftPanelCollapsed ? 'is-collapsed' : ''}`} aria-label="Pages panel">
      <div className="rail-heading">
        <span>{leftPanelCollapsed ? 'P' : 'Pages'}</span>
        {!leftPanelCollapsed && <span className="page-count">{pages.length || 2}</span>}
        <button
          className="panel-collapse-button"
          data-direction={leftPanelCollapsed ? 'right' : 'left'}
          onClick={() => setLeftPanelCollapsed((collapsed) => !collapsed)}
          aria-label={leftPanelCollapsed ? 'Expand pages panel' : 'Collapse pages panel'}
          title={leftPanelCollapsed ? 'Expand pages panel' : 'Collapse pages panel'}
        >
          {leftPanelCollapsed ? '›' : '‹'}
        </button>
      </div>
      {!leftPanelCollapsed &&
        (pdfBytes && pages.length ? (
          pages.map((page, index) => (
            <PdfThumbnail
              key={`${editor.activeDocumentId}:${index}`}
              page={page}
              addedText={addedBoxes.filter((box) => box.page === index)}
              pdfRef={pdfRef}
              isXfa={isXfaDocument}
              index={index}
              active={currentPage === index}
              onClick={() => {
                setCurrentPage(index);
                setSelectedElements([]);
                setSelected(null);
                setSelectedForm(null);
                setSelectedAddedId(null);
                setSelectedImage(null);
                setSelectedXfaKey(null);
                setSelectedXfaDrawKey(null);
                setTool('select');
              }}
            />
          ))
        ) : (
          <>
            <button className="thumbnail active">
              <span className="page-number">1</span>
              <span className="mini-page">
                <i />
                <i />
                <i />
                <b />
              </span>
            </button>
            <button className="thumbnail">
              <span className="page-number">2</span>
              <span className="mini-page second">
                <i />
                <i />
                <b />
              </span>
            </button>
          </>
        ))}
    </aside>
  );
}
