# Redis – In-Memory Data Structures at Scale

## 1. What Redis is and why architects reach for it

**Redis** is an in-memory **data structure server**. Clients speak a simple protocol (RESP) over TCP, default port **6379**, and every value is a real data structure — string, hash, list, set, sorted set, stream — with server-side commands that operate on it atomically. Because data lives in RAM, typical commands finish in **well under a millisecond**, and one instance commonly serves 100k+ simple operations per second.

It serves as cache, session store, rate limiter, leaderboard, lightweight queue, pub/sub bus and lock service. It is **not** your system of record: RAM is expensive and durability is configurable, not guaranteed.

**Licensing — get this right in reviews.** Redis was BSD until March 2024, when Redis 7.4 moved to RSALv2/SSPLv1. The Linux Foundation forked the last BSD release (7.2.4) as **Valkey**, which is command-compatible; Redis 8 (2025) added AGPLv3 as another option. On AWS, **ElastiCache** and **MemoryDB** offer Valkey alongside Redis OSS. For application code they are interchangeable today.

| Choose Redis when… | Look elsewhere when… |
|---|---|
| Hot data needs sub-millisecond access | The data does not fit in RAM affordably |
| The access pattern is a data structure (counter, ranking, queue) | You need ad-hoc queries, joins, secondary indexes |
| Losing the last second of writes is acceptable | Every acknowledged write must survive a crash |

---

## 2. Under the hood: the single-threaded event loop

Redis executes commands on **one main thread**. An event loop (epoll on Linux) multiplexes thousands of sockets; each ready command is executed to completion, then the next one runs.

```text
 clients ──► socket 1 ─┐
             socket 2 ─┼─► epoll ─► [ main thread: read ─► execute ─► reply ] ─► RAM
             socket N ─┘            one command at a time, no locks
```

This is fast because there are **no locks or context switches** and the real bottleneck is network and memory, not CPU. Since Redis 6, optional **I/O threads** (`io-threads`) parallelise socket reads/writes while execution stays single-threaded. And **every command is atomic** by construction.

The flip side: **one slow command blocks every client.**

| Dangerous | Why | Use instead |
|---|---|---|
| `KEYS *` | O(N) over the whole keyspace | `SCAN` with a cursor |
| `DEL` on a huge hash/set | Frees millions of elements synchronously | `UNLINK` (background free) |
| `HGETALL` / `LRANGE 0 -1` on big keys | Huge reply on the main thread | `HSCAN`, pagination |
| Long Lua scripts | Run atomically, blocking others | Keep scripts short |

Batching tools: **pipelining** sends many commands in one round trip (not atomic); **`MULTI`/`EXEC`** runs queued commands without interleaving (no rollback); **Lua scripts** (`EVAL`) or Redis 7 **Functions** run read-modify-write logic atomically.

---

## 3. Keys and strings

The keyspace is a flat dictionary; the convention is colon-separated names like `user:42:profile`. Strings are binary-safe up to **512 MB**, though values beyond a few KB are a smell.

```bash
SET user:42:name "Linh"
SET page:home "<html>..." EX 300      # value with a 300-second TTL
SET lock:order:7 "a1b2" NX PX 10000   # only if absent, 10 s TTL
INCR stats:pageviews                  # atomic counter, returns new value
MGET user:42:name user:43:name        # one round trip
GETDEL otp:42                         # read once, then remove
```

`INCR` beats "read, add one, write back" in application code: the increment happens on the single thread, so concurrent clients never lose an update.

---

## 4. Hashes, lists and sets

**Hash** — a map of fields inside one key, ideal for objects updated field by field.

```bash
HSET user:42 name "Linh" plan "pro" logins 0
HINCRBY user:42 logins 1
```

**List** — ordered sequence; O(1) push/pop at both ends, O(N) index access in the middle.

```bash
LPUSH jobs:email '{"to":"a@x.io"}'
BRPOP jobs:email 5                                   # block up to 5 s for a job
LMOVE jobs:email jobs:email:processing RIGHT LEFT    # reliable-queue handoff
LTRIM feed:42 0 99                                   # keep newest 100 items
```

**Set** — unordered unique members; O(1) add/remove/membership plus set algebra.

```bash
SADD post:9:likes user:42 user:43
SINTER user:42:follows user:43:follows               # mutual follows
```

