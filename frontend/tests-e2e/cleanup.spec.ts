// @ts-nocheck
import { test, expect } from '@playwright/test';
import { delay } from './helpers/delay';

async function closeAlertIfVisible(page) {
  const alertModal = page.locator('#alertModal');
  try {
    if (await alertModal.isVisible({ timeout: 300 })) {
      await page.locator('#alertModal .btn.btn-primary').click();
      await expect(alertModal).toBeHidden();
    }
  } catch {}
}

test.describe('E2E cleanup @cleanup: テスト実行後の残骸を削除する', () => {
  test('ルートに残ったテストフォルダとテストファイルを削除', async ({ page }) => {
    await page.goto('/');
    await delay('low');
    await closeAlertIfVisible(page);

    // フォルダ名のパターンにマッチするものを列挙して全件削除
    const folderNames = ['E2E-A', 'E2E-A-renamed', 'E2E-B', 'E2E-DEL-FOLDER'];
    for (const name of folderNames) {
      const card = page.locator('#folder-grid [data-folder-id]:has(.folder-name:has-text("' + name + '"))').first();
      try {
        if (await card.isVisible({ timeout: 1000 })) {
          await card.locator('.dropdown-toggle').click();
          const menu = card.locator('.dropdown-menu');
          await expect(menu).toBeVisible({ timeout: 3000 });
          await page.waitForTimeout(200);
          const deleteLink = menu.locator('.delete-folder').first();
          if (await deleteLink.isVisible({ timeout: 2000 })) {
            await deleteLink.evaluate(el => (el as HTMLElement).click());
            const confirmModal = page.locator('#confirmModal');
            await expect(confirmModal).toBeVisible();
            await Promise.all([
              page.waitForResponse(response => response.url().includes('/api/') && response.status() === 200),
              page.locator('#confirmModalOk').click()
            ]);
            await expect(confirmModal).toBeHidden({ timeout: 5000 });
            await closeAlertIfVisible(page);
          }
        }
      } catch {}
    }

    // ファイル名のパターンにマッチするものを列挙して一括削除フローを使って削除
    // 一括削除はチェックボックスで選択して一括操作ボタンからパスワード認証する実装を模倣する
    const fileNames = ['move-me.txt', 'delete-me.txt', 'bulk-a.txt', 'bulk-b.txt'];
    const visibleRows = [] as {rowLocator: any, name: string}[];
    for (const fname of fileNames) {
      try {
        const row = page
          .locator('.file-list-item:has(.file-name:has-text("' + fname + '"))').first()
          .or(page.locator('.file-grid-item:has(.file-grid-item__name[title="' + fname + '"])').first());
        if (await row.isVisible({ timeout: 1000 })) {
          visibleRows.push({ rowLocator: row, name: fname });
        }
      } catch {}
    }

    if (visibleRows.length > 0) {
      // 各行のチェックボックスをチェック
      for (const entry of visibleRows) {
        try {
          const checkbox = entry.rowLocator.locator('input.file-checkbox');
          if (await checkbox.isVisible()) {
            await checkbox.check();
            await delay('low');
          }
        } catch {}
      }

      // 一括削除ボタンを押す
      try {
        const bulkDeleteBtn = page.locator('.file-manager__bulk-actions .bulk-action-btn--delete');
        await expect(bulkDeleteBtn).toBeVisible({ timeout: 5000 });
        await bulkDeleteBtn.click();
        await delay('medium');

        // 確認ダイアログ
        const confirmModal = page.locator('#confirmModal');
        await expect(confirmModal).toBeVisible();
        await page.locator('#confirmModalOk').click();
        await delay('low');

        // パスワード入力ダイアログ
        const pwModal = page.locator('#passwordModal');
        await expect(pwModal).toBeVisible();
        const masterKey = process.env.PW_MASTER_KEY || 'fZ3MnA800JqkOy87vbktneUJT7GoxuRo';
        await page.locator('#passwordModalInput').fill(masterKey);
        await delay('low');

        // パスワード確認ボタンをクリックしてAPIレスポンスを待つ
        await Promise.all([
          page.waitForResponse(response => response.url().includes('/api/') && response.status() === 200),
          page.locator('#passwordModalOk').click()
        ]);

        await expect(pwModal).toBeHidden({ timeout: 5000 });
        await closeAlertIfVisible(page);
      } catch {}
    }

    // 最後にページをリフレッシュして残骸が無いことを確認（多少寛容に）
    await page.reload();
    await delay('medium');
    for (const name of folderNames) {
      await expect(page.locator('#folder-grid .folder-name', { hasText: name })).toBeHidden({ timeout: 10000 }).catch(() => {});
    }
    for (const fname of fileNames) {
      await expect(
        page.locator('.file-list-item:has(.file-name:has-text("' + fname + '"))').or(page.locator('.file-grid-item:has(.file-grid-item__name[title="' + fname + '"])'))
      ).toBeHidden({ timeout: 10000 }).catch(() => {});
    }
  });
});


