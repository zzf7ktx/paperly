import { expect, test } from '@playwright/test';
import { PDFDocument, rgb } from 'pdf-lib';

test('click, Shift-click, marquee, and Alt-pan have distinct shape gestures', async ({ page }) => {
  const pdf = await PDFDocument.create();
  const sheet = pdf.addPage([320, 220]);
  sheet.drawRectangle({ x: 30, y: 90, width: 90, height: 80, color: rgb(0.75, 0.3, 0.25) });
  sheet.drawRectangle({ x: 190, y: 90, width: 90, height: 80, color: rgb(0.25, 0.55, 0.4) });
  sheet.drawText('Inside shape', { x: 42, y: 125, size: 11 });
  sheet.drawText('Inside second', { x: 199, y: 125, size: 11 });

  await page.goto('/');
  await page.locator('input[type=file][accept="application/pdf,.pdf"]').setInputFiles({
    name: 'selection-gestures.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await pdf.save()),
  });
  await expect(page.locator('.text-block').filter({ hasText: 'Inside shape' })).toBeVisible();
  await page.locator('.draw-popover > summary').click();
  await page.getByRole('button', { name: /Select PDF shapes/ }).click();
  await page.locator('.draw-popover > summary').click();

  const shapes = page.locator('.vector-layer .editable-vector');
  await expect(shapes).toHaveCount(2);
  await page.locator('.text-block').filter({ hasText: 'Inside shape' }).click();
  await expect(page.locator('.canvas-selection-status')).toContainText('PDF text');
  await page
    .locator('.text-block')
    .filter({ hasText: 'Inside second' })
    .click({ modifiers: ['Shift'] });
  await expect(page.locator('.text-block.is-selected')).toHaveCount(2);

  await shapes.first().click({ position: { x: 5, y: 5 } });
  await expect(page.locator('.canvas-selection-status')).toContainText('PDF shape');
  await shapes.nth(1).click({ modifiers: ['Alt'], position: { x: 5, y: 5 } });
  await expect(page.locator('.vector-layer .editable-vector.is-selected')).toHaveCount(1);
  await shapes.nth(1).click({ modifiers: ['Shift'], position: { x: 5, y: 5 } });
  await expect(page.locator('.vector-layer .editable-vector.is-selected')).toHaveCount(2);
  await expect(page.locator('.vector-multi-selection-outline')).toHaveCount(1);
  await shapes.nth(1).click({ modifiers: ['Shift'], position: { x: 5, y: 5 } });
  await expect(page.locator('.vector-layer .editable-vector.is-selected')).toHaveCount(1);

  const first = await shapes.first().boundingBox();
  const second = await shapes.nth(1).boundingBox();
  expect(first && second).toBeTruthy();
  await page.mouse.move(first!.x + first!.width * 0.3, first!.y + first!.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(first!.x + first!.width * 0.3 + 2, first!.y + first!.height * 0.3 + 2);
  await expect(page.locator('.selection-marquee')).toHaveCount(0);
  await page.mouse.up();
  await page.mouse.move(first!.x + first!.width * 0.3, first!.y + first!.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(second!.x + second!.width * 0.7, second!.y + second!.height * 0.7, {
    steps: 8,
  });
  await expect(page.locator('.selection-marquee')).toBeVisible();
  await page.mouse.up();
  await expect(page.locator('.vector-layer .editable-vector.is-selected')).toHaveCount(2);

  await page.mouse.move(first!.x + first!.width * 0.3, first!.y + first!.height * 0.3);
  await page.keyboard.down('Alt');
  await page.mouse.down();
  await page.mouse.move(first!.x + first!.width * 0.6, first!.y + first!.height * 0.6, {
    steps: 5,
  });
  await expect(page.locator('.selection-marquee')).toHaveCount(0);
  await page.mouse.up();
  await page.keyboard.up('Alt');
});

test('canvas textbox selection stays stable when editable content receives focus', async ({ page }) => {
  const pdf = await PDFDocument.create();
  pdf.addPage([320, 220]);

  await page.goto('/');
  await page.locator('input[type=file][accept="application/pdf,.pdf"]').setInputFiles({
    name: 'text-selection.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await pdf.save()),
  });

  await page.locator('.add-text-tool').click();
  await page.locator('.live-page').click({ position: { x: 50, y: 50 } });
  await expect(page.locator('.added-text-box')).toHaveCount(1);
  await page.locator('.select-tool-button').click();

  const first = page.locator('.added-text-box').first();
  await first.locator('.added-text-content').click({ modifiers: ['Shift'] });
  await expect(first).not.toHaveClass(/is-selected/);
  await first.locator('.added-text-content').click();
  await expect(first).toHaveClass(/is-selected/);
  await expect(page.locator('.canvas-selection-status')).toContainText('Text box');
});
