# 設定ガイド

本ガイドでは、主要な設定オプションの概要と例を示します。

## 主な設定カテゴリ

- ファイルアップロード設定（サイズ上限・拡張子許可）
- 機能切り替え（個別機能の有効/無効）
- セキュリティ設定（認証要件、CSRF、レート制限）
- アップロード方式優先度（再開可能/従来）
- フォルダ管理（深度、制限、権限）

## 設定例

```php
// フォルダ管理
'folders_enabled' => true,
'max_folder_depth' => 5,
'max_folders_per_level' => 50,
'allow_folder_creation' => true,
'allow_folder_deletion' => true,

// ファイル編集・管理
'allow_comment_edit' => true,
'allow_file_replace' => true,
'file_edit_admin_only' => false,

// 一括操作機能（削除処理の例）
'deletion_security' => [
    'auth_mode' => 'key_or_master',
    'bulk_delete_enabled' => true,
    'max_bulk_delete_files' => 100,
    'require_confirmation' => true,
    'individual_delete_enabled' => true
],

// 再開可能アップロード
'upload_method_priority' => 'resumable',
'upload_fallback_enabled' => true,

// API 設定
'api_enabled' => true,
'api_rate_limit' => 100,
'api_keys' => [
    'YOUR_API_KEY_HERE' => [
        'name' => 'Default API Key',
        'permissions' => ['read','write','delete','admin'],
        'expires' => null
    ]
]
```

補足:
- 鍵/ソルト類（`master`, `key`, `session_salt`）は十分に強度の高い値にしてください。(ランダムな値で、32文字以上の長さを推奨)
- API の詳細は `docs/API.md` を参照してください。

