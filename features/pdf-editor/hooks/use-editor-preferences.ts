'use client';

import { useEffect } from 'react';
import type { EditorState } from './use-editor-state';

type Context = Pick<
  EditorState,
  | 'setCombineTitleAndTabs'
  | 'setJoinSplitCharacters'
  | 'setHideScrollbars'
  | 'setThemeMode'
  | 'setSystemDarkMode'
  | 'themeMode'
  | 'systemDarkMode'
  | 'ocrWorkerRef'
  | 'selectedElements'
  | 'selectedVectorId'
  | 'deleteSelectionRef'
  | 'deleteVectorRef'
  | 'selectedXfaKey'
  | 'selectedXfaDrawKey'
  | 'setSelectedElements'
  | 'selected'
  | 'selectedForm'
  | 'selectedAddedId'
  | 'selectedImage'
  | 'setSelectedVectorId'
  | 'currentPage'
  | 'setSelected'
  | 'setSelectedForm'
  | 'pages'
  | 'setSelectedAddedId'
  | 'setSelectedImage'
> & {};

export function useEditorPreferences({
  setCombineTitleAndTabs,
  setJoinSplitCharacters,
  setHideScrollbars,
  setThemeMode,
  setSystemDarkMode,
  themeMode,
  systemDarkMode,
  ocrWorkerRef,
  selectedElements,
  selectedVectorId,
  deleteSelectionRef,
  deleteVectorRef,
  selectedXfaKey,
  selectedXfaDrawKey,
  setSelectedElements,
  selected,
  selectedForm,
  selectedAddedId,
  selectedImage,
  setSelectedVectorId,
  currentPage,
  setSelected,
  setSelectedForm,
  pages,
  setSelectedAddedId,
  setSelectedImage,
}: Context) {
  useEffect(() => {
    try {
      setCombineTitleAndTabs(window.localStorage.getItem('paperly-combine-title-tabs') === 'true');
      setJoinSplitCharacters(window.localStorage.getItem('paperly-join-split-characters') !== 'false');
      setHideScrollbars(window.localStorage.getItem('paperly-hide-scrollbars') === 'true');
      const storedTheme =
        window.localStorage.getItem('paperly-theme-mode') || window.localStorage.getItem('paperly-theme');
      setThemeMode(storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'system');
    } catch {
      /* local preferences are optional */
    }
  }, []);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystemTheme = () => setSystemDarkMode(preference.matches);
    syncSystemTheme();
    preference.addEventListener('change', syncSystemTheme);
    return () => preference.removeEventListener('change', syncSystemTheme);
  }, []);
  const darkMode = themeMode === 'dark' || (themeMode === 'system' && systemDarkMode);
  useEffect(() => {
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';
    return () => {
      document.documentElement.style.colorScheme = '';
    };
  }, [darkMode]);
  useEffect(
    () => () => {
      void ocrWorkerRef.current?.terminate?.();
      ocrWorkerRef.current = null;
    },
    [],
  );
  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isEditing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement &&
          (target.isContentEditable || Boolean(target.closest('button, a, summary'))));
      if (
        isEditing ||
        (event.key !== 'Delete' && event.key !== 'Backspace') ||
        (!selectedElements.length && !selectedVectorId)
      )
        return;
      event.preventDefault();
      if (selectedElements.length) deleteSelectionRef.current();
      else deleteVectorRef.current();
    };
    window.addEventListener('keydown', keyDown);
    return () => window.removeEventListener('keydown', keyDown);
  }, [selectedElements.length, selectedVectorId]);

  useEffect(() => {
    if (selectedXfaKey || selectedXfaDrawKey) setSelectedElements([]);
  }, [selectedXfaDrawKey, selectedXfaKey]);
  useEffect(() => {
    if (
      selected !== null ||
      selectedForm ||
      selectedAddedId ||
      selectedImage ||
      selectedXfaKey ||
      selectedXfaDrawKey
    )
      setSelectedVectorId(null);
  }, [selected, selectedAddedId, selectedForm, selectedImage, selectedXfaDrawKey, selectedXfaKey]);
  useEffect(() => {
    if (selectedXfaKey || selectedXfaDrawKey) return;
    const primaryStillSelected = selectedElements.some(
      (item) =>
        item.page === currentPage &&
        ((item.kind === 'text' && selected !== null && item.id === String(selected)) ||
          (item.kind === 'form' && item.id === selectedForm?.id) ||
          (item.kind === 'added-text' && item.id === selectedAddedId) ||
          (item.kind === 'image' && selectedImage?.kind === 'existing' && item.id === selectedImage.id) ||
          (item.kind === 'added-image' && selectedImage?.kind === 'added' && item.id === selectedImage.id) ||
          (item.kind === 'vector' && item.id === selectedVectorId)),
    );
    if (primaryStillSelected) return;
    const primary = selectedElements[selectedElements.length - 1];
    setSelected(primary?.kind === 'text' ? Number(primary.id) : null);
    setSelectedForm(
      primary?.kind === 'form'
        ? pages[primary.page]?.forms.find((field) => field.id === primary.id) || null
        : null,
    );
    setSelectedAddedId(primary?.kind === 'added-text' ? primary.id : null);
    setSelectedImage(
      primary?.kind === 'image'
        ? { kind: 'existing', id: primary.id }
        : primary?.kind === 'added-image'
          ? { kind: 'added', id: primary.id }
          : null,
    );
    setSelectedVectorId(primary?.kind === 'vector' ? primary.id : null);
  }, [
    currentPage,
    pages,
    selected,
    selectedAddedId,
    selectedElements,
    selectedForm,
    selectedImage,
    selectedVectorId,
    selectedXfaDrawKey,
    selectedXfaKey,
  ]);

  return { darkMode };
}
