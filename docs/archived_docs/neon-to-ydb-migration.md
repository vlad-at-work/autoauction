# Postgres (Neon on Vercel) → Yandex Managed Service for YDB (YQL) Migration Guide

## Context and constraints

### Executive summary

This guide describes a production-grade migration path from **Postgres on entity["company","Neon","serverless postgres provider"] (currently used by a web app deployed on entity["company","Vercel","web hosting platform"])** to **Yandex Managed Service for YDB** (a distributed SQL database where the primary query language is **YQL**, _not_ PostgreSQL). The migration is primarily a **data model and access pattern redesign**, not a “change drivers and keep the schema” exercise, because YDB’s performance and operational behavior depend heavily on primary-key design, partition locality, and deliberate use of secondary indexes. citeturn8view1turn0search12turn19view4turn19view3

The target platform in **entity["company","Yandex Cloud","cloud provider"]** is explicitly designed for **high availability, horizontal scaling, strict consistency and ACID transactions**, with **serializable isolation** available by default for high-integrity OLTP patterns. citeturn8view1turn19view5turn19view3

Your current Postgres schema (provided as a Prisma schema) includes core entities such as **Buyer, Dealer, Inquiry, Offer, Transaction, PasswordResetCode**, with soft-deletes (`deletedAt`), uniqueness constraints, and common “relational” lookup expectations (e.g., by foreign keys, by timestamps, by compound indexes). fileciteturn0file0

The long-term successful outcome is to:

- Treat **YDB primary keys** as the core of your performance model (partitioning, range scans, pagination).
- Use **secondary indexes** sparingly and intentionally (and understand sync vs async semantics).
- Enforce many “relational constraints” (non-key NOT NULL, foreign keys, cascades) in application logic, and selectively via **unique secondary indexes** where appropriate. citeturn19view4turn15view5turn17view5turn8view3

### Operating assumptions and invariants (explicit)

Assumptions (state if wrong, but they do not block the architecture):

- **Workload shape**: inquiry creation and inquiry/offer browsing are the dominant OLTP paths; analytics/reporting is secondary.
- **Entities and flows**: phone-based login, inquiry creation by users, dealer replies, and notification logging for bot/messenger channels (including entity["company","Telegram","messaging platform"]). (No new web research exists for “MAX messenger” specifics; it is treated as an external notification/auth channel.)
- **Deployment**: app remains on Vercel during the migration (latency and egress become part of the risk register).
- **Scale unknown**: schema and key design prefer “safe” distribution patterns to avoid hot partitions even if volume grows.

Non-negotiable constraints from YDB/YQL behavior:

- Row-oriented tables are **sorted by primary key**, and range queries by key or key prefix are efficient; key choice and ordering drives partitioning and performance. citeturn19view4turn3search20
- YDB’s own guidance warns against **monotonically increasing primary keys** (like raw timestamps) as the main key component and promotes “one query — one partition” thinking. citeturn19view3turn3search4
- Some “standard RDBMS constraints” are limited: for example, **NOT NULL is currently only applicable to columns that are part of the primary key** (for tables documented in YDB’s table model). citeturn4search20turn19view4
- Many OLTP-style YQL result sets are effectively bounded (e.g., YQL FAQ notes a **1000-row response size limit** for typical YQL queries; large reads should use pagination or `ReadTable`, and scan queries are a separate streaming interface). citeturn7search1turn7search2turn7search0

### “What to build / change” checklist

This checklist is intentionally “deliverable-oriented” (what engineering must actually implement).

**Platform and tooling**

- Provision a YDB database (serverless vs dedicated), and establish IAM roles/service accounts for app + migration tooling. citeturn14search22turn5search13turn1search5turn1search32
- Stand up a local dev environment (Docker local YDB) for schema + query iteration. citeturn9search0turn9search12turn9search4
- Add CI checks: schema creation scripts, a smoke-test query suite, and migration replay tests.

**Data model and query layer**

- Redesign schemas using YDB primary key rules; define required secondary indexes explicitly. citeturn19view3turn6search1turn17view5
- Implement an application DB adapter (repository layer) that replaces Postgres ORM semantics (Prisma/Drizzle/raw SQL) with YDB client patterns (transactions, retries, keyset pagination). citeturn15view3turn15view2turn8view2turn7search0
- Implement **idempotency keys** (especially for inquiry creation, offer creation, notification sends) to survive retries and dual-write windows. citeturn15view2turn15view3turn15view1

**Migration execution**

- Choose a phased migration plan with backfill + dual writes + cutover + rollback hooks.
- Build data validation harness (counts, sampling, invariants, and unique checks).

**Ops and security**

- Configure backups and recovery procedures (YDB CLI export/import, plus managed backups where applicable). citeturn19view0turn19view1turn2search6turn2search23
- Configure TTL for ephemeral/auth tables and log retention. citeturn19view2turn2search4turn2search10
- Adopt secrets management (entity["company","Yandex","technology company"] entity["company","Yandex Lockbox","secrets management service"]) and network controls (security groups). citeturn10search6turn10search10turn9search3turn5search4

## Target DB identification and capabilities

### What exactly is “Yandex Managed DB (YQL)”?

In entity["company","Yandex Cloud","cloud provider"], the managed database product that uses **YQL** as its SQL dialect is:

- **Yandex Managed Service for YDB** (Managed Service for YDB). citeturn8view1turn2search13

This service provides **YDB**, described in official materials as a distributed fault-tolerant SQL DBMS with strict consistency and ACID transaction support, with queries expressed in **YQL**. citeturn8view1turn19view3turn0search12

Important distinction:

- **Yandex Query** is a separate managed service for running queries (analytics/federated scenarios) that is “based on YDB external tables”. It uses the YDB SDK to execute queries, but it is not itself “the OLTP database” for your app’s production state. citeturn1search4turn5search15

### APIs, SDKs, protocols, authentication

**Protocols / endpoints**

- YDB is accessed primarily via **gRPC** (and “gRPC over TLS”, often expressed as `grpcs://...`). Connection strings identify endpoint + database path. citeturn17view1turn11view3turn5search4
- In Yandex Cloud serverless mode, YDB also supports an **Amazon DynamoDB-compatible HTTP Document API** for “document tables” (useful for some access patterns, but your target is explicitly YQL/YDB relational tables). citeturn11view4turn3search2

**SDKs**

- YDB provides open-source SDKs in multiple languages, including Node.js, and there is an actively documented JavaScript/TypeScript SDK. citeturn1search3turn8view0turn17view0

