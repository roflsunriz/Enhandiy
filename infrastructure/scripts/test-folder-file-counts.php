<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/backend/core/folder-list.php';

$db = new PDO('sqlite::memory:');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->exec('CREATE TABLE folders (id INTEGER PRIMARY KEY, name TEXT, parent_id INTEGER, created_at INTEGER)');
$db->exec('CREATE TABLE uploaded (id INTEGER PRIMARY KEY, folder_id INTEGER)');
$db->exec("INSERT INTO folders VALUES (1, 'parent', NULL, 100), (2, 'child', 1, 101), (3, 'empty', NULL, 102)");

$assertCounts = static function (array $expected) use ($db): void {
    $actual = [];
    foreach (fetchFoldersWithFileCounts($db) as $folder) {
        if (!is_int($folder['file_count']) || !isset($folder['created_at'])) {
            throw new RuntimeException('件数は整数で、既存のフォルダ情報も保持されること');
        }
        $actual[(int)$folder['id']] = $folder['file_count'];
    }
    ksort($actual);
    if ($actual !== $expected) {
        throw new RuntimeException('直下のファイル数が期待値と一致しない: ' . json_encode($actual));
    }
};

$assertCounts([1 => 0, 2 => 0, 3 => 0]);
$db->exec('INSERT INTO uploaded VALUES (1, 1), (2, 1), (3, 2), (4, NULL)');
$assertCounts([1 => 2, 2 => 1, 3 => 0]);
$db->exec('UPDATE uploaded SET folder_id = 3 WHERE id = 1');
$assertCounts([1 => 1, 2 => 1, 3 => 1]);
$db->exec('DELETE FROM uploaded WHERE id = 2');
$assertCounts([1 => 0, 2 => 1, 3 => 1]);
$db->exec('UPDATE folders SET parent_id = 3 WHERE id = 2');
$assertCounts([1 => 0, 2 => 1, 3 => 1]);

echo 'Folder direct file count tests passed.' . PHP_EOL;
