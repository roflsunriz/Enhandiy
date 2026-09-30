import { test, expect, type Page } from "@playwright/test";

interface Folder {
  id: number | string;
  file_count: number;
  children?: Folder[];
}

async function folderRequest(
  page: Page,
  name: string,
  parentId?: number,
): Promise<number> {
  return page.evaluate(
    async ({ name, parentId }) => {
      const token = (window as unknown as { config: { csrf_token: string } })
        .config.csrf_token;
      const response = await fetch("/api/index.php?path=/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        body: JSON.stringify({
          name,
          ...(parentId ? { parent_id: parentId } : {}),
        }),
      });
      if (!response.ok)
        throw new Error(`Folder creation failed: ${response.status}`);
      const payload = await response.json();
      return Number(payload.data.folder_id);
    },
    { name, parentId },
  );
}

function countsById(folders: Folder[]): Record<string, number> {
  return Object.fromEntries(
    folders.flatMap((folder) => [
      [String(folder.id), folder.file_count],
      ...Object.entries(countsById(folder.children || [])),
    ]),
  );
}

async function assertEveryList(
  page: Page,
  expected: Record<string, number>,
): Promise<void> {
  const paths = [
    "/api/index.php?path=/api/folders",
    "/api/index.php?path=/api/files&include=folders,breadcrumb&limit=1",
    "/api/folders.php",
    "/api/refresh-files.php",
  ];
  for (const path of paths) {
    const folders = await page.evaluate(async (path) => {
      const token = (window as unknown as { config: { csrf_token: string } })
        .config.csrf_token;
      const response = await fetch(path, {
        headers: { "X-CSRF-Token": token },
      });
      if (!response.ok)
        throw new Error(`Folder list failed: ${response.status}`);
      const payload = await response.json();
      if (payload.success !== true && payload.status !== "success")
        throw new Error(`Folder list failed: ${path}`);
      return (payload.data?.folders || payload.folders) as Folder[];
    }, path);
    expect(countsById(folders), path).toMatchObject(expected);
  }
  // 同じブラウザのUser-Agentとセッションで初期HTMLを取得する。
  const initialFolders = await page.evaluate(async () => {
    const response = await fetch("/");
    if (!response.ok)
      throw new Error(`Initial page failed: ${response.status}`);
    const match = (await response.text()).match(/window\.folderData = (.*?);/);
    if (!match) throw new Error("Initial folder data missing");
    return JSON.parse(match[1]) as Folder[];
  });
  expect(countsById(initialFolders)).toMatchObject(expected);
}

async function assertViews(
  page: Page,
  expected: Record<string, number>,
): Promise<void> {
  for (const view of ["grid", "list"]) {
    await page.locator(`.file-manager__view-btn[data-view="${view}"]`).click();
    for (const [id, count] of Object.entries(expected)) {
      const item = page.locator(
        `${view === "grid" ? ".folder-grid-item" : ".folder-list-item"}[data-folder-id="${id}"]`,
      );
      await expect(
        item.locator(
          view === "grid" ? ".folder-item__meta" : ".file-list__downloads",
        ),
      ).toHaveText(view === "grid" ? `${count}件のファイル` : String(count));
    }
  }
}

async function upload(
  page: Page,
  name: string,
  folderId: number,
): Promise<void> {
  await page.locator(".app-upload-trigger").click();
  await page.locator("#multipleFileInput").setInputFiles({
    name,
    mimeType: "text/plain",
    buffer: Buffer.from(name),
  });
  await page.locator("#delkeyInput").fill("folder-count-delete");
  await page.locator("#replaceKeyInput").fill("folder-count-replace");
  await page.locator("#folder-select").selectOption(String(folderId));
  await page.locator("#uploadBtn").click();
  await expect(page.locator("#uploadModal")).toBeHidden();
  if (await page.locator("#alertModal").isVisible()) {
    await closeAlert(page);
  }
  await expect(
    page
      .locator(".file-grid-item, .file-list-item")
      .filter({ hasText: name })
      .first(),
  ).toBeVisible();
}

async function closeAlert(page: Page): Promise<void> {
  await expect(page.locator("#alertModal")).toBeVisible();
  await expect(page.locator("#alertModal .modal-dialog")).toHaveCSS(
    "transform",
    "none",
  );
  await page.locator("#alertModal .btn-primary").click();
  await expect(page.locator("#alertModal")).toBeHidden();
}

async function moveFile(
  page: Page,
  name: string,
  destination: number,
): Promise<void> {
  const file = page.locator(".file-list-item").filter({ hasText: name });
  await file.locator(".file-action-btn--move").click();
  await page.locator("#promptModalInput").fill(String(destination));
  await page.locator("#promptModalOk").click();
  await expect(page.locator("#promptModal")).toBeHidden();
  await closeAlert(page);
}

async function deleteFile(page: Page, name: string): Promise<void> {
  const file = page.locator(".file-list-item").filter({ hasText: name });
  await file.locator(".file-action-btn--delete").click();
  await page.locator("#deleteAuthDelKey").fill("folder-count-delete");
  await page.locator("#deleteAuthConfirmBtn").click();
  await expect(page.locator("#deleteAuthModal")).toBeHidden();
  await closeAlert(page);
}

async function refresh(page: Page): Promise<void> {
  await page.locator(".file-manager__refresh-btn").click();
  await expect(page.locator(".file-manager__refresh-btn")).toBeEnabled();
}