Small collections use a compact **listpack** encoding and convert to full hash tables/skiplists past a size threshold — so many small hashes use far less memory than many separate string keys.

---

## 5. Sorted sets and specialised types

A **sorted set (ZSET)** holds unique members with a floating-point score, ordered by score. It pairs a **skiplist** (ordered traversal) with a **hash table** (O(1) score lookup), so `ZADD`, `ZREM` and `ZRANK` are **O(log N)** and range reads O(log N + M).

```bash
ZADD leaderboard 1500 "alice" 1720 "bob" 1610 "chi"
ZINCRBY leaderboard 50 "alice"
ZRANGE leaderboard 0 9 REV WITHSCORES       # top 10, highest first
ZREVRANK leaderboard "alice"                # 0-based rank from the top
ZRANGE delayed:jobs 0 1700000000 BYSCORE    # jobs due by a timestamp
```

A timestamp score turns a sorted set into a time index — the basis of delayed-job queues and sliding-window rate limiters.

| Type | Gives you | Typical use |
|---|---|---|
| Bitmap (`SETBIT`, `BITCOUNT`) | One bit per integer id | Daily active users |
| HyperLogLog (`PFADD`, `PFCOUNT`) | Approximate distinct count, ≤ 12 KB, ~0.81% error | Unique visitors |
| Geo (`GEOADD`, `GEOSEARCH`) | Radius/box search over points | "Drivers within 2 km" |

---

## 6. Pub/Sub and Streams

**Pub/Sub** is fire-and-forget: `PUBLISH` delivers to whoever is subscribed *at that instant*; nothing is stored, so an offline subscriber misses messages. Fine for invalidation broadcasts and live notifications. Redis 7 added **sharded pub/sub** (`SPUBLISH`/`SSUBSCRIBE`) so cluster messages are not broadcast to every node.

**Streams** are an append-only log with IDs (`<ms>-<seq>`) and **consumer groups**:

```bash
XADD orders MAXLEN ~ 100000 * id 991 total 25.50    # auto ID, capped length
XGROUP CREATE orders billing $ MKSTREAM
XREADGROUP GROUP billing worker-1 COUNT 10 BLOCK 5000 STREAMS orders >
XACK orders billing 1700000000000-0
XAUTOCLAIM orders billing worker-2 60000 0-0         # take over stuck entries
```

```text
 producer ─XADD─► [ orders: e1 e2 e3 e4 ... ]
                        │ group "billing"
             ┌──────────┴──────────┐
         worker-1               worker-2
   read ► process ► XACK   unacked entries stay in the PEL until acked/claimed
```

Each group keeps a **Pending Entries List (PEL)** of delivered-but-unacked entries, giving at-least-once processing. Streams suit moderate volumes when you already run Redis; for long retention and very high throughput see Kafka in topic 11.

| | Pub/Sub | Streams |
|---|---|---|
| Stored | No | Yes |
| Offline consumer | Misses messages | Catches up |
| Ack / redelivery | No | Yes (PEL) |

---

## 7. TTL and expiration

```bash
EXPIRE session:9f1c 1800
TTL session:9f1c                 # seconds left; -1 = no TTL, -2 = no such key
PERSIST session:9f1c             # remove the TTL
SET session:9f1c "{...}" KEEPTTL # overwrite value, keep TTL
```

Gotcha: a plain **`SET` on an existing key discards its TTL** unless you pass `EX`/`PX`/`KEEPTTL`; `INCR` and `HSET` keep it.

Expired keys are removed **lazily** (when accessed) and **actively** (a background cycle samples keys with TTLs and deletes expired ones). Memory is reclaimed promptly, not instantly. Replicas do not expire keys themselves; they apply the `DEL` the primary sends. Keys written together with the same TTL also expire together — add jitter (stampede handling is topic 10).

---

## 8. Memory limits and eviction policies

`maxmemory` caps the dataset; `maxmemory-policy` decides what happens at the limit. On 64-bit builds `maxmemory` defaults to **0 (no limit)** and the policy to **`noeviction`** — writes fail with an OOM error.

| Policy | Evicts from | Picks |
|---|---|---|
| `noeviction` (default) | — | Rejects writes |
| `allkeys-lru` / `allkeys-lfu` | All keys | Least recently / frequently used |
| `allkeys-random` | All keys | Random |
| `volatile-lru` / `volatile-lfu` / `volatile-random` | Keys with a TTL | LRU / LFU / random |
| `volatile-ttl` | Keys with a TTL | Shortest remaining TTL |

