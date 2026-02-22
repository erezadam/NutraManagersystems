import { test, expect } from '@playwright/test';

test('default route shows Vitamins page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Vitamins' })).toBeVisible();
});
