# 検証手順

## フォルダ直下の件数（Issue #20、2026-09-30）

基準は `main` の `4a7452878485d31c79b008fd8e1b2ba3a0ee4dd9`。元のcheckoutと実データを変更せず、別checkoutの一時設定・SQLite・ローカルPHPサーバーで検証した。環境はWindows、PHP 8.4.11、Node 26.4.0、Chromium。

`backend/core/folder-list.php` の集計は直下ファイルだけを数える。初期HTML、RESTフォルダ一覧、RESTファイル一覧に含まれるフォルダ、旧フォルダ一覧、旧再読み込みAPIの5経路が同じ整数の `file_count` を返す。

通過した検証:

- `composer validate --no-check-publish` と `composer test`（ブラウザタイトル、直下件数の2テスト）。
- 管理対象PHP 57ファイルと新規2ファイル、計59ファイルの `php -l`。
- `php vendor/bin/phpcs` に変更したPHP 7ファイルを指定。リポジトリの `phpcs.xml` の規則でエラーなし。
- PHPStan level 1でbackend全体と新規PHPテストを検査。既存設定の存在しない `tests` 除外だけを外したcheckout外の設定でエラーなし。
- `composer audit` で脆弱性の報告なし。
- `npm run build`。フロントエンドの製品コードに変更がないため、再生成アセットは差分から除外した。
- 新規ブラウザテストをTypeScript 7で個別にstrict検査。既存ソースは元checkoutのTypeScript 5.8.3でも型検査を通過した。
- `npm run test:e2e -- folder-file-counts.spec.ts ui-modernization.spec.ts` で10テスト通過。件数回帰1件と既存UI品質9件を含む。
- 回帰テストは修正前の5つの呼び出し元に戻すと `file_count` が欠落して失敗し、修正を復元すると通過した。
- README、CHANGELOG、更新手順と本検証記録のmarkdownlint。

件数回帰では空フォルダ、直下への追加、子フォルダへの追加、移動、削除、再読み込み、グリッドとリスト、子フォルダ表示、全5取得経路を確認する。APIのページサイズが1でも件数が切り詰められないことを確認する。PHPテストではルート直下ファイルの除外、複数ファイル、フォルダ移動、既存フィールドの保持も確認する。

既存main側の失敗・環境制約:

- 通常の `npm ci` はTypeScript 7.0.2とtypescript-eslint 8.70.1のpeer依存条件（TypeScript 6.1未満）が一致せず失敗。検証用依存の導入は `npm ci --legacy-peer-deps --no-audit --no-fund` を使用し、lockfileは変更していない。
- 通常の `npm run lint` はTypeScript 7とtypescript-eslintの互換性問題で失敗。通常の `npm run type-check` は既存tsconfigの削除済み `baseUrl` と非相対 `paths` 設定で失敗する。これらの設定・依存関係は本修正で変更していない。
- 通常のPHPStanは存在しない `tests` 除外で停止する。代替検査の通過を通常コマンドの通過とは扱わない。
- CIの生のPSR12指定では、既存3クラスにnamespaceがないため違反が出る。リポジトリのPHPCS設定はこのレガシー違反を除外している。
- 既存 `test-version.php` はcomposer.jsonにversionがないため失敗する。今回はリリース操作を行わず、製品バージョンも変更していない。
- API文書全体とAGENTS.mdのmarkdownlintには既存の表・空行・番号付きリストの違反がある。CI指定のREADMEとCHANGELOGは通過する。
- Docker daemonを利用できず、Dockerビルドは未実施。PHP 8.1〜8.3、Apache、Firefox、Android実機での動作は未検証。

新規E2Eは専用テスト環境で実行し、`PLAYWRIGHT_BASE_URL` とその環境用の `PW_MASTER_KEY` を設定する。実環境のデータ・認証は使わない。BootstrapのCDNを利用できるネットワークが必要。テスト用ブラウザ内のfetchで初期HTMLを取得し、User-Agent差によるセッション再生成を避ける。モーダル遷移も待ってから次の操作へ進む。

## Dependabot 自動処理（2026-09-23）

`.github/workflows/dependabot-automation.yml` を actionlint で検査し、PR 用 workflow 名（CI、🔍 Pre-Release Quality Check）と一致することを確認する。Dependabot の patch／minor かつ全 PR チェック成功の場合だけ取り込み、major・古い SHA・再失敗は残す。

実際の Dependabot PR がまだない場合、動作経路は未検証として扱う。実 PR 発生後に自動化ジョブ、CI の再試行、マージ結果を確認する。

大量の Dependabot PR により CI 完了より分類が遅れる場合でも、分類後の `workflow_dispatch` が現在の PR 番号と head SHA を照合して再評価する。別の作成者、古い SHA、未完了の CI はマージしない。

[Dependabot PR #12 のチェック](https://github.com/roflsunriz/Enhandiy/pull/12/checks) では、既存 `label` が `Resource not accessible by integration`、`documentation` が README／CHANGELOG の重複空行で失敗した。ラベル処理を PR コードをチェックアウトしない `pull_request_target` に移して必要な権限を明示し、重複空行を除いた。更新した workflow は actionlint で、文書は markdownlint で検査する。
