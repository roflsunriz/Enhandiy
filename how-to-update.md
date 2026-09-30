# 更新手順

1. CHANGELOG.mdを更新
2. docs/guide-important-changes.mdを更新(必要ならば)
3. README.mdを更新(必要ならば)
4. その他ドキュメントを必要なら更新
5. config.php.exampleのバージョン番号を更新
6. router.phpのapi_versionを更新
7. system-api-handler.phpのversionを更新
8. views/index.phpのversionを更新
9. frontend/package.jsonのversionを更新
10. frontend/package-lock.jsonのversionを更新
11. 日本語でコミットメッセージを作成してコミット＆プッシュ
12. git tag vx.x.xとgit push origin vx.x.xでタグ作成＆リリース作成
13. GitHub Actionsでリリース作成されるので、gh release viewでリリースを確認

## 自動検査と依存関係の更新

PHP 8.1以上、Composer、Node.js 24以上を用意します。フロントエンドの詳しいNode要件は `frontend/package.json` の依存パッケージのenginesも確認してください。

リポジトリ直下で `composer install`、`composer validate --no-check-publish`、`composer lint`、`composer analyse`、`composer test`、`composer audit` を実行します。PHPの名前空間とヘッダー順序を含むPSR12、静的解析、件数・表示・バージョン・フォームの回帰を検査します。

`frontend` で `npm ci`、`npm run lint`、`npm run type-check`、`npm run build`、`npm audit` を実行します。`--legacy-peer-deps` は不要です。TS7の型検査CLIとlint用TS6 APIは、[Microsoftの公式併用手順](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6-0)に従う別名依存です。パッケージを更新するときは両方の互換性を確認し、lockfileを通常のnpmコマンドで生成してください。

CIはPHP 8.1／8.2／8.3とNode 24で上記の検査を実行し、Dockerビルドは `docker build -t enhandiy-test ./infrastructure/docker/` で確認します。失敗を警告へ置き換えて成功扱いにしません。動的なGitHub管理のAIレビューがモデルエラーで失敗する場合は、そのrunのログを記録し、通常CIやCodeQLと区別してください。

PHPクラス・呼び出し元は同じコミットのファイル一式で更新します。稼働中の `backend/config/config.php`、DB、保存ファイルやブラウザ認証を置き換えないでください。既存のグローバル `config` クラスはそのまま利用できます。問題があれば追加修正コミットをrevertし、旧版のPHP一式と依存lockfileに揃えて再導入・再検査します。

## フォルダ件数の回帰検証

フォルダ一覧の `file_count` は、自身とすべての子孫フォルダのファイル総数です。フォルダ自体は数えません。初期表示とREST／旧APIの一覧取得を共通集計へ接続しています。

1. `composer test` で空のツリー、複数階層の総数、ルートファイルの除外、追加・移動・削除による祖先の更新、5000階層、1クエリでの取得、循環検出を確認します。
2. テスト専用のデータベース・保存領域・設定を使う環境で `PLAYWRIGHT_BASE_URL` と `PW_MASTER_KEY` を設定します。ユーザーの稼働中環境をテスト先にしないでください。
3. `frontend` で `npm run test:e2e -- folder-file-counts.spec.ts` を実行します。全一覧API、初期HTML、グリッド／リスト、追加・移動・削除、フォルダ遷移、再読み込みを確認します。
4. 更新後に旧版のPHPが混在しないよう、共通集計ファイルを各呼び出し元と一緒に配置します。問題がある場合は同じファイル一式を直前の版へ戻します。データベースの変更はありません。

## Dependabot PR の更新

前提は `.github/dependabot.yml` と PR 用 CI（CI、🔍 Pre-Release Quality Check）です。更新 PR の head SHA と `gh pr checks <PR番号>` の結果を確認してください。patch／minor は全チェック成功後に自動取り込みされます。初回 CI 失敗は failed jobs のみを 1 回再実行し、再失敗した PR は残して手動で修正します。

設定を変えたときは `actionlint .github/workflows/dependabot-automation.yml` と実際の PR の Actions 結果を確認します。問題があれば呼び出し先の共通 workflow SHA を直前の検証済み値へ戻すコミットを push します。取り込まれた依存更新に問題があれば通常の revert コミットで復旧します。

CI 完了より Dependabot の分類が遅れる場合は、`callback_workflow_file` が指す呼び出し側 workflow を `workflow_dispatch` し、同じ PR 番号・head SHA・全チェックを再確認する。呼び出し側のファイル名を変える際はこの入力も一緒に更新する。
