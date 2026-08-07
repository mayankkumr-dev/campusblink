#!/bin/bash
# ============================================================
# CampusBlink — Deploy/Update Script
# Run this from INSIDE your EC2 instance whenever you push
# new code and want to update the running backend.
#
# Usage (on EC2):
#   cd /app/campusblink && bash deploy/github-deploy.sh
# ============================================================

set -e

APP_DIR="/app/campusblink"
BACKEND_DIR="$APP_DIR/backend"

echo "================================================"
echo "  CampusBlink — Deploying Latest Code"
echo "================================================"

# ── 1. Pull latest code ─────────────────────────────────────
echo ""
echo "[ 1/4 ] Pulling latest code from git..."
cd "$APP_DIR"
git fetch origin main
git reset --hard origin/main
echo "Code updated ✓"

# ── 2. Install/update backend dependencies ──────────────────
echo ""
echo "[ 2/4 ] Installing backend dependencies..."
cd "$BACKEND_DIR"
npm install --omit=dev
echo "Dependencies installed ✓"

# ── 3. Reload PM2 (zero-downtime restart) ───────────────────
echo ""
echo "[ 3/4 ] Reloading backend with PM2 (zero downtime)..."
pm2 reload campusblink-backend --update-env
echo "Backend reloaded ✓"

# ── 4. Save PM2 process list ────────────────────────────────
echo ""
echo "[ 4/4 ] Saving PM2 process list..."
pm2 save
echo "PM2 saved ✓"

echo ""
echo "================================================"
echo "  ✅ Deployment Complete!"
echo "================================================"
echo ""
echo "Quick checks:"
echo "  pm2 status                 → check backend is online"
echo "  pm2 logs campusblink-backend --lines 20  → view recent logs"
echo "  curl http://localhost:3000/health         → test health endpoint"
echo ""
