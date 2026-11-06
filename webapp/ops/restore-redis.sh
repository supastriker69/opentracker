#!/bin/sh
# Puts a backup made by ops/backup-redis.sh back into a Redis data folder. Redis must be stopped first.
#
#   ops/restore-redis.sh <backup.rdb.gz> <redis-data-folder>
#
# Redis here keeps an append-only file (AOF), which it reads in preference to a snapshot. So the restore:
#   1. writes the snapshot as dump.rdb and moves the old AOF folder aside (kept as appendonlydir.before-restore-*)
#   2. starts a temporary Redis on that folder with the AOF off, so it loads the snapshot
#   3. turns the AOF on, which writes a fresh AOF from the restored data, then shuts that Redis down cleanly
# Then start Redis normally. docs/RUNBOOK.md → Backups has the Docker Compose commands.
set -eu

[ $# -eq 2 ] || { echo "usage: $0 <backup.rdb.gz> <redis-data-folder>" >&2; exit 2; }
backup=$1; dir=$2
[ -f "$backup" ] || { echo "no backup file at $backup" >&2; exit 2; }
[ -d "$dir" ] || { echo "no Redis data folder at $dir" >&2; exit 2; }
port=${RESTORE_PORT:-6399}
if redis-cli -p "$port" ping >/dev/null 2>&1; then echo "port $port is in use; set RESTORE_PORT" >&2; exit 2; fi

gunzip -c "$backup" > "$dir/dump.rdb.restore"
if command -v redis-check-rdb >/dev/null 2>&1; then
  redis-check-rdb "$dir/dump.rdb.restore" >/dev/null || { rm -f "$dir/dump.rdb.restore"; echo "the backup is damaged (redis-check-rdb failed); nothing was changed" >&2; exit 1; }
fi
stamp=$(date -u +%Y%m%dT%H%M%SZ)
[ -d "$dir/appendonlydir" ] && mv "$dir/appendonlydir" "$dir/appendonlydir.before-restore-$stamp"
[ -f "$dir/dump.rdb" ] && mv "$dir/dump.rdb" "$dir/dump.rdb.before-restore-$stamp"
mv "$dir/dump.rdb.restore" "$dir/dump.rdb"

redis-server --port "$port" --bind 127.0.0.1 --dir "$dir" --dbfilename dump.rdb --appendonly no --save "" --daemonize yes --logfile "$dir/restore.log"
i=0; until redis-cli -p "$port" ping 2>/dev/null | grep -q PONG; do i=$((i+1)); [ $i -lt 120 ] || { echo "the temporary Redis did not start; see $dir/restore.log" >&2; exit 1; }; sleep 0.5; done
until [ "$(redis-cli -p "$port" info persistence | tr -d '\r' | sed -n 's/^loading://p')" = "0" ]; do sleep 0.5; done
keys=$(redis-cli -p "$port" dbsize)
redis-cli -p "$port" config set appendonly yes >/dev/null
until [ "$(redis-cli -p "$port" info persistence | tr -d '\r' | sed -n 's/^aof_rewrite_in_progress://p')" = "0" ] && \
      [ "$(redis-cli -p "$port" info persistence | tr -d '\r' | sed -n 's/^aof_rewrite_scheduled://p')" = "0" ]; do sleep 0.5; done
redis-cli -p "$port" shutdown save >/dev/null 2>&1 || true
i=0; while redis-cli -p "$port" ping >/dev/null 2>&1; do i=$((i+1)); [ $i -lt 60 ] || break; sleep 0.5; done
echo "restored $keys keys into $dir; start Redis normally"