test("子孫のファイル総数が全取得経路と複数階層の更新で一致する", async ({
  page,
}) => {
  test.setTimeout(120_000);
  page.setDefaultTimeout(15_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const prefix = `E2E-count-${Date.now()}`;
  const parent = await folderRequest(page, `${prefix}-parent`);
  const child = await folderRequest(page, `${prefix}-child`, parent);
  const grandchild = await folderRequest(page, `${prefix}-grandchild`, child);
  const other = await folderRequest(page, `${prefix}-other`);
  const targetChild = await folderRequest(
    page,
    `${prefix}-target-child`,
    other,
  );
  const empty = await folderRequest(page, `${prefix}-empty`);
  const counts = (
    parentCount: number,
    childCount: number,
    grandchildCount: number,
    otherCount: number,
    targetCount: number,
  ): Record<string, number> => ({
    [parent]: parentCount,
    [child]: childCount,
    [grandchild]: grandchildCount,
    [other]: otherCount,
    [targetChild]: targetCount,
    [empty]: 0,
  });
  try {
    await page.reload();
    await assertEveryList(page, counts(0, 0, 0, 0, 0));
    await assertViews(page, { [parent]: 0, [other]: 0, [empty]: 0 });
    await upload(page, `${prefix}-direct.txt`, parent);
    await assertViews(page, { [parent]: 1, [other]: 0 });
    await upload(page, `${prefix}-child.txt`, child);
    await assertEveryList(page, counts(2, 1, 0, 0, 0));
    await assertViews(page, { [parent]: 2, [other]: 0 });
    await upload(page, `${prefix}-deep.txt`, grandchild);
    await assertEveryList(page, counts(3, 2, 1, 0, 0));
    await assertViews(page, { [parent]: 3, [other]: 0, [empty]: 0 });

    // 別の枝へ移動すると、移動元と移動先の全祖先が更新される。
    await moveFile(page, `${prefix}-deep.txt`, targetChild);
    await assertViews(page, { [parent]: 2, [other]: 1 });
    await assertEveryList(page, counts(2, 1, 0, 1, 1));
    await page.reload();
    await refresh(page);
    await assertViews(page, { [parent]: 2, [other]: 1 });

    // 同じ枝の中では共通祖先の合計を二重加算・減算しない。
    await moveFile(page, `${prefix}-direct.txt`, grandchild);
    await assertEveryList(page, counts(2, 2, 1, 1, 1));
    await assertViews(page, { [parent]: 2, [other]: 1 });
    await deleteFile(page, `${prefix}-child.txt`);
    await assertEveryList(page, counts(1, 1, 1, 1, 1));
    await assertViews(page, { [parent]: 1, [other]: 1 });

    // ファイルを含む子孫ツリー自体の移動も、新旧の祖先へ反映する。
    await page.evaluate(
      async ({ child, other }) => {
        const token = (window as unknown as { config: { csrf_token: string } })
          .config.csrf_token;
        const response = await fetch(
          `/api/index.php?path=/api/folders/${child}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": token,
            },
            body: JSON.stringify({ parent_id: other }),
          },
        );
        if (!response.ok)
          throw new Error(`Folder move failed: ${response.status}`);
      },
      { child, other },
    );
    await refresh(page);
    await assertEveryList(page, counts(0, 1, 1, 2, 1));
    await assertViews(page, { [parent]: 0, [other]: 2, [empty]: 0 });
    await page
      .locator(`.folder-list-item[data-folder-id="${other}"] a.folder-item`)
      .click();
    await assertViews(page, { [child]: 1, [targetChild]: 1 });
    await page.reload();
    await assertViews(page, { [child]: 1, [targetChild]: 1 });
    await page
      .locator(`.folder-list-item[data-folder-id="${child}"] a.folder-item`)
      .click();
    await assertViews(page, { [grandchild]: 1 });
    await page
      .locator(
        `.folder-list-item[data-folder-id="${grandchild}"] a.folder-item`,
      )
      .click();
    await page.locator('.file-manager__view-btn[data-view="list"]').click();
    await deleteFile(page, `${prefix}-direct.txt`);
    await assertEveryList(page, counts(0, 0, 0, 1, 1));
    await page.goto("/");
    await assertViews(page, { [parent]: 0, [other]: 1, [empty]: 0 });
    await deleteFile(page, `${prefix}-deep.txt`);
    await assertEveryList(page, counts(0, 0, 0, 0, 0));
    await refresh(page);
    await assertViews(page, { [parent]: 0, [other]: 0, [empty]: 0 });
  } finally {
    if (!page.isClosed())
      await page.evaluate(
        async ({ ids, prefix, masterKey }) => {
          const token = (
            window as unknown as { config: { csrf_token: string } }
          ).config.csrf_token;
          const fileResponse = await fetch(
            "/api/index.php?path=/api/files&limit=100",
          );
          const files = (await fileResponse.json()).data.files as Array<{
            id: number;
            name: string;
          }>;
          const ownedFiles = files.filter((file) =>
            file.name.startsWith(prefix),
          );
          if (ownedFiles.length > 0) {
            const body = new FormData();
            ownedFiles.forEach((file) =>
              body.append("file_ids[]", String(file.id)),
            );
            body.append("master_key", masterKey);
            body.append("csrf_token", token);
            const response = await fetch(
              "/api/index.php?path=/api/files/batch",
              { method: "POST", body },
            );
            const payload = await response.json();
            if (
              !response.ok ||
              (payload.success !== true && payload.status !== "success")
            ) {
              throw new Error("Test file cleanup failed");
            }
          }
          for (const id of ids) {
            const response = await fetch(
              `/api/index.php?path=/api/folders/${id}`,
              {
                method: "DELETE",
                headers: { "X-CSRF-Token": token },
              },
            );
            if (!response.ok)
              throw new Error(`Test folder cleanup failed: ${response.status}`);
          }
        },
        {
          ids: [grandchild, child, targetChild, parent, other, empty],
          prefix,
          masterKey: process.env.PW_MASTER_KEY || "",
        },
      );
  }
});
