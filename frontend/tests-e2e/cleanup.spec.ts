// @ts-nocheck
import { test, expect } from '@playwright/test';

const folderNames = new Set(['E2E-A', 'E2E-A-renamed', 'E2E-B', 'E2E-DEL-FOLDER']);
const fileNames = new Set(['move-me.txt', 'delete-me.txt', 'bulk-a.txt', 'bulk-b.txt']);

test.describe('E2E cleanup @cleanup: テスト実行後の残骸を削除する', () => {
  test('ルートに残ったテストフォルダとテストファイルを削除', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('/');

    const masterKey = process.env.PW_MASTER_KEY || 'fZ3MnA800JqkOy87vbktneUJT7GoxuRo';
    const cleanupResult = await page.evaluate(async ({ targetFolders, targetFiles, masterKeyValue }) => {
      const csrfToken = window.config?.csrf_token || '';
      const headers = csrfToken ? { 'X-CSRF-Token': csrfToken } : {};
      const folderResponse = await fetch('/api/index.php?path=/api/folders', { headers });
      const folderPayload = await folderResponse.json();
      const roots = Array.isArray(folderPayload?.data?.folders) ? folderPayload.data.folders : [];

      const flatFolders = [];
      const visit = (folders, depth = 0) => {
        for (const folder of folders) {
          flatFolders.push({ ...folder, depth });
          if (Array.isArray(folder.children)) visit(folder.children, depth + 1);
        }
      };
      visit(roots);

      const folderErrors = [];
      const foldersToDelete = flatFolders
        .filter(folder => targetFolders.includes(folder.name))
        .sort((a, b) => b.depth - a.depth);
      for (const folder of foldersToDelete) {
        const response = await fetch(
          `/api/index.php?path=/api/folders/${encodeURIComponent(String(folder.id))}&move_files=true`,
          { method: 'DELETE', headers },
        );
        if (!response.ok) {
          folderErrors.push(`${folder.name}:${response.status}`);
        }
      }

      const filesResponse = await fetch('/api/index.php?path=/api/files');
      const filesPayload = await filesResponse.json();
      const files = Array.isArray(filesPayload?.data?.files)
        ? filesPayload.data.files
        : (Array.isArray(filesPayload?.data) ? filesPayload.data : []);
      const fileIds = files
        .filter(file => targetFiles.includes(file.origin_file_name || file.name))
        .map(file => String(file.id));

      let fileCleanup = { ok: true, status: 200, body: '' };
      if (fileIds.length > 0) {
        const body = new FormData();
        fileIds.forEach(id => body.append('file_ids[]', id));
        body.append('master_key', masterKeyValue);
        body.append('csrf_token', csrfToken);
        const response = await fetch('/api/index.php?path=/api/files/batch', {
          method: 'POST',
          body,
          headers,
        });
        fileCleanup = { ok: response.ok, status: response.status, body: await response.text() };
      }

      return { folderErrors, fileCleanup };
    }, {
      targetFolders: [...folderNames],
      targetFiles: [...fileNames],
      masterKeyValue: masterKey,
    });

    expect(cleanupResult.folderErrors).toEqual([]);
    expect(cleanupResult.fileCleanup, cleanupResult.fileCleanup.body).toMatchObject({ ok: true });

    await page.reload();
    for (const name of folderNames) {
      await expect(page.locator('#folder-grid .folder-name', { hasText: name })).toHaveCount(0);
    }
    for (const name of fileNames) {
      await expect(page.locator(`.file-name:has-text("${name}"), .file-grid-item__name[title="${name}"]`)).toHaveCount(0);
    }
  });
});
