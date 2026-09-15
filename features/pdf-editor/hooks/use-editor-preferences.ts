'use client';

import { useEffect, useRef } from 'react';
import type { EditorState } from './use-editor-state';

type Context = Pick<
  EditorState,
  | 'setCombineTitleAndTabs'
  | 'setJoinSplitCharacters'
  | 'setHideScrollbars'
  | 'setSelectPdfShapes'
  | 'setMoveShapeContents'
  | 'setLeftPanelWidth'
  | 'setRightPanelWidth'
  | 'setLeftPanelCollapsed'
  | 'setRightPanelCollapsed'
  | 'setPropertyPanelMode'
  | 'setFitMode'
  | 'setZoom'
  | 'setSnapEnabled'
  | 'setSnapMode'
  | 'setSnapAnchor'
  | 'setShowDeletedLabels'
  | 'setOcrConfidenceThreshold'
  | 'setOcrLanguage'
  | 'setOcrRecognizeLayout'
  | 'setThemeMode'
  | 'setSystemDarkMode'
  | 'themeMode'
  | 'combineTitleAndTabs'
  | 'leftPanelWidth'
  | 'rightPanelWidth'
  | 'leftPanelCollapsed'
  | 'rightPanelCollapsed'
  | 'propertyPanelMode'
  | 'fitMode'
  | 'zoom'
  | 'snapEnabled'
  | 'snapMode'
  | 'snapAnchor'
  | 'showDeletedLabels'
  | 'ocrConfidenceThreshold'
  | 'ocrLanguage'
  | 'ocrRecognizeLayout'
  | 'systemDarkMode'
  | 'moveShapeContents'
  | 'ocrWorkerRef'
  | 'ocrWorkerLanguageRef'
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
  | 'tool'
  | 'setTool'
  | 'setOcrRegion'
  | 'setDraftVector'
> & {};