For a Vercel-based web app, the practical path is:

- Use the **YDB JS SDK** (e.g., `@ydbjs/core` + `@ydbjs/query`) and build a repository layer over it. citeturn15view3turn17view0

**Authentication**

- For YDB in Yandex Cloud, authentication integrates with Yandex Cloud IAM (service accounts, IAM tokens, etc.). citeturn1search2turn1search5turn1search32
- The YDB JS SDK supports token-based auth and other strategies via credential providers. citeturn17view0turn17view3

### Tooling: CLI, console, local development

**CLI and console**

- Yandex Cloud documents the **YDB CLI** usage and how to obtain endpoint/path. citeturn11view3turn5search4

**Local development**

- YDB provides a “Quick Start” for installing a **single-node local cluster** and running queries, and there are official Docker startup instructions plus a published Docker image (`ydbplatform/local-ydb`). citeturn9search0turn9search12turn9search4

### YQL dialect and key limitations

YQL is described as:

- An SQL dialect for distributed DB operation, and **it differs in some details** from standard SQL. citeturn0search12turn13search16

Practical constraints you must design around:

- Tables are sorted by primary key; pagination is expected to be **keyset**-style (not OFFSET). citeturn19view4turn19view3turn8view4
- Secondary indexes require explicit use via `VIEW` in `SELECT` to avoid full scans. citeturn6search1turn12search16
- Sync vs async indexes differ materially: async indexes provide eventual consistency and are only usable under stale read-only semantics. citeturn15view5turn12search0
- Result size limits exist in the common YQL interface (use pagination or scan queries/ReadTable for large outputs). citeturn7search1turn7search2turn7search5

## Data modeling principles for YQL

This section provides the **relational → YDB/YQL mapping rules** you’ll apply to every entity and relationship.

### Primary keys, partitioning, and “table-as-index” thinking

**Documented facts**

- Every table must have at least one primary key column; row-oriented tables are always **sorted by the primary key**. citeturn19view4
- Row-oriented tables are partitioned by **primary key ranges**, and shards may split/merge over time; partitions can move to rebalance or recover. citeturn19view4
- YDB recommends avoiding hot partitions and avoiding a monotonically increasing sequence (like a raw timestamp) as the primary key. citeturn19view3turn3search4

**Inferred best practice (explicit inference)**

- Treat the table’s **primary key as your “main clustered index + partition key”**. In Postgres you often add indexes later; in YDB you model primary keys first to match access patterns and avoid distributed transaction overhead.

**Practical guidance for this app**

- For “list-by-owner” patterns (buyer → inquiries; inquiry → offers; dealer → offers), design keys so that:
  1. the query constrains a high-cardinality prefix (often a hash bucket + the owner id), and
  2. the sort order supports stable pagination (createdAt + id tiebreaker).  
     This aligns with YDB’s own pagination guidance (“sorted by primary key sequentially”). citeturn8view4turn19view3turn7search0

### Secondary indexes: when to use, and what they cost

**Documented facts**

- Secondary indexes are global structures for accelerating queries by non-primary-key fields; they must be specified via `VIEW` to be used. citeturn6search1turn12search16
- **Synchronous** indexes update simultaneously with the table and require distributed transactions; **asynchronous** indexes update in the background and provide eventual consistency. citeturn15view5turn12search4turn12search0
- There is a **unique secondary index** option that enforces uniqueness and aborts violating writes with `PRECONDITION_FAILED`. A limitation is that unique indexes “cannot be added to an existing table” (must exist at creation time, per docs). citeturn8view3turn15view5turn17view5
- Index operations contribute to RU cost in serverless mode, and updates imply extra index writes. citeturn15view0turn3search2

**Inferred best practice**

- Prefer modeling common “list” queries as primary-key range scans rather than relying on many indexes, because sync indexes push writes into distributed-transaction paths and increase cost/latency. citeturn15view5turn12search4turn19view3

### Relationships: mapping 1:1, 1:N, N:M

YDB supports SQL queries and joins, but for OLTP at scale you should assume you must **avoid cross-partition fan-out joins** in the hottest paths (inference) and instead model relationships through key design and read patterns.

Patterns:

**One-to-one**

- Keep a single table keyed by the stable identity (e.g., `user_id`), and store the profile fields in the same row unless the profile is huge or very rarely accessed.

**One-to-many**

- Create a child table keyed by `(parent_locator, sort_key, child_id)` so “list children by parent” is a range scan.

**Many-to-many**

- Use an explicit join table (association table) keyed to support the most common direction:
  - If querying “dealers for inquiry” is common, make PK begin with inquiry.
  - If querying “inquiries for dealer” is common, maintain a second “reverse index table” (denormalized association) rather than relying entirely on secondary indexes.

### Constraints and integrity: what exists, what you must enforce

**Documented facts**

- Primary keys uniquely identify rows, and row-oriented tables are sorted by them. citeturn19view4
- Unique secondary indexes can enforce uniqueness (with write abort on violation). citeturn15view5turn8view3
- NOT NULL constraints are documented as only applicable to primary key columns (in the described table model). citeturn4search20turn19view4

**Important operational implication (partly inferred)**

- You must enforce most “relational invariants” (required-field validation, referential existence, cascade deletes/updates) at the application layer, and optionally via:
  - unique secondary indexes for “must be unique” fields, and/or
  - transactionally maintained “lookup tables” (e.g., email → userId) to approximate uniqueness and lookup without many indexes.

A supporting signal from Yandex Data Transfer operations: troubleshooting guidance explicitly recommends creating target tables “with a Primary key and without a Foreign key” for some transfer flows. While this is transfer-focused (not a definitive full-feature statement), it reinforces that you should not rely on foreign keys as the central integrity mechanism in the target. citeturn18view0

### Transaction model, isolation, and consistency trade-offs

**Documented facts**

- YDB supports distributed ACID transactions affecting multiple records in different tables and provides **serializable isolation** (and allows lowering isolation for performance). citeturn19view5
- The YDB JS SDK defaults to serializable read-write in its transaction helpers and supports snapshot read-only as an option. citeturn15view3
- Index type and transaction mode interact: async indexes are eventual consistency; sync/unique indexes are aligned with strict consistency and distributed transaction semantics. citeturn15view5turn12search0

**Patterns to avoid (inferred, grounded in documented mechanics)**

