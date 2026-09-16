import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

async function changeTheme(page: Page, current: 'system' | 'light' | 'dark') {
  await page.getByRole('button', { name: 'More application options' }).click();
  await page.getByRole('button', { name: `Theme: ${current}. Click to change.` }).click();
}

test('creates a new blank PDF with the selected page setup', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New PDF' }).click();
  const dialog = page.getByRole('dialog', { name: 'New PDF' });
  await dialog.getByLabel('Page size').selectOption('letter');
  await dialog.getByLabel('Orientation').selectOption('landscape');
  await dialog.getByLabel('Pages').fill('3');
  await dialog.getByRole('button', { name: 'Create PDF' }).click();
  await expect(page.locator('.document-tab.active')).toContainText('Untitled');
  await expect(page.getByRole('button', { name: /^Open page \d+$/ })).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Add blank page' })).toBeEnabled();
  await page.locator('.toolbar-popover > summary').filter({ hasText: 'View' }).click();
  await page.getByRole('button').filter({ hasText: 'Tabs in title bar' }).click();
  await page.getByRole('button', { name: 'Collapse properties panel' }).click();
  const toolbarLayout = await page.locator('.header-actions').evaluate((toolbar) => {
    const bounds = toolbar.getBoundingClientRect();
    const children = Array.from(toolbar.children).map((child) => {
      const item = child.getBoundingClientRect();
      return { left: item.left, right: item.right, className: child.className };
    });
    return { left: bounds.left, right: bounds.right, viewport: window.innerWidth, children };
  });
  expect(toolbarLayout.left).toBeGreaterThanOrEqual(0);
  expect(toolbarLayout.right).toBeLessThanOrEqual(toolbarLayout.viewport);
  expect(toolbarLayout.children.every((item) => item.left >= 0 && item.right <= toolbarLayout.viewport)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'More new and open options' }).click();
  const menuIsOnTop = await page.locator('.header-file-menu').evaluate((menu) => {
    const bounds = menu.getBoundingClientRect();
    return menu.contains(
      document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2),
    );
  });
  expect(menuIsOnTop).toBe(true);
});

test('creates a custom-size PDF and resizes its current page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New PDF' }).click();
  const newPdf = page.getByRole('dialog', { name: 'New PDF' });
  await newPdf.getByLabel('Page size').selectOption('custom');
  await newPdf.getByLabel('Unit').selectOption('in');
  await newPdf.getByLabel('Width').fill('4');
  await newPdf.getByLabel('Height').fill('2');
  await newPdf.getByRole('button', { name: 'Create PDF' }).click();

  const livePage = page.locator('.live-page');
  await expect(livePage).toHaveCSS('width', '288px');
  await expect(livePage).toHaveCSS('height', '144px');

  await page.getByLabel('Import pages').click();
  await page.getByRole('button', { name: 'Resize current page' }).click();
  const resize = page.getByRole('dialog', { name: 'Resize page 1' });
  await resize.getByLabel('Unit').selectOption('in');
  await expect(resize.getByLabel('Page width')).toHaveValue('4');
  await expect(resize.getByLabel('Page height')).toHaveValue('2');
  await resize.getByLabel('Page width').fill('5');
  await resize.getByLabel('Page height').fill('3');
  await resize.getByRole('button', { name: 'Resize page' }).click();

  await expect(page.locator('.loading-overlay')).toBeHidden({ timeout: 60_000 });
  await expect(livePage).toHaveCSS('width', '360px');
  await expect(livePage).toHaveCSS('height', '216px');
});

