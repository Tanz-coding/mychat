# News Module Design

## Overview
The news module augments the existing chat experience with editorial features while leaving all chat behaviours intact. The backend introduces MySQL for relational persistence and Redis for low-latency caching and throttling. This document summarises the schema, relationships, cache structures, and data access patterns required to satisfy the database lab rubric.

## Entity Relationship Summary
Entities and relationships are designed for many-to-one and one-to-many associations aligned with the requirements. The ER diagram can be described textually as:

- `users` (1) ──<(∞) `news`
- `users` (1) ──<(∞) `comments`
- `news_categories` (1) ──<(∞) `news`
- `news` (1) ──<(∞) `comments`
- `news` (1) ──<(∞) `news_attachments`
- `news` (1) ──<(∞) `news_metrics`
- `users` (1) ──<(∞) `news_audit_log`

Additional supporting tables include `news_metrics` (aggregated counters) and `news_audit_log` (administrative actions). Foreign keys enforce referential integrity, cascade deletes on child tables, and drive JOIN-based queries.

## Table Specifications

### users
Stores all application accounts (chat + news). Existing NeDB data remains for historical chat records; new user metadata for the news feature resides here and may be synchronised from the chat login flow.

| Column            | Type               | Attributes                          | Notes                           |
|-------------------|--------------------|-------------------------------------|---------------------------------|
| `id`              | BIGINT UNSIGNED    | PK, AUTO_INCREMENT                  | Acts as canonical user id       |
| `username`        | VARCHAR(64)        | UNIQUE, NOT NULL                    | Login/display name              |
| `password_hash`   | VARCHAR(255)       | NOT NULL                            | Argon2/BCrypt hash              |
| `role`            | ENUM('user','admin') | DEFAULT 'user'                     | Admin user uses value `admin`   |
| `avatar_url`      | VARCHAR(255)       | NULL                                | Optional profile image          |
| `email`           | VARCHAR(128)       | NULL                                | For notification expansion      |
| `created_at`      | DATETIME           | DEFAULT CURRENT_TIMESTAMP           |                                 |
| `updated_at`      | DATETIME           | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

Indexes: UNIQUE on `username`, regular index on `role`.

### news_categories

| Column        | Type             | Attributes                          |
|---------------|------------------|-------------------------------------|
| `id`          | INT UNSIGNED     | PK, AUTO_INCREMENT                  |
| `name`        | VARCHAR(64)      | UNIQUE, NOT NULL                    |
| `description` | VARCHAR(255)     | NULL                                |
| `created_at`  | DATETIME         | DEFAULT CURRENT_TIMESTAMP           |
| `updated_at`  | DATETIME         | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |

### news

| Column          | Type               | Attributes                                              |
|-----------------|--------------------|---------------------------------------------------------|
| `id`            | BIGINT UNSIGNED    | PK, AUTO_INCREMENT                                      |
| `title`         | VARCHAR(200)       | NOT NULL, FULLTEXT                                      |
| `slug`          | VARCHAR(220)       | UNIQUE, NOT NULL                                        |
| `summary`       | VARCHAR(500)       | NULL                                                    |
| `content`       | LONGTEXT           | NOT NULL                                                |
| `author_id`     | BIGINT UNSIGNED    | NOT NULL, FK → `users.id` ON DELETE CASCADE             |
| `category_id`   | INT UNSIGNED       | NOT NULL, FK → `news_categories.id` ON DELETE RESTRICT  |
| `status`        | ENUM('draft','published','archived') | DEFAULT 'published'                 |
| `cover_image`   | VARCHAR(255)       | NULL                                                    |
| `published_at`  | DATETIME           | DEFAULT CURRENT_TIMESTAMP                               |
| `created_at`    | DATETIME           | DEFAULT CURRENT_TIMESTAMP                               |
| `updated_at`    | DATETIME           | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP   |

Indexes: composite index `(category_id, published_at DESC)` for filtering; secondary index on `published_at`; FULLTEXT on `title`, `summary`, `content` for keyword search in InnoDB (MySQL 5.7+).

### news_attachments

| Column        | Type               | Attributes                                       |
|---------------|--------------------|--------------------------------------------------|
| `id`          | BIGINT UNSIGNED    | PK, AUTO_INCREMENT                               |
| `news_id`     | BIGINT UNSIGNED    | FK → `news.id` ON DELETE CASCADE                 |
| `filename`    | VARCHAR(255)       | NOT NULL                                         |
| `file_path`   | VARCHAR(255)       | NOT NULL                                         |
| `file_type`   | VARCHAR(32)        | NOT NULL                                         |
| `file_size`   | BIGINT             | NOT NULL                                         |
| `uploaded_at` | DATETIME           | DEFAULT CURRENT_TIMESTAMP                        |

