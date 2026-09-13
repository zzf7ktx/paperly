type Bounds = { x0: number; y0: number; x1: number; y1: number };
type Word = {
  text: string;
  bbox: Bounds;
  font_name?: string;
  confidence?: number;
  symbols?: { text: string; bbox: Bounds }[];
};
type Line = { text: string; bbox: Bounds; words?: Word[]; layoutBBox?: Bounds; confidence?: number };
export type OcrWordAppearance = { color: string; bold: boolean; italic: boolean };

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

// Compare like glyphs: capitals and ascenders have different heights from x-height letters.
function glyphSize(word: Word) {
  const sizes = (word.symbols || []).flatMap((symbol) => {
    const height = symbol.bbox.y1 - symbol.bbox.y0;
    if (height <= 0) return [];
    if (/^[A-Z0-9bdfhiklt]$/.test(symbol.text)) return [height];
    if (/^[acemnorsuvwxz]$/.test(symbol.text)) return [height / 0.72];
    return [];
  });
  return median(sizes) || word.bbox.y1 - word.bbox.y0;
}

/** Split a Tesseract row into independently positioned text runs. */
export function splitOcrLine<T extends Line>(
  line: T,
  appearance?: (word: Word) => OcrWordAppearance,
): (T & Line)[] {
  const words = line.words;
  // Keep the original recognition if word geometry is incomplete.
  if (!words || words.length < 2 || words.some((word) => !word.bbox || !word.text?.trim())) return [line];
  const sizes = words.map(glyphSize);
  const gaps = words.slice(1).map((word, index) => word.bbox.x0 - words[index].bbox.x1);
  const normalGaps = gaps.filter(
    (gap, index) => gap > 0 && gap < Math.min(sizes[index], sizes[index + 1]) * 0.7,
  );
  const normalSpace = median(normalGaps);
  const appearances = appearance ? words.map(appearance) : [];
  const groups: Word[][] = [[words[0]]];
  for (let index = 1; index < words.length; index++) {
    const previous = words[index - 1];
    const word = words[index];
    const smallerSize = Math.max(1, Math.min(sizes[index - 1], sizes[index]));
    const gap = gaps[index - 1];
    const largeGap = gap > Math.max(smallerSize * 0.85, normalSpace * 2.8);
    const differentSize =
      /[a-z0-9]/i.test(previous.text) &&
      /[a-z0-9]/i.test(word.text) &&
      Math.max(sizes[index - 1], sizes[index]) / smallerSize > 1.5;
    const differentFont = previous.font_name && word.font_name && previous.font_name !== word.font_name;
    const before = appearances[index - 1];
    const after = appearances[index];
    let differentAppearance = false;
    if (before && after) {
      const channels = (color: string) =>
        [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16));
      const first = channels(before.color);
      const second = channels(after.color);
      const colorDistance = Math.hypot(...first.map((value, channel) => value - second[channel]));
      // Glyph shape alone can make a word such as "your" look lighter or slanted.
      // Require agreement across two words on each side of a pixel-style boundary.
      const enoughLetters = (value: Word) => (value.text.match(/[a-z]/gi) || []).length >= 4;
      const sameStyle = (first: OcrWordAppearance, second?: OcrWordAppearance) =>
        second && first.bold === second.bold && first.italic === second.italic;
      const stableStyleChange =
        index >= 2 &&
        index + 1 < words.length &&
        enoughLetters(words[index - 2]) &&
        enoughLetters(words[index + 1]) &&
        sameStyle(before, appearances[index - 2]) &&
        sameStyle(after, appearances[index + 1]);
      differentAppearance =
        colorDistance > 65 ||
        Boolean(
          enoughLetters(previous) &&
          enoughLetters(word) &&
          stableStyleChange &&
          (before.bold !== after.bold || before.italic !== after.italic),
        );
    }
    if (largeGap || differentSize || differentFont || differentAppearance) groups.push([]);
    groups[groups.length - 1].push(word);
  }
  if (groups.length === 1) return [line];
  return groups.map((group) => {
    const bbox = {
      x0: Math.min(...group.map((word) => word.bbox.x0)),
      y0: Math.min(...group.map((word) => word.bbox.y0)),
      x1: Math.max(...group.map((word) => word.bbox.x1)),
      y1: Math.max(...group.map((word) => word.bbox.y1)),
    };
    return {
      ...line,
      words: group,
      text: group.map((word) => word.text.trim()).join(' '),
      bbox,
      // A fragment must not inherit alignment across unrelated columns.
      layoutBBox: bbox,
    };
  });
}
