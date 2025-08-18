# 🚀 GitHub Actions 自動化ガイド

このプロジェクトでは、リリースプロセスを自動化するためのGitHub Actionsワークフローを提供しています。

## 📋 利用可能なワークフロー

### 1. 🔍 Pre-Release Quality Check (`pre-release-check.yml`)

**目的**: リリース前の品質チェックを自動実行

**トリガー**:
- `feature/todo-improvements-backup` ブランチへのプッシュ
- `release/*` ブランチへのプッシュ  
- `main/master` ブランチへのプルリクエスト
- 手動実行（任意のブランチ）

**実行内容**:
- 🐘 PHP構文チェック
- 📋 設定ファイル検証
- 🗄️ データベーススキーマチェック
- 🌐 API エンドポイントチェック
- 🎨 フロントエンドアセットチェック
- 📚 ドキュメント確認
- 🔒 基本的なセキュリティチェック

**使用方法**:
```bash
# 手動実行
GitHub Actions タブ → "Pre-Release Quality Check" → "Run workflow"
```

### 2. 🏷️ Tag and Release (`tag-and-release.yml`)

**目的**: バージョンタグの作成とリリースプロセスの開始

**トリガー**: 手動実行のみ

**実行内容**:
- バージョン形式の検証
- Gitタグの作成とプッシュ
- リリースワークフローの自動トリガー

**使用方法**:
```bash
# 手動実行
GitHub Actions タブ → "Tag and Release" → "Run workflow"
# 入力項目:
# - Version: 2.0.0-roflsunriz
# - Branch: feature/todo-improvements-backup
# - Pre-release: false (通常リリースの場合)
```

### 3. 🚀 Automated Release (`release.yml`)

**目的**: 完全自動化されたリリース作成

**トリガー**:
- `v*.*.*-roflsunriz` パターンのタグプッシュ
- 手動実行（任意のタグ）

**実行内容**:
- リリースノートの自動生成
- ソースコードアーカイブの作成（ZIP/TAR.GZ）
- GitHub リリースの作成
- アセットのアップロード
- リリース完了通知

**生成されるアセット**:
- `phpUploader-v2.0.0-roflsunriz-source.zip`
- `phpUploader-v2.0.0-roflsunriz-source.tar.gz`

## 🔄 推奨リリースフロー

### ステップ 1: 品質チェック
```bash
1. GitHub Actions タブに移動
2. "Pre-Release Quality Check" を選択
3. "Run workflow" をクリック
4. Branch: feature/todo-improvements-backup を選択
5. 実行して全チェックが✅になることを確認
```

### ステップ 2: リリース作成
```bash
1. GitHub Actions タブに移動
2. "Tag and Release" を選択
3. "Run workflow" をクリック
4. 以下を入力:
   - Version: 2.0.0-roflsunriz
   - Branch: feature/todo-improvements-backup
   - Pre-release: false
5. 実行してタグが作成されることを確認
```

### ステップ 3: 自動リリース完了
```bash
1. タグ作成後、"Automated Release" が自動実行される
2. 完了後、GitHub Releases ページでリリースを確認
3. ダウンロード可能なアセットが添付されていることを確認
```

## 🛠️ カスタマイズ

### バージョン形式の変更
現在の形式: `X.Y.Z-roflsunriz`

異なる形式を使用したい場合は、以下のファイルを編集:
- `.github/workflows/release.yml` の `tags` パターン
- `.github/workflows/tag-and-release.yml` の バージョン検証正規表現

### リリースノートのカスタマイズ
リリースノートは以下の順序で検索されます:
1. `RELEASE_NOTES_v{version}.md`
2. `RELEASE_NOTES_{tag}.md`
3. `CHANGELOG.md`
4. デフォルトテンプレート

### アセットの追加
`release.yml` の "Build release assets" ステップを編集して、追加のファイルやアーカイブを作成できます。

## 🔒 権限設定

ワークフローが正常に動作するために、以下の権限が必要です:

```yaml
permissions:
  contents: write      # リリース作成とタグプッシュ
  pull-requests: write # PR関連の操作（必要に応じて）
```

## コンソールからのタグ作成&リリースとタグの削除方法

```bash
# タグ作成
git tag -a v4.0.4-roflsunriz -m "Release v4.0.4-roflsunriz"
git push origin v4.0.4-roflsunriz

# リリース作成

# タグ削除
git tag -d v4.0.4-roflsunriz
git push origin :refs/tags/v4.0.4-roflsunriz
```

## 🐛 トラブルシューティング

### よくある問題

**1. タグが既に存在する**
```
❌ Tag v2.0.0-roflsunriz already exists
```
**解決**: 異なるバージョン番号を使用するか、既存のタグを削除

**2. バージョン形式エラー**
```
❌ Invalid version format: 2.0.0
```
**解決**: `-roflsunriz` サフィックスを追加 (例: `2.0.0-roflsunriz`)

**3. リリースノートが見つからない**
```
⚠️ Expected release notes file not found
```
**解決**: 適切な名前のリリースノートファイルを作成

### デバッグ方法

1. **Actions タブで実行ログを確認**
2. **各ステップの詳細ログを展開**
3. **Summary セクションで概要を確認**
4. **失敗したステップを特定して修正**

## 📚 参考資料

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github)

## 🤝 貢献

ワークフローの改善提案や不具合報告は、GitHubのIssuesまでお願いします。

---

**作成者**: @roflsunriz  
**最終更新**: 2025/08/02