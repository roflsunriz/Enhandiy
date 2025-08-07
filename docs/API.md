# phpUploader RESTful API ドキュメント (v4.0.0-roflsunriz)

> 本ドキュメントは phpUploader に同梱される RESTful API の使用方法をまとめたものです。
> ベース URL はサーバー設置先を `https://example.com` とした場合、`https://example.com/api/router.php` 経由で自動ルーティングされます。
> 以降の例では **相対パス** (`/api/...`) で表記します。

---

## 目次

1. 認証
2. レート制限
3. 共通レスポンス仕様
4. エンドポイント一覧
   1. ファイル API
   2. フォルダ API
   3. システム API
5. 付録: 設定ファイル例

---

## 1. 認証

REST API を利用するには **API キー** もしくは **Bearer トークン** が必須です。

| 方法 | ヘッダ / パラメータ | 例 |
|--|--|--|
| Bearer | `Authorization: Bearer <API_KEY>` | `Authorization: Bearer abcdEFGH1234` |
| クエリ | `?api_key=<API_KEY>` | `/api/status?api_key=abcdEFGH1234` |
| POST   | `api_key=<API_KEY>` (application/x-www-form-urlencoded) | |

API キーは `config/config.php` で設定します。

```php
'api_enabled'   => true,
'api_rate_limit' => 100, // 1 時間あたりの最大リクエスト数 (0 で無制限)
'api_keys' => [
    // 任意のランダムキーを使用
    'abcdEFGH1234' => [
        'permissions' => ['read', 'write', 'delete'],
        'expires'     => null, // 又は '2025-12-31 23:59:59'
    ],
],
```

> **permissions** 列挙
> * read   – 参照系エンドポイント
> * write  – 追加 / 更新系エンドポイント
> * delete – 削除系エンドポイント

---

## 2. レート制限

`api_rate_limit` に設定した回数を 1 時間単位でカウントします。上限を超えると `429 Too Many Requests` が返ります。

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
| GET    | `/api/files` | read | ファイル一覧取得 (ページネーション対応) |
| POST   | `/api/files` | write | ファイルアップロード (multipart/form-data) |
| GET    | `/api/files/{id}` | read | 単一ファイル情報取得 |
| GET    | `/api/files/{id}/download` | read | ファイルダウンロード (バイナリデータ) |
| PUT/POST| `/api/files/{id}/replace` または `/api/files/{id}` | write | 既存ファイルの差し替え |
| PATCH  | `/api/files/{id}` | write | コメント等メタデータ更新 |
| DELETE | `/api/files/{id}` | delete | ファイル削除 |

#### 4.1.1 例: ファイル一覧取得

```bash
curl -H "Authorization: Bearer <API_KEY>" \
  "https://example.com/api/files?page=1&limit=20&folder=3"
```

#### 4.1.2 例: ファイルアップロード

```bash
curl -X POST -H "Authorization: Bearer <API_KEY>" \
     -F "file=@./report.pdf" \
     -F "folder_id=3" \
     -F "comment=月報" \
     https://example.com/api/files
```

#### 4.1.3 例: ファイルダウンロード

```bash
# ファイルをダウンロードして保存
curl -H "Authorization: Bearer <API_KEY>" \
     -o "downloaded_file.pdf" \
     https://example.com/api/files/123/download

# ダウンロード情報のみ取得（ヘッダー確認）
curl -I -H "Authorization: Bearer <API_KEY>" \
     https://example.com/api/files/123/download
```

### 4.2 フォルダ API

| メソッド | パス | 権限 | 説明 |
|--|--|--|--|
| GET    | `/api/folders` | read | フォルダ一覧取得 |
| POST   | `/api/folders` | write | フォルダ作成 (`name`, `parent_id`*) |
| PATCH  | `/api/folders/{id}` | write | フォルダ名変更 (`name`) |
| DELETE | `/api/folders/{id}` | delete | フォルダ削除 |

`parent_id` を省略するとルート直下に作成されます。

### 4.3 システム API

| メソッド | パス | 権限 | 説明 |
|--|--|--|--|
| GET | `/api/status` | read | API バージョン・ルート数などの統計情報 |
| GET | `/api/health` | read | ヘルスチェック (常に 200 OK / `{status: \"ok\"}`) |

---

## 5. 付録: HTTP ステータスとエラーコード一覧 (抜粋)

| HTTP | error_code | 意味 |
|--|--|--|
| 401 | `API_KEY_MISSING` | API キー未付与 |
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

---

## 6. CHANGELOG (簡易)

* **4.0.1-roflsunriz** – ファイルダウンロードAPIを追加
* **4.0.0-roflsunriz** – フォルダ構造整理（APIエンドポイントは変更なし）
* **3.x-roflsunriz** – 一括操作、パスワード強度チェック、セキュリティ強化
* **2.0.0** – 初回実装 (ファイル / フォルダ CRUD, システム情報, API キー認証, レート制限)
