import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { readFile } from 'node:fs/promises';

async function pdfFile(name: string, labels: string[], form = false) {
  const pdf = await PDFDocument.create();
  for (const label of labels) pdf.addPage([500, 700]).drawText(label, { x: 40, y: 620, size: 18 });
  if (form) {
    const field = pdf.getForm().createTextField('Customer'); field.setText('Original customer');
    field.addToPage(pdf.getPage(0), { x: 40, y: 500, width: 200, height: 24 });
  }
  return { name, mimeType: 'application/pdf', buffer: Buffer.from(await pdf.save()) };
}

test('copy edited page to another tab preserves both documents and destination undo', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const upload = page.locator('input[type=file][accept="application/pdf,.pdf"]');
  await upload.setInputFiles(await pdfFile('Source.pdf', ['Source title', 'Source second'], true));
  const sourceText = page.locator('.text-layer [contenteditable=true]').filter({ hasText: 'Source title' });
  await expect(sourceText).toBeVisible({ timeout: 60_000 });
  await sourceText.fill('Edited source title'); await page.keyboard.press('Tab');
  await page.getByRole('textbox', { name: 'Customer', exact: true }).fill('Copied customer'); await page.keyboard.press('Tab');
  await upload.setInputFiles(await pdfFile('Destination.pdf', ['Destination first', 'Destination second']));
  const destinationText = page.locator('.text-layer [contenteditable=true]').filter({ hasText: 'Destination first' });
  await expect(destinationText).toBeVisible({ timeout: 60_000 });
  await destinationText.fill('Edited destination'); await page.keyboard.press('Tab');
  await page.locator('.document-tab-select').filter({ hasText: 'Source' }).click();
  await page.getByRole('button', { name: 'Copy page 1 to tab', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Copy page 1', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Destination tab')).toContainText('Destination');
  await dialog.getByLabel('Insert position').selectOption('0');
  await dialog.screenshot({ path: testInfo.outputPath('copy-dialog-light.png') });
  await dialog.getByRole('button', { name: 'Copy page', exact: true }).click();
  await expect(dialog).not.toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.page-item')).toHaveCount(2);
  await expect(page.locator('.text-layer')).toContainText('Edited source title');
  await page.locator('.document-tab-select').filter({ hasText: 'Destination' }).click();
  await expect(page.locator('.page-item')).toHaveCount(3);
  await expect(page.locator('.text-layer')).toContainText('Edited source title');
  await expect(page.locator('.text-layer')).toContainText('Copied customer');
  await page.getByRole('button', { name: 'Open page 2', exact: true }).click();
  await expect(page.locator('.text-layer')).toContainText('Edited destination');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.page-item')).toHaveCount(2);
  await expect(page.locator('.text-layer')).toContainText('Edited destination');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(page.locator('.page-item')).toHaveCount(3);
  await expect(page.locator('.thumbnail-canvas.is-ready')).toHaveCount(3, { timeout: 60_000 });
  await page.locator('.page-rail').screenshot({ path: testInfo.outputPath('pages-light.png') });
  await page.getByRole('button', { name: 'More application options' }).click();
  await page.getByRole('button', { name: 'Theme: system. Click to change.' }).click();
  await page.getByRole('button', { name: 'More application options' }).click();
  await page.getByRole('button', { name: 'Theme: light. Click to change.' }).click();
  await page.locator('.page-rail').screenshot({ path: testInfo.outputPath('pages-dark.png') });
  await page.getByRole('button', { name: 'Copy page 2 to tab', exact: true }).click();
  await page.getByRole('dialog').screenshot({ path: testInfo.outputPath('copy-dialog-dark.png') });
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export PDF', exact: true }).click();
  const output = testInfo.outputPath('copied.pdf'); await (await downloadPromise).saveAs(output);
  expect((await PDFDocument.load(await readFile(output))).getPageCount()).toBe(3);
  expect(errors).toEqual([]);
});
