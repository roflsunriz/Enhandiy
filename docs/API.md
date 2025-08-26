# phpUploader RESTful API ドキュメント (v4.3.1)

> 本ドキュメントは phpUploader に同梱される RESTful API の使用方法をまとめたものです。
> ベース URL はサーバー設置先を `https://example.com` とした場合、`https://example.com/backend/public/api/index.php`（または Web ルート公開時は `/api/index.php`）を入口として自動ルーティングされます。
> 以降の例では **相対パス** (`/api/...`) で表記します。
> **注意:** Apache等のWebサーバーで `/api/*` へのアクセスを `/api/index.php?path=/api/*` にリライト（書き換え）する設定が必要です。これを行わない場合、本ドキュメント記載のような `/api/xxx` 形式のURLではAPIに正しくアクセスできません。サンプルの `.htaccess` や `apache` 設定例を参照してください。

---

## 目次

1. 認証
2. レート制限
3. 共通レスポンス仕様
4. エンドポイント一覧
   1. ファイル API
   2. フォルダ API
   3. システム API
   4. TUS (断片的アップロード) API
5. 付録: 設定ファイル例
6. 付録: ルーティング設定例（Apache / Nginx）
7. CHANGELOG (簡易)

---

## 1. 認証

REST API を利用するには通常 **API キー**（= Bearer トークン）を付与します。加えて、ブラウザ UI からの安全な操作に限り、CSRF トークンによる認証緩和が働きます。

| 方法 | ヘッダ / パラメータ | 例 |
|--|--|--|
| Bearer | `Authorization: Bearer <API_KEY>` | `Authorization: Bearer abcdEFGH1234` |
| クエリ | `?api_key=<API_KEY>` | `/api/status?api_key=abcdEFGH1234` |
| POST   | `api_key=<API_KEY>` (application/x-www-form-urlencoded) | |
| UI-CSRF | ヘッダ `X-CSRF-Token: <token>` または POST `csrf_token=<token>` | ブラウザ UI 操作時のみ。キー無しでも `read/write/delete` を許可 |

API キーは `backend/config/config.php` で設定します。

```php
'api_enabled'   => true,
'api_rate_limit' => 100, // 1時間あたりの最大リクエスト数 (0 で無制限)
'api_keys' => [
    // 任意のランダムキーを使用
    'abcdEFGH1234' => [
        'permissions' => ['read', 'write', 'delete', 'admin'],
        'expires'     => null, // 又は '2025-12-31 23:59:59'
    ],
],
```

> **permissions** 列挙
> * read   – 参照系エンドポイント
> * write  – 追加 / 更新系エンドポイント
> * delete – 削除系エンドポイント
> * admin  – 管理情報参照・一部管理系操作

UI-CSRF 認証について

- ブラウザ UI からのリクエストで、セッション上の CSRF トークンと一致する `X-CSRF-Token`（またはフォームの `csrf_token`）が付与された場合、API キーが無くても `read/write/delete` 権限として扱われます。
- これは UI 操作の円滑化を目的としたもので、スクリプト/外部クライアントは API キー方式の利用を推奨します。

---

## 2. レート制限

`api_rate_limit` に設定した回数を 1 時間単位で API キー毎にカウントします。上限を超えると `429 Too Many Requests` が返ります。

補足（アップロード系の追加制限）

- IP 単位でのアップロード回数/同時数などの内部制限があります（既定例: 1時間50回・同時5）。
- 主に `/api/files`（通常アップロード）や `/api/tus-upload`（断片アップロード）に適用されます。

---

## 3. 共通レスポンス仕様

すべての JSON 応答は UTF-8 エンコードされ、以下のキーを最低限含みます。

```json
{
  "status": "success", // または "error"
  "message": "説明文",
  "data": { /* 任意 */ },
  "timestamp": "2025-07-31T12:34:56+09:00"
}
```

エラー時追加フィールド

* `error_code`   – アプリ固有のエラーコード
* `validation_errors` – バリデーション失敗詳細 (配列)

一覧取得系では `pagination` オブジェクトが `data` 内に含まれます。

---

## 4. エンドポイント

### 4.1 ファイル API

