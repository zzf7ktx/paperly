import { FORM_APPEARANCE_PADDING } from '../constants';
import type {
  FormBackdropPrimitive,
  FormBlock,
  FormEdit,
  ImageBlock,
  TextBlock,
  VectorBlock,
} from '../types';
import { pdfColorToHex } from './appearance';

export function extractPdfImages(pdfjs: any, viewport: any, operatorList: any): ImageBlock[] {
  let matrix = [1, 0, 0, 1, 0, 0];
  const stack: number[][] = [];
  const imageOps = new Set([
    pdfjs.OPS.paintImageXObject,
    pdfjs.OPS.paintInlineImageXObject,
    pdfjs.OPS.paintImageMaskXObject,
    pdfjs.OPS.paintSolidColorImageMask,
  ]);
  const images: ImageBlock[] = [];
  operatorList.fnArray.forEach((operation: number, index: number) => {
    if (operation === pdfjs.OPS.save) {
      stack.push([...matrix]);
      return;
    }
    if (operation === pdfjs.OPS.restore) {
      matrix = stack.pop() || [1, 0, 0, 1, 0, 0];
      return;
    }
    if (operation === pdfjs.OPS.transform) {
      matrix = pdfjs.Util.transform(matrix, operatorList.argsArray[index]);
      return;
    }
    if (!imageOps.has(operation)) return;
    const transform = pdfjs.Util.transform(viewport.transform, matrix);
    const points = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ].map(([x, y]) => [
      transform[0] * x + transform[2] * y + transform[4],
      transform[1] * x + transform[3] * y + transform[5],
    ]);
    const xs = points.map((point) => point[0]);
    const ys = points.map((point) => point[1]);
    const x = Math.min(...xs);
    const top = Math.min(...ys);
    const width = Math.max(...xs) - x;
    const height = Math.max(...ys) - top;
    if (width >= 5 && height >= 5) images.push({ id: `image-${index}`, x, top, width, height });
  });
  return images;
}

