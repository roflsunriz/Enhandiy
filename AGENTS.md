# AGENTS.md

共通ルールは `COMMON-AGENTS.md` を必ず確認し、上位方針として扱う。
このファイルでは `Enhandiy` 固有の補足だけを記載する。

## 品質確認

- TypeScript の場合は、ファイル編集後に `npm run lint`、`npm run type-check`、`npm run build` を実行して全てグリーンであることを確認する。
- それ以外のファイルの場合には、リンターがあればそれを使って静的解析を実行する。

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
