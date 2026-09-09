import { expect, test } from '@playwright/test';

test('homepage shows brand name Healthy', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Healthy' }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Small wins, everyday' })).toBeVisible();
  await expect(
    page.getByText('Stay healthy and challenge your friends to stay healthy'),
  ).toBeVisible();
  await expect(page.getByText(/All rights reserved\.\d{4}, Healthy/)).toBeVisible();
});
