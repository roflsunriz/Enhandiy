/* global console, document, process, requestAnimationFrame, window */

import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..', '..');
const imageDirectory = path.join(repositoryRoot, 'image');
const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:37555';

const folders = [
  {
    id: 101,
    name: 'プロジェクト資料',
    parent_id: null,
    created_at: '2026-08-08 10:00:00',
    file_count: 2,
  },
  {
    id: 102,
    name: '写真アーカイブ',
    parent_id: null,
    created_at: '2026-08-08 09:30:00',
    file_count: 12,
  },
];

const files = [
  {
    id: 'gallery-file-1',
    origin_file_name: 'プロジェクト計画書.pdf',
    name: 'プロジェクト計画書.pdf',
    comment: '次回リリースに向けたロードマップと担当一覧',
    size: 2483200,
    type: 'application/pdf',
    upload_date: '2026-08-08 10:12:00',
    count: 8,
  },
  {
    id: 'gallery-file-2',
    origin_file_name: 'デザインプレビュー.png',
    name: 'デザインプレビュー.png',
    comment: 'レビュー用の最新デザイン',
    size: 1843200,
    type: 'image/png',
    upload_date: '2026-08-08 09:48:00',
    count: 3,
  },
  {
    id: 'gallery-file-3',
    origin_file_name: 'リリースノート.md',
    name: 'リリースノート.md',
    comment: '変更点と移行時の確認事項',
    size: 18432,
    type: 'text/markdown',
    upload_date: '2026-08-08 09:20:00',
    count: 1,
  },
];

async function createSeededPage(context) {
  const page = await context.newPage();

  await page.route(/\/api\/index\.php\?path=\/api\/folders(?:&|$)/, async route => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { folders } }),
    });
  });
  await page.route(/\/api\/index\.php\?path=\/api\/files\/gallery-file-1\/share(?:&|$)/, async route => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { max_downloads: null, expires_days: null },
      }),
    });
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.fileManagerInstance));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        transition-duration: 0s !important;
        caret-color: transparent !important;
      }
    `,
  });
  await page.evaluate(({ seededFolders, seededFiles }) => {
    window.folderData = seededFolders;
    window.fileData = seededFiles;
    window.fileManagerInstance?.setFiles(seededFiles);
  }, { seededFolders: folders, seededFiles: files });
  await page.locator('.folder-grid-item').first().waitFor({ state: 'visible' });
  await page.locator('.file-grid-item').first().waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

  return page;
}

async function capturePage(context, fileName, prepare, options = {}) {
  const page = await createSeededPage(context);
  try {
    if (prepare) {
      await prepare(page);
    }
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({
      path: path.join(imageDirectory, fileName),
      fullPage: options.fullPage ?? false,
      animations: 'disabled',
    });
    console.log(`updated image/${fileName}`);
  } finally {
    await page.close();
  }
}

async function openFileAction(page, action, visibleModal) {
  await page
    .locator(`.file-grid-item[data-file-id="gallery-file-1"] .file-action-btn--${action}`)
    .click();
  await page.locator(visibleModal).waitFor({ state: 'visible' });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  locale: 'ja-JP',
  viewport: { width: 1600, height: 1000 },
  colorScheme: 'light',
  deviceScaleFactor: 1,
});

try {
  await capturePage(context, 'cover.png', async page => {
    await page.setViewportSize({ width: 1600, height: 800 });
  }, { fullPage: true });

  await capturePage(context, 'upload-form.png', async page => {
    await page.setViewportSize({ width: 1600, height: 1200 });
    await page.locator('.app-upload-trigger').click();
    await page.locator('#uploadModal').waitFor({ state: 'visible' });
  });

  await capturePage(context, 'share.png', async page => {
    await openFileAction(page, 'share', '#shareLinkModal');
    await page.locator('#shareMaxDownloads').fill('25');
    await page.locator('#shareExpiresDays').fill('14');
    await page.locator('#shareLinkModalLabel').click();
  });

  await capturePage(context, 'move-file.png', async page => {
    await openFileAction(page, 'move', '#promptModal');
  });

  await capturePage(context, 'delete-file.png', async page => {
    await openFileAction(page, 'delete', '#deleteAuthModal');
  });

  await capturePage(context, 'bulk-delete.png', async page => {
    await page
      .locator('.file-grid-item[data-file-id="gallery-file-1"] input.file-checkbox')
      .check();
    await page
      .locator('.file-grid-item[data-file-id="gallery-file-2"] input.file-checkbox')
      .check();
    await page.locator('.bulk-action-btn--delete').click();
    await page.locator('#confirmModal').waitFor({ state: 'visible' });
  });

  await capturePage(context, 'edit-comment.png', async page => {
    await openFileAction(page, 'edit', '#editModal');
  });

  await capturePage(context, 'replace-file.png', async page => {
    await openFileAction(page, 'replace', '#editModal');
    await page.locator('#replaceTab').waitFor({ state: 'visible' });
  });
} finally {
  await context.close();
  await browser.close();
}
