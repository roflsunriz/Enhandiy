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

## フォルダ件数の回帰検証

フォルダ一覧の `file_count` は直下のファイル数です。子孫フォルダのファイルを含めません。初期表示とREST／旧APIの一覧取得を共通集計へ接続しています。

1. `composer test` で空フォルダ、直下と子孫の区別、ルートファイル、追加・移動・削除を確認します。
2. テスト専用のデータベース・保存領域・設定を使う環境で `PLAYWRIGHT_BASE_URL` と `PW_MASTER_KEY` を設定します。ユーザーの稼働中環境をテスト先にしないでください。
3. `frontend` で `npm run test:e2e -- folder-file-counts.spec.ts` を実行します。全一覧API、初期HTML、グリッド／リスト、追加・移動・削除、フォルダ遷移、再読み込みを確認します。
4. 更新後に旧版のPHPが混在しないよう、共通集計ファイルを各呼び出し元と一緒に配置します。問題がある場合は同じファイル一式を直前の版へ戻します。データベースの変更はありません。

## Dependabot PR の更新

前提は `.github/dependabot.yml` と PR 用 CI（CI、🔍 Pre-Release Quality Check）です。更新 PR の head SHA と `gh pr checks <PR番号>` の結果を確認してください。patch／minor は全チェック成功後に自動取り込みされます。初回 CI 失敗は failed jobs のみを 1 回再実行し、再失敗した PR は残して手動で修正します。

設定を変えたときは `actionlint .github/workflows/dependabot-automation.yml` と実際の PR の Actions 結果を確認します。問題があれば呼び出し先の共通 workflow SHA を直前の検証済み値へ戻すコミットを push します。取り込まれた依存更新に問題があれば通常の revert コミットで復旧します。

CI 完了より Dependabot の分類が遅れる場合は、`callback_workflow_file` が指す呼び出し側 workflow を `workflow_dispatch` し、同じ PR 番号・head SHA・全チェックを再確認する。呼び出し側のファイル名を変える際はこの入力も一緒に更新する。
