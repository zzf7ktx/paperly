import type { EditMap, FormEdit, ImageEdit, PageInfo, VectorEdit } from '../types';
import { needsFormCleanup, needsTextCleanup } from '../lib/appearance';

type Context = {
  pages: PageInfo[];
  edits: EditMap;
  formEdits: Record<string, FormEdit>;
  imageEdits: Record<string, ImageEdit>;
  vectorEdits: Record<string, VectorEdit>;
};

export async function removeOriginalContent(bytes: Uint8Array, context: Context): Promise<Uint8Array> {
  const { initWasm, openPdf, applyRedactions, savePdf, freePdf, searchText } = await import('@fabifont/open-redact-pdf');
  type Target = Parameters<typeof applyRedactions>[1]['targets'][number];
  const { pages, edits, formEdits, imageEdits, vectorEdits } = context;
  const targets: Target[] = [];
  let imageTargets = 0;
  for (const [key, edit] of Object.entries(formEdits)) {
    const [pageIndex, ...id] = key.split(':');
    const index = Number(pageIndex);
    const field = pages[index]?.forms.find((item) => item.id === id.join(':'));
    if (field && needsFormCleanup(field, edit))
      targets.push({ kind: 'rect', pageIndex: index, x: field.x, y: pages[index].height - field.top - field.height, width: field.width, height: field.height });
  }
  for (const [key, edit] of Object.entries(imageEdits)) {
    if (!Object.keys(edit).length) continue;
    const separator = key.indexOf(':');
    const pageIndex = Number(key.slice(0, separator));
    const image = pages[pageIndex]?.images.find((item) => item.id === key.slice(separator + 1));
    if (image) {
      targets.push({ kind: 'rect', pageIndex, x: image.x, y: pages[pageIndex].height - image.top - image.height, width: image.width, height: image.height });
      imageTargets++;
    }
  }
  for (const [key, edit] of Object.entries(vectorEdits)) {
    if (!Object.keys(edit).length) continue;
    const separator = key.indexOf(':');
    const pageIndex = Number(key.slice(0, separator));
    const vector = pages[pageIndex]?.vectors.find((item) => item.id === key.slice(separator + 1));
    if (vector && !vector.added)
      targets.push({ kind: 'rect', pageIndex, x: vector.x, y: pages[pageIndex].height - vector.top - vector.height, width: vector.width, height: vector.height });
  }
  const hasTextCleanup = Object.entries(edits).some(([key, edit]) => {
    const [pageIndexText, blockIdText] = key.split(':');
    const block = pages[Number(pageIndexText)]?.blocks.find((item) => item.id === Number(blockIdText));
    return block && needsTextCleanup(block, edit);
  });
  if (!targets.length && !hasTextCleanup) return bytes;
  await initWasm();
  const handle = openPdf(bytes);
  try {
    // A text-layer block is only a visual selection; require a matching native text hit.
    const removedText: Array<{ pageIndex: number; text: string; x: number; top: number; width: number; height: number }> = [];
    for (const [key, edit] of Object.entries(edits)) {
      const [pageIndexText, blockIdText] = key.split(':');
      const pageIndex = Number(pageIndexText);
      const block = pages[pageIndex]?.blocks.find((item) => item.id === Number(blockIdText));
      if (!block || !needsTextCleanup(block, edit) || !block.str.trim()) continue;
      const matches = searchText(handle, pageIndex, block.str.trim());
      const overlapsOriginal = (quad: typeof matches[number]['quads'][number]) => {
        const left = Math.min(...quad.map((point) => point.x));
        const right = Math.max(...quad.map((point) => point.x));
        const top = pages[pageIndex].height - Math.max(...quad.map((point) => point.y));
        const bottom = pages[pageIndex].height - Math.min(...quad.map((point) => point.y));
        return left < block.x + block.width && right > block.x && top < block.top + block.height && bottom > block.top;
      };
      const match = matches.find((candidate) => candidate.quads.some(overlapsOriginal));
      if (!match)
        throw new Error(`Original text could not be located on page ${pageIndex + 1}.`);
      targets.push({ kind: 'quadGroup', pageIndex, quads: match.quads });
      removedText.push({ pageIndex, text: block.str.trim(), x: block.x, top: block.top, width: block.width, height: block.height });
    }
    const report = applyRedactions(handle, { targets, mode: 'erase' });
    if (!report.textGlyphsRemoved && !report.imageDrawsRemoved && !report.pathPaintsRemoved)
      throw new Error('No original PDF content was removed.');
    if (report.imageDrawsRemoved > imageTargets)
      throw new Error('The selected region overlaps another PDF image. Export was stopped.');
    const unexpectedWarnings = report.warnings.filter((warning) =>
      !(imageTargets && /intersecting images were removed at invocation level/.test(warning)),
    );
    if (unexpectedWarnings.length) throw new Error(unexpectedWarnings.join(' '));
    for (const block of removedText) {
      const remains = searchText(handle, block.pageIndex, block.text).some((match) => match.quads.some((quad) => {
        const left = Math.min(...quad.map((point) => point.x));
        const right = Math.max(...quad.map((point) => point.x));
        const top = pages[block.pageIndex].height - Math.max(...quad.map((point) => point.y));
        const bottom = pages[block.pageIndex].height - Math.min(...quad.map((point) => point.y));
        return left < block.x + block.width && right > block.x && top < block.top + block.height && bottom > block.top;
      }));
      if (remains) throw new Error(`Original text is still present on page ${block.pageIndex + 1}.`);
    }
    return savePdf(handle);
  } finally {
    freePdf(handle);
  }
}
