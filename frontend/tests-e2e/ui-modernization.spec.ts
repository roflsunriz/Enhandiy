// @ts-nocheck
import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

test.describe('Fluent UI レスポンシブ品質', () => {
  for (const viewport of viewports) {
    test(`${viewport.name}で主要UIが画面内に収まる`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');

      await expect(page.locator('.app-topbar')).toBeVisible();
      await expect(page.locator('.app-hero')).toBeVisible();
      await expect(page.locator('.app-file-surface')).toBeVisible();
      await expect(page.locator('.file-manager__search-input')).toBeVisible();
      await expect.poll(() => page.locator('#fileManagerContainer').evaluate(element => (
        !element.classList.contains('file-manager--loading')
      ))).toBe(true);

      await expect.poll(() => page.evaluate(() => (
        document.documentElement.scrollWidth <= window.innerWidth + 1
      ))).toBe(true);

      const clippedElements = await page.evaluate(() => {
        const viewportWidth = window.innerWidth;
        const selectors = [
          '.app-topbar__inner',
          '.app-hero',
          '.app-file-surface',
          '.file-manager__header',
          '.file-manager__pagination',
        ];

        return selectors.filter(selector => {
          const element = document.querySelector(selector);
          if (!element) return true;
          const rect = element.getBoundingClientRect();
          return rect.left < -1 || rect.right > viewportWidth + 1;
        });
      });
      expect(clippedElements).toEqual([]);
    });
  }

  test('モバイルでアップロードモーダルを操作できる', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('.app-upload-trigger').click();

    const modal = page.locator('#uploadModal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('#dragDropArea')).toBeVisible();
    await expect(modal.locator('#selectFilesBtn')).toBeVisible();
    await expect(modal.locator('#selectFolderBtn')).toBeVisible();
    await expect(modal.locator('#uploadBtn')).toBeVisible();

    const modalBounds = await modal.locator('.modal-dialog').evaluate(element => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width };
    });
    expect(modalBounds.left).toBeGreaterThanOrEqual(-1);
    expect(modalBounds.right).toBeLessThanOrEqual(391);
    expect(modalBounds.width).toBeGreaterThan(300);
  });

  test('表示切り替えは状態を視覚・属性の両方で示す', async ({ page }) => {
    await page.goto('/');
    const gridButton = page.locator('.file-manager__view-btn[data-view="grid"]');
    const listButton = page.locator('.file-manager__view-btn[data-view="list"]');

    await expect(gridButton).toHaveClass(/active/);
    await expect(gridButton).toHaveAttribute('aria-pressed', 'true');
    await listButton.click();
    await expect(listButton).toHaveClass(/active/);
    await expect(listButton).toHaveAttribute('aria-pressed', 'true');
    await expect(gridButton).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.file-manager__list')).toBeVisible();
  });
});
