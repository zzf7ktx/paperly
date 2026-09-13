import { expect, test } from '@playwright/test';
import { splitOcrLine } from '../features/pdf-editor/lib/ocr-layout';
import statementLines from './fixtures/statement-ocr-lines.json' with { type: 'json' };

test('keeps actual statement sentences together for full-page and region OCR', () => {
  expect(statementLines).toHaveLength(4);
  for (const original of statementLines) {
    expect(splitOcrLine(original).map((run) => run.text)).toEqual([original.text]);
  }
});

const word = (text: string, x0: number, width: number, height = 20, font_name = '') => ({
  text,
  bbox: { x0, y0: 40 - height, x1: x0 + width, y1: 40 },
  font_name,
});
const line = (words: ReturnType<typeof word>[]) => ({
  text: words.map((item) => item.text).join(' '),
  words,
  bbox: { x0: words[0].bbox.x0, y0: 0, x1: words.at(-1)!.bbox.x1, y1: 40 },
});

test('separates statement columns without splitting the label', () => {
  const result = splitOcrLine(
    line([
      word('Beginning', 10, 85),
      word('balance', 101, 65),
      word('$69.96', 300, 60),
      word('Average', 460, 70),
      word('balance', 536, 65),
    ]),
  );
  expect(result.map((run) => run.text)).toEqual(['Beginning balance', '$69.96', 'Average balance']);
  expect(result[1].bbox.x0).toBe(300);
  expect(result[1].layoutBBox).toEqual(result[1].bbox);
});

test('preserves ordinary word spacing and original line text', () => {
  const original = line([word('Please', 0, 55), word('continue', 62, 80), word('enrollment.', 148, 100)]);
  expect(splitOcrLine(original)).toEqual([original]);
});

test('splits adjacent text with different size or font', () => {
  expect(splitOcrLine(line([word('Heading', 0, 100, 30), word('details', 108, 65, 15)]))).toHaveLength(2);
  expect(
    splitOcrLine(line([word('Total', 0, 50, 20, 'Arial-Bold'), word('amount', 56, 65, 20, 'Arial')])),
  ).toHaveLength(2);
});

test('splits color and style changes at normal spacing', () => {
  const original = line([word('Normal', 0, 60), word('accent', 66, 60)]);
  expect(
    splitOcrLine(original, (item) => ({
      color: item.text === 'Normal' ? '#111111' : '#339944',
      bold: false,
      italic: false,
    })),
  ).toHaveLength(2);
  expect(
    splitOcrLine(original, (item) => ({ color: '#111111', bold: item.text === 'accent', italic: false })),
  ).toHaveLength(1);
});

test('keeps your within a sentence despite noisy pixel style estimates', () => {
  const original = line([
    word('Please', 0, 55),
    word('continue', 61, 80),
    word('with', 147, 40),
    word('your', 193, 40),
    word('e-Statement', 239, 110),
    word('enrollment.', 355, 100),
  ]);
  expect(
    splitOcrLine(original, (item) => ({
      color: '#339944',
      bold: item.text !== 'your',
      italic: item.text === 'your',
    })),
  ).toEqual([original]);
});

test('splits sustained pixel style changes', () => {
  const original = line([
    word('Normal', 0, 60),
    word('phrase', 66, 60),
    word('Bold', 132, 40),
    word('phrase', 178, 60),
  ]);
  expect(
    splitOcrLine(original, (item) => ({
      color: '#111111',
      bold: item.bbox.x0 >= 132,
      italic: false,
    })).map((run) => run.text),
  ).toEqual(['Normal phrase', 'Bold phrase']);
});

test('normalizes lowercase glyph height before comparing sizes', () => {
  const words = [word('TOTAL', 0, 60), word('sum', 66, 35, 14.4)].map((item) => ({
    ...item,
    symbols: [...item.text].map((text) => ({ text, bbox: item.bbox })),
  }));
  expect(splitOcrLine(line(words))).toHaveLength(1);
});

test('keeps recognition intact when word data is absent', () => {
  const original = { text: 'Fallback text', bbox: { x0: 0, y0: 0, x1: 100, y1: 20 } };
  expect(splitOcrLine(original)).toEqual([original]);
});
