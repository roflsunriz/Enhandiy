<?php

declare(strict_types=1);

/**
 * 一括削除API
 *
 * マスターキー認証による複数ファイルの安全な一括削除
 * セキュリティ重視設計: 個別削除キーは無視し、マスターキーのみで認証
 */

// エラー表示設定
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

try {
    // 設定とユーティリティの読み込み
    require_once '../../config/config.php';
    require_once '../../src/Core/Utils.php';

    // セキュアセッション開始
    SecurityUtils::startSecureSession();

    $configInstance = new config();
    $config = $configInstance->index();

    // アプリケーション初期化
    require_once '../../app/models/init.php';
    $db = initializeApp($config);

    // ログとレスポンスハンドラーの初期化
    $logger = new Logger($config['log_directory'], $config['log_level'], $db);
    $responseHandler = new ResponseHandler($logger);

    // POSTメソッドのみ許可
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        $responseHandler->error('POSTリクエストが必要です。', [], 405);
    }

    // 一括削除機能の有効性チェック
    if (!($config['deletion_security']['bulk_delete_enabled'] ?? true)) {
        $responseHandler->error('一括削除機能が無効です。', [], 403, 'BULK_DELETE_DISABLED');
    }

    // 入力データの取得
    $fileIds = $_POST['file_ids'] ?? [];
    $masterKey = $_POST['master_key'] ?? '';

    // 基本バリデーション
    if (empty($fileIds) || !is_array($fileIds)) {
        $responseHandler->error('削除するファイルが指定されていません。', [], 400);
    }

    if (empty($masterKey)) {
        $responseHandler->error('マスターキーが入力されていません。', [], 400, 'MASTER_KEY_REQUIRED');
    }

    // ファイル数制限チェック
    $maxBulkFiles = $config['deletion_security']['max_bulk_delete_files'] ?? 100;
    if (count($fileIds) > $maxBulkFiles) {
        $responseHandler->error("一度に削除できるファイル数は{$maxBulkFiles}件までです。", [], 400);
    }

    // CSRFトークンの検証
    if (!SecurityUtils::validateCSRFToken($_POST['csrf_token'] ?? '')) {
        $logger->warning('CSRF token validation failed in bulk delete', ['file_count' => count($fileIds)]);
        $responseHandler->error('無効なリクエストです。ページを再読み込みしてください。', [], 403);
    }

    // マスターキー認証
    if ($masterKey !== $config['master']) {
        $logger->warning('Invalid master key for bulk delete', [
            'file_count' => count($fileIds),
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null
        ]);
        $responseHandler->error('マスターキーが正しくありません。', [], 403, 'INVALID_MASTER_KEY');
    }

    // ファイルIDの数値変換とバリデーション
    $validFileIds = [];
    foreach ($fileIds as $fileId) {
        $id = (int)$fileId;
        if ($id > 0) {
            $validFileIds[] = $id;
        }
    }

    if (empty($validFileIds)) {
        $responseHandler->error('有効なファイルIDが指定されていません。', [], 400);
    }

    // トランザクション開始
    $db->beginTransaction();

    $results = [
        'deleted_files' => [],
        'failed_files' => [],
        'not_found_files' => []
    ];

    try {
        // 削除対象ファイルの情報を取得
        $placeholders = str_repeat('?,', count($validFileIds) - 1) . '?';
        $fileStmt = $db->prepare("
            SELECT id, origin_file_name, stored_file_name, file_hash 
            FROM uploaded 
            WHERE id IN ({$placeholders})
        ");
        $fileStmt->execute($validFileIds);
        $files = $fileStmt->fetchAll();

        // 存在しないファイルIDを記録
        $foundIds = array_column($files, 'id');
        $notFoundIds = array_diff($validFileIds, $foundIds);
        foreach ($notFoundIds as $notFoundId) {
            $results['not_found_files'][] = [
                'id' => $notFoundId,
                'reason' => 'ファイルが見つかりません'
            ];
        }

        // 各ファイルの削除処理
        foreach ($files as $file) {
            $fileId = (int)$file['id'];
            $fileName = $file['origin_file_name'];

            try {
                // 物理ファイルの削除
                $filePath = $config['data_directory'] . '/' .
                    (!empty($file['stored_file_name']) ? $file['stored_file_name'] :
                     'file_' . $fileId . '.' . pathinfo($fileName, PATHINFO_EXTENSION));

                $physicalDeleted = false;
                if (file_exists($filePath)) {
                    // ファイル整合性チェック（任意）
                    if (!empty($file['file_hash'])) {
                        $currentHash = hash_file('sha256', $filePath);
                        if ($currentHash !== $file['file_hash']) {
                            $logger->warning('File integrity check failed during bulk delete', [
                                'file_id' => $fileId,
                                'expected_hash' => $file['file_hash'],
                                'current_hash' => $currentHash
                            ]);
                        }
                    }

                    if (unlink($filePath)) {
                        $physicalDeleted = true;
                        $logger->info('Physical file deleted in bulk operation', [
                            'file_id' => $fileId,
                            'path' => $filePath
                        ]);
                    } else {
                        throw new Exception("物理ファイルの削除に失敗しました: {$filePath}");
                    }
                } else {
                    $physicalDeleted = true; // ファイルが存在しない場合は削除済みとみなす
                    $logger->warning('Physical file not found during bulk delete', [
                        'file_id' => $fileId,
                        'path' => $filePath
                    ]);
                }

                // データベースからファイル情報を削除
                $deleteStmt = $db->prepare("DELETE FROM uploaded WHERE id = ?");
                if (!$deleteStmt->execute([$fileId])) {
                    throw new Exception("データベースからの削除に失敗しました");
                }

                // 関連するアクセストークンを削除
                $deleteTokensStmt = $db->prepare("DELETE FROM access_tokens WHERE file_id = ?");
                $deleteTokensStmt->execute([$fileId]);

                // 成功記録
                $results['deleted_files'][] = [
                    'id' => $fileId,
                    'name' => $fileName,
                    'physical_deleted' => $physicalDeleted
                ];

                // アクセスログの記録
                $logger->access($fileId, 'bulk_delete', 'success');
            } catch (Exception $e) {
                // 個別ファイルの削除失敗
                $results['failed_files'][] = [
                    'id' => $fileId,
                    'name' => $fileName,
                    'reason' => $e->getMessage()
                ];

                $logger->error('Failed to delete file in bulk operation', [
                    'file_id' => $fileId,
                    'error' => $e->getMessage()
                ]);
            }
        }

        // 部分的な失敗がある場合の処理
        if (!empty($results['failed_files'])) {
            // 一部失敗の場合、全体をロールバックするかどうかは設定による
            $rollbackOnPartialFailure = $config['deletion_security']['rollback_on_partial_failure'] ?? false;

            if ($rollbackOnPartialFailure) {
                throw new Exception('一部のファイル削除に失敗したため、全体をロールバックしました。');
            }
        }

        // トランザクションコミット
        $db->commit();

        // 成功レスポンス
        $responseHandler->success('一括削除が完了しました。', [
            'summary' => [
                'total_requested' => count($validFileIds),
                'deleted_count' => count($results['deleted_files']),
                'failed_count' => count($results['failed_files']),
                'not_found_count' => count($results['not_found_files'])
            ],
            'details' => $results
        ]);
    } catch (Exception $e) {
        // トランザクションロールバック
        $db->rollBack();
        throw $e;
    }
} catch (Exception $e) {
    // 緊急時のエラーハンドリング
    if (isset($logger)) {
        $logger->error('Bulk delete API Error: ' . $e->getMessage(), [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'file_ids' => $validFileIds ?? null
        ]);
    }

    if (isset($responseHandler)) {
        $responseHandler->error('一括削除でシステムエラーが発生しました。', [], 500);
    } else {
        // 最低限のエラーレスポンス
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'システムエラーが発生しました。'
        ], JSON_UNESCAPED_UNICODE);
    }
}
