import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { detectScannedShapes } from '../features/pdf-editor/lib/scanned-shapes';

test('reconstructs shaded header and body sharing a divider without duplicate sides', () => {
  const width = 600,
    height = 260;
  const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
  const paint = (x0: number, y0: number, w: number, h: number, value: number) => {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) {
        const offset = (y * width + x) * 4;
        pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = value;
      }
  };
  paint(20, 20, 560, 24, 211);
  paint(20, 20, 560, 2, 35);
  paint(20, 44, 560, 2, 35);
  paint(20, 220, 560, 2, 35);
  paint(20, 20, 2, 202, 35);
  paint(578, 20, 2, 202, 35);
  // Two-pixel scan dropout and ordinary text should not break the table or change its fill.
  paint(180, 20, 2, 2, 255);
  paint(60, 75, 5, 9, 0);
  paint(70, 75, 5, 9, 0);
  const shapes = detectScannedShapes(pixels, width, height, 2, 10, 15, 1);
  expect(shapes).toHaveLength(2);
  expect(shapes.map((shape) => shape.kind)).toEqual(['rectangle', 'rectangle']);
  expect(shapes[0].fill).toBe('#d3d3d3');
  expect(shapes[1].fill).toBe('#ffffff');
  expect(shapes[0].top! + shapes[0].height).toBe(shapes[1].top);
  expect(shapes[1].height).toBeCloseTo(88);
  expect(shapes[0].strokeWidth).toBe(1);
});

test('preserves a standalone rule', () => {
  const pixels = new Uint8ClampedArray(300 * 100 * 4).fill(255);
  for (let x = 20; x < 280; x++) pixels.fill(0, (50 * 300 + x) * 4, (50 * 300 + x) * 4 + 3);
  const shapes = detectScannedShapes(pixels, 300, 100, 1, 0, 0, 2);
  expect(shapes).toHaveLength(1);
  expect(shapes[0].kind).toBe('line');
});

test('recognizes the actual scanned statement table fill and complete body', () => {
  const pixels = new Uint8ClampedArray(
    inflateSync(readFileSync('tests/fixtures/statement-table.rgba.deflate')),
  );
  const shapes = detectScannedShapes(pixels, 1500, 450, 3, 50, 1030 / 3, 3);
  const rectangles = shapes.filter((shape) => shape.kind === 'rectangle' && shape.width > 450);
  expect(rectangles).toHaveLength(2);
  expect(shapes).toHaveLength(2);
  const header = rectangles.find((shape) => shape.height > 10 && shape.height < 25)!;
  const body = rectangles.find((shape) => shape.height > 80)!;
  expect(header).toBeTruthy();
  expect(body).toBeTruthy();
  expect(parseInt(header.fill!.slice(1, 3), 16)).toBeGreaterThan(185);
  expect(parseInt(header.fill!.slice(1, 3), 16)).toBeLessThan(230);
  expect(body.fill).toBe('#ffffff');
  expect(header.top + header.height).toBeCloseTo(body.top, 0);
});
