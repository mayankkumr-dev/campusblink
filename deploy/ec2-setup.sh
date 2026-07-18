#!/bin/bash
# ============================================================
# CampusBlink — EC2 One-Time Setup Script
# Run this ONCE on a fresh Ubuntu 22.04 EC2 instance.
# Usage: bash ec2-setup.sh
# ============================================================

set -e  # Exit on any error

echo "================================================"
echo "  CampusBlink EC2 Setup — Ubuntu 22.04"
echo "================================================"

# ── 1. System update ────────────────────────────────────────
echo ""
echo "[ 1/7 ] Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# ── 2. Install Node.js 20 ───────────────────────────────────
echo ""
echo "[ 2/7 ] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# ── 3. Install PM2 ──────────────────────────────────────────
echo ""
echo "[ 3/7 ] Installing PM2 process manager..."
sudo npm install -g pm2
pm2 --version

# ── 4. Install Nginx ────────────────────────────────────────
echo ""
echo "[ 4/7 ] Installing Nginx..."
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
echo "Nginx installed ✓"

# ── 5. Install Git ──────────────────────────────────────────
echo ""
echo "[ 5/7 ] Installing Git..."
sudo apt-get install -y git
git --version

# ── 6. Create app directory ─────────────────────────────────
echo ""
echo "[ 6/7 ] Creating /app directory..."
sudo mkdir -p /app
sudo chown -R $USER:$USER /app
echo "App directory created at /app ✓"

# ── 7. Setup PM2 startup ────────────────────────────────────
echo ""
echo "[ 7/7 ] Configuring PM2 to start on system boot..."
pm2 startup | tail -1 | sudo bash || echo "PM2 startup configured"

echo ""
echo "================================================"
echo "  ✅ EC2 Setup Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "  1. Clone your repo:    cd /app && git clone <your-repo-url> campusblink"
echo "  2. Set up .env:        cd /app/campusblink/backend && nano .env"
echo "  3. Install deps:       cd /app/campusblink/backend && npm install"
echo "  4. Start backend:      pm2 start /app/campusblink/deploy/ecosystem.config.js"
echo "  5. Save PM2 list:      pm2 save"
echo "  6. Set up Nginx:       sudo cp /app/campusblink/deploy/nginx.conf /etc/nginx/sites-available/campusblink"
echo "  7. Enable Nginx site:  sudo ln -s /etc/nginx/sites-available/campusblink /etc/nginx/sites-enabled/"
echo "  8. Test & reload:      sudo nginx -t && sudo systemctl reload nginx"
echo ""
