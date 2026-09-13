import type { AddedTextBox, VectorBlock, VectorEdit } from '../types';

type Rect = { x: number; top: number; width: number; height: number };

/** Areas to erase, relative to the original OCR bounds, with current table rules excluded. */
export function ocrCoverRects(
  box: AddedTextBox,
  vectors: VectorBlock[],
  edits: Record<string, VectorEdit>,
): Rect[] {
  const originX = box.ocrOriginalX ?? box.x,
    originTop = box.ocrOriginalTop ?? box.top;
  let pieces: Rect[] = [
    { x: 0, top: 0, width: box.ocrOriginalWidth ?? box.width, height: box.ocrOriginalHeight ?? box.height },
  ];
  const subtract = (cut: Rect) => {
    pieces = pieces.flatMap((piece) => {
      const left = Math.max(piece.x, cut.x),
        right = Math.min(piece.x + piece.width, cut.x + cut.width);
      const top = Math.max(piece.top, cut.top),
        bottom = Math.min(piece.top + piece.height, cut.top + cut.height);
      if (right <= left || bottom <= top) return [piece];
      return [
        { x: piece.x, top: piece.top, width: piece.width, height: top - piece.top },
        { x: piece.x, top: bottom, width: piece.width, height: piece.top + piece.height - bottom },
        { x: piece.x, top, width: left - piece.x, height: bottom - top },
        { x: right, top, width: piece.x + piece.width - right, height: bottom - top },
      ].filter((part) => part.width > 0.001 && part.height > 0.001);
    });
  };
  for (const vector of vectors) {
    const edit = edits[`${box.page}:${vector.id}`] || {};
    const shape = { ...vector, ...edit };
    if (
      edit.deleted ||
      !shape.stroke ||
      shape.stroke === 'transparent' ||
      shape.stroke === 'none' ||
      shape.strokeWidth <= 0
    )
      continue;
    // A small margin preserves antialiased edges as well as the stroke itself.
    const half = shape.strokeWidth / 2 + 0.25;
    const horizontal = (x: number, y: number, width: number) =>
      subtract({
        x: x - originX - half,
        top: y - originTop - half,
        width: width + half * 2,
        height: half * 2,
      });
    const vertical = (x: number, y: number, height: number) =>
      subtract({
        x: x - originX - half,
        top: y - originTop - half,
        width: half * 2,
        height: height + half * 2,
      });
    if (shape.kind === 'rectangle') {
      horizontal(shape.x, shape.top, shape.width);
      horizontal(shape.x, shape.top + shape.height, shape.width);
      vertical(shape.x, shape.top, shape.height);
      vertical(shape.x + shape.width, shape.top, shape.height);
    } else if (shape.kind === 'line') {
      const points = shape.points;
      const horizontalLine = points?.length
        ? Math.abs(points[0].top - points[points.length - 1].top) < 0.1
        : shape.height <= 0.5;
      const verticalLine = points?.length
        ? Math.abs(points[0].x - points[points.length - 1].x) < 0.1
        : shape.width <= 0.5;
      if (horizontalLine) horizontal(shape.x, shape.top, shape.width);
      else if (verticalLine) vertical(shape.x, shape.top, shape.height);
    }
  }
  return pieces;
}
