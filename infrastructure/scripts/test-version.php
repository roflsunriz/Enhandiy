<?php

/**
 * 配布用設定テンプレートとフロントエンドの製品バージョンを検証する。
 * ユーザーの設定・認証情報を読み取ったり書き換えたりしない。
 */

declare(strict_types=1);

$root = dirname(__DIR__, 2);
$frontend = json_decode(file_get_contents($root . '/frontend/package.json'), true, 512, JSON_THROW_ON_ERROR);
$composer = json_decode(file_get_contents($root . '/composer.json'), true, 512, JSON_THROW_ON_ERROR);

require $root . '/backend/config/config.php.example';
$templateVersion = (new config())->index()['version'];
$expectedVersion = $frontend['version'];

if ($templateVersion !== $expectedVersion) {
    fwrite(STDERR, "Config template version {$templateVersion} does not match frontend {$expectedVersion}.\n");
    exit(1);
}

// Composer's version is intentionally omitted; if restored, it must also agree.
if (isset($composer['version']) && $composer['version'] !== $expectedVersion) {
    fwrite(STDERR, "Composer version does not match frontend {$expectedVersion}.\n");
    exit(1);
}

echo "Version consistency tests passed ({$expectedVersion}).\n";
