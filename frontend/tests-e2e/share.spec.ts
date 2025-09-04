// @ts-nocheck
import { test, expect } from '@playwright/test';
import { delay } from './helpers/delay';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

test.describe('共有リンクフロー', () => {
  test('共有リンク生成とコピー、制限設定の反映、DL回数制限', async ({ page, context, request }) => {
    // 事前権限（クリップボード）
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost' });

    // アップロード用一時ファイル
    const dir = mkdtempSync(join(tmpdir(), 'e2e-share-'));
    const filePath = join(dir, 'share-target.txt');
    writeFileSync(filePath, 'share flow test');

    await page.goto('/');
    await delay('low');

    // アップロードモーダルを開く
    await page.locator('button[data-bs-target="#uploadModal"]').click();
    await delay('medium');
    await expect(page.locator('#uploadModal')).toBeVisible();

    // ファイル選択と必須キー入力
    await page.locator('#multipleFileInput').setInputFiles(filePath);
    await delay('low');
    await page.locator('#delkeyInput').fill('delete-key-share');
    await delay('low');
    await page.locator('#replaceKeyInput').fill('replace-key-share');
    await delay('low');
    await page.locator('#uploadBtn').click();
    await delay('high');

    // 一覧/グリッドに反映
    const listRow = page.locator('.file-list-item:has(.file-name:has-text("share-target.txt"))').first();
    const gridItem = page.locator('.file-grid-item:has(.file-grid-item__name[title="share-target.txt"])').first();
    const fileRow = listRow.or(gridItem);
    await expect(fileRow).toBeVisible({ timeout: 15000 });

    // 共有ボタンでモーダル起動
    await fileRow.locator('.file-action-btn--share').first().click();
    await delay('medium');
    const shareModal = page.locator('#shareLinkModal');
    await expect(shareModal).toBeVisible();

    // ダウンロード数のみ設定（ユーザー要望の流れに合わせる）
    await page.locator('#shareMaxDownloads').fill('2');
    await delay('low');
    await expect(page.locator('#currentMaxDownloads')).toContainText('2');

    // 設定保存→共有リンク生成→クリップボード確認→コピーボタン→クリップボード確認
    await page.locator('#saveShareSettingsBtn').click();
    await delay('medium');
    // 共有リンク生成（生成直後に自動でクリップボードへコピーされる仕様）
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost' });
    await page.evaluate(() => navigator.clipboard.writeText('PREV'));
    await delay('low');
    await page.locator('#generateShareLinkBtn').click();
    await delay('high');
    const resultPanel = page.locator('#shareResultPanel');
    await expect(resultPanel).toBeVisible();
    const shareUrlInput = page.locator('#shareUrlTextField');
    await expect(shareUrlInput).toHaveValue(/http:\/\/localhost/);
    const shareUrl = await shareUrlInput.inputValue();
    // 生成直後にクリップボードへ反映されていることを確認
    const afterGenerateClipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(afterGenerateClipboard.trim()).toBe(shareUrl.trim());

    // コピーボタンでもクリップボードに同内容がコピーされることを再確認
    await page.locator('#copyShareUrlBtn').click();
    await delay('medium');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied.trim()).toBe(shareUrl.trim());

    // モーダルを閉じる
    await page.locator('#shareLinkModal .btn[data-bs-dismiss="modal"]').click();
    await delay('medium');
    await expect(shareModal).toBeHidden();

    // ダウンロード回数制限: 2回は成功、3回目で無効化
    // 1回目（HTTPリクエスト）。200または302を許容（実装差異吸収）。
    const res1 = await request.get(shareUrl, { maxRedirects: 0 });
    expect([200, 302]).toContain(res1.status());
    // 2回目
    const res2 = await request.get(shareUrl, { maxRedirects: 0 });
    expect([200, 302]).toContain(res2.status());
    // UIは自動更新されないことがあるため、DL回数の数値表示は検証しない
    // 3回目は制限超過（リダイレクトで error=limit_exceeded）
    const res3 = await request.get(shareUrl, { maxRedirects: 0 });
    expect(res3.status()).toBeGreaterThanOrEqual(300);
    expect(res3.status()).toBeLessThan(400);
    const loc = res3.headers()['location'] || '';
    expect(loc === './' || /error=limit_exceeded/.test(loc)).toBeTruthy();
  });
});


