<?php

// phpcs:disable PSR1.Files.SideEffects

declare(strict_types=1);

/**
 * ファイルダウンロード処理
 *
 * ワンタイムトークンによる安全なダウンロード
 */

// エラー表示設定
ini_set('display_errors', '0');
ini_set('log_errors', '1'); // ログファイルにエラーを記録
error_reporting(E_ALL);

try {
    // 設定とユーティリティの読み込み
    require_once __DIR__ . '/../config/config.php';
    require_once __DIR__ . '/../core/utils.php';

    $configInstance = new config();
    $config = $configInstance->index();

    // アプリケーション初期化
    require_once __DIR__ . '/../models/init.php';
    $db = initializeApp($config);

    // ログ機能の初期化
    $logger = new Logger($config['log_directory'], $config['log_level'], $db);

    // パラメータの取得（GET/POST両対応）
    $fileId = (int)($_GET['id'] ?? ($_POST['id'] ?? 0));
    $token = $_GET['key'] ?? ($_POST['key'] ?? '');

    if ($fileId <= 0) {
        $logger->warning('Invalid download parameters', ['file_id' => $fileId, 'token_provided' => !empty($token)]);
        header('Location: ./');
        exit;
    }

    // トークンの検証
    $tokenStmt = $db->prepare("
        SELECT t.*, u.origin_file_name, u.stored_file_name, u.size, u.file_hash
        FROM access_tokens t
        JOIN uploaded u ON t.file_id = u.id
        WHERE t.token = :token AND t.token_type = 'download' AND t.file_id = :file_id AND t.expires_at > :now
    ");

    $tokenStmt->execute([
        'token' => $token,
        'file_id' => $fileId,
        'now' => time()
    ]);

    $tokenData = $tokenStmt->fetch();

    if (!$tokenData) {
        $logger->info(
            'Token not found in access_tokens, trying legacy share link validation',
            ['file_id' => $fileId, 'token' => substr($token, 0, 8) . '...']
        );
        // 古い共有リンク処理にフォールバック
        validateLegacyShareLink($fileId, $token, $config, $db, $logger);
        exit;
    }

    // IPアドレスの検証（設定で有効な場合）
    if ($config['security']['log_ip_address'] && !empty($tokenData['ip_address'])) {
        $currentIP = $_SERVER['REMOTE_ADDR'] ?? '';
        if ($currentIP !== $tokenData['ip_address']) {
            $logger->warning('IP address mismatch for download', [
                'file_id' => $fileId,
                'token_ip' => $tokenData['ip_address'],
                'current_ip' => $currentIP
            ]);
            // IPアドレスが異なる場合は警告ログのみで、ダウンロードは継続
        }
    }

    // ファイルパスの生成（ハッシュ化されたファイル名または旧形式に対応）
    $fileName = $tokenData['origin_file_name'];

    if (!empty($tokenData['stored_file_name'])) {
        // 新形式（ハッシュ化されたファイル名）
        $filePath = $config['data_directory'] . '/' . $tokenData['stored_file_name'];
    } else {
        // 旧形式（互換性のため）
        $fileExtension = pathinfo($fileName, PATHINFO_EXTENSION);
        $filePath = $config['data_directory'] . '/file_' . $fileId . '.' . $fileExtension;
    }

    // ファイルの存在確認
    if (!file_exists($filePath)) {
        $logger->error('Physical file not found for download', ['file_id' => $fileId, 'path' => $filePath]);
        header('Location: ./');
        exit;
    }

    // ファイルハッシュの検証（ファイル整合性チェック）
    if (!empty($tokenData['file_hash'])) {
        $currentHash = hash_file('sha256', $filePath);
        if ($currentHash !== $tokenData['file_hash']) {
            $logger->error('File integrity check failed', [
                'file_id' => $fileId,
                'expected_hash' => $tokenData['file_hash'],
                'current_hash' => $currentHash
            ]);
            header('Location: ./');
            exit;
        }
    }

    // ダウンロード回数の更新
    $updateStmt = $db->prepare('UPDATE uploaded SET "count" = "count" + 1, updated_at = :updated_at WHERE id = :id');
    $updateStmt->execute([
        'id' => $fileId,
        'updated_at' => time()
    ]);

    // 使用済みトークンの削除（ワンタイム）
    $deleteTokenStmt = $db->prepare("DELETE FROM access_tokens WHERE token = :token");
    $deleteTokenStmt->execute(['token' => $token]);

    // アクセスログの記録
    $logger->access($fileId, 'download', 'success');

    // ファイルダウンロードの実行
    $fileSize = filesize($filePath);

    // ヘッダーの設定
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename*=UTF-8\'\'' . rawurlencode($fileName));
    header('Content-Length: ' . $fileSize);
    header('Cache-Control: no-cache, must-revalidate');
    header('Expires: 0');

    // 出力バッファのクリア
    if (ob_get_level()) {
        ob_end_clean();
    }

    // ファイルの出力
    $handle = fopen($filePath, 'rb');
    if ($handle) {
        while (!feof($handle)) {
            echo fread($handle, 8192);
            flush();
        }
        fclose($handle);
    } else {
        $logger->error('Failed to open file for download', ['file_id' => $fileId, 'path' => $filePath]);
        header('Location: ./');
    }
} catch (Exception $e) {
    // 緊急時のエラーハンドリング
    if (isset($logger)) {
        $logger->error('Download Error: ' . $e->getMessage(), [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'file_id' => $fileId ?? null
        ]);
    }

    header('Location: ./');
    exit;
}

