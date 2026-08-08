<?php

declare(strict_types=1);

$renderHeader = static function (array $variables): string {
    extract($variables, EXTR_SKIP);
    ob_start();
    require dirname(__DIR__, 2) . '/backend/views/header.php';
    return (string)ob_get_clean();
};

$assertContains = static function (string $expected, string $actual, string $message): void {
    if (strpos($actual, $expected) === false) {
        fwrite(STDERR, "FAILED: {$message}" . PHP_EOL);
        exit(1);
    }
};

$customTitleHtml = $renderHeader([
    'title' => 'ワークスペース名',
    'browser_title' => '  Team <Files> & "Docs"  ',
    'uploader_info' => [],
]);
$assertContains(
    '<title>Team &lt;Files&gt; &amp; &quot;Docs&quot;</title>',
    $customTitleHtml,
    'browser_title がエスケープされてタブタイトルへ反映されること',
);
$assertContains(
    '<h1 id="app-page-title">ワークスペース名</h1>',
    $customTitleHtml,
    'browser_title が画面内のワークスペース名を変更しないこと',
);

$fallbackHtml = $renderHeader([
    'title' => '従来タイトル',
    'browser_title' => '   ',
    'uploader_info' => [],
]);
$assertContains(
    '<title>従来タイトル</title>',
    $fallbackHtml,
    'browser_title が空の場合は従来の title へフォールバックすること',
);

$defaultHtml = $renderHeader([
    'title' => [],
    'browser_title' => null,
    'uploader_info' => [],
]);
$assertContains(
    '<title>Enhandiy</title>',
    $defaultHtml,
    'タイトル設定が無効な場合は Enhandiy へフォールバックすること',
);

echo 'Browser title tests passed.' . PHP_EOL;
