# 検証手順

## Dependabot 自動処理（2026-09-23）

`.github/workflows/dependabot-automation.yml` を actionlint で検査し、PR 用 workflow 名（CI、🔍 Pre-Release Quality Check）と一致することを確認する。Dependabot の patch／minor かつ全 PR チェック成功の場合だけ取り込み、major・古い SHA・再失敗は残す。

実際の Dependabot PR がまだない場合、動作経路は未検証として扱う。実 PR 発生後に自動化ジョブ、CI の再試行、マージ結果を確認する。

大量の Dependabot PR により CI 完了より分類が遅れる場合でも、分類後の `workflow_dispatch` が現在の PR 番号と head SHA を照合して再評価する。別の作成者、古い SHA、未完了の CI はマージしない。

[Dependabot PR #12 のチェック](https://github.com/roflsunriz/Enhandiy/pull/12/checks) では、既存 `label` が `Resource not accessible by integration`、`documentation` が README／CHANGELOG の重複空行で失敗した。ラベル処理を PR コードをチェックアウトしない `pull_request_target` に移して必要な権限を明示し、重複空行を除いた。更新した workflow は actionlint で、文書は markdownlint で検査する。
