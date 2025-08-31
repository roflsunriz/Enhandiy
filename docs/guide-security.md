# セキュリティノート

## 設定ファイルのセキュリティ

- `backend/config/config.php` は機密情報を含むため、外部アクセスを遮断してください。
- `master` と `key`, `session_salt` には推測困難なランダムな値を設定してください。32文字以上の長さを推奨します。
- 本番環境では `backend/config`, `db`, `storage/logs`, `temp` ディレクトリへの直接アクセスを禁止してください。

### 推奨設定例

```php
// 強力なキーの例（実運用では別の値を使用してください）
'master'       => bin2hex(random_bytes(16)), // 32 文字
'key'          => bin2hex(random_bytes(32)), // 64 文字
'session_salt' => hash('sha256', bin2hex(random_bytes(32))),
```

## ディレクトリアクセス制御

以下のディレクトリは外部からの直接アクセスを遮断してください。

```
- backend/config/  (設定ファイル)
- db/              (データベースファイル)
- storage/logs/    (ログファイル)
- temp/            (一時ファイル)
```

### Apache の例（.htaccess）

```apache
# backend/config/.htaccess
<Files "*">
    Deny from all
</Files>

# db/.htaccess
<Files "*">
    Deny from all
</Files>

# storage/logs/.htaccess
<Files "*">
    Deny from all
</Files>

# temp/.htaccess
<Files "*">
    Deny from all
</Files>
```

## `/api/*` のリライト設定について（補足）

`/api/*` を `/api/index.php?path=/api/*` に書き換える設定が必要です。詳細は `docs/API.md` の付録（Apache/Nginx の例）を参照してください。