- Large multi-table transactions that touch many partitions/shards in “fan-out” fashion; they increase coordination overhead (because sync indexes and multi-partition writes induce distributed transaction behavior). citeturn15view5turn12search4turn19view3
- OFFSET-based pagination; YDB explicitly discourages OFFSET for pagination in its FAQ. citeturn19view3turn8view4

## Proposed schema (Option A / Option B / recommended)

This section provides two alternative schema designs and then a **recommended canonical schema** (deliverable-required), including table lists, columns/types, keys/indexes, and access patterns.

### Existing Postgres entities (baseline)

Your current Postgres (Neon) schema includes at minimum:

- Buyer (including inquiry limits and platform identifiers)
- Inquiry (with buyerId; status, location, timestamps; soft delete)
- Dealer (including platform identifiers; profile attributes; soft delete)
- Offer (links inquiryId + dealerId; status; soft delete; indexes)
- Transaction (links buyerId + dealerId + offerId; amounts; unique constraints; soft delete)
- PasswordResetCode (email-based codes)
- Platform enum (Telegram, MAX)  
  fileciteturn0file0

The migration goal is to translate this into YDB-native modeling that supports:

- Fast point reads by `id`
- Efficient “list by owner” queries with keyset pagination
- Strict integrity for key invariants (uniqueness and state transitions)
- Sustainable RU cost and avoidance of hot partitions.

### Option A: “Relational-like” normalized model (single source of truth + indexes)

**Design intent**

- Keep one “main” table per entity keyed by `id`.
- Use secondary indexes for “foreign key” lookups and secondary access patterns.

**Pros**

- Conceptually closest to Postgres and ORMs.
- Minimal duplication of entity fields.
- Easier to reason about single-row updates by stable `id`.

**Cons (documented constraints and implied costs)**

- Queries that filter by non-PK fields require either full scan or explicit index usage (`VIEW`). citeturn6search1turn12search16
- Synchronous indexes can increase write cost/latency via distributed transactions. citeturn15view5turn12search4turn15view0
- Many OLTP applications end up creating many indexes, which directly increases write amplification and RU charges. citeturn15view0turn3search2

**When Option A is acceptable**

- Lower write volume.
- Limited number of “list-by” access patterns.
- You can tolerate extra RU cost and some added latency.

### Option B: Access-pattern-oriented / denormalized “read models” (recommended direction)

**Design intent**

- Maintain:
  1. “Entity-by-id” tables keyed by `id`, and
  2. additional “read model” tables keyed to serve your hottest list queries via primary-key range scans.
- Use **transactions** to keep entity tables and read models consistent on writes.

**Pros**

- Hottest “list” queries become efficient PK prefix/range scans (aligned with YDB guidance). citeturn19view4turn19view3turn8view4
- Reduced reliance on sync secondary indexes (which induce distributed transaction overhead). citeturn15view5turn12search4
- Predictable pagination and sorting (primary key defines order). citeturn19view4turn8view4

**Cons**

- More tables and duplicated fields.
- More write complexity (must update multiple tables per logical operation).
- Requires careful idempotency and retry-safe design (because retries are first-class in YDB). citeturn15view2turn15view1turn15view3

### Recommended canonical schema proposal

This is the “reference schema” that balances OLTP correctness with YDB’s data-model behavior.

#### Naming, key and type conventions

**IDs**

- Keep IDs as `Utf8` (string IDs such as CUID/UUID) for continuity and simplicity (assumption supported by existing schema using string IDs). fileciteturn0file0

**Time**

- Use `Timestamp` for event ordering (`created_at`, `updated_at`, etc.).

**Soft delete**

- Keep `deleted_at` as `Timestamp?` (optional) for compatibility with your current soft-delete practice. fileciteturn0file0

**Hash buckets to avoid hot partitions (inference, based on YDB guidance)**

- Add `bucket` columns (e.g., `Uint32`) computed as a stable hash mod N for “list-by-owner” tables, so the leading key component is not a monotonic timestamp and not a single hot owner key. This is aligned with YDB’s guidance to avoid monotonically increasing keys and to use hashes for better distribution. citeturn19view3turn3search4

#### Table list with columns/types, keys/indexes, and access patterns

Below is the canonical list. Each table includes:

- **PK**: primary key columns (in order)
- **Indexes**: secondary indexes (only where justified)
- **Access patterns**: what queries it is designed to serve efficiently

##### users

**Purpose**: identity for phone-authenticated end-users (your “Buyer” concept becomes a general user).

Columns (suggested):

- `user_id Utf8` (key)
- `platform Platform` (optional enum-as-Utf8, or separate columns per platform) _(assumption)_
- `platform_user_id Utf8` (e.g., Telegram user id, MAX user id)
- `phone_e164 Utf8`
- `created_at Timestamp`
- `updated_at Timestamp`
- `deleted_at Timestamp?`
- `inquiries_used_this_period Uint32`
- `inquiry_limit_reset_at Timestamp`

PK:

- `(user_id)`

Indexes:

- `UNIQUE` secondary index on `(platform, platform_user_id)` if you require uniqueness across platforms. Use unique secondary index semantics for proper enforcement. citeturn15view5turn17view5

Access patterns:

- Get user by `user_id` (point read).
- Lookup user by `(platform, platform_user_id)` (unique-index point read).
- Lookup user by `phone_e164` (optional: unique index if needed).

##### dealers

Columns:

- `dealer_id Utf8` (key)
- `platform Platform`
- `platform_user_id Utf8`
- `phone_e164 Utf8?`
- `name Utf8`
- `city Utf8?`
- `is_verified Bool`
- `created_at Timestamp`
- `updated_at Timestamp`
- `deleted_at Timestamp?`

PK:

- `(dealer_id)`

Indexes:

- Optional unique index on `(platform, platform_user_id)` (same motivation as users). citeturn15view5turn17view5

Access patterns:

- Get dealer by id.
- Lookup dealer by platform id.

##### dealer_profiles

(If profiles are large or frequently joined; otherwise merge into `dealers`)

Columns:

- `dealer_id Utf8` (key)
- `description Utf8?`
- `rating Double?`
- `rating_count Uint32?`
- `updated_at Timestamp`

PK:

- `(dealer_id)`

Access patterns:

- Fetch profile details by dealer id.

##### inquiries

Columns:

- `inquiry_id Utf8` (key)
- `user_id Utf8`
- `status Utf8` (or enum-as-Utf8)
- `city Utf8`
- `has_location Bool`
- `created_at Timestamp`
- `updated_at Timestamp`
- `expires_at Timestamp?`
- `deleted_at Timestamp?`
- `payload JsonDocument?` (optional “details blob” if you want flexible attributes)

