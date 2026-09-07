import { expect, test } from '@playwright/test';

test('homepage shows brand name Healthy', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Healthy' }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Small wins, every day.' })).toBeVisible();
  await expect(
    page.getByText('Stay healthy and challenge your friends to stay healthy.'),
  ).toBeVisible();
  await expect(page.getByText('Build healthy habits.')).toBeVisible();
  await expect(page.getByText('Track your progress.')).toBeVisible();
  await expect(page.getByText('Let us keep count.')).toBeVisible();
  await expect(page.getByText(/push-ups?/)).toBeVisible();
});
