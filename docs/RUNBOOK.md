# Open Tracker runbook

How to run Open Tracker in public: deploying, rolling back, backups, monitoring, and what to do when something goes
wrong. Commands run in the web app folder on the server (`release/opentracker-webapp` from the repository, or
`dist/opentracker-webapp` after `python3 tools/build.py`).

## First setup

1. A Linux server with Docker and Docker Compose, ports 80 and 443 open, and DNS for your domain pointing at it.
   Staging is a second, smaller server set up the same way with its own domain (for example `staging.` in front).
2. Copy the web app folder to the server, then `cp env.example .env.production` and fill it in:
   `SITE_DOMAIN`, `VAPID_SUBJECT`, `ALERT_NAME`, `ALERT_WEBHOOK_URL`, `METRICS_TOKEN` (`openssl rand -hex 24`).
3. `ops/deploy.sh production`. The first deploy has no backup to take and no earlier version to fall back to.
4. Create the administrator key and keep it in a password manager:
   `docker compose -p opentracker-production --env-file .env.production exec web node server.js keys:add opentracker "Open Tracker team" --admin`
5. One key per agency (`keys:add <id> "<Agency name>"`), handed over privately. Approval stays on (`approval:on`).
6. Point an uptime monitor at `https://<domain>/readyz` and `https://<domain>/readyz/feeds` (below).

## Deploying

```
ops/deploy.sh staging            # first, on the staging server
ops/deploy.sh production         # then production, once staging looks right
ops/deploy.sh production status  # running version, containers, health
```

A deploy, in order:

1. Backs up Redis (production only). If the backup fails, nothing changes.
2. Builds the image `opentracker:<version>`, where the version comes from the `VERSION` file the build writes.
3. Starts it.
4. Smoke-tests the public address: `/readyz`, `/healthz`, `/api/config`, the home page and `/api/notices`.
   A data feed that is behind (`/readyz/feeds`) is reported but does not block the deploy.
5. If the smoke test fails, the version that ran before is started again and the script exits with an error.

Every deploy and rollback is written to `.deploy/<env>/history`. Before a release:

- the Checks workflow on GitHub is green;
- the browser tests passed;
- staging ran the same version for at least an hour with no operator alerts.

After deploying, watch the alert channel and `/metrics` for 15 minutes, then download live data in the console
(Download live data) and import it into the claude.ai page (Admin → Live data).

## Rollback

`ops/deploy.sh production rollback` starts the version that ran before, smoke-tests it and records the switch.
Earlier versions stay as local images (`docker image ls opentracker`). To go further back:
`IMAGE=opentracker:<version> docker compose -p opentracker-production --env-file .env.production up -d`.

There are no database migrations: every version reads the same Redis data, so rolling back needs no data change.

Roll back when any of these happens:

- `/readyz` fails for more than 2 minutes;
- more than 1% of requests are server errors over 5 minutes;
- public pages are slower than 800 ms at the 95th percentile for 10 minutes;
- more than 5% of phone alerts fail;
- a data feed misses two runs during an active warning;
- a notice goes out without approval, or to the wrong areas (withdraw it first: see below).

## Backups

The `backup` service takes a snapshot every 24 hours into `BACKUP_DIR` (default `./backups`). It checks each
snapshot with `redis-check-rdb` and keeps `BACKUP_KEEP_DAYS` days of them. A deploy to production takes one first.

- **Back up now:** `docker compose -p opentracker-production --env-file .env.production exec -T backup sh /ops/backup-redis.sh`
- **Copy backups off the machine:** set `BACKUP_UPLOAD` to a command that copies `/backups` elsewhere. A backup
  that lives only on the server is lost with the server.
- **Restore** (stops the service for a minute):

```
P="docker compose -p opentracker-production --env-file .env.production"
$P stop web push backup
$P stop redis
$P run --rm --no-deps -v "$PWD/ops:/ops:ro" -v "$PWD/backups:/backups:ro" --entrypoint sh redis /ops/restore-redis.sh /backups/<file>.rdb.gz /data
$P up -d
```

The restore keeps the replaced data beside it (`appendonlydir.before-restore-*`), so a restore can itself be undone.
`tests/ops/backup_restore_test.sh` proves the whole cycle against a real Redis: back up, lose the data, restore,
and check that exactly the backed-up data returns. Test a restore on staging every three months.

## Monitoring

- **Logs:** one JSON object per line on standard output, for example
  `{"t":"…","level":"error","msg":"feed gdacs: the server answered 500","feed":"gdacs"}`.
  `docker compose … logs -f push` shows them. Any log collector can ship them; containers keep 100 MB each.
- **Operator alerts:** the watchdog runs in the `push` service and checks every minute. It posts to
  `ALERT_WEBHOOK_URL` and logs `alert raised` / `alert resolved`. It reports each problem once when it starts and
  once when it ends:
  - a data feed has missed two runs;
  - a notice has waited more than 15 minutes for approval;
  - more than 5% of phone alerts failed;
  - phone alerts are piling up.
- **Uptime checks** (any outside service, every minute, alerting by SMS or phone):
  - `/readyz`: the web servers and Redis;
  - `/readyz/feeds`: 503 while any data feed is stale. This is a second path to you if the webhook itself breaks.
- **Metrics:** `GET /metrics` with `Authorization: Bearer <METRICS_TOKEN>`, in Prometheus format. It covers:
  - requests and response times by route;
  - phone alerts sent, gone and failed;
  - feed runs and how old each feed's data is;
  - queued alert batches, notices waiting for approval, subscribers and uptime.

  Without `METRICS_TOKEN`, `/metrics` is off.

## When something goes wrong

### A wrong alert went out

1. In the push console, withdraw the notice. Phones not yet reached are skipped, and it leaves every page at once.
2. Send a correction notice to the same areas, saying plainly that the earlier one was wrong.
3. The audit log (Admin → Audit log) shows who sent and who approved it.
4. If it came from a stolen agency key, follow the next section.

### An agency key is lost or leaked

1. `node server.js keys:list`, then `keys:revoke <key-id>`. It stops working at once on every server.
2. `keys:add` a new key for the agency and hand it over privately.
3. Check the audit log for anything sent with the old key, and withdraw it.

### A data feed has stopped

1. Admin → Data feeds shows the last error. The source's own status page usually explains it.
2. The site keeps showing the feed's last good data, labelled with its time.
3. After a fix, Admin → Data feeds → Run now. The alert clears on the next check.
4. If an official warning feed (CAP) changed its address, update it in the console.

### Phone alerts are failing or piling up

- **Failing:** check the `push` logs. "gone" results are phones that unsubscribed and are normal. Rising failures
  usually mean the push keys changed: never delete `ot:vapid` in Redis.
- **Piling up:** run more senders with `--scale push=3` on the `up` command. Each sender takes batches from the
  shared queue.

### Redis is down

1. `/readyz` fails and pages show their cached copies.
2. Check `$P logs redis`.
3. Restart with `$P up -d redis`. If the data is damaged, restore the newest backup (above).

## Releases on GitHub

The repository is `supastriker69/opentracker`. Work happens on branches. The Checks workflow builds, lints and runs:

- the server tests with file and Redis storage on Node.js 22 and 24;
- the Python tests;
- the browser tests;
- the backup, restore and deploy tests;
- a container build.

Merge to `main` only when the workflow is green. `release/opentracker-webapp` is what gets deployed, and the
workflow fails if it is out of step with the source.
