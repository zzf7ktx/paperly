'use client';

import { useCallback } from 'react';
import type { EditorHistorySnapshot } from '../types';
import type { EditorState } from './use-editor-state';

type Context = Pick<
  EditorState,
  | 'edits'
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
      edits,
      formChanges,
      formEdits,
      formBackgrounds,
      pageForms: pages.map((page) => page.forms),
      pageVectors: pages.map((page) => page.vectors),
      addedBoxes,
      addedImages,
      imageEdits,
      vectorEdits,
      xfaStructureEdits,
      xfaDrawEdits,
      xfaChanged,
    }),
    [
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

  const restoreHistorySnapshot = useCallback((snapshot: EditorHistorySnapshot) => {
    setEdits(snapshot.edits);
    setFormChanges(snapshot.formChanges);
    setFormEdits(snapshot.formEdits);
    setFormBackgrounds(snapshot.formBackgrounds);
    setPages((items) =>
      items.map((page, index) => ({
        ...page,
        forms: snapshot.pageForms[index] || page.forms,
        vectors: snapshot.pageVectors?.[index] || page.vectors,
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
  }, []);

  return { createHistorySnapshot, recordHistory, restoreHistorySnapshot };
}
