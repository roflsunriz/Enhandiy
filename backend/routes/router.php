<?php

/**
 * RESTful APIルーター - リファクタリング版
 * 分離されたハンドラーを統合した管理クラス
 *
 * ハンドラー構成:
 * - FileApiHandler: ファイル操作API
 * - FolderApiHandler: フォルダ操作API
 * - SystemApiHandler: システム情報API
 */

class ApiRouter
{
    private $config;
    private $auth;
    private ResponseHandler $response;
    private $routes = array();

    // ハンドラーインスタンス
    private FileApiHandler $fileHandler;
    private FolderApiHandler $folderHandler;
    private SystemApiHandler $systemHandler;

    public function __construct($config)
    {
        $this->config = $config;
        $this->auth = new ApiAuth($config);

        // Loggerインスタンスを作成
        $logger = new Logger(
            $config['log_directory'] ?? './logs',
            $config['log_level'] ?? Logger::LOG_INFO
        );

        $this->response = new ResponseHandler($logger);

        // 各ハンドラーを初期化
        $this->fileHandler = new FileApiHandler($config, $this->auth, $this->response);
        $this->folderHandler = new FolderApiHandler($config, $this->auth, $this->response);
        $this->systemHandler = new SystemApiHandler($config, $this->auth, $this->response);

        $this->setupRoutes();
    }

    /**
     * APIルートの設定
     */
    private function setupRoutes()
    {
        // ファイル操作エンドポイント
        $this->addRoute('GET', '/api/files', 'handleGetFiles', array('read'), 'file');
        $this->addRoute('POST', '/api/files', 'handlePostFile', array('write'), 'file');
        $this->addRoute('GET', '/api/files/(\d+)', 'handleGetFile', array('read'), 'file');
        // ダウンロードは共有リンク前提でトークン検証を内部で行うため、ルーターの権限チェックは不要
        $this->addRoute('GET', '/api/files/(\d+)/download', 'handleDownloadFile', array(), 'file');
        $this->addRoute('DELETE', '/api/files/(\d+)', 'handleDeleteFile', array('delete'), 'file');
        $this->addRoute('PUT', '/api/files/(\d+)', 'handleReplaceFile', array('write'), 'file');
        $this->addRoute('POST', '/api/files/(\d+)/replace', 'handleReplaceFile', array('write'), 'file');
        $this->addRoute('PATCH', '/api/files/(\d+)', 'handleUpdateFile', array('write'), 'file');
        // バッチ操作
        // UIはFormDataでPOSTするため、POSTも許可（DELETEはREST互換のため残す）
        $this->addRoute('POST', '/api/files/batch', 'handleBatchDelete', array(), 'file');
        $this->addRoute('DELETE', '/api/files/batch', 'handleBatchDelete', array(), 'file');
        $this->addRoute('PATCH', '/api/files/batch', 'handleBatchMove', array('write'), 'file');
        // 共有リンク
        $this->addRoute('GET', '/api/files/(\d+)/share', 'handleGetShare', array('read'), 'file');
        $this->addRoute('PATCH', '/api/files/(\d+)/share', 'handleUpdateShare', array('write'), 'file');

        // フォルダ操作エンドポイント
        $this->addRoute('GET', '/api/folders', 'handleGetFolders', array('read'), 'folder');
        $this->addRoute('POST', '/api/folders', 'handlePostFolder', array('write'), 'folder');
        $this->addRoute('DELETE', '/api/folders/(\d+)', 'handleDeleteFolder', array('delete'), 'folder');
        $this->addRoute('PATCH', '/api/folders/(\d+)', 'handleUpdateFolder', array('write'), 'folder');

        // システム情報エンドポイント
        $this->addRoute('GET', '/api/status', 'handleGetStatus', array('read'), 'system');
        $this->addRoute('GET', '/api/health', 'handleHealthCheck', array('read'), 'system');

        // 検証系エンドポイント（互換）
        $this->addRoute('POST', '/api/auth/verify-download', 'handleVerifyDownload', array(), 'file');
        $this->addRoute('POST', '/api/auth/verify-delete', 'handleVerifyDelete', array(), 'file');

        // Tus.io アップロードエンドポイント（ルータ経由）
        // 認証はtus-upload.php内でメタデータ等を用いて実施するため、ここでは権限チェックなし
        $this->addRoute('OPTIONS', '/api/tus-upload', 'handleTusProxy', array(), 'file');
        $this->addRoute('POST', '/api/tus-upload', 'handleTusProxy', array(), 'file');
        $this->addRoute('PATCH', '/api/tus-upload/([A-Za-z0-9_\.-]+)', 'handleTusProxyWithId', array(), 'file');
        $this->addRoute('HEAD', '/api/tus-upload/([A-Za-z0-9_\.-]+)', 'handleTusProxyWithId', array(), 'file');
    }

