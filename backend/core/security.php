<?php

declare(strict_types=1);

/**
 * セキュリティユーティリティクラス
 * Ver.2.0で追加されたセキュリティ機能
 */
class SecurityUtils
{
    /**
     * CSRFトークンを生成
     */
    public static function generateCSRFToken(): string
    {
        if (!isset($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }

    /**
     * CSRFトークンを検証
     */
    public static function validateCSRFToken(?string $token): bool
    {
        if (!isset($_SESSION['csrf_token']) || $token === null) {
            return false;
        }
        return hash_equals($_SESSION['csrf_token'], $token);
    }

    /**
     * ファイル名をサニタイズ（強化版）
     */
    public static function sanitizeFilename(string $filename): string
    {
        // NULLバイトを除去（ディレクトリトラバーサル攻撃対策）
        $filename = str_replace("\0", '', $filename);

        // 制御文字を除去
        $filename = preg_replace('/[\x00-\x1F\x7F]/', '', $filename);

        // Windowsで禁止されている文字を除去
        $filename = preg_replace('/[<>:"|?*]/', '', $filename);

        // パストラバーサル攻撃パターンを除去
        $filename = str_replace(['../', '..\\', '../', '.\\'], '', $filename);

        // 先頭のドットを除去（隠しファイル防止）
        $filename = ltrim($filename, '.');

        // Windowsの予約ファイル名をチェック
        $reservedNames = [
            'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5',
            'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4',
            'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
        ];
        $nameWithoutExt = pathinfo($filename, PATHINFO_FILENAME);
        if (in_array(strtoupper($nameWithoutExt), $reservedNames)) {
            $filename = 'file_' . $filename;
        }

        // 連続する空白を単一の空白に
        $filename = preg_replace('/\s+/', ' ', $filename);

        // 複数のドットを単一のドットに
        $filename = preg_replace('/\.{2,}/', '.', $filename);

        // 先頭末尾の空白とドットを除去
        $filename = trim($filename, ' .');

        // 長すぎるファイル名を制限（255文字制限）
        if (mb_strlen($filename, 'UTF-8') > 255) {
            $pathInfo = pathinfo($filename);
            $extension = isset($pathInfo['extension']) ? '.' . $pathInfo['extension'] : '';
            $baseName = mb_substr(
                $pathInfo['filename'],
                0,
                255 - mb_strlen($extension, 'UTF-8'),
                'UTF-8'
            );
            $filename = $baseName . $extension;
        }

        // 空のファイル名の場合はデフォルト名を設定
        if (empty($filename) || $filename === '.') {
            $filename = 'uploaded_file_' . time();
        }

        return $filename;
    }

    /**
     * アップロードファイルの検証
     */
    public static function validateUploadedFile(array $file, array $config): array
    {
        $errors = [];

        // ファイルが選択されているか
        if ($file['error'] === UPLOAD_ERR_NO_FILE) {
            $errors[] = 'ファイルが選択されていません。';
            return $errors;
        }

        // アップロードエラーのチェック
        if ($file['error'] !== UPLOAD_ERR_OK) {
            switch ($file['error']) {
                case UPLOAD_ERR_INI_SIZE:
                case UPLOAD_ERR_FORM_SIZE:
                    $errors[] = 'ファイルサイズが大きすぎます。';
                    break;
                case UPLOAD_ERR_PARTIAL:
                    $errors[] = 'ファイルのアップロードが途中で失敗しました。';
                    break;
                default:
                    $errors[] = 'ファイルのアップロードに失敗しました。';
            }
            return $errors;
        }

        // ファイルサイズのチェック
        $maxSize = ($config['max_file_size'] ?? 10) * 1024 * 1024; // MB to bytes
        if ($file['size'] > $maxSize) {
            $errors[] = "ファイルサイズが制限を超えています。最大: " . ($config['max_file_size'] ?? 10) . "MB";
        }

        // 拡張子のチェック（ポリシー対応）
        $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $policy = self::getUploadExtensionPolicy($config);
        if (!self::isExtensionAllowed($fileExtension, $policy)) {
            if ($policy['mode'] === 'whitelist') {
                $errors[] = "許可されていない拡張子です。許可: " . implode(', ', $policy['whitelist']);
            } elseif ($policy['mode'] === 'blacklist') {
                $errors[] = "禁止されている拡張子です。禁止: " . implode(', ', $policy['blacklist']);
            } else {
                $errors[] = "許可されていない拡張子です。";
            }
        }

        // MIMEタイプの基本チェック
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        $allowedMimeTypes = [
            // アーカイブ・圧縮ファイル
            'zip' => ['application/zip', 'application/x-zip-compressed'],
            'rar' => ['application/x-rar-compressed', 'application/vnd.rar'],
            'lzh' => ['application/x-lzh-compressed'],
            '7z' => ['application/x-7z-compressed'],
            'tar' => ['application/x-tar'],
            'gz' => ['application/gzip', 'application/x-gzip'],
            'bz2' => ['application/x-bzip2'],
            'xz' => ['application/x-xz'],

            // ドキュメント
            'pdf' => ['application/pdf'],
            'doc' => ['application/msword'],
            'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            'xls' => ['application/vnd.ms-excel'],
            'xlsx' => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
            'ppt' => ['application/vnd.ms-powerpoint'],
            'pptx' => ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
            'odt' => ['application/vnd.oasis.opendocument.text'],
            'ods' => ['application/vnd.oasis.opendocument.spreadsheet'],
            'odp' => ['application/vnd.oasis.opendocument.presentation'],
            'rtf' => ['application/rtf', 'text/rtf'],
            'txt' => ['text/plain'],
            'csv' => ['text/csv', 'application/csv'],

            // 画像
            'jpg' => ['image/jpeg'],
            'jpeg' => ['image/jpeg'],
            'png' => ['image/png'],
            'gif' => ['image/gif'],
            'bmp' => ['image/bmp'],
            'svg' => ['image/svg+xml'],
            'webp' => ['image/webp'],
            'tiff' => ['image/tiff'],
            'tif' => ['image/tiff'],
            'ico' => ['image/x-icon', 'image/vnd.microsoft.icon'],

            // 音声
            'mp3' => ['audio/mpeg', 'audio/mp3'],
            'wav' => ['audio/wav', 'audio/x-wav'],
            'aac' => ['audio/aac'],
            'ogg' => ['audio/ogg'],
            'flac' => ['audio/flac'],
            'm4a' => ['audio/mp4', 'audio/x-m4a'],
            'wma' => ['audio/x-ms-wma'],

            // 動画
            'mp4' => ['video/mp4'],
            'avi' => ['video/x-msvideo'],
            'mov' => ['video/quicktime'],
            'wmv' => ['video/x-ms-wmv'],
            'flv' => ['video/x-flv'],
            'mkv' => ['video/x-matroska'],
            'webm' => ['video/webm'],
            'm4v' => ['video/x-m4v'],
            'mpg' => ['video/mpeg'],
            'mpeg' => ['video/mpeg'],

            // 開発・設定ファイル
            'json' => ['application/json'],
            'xml' => ['application/xml', 'text/xml'],
            'yaml' => ['application/x-yaml', 'text/yaml'],
            'yml' => ['application/x-yaml', 'text/yaml'],
            'ini' => ['text/plain'],
            'conf' => ['text/plain'],
            'cfg' => ['text/plain'],
            'log' => ['text/plain'],
            'md' => ['text/markdown', 'text/plain'],
            'html' => ['text/html'],
            'htm' => ['text/html'],
            'css' => ['text/css'],
            'js' => ['application/javascript', 'text/javascript'],

            // プログラミング言語
            'php' => ['application/x-httpd-php', 'text/plain'],
            'py' => ['text/x-python', 'text/plain'],
            'rb' => ['text/x-ruby', 'text/plain'],
            'pl' => ['text/x-perl', 'text/plain'],
            'sh' => ['application/x-sh', 'text/plain'],
            'bat' => ['text/plain'],
            'cmd' => ['text/plain'],
            'ps1' => ['text/plain'],
            'vbs' => ['text/plain'],
            'c' => ['text/x-c', 'text/plain'],
            'cpp' => ['text/x-c++', 'text/plain'],
            'cxx' => ['text/x-c++', 'text/plain'],
            'cc' => ['text/x-c++', 'text/plain'],
            'h' => ['text/x-c', 'text/plain'],
            'hpp' => ['text/x-c++', 'text/plain'],
            'hxx' => ['text/x-c++', 'text/plain'],
            'cs' => ['text/plain'],
            'java' => ['text/x-java', 'text/plain'],
            'go' => ['text/plain'],
            'rs' => ['text/plain'],
            'swift' => ['text/plain'],
            'kt' => ['text/plain'],
            'scala' => ['text/plain'],
            'dart' => ['text/plain'],
            'lua' => ['text/plain'],
            'r' => ['text/plain'],
            'ts' => ['application/typescript', 'text/plain'],
            'jsx' => ['text/plain'],
            'tsx' => ['text/plain'],
            'vue' => ['text/plain'],
            'svelte' => ['text/plain'],
            'm' => ['text/plain'],
            'mm' => ['text/plain']
        ];

        if (isset($allowedMimeTypes[$fileExtension])) {
            if (!in_array($mimeType, $allowedMimeTypes[$fileExtension], true)) {
                $errors[] = "ファイルの内容が拡張子と一致しません。";
            }
        }

        return $errors;
    }

    /**
     * アップロード拡張子ポリシーを取得
     * - 後方互換: config['extension'] がある場合は whitelist に取り込む
     */
    public static function getUploadExtensionPolicy(array $config): array
    {
        $defaultPolicy = [
            'mode' => 'all',
            'whitelist' => [],
            'blacklist' => ['php','phtml','php3','php4','php5','phar','cgi','exe','bat','cmd','ps1','vbs']
        ];

        $policy = $config['upload_extension_policy'] ?? $defaultPolicy;

        // 後方互換: 旧 'extension' が設定されていれば whitelist に統合
        if (!empty($config['extension']) && is_array($config['extension'])) {
            $legacy = array_values(array_unique(array_map('strtolower', $config['extension'])));
            $existingWhitelist = $policy['whitelist'] ?? [];
            $policy['whitelist'] = array_values(array_unique(array_merge($existingWhitelist, $legacy)));
        }

        // 正規化
        $allowedModes = ['all', 'whitelist', 'blacklist'];
        $policyMode = $policy['mode'] ?? 'all';
        $policy['mode'] = in_array($policyMode, $allowedModes, true) ? $policyMode : 'all';
        $policy['whitelist'] = array_values(array_unique(array_map('strtolower', $policy['whitelist'] ?? [])));
        $policy['blacklist'] = array_values(array_unique(array_map('strtolower', $policy['blacklist'] ?? [])));

        return $policy;
    }

    /**
     * 拡張子がポリシー上許可されるか判定
     */
    public static function isExtensionAllowed(string $extension, array $policy): bool
    {
        $ext = strtolower($extension);
        switch ($policy['mode']) {
            case 'whitelist':
                return in_array($ext, $policy['whitelist'], true);
            case 'blacklist':
                return !in_array($ext, $policy['blacklist'], true);
            case 'all':
            default:
                return true;
        }
    }

    /**
     * 安全なファイルパスを生成（強化版）
     */
    public static function generateSafeFilePath(string $uploadDir, string $filename): string
    {
        // ディレクトリトラバーサル攻撃を防ぐ
        $filename = basename($filename);
        $filename = self::sanitizeFilename($filename);

        // アップロードディレクトリのパスを正規化
        $uploadDir = realpath($uploadDir);
        if ($uploadDir === false) {
            throw new Exception('アップロードディレクトリが存在しません');
        }

        // ファイル名が空の場合はランダムな名前を生成
        if (empty($filename)) {
            $filename = 'secure_file_' . time() . '_' . bin2hex(random_bytes(8)) . '.dat';
        }

        // 重複を避けるためにカウンターを追加
        $pathInfo = pathinfo($filename);
        $baseName = $pathInfo['filename'] ?? 'file';
        $extension = isset($pathInfo['extension']) ? '.' . $pathInfo['extension'] : '';

        $counter = 0;
        do {
            if ($counter === 0) {
                $newFilename = $baseName . $extension;
            } else {
                $newFilename = $baseName . '_' . $counter . $extension;
            }
            $fullPath = $uploadDir . DIRECTORY_SEPARATOR . $newFilename;
            $counter++;

            // 無限ループ防止
            if ($counter > 10000) {
                throw new Exception('ファイル名の生成に失敗しました');
            }
        } while (file_exists($fullPath));

        // 生成されたパスがアップロードディレクトリ内にあることを確認
        $realFullPath = realpath(dirname($fullPath));
        if ($realFullPath === false || strpos($realFullPath, $uploadDir) !== 0) {
            throw new Exception('不正なファイルパスが検出されました');
        }

        return $fullPath;
    }

    /**
     * IPアドレスを取得（プロキシ対応・強化版）
     */
    public static function getClientIP(): string
    {
        $headers = [
            'HTTP_CF_CONNECTING_IP',     // Cloudflare
            'HTTP_CLIENT_IP',            // プロキシ
            'HTTP_X_FORWARDED_FOR',      // ロードバランサー/プロキシ
            'HTTP_X_FORWARDED',          // プロキシ
            'HTTP_X_CLUSTER_CLIENT_IP',  // クラスター
            'HTTP_FORWARDED_FOR',        // プロキシ
            'HTTP_FORWARDED',            // プロキシ
            'HTTP_X_REAL_IP',           // Nginx リアルIP
            'REMOTE_ADDR'                // 標準
        ];

        $candidateIPs = [];

        foreach ($headers as $header) {
            if (!empty($_SERVER[$header])) {
                $headerValue = $_SERVER[$header];

                // 複数のIPアドレスが含まれる場合の処理
                if (strpos($headerValue, ',') !== false) {
                    $ips = explode(',', $headerValue);
                    foreach ($ips as $ip) {
                        $ip = trim($ip);
                        if (self::isValidIP($ip)) {
                            $candidateIPs[] = $ip;
                        }
                    }
                } else {
                    $ip = trim($headerValue);
                    if (self::isValidIP($ip)) {
                        $candidateIPs[] = $ip;
                    }
                }
            }
        }

        // プライベートIPを除外してパブリックIPを優先
        foreach ($candidateIPs as $ip) {
            if (!self::isPrivateIP($ip)) {
                return $ip;
            }
        }

        // パブリックIPがない場合は最初の有効なIPを返す
        if (!empty($candidateIPs)) {
            return $candidateIPs[0];
        }

        return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }

    /**
     * IPアドレスの有効性をチェック
     */
    private static function isValidIP(string $ip): bool
    {
        // 基本的なIPアドレス形式チェック
        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            return false;
        }

        // 危険なIPアドレスパターンをチェック
        $dangerousPatterns = [
            '0.0.0.0',
            '255.255.255.255',
            '127.0.0.1'
        ];

        if (in_array($ip, $dangerousPatterns)) {
            return false;
        }

        // IPv4の場合の追加チェック
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            $parts = explode('.', $ip);
            // 各オクテットが0-255の範囲内かチェック
            foreach ($parts as $part) {
                $num = intval($part);
                if ($num < 0 || $num > 255) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * プライベートIPアドレスかどうかチェック
     */
    private static function isPrivateIP(string $ip): bool
    {
        return !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
    }

    /**
     * IP許可リストによるアクセス制御
     */
    public static function checkIPWhitelist(array $allowedIPs = []): bool
    {
        if (empty($allowedIPs)) {
            return true; // 許可リストが空の場合はすべて許可
        }

        $clientIP = self::getClientIP();

        foreach ($allowedIPs as $allowedIP) {
            // CIDR記法のサポート
            if (strpos($allowedIP, '/') !== false) {
                if (self::ipInRange($clientIP, $allowedIP)) {
                    return true;
                }
            } else {
                // 完全一致
                if ($clientIP === $allowedIP) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * IPアドレスがCIDR範囲内にあるかチェック
     */
    private static function ipInRange(string $ip, string $cidr): bool
    {
        list($subnet, $mask) = explode('/', $cidr);

        if (
            !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)
            || !filter_var($subnet, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)
        ) {
            return false;
        }

        $ipLong = ip2long($ip);
        $subnetLong = ip2long($subnet);
        $maskLong = -1 << (32 - intval($mask));

        return ($ipLong & $maskLong) === ($subnetLong & $maskLong);
    }

    /**
     * ファイルアップロードのレート制限チェック
     */
    public static function checkUploadRateLimit(
        string $ip,
        int $maxUploadsPerHour = 50,
        int $maxConcurrentUploads = 5
    ): array {
        $rateLimitDir = dirname(__DIR__, 2) . '/data/rate_limits';
        if (!is_dir($rateLimitDir)) {
            mkdir($rateLimitDir, 0755, true);
        }

        $ipHash = hash('sha256', $ip);
        $rateLimitFile = $rateLimitDir . '/upload_' . $ipHash . '.json';
        $concurrentFile = $rateLimitDir . '/concurrent_' . $ipHash . '.json';

        $currentHour = date('Y-m-d-H');
        $currentTime = time();

        // 1時間あたりのアップロード制限チェック
        $hourlyData = [];
        if (file_exists($rateLimitFile)) {
            $hourlyData = json_decode(file_get_contents($rateLimitFile), true) ?: [];
        }

        // 古いデータをクリーンアップ（2時間以上前のデータを削除）
        $hourlyData = array_filter(
            $hourlyData,
            function ($hour) use ($currentHour) {
                return $hour >= date('Y-m-d-H', strtotime('-2 hours'));
            },
            ARRAY_FILTER_USE_KEY
        );

        $currentHourlyUploads = $hourlyData[$currentHour] ?? 0;
        if ($currentHourlyUploads >= $maxUploadsPerHour) {
            return [
                'allowed' => false,
                'reason' => 'hourly_limit_exceeded',
                'message' => "1時間あたりのアップロード制限({$maxUploadsPerHour}回)を超過しました",
                'retry_after' => 3600 - (time() % 3600) // 次の時間まで
            ];
        }

        // 同時並行アップロード制限チェック
        $concurrentData = [];
        if (file_exists($concurrentFile)) {
            $concurrentData = json_decode(file_get_contents($concurrentFile), true) ?: [];
        }

        // 5分以上前の同時並行データをクリーンアップ
        $concurrentData = array_filter(
            $concurrentData,
            function ($timestamp) use ($currentTime) {
                return ($currentTime - $timestamp) < 300; // 5分
            }
        );

        $currentConcurrent = count($concurrentData);
        if ($currentConcurrent >= $maxConcurrentUploads) {
            return [
                'allowed' => false,
                'reason' => 'concurrent_limit_exceeded',
                'message' => "同時並行アップロード制限({$maxConcurrentUploads}個)を超過しました",
                'retry_after' => 60 // 1分後に再試行
            ];
        }

        // 制限をクリアした場合、カウンターを更新
        $hourlyData[$currentHour] = $currentHourlyUploads + 1;
        file_put_contents($rateLimitFile, json_encode($hourlyData), LOCK_EX);

        // 同時並行アップロードトークンを追加
        $uploadToken = uniqid('upload_', true);
        $concurrentData[$uploadToken] = $currentTime;
        file_put_contents($concurrentFile, json_encode($concurrentData), LOCK_EX);

        return [
            'allowed' => true,
            'upload_token' => $uploadToken,
            'remaining_hourly' => $maxUploadsPerHour - ($currentHourlyUploads + 1),
            'concurrent_slots' => $maxConcurrentUploads - ($currentConcurrent + 1)
        ];
    }

    /**
     * アップロード完了時の同時並行トークンを解放
     */
    public static function releaseUploadToken(string $ip, string $uploadToken): void
    {
        $rateLimitDir = dirname(__DIR__, 2) . '/data/rate_limits';
        $ipHash = hash('sha256', $ip);
        $concurrentFile = $rateLimitDir . '/concurrent_' . $ipHash . '.json';

        if (file_exists($concurrentFile)) {
            $concurrentData = json_decode(file_get_contents($concurrentFile), true) ?: [];

            if (isset($concurrentData[$uploadToken])) {
                unset($concurrentData[$uploadToken]);
                file_put_contents($concurrentFile, json_encode($concurrentData), LOCK_EX);
            }
        }
    }

    /**
     * レート制限データのクリーンアップ（定期実行用）
     */
    public static function cleanupRateLimitData(): int
    {
        $rateLimitDir = dirname(__DIR__, 2) . '/data/rate_limits';
        if (!is_dir($rateLimitDir)) {
            return 0;
        }

        $cleanedFiles = 0;
        $files = glob($rateLimitDir . '/*.json');
        $currentTime = time();

        foreach ($files as $file) {
            if (strpos(basename($file), 'upload_') === 0) {
                // アップロード制限ファイル（24時間以上古いデータを削除）
                $data = json_decode(file_get_contents($file), true) ?: [];
                $filteredData = array_filter(
                    $data,
                    function ($hour) {
                        return $hour >= date('Y-m-d-H', strtotime('-24 hours'));
                    },
                    ARRAY_FILTER_USE_KEY
                );

                if (empty($filteredData)) {
                    unlink($file);
                    $cleanedFiles++;
                } elseif (count($filteredData) !== count($data)) {
                    file_put_contents($file, json_encode($filteredData), LOCK_EX);
                }
            } elseif (strpos(basename($file), 'concurrent_') === 0) {
                // 同時並行制限ファイル（10分以上古いデータを削除）
                $data = json_decode(file_get_contents($file), true) ?: [];
                $filteredData = array_filter(
                    $data,
                    function ($timestamp) use ($currentTime) {
                        return ($currentTime - $timestamp) < 600; // 10分
                    }
                );

                if (empty($filteredData)) {
                    unlink($file);
                    $cleanedFiles++;
                } elseif (count($filteredData) !== count($data)) {
                    file_put_contents($file, json_encode($filteredData), LOCK_EX);
                }
            }
        }

        return $cleanedFiles;
    }

    /**
     * TUSチャンクファイルのクリーンアップ（期限切れと孤立ファイル削除）
     */
    public static function cleanupTusChunkFiles(string $dataDirectory): array
    {
        $result = [
            'expired_chunks' => 0,
            'orphaned_chunks' => 0,
            'database_records' => 0,
            'disk_space_freed' => 0
        ];

        try {
            // データベース接続（簡易版）
            $dbPath = dirname($dataDirectory) . '/db/uploader.db';
            if (!file_exists($dbPath)) {
                return $result;
            }

            $pdo = new PDO('sqlite:' . $dbPath);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

            $currentTime = time();
            $chunksDir = $dataDirectory . '/chunks';

            if (!is_dir($chunksDir)) {
                return $result;
            }

            // 期限切れのTUSアップロードレコードを取得
            $expiredQuery = $pdo->prepare("
                SELECT id, chunk_path 
                FROM tus_uploads 
                WHERE expires_at IS NOT NULL AND expires_at < ? AND completed = 0
            ");
            $expiredQuery->execute([$currentTime]);
            $expiredUploads = $expiredQuery->fetchAll();

            // 期限切れのチャンクファイルとDBレコードを削除
            foreach ($expiredUploads as $upload) {
                if (!empty($upload['chunk_path']) && file_exists($upload['chunk_path'])) {
                    $fileSize = filesize($upload['chunk_path']);
                    if (unlink($upload['chunk_path'])) {
                        $result['expired_chunks']++;
                        $result['disk_space_freed'] += $fileSize;
                    }
                }

                // DBレコードも削除
                $deleteQuery = $pdo->prepare("DELETE FROM tus_uploads WHERE id = ?");
                if ($deleteQuery->execute([$upload['id']])) {
                    $result['database_records']++;
                }
            }

            // 孤立したチャンクファイルの検出と削除（24時間以上古いファイル）
            $chunkFiles = glob($chunksDir . '/*.chunk');
            foreach ($chunkFiles as $chunkFile) {
                $fileAge = $currentTime - filemtime($chunkFile);

                // 24時間以上古いファイルをチェック
                if ($fileAge > 86400) { // 24時間 = 86400秒
                    $uploadId = basename($chunkFile, '.chunk');

                    // データベースに対応するレコードがあるかチェック
                    $recordQuery = $pdo->prepare("SELECT id FROM tus_uploads WHERE id = ?");
                    $recordQuery->execute([$uploadId]);

                    if (!$recordQuery->fetch()) {
                        // 孤立したファイル
                        $fileSize = filesize($chunkFile);
                        if (unlink($chunkFile)) {
                            $result['orphaned_chunks']++;
                            $result['disk_space_freed'] += $fileSize;
                        }
                    }
                }
            }

            // 完了済みだが物理ファイルが残っているレコードも削除
            $completedQuery = $pdo->prepare("
                SELECT id, chunk_path 
                FROM tus_uploads 
                WHERE completed = 1 AND chunk_path IS NOT NULL
            ");
            $completedQuery->execute();
            $completedUploads = $completedQuery->fetchAll();

            foreach ($completedUploads as $upload) {
                if (!empty($upload['chunk_path']) && file_exists($upload['chunk_path'])) {
                    $fileSize = filesize($upload['chunk_path']);
                    if (unlink($upload['chunk_path'])) {
                        $result['expired_chunks']++;
                        $result['disk_space_freed'] += $fileSize;
                    }
                }

                // chunk_pathをNULLに更新
                $updateQuery = $pdo->prepare("UPDATE tus_uploads SET chunk_path = NULL WHERE id = ?");
                $updateQuery->execute([$upload['id']]);
            }
        } catch (Exception $e) {
            error_log('TUS cleanup error: ' . $e->getMessage());
        }

        return $result;
    }

    /**
     * 古いアクセストークンのクリーンアップ
     */
    public static function cleanupExpiredTokens(string $dataDirectory): int
    {
        try {
            $dbPath = dirname($dataDirectory) . '/db/uploader.db';
            if (!file_exists($dbPath)) {
                return 0;
            }

            $pdo = new PDO('sqlite:' . $dbPath);
            $currentTime = time();

            // 期限切れのアクセストークンを削除
            $deleteQuery = $pdo->prepare("DELETE FROM access_tokens WHERE expires_at < ?");
            $deleteQuery->execute([$currentTime]);

            return $deleteQuery->rowCount();
        } catch (Exception $e) {
            error_log('Token cleanup error: ' . $e->getMessage());
            return 0;
        }
    }

    /**
     * 包括的なクリーンアップ処理（定期実行用）
     */
    public static function performMaintenanceCleanup(array $config = []): array
    {
        $dataDirectory = $config['data_directory'] ?? dirname(__DIR__, 2) . '/data';

        $results = [
            'rate_limits' => self::cleanupRateLimitData(),
            'tus_chunks' => self::cleanupTusChunkFiles($dataDirectory),
            'expired_tokens' => self::cleanupExpiredTokens($dataDirectory),
            'timestamp' => time()
        ];

        // クリーンアップログを記録
        $logMessage = sprintf(
            "Maintenance cleanup completed - " .
            "Rate limits: %d files, " .
            "TUS chunks: %d expired + %d orphaned (%.2f MB freed), " .
            "Tokens: %d expired",
            $results['rate_limits'],
            $results['tus_chunks']['expired_chunks'],
            $results['tus_chunks']['orphaned_chunks'],
            $results['tus_chunks']['disk_space_freed'] / 1024 / 1024,
            $results['expired_tokens']
        );
        error_log($logMessage);

        return $results;
    }

    /**
     * ユーザーエージェントを安全に取得
     */
    public static function getUserAgent(): string
    {
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
        return htmlspecialchars($userAgent, ENT_QUOTES, 'UTF-8');
    }

    /**
     * リファラーを安全に取得
     */
    public static function getReferer(): string
    {
        $referer = $_SERVER['HTTP_REFERER'] ?? '';
        return htmlspecialchars($referer, ENT_QUOTES, 'UTF-8');
    }

    /**
     * 安全な文字列エスケープ
     */
    public static function escapeHtml(?string $string): string
    {
        if ($string === null) {
            return '';
        }
        return htmlspecialchars($string, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    /**
     * ランダムなトークンを生成
     */
    public static function generateRandomToken(int $length = 32): string
    {
        return bin2hex(random_bytes($length));
    }

    /**
     * パスワードハッシュを生成（BCRYPT）
     */
    public static function hashPassword(string $password): string
    {
        return password_hash($password, PASSWORD_BCRYPT, [
            'cost' => 12,
        ]);
    }

    /**
     * パスワードハッシュを検証
     */
    public static function verifyPassword(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }

    /**
     * セキュアなファイル名を生成（ハッシュ化）
     */
    public static function generateSecureFileName(int $fileId, string $originalName): string
    {
        // ファイルIDと元のファイル名、現在時刻を組み合わせてハッシュ化
        $data = $fileId . '_' . $originalName . '_' . time() . '_' . bin2hex(random_bytes(8));
        return hash('sha256', $data);
    }

    /**
     * ハッシュ化されたファイル名から拡張子付きのフルファイル名を生成
     */
    public static function generateStoredFileName(string $hashedName, string $extension): string
    {
        return $hashedName . '.' . strtolower($extension);
    }

    /**
     * セキュアな暗号化（AES-256-GCM）
     */
    public static function encryptSecure(string $data, string $key): string
    {
        $iv = random_bytes(12); // GCMでは12バイトのIVが推奨
        $tag = '';

        $encrypted = openssl_encrypt($data, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);

        if ($encrypted === false) {
            throw new Exception('暗号化に失敗しました');
        }

        // IV + TAG + 暗号化データを結合してbase64エンコード
        return base64_encode($iv . $tag . $encrypted);
    }

    /**
     * セキュアな復号化（AES-256-GCM）
     */
    public static function decryptSecure(string $encryptedData, string $key): string
    {
        $data = base64_decode($encryptedData);

        if ($data === false || strlen($data) < 28) { // IV(12) + TAG(16) の最小サイズ
            throw new Exception('不正な暗号化データです');
        }

        $iv = substr($data, 0, 12);
        $tag = substr($data, 12, 16);
        $encrypted = substr($data, 28);

        $decrypted = openssl_decrypt($encrypted, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);

        if ($decrypted === false) {
            throw new Exception('復号化に失敗しました');
        }

        return $decrypted;
    }

    /**
     * レガシー暗号化（AES-256-ECB）の復号化 - 互換性のため
     * @deprecated セキュリティリスクがあるため非推奨
     */
    public static function decryptLegacyECB(string $encryptedData, string $key): string
    {
        $decrypted = openssl_decrypt($encryptedData, 'aes-256-ecb', $key);

        if ($decrypted === false) {
            throw new Exception('レガシー復号化に失敗しました');
        }

        return $decrypted;
    }

    /**
     * セキュアなセッション設定を適用
     */
    public static function configureSecureSession(): void
    {
        // セッションが既に開始されている場合は何もしない
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        // セッションセキュリティ設定
        ini_set('session.cookie_httponly', '1');     // XSS攻撃対策
        ini_set('session.cookie_secure', self::isHttps() ? '1' : '0'); // HTTPS時のみセキュアクッキー
        ini_set('session.cookie_samesite', 'Strict'); // CSRF攻撃対策
        ini_set('session.use_strict_mode', '1');      // セッション固定攻撃対策
        ini_set('session.use_only_cookies', '1');     // URLセッションID無効化
        ini_set('session.entropy_length', '32');      // セッションIDのエントロピー強化

        // セッションクッキーの有効期限を設定
        ini_set('session.cookie_lifetime', '0');      // ブラウザ終了時に削除
        ini_set('session.gc_maxlifetime', '1800');    // 30分でガベージコレクション

        // セッション名をプロジェクト固定（ファイル間で一貫性を保つ）
        // 絶対パスでプロジェクトルートを特定
        $currentFile = __FILE__; // /project/src/Core/Security.php
        $projectRoot = dirname(dirname(dirname($currentFile))); // /project
        $sessionName = 'SECURE_SID_' . substr(hash('sha256', $projectRoot), 0, 8);
        session_name($sessionName);

        // セッション名を設定
    }

    /**
     * セッションを安全に開始
     */
    public static function startSecureSession(): void
    {
        self::configureSecureSession();

        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();

            // セッション固定攻撃対策：定期的にセッションIDを再生成
            if (
                !isset($_SESSION['last_regeneration'])
                || (time() - $_SESSION['last_regeneration']) > 300
            ) { // 5分ごと
                session_regenerate_id(true);
                $_SESSION['last_regeneration'] = time();
            }

            // セッションハイジャック対策：IPアドレスとユーザーエージェントのチェック
            $sessionFingerprint = self::generateSessionFingerprint();
            if (isset($_SESSION['fingerprint']) && $_SESSION['fingerprint'] !== $sessionFingerprint) {
                // セッションが異なる環境で使用されている可能性
                session_destroy();
                session_start();
            }
            $_SESSION['fingerprint'] = $sessionFingerprint;
        }
    }

    /**
     * セッションフィンガープリントを生成
     */
    private static function generateSessionFingerprint(): string
    {
        $data = [
            self::getClientIP(),
            $_SERVER['HTTP_USER_AGENT'] ?? '',
            $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? ''
        ];

        return hash('sha256', implode('|', $data));
    }

    /**
     * HTTPS接続かどうか判定
     */
    private static function isHttps(): bool
    {
        return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
               $_SERVER['SERVER_PORT'] == 443 ||
               (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
    }

    /**
     * セキュアなエラーメッセージを生成（情報漏洩防止）
     */
    public static function sanitizeErrorMessage(string $message, bool $isDebugMode = false): string
    {
        if ($isDebugMode) {
            return $message; // デバッグモードでは詳細情報を表示
        }

        // Remove potentially sensitive patterns and convert to safe, English messages
        $patterns = [
            '/\/[a-zA-Z0-9\/_\-\.]+\/[a-zA-Z0-9\/_\-\.]+\.php/' => '[PATH_HIDDEN]',
            '/\/[a-zA-Z0-9\/_\-\.]+\/db\/[a-zA-Z0-9\/_\-\.]+/' => '[DB_PATH_HIDDEN]',
            '/\/[a-zA-Z0-9\/_\-\.]+\/data\/[a-zA-Z0-9\/_\-\.]+/' => '[DATA_PATH_HIDDEN]',
            '/\/[a-zA-Z0-9\/_\-\.]+\/config\/[a-zA-Z0-9\/_\-\.]+/' => '[CONFIG_PATH_HIDDEN]',
            '/Connection failed: .+/' => 'Database connection error occurred',
            '/SQL error: .+/' => 'Database error occurred',
            '/file_get_contents\(.+\)/' => 'File read error occurred',
            '/openssl_.+failed/' => 'Cryptography error occurred',
            '/[0-9a-fA-F]{32,}/' => '[HASH_HIDDEN]',
            '/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/' => '[IP_HIDDEN]',
            '/on line \d+/' => '',
            '/in \/[^\s]+/' => '',
        ];

        $sanitizedMessage = $message;
        foreach ($patterns as $pattern => $replacement) {
            $sanitizedMessage = preg_replace($pattern, $replacement, $sanitizedMessage);
        }

        // 長すぎるエラーメッセージを制限
        if (strlen($sanitizedMessage) > 200) {
            $sanitizedMessage = mb_substr($sanitizedMessage, 0, 200, 'UTF-8') . '...';
        }

        return $sanitizedMessage;
    }

    /**
     * セキュアなエラーハンドラー
     */
    public static function handleSecureError(Exception $e, bool $isDebugMode = false): void
    {
        $errorId = uniqid('ERR_');
        $sanitizedMessage = self::sanitizeErrorMessage($e->getMessage(), $isDebugMode);

        // 詳細なエラー情報をログに記録
        error_log("Security Error [{$errorId}]: " . $e->getMessage()
            . " in " . $e->getFile() . " on line " . $e->getLine());

        // Show only safe, English message to the user
        if ($isDebugMode) {
            echo "Error [{$errorId}]: " . $sanitizedMessage;
        } else {
            echo "A system error occurred. Error ID: {$errorId}";
        }
    }

    /**
     * 包括的なセキュリティヘッダーを設定
     */
    public static function setSecurityHeaders(bool $includeCSP = true, bool $isApiEndpoint = false): void
    {
        // 基本的なセキュリティヘッダー
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('X-XSS-Protection: 1; mode=block');
        header('Referrer-Policy: strict-origin-when-cross-origin');

        // HTTPS接続時のみHSTSヘッダーを追加
        if (self::isHttps()) {
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
        }

        // Permissions Policy (旧Feature Policy)
        header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()');

        // Content Security Policy (CSP)
        if ($includeCSP) {
            if ($isApiEndpoint) {
                // APIエンドポイント用のCSP（JSON応答のみ）
                header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
            } else {
                // 通常のWebページ用のCSP
                $csp = "default-src 'self'; " .
                       "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; " .
                       "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " .
                       "img-src 'self' data: blob:; " .
                       "font-src 'self' https://cdn.jsdelivr.net; " .
                       "connect-src 'self'; " .
                       "frame-ancestors 'none'; " .
                       "form-action 'self'; " .
                       "base-uri 'self'";
                header("Content-Security-Policy: " . $csp);
            }
        }
    }

    /**
     * API専用セキュリティヘッダーを設定
     */
    public static function setApiSecurityHeaders(): void
    {
        self::setSecurityHeaders(true, true);
        header('Content-Type: application/json; charset=utf-8');
    }

    /**
     * HTTPS強制リダイレクトを実行（条件付き）
     */
    public static function enforceHttpsIfSupported(bool $forceHttps = true): void
    {
        // 既にHTTPS接続の場合は何もしない
        if (self::isHttps()) {
            return;
        }

        // HTTPS強制が無効の場合は何もしない
        if (!$forceHttps) {
            return;
        }

        // サーバーのHTTPS対応を検証
        if (self::isHttpsSupported()) {
            // HTTPSにリダイレクト
            $httpsUrl = 'https://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
            header('HTTP/1.1 301 Moved Permanently');
            header('Location: ' . $httpsUrl);
            exit;
        }
    }

    /**
     * サーバーのHTTPS対応を検証
     */
    private static function isHttpsSupported(): bool
    {
        // 環境変数やサーバー設定からHTTPS対応を検出

        // 1. サーバーポート443が利用可能かチェック
        if ($_SERVER['SERVER_PORT'] == 443) {
            return true;
        }

        // 2. X-Forwarded-Protoヘッダーの存在をチェック（プロキシ環境）
        if (!empty($_SERVER['HTTP_X_FORWARDED_PROTO'])) {
            return true;
        }

        // 3. HTTPSサーバー変数の存在をチェック
        if (!empty($_SERVER['HTTPS'])) {
            return true;
        }

        // 4. 一般的なクラウドプロバイダー（Cloudflare等）のヘッダーをチェック
        if (!empty($_SERVER['HTTP_CF_VISITOR'])) {
            return true;
        }

        // 5. Load Balancer環境のHTTPS検出
        if (!empty($_SERVER['HTTP_X_FORWARDED_SSL']) && $_SERVER['HTTP_X_FORWARDED_SSL'] === 'on') {
            return true;
        }

        // 6. その他の一般的なHTTPS検出方法
        if (!empty($_SERVER['HTTP_X_FORWARDED_SCHEME']) && $_SERVER['HTTP_X_FORWARDED_SCHEME'] === 'https') {
            return true;
        }

        return false;
    }

    /**
     * HTTPS設定の自動検出結果を取得（デバッグ用）
     */
    public static function getHttpsDetectionInfo(): array
    {
        return [
            'is_https' => self::isHttps(),
            'is_https_supported' => self::isHttpsSupported(),
            'server_port' => $_SERVER['SERVER_PORT'] ?? 'unknown',
            'https_var' => $_SERVER['HTTPS'] ?? 'not_set',
            'x_forwarded_proto' => $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? 'not_set',
            'x_forwarded_ssl' => $_SERVER['HTTP_X_FORWARDED_SSL'] ?? 'not_set',
            'cf_visitor' => $_SERVER['HTTP_CF_VISITOR'] ?? 'not_set',
        ];
    }
}
