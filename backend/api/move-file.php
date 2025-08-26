<?php

// ファイル移動API
header('Content-Type: application/json; charset=utf-8');

// configをインクルード
include_once(__DIR__ . '/../config/config.php');
$config = new config();
$ret = $config->index();
if (!is_null($ret)) {
    if (is_array($ret)) {
        extract($ret);
    }
}

// フォルダ機能が無効な場合はエラーを返す
if (!isset($folders_enabled) || !$folders_enabled) {
    http_response_code(403);
    echo json_encode(['error' => 'Folder feature is disabled'], JSON_UNESCAPED_UNICODE);
    exit;
}

// POSTメソッドのみ許可
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

// データベースの作成・オープン
try {
    $db = new PDO('sqlite:' . $db_directory . '/uploader.db');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection error'], JSON_UNESCAPED_UNICODE);
    exit;
}

// JSONデータを取得
$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON payload'], JSON_UNESCAPED_UNICODE);
    exit;
}

$fileId = isset($data['file_id']) ? (int)$data['file_id'] : 0;
$folderId = isset($data['folder_id']) && $data['folder_id'] !== '' ? (int)$data['folder_id'] : null;

// ファイルIDの検証
if ($fileId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid file ID is required'], JSON_UNESCAPED_UNICODE);
    exit;
}

// ファイルの存在確認
$stmt = $db->prepare("SELECT id, origin_file_name, folder_id FROM uploaded WHERE id = ?");
$stmt->execute([$fileId]);
$file = $stmt->fetch();

if (!$file) {
    http_response_code(404);
    echo json_encode(['error' => 'File not found'], JSON_UNESCAPED_UNICODE);
    exit;
}

// フォルダIDの存在確認（NULLでない場合）
if ($folderId !== null) {
    $stmt = $db->prepare("SELECT id FROM folders WHERE id = ?");
    $stmt->execute([$folderId]);
    if (!$stmt->fetch()) {
        http_response_code(404);
        echo json_encode(['error' => 'Destination folder not found'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ファイルの移動（folder_idを更新）
try {
    $stmt = $db->prepare("UPDATE uploaded SET folder_id = ? WHERE id = ?");
    $stmt->execute([$folderId, $fileId]);

    $targetFolder = $folderId ? "Folder ID: $folderId" : "Root folder";

    echo json_encode([
        'message' => 'File moved',
        'file_id' => $fileId,
        'file_name' => $file['origin_file_name'],
        'old_folder_id' => $file['folder_id'],
        'new_folder_id' => $folderId,
        'target_folder' => $targetFolder
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to move file: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
