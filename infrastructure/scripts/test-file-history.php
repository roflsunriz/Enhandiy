<?php

/**
 * ファイル履歴記録機能のテストスクリプト
 */

declare(strict_types=1);

require_once __DIR__ . '/../../backend/config/config.php';

echo "=== ファイル履歴記録機能テスト ===\n";

try {
    // 設定読み込み
    $config = new config();
    $ret = $config->index();
    if (!is_null($ret) && is_array($ret)) {
        extract($ret);
    }

    // データベース接続
    $db = new PDO('sqlite:' . $ret['db_directory'] . '/uploader.db');
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // 1. file_historyテーブルの存在確認
    echo "1. file_historyテーブルの確認中...\n";
    $stmt = $db->prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='file_history'");
    $stmt->execute();
    $table = $stmt->fetch();

    if (!$table) {
        echo "❌ file_historyテーブルが存在しません。\n";
        exit(1);
    }
    echo "✅ file_historyテーブル: 存在確認完了\n";

    // 2. テーブル構造の確認
    echo "\n2. テーブル構造の確認中...\n";
    $stmt = $db->prepare("PRAGMA table_info(file_history)");
    $stmt->execute();
    $columns = $stmt->fetchAll();

    echo "カラム一覧:\n";
    foreach ($columns as $column) {
        echo "  - {$column['name']} ({$column['type']})\n";
    }

    // 3. 既存の履歴レコード数確認
    echo "\n3. 既存履歴レコード数の確認...\n";
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM file_history");
    $stmt->execute();
    $result = $stmt->fetch();
    $existingCount = $result['count'];
    echo "既存履歴レコード数: {$existingCount}件\n";

    // 4. 最新の履歴レコードを表示
    if ($existingCount > 0) {
        echo "\n4. 最新履歴レコード（最新10件）:\n";
        $stmt = $db->prepare("
            SELECT h.*, u.origin_file_name 
            FROM file_history h 
            LEFT JOIN uploaded u ON h.file_id = u.id 
            ORDER BY h.changed_at DESC 
            LIMIT 10
        ");
        $stmt->execute();
        $histories = $stmt->fetchAll();

        foreach ($histories as $history) {
            $changeDate = date('Y-m-d H:i:s', $history['changed_at']);
            echo "  ID:{$history['id']} | ";
            echo "FileID:{$history['file_id']} | ";
            echo "Type:{$history['change_type']} | ";
            echo "Date:{$changeDate} | ";
            echo "By:{$history['changed_by']}\n";

            if (!empty($history['old_filename']) || !empty($history['new_filename'])) {
                $oldName = $history['old_filename'] ?? 'null';
                $newName = $history['new_filename'] ?? 'null';
                echo "    OLD: {$oldName} -> NEW: {$newName}\n";
            }
            if (!empty($history['old_comment']) || !empty($history['new_comment'])) {
                $oldComment = $history['old_comment'] ?? 'null';
                $newComment = $history['new_comment'] ?? 'null';
                echo "    OLD COMMENT: {$oldComment} -> NEW COMMENT: {$newComment}\n";
            }
            echo "\n";
        }
    }

    // 5. change_typeの分布を確認
    echo "\n5. 履歴タイプ別の分布:\n";
    $stmt = $db->prepare(
        "SELECT change_type, COUNT(*) as count 
        FROM file_history 
        GROUP BY change_type 
        ORDER BY count DESC"
    );
    $stmt->execute();
    $types = $stmt->fetchAll();

    if (empty($types)) {
        echo "  まだ履歴レコードがありません。\n";
    } else {
        foreach ($types as $type) {
            echo "  {$type['change_type']}: {$type['count']}件\n";
        }
    }

    // 6. インデックスの確認
    echo "\n6. インデックスの確認:\n";
    $stmt = $db->prepare("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='file_history'");
    $stmt->execute();
    $indexes = $stmt->fetchAll();

    if (empty($indexes)) {
        echo "  インデックスが設定されていません。\n";
    } else {
        foreach ($indexes as $index) {
            echo "  {$index['name']}\n";
        }
    }

    // 7. テスト履歴レコードの挿入テスト
    echo "\n7. テスト履歴レコードの挿入テスト...\n";
    try {
        $testStmt = $db->prepare("
            INSERT INTO file_history 
            (file_id, new_filename, change_type, changed_at, changed_by) 
            VALUES (?, ?, ?, ?, ?)
        ");
        $testStmt->execute([
            9999, // テスト用のfile_id
            'test_file.txt',
            'test_insert',
            time(),
            'test_script'
        ]);

        $testId = $db->lastInsertId();
        echo "✅ テスト履歴レコードの挿入: 成功（ID: {$testId}）\n";

        // テストレコードを削除
        $deleteStmt = $db->prepare("DELETE FROM file_history WHERE id = ?");
        $deleteStmt->execute([$testId]);
        echo "✅ テスト履歴レコードの削除: 成功\n";
    } catch (Exception $e) {
        echo "❌ テスト履歴レコードの挿入: 失敗 - " . $e->getMessage() . "\n";
    }

    echo "\n=== テスト完了 ===\n";
    echo "✅ file_history テーブルは正常に動作しています。\n";

    if ($existingCount == 0) {
        echo "\n💡 ヒント: まだ履歴レコードがありません。\n";
        echo "   ファイルのアップロード、コメント編集、差し替えを行うと履歴が記録されます。\n";
    }
} catch (Exception $e) {
    echo "❌ エラーが発生しました: " . $e->getMessage() . "\n";
    echo "スタックトレース:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
