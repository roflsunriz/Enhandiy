<?php

declare(strict_types=1);

/**
 * 削除検証API
 *
 * ハッシュ化された削除キーの検証とワンタイムトークンの生成
 */

// エラー表示設定
ini_set('display_errors', '0');
ini_set('log_errors', '1'); // ログファイルにエラーを記録
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

try {
    // 設定とユーティリティの読み込み
    require_once __DIR__ . '/../config/config.php';
    require_once __DIR__ . '/../core/utils.php';

    // セキュアセッション開始
    SecurityUtils::startSecureSession();

    $configInstance = new config();
    $config = $configInstance->index();

    // アプリケーション初期化
    require_once __DIR__ . '/../models/init.php';
    $db = initializeApp($config);

    // ログとレスポンスハンドラーの初期化
    $logger = new Logger($config['log_directory'], $config['log_level'], $db);
    $responseHandler = new ResponseHandler($logger);

    // 入力データの取得
    $fileId = (int)($_POST['id'] ?? 0);
    $inputKey = $_POST['key'] ?? '';

    if ($fileId <= 0) {
        $responseHandler->error('File ID is not specified.', [], 400);
    }

    // CSRFトークンの検証
    if (!SecurityUtils::validateCSRFToken($_POST['csrf_token'] ?? '')) {
        $logger->warning('CSRF token validation failed in delete verify', ['file_id' => $fileId]);
        $responseHandler->error('Invalid request. Please reload the page.', [], 403);
    }

    // ファイル情報の取得
    $fileStmt = $db->prepare("SELECT * FROM uploaded WHERE id = :id");
    $fileStmt->execute(['id' => $fileId]);
    $fileData = $fileStmt->fetch();

    if (!$fileData) {
        $logger->warning('File not found for delete', ['file_id' => $fileId]);
        $responseHandler->error('File not found.', [], 404);
    }

    // マスターキーチェック＋削除キー検証（常時必須）
    $isValidAuth = false;
    if ($inputKey === $config['master']) {
        $isValidAuth = true;
        $logger->info('Master key used for delete', ['file_id' => $fileId]);
    } else {
        // ファイル側に削除キーが未設定の場合も許可しない（レガシーデータ対策）
        if (!empty($fileData['del_key_hash']) && !empty($inputKey)) {
            $isValidAuth = SecurityUtils::verifyPassword($inputKey, $fileData['del_key_hash']);
        } else {
            $isValidAuth = false;
        }
    }

    if (!$isValidAuth) {
        // 削除キー未入力または未設定（レガシーデータ）
        if (empty($inputKey)) {
            $logger->info('Delete key required', ['file_id' => $fileId]);
            // UIは200でエラーメッセージを読んでモーダル再入力フローに入る
            $responseHandler->error('Delete key is required.', [], 200, 'AUTH_REQUIRED');
        }

        // ファイル側に削除キーが存在しない場合
        if (empty($fileData['del_key_hash'])) {
            $logger->warning(
                'Delete key not set on file; deletion denied without master',
                ['file_id' => $fileId]
            );
            $responseHandler->error(
                'This file does not have a delete key. Master key is required to delete.',
                [],
                403,
                'DELKEY_NOT_SET'
            );
        }

        // キーが間違っている場合
        $logger->warning('Invalid delete key', ['file_id' => $fileId]);
        $responseHandler->error('Invalid delete key.', [], 200, 'INVALID_KEY');
        exit;  // 追加: 認証失敗時は処理を中断してトークン生成を防止
    }

    // 既存の期限切れトークンをクリーンアップ
    $cleanupStmt = $db->prepare("DELETE FROM access_tokens WHERE expires_at < :now");
    $cleanupStmt->execute(['now' => time()]);

    // ワンタイムトークンの生成
    $token = SecurityUtils::generateRandomToken(32);
    $expiresAt = time() + ($config['token_expiry_minutes'] * 60);

    // トークンをデータベースに保存
    $tokenStmt = $db->prepare("
        INSERT INTO access_tokens (file_id, token, token_type, expires_at, ip_address)
        VALUES (:file_id, :token, :token_type, :expires_at, :ip_address)
    ");

    $tokenData = [
        'file_id' => $fileId,
        'token' => $token,
        'token_type' => 'delete',
        'expires_at' => $expiresAt,
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null
    ];

    if (!$tokenStmt->execute($tokenData)) {
        $responseHandler->error('Failed to generate delete token.', [], 500);
    }

    // アクセスログの記録
    $logger->access($fileId, 'delete_verify', 'success');

    // 成功レスポンス
    $responseHandler->success('Delete preparation completed.', [
        'id' => $fileId,
        'token' => $token,
        'expires_at' => $expiresAt,
        'file_name' => $fileData['origin_file_name']
    ]);
} catch (Exception $e) {
    // 緊急時のエラーハンドリング
    if (isset($logger)) {
        $logger->error('Delete verify API Error: ' . $e->getMessage(), [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'file_id' => $fileId ?? null
        ]);
    }

    if (isset($responseHandler)) {
        $responseHandler->error('A system error has occurred.', [], 500);
    } else {
        // 最低限のエラーレスポンス
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'A system error has occurred.'
        ], JSON_UNESCAPED_UNICODE);
    }
}
