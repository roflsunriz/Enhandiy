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

            // チェック専用: /api/folders?id={id}&check=true → 件数返却
            $folderId = isset($_GET['id']) ? intval($_GET['id']) : null;
            $doCheck = isset($_GET['check']) && ($_GET['check'] === 'true' || $_GET['check'] === '1');
            if ($folderId !== null && $doCheck) {
                // 子フォルダ数
                $stmt = $pdo->prepare("SELECT COUNT(*) FROM folders WHERE parent_id = ?");
                $stmt->execute(array($folderId));
                $childCount = (int)$stmt->fetchColumn();

                // ファイル数
                $stmt = $pdo->prepare("SELECT COUNT(*) FROM uploaded WHERE folder_id = ?");
                $stmt->execute(array($folderId));
                $fileCount = (int)$stmt->fetchColumn();

                $this->response->success('Folder usage summary', [
                    'file_count' => $fileCount,
                    'child_count' => $childCount
                ]);
                return;
            }

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
            $fileCount = (int)$stmt->fetchColumn();

            // 子フォルダがあるかチェック
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM folders WHERE parent_id = ?");
            $stmt->execute(array($folderId));
            $childCount = $stmt->fetchColumn();

            $moveFiles = isset($_GET['move_files']) && ($_GET['move_files'] === 'true' || $_GET['move_files'] === '1');
            if ($fileCount > 0 || $childCount > 0) {
                if (!$moveFiles) {
                    $this->response->error('Folder is not empty', [], 409, 'FOLDER_NOT_EMPTY');
                    return;
                }

                // ファイルをルートへ移動
                if ($fileCount > 0) {
                    $stmt = $pdo->prepare("UPDATE uploaded SET folder_id = NULL WHERE folder_id = ?");
                    $stmt->execute(array($folderId));
                }

                // 直下の子フォルダをルートへ移動
                if ((int)$childCount > 0) {
                    $stmt = $pdo->prepare("UPDATE folders SET parent_id = NULL WHERE parent_id = ?");
                    $stmt->execute(array($folderId));
                }
            }

            // フォルダ削除
            $stmt = $pdo->prepare("DELETE FROM folders WHERE id = ?");
            $stmt->execute(array($folderId));

            $this->response->success('Folder deleted', [
                'folder_id' => $folderId,
                'name' => $folder['name'],
                'moved_files' => $fileCount,
                'moved_folders' => (int)$childCount
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

        $isRename = isset($input['name']);
        $isMove = array_key_exists('parent_id', $input);

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

            // リネーム処理
            if ($isRename) {
                $newName = SecurityUtils::sanitizeFilename(trim($input['name']));
                if (empty($newName)) {
                    $this->response->error('Please enter a valid folder name', [], 400, 'INVALID_FOLDER_NAME');
                    return;
                }

                // 同名フォルダの存在チェック（自分以外）
                $stmt = $pdo->prepare("SELECT COUNT(*) FROM folders WHERE name = ? AND parent_id = ? AND id != ?");
                $stmt->execute(array($newName, $existingFolder['parent_id'], $folderId));
                $exists = $stmt->fetchColumn();
                if ($exists > 0) {
                    $this->response->error(
                        'A folder with the same name already exists',
                        [],
                        409,
                        'FOLDER_ALREADY_EXISTS'
                    );
                    return;
                }

                $stmt = $pdo->prepare("UPDATE folders SET name = ? WHERE id = ?");
                $stmt->execute(array($newName, $folderId));
            }

            // 移動処理（parent_id変更）
            if ($isMove) {
                $newParent = $input['parent_id'];
                $newParentId = $newParent === null || $newParent === '' ? null : intval($newParent);

                // 自分自身のIDと同じは不可
                if ($newParentId !== null && $newParentId === (int)$folderId) {
                    $this->response->error('Cannot move folder into itself', [], 400, 'INVALID_DESTINATION');
                    return;
                }

                // 目標フォルダの存在確認（nullはルート）
                if ($newParentId !== null) {
                    $stmt = $pdo->prepare("SELECT id FROM folders WHERE id = ?");
                    $stmt->execute(array($newParentId));
                    if (!$stmt->fetch()) {
                        $this->response->error('Destination folder does not exist', [], 404, 'DESTINATION_NOT_FOUND');
                        return;
                    }

                    // 循環参照チェック
                    if ($this->isDescendant($pdo, $folderId, $newParentId)) {
                        $this->response->error('Cannot move into its own descendant', [], 400, 'CYCLIC_RELATION');
                        return;
                    }
                }

                // 同階層での同名重複チェック（移動先基準）
                $stmt = $pdo->prepare(
                    "SELECT COUNT(*) FROM folders " .
                    "WHERE name = ? AND parent_id " .
                    ($newParentId === null ? "IS NULL" : "= ?") .
                    " AND id != ?"
                );
                $params = array(
                    $isRename ? $newName : $existingFolder['name']
                );
                if ($newParentId !== null) {
                    $params[] = $newParentId;
                }
                $params[] = $folderId;
                $stmt->execute($params);
                $exists = $stmt->fetchColumn();
                if ($exists > 0) {
                    $this->response->error(
                        'A folder with the same name already exists in destination',
                        [],
                        409,
                        'FOLDER_ALREADY_EXISTS'
                    );
                    return;
                }

                // 更新実行
                $stmt = $pdo->prepare("UPDATE folders SET parent_id = ? WHERE id = ?");
                $stmt->execute(array($newParentId, $folderId));
            }

            $payload = array(
                'folder_id' => $folderId,
                'name' => $isRename ? ($newName ?? $existingFolder['name']) : $existingFolder['name'],
                'old_parent_id' => $existingFolder['parent_id'],
                'new_parent_id' => $isMove ? ($newParentId ?? null) : $existingFolder['parent_id']
            );
            $this->response->success('Folder updated', $payload);
        } catch (PDOException $e) {
            error_log('Database error: ' . $e->getMessage());
            $this->response->error('Database error occurred', [], 500, 'DATABASE_ERROR');
        }
    }

    /**
     * 指定フォルダBがフォルダAの子孫かどうか
     */
    private function isDescendant(PDO $pdo, int $ancestorId, int $descendantId): bool
    {
        $stmt = $pdo->prepare("SELECT parent_id FROM folders WHERE id = ?");
        $current = $descendantId;
        while (true) {
            $stmt->execute(array($current));
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row || $row['parent_id'] === null) {
                return false;
            }
            if ((int)$row['parent_id'] === $ancestorId) {
                return true;
            }
            $current = (int)$row['parent_id'];
        }
    }
}
