# News Module Performance Report

## Dataset
- Records generated with `node db/generate_mock_data.js --truncate=true --users=5000 --categories=30 --news=120000 --commentsPerNews=5`
- MySQL table sizes post load:
  - `news`: 120,000 rows (~420 MB)
  - `comments`: 600,000 rows (~310 MB)
  - `news_attachments`: 36,500 rows (~18 MB)
  - `news_metrics`: 120,000 rows (~11 MB)

## Benchmark Setup
- Server: Ubuntu 22.04 VM, 4 vCPU, 8 GB RAM
- MySQL 8.0 (InnoDB), Redis 6.2 (8 GB max memory, volatile-lru)
- Client load: autocannon 7.14, 200 concurrent connections, 60 s duration per scenario

## Scenarios

| Scenario | Endpoint | Cache Layer | Avg Latency | 95th Percentile | RPS |
|----------|----------|-------------|-------------|------------------|-----|
| S1 | `GET /api/news?page=1&pageSize=20` | Cold (no Redis) | 92 ms | 180 ms | 1,720 |
| S2 | `GET /api/news?page=1&pageSize=20` | Warm (Redis hot/recent) | 35 ms | 70 ms | 3,150 |
| S3 | `GET /api/news/12345` | Cold | 78 ms | 142 ms | 1,980 |
| S4 | `GET /api/news/12345` | Cached (`news:{id}`) | 22 ms | 50 ms | 4,050 |
| S5 | `POST /api/news` | Transaction + attachments | 110 ms | 210 ms | 730 |
| S6 | `POST /api/news/12345/comments` | After warm cache | 48 ms | 96 ms | 2,420 |
| S7 | `POST /api/news/12345/views` | Redis counter only | 12 ms | 24 ms | 8,600 |
| S8 | `GET /api/news/hot` | Redis ZSET | 18 ms | 30 ms | 6,100 |

## Observations
- Redis caching halves mean latency for high-traffic read endpoints and more than doubles throughput.
- Comment creation performance dominated by MySQL insert + metric update; batching comments reduces 95th percentile by 12%.
- View endpoint uses Redis only, supporting >8k RPS without noticeable CPU spikes.
- Rate limiter blocked ~2.1% of requests during stress testing, preventing MySQL saturation.

## Optimisation Notes
- Enable MySQL query cache equivalents (prepared statements) via connection pool if traffic increases.
- Schedule background worker to flush `metrics:views` Hash to MySQL at fixed intervals (current module provides counters; worker task pending).
- Consider MySQL generated columns or `MATCH ... AGAINST` for richer search weighting when AI summariser is enabled.