| メソッド | パス | 権限 | 説明 |
|--|--|--|--|
| GET    | `/api/files` | read | ファイル一覧取得（`page`,`limit`,`folder`,`include=folders,breadcrumb`） |
| POST   | `/api/files` | write | ファイルアップロード（multipart/form-data） |
| GET    | `/api/files/{id}` | read | 単一ファイル情報取得 |
| GET    | `/api/files/{id}/download` | なし | ファイルダウンロード（バイナリ）。このルートは認証不要 |
| PUT    | `/api/files/{id}` | write | 既存ファイルの差し替え（multipart/form-data） |
| POST   | `/api/files/{id}/replace` | write | 既存ファイルの差し替え（互換エイリアス） |
| PATCH  | `/api/files/{id}` | write | コメント・フォルダ移動更新（`comment`, `folder_id`） |
| POST   | `/api/files/batch` | なし | 一括削除（マスターキー必須）。互換のため POST を許可 |
| DELETE | `/api/files/batch` | なし | 一括削除（マスターキー必須） |
| PATCH  | `/api/files/batch` | write | 複数ファイル移動（`file_ids`, `folder_id`） |
| GET    | `/api/files/{id}/share` | read | 共有設定取得（`max_downloads`, `expires_days`） |
| PATCH  | `/api/files/{id}/share` | write | 共有設定更新＋共有URL生成 |

注意: `DELETE /api/files/{id}` は互換のためルーティングは存在しますが、削除キー検証フローを要求するため API からは直接削除できません（`verifydelete.php` → `delete.php` フローを利用）。

#### 4.1.1 例: ファイル一覧取得

```bash
curl -H "Authorization: Bearer <API_KEY>" \
  "https://example.com/api/files?page=1&limit=20&folder=3"
```

#### 4.1.2 例: ファイルアップロード

```bash
curl -X POST -H "Authorization: Bearer <API_KEY>" \
     -F "file=@./report.pdf" \
     -F "delkey=test_key_2025" \
     -F "replacekey=test_key_2025" \
     -F "folder_id=3" \
     -F "comment=月報" \
     https://example.com/api/files
```

#### 4.1.3 例: ファイルダウンロード

```bash
# ファイルをダウンロードして保存（認証不要）
curl -o "downloaded_file.pdf" \
     https://example.com/api/files/123/download

# ダウンロード情報のみ取得（ヘッダー確認）
curl -I https://example.com/api/files/123/download
```

補足: 共有リンクキー（`key`）を付けると `/download.php` の公開ダウンロードフローで制限が適用されます。

#### 4.1.4 例: 差し替え（PUT）

```bash
curl -X PUT -H "Authorization: Bearer <API_KEY>" \
     -F "file=@./new.pdf" \
     -F "replacekey=<REPLACE_KEY>" \
     https://example.com/api/files/123
```

`master_key` を送るとマスターキーでも許可。必要に応じて `csrf_token` も送信可能です。

#### 4.1.5 例: コメント更新とフォルダ移動（PATCH）

```bash
curl -X PATCH -H "Authorization: Bearer <API_KEY>" \
     -H "Content-Type: application/json" \
     -d '{"comment":"メモ更新","folder_id":3}' \
     https://example.com/api/files/123
```

#### 4.1.6 例: 複数ファイル移動（PATCH /batch）

```bash
curl -X PATCH -H "Authorization: Bearer <API_KEY>" \
     -H "Content-Type: application/json" \
     -d '{"file_ids":[1,2,3],"folder_id":5}' \
     https://example.com/api/files/batch
```

#### 4.1.7 例: 共有設定更新とURL生成

```bash
curl -X PATCH -H "Authorization: Bearer <API_KEY>" \
     -H "Content-Type: application/json" \
     -d '{"max_downloads":10, "expires_days":7}' \
     https://example.com/api/files/123/share
```

### 4.2 フォルダ API

| メソッド | パス | 権限 | 説明 |
|--|--|--|--|
| GET    | `/api/folders` | read | フォルダ一覧取得。`?id={id}&check=true` でファイル数/子数の要約を返却 |
| POST   | `/api/folders` | write | フォルダ作成（`name`, `parent_id` 任意） |
| PATCH  | `/api/folders/{id}` | write | フォルダ名変更（`name`）／移動（`parent_id`） |
| DELETE | `/api/folders/{id}` | delete | フォルダ削除（`?move_files=true` で子要素をルートに退避） |

`parent_id` を省略するとルート直下に作成されます。