export function extractPdfVectors(pdfjs: any, viewport: any, operatorList: any): VectorBlock[] {
  const vectors: VectorBlock[] = [];
  let fill = '#000000';
  let stroke = '#000000';
  let strokeWidth = 1;
  let matrix = [1, 0, 0, 1, 0, 0];
  const stack: Array<{ fill: string; stroke: string; strokeWidth: number; matrix: number[] }> = [];
  let pending: { index: number; bounds: ArrayLike<number>; matrix: number[] } | null = null;
  const addPending = (paintsFill: boolean, paintsStroke: boolean) => {
    if (!pending || vectors.length >= 350) return;
    const { index, bounds, matrix: pathMatrix } = pending;
    pending = null;
    const transform = pdfjs.Util.transform(viewport.transform, pathMatrix);
    const x0 = Number(bounds[0]);
    const y0 = Number(bounds[1]);
    const x1 = Number(bounds[2]);
    const y1 = Number(bounds[3]);
    const points = [
      [x0, y0],
      [x1, y0],
      [x0, y1],
      [x1, y1],
    ].map(([pointX, pointY]) => [
      transform[0] * pointX + transform[2] * pointY + transform[4],
      transform[1] * pointX + transform[3] * pointY + transform[5],
    ]);
    const xs = points.map((point) => point[0]);
    const ys = points.map((point) => point[1]);
    const x = Math.min(...xs);
    const top = Math.min(...ys);
    const width = Math.max(...xs) - x;
    const height = Math.max(...ys) - top;
    if ((width < 0.5 && height < 0.5) || width > viewport.width * 0.98 || height > viewport.height * 0.98)
      return;
    const matrixScale =
      (Math.hypot(pathMatrix[0], pathMatrix[1]) + Math.hypot(pathMatrix[2], pathMatrix[3])) / 2 || 1;
    vectors.push({
      id: `vector-${index}`,
      kind: !paintsFill && (width < 2 || height < 2) ? 'line' : 'rectangle',
      x,
      top,
      width: Math.max(width, 0.5),
      height: Math.max(height, 0.5),
      fill: paintsFill ? fill : 'transparent',
      stroke: paintsStroke ? stroke : 'transparent',
      strokeWidth: paintsStroke ? strokeWidth * matrixScale : 0,
    });
  };
  operatorList.fnArray.forEach((operation: number, index: number) => {
    const args = operatorList.argsArray[index];
    if (operation === pdfjs.OPS.save) {
      stack.push({ fill, stroke, strokeWidth, matrix: [...matrix] });
      return;
    }
    if (operation === pdfjs.OPS.restore) {
      const saved = stack.pop();
      if (saved) {
        fill = saved.fill;
        stroke = saved.stroke;
        strokeWidth = saved.strokeWidth;
        matrix = saved.matrix;
      }
      return;
    }
    if (operation === pdfjs.OPS.transform) {
      matrix = pdfjs.Util.transform(matrix, args);
      return;
    }
    if (operation === pdfjs.OPS.setFillRGBColor) {
      fill = pdfColorToHex(args, fill);
      return;
    }
    if (operation === pdfjs.OPS.setStrokeRGBColor) {
      stroke = pdfColorToHex(args, stroke);
      return;
    }
    if (operation === pdfjs.OPS.setLineWidth) {
      strokeWidth = Math.max(0.25, Number(args?.[0]) || 1);
      return;
    }
    if (operation === pdfjs.OPS.constructPath) {
      const bounds = args?.[2] as ArrayLike<number> | undefined;
      if (!bounds || bounds.length < 4) return;
      pending = { index, bounds, matrix: [...matrix] };
      const paint = Number(args?.[0]);
      if ([pdfjs.OPS.fill, pdfjs.OPS.eoFill].includes(paint)) addPending(true, false);
      else if ([pdfjs.OPS.stroke, pdfjs.OPS.closeStroke].includes(paint)) addPending(false, true);
      else if ([pdfjs.OPS.fillStroke, pdfjs.OPS.eoFillStroke].includes(paint)) addPending(true, true);
      return;
    }
    if ([pdfjs.OPS.fill, pdfjs.OPS.eoFill].includes(operation)) {
      addPending(true, false);
      return;
    }
    if ([pdfjs.OPS.stroke, pdfjs.OPS.closeStroke].includes(operation)) {
      addPending(false, true);
      return;
    }
    if ([pdfjs.OPS.fillStroke, pdfjs.OPS.eoFillStroke].includes(operation)) addPending(true, true);
  });
  return vectors;
}

