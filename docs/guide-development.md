# 開発・リリース手順

## 初期セットアップ

```bash
# 設定ファイルのテンプレートをコピー
cp backend/config/config.php.example backend/config/config.php

# 設定ファイルを編集（開発用の値に変更）
# master, key, session_salt などをローカル開発用の値に設定
```

注意: `backend/config/config.php` は `.gitignore` に含まれており、リポジトリにはコミットされません。

## 品質検査

PHP 8.1以上、Composer、Node.js 24以上を用意します。

```bash
composer install
composer validate --no-check-publish
composer lint
composer analyse
composer test
composer audit

cd frontend
npm ci
npm run lint
npm run type-check
npm run build
npm audit
```

型検査はTS7、lintは公式TS6互換APIを併用します。peer条件を無視するオプションは不要です。依存更新・回帰テスト・復旧の詳細は [更新手順](../how-to-update.md)、実施結果と環境制約は [検証記録](../verification.md) を参照してください。

## バージョン管理

- 製品バージョンは `backend/config/config.php.example` と `frontend/package.json` を揃え、`composer test` で一致を確認します。稼働中のユーザー設定は検査で読み書きしません。Composerの任意のversionフィールドは、存在する場合だけ照合します。
- `backend/routes/router.php` に API バージョンがあるため、更新時に変更が必要です。
- `backend/services/system-api-handler.php` にもバージョンがあるため、更新時に変更が必要です。
- `CHANGELOG.md` にバージョンごとの変更点を記載しています。`README.md` もバージョンに合わせて適宜更新してください。

### バージョン確認テスト（Docker）

```bash
docker-compose --profile tools up -d php-cli
docker-compose exec php-cli php infrastructure/scripts/test-version.php
docker-compose down php-cli
```

## Docker 環境での開発

```bash
# Webサーバーの起動
docker-compose up -d web

# Composer 管理
./infrastructure/scripts/composer.sh install
./infrastructure/scripts/composer.sh update
```

## リリース手順

正式な手順は [how-to-update.md](../how-to-update.md) を参照してください。設定テンプレート・API・画面・frontendの製品版を揃え、検証とmainへの反映を終えてから新しいタグをpushします。既存タグは上書きしません。

`release.yml` はタグのcommitからZIPとTAR.GZを生成し、CHANGELOGの該当版をGitHub Releaseへ掲載します。Releaseの対象commit、正式公開状態、両配布物を確認してください。

新規導入では `backend/config/config.php.example` をコピーして設定します。更新時は稼働中の `backend/config/config.php`、認証情報、DB、保存ファイルを維持し、旧リリース補助スクリプトでユーザー設定を上書きしないでください。
