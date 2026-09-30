<?php

declare(strict_types=1);

/**
 * 全一覧経路で、子孫を含まないフォルダ直下のファイル数を返す。
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
    foreach ($folders as &$folder) {
        $folder['file_count'] = (int)$folder['file_count'];
    }
    unset($folder);

    return $folders;
}
