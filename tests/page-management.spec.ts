import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import { managePages, remapPageMap, remapPageItems } from '../features/pdf-editor/services/manage-pages';

async function sample(names: string[], form = false) {
  const pdf = await PDFDocument.create();
  names.forEach((name, index) =>
    pdf.addPage([500 + index * 10, 700]).drawText(name, { x: 50, y: 620, size: 18 }),
  );
  if (form) {
    const field = pdf.getForm().createTextField('Customer');
    field.setText('Original');
    field.addToPage(pdf.getPage(0), { x: 50, y: 520, width: 160, height: 24 });
  }
  return pdf.save();
}

test('page operations preserve source order, forms, and page-indexed edits', async () => {
  const original = await sample(['Alpha', 'Bravo'], true);
  const moved = await managePages(original, { kind: 'move', from: 0, to: 1 });
  expect(moved.order).toEqual([1, 0]);
  const result = await PDFDocument.load(moved.bytes);
  expect(result.getPages().map((page) => page.getWidth())).toEqual([510, 500]);
  expect(result.getForm().getTextField('Customer').getText()).toBe('Original');
  expect(remapPageMap({ '0:text:1': 'edited', '1:image': 'crop' }, [1, null, 0])).toEqual({
    '2:text:1': 'edited',
    '0:image': 'crop',
  });
  expect(
    remapPageItems(
      [
        { page: 0, text: 'Keep' },
        { page: 1, text: 'Remove' },
      ],
      [0],
    ),
  ).toEqual([{ page: 0, text: 'Keep' }]);
  const inserted = await managePages(original, {
    kind: 'insert',
    after: 0,
    files: [await sample(['Delta'], true), await sample(['Echo'])],
  });
  expect(inserted.order).toEqual([0, null, null, 1]);
  expect((await PDFDocument.load(inserted.bytes)).getForm().getFields()).toHaveLength(1);
  const removed = await managePages(original, { kind: 'remove', index: 0 });
  expect((await PDFDocument.load(removed.bytes)).getForm().getFields()).toHaveLength(0);
  await expect(managePages(removed.bytes, { kind: 'remove', index: 0 })).rejects.toThrow('at least one page');
});

test('add, remove, move, and combine pages preserve edits through undo and export', async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  await page.goto('/');
  await page
    .locator('input[type=file][accept="application/pdf,.pdf"]')
    .first()
    .setInputFiles({
      name: 'pages.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(await sample(['Alpha', 'Bravo', 'Charlie'], true)),
    });
  const text = page.locator('.text-layer [contenteditable=true]').filter({ hasText: 'Alpha' });
  await expect(text).toBeVisible({ timeout: 60_000 });
  await text.fill('Alpha edited');
  await page.keyboard.press('Tab');
  await page.getByRole('textbox', { name: 'Customer', exact: true }).fill('Updated customer');
  await page.keyboard.press('Tab');
  await page.getByRole('button', { name: 'Move page 1 later', exact: true }).click();
  await expect(page.locator('.loading-overlay')).toHaveCount(0, { timeout: 60_000 });
  await expect(page.locator('.text-layer')).toContainText('Alpha edited');
  await expect(page.getByRole('textbox', { name: 'Customer', exact: true })).toHaveValue('Updated customer');
  await page.getByRole('button', { name: 'Add blank page', exact: true }).click();
  await expect(page.locator('.page-item')).toHaveCount(4, { timeout: 60_000 });
  await page.getByRole('button', { name: 'Remove page 3', exact: true }).click();
  await expect(page.locator('.page-item')).toHaveCount(3, { timeout: 60_000 });
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.page-item')).toHaveCount(4);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(page.locator('.page-item')).toHaveCount(3);
  const choose = async (button: string, names: string[]) => {
    const buffer = Buffer.from(await sample(names));
    await page.locator('.page-import-menu > summary').click();
    const chooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: button, exact: true }).click();
    await (await chooserPromise).setFiles({ name: `${names[0]}.pdf`, mimeType: 'application/pdf', buffer });
  };
  await choose('Insert PDF pages', ['Delta', 'Echo']);
  await expect(page.locator('.page-item')).toHaveCount(5, { timeout: 60_000 });
  await expect(page.locator('.text-layer')).toContainText('Delta');
  await choose('Combine PDFs', ['Foxtrot']);
  await expect(page.locator('.page-item')).toHaveCount(6, { timeout: 60_000 });
  await expect(page.locator('.text-layer')).toContainText('Foxtrot');
  const source = page.locator('.page-item').last();
  await source.scrollIntoViewIfNeeded();
  const start = await source.boundingBox();
  await page.mouse.move(start!.x + start!.width / 2, start!.y + 35);
  await page.mouse.down();
  await page.mouse.move(start!.x + start!.width / 2 + 10, start!.y + 45, { steps: 4 });
  await expect(source).toHaveClass(/is-dragging/);
  await page.locator('.page-rail').evaluate((rail) => {
    rail.scrollTop = 0;
  });
  const target = await page.locator('.page-item').first().boundingBox();
  await page.mouse.move(target!.x + target!.width / 2, target!.y + 35, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.loading-overlay')).toHaveCount(0, { timeout: 60_000 });
  await page.getByRole('button', { name: 'Open page 1', exact: true }).click();
  await expect(page.locator('.text-layer')).toContainText('Foxtrot');
  await page.getByRole('button', { name: 'Open page 3', exact: true }).click();
  await expect(page.locator('.text-layer')).toContainText('Alpha edited');
  await expect(page.getByRole('textbox', { name: 'Customer', exact: true })).toHaveValue('Updated customer');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export PDF', exact: true }).click();
  const path = testInfo.outputPath('combined.pdf');
  await (await downloadPromise).saveAs(path);
  const exported = await PDFDocument.load(await readFile(path));
  expect(exported.getPageCount()).toBe(6);
  expect(exported.getForm().getTextField('Customer').getText()).toBe('Updated customer');
});
