<?php

declare(strict_types=1);

/**
 * ファイルアップロードAPI
 *
 * セキュリティ強化版のアップロード処理
 */

// 出力バッファリング開始
ob_start();

// エラー表示設定（デバッグ用）
ini_set('display_errors', '0');
ini_set('log_errors', '1'); // ログファイルにエラーを記録
error_reporting(E_ALL);
ini_set('max_execution_time', 300);
set_time_limit(300);

// APIモードかどうかを判定
$isApiMode = (strpos($_SERVER['REQUEST_URI'], '/api/') !== false);
error_log("Upload request - Method: " . $_SERVER['REQUEST_METHOD'] . ", API Mode: " . ($isApiMode ? 'true' : 'false'));

// ヘッダー設定
header('Content-Type: application/json; charset=utf-8');

try {
    // 設定とユーティリティの読み込み（絶対パスで修正）
    $baseDir = dirname(dirname(__DIR__)); // アプリケーションルートディレクトリ
    require_once $baseDir . '/backend/config/config.php';
    require_once $baseDir . '/backend/core/utils.php';

    // セキュアセッション開始（index.php と同設定を共有）
    SecurityUtils::startSecureSession();

    // APIセキュリティヘッダーの設定
    SecurityUtils::setApiSecurityHeaders();

    $configInstance = new config();
    $config = $configInstance->index();

    // アプリケーション初期化
    require_once $baseDir . '/backend/models/init.php';
    $db = initializeApp($config);

    // ログとレスポンスハンドラーの初期化
    $logger = new Logger($config['log_directory'], $config['log_level'], $db);
    $responseHandler = new ResponseHandler($logger);

    // リクエストメソッドの確認
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        $responseHandler->error('Invalid request method.', [], 405);
    }

    // ファイルがアップロードされているかチェック
    if (!isset($_FILES['file'])) {
        $responseHandler->error('No file selected.', [], 400);
    }

    // CSRFトークンの検証
    $receivedToken = $_POST['csrf_token'] ?? null;

    // CSRFトークンの検証

    if (!SecurityUtils::validateCSRFToken($receivedToken)) {
        $logger->warning('CSRF token validation failed', ['ip' => $_SERVER['REMOTE_ADDR'] ?? '']);
        $responseHandler->error('Invalid request. Please reload the page.', [], 403);
    }

    // アップロードレート制限チェック
    $clientIP = SecurityUtils::getClientIP();
    $rateLimitResult = SecurityUtils::checkUploadRateLimit(
        $clientIP,
        $config['security']['max_uploads_per_hour'] ?? 50,
        $config['security']['max_concurrent_uploads'] ?? 5
    );

    if (!$rateLimitResult['allowed']) {
        $logger->warning('Upload rate limit exceeded', [
            'ip' => $clientIP,
            'reason' => $rateLimitResult['reason']
        ]);

        // レート制限のHTTPヘッダーを設定
        header('Retry-After: ' . $rateLimitResult['retry_after']);
        $responseHandler->error($rateLimitResult['message'], [], 429);
    }

    // アップロードトークンを保存（後でリリースするため）
    $uploadToken = $rateLimitResult['upload_token'];

    // ファイルアップロードエラーチェック
    $uploadErrors = [];
    if (!isset($_FILES['file'])) {
        $uploadErrors[] = 'No file selected.';
    } else {
        switch ($_FILES['file']['error']) {
            case UPLOAD_ERR_OK:
                break;
            case UPLOAD_ERR_INI_SIZE:
                $uploadErrors[] = 'Uploaded file is too large. (max ' . ini_get('upload_max_filesize') . ')';
                break;
            case UPLOAD_ERR_FORM_SIZE:
                $uploadErrors[] = 'Uploaded file is too large. (max ' . ($_POST['MAX_FILE_SIZE'] / 1024) . 'KB)';
                break;
            case UPLOAD_ERR_PARTIAL:
                $uploadErrors[] = 'Upload was interrupted. Please try again.';
                break;
            case UPLOAD_ERR_NO_FILE:
                $uploadErrors[] = 'No file selected.';
                break;
            case UPLOAD_ERR_NO_TMP_DIR:
                $uploadErrors[] = 'Server error occurred. Please contact the administrator.';
                break;
            default:
                $uploadErrors[] = 'Upload failed.';
                break;
        }
    }

    if (!empty($uploadErrors)) {
        $responseHandler->error('Upload error', $uploadErrors, 400);
    }

    // アップロードファイルの検証
    if (!is_uploaded_file($_FILES['file']['tmp_name'])) {
        $responseHandler->error('Invalid file upload.', [], 400);
    }

    // 入力データの取得とサニタイズ
    $fileName = htmlspecialchars($_FILES['file']['name'], ENT_QUOTES, 'UTF-8');
    $comment = htmlspecialchars($_POST['comment'] ?? '', ENT_QUOTES, 'UTF-8');
    $fileSize = filesize($_FILES['file']['tmp_name']);
    $fileTmpPath = $_FILES['file']['tmp_name'];

    // フォルダIDの処理
    $folder_id = isset($_POST['folder_id']) && !empty($_POST['folder_id']) ? intval($_POST['folder_id']) : null;

    // 認証キーの処理（空のキーは認証不要として扱うため、NULLとして保存）
    $dlKey = $_POST['dlkey'] ?? '';
    // 削除キー（システムポリシーで常に必須）
    $delKey = $_POST['delkey'] ?? '';

    // バリデーション
    $validationErrors = [];

    // ファイルサイズチェック
    if ($fileSize > $config['max_file_size'] * 1024 * 1024) {
        $validationErrors[] = "File size exceeds the limit ({$config['max_file_size']}MB).";
    }

    // 拡張子チェック（ポリシー対応）
    $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    $policy = SecurityUtils::getUploadExtensionPolicy($config);
    if (!SecurityUtils::isExtensionAllowed($fileExtension, $policy)) {
        if ($policy['mode'] === 'whitelist') {
            $allowedList = implode(', ', $policy['whitelist']);
            $validationErrors[] = "File extension is not allowed (allowed: {$allowedList})";
        } elseif ($policy['mode'] === 'blacklist') {
            $blockedList = implode(', ', $policy['blacklist']);
            $validationErrors[] = "File extension is blocked (blocked: {$blockedList})";
        } else {
            $validationErrors[] = "File extension is not allowed.";
        }
    }

    // フォルダIDの存在確認（フォルダ機能が有効な場合のみ）
    if (isset($config['folders_enabled']) && $config['folders_enabled'] && $folder_id !== null) {
        $folderCheck = $db->prepare("SELECT id FROM folders WHERE id = ?");
        $folderCheck->execute([$folder_id]);
        if (!$folderCheck->fetch()) {
            $responseHandler->error('Specified folder not found.', [], 404);
        }
    }

    // コメント文字数チェック
    if (mb_strlen($comment) > $config['max_comment']) {
        $validationErrors[] = "Comment is too long (max {$config['max_comment']} characters).";
    }

    // キーの長さチェック
    if (!empty($dlKey) && mb_strlen($dlKey) < $config['security']['min_key_length']) {
        $validationErrors[] = "Download key must be at least {$config['security']['min_key_length']} characters.";
    }

    // 削除キー必須＆長さチェック（常時強制）
    if (empty($delKey)) {
        $responseHandler->error('Delete key is required.', [], 400, 'delkey_required');
    }
    if (!empty($delKey) && mb_strlen($delKey) < $config['security']['min_key_length']) {
        $validationErrors[] = "Delete key must be at least {$config['security']['min_key_length']} characters.";
    }

    if (!empty($validationErrors)) {
        $responseHandler->error('Validation error', $validationErrors, 400);
    }

    // ファイル数制限チェックと古いファイルの削除
    $fileCountStmt = $db->prepare("SELECT COUNT(id) as count, MIN(id) as min_id FROM uploaded");
    $fileCountStmt->execute();
    $countResult = $fileCountStmt->fetch();

    if ($countResult['count'] >= $config['save_max_files']) {
        // 古いファイルを削除
        $oldFileStmt = $db->prepare("SELECT id, origin_file_name, stored_file_name FROM uploaded WHERE id = :id");
        $oldFileStmt->execute(['id' => $countResult['min_id']]);
        $oldFile = $oldFileStmt->fetch();

        if ($oldFile) {
            // 物理ファイルの削除（ハッシュ化されたファイル名または旧形式に対応）
            if (!empty($oldFile['stored_file_name'])) {
                // 新形式（ハッシュ化されたファイル名）
                $oldFilePath = $config['data_directory'] . '/' . $oldFile['stored_file_name'];
            } else {
                // 旧形式（互換性のため）
                $oldFilePath = $config['data_directory'] . '/file_' . $oldFile['id'] .
                             '.' . pathinfo($oldFile['origin_file_name'], PATHINFO_EXTENSION);
            }

            if (file_exists($oldFilePath)) {
                unlink($oldFilePath);
            }

            // データベースから削除
            $deleteStmt = $db->prepare("DELETE FROM uploaded WHERE id = :id");
            $deleteStmt->execute(['id' => $oldFile['id']]);

            $logger->info('Old file deleted due to storage limit', ['deleted_file_id' => $oldFile['id']]);
        }
    }

    // ファイルハッシュの生成
    $fileHash = hash_file('sha256', $fileTmpPath);

    // 差し替えキーの取得と検証
    $replaceKey = $_POST['replacekey'] ?? '';
    if (empty($replaceKey) || trim($replaceKey) === '') {
        $responseHandler->error('差し替えキーは必須入力です。', [], 400);
    }

    // 認証キーのハッシュ化（空の場合はnull）
    $dlKeyHash = (!empty($dlKey) && trim($dlKey) !== '') ? SecurityUtils::hashPassword($dlKey) : null;
    // 削除キーハッシュ（新しいセキュリティポリシーでは使用されないが、既存互換性のため保存）
    $delKeyHash = (!empty($delKey) && trim($delKey) !== '') ? SecurityUtils::hashPassword($delKey) : null;

    // 差し替えキーの暗号化（セキュアなGCMモード使用）
    $encryptedReplaceKey = SecurityUtils::encryptSecure($replaceKey, $config['key']);

    // まず仮のデータベース登録（stored_file_nameは後で更新）
    $insertStmt = $db->prepare("
        INSERT INTO uploaded (
            origin_file_name, comment, size, count, input_date,
            dl_key_hash, del_key_hash, replace_key, file_hash, ip_address, folder_id
        ) VALUES (
            :origin_file_name, :comment, :size, :count, :input_date,
            :dl_key_hash, :del_key_hash, :replace_key, :file_hash, :ip_address, :folder_id
        )
    ");

    $insertData = [
        'origin_file_name' => $fileName,
        'comment' => $comment,
        'size' => $fileSize,
        'count' => 0,
        'input_date' => time(),
        'dl_key_hash' => $dlKeyHash,
        'del_key_hash' => $delKeyHash,
        'replace_key' => $encryptedReplaceKey,
        'file_hash' => $fileHash,
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
        'folder_id' => $folder_id
    ];

    if (!$insertStmt->execute($insertData)) {
        $errorInfo = $insertStmt->errorInfo();
        error_log('Database insert failed - Error code: ' . $errorInfo[0]);
        $responseHandler->error('Failed to save to database.', [], 500);
    }

    $fileId = (int)$db->lastInsertId();

    // セキュアなファイル名の生成（ハッシュ化）
    $hashedFileName = SecurityUtils::generateSecureFileName($fileId, $fileName);
    $storedFileName = SecurityUtils::generateStoredFileName($hashedFileName, $fileExtension);
    $saveFilePath = $config['data_directory'] . '/' . $storedFileName;

    // ファイル保存
    if (!move_uploaded_file($fileTmpPath, $saveFilePath)) {
        // データベースからも削除
        $db->prepare("DELETE FROM uploaded WHERE id = :id")->execute(['id' => $fileId]);
        $responseHandler->error('Failed to save file.', [], 500);
    }

    // データベースにハッシュ化されたファイル名を記録
    $updateStmt = $db->prepare("UPDATE uploaded SET stored_file_name = :stored_file_name WHERE id = :id");
    if (!$updateStmt->execute(['stored_file_name' => $storedFileName, 'id' => $fileId])) {
        // ファイルを削除してデータベースからも削除
        if (file_exists($saveFilePath)) {
            unlink($saveFilePath);
        }
        $db->prepare("DELETE FROM uploaded WHERE id = :id")->execute(['id' => $fileId]);
        $responseHandler->error('Failed to update file info.', [], 500);
    }

    // ファイル履歴の記録（新規アップロード）
    try {
        $historyStmt = $db->prepare(
            "INSERT INTO file_history " .
            "(file_id, new_filename, change_type, changed_at, changed_by) " .
            "VALUES (?, ?, ?, ?, ?)"
        );
        $historyStmt->execute([
            $fileId,
            $fileName,
            'file_upload',
            time(),
            $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ]);
    } catch (Exception $historyError) {
        // 履歴記録失敗時はログに記録するが処理は継続
        error_log('File history recording failed: ' . $historyError->getMessage());
    }

    // アクセスログの記録
    $logger->access($fileId, 'upload', 'success');

    // アップロード完了時にトークンを解放
    SecurityUtils::releaseUploadToken($clientIP, $uploadToken);

    // 成功レスポンス
    $responseHandler->success('File upload completed.', [
        'file_id' => $fileId,
        'file_name' => $fileName,
        'file_size' => $fileSize
    ]);
} catch (Throwable $e) {
    // 出力バッファをクリア
    if (ob_get_level()) {
        ob_clean();
    }

    // 緊急時のエラーハンドリング
    if (isset($logger)) {
        $logger->error('Upload API Error: ' . $e->getMessage(), [
            'file' => $e->getFile(),
            'line' => $e->getLine()
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
