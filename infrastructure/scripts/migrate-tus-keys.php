<?php

/**
 * TUS Uploads キー暗号化マイグレーションスクリプト
 * 平文で保存されている既存のキーを暗号化する
 */

declare(strict_types=1);

// 設定とユーティリティの読み込み
require_once __DIR__ . '/../../backend/config/config.php';
require_once __DIR__ . '/../../backend/core/utils.php';

echo "=== TUS Uploads キー暗号化マイグレーション開始 ===\n";

try {
    // 設定読み込み
    $config = new config();
    $ret = $config->index();
    if (!is_null($ret) && is_array($ret)) {
        extract($ret);
    }

    // データベース接続
    $db = new PDO('sqlite:' . $db_directory . '/uploader.db');
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // 平文キーが含まれる可能性のあるTUSアップロードを検索
    $stmt = $db->prepare("
        SELECT id, dl_key, del_key, replace_key 
        FROM tus_uploads 
        WHERE (dl_key IS NOT NULL AND dl_key != '') 
           OR (del_key IS NOT NULL AND del_key != '') 
           OR (replace_key IS NOT NULL AND replace_key != '')
    ");

    $stmt->execute();
    $uploads = $stmt->fetchAll();

    if (empty($uploads)) {
        echo "✅ マイグレーションが必要なレコードはありません。\n";
        exit(0);
    }

    echo "📊 " . count($uploads) . "件のレコードを処理します...\n";

    $updateStmt = $db->prepare("
        UPDATE tus_uploads 
        SET dl_key = ?, del_key = ?, replace_key = ? 
        WHERE id = ?
    ");

    $processedCount = 0;
    $errorCount = 0;

    foreach ($uploads as $upload) {
        try {
            $encryptedDlKey = null;
            $encryptedDelKey = null;
            $encryptedReplaceKey = null;

            // ダウンロードキーの処理
            if (!empty($upload['dl_key']) && trim($upload['dl_key']) !== '') {
                try {
                    // 既に暗号化済みかテスト
                    SecurityUtils::decryptSecure($upload['dl_key'], $key);
                    $encryptedDlKey = $upload['dl_key']; // 既に暗号化済み
                    echo "  dl_key (ID: {$upload['id']}): 既に暗号化済み\n";
                } catch (Exception $e) {
                    // 平文なので暗号化
                    $encryptedDlKey = SecurityUtils::encryptSecure($upload['dl_key'], $key);
                    echo "  dl_key (ID: {$upload['id']}): 暗号化完了\n";
                }
            }

            // 削除キーの処理
            if (!empty($upload['del_key']) && trim($upload['del_key']) !== '') {
                try {
                    // 既に暗号化済みかテスト
                    SecurityUtils::decryptSecure($upload['del_key'], $key);
                    $encryptedDelKey = $upload['del_key']; // 既に暗号化済み
                    echo "  del_key (ID: {$upload['id']}): 既に暗号化済み\n";
                } catch (Exception $e) {
                    // 平文なので暗号化
                    $encryptedDelKey = SecurityUtils::encryptSecure($upload['del_key'], $key);
                    echo "  del_key (ID: {$upload['id']}): 暗号化完了\n";
                }
            }

            // 差し替えキーの処理
            if (!empty($upload['replace_key']) && trim($upload['replace_key']) !== '') {
                try {
                    // 既に暗号化済みかテスト
                    SecurityUtils::decryptSecure($upload['replace_key'], $key);
                    $encryptedReplaceKey = $upload['replace_key']; // 既に暗号化済み
                    echo "  replace_key (ID: {$upload['id']}): 既に暗号化済み\n";
                } catch (Exception $e) {
                    // 平文なので暗号化
                    $encryptedReplaceKey = SecurityUtils::encryptSecure($upload['replace_key'], $key);
                    echo "  replace_key (ID: {$upload['id']}): 暗号化完了\n";
                }
            }

            // データベース更新
            $updateStmt->execute([
                $encryptedDlKey,
                $encryptedDelKey,
                $encryptedReplaceKey,
                $upload['id']
            ]);

            $processedCount++;
        } catch (Exception $e) {
            echo "⚠️ レコード ID {$upload['id']} の処理中にエラー: " . $e->getMessage() . "\n";
            $errorCount++;
        }
    }

    echo "\n=== マイグレーション完了 ===\n";
    echo "✅ 成功: {$processedCount}件\n";
    if ($errorCount > 0) {
        echo "❌ エラー: {$errorCount}件\n";
    }

    // 検証
    echo "\n=== 検証中... ===\n";
    $verificationStmt = $db->prepare("
        SELECT COUNT(*) as total 
        FROM tus_uploads 
        WHERE (dl_key IS NOT NULL AND dl_key != '') 
           OR (del_key IS NOT NULL AND del_key != '') 
           OR (replace_key IS NOT NULL AND replace_key != '')
    ");

    $verificationStmt->execute();
    $verificationResult = $verificationStmt->fetch();

    echo "📊 暗号化済みキーを持つレコード数: {$verificationResult['total']}件\n";

    // 復号化テスト（サンプル）
    if ($verificationResult['total'] > 0) {
        $sampleStmt = $db->prepare("
            SELECT id, dl_key, del_key, replace_key 
            FROM tus_uploads 
            WHERE (dl_key IS NOT NULL AND dl_key != '') 
               OR (del_key IS NOT NULL AND del_key != '') 
               OR (replace_key IS NOT NULL AND replace_key != '')
            LIMIT 1
        ");

        $sampleStmt->execute();
        $sample = $sampleStmt->fetch();

        if ($sample) {
            echo "🔍 復号化テスト (ID: {$sample['id']}):\n";

            try {
                if (!empty($sample['dl_key'])) {
                    $decrypted = SecurityUtils::decryptSecure($sample['dl_key'], $key);
                    echo "  dl_key: 復号化成功\n";
                }
                if (!empty($sample['del_key'])) {
                    $decrypted = SecurityUtils::decryptSecure($sample['del_key'], $key);
                    echo "  del_key: 復号化成功\n";
                }
                if (!empty($sample['replace_key'])) {
                    $decrypted = SecurityUtils::decryptSecure($sample['replace_key'], $key);
                    echo "  replace_key: 復号化成功\n";
                }
            } catch (Exception $e) {
                echo "❌ 復号化テスト失敗: " . $e->getMessage() . "\n";
            }
        }
    }

    echo "\n✅ TUS Uploads キー暗号化マイグレーションが完了しました。\n";
} catch (Exception $e) {
    echo "❌ マイグレーション中にエラーが発生しました: " . $e->getMessage() . "\n";
    echo "スタックトレース:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
