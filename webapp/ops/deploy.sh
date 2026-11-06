#!/bin/sh
# Deploys, rolls back or checks Open Tracker with Docker Compose. Run it from the web app folder on the server.
#
#   ops/deploy.sh production|staging            build this folder as a new version and switch to it
#   ops/deploy.sh production|staging rollback   switch back to the version that ran before
#   ops/deploy.sh production|staging status     show the running version and whether it is healthy
#
# A deploy backs up Redis first (production), builds the image tagged with the build's version, starts it, then runs
# a smoke test against the public address. If the smoke test fails, the version that ran before is started again
# and the script exits with an error. Every version stays as a local image, so any earlier one can come back.
# Settings: .env.<production|staging> (copy env.example). History: .deploy/<env>/history.
# SMOKE_URL replaces the public address for the smoke test; SMOKE_INSECURE=1 accepts a test certificate.
set -eu
cd "$(dirname "$0")/.."

die() { echo "deploy: $*" >&2; exit 1; }
say() { echo "deploy: $*"; }
[ $# -ge 1 ] || die "usage: ops/deploy.sh production|staging [deploy|rollback|status]"
env=$1; action=${2:-deploy}
case $env in production|staging) ;; *) die "the first word must be production or staging" ;; esac
case $action in deploy|rollback|status) ;; *) die "the second word must be deploy, rollback or status" ;; esac

settings=".env.$env"
[ -f "$settings" ] || die "no settings file $settings: copy env.example and fill it in"
setting() { sed -n "s/^$1=\([^ #]*\).*/\1/p" "$settings" | tail -1; }
domain=$(setting SITE_DOMAIN)
[ -n "$domain" ] || die "SITE_DOMAIN is empty in $settings"
base=${SMOKE_URL:-https://$domain}
project="opentracker-$env"
state=".deploy/$env"
mkdir -p "$state"
current=$(cat "$state/current" 2>/dev/null || true)
previous=$(cat "$state/previous" 2>/dev/null || true)
dc() { docker compose -p "$project" --env-file "$settings" "$@"; }
note() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" >> "$state/history"; }

# the public site answers, is ready (Redis reachable), and serves the app and its settings
smoke() {
  i=0
  until curl ${SMOKE_INSECURE:+-k} -fsS --max-time 5 "$base/readyz" >/dev/null 2>&1; do
    i=$((i + 1)); [ "$i" -lt "${SMOKE_TRIES:-45}" ] || { echo "  /readyz did not answer" >&2; return 1; }
    sleep "${SMOKE_WAIT:-2}"
  done
  curl ${SMOKE_INSECURE:+-k} -fsS --max-time 10 "$base/healthz" | grep -q '"ok":true' || { echo "  /healthz failed" >&2; return 1; }
  curl ${SMOKE_INSECURE:+-k} -fsS --max-time 10 "$base/api/config" | grep -q '"vapidPublicKey"' || { echo "  /api/config failed" >&2; return 1; }
  curl ${SMOKE_INSECURE:+-k} -fsS --max-time 10 "$base/" | grep -q '<title>Open Tracker</title>' || { echo "  the home page failed" >&2; return 1; }
  curl ${SMOKE_INSECURE:+-k} -fsS --max-time 10 "$base/api/notices" >/dev/null || { echo "  /api/notices failed" >&2; return 1; }
  if ! curl ${SMOKE_INSECURE:+-k} -fsS --max-time 10 "$base/readyz/feeds" >/dev/null 2>&1; then
    echo "  note: a data feed is behind (/readyz/feeds); this does not stop the deploy" >&2
  fi
}

start() { IMAGE="opentracker:$1" dc up -d --remove-orphans; }

case $action in
  status)
    say "$env is running version ${current:-unknown} (before it: ${previous:-none})"
    dc ps
    if smoke; then say "healthy"; else die "not healthy"; fi
    ;;
  rollback)
    [ -n "$previous" ] || die "no earlier version recorded for $env"
    say "rolling $env back from $current to $previous"
    start "$previous"
    smoke || die "version $previous is not healthy either: see docs/RUNBOOK.md → Rollback"
    echo "$previous" > "$state/current"; echo "$current" > "$state/previous"
    note "rollback $current -> $previous"
    say "$env is back on $previous"
    ;;
  deploy)
    [ -f VERSION ] || die "no VERSION file: build with python3 tools/build.py and deploy the release folder"
    version=$(cat VERSION)
    if [ "$env" = production ]; then
      if dc ps --status running --services 2>/dev/null | grep -qx backup; then
        say "backing up Redis first"
        dc exec -T backup sh /ops/backup-redis.sh || die "the backup before the deploy failed; nothing was changed"
      else
        say "no backup service running yet (first deploy): skipping the backup"
      fi
    fi
    say "building version $version"
    docker build -t "opentracker:$version" .
    say "starting version $version on $env"
    start "$version"
    if smoke; then
      if [ "$current" != "$version" ]; then
        [ -n "$current" ] && echo "$current" > "$state/previous"
        echo "$version" > "$state/current"
      fi
      note "deploy $version (was ${current:-none})"
      say "$env is running $version"
    else
      note "deploy $version FAILED the smoke test"
      if [ -n "$current" ] && [ "$current" != "$version" ]; then
        say "smoke test failed: putting $current back"
        start "$current"
        smoke || die "smoke test failed and $current is not healthy either: see docs/RUNBOOK.md → Rollback"
        note "automatic rollback to $current"
        die "version $version failed the smoke test; $env is back on $current"
      fi
      die "version $version failed the smoke test and there is no earlier version to go back to"
    fi
    ;;
esac
