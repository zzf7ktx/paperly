import { expect, test } from '@playwright/test';
import { detectOcrImages } from '../features/pdf-editor/lib/ocr-images';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';

test('ignores text-sized marks and table rules', () => {
  const width = 400,
    height = 300;
  const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
  const paint = (x0: number, y0: number, w: number, h: number) => {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) {
        const offset = (y * width + x) * 4;
        pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 0;
      }
  };
  paint(20, 20, 6, 10);
  paint(30, 20, 6, 10);
  paint(10, 100, 300, 1);
  paint(10, 200, 300, 1);
  paint(10, 100, 1, 100);
  paint(309, 100, 1, 100);
  expect(detectOcrImages(pixels, width, height, [{ x0: 20, y0: 20, x1: 36, y1: 30 }])).toEqual([]);
});

test('removing the source scan preserves OCR-recognized shapes and logo', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/');
  await page
    .locator('input[type=file][accept="application/pdf,.pdf"]')
    .setInputFiles('tests/fixtures/scanned-statement.pdf');
  await expect(page.locator('.image-layer .existing')).toHaveCount(3, { timeout: 60_000 });
  await page.locator('.ocr-popover > summary').click();
  const layoutToggle = page.getByRole('button', { name: /Recognize layout/ });
  if ((await layoutToggle.textContent())!.includes('Off')) await layoutToggle.click();
  await page.getByText('Recognize full page', { exact: true }).click();
  await expect(page.locator('.added-text-content').filter({ hasText: 'Please continue' })).toBeVisible({
    timeout: 120_000,
  });
  await expect(page.locator('.image-layer .existing')).toHaveCount(4);
  await expect(page.locator('.image-layer .existing img')).toHaveCount(1);
  const nestedOcrText = page
    .locator('.added-text-content')
    .filter({ hasText: 'Please continue' })
    .locator('..');
  await nestedOcrText.click({ modifiers: ['Alt'] });
  await expect(page.locator('.canvas-selection-status')).toHaveText('OCR text');
  await page.waitForTimeout(250);
  await expect(page.locator('.canvas-selection-status')).toHaveText('OCR text');
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  const removeScan = page.getByRole('button', { name: /Remove original scan/ });
  await expect(removeScan).toBeVisible();
  await removeScan.click();
  const sourcePreview = page.getByRole('dialog', { name: 'Preview source scan removal' });
  await expect(sourcePreview).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close preview' })).toBeFocused();
  expect(await sourcePreview.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(
    'rgba(0, 0, 0, 0)',
  );
  await page.keyboard.press('Escape');
  await expect(sourcePreview).toBeHidden();
  await expect(removeScan).toBeFocused();
  await page.getByRole('button', { name: 'Properties', exact: true }).click();
  const largestIndex = await page.locator('.image-layer .existing').evaluateAll(
    (elements) =>
      elements.reduce(
        (best, element, index) => {
          const bounds = element.getBoundingClientRect();
          const area = bounds.width * bounds.height;
          return area > best.area ? { index, area } : best;
        },
        { index: 0, area: 0 },
      ).index,
  );
  await page.locator('.image-layer .existing').nth(largestIndex).dispatchEvent('click');
  await page.keyboard.press('Delete');
  await expect(page.locator('.pdf-image-box.is-deleted')).toHaveCount(1);
  await expect(page.locator('.image-layer .existing img')).toBeVisible();
  await expect(page.locator('.vector-layer')).toHaveClass(/above-image-cleanup/);
  await page.locator('details').filter({ hasText: 'Select PDF shapes' }).locator('summary').click();
  await page.getByRole('button', { name: /Select PDF shapes/ }).click();
  await expect(page.locator('.vector-layer .editable-vector').first()).toBeVisible();
  await expect(page.locator('.ocr-background-cover')).toHaveCount(0);
  const layerOrder = await page.evaluate(() => ({
    shapes: Number(getComputedStyle(document.querySelector('.vector-layer')!).zIndex),
    ocrText: Number(getComputedStyle(document.querySelector('.added-text-layer')!).zIndex),
  }));
  expect(layerOrder.ocrText).toBeGreaterThan(layerOrder.shapes);
});