test('custom palette stays above the picker and persists saved colors', async ({ page }, testInfo) => {
  const pdf = await PDFDocument.create();
  pdf.addPage().drawText('Palette sample');
  const buffer = Buffer.from(await pdf.save());
  const openDocument = async () => {
    await page
      .locator('input[type="file"][accept="application/pdf,.pdf"]')
      .setInputFiles({ name: 'palette.pdf', mimeType: 'application/pdf', buffer });
    await page.locator('.text-layer [contenteditable="true"]').filter({ hasText: 'Palette sample' }).click();
    await page.locator('.property-tabs').getByRole('button', { name: 'Style', exact: true }).click();
  };
  await page.goto('/');
  await openDocument();
  const control = page.locator('.paperly-color-control').first();
  const palette = control.getByRole('group', { name: 'Custom color palette' });
  await control.getByRole('button', { name: 'Text color', exact: true }).click();
  const picker = page.getByRole('dialog', { name: 'Color picker' });
  await expect(picker.locator('.paperly-color-swatches button')).toHaveCount(12);
  await picker.getByRole('textbox', { name: 'Hex color' }).fill('123ABC');
  await page.keyboard.press('Escape');
  await palette.getByRole('button', { name: 'Save current color to palette' }).click();
  await expect(palette.getByRole('button', { name: 'Use custom color #123abc' })).toBeVisible();
  const positions = await palette
    .locator(':scope > *')
    .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().y));
  expect(new Set(positions).size).toBe(1);
  const bounds = await palette.boundingBox();
  const row = await control.locator('.color-row').boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThan(row!.y);
  await page.reload();
  await openDocument();
  await palette.getByRole('button', { name: 'Use custom color #123abc' }).click();
  await expect(control.locator('code')).toHaveText('#123abc');
  await control.screenshot({ path: testInfo.outputPath('custom-palette.png') });
  const savedSwatch = palette.getByRole('button', { name: 'Use custom color #123abc' });
  await expect(savedSwatch).toHaveCSS('background-color', 'rgb(18, 58, 188)');
  await changeTheme(page, 'system');
  await changeTheme(page, 'light');
  await expect(savedSwatch).toHaveCSS('background-color', 'rgb(18, 58, 188)');
  await control.screenshot({ path: testInfo.outputPath('custom-palette-dark.png') });
  await control.getByRole('button', { name: 'Text color', exact: true }).click();
  await expect(picker.locator('.paperly-color-swatches button')).toHaveCount(12);
});

test('demo, theme preference, and panel controls work', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('article', { name: 'Example PDF preview' })).toBeVisible();
  await changeTheme(page, 'system');
  await page.reload();
  await page.getByRole('button', { name: 'More application options' }).click();
  await expect(page.getByRole('button', { name: 'Theme: light. Click to change.' })).toBeVisible();
  await page.getByRole('button', { name: 'More application options' }).click();
  await page.getByRole('button', { name: 'Collapse pages panel' }).click();
  await expect(page.getByRole('button', { name: 'Expand pages panel' })).toBeVisible();
  await page.getByRole('button', { name: 'Expand pages panel' }).click();
  expect(errors).toEqual([]);
});

