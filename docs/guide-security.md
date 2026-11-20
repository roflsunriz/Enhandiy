# セキュリティノート

## PHP実行環境

PHP 8.2.36／8.3.37／8.4.28／8.5.13以降（同じマイナー版内では記載版以上）を使用してください。[2026年11月19日の公式セキュリティ更新](https://www.php.net/ChangeLog-8.php#8.5.13)には、セッション処理でリモートコード実行につながる[CVE-2026-115560](https://github.com/php/php-src/security/advisories/GHSA-658j-r8rw-q6mx)、[CVE-2026-126714](https://github.com/php/php-src/security/advisories/GHSA-fm2m-fjf5-v3cp)、終了処理での解放後使用[CVE-2026-129481](https://github.com/php/php-src/security/advisories/GHSA-g3vh-838c-65v7)のほか、Core、Date、CGI、FPM、DOM、SOAPなどの修正が含まれます。影響する機能・設定は脆弱性ごとに異なりますが、サポート中の全系列が更新対象です。

Enhandiyはセッションとファイルアップロードを利用します。アプリの更新や設定変更だけでPHP本体の脆弱性対応を済ませず、PHPランタイムを更新してください。2026年10月の[CVE-2026-109618](https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w)と[CVE-2026-109619](https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp)に対応済みのPHPでも、今回の更新が必要です。

PHP本体の更新後はApacheまたはPHP-FPMの全ワーカーを再起動し、CLIだけでなくWeb SAPIも修正版へ切り替わったことを確認してください。Docker利用時は `docker compose -f infrastructure/docker-compose.yaml build --no-cache web` で再ビルドし、コンテナを作り直します。

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

```text
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
