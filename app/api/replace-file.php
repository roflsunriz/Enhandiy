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

// CSRFトークン検証
$csrfToken = $_POST['csrf_token'] ?? '';

if (!SecurityUtils::validateCSRFToken($csrfToken)) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'CSRFトークンが無効です'
    ]);
    exit;
}

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

    // データベース更新
    $stmt = $pdo->prepare('UPDATE uploaded SET origin_file_name = ?, size = ? WHERE id = ?');
    $updateSuccess = $stmt->execute([$originalName, $fileSize, $fileId]);

    if ($updateSuccess) {
        // 履歴記録（ファイル差し替え履歴）
        try {
            $historyStmt = $pdo->prepare(
                "INSERT INTO file_history " .
                "(file_id, old_filename, new_filename, change_type, changed_at, changed_by) " .
                "VALUES (?, ?, ?, ?, ?, ?)"
            );
            $historyStmt->execute([
                $fileId,
                $existing['origin_file_name'],  // 元のファイル名
                $originalName,                  // 新しいファイル名
                'file_replace',
                time(),
                $_SERVER['REMOTE_ADDR'] ?? 'unknown' // IPアドレスを記録
            ]);
        } catch (Exception $historyError) {
            // 履歴記録失敗時はログに記録するが処理は継続
            error_log('File history recording failed: ' . $historyError->getMessage());
        }
    }

    echo json_encode([
        'success' => true,
        'message' => 'ファイルを差し替えました',
        'file_id' => $fileId,
        'old_filename' => $existing['origin_file_name'],
        'new_original_name' => $originalName,
        'old_size' => $existing['size'],
        'new_size' => $fileSize,
        'history_recorded' => $updateSuccess
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'サーバー内部エラー']);
}
