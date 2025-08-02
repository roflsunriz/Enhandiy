# phpUploader v2.0.0-roflsunriz

## 🎉 概要

phpUploader v2.0.0-roflsunriz は、オリジナルのphpUploaderをベースに大幅に機能強化されたコミュニティフォーク版です。モダンなUI、高度なアップロード機能、包括的なAPI サポート、そして強化されたファイル管理機能を提供します。

![cover](https://github.com/user-attachments/assets/bd485c47-6acd-4525-9a17-5eb38cf98fc0)

## ✨ 主要機能

### 🎯 **モダンファイルマネージャー**
- **グリッド/リスト表示**: 美しいカード形式のファイル表示とビュー切り替え
- **高度な検索・ソート**: リアルタイムファイル検索と複数のソートオプション
- **ページネーション**: 大量ファイルの効率的な表示
- **レスポンシブデザイン**: 全デバイス対応のモバイルフレンドリーなインターフェース

### 📁 **フォルダ管理システム**
- **階層フォルダ**: ネストしたフォルダ構造の作成・管理
- **フォルダナビゲーション**: パンくずナビゲーションによる直感的なフォルダブラウジング
- **ドラッグ＆ドロップ整理**: フォルダ間でのファイル移動が簡単
- **設定可能な深度**: カスタマイズ可能な最大フォルダ深度と制限

### 🚀 **高度なアップロード機能**
- **ドラッグ＆ドロップアップロード**: 複数ファイル対応のモダンなドラッグ＆ドロップインターフェース
- **再開可能アップロード**: Tus.ioプロトコルによる大容量ファイルの一時停止・再開機能
- **フォルダアップロード**: フォルダ階層を保持したままフォルダ全体をアップロード
- **進捗追跡**: 速度表示付きのリアルタイムアップロード進捗
- **フォールバック対応**: 再開可能アップロードが失敗した場合の従来アップロードへの自動切り替え

### 🔗 **ファイル共有・リンク機能**
- **共有リンク生成**: ファイル用の安全で時間制限付き共有リンクを作成
- **カスタマイズ可能な有効期限**: 共有ファイルの有効期限をカスタム設定
- **ダウンロード制限**: 共有リンクごとの最大ダウンロード回数制御
- **リンク管理**: 生成された全共有リンクの追跡・管理

### ✏️ **ファイル管理・編集機能**
- **コメント編集**: ファイルマネージャーから直接ファイルコメントを編集
- **ファイル差し替え**: メタデータを維持したまま既存ファイルを差し替え
- **差し替えキー認証**: キー検証による安全なファイル差し替え
- **一括操作**: 複数ファイルの選択・一括操作

### 🔐 **セキュリティ・柔軟性の強化**
- **柔軟なDL/DELキー**: ダウンロード・削除キーの必須/任意を設定で切り替え
- **差し替えキーシステム**: 暗号化キー検証による安全なファイル差し替え
- **CSRF保護**: CSRFトークン検証による強化されたセキュリティ
- **レート制限**: 悪用防止のためのAPIレート制限

### 🌐 **RESTful API**
- **完全なREST API**: 全ファイル操作をカバーする包括的API
- **複数認証方式**: Bearer トークン、APIキー、クエリパラメータ認証をサポート
- **CORS対応**: Webアプリケーション向けのクロスオリジンリクエストサポート
- **包括的ドキュメント**: 例付きの詳細なAPIドキュメント
- **エラーハンドリング**: 詳細なエラーコード付きの標準化されたエラーレスポンス

詳しいAPI仕様は[docs/API.md](docs/API.md)を参照してください。

## 🔧 設定の改善

### **拡張された設定オプション**
- **ファイルアップロード設定**: 設定可能なファイルサイズ制限、許可拡張子
- **機能切り替え**: 必要に応じて個別機能の有効/無効を設定
- **セキュリティ設定**: 認証要件の詳細制御
- **アップロード方式優先度**: 再開可能アップロードと従来アップロードの選択
- **フォルダ管理**: フォルダ深度、制限、権限の設定

### **設定例の追加**
```php
// フォルダ管理
'folders_enabled' => true,
'max_folder_depth' => 5,
'allow_folder_creation' => true,

// ファイル編集
'allow_comment_edit' => true,
'allow_file_replace' => true,
'replace_key_required' => true,

// 再開可能アップロード
'upload_method_priority' => 'resumable',
'tus_max_size' => 1073741824, // 1GB

// API設定
'api_enabled' => true,
'api_rate_limit' => 100,
'api_cors_enabled' => true,
```

## 🗄️ データベース変更

### **新しいテーブル**
- `folders`: 階層フォルダ構造管理
- `shared_links`: 共有リンクの追跡・管理
- `tus_uploads`: 再開可能アップロードセッション管理

### **拡張されたテーブル**
- `uploaded`: `replace_key`, `folder_id`, `max_downloads`, `expires_at` カラムを追加
- パフォーマンス向上のためのインデックス改善

## 🔄 マイグレーション・互換性

### **データベースマイグレーション**
- 初回アクセス時の自動データベーススキーマ更新
- 既存ファイルデータとの後方互換性
- スムーズなアップグレードのためのマイグレーションスクリプト

### **設定マイグレーション**
- 適切なデフォルト値を持つ新しい設定オプション
- 既存設定の機能維持
- オプション機能の有効化

## ⚠️ 重要: Ver.2.0 の破壊的変更について

**Ver.2.0 は DB の仕様を刷新したため、Ver.1.x 系との互換性がありません。**

### **設定変更**
- 一貫性のため一部設定キーが名称変更
- 高度な機能のための新しい必須設定オプション
- データベーススキーマ更新（自動マイグレーション提供）

### **API変更**
- 新しいRESTful APIエンドポイント（後方互換性あり）
- 追加メタデータを含む強化されたレスポンス形式
- 改善されたエラーレスポンス構造

## Requirement

- PHP Version 8.1+
- SQLite (PHPにバンドルされたもので可、一部の環境によってはphp○-sqliteのインストールが必要です。)
- PHP拡張: `openssl`, `json`, `mbstring`, `hash`
- Webサーバー: Apache もしくは Nginx + PHP-FPM

## 🎯 利用想定

phpUploader v2.0.0-roflsunriz は、以下のような用途に最適化されています：

### **基本的な利用シーン**
- **小規模チーム**: 少人数での安全なファイル共有
- **プロジェクト管理**: フォルダ構造を使った整理されたファイル管理
- **一時的な共有**: 期限付きリンクによる安全なファイル配布
- **大容量ファイル**: 再開可能アップロードによる安定した大容量ファイル転送

### **新機能を活用した高度な利用**
- **API統合**: 既存システムとの連携やカスタムクライアント開発
- **モバイル対応**: レスポンシブデザインによるスマートフォン・タブレットからの利用
- **バッチ処理**: 一括操作による効率的なファイル管理
- **セキュア共有**: 暗号化キーと認証による企業レベルのセキュリティ

## 📦 インストール

### **新規インストール**

① 下記URLからダウンロードしたファイルを任意のディレクトリに展開して下さい。

**コミュニティフォーク版（推奨）:**
<https://github.com/roflsunriz/phpUploader/releases>

**オリジナル版:**
<https://github.com/shimosyan/phpUploader/releases>

② 設定ファイルを作成して下さい。

```bash
# config.php.exampleをコピーして設定ファイルを作成
cp config/config.php.example config/config.php
```

③ `config/config.php`を任意の値で編集して下さい。

**重要**: 以下の項目は必ず変更してください：

- `master`: 管理者用キー（DLキー・DELキーのマスターキー）
- `key`: 暗号化用ハッシュ（ランダムな英数字）
- `session_salt`: セッションソルト（ランダムな英数字）

```php
// 例：セキュリティのため必ず変更してください
'master' => 'YOUR_SECURE_MASTER_KEY_HERE',              // マスターキー
'key' => hash('sha256', 'YOUR_ENCRYPTION_SEED_HERE'),   // 暗号化キー
'session_salt' => hash('sha256', 'YOUR_SESSION_SALT'),  // セッションソルト

// v2.0新機能の設定例
'folders_enabled' => true,                              // フォルダ機能有効化
'api_enabled' => true,                                  // API機能有効化
'allow_comment_edit' => true,                           // コメント編集許可
'allow_file_replace' => true,                           // ファイル差し替え許可
'upload_method_priority' => 'resumable',                // 再開可能アップロード優先
```

④ 設置したディレクトリにapacheまたはnginxの実行権限を付与して下さい。

④ この状態でサーバーに接続すると下記のディレクトリとファイルが自動作成されます。

- **DBファイル**: `./db/uploader.db` (SQLiteデータベース)
- **データディレクトリ**: `./data` (アップロードファイル保存用)
- **ログディレクトリ**: `./logs` (システムログ保存用)
- **一時ディレクトリ**: `./temp` (再開可能アップロード用一時ファイル)

**自動マイグレーション**: v1.xからアップグレードする場合、初回アクセス時にデータベースが自動的に新しいスキーマに更新されます。

⑤ 以下のディレクトリには`.htaccess`などを用いて外部からの直接アクセスを遮断させて下さい：
- `config/` (設定ファイル)
- `db/` (データベースファイル)
- `logs/` (ログファイル)
- `temp/` (一時ファイル)

**セキュリティ設定例（Apache）:**

```apache
# config/.htaccess
<Files "*">
    Deny from all
</Files>

# db/.htaccess
<Files "*">
    Deny from all
</Files>

# logs/.htaccess
<Files "*">
    Deny from all
</Files>

# temp/.htaccess
<Files "*">
    Deny from all
</Files>
```

⑥ファイルがアップロードできるよう、PHPとapacheまたはnginxの設定を変更してください。

### **v1.xからのアップグレード**

**重要**: 必ずバックアップを取ってからアップグレードしてください。

① 既存のインストールをバックアップ
```bash
# ファイルとデータベースをバックアップ
cp -r /path/to/phpUploader /path/to/phpUploader_backup
```

② 新しいバージョンのファイルで更新
③ `config/config.php`に新しい設定オプションを追加（上記の設定例を参照）
④ アプリケーションにアクセス - データベースマイグレーションが自動実行されます

**マイグレーション確認**: 初回アクセス時にログファイルでマイグレーション状況を確認できます。

## 🚀 Quick Start (Docker)

Dockerを使用して素早く動作確認できます：

```bash
# 1. コミュニティフォーク版リポジトリをクローン（推奨）
git clone https://github.com/roflsunriz/phpUploader.git
cd phpUploader

# または、オリジナル版
# git clone https://github.com/shimosyan/phpUploader.git
# cd phpUploader

# 2. 設定ファイルを作成
cp config/config.php.example config/config.php

# 3. 設定ファイルを編集（master, keyを変更）
# エディタで config/config.php を開いて編集

# 4. Dockerでサーバー起動
docker-compose up -d web

# 5. ブラウザで http://localhost にアクセス

# 終了するとき
docker-compose down web
```

## Security Notes

**設定ファイルのセキュリティ**:

- `config/config.php`は機密情報を含むため、必ず外部アクセスを遮断してください
- `master`と`key`には推測困難なランダムな値を設定してください
- 本番環境では`config`と`db`、`logs`ディレクトリへの直接アクセスを禁止してください

**推奨セキュリティ設定**:

```php
// 強力なキーの例（実際は異なる値を使用してください）
'master'       => bin2hex(random_bytes(16)), // 32文字のランダム文字列
'key'          => bin2hex(random_bytes(32)), // 64文字のランダム文字列
'session_salt' => hash('sha256', bin2hex(random_bytes(32))), // 32文字のランダム文字列
```

## Development

### 初期セットアップ

開発を始める前に、設定ファイルを準備してください：

```bash
# 設定ファイルのテンプレートをコピー
cp config/config.php.example config/config.php

# 設定ファイルを編集（開発用の値に変更）
# master, key などをローカル開発用の値に設定
```

**注意**: `config/config.php`は`.gitignore`に含まれており、リポジトリにはコミットされません。

### バージョン管理

このプロジェクトでは`composer.json`でバージョンを一元管理しています。

- **composer.json**: マスターバージョン情報
- **config.php**: composer.jsonから自動的にバージョンを読み取り

バージョン確認テスト:

```bash
# Docker環境で実行
docker-compose --profile tools up -d php-cli
docker-compose exec php-cli php scripts/test-version.php

# 終了するとき
docker-compose down php-cli
```

### Docker環境での開発

PHPがローカルにインストールされていなくても、Dockerを使って開発できます。

```bash
# Webサーバーの起動
docker-compose up -d web

# リリース管理（Linux/Mac）
./scripts/release.sh x.x.x

# リリース管理（Windows）
scripts\release.bat x.x.x

# 自動プッシュ付きリリース
./scripts/release.sh x.x.x --push

# Composer管理
./scripts/composer.sh install
./scripts/composer.sh update
```

### リリース手順

1. **バージョン更新**: `./scripts/release.sh x.x.x`
2. **変更確認**: 自動的に`composer.json`が更新され、`config.php`は動的に読み取ります
3. **Git操作**: 表示される手順に従ってコミット・タグ・プッシュ
4. **自動リリース**: GitHub Actionsが自動でリリースを作成

**重要**: リリース時は`config/config.php.example`テンプレートが配布され、エンドユーザーが自分で設定ファイルを作成する必要があります。

## 📄 License

### **コミュニティフォーク版 (v2.0.0-roflsunriz)**
Copyright (c) 2025 roflsunriz  
Released under the MIT license  
<https://github.com/roflsunriz/phpUploader/blob/main/MIT-LICENSE.txt>

### **オリジナル版**
Copyright (c) 2025 shimosyan  
Released under the MIT license  
<https://github.com/shimosyan/phpUploader/blob/master/MIT-LICENSE.txt>

---

## 🙏 謝辞

**コミュニティフォーク版について**: この拡張版は、shimosyan氏による優れたオリジナルphpUploaderプロジェクトの基盤の上に構築されています。

**フォーク管理者**: @roflsunriz  
**オリジナルプロジェクト**: shimosyan/phpUploader

**Full Changelog**: <https://github.com/roflsunriz/phpUploader/compare/v1.0.0...v2.0.0-roflsunriz>

phpUploaderをご利用いただき、ありがとうございます！ 🚀
