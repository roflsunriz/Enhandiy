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
      await expect(page.locator('.app-topbar #app-page-title')).toBeVisible();
      await expect(page.locator('.app-workspace')).toBeVisible();
      await expect(page.locator('.app-workspace .app-file-surface')).toBeVisible();
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
          '.app-workspace',
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

  test('タイトル・説明・リンクがヘッダーに統合される', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('.app-topbar__identity #app-page-title')).toBeVisible();
    await expect(page.locator('.app-topbar__identity p')).not.toBeEmpty();
    await expect(page.locator('.app-announcement')).toHaveCount(0);
    await expect(page.locator('.app-hero')).toHaveCount(0);
    await expect(page.locator('.app-folder-surface')).toHaveCount(0);

    const relatedLinks = page.locator('.app-topbar__links a');
    if (await relatedLinks.count() > 0) {
      await expect(relatedLinks.first()).toBeVisible();
    }
  });

  test('フォルダとファイルが同じグリッド・リストで切り替わる', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.folderData = [{
        id: '901',
        name: '統合フォルダ',
        parent_id: null,
        created_at: '2026-08-08 10:00:00',
        file_count: 2,
      }];
      window.fileManagerInstance?.setFiles([{
        id: '902',
        origin_file_name: '統合ファイル.txt',
        name: '統合ファイル.txt',
        size: 128,
        type: 'text/plain',
        upload_date: '2026-08-08 10:00:00',
      }]);
    });

    const grid = page.locator('.file-manager__grid');
    await expect(grid.locator('.folder-grid-item .folder-name')).toHaveText('統合フォルダ');
    await expect(grid.locator('.file-grid-item .file-grid-item__name')).toContainText('統合ファイル.txt');

    await page.locator('.file-manager__view-btn[data-view="list"]').click();
    const table = page.locator('.file-list-table');
    await expect(table.locator('.folder-list-item .folder-name')).toHaveText('統合フォルダ');
    await expect(table.locator('.file-list-item .file-name')).toHaveText('統合ファイル.txt');

    const folderListLayout = await table.locator('.file-manager__folder-list').evaluate(element => {
      const tableElement = element.closest('table');
      const folderRow = element.querySelector('.folder-list-item');
      return {
        display: getComputedStyle(element).display,
        tableWidth: tableElement?.getBoundingClientRect().width || 0,
        rowWidth: folderRow?.getBoundingClientRect().width || 0,
      };
    });
    expect(folderListLayout.display).toBe('table-row-group');
    expect(folderListLayout.rowWidth).toBeGreaterThan(folderListLayout.tableWidth * 0.9);

    const folderActions = table.locator('.folder-list__actions');
    await expect(folderActions.locator('.dropdown-toggle')).toHaveCount(0);
    await expect(folderActions.locator('[data-folder-action="rename"]')).toBeVisible();
    await expect(folderActions.locator('[data-folder-action="move"]')).toBeVisible();
    await expect(folderActions.locator('[data-folder-action="delete"]')).toBeVisible();

    await folderActions.locator('[data-folder-action="rename"]').click();
    await expect(page.locator('#promptModal')).toBeVisible();
    await expect(page.locator('#promptModalInput')).toHaveValue('統合フォルダ');
    await page.locator('#promptModalCancel').click();

    await page.locator('.file-manager__search-input').fill('統合フォルダ');
    await expect(table.locator('.folder-list-item')).toBeVisible();
    await expect(table.locator('.file-list-item')).toHaveCount(0);
  });

  test('ワークスペースへのドロップがアップロード設定につながる', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(new File(['workspace drop'], 'workspace-drop.txt', { type: 'text/plain' }));
      document.querySelector('.app-workspace')?.dispatchEvent(new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      }));
    });

    await expect(page.locator('#uploadModal')).toBeVisible();
    await expect(page.locator('#selectedFilesList')).toContainText('workspace-drop.txt');
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