```bash
# redis.conf for a pure cache node
maxmemory 12gb
maxmemory-policy allkeys-lfu
```

**Pure cache** → `allkeys-lru`/`allkeys-lfu`. **Cache mixed with data that must stay** → `volatile-*` with TTLs only on cache keys (better: separate instances). **Queue or data store** → `noeviction` plus alerts. LRU/LFU are *approximated* by sampling (`maxmemory-samples`, default 5). Keep `maxmemory` below physical RAM to leave room for fragmentation, replication buffers and fork copy-on-write; watch `evicted_keys` and `mem_fragmentation_ratio` in `INFO`, and find big keys with `redis-cli --bigkeys`.

---

## 9. Persistence: RDB vs AOF

**RDB** — Redis `fork()`s and the child writes a compact point-in-time snapshot. Copy-on-write duplicates pages modified meanwhile, so a write-heavy instance can need up to ~2× memory during `BGSAVE`. Set `vm.overcommit_memory = 1` so the fork does not fail.

**AOF** — every write command is appended to a log and replayed on start. `appendfsync` sets durability: `always` (safest, slowest), **`everysec`** (default, lose up to ~1 s), `no` (OS decides). The log is compacted by background rewrite; with `aof-use-rdb-preamble yes` (default) its base is RDB format for fast loading.

```bash
# redis.conf
save 3600 1 300 100 60 10000   # snapshot after 1 change/1h, 100/5m, 10000/1m
appendonly yes
appendfsync everysec
```

| | RDB | AOF (`everysec`) |
|---|---|---|
| Data loss on crash | Since last snapshot (minutes) | ~1 second |
| Restart | Fast | Slower |
| Best for | Backups, caches that tolerate loss | Data you would rather keep |

Production often runs **both**; a pure cache may run with persistence off. Need every write durable with Redis semantics? On AWS, MemoryDB uses a Multi-AZ transaction log.

---

## 10. Replication and Sentinel

A primary streams writes to replicas (`REPLICAOF host port`): a full RDB sync first, then the command stream, with **partial resync** from a backlog after brief disconnects.

Replication is **asynchronous**: the client is acknowledged before replicas get the write, so failover can lose recent writes. `WAIT 1 100` narrows the window but does not make Redis strongly consistent; `min-replicas-to-write` makes a primary refuse writes when too few replicas are connected.

**Sentinel** adds automatic failover for a non-clustered deployment:

```text
  Sentinel A      Sentinel B      Sentinel C     (port 26379, separate AZs)
        \              |              /
          agree "primary down" (quorum), majority authorises failover
                       │
   [ primary ✗ ]  ── promote ──►  [ replica → new primary ]

   clients ask Sentinel: "who is primary for mymaster?"
```

Run **at least 3 Sentinels** in independent failure domains; clients must be **Sentinel-aware** instead of hard-coding the primary. An isolated old primary can still accept writes that are discarded when it rejoins — `min-replicas-to-write` limits that. On AWS this is ElastiCache with cluster mode disabled: one primary, up to 5 replicas, Multi-AZ failover.

---

## 11. Redis Cluster and hash slots

Sentinel improves availability, not write capacity. **Redis Cluster** shards data across primaries:

- **16,384 hash slots**; `slot = CRC16(key) mod 16384`. Each primary owns slot ranges and has its own replicas.
- Nodes gossip on the **cluster bus** (data port + 10000, e.g. 16379). Minimum **3 primaries**; failover is built in, no Sentinel.

```text
  Node A: slots 0–5460     Node B: slots 5461–10922     Node C: slots 10923–16383

  client ── GET user:42 ──► Node A
  Node A ── "MOVED 9500 10.0.1.12:6379" ──► client retries on Node B, caches slot map
```

Clients follow **`MOVED`** (slot lives elsewhere) and **`ASK`** (slot mid-migration). Design constraints:

- **Multi-key commands, `MULTI` and Lua need all keys in one slot**, or you get `CROSSSLOT`. Use **hash tags**: only the part inside `{}` is hashed, so `{user:42}:cart` and `{user:42}:profile` co-locate.
- Overusing one hash tag creates a **hot shard**.
- Only database 0 exists; big keys make resharding slow.

On AWS: ElastiCache "cluster mode enabled" with a configuration endpoint.

