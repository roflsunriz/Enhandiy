// @ts-nocheck
import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

async function closeAlertIfVisible(page) {
  const alertModal = page.locator('#alertModal');
  try {
    if (await alertModal.isVisible({ timeout: 300 })) {
      await page.locator('#alertModal .btn.btn-primary').click();
      await expect(alertModal).toBeHidden();
    }
  } catch {}
}

// この関数は使わないことにした
// async function waitForUploadComplete(page, timeout = 10000) {
//   // トーストメッセージまたはアラートを待つ
//   try {
//     await page.waitForFunction(
//       () => {
//         // uploadModalが閉じているか、エラートーストが表示されているか
//         const uploadModal = document.querySelector('#uploadModal');
//         const toast = document.querySelector('.toast-body');
//         const alertModal = document.querySelector('#alertModal.show');
//         return (uploadModal && !uploadModal.classList.contains('show')) || toast || alertModal;
//       },
//       { timeout }
//     );
//   } catch {
//     // タイムアウトした場合は続行
//   }
// }

async function refreshAll(page) {
  try {
    await page.evaluate(async () => {
      const w = window as unknown as { folderManager?: { refreshAll?: () => Promise<void> }, fileManagerInstance?: { refreshFromServer?: () => Promise<void> } };
      if (w.folderManager && typeof w.folderManager.refreshAll === 'function') {
        await w.folderManager.refreshAll();
      } else if (w.fileManagerInstance && typeof w.fileManagerInstance.refreshFromServer === 'function') {
        await w.fileManagerInstance.refreshFromServer();
      }
    });
  } catch {}
}

