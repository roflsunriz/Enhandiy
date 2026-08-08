// @ts-nocheck
import { test, expect } from '@playwright/test';

const successResponse = (data: unknown) => JSON.stringify({
  status: 'success',
  message: 'ok',
  data,
});

test.describe('本番相当の通信遅延下での競合防止', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('更新中の再取得要求を破棄せず最新応答を表示する', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/index.php?path=/api/files*', async route => {
      requestCount += 1;
      const currentRequest = requestCount;
      if (currentRequest === 1) {
        await new Promise(resolve => setTimeout(resolve, 250));
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: successResponse({
          files: [{
            id: String(currentRequest),
            origin_file_name: currentRequest === 1 ? 'old-response.txt' : 'latest-response.txt',
            size: currentRequest,
            input_date: 1_700_000_000 + currentRequest,
          }],
          folders: [],
          breadcrumb: [],
        }),
      });
    });

    await page.evaluate(async () => {
      const manager = window.fileManagerInstance;
      if (!manager) throw new Error('FileManager is not initialized');
      await Promise.all([
        manager.refreshFromServer(),
        manager.refreshFromServer(),
      ]);
    });

    expect(requestCount).toBe(2);
    await expect(page.locator('.file-grid-item[data-file-id="2"], .file-list-item[data-file-id="2"]').first()).toBeVisible();
    await expect(page.locator('#fileManagerContainer')).toContainText('latest-response.txt');
    await expect(page.locator('#fileManagerContainer')).not.toContainText('old-response.txt');
  });

  test('共有リンク生成は1クリックにつき1リクエストだけ送る', async ({ page }) => {
    let patchCount = 0;

    await page.route('**/api/index.php?path=/api/files/991/share', async route => {
      if (route.request().method() === 'PATCH') {
        patchCount += 1;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: successResponse({
          share_key: 'share-key',
          share_url: 'http://localhost/shared/991',
          share_url_with_comment: 'test http://localhost/shared/991',
          max_downloads: null,
          expires_days: null,
        }),
      });
    });

    await page.evaluate(() => {
      if (!window.openShareModal) throw new Error('Share modal is not initialized');
      window.openShareModal('991', 'share-target.txt', 'test');
    });

    await expect(page.locator('#shareLinkModal')).toBeVisible();
    await page.locator('#generateShareLinkBtn').click();
    await expect(page.locator('#shareResultPanel')).toBeVisible();
    await expect.poll(() => patchCount).toBe(1);
  });

  test('ダウンロード中にビューを切り替えても同じ操作を二重送信しない', async ({ page }) => {
    let verifyCount = 0;

    await page.route('**/api/index.php?path=/api/auth/verify-download', async route => {
      verifyCount += 1;
      await new Promise(resolve => setTimeout(resolve, 1_500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: successResponse({ token: 'download-token', expires_at: 1_900_000_000 }),
      });
    });
    await page.route('**/download.php?*', route => route.fulfill({ status: 204 }));

    await page.evaluate(() => {
      const manager = window.fileManagerInstance;
      if (!manager) throw new Error('FileManager is not initialized');
      manager.setFiles([{
        id: '992',
        origin_file_name: 'download-target.txt',
        size: 1,
        input_date: 1_700_000_000,
      }]);
    });

    await page.locator('[data-action="download"][data-file-id="992"]').click();
    await page.locator('.file-manager__view-btn[data-view="list"]').click();
    await page.locator('.file-manager__list [data-action="download"][data-file-id="992"]').click();

    await expect.poll(() => verifyCount).toBe(1);
  });

  test('アップロードボタンを連打してもアップロード処理は一度だけ開始する', async ({ page }) => {
    await page.evaluate(() => {
      const uploadWindow = window as typeof window & {
        enhancedFileUpload?: () => Promise<void>;
        uploadInvocationCount?: number;
      };
      uploadWindow.uploadInvocationCount = 0;
      uploadWindow.enhancedFileUpload = async () => {
        uploadWindow.uploadInvocationCount = (uploadWindow.uploadInvocationCount ?? 0) + 1;
        await new Promise(resolve => setTimeout(resolve, 250));
      };

      const button = document.querySelector('#uploadBtn');
      if (!button) throw new Error('Upload button is not initialized');
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    await expect.poll(() => page.evaluate(() => (
      window as typeof window & { uploadInvocationCount?: number }
    ).uploadInvocationCount)).toBe(1);
    await expect(page.locator('#uploadBtn')).toBeEnabled();
  });
});
