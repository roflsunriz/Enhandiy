// @ts-nocheck
import { test, expect } from '@playwright/test';
import { delay } from './helpers/delay';

test('起動し、主要要素が表示される', async ({ page }) => {
  await page.goto('/');
  await delay('low');
  await expect(page.locator('#fileManagerContainer')).toBeVisible();
  await expect(page.locator('button[data-bs-target="#uploadModal"]')).toBeVisible();
});


