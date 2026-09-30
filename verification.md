# 検証手順

## 自動検査・依存修正（2026-09-30）

Issue #20の修正コミット `3f2c85d` を保った同じ隔離checkoutで、既存検査の失敗を修正した。既存ユーザー設定、元checkout、実データ、ブラウザ・端末の認証は変更していない。

通常コマンドで通過した検査:

- `composer validate --no-check-publish`、`composer lint`、`composer analyse`、`composer test`。PHPStanはbackendと保守スクリプトを検査し、既存の広いignoreErrorsも外している。PHPCSの名前空間・ヘッダー除外も撤去し、PHPクラスと呼び出し元を移行した。
- PHP構文60ファイル。版数一致とフォームのCSRF必須・エスケープ・モーダル表示の境界テストを追加した。版数検査はユーザー設定を作成・上書き・読取せず、管理対象の設定テンプレートとfrontendを照合する。
- 通常の `npm ci`、`npm run lint`、`npm run type-check`、`npm run build`、`npm audit`。peer依存を無視するオプションや警告抑制は使用していない。npmとComposer監査で既知脆弱性0件、互換範囲の直接依存更新も確認した。
- TS7のCLIを維持し、[Microsoftの公式手順](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6-0)でTS6 APIを併用する。[typescript-eslintの対応範囲](https://typescript-eslint.io/users/dependency-versions/)を確認し、削除済みbaseUrlの代わりに相対pathsを使用した。
- 更新したCI・Pre-Release workflowをactionlintで検査した。CIには通常のfrontend導入・lint・型検査・ビルド・監査を追加した。PHP・Docker・版数検査の失敗を成功へ置き換える処理は削除した。
- 件数回帰と既存UIのE2Eは10件通過。最初のサンドボックス内実行はBootstrap CDNの `ERR_NETWORK_ACCESS_DENIED` でモーダルが非表示にならず失敗し、通信を許可した隔離ブラウザではテスト変更なしで通過した。
- アップロード・キー付きダウンロード・個別／一括／フォルダ削除・コメント編集・差し替え・共有・フォルダ移動も含む拡張E2Eを確認した。初回は18件通過し、共有1件はlocalhost固定の期待値と検証先127.0.0.1の相違で失敗した。同じ隔離サーバーをlocalhostで指定すると共有・クリップボード・DL回数制限も通過した。製品やテストの期待値は変更していない。
- 最終の配布対象ファイルをlocalhostの隔離環境で検査し、上記の全19件が1回の実行で通過した。フロントエンドの変更は型・lint・ビルド設定に関するもので製品挙動を変えないため、ビルド検証による生成アセット差分は含めていない。

Docker daemonがPCで起動していないため、ローカルDockerビルドは未実施。修正した小文字タグ `enhandiy-test` の実ビルドはGitHub CIで確認する。最終コミットのCI終端結果は [PR #21](https://github.com/roflsunriz/Enhandiy/pull/21) 本文に記録する。

GitHub管理のAIレビューは `dynamic/agents/github-advanced-security` で実行される。初回runではレビュー要求作成時に `CAPIError: 400 The requested model is not supported` で失敗した。リポジトリ内にモデル指定のworkflowや設定はなく、資格情報・権限拡大・スキャン無効化は行っていない。通常CI／CodeQLと分けて最終runも確認し、サービス側の起動失敗が続く場合は未解決として報告する。

## 子孫を含むフォルダのファイル総数（Issue #20、2026-09-30）

以下は件数修正単独時の記録。既存検査の失敗と環境制約のうち、今回解消した項目は上の自動検査・依存修正の結果を参照する。

基準は `main` の `4a7452878485d31c79b008fd8e1b2ba3a0ee4dd9`。元のcheckoutと実データを変更せず、別checkoutの一時設定・SQLite・ローカルPHPサーバーで検証した。環境はWindows、PHP 8.4.11、Node 26.4.0、Chromium。

仕様は自身と全子孫フォルダに所属するファイルの総数。以前の直下のみという仕様は撤回された。フォルダ自体と所属先がNULLのルートファイルは数えない。初期HTML、RESTフォルダ一覧、RESTファイル一覧に含まれるフォルダ、旧フォルダ一覧、旧再読み込みAPIの5経路が同じ整数の `file_count` を返す。

`backend/core/folder-list.php` は直下件数と親IDを1クエリで取得し、葉から祖先へ件数を足す。追加集計はフォルダ数に比例する反復処理で、N+1クエリや深いPHP再帰を行わない。循環した木は不完全な総数を返さずエラーにする。既存の削除前チェックと `moved_files` は、削除操作でルートへ移す直下ファイル数を引き続き表す。

通過した検証:

- `composer validate --no-check-publish` と `composer test`（ブラウザタイトル、子孫を含む件数の2テスト）。
- 管理対象PHP 57ファイルと新規2ファイル、計59ファイルの `php -l`。
- `php vendor/bin/phpcs` に変更したPHP 7ファイルを指定。リポジトリの `phpcs.xml` の規則でエラーなし。
- PHPStan level 1でbackend全体と新規PHPテストを検査。既存設定の存在しない `tests` 除外だけを外したcheckout外の設定でエラーなし。
- `composer audit` で脆弱性の報告なし。
- `npm run build`。フロントエンドの製品コードに変更がないため、再生成アセットは差分から除外した。
- 新規ブラウザテストをTypeScript 7で個別にstrict検査。既存ソースは元checkoutのTypeScript 5.8.3でも型検査を通過した。
- `npm run test:e2e -- folder-file-counts.spec.ts ui-modernization.spec.ts` で10テスト通過。件数回帰1件と既存UI品質9件を含む。
- 旧直下仕様の集計では子フォルダへファイルを追加した際、祖先の期待値2件に対して1件が返り、回帰テストが失敗することを確認した。集計を復元すると10テストすべてが通過した。
- README、CHANGELOG、更新手順と本検証記録のmarkdownlint。

件数回帰ではファイルのない子孫ツリー、3階層への追加、異なる枝と共通祖先内のファイル移動、子孫ツリー自体の移動、深い位置のファイル削除、再読み込み、手動更新、グリッドとリスト、子フォルダ表示、全5取得経路を確認する。APIのページサイズが1でも件数が切り詰められないことを確認する。PHPテストでは5000階層、1クエリでの取得、循環検出、親が欠落したフォルダ、空のDB、ルートファイルの除外、フォルダ削除とファイル移動、既存フィールドの保持も確認する。5000階層は集計ヘルパーの検証であり、既存ツリーAPIのJSON出力やブラウザで5000階層を開いた検証ではない。

既存main側の失敗・環境制約:

- 通常の `npm ci` はTypeScript 7.0.2とtypescript-eslint 8.70.1のpeer依存条件（TypeScript 6.1未満）が一致せず失敗。検証用依存の導入は `npm ci --legacy-peer-deps --no-audit --no-fund` を使用し、lockfileは変更していない。
- 通常の `npm run lint` はTypeScript 7とtypescript-eslintの互換性問題で失敗。通常の `npm run type-check` は既存tsconfigの削除済み `baseUrl` と非相対 `paths` 設定で失敗する。これらの設定・依存関係は本修正で変更していない。
- 通常のPHPStanは存在しない `tests` 除外で停止する。代替検査の通過を通常コマンドの通過とは扱わない。
- CIの生のPSR12指定では、既存3クラスにnamespaceがないため違反が出る。リポジトリのPHPCS設定はこのレガシー違反を除外している。
- 既存 `test-version.php` はcomposer.jsonにversionがないため失敗する。今回はリリース操作を行わず、製品バージョンも変更していない。
- API文書全体とAGENTS.mdのmarkdownlintには既存の表・空行・番号付きリストの違反がある。CI指定のREADMEとCHANGELOGは通過する。
- 当時のPCではDocker daemonを利用できず、Dockerビルドは未実施。PHP 8.1〜8.3の件数回帰は初回GitHub CIで通過した。Apache、Firefox、Android実機での動作は未検証。

新規E2Eは専用テスト環境で実行し、`PLAYWRIGHT_BASE_URL` とその環境用の `PW_MASTER_KEY` を設定する。実環境のデータ・認証は使わない。BootstrapのCDNを利用できるネットワークが必要。テスト用ブラウザ内のfetchで初期HTMLを取得し、User-Agent差によるセッション再生成を避ける。モーダル遷移も待ってから次の操作へ進む。

## Dependabot 自動処理（2026-09-23）

`.github/workflows/dependabot-automation.yml` を actionlint で検査し、PR 用 workflow 名（CI、🔍 Pre-Release Quality Check）と一致することを確認する。Dependabot の patch／minor かつ全 PR チェック成功の場合だけ取り込み、major・古い SHA・再失敗は残す。

実際の Dependabot PR がまだない場合、動作経路は未検証として扱う。実 PR 発生後に自動化ジョブ、CI の再試行、マージ結果を確認する。

大量の Dependabot PR により CI 完了より分類が遅れる場合でも、分類後の `workflow_dispatch` が現在の PR 番号と head SHA を照合して再評価する。別の作成者、古い SHA、未完了の CI はマージしない。

[Dependabot PR #12 のチェック](https://github.com/roflsunriz/Enhandiy/pull/12/checks) では、既存 `label` が `Resource not accessible by integration`、`documentation` が README／CHANGELOG の重複空行で失敗した。ラベル処理を PR コードをチェックアウトしない `pull_request_target` に移して必要な権限を明示し、重複空行を除いた。更新した workflow は actionlint で、文書は markdownlint で検査する。
