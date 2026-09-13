'use client';

import { useCallback } from 'react';
import type { EditorHistorySnapshot } from '../types';
import type { EditorState } from './use-editor-state';

type Context = Pick<
  EditorState,
  | 'edits'
  | 'pdfRef'
  | 'pdfBytes'
  | 'setPdfBytes'
  | 'currentPage'
  | 'setCurrentPage'
  | 'imageCaptures'
  | 'setImageCaptures'
  | 'blockVisuals'
  | 'setBlockVisuals'
  | 'activeDocumentId'
  | 'setDocumentTabs'
  | 'renderTaskRef'
  | 'formChanges'
  | 'formEdits'
  | 'formBackgrounds'
  | 'pages'
  | 'addedBoxes'
  | 'addedImages'
  | 'imageEdits'
  | 'vectorEdits'
  | 'xfaStructureEdits'
  | 'xfaDrawEdits'
  | 'xfaChanged'
  | 'setPast'
  | 'setFuture'
  | 'setEdits'
  | 'setFormChanges'
  | 'setFormEdits'
  | 'setFormBackgrounds'
  | 'setPages'
  | 'setAddedBoxes'
  | 'setAddedImages'
  | 'setImageEdits'
  | 'setVectorEdits'
  | 'setXfaStructureEdits'
  | 'setXfaDrawEdits'
  | 'setXfaChanged'
  | 'setSelectedElements'
  | 'setSelected'
  | 'setSelectedForm'
  | 'setSelectedAddedId'
  | 'setSelectedImage'
  | 'setSelectedXfaKey'
  | 'setSelectedXfaDrawKey'
> & {};

export function useEditorHistory({
  pdfRef,
  pdfBytes,
  setPdfBytes,
  currentPage,
  setCurrentPage,
  imageCaptures,
  setImageCaptures,
  blockVisuals,
  setBlockVisuals,
  activeDocumentId,
  setDocumentTabs,
  renderTaskRef,
  edits,
  formChanges,
  formEdits,
  formBackgrounds,
  pages,
  addedBoxes,
  addedImages,
  imageEdits,
  vectorEdits,
  xfaStructureEdits,
  xfaDrawEdits,
  xfaChanged,
  setPast,
  setFuture,
  setEdits,
  setFormChanges,
  setFormEdits,
  setFormBackgrounds,
  setPages,
  setAddedBoxes,
  setAddedImages,
  setImageEdits,
  setVectorEdits,
  setXfaStructureEdits,
  setXfaDrawEdits,
  setXfaChanged,
  setSelectedElements,
  setSelected,
  setSelectedForm,
  setSelectedAddedId,
  setSelectedImage,
  setSelectedXfaKey,
  setSelectedXfaDrawKey,
}: Context) {
  const createHistorySnapshot = useCallback(
    (): EditorHistorySnapshot => ({
      pageSource: pdfBytes
        ? { pdf: pdfRef.current, bytes: pdfBytes, pages, currentPage, imageCaptures, blockVisuals }
        : undefined,
      edits,
      formChanges,
      formEdits,
      formBackgrounds,
      pageForms: pages.map((page) => page.forms),
      pageVectors: pages.map((page) => page.vectors),
      pageImages: pages.map((page) => page.images),
      addedBoxes,
      addedImages,
      imageEdits,
      vectorEdits,
      xfaStructureEdits,
      xfaDrawEdits,
      xfaChanged,
    }),
    [
      pdfBytes,
      currentPage,
      imageCaptures,
      blockVisuals,
      addedBoxes,
      addedImages,
      edits,
      formBackgrounds,
      formChanges,
      formEdits,
      imageEdits,
      pages,
      vectorEdits,
      xfaChanged,
      xfaDrawEdits,
      xfaStructureEdits,
    ],
  );

  const recordHistory = useCallback(
    (snapshot?: EditorHistorySnapshot) => {
      const entry = snapshot || createHistorySnapshot();
      setPast((history) => [...history.slice(-39), entry]);
      setFuture([]);
    },
    [createHistorySnapshot],
  );

  const restoreHistorySnapshot = useCallback(
    (snapshot: EditorHistorySnapshot) => {
      if (snapshot.pageSource) {
        renderTaskRef.current?.cancel?.();
        pdfRef.current = snapshot.pageSource.pdf;
        setPdfBytes(snapshot.pageSource.bytes);
        setCurrentPage(snapshot.pageSource.currentPage);
        setImageCaptures(snapshot.pageSource.imageCaptures);
        setBlockVisuals(snapshot.pageSource.blockVisuals);
        setDocumentTabs((tabs) =>
          tabs.map((tab) =>
            tab.id === activeDocumentId ? { ...tab, pageCount: snapshot.pageSource!.pages.length } : tab,
          ),
        );
      }
      setEdits(snapshot.edits);
      setFormChanges(snapshot.formChanges);
      setFormEdits(snapshot.formEdits);
      setFormBackgrounds(snapshot.formBackgrounds);
      setPages((items) =>
        (snapshot.pageSource?.pages || items).map((page, index) => ({
          ...page,
          forms: snapshot.pageForms[index] || page.forms,
          vectors: snapshot.pageVectors?.[index] || page.vectors,
          images: snapshot.pageImages?.[index] || page.images,
        })),
      );
      setAddedBoxes(snapshot.addedBoxes);
      setAddedImages(snapshot.addedImages);
      setImageEdits(snapshot.imageEdits);
      setVectorEdits(snapshot.vectorEdits || {});
      setXfaStructureEdits(snapshot.xfaStructureEdits);
      setXfaDrawEdits(snapshot.xfaDrawEdits);
      setXfaChanged(snapshot.xfaChanged);
      setSelectedElements([]);
      setSelected(null);
      setSelectedForm(null);
      setSelectedAddedId(null);
      setSelectedImage(null);
      setSelectedXfaKey(null);
      setSelectedXfaDrawKey(null);
    },
    [activeDocumentId],
  );

  return { createHistorySnapshot, recordHistory, restoreHistorySnapshot };
}
