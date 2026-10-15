# findings.md

このリポジトリ固有の実現手段と調査知見の正本です。作業前に全文を読み、行動規範は [AGENTS.md](AGENTS.md) と [COMMON-AGENTS.md](COMMON-AGENTS.md) に従ってください。移動元の本文は以下に保持しています。

## 共通方針の適用と具体的な例外

| 項目 | このリポジトリでの扱い |
| --- | --- |
| 対象の共通ルール | 設計と実装方針のBun原則・検証 |
| 理由と適用範囲 | 既存PHP backendとVite frontendに合わせ、Composerとnpmのスクリプト、package-lockを使う。対象はこの既存構成の依存解決とCI。Bunへの形式的な置換で検証経路を変えない。 |
| 同等の品質を保つ手段・検証 | Composerのlint・analyse・test・audit、frontendのnpm lint・type-check・build・auditと隔離UI回帰を使う。TS7 CLIとlint APIの別名構成も維持する。根拠: `composer.json`、`frontend/package.json`、`.github/workflows/ci.yml`、[更新手順](how-to-update.md)。 |

## 文書の役割と適用範囲

- 共通ルールの対象は「ローカル AGENTS.md との関係」「設計と実装方針」「検証」「ドキュメント」。この文書は本リポジトリの構成と既存運用に適用し、共通の行動規範を弱めません。
- ファイル配置・ツール・環境をここに集約する理由は、作業規範と実装上の事実を分け、次の作業者が根拠を確認できるようにするためです。下記の既存手段は同じ対象の設定・CI・検証記録と照合して使います。
- README は利用開始・操作、更新手順は更新と復旧、verification.md は検証手順と実測証跡、専門の設計・研究文書は詳細な根拠を担います。これらの用途は維持し、この文書から参照します。
- 更新・検証の代替は一律のBunコマンドに固定せず、下記の採用技術と既存CIに対応する検査を使います。実行不能や未検証の条件は成功扱いせず verification.md に残します。

<a id="agents-1"></a>

## 品質確認

- TypeScript の場合は、ファイル編集後に `npm run lint`、`npm run type-check`、`npm run build` を実行して全てグリーンであることを確認する。
- それ以外のファイルの場合には、リンターがあればそれを使って静的解析を実行する。

移動元: `AGENTS.md`。

<a id="agents-2"></a>

## Dependabot / GitHub CLI の運用知見

- `gh` は既定で `upstream`（shimosyan/phpUploader）を向くことがある。対象は `roflsunriz/Enhandiy` のため、`-R roflsunriz/Enhandiy` または `$env:GH_REPO="roflsunriz/Enhandiy"` を明示する。`gh pr list` だけでは対象外リポジトリを参照して空に見える。
- Dependabot の Open PR は `gh pr list -R roflsunriz/Enhandiy --state open` で確認する。リモート追跡ブランチ（`origin/dependabot/*`）の残存は `git fetch --prune` 後に再確認する。
- PR ブランチの最新化は `gh api repos/{owner}/{repo}/pulls/<番号>/update-branch -X PUT`（`GH_REPO` 指定）で行う。競合時は 422 になるため、ローカルで対象ブランチへ `origin/main` をマージして解消し、元の Dependabot ブランチへ push する。
- composer 系の競合（phpstan と phpcs の同時更新など）は `composer.json` を両方の新バージョンに手編集し、`php composer.phar update <pkg1> <pkg2>` で `composer.lock` を再生成する。`content-hash` の手編集はしない。
- `actions/labeler` v7 は v5 以降の設定形式が必須である。旧形式（ラベル直下に glob 配列）では `found unexpected type for label ... (should be array of config options)` で失敗する。形式は `changed-files` → `any-glob-to-any-file`（`.github/labeler.yml` 参照）。`pull_request_target` 実行は base ブランチの設定を使うため、labeler 本体の更新と設定移行は main 側へ先に反映してから各 PR を update-branch する。
- 一時取得の `composer.phar` / `composer-setup.php` はリポジトリへ残さず削除する。
- 2026-10-11時点、Dependabot自動修復のGitHub Actions botコミットでは、PR側CIが `action_required` となり実行承認を要した。承認後のCIは `npm audit` で `source-map-js` 1.2.1 の脆弱性を検出した。`npm install --package-lock-only` は監査修正を行わないため、失敗ログを確認し、PR側のlockfileへ `npm audit fix --package-lock-only --ignore-scripts` を適用して再検証する。手順は `how-to-update.md` を参照する。
- 2026-10-11時点、`setup-php` v2.35.2 は GitHub Actions で Node.js 20 非推奨警告を出す。公式 2.40.0 は `action.yml` が `node24` を指定し Ubuntu 26.04 に対応する。CIと公開前検査の参照は同じ固定 SHA に揃える（`.github/workflows/ci.yml`、`pre-release-check.yml`）。

移動元: `AGENTS.md`。

<a id="agents-3"></a>

## フォルダ件数の取得経路

