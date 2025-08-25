<?php

declare(strict_types=1);

// phpcs:disable PSR1.Files.SideEffects
require_once __DIR__ . '/../core/utils.php';
// phpcs:enable PSR1.Files.SideEffects

/**
 * システムAPI操作ハンドラー
 * システム情報・統計・ヘルスチェックなどを担当
 */
class SystemApiHandler
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
     * システム状態取得
     */
    public function handleGetStatus(): void
    {
        try {
            // 基本情報
            $statusInfo = [
                'status' => 'ok',
                'version' => '4.3.1',
                'api_enabled' => $this->config['api_enabled'] ?? true,
                'folders_enabled' => $this->config['folders_enabled'] ?? false,
                'server_time' => date('c'),
                'timestamp' => time()
            ];

            // データベース統計情報を追加（権限がある場合）
            if ($this->auth->hasPermission('read')) {
                $statusInfo = array_merge($statusInfo, $this->getDatabaseStats());
            }

            // システム情報を追加（管理者権限がある場合）
            if ($this->auth->hasPermission('admin')) {
                $statusInfo = array_merge($statusInfo, $this->getSystemInfo());
            }

            $this->response->success('System status retrieved', $statusInfo);
        } catch (Exception $e) {
            error_log('System status error: ' . $e->getMessage());
            $this->response->error('Failed to retrieve system status', [], 500, 'SYSTEM_ERROR');
        }
    }

    /**
     * データベース統計情報を取得
     */
    private function getDatabaseStats(): array
    {
        try {
            $db_directory = '../../db';
            $dsn = 'sqlite:' . $db_directory . '/uploader.db';
            $pdo = new PDO($dsn);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

            // ファイル統計
            $stmt = $pdo->prepare("SELECT COUNT(*) as total_files, SUM(size) as total_size FROM uploaded");
            $stmt->execute();
            $fileStats = $stmt->fetch(PDO::FETCH_ASSOC);

            // フォルダ統計
            $stmt = $pdo->prepare("SELECT COUNT(*) as total_folders FROM folders");
            $stmt->execute();
            $folderStats = $stmt->fetch(PDO::FETCH_ASSOC);

            // 最近のアップロード統計
            $last24h = time() - (24 * 60 * 60);
            $stmt = $pdo->prepare("SELECT COUNT(*) as recent_uploads FROM uploaded WHERE input_date > ?");
            $stmt->execute(array($last24h));
            $recentStats = $stmt->fetch(PDO::FETCH_ASSOC);

            return [
                'database' => [
                    'total_files' => (int)$fileStats['total_files'],
                    'total_size' => (int)($fileStats['total_size'] ?? 0),
                    'total_folders' => (int)$folderStats['total_folders'],
                    'recent_uploads_24h' => (int)$recentStats['recent_uploads']
                ]
            ];
        } catch (PDOException $e) {
            error_log('Database stats error: ' . $e->getMessage());
            return ['database' => ['error' => 'Failed to retrieve database statistics']];
        }
    }

    /**
     * システム情報を取得（管理者用）
     */
    private function getSystemInfo(): array
    {
        try {
            return [
                'system' => [
                    'php_version' => PHP_VERSION,
                    'memory_usage' => memory_get_usage(true),
                    'memory_peak' => memory_get_peak_usage(true),
                    'disk_free_space' => disk_free_space('.'),
                    'disk_total_space' => disk_total_space('.'),
                    'uptime' => $this->getServerUptime(),
                    'config' => [
                        'max_file_size' => $this->config['max_file_size'] ?? 'unknown',
                        'allowed_extensions' => $this->config['extension'] ?? [],
                        'upload_directory' => realpath('../../data/'),
                        'database_file' => realpath('../../db/uploader.db')
                    ]
                ]
            ];
        } catch (Exception $e) {
            error_log('System info error: ' . $e->getMessage());
            return ['system' => ['error' => 'Failed to retrieve system information']];
        }
    }

    /**
     * サーバーのアップタイムを取得
     */
    private function getServerUptime(): ?string
    {
        try {
            if (PHP_OS_FAMILY === 'Linux') {
                $uptimeString = file_get_contents('/proc/uptime');
                if ($uptimeString !== false) {
                    $uptime = (float)strtok($uptimeString, ' ');
                    return $this->formatUptime($uptime);
                }
            }
            return null;
        } catch (Exception $e) {
            return null;
        }
    }

    /**
     * アップタイムを人間が読みやすい形式にフォーマット
     */
    private function formatUptime(float $seconds): string
    {
        $days = floor($seconds / 86400);
        $hours = floor(($seconds % 86400) / 3600);
        $minutes = floor(($seconds % 3600) / 60);

        $parts = [];
        if ($days > 0) {
            $parts[] = $days . ' days';
        }
        if ($hours > 0) {
            $parts[] = $hours . ' hours';
        }
        if ($minutes > 0) {
            $parts[] = $minutes . ' minutes';
        }

        return empty($parts) ? 'less than 1 minute' : implode(' ', $parts);
    }

    /**
     * システムヘルスチェック
     */
    public function handleHealthCheck(): void
    {
        $health = [
            'status' => 'healthy',
            'checks' => []
        ];

        try {
            // データベース接続チェック
            $health['checks']['database'] = $this->checkDatabase();

            // ファイルシステムチェック
            $health['checks']['filesystem'] = $this->checkFilesystem();

            // 設定チェック
            $health['checks']['config'] = $this->checkConfig();

            // 全体の健康状態を判定
            $allHealthy = true;
            foreach ($health['checks'] as $check) {
                if ($check['status'] !== 'ok') {
                    $allHealthy = false;
                    break;
                }
            }

            $health['status'] = $allHealthy ? 'healthy' : 'unhealthy';
            $health['timestamp'] = date('c');

            if ($allHealthy) {
                $this->response->success('System is healthy', $health);
            } else {
                $this->response->error('System has issues', $health, 503, 'SYSTEM_UNHEALTHY');
            }
        } catch (Exception $e) {
            error_log('Health check error: ' . $e->getMessage());
            $this->response->error('Health check failed', [], 500, 'HEALTH_CHECK_ERROR');
        }
    }

    /**
     * データベース接続チェック
     */
    private function checkDatabase(): array
    {
        try {
            $db_directory = '../../db';
            $dsn = 'sqlite:' . $db_directory . '/uploader.db';
            $pdo = new PDO($dsn);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

            // 簡単なクエリでテスト
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM uploaded");
            $stmt->execute();
            $stmt->fetchColumn();

            return ['status' => 'ok', 'message' => 'Database connection OK'];
        } catch (Exception $e) {
            return ['status' => 'error', 'message' => 'Database connection error: ' . $e->getMessage()];
        }
    }

    /**
     * ファイルシステムチェック
     */
    private function checkFilesystem(): array
    {
        try {
            $dataDir = '../../data/';
            $dbDir = '../../db/';

            $checks = [];

            // Data directory existence and permissions check
            if (!is_dir($dataDir)) {
                $checks[] = 'Data directory does not exist';
            } elseif (!is_writable($dataDir)) {
                $checks[] = 'Data directory is not writable';
            }

            // Database directory existence and permissions check
            if (!is_dir($dbDir)) {
                $checks[] = 'Database directory does not exist';
            } elseif (!is_writable($dbDir)) {
                $checks[] = 'Database directory is not writable';
            }

            // ディスク容量チェック
            $freeSpace = disk_free_space('.');
            $totalSpace = disk_total_space('.');
            if ($freeSpace && $totalSpace) {
                $usage = ($totalSpace - $freeSpace) / $totalSpace;
                if ($usage > 0.95) { // more than 95% used
                    $checks[] = 'Disk usage exceeds 95%';
                }
            }

            if (empty($checks)) {
                return ['status' => 'ok', 'message' => 'Filesystem OK'];
            } else {
                return ['status' => 'error', 'message' => implode(', ', $checks)];
            }
        } catch (Exception $e) {
            return ['status' => 'error', 'message' => 'Filesystem check error: ' . $e->getMessage()];
        }
    }

    /**
     * 設定チェック
     */
    private function checkConfig(): array
    {
        try {
            $issues = [];

            // Required configuration checks
            $requiredConfigs = ['key', 'extension', 'max_file_size'];
            foreach ($requiredConfigs as $key) {
                if (!isset($this->config[$key])) {
                    $issues[] = "Config key '{$key}' is not defined";
                }
            }

            // Security-related configuration checks
            if (!isset($this->config['key']) || strlen($this->config['key']) < 32) {
                $issues[] = 'Encryption key is too short (32+ characters recommended)';
            }

            if (empty($issues)) {
                return ['status' => 'ok', 'message' => 'Configuration OK'];
            } else {
                return ['status' => 'warning', 'message' => implode(', ', $issues)];
            }
        } catch (Exception $e) {
            return ['status' => 'error', 'message' => 'Configuration check error: ' . $e->getMessage()];
        }
    }
}
