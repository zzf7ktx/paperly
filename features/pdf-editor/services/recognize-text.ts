import { fontOptions } from '../constants';
import type { EditorState } from '../hooks/use-editor-state';
import { hexChannels } from '../lib/appearance';
import { browserFontFamily, cleanPdfFontName, closestStandardFont } from '../lib/fonts';
import { detectScannedLines } from '../lib/pdf-geometry';
import { splitOcrLine } from '../lib/ocr-layout';
import { detectOcrImages, insideOcrImage } from '../lib/ocr-images';
import { keepPopupToolActive } from '../lib/tool-preferences';
import type { AddedTextBox, SelectedElementRef, TextAlignment } from '../types';

type Context = Pick<
  EditorState,
  | 'pdfRef'
  | 'ocrWorkerRef'
  | 'pages'
  | 'setPages'
  | 'currentPage'
  | 'setSelected'
  | 'setSelectedElements'
  | 'setSelectedForm'
  | 'setAddedBoxes'
  | 'setImageCaptures'
  | 'setSelectedVectorId'
  | 'setSelectedImage'
  | 'setSelectedAddedId'
  | 'setTool'
  | 'ocrBusy'
  | 'setOcrBusy'
  | 'setOcrProgress'
  | 'setOcrStatus'
  | 'ocrRecognizeLayout'
  | 'setOcrRegion'
  | 'error'
  | 'setError'
  | 'setToast'
> & { recordHistory: () => void };

