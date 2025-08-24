<?php

declare(strict_types=1);

// 共有リンク互換用の /api/download.php エイリアス
chdir(dirname(__DIR__, 1));
require_once __DIR__ . '/../download.php';
