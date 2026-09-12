import type { PageInfo, TextBlock } from '../types';

export const embeddedBrowserFontFamilies = new Map<string, string>();

export function closestStandardFont(name = '') {
  if (/sans|arial|helvetica|roboto|inter|calibri|verdana|trebuchet|tahoma/i.test(name)) return 'Helvetica';
  if (/times|serif|cambria|georgia|garamond|baskerville|palatino/i.test(name)) return 'Times Roman';
  if (/courier|mono|consolas|code/i.test(name)) return 'Courier';
  return 'Helvetica';
}

export function fontFamilyIdentity(name = '') {
  return cleanPdfFontName(name)
    .toLowerCase()
    .replace(
      /\b(?:thin|extra\s*light|light|medium|semi\s*bold|demi|bold|extra\s*bold|black|italic|oblique|regular|roman|book)\b/g,
      '',
    )
    .replace(/[^a-z0-9]+/g, '');
}

export function editableBlockFont(block: TextBlock) {
  return isSupportedTypeface(block.sourceFont) ? block.font : block.sourceFont;
}

export function browserFontFamily(font: string) {
  const embeddedFamily = embeddedBrowserFontFamilies.get(font);
  if (embeddedFamily) return embeddedFamily;
  if (font === 'Times Roman') return '"Times New Roman", Times, serif';
  if (font === 'Cambria') return 'Cambria, Georgia, "Times New Roman", serif';
  if (font === 'Georgia') return 'Georgia, "Times New Roman", serif';
  if (font === 'Garamond') return 'Garamond, Georgia, "Times New Roman", serif';
  if (font === 'Palatino') return 'Palatino, "Palatino Linotype", Georgia, serif';
  if (font === 'Courier') return '"Courier New", Courier, monospace';
  if (font === 'Consolas') return 'Consolas, "Courier New", monospace';
  if (font === 'Verdana') return 'Verdana, Arial, sans-serif';
  if (font === 'Trebuchet MS') return '"Trebuchet MS", Arial, sans-serif';
  if (font === 'Tahoma') return 'Tahoma, Arial, sans-serif';
  if (font === 'Calibri') return 'Calibri, Arial, Helvetica, sans-serif';
  if (font === 'Helvetica' || font === 'Arial') return 'Arial, Helvetica, sans-serif';
  return `"${font.replace(/"/g, '')}", Arial, Helvetica, sans-serif`;
}

export function cleanPdfFontName(name = '') {
  const firstName = name
    .split(',')[0]
    .trim()
    .replace(/^['"]|['"]$/g, '');
  return (
    firstName
      .replace(/^[A-Z]{6}\+/, '')
      .replace(/(?:PSMT|MT)$/i, '')
      .replace(
        /[-_](?:regular|roman|book|bold|semibold|demi|black|italic|oblique|bolditalic|boldoblique)$/i,
        '',
      )
      .replace(/[-_]+/g, ' ')
      .trim() || 'Unknown font'
  );
}

export function isSupportedTypeface(name: string) {
  return /sans|serif|mono|helvetica|arial|verdana|trebuchet|tahoma|times|georgia|garamond|palatino|courier|consolas/i.test(
    name,
  );
}

export function isFontInstalled(name: string) {
  if (typeof document === 'undefined' || name === 'Unknown font') return false;
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return false;
  const sample = 'mmmmmmmmmmWWWWWW1234567890';
  return ['monospace', 'serif', 'sans-serif'].some((fallback) => {
    context.font = `72px ${fallback}`;
    const baseline = context.measureText(sample).width;
    context.font = `72px "${name.replace(/"/g, '')}", ${fallback}`;
    return Math.abs(context.measureText(sample).width - baseline) > 0.1;
  });
}

export function collectFontWarnings(pageList: PageInfo[]) {
  const names = new Set(
    pageList
      .flatMap((page) => page.blocks.map((block) => block.sourceFont))
      .filter((name) => !isSupportedTypeface(name)),
  );
  return [...names]
    .sort()
    .map((name) => ({ name, fallback: closestStandardFont(name), installed: isFontInstalled(name) }));
}
