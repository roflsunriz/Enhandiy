<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/backend/core/folder-list.php';

$db = new class ('sqlite::memory:') extends PDO
{
    public int $queries = 0;

    public function query(string $query, ?int $fetchMode = null, mixed ...$fetchModeArgs): PDOStatement|false
    {
        $this->queries++;
        return $fetchMode === null ? parent::query($query) : parent::query($query, $fetchMode, ...$fetchModeArgs);
    }
};
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->exec('CREATE TABLE folders (id INTEGER PRIMARY KEY, name TEXT, parent_id INTEGER, created_at INTEGER)');
$db->exec('CREATE TABLE uploaded (id INTEGER PRIMARY KEY, folder_id INTEGER)');
$db->exec(
    "INSERT INTO folders VALUES (1, 'parent', NULL, 100), (2, 'child', 1, 101), (3, 'other', NULL, 102),
     (4, 'grandchild', 2, 103), (5, 'other-child', 3, 104), (6, 'empty', NULL, 105)"
);

$assertCounts = static function (array $expected) use ($db): void {
    $actual = [];
    $queriesBefore = $db->queries;
    foreach (fetchFoldersWithFileCounts($db) as $folder) {
        if (!is_int($folder['file_count']) || !isset($folder['created_at'])) {
            throw new RuntimeException('件数は整数で、既存のフォルダ情報も保持されること');
        }
        $actual[(int)$folder['id']] = $folder['file_count'];
    }
    ksort($actual);
    if ($actual !== $expected) {
        throw new RuntimeException('子孫を含むファイル総数が期待値と一致しない: ' . json_encode($actual));
    }
    if ($db->queries - $queriesBefore !== 1) {
        throw new RuntimeException('フォルダ数や階層の深さによらず取得クエリは1回であること');
    }
};

$assertCounts([1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0, 6 => 0]);
$db->exec('INSERT INTO uploaded VALUES (1, 1), (2, 1), (3, 2), (4, NULL), (5, 4), (6, 5)');
$assertCounts([1 => 4, 2 => 2, 3 => 1, 4 => 1, 5 => 1, 6 => 0]);
$db->exec('UPDATE uploaded SET folder_id = 5 WHERE id = 5');
$assertCounts([1 => 3, 2 => 1, 3 => 2, 4 => 0, 5 => 2, 6 => 0]);
$db->exec('UPDATE uploaded SET folder_id = 4 WHERE id = 1');
$assertCounts([1 => 3, 2 => 2, 3 => 2, 4 => 1, 5 => 2, 6 => 0]);
$db->exec('DELETE FROM uploaded WHERE id = 3');
$assertCounts([1 => 2, 2 => 1, 3 => 2, 4 => 1, 5 => 2, 6 => 0]);
$db->exec('UPDATE folders SET parent_id = 3 WHERE id = 2');
$assertCounts([1 => 1, 2 => 1, 3 => 3, 4 => 1, 5 => 2, 6 => 0]);
$db->exec('DELETE FROM uploaded WHERE id = 1');
$assertCounts([1 => 1, 2 => 0, 3 => 2, 4 => 0, 5 => 2, 6 => 0]);
$db->exec('UPDATE uploaded SET folder_id = NULL WHERE folder_id = 5');
$db->exec('DELETE FROM folders WHERE id = 5');
$assertCounts([1 => 1, 2 => 0, 3 => 0, 4 => 0, 6 => 0]);
$db->exec("INSERT INTO folders VALUES (7, 'orphan', 999, 106)");
$db->exec('INSERT INTO uploaded VALUES (7, 7)');
$assertCounts([1 => 1, 2 => 0, 3 => 0, 4 => 0, 6 => 0, 7 => 1]);

$db->exec('DELETE FROM uploaded');
$db->exec('DELETE FROM folders');
$assertCounts([]);
$db->beginTransaction();
$insert = $db->prepare('INSERT INTO folders VALUES (?, ?, ?, ?)');
for ($id = 1; $id <= 5000; $id++) {
    $insert->execute([$id, (string)$id, $id === 1 ? null : $id - 1, $id]);
}
$db->commit();
$db->exec('INSERT INTO uploaded VALUES (1, 5000), (2, 1), (3, NULL)');
$expected = array_fill(1, 5000, 1);
$expected[1] = 2;
$assertCounts($expected);

// 壊れた木でも無限ループや不完全な件数の返却をしない。
$db->exec('UPDATE folders SET parent_id = 5000 WHERE id = 1');
$cycleRejected = false;
try {
    fetchFoldersWithFileCounts($db);
} catch (RuntimeException $e) {
    $cycleRejected = str_contains($e->getMessage(), 'cycle');
}
if (!$cycleRejected) {
    throw new RuntimeException('循環したフォルダ構造を検出すること');
}

echo 'Folder recursive file count tests passed (including 5000 levels, one query and cycle detection).' . PHP_EOL;
