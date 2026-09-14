import { PDFDocument } from 'pdf-lib';

export type PageOperation =
  | { kind: 'blank'; after: number }
  | { kind: 'resize'; index: number; width: number; height: number }
  | { kind: 'remove'; index: number }
  | { kind: 'move'; from: number; to: number }
  | { kind: 'insert'; after: number; files: Uint8Array[] };

export async function managePages(bytes: Uint8Array, operation: PageOperation) {
  const document = await PDFDocument.load(bytes);
  if (document.getForm().hasXFA())
    throw new Error('Page tools require a standard PDF. Dynamic XFA page structure cannot be changed.');
  const original = document.getPages();
  const order: (number | null)[] = original.map((_, index) => index);
  let selected = 0;
  const valid = (index: number) => Number.isInteger(index) && index >= 0 && index < original.length;
  if (operation.kind === 'remove') {
    if (!valid(operation.index) || original.length <= 1)
      throw new Error('Keep at least one page in the document.');
    const removed = original[operation.index];
    for (const field of document.getForm().getFields()) {
      const widgets = field.acroField.getWidgets();
      if (widgets.length && widgets.every((widget) => widget.P()?.toString() === removed.ref.toString()))
        document.getForm().removeField(field);
    }
    document.removePage(operation.index);
    order.splice(operation.index, 1);
    selected = Math.min(operation.index, order.length - 1);
  } else if (operation.kind === 'resize') {
    if (!valid(operation.index)) throw new Error('Choose a valid page to resize.');
    if (operation.width < 36 || operation.height < 36 || operation.width > 14400 || operation.height > 14400)
      throw new Error('Page dimensions must be between 0.5 and 200 inches.');
    const page = original[operation.index];
    const mediaBox = page.getMediaBox();
    const top = mediaBox.y + mediaBox.height;
    const nextY = top - operation.height;
    page.setMediaBox(mediaBox.x, nextY, operation.width, operation.height);
    page.setCropBox(mediaBox.x, nextY, operation.width, operation.height);
    selected = operation.index;
  } else if (operation.kind === 'move') {
    if (!valid(operation.from) || !valid(operation.to)) throw new Error('Choose a valid page position.');
    const moved = original[operation.from];
    document.removePage(operation.from);
    document.insertPage(operation.to, moved);
    const [index] = order.splice(operation.from, 1);
    order.splice(operation.to, 0, index);
    selected = operation.to;
  } else {
    if (operation.after !== -1 && !valid(operation.after)) throw new Error('Choose a page to insert after.');
    let position = operation.after + 1;
    selected = position;
    if (operation.kind === 'blank') {
      const page = original[Math.max(0, operation.after)];
      document.insertPage(position, [page.getWidth(), page.getHeight()]);
      order.splice(position, 0, null);
    } else {
      if (!operation.files.length) throw new Error('Choose at least one PDF to combine.');
      for (const source of operation.files) {
        const imported = await PDFDocument.load(source);
        if (imported.getForm().hasXFA())
          throw new Error('Dynamic XFA files cannot be combined. Export a standard PDF first.');
        // Copying pages alone drops the source AcroForm tree. Keep imported field appearances visible.
        if (imported.getForm().getFields().length) imported.getForm().flatten();
        for (const page of await document.copyPages(imported, imported.getPageIndices())) {
          document.insertPage(position, page);
          order.splice(position++, 0, null);
        }
      }
    }
  }
  return { bytes: await document.save(), order, selected };
}

export function remapPageMap<T>(values: Record<string, T>, order: (number | null)[]): Record<string, T> {
  const mapping = new Map(order.flatMap((old, next) => (old === null ? [] : [[old, next] as const])));
  return Object.fromEntries(
    Object.entries(values).flatMap(([key, value]) => {
      const separator = key.indexOf(':');
      if (separator < 0) return [[key, value]];
      const next = mapping.get(Number(key.slice(0, separator)));
      return next === undefined ? [] : [[`${next}${key.slice(separator)}`, value]];
    }),
  );
}

export function remapPageItems<T extends { page: number }>(items: T[], order: (number | null)[]): T[] {
  return items.flatMap((item) => {
    const page = order.indexOf(item.page);
    return page < 0 ? [] : [{ ...item, page }];
  });
}
