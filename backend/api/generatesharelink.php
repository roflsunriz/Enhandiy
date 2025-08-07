<?php

// エラーを画面に表示(1を0にすると画面上にはエラーは出ない)
ini_set('display_errors', 0);
// JSONリクエストをパースして$_POSTを初期化
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (stripos($contentType, 'application/json') !== false) {
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);
    if (is_array($json)) {
        $_POST = $json;
    }
}
// GETリクエスト: 共有設定のみを取得
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['id'])) {
    header('Content-Type: application/json; charset=utf-8');
    $id = $_GET['id'];
    // config読み込み
    include_once('../config/config.php');
    $config = new config();
    $ret = $config->index();
    if (!is_null($ret) && is_array($ret)) {
        extract($ret);
    }
    try {
        $db = new PDO('sqlite:' . $db_directory . '/uploader.db');
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'sqlerror']);
        exit;
    }
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $stmt = $db->prepare('SELECT max_downloads, expires_at FROM uploaded WHERE id = :id');
    $stmt->bindValue(':id', $id);
    $stmt->execute();
    $row = $stmt->fetch();
    if (!$row) {
        echo json_encode(['success' => false, 'error' => 'not_found']);
        exit;
    }
    $current_max_downloads = $row['max_downloads'];
    $current_expires_at = $row['expires_at'];
    // 有効期限を日数に変換
    $expires_days = null;
    if ($current_expires_at !== null) {
        $remaining = $current_expires_at - time();
        $expires_days = $remaining > 0 ? ceil($remaining / (24 * 60 * 60)) : 0;
    }
    echo json_encode([
        'success' => true,
        'data' => [
            'max_downloads' => $current_max_downloads,
            'expires_days' => $expires_days
        ]
    ]);
    exit;
}
$id = $_POST['id'];
$max_downloads = isset($_POST['max_downloads']) ? (int)$_POST['max_downloads'] : null;
$expires_days = isset($_POST['expires_days']) ? (int)$_POST['expires_days'] : null;
// POSTで更新設定のみ保存
$action = $_POST['action'] ?? '';
// 設定保存用アクション
if ($action === 'updateSettings') {
    header('Content-Type: application/json; charset=utf-8');
    // config読み込み
    include_once('../config/config.php');
    $config = new config();
    $ret = $config->index();
    if (!is_null($ret) && is_array($ret)) {
        extract($ret);
    }
    // 有効期限を計算
    $expires_at = null;
    if ($expires_days && $expires_days > 0) {
        $expires_at = time() + ($expires_days * 24 * 60 * 60);
    }
    // DB更新
    try {
        $db = new PDO('sqlite:' . $db_directory . '/uploader.db');
        $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $update = $db->prepare(
            'UPDATE uploaded SET max_downloads = :max_downloads, expires_at = :expires_at WHERE id = :id'
        );
        $update->bindValue(':max_downloads', $max_downloads);
        $update->bindValue(':expires_at', $expires_at);
        $update->bindValue(':id', $id);
        $update->execute();
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'sqlerror']);
        exit;
    }
    echo json_encode([
        'success' => true,
        'data' => [
            'max_downloads' => $max_downloads,
            'expires_days' => $expires_days
        ]
    ]);
    exit;
}
// 有効期限を計算（日数から UNIX タイムスタンプに変換）
$expires_at = null;
if ($expires_days && $expires_days > 0) {
    $expires_at = time() + ($expires_days * 24 * 60 * 60);
}

// configをインクルード
include_once('../config/config.php');
require_once('../core/security.php');
$config = new config();
$ret = $config->index();
// 配列キーが設定されている配列なら展開
if (!is_null($ret)) {
    if (is_array($ret)) {
        extract($ret);
    }
}

// データベースの作成・オープン
try {
    $db = new PDO('sqlite:' . $db_directory . '/uploader.db');
} catch (Exception $e) {
    // DBエラーを返す
    echo json_encode(array('success' => false, 'error' => 'sqlerror'));
    exit;
}

// デフォルトのフェッチモードを連想配列形式に設定
// (毎回PDO::FETCH_ASSOCを指定する必要が無くなる)
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

// 選択 (プリペアドステートメント)
$stmt = $db->prepare("SELECT * FROM uploaded WHERE id = :id");
$stmt->bindValue(':id', $id); // ID
$stmt->execute();
$result = $stmt->fetchAll();

if (empty($result)) {
    // 対象のファイルが見つからないエラーを返す
    echo json_encode(array('success' => false, 'error' => 'not_found'));
    exit;
}

$fileData = $result[0];
$filename = $fileData['origin_file_name'];
$comment = $fileData['comment'];
$origin_dlkey = $fileData['dl_key_hash'];
$current_max_downloads = $fileData['max_downloads'];
$current_expires_at = $fileData['expires_at'];

// DLキーが設定されていない場合の処理
if (is_null($origin_dlkey) || trim($origin_dlkey) === '') {
    // DLキーがnullの場合は、ファイルIDを文字列として使用
    $share_key_source = 'no_key_file_' . $id;
} else {
    // DLキーが設定されている場合は、ハッシュを使用
    $share_key_source = $origin_dlkey;
}

// 制限情報を更新（変更があった場合のみ）
$should_update = false;
if (isset($_POST['max_downloads']) && $max_downloads !== $current_max_downloads) {
    $should_update = true;
}
if (isset($_POST['expires_days']) && $expires_at !== $current_expires_at) {
    $should_update = true;
}

if ($should_update) {
    $updateStmt = $db->prepare(
        "UPDATE uploaded SET max_downloads = :max_downloads, expires_at = :expires_at WHERE id = :id"
    );
    $updateStmt->bindValue(':max_downloads', $max_downloads);
    $updateStmt->bindValue(':expires_at', $expires_at);
    $updateStmt->bindValue(':id', $id);
    $updateStmt->execute();

    // 更新後の値を使用
    $current_max_downloads = $max_downloads;
    $current_expires_at = $expires_at;
}

// 共有用のトークンを生成（セキュアなGCMモード使用）
try {
    $share_key = bin2hex(SecurityUtils::encryptSecure($share_key_source, $key));
} catch (Exception $e) {
    error_log('Share link generation failed: ' . $e->getMessage());
    header('Location: ./');
    exit;
}

// 現在のプロトコルとホストを取得してベースURLを構築
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'
             || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
$host = $_SERVER['HTTP_HOST'];
$base_path = dirname(dirname(dirname($_SERVER['SCRIPT_NAME']))); // /backend/api から3階層上へ（ルートへ）
if ($base_path === '/' || $base_path === '\\') {
    $base_path = '';
}

$share_url = $protocol . $host . $base_path . '/download.php?id=' . $id . '&key=' . $share_key;

// 有効期限を日数に変換
$expires_days = null;
if ($current_expires_at !== null) {
    $remaining_seconds = $current_expires_at - time();
    if ($remaining_seconds > 0) {
        $expires_days = ceil($remaining_seconds / (24 * 60 * 60));
    } else {
        $expires_days = 0; // 期限切れ
    }
}

// 成功レスポンスを返す
header('Content-Type: application/json; charset=utf-8');
echo json_encode(array(
    'success' => true,
    'data' => array(
        'share_key' => $share_key,
        'share_url' => $share_url,
        'share_url_with_comment' => $comment . "\n" . $share_url,
        'max_downloads' => $current_max_downloads,
        'expires_days' => $expires_days
    )
));
exit;
