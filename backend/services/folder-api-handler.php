<?php

declare(strict_types=1);

// phpcs:disable PSR1.Files.SideEffects
require_once __DIR__ . '/../core/utils.php';
// phpcs:enable PSR1.Files.SideEffects

/**
 * フォルダAPI操作ハンドラー
 * フォルダの CRUD 操作を担当
 */
class FolderApiHandler
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
     * フォルダ一覧取得
     */
    public function handleGetFolders(): void
    {
        if (!$this->config['folders_enabled']) {
            $this->response->error('Folder feature is disabled', [], 503, 'FOLDERS_DISABLED');
            return;
        }

        try {
            // データベース接続パラメータの設定
            $db_directory = '../../db';
            $dsn = 'sqlite:' . $db_directory . '/uploader.db';
            $pdo = new PDO($dsn);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

            $stmt = $pdo->prepare("SELECT id, name, parent_id, created_at FROM folders ORDER BY parent_id, name");
            $stmt->execute();
            $folders = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->response->success('Folder list retrieved', ['folders' => $folders]);
        } catch (PDOException $e) {
            error_log('Database error: ' . $e->getMessage());
            $this->response->error('Database error occurred', [], 500, 'DATABASE_ERROR');
        }
    }

    /**
     * フォルダ作成
     */
    public function handlePostFolder(): void
    {
        if (!$this->config['folders_enabled'] || !$this->config['allow_folder_creation']) {
            $this->response->error('Folder creation is disabled', [], 403, 'FOLDER_CREATION_DISABLED');
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $name = isset($input['name']) ? trim($input['name']) : '';
        $parentId = isset($input['parent_id']) ? intval($input['parent_id']) : null;

        if (empty($name)) {
            $this->response->error('Folder name is required', [], 400, 'FOLDER_NAME_REQUIRED');
            return;
        }

        // フォルダ名のサニタイズ
        $name = SecurityUtils::sanitizeFilename($name);
        if (empty($name)) {
            $this->response->error('Please enter a valid folder name', [], 400, 'INVALID_FOLDER_NAME');
            return;
        }

        try {
            // データベース接続パラメータの設定
            $db_directory = '../../db';
            $dsn = 'sqlite:' . $db_directory . '/uploader.db';
            $pdo = new PDO($dsn);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

            // 同名フォルダの存在チェック
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM folders WHERE name = ? AND parent_id = ?");
            $stmt->execute(array($name, $parentId));
            $exists = $stmt->fetchColumn();

            if ($exists > 0) {
                $this->response->error('A folder with the same name already exists', [], 409, 'FOLDER_ALREADY_EXISTS');
                return;
            }

            // フォルダ作成
            $stmt = $pdo->prepare("INSERT INTO folders (name, parent_id, created_at) VALUES (?, ?, ?)");
            $stmt->execute(array($name, $parentId, time()));

            $folderId = $pdo->lastInsertId();

            $this->response->success('Folder created', [
                'folder_id' => $folderId,
                'name' => $name,
                'parent_id' => $parentId
            ]);
        } catch (PDOException $e) {
            error_log('Database error: ' . $e->getMessage());
            $this->response->error('Database error occurred', [], 500, 'DATABASE_ERROR');
        }
    }

    /**
     * フォルダ削除
     */
    public function handleDeleteFolder(int $folderId): void
    {
        if (!$this->config['folders_enabled'] || !$this->config['allow_folder_deletion']) {
            $this->response->error('Folder deletion is disabled', [], 403, 'FOLDER_DELETION_DISABLED');
            return;
        }

        try {
            // データベース接続パラメータの設定
            $db_directory = '../../db';
            $dsn = 'sqlite:' . $db_directory . '/uploader.db';
            $pdo = new PDO($dsn);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

            // フォルダの存在確認
            $stmt = $pdo->prepare("SELECT name FROM folders WHERE id = ?");
            $stmt->execute(array($folderId));
            $folder = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$folder) {
                $this->response->error('Folder not found', [], 404, 'FOLDER_NOT_FOUND');
                return;
            }

            // フォルダ内にファイルがあるかチェック
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM uploaded WHERE folder_id = ?");
            $stmt->execute(array($folderId));
            $fileCount = $stmt->fetchColumn();

            if ($fileCount > 0) {
                $this->response->error('Folder is not empty', [], 409, 'FOLDER_NOT_EMPTY');
                return;
            }

            // 子フォルダがあるかチェック
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM folders WHERE parent_id = ?");
            $stmt->execute(array($folderId));
            $childCount = $stmt->fetchColumn();

            if ($childCount > 0) {
                $this->response->error('Folder has child folders', [], 409, 'FOLDER_HAS_CHILDREN');
                return;
            }

            // フォルダ削除
            $stmt = $pdo->prepare("DELETE FROM folders WHERE id = ?");
            $stmt->execute(array($folderId));

            $this->response->success('Folder deleted', [
                'folder_id' => $folderId,
                'name' => $folder['name']
            ]);
        } catch (PDOException $e) {
            error_log('Database error: ' . $e->getMessage());
            $this->response->error('Database error occurred', [], 500, 'DATABASE_ERROR');
        }
    }

    /**
     * フォルダ情報更新
     */
    public function handleUpdateFolder(int $folderId): void
    {
        if (!$this->config['folders_enabled']) {
            $this->response->error('Folder feature is disabled', [], 503, 'FOLDERS_DISABLED');
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['name'])) {
            $this->response->error('Folder name is required', [], 400, 'FOLDER_NAME_REQUIRED');
            return;
        }

        $newName = trim($input['name']);
        $newName = SecurityUtils::sanitizeFilename($newName);

        if (empty($newName)) {
            $this->response->error('Please enter a valid folder name', [], 400, 'INVALID_FOLDER_NAME');
            return;
        }

        try {
            // データベース接続パラメータの設定
            $db_directory = '../../db';
            $dsn = 'sqlite:' . $db_directory . '/uploader.db';
            $pdo = new PDO($dsn);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

            // 既存フォルダ情報取得
            $stmt = $pdo->prepare("SELECT * FROM folders WHERE id = ?");
            $stmt->execute(array($folderId));
            $existingFolder = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$existingFolder) {
                $this->response->error('Folder not found', [], 404, 'FOLDER_NOT_FOUND');
                return;
            }

            // 同名フォルダの存在チェック（自分以外）
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM folders WHERE name = ? AND parent_id = ? AND id != ?");
            $stmt->execute(array($newName, $existingFolder['parent_id'], $folderId));
            $exists = $stmt->fetchColumn();

            if ($exists > 0) {
                $this->response->error('A folder with the same name already exists', [], 409, 'FOLDER_ALREADY_EXISTS');
                return;
            }

            // フォルダ名更新
            $stmt = $pdo->prepare("UPDATE folders SET name = ? WHERE id = ?");
            $stmt->execute(array($newName, $folderId));

            $this->response->success('Folder name updated', [
                'folder_id' => $folderId,
                'old_name' => $existingFolder['name'],
                'new_name' => $newName
            ]);
        } catch (PDOException $e) {
            error_log('Database error: ' . $e->getMessage());
            $this->response->error('Database error occurred', [], 500, 'DATABASE_ERROR');
        }
    }
}
