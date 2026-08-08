<?php

declare(strict_types=1);

// 本番のプロキシ切り替えを模したセッション回帰テスト。
$sessionDirectory = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'enhandiy-session-' . bin2hex(random_bytes(6));
if (!mkdir($sessionDirectory, 0700, true) && !is_dir($sessionDirectory)) {
    throw new RuntimeException('Failed to create temporary session directory');
}

ini_set('session.save_path', $sessionDirectory);
$_SERVER['HTTP_USER_AGENT'] = 'EnhandiySessionTest/1.0';
$_SERVER['HTTP_ACCEPT_LANGUAGE'] = 'ja';
$_SERVER['REMOTE_ADDR'] = '192.0.2.10';
$_SERVER['SERVER_PORT'] = '80';

require_once dirname(__DIR__, 2) . '/backend/core/utils.php';

SecurityUtils::startSecureSession();
$_SESSION['csrf_token'] = 'stable-token';
$sessionId = session_id();
SecurityUtils::releaseSessionLock();

if (session_status() !== PHP_SESSION_NONE) {
    throw new RuntimeException('Session lock was not released');
}

// リバースプロキシやモバイル回線で送信元IPが変わってもセッションを維持する。
$_SERVER['REMOTE_ADDR'] = '198.51.100.25';
SecurityUtils::startSecureSession();
if (($_SESSION['csrf_token'] ?? null) !== 'stable-token') {
    throw new RuntimeException('CSRF token was unexpectedly invalidated after an IP change');
}
SecurityUtils::releaseSessionLock();

$sessionFile = $sessionDirectory . DIRECTORY_SEPARATOR . 'sess_' . $sessionId;
if (is_file($sessionFile)) {
    unlink($sessionFile);
}
rmdir($sessionDirectory);

echo "Session stability test passed.\n";
