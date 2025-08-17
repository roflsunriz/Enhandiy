<?php

// phpcs:disable PSR1.Files.SideEffects

/**
 * Tus.io プロトコル対応アップロードAPI
 * phpUploader - Tus.io Server Implementation
 */

// タイムアウト設定（本番環境用）
ini_set('display_errors', 0);
ini_set('max_execution_time', 0);
set_time_limit(0);

// Tus.ioリクエスト処理開始

// CORS対応
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PATCH, HEAD, OPTIONS');
header('Access-Control-Allow-Headers: Upload-Offset, Upload-Length, Upload-Metadata, Tus-Resumable, Content-Type');
header('Access-Control-Expose-Headers: Upload-Offset, Upload-Length, Tus-Resumable, Location');

// セッション開始（CSRFトークン検証のため）
// セキュリティクラスがまだ読み込まれていない場合の対処
if (!class_exists('SecurityUtils')) {
    require_once __DIR__ . '/../core/utils.php';
}
if (session_status() === PHP_SESSION_NONE) {
    SecurityUtils::startSecureSession();
}

// Tus.ioバージョン
$tus_version = '1.0.0';
header('Tus-Resumable: ' . $tus_version);

//configをインクルード
include_once(__DIR__ . '/../config/config.php');
require_once(__DIR__ . '/../core/utils.php');
$config = new config();
$ret = $config->index();
if (!is_null($ret) && is_array($ret)) {
    extract($ret);
}

// データベース接続
try {
    $db = new PDO('sqlite:' . $db_directory . '/uploader.db');
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// ---------- DB スキーマ確認: upload_token / client_ip が無い旧環境に自動対応 ----------
try {
    $columnsRes = $db->query("PRAGMA table_info(tus_uploads);");
    $columns = $columnsRes ? $columnsRes->fetchAll(PDO::FETCH_COLUMN, 1) : [];
    if ($columns && !in_array('upload_token', $columns, true)) {
        $db->exec("ALTER TABLE tus_uploads ADD COLUMN upload_token TEXT");
    }
    if ($columns && !in_array('client_ip', $columns, true)) {
        $db->exec("ALTER TABLE tus_uploads ADD COLUMN client_ip TEXT");
    }
} catch (Exception $e) {
    error_log('Schema auto-update failed: ' . $e->getMessage());
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'OPTIONS':
            handleOptions();
            break;
        case 'POST':
            handleCreate();
            break;
        case 'PATCH':
            handlePatch();
            break;
        case 'HEAD':
            handleHead();
            break;
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed', 'method' => $method]);
            break;
    }
} catch (Throwable $e) {
    error_log("Tus.io Error: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error',
        'message' => $e->getMessage(),
        'debug' => [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'method' => $method
        ]
    ]);
}

/**
 * OPTIONSリクエスト - サーバー機能を返す
 */
function handleOptions()
{
    global $tus_version, $max_file_size;

    header('Tus-Version: ' . $tus_version);
    header('Tus-Extension: creation,expiration');
    header('Tus-Max-Size: ' . ($max_file_size * 1024 * 1024));
    header('Tus-Checksum-Algorithm: sha1,md5');
    http_response_code(204);
}

/**
 * POSTリクエスト - 新しいアップロードセッション作成
 */
