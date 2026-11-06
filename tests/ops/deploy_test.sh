#!/bin/sh
# Runs ops/deploy.sh against stand-ins for docker and curl and checks what it does:
# first deploy, a second version, a version that fails its smoke test (automatic rollback), manual rollback.
#   sh tests/ops/deploy_test.sh
set -eu
WEB=$(cd "$(dirname "$0")/../../webapp" && pwd)
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
fail() { echo "FAIL: $*" >&2; echo "--- calls:" >&2; cat "$T/calls" >&2; exit 1; }
mkdir -p "$T/app/ops" "$T/bin"
cp "$WEB/ops/deploy.sh" "$T/app/ops/"
printf 'SITE_DOMAIN=ot.example.org   # public address\nVAPID_SUBJECT=mailto:a@example.org\n' > "$T/app/.env.production"

# docker: records each call; the image named in IMAGE is what "runs"
cat > "$T/bin/docker" <<'EOS'
#!/bin/sh
echo "docker $* IMAGE=${IMAGE:-}" >> "$CALLS"
case "$*" in *" up -d"*) echo "${IMAGE#opentracker:}" > "$RUNNING" ;; *"ps --status running --services"*) [ -f "$RUNNING" ] && echo backup ;; esac
exit 0
EOS
# curl: healthy unless the running version is listed in BAD
cat > "$T/bin/curl" <<'EOS'
#!/bin/sh
v=$(cat "$RUNNING" 2>/dev/null || echo none)
case " ${BAD:-} " in *" $v "*) exit 22 ;; esac
for a; do u=$a; done
case "$u" in
  */healthz) echo '{"ok":true}' ;;
  */api/config) echo '{"vapidPublicKey":"x"}' ;;
  */readyz|*/readyz/feeds|*/api/notices) echo '{}' ;;
  */) echo '<title>Open Tracker</title>' ;;
esac
EOS
chmod +x "$T/bin/docker" "$T/bin/curl"
export PATH="$T/bin:$PATH" CALLS="$T/calls" RUNNING="$T/running" SMOKE_TRIES=2 SMOKE_WAIT=0
cd "$T/app"
run() { sh ops/deploy.sh "$@" > "$T/out" 2>&1; }

echo v1 > VERSION
run production || fail "first deploy failed: $(cat "$T/out")"
grep -q "docker build -t opentracker:v1 ." "$T/calls" || fail "image not built with its version"
grep -q "docker compose -p opentracker-production --env-file .env.production up -d --remove-orphans IMAGE=opentracker:v1" "$T/calls" || fail "not started with the new image"
grep -q "no backup service running yet" "$T/out" || fail "first deploy should skip the backup"
[ "$(cat .deploy/production/current)" = v1 ] || fail "current version not recorded"

echo v2 > VERSION
run production || fail "second deploy failed: $(cat "$T/out")"
grep -q "exec -T backup sh /ops/backup-redis.sh" "$T/calls" || fail "no backup before a production deploy"
[ "$(cat .deploy/production/current)" = v2 ] && [ "$(cat .deploy/production/previous)" = v1 ] || fail "versions not recorded"

echo v3 > VERSION
if BAD=v3 run production; then fail "a failing version was accepted"; fi
grep -q "v3 failed the smoke test; production is back on v2" "$T/out" || fail "no automatic rollback message: $(cat "$T/out")"
[ "$(cat "$RUNNING")" = v2 ] || fail "v2 is not running after the automatic rollback"
[ "$(cat .deploy/production/current)" = v2 ] || fail "current changed by a failed deploy"
grep -q "FAILED the smoke test" .deploy/production/history || fail "failure not in the history"

run production rollback || fail "rollback failed: $(cat "$T/out")"
[ "$(cat "$RUNNING")" = v1 ] && [ "$(cat .deploy/production/current)" = v1 ] && [ "$(cat .deploy/production/previous)" = v2 ] || fail "rollback did not switch to v1"

run production status || fail "status failed: $(cat "$T/out")"
grep -q "production is running version v1 (before it: v2)" "$T/out" || fail "status message wrong: $(cat "$T/out")"

if run testing; then fail "unknown environment accepted"; fi
if run staging; then fail "missing settings file accepted"; fi
grep -q "no settings file .env.staging" "$T/out" || fail "missing settings message wrong"
echo "deploy and rollback: ok"
