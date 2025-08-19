<?php

declare(strict_types=1);

/**
 * アプリケーション初期化スクリプト
 *
 * 必要なディレクトリの作成、データベースの初期化、
 * セキュリティチェックを行います。
 */

 // phpcs:disable PSR1.Files.SideEffects
class AppInitializer
{
    private array $config;
    private ?PDO $db = null;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    /**
     * 初期化メイン処理
     */
    public function initialize(): PDO
    {
        $this->validateConfig();
        $this->createDirectories();
        $this->initializeDatabase();
        $this->setupDatabase();
        $this->runAutoMigrationsIfNeeded();

        return $this->db;
    }

    /**
     * 設定ファイルの検証
     */
    private function validateConfig(): void
    {
        // セキュリティ設定の検証
        if ($this->config['master'] === 'CHANGE_THIS_MASTER_KEY') {
            $this->throwError('マスターキーが設定されていません。config.phpを確認してください。');
        }

        if ($this->config['key'] === 'CHANGE_THIS_ENCRYPTION_KEY') {
            $this->throwError('暗号化キーが設定されていません。config.phpを確認してください。');
        }

        if ($this->config['session_salt'] === 'CHANGE_THIS_SESSION_SALT') {
            $this->throwError('セッションソルトが設定されていません。config.phpを確認してください。');
        }

        // 必要な拡張モジュールの確認
        $required_extensions = ['pdo', 'sqlite3', 'openssl', 'json'];
        foreach ($required_extensions as $ext) {
            if (!extension_loaded($ext)) {
                $this->throwError("必要なPHP拡張モジュール '{$ext}' がロードされていません。");
            }
        }
    }

    /**
     * 必要なディレクトリの作成
     */
    private function createDirectories(): void
    {
        $directories = [
            $this->config['db_directory'],
            $this->config['data_directory'],
            $this->config['log_directory']
        ];

        foreach ($directories as $dir) {
            if (!file_exists($dir)) {
                if (!mkdir($dir, 0755, true)) {
                    $this->throwError("ディレクトリ '{$dir}' の作成に失敗しました。");
                }
            }

            // 書き込み権限の確認
            if (!is_writable($dir)) {
                $this->throwError("ディレクトリ '{$dir}' に書き込み権限がありません。");
            }
        }
    }

    /**
     * データベース接続の初期化
     */
    private function initializeDatabase(): void
    {
        try {
            $dsn = 'sqlite:' . $this->config['db_directory'] . '/uploader.db';
            $this->db = new PDO($dsn);

            // エラーモードを例外に設定
            $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            // デフォルトのフェッチモードを連想配列形式に設定
            $this->db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            $this->throwError('データベースの接続に失敗しました: ' . $e->getMessage());
        }
    }

    /**
     * データベーステーブルの作成・更新
     */
    private function setupDatabase(): void
    {
        try {
            // メインテーブルの作成（フォルダ機能とセキュリティ機能を統合）
            $query = "
                CREATE TABLE IF NOT EXISTS uploaded(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    origin_file_name text NOT NULL,
                    stored_file_name text,
                    comment text,
                    size INTEGER NOT NULL,
                    count INTEGER DEFAULT 0,
                    input_date INTEGER NOT NULL,
                    dl_key_hash text,
                    del_key_hash text,
                    file_hash text,
                    ip_address text,
                    folder_id INTEGER,
                    replace_key text,
                    max_downloads INTEGER,
                    expires_at INTEGER,
                    created_at INTEGER DEFAULT (strftime('%s', 'now')),
                    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
                )";

            $this->db->exec($query);

            // Tus.io再開可能アップロード管理テーブル
            $tusQuery = "
                CREATE TABLE IF NOT EXISTS tus_uploads (
                    id TEXT PRIMARY KEY,
                    file_size INTEGER NOT NULL,
                    offset INTEGER DEFAULT 0,
                    metadata TEXT,
                    chunk_path TEXT,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    expires_at INTEGER,
                    completed BOOLEAN DEFAULT FALSE,
                    final_file_id INTEGER,
                    comment TEXT,
                    dl_key TEXT,
                    del_key TEXT,
                    replace_key TEXT,
                    max_downloads INTEGER,
                    share_expires_at INTEGER,
                    folder_id INTEGER
                )";

            $this->db->exec($tusQuery);

            // フォルダ管理テーブル
            $folderQuery = "
                CREATE TABLE IF NOT EXISTS folders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    parent_id INTEGER,
                    created_at INTEGER NOT NULL,
                    FOREIGN KEY (parent_id) REFERENCES folders (id) ON DELETE CASCADE
                )";

            $this->db->exec($folderQuery);

            // ファイル差し替え履歴管理テーブル
            $historyQuery = "
                CREATE TABLE IF NOT EXISTS file_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    file_id INTEGER NOT NULL,
                    old_filename TEXT,
                    new_filename TEXT,
                    old_comment TEXT,
                    new_comment TEXT,
                    change_type TEXT NOT NULL,
                    changed_at INTEGER NOT NULL,
                    changed_by TEXT,
                    FOREIGN KEY (file_id) REFERENCES uploaded (id) ON DELETE CASCADE
                )";

