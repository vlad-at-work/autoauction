# YDB Migration Prep Reference

This document is a **reference for creating data creation / migration tasks** so that schemas and data created today (e.g. on PostgreSQL / Neon) are shaped to migrate cleanly to **Yandex Managed Service for YDB** later.

Use this as context when asking an LLM (Claude) to design schemas, migrations, or data-layer code.

---

## 1) Core YDB Concepts

### What YDB Is

- **Yandex Managed Service for YDB** is a distributed SQL database.
- Strong consistency, ACID transactions, horizontal scalability.
- Uses its own SQL dialect: **YQL** (not PostgreSQL SQL).

Docs:

- https://cloud.yandex/en/docs/ydb/
- https://ydb.tech/docs/en/

### Transactions

- ACID transactions supported.
- Serializable isolation available.
- Query structure and access patterns matter more than in single-node Postgres.

Docs:

- https://ydb.tech/docs/en/concepts/transactions

---

## 2) SQL Dialect (YQL) Differences

- DDL syntax differs from PostgreSQL.
- No `SERIAL`, `BIGSERIAL`, sequences.
- No triggers or stored procedures like Postgres.
- Constraints behave differently.

Docs:

- https://ydb.tech/docs/en/yql/reference/syntax/create_table/

---

## 3) Table Design Rules (Critical)

### Primary Keys

- **Every table must have a PRIMARY KEY.**
- Primary key choice strongly affects performance and scalability.
- Prefer application-generated IDs (UUID / ULID).

Example:

```sql
CREATE TABLE users (
  user_id Utf8 NOT NULL,
  email Utf8,
  created_at Timestamp,
  PRIMARY KEY (user_id)
);
```
