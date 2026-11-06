#!/bin/sh
# Takes a consistent snapshot of Open Tracker's Redis data and keeps the newest KEEP_DAYS days of them.
#
#   REDIS_URL=redis://redis:6379/0 BACKUP_DIR=/backups ops/backup-redis.sh
#
# The snapshot is fetched over the network (redis-cli --rdb), so this works from any machine that can reach Redis.
# Each file is checked with redis-check-rdb before it is kept. Set BACKUP_UPLOAD to a command that copies the
# folder off this machine (for example "rclone copy /backups remote:opentracker-backups"); it runs after each backup.
# Restore: ops/restore-redis.sh (docs/RUNBOOK.md → Backups).
set -eu

REDIS_URL=${REDIS_URL:-redis://127.0.0.1:6379/0}
BACKUP_DIR=${BACKUP_DIR:-./backups}
KEEP_DAYS=${KEEP_DAYS:-14}
case "$KEEP_DAYS" in ''|*[!0-9]*) echo "KEEP_DAYS must be a whole number of days" >&2; exit 2 ;; esac

mkdir -p "$BACKUP_DIR"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
tmp="$BACKUP_DIR/.opentracker-$stamp.rdb.part"
out="$BACKUP_DIR/opentracker-$stamp.rdb.gz"
trap 'rm -f "$tmp" "$tmp.gz"' EXIT

if ! msg=$(redis-cli -u "$REDIS_URL" --no-auth-warning --rdb "$tmp" 2>&1); then
  echo "backup failed: could not fetch a snapshot from Redis: $msg" >&2; exit 1
fi
if command -v redis-check-rdb >/dev/null 2>&1; then
  redis-check-rdb "$tmp" >/dev/null || { echo "backup failed: the snapshot did not pass redis-check-rdb" >&2; exit 1; }
fi
gzip -9 "$tmp"
mv "$tmp.gz" "$out"
echo "backup saved: $out ($(wc -c < "$out") bytes)"

# keep the newest KEEP_DAYS days of backups (by name, which sorts by time)
find "$BACKUP_DIR" -maxdepth 1 -name 'opentracker-*.rdb.gz' -mtime +"$KEEP_DAYS" -exec rm -f {} +

if [ -n "${BACKUP_UPLOAD:-}" ]; then
  sh -c "$BACKUP_UPLOAD" || { echo "backup saved here, but copying it off this machine failed" >&2; exit 1; }
fi
