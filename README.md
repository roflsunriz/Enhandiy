# Enhandiy

## 概要

Enhandiy は、モダン UI・再開可能アップロード・フォルダ管理・強力なセキュリティ・REST API・コメント編集・ファイル差し替え・ダウンロードキー認証フォームを備えた多機能なファイルアップローダーです。

![cover](./image/cover.png)

> 注意: `/api/*` を利用するには Web サーバーで `/api/index.php?path=/api/*` へのリライト設定が必要です。詳細は [API.md](docs/API.md) の「付録: ルーティング設定例（Apache / Nginx）」を参照してください。

## ドキュメント

- **ギャラリー(見た目を確認したい方はこちら)**: [gallery.md](docs/gallery.md)
- **概要・主要機能**: [guide-overview.md](docs/guide-overview.md)
- **インストールと要件**: [guide-installation.md](docs/guide-installation.md)
- **設定ガイド**: [guide-configuration.md](docs/guide-configuration.md)
- **Docker GUI**: Windowsでは `scripts/docker-manager.cmd` をダブルクリックすると、Dockerの起動・終了・ブラウザ表示をGUIで操作できます。
- **データベースとマイグレーション**: [guide-database-and-migration.md](docs/guide-database-and-migration.md)
- **重要な変更点（バージョン別）**: [guide-important-changes.md](docs/guide-important-changes.md)
- **Docker クイックスタート**: [guide-docker.md](docs/guide-docker.md)
- **セキュリティノート**: [guide-security.md](docs/guide-security.md)
- **開発・リリース手順**: [guide-development.md](docs/guide-development.md)
- **REST API リファレンス**: [API.md](docs/API.md)

## 関連

- **リリース**: [リリースページ](https://github.com/roflsunriz/Enhandiy/releases)
- **CHANGELOG**: [CHANGELOG.md](CHANGELOG.md)
- **リリースノート**: [GitHub Releases](https://github.com/roflsunriz/Enhandiy/releases) にCHANGELOGの該当版を掲載

## License

### コミュニティフォーク版
Copyright (c) 2026 roflsunriz  
Released under the MIT license  
<https://github.com/roflsunriz/Enhandiy/blob/main/LICENSE>

### オリジナル版
Copyright (c) 2026 shimosyan  
Released under the MIT license  
<https://github.com/shimosyan/phpUploader/blob/master/MIT-LICENSE.txt>

---

## 謝辞

このコミュニティフォーク版は、shimosyan氏によるオリジナルのphpUploaderを拡張したものです。

**フォーク管理者**: @roflsunriz  
**オリジナルプロジェクト**: shimosyan/phpUploader

**Full Changelog**: [CHANGELOG.md](CHANGELOG.md)

Enhandiyをご利用いただき、ありがとうございます。

## 依存更新の自動処理

この内容は [findings.md](findings.md#readme-1) にまとめています。

## 開発時の参照先

プロジェクト固有の構成・環境・調査知見は [findings.md](findings.md)、作業規範は [AGENTS.md](AGENTS.md)、検証記録は [verification.md](verification.md) を参照してください。
