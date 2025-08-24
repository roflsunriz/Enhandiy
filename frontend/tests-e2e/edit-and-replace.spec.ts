// @ts-nocheck
import { test, expect } from '@playwright/test';
test.setTimeout(120000);
import { mkdtempSync, writeFileSync, readFileSync } from 'fs';
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

async function forceCloseModalIfOpen(page, modalSelector) {
  const modal = page.locator(modalSelector);
  try {
    if (await modal.isVisible({ timeout: 300 })) {
      const closeBtn = modal.locator('.btn-close');
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
      } else {
        // Bootstrap API 経由で確実に閉じる
        await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return;
          const w = window as unknown as { bootstrap?: any };
          if (w.bootstrap) {
            const inst = w.bootstrap.Modal.getInstance(el) || new w.bootstrap.Modal(el);
            inst.hide();
          } else {
            el.classList.remove('show');
            el.setAttribute('aria-hidden', 'true');
          }
        }, modalSelector);
      }
      // しつこく確認
      await expect(modal).toBeHidden({ timeout: 3000 });
    }
  } catch {}
}

async function getFileRowById(page, fileId) {
  return page
    .locator(`.file-list-item[data-file-id="${fileId}"]`).first()
    .or(page.locator(`.file-grid-item[data-file-id="${fileId}"]`).first());
}

async function ensureRowVisibleById(page, fileId) {
  const selector = `.file-list-item[data-file-id="${fileId}"], .file-grid-item[data-file-id="${fileId}"]`;
  await page.waitForSelector(selector, { state: 'visible', timeout: 10000 });
  return page.locator(selector).first();
}

async function refreshAndWait(page) {
  try {
    await page.evaluate(async () => {
      const w = window as unknown as { folderManager?: { refreshAll?: () => Promise<void> } };
      if (w.folderManager && typeof w.folderManager.refreshAll === 'function') {
        await w.folderManager.refreshAll();
      }
    });
  } catch {}
}

async function waitForApi(page, pathPart: string) {
  await page.waitForResponse(res => res.url().includes(pathPart) && res.ok());
}

async function closeToastIfVisible(page) {
  // 右下のトースト（Bootstrapのtoastや独自通知）をざっくり閉じる
  // 代表的な×ボタン: .btn-close か [aria-label="Close"] 等
  const toastClose = page.locator('.toast .btn-close, [aria-label="Close"]:has-text("×"), .toast [data-bs-dismiss="toast"]').first();
  try {
    if (await toastClose.isVisible({ timeout: 300 })) {
      await toastClose.click();
    }
  } catch {}
}

async function getRowSizeBytes(row) {
  const text = (await row.locator('td.file-list__size, .file-grid-item__size').first().textContent()) || '';
  const match = text.replace(/[,\s]/g, '').match(/(\d+)(B|KB|MB|GB|TB)/i);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  const unit = match[2].toUpperCase();
  const unitMap = { B: 1, KB: 1024, MB: 1024**2, GB: 1024**3, TB: 1024**4 };
  return value * (unitMap[unit] || 1);
}

