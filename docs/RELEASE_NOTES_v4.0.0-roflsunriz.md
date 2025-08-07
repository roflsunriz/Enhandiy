# phpUploader v4.0.0-roflsunriz リリースノート

**リリース日**: 2025年8月7日  
**バージョン**: 4.0.0-roflsunriz  

---

## 🎉 概要

phpUploader v4.0.0-roflsunriz は、これまでの機能強化を土台に**大規模なフォルダー構造の整理**を行ったメジャーリリースです。より保守性が高く、理解しやすいコードベースを実現しました。

---

## 🚨 **BREAKING CHANGES**

### **フォルダー構造の整理**
- **backend/**: サーバーサイドロジック全体を整理
- **frontend/**: クライアントサイドコード（TypeScript/JavaScript）を集約
- **docs/**: ドキュメント類を統一
- **infrastructure/**: Docker設定とスクリプト類を集約

### **APIの呼び出し箇所変更**
フォルダー構造整理により、以下のURLが変更されました：

**旧 (v3.x)**:
- `/api/*.php` → 各APIファイルへの直接アクセス

**新 (v4.0)**:
- `/backend/api/*.php` → 統一されたAPI構造

**注意**: フロントエンドから呼び出すAPIエンドポイントは変更ありませんが、直接APIファイルにアクセスしていたカスタム実装は更新が必要です。

---

## ✨ **改善点**

### **🏗️ コードベースの整理**
- **明確な責任分離**: backend（サーバー）とfrontend（クライアント）の明確な分離
- **保守性向上**: 関連ファイルのグループ化により、メンテナンスが容易に
- **開発効率向上**: 新機能の追加や既存機能の修正が効率的に

### **📁 フォルダ構造詳細**

```
phpUploader/
├── backend/                    # サーバーサイドロジック
│   ├── api/                   # REST APIエンドポイント
│   ├── config/                # 設定ファイル
│   ├── core/                  # コアライブラリ
│   ├── models/                # データベースモデル
│   ├── public/                # 公開エンドポイント
│   ├── routes/                # ルーティング
│   ├── scripts/               # ユーティリティスクリプト
│   ├── services/              # ビジネスロジック
│   └── views/                 # テンプレート
├── frontend/                  # クライアントサイドコード
│   ├── src/                   # TypeScriptソース
│   ├── dist/                  # コンパイル済みJavaScript
│   └── assets/                # スタイルシート
├── docs/                      # ドキュメント
│   ├── API.md                 # API仕様書
│   ├── RELEASE_NOTES_*.md     # リリースノート
│   └── GITHUB_ACTIONS_GUIDE.md
├── infrastructure/            # インフラ設定
│   ├── docker/                # Docker設定
│   └── scripts/               # デプロイメントスクリプト
├── data/                      # アップロードファイル保存
├── db/                        # SQLiteデータベース
├── storage/                   # ログファイル
└── vendor/                    # Composer依存関係
```

### **🔧 設定とスクリプトの改善**
- **統一された設定管理**: `backend/config/`に設定を集約
- **改善されたスクリプト**: `infrastructure/scripts/`にデプロイメントツールを整理
- **Docker環境の改善**: より効率的なコンテナ構成

---

## 🔄 **マイグレーション手順**

### **新規インストール**
通常のインストール手順に従ってください。フォルダ構造は自動的に新しい形式で作成されます。

### **v3.x からのアップグレード**

1. **バックアップの作成**:
   ```bash
   cp -r /path/to/phpUploader /path/to/phpUploader_v3_backup
   ```

2. **新バージョンの展開**:
   - 新しいファイルで既存のインストールを置き換え
   - `backend/config/config.php`を既存の設定で更新

3. **設定ファイルの確認**:
   ```bash
   # 設定テンプレートをコピー
   cp backend/config/config.php.example backend/config/config.php
   # 既存の設定値を新しいconfig.phpに移行
   ```

4. **権限の設定**:
   ```bash
   # 適切な権限を設定
   chmod -R 755 backend/
   chmod -R 755 frontend/
   chmod -R 700 backend/config/
   chmod -R 700 db/
   chmod -R 700 storage/
   ```

5. **動作確認**:
   - ブラウザでアクセスして正常に動作することを確認
   - APIエンドポイントの動作確認

---

## 🧪 **テスト済み機能**

### **継続動作確認済み**
- ✅ ファイルアップロード（通常・再開可能）
- ✅ フォルダ管理
- ✅ ファイル一覧表示・検索・ソート
- ✅ ファイル削除・一括削除
- ✅ ファイル編集・差し替え
- ✅ 共有リンク生成
- ✅ パスワード強度チェック
- ✅ RESTful API
- ✅ 認証システム
- ✅ レート制限

### **新機能**
- ✅ 改善されたフォルダ構造
- ✅ 統一されたコードベース
- ✅ 効率的な開発環境

---

## ⚠️ **注意事項**

### **カスタム実装をお使いの場合**
- 直接APIファイルにアクセスするカスタム実装は、新しいパス構造に合わせて更新が必要です
- 推奨：公式のAPIエンドポイント（`/api/router.php`経由）を使用

### **Apache/Nginx設定**
- ドキュメントルートの設定を確認してください
- `.htaccess`ファイルが適切に配置されていることを確認

---

## 🔒 **セキュリティ**

v3.x系のセキュリティ機能をすべて継承：
- AES-GCM暗号化
- パスワード強度チェック
- CSRF保護
- レート制限
- 入力値検証

---

## 🐛 **既知の問題**

現在、重大な既知の問題はありません。

---

## 🙏 **謝辞**

フォルダ構造の整理により、今後の機能追加やメンテナンスがより効率的に行えるようになりました。コミュニティの皆様からのフィードバックに感謝いたします。

---

## 📞 **サポート**

- **GitHub Issues**: [https://github.com/roflsunriz/phpUploader/issues](https://github.com/roflsunriz/phpUploader/issues)
- **ドキュメント**: [docs/](docs/) フォルダ内の各種ドキュメント

---

**Full Changelog**: [v3.5.0...v4.0.0-roflsunriz](https://github.com/roflsunriz/phpUploader/compare/v3.5.0-roflsunriz...v4.0.0-roflsunriz)