### comments

| Column        | Type               | Attributes                                       |
|---------------|--------------------|--------------------------------------------------|
| `id`          | BIGINT UNSIGNED    | PK, AUTO_INCREMENT                               |
| `news_id`     | BIGINT UNSIGNED    | FK → `news.id` ON DELETE CASCADE                 |
| `user_id`     | BIGINT UNSIGNED    | FK → `users.id` ON DELETE CASCADE                |
| `content`     | TEXT               | NOT NULL                                         |
| `created_at`  | DATETIME           | DEFAULT CURRENT_TIMESTAMP                        |
| `updated_at`  | DATETIME           | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |
| `is_deleted`  | TINYINT(1)         | DEFAULT 0                                        |

Indexes: `(news_id, created_at)` for timeline display.

### news_metrics
Stores derived statistics.

| Column         | Type               | Attributes                                    |
|----------------|--------------------|-----------------------------------------------|
| `news_id`      | BIGINT UNSIGNED    | PK, FK → `news.id` ON DELETE CASCADE          |
| `view_count`   | BIGINT UNSIGNED    | DEFAULT 0                                     |
| `comment_count`| BIGINT UNSIGNED    | DEFAULT 0                                     |
| `like_count`   | BIGINT UNSIGNED    | DEFAULT 0                                     |
| `score`        | DOUBLE             | DEFAULT 0.0                                   |
| `updated_at`   | DATETIME           | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |

### news_audit_log
Captures administrator actions for compliance.

| Column        | Type               | Attributes                                       |
|---------------|--------------------|--------------------------------------------------|
| `id`          | BIGINT UNSIGNED    | PK, AUTO_INCREMENT                               |
| `admin_id`    | BIGINT UNSIGNED    | FK → `users.id` ON DELETE SET NULL               |
| `action`      | VARCHAR(64)        | NOT NULL                                         |
| `target_id`   | BIGINT UNSIGNED    | NULL                                             |
| `target_type` | VARCHAR(32)        | NOT NULL                                         |
| `metadata`    | JSON               | NULL                                             |
| `created_at`  | DATETIME           | DEFAULT CURRENT_TIMESTAMP                        |

## Redis Data Structures

| Key Pattern | Type | Purpose |
|-------------|------|---------|
| `mychat:news:hot:zset` | Sorted Set | Rank news by dynamic score (comment_count × weight + view_count × weight) |
| `mychat:news:recent:list` | List | Cache the latest N published news payloads |
| `mychat:news:news:{id}` | Hash | Cache full news details (expires after refresh) |
| `mychat:news:comments:{newsId}` | List | Optional cache snapshot of latest comments |
| `mychat:news:rate:{ip}` | String (counter) | Track request counts for rate limiting |
| `mychat:news:metrics:views` | Hash | Incremental view counters before flushing to MySQL |

Cache invalidation occurs on publish/update/delete, aligning with service events.

## Stored Queries & JOIN Usage
- Fetch paginated news list with author + category: JOIN `news` → `users` → `news_categories` with dynamic filters.
- Detail view: join `news`, `users`, aggregated `news_metrics`, attachments, and optionally cached comment summaries.
- Comments listing: join `comments` with `users` filtered by `news_id`.
- Statistics: group by `category_id` for counts; group by `author_id` for per-user submissions; computed views exposed to the optional AI reporter.

## Pagination & Performance
Use cursor-based pagination with `(published_at, id)` or standard OFFSET/LIMIT backed by indexes. Redis caches hot and recent lists to avoid repeated MySQL scans. Batched updates push Redis counters to MySQL on a schedule (worker process).

## Security & Roles
JWT tokens include `userId`, `username`, and `role`. Express middleware validates tokens and populates `req.user`. Role checks gate admin endpoints. Audit log records admin deletions, category maintenance, and metric recalculations.

## Testing & Validation Strategy
- Unit tests for services (MySQL queries, Redis cache wrappers).
- API tests covering CRUD, permission checks, search filters, pagination.
- Load test scenario documented for ≥100k row dataset with caching enabled/disabled to produce performance comparison for the lab report.

## Open Considerations
- Synchronising chat-only users into MySQL can be handled lazily during first login by upserting via socket handshake callback.
- Optional AI report generation leverages the aggregated statistics endpoints and can be enabled via `config.json`.
