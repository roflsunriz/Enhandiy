<?php

/**
 * ファイルリスト動的更新エンドポイント
 * 認証不要で現在のフォルダのファイル一覧を返す
 */

declare(strict_types=1);

// エラー表示設定
ini_set('display_errors', '0');
error_reporting(E_ALL);

// CORS設定
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// セッション開始
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

try {
    // 設定ファイルの読み込み
    if (!file_exists('../../config/config.php')) {
        throw new Exception('設定ファイルが見つかりません。');
    }

    require_once '../../config/config.php';
    require_once '../../src/Core/Utils.php';

    $configInstance = new config();
    $config = $configInstance->index();

    // フォルダIDの取得
    $folderId = isset($_GET['folder']) && $_GET['folder'] !== '' ? intval($_GET['folder']) : null;

    // アプリケーション初期化
    require_once '../../app/models/init.php';
    $db = initializeApp($config);

    // ファイル一覧を取得（既存のindexモデルのロジックを使用）
    $files = [];
    $folders = [];
    $breadcrumb = [];

    // フォルダ機能が有効な場合
    if ($config['folders_enabled']) {
        // フォルダ一覧取得
        $sql = "SELECT id, name, parent_id FROM folders ORDER BY name";
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $allFolders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 階層構造の構築
        $folders = buildFolderTree($allFolders);
        
        // パンくずリストの構築
        if ($folderId) {
            $breadcrumb = buildBreadcrumb($db, $folderId);
        }
    }

    // ファイル一覧取得
    if ($folderId) {
        $sql = "SELECT * FROM uploaded WHERE folder_id = ? ORDER BY input_date DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute([$folderId]);
    } else {
        $sql = "SELECT * FROM uploaded WHERE folder_id IS NULL ORDER BY input_date DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute();
    }
    
    $files = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // ファイルデータの正規化
    $normalizedFiles = [];
    foreach ($files as $file) {
        $normalizedFiles[] = [
            'id' => (int)$file['id'],
            'name' => $file['origin_file_name'],
            'original_name' => $file['origin_file_name'],
            'filename' => $file['origin_file_name'],
            'comment' => $file['comment'] ?? '',
            'password_dl' => $file['dl_key'],
            'password_del' => $file['del_key'],
            'dl_key_hash' => !empty($file['dl_key']),
            'del_key_hash' => !empty($file['del_key']),
            'file_size' => (int)$file['size'],
            'size' => (int)$file['size'],
            'mime_type' => 'application/octet-stream', // 簡略化
            'type' => 'application/octet-stream',
            'upload_date' => $file['input_date'],
            'count' => (int)$file['count'],
            'folder_id' => $file['folder_id'] ? (int)$file['folder_id'] : null,
            'max_downloads' => $file['max_downloads'] ? (int)$file['max_downloads'] : null,
            'expires_at' => $file['expires_at'] ?? null
        ];
    }

    // レスポンス
    echo json_encode([
        'success' => true,
        'files' => $normalizedFiles,
        'folders' => $folders,
        'breadcrumb' => $breadcrumb,
        'current_folder' => $folderId,
        'timestamp' => date('c')
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('c')
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * フォルダ階層構造を構築
 */
function buildFolderTree($allFolders, $parentId = null) {
    $folders = [];
    foreach ($allFolders as $folder) {
        if (($folder['parent_id'] ?? null) == $parentId) {
            $folder['children'] = buildFolderTree($allFolders, $folder['id']);
            $folders[] = $folder;
        }
    }
    return $folders;
}

/**
 * パンくずリストを構築
 */
function buildBreadcrumb($db, $folderId) {
    $breadcrumb = [];
    $currentId = $folderId;
    
    while ($currentId) {
        $sql = "SELECT id, name, parent_id FROM folders WHERE id = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute([$currentId]);
        $folder = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($folder) {
            array_unshift($breadcrumb, [
                'id' => (int)$folder['id'],
                'name' => $folder['name']
            ]);
            $currentId = $folder['parent_id'];
        } else {
            break;
        }
    }
    
    return $breadcrumb;
}