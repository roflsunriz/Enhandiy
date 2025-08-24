# phpUploader v4.3.0-roflsunriz リリースノート

**リリース日**: 2025年8月25日  
**バージョン**: 4.3.0-roflsunriz  

---

## 🎉 概要

phpUploader v4.3.0-roflsunriz は、本番環境での動作を保証するための変更を施したリリースとダウンロードキー認証フォームを追加したリリースです。共有リンク経由でのダウンロード時、ダウンロードキーがバイパスされないよう修正しました。また、dockerからフロントエンドアセットとバックエンドアセットのエイリアスを削除しました。その他、変更に伴って発生したバグを修正しました。

---

## ** ダウンロードキー認証フォームの追加**

- 共有リンク経由でのダウンロード時、ダウンロードキーがバイパスされないよう修正しました。

## ** フロントエンドアセットをbackend/public/assets/に移動**

- フロントエンドアセットをfrontend/dist/からbackend/public/assets/に移動しました。


---

## 🐛 **既知の問題**

現在、重大な既知の問題はありません。

---

## 📞 **サポート**

- **GitHub Issues**: [https://github.com/roflsunriz/phpUploader/issues](https://github.com/roflsunriz/phpUploader/issues)
- **ドキュメント**: [docs/](docs/) フォルダ内の各種ドキュメント

---

**Full Changelog**: [v3.5.0...v4.3.0-roflsunriz](https://github.com/roflsunriz/phpUploader/compare/v3.5.0-roflsunriz...v4.3.0-roflsunriz)