- 一覧の `file_count` は自身と全子孫フォルダのファイル総数を数える整数。フォルダ自体と、所属先がNULLのルートファイルは含めない。共通集計は `backend/core/folder-list.php` の `fetchFoldersWithFileCounts()`。直下のみという旧方針は撤回されている。
- 直下件数と親IDを1クエリで取得し、葉から祖先へ反復処理で加算する。追加のDBクエリやPHPの再帰なしで、集計処理はフォルダ数に比例する。5000階層と循環検出はPHP回帰テストで確認する。
- 削除前チェックの `file_count` と削除結果の `moved_files` は、その削除操作でルートへ移す直下ファイル数。子フォルダは別に移動するため、一覧の総数と混同して削除処理へ流用しない。
- 初期表示（`backend/models/index.php`）、RESTのファイル一覧・フォルダ一覧、旧 `backend/api/folders.php` と `refresh-files.php` の5経路を同じ集計へ接続する。表示だけ直すとSPAの一覧更新で0件へ戻るため、全経路を検証する。
- 回帰テストは `composer test` と `frontend/tests-e2e/folder-file-counts.spec.ts`。ブラウザテストの初期HTML取得もページ内のfetchを使い、別User-Agentのリクエストによるテスト用セッションの再生成を避ける。

移動元: `AGENTS.md`。

<a id="agents-4"></a>

## Environment

- コメント編集・差し替えは `frontend/src/features/file-edit.ts` の共通初期化で両タブのID・表示名・コメントを同じ対象へ揃える。差し替え入口にも現在のコメントを渡し、モーダルの `hidden.bs.modal` でID・認証入力・選択ファイルを消去する。片方のIDだけを設定すると、初回のID欠落だけでなく別ファイルへの誤更新になる。
- RESTのCSRF検証はファイル編集の認証ではない。コメント更新では `ApiAuth::isUiAuthenticated()` でUI経路を識別し、マスターキーまたはファイルの差し替えキーを照合する。write権限付きAPIキーの契約は維持し、管理者限定時はUIの正しいマスターキー／APIのadmin権限を要求する。
- `frontend` の `npm run test:isolated` は設定ファイルを読み込まず、一時DB・架空のキー・独立したChromeプロファイルだけでREST／互換フォーム／実UIを検証する。ブラウザ操作は `shown.bs.modal` 完了を待つ。WindowsのPHPランチャーを終了して子サーバーが残らないよう、テストは `PHP_BINARY` が示す実バイナリを起動する。詳細は `verification.md`。
- 隔離テストの起動待ちは`tests-isolated/process-readiness.mjs`を使い、PHPの正常HTTP応答とChromeのpage targetを独立に待つ。6秒の固定待ちやChromeのstderr破棄へ戻さない。spawn直後にerror/closeを監視し、終了済みプロセスのclose待ちを後から登録しない。`npm run test:process-readiness`が遅延・早期終了・実行ファイル欠落・診断保全を検証する。

- PHPの製品クラスは `Enhandiy` 名前空間を使う。呼び出し元は `use Enhandiy\...`、初期化関数は `use function Enhandiy\initializeApp` を指定する。`class_exists` には `::class` を渡し、画面モデルの動的解決にも名前空間を付ける。既存ユーザー設定のグローバル `config` クラスは維持する。
- `composer lint` は名前空間とヘッダー順序を除外しないPSR12検査、`composer analyse` はbackendと保守スクリプトを検査する。ユーザー所有の `config.php` は読み込まず、型は管理対象テンプレートを参照する。`extract` で供給される設定値は、静的解析が追えるよう設定配列から明示的に参照する。
- TS7のCLIは `@typescript/native` 別名、typescript-eslint用APIは公式 `@typescript/typescript6` の `typescript` 別名で併用する。`tsc` をTS6へ差し替えたり、peer条件・警告を無視して導入しない。根拠と更新手順は `verification.md`、`how-to-update.md` を参照する。
- GitHub Advanced SecurityのAIレビューはGitHub管理の動的workflowであり、リポジトリ内にモデル設定がない。`unsupported model` はコードの集計エラーと区別し、対象runの失敗ログを確認する。権限追加やスキャン無効化を修正として扱わない。
- 正式公開は `how-to-update.md` に従い、ユーザー所有の設定を変更せずテンプレート・API・画面・frontendの版数を揃える。旧 `release.php`／ラッパーは稼働設定を書き換えるため公開作業では使用しない。タグpushを起点に `release.yml` がタグcommitのソースZIP／TAR.GZと該当版CHANGELOGを公開する。既存タグは上書きしない。

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

移動元: `AGENTS.md`。

<a id="readme-1"></a>

## 依存更新の自動処理

開発時の依存導入・lint・型検査・ビルド・監査は [開発手順](docs/guide-development.md#品質検査) と [更新手順](how-to-update.md#自動検査と依存関係の更新) を参照してください。CIでは検査の失敗が結果へ反映されます。

Dependabot は対象の依存関係を毎週確認します。patch／minor 更新は PR のチェック（CI、🔍 Pre-Release Quality Check）が成功した後に自動で squash merge されます。CI の失敗ジョブは 1 回だけ再実行します。再失敗した PR は残して手動で修正します。major 更新は手動で確認します。

移動元: `README.md`。

## 根拠と検証記録

- [README.md](README.md): 利用者向けの導入と操作。
- [verification.md](verification.md): 検証手順、実測結果、未確認事項。
- [how-to-update.md](how-to-update.md): 更新・復旧の実手順。
