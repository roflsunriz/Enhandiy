// @ts-nocheck
import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// シンプルな待機処理に変更

test.describe('アップロード→ダウンロード一連動作', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('DLキー無しでアップロードし、ダウンロード可能', async ({ page, context }) => {
    const dir = mkdtempSync(join(tmpdir(), 'e2e-uploader-'));
    const filePath = join(dir, 'hello-no-key.txt');
    writeFileSync(filePath, 'hello without key');

    await page.locator('button[data-bs-target="#uploadModal"]').click();
    await expect(page.locator('#uploadModal')).toBeVisible();

    await page.locator('#multipleFileInput').setInputFiles(filePath);
    await page.locator('#delkeyInput').fill('delete-key-1234');
    await page.locator('#replaceKeyInput').fill('replace-key-1234');
    
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

    const listRowNoKey = page.locator('.file-list-item:has(.file-name:has-text("hello-no-key.txt"))').first();
    const gridItemNoKey = page.locator('.file-grid-item:has(.file-grid-item__name[title="hello-no-key.txt"])').first();
    await expect(listRowNoKey.or(gridItemNoKey)).toBeVisible({ timeout: 15000 });

    const row = listRowNoKey.or(gridItemNoKey);
    const downloadButton = row.locator('.file-action-btn--download').first();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadButton.click(),
    ]);

    const path = await download.path();
    expect(path).not.toBeNull();
  });

  test('DLキーありでアップロードし、認証モーダルを経てダウンロード', async ({ page }) => {
    const dir = mkdtempSync(join(tmpdir(), 'e2e-uploader-'));
    const filePath = join(dir, 'hello-with-key.txt');
    writeFileSync(filePath, 'hello with dlkey');

    await page.locator('button[data-bs-target="#uploadModal"]').click();
    await expect(page.locator('#uploadModal')).toBeVisible();

    await page.locator('#multipleFileInput').setInputFiles(filePath);
    await page.locator('#dlkeyInput').fill('dl-key-5678');
    await page.locator('#delkeyInput').fill('delete-key-5678');
    await page.locator('#replaceKeyInput').fill('replace-key-5678');
    
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

    const listRowWithKey = page.locator('.file-list-item:has(.file-name:has-text("hello-with-key.txt"))').first();
    const gridItemWithKey = page.locator('.file-grid-item:has(.file-grid-item__name[title="hello-with-key.txt"])').first();
    await expect(listRowWithKey.or(gridItemWithKey)).toBeVisible({ timeout: 15000 });

    const targetRow = listRowWithKey.or(gridItemWithKey);
    const dlBtn = targetRow.locator('.file-action-btn--download').first();
    await dlBtn.click();

    const modal = page.locator('#downloadAuthModal');
    await expect(modal).toBeVisible();

    await page.locator('#downloadAuthDlKey').fill('dl-key-5678');
    await page.locator('#downloadAuthConfirmBtn').click();

    await expect(modal).toBeHidden({ timeout: 10000 });
  });
});


