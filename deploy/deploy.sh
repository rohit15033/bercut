#!/usr/bin/env bash
set -e

VPS="bercut-vps"

echo "==> Deploying to VPS..."
ssh "$VPS" bash << 'REMOTE'
  set -e
  cd /var/www/bercut
  git pull origin main
  cd backend && npm install --omit=dev --silent && cd ..
  cd frontend && npm install --silent && npm run build && cd ..
  pm2 restart bercut-backend
  echo ""
  pm2 status
REMOTE

echo ""
echo "==> Deploy complete. https://systembercut.com"
