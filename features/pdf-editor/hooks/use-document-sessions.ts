'use client';

import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  readNativeXfaTemplateModel,
  readNativeXfaTemplateScripts,
  type XfaScriptMetadata,
  type XfaTemplateModel,
} from '../../../lib/xfa-template';
import { pdfColorToHex } from '../lib/appearance';
import {
  cleanPdfFontName,
  closestStandardFont,
  collectFontWarnings,
  embeddedBrowserFontFamilies,
} from '../lib/fonts';
import {
  attachFormBackdrops,
  attachFormLabels,
  extractPdfImages,
  extractPdfVectors,
} from '../lib/pdf-geometry';
import { mergeSplitCharacterBlocks } from '../lib/text';
import type { DocumentSession, FormBlock, PageInfo, TextAlignment, TextBlock } from '../types';
import type { EditorState } from './use-editor-state';

type Context = Pick<
  EditorState,
  | 'activeDocumentId'
  | 'pdfBytes'
  | 'pdfRef'
  | 'documentSessionsRef'
  | 'fileName'
  | 'isXfaDocument'
  | 'xfaChanged'
  | 'xfaFields'
  | 'xfaStructureEdits'
  | 'xfaDraws'
  | 'xfaDrawEdits'
  | 'xfaScriptMetadata'
  | 'xfaTemplateModel'
  | 'xfaLiveValuesRef'
  | 'liveXfaScripts'
  | 'xfaRuntimeStatus'
  | 'pages'
  | 'currentPage'
  | 'zoom'
  | 'fitMode'
  | 'edits'
  | 'past'
  | 'future'
  | 'formChanges'
  | 'formEdits'
  | 'formBackgrounds'
  | 'addedBoxes'
  | 'addedImages'
  | 'imageEdits'
  | 'vectorEdits'
  | 'imageCaptures'
  | 'blockVisuals'
  | 'fontWarnings'
  | 'renderTaskRef'
  | 'xfaRuntimeRevisionRef'
  | 'setFileName'
  | 'setPdfBytes'
  | 'setIsXfaDocument'
  | 'setXfaChanged'
  | 'setXfaFields'
  | 'setXfaStructureEdits'
  | 'setXfaDraws'
  | 'setXfaDrawEdits'
  | 'setXfaScriptMetadata'
  | 'setXfaTemplateModel'
  | 'setLiveXfaScripts'
  | 'setXfaRuntimeStatus'
  | 'setPages'
  | 'setCurrentPage'
  | 'setZoom'
  | 'setFitMode'
  | 'setEdits'
  | 'setPast'
  | 'setFuture'
  | 'setFormChanges'
  | 'setFormEdits'
  | 'setFormBackgrounds'
  | 'setAddedBoxes'
  | 'setAddedImages'
  | 'setImageEdits'
  | 'setVectorEdits'
  | 'setImageCaptures'
  | 'setBlockVisuals'
  | 'setFontWarnings'
  | 'setSelectedElements'
  | 'setSelected'
  | 'setSelectedForm'
  | 'setSelectedAddedId'
  | 'setSelectedImage'
  | 'setSelectedXfaKey'
  | 'setSelectedXfaDrawKey'
  | 'setSnapGuides'
  | 'setTool'
  | 'setError'
  | 'loading'
  | 'setActiveDocumentId'
  | 'documentTabs'
  | 'setDocumentTabs'
  | 'setLoading'
  | 'joinSplitCharacters'
  | 'setToast'
  | 'setSelectedVectorId'
  | 'uploadRef'
> & {};

