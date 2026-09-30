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

# リリース管理（Linux/Mac）
./infrastructure/scripts/release.sh x.x.x

# リリース管理（Windows）
infrastructure\scripts\release.bat x.x.x

# 自動プッシュ付きリリース
./infrastructure/scripts/release.sh x.x.x --push

# Composer 管理
./infrastructure/scripts/composer.sh install
./infrastructure/scripts/composer.sh update
```

## リリース手順

1. バージョン更新: `./infrastructure/scripts/release.sh x.x.x`
2. 変更確認: `backend/config/config.php` のバージョン番号を手動で更新
3. Git 操作: 表示される手順に従ってコミット・タグ・プッシュ
4. 自動リリース: GitHub Actions が自動でリリースを作成

重要: リリース時は `backend/config/config.php.example` テンプレートが配布され、エンドユーザーが自分で設定ファイルを作成する必要があります。
