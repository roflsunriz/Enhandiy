# 調査知見

- `gh` がupstreamの `shimosyan/phpUploader` を選ぶことがある。PR操作は `-R roflsunriz/Enhandiy` または `GH_REPO` を明示する。
- Composer競合はmanifestへ両方の新versionを反映して `composer update <packages>` でlockを再生成する。`content-hash` を手編集しない。
- `actions/labeler` v7は `changed-files` → `any-glob-to-any-file` 形式が必要。`pull_request_target` はbase側設定を読むため、Action更新より先にmainへ設定移行を入れる。
- 一覧の `file_count` は全子孫ファイル総数、削除確認の `file_count`/`moved_files` は直下だけ。両者を流用しない。初期HTML、REST 2経路、旧API、refreshの全5経路を共通集計へ接続しないとSPA更新で0へ戻る。
- コメント編集と差替えは両tabのID・表示名・コメントを共通初期化し、modal closeでID・認証・選択fileを消す。片方だけの更新は別file誤更新を起こす。
- CSRF通過はfile編集認証ではない。UIはmaster/replace key、APIはwrite/admin権限を別途検証する。
- 隔離E2Eは一時DB・架空key・独立Chrome profileを使い、固定sleepではなくPHP HTTPとChrome targetを別々に待つ。実PHP binaryを直接起動し、launcher終了後に子serverを残さない。
- PHP製品classは `Enhandiy` namespace、利用者所有のglobal `config` classだけ例外。静的解析で利用者の `config.php` を読まず、管理templateを型の根拠にする。
- TypeScript 7 CLIは `@typescript/native`、eslint APIは `@typescript/typescript6` を `typescript` aliasで併用する。
- 公開時は稼働設定を書換える旧 `release.php`/wrapperを使わず、tag commit由来のrelease workflowを使う。既存tagを上書きしない。
- CVE-2026-109618／CVE-2026-109619はPHPのリクエスト初期化・終了処理で成立し、アプリコード開始前の経路もある。設定やアプリ内version guardは完全な緩和にならないため、PHP 8.2.35／8.3.36／8.4.27／8.5.12以降を必須化し、Webワーカーを全再起動する。Dockerの修正版タグは2026-10-22に公式registry manifestで確認した。
- 公式 `php:8.4.27-apache` はpdo、pdo_sqlite、sqlite3、mbstring、opensslを組込み済みである。`docker-php-ext-install` で再ビルドすると重複読込みとsource cleanupにより失敗するため、実イメージの `php -m` と環境チェックスクリプトで組込みを検証する。