    /**
     * ルートを追加
     */
    private function addRoute($method, $pattern, $handler, $permissions = array(), $handlerType = 'system')
    {
        $this->routes[] = array(
            'method' => $method,
            'pattern' => $pattern,
            'handler' => $handler,
            'permissions' => $permissions,
            'handler_type' => $handlerType
        );
    }

    /**
     * リクエストを処理
     */
    public function handleRequest()
    {
        try {
            // ルートマッチングに必要な情報を先に取得
            $method = $_SERVER['REQUEST_METHOD'];
            $requestUri = $_SERVER['REQUEST_URI'];

            // PHP内蔵サーバー対応: /backend/api/index.php?path=/status のような形式も処理
            if (isset($_GET['path'])) {
                $path = $_GET['path'];
            } else {
                $path = parse_url($requestUri, PHP_URL_PATH);
                // /backend/api/index.php の場合は /api/status に変換
                if (strpos($path, '/backend/api/index.php') !== false) {
                    $path = '/api/status'; // デフォルトでstatusエンドポイントをテスト
                }
            }

            // Tus.io エンドポイントはtus側で検証するため、ここでの認証はスキップ
            $isTusEndpoint = (preg_match('#^/api/tus-upload($|/)#', $path) === 1);

            // ダウンロードはAPIキー不要（仕様）: GET /api/files/{id}/download を無認証で許可
            $isPublicDownload = (
                $_SERVER['REQUEST_METHOD'] === 'GET'
                && preg_match('#^/api/files/\d+/download$#', $path) === 1
            );

            if (!$isTusEndpoint && !$isPublicDownload) {
                // 通常のAPIはここで認証
                if (!$this->auth->authenticate()) {
                    return; // 認証失敗時はauth.phpでレスポンス済み
                }
            }

            // ルートマッチング処理

            foreach ($this->routes as $route) {
                if ($route['method'] !== $method) {
                    continue;
                }

                if (preg_match('#^' . $route['pattern'] . '$#', $path, $matches)) {
                    // 権限チェック
                    foreach ($route['permissions'] as $permission) {
                        if (!$this->auth->hasPermission($permission)) {
                            $this->response->error('Permission denied: ' . $permission, [], 403, 'PERMISSION_DENIED');
                            return;
                        }
                    }

                    // ハンドラー実行
                    array_shift($matches); // 完全マッチを除去
                    $this->executeHandler($route, $matches);
                    return;
                }
            }

            // No matching route found
            $this->response->error('API endpoint not found', [], 404, 'ENDPOINT_NOT_FOUND');
        } catch (Exception $e) {
            error_log('API Router Error: ' . $e->getMessage());
            $this->response->error('Internal server error occurred', [], 500, 'INTERNAL_ERROR');
        }
    }

    /**
     * ハンドラーを実行
     */
    private function executeHandler($route, $matches)
    {
        $handlerMethod = $route['handler'];
        $handlerType = $route['handler_type'];

        try {
            // 適切なハンドラーインスタンスを選択
            switch ($handlerType) {
                case 'file':
                    $handler = $this->fileHandler;
                    break;
                case 'folder':
                    $handler = $this->folderHandler;
                    break;
                case 'system':
                    $handler = $this->systemHandler;
                    break;
                default:
                    throw new Exception("Unknown handler type: $handlerType");
            }

            // メソッドが存在するかチェック
            if (!method_exists($handler, $handlerMethod)) {
                throw new Exception("Handler method not found: $handlerMethod");
            }

            // ハンドラーメソッドを呼び出し
            if (empty($matches)) {
                $handler->$handlerMethod();
            } else {
                // パラメータがある場合は引数として渡す
                call_user_func_array(array($handler, $handlerMethod), $matches);
            }
        } catch (Exception $e) {
            error_log("Handler execution error: " . $e->getMessage());
            $this->response->error('ハンドラー実行エラー: ' . $e->getMessage(), [], 500, 'HANDLER_ERROR');
        }
    }

    /**
     * 利用可能なAPIエンドポイント一覧を取得
     */
    public function getAvailableEndpoints(): array
    {
        $endpoints = [];

        foreach ($this->routes as $route) {
            $endpoints[] = [
                'method' => $route['method'],
                'pattern' => $route['pattern'],
                'permissions' => $route['permissions'],
                'handler_type' => $route['handler_type']
            ];
        }

        return $endpoints;
    }

    /**
     * API統計情報を取得
     */
    public function getApiStats(): array
    {
        return [
            'total_routes' => count($this->routes),
            'file_routes' => count(array_filter($this->routes, fn($r) => $r['handler_type'] === 'file')),
            'folder_routes' => count(array_filter($this->routes, fn($r) => $r['handler_type'] === 'folder')),
            'system_routes' => count(array_filter($this->routes, fn($r) => $r['handler_type'] === 'system')),
            'api_version' => '4.3.5'
        ];
    }
}