---

## 12. Distributed locks and their caveats

```bash
SET lock:invoice:77 "c3f9-token" NX PX 30000   # acquire only if absent, auto-expire
```

Release must check ownership atomically — a bare `DEL` could remove a lock that expired and was taken by someone else:

```lua
-- KEYS[1] = lock key, ARGV[1] = my token
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
```

This is still **not** a correctness guarantee:

- **Failover loses locks** — replication is async, so the new primary may not have it.
- **Process pauses** — a GC pause longer than the TTL leaves the holder believing it still owns the lock.
- **Clock jumps** distort expiry.

**Redlock** takes the lock on a majority of N independent primaries (typically 5). It helps with failover but is disputed (Kleppmann's critique vs antirez's reply) because it still assumes bounded pauses and clock drift.

Rule: Redis locks are fine for **efficiency** (avoid duplicate work). For **correctness** (money, stock), the protected resource must check a **fencing token** — an increasing number issued with the lock; storage rejects any token older than one already seen — or use etcd/ZooKeeper or database constraints.

---

## 13. Use cases: sessions, leaderboards, rate limiters

**Sessions.** Stateless app servers store `SET session:<id> <json> EX 1800`, refreshing the TTL on activity. Every instance behind the load balancer sees the same session.

**Leaderboards.** `ZINCRBY` on score events, `ZRANGE … REV WITHSCORES` for top N, `ZREVRANK` for "your rank" — O(log N), where SQL would sort or run a rank window function.

**Rate limiter** (fixed window; algorithms compared in topic 17):

```js
// ioredis: at most `limit` requests per user per 60-second window
const script = `
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  return count
`;

async function isAllowed(redis, userId, limit = 100) {
  const window = Math.floor(Date.now() / 60000);
  const key = `rl:${userId}:${window}`;
  const count = await redis.eval(script, 1, key, 60);

  return count <= limit;
}
```

The script makes `INCR` + `EXPIRE` atomic; two separate calls could leave a counter without a TTL if the app crashed between them. A sliding window uses a sorted set per user: `ZREMRANGEBYSCORE` old timestamps, `ZADD` now, `ZCARD`.

**Redis vs Memcached:** Memcached is multi-threaded and stores opaque strings with no persistence or replication; choose it only for a simple, huge string cache. **Hardening:** never expose 6379 publicly, enable ACLs and TLS (Redis 6+), keep `protected-mode yes`, and watch `SLOWLOG GET`, evictions and replication lag.

---

## Key interview points

- **Single-threaded command execution** — fast because no locks and the bottleneck is network/RAM; one slow command (`KEYS`, huge `DEL`) blocks everyone.
- Data type by access pattern: counter → `INCR`; object → hash; queue → list/stream; uniqueness → set; ranking/time index → **sorted set** (O(log N)).
- A plain `SET` **drops the TTL**; `TTL` returns -1 (no TTL) or -2 (missing key).
- Default `maxmemory-policy` is **`noeviction`**; caches use `allkeys-lru`/`allkeys-lfu`; `volatile-*` only evicts keys with TTLs.
- **RDB** = fork + snapshot, loses minutes; **AOF `everysec`** loses ~1 s; production often runs both.
- Replication is **asynchronous**; failover can lose acknowledged writes. Sentinel needs ≥ 3 nodes and aware clients.
- Cluster: **16,384 slots**, `CRC16(key) mod 16384`, `MOVED`/`ASK`, multi-key ops need **hash tags**.
- Pub/Sub drops messages for offline subscribers; Streams have consumer groups, acks and a PEL.
- Locks: `SET NX PX` + token-checked Lua release; for correctness add **fencing tokens**.
- Redis 7.4+ is source-available; **Valkey** is the BSD fork; Redis 8 adds AGPLv3.

## Summary

- Redis keeps data structures in RAM and runs commands one at a time, giving atomic operations and sub-millisecond latency.
- Each data type maps to a need: counters, objects, queues, uniqueness, rankings, event logs.
- TTLs plus a deliberate eviction policy make a bounded cache; `noeviction` protects data stores.
- RDB and AOF trade recovery point against cost; async replication means failover may lose recent writes.
- Sentinel gives HA for one shard; Cluster shards writes over 16,384 slots with same-slot constraints.
- Sessions, leaderboards, rate limiters and efficiency locks are natural fits within those limits.
