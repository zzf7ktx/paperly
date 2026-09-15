import {
  applyNativeXfaTemplateEdits,
  readNativeXfaTemplateModel,
  readNativeXfaTemplateScripts,
  type XfaDrawEdit,
} from '../../../lib/xfa-template';
import type { EditorState } from '../hooks/use-editor-state';
import { filledRectangleAt, hexChannels, needsFormCleanup, needsTextCleanup, vectorUnderlyingColor } from '../lib/appearance';
import { closestStandardFont, editableBlockFont, fontFamilyIdentity } from '../lib/fonts';
import { formBackdropGeometry, formBackdropPrimitiveGeometry } from '../lib/pdf-geometry';
import { captureNativePdfImage, imageOverlapsEditedVectors } from '../lib/native-image';
import { wrapTextForWidth } from '../lib/text';
import { ocrCoverRects } from '../lib/ocr-covers';
import type { FormBlock, FormEdit, TextBlock } from '../types';

type Context = Pick<
  EditorState,
  | 'uploadRef'
  | 'pdfRef'
  | 'xfaLayerRef'
  | 'fileName'
  | 'pdfBytes'
  | 'isXfaDocument'
  | 'setXfaChanged'
  | 'xfaStructureEdits'
  | 'xfaDrawEdits'
  | 'pages'
  | 'edits'
  | 'formChanges'
  | 'formEdits'
  | 'formBackgrounds'
  | 'addedBoxes'
  | 'addedImages'
  | 'imageEdits'
  | 'vectorEdits'
  | 'imageCaptures'
  | 'uploadedFonts'
  | 'blockVisuals'
  | 'setLoading'
  | 'error'
  | 'setError'
  | 'setToast'
>;

