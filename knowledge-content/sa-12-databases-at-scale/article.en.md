# Databases at Scale – Indexes, Replication, Sharding & Trade-offs

## 1. Why the database is the bottleneck

App servers are stateless; the database holds **state**, which is hard to copy, split and keep consistent. Name the pressure first — slow queries, connections, reads, writes or size. Each rung buys capacity and adds permanent complexity:

```text
 complexity
   ^                                          [6] shard across nodes
   |                                [5] partition big tables
   |                     [4] read replicas
   |           [3] cache hot reads
   |    [2] connection pooling
   | [1] indexes, fix queries, scale up
   +---------------------------------------------------------> load
```

A well-tuned single PostgreSQL or MySQL instance handles thousands of simple transactions per second. Sharding is the **last** step, not the first.

---

## 2. SQL vs NoSQL families

"SQL vs NoSQL" is too coarse; ask which **data model and access pattern** the workload has.

| Family | Strength | Weakness | Examples (AWS) |
|---|---|---|---|
| Relational | Ad-hoc SQL, joins, transactions | Scaling writes out is hard | PostgreSQL, MySQL (RDS, Aurora) |
| Key-value | Predictable ms latency at huge scale | Access by key only | Redis, DynamoDB |
| Document | Flexible schema, one read per aggregate | Weak joins, duplication | MongoDB (DocumentDB) |
| Wide-column | Massive writes, multi-DC | Queries modelled up front | Cassandra (Keyspaces) |
| Graph | Multi-hop relationships | Niche, hard to shard | Neo4j (Neptune) |
| Search | Full-text, relevance | Not a system of record | OpenSearch |
| Distributed SQL | SQL plus horizontal scale | Write latency, cost | Spanner, CockroachDB |

Relational design is **model the data, then query it any way**. DynamoDB/Cassandra design is **model the queries, then shape the data** — denormalised and fast, but a new access pattern may need a migration.

Default ports: PostgreSQL `5432`, MySQL `3306`, SQL Server `1433`, MongoDB `27017`, Cassandra `9042`.

---

## 3. B-tree indexes

Without an index the engine scans every row: O(n). A **B-tree** (really a B+tree) keeps keys sorted in pages (8 KB in PostgreSQL, 16 KB in InnoDB). Each page holds hundreds of keys, so 3–4 levels cover hundreds of millions of rows and a lookup is **O(log n)**:

```text
                  [ 100 | 500 ]                 root
               /        |        \
       [ 20 | 60 ]  [ 200 | 350 ]  [ 700 | 900 ]  internal
        /  |  \       /  |  \        /  |  \
      leaf<->leaf<->leaf<->leaf<->leaf<->leaf    sorted, linked leaves: key -> row
```

Sorted, linked leaves serve `=`, ranges, `ORDER BY` and prefix `LIKE 'ab%'`. **Composite indexes follow the leftmost-prefix rule** — put equality columns first, then the range/sort column:

```sql
CREATE INDEX orders_cust_created_idx ON orders (customer_id, created_at);

-- Uses the index: equality on column 1, range + sort on column 2
SELECT id, total FROM orders
WHERE customer_id = 42 AND created_at >= '2026-01-01'
ORDER BY created_at DESC LIMIT 20;

-- Cannot use it efficiently: the leading column is missing
SELECT id FROM orders WHERE created_at >= '2026-01-01';
```

- **Covering index:** if the index holds every needed column (PostgreSQL `INCLUDE`), you get an index-only scan.
- **InnoDB is clustered:** rows live in the primary-key tree, so random UUIDv4 keys cause page splits.
- **Indexes cost writes:** every `INSERT`/`UPDATE` maintains every index.
- **Index killers:** a function on the column (`lower(email)` needs an expression index), `LIKE '%x'`, type casts, low-selectivity columns.

---

## 4. Reading a query plan

`EXPLAIN` shows the planned route; `EXPLAIN ANALYZE` runs the query and shows real timings (it really executes DML).

