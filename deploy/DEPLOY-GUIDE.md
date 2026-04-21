# Bercut — Push to VPS Guide

**VPS:** 202.10.34.112 · **Domain:** systembercut.com · **Subdomain:** vps.systembercut.com  
**App dir on VPS:** `/var/www/bercut`

---

## What's Already Done

- Ubuntu 22.x, SSH access ✅
- Nginx installed and running ✅
- PostgreSQL 14/main, running on port 5432 ✅
- DNS: vps.systembercut.com → 202.10.34.112 ✅

---

## First Deploy (Staging Check via vps.systembercut.com)

### Step 1 — Create the PostgreSQL database and user

SSH into the VPS and run:

```bash
ssh root@202.10.34.112
```

Then:

```bash
sudo -u postgres psql
```

Inside psql, run these four lines (change the password to something strong):

```sql
CREATE USER bercut_user WITH PASSWORD '10v3Jesus1503';
CREATE DATABASE bercut OWNER bercut_user;
GRANT ALL PRIVILEGES ON DATABASE bercut TO bercut_user;
\q
```

---

### Step 2 — Clone the repo onto the VPS

```bash
mkdir -p /var/www/bercut
cd /var/www
git clone https://github.com/rohit15033/bercut
git bercut
```

> If the repo is private, you'll need to either add a deploy key or use a personal access token:
> `git clone https://YOUR_TOKEN@github.com/YOUR_GITHUB_USERNAME/bercut.git bercut`

---

### Step 3 — Create the backend .env file

```bash
cp /var/www/bercut/backend/.env.example /var/www/bercut/backend/.env
nano /var/www/bercut/backend/.env
```

Fill in these values:

```env
NODE_ENV=production
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=bercut
DB_USER=bercut_user
DB_PASSWORD=YOUR_STRONG_PASSWORD_HERE

JWT_SECRET=generate_a_long_random_string_here
JWT_EXPIRY=8h

XENDIT_SECRET_KEY=xnd_production_...
XENDIT_WEBHOOK_TOKEN=your_xendit_webhook_token
XENDIT_TERMINAL_BASE_URL=https://api.xendit.co

FONNTE_TOKEN=your_fonnte_token_here
```

> To generate a secure JWT_SECRET:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

---

### Step 4 — Run the database schema

```bash
psql -U bercut_user -d bercut -h localhost -f /var/www/bercut/backend/db/schema.sql
```

It will prompt for the password you set in Step 1.

Optional — load seed data (dev/demo data):

```bash
psql -U bercut_user -d bercut -h localhost -f /var/www/bercut/backend/db/seed.sql
```

---

### Step 5 — Install backend dependencies

```bash
cd /var/www/bercut/backend
npm install --omit=dev
```

---

### Step 6 — Build the frontend

Do this on your **local machine** (not the VPS), then push the built files:

```bash
# On your local machine, in the project root:
cd frontend
npm install
npm run build
```

This outputs the built SPA to `backend/public/`.

Then commit and push:

```bash
cd ..
git add backend/public
git commit -m "build: production frontend build"
git push
```

Back on the VPS, pull the new build:

```bash
cd /var/www/bercut
git pull
```

> **Alternative — build directly on VPS** (requires Node on the VPS):
> ```bash
> cd /var/www/bercut/frontend
> npm install
> npm run build
> ```
> The Vite build output goes to `../backend/public/` automatically (set in vite.config.js).

---

### Step 7 — Configure Nginx

The nginx config is already in `deploy/nginx.conf`. Copy it and activate:

```bash
# Update the server_name in the config first
nano /var/www/bercut/deploy/nginx.conf
```

Change `server_name _;` to:

```nginx
server_name vps.systembercut.com systembercut.com www.systembercut.com;
```

Then link and activate:

```bash
cp /var/www/bercut/deploy/nginx.conf /etc/nginx/sites-available/bercut
ln -sf /etc/nginx/sites-available/bercut /etc/nginx/sites-enabled/bercut
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl restart nginx
```

---

### Step 8 — Install PM2 (if not already installed)

```bash
npm install -g pm2
```

---

### Step 9 — Start the backend with PM2

```bash
cd /var/www/bercut
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup
```

Run the command that `pm2 startup` prints (it sets PM2 to auto-start on reboot).

---

### Step 10 — Create the logs directory

```bash
mkdir -p /var/www/bercut/logs
```

Then restart PM2:

```bash
pm2 restart bercut-backend
```

---

### Step 11 — Verify staging

Open in browser: `http://vps.systembercut.com`

Check:
- [ ] React app loads (not Nginx default page)
- [ ] `/kiosk` route loads the kiosk app
- [ ] `/admin` route loads the admin login
- [ ] No console errors about API connections
- [ ] Admin login works (check setstadminpw.js if you need to set the initial admin password)

Check PM2 logs if anything is broken:

```bash
pm2 logs bercut-backend --lines 50
```

---

## Production Go-Live (HTTPS on systembercut.com)

Once staging looks good, enable HTTPS with Let's Encrypt.

### Step 12 — Install Certbot

```bash
apt-get install -y certbot python3-certbot-nginx
```

### Step 13 — Issue the SSL certificate

```bash
certbot --nginx -d systembercut.com -d www.systembercut.com -d vps.systembercut.com
```

Certbot will automatically update your Nginx config to handle HTTPS and redirect HTTP → HTTPS.

### Step 14 — Verify auto-renewal

```bash
certbot renew --dry-run
```

### Step 15 — Final production check

Open `https://systembercut.com` and verify:
- [ ] HTTPS padlock is showing
- [ ] HTTP → HTTPS redirect works
- [ ] All three apps load (kiosk, admin)
- [ ] API calls succeed (no mixed-content errors)
- [ ] SSE real-time connection holds (check browser DevTools → Network → EventStream)
- [ ] Kiosk device registration flow works (Branches → Kiosk Devices → Generate Token)

---

## Ongoing Deploys (After First Deploy)

Every time you push new code:

```bash
# 1. Build frontend locally
cd frontend && npm run build && cd ..

# 2. Commit build + code changes
git add -A
git commit -m "deploy: update description"
git push

# 3. On VPS — pull and restart
ssh root@202.10.34.112
cd /var/www/bercut
git pull
cd backend && npm install --omit=dev  # only if package.json changed
pm2 restart bercut-backend
```

If the DB schema changed, also run the migration:

```bash
psql -U bercut_user -d bercut -h localhost -f /var/www/bercut/backend/db/schema.sql
```

---

## Useful PM2 Commands

```bash
pm2 status                        # check if backend is running
pm2 logs bercut-backend --lines 100   # tail logs
pm2 restart bercut-backend        # restart after code change
pm2 reload bercut-backend         # zero-downtime reload
```

## Important Notes

- **Never change `instances` in ecosystem.config.js from 1** — SSE real-time events break with multiple workers (in-process subscriber maps can't be shared across workers without Redis).
- **Never remove `proxy_buffering off`** in nginx.conf — SSE stops working without it.
- **JWT_SECRET** must stay the same across restarts — changing it invalidates all active admin sessions.
- **The `.env` file is not in git** — it only lives on the VPS. Never commit it.
