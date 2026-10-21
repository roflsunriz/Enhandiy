<?php

/**
 * PHP実行環境のセキュリティ基準と必須拡張を検査する。
 */

declare(strict_types=1);

$minimumVersions = [
    '8.2' => '8.2.35',
    '8.3' => '8.3.36',
    '8.4' => '8.4.27',
    '8.5' => '8.5.12',
];

$currentMinor = PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION;
$minimumVersion = $minimumVersions[$currentMinor] ?? null;
$isFutureSupportedMinor = PHP_MAJOR_VERSION === 8 && PHP_MINOR_VERSION > 5;
$isSafeVersion = $isFutureSupportedMinor
    || ($minimumVersion !== null && version_compare(PHP_VERSION, $minimumVersion, '>='));

echo "=== PHP実行環境チェック ===\n";
echo '現在のPHPバージョン: ' . PHP_VERSION . "\n";

if (!$isSafeVersion) {
    fwrite(
        STDERR,
        "❌ このPHP版はサポート対象外です。"
        . "PHP 8.2.35、8.3.36、8.4.27、8.5.12のいずれか以降へ更新してください。\n"
    );
}

$requiredExtensions = ['pdo', 'pdo_sqlite', 'sqlite3', 'openssl', 'json', 'mbstring', 'hash'];
$missingExtensions = [];

foreach ($requiredExtensions as $extension) {
    if (extension_loaded($extension)) {
        echo "✅ 拡張機能 '{$extension}' が利用可能\n";
        continue;
    }

    $missingExtensions[] = $extension;
    fwrite(STDERR, "❌ 拡張機能 '{$extension}' が利用できません\n");
}

if (!$isSafeVersion || $missingExtensions !== []) {
    exit(1);
}

echo "✅ PHP版と必須拡張はサポート条件を満たしています。\n";
