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

async function clickFolderDropdownAction(cardLocator, actionSelector) {
  await cardLocator.locator('.dropdown-toggle').click();
  const menu = cardLocator.locator('.dropdown-menu');
  await expect(menu).toBeVisible();
  await menu.locator(actionSelector).click();
}

test.describe('フォルダ管理と移動フロー', () => {
  test('フォルダ作成→改名→ネスト移動→ファイル移動→場所反映', async ({ page }) => {
    await page.goto('/');

    // 1) フォルダ作成（E2E-A）
    await page.locator('#create-folder-btn').click();
    await expect(page.locator('#promptModal')).toBeVisible();
    await page.locator('#promptModalInput').fill('E2E-A');
    await page.locator('#promptModalOk').click();
    await expect(page.locator('#promptModal')).toBeHidden();
    await closeAlertIfVisible(page);
    const folderA = page.locator('#folder-grid [data-folder-id] .folder-name', { hasText: 'E2E-A' });
    await expect(folderA).toBeVisible({ timeout: 15000 });

    // data-folder-id を取得
    const folderACard = page.locator('#folder-grid [data-folder-id]:has(.folder-name:has-text("E2E-A"))').first();
    const folderAId = await folderACard.getAttribute('data-folder-id');

    // 2) フォルダ名前変更 → E2E-A-renamed
    await closeAlertIfVisible(page);
    await clickFolderDropdownAction(folderACard, '.rename-folder');
    await expect(page.locator('#promptModal')).toBeVisible();
    await page.locator('#promptModalInput').fill('E2E-A-renamed');
    await page.locator('#promptModalOk').click();
    await expect(page.locator('#promptModal')).toBeHidden();
    await closeAlertIfVisible(page);
    const folderARenamed = page.locator('#folder-grid .folder-name', { hasText: 'E2E-A-renamed' });
    await expect(folderARenamed).toBeVisible({ timeout: 15000 });

    // 3) もう一つ新しいフォルダ（E2E-B）作成
    await page.locator('#create-folder-btn').click();
    await expect(page.locator('#promptModal')).toBeVisible();
    await page.locator('#promptModalInput').fill('E2E-B');
    await page.locator('#promptModalOk').click();
    await expect(page.locator('#promptModal')).toBeHidden();
    await closeAlertIfVisible(page);
    const folderBCard = page.locator('#folder-grid [data-folder-id]:has(.folder-name:has-text("E2E-B"))').first();
    await expect(folderBCard).toBeVisible({ timeout: 15000 });
    const folderBId = await folderBCard.getAttribute('data-folder-id');

    // 4) 前に作ったフォルダ（A-renamed）を B に移動
    const folderARenamedCard = page.locator('#folder-grid [data-folder-id]:has(.folder-name:has-text("E2E-A-renamed"))').first();
    await closeAlertIfVisible(page);
    await clickFolderDropdownAction(folderARenamedCard, '.move-folder');
    await expect(page.locator('#promptModal')).toBeVisible();
    await page.locator('#promptModalInput').fill(String(folderBId));
    await page.locator('#promptModalOk').click();
    await expect(page.locator('#promptModal')).toBeHidden();
    await closeAlertIfVisible(page);

    // 移動後: ルートから A-renamed が消え、B をクリックすると中に A-renamed が見える
    await expect(page.locator('#folder-grid .folder-name', { hasText: 'E2E-A-renamed' })).toBeHidden({ timeout: 15000 });
    await folderBCard.locator('a.folder-item').click();
    await expect(page.locator('.breadcrumb')).toContainText('ルート');
    await expect(page.locator('.breadcrumb')).toContainText('E2E-B');
    await expect(page.locator('#folder-grid .folder-name', { hasText: 'E2E-A-renamed' })).toBeVisible({ timeout: 15000 });

    // 5) ファイルをルートにアップロードしてから、リストビューで移動ボタンを使って A-renamed へ移動
    // ルートへ戻る
    await page.locator('.breadcrumb .breadcrumb-link', { hasText: 'ルート' }).click();

    // アップロード
    const dir = mkdtempSync(join(tmpdir(), 'e2e-folders-'));
    const filePath = join(dir, 'move-me.txt');
    writeFileSync(filePath, 'move me');
    await page.locator('button[data-bs-target="#uploadModal"]').click();
    await expect(page.locator('#uploadModal')).toBeVisible();
    await page.locator('#multipleFileInput').setInputFiles(filePath);
    await page.locator('#delkeyInput').fill('del-key');
    await page.locator('#replaceKeyInput').fill('rep-key');
    await page.locator('#uploadBtn').click();
    await expect(page.locator('#uploadModal')).toBeHidden();
    await closeAlertIfVisible(page);

    // リストビューに切り替え
    await page.locator('.file-manager__view-btn[data-view="list"]').click();

    // 対象ファイル行と移動ボタン
    const fileRow = page.locator('.file-list-item:has(.file-name:has-text("move-me.txt"))').first();
    await expect(fileRow).toBeVisible({ timeout: 15000 });
    await closeAlertIfVisible(page);
    await fileRow.locator('.file-action-btn--move').click();

    // 移動先フォルダIDをプロンプトに入力（A-renamed のID）
    await expect(page.locator('#promptModal')).toBeVisible();
    await page.locator('#promptModalInput').fill(String(folderAId));
    await page.locator('#promptModalOk').click();
    await expect(page.locator('#promptModal')).toBeHidden();
    await closeAlertIfVisible(page);

    // 動的更新で「場所」列が E2E-A-renamed になっていることを確認（少し待つ）
    await expect(fileRow.locator('td.file-list__folder, .file-grid-item__folder')).toContainText('E2E-A-renamed', { timeout: 20000 });
  });
});


