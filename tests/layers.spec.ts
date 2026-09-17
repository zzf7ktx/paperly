import { expect, test } from '@playwright/test';

test('layers panel identifies, hides, and restores original PDF objects', async ({ page }) => {
  await page.goto('/');
  await page
    .locator('input[type="file"][accept="application/pdf,.pdf"]')
    .setInputFiles('tests/fixtures/scanned-statement.pdf');
  await expect(page.locator('.pdf-image-box.existing')).toHaveCount(3, { timeout: 30_000 });

  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  const panel = page.getByRole('complementary', { name: 'Objects and layers panel' });
  await expect(panel).toBeVisible();

  const imageRow = panel.getByTestId('layer-row').filter({ hasText: 'PDF image' }).first();
  await imageRow.locator('.layer-main').click();
  await expect(page.locator('.canvas-selection-status')).toContainText('PDF image');

  await imageRow.locator('.layer-actions button').first().click();
  await expect(page.locator('.pdf-image-box.is-deleted')).toHaveCount(1);
  await expect(page.locator('.action-toast')).toContainText('1 original image hidden');

  await page.locator('.action-toast').getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('.pdf-image-box.is-deleted')).toHaveCount(0);
});
