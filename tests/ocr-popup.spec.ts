import { expect, test } from '@playwright/test';

test('OCR popup stays usable and does not overlap another toolbar popup', async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 720 });
  await page.goto('/');

  const draw = page.locator('.draw-popover');
  const ocr = page.locator('.ocr-popover');

  await draw.locator('summary').click();
  await expect(draw).toHaveAttribute('open', '');

  await ocr.locator('summary').click();
  await expect(draw).not.toHaveAttribute('open', '');
  await expect(ocr).toHaveAttribute('open', '');

  const panel = ocr.locator('.toolbar-popover-panel');
  await expect(panel).toBeVisible();
  const bounds = await panel.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(480);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(720);

  const layoutToggle = page.getByRole('button', { name: /Recognize layout/ });
  const toggleBounds = await layoutToggle.boundingBox();
  expect(toggleBounds).not.toBeNull();
  expect(toggleBounds!.height).toBeGreaterThanOrEqual(44);

  await page.keyboard.press('Escape');
  await expect(ocr).not.toHaveAttribute('open', '');
});
