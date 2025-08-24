# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.3.0-roflsunriz] - 2025-08-25

### Fixed

- 共有リンク経由でのダウンロード時、ダウンロードキーがバイパスされないよう修正
- dockerからフロントエンドアセットとバックエンドアセットのエイリアスを削除
- 本番環境でも動作するように修正(backend/public/index.php→backend/public/api/index.php→backend/routes/router.phpを経由するように修正, REST化)
- フロントエンドアセットをfrontend/dist/からbackend/public/assets/に移動
- その他変更に伴って発生したバグの修正

### Feature
- ダウンロードキー設定済みファイルを共有リンク経由でダウンロードするときにダウンロードキー認証フォームを表示するようにした


## [4.2.6-roflsunriz] - 2025-08-24

### Fixed

- backend/public/index.phpのAPIアクセスで404エラーになる問題を修正

## [4.2.5-roflsunriz] - 2025-08-23

### Fixed

- 初期化処理を修正。data, db, storage/logsフォルダが存在しない場合にシステムエラーになる問題を修正。自動作成するようにした。

## [4.2.4-roflsunriz] - 2025-08-20

### Chore

- サーバーログの日本語がUTF-8エンコードで読めないので英語に統一。

## [4.2.3-roflsunriz] - 2025-08-20

### Feature

- TUSアップロード時にSQLiteデータベースにstored_file_name, file_hash, ip_addressが保存されるように改良。

### Fixed

- 更新ボタンのスタイルをグリッド・リスト切り替えボタンと同じにした。

## [4.2.2-roflsunriz] - 2025-08-19

### Fixed

- ファイル選択キューが非表示になっている問題を修正

## [4.2.1-roflsunriz] - 2025-08-19

### Feature

- アップローダのタイトル、説明、URLをconfig.phpで設定可能にした


## [4.2.0-roflsunriz] - 2025-08-19

### Added

- **マスターキーの追加**: コメント編集とファイル差し替えでもマスターキーを使用できるようにしました。

### Changed

- **絵文字の完全なマテリアルアイコンへの置き換え**: 絵文字を完全にマテリアルアイコンに置き換えてプロフェッショナルなデザインにしました。

### Fixed

- **一括選択時の「全解除ボタン」と「選択状態」ボタンの重複を削除し、「選択解除」に統一**: 一括選択時の「全解除ボタン」と「選択状態」ボタンの重複を削除し、「選択解除」に統一しました。


## [4.1.0-roflsunriz] - 2025-08-18

### Added

- 拡張子ポリシーの変更とアップロードモーダル起動ボタンの追加を行った
- 常にアップロードセクションが表示される代わりに起動ボタンでコンパクトにした



## [4.0.4-roflsunriz] - 2025-08-18

### Fixed

- **データベースのマイグレーション処理を改善**: データベースのマイグレーション処理を改善, v1.x系からのデータベースの移行を可能にした。

## [4.0.3-roflsunriz] - 2025-08-18

### Fixed

- **削除キーの設定を廃止し、システムレベルで常に必須となるようにした**


## [4.0.2-roflsunriz] - 2025-08-07

### Added

- **ファイルダウンロード用API追加**: ファイルダウンロード用APIを追加

## [4.0.1-roflsunriz] - 2025-08-07

### Chore

- **不要レートリミットファイルの削除**: 不要なレートリミットファイルを削除

## [4.0.0-roflsunriz] - 2025-08-07

### BREAKING CHANGES

- **フォルダー構造の整理**: 大規模なフォルダー構造の整理により、コードベースの保守性が向上
  - `backend/`: サーバーサイドロジック全体を整理
  - `frontend/`: クライアントサイドコード（TypeScript/JavaScript）を集約  
  - `docs/`: ドキュメント類を統一
  - `infrastructure/`: Docker設定とスクリプト類を集約
- **APIの呼び出し箇所変更**: フォルダー構造整理により一部URLが変更
  - 直接APIファイルにアクセスするカスタム実装は更新が必要
  - 公式APIエンドポイント（`/api/router.php`経由）は変更なし

### Changed

- **コードベース整理**: 明確な責任分離により開発効率が向上
- **保守性向上**: 関連ファイルのグループ化によりメンテナンスが容易に
- **設定管理統一**: `backend/config/`に設定を集約
- **スクリプト改善**: `infrastructure/scripts/`にデプロイメントツールを整理