/**
 * 古い共有リンクの検証とダウンロード処理
 */
function validateLegacyShareLink($id, $dlkey, $config, $db, $logger)
{
    // ファイル情報取得
    $stmt = $db->prepare("SELECT * FROM uploaded WHERE id = :id");
    $stmt->bindValue(':id', $id);
    $stmt->execute();
    $result = $stmt->fetchAll();

    if (empty($result)) {
        $logger->warning('File not found for legacy share link', ['file_id' => $id]);
        header('Location: ./');
        exit;
    }

    $fileData = $result[0];
    $filename = $fileData['origin_file_name'];
    $origin_dlkey = $fileData['dl_key_hash']; // 修正：dl_key_hashを使用
    $current_count = $fileData['count'];
    $max_downloads = $fileData['max_downloads'];
    $expires_at = $fileData['expires_at'];

    // 共有リンクトークンの検証（DLキーの有無に関わらず実行）
    $share_key_source = '';
    if (!empty($origin_dlkey) && trim((string)$origin_dlkey) !== '') {
        $share_key_source = $origin_dlkey;
    } else {
        // DLキー未設定（null/空文字）は、生成時と同じ固定ソースを使用
        $share_key_source = 'no_key_file_' . $id;
    }

    $validToken = false;

    // 新形式（安定トークン: HMAC的な固定ハッシュ）で検証
    $expectedToken = hash('sha256', $share_key_source . '|' . $config['key']);
    if ($dlkey === $expectedToken) {
        $validToken = true;
    }

    // 新形式で一致しない場合は、レガシーのECB形式も試行（DLキーが設定されている場合のみ）
    if (!$validToken && !empty($origin_dlkey) && trim((string)$origin_dlkey) !== '') {
        // レガシーのECB形式で検証（DLキーが設定されている場合のみ）
        try {
            if (PHP_MAJOR_VERSION == '5' and PHP_MINOR_VERSION == '3') {
                $expectedToken = bin2hex(openssl_encrypt($origin_dlkey, 'aes-256-ecb', $config['key'], true));
            } else {
                $expectedToken = bin2hex(openssl_encrypt(
                    $origin_dlkey,
                    'aes-256-ecb',
                    $config['key'],
                    OPENSSL_RAW_DATA
                ));
            }

            if ($dlkey === $expectedToken) {
                $validToken = true;
                $logger->info('Legacy ECB token used', ['file_id' => $id]);
            }
        } catch (Exception $e) {
            $logger->warning('Legacy token verification failed', ['error' => $e->getMessage()]);
        }
    }

    if (!$validToken) {
        $logger->warning('Invalid share link token', ['file_id' => $id]);
        header('Location: ./');
        exit;
    }

    // 制限チェック
    // 有効期限チェック
    if ($expires_at !== null && $expires_at < time()) {
        $logger->warning('Share link expired', ['file_id' => $id, 'expires_at' => $expires_at]);
        header('Location: ./?error=expired');
        exit;
    }

    // ダウンロード回数制限チェック
    if ($max_downloads !== null && $current_count >= $max_downloads) {
        $logger->warning(
            'Download limit exceeded',
            ['file_id' => $id, 'count' => $current_count, 'max' => $max_downloads]
        );
        header('Location: ./?error=limit_exceeded');
        exit;
    }

    // ファイルパス生成（新形式 stored_file_name 優先、なければ旧形式にフォールバック）
    if (!empty($fileData['stored_file_name'])) {
        $filePath = $config['data_directory'] . '/' . $fileData['stored_file_name'];
    } else {
        $fileExtension = pathinfo($filename, PATHINFO_EXTENSION);
        $filePath = $config['data_directory'] . '/file_' . $id . '.' . $fileExtension;
    }

    // ファイル存在確認
    if (!file_exists($filePath)) {
        $logger->error('Physical file not found for legacy share link', ['file_id' => $id, 'path' => $filePath]);
        header('Location: ./');
        exit;
    }

    // 共有リンク経由でもダウンロードキーを要求（dl_key_hash が設定されている場合）
    if (!empty($origin_dlkey) && trim((string)$origin_dlkey) !== '') {
        // 入力されたダウンロードキーを取得（GET/POST両対応）
        $inputDlKey = $_POST['auth'] ?? $_POST['dlkey'] ?? $_GET['auth'] ?? $_GET['dlkey'] ?? '';

        // 未入力または不一致の場合は入力フォームを表示
        $showForm = false;
        $invalid = false;
        if ($inputDlKey === '') {
            $showForm = true;
        } else {
            // ハッシュ照合
            try {
                if (!SecurityUtils::verifyPassword($inputDlKey, (string)$origin_dlkey)) {
                    $invalid = true;
                    $showForm = true;
                }
            } catch (Exception $e) {
                $invalid = true;
                $showForm = true;
            }
        }

        if ($showForm) {
            // ダウンロードキー認証フォーム（モダンUI, POST送信）
            header('Content-Type: text/html; charset=UTF-8');
            echo '<!DOCTYPE html>';
            echo '<html lang="ja">';
            echo '<head>';
            echo '<meta charset="UTF-8">';
            echo '<meta name="viewport" content="width=device-width, initial-scale=1">';
            echo '<title>ダウンロード認証</title>';
            echo '<style>';
            echo ':root{--bg:#0f172a;--card:#ffffff;--muted:#6b7280;--border:#e5e7eb;--accent:#2563eb;';
            echo '--accent2:#7c3aed;}';
            echo 'body{min-height:100vh;margin:0;padding:24px;display:flex;align-items:center;justify-content:center;';
            echo 'background:radial-gradient(1200px 600px at 20% -10%,rgba(124,58,237,.25),transparent),';
            echo 'radial-gradient(1000px 600px at 90% 110%,rgba(37,99,235,.25),transparent),#f8fafc;';
            echo 'font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}';
            echo '.card{width:100%;max-width:480px;background:var(--card);border:1px solid var(--border);';
            echo 'border-radius:14px;box-shadow:0 10px 30px rgba(2,6,23,.06);overflow:hidden;}';
            echo '.card__head{padding:24px 24px 0 24px;text-align:center;}';
            echo '.brand{width:52px;height:52px;margin:8px auto 12px auto;border-radius:12px;';
            echo 'background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;';
            echo 'justify-content:center;color:#fff;font-size:22px;box-shadow:0 8px 20px rgba(37,99,235,.35);}';
            echo '.title{margin:0 0 6px 0;font-size:20px;font-weight:700;color:#0f172a;}';
            echo '.desc{margin:0 0 16px 0;color:var(--muted);font-size:14px;line-height:1.6;}';
            echo '.alert{padding:10px 12px;margin:0 24px 12px 24px;border-radius:10px;background:#fee2e2;';
            echo 'color:#991b1b;border:1px solid #fecaca;}';
            echo '.card__body{padding:8px 24px 24px 24px;}';
            echo 'label{display:block;margin:12px 0 8px 0;color:#111827;font-weight:600;font-size:14px;}';
            echo '.input-wrap{position:relative;}';
            echo 'input[type=password],input[type=text]{width:88%;padding:12px 44px 12px 12px;';
            echo 'border:1px solid var(--border);border-radius:10px;font-size:16px;outline:none;';
            echo 'transition:border-color .15s,box-shadow .15s;}';
            echo 'input[type=password]:focus,input[type=text]:focus{border-color:var(--accent);';
            echo 'box-shadow:0 0 0 4px rgba(37,99,235,.12);}';
            echo '.toggle{position:absolute;right:8px;top:50%;transform:translateY(-50%);padding:6px 10px;';
            echo 'border:1px solid var(--border);';
            echo 'border-radius:8px;';
            echo 'background:#f3f4f6;';
            echo 'color:#111827;';
            echo 'font-size:12px;';
            echo 'cursor:pointer;}';
            echo '.toggle:hover{background:#e5e7eb;}';
            echo '.submit{width:100%;margin-top:16px;padding:12px 14px;border:0;border-radius:10px;cursor:pointer;';
            echo 'font-size:15px;font-weight:700;color:#fff;';
            echo 'background:linear-gradient(135deg,var(--accent),var(--accent2));';
            echo 'box-shadow:0 8px 20px rgba(37,99,235,.35);}';
            echo '.submit:disabled{opacity:.7;cursor:not-allowed;}';
            echo '.hint{margin-top:10px;color:var(--muted);font-size:12px;}';
            echo '.footer{padding:0 24px 20px 24px;display:flex;';
            echo 'justify-content:center;}';
            echo '.back{display:inline-block;margin-top:6px;color:#374151;font-size:13px;text-decoration:none;}';
            echo '.back:hover{text-decoration:underline;}';
            echo '</style>';
            echo '</head>';
            echo '<body>';
            echo '<div class="card">';
            echo '<div class="card__head">';
            echo '<div class="brand" aria-hidden="true">🔒</div>';
            echo '<h1 class="title">ダウンロード認証</h1>';
            echo '<p class="desc">共有リンクからのダウンロードには、ダウンロードキーの入力が必要です。</p>';
            echo '</div>';
            if ($invalid) {
                echo '<div class="alert">ダウンロードキーが違うのじゃ。もう一度試すのじゃ。</div>';
            }
            echo '<div class="card__body">';
            echo '<form id="authForm" method="post" action="download.php" novalidate>';
            echo '<input type="hidden" name="id" value="' .
                 htmlspecialchars((string)$id, ENT_QUOTES, 'UTF-8') . '">';
            $escapedDlkey = htmlspecialchars((string)$dlkey, ENT_QUOTES, 'UTF-8');
            echo '<input type="hidden" name="key" value="' . $escapedDlkey . '">';
            echo '<label for="authInput">ダウンロードキー</label>';
            echo '<div class="input-wrap">';
            echo '<input id="authInput" type="password" name="auth" autocomplete="one-time-code" required>';
            echo '<button id="toggleBtn" class="toggle" type="button" aria-pressed="false">表示</button>';
            echo '</div>';
            echo '<button id="submitBtn" class="submit" type="submit">認証してダウンロード</button>';
            echo '<div class="hint">リンクの有効期限・回数制限が適用されます。</div>';
            echo '</form>';
            echo '</div>';
            echo '<div class="footer">';
            echo '<a class="back" href="./">トップへ戻る</a>';
            echo '</div>';
            echo '</div>';
            echo '<script>';
            echo '(function(){';
            echo 'var input=document.getElementById("authInput");';
            echo 'var btn=document.getElementById("toggleBtn");';
            echo 'var form=document.getElementById("authForm");';
            echo 'var submitBtn=document.getElementById("submitBtn");';
            echo 'if(btn&&input){btn.addEventListener("click",function(){';
            echo 'var isPw=input.getAttribute("type")==="password";';
            echo 'input.setAttribute("type",isPw?"text":"password");';
            echo 'btn.setAttribute("aria-pressed",String(isPw));';
            echo 'btn.textContent=isPw?"非表示":"表示";});}';
            echo 'if(form&&submitBtn){form.addEventListener("submit",function(){';
            echo 'submitBtn.setAttribute("disabled","disabled");';
            echo 'submitBtn.textContent="認証中...";});}';
            echo '})();';
            echo '</script>';
            echo '</body>';
            echo '</html>';
            exit;
        }
    }

    // ダウンロード回数を増加（max_downloadsがある場合でも増やす）
    $updateStmt = $db->prepare('UPDATE uploaded SET "count" = "count" + 1 WHERE id = :id');
    $updateStmt->execute(['id' => $id]);

    // ファイルダウンロード
    header('Content-Description: File Transfer');
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Expires: 0');
    header('Cache-Control: must-revalidate');
    header('Pragma: public');
    header('Content-Length: ' . filesize($filePath));

    $logger->info('Legacy share link download completed', ['file_id' => $id, 'filename' => $filename]);

    readfile($filePath);
    exit;
}
