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

Because public reads are cacheable, the origin sees a small, steady load even when millions of people open the app during a flood. Measured on one 2-vCPU machine with Redis, sharing the CPU with the load generator, a single server answered about **19,000 requests per second** for `/api/notices` (median 3 ms, 97.5th percentile 17 ms). A CDN multiplies this by orders of magnitude.

## Building blocks

- **Stateless web servers** (`ROLE=web`, `WORKERS=auto` uses every core). Any number of them run behind a load balancer. They keep nothing locally, so a server can be replaced at any moment.
- **Shared storage: Redis** (`REDIS_URL`). It holds subscriptions with **targeting indexes** (one set per country, region/state and whole-country follower, plus a geo index for followed points), notices, contributions, rate-limit counters (shared, so limits hold across servers), the audit stream and the push job queue.
- **Push senders** (`ROLE=push`). One notice is split into batches of 500 phones. Every sender takes batches from the shared queue, so delivery speed grows with the number of senders. Phones that uninstalled are removed automatically (HTTP 404/410 from the push service).
- **Weather poller and data feeds**. Only one process runs each outside feed (Google Weather, Open-Meteo, GDACS, official CAP warnings, satellite scenes): a Redis lock per feed elects it, and another process takes over if it stops. Run them on the push tier (`ROLE=push`). Outside services are called once per feed run, never once per visitor; every server answers from the shared summaries in Redis, and the CDN caches those for a minute.
- **Weather for the whole world**. The free Open-Meteo service allows under 10,000 calls a day, enough for a few hundred places. For every place on Earth, run your own Open-Meteo servers (open source; the model data is mirrored on AWS Open Data, `s3://openmeteo`) in two regions and point `OPEN_METEO_*_URL` at them, then raise `FEED_PLACES` to 7,300 and `BASELINE_PER_RUN` to 200.
- **Maps**. The street map and buildings are PMTiles files on object storage behind the CDN (`maps/`): no tile servers to scale. Until those are hosted, the app uses OpenFreeMap and AWS Terrain Tiles (`MAP_TILES_URL`, `TERRAIN_TILES_URL`).
- **Flood projections** run on each visitor's own device (about 3 seconds of computing for a 6 km area), so millions of projections add no load to Open Tracker's servers; only the ground-height tiles are fetched, from a CDN.
- **Health and deploys**. `/healthz` (process alive) and `/readyz` (storage reachable) feed load balancers and orchestrators. On `SIGTERM` a server stops taking new requests, finishes the ones in flight and exits, so rolling deploys drop nothing.

## Reference setup for a global audience

1. **DNS and CDN**: anycast DNS and a CDN (Cloudflare, Fastly, CloudFront, Akamai) in front of everything. Cache `/`, static files and the three public API reads. Pass `POST` and authenticated requests through.
2. **Regions**: run the web tier in at least three regions (for example West Africa, Europe and the Americas), with health-checked failover between them.
3. **Web tier**: autoscale on CPU (target about 60%), at least 3 instances per region across availability zones.
4. **Redis**: a managed, replicated Redis with automatic failover in each region (Redis Cluster, ElastiCache, Memorystore or Azure Cache). Turn persistence on (AOF). Subscriptions are the only large dataset: about 1 KB each, so 100 million subscribers need about 100 GB of memory across shards.
5. **Push tier**: autoscale on queue length (`LLEN ot:pushq`). At about 50 concurrent requests per sender and 50–100 ms per push-service call, one sender delivers 500–1,000 notifications per second. 100 senders deliver about 3–6 million per minute.
6. **Agency and admin traffic** is low and goes straight to the origin.
7. **Observability**: collect logs, request rates, error rates, queue length and delivery counts (`/api/sent` shows delivered and failed per notice). Alert on error-rate and queue-age thresholds.
8. **Load testing**: before each flood season, replay a surge (for example 50 times normal traffic for one hour) against a staging copy behind the same CDN settings.

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
REDIS_URL=redis://redis:6379/0 ROLE=push PUSH_CONCURRENCY=100 node server.js
# or everything with containers
docker compose up -d --scale web=4 --scale push=2
```
