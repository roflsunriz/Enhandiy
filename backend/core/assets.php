<?php

declare(strict_types=1);

/**
 * デプロイ後に古い固定名アセットがブラウザキャッシュから混在しないURLを返す。
 */
function enhandiy_asset_url(string $assetName): string
{
    $safeName = basename($assetName);
    $assetPath = __DIR__ . '/../public/assets/' . $safeName;
    $version = is_file($assetPath) ? (string) filemtime($assetPath) : 'missing';
    return '/assets/' . rawurlencode($safeName) . '?v=' . rawurlencode($version);
}