### Security

- v3.x系のセキュリティ機能をすべて継承
  - AES-GCM暗号化
  - パスワード強度チェック  
  - CSRF保護
  - レート制限
  - 入力値検証


## [3.5.0-roflsunriz] - 2025-08-07

### Fixed

- **データベースのセキュリティ強化**: tus_uploadsテーブルに保存されていた平文キーを暗号化するようにした
- **データベースのfile_history操作記録強化**: RESTful APIだけでなくコメント編集やファイル差し替え操作APIでもファイル変更履歴が保存されるように修正
- **UI調整**: ファイルアップロードリストの調整
- **動的更新**: 個別削除時にファイルリストが更新されない問題を修正、一括削除とファイル階層移動時の動的更新は未修正


## [3.4.0-roflsunriz] - 2025-08-06

### Fixed

- **弱いパスワード自動拒否機能の修正**: WEAK_PASSWORDSリストに含まれるパスワードが正しく拒否されない問題を修正
- **大文字小文字バリエーション対応**: "test"、"TEST"、"TeSt"など大文字小文字のバリエーションも含めて弱いパスワードを確実に検出・拒否
- **アップロード時検証強化**: フォーム送信時のパスワード強度チェックが正しく動作するようパスワード検証を`getUploadOptions`関数に移動
- **UI/UX改善**: 弱いパスワードでのアップロード拒否時に「通信エラー」ではなく適切なパスワードエラーメッセージを統合モーダルで表示

### Security

- **セキュリティ強化**: 弱いパスワードのバリエーションを完全に阻止し、より堅牢な認証システムを実現

## [3.3.0-roflsunriz] - 2025-08-06

### Added

- **差し替えキーのパスワード強度チェック**: アップロード時の差し替えキー設定にパスワード強度チェックを追加
- **適切な強度チェック適用**: ファイル編集モーダルでの認証時は強度チェックを除外、新規設定時のみ適用

### Security

- **セキュリティ向上**: 弱い差し替えキーの設定を防ぎ、より安全なファイル管理を実現

## [3.2.0-roflsunriz] - 2025-08-06

### Fixed

- **ファイル編集モーダル修正**: タブとボタンの状態が一致しない問題を修正
- **モーダル状態管理改善**: showModal後のボタン表示制御を改善し、UIの整合性を向上
- **バグ修正**: 差し替えタブに切り替えてからモーダルを再開時にボタンが正しく表示されない問題を解決

## [3.1.0-roflsunriz] - 2025-08-06

### Added

- **パスワード強度チェック機能**: リアルタイムなパスワード強度評価と視覚的フィードバック
- **削除キー必須化**: ファイルアップロード時の削除キー設定を必須に変更
- **日本語対応**: 日本語の簡単なパスワードも検出・警告

### Security

- **弱いパスワード対策**: よく使われる危険なパスワードのブラックリスト実装
- **自動拒否機能**: 極端に弱いパスワードの自動拒否
- **段階的評価**: 文字種類、長さ、複雑さによる多角的なパスワード評価

## [3.0.0-roflsunriz] - 2025-08-06

### Added

- **一括選択・操作機能**: チェックボックスによる複数ファイルの一括操作
- **全選択機能**: 一度に全てのファイルを選択する機能
- **一括削除API**: 選択したファイルを一度にまとめて削除
- **マスターキー認証**: 管理者による安全な一括削除機能

### Changed

- **セキュリティ機能の統一・強化**: 全APIで一貫したAES-GCM暗号化方式を採用
- **共有リンク機能の改善**: DLキー未設定ファイルの共有リンク生成に対応
- **ユーザーインターフェースの向上**: 一括選択に対応したモダンなインターフェース

### Security

- **レガシー互換性**: 旧暗号化方式（ECB）との下位互換性を維持
- **認証方式統一**: 全機能で一貫したセキュリティレベル
- **入力値検証**: 厳格な入力データ検証機能

### Fixed

- **500エラー解消**: 共有リンク生成時のInternal Server Errorを完全解決
- **削除キー互換性**: 旧バージョンとの削除キー互換性を保持
- **重複初期化防止**: FileManagerの重複初期化エラーを解決
- **モーダル表示**: z-index調整によるモーダル表示問題の解決

