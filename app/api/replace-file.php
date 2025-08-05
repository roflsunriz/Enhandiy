<?php

/**
 * ファイル差し替え専用エンドポイント（CSRFトークン認証のみ）
 * ルーターを経由せず Authorization ヘッダー不要で呼び出す
 */

declare(strict_types=1);

// セキュリティヘッダー
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../src/Core/Utils.php';

// セキュアセッション開始
SecurityUtils::startSecureSession();

$configObj = new config();
$config = $configObj->index();

// CSRFチェック（デバッグ出力付き）
$csrfToken = $_POST['csrf_token'] ?? '';
error_log("Replace File CSRF Debug - Session ID: " . session_id());
error_log("Replace File CSRF Debug - Session csrf_token: " . ($_SESSION['csrf_token'] ?? 'NOT_SET'));
error_log("Replace File CSRF Debug - Received csrf_token: " . ($csrfToken ?: 'EMPTY'));
error_log("Replace File CSRF Debug - POST data keys: " . implode(', ', array_keys($_POST)));

if (!SecurityUtils::validateCSRFToken($csrfToken)) {
    error_log("Replace File CSRF Debug - Token validation FAILED");
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'CSRFトークンが無効です',
        'debug' => [
            'session_id' => session_id(),
            'received_token' => $csrfToken ? substr($csrfToken, 0, 8) . '...' : 'EMPTY',
            'session_has_token' => isset($_SESSION['csrf_token'])
        ]
    ]);
    exit;
}
error_log("Replace File CSRF Debug - Token validation SUCCESS");

// 機能チェック
if (!($config['allow_file_replace'] ?? false)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'ファイル差し替え機能が無効です']);
    exit;
}

$fileId = isset($_GET['id']) ? intval($_GET['id']) : 0;
if ($fileId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'file_id が不正です']);
    exit;
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ファイルが送信されていないかアップロードに失敗しました']);
    exit;
}

$replaceKeyInput = $_POST['replacekey'] ?? '';
if (trim($replaceKeyInput) === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '差し替えキーが必要です']);
    exit;
}

try {
    $dsn = 'sqlite:' . ($config['db_directory'] ?? './db') . '/uploader.db';
    $pdo = new PDO($dsn);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    // 既存ファイル確認
    $stmt = $pdo->prepare('SELECT * FROM uploaded WHERE id = ?');
    $stmt->execute([$fileId]);
    $existing = $stmt->fetch();
    if (!$existing) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'ファイルIDが見つかりません']);
        exit;
    }

    if (empty($existing['replace_key'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'このファイルには差し替えキーが設定されていません']);
        exit;
    }

    // キー検証

    // 差し替えキーの検証（レガシー形式と新形式の両方をサポート）
    try {
        // まず新しいGCM形式で試行
        $storedKey = SecurityUtils::decryptSecure($existing['replace_key'], $config['key']);
    } catch (Exception $e) {
        try {
            // レガシーのECB形式で試行（既存データとの互換性のため）
            $storedKey = SecurityUtils::decryptLegacyECB($existing['replace_key'], $config['key']);
        } catch (Exception $e2) {
            $errorMsg = "Replace key decryption failed for file ID: " . $fileId;
            $errorMsg .= " - GCM: " . $e->getMessage() . " - ECB: " . $e2->getMessage();
            error_log($errorMsg);
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => '差し替えキーの復号化に失敗しました',
                'error_code' => 'DECRYPTION_FAILED'
            ]);
            exit;
        }
    }

    if ($replaceKeyInput !== $storedKey) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => '差し替えキーが正しくありません',
            'debug' => [
                'input_length' => mb_strlen($replaceKeyInput),
                'stored_length' => $storedKey === false ? 'DECRYPTION_FAILED' : mb_strlen($storedKey),
                'decryption_success' => $storedKey !== false
            ]
        ]);
        exit;
    }

    // 保存
    $dataDir = $config['data_directory'] ?? './data';
    $originalName = SecurityUtils::escapeHtml($_FILES['file']['name']);
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    if (!in_array($ext, $config['extension'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '許可されていない拡張子です']);
        exit;
    }

    $fileSize = $_FILES['file']['size'];
    if ($fileSize > ($config['max_file_size'] * 1024 * 1024)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ファイルサイズが制限を超えています']);
        exit;
    }

    $tmp = $_FILES['file']['tmp_name'];
    $dest = $dataDir . '/file_' . $fileId . '.' . $ext;
    if (!move_uploaded_file($tmp, $dest)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'ファイルの保存に失敗しました']);
        exit;
    }

    $stmt = $pdo->prepare('UPDATE uploaded SET origin_file_name = ?, size = ? WHERE id = ?');
    $stmt->execute([$originalName, $fileSize, $fileId]);

    echo json_encode([
        'success' => true,
        'message' => 'ファイルを差し替えました',
        'file_id' => $fileId,
        'new_original_name' => $originalName,
        'size' => $fileSize
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'サーバー内部エラー']);
}
