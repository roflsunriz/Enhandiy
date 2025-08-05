<?php

/**
 * ファイルリスト動的更新エンドポイント
 * 認証不要で現在のフォルダのファイル一覧を返す
 */

declare(strict_types=1);

// phpcs:disable PSR1.Files.SideEffects
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

require_once '../../src/Core/Utils.php';

// セキュアセッション開始
SecurityUtils::startSecureSession();

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

    // 単一ファイル取得モードのチェック
    $singleFileId = isset($_GET['single_file']) && $_GET['single_file'] !== '' ? intval($_GET['single_file']) : null;

    // アプリケーション初期化
    require_once '../../app/models/init.php';
    $db = initializeApp($config);

    // 単一ファイル取得モード
    if ($singleFileId) {
        $sql = "SELECT * FROM uploaded WHERE id = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute([$singleFileId]);
        $fileData = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$fileData) {
            throw new Exception('指定されたファイルが見つかりません。');
        }

        // 単一ファイル情報をレスポンス
        $normalizedFile = [
            'id' => (int)$fileData['id'],
            'name' => $fileData['origin_file_name'],
            'original_name' => $fileData['origin_file_name'],
            'filename' => $fileData['origin_file_name'],
            'comment' => $fileData['comment'] ?? '',
            'password_dl' => $fileData['dl_key_hash'] ?? null,
            'password_del' => $fileData['del_key_hash'] ?? null,
            'dl_key_hash' => !empty($fileData['dl_key_hash']),
            'del_key_hash' => !empty($fileData['del_key_hash']),
            'replace_key_required' => true, // 差し替えキー要件（全ファイル必須）
            'file_size' => (int)$fileData['size'],
            'size' => (int)$fileData['size'],
            'mime_type' => 'application/octet-stream',
            'type' => 'application/octet-stream',
            'upload_date' => date('Y-m-d H:i:s', (int)$fileData['input_date']),
            'input_date' => (int)$fileData['input_date'],
            'count' => (int)$fileData['count'],
            'folder_id' => $fileData['folder_id'] ? (int)$fileData['folder_id'] : null,
            'max_downloads' => $fileData['max_downloads'] ? (int)$fileData['max_downloads'] : null,
            'expires_at' => $fileData['expires_at'] ?? null
        ];

        echo json_encode([
            'success' => true,
            'file' => $normalizedFile,
            'timestamp' => date('c')
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

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

    // データベース全体のファイル数をチェック
    $countSql = "SELECT COUNT(*) as total FROM uploaded";
    $countStmt = $db->prepare($countSql);
    $countStmt->execute();
    $totalFiles = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
    error_log("refresh-files.php: データベース内総ファイル数: $totalFiles");

    // ルートフォルダのファイル数をチェック
    $rootCountSql = "SELECT COUNT(*) as root_total FROM uploaded WHERE folder_id IS NULL";
    $rootCountStmt = $db->prepare($rootCountSql);
    $rootCountStmt->execute();
    $rootTotalFiles = $rootCountStmt->fetch(PDO::FETCH_ASSOC)['root_total'];
    error_log("refresh-files.php: ルートフォルダのファイル数: $rootTotalFiles");

    // ファイル一覧取得（全ファイル表示版）
    if ($folderId) {
        $sql = "SELECT * FROM uploaded WHERE folder_id = ? ORDER BY input_date DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute([$folderId]);
        error_log("refresh-files.php: フォルダ指定でのファイル取得 - folder_id: $folderId");
    } else {
        // ルートフォルダ表示時は全てのファイルを表示（初期表示と一致させる）
        $sql = "SELECT * FROM uploaded ORDER BY input_date DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute();
        error_log("refresh-files.php: ルートフォルダでの全ファイル取得 - SQL: $sql");
    }

    $files = $stmt->fetchAll(PDO::FETCH_ASSOC);
    error_log("refresh-files.php: 実際に取得したファイル数: " . count($files));

    // 各ファイルのIDをログ出力
    $fileIds = array_map(
        function ($file) {
            return $file['id'];
        },
        $files
    );
    error_log("refresh-files.php: 取得したファイルID: " . implode(', ', $fileIds));

    // ファイルデータの正規化
    $normalizedFiles = [];
    foreach ($files as $file) {
        $normalizedFiles[] = [
            'id' => (int)$file['id'],
            'name' => $file['origin_file_name'],
            'original_name' => $file['origin_file_name'],
            'filename' => $file['origin_file_name'],
            'comment' => $file['comment'] ?? '',
            'password_dl' => $file['dl_key_hash'] ?? null,
            'password_del' => $file['del_key_hash'] ?? null,
            'dl_key_hash' => !empty($file['dl_key_hash']),
            'del_key_hash' => !empty($file['del_key_hash']),
            'replace_key_required' => true, // 差し替えキー要件（全ファイル必須）
            'file_size' => (int)$file['size'],
            'size' => (int)$file['size'],
            'mime_type' => 'application/octet-stream', // 簡略化
            'type' => 'application/octet-stream',
            'upload_date' => date('Y-m-d H:i:s', (int)$file['input_date']),
            'input_date' => (int)$file['input_date'],
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
function buildFolderTree($allFolders, $parentId = null)
{
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
function buildBreadcrumb($db, $folderId)
{
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
