#!/bin/sh
# Backs up a real Redis (with the append-only file on, as in docker-compose.yml), loses the data, restores it,
# and checks that exactly the backed-up data came back. Needs redis-server and redis-cli.
#   sh tests/ops/backup_restore_test.sh
set -eu
OPS=$(cd "$(dirname "$0")/../../webapp/ops" && pwd)
T=$(mktemp -d)
PORT=${TEST_PORT:-6411}
fail() { echo "FAIL: $*" >&2; exit 1; }
cli() { redis-cli -p "$PORT" "$@"; }
start() { redis-server --port "$PORT" --bind 127.0.0.1 --dir "$T/data" --appendonly yes --daemonize yes --logfile "$T/redis.log"; i=0; until cli ping 2>/dev/null | grep -q PONG; do i=$((i+1)); [ $i -lt 60 ] || fail "redis did not start"; sleep 0.25; done; }
stop() { cli shutdown >/dev/null 2>&1 || true; while cli ping >/dev/null 2>&1; do sleep 0.25; done; }
trap 'stop; rm -rf "$T"' EXIT
mkdir -p "$T/data" "$T/backups"

start
cli set ot:settings '{"approval":true}' >/dev/null
cli hset ot:keys k1 '{"agency":"nadmo"}' >/dev/null
cli sadd ot:countries GH NG >/dev/null
cli xadd ot:audit '*' e '{"act":"sent"}' >/dev/null
cli lpush ot:pushq job1 >/dev/null
before=$(cli dbsize)

# an old backup that should be pruned, and one that should stay
touch -d '20 days ago' "$T/backups/opentracker-20200101T000000Z.rdb.gz"
touch -d '2 days ago' "$T/backups/opentracker-20200102T000000Z.rdb.gz"
REDIS_URL="redis://127.0.0.1:$PORT/0" BACKUP_DIR="$T/backups" KEEP_DAYS=14 sh "$OPS/backup-redis.sh" > "$T/backup.out"
grep -q "backup saved" "$T/backup.out" || fail "no backup message"
[ ! -e "$T/backups/opentracker-20200101T000000Z.rdb.gz" ] || fail "old backup not pruned"
[ -e "$T/backups/opentracker-20200102T000000Z.rdb.gz" ] || fail "recent backup pruned"
backup=$(sed -n 's/^backup saved: \(.*\) ([0-9]* bytes)$/\1/p' "$T/backup.out")
[ -s "$backup" ] || fail "backup is empty"
ls "$T"/backups/.opentracker-* >/dev/null 2>&1 && fail "temporary file left behind"

# after the backup: a change that must NOT come back, then the data is lost
cli set ot:after-backup yes >/dev/null
cli flushall >/dev/null
stop

# a damaged backup is refused and changes nothing
printf 'not a snapshot' | gzip > "$T/bad.rdb.gz"
if sh "$OPS/restore-redis.sh" "$T/bad.rdb.gz" "$T/data" 2>"$T/bad.err"; then fail "damaged backup accepted"; fi
grep -q "damaged" "$T/bad.err" || fail "damaged backup message missing: $(cat "$T/bad.err")"

RESTORE_PORT=$((PORT + 1)) sh "$OPS/restore-redis.sh" "$backup" "$T/data" > "$T/restore.out"
grep -q "restored $before keys" "$T/restore.out" || fail "restore said: $(cat "$T/restore.out")"
ls -d "$T"/data/appendonlydir.before-restore-* >/dev/null || fail "old AOF not kept aside"

start   # normal start, append-only file on: must load the restored data
[ "$(cli dbsize)" = "$before" ] || fail "expected $before keys, found $(cli dbsize)"
[ "$(cli get ot:settings)" = '{"approval":true}' ] || fail "string value lost"
[ "$(cli hget ot:keys k1)" = '{"agency":"nadmo"}' ] || fail "hash value lost"
[ "$(cli scard ot:countries)" = "2" ] || fail "set lost"
[ "$(cli xlen ot:audit)" = "1" ] || fail "audit stream lost"
[ "$(cli exists ot:after-backup)" = "0" ] || fail "a change made after the backup came back"
echo "backup and restore: ok ($before keys)"
