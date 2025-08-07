#!/bin/bash

# バージョン管理テストスクリプト
# composer.jsonとconfig.phpの連携が正しく動作するかテスト

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🧪 バージョン管理テストを開始...${NC}"

# Dockerコンテナが起動しているかチェック
if ! docker-compose ps | grep -q "php_cli"; then
    echo -e "${YELLOW}📦 PHP CLIコンテナを起動中...${NC}"
    docker-compose --profile tools up -d php-cli
fi

echo -e "${YELLOW}1. 現在のバージョン情報確認${NC}"
docker-compose exec php-cli php infrastructure/scripts/test-version.php

echo -e "\n${YELLOW}2. バージョン更新テスト${NC}"
echo -e "テスト用バージョン 9.9.9 に更新..."
docker-compose exec php-cli php infrastructure/scripts/release.php 9.9.9

echo -e "\n${YELLOW}3. 更新後の確認${NC}"
docker-compose exec php-cli php infrastructure/scripts/test-version.php

echo -e "\n${YELLOW}4. 元のバージョンに戻す${NC}"
docker-compose exec php-cli php infrastructure/scripts/release.php 1.2.1

echo -e "\n${GREEN}✅ テスト完了！${NC}"
