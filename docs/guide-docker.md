# Docker クイックスタート

## Java GUIで操作する（Windows推奨）

1. Docker Desktopを起動します。
2. Java JDK 11以上をインストールします。
3. `scripts/docker-manager.cmd` をダブルクリックします。
4. GUIの「Dockerを起動」「Dockerを終了」「ブラウザで開く」を使用します。

GUIは `infrastructure/docker-compose.yaml` のWeb公開ポートを読み取り、表示先URLを自動決定します。実行ログとコンテナ状態も画面内で確認できます。

## コマンドで操作する

ターミナルから操作する場合は次の手順を使用します。

```bash
# 1. コミュニティフォーク版リポジトリをクローン（推奨）
git clone https://github.com/roflsunriz/Enhandiy.git
cd Enhandiy

# または、オリジナル版
# git clone https://github.com/shimosyan/phpUploader.git
# cd phpUploader

# 2. 設定ファイルを作成
cp backend/config/config.php.example backend/config/config.php

# 3. 設定ファイルを編集（master, key, session_salt を変更）
# エディタで backend/config/config.php を開いて編集

# 4. Docker でサーバー起動
docker compose -f infrastructure/docker-compose.yaml up -d web

# 5. docker-compose.yamlの公開ポートをブラウザで開く
# 例: 80:80なら http://localhost、37555:80なら http://localhost:37555

# 終了するとき
docker compose -f infrastructure/docker-compose.yaml down

# 再ビルドしたいとき
docker compose -f infrastructure/docker-compose.yaml build --no-cache web
```

開発向け Docker の利用例やリリース手順は `docs/guide-development.md` を参照してください。

