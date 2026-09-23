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

## Dependabot PR の更新

前提は `.github/dependabot.yml` と PR 用 CI（CI、🔍 Pre-Release Quality Check）です。更新 PR の head SHA と `gh pr checks <PR番号>` の結果を確認してください。patch／minor は全チェック成功後に自動取り込みされます。初回 CI 失敗は failed jobs のみを 1 回再実行し、再失敗した PR は残して手動で修正します。

設定を変えたときは `actionlint .github/workflows/dependabot-automation.yml` と実際の PR の Actions 結果を確認します。問題があれば呼び出し先の共通 workflow SHA を直前の検証済み値へ戻すコミットを push します。取り込まれた依存更新に問題があれば通常の revert コミットで復旧します。

CI 完了より Dependabot の分類が遅れる場合は、`callback_workflow_file` が指す呼び出し側 workflow を `workflow_dispatch` し、同じ PR 番号・head SHA・全チェックを再確認する。呼び出し側のファイル名を変える際はこの入力も一緒に更新する。
