import type { SelectedElementRef, TextBlock } from '../types';

export function parseDelimitedText(source: string) {
  const text = source.replace(/^\uFEFF/, '').trim();
  if (!text) return [] as string[][];
  const firstLine = text.split(/\r?\n/, 1)[0];
  const delimiter = firstLine.includes('\t')
    ? '\t'
    : (firstLine.match(/;/g)?.length || 0) > (firstLine.match(/,/g)?.length || 0)
      ? ';'
      : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else cell += character;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export const selectedElementKey = (item: SelectedElementRef) => `${item.page}:${item.kind}:${item.id}`;

export function wrapTextForWidth(text: string, maxWidth: number, measure: (value: string) => number) {
  const lines: Array<{ text: string; paragraphEnd: boolean }> = [];
  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push({ text: '', paragraphEnd: true });
      continue;
    }
    let current = words[0];
    for (const word of words.slice(1)) {
      const candidate = `${current} ${word}`;
      if (measure(candidate) <= maxWidth) current = candidate;
      else {
        lines.push({ text: current, paragraphEnd: false });
        current = word;
      }
    }
    lines.push({ text: current, paragraphEnd: true });
  }
  return lines;
}

export function mergeSplitCharacterBlocks(blocks: TextBlock[]) {
  const runs: Array<{ block: TextBlock; characterRun: boolean }> = [];
  const measureContext = document.createElement('canvas').getContext('2d');
  const characterCount = (value: string) => Array.from(value).length;
  for (const block of blocks) {
    const previous = runs[runs.length - 1];
    if (!previous) {
      runs.push({ block, characterRun: false });
      continue;
    }
    const prior = previous.block;
    const gap = block.x - (prior.x + prior.width);
    const sameBaseline = Math.abs(block.baseline - prior.baseline) <= Math.max(1, prior.fontSize * 0.14);
    const sameStyle =
      block.sourceFont === prior.sourceFont &&
      block.bold === prior.bold &&
      block.italic === prior.italic &&
      Math.abs(block.fontSize - prior.fontSize) <= 0.35;
    const nextIsCharacter = characterCount(block.str) === 1;
    const startsCharacterRun = characterCount(prior.str) === 1 && nextIsCharacter;
    const continuesCharacterRun = previous.characterRun && nextIsCharacter;
    const adjacent = gap >= -prior.fontSize * 0.3 && gap <= prior.fontSize * 1.2;
    const numericFragment = (value: string) => /^[\d.,'’()+\-/$€£¥%]+$/.test(value.trim());
    const continuesFormattedNumber =
      numericFragment(prior.str) &&
      numericFragment(block.str) &&
      /\d/.test(`${prior.str}${block.str}`) &&
      gap <= prior.fontSize * 0.45;
    if (
      !sameBaseline ||
      !sameStyle ||
      !adjacent ||
      (!startsCharacterRun && !continuesCharacterRun && !continuesFormattedNumber)
    ) {
      runs.push({ block, characterRun: false });
      continue;
    }
    const inferredSpace = !continuesFormattedNumber && gap > prior.fontSize * 0.16 ? ' ' : '';
    const str = `${prior.str}${inferredSpace}${block.str}`;
    const right = Math.max(prior.x + prior.width, block.x + block.width);
    const merged: TextBlock = {
      ...prior,
      str,
      top: Math.min(prior.top, block.top),
      width: Math.max(4, right - prior.x),
      height: Math.max(prior.height, block.height),
    };
    if (measureContext) {
      measureContext.font = `${merged.italic ? 'italic ' : ''}${merged.bold ? '700 ' : '400 '}${merged.fontSize}px ${merged.cssFont}`;
      const measured = measureContext.measureText(str).width;
      if (measured > 0) merged.horizontalScale = Math.max(0.1, Math.min(10, merged.width / measured));
    }
    runs[runs.length - 1] = {
      block: merged,
      characterRun: previous.characterRun || startsCharacterRun || continuesFormattedNumber,
    };
  }
  return runs.map((run) => run.block);
}

export function blockKey(page: number, block: number) {
  return `${page}:${block}`;
}