export function detectScannedLines(
  canvas: HTMLCanvasElement,
  scale: number,
  originX: number,
  originTop: number,
  stamp: number,
): VectorBlock[] {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return [];
  const { width, height } = canvas;
  const pixels = context.getImageData(0, 0, width, height).data;
  const luminance = (x: number, y: number) => {
    const offset = (y * width + x) * 4;
    return pixels[offset] * 0.299 + pixels[offset + 1] * 0.587 + pixels[offset + 2] * 0.114;
  };
  const lightSamples: number[] = [];
  for (let y = 0; y < height; y += Math.max(4, Math.floor(height / 100)))
    for (let x = 0; x < width; x += Math.max(4, Math.floor(width / 100))) lightSamples.push(luminance(x, y));
  lightSamples.sort((a, b) => a - b);
  const pageLight = lightSamples[Math.floor(lightSamples.length * 0.82)] || 255;
  const inkThreshold = Math.max(145, pageLight - 28);
  const dark = (x: number, y: number) => {
    const offset = (y * width + x) * 4;
    return pixels[offset + 3] > 180 && luminance(x, y) < inkThreshold;
  };
  const colorAt = (x: number, y: number) => {
    const offset =
      (Math.max(0, Math.min(height - 1, Math.round(y))) * width +
        Math.max(0, Math.min(width - 1, Math.round(x)))) *
      4;
    return `#${[pixels[offset], pixels[offset + 1], pixels[offset + 2]].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
  };
  const dominantInteriorColor = (x: number, top: number, regionWidth: number, regionHeight: number) => {
    const colors = new Map<string, { count: number; red: number; green: number; blue: number }>();
    const insetX = Math.max(2, Math.round(regionWidth * 0.04));
    const insetY = Math.max(2, Math.round(regionHeight * 0.15));
    const step = Math.max(1, Math.floor(Math.min(regionWidth, regionHeight) / 24));
    for (let py = Math.round(top + insetY); py < top + regionHeight - insetY; py += step)
      for (let px = Math.round(x + insetX); px < x + regionWidth - insetX; px += step) {
        const offset =
          (Math.max(0, Math.min(height - 1, py)) * width + Math.max(0, Math.min(width - 1, px))) * 4;
        if (pixels[offset + 3] < 180 || luminance(px, py) < inkThreshold) continue;
        const bucket = `${pixels[offset] >> 3}:${pixels[offset + 1] >> 3}:${pixels[offset + 2] >> 3}`;
        const entry = colors.get(bucket) || { count: 0, red: 0, green: 0, blue: 0 };
        entry.count += 1;
        entry.red += pixels[offset];
        entry.green += pixels[offset + 1];
        entry.blue += pixels[offset + 2];
        colors.set(bucket, entry);
      }
    const dominant = [...colors.values()].sort((a, b) => b.count - a.count)[0];
    if (!dominant) return colorAt(x + regionWidth / 2, top + regionHeight / 2);
    return `#${[dominant.red, dominant.green, dominant.blue]
      .map((sum) =>
        Math.round(sum / dominant.count)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')}`;
  };
  const segments: Array<{ horizontal: boolean; start: number; fixed: number; length: number }> = [];
  const scan = (horizontal: boolean) => {
    const fixedLimit = horizontal ? height : width;
    const movingLimit = horizontal ? width : height;
    const minimum = Math.max(32, Math.round(movingLimit * 0.075));
    for (let fixed = 0; fixed < fixedLimit; fixed += 1) {
      let start = -1;
      let gap = 0;
      for (let moving = 0; moving <= movingLimit; moving += 1) {
        const ink = moving < movingLimit && (horizontal ? dark(moving, fixed) : dark(fixed, moving));
        if (ink) {
          if (start < 0) start = moving;
          gap = 0;
          continue;
        }
        if (start >= 0 && gap < 2 && moving < movingLimit) {
          gap += 1;
          continue;
        }
        if (start >= 0 && moving - gap - start >= minimum)
          segments.push({ horizontal, start, fixed, length: moving - gap - start });
        start = -1;
        gap = 0;
      }
    }
  };
  scan(true);
  scan(false);
  const merged: typeof segments = [];
  segments
    .sort((a, b) => Number(a.horizontal) - Number(b.horizontal) || a.fixed - b.fixed || a.start - b.start)
    .forEach((segment) => {
      const prior = merged[merged.length - 1];
      if (
        prior &&
        prior.horizontal === segment.horizontal &&
        segment.fixed - prior.fixed <= 2 &&
        Math.abs(segment.start - prior.start) <= 4 &&
        Math.abs(segment.length - prior.length) <= 8
      ) {
        prior.fixed = (prior.fixed + segment.fixed) / 2;
        prior.start = Math.min(prior.start, segment.start);
        prior.length = Math.max(prior.length, segment.length);
      } else merged.push({ ...segment });
    });
  const used = new Set<number>();
  const rectangles: VectorBlock[] = [];
  const horizontal = merged
    .map((segment, index) => ({ segment, index }))
    .filter(({ segment }) => segment.horizontal);
  horizontal.forEach(({ segment: topEdge, index: topIndex }) => {
    if (used.has(topIndex) || topEdge.length < Math.max(40, width * 0.08)) return;
    const match = horizontal.find(
      ({ segment: bottomEdge, index: bottomIndex }) =>
        bottomIndex !== topIndex &&
        !used.has(bottomIndex) &&
        bottomEdge.fixed > topEdge.fixed + 4 &&
        bottomEdge.fixed - topEdge.fixed < height * 0.45 &&
        Math.abs(bottomEdge.start - topEdge.start) <= 5 &&
        Math.abs(bottomEdge.length - topEdge.length) <= 10,
    );
    if (!match) return;
    const bottomEdge = match.segment;
    const right = topEdge.start + topEdge.length;
    const verticalCoverage = (x: number) => {
      let ink = 0;
      const span = Math.max(1, Math.round(bottomEdge.fixed - topEdge.fixed));
      for (let y = Math.round(topEdge.fixed); y <= Math.round(bottomEdge.fixed); y += 1)
        if ([x - 1, x, x + 1].some((sampleX) => sampleX >= 0 && sampleX < width && dark(sampleX, y)))
          ink += 1;
      return ink / span;
    };
    if (verticalCoverage(Math.round(topEdge.start)) < 0.55 || verticalCoverage(Math.round(right)) < 0.55)
      return;
    used.add(topIndex);
    used.add(match.index);
    const x = originX + topEdge.start / scale;
    const top = originTop + topEdge.fixed / scale;
    const rectangleWidth = topEdge.length / scale;
    const rectangleHeight = (bottomEdge.fixed - topEdge.fixed) / scale;
    rectangles.push({
      id: `ocr-rectangle-${stamp}-${rectangles.length}`,
      kind: 'rectangle',
      x,
      top,
      width: rectangleWidth,
      height: rectangleHeight,
      fill: dominantInteriorColor(
        topEdge.start,
        topEdge.fixed,
        topEdge.length,
        bottomEdge.fixed - topEdge.fixed,
      ),
      stroke: colorAt(topEdge.start, topEdge.fixed),
      strokeWidth: Math.max(0.5, 1 / scale),
      added: true,
    });
  });
  const lines = merged.flatMap((segment, sourceIndex) => {
    if (used.has(sourceIndex)) return [];
    const x = originX + (segment.horizontal ? segment.start : segment.fixed) / scale;
    const top = originTop + (segment.horizontal ? segment.fixed : segment.start) / scale;
    const endX = originX + (segment.horizontal ? segment.start + segment.length : segment.fixed) / scale;
    const endTop = originTop + (segment.horizontal ? segment.fixed : segment.start + segment.length) / scale;
    return [
      {
        id: `ocr-line-${stamp}-${sourceIndex}`,
        kind: 'line' as const,
        x: Math.min(x, endX),
        top: Math.min(top, endTop),
        width: Math.max(0.5, Math.abs(endX - x)),
        height: Math.max(0.5, Math.abs(endTop - top)),
        fill: 'transparent',
        stroke: colorAt(
          segment.horizontal ? segment.start : segment.fixed,
          segment.horizontal ? segment.fixed : segment.start,
        ),
        strokeWidth: Math.max(0.5, 1 / scale),
        points: [
          { x, top },
          { x: endX, top: endTop },
        ],
        added: true,
      },
    ];
  });
  return [...rectangles, ...lines].slice(0, 240);
}

export function attachFormBackdrops(pdfjs: any, viewport: any, operatorList: any, forms: FormBlock[]) {
  const candidates: FormBackdropPrimitive[] = [];
  const seen = new Set<string>();
  let fill = '#000000';
  let stroke = '#000000';
  let strokeWidth = 1;
  const stack: Array<{ fill: string; stroke: string; strokeWidth: number }> = [];
  operatorList.fnArray.forEach((operation: number, index: number) => {
    const args = operatorList.argsArray[index];
    if (operation === pdfjs.OPS.save) {
      stack.push({ fill, stroke, strokeWidth });
      return;
    }
    if (operation === pdfjs.OPS.restore) {
      const prior = stack.pop();
      if (prior) ({ fill, stroke, strokeWidth } = prior);
      return;
    }
    if (operation === pdfjs.OPS.setFillRGBColor) {
      fill = String(args?.[0] || fill);
      return;
    }
    if (operation === pdfjs.OPS.setStrokeRGBColor) {
      stroke = String(args?.[0] || stroke);
      return;
    }
    if (operation === pdfjs.OPS.setLineWidth) {
      strokeWidth = Math.max(0, Number(args?.[0]) || 0);
      return;
    }
    if (operation !== pdfjs.OPS.constructPath) return;
    const paintOperation = Number(args?.[0]);
    const paintsFill = [
      pdfjs.OPS.fill,
      pdfjs.OPS.eoFill,
      pdfjs.OPS.fillStroke,
      pdfjs.OPS.eoFillStroke,
    ].includes(paintOperation);
    const paintsStroke = [
      pdfjs.OPS.stroke,
      pdfjs.OPS.closeStroke,
      pdfjs.OPS.fillStroke,
      pdfjs.OPS.eoFillStroke,
    ].includes(paintOperation);
    if (!paintsFill && !paintsStroke) return;
    const bounds = args?.[2] as ArrayLike<number> | undefined;
    if (!bounds || bounds.length < 4) return;
    const rectangle = viewport.convertToViewportRectangle([
      Number(bounds[0]),
      Number(bounds[1]),
      Number(bounds[2]),
      Number(bounds[3]),
    ]);
    const x = Math.min(rectangle[0], rectangle[2]);
    const top = Math.min(rectangle[1], rectangle[3]);
    const width = Math.abs(rectangle[2] - rectangle[0]);
    const height = Math.abs(rectangle[3] - rectangle[1]);
    if (width < 2 || height < 2) return;
    const signature = [x, top, width, height, paintsFill ? fill : '', paintsStroke ? stroke : '', strokeWidth]
      .map((value) => (typeof value === 'number' ? value.toFixed(1) : value))
      .join(':');
    if (seen.has(signature)) return;
    seen.add(signature);
    candidates.push({
      x,
      top,
      width,
      height,
      fill: paintsFill ? fill : undefined,
      stroke: paintsStroke ? stroke : undefined,
      strokeWidth: paintsStroke ? strokeWidth : 0,
    });
  });
  return forms.map((field) => {
    const right = field.x + field.width;
    const bottom = field.top + field.height;
    const matches = candidates.filter((candidate) => {
      const candidateRight = candidate.x + candidate.width;
      const candidateBottom = candidate.top + candidate.height;
      const intersectionWidth = Math.max(0, Math.min(right, candidateRight) - Math.max(field.x, candidate.x));
      const intersectionHeight = Math.max(
        0,
        Math.min(bottom, candidateBottom) - Math.max(field.top, candidate.top),
      );
      const coverage = (intersectionWidth * intersectionHeight) / Math.max(1, field.width * field.height);
      const maxWidth = Math.max(field.width + 12, field.width * 2.5);
      const maxHeight = Math.max(field.height + 12, field.height * 2.5);
      return (
        coverage >= 0.72 &&
        candidate.width >= field.width * 0.72 &&
        candidate.height >= field.height * 0.72 &&
        candidate.width <= maxWidth &&
        candidate.height <= maxHeight &&
        candidate.x >= field.x - 8 &&
        candidate.top >= field.top - 8 &&
        candidateRight <= right + 8 &&
        candidateBottom <= bottom + 8
      );
    });
    if (!matches.length) return field;
    const x = Math.min(...matches.map((candidate) => candidate.x - candidate.strokeWidth / 2));
    const top = Math.min(...matches.map((candidate) => candidate.top - candidate.strokeWidth / 2));
    const backdropRight = Math.max(
      ...matches.map((candidate) => candidate.x + candidate.width + candidate.strokeWidth / 2),
    );
    const backdropBottom = Math.max(
      ...matches.map((candidate) => candidate.top + candidate.height + candidate.strokeWidth / 2),
    );
    return {
      ...field,
      backdrop: { x, top, width: backdropRight - x, height: backdropBottom - top, primitives: matches },
    };
  });
}

export function attachFormLabels(forms: FormBlock[], blocks: TextBlock[]) {
  const usedLabels = new Set<number>();
  const formBounds = forms.map((field) => field.backdrop || field);
  return forms.map((field, fieldIndex) => {
    const bounds = formBounds[fieldIndex];
    const right = bounds.x + bounds.width;
    const bottom = bounds.top + bounds.height;
    const candidates = blocks
      .flatMap((block) => {
        const text = block.str.trim();
        if (!text || block.width < 2 || block.height < 2 || usedLabels.has(block.id)) return [];
        const blockRight = block.x + block.width;
        const blockBottom = block.top + block.height;
        const centerDelta = Math.abs(block.top + block.height / 2 - (bounds.top + bounds.height / 2));
        const sitsInsideAField = formBounds.some(
          (other, index) =>
            index !== fieldIndex &&
            block.x + block.width / 2 >= other.x &&
            block.x + block.width / 2 <= other.x + other.width &&
            block.top + block.height / 2 >= other.top &&
            block.top + block.height / 2 <= other.top + other.height,
        );
        if (sitsInsideAField) return [];
        const choices: Array<{ score: number }> = [];
        const leftGap = bounds.x - blockRight;
        if (leftGap >= -3 && leftGap <= 150 && centerDelta <= Math.max(12, bounds.height * 0.8))
          choices.push({
            score: leftGap + centerDelta * 2 + (field.kind === 'checkbox' || field.kind === 'radio' ? 8 : 0),
          });
        const rightGap = block.x - right;
        const rightLimit = field.kind === 'checkbox' || field.kind === 'radio' ? 90 : 45;
        if (rightGap >= -3 && rightGap <= rightLimit && centerDelta <= Math.max(12, bounds.height * 0.8))
          choices.push({
            score:
              rightGap + centerDelta * 2 + (field.kind === 'checkbox' || field.kind === 'radio' ? 0 : 18),
          });
        const aboveGap = bounds.top - blockBottom;
        const horizontalOverlap = Math.max(0, Math.min(right, blockRight) - Math.max(bounds.x, block.x));
        const horizontalCenterDelta = Math.abs(block.x + block.width / 2 - (bounds.x + bounds.width / 2));
        if (
          aboveGap >= -2 &&
          aboveGap <= 28 &&
          (horizontalOverlap > 0 || horizontalCenterDelta <= Math.max(24, bounds.width / 2))
        )
          choices.push({ score: 35 + aboveGap * 2 + horizontalCenterDelta * 0.25 });
        const best = choices.sort((a, b) => a.score - b.score)[0];
        return best ? [{ block, score: best.score }] : [];
      })
      .sort((a, b) => a.score - b.score)[0];
    if (!candidates || candidates.score > 180) return field;
    usedLabels.add(candidates.block.id);
    return { ...field, labelBlockId: candidates.block.id };
  });
}

export function formBackdropGeometry(field: FormBlock, edit: FormEdit = {}) {
  const backdrop = field.backdrop || {
    x: field.x - FORM_APPEARANCE_PADDING,
    top: field.top - FORM_APPEARANCE_PADDING,
    width: field.width + FORM_APPEARANCE_PADDING * 2,
    height: field.height + FORM_APPEARANCE_PADDING * 2,
    primitives: [],
  };
  const width = edit.width ?? field.width;
  const height = edit.height ?? field.height;
  const scaleX = width / Math.max(1, field.width);
  const scaleY = height / Math.max(1, field.height);
  return {
    x: (edit.x ?? field.x) + (backdrop.x - field.x) * scaleX,
    top: (edit.top ?? field.top) + (backdrop.top - field.top) * scaleY,
    width: backdrop.width * scaleX,
    height: backdrop.height * scaleY,
  };
}

export function formBackdropPrimitiveGeometry(
  field: FormBlock,
  primitive: FormBackdropPrimitive,
  edit: FormEdit = {},
) {
  const width = edit.width ?? field.width;
  const height = edit.height ?? field.height;
  const scaleX = width / Math.max(1, field.width);
  const scaleY = height / Math.max(1, field.height);
  return {
    x: (edit.x ?? field.x) + (primitive.x - field.x) * scaleX,
    top: (edit.top ?? field.top) + (primitive.top - field.top) * scaleY,
    width: primitive.width * scaleX,
    height: primitive.height * scaleY,
    strokeWidth: (primitive.strokeWidth * (scaleX + scaleY)) / 2,
  };
}
