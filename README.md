# phpUploader v4.2.3-roflsunriz

## 🎉 概要

phpUploader v4.2.3-roflsunriz は、オリジナルのphpUploaderをベースに大幅に機能強化されたコミュニティフォーク版です。モダンなUI、高度なアップロード機能、包括的なAPI サポート、強化されたセキュリティ機能、一括操作、パスワード強度チェック、そして包括的なファイル管理機能を提供します。

![cover](https://raw.githubusercontent.com/roflsunriz/phpUploader/refs/heads/main/image/cover.png)

## ✨ 主要機能

### 🎯 **モダンファイルマネージャー**
- **グリッド/リスト表示**: 美しいカード形式のファイル表示とビュー切り替え
- **高度な検索・ソート**: リアルタイムファイル検索と複数のソートオプション
- **ページネーション**: 大量ファイルの効率的な表示
- **レスポンシブデザイン**: 全デバイス対応のモバイルフレンドリーなインターフェース
- **リアルタイム更新**: jQuery削除によるモダンなJavaScriptでの高速レスポンス
- **動的更新**: 操作後の自動ファイルリスト更新とステータス同期

### 📁 **フォルダ管理システム**
- **階層フォルダ**: ネストしたフォルダ構造の作成・管理
- **フォルダナビゲーション**: パンくずナビゲーションによる直感的なフォルダブラウジング
- **設定可能な深度**: カスタマイズ可能な最大フォルダ深度と制限

### 🚀 **高度なアップロード機能**
- **ドラッグ＆ドロップアップロード**: 複数ファイル対応のモダンなドラッグ＆ドロップインターフェース
- **再開可能アップロード**: Tus.ioプロトコルによる大容量ファイルの一時停止・再開機能
- **進捗追跡**: 速度表示付きのリアルタイムアップロード進捗
- **フォールバック対応**: 再開可能アップロードが失敗した場合の従来アップロードへの自動切り替え

### 🔗 **ファイル共有・リンク機能**
- **共有リンク生成**: ファイル用の安全で時間制限付き共有リンクを作成
- **DLキー未設定対応**: ダウンロードキーが設定されていないファイルにも対応
- **カスタマイズ可能な有効期限**: 共有ファイルの有効期限をカスタム設定
- **ダウンロード制限**: 共有リンクごとの最大ダウンロード回数制御
- **動的更新**: モーダル内でのリアルタイム設定反映とクリップボード連携

### 📋 **一括選択・操作機能**
- **ファイル一括選択**: チェックボックスによる複数ファイルの効率的な選択
- **全選択機能**: ワンクリックで表示中の全ファイルを選択
- **マスターキー認証**: 管理者による安全で確実な一括削除機能(マスターキー以外ではセキュリティの為一括削除不可)
- **選択状態表示**: 選択されたファイル数の視覚的フィードバック

### ✏️ **ファイル管理・編集機能**
- **コメント編集**: ファイルマネージャーから直接ファイルコメントを編集
- **ファイル差し替え**: メタデータを維持したまま既存ファイルを差し替え
- **差し替えキー認証**: キー検証による安全なファイル差し替え
- **削除キー強化**: 必須化された削除キーによる個別ファイル削除

### 🔐 **セキュリティ・柔軟性の強化**
- **パスワード強度チェック**: リアルタイムなパスワード強度評価と視覚的フィードバック
- **削除キー必須化**: アップロード時の削除キー設定必須による安全性向上
- **統一暗号化**: AES-GCM方式による強化されたセキュリティ（旧方式との互換性保持）
- **柔軟なDLキー**: ダウンロードキーの必須/任意を設定で切り替え
- **差し替えキーシステム**: 暗号化キー検証による安全なファイル差し替え
- **CSRF保護**: CSRFトークン検証による強化されたセキュリティ
- **レート制限**: 悪用防止のためのAPIレート制限
- **弱パスワード拒否**: よく使われる危険なパスワードの自動検出・拒否機能

### 🌐 **RESTful API**
- **完全なREST API**: 全ファイル操作をカバーする包括的API
- **複数認証方式**: Bearer トークン、APIキー、クエリパラメータ認証をサポート
- **CORS対応**: Webアプリケーション向けのクロスオリジンリクエストサポート
- **包括的ドキュメント**: 例付きの詳細なAPIドキュメント
- **エラーハンドリング**: 詳細なエラーコード付きの標準化されたエラーレスポンス

詳しいAPI仕様は[docs/API.md](docs/API.md)を参照してください。

## 🔧 設定の改善

### **拡張された設定オプション**
- **ファイルアップロード設定**: 設定可能なファイルサイズ制限、許可拡張子(whitelist, blacklist, all)
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

// ファイル編集・管理
'allow_comment_edit' => true,
'allow_file_replace' => true,

// 一括操作機能
'bulk_operations_enabled' => true,      // v3.0.0: 一括操作機能
'bulk_delete_limit' => 100,             // v3.0.0: 一括削除の最大件数

// 再開可能アップロード
'upload_method_priority' => 'resumable',

// API設定
'api_enabled' => true,
'api_rate_limit' => 100
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

## ⚠️ 重要: バージョンアップでの変更について

### **Ver.4.0.0 の重要な変更**
- **大規模なフォルダー構造の整理**: フォルダー構造を整理し、フォルダーの管理が容易になりました
- **APIの呼び出し箇所変更**: フォルダー構造を整理したことでURLが変わりました(公式エンドポイントは変更なし)
- v4.0.4 でv1.xからの自動マイグレーション機能を実装したため、v1.xから特別な操作の必要なくアップグレードできます。(既存ファイルはダウンロードキーは無効化されダウンロード可能に、削除はマスターキーのみの対応になります)

### **Ver.3.3.0 の重要な変更**
- **差し替えキーのパスワード強度チェック**: アップロード時の差し替えキー設定にパスワード強度チェックを追加しました
- **適切な強度チェック適用**: ファイル編集モーダルでの認証時は強度チェックを除外し、新規設定時のみ適用
- **セキュリティ向上**: 弱い差し替えキーの設定を防ぎ、より安全なファイル管理を実現

### **Ver.3.2.0 の重要な変更**
- **ファイル編集モーダル修正**: タブとボタンの状態が一致しない問題を修正しました
- **モーダル状態管理改善**: showModal後のボタン表示制御を改善し、UIの整合性を向上させました
- **バグ修正**: 差し替えタブに切り替えてからモーダルを再開時にボタンが正しく表示されない問題を解決

### **Ver.3.1.0 の重要な変更**
- **削除キー必須化**: 新規ファイルアップロード時に削除キーの設定が必須になりました
- **パスワード強度チェック**: 弱いパスワード（6文字未満、よく使われるパスワード）は自動拒否されます
- **セキュリティ強化**: AES-GCM暗号化方式がデフォルトになりました（旧方式との互換性あり）

### **Ver.3.0.0 の主要変更**
- **一括操作機能**: ファイルの一括選択・削除機能が追加されました
- **セキュリティ統一**: 全APIで一貫したセキュリティレベルが適用されました
- **共有リンク改善**: DLキー未設定ファイルの共有リンク生成に対応しました

### **Ver.2.0.0 の破壊的変更**
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
- SQLite（PHPには通常 `sqlite3` 拡張がバンドルされていますが、Linuxディストリビューションによってはデフォルトで有効化されていない場合があります。その場合、例えばUbuntuやDebian系では `php8.1-sqlite3` のようなパッケージを追加インストールする必要があります。Windowsの公式PHP配布版では多くの場合デフォルトで有効ですが、`php.ini` で `extension=sqlite3` の記述がコメントアウトされていないか確認してください。）
- PHP拡張: `openssl`, `json`, `mbstring`, `hash`
- Webサーバー: Apache もしくは Nginx + PHP-FPM
## 🛠️ Requirementのインストール方法

### 1. PHP 8.1 以上のインストール

#### Windowsの場合
1. [公式PHPダウンロードページ](https://windows.php.net/download/)から「Thread Safe」版のzipファイルをダウンロードします。
2. zipを任意のディレクトリに展開します（例: `C:\php`）。
3. `php.ini-development` を `php.ini` にリネームし、必要に応じて編集します。
4. 環境変数 `PATH` にPHPのパス（例: `C:\php`）を追加します。
5. コマンドプロンプトで `php -v` を実行し、バージョンが8.1以上であることを確認します。

#### Linux (Ubuntu)の場合
1. 端末を開き、以下のコマンドでリポジトリを追加します（必要に応じてsudoを付けてください）:
   ```bash
   sudo apt update
   sudo apt install -y software-properties-common
   sudo add-apt-repository ppa:ondrej/php
   sudo apt update
   ```
2. PHP 8.1と必要な拡張モジュールをインストールします:
   ```bash
   sudo apt install -y php8.1 php8.1-cli php8.1-fpm php8.1-sqlite3 php8.1-mbstring php8.1-json php8.1-openssl php8.1-hash
   ```
3. バージョン確認:
   ```bash
   php -v
   ```
   8.1以上であることを確認してください。

### 2. SQLite のインストール

- PHPの `sqlite3` 拡張がインストールされていれば、追加のインストールは不要です。
- コマンドラインツールとしてsqlite3を使いたい場合は以下を実行してください:
  ```bash
  sudo apt install -y sqlite3
  ```
- バージョン確認:
  ```bash
  sqlite3 --version
  ```

### 3. PHP拡張モジュールの確認

- 必要な拡張（openssl, json, mbstring, hash, sqlite3）が有効か確認します:
  ```bash
  php -m | grep -E 'openssl|json|mbstring|hash|sqlite3'
  ```
  すべて表示されていればOKです。

### 4. Webサーバーのインストール

#### Apacheの場合
1. Apacheをインストールします（Ubuntuの場合）:
   ```bash
   sudo apt update
   sudo apt install -y apache2
   ```
2. Apacheのサービスを起動し、自動起動を有効にします:
   ```bash
   sudo systemctl start apache2
   sudo systemctl enable apache2
   ```
3. ブラウザで `http://localhost/` にアクセスし、「Apache2 Ubuntu Default Page」が表示されることを確認してください。

4. PHPとApacheの連携モジュールをインストールします:
   ```bash
   sudo apt install -y libapache2-mod-php8.1
   sudo systemctl restart apache2
   ```
5. PHPが正しく動作するか確認するには、`/var/www/html` ディレクトリに `info.php` というファイルを作成し、以下の内容を記述します:
   ```php
   <?php phpinfo();
   ```
   その後、ブラウザで `http://localhost/info.php` にアクセスし、PHPの情報ページが表示されれば成功です。

6. セキュリティのため、確認後は `info.php` を削除してください:
   ```bash
   sudo rm /var/www/html/info.php
   ```

※ Windowsの場合は [XAMPP](https://www.apachefriends.org/index.html) などのパッケージを利用すると簡単にApache+PHP環境を構築できます。
#### PHP拡張モジュールとは？

PHP拡張モジュール（エクステンション）は、PHPの標準機能を拡張する追加モジュールです。たとえば「sqlite3」や「mbstring」などがそれに当たります。これらの拡張は、特定の機能（データベース接続やマルチバイト文字列処理など）を使うために必要になります。

- **有効化の確認方法**  
  すでにインストールされている拡張が有効かどうかは、次のコマンドで確認できます。
  ```bash
  php -m
  ```
  このコマンドで表示されるリストに、必要な拡張（例: `sqlite3`, `mbstring`, `openssl`, `json`, `hash`）が含まれていればOKです。

- **拡張の有効化・インストール方法（Ubuntu例）**  
  拡張が無効・未インストールの場合は、以下のようにして追加できます。
  ```bash
  sudo apt install -y php-sqlite3 php-mbstring php-json php-openssl php-hash
  sudo systemctl restart apache2 # Apache利用時
  ```
  ※ 利用しているPHPのバージョンによっては、`php8.1-sqlite3` のようにバージョン番号が付く場合もあります。

- **php.iniでの有効化**  
  インストール済みでも有効化されていない場合は、`php.ini` ファイルで該当拡張のコメントアウト（`;extension=xxx`）を外して `extension=xxx` とする必要があります。

- **Windowsの場合**  
  XAMPPなどのパッケージを使っている場合は、`php.ini` をエディタで開き、必要な拡張の行頭の「;」を削除して保存し、Apacheを再起動してください。

- **トラブルシューティング**  
  拡張が有効にならない場合は、`phpinfo();` を使って現在のPHP設定を確認し、拡張ディレクトリや有効化状況をチェックしてください。

**まとめ**  
本プロジェクトでは、`openssl`, `json`, `mbstring`, `hash`, `sqlite3` などの拡張が必須です。インストール・有効化を忘れずに確認しておいてください。


## 🎯 利用想定

phpUploader v4.2.3-roflsunriz は、以下のような用途に最適化されています：

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
cp backend/config/config.php.example backend/config/config.php
```

③ `backend/config/config.php`を任意の値で編集して下さい。

**重要**: 以下の項目は必ず変更してください：

- `master`: 管理者用キー（DLキー・DELキーのマスターキー）
- `key`: 暗号化用ハッシュ（ランダムな英数字）
- `session_salt`: セッションソルト（ランダムな英数字）

```php
// 例：セキュリティのため必ず変更してください
'master' => 'YOUR_SECURE_MASTER_KEY_HERE',              // マスターキー
'key' => hash('sha256', 'YOUR_ENCRYPTION_SEED_HERE'),   // 暗号化キー
'session_salt' => hash('sha256', 'YOUR_SESSION_SALT'),  // セッションソルト

// v4.0.0新機能の設定例
'folders_enabled' => true,                              // フォルダ機能有効化
'api_enabled' => true,                                  // API機能有効化
'allow_comment_edit' => true,                           // コメント編集許可
'allow_file_replace' => true,                           // ファイル差し替え許可
'upload_method_priority' => 'resumable',                // 再開可能アップロード優先
```

④ サーバーがファイルやディレクトリへ正しくアクセスできるよう、設置したディレクトリとその配下にWebサーバー（apacheまたはnginx）の実行ユーザーが書き込み・読み込みできる権限を付与してください。

#### 具体的な手順（例: Linux環境の場合）

1. Webサーバーの実行ユーザー（例: `www-data`や`apache`など）を確認します。
   - Ubuntu系: `www-data`
   - CentOS系: `apache`
   - サーバーによって異なるため、`ps aux | grep apache`や`ps aux | grep nginx`で確認できます。

2. ディレクトリの所有者をWebサーバーユーザーに変更します（例: `www-data`の場合）:
   ```bash
   sudo chown -R www-data:www-data /path/to/your/phpUploader
   ```

3. 必要に応じて、書き込み権限を付与します（セキュリティのため最小限に留めてください）:
   ```bash
   sudo chmod -R 750 /path/to/your/phpUploader
   ```

4. 特に以下のディレクトリはWebサーバーからの書き込みが必須です:
   - `db/`
   - `data/`
   - `storage/logs/`
   - `temp/`

   これらのディレクトリに個別に権限を付与する場合の例:
   ```bash
   sudo chown -R www-data:www-data /path/to/your/phpUploader/db /path/to/your/phpUploader/data /path/to/your/phpUploader/storage/logs /path/to/your/phpUploader/temp
   sudo chmod -R 770 /path/to/your/phpUploader/db /path/to/your/phpUploader/data /path/to/your/phpUploader/storage/logs /path/to/your/phpUploader/temp
   ```

> **注意:**  
> サーバーのセキュリティポリシーや運用方針に応じて、権限設定は調整してください。  
> 共有サーバーや本番環境では、不要な権限を与えすぎないよう十分ご注意ください。

④ この状態でサーバーに接続すると下記のディレクトリとファイルが自動作成されます。

- **DBファイル**: `./db/uploader.db` (SQLiteデータベース)
- **データディレクトリ**: `./data` (アップロードファイル保存用)
- **ログディレクトリ**: `./storage/logs` (システムログ保存用)
- **一時ディレクトリ**: `./temp` (再開可能アップロード用一時ファイル)

**自動マイグレーション**: v1.xからアップグレードする場合、初回アクセス時にデータベースが自動的に新しいスキーマに更新されます。

⑤ 以下のディレクトリには外部からの直接アクセスを遮断する対策を必ず施してください。  
代表的な方法としては`.htaccess`による制御がありますが、他にも以下のような手段が有効です。

- **Webサーバーの設定**  
  - Apacheの場合: `httpd.conf`や`virtualhost`設定で該当ディレクトリへのアクセスを拒否する  
  - nginxの場合: `location`ディレクティブで`deny all;`を指定する
- **ディレクトリをドキュメントルートの外に配置する**  
  - そもそもWebから直接アクセスできない場所に機密ディレクトリを置く
- **.htaccessファイルによるアクセス制御**  
  - 各ディレクトリに`Deny from all`や`Require all denied`を記述
- **空のindex.htmlファイルを設置する**  
  - ディレクトリリスト表示を防ぐ（ただし根本的な遮断にはならないので他の方法と併用推奨）

サーバー環境や運用方針に応じて、これらの方法を組み合わせてご利用ください。

```bash
- `backend/config/` (設定ファイル)
- `db/` (データベースファイル)
- `storage/logs/` (ログファイル)
- `temp/` (一時ファイル)
```

**セキュリティ設定例（Apache）:**

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

⑥ ファイルアップロード機能を利用するには、PHPおよびWebサーバー（Apacheまたはnginx）の設定を正しく行う必要があります。  
以下の手順に従って設定を確認・変更してください。

**PHPの設定例（php.ini）:**
- `file_uploads = On`  
  ファイルアップロード機能を有効にします。
- `upload_max_filesize = 100M`  
  1ファイルあたりの最大アップロードサイズ（例：100MB。用途に応じて調整してください）。
- `post_max_size = 100M`  
  POSTリクエスト全体の最大サイズ（`upload_max_filesize`以上に設定してください）。
- `max_file_uploads = 20`  
  一度にアップロードできるファイル数の上限（必要に応じて調整）。

**Apacheの設定例:**
- `.htaccess`や`httpd.conf`で、アップロード先ディレクトリに書き込み権限があることを確認してください。
- 必要に応じて`LimitRequestBody`ディレクティブでリクエストサイズ上限を調整します（例：`LimitRequestBody 104857600` で100MB）。

**nginxの設定例:**
- `nginx.conf`や該当サーバーブロックで、`client_max_body_size`ディレクティブを設定します（例：`client_max_body_size 100M;`）。
- PHP-FPMを利用している場合は、アップロード先ディレクトリの書き込み権限も確認してください。

**パーミッションの注意:**
- アップロード先ディレクトリ（例：`temp/`や`storage/`）にWebサーバーのユーザー（例：`www-data`や`apache`）が書き込みできるようにしてください。
- セキュリティのため、アップロードディレクトリには不要な実行権限を与えないようにしましょう。

**例:**
- Linux環境で`temp/`ディレクトリに書き込み権限を付与する場合  
  ```bash
  chmod 770 temp
  chown www-data:www-data temp
  ```
  ※Webサーバーユーザー名は環境によって異なります。

これらの設定を行うことで、ファイルアップロード機能が正しく動作します。  
設定変更後はWebサーバーやPHPの再起動が必要な場合がありますのでご注意ください。

### **v1.xからのアップグレード**

**重要**: 必ずバックアップを取ってからアップグレードしてください。

1. 既存のインストールをバックアップ  
   ```bash
   # ファイルとデータベースをバックアップ
   cp -r /path/to/phpUploader /path/to/phpUploader_backup
   ```
2. 新しいバージョンのファイルで更新する
3. `backend/config/config.php` に新しい設定オプションを追加する（上記の設定例を参照）
4. アプリケーションにアクセスする（データベースマイグレーションが自動実行されます）

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
cp backend/config/config.php.example backend/config/config.php

# 3. 設定ファイルを編集（master, key, session_saltを変更）
# エディタで backend/config/config.php を開いて編集

# 4. カレントディレクトリをinfrastructureディレクトリに変更
cd infrastructure

# 5. Dockerでサーバー起動
docker-compose up -d web

# 6. ブラウザで http://localhost にアクセス

# 終了するとき
docker-compose down web

# 再ビルドしたいとき
docker-compose build --no-cache
```

## Security Notes

**設定ファイルのセキュリティ**:

- `backend/config/config.php`は機密情報を含むため、必ず外部アクセスを遮断してください
- `master`と`key`,`session_salt`には推測困難なランダムな値を設定してください
- 本番環境では`backend/config`と`db`、`storage/logs`、`temp`ディレクトリへの直接アクセスを禁止してください

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
cp backend/config/config.php.example backend/config/config.php

# 設定ファイルを編集（開発用の値に変更）
# master, key, session_salt などをローカル開発用の値に設定
```

**注意**: `backend/config/config.php`は`.gitignore`に含まれており、リポジトリにはコミットされません。

### バージョン管理

- このプロジェクトでは`backend/config/config.php`でバージョンを一元管理しています。
- バージョン情報はUI下部に表示されます。
- `backend/routes/router.php`にAPIバージョンがあるので、バージョンを更新するたびに変更する必要があります。
- また、`backend/services/system-api-handler.php`にもバージョンがあるので、バージョンを更新するたびに変更する必要があります。
- `docs/RELEASE_NOTES_*.md`にバージョンごとの変更点が記載されています。
- `CHANGELOG.md`と`README.md`もバージョンに合わせて適宜更新してください。

バージョン確認テスト:

```bash
# Docker環境で実行
docker-compose --profile tools up -d php-cli
docker-compose exec php-cli php infrastructure/scripts/test-version.php

# 終了するとき
docker-compose down php-cli
```

### Docker環境での開発

PHPがローカルにインストールされていなくても、Dockerを使って開発できます。

```bash
# Webサーバーの起動
docker-compose up -d web

# リリース管理（Linux/Mac）
./infrastructure/scripts/release.sh x.x.x

# リリース管理（Windows）
infrastructure\scripts\release.bat x.x.x

# 自動プッシュ付きリリース
./infrastructure/scripts/release.sh x.x.x --push

# Composer管理
./infrastructure/scripts/composer.sh install
./infrastructure/scripts/composer.sh update
```

### リリース手順

1. **バージョン更新**: `./infrastructure/scripts/release.sh x.x.x`
2. **変更確認**: `backend/config/config.php`のバージョン番号を手動で更新
3. **Git操作**: 表示される手順に従ってコミット・タグ・プッシュ
4. **自動リリース**: GitHub Actionsが自動でリリースを作成

**重要**: リリース時は`backend/config/config.php.example`テンプレートが配布され、エンドユーザーが自分で設定ファイルを作成する必要があります。

## 📄 License

### **コミュニティフォーク版 (v4.2.3-roflsunriz)**
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

**Full Changelog**: <https://github.com/roflsunriz/phpUploader/compare/v1.0.0...v4.2.3-roflsunriz>

phpUploaderをご利用いただき、ありがとうございます！ 🚀