test.describe('削除機能', () => {
  test('個別削除: 削除キーで削除できる', async ({ page }) => {
    await page.goto('/');

    const dir = mkdtempSync(join(tmpdir(), 'e2e-del-one-'));
    const filePath = join(dir, 'delete-me.txt');
    writeFileSync(filePath, 'please delete me');

    await page.locator('button[data-bs-target="#uploadModal"]').click();
    await expect(page.locator('#uploadModal')).toBeVisible();
    await page.locator('#multipleFileInput').setInputFiles(filePath);
    await page.locator('#delkeyInput').fill('del-key-one');
    await page.locator('#replaceKeyInput').fill('rep-key-one');
    
    // アップロードボタンをクリック
    await page.locator('#uploadBtn').click();
    
    // アップロード処理を待つ
    await page.waitForTimeout(3000);
    
    // モーダルを閉じる
    const uploadModal = page.locator('#uploadModal');
    const closeBtn = uploadModal.locator('[data-bs-dismiss="modal"]').first();
    if (await closeBtn.isVisible({ timeout: 1000 })) {
      await closeBtn.click();
    }
    await page.waitForTimeout(1000);
    await closeAlertIfVisible(page);

    const row = page
      .locator('.file-list-item:has(.file-name:has-text("delete-me.txt"))').first()
      .or(page.locator('.file-grid-item:has(.file-grid-item__name[title="delete-me.txt"])').first());
    await expect(row).toBeVisible({ timeout: 15000 });

    await row.locator('.file-action-btn--delete').click();

    const modal = page.locator('#deleteAuthModal');
    await expect(modal).toBeVisible();
    await page.locator('#deleteAuthDelKey').fill('del-key-one');
    
    // 削除確認ボタンをクリックしてAPIレスポンスを待つ
    await Promise.all([
      page.waitForResponse(response => response.url().includes('/api/') && response.status() === 200),
      page.locator('#deleteAuthConfirmBtn').click()
    ]);

    // モーダルが閉じるまで待つ
    await expect(modal).toBeHidden({ timeout: 5000 });
    await closeAlertIfVisible(page);
    
    // ページをリフレッシュして変更を反映
    await refreshAll(page);
    await page.waitForTimeout(1000); // 追加の待機時間

    await expect(
      page
        .locator('.file-list-item:has(.file-name:has-text("delete-me.txt"))')
        .or(page.locator('.file-grid-item:has(.file-grid-item__name[title="delete-me.txt"])'))
    ).toBeHidden({ timeout: 20000 });
  });

  test('一括削除: 全選択→マスターキーで削除', async ({ page }) => {
    await page.goto('/');

    // 2ファイル用意
    const dir = mkdtempSync(join(tmpdir(), 'e2e-del-bulk-'));
    const f1 = join(dir, 'bulk-a.txt');
    const f2 = join(dir, 'bulk-b.txt');
    writeFileSync(f1, 'bulk-a');
    writeFileSync(f2, 'bulk-b');

    // アップロード(複数指定)
    await page.locator('button[data-bs-target="#uploadModal"]').click();
    await expect(page.locator('#uploadModal')).toBeVisible();
    await page.locator('#multipleFileInput').setInputFiles([f1, f2]);
    await page.locator('#delkeyInput').fill('del-key-bulk');
    await page.locator('#replaceKeyInput').fill('rep-key-bulk');
    
    // アップロードボタンをクリック
    await page.locator('#uploadBtn').click();
    
    // アップロード処理を待つ
    await page.waitForTimeout(3000);
    
    // モーダルを閉じる
    const uploadModal = page.locator('#uploadModal');
    const closeBtn = uploadModal.locator('[data-bs-dismiss="modal"]').first();
    if (await closeBtn.isVisible({ timeout: 1000 })) {
      await closeBtn.click();
    }
    await page.waitForTimeout(1000);
    await closeAlertIfVisible(page);

    // 2つ見えるまで待つ
    const rowA = page.locator('.file-list-item:has(.file-name:has-text("bulk-a.txt"))').first()
      .or(page.locator('.file-grid-item:has(.file-grid-item__name[title="bulk-a.txt"])').first());
    const rowB = page.locator('.file-list-item:has(.file-name:has-text("bulk-b.txt"))').first()
      .or(page.locator('.file-grid-item:has(.file-grid-item__name[title="bulk-b.txt"])').first());
    await expect(rowA).toBeVisible({ timeout: 15000 });
    await expect(rowB).toBeVisible({ timeout: 15000 });

    // ビューに依存せずチェック
    const checkboxA = rowA.locator('input.file-checkbox');
    const checkboxB = rowB.locator('input.file-checkbox');
    await checkboxA.check();
    await checkboxB.check();

    // 一括操作の削除ボタン
    const bulkDeleteBtn = page.locator('.file-manager__bulk-actions .bulk-action-btn--delete');
    await expect(bulkDeleteBtn).toBeVisible({ timeout: 10000 });
    await bulkDeleteBtn.click();

    // 確認→パスワード入力
    const confirmModal = page.locator('#confirmModal');
    await expect(confirmModal).toBeVisible();
    await page.locator('#confirmModalOk').click();

    const pwModal = page.locator('#passwordModal');
    await expect(pwModal).toBeVisible();
    const masterKey = process.env.PW_MASTER_KEY || 'fZ3MnA800JqkOy87vbktneUJT7GoxuRo';
    await page.locator('#passwordModalInput').fill(masterKey);
    
    // パスワード確認ボタンをクリックしてAPIレスポンスを待つ
    await Promise.all([
      page.waitForResponse(response => response.url().includes('/api/') && response.status() === 200),
      page.locator('#passwordModalOk').click()
    ]);
    
    // モーダルが閉じるまで待つ
    await expect(pwModal).toBeHidden({ timeout: 5000 });
    await closeAlertIfVisible(page);
    
    // ページをリフレッシュして変更を反映
    await refreshAll(page);
    await page.waitForTimeout(1000); // 追加の待機時間

    await expect(
      page.locator('.file-list-item:has(.file-name:has-text("bulk-a.txt"))')
        .or(page.locator('.file-grid-item:has(.file-grid-item__name[title="bulk-a.txt"])'))
    ).toBeHidden({ timeout: 20000 });
    await expect(
      page.locator('.file-list-item:has(.file-name:has-text("bulk-b.txt"))')
        .or(page.locator('.file-grid-item:has(.file-grid-item__name[title="bulk-b.txt"])'))
    ).toBeHidden({ timeout: 20000 });
  });

  test('フォルダ削除: 空フォルダを作成して削除', async ({ page }) => {
    await page.goto('/');

    // フォルダ作成
    await page.locator('#create-folder-btn').click();
    await expect(page.locator('#promptModal')).toBeVisible();
    await page.locator('#promptModalInput').fill('E2E-DEL-FOLDER');
    await page.locator('#promptModalOk').click();
    await expect(page.locator('#promptModal')).toBeHidden();
    await closeAlertIfVisible(page);

    const folderCard = page.locator('#folder-grid [data-folder-id]:has(.folder-name:has-text("E2E-DEL-FOLDER"))').first();
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.location.reload());
    await expect(folderCard).toBeVisible({ timeout: 15000 });

    // 削除
    await folderCard.locator('.dropdown-toggle').click();
    const menu = folderCard.locator('.dropdown-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });
    
    // Bootstrapのアニメーションが完了するまで待つ
    await page.waitForTimeout(300);
    
    // 削除リンクを取得
    const deleteLink = menu.locator('.delete-folder').first();
    
    // リンクが表示されるまで待つ
    await expect(deleteLink).toBeVisible({ timeout: 5000 });
    
    // JavaScriptで直接クリック
    await deleteLink.evaluate(el => el.click());

    const confirmModal = page.locator('#confirmModal');
    await expect(confirmModal).toBeVisible();
    
    // 確認ボタンをクリックしてAPIレスポンスを待つ
    await Promise.all([
      page.waitForResponse(response => response.url().includes('/api/') && response.status() === 200),
      page.locator('#confirmModalOk').click()
    ]);
    
    // モーダルが閉じるまで待つ
    await expect(confirmModal).toBeHidden({ timeout: 5000 });
    
    // 反映待ち
    await closeAlertIfVisible(page);
    await refreshAll(page);
    await page.waitForTimeout(1000); // 追加の待機時間

    await expect(
      page.locator('#folder-grid .folder-name', { hasText: 'E2E-DEL-FOLDER' })
    ).toBeHidden({ timeout: 20000 });
  });
});