function handleCreate()
{
    global $db, $data_directory, $max_file_size, $config, $key, $ret;

    // Upload-Lengthヘッダーをチェック
    $uploadLength = $_SERVER['HTTP_UPLOAD_LENGTH'] ?? null;
    if (!$uploadLength || !is_numeric($uploadLength)) {
        http_response_code(400);
        echo json_encode(['error' => 'Upload-Length header required']);
        exit;
    }

    $fileSize = intval($uploadLength);

    // ファイルサイズチェック
    if ($fileSize > $max_file_size * 1024 * 1024) {
        http_response_code(413);
        echo json_encode(['error' => 'File size exceeds limit']);
        exit;
    }

    // TUSアップロードのレート制限チェック
    $clientIP = SecurityUtils::getClientIP();
    $rateLimitResult = SecurityUtils::checkUploadRateLimit(
        $clientIP,
        $ret['security']['max_uploads_per_hour'] ?? 50,
        $ret['security']['max_concurrent_uploads'] ?? 5
    );

    if (!$rateLimitResult['allowed']) {
        error_log("TUS upload rate limit exceeded for IP: {$clientIP}, reason: {$rateLimitResult['reason']}");

        http_response_code(429);
        header('Retry-After: ' . $rateLimitResult['retry_after']);
        echo json_encode([
            'error' => $rateLimitResult['message'],
            'retry_after' => $rateLimitResult['retry_after']
        ]);
        exit;
    }

    $uploadToken = $rateLimitResult['upload_token'];

    // メタデータの解析
    $metadata = parseMetadata($_SERVER['HTTP_UPLOAD_METADATA'] ?? '');

    // CSRFトークンの検証（メタデータから取得）
    $csrfToken = $metadata['csrf_token'] ?? null;

    // CSRFトークン検証

    if (!SecurityUtils::validateCSRFToken($csrfToken)) {
        error_log("TUS upload CSRF validation failed for IP: {$clientIP}");

        // 取得済みの同時並行トークンを解放してレートリミットを回復させる
        if (isset($uploadToken)) {
            SecurityUtils::releaseUploadToken($clientIP, $uploadToken);
            error_log("TUS CSRF fail - released upload token: {$uploadToken}");
        }

        http_response_code(403);
        echo json_encode(['error' => 'Invalid CSRF token']);
        exit;
    }

    // アップロードIDを生成
    $uploadId = generateUploadId();
    $currentTime = time();
    $expiresAt = $currentTime + (24 * 60 * 60); // 24時間で期限切れ

    // チャンクファイルのパス
    $chunkPath = $data_directory . '/chunks/' . $uploadId . '.chunk';

    // チャンクディレクトリが存在しない場合は作成
    $chunkDir = dirname($chunkPath);
    if (!is_dir($chunkDir)) {
        mkdir($chunkDir, 0755, true);
    }

    // データベースに記録
    try {
        // 差し替えキーの検証（システムレベルで必須）
        if (empty($metadata['replacekey'])) {
            // 差し替えキー不足でエラーの場合もトークンを解放
            if (isset($uploadToken)) {
                SecurityUtils::releaseUploadToken($clientIP, $uploadToken);
            }

            http_response_code(400);
            echo json_encode(['error' => '差し替えキーは必須です。']);
            exit;
        }

        // 削除キーの検証（システムレベルで必須）
        if (empty($metadata['delkey'])) {
            if (isset($uploadToken)) {
                SecurityUtils::releaseUploadToken($clientIP, $uploadToken);
            }
            http_response_code(400);
            echo json_encode(['error' => '削除キーは必須です。', 'status' => 'delkey_required']);
            exit;
        }

        // 削除キーの長さチェック
        if (!empty($metadata['delkey']) && mb_strlen($metadata['delkey']) < ($ret['security']['min_key_length'] ?? 8)) {
            if (isset($uploadToken)) {
                SecurityUtils::releaseUploadToken($clientIP, $uploadToken);
            }
            http_response_code(400);
            echo json_encode(['error' => '削除キーは十分な長さが必要です。', 'min_length' => ($ret['security']['min_key_length'] ?? 8)]);
            exit;
        }

        // upload_token列とclient_ip列を追加
        $sql = $db->prepare("
            INSERT INTO tus_uploads (
                id, file_size, offset, metadata, chunk_path, 
                created_at, updated_at, expires_at, comment, 
                dl_key, del_key, replace_key, max_downloads, share_expires_at, folder_id,
                upload_token, client_ip
            ) VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        // セキュリティ: キーを暗号化して保存
        $encryptedDlKey = (!empty($metadata['dlkey']) && trim($metadata['dlkey']) !== '')
            ? SecurityUtils::encryptSecure($metadata['dlkey'], $key) : null;
        $encryptedDelKey = (!empty($metadata['delkey']) && trim($metadata['delkey']) !== '')
            ? SecurityUtils::encryptSecure($metadata['delkey'], $key) : null;
        $encryptedReplaceKey = (!empty($metadata['replacekey']) && trim($metadata['replacekey']) !== '')
            ? SecurityUtils::encryptSecure($metadata['replacekey'], $key) : null;

        $result = $sql->execute([
            $uploadId,
            $fileSize,
            json_encode($metadata),
            $chunkPath,
            $currentTime,
            $currentTime,
            $expiresAt,
            $metadata['comment'] ?? null,
            $encryptedDlKey,     // 暗号化済み
            $encryptedDelKey,    // 暗号化済み
            $encryptedReplaceKey,// 暗号化済み
            isset($metadata['max_downloads']) ? intval($metadata['max_downloads']) : null,
            isset($metadata['expires_days']) ? $currentTime + (intval($metadata['expires_days']) * 24 * 60 * 60) : null,
            isset($metadata['folder_id']) ? intval($metadata['folder_id']) : null,
            $uploadToken,
            $clientIP
        ]);

        if (!$result) {
            throw new Exception('Database write failed');
        }
    } catch (Exception $e) {
        // データベース書き込み失敗時にもトークンを解放
        if (isset($uploadToken)) {
            SecurityUtils::releaseUploadToken($clientIP, $uploadToken);
            error_log("TUS create DB error - released upload token: {$uploadToken}");
        }
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create upload session']);
        exit;
    }

    // 空のチャンクファイルを作成
    touch($chunkPath);

    // レスポンス - GETパラメータ形式を使用
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
    $baseUrl = $protocol . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']) . '/tus-upload.php';
    header('Location: ' . $baseUrl . '?upload_id=' . $uploadId);
    header('Upload-Expires: ' . date('r', $expiresAt));
    http_response_code(201);
}

/**
 * PATCHリクエスト - チャンクデータアップロード
 */
function handlePatch()
{
    global $db, $key, $extension;

    $uploadId = getUploadIdFromPath();
    error_log("PATCH request - Upload ID: " . ($uploadId ? $uploadId : 'null'));

    if (!$uploadId) {
        http_response_code(404);
        echo json_encode([
            'error' => 'Upload not found',
            'debug' => [
                'request_uri' => $_SERVER['REQUEST_URI'],
                'path_info' => $_SERVER['PATH_INFO'] ?? 'not set'
            ]
        ]);
        exit;
    }

    // アップロード情報を取得
    $upload = getUploadInfo($uploadId);
    if (!$upload) {
        http_response_code(404);
        echo json_encode(['error' => 'Upload not found']);
        exit;
    }

    // 期限切れチェック
    if ($upload['expires_at'] && time() > $upload['expires_at']) {
        http_response_code(410);
        echo json_encode(['error' => 'Upload expired']);
        exit;
    }

    // Upload-Offsetヘッダーをチェック
    $uploadOffset = $_SERVER['HTTP_UPLOAD_OFFSET'] ?? null;
    if (!is_numeric($uploadOffset)) {
        http_response_code(400);
        echo json_encode(['error' => 'Upload-Offset header required']);
        exit;
    }

    $offset = intval($uploadOffset);

    // チャンクファイルの実際のサイズを確認
    $actualOffset = file_exists($upload['chunk_path']) ? filesize($upload['chunk_path']) : 0;
    error_log("Offset check - DB: {$upload['offset']}, File: {$actualOffset}, Request: {$offset}");

    // データベースのオフセットと実際のファイルサイズが異なる場合は修正
    if ($actualOffset !== $upload['offset']) {
        error_log("Correcting offset mismatch - updating DB offset from {$upload['offset']} to {$actualOffset}");
        $sql = $db->prepare("UPDATE tus_uploads SET offset = ? WHERE id = ?");
        $sql->execute([$actualOffset, $uploadId]);
        $upload['offset'] = $actualOffset;
    }

    // オフセットが現在の進行状況と一致するかチェック
    if ($offset !== $upload['offset']) {
        error_log("Offset conflict - expected: {$upload['offset']}, received: {$offset}");
        http_response_code(409);
        echo json_encode([
            'error' => 'Offset conflict',
            'expected' => $upload['offset'],
            'received' => $offset,
            'actual_file_size' => $actualOffset
        ]);
        exit;
    }

    // チャンクデータを読み取り
    $input = fopen('php://input', 'r');
    $chunkFile = fopen($upload['chunk_path'], 'a');

    $bytesWritten = 0;
    while (!feof($input)) {
        $data = fread($input, 8192);
        if ($data === false) {
            break;
        }

        $written = fwrite($chunkFile, $data);
        if ($written === false) {
            fclose($input);
            fclose($chunkFile);
            http_response_code(500);
            echo json_encode(['error' => 'Write failed']);
            exit;
        }
        $bytesWritten += $written;
    }

    fclose($input);
    fclose($chunkFile);

    // 新しいオフセットを計算
    $newOffset = $offset + $bytesWritten;

    // データベースを更新
    try {
        $sql = $db->prepare("UPDATE tus_uploads SET offset = ?, updated_at = ? WHERE id = ?");
        $sql->execute([$newOffset, time(), $uploadId]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database update failed']);
        exit;
    }

    // アップロード完了チェック
    if ($newOffset >= $upload['file_size']) {
        completeUpload($uploadId, $upload);
    }

    header('Upload-Offset: ' . $newOffset);
    http_response_code(204);
}

/**
 * HEADリクエスト - アップロード進行状況確認
 */
function handleHead()
{
    $uploadId = getUploadIdFromPath();
    error_log("HEAD request - Upload ID: " . ($uploadId ? $uploadId : 'null'));

    if (!$uploadId) {
        error_log("HEAD request failed - no upload ID found");
        http_response_code(404);
        echo json_encode([
            'error' => 'Upload not found',
            'debug' => [
                'request_uri' => $_SERVER['REQUEST_URI'],
                'query_string' => $_SERVER['QUERY_STRING'] ?? 'not set'
            ]
        ]);
        exit;
    }

    $upload = getUploadInfo($uploadId);
    if (!$upload) {
        error_log("HEAD request failed - upload info not found for ID: " . $uploadId);
        http_response_code(404);
        echo json_encode(['error' => 'Upload session not found', 'upload_id' => $uploadId]);
        exit;
    }

    // 期限切れチェック
    if ($upload['expires_at'] && time() > $upload['expires_at']) {
        error_log("HEAD request failed - upload expired for ID: " . $uploadId);
        http_response_code(410);
        echo json_encode(['error' => 'Upload expired', 'upload_id' => $uploadId]);
        exit;
    }

    // チャンクファイルの実際のサイズを確認
    $actualOffset = file_exists($upload['chunk_path']) ? filesize($upload['chunk_path']) : 0;

    error_log("HEAD request success - ID: {$uploadId}, offset: {$actualOffset}, size: {$upload['file_size']}");

    header('Upload-Offset: ' . $actualOffset);
    header('Upload-Length: ' . $upload['file_size']);
    header('Cache-Control: no-store');
    http_response_code(200);
}

/**
 * アップロード完了処理
 */
function completeUpload($uploadId, $upload)
{
    global $db, $data_directory, $key, $encrypt_filename, $extension;

    // デバッグログ開始


    $metadata = json_decode($upload['metadata'], true);
    $originalFileName = $metadata['filename'] ?? 'unknown';

            // セキュリティ：メタデータのログ出力を削除（機密情報が含まれる可能性）


    // 拡張子チェック
    $ext = pathinfo($originalFileName, PATHINFO_EXTENSION);

    if (!in_array(strtolower($ext), $extension)) {
        // 不正な拡張子の場合は削除

        unlink($upload['chunk_path']);
        $db->prepare("DELETE FROM tus_uploads WHERE id = ?")->execute([$uploadId]);
        return false;
    }


    try {
        // uploadedテーブルに移動
        $sql = $db->prepare("
            INSERT INTO uploaded (
                origin_file_name, comment, size, count, input_date,
                dl_key_hash, del_key_hash, replace_key, max_downloads, expires_at, folder_id
            ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
        ");

        // セキュリティ: 暗号化されたキーを復号化してから処理
        $dlKeyHash = null;
        $delKeyHash = null;
        $encryptedReplaceKey = null;

        // ダウンロードキーの処理
        if (!empty($upload['dl_key']) && trim($upload['dl_key']) !== '') {
            try {
                $decryptedDlKey = SecurityUtils::decryptSecure($upload['dl_key'], $key);
                $dlKeyHash = SecurityUtils::hashPassword($decryptedDlKey);
            } catch (Exception $e) {
                // 復号化失敗時のフォールバック（レガシー平文データ対応）
                $dlKeyHash = SecurityUtils::hashPassword($upload['dl_key']);
            }
        }

        // 削除キーの処理
        if (!empty($upload['del_key']) && trim($upload['del_key']) !== '') {
            try {
                $decryptedDelKey = SecurityUtils::decryptSecure($upload['del_key'], $key);
                $delKeyHash = SecurityUtils::hashPassword($decryptedDelKey);
            } catch (Exception $e) {
                // 復号化失敗時のフォールバック（レガシー平文データ対応）
                $delKeyHash = SecurityUtils::hashPassword($upload['del_key']);
            }
        }

        // 差し替えキーの処理
        if (!empty($upload['replace_key']) && trim($upload['replace_key']) !== '') {
            try {
                $decryptedReplaceKey = SecurityUtils::decryptSecure($upload['replace_key'], $key);
                $encryptedReplaceKey = SecurityUtils::encryptSecure($decryptedReplaceKey, $key);
            } catch (Exception $e) {
                // 復号化失敗時のフォールバック（レガシー平文データ対応）
                $encryptedReplaceKey = SecurityUtils::encryptSecure($upload['replace_key'], $key);
            }
        }

        $insertData = [
            htmlspecialchars($originalFileName, ENT_QUOTES, 'UTF-8'),
            htmlspecialchars($upload['comment'] ?? '', ENT_QUOTES, 'UTF-8'),
            $upload['file_size'],
            time(),
            $dlKeyHash,
            $delKeyHash,
            $encryptedReplaceKey,
            $upload['max_downloads'],
            $upload['share_expires_at'],
            $upload['folder_id']
        ];


        $result = $sql->execute($insertData);

        if (!$result) {
            throw new Exception('Failed to insert into uploaded table');
        }


        $fileId = $db->lastInsertId();

        // ファイル履歴の記録（TUSアップロード）
        try {
            $historyStmt = $db->prepare(
                "INSERT INTO file_history " .
                "(file_id, new_filename, change_type, changed_at, changed_by) " .
                "VALUES (?, ?, ?, ?, ?)"
            );
            $historyStmt->execute([
                $fileId,
                $originalFileName,
                'tus_upload',
                time(),
                'tus_client' // TUSクライアントからのアップロード
            ]);
        } catch (Exception $historyError) {
            // 履歴記録失敗時はログに記録するが処理は継続
            error_log('File history recording failed: ' . $historyError->getMessage());
        }

        // 最終ファイルパスを決定
        if ($encrypt_filename) {
            // セキュアなファイル名の生成（ハッシュ化）
            $hashedFileName = SecurityUtils::generateSecureFileName($fileId, $originalFileName);
            $storedFileName = SecurityUtils::generateStoredFileName($hashedFileName, $ext);
            $finalPath = $data_directory . '/' . $storedFileName;
        } else {
            $finalPath = $data_directory . '/file_' . $fileId . '.' . $ext;
        }

        // チャンクファイルを最終的な場所に移動
        if (!rename($upload['chunk_path'], $finalPath)) {
            throw new Exception('Failed to move file');
        }

        // encrypt_filenameが有効な場合は、データベースにハッシュ化されたファイル名を記録
        if ($encrypt_filename && isset($storedFileName)) {
            $updateStmt = $db->prepare("UPDATE uploaded SET stored_file_name = ? WHERE id = ?");
            $updateStmt->execute([$storedFileName, $fileId]);
        }

        // tus_uploadsテーブルを更新
        $sql = $db->prepare("UPDATE tus_uploads SET completed = 1, final_file_id = ? WHERE id = ?");
        $sql->execute([$fileId, $uploadId]);

        // アップロード完了時にトークンを解放
        $tusUploadInfo = $db->prepare("SELECT upload_token, client_ip FROM tus_uploads WHERE id = ?");
        $tusUploadInfo->execute([$uploadId]);
        $tusInfo = $tusUploadInfo->fetch(PDO::FETCH_ASSOC);

        if ($tusInfo && !empty($tusInfo['upload_token']) && !empty($tusInfo['client_ip'])) {
            SecurityUtils::releaseUploadToken($tusInfo['client_ip'], $tusInfo['upload_token']);
        }

        return true;
    } catch (Exception $e) {
        // エラー時はチャンクファイルを削除
        if (file_exists($upload['chunk_path'])) {
            unlink($upload['chunk_path']);
        }
        return false;
    }
}

/**
 * ヘルパー関数群
 */
function parseMetadata($metadataHeader)
{
    $metadata = [];
    if (empty($metadataHeader)) {
        return $metadata;
    }

    $pairs = explode(',', $metadataHeader);
    foreach ($pairs as $pair) {
        $parts = explode(' ', trim($pair), 2);
        if (count($parts) === 2) {
            $key = $parts[0];
            $value = base64_decode($parts[1]);
            $metadata[$key] = $value;
        }
    }
    return $metadata;
}

function generateUploadId()
{
    return uniqid('tus_', true) . '_' . bin2hex(random_bytes(8));
}

function getCurrentUrl()
{
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
    $baseUrl = $protocol . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']) . '/tus-upload.php';
    return $baseUrl;
}

function getUploadIdFromPath()
{
    // 1. GETパラメータから取得を試行
    if (isset($_GET['upload_id']) && strpos($_GET['upload_id'], 'tus_') === 0) {
        return $_GET['upload_id'];
    }

    // 2. PATH_INFOから取得を試行
    if (isset($_SERVER['PATH_INFO'])) {
        $pathInfo = trim($_SERVER['PATH_INFO'], '/');
        if (strpos($pathInfo, 'tus_') === 0) {
            return $pathInfo;
        }
    }

    // 3. REQUEST_URIから取得を試行
    $path = $_SERVER['REQUEST_URI'];
    $path = parse_url($path, PHP_URL_PATH);
    $parts = explode('/', $path);

    foreach ($parts as $part) {
        if (strpos($part, 'tus_') === 0) {
            return $part;
        }
    }

    // 4. デバッグ情報をログに記録
    error_log("Upload ID not found - REQUEST_URI: " . $_SERVER['REQUEST_URI'] .
              ", PATH_INFO: " . ($_SERVER['PATH_INFO'] ?? 'not set') .
              ", QUERY_STRING: " . ($_SERVER['QUERY_STRING'] ?? 'not set'));

    return null;
}

function getUploadInfo($uploadId)
{
    global $db;
    $sql = $db->prepare("SELECT * FROM tus_uploads WHERE id = ?");
    $sql->execute([$uploadId]);
    return $sql->fetch();
}