```text
EXPLAIN ANALYZE SELECT id, total FROM orders WHERE customer_id = 42;

Seq Scan on orders  (cost=0.00..172500.00 rows=3 width=16) (actual time=0.015..912.300 rows=3 loops=1)
  Filter: (customer_id = 42)
  Rows Removed by Filter: 4999997

-- after adding the index
Index Scan using orders_cust_created_idx on orders  (cost=0.43..12.61 rows=3 width=16) (actual time=0.031..0.045 rows=3 loops=1)
  Index Cond: (customer_id = 42)
```

| Signal | Meaning |
|---|---|
| `Seq Scan` + huge `Rows Removed by Filter` | Missing or unusable index |
| `Index Only Scan` | Index covers the query |
| `Nested Loop` over many outer rows | Should probably be a `Hash Join` |
| Estimated `rows` far from actual | Stale statistics: run `ANALYZE` |

A seq scan is correct when a query returns a large share of the table. The most common real problem is **N+1 queries**: an ORM loads 100 orders, then runs one query per customer. Fix with a join or `WHERE id IN (...)`; find offenders with `pg_stat_statements` or MySQL's slow query log.

---

## 5. ACID and MVCC

| Letter | Guarantee | Mechanism |
|---|---|---|
| Atomicity | All or nothing | Write-ahead log + rollback |
| Consistency | Constraints hold after commit | FK/unique/check; app owns business rules |
| Isolation | No interference from concurrent work | Locks, MVCC |
| Durability | Commits survive a crash | WAL `fsync` before acknowledging |

The **write-ahead log (WAL)** is appended and flushed before data pages change; after a crash it is replayed, and the same stream feeds replication. **MVCC** keeps row versions so readers and writers do not block each other; the cost is cleanup (`VACUUM` in PostgreSQL), which long-running transactions block.

The classic race is read-modify-write: two requests read balance 500 and both write 400. Fixes:

```sql
-- 1. Atomic statement
UPDATE accounts SET balance = balance - 100 WHERE id = 1 AND balance >= 100;

-- 2. Pessimistic lock
BEGIN;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;

-- 3. Optimistic lock: retry when 0 rows are updated
UPDATE accounts SET balance = 400, version = 8 WHERE id = 1 AND version = 7;
```

---

## 6. Isolation levels

Anomalies: **dirty read** (see uncommitted data), **non-repeatable read** (a row changes between two reads), **phantom** (new rows appear in a range), **write skew** (two transactions read the same facts and update different rows, together breaking a rule).

| Level | Dirty | Non-repeatable | Phantom (standard) |
|---|---|---|---|
| Read Uncommitted | yes | yes | yes |
| Read Committed | no | yes | yes |
| Repeatable Read | no | no | yes |
| Serializable | no | no | no |

Real engines differ — a favourite interview probe:

- **PostgreSQL, SQL Server, Oracle** default to **Read Committed**. **MySQL InnoDB** defaults to **Repeatable Read**.
- PostgreSQL Repeatable Read is snapshot isolation: no phantoms, but **write skew is possible**. Its Serializable (SSI) aborts conflicts with a serialization failure, so the app **must retry**.

Write skew: two doctors are on call, the rule is "at least one". Each checks "someone else is on call" and signs off; under snapshot isolation both commit. Fix with Serializable or `SELECT ... FOR UPDATE` on the rows the decision depends on.

---

## 7. Replication

```text
   app --- writes + reads ---> [ Leader ] --- WAL / binlog stream ---+
    |                                                                 |
    +----- reads ------------> [ Follower 1 ] <-----------------------+
    +----- reads ------------> [ Follower 2 ] <-----------------------+
```

**Leader–follower** is the default for PostgreSQL, MySQL and MongoDB replica sets: one node accepts writes and streams its log.

