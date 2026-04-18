#!/bin/bash
# Deploy script for GelKaravan v2
# Usage: ./scripts/deploy.sh [staging|production]

set -e

ENV=${1:-staging}
REPO_DIR="/opt/gelkaravan-v2"
LOG="/var/log/gelkaravan-v2-deploy.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG"
}

log "=== Deploy started (env: $ENV) ==="

cd "$REPO_DIR"

# Pull latest code
log "Pulling latest code..."
git pull origin main

# Backend
log "Updating backend dependencies..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
venv/bin/pip install -r requirements.txt -q

# Run DB migrations
log "Running DB migrations..."
venv/bin/alembic upgrade head

# Restart backend service
log "Restarting backend..."
systemctl restart gelkaravan-v2-api

cd "$REPO_DIR"

# Frontend
log "Building frontend..."
cd frontend
npm install --silent
npm run build

cd "$REPO_DIR"

# Reload nginx
log "Reloading nginx..."
systemctl reload nginx

log "=== Deploy finished! ==="
