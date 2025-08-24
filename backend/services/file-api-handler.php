<?php

declare(strict_types=1);

/**
 * ファイルAPI操作ハンドラー
 * ファイルの CRUD 操作を担当
 */
class FileApiHandler
{
    private array $config;
    private $auth;
    private ResponseHandler $response;

    public function __construct($config, $auth, ResponseHandler $response)
    {
        $this->config = $config;
        $this->auth = $auth;
        $this->response = $response;
    }

    /**
     * ファイル一覧取得
     */
    public function handleGetFiles(): void
    {
        require_once __DIR__ . '/../models/init.php';

        $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
        $limit = isset($_GET['limit']) ? min(100, max(1, intval($_GET['limit']))) : 20;
        $folder = isset($_GET['folder']) ? intval($_GET['folder']) : null;
        $include = isset($_GET['include']) ? explode(',', (string)$_GET['include']) : array();

        $offset = ($page - 1) * $limit;

        try {
            // データベース接続パラメータの設定
            $db_directory = '../../db';
            $dsn = 'sqlite:' . $db_directory . '/uploader.db';
            $pdo = new PDO($dsn);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

            $sql = "SELECT 
                           id,
                           origin_file_name AS origin_file_name,
                           origin_file_name AS name,
                           comment,
                           size AS size,
                           'application/octet-stream' AS mime_type,
                           input_date AS upload_date,
                           \"count\" AS count,
                           folder_id 
                    FROM uploaded WHERE 1=1";
            $params = array();

            if ($folder !== null) {
                $sql .= " AND folder_id = ?";
                $params[] = $folder;
            }

            // LIMIT / OFFSET はSQLiteではプレースホルダーを使用できないため数値を直接埋め込む
            $limit  = (int) $limit;
            $offset = (int) $offset;
            $sql .= " ORDER BY input_date DESC LIMIT {$limit} OFFSET {$offset}";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $files = $stmt->fetchAll(PDO::FETCH_ASSOC);
            // 数値フィールドを正しい型にキャスト
            foreach ($files as &$file) {
                if (isset($file['count'])) {
                    $file['count'] = (int)$file['count'];
                }
            }

            // 総件数取得
            $countSql = "SELECT COUNT(*) FROM uploaded WHERE 1=1";
            $countParams = array();
            if ($folder !== null) {
                $countSql .= " AND folder_id = ?";
                $countParams[] = $folder;
            }
            $countStmt = $pdo->prepare($countSql);
            $countStmt->execute($countParams);
            $total = $countStmt->fetchColumn();

            $responseData = array(
                'files' => $files,
                'pagination' => array(
                    'page' => $page,
                    'limit' => $limit,
                    'total' => (int)$total,
                    'pages' => (int)ceil($total / $limit)
                )
            );

            // 追加情報: folders, breadcrumb
            if (!empty($include)) {
                $foldersEnabled = $this->config['folders_enabled'] ?? false;
                if ($foldersEnabled) {
                    if (in_array('folders', $include)) {
                        $fstmt = $pdo->prepare("SELECT id, name, parent_id FROM folders ORDER BY name");
                        $fstmt->execute();
                        $responseData['folders'] = $fstmt->fetchAll(PDO::FETCH_ASSOC);
                    }
                    if (in_array('breadcrumb', $include) && $folder !== null) {
                        $responseData['breadcrumb'] = $this->buildBreadcrumb($pdo, $folder);
                    }
                }
            }

            $this->response->success('Files list', $responseData);
        } catch (PDOException $e) {
            error_log('Database error: ' . $e->getMessage());
            $this->response->error('Database error', [], 500, 'DATABASE_ERROR');
        }
    }

