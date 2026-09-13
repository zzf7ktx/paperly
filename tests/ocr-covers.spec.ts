import { expect, test } from '@playwright/test';
import { ocrCoverRects } from '../features/pdf-editor/lib/ocr-covers';
import type { AddedTextBox, VectorBlock } from '../features/pdf-editor/types';

const box = {
  page: 0,
  x: 10,
  top: 10,
  width: 40,
  height: 15,
  ocrOriginalX: 10,
  ocrOriginalTop: 10,
  ocrOriginalWidth: 40,
  ocrOriginalHeight: 15,
} as AddedTextBox;
const line: VectorBlock = {
  id: 'rule',
  kind: 'line',
  x: 0,
  top: 20,
  width: 100,
  height: 0.5,
  points: [
    { x: 0, top: 20 },
    { x: 100, top: 20 },
  ],
  stroke: '#000000',
  fill: 'transparent',
  strokeWidth: 1,
};

test('OCR cover excludes the horizontal divider instead of hiding it', () => {
  const pieces = ocrCoverRects(box, [line], {});
  expect(pieces).toHaveLength(2);
  expect(pieces.every((piece) => piece.top + piece.height <= 9.25 || piece.top >= 10.75)).toBe(true);
  expect(pieces.reduce((area, piece) => area + piece.width * piece.height, 0)).toBeCloseTo(40 * 13.5);
});

test('cover protection follows current vector edits and remains at original text location', () => {
  expect(ocrCoverRects({ ...box, x: 200, top: 200 }, [line], {})).toEqual(ocrCoverRects(box, [line], {}));
  expect(ocrCoverRects(box, [line], { '0:rule': { deleted: true } })).toHaveLength(1);
  expect(ocrCoverRects(box, [line], { '0:rule': { top: 50 } })).toHaveLength(1);
});

test('intersecting rules and rectangle borders leave no overlapping cover pieces', () => {
  const border: VectorBlock = {
    id: 'border',
    kind: 'rectangle',
    x: 30,
    top: 20,
    width: 40,
    height: 30,
    stroke: '#000000',
    strokeWidth: 1,
    fill: '#ffffff',
  };
  const pieces = ocrCoverRects(box, [line, border], {});
  for (const piece of pieces) {
    expect(piece.top + piece.height <= 9.25 || piece.top >= 10.75).toBe(true);
    if (piece.top >= 10.75) expect(piece.x + piece.width <= 19.25 || piece.x >= 20.75).toBe(true);
  }
});