| Mode | Leader waits for | Trade-off |
|---|---|---|
| Asynchronous | Nobody | Fast; failover can lose recent commits |
| Synchronous | A follower to confirm | No loss; slower commits, a slow standby stalls writes |
| Semi-sync (MySQL) | One replica to acknowledge receipt | Middle ground; falls back to async on timeout |

**Failover** promotes a follower; guard against **split brain** (the old leader still accepting writes) with fencing. RDS Multi-AZ failover typically takes 60–120 seconds.

- **Multi-leader:** writes in several regions, conflicts must be resolved (last-write-wins, CRDTs). Only when local writes per region are required.
- **Leaderless** (Cassandra, Dynamo-style): write to `N`, wait for `W` acks, read `R`. If **`W + R > N`** reads overlap the latest write (`N=3, W=2, R=2`).

Aurora keeps 6 copies across 3 AZs (write quorum 4/6, read 3/6) and supports up to 15 read replicas on shared storage.

---

## 8. Read replicas and lag

Route reads to followers, writes to the leader. Async followers lag: usually milliseconds, but seconds or more under heavy writes or large migrations.

```text
t=0 ms   user renames profile   -> leader commits "Lan"
t=5 ms   page reload hits replica -> still "Linh"   (stale)
t=40 ms  replica replays WAL    -> "Lan"
```

| Guarantee | Implementation |
|---|---|
| Read-your-writes | Read from leader for a few seconds after a write, or wait for the replica to reach the write's LSN/GTID |
| Monotonic reads | Pin a session to one replica |

```sql
-- PostgreSQL primary: lag per standby
SELECT client_addr, write_lag, flush_lag, replay_lag FROM pg_stat_replication;
-- PostgreSQL replica
SELECT now() - pg_last_xact_replay_timestamp() AS replay_lag;
```

MySQL: `SHOW REPLICA STATUS`, field `Seconds_Behind_Source`. Replicas do **not** scale writes, and a replica is **not a backup** — `DROP TABLE` replicates too.

---

## 9. Partitioning vs sharding

| | Partitioning | Sharding |
|---|---|---|
| Where | Inside one database | Across many databases |
| Solves | Huge tables, retention, index size | Write throughput, data beyond one node |
| App changes | None | Routing; cross-shard joins/transactions are hard |

```sql
CREATE TABLE events (
  id         bigint GENERATED ALWAYS AS IDENTITY,
  created_at timestamptz NOT NULL,
  payload    jsonb,
  PRIMARY KEY (id, created_at)  -- must include the partition key
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2026_09 PARTITION OF events
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
```

The planner skips irrelevant partitions (**partition pruning**), and dropping an old partition replaces a huge `DELETE`.

| Scheme | Good at | Risk |
|---|---|---|
| Range | Range scans, time retention | Newest range is a hot spot |
| Hash (`hash(key) mod N`) | Even spread | Range queries fan out; changing N moves most keys |
| Consistent hashing | Adding a node moves ~1/N of keys | More complex |
| Directory (lookup table) | Flexible placement | Lookup is a critical dependency |

---

## 10. Shard keys

```text
        app -> router (Vitess, Citus, mongos, or a library)
                   |  shard = hash(tenant_id) mod 4
      +------------+------------+------------+
      v            v            v            v
   [shard 0]    [shard 1]    [shard 2]    [shard 3]   each: leader + replicas
```

A good shard key has **high cardinality**, **even load**, **appears in hot queries** (one request, one shard), and **rarely changes**.

| Candidate | Verdict |
|---|---|
| `tenant_id` (B2B SaaS) | Usually excellent; move giant tenants to their own shard |
| `created_at` | Bad: all new writes hit one shard |
| `country` | Bad: low cardinality, uneven |

Permanent costs: scatter-gather queries, cross-shard transactions (two-phase commit or sagas — see the microservices topic), globally unique IDs (UUIDv7, Snowflake IDs), hot keys (a celebrity account), and **resharding**. Pre-split into many logical shards mapped onto few physical nodes so growth moves whole logical shards. DynamoDB and Cassandra do this natively via the partition key.

