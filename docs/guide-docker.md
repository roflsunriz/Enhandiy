# Docker クイックスタート

素早く動作確認したい場合の手順です。

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

# 4. カレントディレクトリを infrastructure ディレクトリに変更
cd infrastructure

# 5. Docker でサーバー起動
docker-compose up -d web

# 6. ブラウザで http://localhost にアクセス

# 終了するとき
docker-compose down web

# 再ビルドしたいとき
docker-compose build --no-cache
```

開発向け Docker の利用例やリリース手順は `docs/guide-development.md` を参照してください。

