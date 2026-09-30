<?php

declare(strict_types=1);

/**
 * 全一覧経路で、自身と子孫フォルダに所属するファイルの総数を返す。
 *
 * @return array<int, array<string, mixed>>
 */
function fetchFoldersWithFileCounts(PDO $db): array
{
    $statement = $db->query(
        'SELECT f.*, COALESCE(files.file_count, 0) AS file_count
         FROM folders f
         LEFT JOIN (
             SELECT folder_id, COUNT(*) AS file_count
             FROM uploaded
             GROUP BY folder_id
         ) files ON files.folder_id = f.id
         ORDER BY f.name'
    );
    $folders = $statement->fetchAll(PDO::FETCH_ASSOC);
    $indexes = [];
    foreach ($folders as $index => &$folder) {
        $folder['file_count'] = (int)$folder['file_count'];
        $indexes[(int)$folder['id']] = $index;
    }
    unset($folder);

    // 1回の取得結果を葉から祖先へ集計する。N+1クエリと深いPHP再帰を避ける。
    $parents = [];
    $pendingChildren = array_fill(0, count($folders), 0);
    foreach ($folders as $index => $folder) {
        $parent = $folder['parent_id'] === null ? null : ($indexes[(int)$folder['parent_id']] ?? null);
        $parents[$index] = $parent;
        if ($parent !== null) {
            $pendingChildren[$parent]++;
        }
    }
    $ready = [];
    foreach ($pendingChildren as $index => $pending) {
        if ($pending === 0) {
            $ready[] = $index;
        }
    }
    for ($cursor = 0; $cursor < count($ready); $cursor++) {
        $index = $ready[$cursor];
        $parent = $parents[$index];
        if ($parent !== null) {
            $folders[$parent]['file_count'] += $folders[$index]['file_count'];
            if (--$pendingChildren[$parent] === 0) {
                $ready[] = $parent;
            }
        }
    }
    if (count($ready) !== count($folders)) {
        throw new RuntimeException('Folder hierarchy contains a cycle');
    }

    return $folders;
}
