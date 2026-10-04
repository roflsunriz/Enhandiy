<?php

// phpcs:disable PSR1.Files.SideEffects
declare(strict_types=1);

use Enhandiy\SecurityUtils;
use Enhandiy\ApiRouter;

// テスト専用の一時DB・セッションを使い、実環境の設定を読み込まない。
$root = getenv('ENHANDIY_TEST_ROOT');
$source = getenv('ENHANDIY_TEST_SOURCE');
if (!$root || !$source || !is_file($root . '/isolated-test')) {
    http_response_code(500);
    exit('Isolated fixture root is required');
}
chdir($root . '/backend/api');
require_once $source . '/backend/core/utils.php';
ini_set('session.save_path', $root . '/sessions');
SecurityUtils::startSecureSession();
$config = [
    'api_enabled' => true, 'api_rate_limit' => 0,
    'api_keys' => [
        'fixture-write' => ['permissions' => ['read', 'write']],
        'fixture-read' => ['permissions' => ['read']],
        'fixture-admin' => ['permissions' => ['read', 'write', 'admin']],
    ],
    'master' => 'fixture-master', 'key' => 'fixture-encryption-key',
    'allow_comment_edit' => !isset($_GET['disabled']),
    'allow_file_replace' => true, 'max_comment' => 32,
    'file_edit_admin_only' => isset($_GET['admin_only']),
    'log_directory' => $root . '/logs', 'data_directory' => $root . '/data',
    'max_file_size' => 1, 'upload_extension_policy' => ['mode' => 'all'],
];
$db = new PDO('sqlite:' . $root . '/db/uploader.db');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->exec('CREATE TABLE IF NOT EXISTS uploaded (id INTEGER PRIMARY KEY, comment TEXT,
    replace_key TEXT, origin_file_name TEXT, stored_file_name TEXT, size INTEGER,
    file_hash TEXT, input_date INTEGER, folder_id INTEGER, updated_at INTEGER)');
$db->exec('CREATE TABLE IF NOT EXISTS folders (id INTEGER PRIMARY KEY, name TEXT)');
$db->exec('CREATE TABLE IF NOT EXISTS file_history (file_id INTEGER, old_comment TEXT,
    new_comment TEXT, old_filename TEXT, new_filename TEXT, old_size INTEGER,
    new_size INTEGER, change_type TEXT, changed_at INTEGER, changed_by TEXT)');
if (!$db->query('SELECT COUNT(*) FROM uploaded')->fetchColumn()) {
    $insert = $db->prepare('INSERT INTO uploaded VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)');
    foreach ([1, 2, 3] as $id) {
        $encrypted = $id === 2
            ? openssl_encrypt('fixture-replace-2', 'aes-256-ecb', $config['key'])
            : SecurityUtils::encryptSecure('fixture-replace-' . $id, $config['key']);
        if ($id === 3) {
            $encrypted = '';
        }
        $insert->execute([$id, 'initial-' . $id, $encrypted, 'file-' . $id . '.txt',
            'stored-' . $id . '.txt', 3, hash('sha256', 'old'), time()]);
        file_put_contents($root . '/data/stored-' . $id . '.txt', 'old');
    }
    $db->exec("INSERT INTO folders VALUES (1, 'fixture-folder')");
}
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if ($path === '/page') {
    $csrf = SecurityUtils::generateCSRFToken();
    $csrf_token = $csrf;
    $files = $db->query('SELECT id, comment, origin_file_name, size, input_date FROM uploaded')
        ->fetchAll(PDO::FETCH_ASSOC);
    ob_start();
    include $source . '/backend/views/modals.php';
    $modals = ob_get_clean();
    $modals = substr($modals, 0, strpos($modals, '<!-- ダウンロード認証'));
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="ja"><head><link rel="stylesheet" href="/bootstrap.css"></head><body>';
    echo '<div id="fileManagerContainer"></div>' . $modals;
    echo '<script>window.config=' . json_encode([
        'csrf_token' => $csrf, 'allow_comment_edit' => true,
        'allow_file_replace' => true, 'folders_enabled' => false,
    ]) . ';window.fileData=' . json_encode($files) . ';window.folderData=[];</script>';
    echo '<script src="/bootstrap.js"></script><script type="module" src="/assets/main.js"></script>';
    echo '<script type="module" src="/assets/file-edit.js"></script></body></html>';
    exit;
}
if (str_starts_with($path, '/assets/') || in_array($path, ['/bootstrap.js', '/bootstrap.css'], true)) {
    $asset = basename($path);
    $file = $source . '/backend/public/assets/' . $asset;
    if ($path === '/bootstrap.js') {
        $file = $source . '/frontend/node_modules/bootstrap/dist/js/bootstrap.bundle.min.js';
    } elseif ($path === '/bootstrap.css') {
        $file = $source . '/frontend/node_modules/bootstrap/dist/css/bootstrap.min.css';
    }
    if (!is_file($file)) {
        http_response_code(404);
        exit;
    }
    header('Content-Type: ' . (str_ends_with($path, '.css') ? 'text/css' : 'text/javascript'));
    readfile($file);
    exit;
}
if ($path === '/session') {
    header('Content-Type: application/json');
    echo json_encode(['csrf' => SecurityUtils::generateCSRFToken()]);
    exit;
}
if ($path === '/state') {
    header('Content-Type: application/json');
    echo json_encode([
        'files' => $db->query('SELECT id, comment, origin_file_name, stored_file_name, size,
            folder_id FROM uploaded ORDER BY id')->fetchAll(PDO::FETCH_ASSOC),
        'history' => $db->query('SELECT file_id, change_type FROM file_history')->fetchAll(PDO::FETCH_ASSOC),
    ]);
    exit;
}
if ($path === '/legacy') {
    $GLOBALS['fixtureConfig'] = $config;
    require $source . '/backend/api/edit-comment.php';
    exit;
}
require_once $source . '/backend/api/auth.php';
require_once $source . '/backend/services/file-api-handler.php';
require_once $source . '/backend/services/folder-api-handler.php';
require_once $source . '/backend/services/system-api-handler.php';
require_once $source . '/backend/routes/router.php';
$router = new ApiRouter($config);
$router->handleRequest();