            $this->db->exec($historyQuery);

            // トークンテーブルの作成（ワンタイムトークン用）
            $tokenQuery = "
                CREATE TABLE IF NOT EXISTS access_tokens(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    file_id INTEGER NOT NULL,
                    token text NOT NULL UNIQUE,
                    token_type text NOT NULL, -- 'download' or 'delete'
                    expires_at INTEGER NOT NULL,
                    ip_address text,
                    created_at INTEGER DEFAULT (strftime('%s', 'now')),
                    FOREIGN KEY (file_id) REFERENCES uploaded (id) ON DELETE CASCADE
                )";

            $this->db->exec($tokenQuery);

            // ログテーブルの作成
            $logQuery = "
                CREATE TABLE IF NOT EXISTS access_logs(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    file_id INTEGER,
                    action text NOT NULL, -- 'upload', 'download', 'delete', 'view'
                    ip_address text,
                    user_agent text,
                    status text DEFAULT 'success', -- 'success', 'error', 'denied'
                    error_message text,
                    created_at INTEGER DEFAULT (strftime('%s', 'now'))
                )";

            $this->db->exec($logQuery);

            // 既存データの移行（必要に応じて）
            // 先に不足カラムを追加してからインデックスを作成する
            $this->migrateExistingData();

            // インデックスの作成（必要なカラムが揃ってから）
            $this->createIndexes();

            // 新スキーマのデフォルトユーザーバージョンを設定（存在しない場合）
            $this->initializeUserVersion();

