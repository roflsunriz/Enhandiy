<?php

// phpcs:disable PSR1.Files.SideEffects

// 既存の uploaded レコードで stored_file_name が NULL のものを安全に補完するスクリプト
// 旧形式の命名規則: file_{id}.{ext}

require_once(__DIR__ . '/../config/config.php');

try {
	$config = new config();
	$ret = $config->index();
	if (!is_null($ret) && is_array($ret)) {
		extract($ret);
	}

	$db = new PDO('sqlite:' . $db_directory . '/uploader.db');
	$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (Exception $e) {
	fwrite(STDERR, "DB接続エラー: " . $e->getMessage() . "\n");
	exit(1);
}

$dataDir = rtrim($data_directory, DIRECTORY_SEPARATOR);

// 対象行を取得
$stmt = $db->prepare("SELECT id, origin_file_name FROM uploaded WHERE stored_file_name IS NULL");
$stmt->execute();
$rows = $stmt->fetchAll();

$updated = 0;
$skipped = 0;

foreach ($rows as $row) {
	$id = (int)$row['id'];
	$origin = (string)$row['origin_file_name'];
	$ext = pathinfo($origin, PATHINFO_EXTENSION);
	$guessed = 'file_' . $id . ($ext !== '' ? ('.' . $ext) : '');
	$path = $dataDir . DIRECTORY_SEPARATOR . $guessed;

	if ($ext === '') {
		$skipped++;
		continue;
	}

	if (!file_exists($path)) {
		$skipped++;
		continue;
	}

	$upd = $db->prepare("UPDATE uploaded SET stored_file_name = :name WHERE id = :id");
	if ($upd->execute([':name' => $guessed, ':id' => $id])) {
		$updated++;
	}
}

echo "補完完了: 更新 {$updated} 件, スキップ {$skipped} 件\n";