export async function exportDocument(
  context: Context & { vectorBackgroundForText: (pageIndex: number, block: TextBlock) => string | undefined },
  options?: { bytesOnly?: boolean },
): Promise<Uint8Array | undefined> {
  const { vectorBackgroundForText } = context;
  const {
    uploadRef,
    pdfRef,
    xfaLayerRef,
    fileName,
    pdfBytes,
    isXfaDocument,
    setXfaChanged,
    xfaStructureEdits,
    xfaDrawEdits,
    pages,
    edits,
    formChanges,
    formEdits,
    formBackgrounds,
    addedBoxes,
    addedImages,
    imageEdits,
    vectorEdits,
    imageCaptures,
    uploadedFonts,
    blockVisuals,
    setLoading,
    error,
    setError,
    setToast,
  } = context;

  if (!pdfBytes) {
    if (options?.bytesOnly) throw new Error('Open a PDF first.');
    uploadRef.current?.click();
    return;
  }
  if (!options?.bytesOnly) {
    setLoading(true);
    setError('');
  }
  try {
    if (isXfaDocument) {
      const invalid = Array.from(
        xfaLayerRef.current?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
          '.xfaField input, .xfaField textarea, .xfaField select',
        ) || [],
      ).filter((control) => (control.required && !control.value.trim()) || !control.checkValidity());
      if (invalid.length) {
        invalid[0].focus();
        throw new Error(`${invalid.length} required or typed XFA value${invalid.length === 1 ? '' : 's'} must be corrected before export.`);
      }
    }
    const {
      PDFDocument,
      PDFHexString,
      PDFName,
      StandardFonts,
      rgb,
      pushGraphicsState,
      popGraphicsState,
      rectangle,
      clip,
      endPath,
    } = await import('pdf-lib');
    let sourceBytes =
      isXfaDocument && pdfRef.current?.saveDocument ? await pdfRef.current.saveDocument() : pdfBytes.slice();
    if (isXfaDocument) {
      const templateEdits = Object.values(xfaStructureEdits);
      const nativeDrawEdits: XfaDrawEdit[] = [
        ...Object.values(xfaDrawEdits),
        ...addedBoxes.map((box) => ({
          key: box.id,
          sourceName: `Paperly_text_${box.id}`,
          occurrence: 0,
          kind: 'text' as const,
          page: box.page,
          x: box.x,
          top: box.top,
          width: box.width,
          height: box.height,
          originalX: box.x,
          originalTop: box.top,
          originalWidth: box.width,
          originalHeight: box.height,
          text: box.text,
          originalText: '',
          font: box.font,
          size: box.size,
          color: box.color,
          bold: box.bold,
          italic: box.italic,
          underline: box.underline,
          strike: box.strike,
          alignment: box.alignment,
          added: true,
        })),
        ...addedImages.map((image) => ({
          key: image.id,
          sourceName: `Paperly_image_${image.id}`,
          occurrence: 0,
          kind: 'image' as const,
          page: image.page,
          x: image.x,
          top: image.top,
          width: image.width,
          height: image.height,
          originalX: image.x,
          originalTop: image.top,
          originalWidth: image.width,
          originalHeight: image.height,
          dataUrl: image.dataUrl,
          added: true,
        })),
      ];
      if (templateEdits.length || nativeDrawEdits.length) {
        sourceBytes = await applyNativeXfaTemplateEdits(sourceBytes, templateEdits, nativeDrawEdits);
        const exportedModel = await readNativeXfaTemplateModel(sourceBytes);
        if (!exportedModel.nodes.length)
          throw new Error(
            'The edited XFA template could not be reopened. Export was stopped to protect the document.',
          );
        const missingEdit = templateEdits.find((edit) => {
          const nativeStillExists = edit.nativeId
            ? exportedModel.nodes.some((node) => node.id === edit.nativeId)
            : Boolean(edit.nativePath && exportedModel.nodes.some((node) => node.path === edit.nativePath));
          if (edit.deleted) return nativeStillExists;
          if (edit.added) return !exportedModel.fields.some((node) => node.name === edit.name);
          return Boolean((edit.nativeId || edit.nativePath) && !nativeStillExists);
        });
        const missingDraw = nativeDrawEdits.find((edit) => {
          const nativeStillExists = edit.nativeId
            ? exportedModel.nodes.some((node) => node.id === edit.nativeId)
            : Boolean(edit.nativePath && exportedModel.nodes.some((node) => node.path === edit.nativePath));
          if (edit.deleted) return nativeStillExists;
          if (edit.added) return !exportedModel.draws.some((node) => node.name === edit.sourceName);
          return Boolean((edit.nativeId || edit.nativePath) && !nativeStillExists);
        });
        if (missingEdit || missingDraw)
          throw new Error(
            'An edited XFA element did not survive export. Export was stopped to protect the document.',
          );
        const editedScripts = templateEdits.filter(
          (edit) => edit.calculation || edit.validation || Object.keys(edit.events || {}).length,
        );
        if (editedScripts.length) {
          const exportedScripts = await readNativeXfaTemplateScripts(sourceBytes);
          const missingScript = editedScripts.find((edit) => {
            const metadata = exportedScripts[`${edit.name}:${edit.occurrence}`];
            return (
              (edit.calculation?.code && metadata?.calculation?.code !== edit.calculation.code) ||
              (edit.validation?.code && metadata?.validation?.code !== edit.validation.code) ||
              Object.entries(edit.events || {}).some(
                ([activity, block]) => block.code && metadata?.events[activity]?.code !== block.code,
              )
            );
          });
          if (missingScript)
            throw new Error(
              'An edited XFA script did not survive export. Export was stopped to protect the document.',
            );
        }
      }
    }
    const pdfDocument = await PDFDocument.load(sourceBytes);
    const embeddedFonts: Record<string, any> = {};
    const fontVariant = (base: string, bold: boolean, italic: boolean) => {
      const family = closestStandardFont(base);
      if (family === 'Times Roman')
        return bold && italic
          ? StandardFonts.TimesRomanBoldItalic
          : bold
            ? StandardFonts.TimesRomanBold
            : italic
              ? StandardFonts.TimesRomanItalic
              : StandardFonts.TimesRoman;
      if (family === 'Courier')
        return bold && italic
          ? StandardFonts.CourierBoldOblique
          : bold
            ? StandardFonts.CourierBold
            : italic
              ? StandardFonts.CourierOblique
              : StandardFonts.Courier;
      return bold && italic
        ? StandardFonts.HelveticaBoldOblique
        : bold
          ? StandardFonts.HelveticaBold
          : italic
            ? StandardFonts.HelveticaOblique
            : StandardFonts.Helvetica;
    };
    let fontkitRegistered = false;
    const embedTextFont = async (
      base: string,
      bold: boolean,
      italic: boolean,
      sourceData?: Uint8Array,
      requiredText = '',
    ) => {
      if (sourceData?.length) {
        try {
          if (!fontkitRegistered) {
            const fontkitModule = await import('@pdf-lib/fontkit');
            pdfDocument.registerFontkit(fontkitModule.default);
            fontkitRegistered = true;
          }
          const fingerprint = Array.from(sourceData.slice(0, 32))
            .reduce((hash, byte) => ((hash * 33) ^ byte) >>> 0, sourceData.length)
            .toString(36);
          const sourceKey = `source:${fingerprint}`;
          embeddedFonts[sourceKey] ||= await pdfDocument.embedFont(sourceData, { subset: true });
          if (requiredText) embeddedFonts[sourceKey].encodeText(requiredText);
          return embeddedFonts[sourceKey];
        } catch {
          /* Subset, protected, or transformed PDF fonts use the normal imported/standard fallback. */
        }
      }
      const family = fontFamilyIdentity(base);
      const candidates = uploadedFonts.filter((font) => fontFamilyIdentity(font.name) === family);
      const requestedWeight = bold ? 700 : 400;
      const uploaded = candidates.sort(
        (first, second) =>
          (first.italic === italic ? 0 : 1000) +
          Math.abs(first.weight - requestedWeight) -
          ((second.italic === italic ? 0 : 1000) + Math.abs(second.weight - requestedWeight)),
      )[0];
      if (uploaded) {
        if (!fontkitRegistered) {
          const fontkitModule = await import('@pdf-lib/fontkit');
          pdfDocument.registerFontkit(fontkitModule.default);
          fontkitRegistered = true;
        }
        const key = `uploaded:${uploaded.id}`;
        embeddedFonts[key] ||= await pdfDocument.embedFont(uploaded.data, { subset: true });
        return embeddedFonts[key];
      }
      const variant = fontVariant(base, bold, italic);
      embeddedFonts[variant] ||= await pdfDocument.embedFont(variant);
      if (requiredText) {
        try {
          embeddedFonts[variant].encodeText(requiredText);
        } catch {
          // Standard PDF fonts use WinAnsi and cannot encode Vietnamese
          // diacritics. Keep recognized or typed Unicode text exportable.
          if (!fontkitRegistered) {
            const fontkitModule = await import('@pdf-lib/fontkit');
            pdfDocument.registerFontkit(fontkitModule.default);
            fontkitRegistered = true;
          }
          if (!embeddedFonts['noto-sans-unicode']) {
            const response = await fetch('/ocr/noto-sans-regular.ttf');
            if (!response.ok) throw new Error('Unicode font is unavailable');
            embeddedFonts['noto-sans-unicode'] = await pdfDocument.embedFont(await response.arrayBuffer(), { subset: true });
          }
          return embeddedFonts['noto-sans-unicode'];
        }
      }
      return embeddedFonts[variant];
    };
    const embeddedImageCache = new Map<string, any>();
    const embedDataImage = async (dataUrl: string) => {
      if (embeddedImageCache.has(dataUrl)) return embeddedImageCache.get(dataUrl);
      const bytes = new Uint8Array(await (await fetch(dataUrl)).arrayBuffer());
      const embedded = /^data:image\/jpeg/i.test(dataUrl)
        ? await pdfDocument.embedJpg(bytes)
        : await pdfDocument.embedPng(bytes);
      embeddedImageCache.set(dataUrl, embedded);
      return embedded;
    };
    const pendingImageDraws: Array<() => void> = [];
    for (const [key, edit] of Object.entries(imageEdits)) {
      const separator = key.indexOf(':');
      const pageIndex = Number(key.slice(0, separator));
      const imageId = key.slice(separator + 1);
      const image = pages[pageIndex]?.images.find((entry) => entry.id === imageId);
      if (!image) continue;
      const page = pdfDocument.getPage(pageIndex);
      const [eraseRed, eraseGreen, eraseBlue] = hexChannels(
        filledRectangleAt(
          pages[pageIndex].vectors,
          image.x + image.width / 2,
          image.top + image.height / 2,
          vectorEdits,
          pageIndex,
        ) || edit.eraseColor || '#ffffff',
      );
      const eraseLeft = Math.max(0, image.x - 1);
      const eraseRight = Math.min(page.getWidth(), image.x + image.width + 1);
      const eraseTop = Math.max(0, image.top - 1);
      const eraseBottom = Math.min(page.getHeight(), image.top + image.height + 2);
      if (eraseRight > eraseLeft && eraseBottom > eraseTop)
        page.drawRectangle({
          x: eraseLeft,
          y: page.getHeight() - eraseBottom,
          width: eraseRight - eraseLeft,
          height: eraseBottom - eraseTop,
          color: rgb(eraseRed, eraseGreen, eraseBlue),
        });
      if (edit.deleted) continue;
      const capture = imageCaptures[key];
      if (!capture) continue;
      const embedded = await embedDataImage(capture);
      const drawWidth = edit.width ?? image.width;
      const drawHeight = edit.height ?? image.height;
      pendingImageDraws.push(() =>
        page.drawImage(embedded, {
          x: edit.x ?? image.x,
          y: page.getHeight() - (edit.top ?? image.top) - drawHeight,
          width: drawWidth,
          height: drawHeight,
        }),
      );
    }
    for (const image of isXfaDocument ? [] : addedImages) {
      const page = pdfDocument.getPage(image.page);
      const embedded = await embedDataImage(image.dataUrl);
      pendingImageDraws.push(() =>
        page.drawImage(embedded, {
          x: image.x,
          y: page.getHeight() - image.top - image.height,
          width: image.width,
          height: image.height,
        }),
      );
    }
    const vectorColor = (hex: string | undefined, fallback: string) => {
      const value = Number.parseInt((hex || fallback).replace('#', '').slice(0, 6), 16);
      return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
    };
    const scaledSvgPath = (path: string, scaleX: number, scaleY: number) =>
      path.replace(/([ML])\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (_, command, x, y) =>
        `${command} ${(Number(x) * scaleX).toFixed(3)} ${(Number(y) * scaleY).toFixed(3)}`,
      );
    if (!isXfaDocument)
      for (const [key, edit] of Object.entries(edits)) {
        const [pageIndexText, blockIdText] = key.split(':');
        const pageIndex = Number(pageIndexText);
        const blockId = Number(blockIdText);
        const block = pages[pageIndex]?.blocks.find((entry) => entry.id === blockId);
        if (!block) continue;
        if (!needsTextCleanup(block, edit)) continue;
        const pdfPage = pdfDocument.getPage(pageIndex);
        const size = edit.size || block.fontSize;
        const backgroundHex = (
          edit.vectorGroupMove
            ? '#ffffff'
            : vectorBackgroundForText(pageIndex, block) || blockVisuals[key]?.background || '#ffffff'
        ).replace('#', '');
        const backgroundValue = Number.parseInt(backgroundHex.length === 6 ? backgroundHex : 'ffffff', 16);
        pdfPage.drawRectangle({
          x: Math.max(0, block.x - 1),
          y: Math.max(0, pdfPage.getHeight() - block.top - block.height - 2),
          width: block.width + 3,
          height: Math.max(block.height, size) + 3,
          color: rgb(
            ((backgroundValue >> 16) & 255) / 255,
            ((backgroundValue >> 8) & 255) / 255,
            (backgroundValue & 255) / 255,
          ),
        });
      }
    if (!isXfaDocument)
      for (const [pageIndex, pageInfo] of pages.entries()) {
        const pdfPage = pdfDocument.getPage(pageIndex);
        const pageHeight = pdfPage.getHeight();
        for (const vector of pageInfo.vectors) {
          const edit = vectorEdits[`${pageIndex}:${vector.id}`] || {};
          if (vector.added || !Object.keys(edit).length) continue;
          const eraseColor = vectorColor(
            vectorUnderlyingColor(pageInfo.vectors, vector, vectorEdits, pageIndex), '#ffffff',
          );
          if (vector.kind === 'polygon' && vector.svgPath)
            pdfPage.drawSvgPath(vector.svgPath, {
              x: vector.x,
              y: pageHeight - vector.top,
              color: eraseColor,
              borderColor: eraseColor,
              borderWidth: 0.4,
            });
          else {
            const left = Math.max(0, vector.x - 2);
            const right = Math.min(pdfPage.getWidth(), vector.x + vector.width + 2);
            const top = Math.max(0, vector.top - 2);
            const bottom = Math.min(pageHeight, vector.top + vector.height + 2);
            if (right > left && bottom > top)
              pdfPage.drawRectangle({
                x: left,
                y: pageHeight - bottom,
                width: right - left,
                height: bottom - top,
                color: eraseColor,
              });
          }
        }
        for (const image of pageInfo.images) {
          const key = `${pageIndex}:${image.id}`;
          if (
            Object.keys(imageEdits[key] || {}).length ||
            !imageOverlapsEditedVectors(image, pageInfo, pageIndex, vectorEdits)
          ) continue;
          const capture =
            (await captureNativePdfImage(pdfRef.current, pageIndex, image)) || imageCaptures[key];
          if (!capture) continue;
          const embedded = await embedDataImage(capture);
          pdfPage.drawImage(embedded, {
            x: image.x,
            y: pageHeight - image.top - image.height,
            width: image.width,
            height: image.height,
          });
        }
        for (const vector of pageInfo.vectors) {
          const edit = vectorEdits[`${pageIndex}:${vector.id}`] || {};
          if (!vector.added && !Object.keys(edit).length) continue;
          if (edit.deleted) continue;
          const x = edit.x ?? vector.x;
          const top = edit.top ?? vector.top;
          const width = edit.width ?? vector.width;
          const height = edit.height ?? vector.height;
          const fill = edit.fill ?? vector.fill;
          const stroke = edit.stroke ?? vector.stroke;
          const borderWidth = edit.strokeWidth ?? vector.strokeWidth;
          const shapeOpacity = edit.opacity ?? vector.opacity ?? 1;
          if (vector.kind === 'polygon' && vector.svgPath)
            pdfPage.drawSvgPath(
              scaledSvgPath(
                vector.svgPath,
                width / Math.max(0.5, vector.width),
                height / Math.max(0.5, vector.height),
              ),
              {
                x,
                y: pageHeight - top,
                opacity: shapeOpacity,
                ...(fill !== 'transparent' ? { color: vectorColor(fill, '#ffffff') } : {}),
                ...(stroke !== 'transparent'
                  ? { borderColor: vectorColor(stroke, '#000000'), borderWidth }
                  : {}),
              },
            );
          else if (vector.kind === 'ellipse')
            pdfPage.drawEllipse({
              x: x + width / 2,
              y: pageHeight - top - height / 2,
              xScale: width / 2,
              yScale: height / 2,
              opacity: shapeOpacity,
              ...(fill !== 'transparent' ? { color: vectorColor(fill, '#ffffff') } : {}),
              ...(stroke !== 'transparent'
                ? { borderColor: vectorColor(stroke, '#000000'), borderWidth }
                : {}),
            });
          else if (vector.kind === 'line') {
            const scaleX = width / Math.max(1, vector.width);
            const scaleY = height / Math.max(1, vector.height);
            const start = vector.points?.[0];
            const end = vector.points?.[vector.points.length - 1];
            pdfPage.drawLine({
              start: start
                ? {
                    x: x + (start.x - vector.x) * scaleX,
                    y: pageHeight - top - (start.top - vector.top) * scaleY,
                  }
                : { x, y: pageHeight - top },
              end: end
                ? {
                    x: x + (end.x - vector.x) * scaleX,
                    y: pageHeight - top - (end.top - vector.top) * scaleY,
                  }
                : { x: x + width, y: pageHeight - top - height },
              color: vectorColor(stroke, '#000000'),
              thickness: borderWidth,
              opacity: shapeOpacity,
            });
          } else if (vector.kind === 'brush' && vector.points?.length) {
            const scaleX = width / Math.max(1, vector.width);
            const scaleY = height / Math.max(1, vector.height);
            for (let index = 1; index < vector.points.length; index += 1) {
              const prior = vector.points[index - 1];
              const point = vector.points[index];
              pdfPage.drawLine({
                start: {
                  x: x + (prior.x - vector.x) * scaleX,
                  y: pageHeight - top - (prior.top - vector.top) * scaleY,
                },
                end: {
                  x: x + (point.x - vector.x) * scaleX,
                  y: pageHeight - top - (point.top - vector.top) * scaleY,
                },
                color: vectorColor(stroke, '#000000'),
                thickness: borderWidth,
                opacity: shapeOpacity,
              });
            }
          } else
            pdfPage.drawRectangle({
              x,
              y: pageHeight - top - height,
              width,
              height,
              opacity: shapeOpacity,
              ...(fill !== 'transparent' ? { color: vectorColor(fill, '#ffffff') } : {}),
              ...(stroke !== 'transparent'
                ? { borderColor: vectorColor(stroke, '#000000'), borderWidth }
                : {}),
            });
        }
      }
    pendingImageDraws.forEach((draw) => draw());
    const pendingTextDraws: Array<() => void> = [];
    for (const [key, edit] of Object.entries(edits)) {
      const [pageIndexString, blockIdString] = key.split(':');
      const pageIndex = Number(pageIndexString);
      const blockId = Number(blockIdString);
      const block = pages[pageIndex]?.blocks.find((entry) => entry.id === blockId);
      if (!block) continue;
      const page = pdfDocument.getPage(pageIndex);
      const fontName = edit.font || editableBlockFont(block) || 'Helvetica';
      const weight = edit.fontWeight ?? ((edit.bold ?? block.bold) ? 700 : 400);
      const syntheticWeight = weight === 500 || weight === 600;
      const font = await embedTextFont(fontName, weight === 700, edit.italic ?? block.italic);
      const size = edit.size || block.fontSize;
      const pageHeight = page.getHeight();
      if (edit.deleted) continue;
      const hex = (edit.color || blockVisuals[key]?.color || '#111111').replace('#', '');
      const value = parseInt(hex.length === 6 ? hex : '16302b', 16);
      const baseX = edit.x ?? block.x;
      const drawTop = edit.top ?? block.top;
      const textY = pageHeight - drawTop - (block.baseline - block.top);
      const textColor = rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
      const textWidth = edit.width ?? block.width;
      const lines =
        edit.text.includes('\n') || edit.width !== undefined
          ? wrapTextForWidth(edit.text, textWidth, (text) => font.widthOfTextAtSize(text, size))
          : [{ text: edit.text.replace(/[\n\r]/g, ' '), paragraphEnd: true }];
      const lineHeight = size * 1.2;
      pendingTextDraws.push(() => {
        lines.forEach((line, index) => {
          const lineWidth = font.widthOfTextAtSize(line.text, size);
          const alignmentOffset =
            edit.alignment === 'center'
              ? (textWidth - lineWidth) / 2
              : edit.alignment === 'right'
                ? textWidth - lineWidth
                : 0;
          const drawX = baseX + Math.max(0, alignmentOffset);
          const drawY = textY - index * lineHeight;
          if (line.text) page.drawText(line.text, { x: drawX, y: drawY, size, font, color: textColor });
          if (syntheticWeight && line.text) {
            const stroke = weight === 500 ? 0.14 : 0.28;
            page.drawText(line.text, { x: drawX - stroke, y: drawY, size, font, color: textColor });
            page.drawText(line.text, { x: drawX + stroke, y: drawY, size, font, color: textColor });
          }
          if (edit.underline && line.text)
            page.drawLine({
              start: { x: drawX, y: drawY - 1.5 },
              end: { x: drawX + lineWidth, y: drawY - 1.5 },
              thickness: Math.max(0.5, size / 18),
              color: textColor,
            });
          if (edit.strike && line.text)
            page.drawLine({
              start: { x: drawX, y: drawY + size * 0.32 },
              end: { x: drawX + lineWidth, y: drawY + size * 0.32 },
              thickness: Math.max(0.5, size / 18),
              color: textColor,
            });
        });
      });
    }
    if (!isXfaDocument) {
      const pdfForm = pdfDocument.getForm();
      const appearanceOptions = async (block: FormBlock, edit: FormEdit, pageHeight: number) => {
        const fontName = edit.font || block.font || 'Helvetica';
        const font = await embedTextFont(fontName, false, false);
        const [tr, tg, tb] = hexChannels(edit.color || block.color || '#111111');
        const [br, bg, bb] = hexChannels(edit.backgroundColor || block.backgroundColor || '#ffffff');
        const [rr, rg, rb] = hexChannels(edit.borderColor || block.borderColor || '#949b98');
        const width = edit.width ?? block.width;
        const height = edit.height ?? block.height;
        return {
          x: edit.x ?? block.x,
          y: pageHeight - (edit.top ?? block.top) - height,
          width,
          height,
          textColor: rgb(tr, tg, tb),
          backgroundColor: rgb(br, bg, bb),
          borderColor: rgb(rr, rg, rb),
          borderWidth: edit.borderWidth ?? block.borderWidth ?? 1,
          font,
        };
      };
      for (const block of pages.flatMap((page) => page.forms).filter((field) => field.added)) {
        const pageIndex = pages.findIndex((page) => page.forms.includes(block));
        const page = pdfDocument.getPage(pageIndex);
        const edit = formEdits[`${pageIndex}:${block.id}`] || {};
        if (edit.deleted) continue;
        const options = await appearanceOptions(block, edit, page.getHeight());
        let field: any;
        if (block.sharedField) {
          field = pdfForm.getFieldMaybe(block.name) as any;
          if (!field) continue;
          if (block.kind === 'radio') field.addOptionToPage(block.option || 'Yes', page, options);
          else field.addToPage(page, options);
        } else if (block.kind === 'text') {
          field = pdfForm.createTextField(block.name);
          if (block.multiline) field.enableMultiline();
          field.setText(String(formChanges[block.name] ?? block.value ?? ''));
          field.addToPage(page, options);
        } else if (block.kind === 'choice') {
          field = pdfForm.createDropdown(block.name);
          field.addOptions((block.options || []).map((option) => option.value));
          const value = String(formChanges[block.name] ?? block.value ?? '');
          if (value) field.select(value);
          field.addToPage(page, options);
        } else if (block.kind === 'checkbox') {
          field = pdfForm.createCheckBox(block.name);
          field.addToPage(page, options);
          if (Boolean(formChanges[block.name] ?? block.value)) field.check();
        } else {
          field = pdfForm.createRadioGroup(block.name);
          const option = block.option || 'Yes';
          field.addOptionToPage(option, page, options);
          if (String(formChanges[block.name] ?? block.value) === option) field.select(option);
        }
        if (edit.readOnly ?? block.readOnly) field.enableReadOnly();
        if (edit.required ?? block.required) field.enableRequired();
        if (edit.noExport ?? block.noExport) field.disableExporting?.();
        if (edit.tooltip ?? block.tooltip)
          field.acroField.dict.set(
            PDFName.of('TU'),
            PDFHexString.fromText(edit.tooltip ?? block.tooltip ?? ''),
          );
        if (block.kind === 'text' && (edit.multiline ?? block.multiline)) field.enableMultiline?.();
        if (block.kind === 'text' && (edit.maxLength ?? block.maxLength))
          field.setMaxLength?.(edit.maxLength ?? block.maxLength);
      }
      for (const [key, edit] of Object.entries(formEdits)) {
        const separator = key.indexOf(':');
        const pageIndex = Number(key.slice(0, separator));
        const annotationId = key.slice(separator + 1);
        const block = pages[pageIndex]?.forms.find((entry) => entry.id === annotationId);
        const field = block ? (pdfForm.getFieldMaybe(block.name) as any) : null;
        if (!block || !field?.acroField?.getWidgets) continue;
        const page = pdfDocument.getPage(pageIndex);
        const originalY = page.getHeight() - block.top - block.height;
        if (needsFormCleanup(block, edit)) {
          const [red, green, blue] = hexChannels(edit.eraseColor || formBackgrounds[key] || '#ffffff');
          const originalBackdrop = formBackdropGeometry(block);
          page.drawRectangle({
            x: Math.max(0, originalBackdrop.x - 1),
            y: Math.max(0, page.getHeight() - originalBackdrop.top - originalBackdrop.height - 1),
            width: originalBackdrop.width + 2,
            height: originalBackdrop.height + 2,
            color: rgb(red, green, blue),
          });
          const geometryChanged =
            edit.x !== undefined ||
            edit.top !== undefined ||
            edit.width !== undefined ||
            edit.height !== undefined;
          const hasEditedFrame =
            edit.backgroundColor !== undefined ||
            edit.borderColor !== undefined ||
            edit.borderWidth !== undefined;
          if (geometryChanged && !edit.deleted && block.backdrop && !hasEditedFrame) {
            for (const primitive of block.backdrop.primitives) {
              const moved = formBackdropPrimitiveGeometry(block, primitive, edit);
              const fillChannels = primitive.fill ? hexChannels(primitive.fill) : null;
              const strokeChannels = primitive.stroke ? hexChannels(primitive.stroke) : null;
              page.drawRectangle({
                x: moved.x,
                y: page.getHeight() - moved.top - moved.height,
                width: moved.width,
                height: moved.height,
                ...(fillChannels ? { color: rgb(...fillChannels) } : {}),
                ...(strokeChannels && moved.strokeWidth > 0
                  ? { borderColor: rgb(...strokeChannels), borderWidth: moved.strokeWidth }
                  : {}),
              });
            }
          }
        }
        const widgets = field.acroField.getWidgets() as any[];
        const widget = widgets.sort((left, right) => {
          const a = left.getRectangle();
          const b = right.getRectangle();
          return Math.hypot(a.x - block.x, a.y - originalY) - Math.hypot(b.x - block.x, b.y - originalY);
        })[0];
        if (!widget) continue;
        const width = edit.width ?? block.width;
        const height = edit.height ?? block.height;
        widget.setRectangle({
          x: edit.x ?? block.x,
          y: page.getHeight() - (edit.top ?? block.top) - height,
          width,
          height,
        });
        widget.setFlagTo(2, Boolean(edit.deleted));
        if (edit.readOnly !== undefined) edit.readOnly ? field.enableReadOnly?.() : field.disableReadOnly?.();
        if (edit.required !== undefined) edit.required ? field.enableRequired?.() : field.disableRequired?.();
        if (edit.noExport !== undefined)
          edit.noExport ? field.disableExporting?.() : field.enableExporting?.();
        if (edit.tooltip !== undefined)
          edit.tooltip
            ? field.acroField.dict.set(PDFName.of('TU'), PDFHexString.fromText(edit.tooltip))
            : field.acroField.dict.delete(PDFName.of('TU'));
        if (block.kind === 'text' && edit.maxLength !== undefined)
          edit.maxLength > 0 ? field.setMaxLength?.(edit.maxLength) : field.removeMaxLength?.();
        if (block.kind === 'text' && edit.multiline !== undefined)
          edit.multiline ? field.enableMultiline?.() : field.disableMultiline?.();
        if (block.kind === 'choice' && edit.options)
          field.setOptions?.(edit.options.map((option) => option.value));
      }
      for (const [name, value] of Object.entries(formChanges)) {
        const field = pdfForm.getFieldMaybe(name) as any;
        if (!field) continue;
        if (typeof value === 'boolean' && typeof field.check === 'function') {
          if (value) field.check();
          else field.uncheck();
        } else if (typeof field.setText === 'function') {
          field.setText(String(value));
        } else if (typeof field.select === 'function') {
          field.select(String(value));
        }
      }
      if (
        Object.keys(formChanges).length ||
        Object.keys(formEdits).length ||
        pages.some((page) => page.forms.some((field) => field.added))
      )
        pdfForm.updateFieldAppearances();
      for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
        for (const block of pages[pageIndex].forms) {
          const edit = formEdits[`${pageIndex}:${block.id}`] || {};
          if (edit.deleted) continue;
          const styled =
            ['font', 'fontSize', 'color', 'backgroundColor', 'borderColor', 'borderWidth', 'alignment'].some(
              (property) => property in edit,
            ) || block.added;
          if (!styled) continue;
          const field = pdfForm.getFieldMaybe(block.name) as any;
          if (!field?.acroField?.getWidgets) continue;
          const page = pdfDocument.getPage(pageIndex);
          const targetX = edit.x ?? block.x;
          const targetY = page.getHeight() - (edit.top ?? block.top) - (edit.height ?? block.height);
          const widget = (field.acroField.getWidgets() as any[]).sort((left, right) => {
            const a = left.getRectangle();
            const b = right.getRectangle();
            return Math.hypot(a.x - targetX, a.y - targetY) - Math.hypot(b.x - targetX, b.y - targetY);
          })[0];
          if (!widget) continue;
          const options = await appearanceOptions(block, edit, page.getHeight());
          const [tr, tg, tb] = hexChannels(edit.color || block.color || '#111111');
          widget
            .getOrCreateAppearanceCharacteristics()
            .setBackgroundColor(hexChannels(edit.backgroundColor || block.backgroundColor || '#ffffff'));
          widget
            .getOrCreateAppearanceCharacteristics()
            .setBorderColor(hexChannels(edit.borderColor || block.borderColor || '#949b98'));
          widget.getOrCreateBorderStyle().setWidth(options.borderWidth);
          field.acroField.setDefaultAppearance(
            `${tr.toFixed(4)} ${tg.toFixed(4)} ${tb.toFixed(4)} rg\n/${options.font.name} ${edit.fontSize ?? block.fontSize ?? 11} Tf`,
          );
          field.acroField.setQuadding?.(
            (edit.alignment || block.alignment) === 'center'
              ? 1
              : (edit.alignment || block.alignment) === 'right'
                ? 2
                : 0,
          );
          if (block.kind === 'text' || block.kind === 'choice') field.updateAppearances(options.font);
          else field.updateAppearances();
        }
      }
    }
    pendingTextDraws.forEach((draw) => draw());
    for (const box of isXfaDocument ? [] : addedBoxes) {
      const page = pdfDocument.getPage(box.page);
      if (box.ocrSource) {
        const eraseX = box.ocrOriginalX ?? box.x;
        const eraseTop = box.ocrOriginalTop ?? box.top;
        const eraseWidth = box.ocrOriginalWidth ?? box.width;
        const eraseHeight = box.ocrOriginalHeight ?? box.height;
        const pieces = ocrCoverRects(box, pages[box.page]?.vectors || [], vectorEdits);
        page.pushOperators(pushGraphicsState());
        // Clip both solid covers and reconstructed patches to the same areas used in the editor.
        page.pushOperators(
          ...pieces.map((piece) =>
            rectangle(
              eraseX + piece.x,
              page.getHeight() - eraseTop - piece.top - piece.height,
              piece.width,
              piece.height,
            ),
          ),
          ...(pieces.length ? [] : [rectangle(0, 0, 0, 0)]),
          clip(),
          endPath(),
        );
        if (box.ocrBackgroundImage) {
          const backgroundPatch = await embedDataImage(box.ocrBackgroundImage);
          page.drawImage(backgroundPatch, {
            x: eraseX,
            y: page.getHeight() - eraseTop - eraseHeight,
            width: eraseWidth,
            height: eraseHeight,
          });
        } else {
          const [red, green, blue] = hexChannels(box.ocrBackground || '#ffffff');
          page.drawRectangle({
            x: eraseX,
            y: page.getHeight() - eraseTop - eraseHeight,
            width: eraseWidth,
            height: eraseHeight,
            color: rgb(red, green, blue),
          });
        }
        page.pushOperators(popGraphicsState());
      }
      const fontName = box.font || 'Helvetica';
      const syntheticOcrBold = Boolean(box.ocrSource && box.bold && box.ocrTextStroke);
      const hex = box.color.replace('#', '');
      const colorValue = parseInt(hex.length === 6 ? hex : '16302b', 16);
      const font = await embedTextFont(
        fontName,
        box.bold && !syntheticOcrBold,
        box.italic,
        box.reuseSourceFont ? box.sourceFontData : undefined,
        box.text,
      );
      const decorationColor = rgb(
        ((colorValue >> 16) & 255) / 255,
        ((colorValue >> 8) & 255) / 255,
        (colorValue & 255) / 255,
      );
      const sourceText = box.text || ' ';
      const requestedWidth = font.widthOfTextAtSize(sourceText.replace(/[\r\n]+/g, ' '), box.size);
      const exportSize =
        box.ocrSource && requestedWidth > box.width
          ? Math.max(4, ((box.size * box.width) / requestedWidth) * 0.995)
          : box.size;
      const measure = (value: string) => font.widthOfTextAtSize(value, exportSize);
      const lines = box.ocrSource
        ? sourceText.split(/\r?\n/).map((text) => ({ text, paragraphEnd: true }))
        : wrapTextForWidth(sourceText, box.width, measure);
      const drawExportText = (text: string, x: number, y: number) => {
        page.drawText(text, { x, y, size: exportSize, font, color: decorationColor });
        if (!syntheticOcrBold) return;
        const stroke = box.ocrTextStroke || 0.28;
        page.drawText(text, { x: x - stroke, y, size: exportSize, font, color: decorationColor });
        page.drawText(text, { x: x + stroke, y, size: exportSize, font, color: decorationColor });
      };
      lines.forEach((line, lineIndex) => {
        const fontHeight = font.heightAtSize(exportSize, { descender: false });
        const textY = page.getHeight() - box.top - fontHeight - lineIndex * exportSize * 1.2;
        const words = line.text.split(/\s+/).filter(Boolean);
        const shouldJustify = box.alignment === 'justify' && !line.paragraphEnd && words.length > 1;
        let lineWidth = Math.min(box.width, measure(line.text));
        let drawX = box.x;
        if (box.alignment === 'center') drawX += Math.max(0, (box.width - lineWidth) / 2);
        if (box.alignment === 'right') drawX += Math.max(0, box.width - lineWidth);
        if (shouldJustify) {
          const wordsWidth = words.reduce((total, word) => total + measure(word), 0);
          const gap = Math.max(0, (box.width - wordsWidth) / (words.length - 1));
          let wordX = box.x;
          words.forEach((word) => {
            drawExportText(word, wordX, textY);
            wordX += measure(word) + gap;
          });
          lineWidth = box.width;
        } else if (line.text) {
          drawExportText(line.text, drawX, textY);
        }
        if (box.underline && lineWidth)
          page.drawLine({
            start: { x: drawX, y: textY - 1.5 },
            end: { x: drawX + lineWidth, y: textY - 1.5 },
            thickness: Math.max(0.5, exportSize / 18),
            color: decorationColor,
          });
        if (box.strike && lineWidth)
          page.drawLine({
            start: { x: drawX, y: textY + exportSize * 0.32 },
            end: { x: drawX + lineWidth, y: textY + exportSize * 0.32 },
            thickness: Math.max(0.5, exportSize / 18),
            color: decorationColor,
          });
      });
    }
    const output = await pdfDocument.save();
    if (options?.bytesOnly) return output;
    const blob = new Blob([output as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${fileName || 'document'}-edited.pdf`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (isXfaDocument) setXfaChanged(false);
    setToast('Your edited PDF is ready');
    setTimeout(() => setToast(''), 2600);
  } catch (reason) {
    if (options?.bytesOnly) throw reason;
    console.error(reason);
    setError('We could not export this PDF. Please try again.');
  } finally {
    if (!options?.bytesOnly) setLoading(false);
  }
}
