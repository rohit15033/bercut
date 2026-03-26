#!/bin/bash
# deploy/setup.sh
# One-time VPS setup for Bercut on Rumahweb VPS (Ubuntu 22.04)
# Run as root: bash deploy/setup.sh
# After completion, copy .env files and run: pm2 start deploy/ecosystem.config.js

set -euo pipefail

APP_DIR="/var/www/bercut"
NODE_VERSION="20"

echo "=== Bercut VPS Setup ==="

# ── System deps ───────────────────────────────────────────────────────────────
apt-get update -y
apt-get install -y curl git unzip nginx ufw

# ── Node.js via nvm ───────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y nodejs
fi
echo "Node: $(node -v)  npm: $(npm -v)"

# ── PM2 ───────────────────────────────────────────────────────────────────────
npm install -g pm2
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

# ── PostgreSQL ────────────────────────────────────────────────────────────────
if ! command -v psql &>/dev/null; then
  apt-get install -y postgresql postgresql-contrib
  systemctl enable postgresql
  systemctl start postgresql
fi
echo "PostgreSQL: $(psql --version)"

# Create database and user (edit password before running)
DB_NAME="bercut"
DB_USER="bercut_user"
DB_PASS="CHANGE_ME_BEFORE_RUNNING"

sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" 2>/dev/null || true

# ── App directory ─────────────────────────────────────────────────────────────
mkdir -p "${APP_DIR}/logs"
mkdir -p "${APP_DIR}/backend/public"

# ── Nginx ─────────────────────────────────────────────────────────────────────
cp "${APP_DIR}/deploy/nginx.conf" /etc/nginx/sites-available/bercut
ln -sf /etc/nginx/sites-available/bercut /etc/nginx/sites-enabled/bercut
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl restart nginx

# ── Firewall ─────────────────────────────────────────────────────────────────
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Copy backend/.env to ${APP_DIR}/backend/.env"
echo "  2. Run the schema:  psql -U ${DB_USER} -d ${DB_NAME} -f ${APP_DIR}/backend/db/schema.sql"
echo "  3. (Optional) Seed: psql -U ${DB_USER} -d ${DB_NAME} -f ${APP_DIR}/backend/db/seed.sql"
echo "  4. Install deps:    cd ${APP_DIR}/backend && npm install --omit=dev"
echo "  5. Build frontend:  cd ${APP_DIR}/frontend && npm install && npm run build"
echo "  6. Start:           pm2 start ${APP_DIR}/deploy/ecosystem.config.js"
echo "  7. Save PM2 state:  pm2 save"