export async function recognizeText(
  context: Context,
  region?: { x: number; top: number; width: number; height: number },
): Promise<void> {
  const {
    pdfRef,
    ocrWorkerRef,
    pages,
    setPages,
    currentPage,
    setSelected,
    setSelectedElements,
    setSelectedForm,
    setAddedBoxes,
    setImageCaptures,
    setSelectedVectorId,
    setSelectedImage,
    setSelectedAddedId,
    setTool,
    ocrBusy,
    setOcrBusy,
    setOcrProgress,
    setOcrStatus,
    ocrRecognizeLayout,
    setOcrRegion,
    error,
    setError,
    setToast,
    recordHistory,
  } = context;

  const pageInfo = pages[currentPage];
  if (!pdfRef.current || !pageInfo || ocrBusy) return;
  setOcrBusy(true);
  setOcrProgress(0);
  setOcrStatus('Preparing page locally…');
  setError('');
  try {
    const pdfPage = await pdfRef.current.getPage(currentPage + 1);
    const renderScale = Math.max(1.75, Math.min(3, 3000 / pageInfo.width));
    const viewport = pdfPage.getViewport({ scale: renderScale });
    const rendered = document.createElement('canvas');
    rendered.width = Math.ceil(viewport.width);
    rendered.height = Math.ceil(viewport.height);
    const context = rendered.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas is unavailable');
    await pdfPage.render({ canvasContext: context, viewport, annotationMode: 0 }).promise;
    const source = document.createElement('canvas');
    const sourceX = Math.max(0, Math.floor((region?.x || 0) * renderScale));
    const sourceY = Math.max(0, Math.floor((region?.top || 0) * renderScale));
    source.width = Math.max(1, Math.ceil((region?.width || pageInfo.width) * renderScale));
    source.height = Math.max(1, Math.ceil((region?.height || pageInfo.height) * renderScale));
    source
      .getContext('2d', { willReadFrequently: true })
      ?.drawImage(rendered, sourceX, sourceY, source.width, source.height, 0, 0, source.width, source.height);
    if (!ocrWorkerRef.current) {
      const { createWorker } = await import('tesseract.js');
      ocrWorkerRef.current = await createWorker('eng', 1, {
        workerPath: '/ocr/worker.min.js',
        corePath: '/ocr',
        langPath: '/ocr',
        gzip: true,
        logger: (message: { status: string; progress: number }) => {
          setOcrStatus(message.status.replace(/\b\w/g, (letter) => letter.toUpperCase()));
          setOcrProgress(Math.round((message.progress || 0) * 100));
        },
      });
    }
    setOcrStatus('Recognizing text locally…');
    const result = await ocrWorkerRef.current.recognize(source, {}, { blocks: true, text: true });
    let lines = (result.data.blocks || [])
      .flatMap((block: any) =>
        (block.paragraphs || []).flatMap((paragraph: any) =>
          (paragraph.lines || []).map((line: any) => ({ ...line, layoutBBox: paragraph.bbox || block.bbox })),
        ),
      )
      .filter((line: any) => line.text?.trim() && line.bbox);
    const imageRegions = (() => {
      if (!ocrRecognizeLayout) return [];
      const scale = Math.min(1, 1000 / source.width);
      const analysis = document.createElement('canvas');
      analysis.width = Math.ceil(source.width * scale);
      analysis.height = Math.ceil(source.height * scale);
      const analysisContext = analysis.getContext('2d', { willReadFrequently: true });
      if (!analysisContext) return [];
      analysisContext.drawImage(source, 0, 0, analysis.width, analysis.height);
      const bounds = lines.flatMap((line: any) =>
        (line.words || []).map((word: any) => ({
          x0: word.bbox.x0 * scale,
          y0: word.bbox.y0 * scale,
          x1: word.bbox.x1 * scale,
          y1: word.bbox.y1 * scale,
        })),
      );
      return detectOcrImages(
        analysisContext.getImageData(0, 0, analysis.width, analysis.height).data,
        analysis.width,
        analysis.height,
        bounds,
      ).map((box) => ({
        x0: box.x0 / scale,
        y0: box.y0 / scale,
        x1: box.x1 / scale,
        y1: box.y1 / scale,
      }));
    })();
    lines = lines.flatMap((line: any) => {
      if (imageRegions.some((image) => insideOcrImage(line.bbox, image))) return [];
      const words = (line.words || []).filter(
        (word: any) => !imageRegions.some((image) => insideOcrImage(word.bbox, image)),
      );
      if (!line.words?.length || words.length === line.words.length) return [line];
      if (!words.length) return [];
      return [
        {
          ...line,
          words,
          text: words.map((word: any) => word.text).join(' '),
          bbox: {
            x0: Math.min(...words.map((word: any) => word.bbox.x0)),
            y0: Math.min(...words.map((word: any) => word.bbox.y0)),
            x1: Math.max(...words.map((word: any) => word.bbox.x1)),
            y1: Math.max(...words.map((word: any) => word.bbox.y1)),
          },
        },
      ];
    });
    if (!lines.length && !imageRegions.length) {
      setOcrStatus('No text was detected');
      setToast('No readable text was found in that area');
      window.setTimeout(() => setToast(''), 2600);
      return;
    }
    const sourceContext = source.getContext('2d', { willReadFrequently: true });
    const sampleBackground = (bbox: { x0: number; y0: number; x1: number; y1: number }) => {
      if (!sourceContext) return '#ffffff';
      const x = Math.max(0, Math.floor(bbox.x0 - 3));
      const y = Math.max(0, Math.floor(bbox.y0 - 3));
      const width = Math.max(1, Math.min(source.width - x, Math.ceil(bbox.x1 - bbox.x0 + 6)));
      const height = Math.max(1, Math.min(source.height - y, Math.ceil(bbox.y1 - bbox.y0 + 6)));
      const pixels = sourceContext.getImageData(x, y, width, height).data;
      let red = 0;
      let green = 0;
      let blue = 0;
      let count = 0;
      for (let py = 0; py < height; py += 1)
        for (let px = 0; px < width; px += 1) {
          if (px > 2 && px < width - 3 && py > 2 && py < height - 3) continue;
          const offset = (py * width + px) * 4;
          const luminance = pixels[offset] * 0.299 + pixels[offset + 1] * 0.587 + pixels[offset + 2] * 0.114;
          if (luminance < 90 || pixels[offset + 3] < 200) continue;
          red += pixels[offset];
          green += pixels[offset + 1];
          blue += pixels[offset + 2];
          count += 1;
        }
      const hex = (value: number) =>
        Math.max(0, Math.min(255, Math.round(value)))
          .toString(16)
          .padStart(2, '0');
      return count ? `#${hex(red / count)}${hex(green / count)}${hex(blue / count)}` : '#ffffff';
    };
    const sampleTextColor = (
      bbox: { x0: number; y0: number; x1: number; y1: number },
      background: string,
    ) => {
      if (!sourceContext) return '#111111';
      const x = Math.max(0, Math.floor(bbox.x0));
      const y = Math.max(0, Math.floor(bbox.y0));
      const width = Math.max(1, Math.min(source.width - x, Math.ceil(bbox.x1 - bbox.x0)));
      const height = Math.max(1, Math.min(source.height - y, Math.ceil(bbox.y1 - bbox.y0)));
      const pixels = sourceContext.getImageData(x, y, width, height).data;
      const [backgroundRed, backgroundGreen, backgroundBlue] = hexChannels(background).map(
        (channel) => channel * 255,
      );
      const colors = new Map<string, { count: number; red: number; green: number; blue: number }>();
      for (let offset = 0; offset < pixels.length; offset += 4) {
        if (pixels[offset + 3] < 200) continue;
        const red = pixels[offset];
        const green = pixels[offset + 1];
        const blue = pixels[offset + 2];
        if (Math.hypot(red - backgroundRed, green - backgroundGreen, blue - backgroundBlue) < 48) continue;
        const bucket = `${red >> 4}:${green >> 4}:${blue >> 4}`;
        const color = colors.get(bucket) || { count: 0, red: 0, green: 0, blue: 0 };
        color.count += 1;
        color.red += red;
        color.green += green;
        color.blue += blue;
        colors.set(bucket, color);
      }
      const dominant = [...colors.values()].sort((first, second) => second.count - first.count)[0];
      if (!dominant) return '#111111';
      return `#${[dominant.red, dominant.green, dominant.blue]
        .map((sum) =>
          Math.round(sum / dominant.count)
            .toString(16)
            .padStart(2, '0'),
        )
        .join('')}`;
    };
    const reconstructTextBackground = (
      bbox: { x0: number; y0: number; x1: number; y1: number },
      fallback: string,
    ) => {
      if (!sourceContext) return undefined;
      const x0 = Math.max(0, Math.floor(bbox.x0));
      const y0 = Math.max(0, Math.floor(bbox.y0));
      const width = Math.max(1, Math.min(source.width - x0, Math.ceil(bbox.x1 - bbox.x0)));
      const height = Math.max(1, Math.min(source.height - y0, Math.ceil(bbox.y1 - bbox.y0)));
      const patch = document.createElement('canvas');
      patch.width = width;
      patch.height = height;
      const patchContext = patch.getContext('2d');
      if (!patchContext) return undefined;
      const output = patchContext.createImageData(width, height);
      const fallbackChannels = hexChannels(fallback).map((channel) => Math.round(channel * 255));
      const sampleSide = (start: number, end: number, y: number) => {
        const from = Math.max(0, Math.min(source.width - 1, start));
        const to = Math.max(from + 1, Math.min(source.width, end));
        if (to <= from) return fallbackChannels;
        const pixels = sourceContext.getImageData(
          from,
          Math.max(0, Math.min(source.height - 1, y)),
          to - from,
          1,
        ).data;
        let red = 0;
        let green = 0;
        let blue = 0;
        let count = 0;
        for (let offset = 0; offset < pixels.length; offset += 4) {
          if (pixels[offset + 3] < 200) continue;
          red += pixels[offset];
          green += pixels[offset + 1];
          blue += pixels[offset + 2];
          count += 1;
        }
        return count ? [red / count, green / count, blue / count] : fallbackChannels;
      };
      for (let py = 0; py < height; py += 1) {
        const sourceY = y0 + py;
        const left = sampleSide(x0 - 7, x0 - 2, sourceY);
        const right = sampleSide(x0 + width + 2, x0 + width + 7, sourceY);
        for (let px = 0; px < width; px += 1) {
          const mix = width <= 1 ? 0.5 : px / (width - 1);
          const offset = (py * width + px) * 4;
          output.data[offset] = Math.round(left[0] * (1 - mix) + right[0] * mix);
          output.data[offset + 1] = Math.round(left[1] * (1 - mix) + right[1] * mix);
          output.data[offset + 2] = Math.round(left[2] * (1 - mix) + right[2] * mix);
          output.data[offset + 3] = 255;
        }
      }
      patchContext.putImageData(output, 0, 0);
      return patch.toDataURL('image/png');
    };
    const detectTextAppearance = (line: any, background: string) => {
      if (!sourceContext) return { bold: false, italic: false };
      const [backgroundRed, backgroundGreen, backgroundBlue] = hexChannels(background).map(
        (channel) => channel * 255,
      );
      const symbols = (line.words || [])
        .flatMap((word: any) => word.symbols || [])
        .filter(
          (symbol: any) =>
            symbol.text?.trim() &&
            symbol.bbox &&
            symbol.bbox.x1 - symbol.bbox.x0 >= 2 &&
            symbol.bbox.y1 - symbol.bbox.y0 >= 5,
        );
      const coverage: number[] = [];
      const slants: number[] = [];
      symbols.forEach((symbol: any) => {
        const x = Math.max(0, Math.floor(symbol.bbox.x0));
        const y = Math.max(0, Math.floor(symbol.bbox.y0));
        const width = Math.max(1, Math.min(source.width - x, Math.ceil(symbol.bbox.x1 - symbol.bbox.x0)));
        const height = Math.max(1, Math.min(source.height - y, Math.ceil(symbol.bbox.y1 - symbol.bbox.y0)));
        const pixels = sourceContext.getImageData(x, y, width, height).data;
        let ink = 0;
        let topX = 0;
        let topCount = 0;
        let bottomX = 0;
        let bottomCount = 0;
        for (let py = 0; py < height; py += 1)
          for (let px = 0; px < width; px += 1) {
            const offset = (py * width + px) * 4;
            if (pixels[offset + 3] < 200) continue;
            const distance = Math.hypot(
              pixels[offset] - backgroundRed,
              pixels[offset + 1] - backgroundGreen,
              pixels[offset + 2] - backgroundBlue,
            );
            if (distance < 64) continue;
            ink += 1;
            if (py < height * 0.38) {
              topX += px;
              topCount += 1;
            }
            if (py > height * 0.62) {
              bottomX += px;
              bottomCount += 1;
            }
          }
        if (ink > 2) coverage.push(ink / (width * height));
        if (topCount > 1 && bottomCount > 1) slants.push((topX / topCount - bottomX / bottomCount) / height);
      });
      const median = (values: number[]) => {
        const sorted = [...values].sort((first, second) => first - second);
        return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
      };
      const italicVotes = slants.filter((slant) => slant > 0.055).length;
      return {
        bold: coverage.length >= 3 && median(coverage) > 0.4,
        italic: slants.length >= 2 && italicVotes >= Math.max(2, Math.ceil(slants.length * 0.45)),
      };
    };
    const originX = region?.x || 0;
    const originTop = region?.top || 0;
    const stamp = Date.now();
    const detectedImages = imageRegions.map((box, index) => ({
      id: `ocr-image-${stamp}-${index}`,
      x: originX + box.x0 / renderScale,
      top: originTop + box.y0 / renderScale,
      width: (box.x1 - box.x0) / renderScale,
      height: (box.y1 - box.y0) / renderScale,
    }));
    const captures: Record<string, string> = {};
    detectedImages.forEach((image, index) => {
      const box = imageRegions[index];
      const crop = document.createElement('canvas');
      crop.width = Math.ceil(box.x1 - box.x0);
      crop.height = Math.ceil(box.y1 - box.y0);
      crop
        .getContext('2d')
        ?.drawImage(source, box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0, 0, 0, crop.width, crop.height);
      captures[`${currentPage}:${image.id}`] = crop.toDataURL('image/png');
    });
    const newImages = detectedImages.filter(
      (image) =>
        !pageInfo.images.some(
          (existing) =>
            existing.id.startsWith('ocr-image-') &&
            Math.abs(existing.x - image.x) < 3 &&
            Math.abs(existing.top - image.top) < 3 &&
            Math.abs(existing.width - image.width) < 6 &&
            Math.abs(existing.height - image.height) < 6,
        ),
    );
    const detectedVectors = ocrRecognizeLayout
      ? detectScannedLines(source, renderScale, originX, originTop, stamp).filter(
          (vector) =>
            !detectedImages.some((image) =>
              insideOcrImage(
                { x0: vector.x, y0: vector.top, x1: vector.x + vector.width, y1: vector.top + vector.height },
                { x0: image.x, y0: image.top, x1: image.x + image.width, y1: image.top + image.height },
              ),
            ),
        )
      : [];
    const detectedRectangles = detectedVectors.filter((vector) => vector.kind === 'rectangle');
    const ocrMeasureContext = document.createElement('canvas').getContext('2d');
    const textRuns = lines.flatMap((line: any) =>
      splitOcrLine(line, (word) => {
        const background = sampleBackground(word.bbox);
        return {
          color: sampleTextColor(word.bbox, background),
          ...detectTextAppearance({ words: [word] }, background),
        };
      }),
    );
    const boxes: AddedTextBox[] = textRuns.map((line: any, index: number) => {
      const width = Math.max(4, (line.bbox.x1 - line.bbox.x0) / renderScale);
      const height = Math.max(7, (line.bbox.y1 - line.bbox.y0) / renderScale);
      const detectedFontName = cleanPdfFontName(
        (line.words || []).map((word: any) => word.font_name || '').find(Boolean) || '',
      );
      const knownFont = fontOptions.find((font) => font.toLowerCase() === detectedFontName.toLowerCase());
      const styleDescriptor = `${detectedFontName} ${(line.words || []).map((word: any) => word.font_name || '').join(' ')}`;
      const layout = line.layoutBBox || line.bbox;
      const leftSpace = Math.max(0, line.bbox.x0 - layout.x0);
      const rightSpace = Math.max(0, layout.x1 - line.bbox.x1);
      const alignmentTolerance = Math.max(8, (layout.x1 - layout.x0) * 0.08);
      const alignment: TextAlignment =
        Math.abs(leftSpace - rightSpace) <= alignmentTolerance && leftSpace > 4
          ? 'center'
          : leftSpace > rightSpace * 2 && leftSpace > 10
            ? 'right'
            : 'left';
      const lineX = originX + line.bbox.x0 / renderScale;
      const lineTop = originTop + line.bbox.y0 / renderScale;
      const lineRight = originX + line.bbox.x1 / renderScale;
      const lineBottom = originTop + line.bbox.y1 / renderScale;
      const containingRectangle = detectedRectangles
        .filter(
          (rectangle) =>
            lineX >= rectangle.x - 2 &&
            lineRight <= rectangle.x + rectangle.width + 2 &&
            lineTop >= rectangle.top - 2 &&
            lineBottom <= rectangle.top + rectangle.height + 2,
        )
        .sort((a, b) => a.width * a.height - b.width * b.height)[0];
      const background =
        containingRectangle?.fill && containingRectangle.fill !== 'transparent'
          ? containingRectangle.fill
          : sampleBackground(line.bbox);
      const appearance = detectTextAppearance(line, background);
      const font = knownFont || closestStandardFont(detectedFontName);
      const metadataBold = /bold|black|heavy|demi/i.test(styleDescriptor);
      const metadataItalic = /italic|oblique/i.test(styleDescriptor);
      const letters = line.text.match(/[a-z]/gi) || [];
      const lowercaseLetters = line.text.match(/[a-z]/g) || [];
      const pixelBold = appearance.bold && letters.length >= 6 && lowercaseLetters.length >= 2;
      const pixelItalic = appearance.italic && letters.length >= 5 && lowercaseLetters.length >= 1;
      const bold = metadataBold || pixelBold;
      const italic = metadataItalic || pixelItalic;
      const ocrFontWeight = bold ? (metadataBold ? 700 : 400) : undefined;
      const ocrTextStroke = pixelBold && !metadataBold ? 0.28 : undefined;
      const heightBasedSize = height / 0.74;
      let widthBasedSize = Number.POSITIVE_INFINITY;
      if (ocrMeasureContext) {
        ocrMeasureContext.font = `${italic ? 'italic ' : ''}${bold ? `${ocrFontWeight} ` : '400 '}100px ${browserFontFamily(font)}`;
        const measuredWidth = ocrMeasureContext.measureText(line.text.trim()).width;
        if (measuredWidth > 0) widthBasedSize = ((width * 100) / measuredWidth) * 1.02;
      }
      const size = Math.max(6, Math.min(72, heightBasedSize, widthBasedSize));
      if (ocrMeasureContext)
        ocrMeasureContext.font = `${italic ? 'italic ' : ''}${bold ? `${ocrFontWeight} ` : '400 '}${size}px ${browserFontFamily(font)}`;
      const fittedWidth = Math.max(
        width,
        Math.ceil(
          (ocrMeasureContext?.measureText(line.text.trim()).width || width) + (ocrTextStroke || 0) * 2 + 1,
        ),
      );
      const fittedMetrics = ocrMeasureContext?.measureText(line.text.trim());
      const fittedGlyphHeight =
        (fittedMetrics?.actualBoundingBoxAscent || size * 0.72) +
        (fittedMetrics?.actualBoundingBoxDescent || size * 0.08);
      const fittedHeight = Math.max(4, Math.ceil(fittedGlyphHeight));
      const x = originX + line.bbox.x0 / renderScale;
      const top = originTop + line.bbox.y0 / renderScale;
      return {
        id: `ocr-${stamp}-${index}`,
        page: currentPage,
        x,
        top,
        width: fittedWidth,
        height: fittedHeight,
        text: line.text.trim(),
        font,
        size,
        color: sampleTextColor(line.bbox, background),
        bold,
        italic,
        underline: false,
        strike: false,
        alignment,
        autoFit: true,
        ocrSource: true,
        ocrConfidence: Number(line.confidence || 0),
        ocrBackground: background,
        ocrBackgroundImage: containingRectangle
          ? undefined
          : reconstructTextBackground(line.bbox, background),
        ocrFontWeight,
        ocrTextStroke,
        ocrOriginalX: x,
        ocrOriginalTop: top,
        ocrOriginalWidth: width,
        ocrOriginalHeight: height,
      };
    });
    recordHistory();
    setAddedBoxes((items) => [...items, ...boxes]);
    if (detectedImages.length) setImageCaptures((items) => ({ ...items, ...captures }));
    if (detectedVectors.length || detectedImages.length)
      setPages((items) =>
        items.map((page, index) =>
          index === currentPage
            ? {
                ...page,
                vectors: [...page.vectors, ...detectedVectors],
                images: [...page.images, ...newImages],
              }
            : page,
        ),
      );
    const refs: SelectedElementRef[] = [
      ...boxes.map((box) => ({ page: currentPage, kind: 'added-text' as const, id: box.id })),
      ...detectedVectors.map((vector) => ({ page: currentPage, kind: 'vector' as const, id: vector.id })),
      ...newImages.map((image) => ({ page: currentPage, kind: 'image' as const, id: image.id })),
    ];
    setSelectedElements(refs);
    setSelectedAddedId(boxes[boxes.length - 1]?.id || null);
    setSelected(null);
    setSelectedForm(null);
    setSelectedImage(!boxes.length && newImages.length ? { kind: 'existing', id: newImages[0].id } : null);
    setSelectedVectorId(null);
    setOcrStatus(
      `Recognized ${boxes.length} text boxes${detectedVectors.length ? ` and ${detectedVectors.length} layout lines` : ''}${detectedImages.length ? ` and ${detectedImages.length} images` : ''}`,
    );
    setOcrProgress(100);
    if (!region || !keepPopupToolActive()) setTool('select');
    setToast(
      `${boxes.length} text boxes${detectedVectors.length ? ` + ${detectedVectors.length} table/shape lines` : ''}${detectedImages.length ? ` + ${detectedImages.length} images` : ''} added`,
    );
    window.setTimeout(() => setToast(''), 2800);
  } catch (reason) {
    console.error(reason);
    setOcrStatus('OCR could not finish');
    setError('Local OCR could not read this page. Try a smaller region or a clearer scan.');
  } finally {
    setOcrBusy(false);
    setOcrRegion(null);
  }
}