---

## 11. CAP and PACELC

**CAP:** when a **network partition** happens, a distributed store must choose **Consistency** (linearizable reads) or **Availability** (every live node answers). Partitions are unavoidable, so "CA" is not a real option.

```text
if Partition:  Availability  vs  Consistency     (CAP)
Else:          Latency       vs  Consistency     (everyday trade-off)
```

**PACELC** (Daniel Abadi) adds the normal-operation trade-off CAP ignores.

| System (defaults) | Class | Why |
|---|---|---|
| Cassandra, DynamoDB | PA/EL | Eventually consistent reads by default; stronger reads opt-in |
| Spanner, CockroachDB, etcd | PC/EC | Consensus on every write |

The C in CAP is not the C in ACID. Many systems make the choice per request (Cassandra consistency levels, DynamoDB `ConsistentRead`).

---

## 12. Connection pooling

PostgreSQL runs a **process per connection** (several MB each), `max_connections` defaults to **100**; MySQL defaults to 151. Thousands of connections make the database slower, not faster.

```text
 400 pods x 10 conns = 4000 connections      400 pods x 10 client conns
        -> DB out of memory                           |
                                            [ PgBouncer / RDS Proxy ]
                                                      | 40 server conns
                                                 [ PostgreSQL ]
```

```ini
[databases]
app = host=10.0.1.20 port=5432 dbname=app

[pgbouncer]
listen_port = 6432
auth_type = scram-sha-256
pool_mode = transaction
max_client_conn = 2000
default_pool_size = 20
```

PgBouncer modes: **session**, **transaction** (usual choice), **statement**. Transaction mode breaks session state: `SET`, session advisory locks, `LISTEN`, and prepared statements unless `max_prepared_statements` (1.21+) is set. Serverless functions each open their own connection — use **RDS Proxy**. Size pools small: a common start is `(cores x 2) + spindles`, and `instances x pool size` must stay under the server limit.

---

## 13. Choosing a database

Ask: data shape, access patterns, consistency needs, scale numbers (reads/s, writes/s, size, p99), operations skills, cost model.

| Workload | Sensible default |
|---|---|
| Business app: orders, users, billing | PostgreSQL / MySQL (RDS, Aurora) |
| Key-based access at huge, spiky scale | DynamoDB |
| Sessions, leaderboards, rate limits | Redis / Valkey |
| Full-text search | OpenSearch fed from the system of record |
| Analytics over history | Columnar warehouse (Redshift, BigQuery, Snowflake) |

Each extra store must be secured, backed up and kept in sync (CDC or events): default to one relational database until a measured need justifies more, and record the choice in an ADR.

## Key interview points

- Scale in order: **queries/indexes → pooling → cache → replicas → partitioning → sharding**.
- Composite indexes follow the **leftmost prefix**; indexes speed reads and slow writes.
- `EXPLAIN ANALYZE`: seq scan with many removed rows = missing index; bad estimates = stale stats; watch for N+1.
- Defaults: **PostgreSQL = Read Committed**, **InnoDB = Repeatable Read**; snapshot isolation allows **write skew**; Serializable needs retries.
- Async replication = lag and possible loss; design for **read-your-writes**. Quorum: **W + R > N**.
- **Partitioning** = within one DB; **sharding** = across DBs; shard key = high cardinality, even, in hot queries.
- **CAP** = C or A during a partition; **PACELC** adds latency vs consistency otherwise.
- Pool connections (**PgBouncer, RDS Proxy**), keep pools small.

## Summary

- The database is hardest to scale because it holds state; diagnose the pressure before picking a fix.
- Choose a data model from access patterns; indexes and plans fix most performance issues.
- ACID and the right isolation level keep concurrent work correct.
- Replication buys availability and read scale at the price of lag and failover complexity.
- Partitioning tames big tables; sharding buys write scale at a permanent complexity cost.
- CAP/PACELC frame consistency vs availability and latency; pooling protects the database from connection storms.
