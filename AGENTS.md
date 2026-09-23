# AGENTS.md

## 作業開始前の必須手順（最優先・例外なし）

1. エージェントは、調査、計画、コマンド実行、スキル利用、ファイル編集、コミット、プッシュを始める前に、必ずリポジトリ直下の `.\COMMON-AGENTS.md` を開き、先頭から末尾まで全文を読む。
2. `COMMON-AGENTS.md` はGit管理外のシンボリックリンクである。`git`や既定のignore設定が有効な`rg --files`の検索結果だけで、ファイルが存在しないと判断してはならない。PowerShellでは最初に次を実行する。

```powershell
Get-Content -Raw -LiteralPath .\COMMON-AGENTS.md
```

3. 読み取りに失敗した場合、出力が省略された場合、または末尾まで読めたことを確認できない場合は、一切の作業を開始せず、パスとシンボリックリンク先を確認して全文を再取得する。必要なら分割して末尾まで読む。
4. 全文を読了するまで、ローカル `AGENTS.md` だけを根拠に作業を続けてはならない。読了後は `COMMON-AGENTS.md` を最優先の指針とし、読了直後の最初の進捗報告で全文を読了したことを明示する。
このファイルでは `Enhandiy` 固有の補足だけを記載する。

## 品質確認

- TypeScript の場合は、ファイル編集後に `npm run lint`、`npm run type-check`、`npm run build` を実行して全てグリーンであることを確認する。
- それ以外のファイルの場合には、リンターがあればそれを使って静的解析を実行する。

## Dependabot / GitHub CLI の運用知見

- `gh` は既定で `upstream`（shimosyan/phpUploader）を向くことがある。対象は `roflsunriz/Enhandiy` のため、`-R roflsunriz/Enhandiy` または `$env:GH_REPO="roflsunriz/Enhandiy"` を明示する。`gh pr list` だけでは対象外リポジトリを参照して空に見える。
- Dependabot の Open PR は `gh pr list -R roflsunriz/Enhandiy --state open` で確認する。リモート追跡ブランチ（`origin/dependabot/*`）の残存は `git fetch --prune` 後に再確認する。
- PR ブランチの最新化は `gh api repos/{owner}/{repo}/pulls/<番号>/update-branch -X PUT`（`GH_REPO` 指定）で行う。競合時は 422 になるため、ローカルで対象ブランチへ `origin/main` をマージして解消し、元の Dependabot ブランチへ push する。
- composer 系の競合（phpstan と phpcs の同時更新など）は `composer.json` を両方の新バージョンに手編集し、`php composer.phar update <pkg1> <pkg2>` で `composer.lock` を再生成する。`content-hash` の手編集はしない。
- `actions/labeler` v7 は v5 以降の設定形式が必須である。旧形式（ラベル直下に glob 配列）では `found unexpected type for label ... (should be array of config options)` で失敗する。形式は `changed-files` → `any-glob-to-any-file`（`.github/labeler.yml` 参照）。`pull_request_target` 実行は base ブランチの設定を使うため、labeler 本体の更新と設定移行は main 側へ先に反映してから各 PR を update-branch する。
- 一時取得の `composer.phar` / `composer-setup.php` はリポジトリへ残さず削除する。

## Environment

- .githubフォルダにはGitHub Actionsのワークフローがあります。
- .github/workflowsフォルダにはGitHub Actionsのワークフローがあります。
- .github/workflows/ci.ymlはCIのワークフローがあります。
- .github/workflows/release.ymlはReleaseのワークフローがあります。
- .github/workflows/labeler.ymlはLabelerのワークフローがあります。
- .github/workflows/pre-release-check.ymlはPre-Release Quality Checkのワークフローがあります。
- .github/workflows/tag-and-release.ymlはTag and Releaseのワークフローがあります。
- .github/ にはその他にIssueテンプレートとPull Requestテンプレートがあります。
- backendフォルダにはPHPのコードがあります。
- frontendフォルダにはTypeScriptのコードがあります。
- dbフォルダにはデータベースのスキーマがあります。
- infrastructureフォルダにはDockerの設定があります。
- docsフォルダにはドキュメントがあります。
- .prettierrc.jsonにはPrettierの設定があります。
- .eslintrc.jsonにはESLintの設定があります。
- backend/public/assetsフォルダにはフロントエンドのアセットがありますが、基本的には触りません。frontend/vite.config.tsのoutDirをbackend/public/assetsに設定しています。frontendフォルダに移動してから`npm run build`を実行するとアセットが生成されます。
- backend/config/config.php.exampleには設定ファイルのテンプレートがあります。
- CHANGELOG.mdには変更履歴があります。
- README.mdにはプロジェクトの説明があります。
- LICENSEにはライセンスがあります。
- .htaccessにはApacheの設定があります。
- .dockercompose.yamlにはDocker Composeの設定があります。