PK:

- `(inquiry_id)`

Indexes:

- Optional non-unique index on `(user_id, created_at)` if you insist on single-table listing; however the recommended approach is a read-model table (below). If used, remember `VIEW` is required for indexed reads. citeturn6search1turn12search16

Access patterns:

- Point read by inquiry id.
- Update status by inquiry id.

##### user_inquiries

**Read model**: “list inquiries by user” with strong pagination.

Columns:

- `bucket Uint32`
- `user_id Utf8`
- `created_at Timestamp`
- `inquiry_id Utf8`
- `status Utf8`
- `city Utf8`
- `deleted_at Timestamp?`

PK:

- `(bucket, user_id, created_at, inquiry_id)`

Access patterns:

- List inquiries for a user ordered by created_at (keyset pagination on `(created_at, inquiry_id)`), consistent with YDB recommended pagination by primary key. citeturn8view4turn19view3

##### offers

Columns:

- `offer_id Utf8` (key)
- `inquiry_id Utf8`
- `dealer_id Utf8`
- `status Utf8`
- `details Utf8?`
- `price Int64?`
- `created_at Timestamp`
- `updated_at Timestamp`
- `deleted_at Timestamp?`

PK:

- `(offer_id)`

Indexes:

- Optional unique index (if you need to enforce “only one active offer per dealer per inquiry”, etc.). If not required, omit.
- Consider a non-unique index on `(inquiry_id, dealer_id)` only if you require that lookup directly on this table; otherwise use `inquiry_offers` read model.

Access patterns:

- Point read and updates by offer id.

##### inquiry_offers

**Read model**: list offers for an inquiry

Columns:

- `bucket Uint32`
- `inquiry_id Utf8`
- `created_at Timestamp`
- `offer_id Utf8`
- `dealer_id Utf8`
- `status Utf8`
- `price Int64?`

PK:

- `(bucket, inquiry_id, created_at, offer_id)`

Access patterns:

- List offers for inquiry (fast range scan + pagination).

##### dealer_offers

**Read model**: list offers for a dealer (dealer inbox)

Columns:

- `bucket Uint32`
- `dealer_id Utf8`
- `created_at Timestamp`
- `offer_id Utf8`
- `inquiry_id Utf8`
- `status Utf8`

PK:

- `(bucket, dealer_id, created_at, offer_id)`

Access patterns:

- Dealer inbox, sorted and paginated.

##### transactions

Columns:

- `transaction_id Utf8` (key)
- `offer_id Utf8`
- `inquiry_id Utf8`
- `user_id Utf8`
- `dealer_id Utf8`
- `amount Int64`
- `platform_fee Int64`
- `status Utf8`
- `created_at Timestamp`
- `updated_at Timestamp`
- `deleted_at Timestamp?`

PK:

- `(transaction_id)`

Indexes:

- `UNIQUE` secondary index on `(offer_id)` to enforce the invariant “one transaction per offer” (mirrors your existing Postgres constraint). citeturn15view5turn17view5
- If you require “one transaction per (inquiry_id, dealer_id)”, use a unique index on `(inquiry_id, dealer_id)`.

Access patterns:

- Fetch transaction by id.
- Fetch transaction by offer id.

##### auth_phone_verifications

**Ephemeral** phone code verification state; use TTL.

Columns:

- `phone_e164 Utf8` (key)
- `code_hash Utf8`
- `attempts Uint32`
- `created_at Timestamp`
- `expires_at Timestamp`

PK:

- `(phone_e164)`

TTL:

- Delete rows automatically after `expires_at` (+ grace) using TTL settings. citeturn19view2turn2search4

Access patterns:

- Create/update verification for phone.
- Validate code and increment attempts.

##### sessions

Columns:

- `session_id Utf8` (key)
- `user_id Utf8`
- `created_at Timestamp`
- `expires_at Timestamp`
- `revoked_at Timestamp?`
- `metadata JsonDocument?`

PK:

- `(session_id)`

TTL:

- Auto-expire sessions by `expires_at`. citeturn19view2

Access patterns:

- Validate session token by session_id.
- Optional: list sessions by user (add read model if needed).

##### notification_log

**Outbox-style log** for notifications to Telegram/MAX (and future channels).

Columns:

- `notification_id Utf8` (key)
- `channel Utf8` (e.g., telegram|max|sms)
- `recipient_id Utf8` (platform user id or phone)
- `event_type Utf8`
- `payload JsonDocument`
- `status Utf8` (pending|sent|failed)
- `attempts Uint32`
- `created_at Timestamp`
- `updated_at Timestamp`
- `next_retry_at Timestamp?`

PK:

- `(notification_id)`

Access patterns:

- Write once per logical notification request (idempotent).
- Worker scans “pending by next_retry_at” (requires read model or index; recommended: a `pending_notifications` table keyed by `(bucket, next_retry_at, notification_id)`).

##### audit_events

**Immutable audit/event history** (application-level, not cloud audit trails).

Columns:

- `bucket Uint32`
- `entity_type Utf8`
- `entity_id Utf8`
- `event_time Timestamp`
- `event_id Utf8`
- `event JsonDocument`

PK:

- `(bucket, entity_type, entity_id, event_time, event_id)`

TTL:

- Optional retention policy for older events/logs (if business allows). citeturn19view2turn2search4

Access patterns:

- Query events per entity by time range.

##### attachments

Columns:

- `attachment_id Utf8` (key)
- `owner_type Utf8`
- `owner_id Utf8`
- `storage_provider Utf8` (e.g., object storage)
- `storage_key Utf8`
- `content_type Utf8?`
- `size_bytes Uint64?`
- `created_at Timestamp`

PK:

- `(attachment_id)`

Access patterns:

- Fetch attachment metadata by id.
- List attachments by owner (add read model if needed).

## Query cookbook (YQL examples)

This cookbook includes (deliverable-required):

- Table creation examples
- At least 8 representative queries (CRUD + list + filter)
- Pagination patterns aligned with YDB guidance

### DDL examples

#### Create `inquiries` (entity-by-id)

```sql
CREATE TABLE `inquiries` (
  inquiry_id Utf8 NOT NULL,
  user_id Utf8,
  status Utf8,
  city Utf8,
  has_location Bool,
  payload JsonDocument,
  created_at Timestamp,
  updated_at Timestamp,
  expires_at Timestamp,
  deleted_at Timestamp,
  PRIMARY KEY (inquiry_id)
);
```

