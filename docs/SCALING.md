# Scaling Open Tracker to very large audiences

Open Tracker is built so that adding capacity means adding machines, not rewriting code. This guide explains how the pieces scale and gives a reference setup for a worldwide audience. No software on its own guarantees billions of users with zero downtime. That comes from this design plus redundant hosting across several regions, a CDN, managed databases, monitoring and load testing.

## Where the load really is

| Kind of request | Share of traffic | Who serves it |
|---|---|---|
| Opening the app (HTML, JavaScript, map data, icons) | almost all | **CDN edge**. Versioned files are cached for a year (`immutable`), pages revalidate with ETags |
| Reading alerts, forecasts, published data, hazard summaries (`/api/notices`, `/api/weather`, `/api/data`, `/api/hazards/<CC>`) | most of the rest | **CDN edge** (`s-maxage` 30 s / 300 s, `stale-while-revalidate`). Origin answers at most about once per second per server (micro-cache) |
| Turning alerts on, following places (`/api/subscribe`) | small | Web servers, then Redis |
| Contributions, agency notices, admin | tiny | Web servers, then Redis |
| Sending phone notifications | bursts | **Push senders** reading a shared job queue |

Because public reads are cacheable, the origin sees a small, steady load even when millions of people open the app during a flood.

## Building blocks

- **Stateless web servers** (`ROLE=web`, `WORKERS=auto` uses every core). Any number of them run behind a load balancer. They keep nothing locally, so a server can be replaced at any moment.
- **Shared storage: Redis** (`REDIS_URL`). It holds notices, contributions, rate-limit counters (shared, so limits hold across servers), the audit stream and the push job queue, and, unless shards are set, the subscriptions.
- **Subscription shards** (`REDIS_SUB_URLS`). Subscriptions are the one dataset that grows with the audience: about 900 bytes each, measured. With shards listed, each Redis server holds the phones whose id hashes to it, together with their **targeting indexes** (one set per country, region/state and whole-country follower, plus a geo index of followed points). Add shards before the first one fills; changing the list later moves phones between shards, so plan the count for the audience you expect.
- **Targeting streams.** To find a warning's phones, each shard builds the union of the matching indexes itself and hands it back 1,000 at a time. The exact rule checks each chunk, and batches go on the queue as they are found. All shards work at once, senders start straight away, and no process ever holds the whole audience in memory.
- **Push senders** (`ROLE=push`). One notice is split into batches of 500 phones. Every sender takes batches from the shared queue, so delivery speed grows with the number of senders. Each sender keeps 200 messages in flight (`PUSH_CONCURRENCY`): push services take about 80 ms to answer, and 200 keeps a core busy encrypting rather than waiting. Phones that uninstalled are removed automatically (HTTP 404/410 from the push service).
- **Weather poller and data feeds**. Only one process runs each outside feed (Google Weather, Open-Meteo, GDACS, official CAP warnings, satellite scenes): a Redis lock per feed elects it, and another process takes over if it stops. Run them on the push tier (`ROLE=push`). Outside services are called once per feed run, never once per visitor; every server answers from the shared summaries in Redis, and the CDN caches those for a minute.
- **Weather for the whole world**. The free Open-Meteo service allows under 10,000 calls a day, enough for a few hundred places. For every place on Earth, run your own Open-Meteo servers (open source; the model data is mirrored on AWS Open Data, `s3://openmeteo`) in two regions and point `OPEN_METEO_*_URL` at them, then raise `FEED_PLACES` to 7,300 and `BASELINE_PER_RUN` to 200.
- **Maps**. The street map and buildings are PMTiles files on object storage behind the CDN (`maps/`): no tile servers to scale. Until those are hosted, the app uses OpenFreeMap and AWS Terrain Tiles (`MAP_TILES_URL`, `TERRAIN_TILES_URL`).
- **Flood projections** run on each visitor's own device (about 3 seconds of computing for a 6 km area), so millions of projections add no load to Open Tracker's servers; only the ground-height tiles are fetched, from a CDN.
- **Health and deploys**. `/healthz` (process alive) and `/readyz` (storage reachable) feed load balancers and orchestrators. On `SIGTERM` a server stops taking new requests, finishes the ones in flight and exits, so rolling deploys drop nothing.

## Measured, and what 5 billion people need

`webapp/load/loadtest.js` measures one server and one sender with Redis; CI runs it on every push and fails below its thresholds. Latest run (`docs/validation/load-test.json`): 2 cores (Intel(R) Xeon(R) Processor @ 2.10GHz), Node.js v22.22.0, with the load generator sharing the same cores:

| What | Measured |
|---|---|
| Public reads, as a visit makes them (alerts, weather, hazards, data, replays, the page), 1 worker | **9,751 requests a second**, p50 4.9 ms, p95 16.3 ms, p99 25.2 ms, no errors |
| The same, 2 workers | 11,733 a second, p99 18.5 ms: the load generator takes the second core, so this understates scaling. More cores scale it further, because workers share nothing but Redis |
| Turning alerts on (a different person each time) | **6,391 a second**, p99 15.7 ms, no errors |
| Memory per subscription in Redis | **903 bytes** |
| Finding a warning's phones (streamed) | **157,480 phones a second** per shard |
| Sending: every message encrypted for real, push service answering in 80 ms | **1,592 notifications a second** per sender core (2,742 a second if the push service answered instantly) |