    /**
     * パンくずを構築
     */
    private function buildBreadcrumb(PDO $pdo, int $folderId): array
    {
        $breadcrumb = array();
        $current = $folderId;
        $stmt = $pdo->prepare('SELECT id, name, parent_id FROM folders WHERE id = ?');
        while ($current) {
            $stmt->execute(array($current));
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                break;
            }
            array_unshift($breadcrumb, array(
                'id' => (int)$row['id'],
                'name' => $row['name']
            ));
            $current = $row['parent_id'] ? (int)$row['parent_id'] : 0;
        }
        return $breadcrumb;
    }

    /**
     * ファイルアップロード
     */
    public function handlePostFile(): void
    {
        // 既存のupload.phpの機能を活用
        // JSONレスポンス形式に変更
        ob_start();
        include __DIR__ . '/../api/upload.php';
        $output = ob_get_clean();

        // 既存のoutputがJSONかどうかチェックして適切に処理
        $decoded = json_decode($output, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            // 既にJSONの場合はそのまま出力
            header('Content-Type: application/json; charset=utf-8');
            echo $output;
        } else {
            // HTMLまたは他の形式の場合はJSONでラップ
            $this->response->success('File upload completed', ['output' => $output]);
        }
    }

    /**
     * 単一ファイル取得
     */
    public function handleGetFile(int $fileId): void
    {
        try {
            // データベース接続パラメータの設定
            $db_directory = '../../db';
            $dsn = 'sqlite:' . $db_directory . '/uploader.db';
            $pdo = new PDO($dsn);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

            $stmt = $pdo->prepare("SELECT 
                                          id,
                                          origin_file_name AS origin_file_name,
                                          origin_file_name AS name,
                                          comment,
                                          size AS size,
                                          'application/octet-stream' AS mime_type,
                                          input_date AS upload_date,
                                          \"count\" AS count,
                                          folder_id 
                                   FROM uploaded WHERE id = ?");
            $stmt->execute(array($fileId));
            $file = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($file && isset($file['count'])) {
                $file['count'] = (int)$file['count'];
            }

            if (!$file) {
                $this->response->error('File not found', [], 404, 'FILE_NOT_FOUND');
                return;
            }

            $this->response->success('File information retrieved', ['file' => $file]);
        } catch (PDOException $e) {
            error_log('Database error: ' . $e->getMessage());
            $this->response->error('Database error', [], 500, 'DATABASE_ERROR');
        }
    }

    /**
     * ファイル削除（削除キー検証付き）
     *
     * 注意: このメソッドは削除キーの検証を行います。
     * 管理者権限による削除はverifydelete.php -> delete.phpフローを使用してください。
     */
    public function handleDeleteFile(int $fileId): void
    {
        // このAPIエンドポイントは削除キー検証が必要です
        // 適切な削除フローは以下の通りです：
        // 1. verifydelete.php で削除キー検証
        // 2. 成功時にワンタイムトークンを生成
        // 3. delete.php でトークンを使用して削除実行

        $this->response->error(
            'This API endpoint cannot be used due to delete-key verification. Please follow the proper deletion flow.',
            [
                'recommended_flow' => [
                    'step1' => 'POST ../api/verifydelete.php to verify delete key',
                    'step2' => 'GET ../api/delete.php?id={fileId}&key={token} to perform deletion'
                ]
            ],
            403,
            'DELETE_KEY_VALIDATION_REQUIRED'
        );
    }

    /** 一括削除（マスターキー認証） */
    public function handleBatchDelete(): void
    {
        require __DIR__ . '/../api/bulk-delete.php';
    }

    /** 複数ファイル移動 */
    public function handleBatchMove(): void
    {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || !isset($input['file_ids']) || !is_array($input['file_ids'])) {
            $this->response->error('Invalid request payload', [], 400, 'BAD_REQUEST');
            return;
        }
        $fileIds = array_map('intval', $input['file_ids']);
        $targetFolderId = array_key_exists('folder_id', $input) && $input['folder_id'] !== null
            ? (int)$input['folder_id'] : null;

        try {
            $db_directory = '../../db';
            $dsn = 'sqlite:' . $db_directory . '/uploader.db';
            $pdo = new PDO($dsn);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

            // フォルダ存在検証
            if ($targetFolderId !== null) {
                $chk = $pdo->prepare('SELECT id FROM folders WHERE id = ?');
                $chk->execute(array($targetFolderId));
                if (!$chk->fetch()) {
                    $this->response->error('Specified folder does not exist', [], 400, 'DESTINATION_NOT_FOUND');
                    return;
                }
            }

            if (empty($fileIds)) {
                $this->response->error('No files specified to move', [], 400, 'BAD_REQUEST');
                return;
            }
            $placeholders = implode(',', array_fill(0, count($fileIds), '?'));
            $stmt = $pdo->prepare("SELECT id FROM uploaded WHERE id IN ($placeholders)");
            $stmt->execute($fileIds);
            $existing = $stmt->fetchAll(PDO::FETCH_COLUMN);
            $existingInt = array_map('intval', $existing);
            $notFound = array_values(array_diff($fileIds, $existingInt));
            if (!empty($notFound)) {
                $this->response->error(
                    'Some files were not found',
                    ['not_found_ids' => $notFound],
                    400,
                    'FILES_NOT_FOUND'
                );
                return;
            }

            $upd = $pdo->prepare("UPDATE uploaded SET folder_id = ? WHERE id IN ($placeholders)");
            $params = array_merge(array($targetFolderId), $fileIds);
            $upd->execute($params);
            $this->response->success('Files moved', [
                'moved_count' => $upd->rowCount(),
                'target_folder_id' => $targetFolderId
            ]);
        } catch (PDOException $e) {
            error_log('Batch move error: ' . $e->getMessage());
            $this->response->error('Database error', [], 500, 'DATABASE_ERROR');
        }
    }

    /** ダウンロード検証 */
    public function handleVerifyDownload(): void
    {
        require __DIR__ . '/../api/verifydownload.php';
    }

    /** 削除検証 */
    public function handleVerifyDelete(): void
    {
        require __DIR__ . '/../api/verifydelete.php';
    }

    /**
     * Tus.io プロキシ（IDなし: OPTIONS/POST）
     */
    public function handleTusProxy(): void
    {
        // 既存の tus-upload.php をそのまま呼び出す
        require __DIR__ . '/../api/tus-upload.php';
    }

    /**
     * Tus.io プロキシ（ID付き: HEAD/PATCH）
     * ルータ側の正規表現でキャプチャしたID部分は、tus-upload.php が REQUEST_URI から読み取るため
     * ここでは単にインクルードするだけでよい。
     */
    public function handleTusProxyWithId(string $_id): void
    {
        require __DIR__ . '/../api/tus-upload.php';
    }

    /**
     * ファイル差し替え
     */
    public function handleReplaceFile(int $fileId): void
    {
        // CSRFトークン検証（CSRFトークンが送信された場合）
        $csrfToken = $_POST['csrf_token'] ?? null;
        if ($csrfToken) {
            if (!SecurityUtils::validateCSRFToken($csrfToken)) {
                $this->response->error('Invalid security token', [], 403, 'CSRF_TOKEN_INVALID');
                return;
            }
        }

        // 機能の有効性チェック
        if (!isset($this->config['allow_file_replace']) || !$this->config['allow_file_replace']) {
            $this->response->error('File replace feature is disabled', [], 403, 'FILE_REPLACE_DISABLED');
            return;
        }

        // 管理者のみ許可設定のチェック
        if (isset($this->config['file_edit_admin_only']) && $this->config['file_edit_admin_only']) {
            if (!$this->auth->hasPermission('admin')) {
                $this->response->error('Admin privilege required', [], 403, 'ADMIN_REQUIRED');
                return;
            }
        }

        // ファイルアップロードチェック
        // セキュリティ：機密情報のログ出力を削除（$_FILES, $_POSTには機密情報が含まれる可能性）

        if (!isset($_FILES['file'])) {
            $this->response->error('No file was sent', [], 400, 'FILE_UPLOAD_ERROR');
            return;
        }

        if ($_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            $this->response->error(
                'File upload failed: Error code ' . $_FILES['file']['error'],
                [],
                400,
                'FILE_UPLOAD_ERROR'
            );
            return;
        }

        try {
            $db_directory = '../../db';
            $dsn = 'sqlite:' . $db_directory . '/uploader.db';
            $pdo = new PDO($dsn);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

            // 既存ファイル情報取得
            $stmt = $pdo->prepare("SELECT * FROM uploaded WHERE id = ?");
            $stmt->execute(array($fileId));
            $existingFile = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$existingFile) {
                $this->response->error('File not found', [], 404, 'FILE_NOT_FOUND');
                return;
            }

            // 差し替えキー認証（マスターキーでも許可）
            $masterKey = $_POST['master_key'] ?? '';
            $inputReplaceKey = $_POST['replacekey'] ?? '';
            if (empty($masterKey) && empty($inputReplaceKey)) {
                $this->response->error('Replace key or master key is required', [], 400, 'REPLACE_KEY_REQUIRED');
                return;
            }

            if (empty($existingFile['replace_key']) && empty($masterKey)) {
                $this->response->error('This file does not have a replace key configured', [], 400, 'NO_REPLACE_KEY');
                return;
            }

            // 差し替えキーの検証（レガシー形式と新形式の両方をサポート）
            if (empty($masterKey)) {
                try {
                    // まず新しいGCM形式で試行
                    $storedReplaceKey = SecurityUtils::decryptSecure(
                        $existingFile['replace_key'],
                        $this->config['key']
                    );
                } catch (Exception $e) {
                    try {
                        // レガシーのECB形式で試行（既存データとの互換性のため）
                        $storedReplaceKey = SecurityUtils::decryptLegacyECB(
                            $existingFile['replace_key'],
                            $this->config['key']
                        );
                    } catch (Exception $e2) {
                        $this->response->error('Failed to decrypt replace key', [], 500, 'DECRYPTION_FAILED');
                        return;
                    }
                }

                if ($inputReplaceKey !== $storedReplaceKey) {
                    $this->response->error('Invalid replace key', [], 403, 'INVALID_REPLACE_KEY');
                    return;
                }
            } else {
                // マスターキーでの許可
                $cfgMaster = $this->config['master'] ?? '';
                if ($masterKey !== $cfgMaster) {
                    $this->response->error('Invalid master key', [], 403, 'INVALID_MASTER_KEY');
                    return;
                }
            }

            // アップロードされたファイルの情報
            $newFileName = SecurityUtils::escapeHtml($_FILES['file']['name']);
            $fileSize = $_FILES['file']['size'];
            $tmpPath = $_FILES['file']['tmp_name'];

            // 拡張子チェック（ポリシー対応）
            $ext = strtolower(pathinfo($newFileName, PATHINFO_EXTENSION));
            $policy = SecurityUtils::getUploadExtensionPolicy($this->config);
            if (!SecurityUtils::isExtensionAllowed($ext, $policy)) {
                if ($policy['mode'] === 'whitelist') {
                    $this->response->error(
                        'File extension is not allowed',
                        ['allowed' => $policy['whitelist']],
                        400,
                        'INVALID_EXTENSION'
                    );
                } elseif ($policy['mode'] === 'blacklist') {
                    $this->response->error(
                        'File extension is blocked',
                        ['blocked' => $policy['blacklist']],
                        400,
                        'INVALID_EXTENSION'
                    );
                } else {
                    $this->response->error('File extension is not allowed', [], 400, 'INVALID_EXTENSION');
                }
                return;
            }

            // ファイルサイズチェック
            if ($fileSize > $this->config['max_file_size'] * 1024 * 1024) {
                $this->response->error('File size exceeds the limit', [], 400, 'FILE_TOO_LARGE');
                return;
            }

            // セキュアなファイルパスを決定
            $data_directory = $this->config['data_directory'] ?? dirname(__DIR__, 2) . '/data';

            // パストラバーサル攻撃対策：絶対パスに正規化
            $data_directory = realpath($data_directory);
            if ($data_directory === false) {
                $this->response->error('Data directory not found', [], 500, 'DATA_DIR_NOT_FOUND');
                return;
            }

            if (isset($this->config['encrypt_filename']) && $this->config['encrypt_filename']) {
                // セキュアなファイル名生成を使用
                $hashedFileName = SecurityUtils::generateSecureFileName($fileId, $newFileName);
                $storedFileName = SecurityUtils::generateStoredFileName($hashedFileName, $ext);
                $newFilePath = $data_directory . DIRECTORY_SEPARATOR . $storedFileName;
            } else {
                $safeFileName = 'file_' . $fileId . '.' . $ext;
                $storedFileName = $safeFileName; // 明示的に保持
                $newFilePath = $data_directory . DIRECTORY_SEPARATOR . $safeFileName;
            }

            // 生成されたパスがデータディレクトリ内にあることを確認
            $realNewPath = realpath(dirname($newFilePath));
            if ($realNewPath === false || strpos($realNewPath, $data_directory) !== 0) {
                $this->response->error('Invalid file path detected', [], 500, 'INVALID_FILE_PATH');
                return;
            }

            // 古いファイルをセキュアに削除
            if (!empty($existingFile['stored_file_name'])) {
                // 新形式（ハッシュ化されたファイル名）
                $oldFilePath = $data_directory . DIRECTORY_SEPARATOR . $existingFile['stored_file_name'];
            } else {
                // 旧形式（互換性のため）
                $oldFileExt = pathinfo($existingFile['origin_file_name'], PATHINFO_EXTENSION);
                $oldFilePath = $data_directory . DIRECTORY_SEPARATOR . 'file_' . $fileId . '.' . $oldFileExt;
            }

            // パス検証後に削除
            $realOldPath = realpath($oldFilePath);
            if ($realOldPath !== false && strpos($realOldPath, $data_directory) === 0 && file_exists($oldFilePath)) {
                unlink($oldFilePath);
            }

            // 新しいファイルを移動
            if (!move_uploaded_file($tmpPath, $newFilePath)) {
                $this->response->error('Failed to save file', [], 500, 'FILE_SAVE_ERROR');
                return;
            }

            // データベース更新: 表示用はアップロード時のオリジナル名、保存用は実体ファイル名
            $stmt = $pdo->prepare(
                "UPDATE uploaded SET origin_file_name = ?, stored_file_name = ?, size = ?, updated_at = ? WHERE id = ?"
            );
            $stmt->execute(array(
                $newFileName,
                $storedFileName,
                $fileSize,
                time(),
                $fileId
            ));

            $this->response->success('File replaced', [
                'file_id' => $fileId,
                'new_filename' => $newFileName,
                'size' => $fileSize
            ]);
        } catch (PDOException $e) {
            error_log('Database error: ' . $e->getMessage());
            $this->response->error('Database error', [], 500, 'DATABASE_ERROR');
        } catch (Exception $e) {
            error_log('File replace error: ' . $e->getMessage());
            $this->response->error('Internal server error occurred', [], 500, 'INTERNAL_ERROR');
        }
    }

    /**
     * ファイルダウンロード
     */
    public function handleDownloadFile(int $fileId): void
    {
        // 共有リンクのダウンロード（キー付き）は既存の public/download.php に委譲
        if (isset($_GET['key']) && $_GET['key'] !== '') {
            if (!isset($_GET['id']) || (int)$_GET['id'] !== $fileId) {
                $_GET['id'] = $fileId; // download.php は GET id を参照する
            }
            require __DIR__ . '/../public/download.php';
            return;
        }

        try {
            // データベース接続
            $db_directory = '../../db';
            $dsn = 'sqlite:' . $db_directory . '/uploader.db';
            $pdo = new PDO($dsn);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

            // ファイル情報取得
            $stmt = $pdo->prepare("SELECT * FROM uploaded WHERE id = ?");
            $stmt->execute(array($fileId));
            $fileData = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$fileData) {
                $this->response->error('File not found', [], 404, 'FILE_NOT_FOUND');
                return;
            }

            // ファイルパスの決定
            $data_directory = $this->config['data_directory'] ?? dirname(__DIR__, 2) . '/data';
            $data_directory = realpath($data_directory);

            if ($data_directory === false) {
                $this->response->error('Data directory not found', [], 500, 'DATA_DIR_NOT_FOUND');
                return;
            }

            // ファイルパス生成（新形式と旧形式の両方に対応）
            if (!empty($fileData['stored_file_name'])) {
                // 新形式（ハッシュ化されたファイル名）
                $filePath = $data_directory . DIRECTORY_SEPARATOR . $fileData['stored_file_name'];
            } else {
                // 旧形式（互換性のため）
                $fileExtension = pathinfo($fileData['origin_file_name'], PATHINFO_EXTENSION);
                $filePath = $data_directory . DIRECTORY_SEPARATOR . 'file_' . $fileId . '.' . $fileExtension;
            }

            // セキュリティ：パストラバーサル攻撃対策
            $realFilePath = realpath($filePath);
            if ($realFilePath === false || strpos($realFilePath, $data_directory) !== 0) {
                $this->response->error('Invalid file path detected', [], 500, 'INVALID_FILE_PATH');
                return;
            }

            // ファイル存在確認
            if (!file_exists($filePath)) {
                $this->response->error('File does not exist', [], 404, 'PHYSICAL_FILE_NOT_FOUND');
                return;
            }

            // ファイルサイズ取得
            $fileSize = filesize($filePath);
            if ($fileSize === false) {
                $this->response->error('Failed to get file size', [], 500, 'FILE_SIZE_ERROR');
                return;
            }

            // ダウンロード回数の更新
            $updateStmt = $pdo->prepare('UPDATE uploaded SET "count" = "count" + 1, updated_at = ? WHERE id = ?');
            $updateStmt->execute([time(), $fileId]);

            // ダウンロードログの記録（Loggerが利用可能な場合）
            if (class_exists('Logger')) {
                $logger = new Logger(
                    $this->config['log_directory'] ?? './logs',
                    $this->config['log_level'] ?? Logger::LOG_INFO
                );
                $logger->access($fileId, 'api_download', 'success', [
                    'api_key' => $this->auth->getApiKey(),
                    'file_name' => $fileData['origin_file_name']
                ]);
            }

            // レスポンスヘッダーの設定（UI直ダウンロード用）
            header('Content-Type: application/octet-stream');
            header('Content-Disposition: attachment; filename*=UTF-8\'\'' .
                rawurlencode($fileData['origin_file_name']));
            header('Content-Transfer-Encoding: binary');
            header('Content-Length: ' . $fileSize);
            header('Cache-Control: no-cache, must-revalidate');
            header('Expires: 0');

            // 出力バッファのクリア
            if (ob_get_level()) {
                ob_end_clean();
            }

            // ファイルの出力
            $handle = fopen($filePath, 'rb');
            if ($handle) {
                while (!feof($handle)) {
                    echo fread($handle, 8192);
                    flush();
                }
                fclose($handle);
            } else {
                $this->response->error('Failed to read file', [], 500, 'FILE_READ_ERROR');
                return;
            }
        } catch (PDOException $e) {
            error_log('Database error in download: ' . $e->getMessage());
            $this->response->error('Database error', [], 500, 'DATABASE_ERROR');
        } catch (Exception $e) {
            error_log('Download error: ' . $e->getMessage());
            $this->response->error('An error occurred during download processing', [], 500, 'DOWNLOAD_ERROR');
        }
    }

    /**
     * ファイル情報更新（コメント編集）
     */
    public function handleUpdateFile(int $fileId): void
    {
        // 機能の有効性チェック
        if (!isset($this->config['allow_comment_edit']) || !$this->config['allow_comment_edit']) {
            $this->response->error('Comment edit feature is disabled', [], 403, 'COMMENT_EDIT_DISABLED');
            return;
        }

        // 管理者のみ許可設定のチェック
        if (isset($this->config['file_edit_admin_only']) && $this->config['file_edit_admin_only']) {
            if (!$this->auth->hasPermission('admin')) {
                $this->response->error('Admin privilege required', [], 403, 'ADMIN_REQUIRED');
                return;
            }
        }

        $input = json_decode(file_get_contents('php://input'), true);

        $isCommentUpdate = isset($input['comment']);
        $isMoveFolder = array_key_exists('folder_id', $input);
        if (!$isCommentUpdate && !$isMoveFolder) {
            $this->response->error('No valid update fields provided', [], 400, 'BAD_REQUEST');
            return;
        }

        $newComment = null;
        if ($isCommentUpdate) {
            $newComment = SecurityUtils::escapeHtml(trim($input['comment']));
            if (mb_strlen($newComment) > $this->config['max_comment']) {
                $this->response->error('Comment is too long', [], 400, 'COMMENT_TOO_LONG');
                return;
            }
        }

        try {
            $db_directory = '../../db';
            $dsn = 'sqlite:' . $db_directory . '/uploader.db';
            $pdo = new PDO($dsn);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

            // 既存ファイル情報取得
            $stmt = $pdo->prepare("SELECT * FROM uploaded WHERE id = ?");
            $stmt->execute(array($fileId));
            $existingFile = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$existingFile) {
                $this->response->error('File not found', [], 404, 'FILE_NOT_FOUND');
                return;
            }

            // フォルダ移動（folder_id 更新）
            if ($isMoveFolder) {
                $folderId = $input['folder_id'];
                $newFolderId = $folderId === null || $folderId === '' ? null : (int)$folderId;

                if ($newFolderId !== null) {
                    // 存在チェック
                    $check = $pdo->prepare('SELECT id FROM folders WHERE id = ?');
                    $check->execute(array($newFolderId));
                    if (!$check->fetch()) {
                        $this->response->error('Destination folder not found', [], 404, 'DESTINATION_NOT_FOUND');
                        return;
                    }
                }

                $upd = $pdo->prepare('UPDATE uploaded SET folder_id = ? WHERE id = ?');
                $upd->execute(array($newFolderId, $fileId));
            }

            // コメント更新
            if ($isCommentUpdate) {
                $stmt = $pdo->prepare("UPDATE uploaded SET comment = ? WHERE id = ?");
                $stmt->execute(array($newComment, $fileId));
            }

            // 履歴記録（コメントが変更された場合のみ）
            if ($isCommentUpdate && $existingFile['comment'] !== $newComment) {
                $stmt = $pdo->prepare(
                    "INSERT INTO file_history " .
                    "(file_id, old_comment, new_comment, change_type, changed_at, changed_by) " .
                    "VALUES (?, ?, ?, ?, ?, ?)"
                );
                $stmt->execute(array(
                    $fileId,
                    $existingFile['comment'],
                    $newComment,
                    'comment_edit',
                    time(),
                    $this->auth->getApiKey()
                ));
            }

            $this->response->success('File updated', [
                'file_id' => $fileId,
                'new_comment' => $newComment,
                'new_folder_id' => $isMoveFolder ? ($newFolderId ?? null) : ($existingFile['folder_id'] ?? null)
            ]);
        } catch (PDOException $e) {
            error_log('Database error: ' . $e->getMessage());
            $this->response->error('Database error', [], 500, 'DATABASE_ERROR');
        } catch (Exception $e) {
            error_log('Comment update error: ' . $e->getMessage());
            $this->response->error('Internal server error occurred', [], 500, 'INTERNAL_ERROR');
        }
    }

    /**
     * 共有設定取得（max_downloads, expires_days）
     */
    public function handleGetShare(int $fileId): void
    {
        try {
            $db_directory = '../../db';
            $dsn = 'sqlite:' . $db_directory . '/uploader.db';
            $pdo = new PDO($dsn);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

            $stmt = $pdo->prepare('SELECT max_downloads, expires_at FROM uploaded WHERE id = ?');
            $stmt->execute(array($fileId));
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                $this->response->error('File not found', [], 404, 'FILE_NOT_FOUND');
                return;
            }
            $expiresDays = null;
            if ($row['expires_at'] !== null) {
                $remaining = ((int)$row['expires_at']) - time();
                $expiresDays = $remaining > 0 ? (int)ceil($remaining / (24 * 60 * 60)) : 0;
            }
            $this->response->success('Share settings', [
                'max_downloads' => $row['max_downloads'],
                'expires_days' => $expiresDays
            ]);
        } catch (PDOException $e) {
            error_log('Database error: ' . $e->getMessage());
            $this->response->error('Database error', [], 500, 'DATABASE_ERROR');
        }
    }

    /**
     * 共有設定更新（max_downloads, expires_days）＋共有URL生成
     */
    public function handleUpdateShare(int $fileId): void
    {
        $input = json_decode(file_get_contents('php://input'), true);
        $maxDownloads = isset($input['max_downloads']) ? (int)$input['max_downloads'] : null;
        $expiresDays = isset($input['expires_days']) ? (int)$input['expires_days'] : null;

        try {
            $db_directory = '../../db';
            $dsn = 'sqlite:' . $db_directory . '/uploader.db';
            $pdo = new PDO($dsn);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

            // 対象ファイル取得
            $stmt = $pdo->prepare('SELECT * FROM uploaded WHERE id = ?');
            $stmt->execute(array($fileId));
            $file = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$file) {
                $this->response->error('File not found', [], 404, 'FILE_NOT_FOUND');
                return;
            }

            // expires_at 計算
            $expiresAt = null;
            if ($expiresDays && $expiresDays > 0) {
                $expiresAt = time() + ($expiresDays * 24 * 60 * 60);
            }

            // 更新（null指定時は無制限/無期限に）
            $upd = $pdo->prepare('UPDATE uploaded SET max_downloads = :max, expires_at = :exp WHERE id = :id');
            $upd->bindValue(':max', $maxDownloads, $maxDownloads === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
            $upd->bindValue(':exp', $expiresAt, $expiresAt === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
            $upd->bindValue(':id', $fileId, PDO::PARAM_INT);
            $upd->execute();

            // 共有キー生成
            if (!class_exists('SecurityUtils')) {
                require_once __DIR__ . '/../core/utils.php';
            }

            $shareKeySource = empty($file['dl_key_hash']) ? ('no_key_file_' . $fileId) : $file['dl_key_hash'];

            // 設定から暗号化キー取得
            $configObj = new Config();
            $cfg = $configObj->index();

            // 安定的な共有トークン生成（ダウンロード側と一致させる）
            $shareKey = hash('sha256', $shareKeySource . '|' . $cfg['key']);

            // ダウンロードURL（public/download.php 経由: 制限/有効期限を厳密に適用）
            $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
            $protocol = $isHttps ? 'https://' : 'http://';
            $hostHeader = $_SERVER['HTTP_HOST'] ?? ($_SERVER['SERVER_NAME'] ?? 'localhost');
            // ポートが含まれていない場合はプロトコルに応じたデフォルト以外のポートを付与
            $port = isset($_SERVER['SERVER_PORT']) ? (int)$_SERVER['SERVER_PORT'] : ($isHttps ? 443 : 80);
            $defaultPort = $isHttps ? 443 : 80;
            if (strpos($hostHeader, ':') === false && $port !== $defaultPort) {
                $hostHeader .= ':' . $port;
            }
            $shareUrl = $protocol . $hostHeader . '/download.php?id=' . $fileId . '&key=' . urlencode($shareKey);

            // 有効期限日数
            $expiresDaysOut = null;
            if ($expiresAt !== null) {
                $remaining = $expiresAt - time();
                $expiresDaysOut = $remaining > 0 ? (int)ceil($remaining / (24 * 60 * 60)) : 0;
            }

            $this->response->success('Share settings updated', [
                'share_key' => $shareKey,
                'share_url' => $shareUrl,
                'share_url_with_comment' => ($file['comment'] ?? '') . "\n" . $shareUrl,
                'max_downloads' => $maxDownloads,
                'expires_days' => $expiresDaysOut
            ]);
        } catch (PDOException $e) {
            error_log('Database error: ' . $e->getMessage());
            $this->response->error('Database error', [], 500, 'DATABASE_ERROR');
        } catch (Exception $e) {
            error_log('Share update error: ' . $e->getMessage());
            $this->response->error('Internal server error occurred', [], 500, 'INTERNAL_ERROR');
        }
    }
}