### 4.3 システム API

| メソッド | パス | 権限 | 説明 |
|--|--|--|--|
| GET | `/api/status` | read | API バージョン・DB統計・設定フラグなど（`admin` でシステム情報も） |
| GET | `/api/health` | read | ヘルスチェック（DB/FS/設定を診断。健全時は success、問題ありは 503） |

### 4.4 TUS (断片的アップロード) API

| メソッド | パス | 権限 | 説明 |
|--|--|--|--|
| OPTIONS/POST | `/api/tus-upload` | なし | TUS アップロード初期化・オプション（認証は内部実装で処理） |
| HEAD/PATCH | `/api/tus-upload/{id}` | なし | チャンク照会・転送（認証は内部実装で処理） |

---

## 5. 付録: HTTP ステータスとエラーコード一覧 (抜粋)

| HTTP | error_code | 意味 |
|--|--|--|
| 401 | `API_KEY_MISSING` | API キー未付与（UI-CSRF 例外あり） |
| 401 | `API_KEY_INVALID` | API キー不正 |
| 403 | `PERMISSION_DENIED` | 権限不足 |
| 404 | `ENDPOINT_NOT_FOUND` | ルート不明 |
| 404 | `FILE_NOT_FOUND` / `FOLDER_NOT_FOUND` | リソース不在 |
| 404 | `PHYSICAL_FILE_NOT_FOUND` | 物理ファイル不在 |
| 429 | `RATE_LIMIT_EXCEEDED` | レート制限超過 |
| 500 | `DATA_DIR_NOT_FOUND` | データディレクトリ不在 |
| 500 | `INVALID_FILE_PATH` | 不正なファイルパス |
| 500 | `FILE_READ_ERROR` | ファイル読み込みエラー |
| 503 | `API_DISABLED` | API 機能無効 |
| 503 | `SYSTEM_UNHEALTHY` | ヘルスチェックで問題検出 |

---





## 6. 付録: ルーティング設定例（Apache / Nginx）

以下は `/api/*` を `api/index.php?path=/api/*` にルーティングするための設定例です。

### Apache（`.htaccess` を `backend/public/api/.htaccess` に配置）

```apache
RewriteEngine On
RewriteBase /api/

# 既存のファイル/ディレクトリはそのまま配信
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# それ以外は index.php に委譲し、元パスを path に渡す
RewriteRule ^(.*)$ index.php?path=/api/$1 [QSA,L]
```

補足: ドキュメントルート直下に `/api` を公開していない場合は、`RewriteBase` をサイトの公開パスに合わせて調整してください。

### Apache（VirtualHost 内での例）

```apache
Alias /api "/var/www/app/backend/public/api"
<Directory "/var/www/app/backend/public/api">
    AllowOverride All
    Require all granted
</Directory>

# mod_rewrite をサーバー設定側で使う場合（.htaccess を使わない）
RewriteEngine On
RewriteRule ^/api/(.*)$ /api/index.php?path=/api/$1 [QSA,PT]
```

### Nginx（php-fpm 連携前提の簡易例）

```nginx
# まず /api を公開ディレクトリにマッピング
location /api/ {
    try_files $uri @api_router;
}

# ルーターへ転送（/api/foo → /api/index.php?path=/api/foo）
location @api_router {
    rewrite ^/api/(.*)$ /api/index.php?path=/api/$1 last;
}

# PHP 実行設定（環境に合わせてソケット/ポート/PHP バージョンを変更）
location ~ \.php$ {
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    fastcgi_pass 127.0.0.1:9000; # 例: php-fpm
}
```

注意: `fastcgi_pass` は環境に応じてソケットやポートを変更してください（例: `unix:/run/php/php-fpm.sock`）。

---

## 7. CHANGELOG (簡易)

* **4.3.1** – 共有設定 API、バッチ移動/削除、TUS ルーティング、UI-CSRF 認証を明記
* **4.0.1-roflsunriz** – ファイルダウンロード API を追加
* **4.0.0-roflsunriz** – フォルダ構造整理（APIエンドポイントは変更なし）
* **3.x-roflsunriz** – 一括操作、パスワード強度チェック、セキュリティ強化
* **2.0.0** – 初回実装 (ファイル / フォルダ CRUD, システム情報, API キー認証, レート制限)
