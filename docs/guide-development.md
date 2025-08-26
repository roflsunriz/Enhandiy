# 開発・リリース手順

## 初期セットアップ

```bash
# 設定ファイルのテンプレートをコピー
cp backend/config/config.php.example backend/config/config.php

# 設定ファイルを編集（開発用の値に変更）
# master, key, session_salt などをローカル開発用の値に設定
```

注意: `backend/config/config.php` は `.gitignore` に含まれており、リポジトリにはコミットされません。

## バージョン管理

- バージョンは `backend/config/config.php` で一元管理し、UI 下部に表示されます。
- `backend/routes/router.php` に API バージョンがあるため、更新時に変更が必要です。
- `backend/services/system-api-handler.php` にもバージョンがあるため、更新時に変更が必要です。
- `docs/RELEASE_NOTES_*.md` にバージョンごとの変更点を記載しています。
- `CHANGELOG.md` と `README.md` もバージョンに合わせて適宜更新してください。

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