test('edit, undo, redo, fill forms, switch documents, and export a readable PDF', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const first = pdf.addPage([612, 792]);
  first.drawText('Original agreement', { x: 60, y: 700, size: 18, font });
  const field = pdf.getForm().createTextField('Customer name');
  field.setText('Original customer');
  field.addToPage(first, { x: 60, y: 590, width: 240, height: 30 });
  pdf.addPage([612, 792]).drawText('Second page', { x: 60, y: 700, size: 18, font });
  const buffer = Buffer.from(await pdf.save());
  await page.goto('/');
  const upload = page.locator('input[type="file"][accept="application/pdf,.pdf"]');
  await upload.setInputFiles({ name: 'agreement.pdf', mimeType: 'application/pdf', buffer });
  const text = page.locator('.text-layer [contenteditable="true"]').filter({ hasText: 'Original agreement' });
  await expect(text).toBeVisible();
  await text.fill('Updated agreement');
  // Existing text commits when focus leaves the contenteditable field.
  await page.keyboard.press('Tab');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.text-layer')).toContainText('Original agreement');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(page.locator('.text-layer')).toContainText('Updated agreement');
  await page.getByRole('textbox', { name: 'Customer name', exact: true }).fill('Ada Lovelace');
  await page.getByRole('button', { name: 'Open page 2', exact: true }).click();
  await expect(page.locator('.text-layer')).toContainText('Second page');
  await page.getByRole('button', { name: 'Open page 1', exact: true }).click();
  await expect(page.locator('.text-layer')).toContainText('Updated agreement');
  await upload.setInputFiles({ name: 'other.pdf', mimeType: 'application/pdf', buffer });
  await expect(page.locator('.document-tab')).toHaveCount(2);
  await page.locator('.document-tab-select').filter({ hasText: 'agreement' }).click();
  await expect(page.locator('.text-layer')).toContainText('Updated agreement');
  await expect(page.getByRole('textbox', { name: 'Customer name', exact: true })).toHaveValue('Ada Lovelace');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export PDF', exact: true }).click();
  const download = await downloadPromise;
  const exportedPath = testInfo.outputPath('agreement-edited.pdf');
  await download.saveAs(exportedPath);
  const exported = await PDFDocument.load(await readFile(exportedPath));
  expect(exported.getPageCount()).toBe(2);
  expect(exported.getForm().getTextField('Customer name').getText()).toBe('Ada Lovelace');
  await upload.setInputFiles(exportedPath);
  await expect(page.locator('.text-layer')).toContainText('Updated agreement');
  expect(errors).toEqual([]);
});

