import { expect, test } from '@playwright/test';

test('homepage shows brand name Product', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Product' })).toBeVisible();
});
