# This AGENTS.md is the document to agents to follow.

## Global Instructions
- 常に日本語で応答してください。
- Typescriptの場合は、ファイル編集後に`npm run lint`、`npm run type-check`、`npm run build`を実行して全てグリーンであることを確認してください。グリーンでない場合は修正してグリーンになるまで繰り返します。
- それ以外のファイルの場合にはリンターがあればそれを使って静的解析を実行します。リンターにエラーがあれば修正します。

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
- .gitignoreにはGitの無視するファイルがあります。
- .prettierrc.jsonにはPrettierの設定があります。
- .eslintrc.jsonにはESLintの設定があります。
- backend/public/assetsフォルダにはフロントエンドのアセットがありますが、基本的には触りません。frontend/vite.config.tsのoutDirをbackend/public/assetsに設定しています。frontendフォルダに移動してから`npm run build`を実行するとアセットが生成されます。
- backend/config/config.php.exampleには設定ファイルのテンプレートがあります。
- CHANGELOG.mdには変更履歴があります。
- README.mdにはプロジェクトの説明があります。
- LICENSEにはライセンスがあります。
- .htaccessにはApacheの設定があります。
- .dockercompose.yamlにはDocker Composeの設定があります。