test('selective removal deletes original text while preserving neighboring PDF text', async ({ page }, testInfo) => {
  const pdf = await PDFDocument.create();
  const sheet = pdf.addPage([612, 792]);
  sheet.drawText('Delete this line', { x: 60, y: 700, size: 18 });
  sheet.drawText('Keep this line', { x: 60, y: 650, size: 18 });
  const field = pdf.getForm().createTextField('Unchanged field');
  field.setText('Still editable');
  field.addToPage(sheet, { x: 60, y: 570, width: 200, height: 25 });
  const removedField = pdf.getForm().createTextField('Removed field');
  removedField.setText('Gone');
  removedField.addToPage(sheet, { x: 60, y: 520, width: 200, height: 25 });
  await page.goto('/');
  await page.locator('input[type="file"][accept="application/pdf,.pdf"]').setInputFiles({
    name: 'selective.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await pdf.save()),
  });
  await page.locator('.toolbar-popover > summary').filter({ hasText: 'View' }).click();
  await page.getByRole('button').filter({ hasText: 'Remove original content on export' }).click();
  await expect(page.getByRole('button').filter({ hasText: 'Remove original content on export' })).toContainText('On');
  await page.reload();
  await page.locator('.toolbar-popover > summary').filter({ hasText: 'View' }).click();
  await expect(page.getByRole('button').filter({ hasText: 'Remove original content on export' })).toContainText('On');
  await page.locator('input[type="file"][accept="application/pdf,.pdf"]').setInputFiles({
    name: 'selective.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await pdf.save()),
  });
  const text = page.locator('.text-layer [contenteditable="true"]').filter({ hasText: 'Delete this line' });
  await expect(text).toBeVisible();
  await text.click();
  await page.keyboard.press('Delete');
  await page.locator('.text-layer [contenteditable="true"]').filter({ hasText: 'Keep this line' }).click();
  await page.locator('.property-tabs').getByRole('button', { name: 'Layout', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Existing text horizontal position' }).fill('220');
  await page.getByRole('textbox', { name: 'Removed field', exact: true }).click();
  await page.getByRole('button', { name: 'Remove form field', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export PDF', exact: true }).click();
  const download = await downloadPromise;
  const exportedPath = testInfo.outputPath('selective-deleted.pdf');
  await download.saveAs(exportedPath);
  const exported = await PDFDocument.load(await readFile(exportedPath));
  expect(exported.getForm().getTextField('Unchanged field').getText()).toBe('Still editable');
  expect(exported.getForm().getFieldMaybe('Removed field')).toBeUndefined();
  await page.locator('input[type="file"][accept="application/pdf,.pdf"]').setInputFiles(exportedPath);
  await expect(page.locator('.text-layer')).not.toContainText('Delete this line');
  await expect(page.locator('.text-layer')).toContainText('Keep this line');
  await expect(page.locator('.text-layer [contenteditable="true"]').filter({ hasText: 'Keep this line' })).toHaveCount(1);
  await expect(page.getByRole('textbox', { name: 'Unchanged field', exact: true })).toHaveValue('Still editable');
});

test('selective removal deletes an original image without flattening page text', async ({ page }, testInfo) => {
  const pdf = await PDFDocument.create();
  const sheet = pdf.addPage([612, 792]);
  sheet.drawText('Native text survives', { x: 60, y: 700, size: 18 });
  const image = await pdf.embedPng(await readFile('public/og.png'));
  sheet.drawImage(image, { x: 60, y: 520, width: 160, height: 90 });
  await page.goto('/');
  await page.locator('input[type="file"][accept="application/pdf,.pdf"]').setInputFiles({
    name: 'image.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await pdf.save()),
  });
  await page.locator('.toolbar-popover > summary').filter({ hasText: 'View' }).click();
  await page.getByRole('button').filter({ hasText: 'Remove original content on export' }).click();
  await page.locator('.pdf-image-box.existing').click();
  await page.getByRole('button', { name: 'Delete existing image', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export PDF', exact: true }).click();
  const download = await downloadPromise;
  const exportedPath = testInfo.outputPath('image-selectively-deleted.pdf');
  await download.saveAs(exportedPath);
  await page.locator('input[type="file"][accept="application/pdf,.pdf"]').setInputFiles(exportedPath);
  await expect(page.locator('.text-layer')).toContainText('Native text survives');
  await expect(page.locator('.pdf-image-box.existing')).toHaveCount(0);
});

test('deleting a corner shape keeps its cleanup cover inside the page', async ({ page }) => {
  const pdf = await PDFDocument.create();
  const sheet = pdf.addPage([300, 200]);
  sheet.drawRectangle({ x: 0, y: 165, width: 40, height: 35, color: rgb(0.8, 0.2, 0.2) });
  sheet.drawRectangle({ x: 260, y: 0, width: 40, height: 35, color: rgb(0.2, 0.6, 0.3) });
  await page.goto('/');
  await page.locator('input[type="file"][accept="application/pdf,.pdf"]').setInputFiles({
    name: 'corner.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await pdf.save()),
  });
  await page.locator('.draw-popover > summary').click();
  await page.getByRole('button').filter({ hasText: 'Select PDF shapes' }).click();
  await page.locator('.draw-popover > summary').click();
  for (let index = 0; index < 2; index++) {
    await page.locator('.vector-layer .editable-vector').first().click();
    await page.keyboard.press('Delete');
  }
  const covers = page.locator('.vector-layer > rect');
  await expect(covers).toHaveCount(2);
  const bounds = await covers.evaluateAll((shapes: SVGRectElement[]) => shapes.map((shape) => ({
    x: shape.x.baseVal.value,
    y: shape.y.baseVal.value,
    right: shape.x.baseVal.value + shape.width.baseVal.value,
    bottom: shape.y.baseVal.value + shape.height.baseVal.value,
  })));
  for (const cover of bounds) {
    expect(cover.x).toBeGreaterThanOrEqual(0);
    expect(cover.y).toBeGreaterThanOrEqual(0);
    expect(cover.right).toBeLessThanOrEqual(300);
    expect(cover.bottom).toBeLessThanOrEqual(200);
  }
});

test('a deleted shape loses its blue cover when the background moves or shrinks', async ({ page }) => {
  const pdf = await PDFDocument.create();
  const sheet = pdf.addPage([300, 200]);
  sheet.drawRectangle({ x: 20, y: 50, width: 230, height: 110, color: rgb(0.1, 0.3, 0.8) });
  sheet.drawRectangle({ x: 150, y: 80, width: 40, height: 30, color: rgb(0.8, 0.2, 0.2) });
  await page.goto('/');
  await page.locator('input[type="file"][accept="application/pdf,.pdf"]').setInputFiles({
    name: 'blue-background.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await pdf.save()),
  });
  await page.locator('.draw-popover > summary').click();
  await page.getByRole('button').filter({ hasText: 'Select PDF shapes' }).click();
  await page.locator('.draw-popover > summary').click();
  await page.locator('.vector-layer .editable-vector').nth(1).click();
  await page.getByRole('button', { name: 'Delete shape', exact: true }).click();
  const foregroundCover = page.locator('.vector-layer > rect').first();
  await expect(foregroundCover).toHaveAttribute('fill', '#1a4ccc');
  await page.locator('.vector-layer .editable-vector').click();
  await page.getByRole('spinbutton', { name: 'Shape horizontal position' }).fill('260');
  await expect(foregroundCover).toHaveAttribute('fill', '#ffffff');
  await page.getByRole('spinbutton', { name: 'Shape horizontal position' }).fill('20');
  await page.getByRole('spinbutton', { name: 'Shape width' }).fill('60');
  await expect(foregroundCover).toHaveAttribute('fill', '#ffffff');
});

test('the themed color picker supports swatches, HEX, RGB, and keyboard controls', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.locator('.draw-popover > summary').click();
  const trigger = page.getByRole('button', { name: 'Fill color', exact: true });
  await trigger.click();
  const picker = page.getByRole('dialog', { name: 'Color picker' });
  await expect(picker).toBeVisible();
  await expect(page.locator('input[type="color"]')).toHaveCount(0);
  await picker.getByRole('button', { name: 'Use #ff765f', exact: true }).click();
  await expect(picker.getByRole('textbox', { name: 'Hex color' })).toHaveValue('FF765F');
  await picker.getByRole('textbox', { name: 'Hex color' }).fill('286D5B');
  await expect(picker.getByRole('spinbutton', { name: 'Red', exact: true })).toHaveValue('40');
  await page.keyboard.press('Enter');
  await picker.getByRole('spinbutton', { name: 'Red', exact: true }).fill('80');
  await expect(picker.getByRole('textbox', { name: 'Hex color' })).toHaveValue('506D5B');
  await picker.getByRole('textbox', { name: 'Hex color' }).fill('oops');
  await page.keyboard.press('Enter');
  await expect(picker.getByRole('textbox', { name: 'Hex color' })).toHaveValue('506D5B');
  const spectrum = picker.getByRole('slider', { name: 'Saturation and brightness' });
  await spectrum.focus();
  await page.keyboard.press('ArrowUp');
  await expect(picker.getByRole('textbox', { name: 'Hex color' })).not.toHaveValue('506D5B');
  await spectrum.click({ position: { x: 120, y: 28 } });
  const rgbValues = await Promise.all(
    ['Red', 'Green', 'Blue'].map((name) =>
      picker.getByRole('spinbutton', { name, exact: true }).inputValue(),
    ),
  );
  expect(Math.max(...rgbValues.map(Number))).toBeGreaterThan(180);
  expect(Math.max(...rgbValues.map(Number))).toBeLessThan(200);
  await page.keyboard.press('Escape');
  await expect(picker).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.screenshot({ path: testInfo.outputPath('color-picker-light.png') });
  await page.keyboard.press('Escape');
  // System -> light -> dark.
  await changeTheme(page, 'system');
  await changeTheme(page, 'light');
  await trigger.click();
  await expect(picker).toHaveClass(/paperly-color-dark/);
  await page.screenshot({ path: testInfo.outputPath('color-picker-dark.png') });
  await picker.screenshot({ path: testInfo.outputPath('color-picker-detail.png') });
  const bounds = await picker.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(1000);
  await page.locator('.brand').click();
  await expect(picker).toHaveCount(0);
  expect(errors).toEqual([]);
});