Notes:

- Primary key columns can be marked `NOT NULL`; other columns are optional by default (and NOT NULL is restricted to key columns in documented behavior). citeturn19view4turn4search20

#### Create `user_inquiries` (read model for listing)

```sql
CREATE TABLE `user_inquiries` (
  bucket Uint32 NOT NULL,
  user_id Utf8 NOT NULL,
  created_at Timestamp NOT NULL,
  inquiry_id Utf8 NOT NULL,
  status Utf8,
  city Utf8,
  deleted_at Timestamp,
  PRIMARY KEY (bucket, user_id, created_at, inquiry_id)
);
```

This table is designed for “select by primary key prefix” range scans and keyset pagination. citeturn19view4turn8view4turn19view3

#### Create `auth_phone_verifications` with TTL

```sql
CREATE TABLE `auth_phone_verifications` (
  phone_e164 Utf8 NOT NULL,
  code_hash Utf8,
  attempts Uint32,
  created_at Timestamp,
  expires_at Timestamp,
  PRIMARY KEY (phone_e164)
) WITH (
  TTL = Interval("PT15M") ON expires_at
);
```

YQL supports TTL configuration via `WITH ( TTL = Interval(...) ON <column> )` at creation time. citeturn19view2turn2search4

#### Create a unique secondary index (example pattern)

```sql
CREATE TABLE `users` (
  user_id Utf8 NOT NULL,
  platform Utf8,
  platform_user_id Utf8,
  phone_e164 Utf8,
  created_at Timestamp,
  updated_at Timestamp,

  INDEX ux_platform_user GLOBAL UNIQUE SYNC ON (platform, platform_user_id),

  PRIMARY KEY (user_id)
);
```

This uses a **unique secondary index**, which enforces uniqueness and aborts violating modifications with `PRECONDITION_FAILED`. citeturn15view5turn17view5turn8view3

### Representative queries

#### Create an inquiry (single-statement upsert into entity table)

```sql
DECLARE $inquiry_id AS Utf8;
DECLARE $user_id AS Utf8;
DECLARE $status AS Utf8;
DECLARE $city AS Utf8;
DECLARE $created_at AS Timestamp;
DECLARE $updated_at AS Timestamp;

UPSERT INTO inquiries (inquiry_id, user_id, status, city, created_at, updated_at)
VALUES ($inquiry_id, $user_id, $status, $city, $created_at, $updated_at);

COMMIT;
```

`UPSERT` updates/inserts by primary key; it is a “blind write” (no pre-read needed), while `INSERT` performs a read to ensure primary-key uniqueness. citeturn8view2turn12search9turn12search3

#### Create an inquiry + update list read model atomically (multi-statement transaction)

```sql
DECLARE $bucket AS Uint32;
DECLARE $user_id AS Utf8;
DECLARE $created_at AS Timestamp;
DECLARE $inquiry_id AS Utf8;
DECLARE $status AS Utf8;
DECLARE $city AS Utf8;

UPSERT INTO inquiries (inquiry_id, user_id, status, city, created_at, updated_at)
VALUES ($inquiry_id, $user_id, $status, $city, $created_at, $created_at);

UPSERT INTO user_inquiries (bucket, user_id, created_at, inquiry_id, status, city)
VALUES ($bucket, $user_id, $created_at, $inquiry_id, $status, $city);

COMMIT;
```

YQL allows multi-statement execution and uses `COMMIT;` as a barrier/commit mechanism. citeturn15view4turn13search1turn19view5

#### Get inquiry by id

```sql
DECLARE $inquiry_id AS Utf8;

SELECT *
FROM inquiries
WHERE inquiry_id = $inquiry_id;
```

Point reads by primary key are efficiently executed because row tables are sorted by primary key. citeturn19view4

#### List inquiries for a user with keyset pagination (recommended)

```sql
DECLARE $bucket AS Uint32;
DECLARE $user_id AS Utf8;
DECLARE $page_size AS Uint64;
DECLARE $last_created_at AS Timestamp;
DECLARE $last_inquiry_id AS Utf8;

SELECT inquiry_id, created_at, status, city
FROM user_inquiries
WHERE bucket = $bucket
  AND user_id = $user_id
  AND (created_at, inquiry_id) > ($last_created_at, $last_inquiry_id)
ORDER BY bucket, user_id, created_at, inquiry_id
LIMIT $page_size;
```

YDB documentation recommends pagination by sequential primary-key ordering with `LIMIT` and explicitly discourages `OFFSET`. citeturn8view4turn19view3turn7search0

#### List offers for an inquiry (read model)

```sql
DECLARE $bucket AS Uint32;
DECLARE $inquiry_id AS Utf8;
DECLARE $page_size AS Uint64;
DECLARE $last_created_at AS Timestamp;
DECLARE $last_offer_id AS Utf8;

SELECT offer_id, dealer_id, created_at, status, price
FROM inquiry_offers
WHERE bucket = $bucket
  AND inquiry_id = $inquiry_id
  AND (created_at, offer_id) > ($last_created_at, $last_offer_id)
ORDER BY bucket, inquiry_id, created_at, offer_id
LIMIT $page_size;
```

#### Enforce uniqueness via unique secondary index (example: create transaction only once per offer)

```sql
DECLARE $transaction_id AS Utf8;
DECLARE $offer_id AS Utf8;
DECLARE $inquiry_id AS Utf8;
DECLARE $user_id AS Utf8;
DECLARE $dealer_id AS Utf8;
DECLARE $amount AS Int64;
DECLARE $platform_fee AS Int64;
DECLARE $created_at AS Timestamp;

UPSERT INTO transactions (transaction_id, offer_id, inquiry_id, user_id, dealer_id, amount, platform_fee, status, created_at, updated_at)
VALUES ($transaction_id, $offer_id, $inquiry_id, $user_id, $dealer_id, $amount, $platform_fee, "created", $created_at, $created_at);

COMMIT;
```

If you define a unique secondary index on `(offer_id)`, violating inserts/updates abort with `PRECONDITION_FAILED`. Client code must handle that as a business-level “already exists”. citeturn15view5turn8view3turn15view1

#### Read by secondary index (explicit VIEW usage)

```sql
DECLARE $platform AS Utf8;
DECLARE $platform_user_id AS Utf8;

SELECT user_id, phone_e164
FROM users VIEW ux_platform_user
WHERE platform = $platform AND platform_user_id = $platform_user_id;
```

Secondary indexes must be used explicitly with `VIEW` to avoid full scans. citeturn6search1turn12search16