export function useDocumentSessions({
  activeDocumentId,
  pdfBytes,
  pdfRef,
  documentSessionsRef,
  fileName,
  isXfaDocument,
  xfaChanged,
  xfaFields,
  xfaStructureEdits,
  xfaDraws,
  xfaDrawEdits,
  xfaScriptMetadata,
  xfaTemplateModel,
  xfaLiveValuesRef,
  liveXfaScripts,
  xfaRuntimeStatus,
  pages,
  currentPage,
  zoom,
  fitMode,
  edits,
  past,
  future,
  formChanges,
  formEdits,
  formBackgrounds,
  addedBoxes,
  addedImages,
  imageEdits,
  vectorEdits,
  imageCaptures,
  blockVisuals,
  fontWarnings,
  renderTaskRef,
  xfaRuntimeRevisionRef,
  setFileName,
  setPdfBytes,
  setIsXfaDocument,
  setXfaChanged,
  setXfaFields,
  setXfaStructureEdits,
  setXfaDraws,
  setXfaDrawEdits,
  setXfaScriptMetadata,
  setXfaTemplateModel,
  setLiveXfaScripts,
  setXfaRuntimeStatus,
  setPages,
  setCurrentPage,
  setZoom,
  setFitMode,
  setEdits,
  setPast,
  setFuture,
  setFormChanges,
  setFormEdits,
  setFormBackgrounds,
  setAddedBoxes,
  setAddedImages,
  setImageEdits,
  setVectorEdits,
  setImageCaptures,
  setBlockVisuals,
  setFontWarnings,
  setSelectedElements,
  setSelected,
  setSelectedForm,
  setSelectedAddedId,
  setSelectedImage,
  setSelectedXfaKey,
  setSelectedXfaDrawKey,
  setSnapGuides,
  setTool,
  setError,
  loading,
  setActiveDocumentId,
  documentTabs,
  setDocumentTabs,
  setLoading,
  joinSplitCharacters,
  setToast,
  setSelectedVectorId,
  uploadRef,
}: Context) {
  const saveActiveDocument = () => {
    if (!activeDocumentId || !pdfBytes || !pdfRef.current) return;
    documentSessionsRef.current.set(activeDocumentId, {
      id: activeDocumentId,
      name: fileName,
      pdf: pdfRef.current,
      pdfBytes,
      isXfaDocument,
      xfaChanged,
      xfaFields,
      xfaStructureEdits,
      xfaDraws,
      xfaDrawEdits,
      xfaScriptMetadata,
      xfaTemplateModel,
      xfaLiveValues: { ...xfaLiveValuesRef.current },
      liveXfaScripts,
      xfaRuntimeStatus,
      pages,
      currentPage,
      zoom,
      fitMode,
      edits,
      past,
      future,
      formChanges,
      formEdits,
      formBackgrounds,
      addedBoxes,
      addedImages,
      imageEdits,
      vectorEdits,
      imageCaptures,
      blockVisuals,
      fontWarnings,
    });
  };

  const restoreDocumentSession = (session: DocumentSession) => {
    renderTaskRef.current?.cancel?.();
    xfaRuntimeRevisionRef.current += 1;
    pdfRef.current = session.pdf;
    setFileName(session.name);
    setPdfBytes(session.pdfBytes);
    setIsXfaDocument(session.isXfaDocument);
    setXfaChanged(session.xfaChanged);
    setXfaFields(session.xfaFields);
    setXfaStructureEdits(session.xfaStructureEdits);
    setXfaDraws(session.xfaDraws);
    setXfaDrawEdits(session.xfaDrawEdits);
    setXfaScriptMetadata(session.xfaScriptMetadata);
    setXfaTemplateModel(session.xfaTemplateModel);
    xfaLiveValuesRef.current = { ...session.xfaLiveValues };
    setLiveXfaScripts(session.liveXfaScripts);
    setXfaRuntimeStatus(session.xfaRuntimeStatus);
    setPages(session.pages);
    setCurrentPage(Math.min(session.currentPage, Math.max(0, session.pages.length - 1)));
    setZoom(session.zoom);
    setFitMode(session.fitMode);
    setEdits(session.edits);
    setPast(session.past);
    setFuture(session.future);
    setFormChanges(session.formChanges);
    setFormEdits(session.formEdits);
    setFormBackgrounds(session.formBackgrounds);
    setAddedBoxes(session.addedBoxes);
    setAddedImages(session.addedImages);
    setImageEdits(session.imageEdits);
    setVectorEdits(session.vectorEdits || {});
    setImageCaptures(session.imageCaptures);
    setBlockVisuals(session.blockVisuals);
    setFontWarnings(session.fontWarnings);
    setSelectedElements([]);
    setSelected(null);
    setSelectedForm(null);
    setSelectedAddedId(null);
    setSelectedImage(null);
    setSelectedXfaKey(null);
    setSelectedXfaDrawKey(null);
    setSnapGuides({});
    setTool('select');
    setError('');
  };

  const switchDocument = (id: string) => {
    if (id === activeDocumentId || loading) return;
    saveActiveDocument();
    const session = documentSessionsRef.current.get(id);
    if (!session) return;
    restoreDocumentSession(session);
    setActiveDocumentId(id);
  };

  const closeDocument = (id: string) => {
    if (loading) return;
    if (id === activeDocumentId) saveActiveDocument();
    const session = documentSessionsRef.current.get(id);
    if (!session) return;
    const dirty =
      session.xfaChanged ||
      Object.keys(session.edits).length > 0 ||
      Object.keys(session.formChanges).length > 0 ||
      Object.keys(session.formEdits).length > 0 ||
      session.addedBoxes.length > 0 ||
      session.addedImages.length > 0 ||
      Object.keys(session.imageEdits).length > 0 ||
      Object.keys(session.xfaStructureEdits).length > 0 ||
      Object.keys(session.xfaDrawEdits).length > 0;
    if (dirty && !window.confirm(`Close “${session.name}” and discard its current edits?`)) return;
    session.pdf?.destroy?.();
    documentSessionsRef.current.delete(id);
    const remaining = documentTabs.filter((tab) => tab.id !== id);
    setDocumentTabs(remaining);
    if (id !== activeDocumentId) return;
    const closedIndex = documentTabs.findIndex((tab) => tab.id === id);
    const nextTab = remaining[Math.min(Math.max(0, closedIndex), remaining.length - 1)];
    if (nextTab) {
      const nextSession = documentSessionsRef.current.get(nextTab.id);
      if (nextSession) {
        restoreDocumentSession(nextSession);
        setActiveDocumentId(nextTab.id);
      }
      return;
    }
    renderTaskRef.current?.cancel?.();
    pdfRef.current = null;
    setActiveDocumentId(null);
    setFileName('Try the example, or open your PDF');
    setPdfBytes(null);
    setIsXfaDocument(false);
    setPages([]);
    setCurrentPage(0);
    setZoom(1);
    setFitMode('manual');
    setEdits({});
    setPast([]);
    setFuture([]);
    setFormChanges({});
    setFormEdits({});
    setFormBackgrounds({});
    setAddedBoxes([]);
    setAddedImages([]);
    setImageEdits({});
    setVectorEdits({});
    setImageCaptures({});
    setBlockVisuals({});
    setFontWarnings([]);
    setXfaChanged(false);
    setXfaFields({});
    setXfaStructureEdits({});
    setXfaDraws({});
    setXfaDrawEdits({});
    setXfaScriptMetadata({});
    setXfaTemplateModel({ nodes: [], fields: [], draws: [], regions: [], warnings: [] });
    xfaLiveValuesRef.current = {};
    setLiveXfaScripts(false);
    setXfaRuntimeStatus('Live scripts are off');
    setSelectedElements([]);
    setSelected(null);
    setSelectedForm(null);
    setSelectedAddedId(null);
    setSelectedImage(null);
    setSelectedXfaKey(null);
    setSelectedXfaDrawKey(null);
    setTool('select');
  };

  const openFile = async (file?: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please choose a PDF document.');
      return;
    }
    saveActiveDocument();
    setLoading(true);
    setError('');
    setSelectedElements([]);
    setSelected(null);
    setSelectedForm(null);
    setSelectedAddedId(null);
    setFontWarnings([]);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      const pdf = await pdfjs.getDocument({ data: bytes.slice(), enableXfa: true }).promise;
      const pureXfa = Boolean(pdf.isPureXfa);
      let scriptMetadata: Record<string, XfaScriptMetadata> = {};
      let templateModel: XfaTemplateModel = { nodes: [], fields: [], draws: [], regions: [], warnings: [] };
      if (pureXfa) {
        try {
          [scriptMetadata, templateModel] = await Promise.all([
            readNativeXfaTemplateScripts(bytes),
            readNativeXfaTemplateModel(bytes),
          ]);
        } catch (reason) {
          console.warn('XFA scripts could not be inspected.', reason);
        }
      }
      const pageInfo: PageInfo[] = [];
      for (let pageIndex = 0; pageIndex < pdf.numPages; pageIndex += 1) {
        const page = await pdf.getPage(pageIndex + 1);
        const viewport = page.getViewport({ scale: 1 });
        const content = pureXfa ? { items: [], styles: {} } : await page.getTextContent();
        const operatorList = pureXfa
          ? { fnArray: [], argsArray: [] }
          : await page.getOperatorList({ annotationMode: 0 });
        const blocks: TextBlock[] = [];
        const textStyles = (content as any).styles || {};
        const measureContext = document.createElement('canvas').getContext('2d');
        content.items.forEach((raw: any, id: number) => {
          if (!('str' in raw) || !raw.str.trim()) return;
          const tx = pdfjs.Util.transform(viewport.transform, raw.transform);
          const fontSize = Math.max(6, Math.hypot(tx[2], tx[3]));
          const style = textStyles[raw.fontName] || {};
          let fontData: any = null;
          try {
            fontData = (page as any).commonObjs.get(raw.fontName);
          } catch {
            /* use the public text style fallback */
          }
          const cssFont = fontData?.loadedName
            ? `"${fontData.loadedName}", ${style.fontFamily || 'sans-serif'}`
            : style.fontFamily || 'sans-serif';
          const sourceDescriptor = `${fontData?.name || ''} ${fontData?.fallbackName || ''} ${cssFont} ${raw.fontName || ''}`;
          const sourceFont = cleanPdfFontName(
            fontData?.name || fontData?.fallbackName || style.fontFamily || raw.fontName,
          );
          const bold =
            Boolean(fontData?.bold || fontData?.black) ||
            Number(style.fontWeight) >= 600 ||
            /bold|semibold|demi|black/i.test(sourceDescriptor);
          const italic =
            Boolean(fontData?.italic) ||
            style.fontStyle === 'italic' ||
            /italic|oblique/i.test(sourceDescriptor);
          const ascent = style.ascent
            ? style.ascent * fontSize
            : style.descent
              ? (1 + style.descent) * fontSize
              : fontSize * 0.8;
          const letterSpacing = 0;
          let editorTop = tx[5] - ascent;
          let horizontalScale = 1;
          if (measureContext) {
            measureContext.font = `${italic ? 'italic ' : ''}${bold ? '700 ' : '400 '}${fontSize}px ${cssFont}`;
            const measured = raw.str.length > 1 ? measureContext.measureText(raw.str).width : 0;
            if (measured > 0)
              horizontalScale = Math.max(0.1, Math.min(10, Math.max(raw.width, 4) / measured));
            const metrics = measureContext.measureText('');
            const browserAscent = metrics.fontBoundingBoxAscent;
            const browserDescent = Math.abs(metrics.fontBoundingBoxDescent);
            if (browserAscent > 0)
              editorTop = tx[5] - fontSize * (browserAscent / (browserAscent + browserDescent));
          }
          const embeddedFontData = fontData?.data instanceof Uint8Array ? fontData.data.slice() : undefined;
          if (sourceFont && cssFont) embeddedBrowserFontFamilies.set(sourceFont, cssFont);
          blocks.push({
            id,
            str: raw.str,
            x: tx[4],
            top: tx[5] - ascent,
            width: Math.max(raw.width, 4),
            height: fontSize,
            fontSize,
            baseline: tx[5],
            editorTop,
            horizontalScale,
            font: closestStandardFont(sourceDescriptor),
            sourceFont,
            cssFont,
            letterSpacing,
            bold,
            italic,
            embeddedFontData,
          });
        });
        const normalizedBlocks = joinSplitCharacters ? mergeSplitCharacterBlocks(blocks) : blocks;
        const annotations = pureXfa ? [] : await page.getAnnotations({ intent: 'display' });
        const forms: FormBlock[] = [];
        annotations.forEach((annotation: any) => {
          if (annotation.subtype !== 'Widget' || !annotation.fieldName || !annotation.rect) return;
          let kind: FormBlock['kind'] | null = null;
          if (annotation.fieldType === 'Tx') kind = 'text';
          if (annotation.fieldType === 'Ch') kind = 'choice';
          if (annotation.fieldType === 'Btn' && annotation.checkBox) kind = 'checkbox';
          if (annotation.fieldType === 'Btn' && annotation.radioButton) kind = 'radio';
          if (!kind) return;
          const rectangle = viewport.convertToViewportRectangle(annotation.rect);
          const x = Math.min(rectangle[0], rectangle[2]);
          const top = Math.min(rectangle[1], rectangle[3]);
          const option = annotation.buttonValue ? String(annotation.buttonValue) : undefined;
          const rawValue = Array.isArray(annotation.fieldValue)
            ? annotation.fieldValue[0]
            : annotation.fieldValue;
          const value =
            kind === 'checkbox'
              ? Boolean(rawValue === true || rawValue === option || rawValue === 'Yes')
              : String(rawValue ?? '');
          const options = Array.isArray(annotation.options)
            ? annotation.options.map((entry: any) => ({
                label: String(entry.displayValue ?? entry.exportValue ?? entry),
                value: String(entry.exportValue ?? entry.displayValue ?? entry),
              }))
            : undefined;
          const width = Math.abs(rectangle[2] - rectangle[0]);
          const height = Math.abs(rectangle[3] - rectangle[1]);
          const textAlignment: TextAlignment =
            annotation.textAlignment === 1 ? 'center' : annotation.textAlignment === 2 ? 'right' : 'left';
          forms.push({
            id: String(annotation.id),
            name: String(annotation.fieldName),
            kind,
            x,
            top,
            width,
            height,
            value,
            option,
            options,
            multiline: Boolean(annotation.multiLine),
            readOnly: Boolean(annotation.readOnly),
            required: Boolean(annotation.required),
            maxLength: Number(annotation.maxLen || annotation.maxLength) || undefined,
            fontSize:
              Number(annotation.defaultAppearanceData?.fontSize || annotation.fontSize) ||
              Math.max(8, Math.min(14, height * 0.62)),
            font: closestStandardFont(annotation.defaultAppearanceData?.fontName || ''),
            color: pdfColorToHex(annotation.defaultAppearanceData?.fontColor, '#111111'),
            backgroundColor: pdfColorToHex(annotation.backgroundColor, '#ffffff'),
            borderColor: pdfColorToHex(annotation.borderColor, '#949b98'),
            borderWidth: Number(annotation.borderStyle?.width) || 1,
            alignment: textAlignment,
          });
          const addedForm = forms[forms.length - 1];
          if (addedForm) {
            addedForm.tooltip = String(annotation.alternativeText || annotation.fieldName || '');
            addedForm.noExport = Boolean(annotation.noExport);
          }
        });
        const formsWithBackdrops = attachFormBackdrops(pdfjs, viewport, operatorList, forms);
        pageInfo.push({
          width: viewport.width,
          height: viewport.height,
          blocks: normalizedBlocks,
          forms: attachFormLabels(formsWithBackdrops, normalizedBlocks),
          images: extractPdfImages(pdfjs, viewport, operatorList),
          vectors: extractPdfVectors(pdfjs, viewport, operatorList),
        });
      }
      pdfRef.current = pdf;
      setPdfBytes(bytes);
      setIsXfaDocument(pureXfa);
      setXfaChanged(false);
      setXfaFields({});
      setXfaStructureEdits({});
      setXfaDraws({});
      setXfaDrawEdits({});
      setSelectedXfaDrawKey(null);
      setXfaScriptMetadata(scriptMetadata);
      setXfaTemplateModel(templateModel);
      setLiveXfaScripts(false);
      setXfaRuntimeStatus('Live scripts are off');
      xfaLiveValuesRef.current = {};
      setSelectedXfaKey(null);
      setPages(pageInfo);
      const warnings = collectFontWarnings(pageInfo);
      setFontWarnings(warnings);
      if (pureXfa) {
        setToast('XFA form detected · Interactive fields are ready');
        setTimeout(() => setToast(''), 3200);
      } else if (warnings.length) {
        setToast(`${warnings.length} unsupported PDF font${warnings.length === 1 ? '' : 's'} detected`);
        setTimeout(() => setToast(''), 3200);
      }
      const openedName = file.name.replace(/\.pdf$/i, '');
      const documentId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `document-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const session: DocumentSession = {
        id: documentId,
        name: openedName,
        pdf,
        pdfBytes: bytes,
        isXfaDocument: pureXfa,
        xfaChanged: false,
        xfaFields: {},
        xfaStructureEdits: {},
        xfaDraws: {},
        xfaDrawEdits: {},
        xfaScriptMetadata: scriptMetadata,
        xfaTemplateModel: templateModel,
        xfaLiveValues: {},
        liveXfaScripts: false,
        xfaRuntimeStatus: 'Live scripts are off',
        pages: pageInfo,
        currentPage: 0,
        zoom: 1,
        fitMode: 'manual',
        edits: {},
        past: [],
        future: [],
        formChanges: {},
        formEdits: {},
        formBackgrounds: {},
        addedBoxes: [],
        addedImages: [],
        imageEdits: {},
        vectorEdits: {},
        imageCaptures: {},
        blockVisuals: {},
        fontWarnings: warnings,
      };
      documentSessionsRef.current.set(documentId, session);
      setDocumentTabs((tabs) => [
        ...tabs,
        { id: documentId, name: openedName, pageCount: pageInfo.length, isXfa: pureXfa },
      ]);
      setActiveDocumentId(documentId);
      setFileName(openedName);
      setCurrentPage(0);
      setEdits({});
      setPast([]);
      setFuture([]);
      setFormChanges({});
      setFormEdits({});
      setFormBackgrounds({});
      setAddedBoxes([]);
      setAddedImages([]);
      setImageEdits({});
      setVectorEdits({});
      setImageCaptures({});
      setSelectedImage(null);
      setSelectedVectorId(null);
      setBlockVisuals({});
      setTool('select');
      setZoom(1);
    } catch (reason) {
      console.error(reason);
      setError('We could not open that PDF. It may be encrypted or damaged.');
    } finally {
      setLoading(false);
      if (uploadRef.current) uploadRef.current.value = '';
    }
  };

  return { switchDocument, closeDocument, openFile };
}
