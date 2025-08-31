# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.3.8] - 2025-08-31

### Features

- グリッド表示のUI調整

## [4.3.7] - 2025-08-28

### Fixed

- フォルダのルートに戻ったとき?folder=が残らないようにした
- リポジトリ名をphpUploaderからEnhandiyに変更した
- バージョニングをX.Y.Zに変更した

## [4.3.6] - 2025-08-28

### Fixed

- 本番環境において #shareUrlTextField に共有URL（またはコメント+URL）が正しく表示されるようにする（最小変更）。
- APIは正しく share_url と share_url_with_comment を返している。
- 本番は backend/public/assets/share.js を読み込んでいる（backend/views/footer.php 参照）。
- その share.js は #shareUrlInput / #shareUrlWithCommentInput を前提に #shareUrlTextField を更新する。
- 最小修正として、共有モーダルのHTMLに #shareUrlInput と #shareUrlWithCommentInput の隠しフィールドを追加する。
- これにより、本番JSが想定通りに値を受け取り、#shareUrlTextField に反映される。