#### Update using “read by index then UPDATE ON” pattern

```sql
DECLARE $platform AS Utf8;
DECLARE $platform_user_id AS Utf8;
DECLARE $new_phone AS Utf8;

$to_update = (
  SELECT user_id, $new_phone AS phone_e164
  FROM users VIEW ux_platform_user
  WHERE platform = $platform AND platform_user_id = $platform_user_id
);

UPDATE users ON
SELECT * FROM $to_update;

COMMIT;
```

YDB docs note that UPDATE/UPSERT/REPLACE cannot directly use an index in `WHERE` for modifications and recommend “SELECT by index then UPDATE ON”. citeturn6search1turn13search15

#### TTL maintenance (alter existing table)

```sql
ALTER TABLE `notification_log` SET (TTL = Interval("P90D") ON created_at);
```

TTL can be enabled via `ALTER TABLE ... SET (TTL = ...)`. citeturn19view2turn2search26

## Migration plan (phased)

This plan is designed for production cutover safety and includes rollback strategy.

### Phase 0: Discovery / inventory

Deliverables:

- Full schema inventory (tables, columns, indexes, constraints, row counts, and top queries).
- Identify “access patterns” per entity (read/write paths, required sort orders, required joins).

Actions:

- Extract Postgres DDL and query logs (assumption: you can access Neon query patterns).
- Map every API endpoint to required DB operations (create inquiry, list by user, dealer response submission, etc.).
- Establish acceptable consistency for each read:
  - Strongly consistent (must see writes immediately)
  - Snapshot consistent
  - Stale acceptable (rare for user-facing core flows)

This step guides whether you can use async indexes (stale) versus sync indexes (strict). citeturn15view5turn12search0turn15view3

### Phase 1: Target schema + adapters

Deliverables:

- YDB schema DDL files (canonical schema above, plus any environment-specific variations).
- A “DB adapter” layer in app code that can run on both Postgres and YDB (feature-flagged).
- Data validation tooling.

Actions:

- Stand up YDB database and connect app adapter using YDB JS SDK connection string and credentials providers. citeturn17view0turn17view1turn17view3
- Implement retry-aware repository layer:
  - Use transaction helpers that default to serializable; design business logic to be idempotent. citeturn15view3turn15view2turn15view1
- Design “bucket” strategy (N=16/64/256 etc) and make it consistent across all read model tables (inference grounded in YDB guidance on key distribution). citeturn19view3turn3search4

### Phase 2: Backfill

Approaches:

**Approach 1: Data Transfer (managed)**

- Yandex Data Transfer supports PostgreSQL sources and YDB targets and can implement migration/replication flows. citeturn11view0turn8view5
- For PostgreSQL→YDB ingestion, Yandex provides a tutorial describing real-time ingestion and automatic insertion into YDB tables named after original schemas/tables (this is most suitable when you want a straightforward replication of an existing schema rather than a redesigned model). citeturn11view1turn8view5

**Approach 2: Export + custom bulk ingest (recommended for schema redesign)**

- Export Postgres tables to CSV/JSON.
- Transform into canonical YDB tables (including generating buckets, materializing read models).
- Bulk ingest using batched YQL operations and commit in manageable sizes; YDB provides guidance for batch upload (sort by primary key, split by expected shards, commit every ~100k rows or ~1MB). citeturn13search30turn19view4

**Import/backfill correctness notes**

- Prefer `UPSERT` for idempotent loading (safe to rerun). citeturn12search9turn12search3
- Defer creation of synchronous secondary indexes until after bulk ingestion if possible; YDB docs explicitly recommend bulk push first and build the index afterward for sync index cases. citeturn12search17turn6search1

### Phase 3: Dual write

Goal:

- App writes to Postgres and YDB for the same logical operation.

Key patterns:

- Use idempotency keys and “write-once log” (notification_log / audit_events) to tolerate retries.
- Treat YDB transaction aborts (`ABORTED`, `OVERLOADED`, `BAD_SESSION`) as retryable per YDB status code guidance, but only for idempotent operations. citeturn15view1turn15view2turn15view3
- Monitor RU consumption and throttling risk (Managed Service for YDB serverless mode errors: `RESOURCE_EXHAUSTED` and `ThrottlingException`). citeturn15view0turn14search0

### Phase 4: Cutover

Steps:

- Change reads to YDB (feature flag) while still dual-writing for a stabilization window.
- Validate:
  - Row counts per entity
  - Sample query parity (random sampling)
  - Invariants (e.g., transaction uniqueness, offer→transaction mapping)

If successful:

- Disable Postgres reads, keep writes for a short rollback window.
- Then disable Postgres writes.

### Phase 5: Cleanup

- Remove Postgres dual-write paths.
- Turn off unused Postgres infra (Neon) after retention and legal considerations.
- Convert “temporary” indexes into final set (remove unused, convert to covering where profitable).

Rollback strategy (critical)

- If you detect consistency issues, revert reads to Postgres immediately (feature flag).
- Preserve YDB write logs for postmortem and replay; ensure idempotent ingestion for later repair.

## Application code changes (patterns + examples)

### Replacing Postgres ORM/driver with YDB clients

On Vercel, treat your data layer as:

- A **thin repository** over YDB JS SDK (`@ydbjs/core` + `@ydbjs/query`).
- A strict separation between:
  - Query definitions (YQL strings/templates)
  - Transaction boundaries
  - Retry/idempotency behavior

YDB JS SDK essentials:

- Connection string format and driver init are documented. citeturn17view0turn17view1
- Transaction helper defaults to serializable read-write and supports idempotent retries when configured (you must ensure business logic is idempotent). citeturn15view3

### Connection and credentials patterns for production

**Vercel runtime considerations**

- Vercel Functions share a limit on file descriptors (including network connections), which makes uncontrolled connection/session creation risky. Prefer a singleton driver / session pool reused across invocations where the platform allows. citeturn16search11turn15view3

**YDB connection patterns**

- Use `grpcs://...` endpoints for TLS; obtain endpoint and DB path from the Yandex console/CLI. citeturn11view3turn17view1
- Keep secrets outside code. If the execution environment cannot access Yandex metadata service, use service account keys or tokens and store them in a secret manager (Lockbox) or Vercel secrets (trade-off decision). citeturn17view3turn10search6turn10search10

### Query patterns for core flows

#### Creating an inquiry

Application pattern:

1. Generate `inquiry_id` in app (CUID/UUID).
2. Compute `bucket = hash(user_id) % N`.
3. Run a single transaction that writes:
   - `inquiries`
   - `user_inquiries` (read model)
   - optionally `audit_events` (immutable log)

This matches YDB’s strengths: multi-table ACID transaction available, and read queries remain PK-driven. citeturn19view5turn19view4turn8view4

#### Listing inquiries by user

Use the `user_inquiries` table and keyset pagination; do not use OFFSET. citeturn19view3turn8view4turn7search0

#### Dealer search & responses

Prefer:

- Read from read-model tables keyed by dealer or inquiry.
- Update “entity-by-id” rows by `offer_id`/`inquiry_id`.

Avoid “UPDATE where non-key column = …” full scans; use `SELECT ... VIEW idx` then `UPDATE ... ON` when you truly rely on an index-driven lookup. citeturn6search1turn13search15turn12search1

#### Notification logging and delivery status

Model this as an outbox:

- Insert a row into `notification_log` with status `pending`.
- Worker selects pending rows using a PK-driven queue table or a sync index only if strongly justified.
- Update status by `notification_id`.

### Error handling, retries, idempotency

**Documented error taxonomy**

- YDB server reports status codes (e.g., `ABORTED`, `OVERLOADED`, `BAD_SESSION`) with explicit retry recommendations. citeturn15view1
- YDB SDK provides built-in retry mechanisms and backoff strategies, and strongly advises retrying only when the failure is temporary and the operation is idempotent. citeturn15view2

**Managed Service operational errors**

- In serverless mode, `ThrottlingException` indicates RU-per-second quota exceeded; `RESOURCE_EXHAUSTED` indicates a limit reached and may require throughput/quota adjustments. citeturn15view0turn14search0

Practical rules (inferred but grounded):

- Wrap all write transactions in retry logic.
- Make every externally-triggered write idempotent (idempotency key, “upsert-like” semantics, unique indexes for “only once” invariants).
- Return deterministic application errors on `PRECONDITION_FAILED` from unique index violations (treat as conflict). citeturn15view5turn8view3turn15view1

## Ops: performance, reliability, security

### Performance engineering

**Partitioning / sharding via key design**

- YDB partitions row tables by primary key ranges, so the first key components determine data distribution. citeturn19view4turn3search20
- YDB explicitly recommends avoiding monotonic keys (timestamps) as primary keys and suggests hashing/reordering components. citeturn19view3turn3search4

**Hot partition avoidance**

- Use buckets (hash mod N) for high-write or high-read list tables (`user_inquiries`, `dealer_offers`, queues).
- Ensure “one query — one partition” where feasible by designing queries that narrow to a single prefix. citeturn19view3turn19view4

**Index cost trade-offs**

- Synchronous indexes provide strict consistency but add distributed transaction overhead; async indexes reduce overhead but are eventual consistency and limited to stale read semantics. citeturn15view5turn12search4turn12search0
- Index storage and operations contribute to RU consumption and cost; updates imply deleting old + writing new index records. citeturn15view0turn3search2

### Observability

**Query profiling / plans**

- YDB supports query plan analysis (logical and execution plan) via CLI/UI, and query plans are central to diagnosing index usage and join performance. citeturn7search3turn12search16

**Metrics**

- Managed Service for YDB exports metrics (database, session, transaction processing, query processing, partition metrics) into Yandex Monitoring. citeturn2search7turn2search16

**Auditability**

- Yandex Audit Trails supports control-plane events for Managed Service for YDB. citeturn10search0turn10search2
- YDB itself also documents an “audit log” concept for operations that tried to change objects. citeturn10search17

### Backups and disaster recovery

**Backups**

- YDB provides backup and recovery solutions via YDB CLI, including exports to files and to S3-compatible storage (`ydb export s3`, `ydb import s3`). citeturn19view0turn19view1
- In Yandex Cloud, managed backups and restore operations exist via CLI/API (`yc ydb backup ...`, `yc ydb database restore ...`). citeturn2search23turn2search6turn2search35

**Retention**

- TTL is first-class and can delete or evict rows based on a configured TTL column; configure TTL for auth/session tables and logs as appropriate. citeturn2search4turn19view2

### Cost drivers and optimization

**Serverless mode pricing**

- You pay per request (Request Units), plus stored data (including indexes), plus backups/recovery operations. citeturn3search2turn15view0

**Error signals tied to cost / quota**

- `ThrottlingException` is specifically associated with exceeding RU consumption per second quotas; `RESOURCE_EXHAUSTED` indicates limits reached and may require throughput/quota adjustment. citeturn15view0turn14search0

### Security

**IAM**

- Managed Service for YDB uses role-based access management (service roles such as `ydb.viewer`, `ydb.editor`, etc.). citeturn5search13turn14search1

**Secrets management**

- Yandex Lockbox provides centralized secret storage; secrets are stored encrypted, can use KMS keys, and are replicated in multiple availability zones. citeturn10search6turn10search10turn9search30

**Network isolation**

- In dedicated mode, YDB connectivity requires opening TCP port 2135 per security group configuration guidance. citeturn5search4turn9search3

**Data residency note**

- Yandex Cloud materials explicitly reference compliance positioning related to Russian personal data law (152-FZ) for the infrastructure. Evaluate cross-border data transfer implications if Vercel workloads run outside Russia (architectural/legal decision). citeturn8view1

## Risks and mitigations

### Risk register

**Risk**: Hot partitions due to poor primary key design  
**Symptoms**: latency spikes, uneven shard CPU, frequent `OVERLOADED`, throughput ceilings hit  
**Mitigation**: bucketized keys + avoid monotonic leading key components; follow YDB primary key guidance and “one query—one partition” rule. citeturn19view3turn15view1turn19view4  
**Early signals**: monitoring shows skewed partition metrics; rising retries.

**Risk**: Write amplification and latency from excessive synchronous indexes  
**Symptoms**: higher RU cost, slow writes, more aborted/conflicting transactions  
**Mitigation**: prefer read models over many sync indexes; use covering indexes only where they remove major table reads; measure query stats and index cost. citeturn15view5turn15view0turn6search1  
**Early signals**: RU-per-request rising after adding indexes; slow commits.

**Risk**: Eventual consistency surprises from async indexes  
**Symptoms**: users don’t see “just written” records through index-based reads; inconsistent reads across steps  
**Mitigation**: use sync/unique indexes for correctness paths; async only for explicitly stale-tolerant reads. citeturn15view5turn12search0  
**Early signals**: “missing record” customer reports right after write.