## [2.0.0] - 2025-07-31

**🚨 BREAKING CHANGES: Ver.2.0は内部DBの仕様が刷新されているため、Ver.1.x系との互換性がありません。**

### Changed

- **PHP要件を8.1+に更新**
- サーバー処理を全面更新
- ファイル一覧のUIを刷新
- config.phpをテンプレート化（config.php.example）
- バージョン情報をcomposer.jsonから動的取得に変更
- リリース管理プロセスの改善
- アクセスログ機能を実装

### Security

- 各認証用文字列の暗号化方式を変更
- レインボーテーブル攻撃対策として、Argon2ID パスワードハッシュ化
- CSRF保護を導入
- セッション強化
- ディレクトリトラバーサル対策として、ファイル名ハッシュ化を強制
- SQL インジェクション完全対策として、PDO PreparedStatement に移行

## [1.2.1] - 2022-02-09

本アップデートには以下の脆弱性に対する対応が実施されています。
影響を受けるバージョンは以下のとおりです。

- phpUploader v1.2 以前の全てのバージョン

該当バージョンの確認方法は v1.2 までは提供しておりません。トップページ右下のクレジットが以下の表記の場合はすべて v1.2 以前となります。
`@shimosyan/phpUploader (GitHub)`

The following vulnerabilities have been addressed in this update.
Affected versions are as follows

- All versions of phpUploader v1.2 and earlier

We do not provide a way to check the affected versions until v1.2. If the credit in the lower right corner of the top page is as follows, all versions are v1.2 or earlier.
`@shimosyan/phpUploader (GitHub)`.

### 更新方法

はじめに、設定ファイル（`./config/config.php`）をバックアップしてください。
バージョン 1.0 より前の製品を利用されている方は、データベースファイルなどを含むソフトウェア全データを消去してから本対策版バージョンをインストールしてください。
バージョン 1.0 以降の製品を利用されている方は、ソフトウェア本体を消去してから本対策版バージョンをインストールしてください。
最後に、バックアップした設定ファイルの各値を新しくインストールした設定ファイル（`./config/config.php`）に登録してください。

本対策版バージョンは画面下部の `Assets` 欄から入手してください。

First, back up your configuration file (`. /config/config.php`).
If you are using a product earlier than version 1.0, please delete all data including database files before installing this countermeasure version.
If you are using a product with version 1.0 or later, delete the software itself before installing this countermeasure version.
Finally, add each value of the backed up configuration file to the newly installed configuration file (`. /config/config.php`).

You can get this countermeasure version from the `Assets` field at the bottom of the screen.

### 脆弱性対応

- Stored XSS に関する脆弱性修正を実施しました。
- SQL インジェクション に関する脆弱性修正を実施しました。

### その他対応

- トップページ右下のクレジット欄にバージョン情報を明記するようにしました。
  - 例：`@shimosyan/phpUploader v1.2.1 (GitHub)`
- ファイル内の余剰な空白の消去、EOL の追加などファイルの体裁を整えました。

## [1.2] - 2019-01-07

### Added

- サーバー内で格納するアップロードファイルの名称をハッシュ化するオプションを追加しました。セキュリティをより向上させたいときにお使いください。

## [1.1] - 2019-01-06

### Fixed

- IE系のブラウザで日本語ファイルをダウンロードすると文字化けする問題を修正。
- アップロード時に拡張子が大文字であっても通るように修正。
- アップロード時にPHPで発生したエラーを表示するよう変更。
- HTTPS環境では外部ライブラリが正しく参照されない問題を修正。

## [1.0] - 2017-05-07

### Added

- DL及び削除にパスワードを設定できるようにしました。
- 管理者用のパスワードから全てのファイルに対してDL及び削除ができるようにしました。
- 各ファイルのDL数を表示できるようにしました。

### Changed

- ファイルリストの並び順を新しいファイル順に変更しました。
- DBファイルの構成を変更しました。

## [0.2] - 2017-05-04

### Fixed

- DL時の出力バッファのゴミがダウンロードファイルに混入する不具合を修正

## [0.1] - 2017-05-04

### Added

- 新規リリース
