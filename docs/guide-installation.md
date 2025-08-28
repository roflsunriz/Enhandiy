# インストールと要件

## Requirement

- PHP Version 8.1+
- SQLite（通常 `sqlite3` 拡張がバンドル。未有効なら有効化が必要）
- PHP 拡張: `pdo_sqlite`, `openssl`, `json`, `mbstring`, `hash`
- Web サーバー: Apache もしくは Nginx + PHP-FPM

## Requirement のインストール方法（抜粋）

### Windows（手動）
1. 公式サイトから「Thread Safe」版の zip を入手し展開（例: `C:\php`）
2. `php.ini-development` を `php.ini` にコピーして調整
3. `PATH` に追加し `php -v` で 8.1+ を確認

### Ubuntu（例）
```bash
sudo apt update
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:ondrej/php
sudo apt update
sudo apt install -y php8.1 php8.1-cli php8.1-fpm php8.1-sqlite3 php8.1-mbstring php8.1-json php8.1-openssl php8.1-hash
php -v
```

### SQLite CLI（任意）
```bash
sudo apt install -y sqlite3
sqlite3 --version
```

### 必要拡張の確認
```bash
php -m | grep -E 'openssl|json|mbstring|hash|sqlite3'
```

## 新規インストール手順

1. リリースを取得
   - コミュニティフォーク（推奨）: `https://github.com/roflsunriz/Enhandiy/releases`
   - オリジナル: `https://github.com/shimosyan/phpUploader/releases`
2. 設定ファイルテンプレートをコピー
   ```bash
   cp backend/config/config.php.example backend/config/config.php
   ```
3. `backend/config/config.php` を編集（必須項目）
   - `master` – 管理者キー
   - `key` – 暗号化キー
   - `session_salt` – セッションソルト
   - 主要機能の有効化や API 設定を環境に合わせて調整
4. Web サーバーの実行ユーザーに必要権限を付与
   - 書き込み必須: `db/`, `data/`, `storage/logs/`, `temp/`
5. 初回アクセスで DB と必要ディレクトリが自動作成

### セキュリティ（配置とアクセス制御の基本）

- ドキュメントルート配下の以下は直接アクセスを禁止
  - `backend/config/`, `db/`, `storage/logs/`, `temp/`
- 代表例（Apache の .htaccess）
```apache
<Files "*">
    Deny from all
</Files>
```

### アップロードに関する PHP/サーバー設定の目安

php.ini（例）:
- `file_uploads = On`
- `upload_max_filesize = 100M`
- `post_max_size = 100M`
- `max_file_uploads = 20`

Apache（例）:
- `LimitRequestBody 104857600`

nginx（例）:
- `client_max_body_size 100M;`

### `/api/*` へのルーティング設定（要点）

- `/api/*` を `/api/index.php?path=/api/*` にリライトする必要があります。
- 詳細は `docs/API.md` の付録を参照してください。

### ドキュメントルートの設定について

- **重要**: ルートに `index.php` がないため、サーバのドキュメントルートは必ず `backend/public` を指すように設定してください。これにより、公開可能なエントリポイントと静的アセットが正しく配信されます。

