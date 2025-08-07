<?php

declare(strict_types=1);

/**
 * 統合ユーティリティクラスローダー
 * Ver.2.0で分離されたクラスファイルを読み込み
 *
 * リファクタリング後の分離構造：
 * - SecurityUtils -> core/security.php
 * - Logger -> core/logger.php
 * - ResponseHandler -> core/response-handler.php
 *
 * 既存の依存関係を維持するためのブリッジファイル
 */

// 分離されたクラスファイルを読み込み
require_once __DIR__ . '/security.php';
require_once __DIR__ . '/logger.php';
require_once __DIR__ . '/response-handler.php';