for (const layout of [false, true]) {
  test(`statement logo is an image only with layout ${layout ? 'enabled' : 'disabled'}`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000);
    await page.goto('/');
    await page
      .locator('input[type=file][accept="application/pdf,.pdf"]')
      .setInputFiles('tests/fixtures/scanned-statement.pdf');
    await expect(page.locator('.image-layer .existing')).toHaveCount(3, { timeout: 60_000 });
    await page.locator('.ocr-popover > summary').click();
    const toggle = page.getByRole('button', { name: /Recognize layout/ });
    if ((await toggle.textContent())!.includes('On') !== layout) await toggle.click();
    await page.getByText('Recognize full page', { exact: true }).click();
    await expect(page.locator('.added-text-content').filter({ hasText: 'Please continue' })).toBeVisible({
      timeout: 120_000,
    });
    await page.locator('.ocr-popover > summary').click();
    if (!layout) {
      await expect(page.locator('.image-layer .existing')).toHaveCount(3);
      await expect(page.locator('.added-text-content').filter({ hasText: 'INTRUST' })).toBeVisible();
      return;
    }
    await expect(page.locator('.image-layer .existing')).toHaveCount(4);
    await expect(page.locator('.added-text-content').filter({ hasText: /INTRUST|Bank\./ })).toHaveCount(0);
    // Header covers must not punch holes through the transaction table divider.
    const overlappingCovers = await page.evaluate(() => {
      const rule = document.querySelector('.vector-layer line')!.getBoundingClientRect();
      return [...document.querySelectorAll('.ocr-background-cover')].filter((cover) => {
        const bounds = cover.getBoundingClientRect();
        return (
          bounds.left < rule.right &&
          bounds.right > rule.left &&
          bounds.top < rule.top &&
          bounds.bottom > rule.top
        );
      }).length;
    });
    expect(overlappingCovers).toBe(0);
    // Undo/redo must remove and restore the recognized image region along with OCR text.
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.locator('.image-layer .existing')).toHaveCount(3);
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    // Drag from the reconstructed table background across text without selecting the shape.
    const firstRow = await page
      .locator('.added-text-content')
      .filter({ hasText: 'Beginning balance on October 10' })
      .boundingBox();
    const secondRow = await page
      .locator('.added-text-content')
      .filter({ hasText: '+ Deposits and other credits' })
      .boundingBox();
    await page.mouse.move(firstRow!.x - 8, firstRow!.y - 3);
    await page.mouse.down();
    await page.mouse.move(secondRow!.x + secondRow!.width + 3, secondRow!.y + secondRow!.height + 2, {
      steps: 8,
    });
    await page.mouse.up();
    await expect(
      page.locator('.added-text-box.is-selected').filter({ hasText: 'Beginning balance on October 10' }),
    ).toHaveCount(1);
    await expect(
      page.locator('.added-text-box.is-selected').filter({ hasText: '+ Deposits and other credits' }),
    ).toHaveCount(1);
    await expect(page.locator('.vector-selection-box')).toHaveCount(0);
    // With PDF shape selection off, clicks ignore OCR-derived shapes too.
    await page.mouse.click(firstRow!.x - 8, firstRow!.y - 3);
    await expect(page.locator('.vector-selection-box')).toHaveCount(0);
    await page.locator('details').filter({ hasText: 'Select PDF shapes' }).locator('summary').click();
    await page.getByRole('button', { name: /Select PDF shapes/ }).click();
    // Turning shape selection on makes reconstructed shapes interactive again.
    await page.locator('.vector-layer .editable-vector').first().click({ force: true });
    await expect(page.locator('.vector-selection-box')).toHaveCount(1);
    const logo = page.locator('.image-layer .existing').last();
    await expect(page.locator('.image-layer .existing')).toHaveCount(4);
    await logo.click();
    const handle = logo.getByRole('button', { name: 'Move existing image' });
    const bounds = await handle.boundingBox();
    await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
    await page.mouse.down();
    await page.mouse.move(bounds!.x - 20, bounds!.y + 30, { steps: 5 });
    await page.mouse.up();
    await expect(logo.locator('img')).toBeVisible();
    await expect(page.locator('.pdf-image-eraser')).toHaveCount(1);
    await logo.screenshot({ path: testInfo.outputPath('recognized-logo.png') });
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export PDF', exact: true }).click();
    const outputPath = testInfo.outputPath('moved-logo.pdf');
    await (await downloadPromise).saveAs(outputPath);
    const exported = await PDFDocument.load(await readFile(outputPath));
    expect(exported.getPageCount()).toBe(2);
  });
}
