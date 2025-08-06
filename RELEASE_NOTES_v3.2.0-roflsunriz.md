# 📝 phpUploader v3.2.0-roflsunriz リリースノート

**リリース日**: 2025年8月6日  
**バージョン**: v3.2.0-roflsunriz

---

## 🎯 概要

phpUploader v3.2.0-roflsunrizは、ファイル編集モーダルの重要なバグ修正を含むメンテナンスリリースです。モーダル内のタブとボタンの状態管理を改善し、ユーザーインターフェースの整合性を大幅に向上させました。

---

## 🐛 バグ修正

### **ファイル編集モーダルの状態管理修正**

**問題**: ファイル編集モーダルで以下の問題が発生していました：
- 「差し替えタブ」に切り替えてからモーダルを閉じる
- 再度ファイル編集ボタンをクリックしてモーダルを開く
- タブは「コメント編集」が選択されているのに、ボタンは「ファイル差し替え」が表示される

**修正内容**:
- `src/file-edit.ts`の以下の関数を修正：
  - `openEditDialog()` 
  - `editComment()`
  - `replaceFile()`
- `showModal()`実行後に`setTimeout(10ms)`でボタン表示切り替えを遅延実行
- モーダル初期化完了後にボタン状態を正しく設定するように改善

**影響**:
- ✅ タブとボタンの状態が常に一致するようになりました
- ✅ ファイル編集・差し替え機能の操作が正確になりました
- ✅ ユーザーエクスペリエンスが大幅に向上しました

---

## 🔧 技術的改善

### **モーダル状態管理の強化**
- モーダル表示タイミングとボタン制御の競合状態を解決
- DOM要素の初期化処理順序を最適化
- 非同期処理によるUI要素の状態同期を改善

### **開発・テスト環境の向上**
- Playwright MCPを使用したブラウザベースのデバッグ・テスト
- リアルタイムでのバグ再現と修正検証
- 包括的なテストシナリオによる品質保証

---

## 🧪 テスト・品質保証

### **検証済み項目**
- ✅ ファイル編集モーダルの各タブ切り替え
- ✅ モーダルの開閉とボタン状態の一致
- ✅ 複数回のモーダル操作における状態維持
- ✅ ESLint・TypeScriptコンパイルエラーなし
- ✅ npm run buildでのビルド成功

### **ブラウザテスト**
- Chrome/Chromium系ブラウザでの動作確認
- リアルタイムでのUI操作検証
- JavaScript console errorの解消確認

---

## 📦 インストール・アップグレード

### **新規インストール**
```bash
# GitHubからダウンロード
curl -L -o phpUploader-v3.2.0.zip https://github.com/roflsunriz/phpUploader/archive/v3.2.0-roflsunriz.zip
unzip phpUploader-v3.2.0.zip
cd phpUploader-3.2.0-roflsunriz

# 設定ファイル作成
cp config/config.php.example config/config.php
# config/config.php を編集してください
```

### **既存環境からのアップグレード**
```bash
# 1. バックアップ（重要）
cp -r /path/to/current/phpUploader /path/to/backup

# 2. ファイル更新
# 新しいファイルで既存ファイルを上書き（config/config.phpは保持）

# 3. ブラウザキャッシュクリア
# Ctrl+F5またはCmd+Shift+R

# 4. 動作確認
# ファイル編集モーダルの動作をテスト
```

**重要**: v3.2.0では設定変更は不要です。既存の設定ファイルをそのまま使用できます。

---

## 🎪 互換性

### **後方互換性**
- ✅ v3.1.0からの設定ファイル互換性
- ✅ 既存のデータベーススキーマとの互換性
- ✅ APIエンドポイントの互換性維持
- ✅ 既存アップロードファイルへの影響なし

### **前方互換性**  
- v3.2.0で作成・管理されたファイルは将来のバージョンでも利用可能です

---

## 🔗 関連情報

### **GitHub**
- **リポジトリ**: <https://github.com/roflsunriz/phpUploader>
- **リリースページ**: <https://github.com/roflsunriz/phpUploader/releases/tag/v3.2.0-roflsunriz>
- **Issues**: <https://github.com/roflsunriz/phpUploader/issues>

### **ドキュメント**
- **README**: [README.md](README.md)
- **API Documentation**: [docs/API.md](docs/API.md)
- **設定ガイド**: [config/config.php.example](config/config.php.example)

---

## 🏆 謝辞

このバグ修正にご協力いただいた皆様に感謝いたします：
- バグ報告をしてくださったユーザーの皆様
- テスト・検証にご協力いただいた開発コミュニティ
- オリジナルphpUploaderプロジェクト（shimosyan氏）

---

## 📋 Changelog

**Changed**:
- ファイル編集モーダルのタブ・ボタン状態管理を改善

**Fixed**:
- ファイル編集モーダルでタブとボタンの状態が一致しない問題を修正
- モーダル再開時のボタン表示不整合を解決
- showModal後の非同期ボタン制御による競合状態を修正

**Technical**:
- setTimeout(10ms)による遅延ボタン制御を実装
- モーダル状態管理のタイミング制御を最適化
- DOM要素初期化順序の改善

---

**Full Changelog**: <https://github.com/roflsunriz/phpUploader/compare/v3.1.0-roflsunriz...v3.2.0-roflsunriz>

**Happy File Uploading!** 🚀✨