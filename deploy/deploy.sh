#!/usr/bin/env bash
set -e

VPS="bercut-vps"
APP="/var/www/bercut"

echo "==> Deploying to VPS..."
ssh "$VPS" "cd $APP && git pull origin main"
ssh "$VPS" "cd $APP/backend && npm install --omit=dev --silent"
ssh "$VPS" "cd $APP/frontend && rm -rf node_modules && npm ci && npm run build"
echo "==> Running DB migrations..."
ssh "$VPS" "bash $APP/backend/db/migrate.sh"
ssh "$VPS" "pm2 restart bercut-backend && pm2 status"

echo ""
echo "==> Deploy complete. https://systembercut.com"
