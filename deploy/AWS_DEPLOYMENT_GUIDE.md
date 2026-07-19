# CampusBlink — AWS Deployment Guide

> **Architecture**: Frontend on Vercel (free) + Backend on EC2 t3.micro ($8.47/mo)  
> **Total cost**: ~$8.47/mo from your $100 credits → **~11.8 months free** (until ~July 2027)

---

## ✅ Pre-Flight Checklist

Before starting, have these ready:
- [ ] AWS account with $100 credits (upgrade to paid plan)
- [ ] Your GitHub repo URL (with the CampusBlink code)
- [ ] Supabase URL + Service Role Key
- [ ] Cloudinary Cloud Name + API Key + API Secret
- [ ] JWT Secret (generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)

---

## PHASE 1 — AWS Console Setup (30 min)

### Step 1.1 — Upgrade to Paid Plan (REQUIRED before Aug 2)

1. Go to [console.aws.amazon.com](https://console.aws.amazon.com)
2. Click your **account name** (top right) → **Account**
3. Scroll to **Payment Methods** → **Add a payment method**
4. Add your credit/debit card
5. Go to **Billing** → confirm your plan is upgraded

> ✅ Your $100 credits are applied automatically before your card is charged.

---

### Step 1.2 — Launch EC2 Instance

1. Go to **EC2** → **Launch Instance**
2. Fill in:
   - **Name**: `campusblink-backend`
   - **AMI**: `Ubuntu Server 22.04 LTS (HVM)` ← click "Free tier eligible"
   - **Instance type**: `t3.micro`
   - **Key pair**: Click **Create new key pair**
     - Name: `campusblink-key`
     - Type: RSA
     - Format: `.pem`
     - **Download and save this file — you cannot re-download it!**
3. **Network settings** → click **Edit**:
   - Create a new Security Group named `campusblink-sg`
   - Add these inbound rules:
     | Type | Port | Source | Reason |
     |------|------|--------|--------|
     | SSH | 22 | My IP | SSH access |
     | HTTP | 80 | 0.0.0.0/0 | Web traffic |
     | HTTPS | 443 | 0.0.0.0/0 | Secure web |
     | Custom TCP | 3000 | 0.0.0.0/0 | Backend API (temp, remove later) |
4. **Storage**: Set to **20 GB** (default 8 GB is too small)
5. Click **Launch Instance**

---

### Step 1.3 — Assign Elastic IP (Fixed Public IP)

1. In EC2 Console, go to **Elastic IPs** (left sidebar)
2. Click **Allocate Elastic IP address** → **Allocate**
3. Select the new IP → **Actions** → **Associate Elastic IP**
4. Select your `campusblink-backend` instance
5. Click **Associate**
6. **Write down this IP address** — this is your backend URL: `http://<YOUR-EC2-IP>`

---

## PHASE 2 — Backend Setup on EC2 (20 min)

### Step 2.1 — SSH into EC2

```bash
# On your Mac terminal:
chmod 400 ~/Downloads/campusblink-key.pem
ssh -i ~/Downloads/campusblink-key.pem ubuntu@<YOUR-EC2-IP>
```

---

### Step 2.2 — Run Setup Script

```bash
# Download and run the one-time setup script
curl -o ec2-setup.sh https://raw.githubusercontent.com/<your-username>/<your-repo>/main/deploy/ec2-setup.sh
bash ec2-setup.sh
```

**OR** if you can't use raw GitHub links, do it manually:

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx

# Install PM2
sudo npm install -g pm2

# Create app directory
sudo mkdir -p /app /app/logs
sudo chown -R $USER:$USER /app

# PM2 auto-start on reboot
pm2 startup
# Copy and run the command it outputs

```

---

### Step 2.3 — Clone Your Repo

```bash
cd /app
git clone https://github.com/<your-username>/<your-repo>.git campusblink
cd campusblink/backend
```

---

### Step 2.4 — Set Environment Variables

```bash
# Create the .env file
nano /app/campusblink/backend/.env
```

Paste these (fill in your real values):

```env
PORT=3000
NODE_ENV=production
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FRONTEND_URL=https://your-app.vercel.app
ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:5173
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
ADMIN_EMAILS=your-admin@email.com
```

Save with `Ctrl+X` → `Y` → Enter.

---

### Step 2.5 — Install Dependencies & Start Backend

```bash
cd /app/campusblink/backend
npm install

# Start with PM2
pm2 start /app/campusblink/deploy/ecosystem.config.js --env production

# Save PM2 process list (survives reboots)
pm2 save

# Check it's running
pm2 status
```

Expected output:
```
┌─────┬──────────────────────┬─────────┬──────┬───────────┐
│ id  │ name                 │ mode    │ ↺    │ status    │
├─────┼──────────────────────┼─────────┼──────┼───────────┤
│ 0   │ campusblink-backend  │ cluster │ 0    │ online    │
│ 1   │ campusblink-backend  │ cluster │ 0    │ online    │
└─────┴──────────────────────┴─────────┴──────┴───────────┘
```

---

### Step 2.6 — Configure Nginx

```bash
# Copy Nginx config
sudo cp /app/campusblink/deploy/nginx.conf /etc/nginx/sites-available/campusblink

# Enable it
sudo ln -s /etc/nginx/sites-available/campusblink /etc/nginx/sites-enabled/campusblink

# Remove default config
sudo rm -f /etc/nginx/sites-enabled/default

# Test config syntax
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

### Step 2.7 — Test Backend

```bash
# From EC2:
curl http://localhost:3000/health
# Expected: {"status":"ok","timestamp":"..."}

# From your Mac:
curl http://<YOUR-EC2-IP>/health
# Expected: {"status":"ok","timestamp":"..."}
```

🎉 **Backend is live at `http://<YOUR-EC2-IP>`**

---

## PHASE 3 — Update Frontend on Vercel (10 min)

Your frontend is already on Vercel. Just update the environment variable so it points to your new EC2 backend.

### Step 3.1 — Update Vercel Environment Variables

1. Go to [vercel.com](https://vercel.com) → Your CampusBlink project
2. Click **Settings** → **Environment Variables**
3. Update (or add):
   ```
   VITE_BACKEND_URL = http://<YOUR-EC2-IP>
   ```
4. Click **Save**

### Step 3.2 — Redeploy Frontend

```bash
# In Vercel dashboard: click "Redeploy" on the latest deployment
# OR push any commit to trigger a new deploy automatically
```

---

## PHASE 4 — Verify Everything Works

Run these checks:

```bash
# 1. Backend health
curl http://<YOUR-EC2-IP>/health
# → {"status":"ok"}

# 2. Backend API test (should return 401 unauthorized — meaning it's running)
curl http://<YOUR-EC2-IP>/api/diary
# → {"error":"..."} — backend is responding ✓

# 3. Check PM2 logs for errors
pm2 logs campusblink-backend --lines 30

# 4. Check Nginx status
sudo systemctl status nginx
```

**Manual checks in browser:**
- [ ] Open your Vercel frontend URL → app loads
- [ ] Login/signup works (Supabase)
- [ ] Upload a photo (Cloudinary)
- [ ] Real-time features work (Socket.io attendance/messages)

---

## Daily Operations

### Update backend after pushing new code:
```bash
ssh -i ~/Downloads/campusblink-key.pem ubuntu@<YOUR-EC2-IP>
cd /app/campusblink && bash deploy/github-deploy.sh
```

### View backend logs:
```bash
pm2 logs campusblink-backend
pm2 logs campusblink-backend --err   # errors only
```

### Restart backend:
```bash
pm2 restart campusblink-backend
pm2 reload campusblink-backend    # zero-downtime restart
```

### Monitor server health:
```bash
pm2 monit      # live dashboard
htop           # CPU/RAM (sudo apt install htop)
```

---

## Cost Summary

| Month | What pays | Charged to card |
|-------|-----------|-----------------|
| Aug 2026 – Jul 2027 | $100 AWS credits | ₹0 |
| Aug 2027+ | Your card | ~₹720/mo (~$8.47) |

**Frontend on Vercel: Free forever ✅**

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `502 Bad Gateway` | PM2 crashed — run `pm2 restart campusblink-backend` |
| `Connection refused` on port 3000 | Check Security Group has port 3000 open |
| App shows old version | Run `github-deploy.sh` on EC2 |
| Socket.io not connecting | Check `ALLOWED_ORIGINS` in `.env` matches Vercel URL exactly |
| Backend won't start | Check `pm2 logs` for missing env variables |
