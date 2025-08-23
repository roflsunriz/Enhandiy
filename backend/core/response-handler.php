<?php

// phpcs:disable PSR1.Files.SideEffects

declare(strict_types=1);

// Logger.phpが必要な場合のため
require_once __DIR__ . '/logger.php';

/**
 * レスポンスハンドラークラス
 * API応答を統一化
 */
class ResponseHandler
{
    private Logger $logger;
    private array $hints;

    public function __construct(Logger $logger)
    {
        $this->logger = $logger;
        // エラーヒントの読み込み（存在しない場合は空配列）
        $hintsPath = __DIR__ . '/error-hints.php';
        $this->hints = file_exists($hintsPath) ? (require $hintsPath) : [];
    }

    /**
     * 成功応答を送信
     */
    public function success(string $message, array $data = []): void
    {
        $response = [
            'status' => 'success',
            'message' => $message,
            'data' => $data,
            'timestamp' => date('c')
        ];

        $this->sendJson($response);
    }

    /**
     * エラー応答を送信
     */
    public function error(
        string $message,
        array $validationErrors = [],
        int $httpCode = 400,
        ?string $errorCode = null
    ): void {
        $errorId = uniqid('API_ERR_');

        $response = [
            'status' => 'error',
            'message' => $message,
            'timestamp' => date('c'),
            'error_id' => $errorId
        ];

        if (!empty($validationErrors)) {
            $response['validation_errors'] = $validationErrors;
        }

        if ($errorCode !== null) {
            $response['error_code'] = $errorCode;
            // ユーザー向けヒントを付与
            if (isset($this->hints[$errorCode])) {
                $response['hint'] = $this->hints[$errorCode];
            }
        }

        // ログ出力にエラーIDを含める
        $this->logger->error("API Error [{$errorId}]" . ($errorCode ? " {$errorCode}" : '') . ": {$message}");

        http_response_code($httpCode);
        $this->sendJson($response);
    }

    /**
     * JSON応答を送信
     */
    private function sendJson(array $data): void
    {
        // 出力バッファをクリア
        if (ob_get_level()) {
            ob_clean();
        }

        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }

    /**
     * リダイレクト
     */
    public function redirect(string $url, int $httpCode = 302): void
    {
        http_response_code($httpCode);
        header("Location: {$url}");
        exit;
    }
}
