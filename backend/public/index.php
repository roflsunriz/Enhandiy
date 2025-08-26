<?php

declare(strict_types=1);

/**
 * PHP Uploader Ver.2.0 - メインエントリーポイント
 *
 * 簡易フレームワーク with モダンPHP対応
 */

// エラー表示設定（本番環境用）
ini_set('display_errors', '0'); // 本番環境では 0 に設定
error_reporting(E_ALL);

// セキュアなセッション開始
if (session_status() === PHP_SESSION_NONE) {
    // セキュリティクラスがまだ読み込まれていない場合の対処
    if (!class_exists('SecurityUtils')) {
        require_once __DIR__ . '/../core/utils.php';
    }
    SecurityUtils::startSecureSession();
}

try {
    // 設定ファイルの読み込み
    if (!file_exists('../config/config.php')) {
        throw new Exception('設定ファイルが見つかりません。config.php.example を参考に config.php を作成してください。');
    }

    // エラーパラメータをチェック
    $error_message = '';
    if (isset($_GET['error'])) {
        switch ($_GET['error']) {
            case 'expired':
                $error_message = 'この共有リンクは有効期限が切れています。';
                break;
            case 'limit_exceeded':
                $error_message = 'この共有リンクはダウンロード回数制限に達しています。';
                break;
            default:
                $error_message = 'エラーが発生しました。';
                break;
        }
    }

    require_once __DIR__ . '/../config/config.php';
    require_once __DIR__ . '/../core/utils.php';

    $configInstance = new config();
    $config = $configInstance->index();

    // アプリケーション初期化（ディレクトリ自動作成など）
    require_once __DIR__ . '/../models/init.php';
    $db = initializeApp($config);

    // 設定の検証（初期化後に実施し、存在チェックで落ちないようにする）
    $configValidation = $configInstance->validate();
    if (!empty($configValidation)) {
        $errorMessage = '⚠️ セキュリティ設定エラー：' . implode(', ', $configValidation);
        throw new Exception($errorMessage);
    }

    if (!$configInstance->validateSecurityConfig()) {
        throw new Exception('⚠️ 重要：デフォルトのセキュリティキーが使用されています。config.php で master、key、session_salt を変更してください。');
    }

    // HTTPS強制リダイレクト（サーバーが対応している場合のみ）
    $enforceHttps = $config['security']['enforce_https'] ?? false;
    SecurityUtils::enforceHttpsIfSupported($enforceHttps);

    // セキュリティヘッダーの設定
    SecurityUtils::setSecurityHeaders();

    // ページパラメータの取得
    $page = $_GET['page'] ?? 'index';
    $page = preg_replace('/[^a-zA-Z0-9_]/', '', $page); // セキュリティ: 英数字とアンダースコアのみ許可

    // ログ機能の初期化
    $logger = new Logger(
        $config['log_directory'],
        $config['log_level'],
        $db
    );

    // レスポンスハンドラーの初期化
    $responseHandler = new ResponseHandler($logger);

    // アクセスログの記録
    $logger->access(null, 'page_view', 'success');

    // モデルの読み込みと実行
    $modelData = [];
    $modelPath = "../models/{$page}.php";

    if (file_exists($modelPath)) {
        require_once $modelPath;

        if (class_exists($page)) {
            $model = new $page();
            if (method_exists($model, 'index')) {
                $result = $model->index();
                if (is_array($result)) {
                    $modelData = $result;
                }
            }
        }
    }

    // CSRFトークンの生成
    $csrf_token = SecurityUtils::generateCSRFToken();

    // ビューの描画
    $viewData = array_merge($config, $modelData, [
        'logger' => $logger,
        'responseHandler' => $responseHandler,
        'db' => $db,
        'csrf_token' => $csrf_token,
        'deleted_status' => $_GET['deleted'] ?? null,
        'uploaded_status' => $_GET['uploaded'] ?? null,
        'error_message' => $error_message
    ]);

    // 変数の展開
    extract($viewData);

    // ヘッダーの出力
    require __DIR__ . '/../views/header.php';

    // メインコンテンツの出力
    $viewPath = "../views/{$page}.php";
    if (file_exists($viewPath)) {
        require $viewPath;
    } else {
        $error = '404 - ページが見つかりません。';
        require __DIR__ . '/../views/error.php';
    }

    // フッターの出力
    require __DIR__ . '/../views/footer.php';
} catch (Exception $e) {
    // セキュアなエラーハンドリング
    $isDebugMode = (ini_get('display_errors') == '1');
    $errorId = uniqid('SYS_ERR_');

    // 詳細なエラー情報をログに記録
    if (isset($logger)) {
        $logger->error("System Error [{$errorId}]: " . $e->getMessage(), [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $isDebugMode ? $e->getTraceAsString() : '[TRACE_HIDDEN]'
        ]);
    } else {
        // ログが利用できない場合はファイルに直接記録
        $logMessage = date('Y-m-d H:i:s') . " [CRITICAL] [{$errorId}] " . $e->getMessage() .
            " in " . $e->getFile() . " on line " . $e->getLine() . PHP_EOL;
        @file_put_contents('../../storage/logs/critical.log', $logMessage, FILE_APPEND | LOCK_EX);
    }

    // セキュアなエラーメッセージを生成
    if ($isDebugMode) {
        $errorMessage = htmlspecialchars(
            SecurityUtils::sanitizeErrorMessage($e->getMessage(), true),
            ENT_QUOTES,
            'UTF-8'
        );
    } else {
        // ユーザー向けの簡易ヒント
        $basicHint = '時間をおいて再試行し、改善しない場合は管理者にこのエラーIDを伝えてください。';
        $errorMessage = "システムエラーが発生しました。エラーID: {$errorId}<br>対処: {$basicHint}";
    }

    // シンプルなエラーページの表示
    http_response_code(500);
    echo '<!DOCTYPE html>';
    echo '<html><head><meta charset="UTF-8"><title>システムエラー</title></head>';
    echo '<body><h1>システムエラー</h1>';
    echo '<p>' . $errorMessage . '</p>';
    echo '<p><a href="./index.php">トップページに戻る</a></p>';
    echo '</body></html>';
}
