// @ts-nocheck
import { test, expect } from '@playwright/test';
import { delay } from './helpers/delay';
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

async function clickFolderDropdownAction(cardLocator, actionSelector) {
  // ドロップダウントグルをクリック
  await cardLocator.locator('.dropdown-toggle').click();
  
  // メニューが表示されるまで待つ
  const menu = cardLocator.locator('.dropdown-menu');
  await expect(menu).toBeVisible({ timeout: 5000 });
  
  // Bootstrapのアニメーションが完了するまで待つ
  await delay('low');
  
  // メニューアイテムをクリック
  const menuItem = menu.locator(actionSelector).first();
  
  // アイテムが表示されるまで待つ
  await expect(menuItem).toBeVisible({ timeout: 5000 });
  
  // JavaScriptで直接クリックする方法を試す
  await menuItem.evaluate(el => el.click());
}

test.describe('フォルダ管理と移動フロー', () => {
  test('フォルダ作成→改名→ネスト移動→ファイル移動→場所反映', async ({ page }) => {
    await page.goto('/');
    await delay('low');

    // 1) フォルダ作成（E2E-A）
    await page.locator('#create-folder-btn').click();
    await delay('medium');
    await expect(page.locator('#promptModal')).toBeVisible();
    await page.locator('#promptModalInput').fill('E2E-A');
    await delay('low');
    await page.locator('#promptModalOk').click();
    await delay('high');
    await expect(page.locator('#promptModal')).toBeHidden();
    await closeAlertIfVisible(page);
    await delay('low');
    // 完全一致でE2E-Aフォルダを探す（E2E-A-renamedと区別するため）
    const folderACard = page.locator('#folder-grid [data-folder-id]').filter({
      has: page.locator('.folder-name').filter({ hasText: /^E2E-A$/ })
    }).first();
    await page.reload();
    await expect(folderACard).toBeVisible({ timeout: 15000 });
    const folderAId = await folderACard.getAttribute('data-folder-id');

    // 2) フォルダ名前変更 → E2E-A-renamed
    await closeAlertIfVisible(page);
    await delay('low');
    await clickFolderDropdownAction(folderACard, '.rename-folder');
    await delay('medium');
    await expect(page.locator('#promptModal')).toBeVisible();
    await page.locator('#promptModalInput').fill('E2E-A-renamed');
    await delay('low');
    await page.locator('#promptModalOk').click();
    await delay('high');
    await expect(page.locator('#promptModal')).toBeHidden();
    await closeAlertIfVisible(page);
    const folderARenamed = page.locator('#folder-grid .folder-name', { hasText: 'E2E-A-renamed' });
    await expect(folderARenamed).toBeVisible({ timeout: 15000 });

    // 3) もう一つ新しいフォルダ（E2E-B）作成
    await page.locator('#create-folder-btn').click();
    await delay('medium');
    await expect(page.locator('#promptModal')).toBeVisible();
    await page.locator('#promptModalInput').fill('E2E-B');
    await delay('low');
    await page.locator('#promptModalOk').click();
    await delay('high');
    await expect(page.locator('#promptModal')).toBeHidden();
    await closeAlertIfVisible(page);
    await delay('low');
    // 完全一致でE2E-Bフォルダを探す
    const folderBCard = page.locator('#folder-grid [data-folder-id]').filter({
      has: page.locator('.folder-name').filter({ hasText: /^E2E-B$/ })
    }).first();
    await page.reload();
    await expect(folderBCard).toBeVisible({ timeout: 15000 });
    const folderBId = await folderBCard.getAttribute('data-folder-id');

    // 4) 前に作ったフォルダ（A-renamed）を B に移動
    const folderARenamedCard = page.locator('#folder-grid [data-folder-id]:has(.folder-name:has-text("E2E-A-renamed"))').first();
    await closeAlertIfVisible(page);
    await delay('low');
    await clickFolderDropdownAction(folderARenamedCard, '.move-folder');
    await delay('medium');
    await expect(page.locator('#promptModal')).toBeVisible();
    await page.locator('#promptModalInput').fill(String(folderBId));
    await delay('low');
    await page.locator('#promptModalOk').click();
    await delay('high');
    await expect(page.locator('#promptModal')).toBeHidden();
    await closeAlertIfVisible(page);

    // 移動後: ルートから A-renamed が消え、B をクリックすると中に A-renamed が見える
    await page.reload();
    await expect(page.locator('#folder-grid .folder-name', { hasText: 'E2E-A-renamed' })).toBeHidden({ timeout: 15000 });
    await folderBCard.locator('a.folder-item').click();
    await delay('medium');
    await expect(page.locator('.breadcrumb')).toContainText('ルート');
    await expect(page.locator('.breadcrumb')).toContainText('E2E-B');
    await expect(page.locator('#folder-grid .folder-name', { hasText: 'E2E-A-renamed' })).toBeVisible({ timeout: 15000 });

    // 5) ファイルをルートにアップロードしてから、リストビューで移動ボタンを使って A-renamed へ移動
    // ルートへ戻る
    await page.locator('.breadcrumb .breadcrumb-link', { hasText: 'ルート' }).click();
    await delay('medium');

    // アップロード
    const dir = mkdtempSync(join(tmpdir(), 'e2e-folders-'));
    const filePath = join(dir, 'move-me.txt');
    writeFileSync(filePath, 'move me');
    await page.locator('button[data-bs-target="#uploadModal"]').click();
    await delay('medium');
    await expect(page.locator('#uploadModal')).toBeVisible();
    await page.locator('#multipleFileInput').setInputFiles(filePath);
    await delay('low');
    await page.locator('#delkeyInput').fill('del-key');
    await delay('low');
    await page.locator('#replaceKeyInput').fill('rep-key');
    await delay('low');
    await page.locator('#uploadBtn').click();
    await delay('high');
    await expect(page.locator('#uploadModal')).toBeHidden();
    await closeAlertIfVisible(page);

    // リストビューに切り替え
    await page.locator('.file-manager__view-btn[data-view="list"]').click();
    await delay('medium');

    // 対象ファイル行と移動ボタン
    const fileRow = page.locator('.file-list-item:has(.file-name:has-text("move-me.txt"))').first();
    await page.reload();
    await expect(fileRow).toBeVisible({ timeout: 15000 });
    await closeAlertIfVisible(page);
    await fileRow.locator('.file-action-btn--move').click();
    await delay('medium');

    // 移動先フォルダIDをプロンプトに入力（A-renamed のID）
    await expect(page.locator('#promptModal')).toBeVisible();
    await page.locator('#promptModalInput').fill(String(folderAId));
    await delay('low');
    await page.locator('#promptModalOk').click();
    await delay('high');
    await expect(page.locator('#promptModal')).toBeHidden();
    await closeAlertIfVisible(page);

    // 動的更新で「場所」列が E2E-A-renamed になっていることを確認（少し待つ）
    await page.reload();
    await expect(fileRow.locator('td.file-list__folder, .file-grid-item__folder')).toContainText('E2E-A-renamed', { timeout: 20000 });
  });
});


