import { chromium, type FullConfig } from '@playwright/test';

export const E2E_FOLDER_NAMES = [
  'E2E-A',
  'E2E-A-renamed',
  'E2E-B',
  'E2E-DEL-FOLDER',
] as const;

export const E2E_FILE_NAMES = [
  'move-me.txt',
  'delete-me.txt',
  'bulk-a.txt',
  'bulk-b.txt',
  'edit-target.txt',
  'replace-v1.txt',
  'replace-v2.txt',
  'share-target.txt',
  'hello-no-key.txt',
  'hello-with-key.txt',
] as const;

type CleanupPhase = '開始前' | '終了後';

interface CleanupResult {
  deletedFolders: number;
  deletedFiles: number;
  folderErrors: string[];
  fileErrors: string[];
  remainingFolders: string[];
  remainingFiles: string[];
}

function resolveBaseUrl(config: FullConfig): string {
  const configuredBaseUrl = config.projects[0]?.use.baseURL;
  return typeof configuredBaseUrl === 'string'
    ? configuredBaseUrl
    : (process.env.PLAYWRIGHT_BASE_URL || 'http://localhost');
}

export async function cleanupE2ETestData(config: FullConfig, phase: CleanupPhase): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(resolveBaseUrl(config), { waitUntil: 'domcontentloaded' });

    const masterKey = process.env.PW_MASTER_KEY || 'fZ3MnA800JqkOy87vbktneUJT7GoxuRo';
    const result = await page.evaluate<CleanupResult, {
      targetFolders: readonly string[];
      targetFiles: readonly string[];
      masterKey: string;
    }>(async ({ targetFolders, targetFiles, masterKey: masterKeyValue }) => {
      const csrfToken = (window as unknown as { config?: { csrf_token?: string } }).config?.csrf_token || '';
      const headers = csrfToken ? { 'X-CSRF-Token': csrfToken } : {};

      const getFolders = async () => {
        const response = await fetch('/api/index.php?path=/api/folders', { headers });
        if (!response.ok) {
          throw new Error(`フォルダ一覧の取得に失敗しました (${response.status})`);
        }
        const payload = await response.json();
        return Array.isArray(payload?.data?.folders) ? payload.data.folders : [];
      };

      const flattenFolders = (roots: Array<Record<string, unknown>>) => {
        const flattened: Array<Record<string, unknown> & { depth: number }> = [];
        const visit = (folders: Array<Record<string, unknown>>, depth = 0) => {
          for (const folder of folders) {
            flattened.push({ ...folder, depth });
            if (Array.isArray(folder.children)) {
              visit(folder.children as Array<Record<string, unknown>>, depth + 1);
            }
          }
        };
        visit(roots);
        return flattened;
      };

      const getFiles = async () => {
        const allFiles: Array<Record<string, unknown>> = [];
        let currentPage = 1;
        let totalPages = 1;

        do {
          const response = await fetch(
            `/api/index.php?path=/api/files&page=${currentPage}&limit=100`,
            { headers },
          );
          if (!response.ok) {
            throw new Error(`ファイル一覧の取得に失敗しました (${response.status})`);
          }
          const payload = await response.json();
          const files = Array.isArray(payload?.data?.files)
            ? payload.data.files
            : (Array.isArray(payload?.data) ? payload.data : []);
          allFiles.push(...files);
          totalPages = Number(payload?.data?.pagination?.pages || 1);
          currentPage += 1;
        } while (currentPage <= totalPages);

        return allFiles;
      };

      const folderErrors: string[] = [];
      const foldersToDelete = flattenFolders(await getFolders())
        .filter(folder => targetFolders.includes(String(folder.name || '')))
        .sort((a, b) => b.depth - a.depth);

      let deletedFolders = 0;
      for (const folder of foldersToDelete) {
        const response = await fetch(
          `/api/index.php?path=/api/folders/${encodeURIComponent(String(folder.id))}&move_files=true`,
          { method: 'DELETE', headers },
        );
        if (response.ok) {
          deletedFolders += 1;
        } else {
          folderErrors.push(`${String(folder.name)}:${response.status}`);
        }
      }

      const fileIds = (await getFiles())
        .filter((file: Record<string, unknown>) =>
          targetFiles.includes(String(file.origin_file_name || file.name || '')),
        )
        .map((file: Record<string, unknown>) => String(file.id));

      let deletedFiles = 0;
      const fileErrors: string[] = [];
      for (let offset = 0; offset < fileIds.length; offset += 100) {
        const batch = fileIds.slice(offset, offset + 100);
        const body = new FormData();
        batch.forEach(id => body.append('file_ids[]', id));
        body.append('master_key', masterKeyValue);
        body.append('csrf_token', csrfToken);
        const response = await fetch('/api/index.php?path=/api/files/batch', {
          method: 'POST',
          body,
          headers,
        });
        const responseText = await response.text();
        let deletedCount = 0;
        try {
          const payload = JSON.parse(responseText);
          deletedCount = Number(payload?.data?.summary?.deleted_count || 0);
        } catch {
          fileErrors.push(`ファイル一括削除の応答を解析できませんでした (${response.status})`);
          continue;
        }
        if (!response.ok || deletedCount !== batch.length) {
          fileErrors.push(
            `ファイル一括削除に失敗しました (${response.status}, ${deletedCount}/${batch.length}件)`,
          );
          continue;
        }
        deletedFiles += deletedCount;
      }

      const remainingFolders = flattenFolders(await getFolders())
        .map(folder => String(folder.name || ''))
        .filter(name => targetFolders.includes(name));
      const remainingFiles = (await getFiles())
        .map((file: Record<string, unknown>) => String(file.origin_file_name || file.name || ''))
        .filter((name: string) => targetFiles.includes(name));

      return {
        deletedFolders,
        deletedFiles,
        folderErrors,
        fileErrors,
        remainingFolders,
        remainingFiles,
      };
    }, {
      targetFolders: E2E_FOLDER_NAMES,
      targetFiles: E2E_FILE_NAMES,
      masterKey,
    });

    const errors = [
      ...result.folderErrors,
      ...result.fileErrors,
      ...(result.remainingFolders.length > 0
        ? [`残存フォルダ: ${result.remainingFolders.join(', ')}`]
        : []),
      ...(result.remainingFiles.length > 0
        ? [`残存ファイル: ${result.remainingFiles.join(', ')}`]
        : []),
    ];
    if (errors.length > 0) {
      throw new Error(`E2E ${phase}クリーンアップに失敗しました: ${errors.join(' / ')}`);
    }

    console.log(
      `[E2E cleanup] ${phase}: フォルダ ${result.deletedFolders} 件、ファイル ${result.deletedFiles} 件を削除`,
    );
  } finally {
    await browser.close();
  }
}