export function useEditorPreferences({
  combineTitleAndTabs,
  setCombineTitleAndTabs,
  setJoinSplitCharacters,
  setHideScrollbars,
  setSelectPdfShapes,
  setMoveShapeContents,
  setLeftPanelWidth,
  setRightPanelWidth,
  setLeftPanelCollapsed,
  setRightPanelCollapsed,
  setPropertyPanelMode,
  setFitMode,
  setZoom,
  setSnapEnabled,
  setSnapMode,
  setSnapAnchor,
  setShowDeletedLabels,
  setOcrConfidenceThreshold,
  setOcrLanguage,
  setOcrRecognizeLayout,
  setThemeMode,
  setSystemDarkMode,
  themeMode,
  leftPanelWidth,
  rightPanelWidth,
  leftPanelCollapsed,
  rightPanelCollapsed,
  propertyPanelMode,
  fitMode,
  zoom,
  snapEnabled,
  snapMode,
  snapAnchor,
  showDeletedLabels,
  ocrConfidenceThreshold,
  ocrLanguage,
  ocrRecognizeLayout,
  systemDarkMode,
  moveShapeContents,
  ocrWorkerRef,
  ocrWorkerLanguageRef,
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
  tool,
  setTool,
  setOcrRegion,
  setDraftVector,
}: Context) {
  const preferencesLoaded = useRef(false);
  useEffect(() => {
    try {
      setCombineTitleAndTabs(window.localStorage.getItem('paperly-combine-title-tabs') === 'true');
      setJoinSplitCharacters(window.localStorage.getItem('paperly-join-split-characters') !== 'false');
      setHideScrollbars(window.localStorage.getItem('paperly-hide-scrollbars') === 'true');
      setSelectPdfShapes(window.localStorage.getItem('paperly-select-pdf-shapes') === 'true');
      setMoveShapeContents(window.localStorage.getItem('paperly-select-related-shapes') === 'true');
      const number = (key: string, fallback: number, min: number, max: number) => {
        const value = Number(window.localStorage.getItem(key));
        return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
      };
      setLeftPanelWidth(number('paperly-left-panel-width', 164, 120, 340));
      setRightPanelWidth(number('paperly-right-panel-width', 300, 250, 520));
      setLeftPanelCollapsed(window.localStorage.getItem('paperly-left-panel-collapsed') === 'true');
      setRightPanelCollapsed(window.localStorage.getItem('paperly-right-panel-collapsed') === 'true');
      const storedPropertyMode = window.localStorage.getItem('paperly-property-panel-mode');
      if (storedPropertyMode === 'layout' || storedPropertyMode === 'style' || storedPropertyMode === 'advanced')
        setPropertyPanelMode(storedPropertyMode);
      const storedFit = window.localStorage.getItem('paperly-fit-mode');
      if (storedFit === 'manual' || storedFit === 'width' || storedFit === 'content') setFitMode(storedFit);
      setZoom(number('paperly-zoom', 1, 0.25, 4));
      setSnapEnabled(window.localStorage.getItem('paperly-snap-enabled') !== 'false');
      const storedSnapMode = window.localStorage.getItem('paperly-snap-mode');
      if (storedSnapMode === 'text' || storedSnapMode === 'box') setSnapMode(storedSnapMode);
      const storedSnapAnchor = window.localStorage.getItem('paperly-snap-anchor');
      if (storedSnapAnchor === 'start' || storedSnapAnchor === 'center' || storedSnapAnchor === 'end') setSnapAnchor(storedSnapAnchor);
      setShowDeletedLabels(window.localStorage.getItem('paperly-show-deleted-labels') !== 'false');
      setOcrConfidenceThreshold(number('paperly-ocr-confidence-threshold', 65, 30, 95));
      setOcrLanguage(window.localStorage.getItem('paperly-ocr-language') === 'vie' ? 'vie' : 'eng');
      setOcrRecognizeLayout(window.localStorage.getItem('paperly-ocr-recognize-layout') !== 'false');
      const storedTheme =
        window.localStorage.getItem('paperly-theme-mode') || window.localStorage.getItem('paperly-theme');
      setThemeMode(storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'system');
    } catch {
      /* local preferences are optional */
    } finally {
      preferencesLoaded.current = true;
    }
  }, []);
  useEffect(() => {
    if (!preferencesLoaded.current) return;
    try {
      const values: Record<string, string> = {
        'paperly-left-panel-width': String(leftPanelWidth),
        'paperly-right-panel-width': String(rightPanelWidth),
        'paperly-left-panel-collapsed': String(leftPanelCollapsed),
        'paperly-right-panel-collapsed': String(rightPanelCollapsed),
        'paperly-combine-title-tabs': String(combineTitleAndTabs),
        'paperly-property-panel-mode': propertyPanelMode,
        'paperly-fit-mode': fitMode,
        'paperly-zoom': String(zoom),
        'paperly-snap-enabled': String(snapEnabled),
        'paperly-snap-mode': snapMode,
        'paperly-snap-anchor': snapAnchor,
        'paperly-show-deleted-labels': String(showDeletedLabels),
        'paperly-ocr-confidence-threshold': String(ocrConfidenceThreshold),
        'paperly-ocr-language': ocrLanguage,
        'paperly-ocr-recognize-layout': String(ocrRecognizeLayout),
        'paperly-select-related-shapes': String(moveShapeContents),
      };
      for (const [key, value] of Object.entries(values)) window.localStorage.setItem(key, value);
    } catch {
      /* local preferences are optional */
    }
  }, [
    combineTitleAndTabs,
    fitMode,
    leftPanelCollapsed,
    leftPanelWidth,
    moveShapeContents,
    ocrConfidenceThreshold,
    ocrLanguage,
    ocrRecognizeLayout,
    propertyPanelMode,
    rightPanelCollapsed,
    rightPanelWidth,
    showDeletedLabels,
    snapAnchor,
    snapEnabled,
    snapMode,
    zoom,
  ]);
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
      ocrWorkerLanguageRef.current = null;
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
      if (!isEditing && event.key === 'Escape' && tool !== 'select') {
        event.preventDefault();
        document.dispatchEvent(new Event('pointercancel'));
        setOcrRegion(null);
        setDraftVector(null);
        setTool('select');
        return;
      }
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
  }, [selectedElements.length, selectedVectorId, setDraftVector, setOcrRegion, setTool, tool]);

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
