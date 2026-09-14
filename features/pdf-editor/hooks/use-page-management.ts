'use client';

import { useRef } from 'react';
import type { EditorState } from './use-editor-state';
import type { DocumentSession, EditorHistorySnapshot } from '../types';
import { managePages, remapPageItems, remapPageMap, type PageOperation } from '../services/manage-pages';

export function usePageManagement(
  state: EditorState,
  prepareDocument: (file: File) => Promise<DocumentSession | undefined>,
  recordHistory: (snapshot?: EditorHistorySnapshot) => void,
  serializeDocument: () => Promise<Uint8Array | undefined>,
) {
  const busyRef = useRef(false);
  const activeDocumentRef = useRef(state.activeDocumentId);
  activeDocumentRef.current = state.activeDocumentId;
  const changePages = async (operation: PageOperation) => {
    if (!state.pdfBytes || state.loading || state.ocrBusy || busyRef.current || state.isXfaDocument) return;
    busyRef.current = true;
    state.setLoading(true);
    state.setError('');
    try {
      const result = await managePages(state.pdfBytes, operation);
      const prepared = await prepareDocument(
        new File([result.bytes as BlobPart], `${state.fileName}.pdf`, { type: 'application/pdf' }),
      );
      if (!prepared) throw new Error('The updated PDF could not be opened.');
      if (activeDocumentRef.current !== state.activeDocumentId) {
        await prepared.pdf.destroy();
        return;
      }
      recordHistory();
      state.renderTaskRef.current?.cancel?.();
      state.pdfRef.current = prepared.pdf;
      state.setPdfBytes(result.bytes);
      state.setPages(
        result.order.map((old, index) =>
          old === null || (operation.kind === 'resize' && index === operation.index)
            ? prepared.pages[index]
            : state.pages[old],
        ),
      );
      state.setCurrentPage(result.selected);
      state.setEdits(remapPageMap(state.edits, result.order));
      const retainedFormNames = new Set(
        result.order.flatMap((old) => (old === null ? [] : state.pages[old].forms.map((form) => form.name))),
      );
      state.setFormChanges(
        Object.fromEntries(Object.entries(state.formChanges).filter(([name]) => retainedFormNames.has(name))),
      );
      state.setFormEdits(remapPageMap(state.formEdits, result.order));
      state.setFormBackgrounds(remapPageMap(state.formBackgrounds, result.order));
      state.setVectorEdits(remapPageMap(state.vectorEdits, result.order));
      state.setImageEdits(remapPageMap(state.imageEdits, result.order));
      state.setImageCaptures(remapPageMap(state.imageCaptures, result.order));
      state.setBlockVisuals(remapPageMap(state.blockVisuals, result.order));
      state.setAddedBoxes(remapPageItems(state.addedBoxes, result.order));
      state.setAddedImages(remapPageItems(state.addedImages, result.order));
      state.setSelectedElements([]);
      state.setSelected(null);
      state.setSelectedForm(null);
      state.setSelectedAddedId(null);
      state.setSelectedImage(null);
      state.setSelectedVectorId(null);
      state.setTool('select');
      state.setDocumentTabs((tabs) =>
        tabs.map((tab) =>
          tab.id === state.activeDocumentId ? { ...tab, pageCount: result.order.length } : tab,
        ),
      );
      state.setToast(
        operation.kind === 'insert'
          ? 'PDF pages combined'
          : operation.kind === 'resize'
            ? 'Page size updated'
            : 'Pages updated',
      );
      window.setTimeout(() => state.setToast(''), 2600);
    } catch (error) {
      state.setError(error instanceof Error ? error.message : 'Pages could not be updated.');
    } finally {
      state.setLoading(false);
      busyRef.current = false;
    }
  };
  const insertPdfFiles = async (files: File[], after: number) => {
    if (!files.length) return;
    try {
      const sources = await Promise.all(files.map(async (file) => new Uint8Array(await file.arrayBuffer())));
      if (activeDocumentRef.current !== state.activeDocumentId) return;
      await changePages({ kind: 'insert', after, files: sources });
    } catch {
      state.setError('The selected files could not be read.');
    }
  };
  const copyPageToTab = async (sourceIndex: number, targetId: string, after: number): Promise<boolean> => {
    const target = state.documentSessionsRef.current.get(targetId);
    if (
      !target ||
      targetId === state.activeDocumentId ||
      target.isXfaDocument ||
      state.isXfaDocument ||
      state.loading ||
      state.ocrBusy ||
      busyRef.current ||
      !state.pages[sourceIndex]
    )
      return false;
    busyRef.current = true;
    state.setLoading(true);
    state.setError('');
    try {
      const sourceBytes = await serializeDocument();
      if (!sourceBytes) throw new Error('The source page could not be copied.');
      const { PDFDocument } = await import('pdf-lib');
      const source = await PDFDocument.load(sourceBytes);
      if (source.getForm().getFields().length) source.getForm().flatten();
      const single = await PDFDocument.create();
      const [page] = await single.copyPages(source, [sourceIndex]);
      single.addPage(page);
      const result = await managePages(target.pdfBytes, {
        kind: 'insert',
        after,
        files: [await single.save()],
      });
      const prepared = await prepareDocument(
        new File([result.bytes as BlobPart], `${target.name}.pdf`, { type: 'application/pdf' }),
      );
      if (!prepared) throw new Error('The destination PDF could not be updated.');
      if (
        activeDocumentRef.current !== state.activeDocumentId ||
        state.documentSessionsRef.current.get(targetId) !== target
      ) {
        await prepared.pdf.destroy();
        throw new Error('The destination changed. Please try copying again.');
      }
      const snapshot: EditorHistorySnapshot = {
        edits: target.edits,
        formChanges: target.formChanges,
        formEdits: target.formEdits,
        formBackgrounds: target.formBackgrounds,
        addedBoxes: target.addedBoxes,
        addedImages: target.addedImages,
        imageEdits: target.imageEdits,
        vectorEdits: target.vectorEdits,
        xfaStructureEdits: target.xfaStructureEdits,
        xfaDrawEdits: target.xfaDrawEdits,
        xfaChanged: target.xfaChanged,
        pageForms: target.pages.map((page) => page.forms),
        pageVectors: target.pages.map((page) => page.vectors),
        pageImages: target.pages.map((page) => page.images),
        pageSource: {
          pdf: target.pdf,
          bytes: target.pdfBytes,
          pages: target.pages,
          currentPage: target.currentPage,
          imageCaptures: target.imageCaptures,
          blockVisuals: target.blockVisuals,
        },
      };
      const updated: DocumentSession = {
        ...target,
        pdf: prepared.pdf,
        pdfBytes: result.bytes,
        pages: result.order.map((old, index) => (old === null ? prepared.pages[index] : target.pages[old])),
        currentPage: result.selected,
        past: [...target.past.slice(-39), snapshot],
        future: [],
        edits: remapPageMap(target.edits, result.order),
        formEdits: remapPageMap(target.formEdits, result.order),
        formBackgrounds: remapPageMap(target.formBackgrounds, result.order),
        vectorEdits: remapPageMap(target.vectorEdits, result.order),
        imageEdits: remapPageMap(target.imageEdits, result.order),
        imageCaptures: remapPageMap(target.imageCaptures, result.order),
        blockVisuals: remapPageMap(target.blockVisuals, result.order),
        addedBoxes: remapPageItems(target.addedBoxes, result.order),
        addedImages: remapPageItems(target.addedImages, result.order),
      };
      state.documentSessionsRef.current.set(targetId, updated);
      state.setDocumentTabs((tabs) =>
        tabs.map((tab) => (tab.id === targetId ? { ...tab, pageCount: updated.pages.length } : tab)),
      );
      state.setToast(`Page ${sourceIndex + 1} copied to ${target.name}`);
      window.setTimeout(() => state.setToast(''), 3200);
      return true;
    } catch (error) {
      state.setError(error instanceof Error ? error.message : 'The page could not be copied.');
      return false;
    } finally {
      state.setLoading(false);
      busyRef.current = false;
    }
  };
  return { changePages, insertPdfFiles, copyPageToTab };
}