`webapp/load/capacity.js` turns those figures into machines. Every assumption is named in the script; change them to plan for your own audience (`node load/capacity.js report.json --people 5e9`):

| Load | Assumption | Needs |
|---|---|---|
| Peak hour | 1.0 billion visits (20 % of 5.0 billion people) | 1.9 million requests a second at the CDN edge |
| Public reads reaching the servers | 1 % CDN misses (at least 26 a second from the origin shields) | 19,444 a second → **4 web cores** (9,751 a second per core measured, run at 60 %). Without any CDN: 333 cores |
| Turning alerts on | 5 % of the peak hour's visitors | 13,889 a second → **4 web cores** (6,391 a second per core measured) |
| Stored subscriptions | 2.0 billion phones (40 % of people) × 903 bytes measured × 1.5 overhead | 2,523 GB → **20 subscription shards** of 128 GB (`REDIS_SUB_URLS`), each with a replica |
| One warning to a whole large country | 100 million phones in 10 minutes | 166,667 messages a second → **175 sender cores** (1,592 a second per core measured, encryption included). Finding the phones: 32 s across the shards |

In all: 8 web cores, 175 sender cores and 20 subscription shards (plus replicas), spread over at least three regions.

**What this shows:**

- **The CDN is the system.** Two million requests a second at its edge become a few thousand at the servers. Without a CDN, the same surge needs about 330 web cores, which is affordable but pointless.
- **Notifications are the most compute.** That load is bounded by the push services (Apple, Google, Mozilla), which rate-limit very large sends. Spread country-wide sends over a few minutes, and keep `urgency: high` for real warnings.
- **Memory is the one thing that grows with the audience.** It is handled by adding subscription shards.

None of this is a substitute for a surge test against a staging copy behind the real CDN: these are per-machine measurements multiplied by a model.

**For people on slow phones and networks** (most of the next billion users): the web app test loads the site with no cache on Chrome's "Fast 3G" profile (1.6 Mbit/s, 150 ms) with a CPU four times slower. The home screen is usable in about 2 seconds after about 250 KB, and the test fails above 10 seconds or 500 KB. Files are compressed once when the app is built and again when the image is built (Brotli at maximum, with gzip as the fallback), so no request pays for compression. Every screen is also checked against WCAG 2.2 AA with axe-core: 135 screens on the claude.ai page, plus the web app's screens.

## Reference setup for a global audience

1. **DNS and CDN**: anycast DNS and a CDN (Cloudflare, Fastly, CloudFront, Akamai) in front of everything. Cache `/`, static files and the three public API reads. Pass `POST` and authenticated requests through.
2. **Regions**: run the web tier in at least three regions (for example West Africa, Europe and the Americas), with health-checked failover between them.
3. **Web tier**: autoscale on CPU (target about 60%), at least 3 instances per region across availability zones.
4. **Redis**: a managed, replicated Redis with automatic failover (ElastiCache, Memorystore, Azure Cache or your own with Sentinel), with persistence on (AOF). That covers the main Redis plus one per subscription shard. Each shard is a separate primary with its own replica, not a Redis Cluster: the app spreads the subscriptions itself. Subscriptions take about 900 bytes each (measured), so 100 million need about 130 GB with overhead.
5. **Push tier**: autoscale on queue length (`LLEN ot:pushq`). One sender core delivers about 1,600 notifications a second (measured: 200 in flight, 80 ms per push-service call, encryption included), so 100 sender cores deliver about 9 million a minute.
6. **Agency and admin traffic** is low and goes straight to the origin.
7. **Observability**: collect logs, request rates, error rates, queue length and delivery counts (`/api/sent` shows delivered and failed per notice). Alert on error-rate and queue-age thresholds.
8. **Load testing**: `webapp/load/loadtest.js` runs on every push (below). Before each flood season, also replay a surge (for example 50 times normal traffic for one hour) against a staging copy behind the same CDN settings.

## Limits to plan for

- **Web push services** (Apple, Google, Mozilla) apply their own rate limits. Spread very large sends over a few minutes and keep `urgency: high` for real warnings only.
- **iPhone** alerts work only after people add Open Tracker to their home screen (iOS 16.4 or later).
- **The claude.ai version** of Open Tracker is for the project team, agencies and administrators, and for testing. The public site with phone alerts should run on your own domain with the setup above.

## Running it

```bash
# one machine, files only (development)
node server.js
# many processes and machines: shared Redis
REDIS_URL=redis://redis:6379/0 WORKERS=auto ROLE=web node server.js
REDIS_URL=redis://redis:6379/0 ROLE=push node server.js
# billions of followers: subscriptions spread over several Redis servers (the same list on every process)
REDIS_SUB_URLS=redis://subs-1:6379/0,redis://subs-2:6379/0 REDIS_URL=redis://redis:6379/0 ROLE=web node server.js
# or everything with containers
docker compose up -d --scale web=4 --scale push=2
```
