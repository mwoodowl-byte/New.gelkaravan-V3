#!/bin/bash
# PostgreSQL backup script
# Runs every 3 hours via cron

set -e

BACKUP_DIR="/opt/backups/gelkaravan-v2"
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M')
DB_NAME="gelkaravan_v2"
LOG="/var/log/gelkaravan-v2-backup.log"

mkdir -p "$BACKUP_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG"
}

log "Starting DB backup..."

# Dump PostgreSQL
pg_dump -U gelkaravan "$DB_NAME" | gzip > "$BACKUP_DIR/db_${TIMESTAMP}.sql.gz"

log "DB backup saved: db_${TIMESTAMP}.sql.gz"

# Keep only last 30 backups
ls -t "$BACKUP_DIR"/db_*.sql.gz | tail -n +31 | xargs -r rm

log "Cleanup done. Total backups: $(ls $BACKUP_DIR/db_*.sql.gz | wc -l)"