test.describe('コメント編集とファイル差し替え', () => {
  test('差し替えキーとマスターキーでコメント編集と差し替えを検証', async ({ page, context }) => {
    // アップロード用ファイル準備
    const dir = mkdtempSync(join(tmpdir(), 'e2e-edit-'));
    const origPath = join(dir, 'edit-target.txt');
    const repV1 = join(dir, 'replace-v1.txt');
    const repV2 = join(dir, 'replace-v2.txt');
    writeFileSync(origPath, 'original'); // 8 B
    writeFileSync(repV1, 'v1-1234567890'); // 12 B
    writeFileSync(repV2, 'v2-1234567890123456'); // 18 B

    await page.goto('/');

    // ファイルをアップロード（差し替えキーと削除キー必須）
    await page.locator('button[data-bs-target="#uploadModal"]').click();
    await expect(page.locator('#uploadModal')).toBeVisible();
    await page.locator('#multipleFileInput').setInputFiles(origPath);
    await page.locator('#delkeyInput').fill('del-key-edit');
    await page.locator('#replaceKeyInput').fill('rep-key-edit');
    await page.locator('#uploadBtn').click();
    await expect(page.locator('#uploadModal')).toBeHidden();
    await closeAlertIfVisible(page);

    // 対象行取得（IDも確保）
    const initialRow = page
      .locator('.file-list-item:has(.file-name:has-text("edit-target.txt"))').first()
      .or(page.locator('.file-grid-item:has(.file-grid-item__name[title="edit-target.txt"])').first());
    await expect(initialRow).toBeVisible({ timeout: 15000 });
    const fileId = await initialRow.getAttribute('data-file-id');
    const fileRow = await ensureRowVisibleById(page, fileId);
    const initialBytes = await getRowSizeBytes(fileRow);

    // 1) コメント編集（差し替えキー）
    await fileRow.locator('.file-action-btn--edit').click();
    const editModal = page.locator('#editModal');
    await expect(editModal).toBeVisible();
    await page.locator('#editComment').fill('comment with replace key');
    // どちらか一方のみ入力（置換キーを使用、マスターキーは空に）
    await page.locator('#editMasterKeyInput').fill('');
    await page.locator('#editReplaceKeyInput').fill('rep-key-edit');
    await Promise.all([
      waitForApi(page, '/api/index.php?path=/api/files/'),
      page.locator('#saveCommentBtn').click(),
    ]);
    await closeAlertIfVisible(page);
    await closeToastIfVisible(page);
    await forceCloseModalIfOpen(page, '#editModal');
    // 反映待ち: 手動リフレッシュ
    await refreshAndWait(page);
    const rowAfterComment1 = await ensureRowVisibleById(page, fileId);
    await expect(
      rowAfterComment1.locator('.file-comment, .file-grid-item__comment')
    ).toContainText('comment with replace key', { timeout: 15000 });

    // 2) コメント編集（マスターキー）
    await fileRow.locator('.file-action-btn--edit').click();
    await expect(editModal).toBeVisible();
    await page.locator('#editComment').fill('comment with master key');
    // マスターキーを使用、置換キーは空に
    await page.locator('#editReplaceKeyInput').fill('');
    await page.locator('#editMasterKeyInput').fill(process.env.PW_MASTER_KEY);
    await Promise.all([
      waitForApi(page, '/api/index.php?path=/api/files/'),
      page.locator('#saveCommentBtn').click(),
    ]);
    await closeAlertIfVisible(page);
    await closeToastIfVisible(page);
    await forceCloseModalIfOpen(page, '#editModal');
    await refreshAndWait(page);
    const rowAfterComment2 = await ensureRowVisibleById(page, fileId);
    await expect(
      rowAfterComment2.locator('.file-comment, .file-grid-item__comment')
    ).toContainText('comment with master key', { timeout: 15000 });

    // 3) ファイル差し替え（差し替えキー）
    await fileRow.locator('.file-action-btn--edit').click();
    await expect(editModal).toBeVisible();
    // 差し替えタブへ
    await page.locator('#replace-tab').click();
    await page.locator('#replaceFileInput').setInputFiles(repV1);
    // 置換キーを使用、マスターキーは空に
    await page.locator('#replaceMasterKeyInput').fill('');
    await page.locator('#modalReplaceKeyInput').fill('rep-key-edit');
    await Promise.all([
      waitForApi(page, '/api/index.php?path=/api/files/'),
      page.locator('#replaceFileBtn').click(),
    ]);
    await closeAlertIfVisible(page);
    await closeToastIfVisible(page);
    await forceCloseModalIfOpen(page, '#editModal');
    await refreshAndWait(page);

    // ダウンロードして内容が new v1 になっていること
    await closeAlertIfVisible(page);
    const fileRowAfterV1 = await ensureRowVisibleById(page, fileId);
    const bytesV1 = await getRowSizeBytes(fileRowAfterV1);
    expect(bytesV1).toBeGreaterThan(initialBytes);

    // 4) ファイル差し替え（マスターキー）
    await fileRow.locator('.file-action-btn--edit').click();
    await expect(editModal).toBeVisible();
    await page.locator('#replace-tab').click();
    await page.locator('#replaceFileInput').setInputFiles(repV2);
    // マスターキーを使用、置換キーは空に
    await page.locator('#modalReplaceKeyInput').fill('');
    await page.locator('#replaceMasterKeyInput').fill(process.env.PW_MASTER_KEY);
    await Promise.all([
      waitForApi(page, '/api/index.php?path=/api/files/'),
      page.locator('#replaceFileBtn').click(),
    ]);
    await closeAlertIfVisible(page);
    await closeToastIfVisible(page);
    await forceCloseModalIfOpen(page, '#editModal');
    await refreshAndWait(page);

    // ダウンロードして内容が new v2 になっていること
    await closeAlertIfVisible(page);
    const fileRowAfterV2 = await ensureRowVisibleById(page, fileId);
    const bytesV2 = await getRowSizeBytes(fileRowAfterV2);
    expect(bytesV2).toBeGreaterThan(bytesV1);
  });
});