            // stored_file_name の自動バックフィル（必要時のみ）
            $this->backfillStoredFileNameIfNeeded();
        } catch (PDOException $e) {
            $this->throwError('データベースの初期化に失敗しました: ' . $e->getMessage());
        }
    }

    /**
     * データベースインデックスの作成
     */
    private function createIndexes(): void
    {
        $indexes = [
            "CREATE INDEX IF NOT EXISTS idx_uploaded_input_date ON uploaded(input_date)",
            "CREATE INDEX IF NOT EXISTS idx_uploaded_file_hash ON uploaded(file_hash)",
            "CREATE INDEX IF NOT EXISTS idx_uploaded_folder ON uploaded(folder_id)",
            "CREATE INDEX IF NOT EXISTS idx_tokens_expires_at ON access_tokens(expires_at)",
            "CREATE INDEX IF NOT EXISTS idx_tokens_file_id ON access_tokens(file_id)",
            "CREATE INDEX IF NOT EXISTS idx_logs_created_at ON access_logs(created_at)",
            "CREATE INDEX IF NOT EXISTS idx_logs_file_id ON access_logs(file_id)",
            "CREATE INDEX IF NOT EXISTS idx_tus_uploads_expires ON tus_uploads(expires_at)",
            "CREATE INDEX IF NOT EXISTS idx_tus_uploads_created ON tus_uploads(created_at)",
            "CREATE INDEX IF NOT EXISTS idx_tus_uploads_completed ON tus_uploads(completed)",
            "CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id)",
            "CREATE INDEX IF NOT EXISTS idx_file_history_file_id ON file_history(file_id)",
            "CREATE INDEX IF NOT EXISTS idx_file_history_changed_at ON file_history(changed_at)"
        ];

        foreach ($indexes as $indexQuery) {
            $this->db->exec($indexQuery);
        }
    }

    /**
     * 既存データの移行処理
     */
    private function migrateExistingData(): void
    {
        // uploaded テーブルに新しいカラムが存在するかチェック
        $columns = $this->db->query("PRAGMA table_info(uploaded)")->fetchAll();
        $columnNames = array_column($columns, 'name');

        // 新しいカラムの追加
        $newColumns = [
            'stored_file_name' => 'ALTER TABLE uploaded ADD COLUMN stored_file_name text',
            'file_hash' => 'ALTER TABLE uploaded ADD COLUMN file_hash text',
            'ip_address' => 'ALTER TABLE uploaded ADD COLUMN ip_address text',
            'folder_id' => 'ALTER TABLE uploaded ADD COLUMN folder_id INTEGER',
            'replace_key' => 'ALTER TABLE uploaded ADD COLUMN replace_key text',
            'max_downloads' => 'ALTER TABLE uploaded ADD COLUMN max_downloads INTEGER',
            'expires_at' => 'ALTER TABLE uploaded ADD COLUMN expires_at INTEGER',
            'created_at' => 'ALTER TABLE uploaded ADD COLUMN created_at INTEGER DEFAULT (strftime(\'%s\', \'now\'))',
            'updated_at' => 'ALTER TABLE uploaded ADD COLUMN updated_at INTEGER DEFAULT (strftime(\'%s\', \'now\'))'
        ];

        foreach ($newColumns as $columnName => $alterQuery) {
            if (!in_array($columnName, $columnNames)) {
                try {
                    $this->db->exec($alterQuery);
                } catch (PDOException $e) {
                    // カラム追加に失敗した場合はログに記録するが処理は続行
                    error_log("Column migration failed for {$columnName}: " . $e->getMessage());
                }
            }
        }

        // レガシー（v2.x 以前）互換: 旧カラムが存在し新カラムが無い場合の最低限の移行
        // v2.x では dl_key / del_key が平文で存在していた可能性がある。
        // 新スキーマでは dl_key_hash / del_key_hash を使用するため、
        // 旧カラムがあり新カラムが無い場合は新カラムを追加して値のコピー（ハッシュ化は不可のためそのまま移す）
        $hasDlKey = in_array('dl_key', $columnNames, true);
        $hasDelKey = in_array('del_key', $columnNames, true);
        $hasDlKeyHash = in_array('dl_key_hash', $columnNames, true);
        $hasDelKeyHash = in_array('del_key_hash', $columnNames, true);

        if ($hasDlKey && !$hasDlKeyHash) {
            try {
                $this->db->exec("ALTER TABLE uploaded ADD COLUMN dl_key_hash text");
                // 旧キーは暗号化保存のため新ハッシュと互換なし → 未設定（NULL）で移行
                $this->db->exec("UPDATE uploaded SET dl_key_hash = NULL");
            } catch (PDOException $e) {
                error_log('Legacy migration (dl_key_hash) failed: ' . $e->getMessage());
            }
        }

        if ($hasDelKey && !$hasDelKeyHash) {
            try {
                $this->db->exec("ALTER TABLE uploaded ADD COLUMN del_key_hash text");
                // 旧キーは暗号化保存のため新ハッシュと互換なし → 未設定（NULL）で移行
                $this->db->exec("UPDATE uploaded SET del_key_hash = NULL");
            } catch (PDOException $e) {
                error_log('Legacy migration (del_key_hash) failed: ' . $e->getMessage());
            }
        }

        // 可能なら created_at / updated_at を input_date から初期化
        try {
            $this->db->exec("UPDATE uploaded SET created_at = input_date WHERE created_at IS NULL OR created_at = ''");
            $this->db->exec("UPDATE uploaded SET updated_at = created_at WHERE updated_at IS NULL OR updated_at = ''");
        } catch (PDOException $e) {
            error_log('Timestamp backfill failed: ' . $e->getMessage());
        }
    }

    /**
     * SQLite ユーザーバージョンを初期化（未設定時のみ）
     * 新系のベースを 4004 とする
     */
    private function initializeUserVersion(): void
    {
        $stmt = $this->db->query('PRAGMA user_version');
        $current = (int)($stmt->fetchColumn() ?: 0);
        if ($current === 0) {
            $this->db->exec('PRAGMA user_version = 4004');
        }
    }

    /**
     * レガシー（2.x 以前）を検知して必要なら自動マイグレーションを実行
     * 判定基準:
     * - user_version < 3000
     * - または uploaded に dl_key / del_key があり、dl_key_hash / del_key_hash が無い
     */
    private function runAutoMigrationsIfNeeded(): void
    {
        try {
            $stmt = $this->db->query('PRAGMA user_version');
            $userVersion = (int)($stmt->fetchColumn() ?: 0);

            $columns = $this->db->query('PRAGMA table_info(uploaded)')->fetchAll();
            $columnNames = array_column($columns, 'name');

            $isLegacyColumns = in_array('dl_key', $columnNames, true)
                && in_array('del_key', $columnNames, true)
                && !in_array('dl_key_hash', $columnNames, true)
                && !in_array('del_key_hash', $columnNames, true);

            if ($userVersion < 3000 || $isLegacyColumns) {
                // 最低限のスキーマ延長を適用
                $this->migrateExistingData();
                // マイグレーション完了を示すユーザーバージョンへ更新
                $this->db->exec('PRAGMA user_version = 4004');
            }
        } catch (PDOException $e) {
            error_log('Auto migration check failed: ' . $e->getMessage());
        }
    }

    /**
     * stored_file_name が NULL の既存行を、旧形式の命名規則に基づき補完
     * - 実ファイルが存在する場合のみ更新
     */
    private function backfillStoredFileNameIfNeeded(): void
    {
        try {
            $stmt = $this->db->query("SELECT COUNT(1) FROM uploaded WHERE stored_file_name IS NULL");
            $need = (int)$stmt->fetchColumn();
            if ($need === 0) {
                return;
            }

            $dataDir = rtrim($this->config['data_directory'], DIRECTORY_SEPARATOR);

            $select = $this->db->prepare("SELECT id, origin_file_name FROM uploaded WHERE stored_file_name IS NULL");
            $select->execute();
            $rows = $select->fetchAll();

            foreach ($rows as $row) {
                $id = (int)$row['id'];
                $origin = (string)$row['origin_file_name'];
                $ext = pathinfo($origin, PATHINFO_EXTENSION);
                if ($ext === '') {
                    continue;
                }
                $guess = 'file_' . $id . '.' . $ext;
                $path = $dataDir . DIRECTORY_SEPARATOR . $guess;
                if (!file_exists($path)) {
                    continue;
                }
                $upd = $this->db->prepare("UPDATE uploaded SET stored_file_name = :name WHERE id = :id");
                $upd->execute([':name' => $guess, ':id' => $id]);
            }
        } catch (Throwable $e) {
            // バックフィルはベストエフォート: 失敗しても致命的にしない
            error_log('Backfill stored_file_name failed: ' . $e->getMessage());
        }
    }

    /**
     * エラー処理
     */
    private function throwError(string $message): void
    {
        // ログディレクトリが存在する場合はエラーログを記録
        if (isset($this->config['log_directory']) && is_dir($this->config['log_directory'])) {
            $logFile = $this->config['log_directory'] . '/error.log';
            $logMessage = date('Y-m-d H:i:s') . " [ERROR] " . $message . PHP_EOL;
            file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
        }

        // エラーページの表示
        $error = '500 - ' . $message;
        include(__DIR__ . '/../views/header.php');
        include(__DIR__ . '/../views/error.php');
        include(__DIR__ . '/../views/footer.php');
        exit;
    }
}

// 従来の処理との互換性のため、関数形式でのラッパーを提供
function initializeApp(array $config): PDO
{
    $initializer = new AppInitializer($config);
    return $initializer->initialize();
}

// 従来のinit.phpとの互換性を保つため、直接実行された場合の処理
if (isset($config) && is_array($config)) {
    $db = initializeApp($config);
}