**Risk**: Transaction retry storms / non-idempotent operations  
**Symptoms**: duplicate notifications, duplicate offers, inconsistent counters  
**Mitigation**: enforce idempotency in business logic; adopt retry guidance; use unique indexes and “write-once” logs. citeturn15view2turn15view1turn15view5  
**Early signals**: repeated `ABORTED`/`TIMEOUT` codes and inconsistent side effects.

**Risk**: RU quota throttling in serverless mode  
**Symptoms**: `ThrottlingException`, `RESOURCE_EXHAUSTED`, elevated error rates under load  
**Mitigation**: right-size throughput/quota; reduce RU usage via key-driven reads, fewer indexes, smaller payloads. citeturn15view0turn14search0turn3search2  
**Early signals**: RUs-per-second metrics hitting limits.

**Risk**: Vercel runtime connection pressure (file descriptors / sockets)  
**Symptoms**: sporadic connection failures, `BAD_SESSION`, resource exhaustion in functions  
**Mitigation**: reuse a singleton driver/pool where possible; cap concurrency; prefer fewer, batched operations. citeturn16search11turn15view1turn15view2  
**Early signals**: spikes in connection-related failures during traffic bursts.

## Appendices (feature matrix, mapping table, EDR)

### Compatibility matrix: Postgres vs YDB (YQL)

| Capability          | Postgres (Neon)                  | YDB (YQL / Managed Service for YDB)                              | Practical migration implication                                                                                                                          |
| ------------------- | -------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary key         | Yes                              | Yes; central to sorting + partitioning                           | Must redesign keys for partitioning and list queries. citeturn19view4turn19view3                                                                     |
| SQL dialect         | PostgreSQL SQL                   | YQL (SQL dialect; differs in some details)                       | Rewrite queries; validate each construct. citeturn0search12turn13search16                                                                            |
| Secondary indexes   | Yes                              | Yes, explicit `VIEW` usage; sync/async modes                     | Index strategy is a first-class design choice. citeturn6search1turn15view5turn17view5                                                               |
| Unique constraints  | Yes                              | Via PK and **unique secondary indexes**                          | Model unique invariants explicitly; handle `PRECONDITION_FAILED`. citeturn15view5turn8view3turn15view1                                              |
| NOT NULL            | Yes                              | Documented as only applicable to PK columns                      | Enforce required fields in app code for non-key columns. citeturn4search20turn19view4                                                                |
| Foreign keys        | Yes                              | Not treated as a central mechanism in migration guidance         | Enforce referential integrity in app; Data Transfer guidance suggests “no foreign key” for target creation in some flows. citeturn18view0turn19view5 |
| Transactions        | ACID                             | Distributed ACID; serializable isolation available               | Design retry/idempotency; multi-table writes are supported but must avoid fan-out. citeturn19view5turn15view3turn15view2                            |
| OFFSET pagination   | Common but inefficient at scale  | Explicitly discouraged                                           | Use keyset pagination (PK-based). citeturn19view3turn8view4                                                                                          |
| Large query results | Stream/cursor support            | Common YQL interface has row limits; scan queries stream results | Use pagination or scan queries/ReadTable for bulk reads. citeturn7search1turn7search2turn7search5                                                   |
| TTL                 | Via jobs/partitioning/extensions | Native TTL for tables                                            | Use TTL for auth/session/log retention. citeturn19view2turn2search4                                                                                  |
| Backups             | pg_dump/base backups             | YDB CLI export/import + managed backups                          | Implement export/import runbooks and restore tests. citeturn19view0turn2search6turn2search23                                                        |

### Appendix: mapping table (Postgres entities → YDB equivalents)

This mapping is based on your provided Prisma schema. fileciteturn0file0

| Postgres model    | Canonical YDB table(s)                              | Notes                                                                                                                      |
| ----------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Buyer             | `users` (+ `user_inquiries` read model)             | Buyer merges into general user concept. Maintain platform ids via unique index if required. citeturn15view5turn17view5 |
| Inquiry           | `inquiries` + `user_inquiries`                      | Split entity-by-id and list-by-user. Use TTL for `expires_at` only if semantics match. citeturn19view2turn19view3      |
| Dealer            | `dealers` (+ `dealer_profiles`)                     | Split profile optionally.                                                                                                  |
| Offer             | `offers` + `inquiry_offers` + `dealer_offers`       | Read models replace multi-index reliance. citeturn19view3turn6search1                                                  |
| Transaction       | `transactions` (+ unique index on offer_id)         | Mirrors Postgres unique offer constraint via unique secondary index. citeturn15view5turn17view5                        |
| PasswordResetCode | `auth_phone_verifications` / `password_reset_codes` | Prefer TTL instead of manual cleanup. citeturn19view2turn2search4                                                      |

### Engineering Decision Record (EDR)

**Decision**: Migrate from Postgres (Neon) to Yandex Managed Service for YDB (YQL) as the primary production OLTP database.

**Context**

- Need a Russia-market-aligned managed DB offering with strong consistency and horizontal scale.
- Current Postgres-centric schema and ORM patterns fit relational modeling but require careful redesign for distributed operation.

**Why this database**

- YDB is documented as a distributed SQL DBMS with strict consistency and ACID transaction support, and the managed service supports distributed ACID transactions and serializable isolation. citeturn19view3turn19view5turn8view1
- Managed Service for YDB offers serverless and dedicated operation modes; serverless includes RU-based scaling/cost trade-offs. citeturn11view4turn3search2turn14search22

**Architectural implications**

- Data modeling must be access-pattern-first:
  - Primary keys define partitioning and sorting; list queries should be PK range scans.
  - Secondary indexes must be consciously chosen, used explicitly, and monitored for RU impact. citeturn19view4turn6search1turn15view0turn15view5
- Application logic must become retry- and idempotency-aware:
  - Serializable transactions and distributed behavior increase the importance of handling aborts/timeouts with correct retries. citeturn15view1turn15view2turn15view3

**Trade-offs and consequences**

- Positive:
  - Strong consistency + ACID at scale, managed by Yandex Cloud. citeturn19view3turn19view5
  - TTL and managed backups are available building blocks. citeturn19view2turn19view0turn2search6
- Negative:
  - Migration is a schema + query rewrite and requires engineering investment.
  - Some familiar Postgres features (non-key NOT NULL, FK-driven integrity) must be rethought or implemented at the application level (inference supported by documented constraint limitations and operational guidance). citeturn4search20turn18view0
