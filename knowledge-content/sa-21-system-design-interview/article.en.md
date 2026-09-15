# The System Design Interview – Framework and Worked Designs

## 1. What the interview actually measures

A system design interview has no single right diagram. In 45–60 minutes the interviewer watches **how you reason**: do you clarify an ambiguous problem, size it with numbers, choose components for stated reasons, find the bottleneck and name the trade-off you accepted? Senior and architect candidates are also expected to **drive** the conversation.

Use the same seven steps every time, with a rough clock:

| Step | What you produce | Time (of ~50 min) |
|---|---|---|
| 1. Requirements | Functional + non-functional list, out-of-scope items | 5–8 min |
| 2. Estimates | Only the numbers that change the design | 3–5 min |
| 3. API | 3–6 endpoints or messages | 3–5 min |
| 4. Data model | Entities, keys, access patterns, store | 3–5 min |
| 5. High-level design | Main read and write paths | 8–10 min |
| 6. Deep dive | 1–2 genuinely hard parts | 10–15 min |
| 7. Bottlenecks & wrap-up | Failure modes, scaling limits, next steps | 3–5 min |

Think out loud, write numbers on the board and check in: "I'd like to go deeper on ID generation — or would you rather see the cache?" If the interviewer steers, follow.

---

## 2. Step 1 — Requirements and scope

Every prompt ("design a chat app") is deliberately vague. Turn it into a contract:

- **Functional** — the 3–4 core features, plus what you are *not* designing ("no video calls, no search").
- **Non-functional** — scale (DAU, read/write ratio), latency (p99 < 200 ms), availability (99.9 % vs 99.99 %), consistency (is a stale read acceptable?), durability, geography, compliance.
- **Constraints** — existing stack, team, budget, deadline.

Good questions change the architecture: *"Chronological or ranked feed?"*, *"Must redirects work if analytics is down?"*, *"Max group size?"* If the answer is "you decide", **state an assumption and write it down**: "I'll assume 100 M DAU and a 10:1 read/write ratio." A stated assumption is a strength; a silent one is a bug.

---

## 3. Step 2 — Back-of-the-envelope estimates

Estimates answer one question: does this fit on one machine, or do I need to partition, cache or queue? Round aggressively, but show the arithmetic.

| Handy number | Value |
|---|---|
| Seconds in a day | 86,400 (≈ 10⁵ for mental maths) |
| 1 M requests/day | ≈ 11.6 per second |
| Peak vs average | assume 2–3× (say so) |
| KB / MB / GB / TB | 10³ / 10⁶ / 10⁹ / 10¹² bytes |
| Main-memory reference | ~100 ns |
| SSD random read | ~0.1 ms |
| Round trip within a datacenter | ~0.5 ms |
| Round trip across an ocean | ~100–150 ms |

```text
QPS      = daily actions / 86,400                       (x2..x3 for peak)
Storage  = records/day x bytes/record x 365 x years     (x replication factor)
Memory   = hot items x bytes/item                       (80/20: cache the hot 20 %)
Servers  = peak QPS / QPS per server                    (+ headroom to lose a node or AZ)
```

Example: 10 M records/day × 1 KB = 10 GB/day → 3,650 GB/year → ≈ 18 TB in 5 years, ≈ 55 TB with 3 replicas. Then **use** it: 18 TB does not sit comfortably on one database node, so plan for partitioning. A number you never use is wasted time.

---

## 4. Steps 3–4 — API and data model

Define the contract before drawing boxes:

```text
POST /v1/urls        { "longUrl": "...", "customAlias": "opt" }  -> 201 { "code": "aZ3kQ9x" }
GET  /{code}                                                     -> 302 Location: <longUrl>
GET  /v1/feed?cursor=<opaque>&limit=20                           -> 200 { "items": [...], "nextCursor": "..." }
```

One sentence each on the cross-cutting parts: auth at the gateway (OAuth 2.0 / JWT), **idempotency keys** on creates, **cursor pagination** for data that changes while paging, rate limits per API key.

Pick the store from **access patterns**, not entities:

| Access pattern | Natural fit |
|---|---|
| Lookup by one key at huge volume | Key-value / wide-column (DynamoDB, Cassandra) |
| Relations, transactions, ad-hoc queries | Relational (PostgreSQL) — shard when needed |
| Append-heavy, time-ordered per entity | Wide-column, partitioned by entity + time bucket |
| Counters, TTLs, top-N | Redis (cache or secondary store, not source of truth) |
| Images, video | Object storage + CDN (S3 + CloudFront) |

---

## 5. Steps 5–7 — High-level design, deep dive, bottlenecks

Draw the **simplest design that meets the requirements**, then evolve it:

```text
 client --> DNS --> CDN (static/media)
   |
   v
 load balancer (L7) --> API gateway (auth, rate limit)
                            |
                 +----------+-----------+
                 v                      v
          stateless service A    stateless service B
            |        |                  |
            v        v                  v
         cache    database            queue
        (Redis)  (primary +             |
                  replicas) <------- workers
```

Walk the **write path** and the **read path** separately. Then deep-dive into what is hard *for this problem*: ID generation for a URL shortener, fan-out for a feed, connections for chat.

For bottlenecks, ask of each component "what happens at 10× load, and when it dies?":

- Single DB primary → read replicas, then sharding by a key that spreads load.
- Hot key / celebrity → cache with jitter, key splitting, a special-case path.
- Synchronous call chains → timeouts, circuit breakers, non-critical work behind a queue.
- One AZ → multi-AZ; multi-region only if requirements demand it (it costs consistency and money).

Always pair a fix with its cost: "Sharding by user ID removes the write bottleneck but turns cross-user queries into scatter-gather."

---

## 6. Worked design: URL shortener — requirements and estimates

**Functional:** create a short link (optional alias, expiry), redirect, click counts. **Non-functional:** redirect p99 < 50 ms, very high read availability, a code must never point to the wrong URL, codes not trivially guessable.

**Assumptions:** 100 M new links/day, read:write = 10:1, 10-year retention, ~500 bytes per record.

```text
Write QPS  = 100,000,000 / 86,400              ~= 1,160/s   (peak x2 ~= 2,300/s)
Reads/day  = 10 x 100 M = 1,000,000,000 -> / 86,400 ~= 11,600/s (peak ~= 23,000/s)
Records    = 100 M x 365 x 10                  = 365 billion
Storage    = 365,000,000,000 x 500 B           = 182.5 TB  (~550 TB with 3 replicas)
Cache      = 20 % x 1 B reads x 500 B          = 100 GB (upper bound: repeats overlap)
Code       : 62^6 = 56.8 billion   < 365 billion
             62^7 = 3.52 trillion  > 365 billion   -> 7 base62 characters
```

Conclusion: read-heavy, key lookups only, too much data for one node, cache fits a small Redis cluster.

---

## 7. URL shortener — design and trade-offs

```text
 create:   client -> LB -> link service -> ID range lease -> scramble -> base62 -> KV store
 redirect: client -> LB -> redirect service -> Redis (hit) ----------------> 302
                                              \-> KV store (miss) -> fill cache
                                    redirect service -> click event -> queue -> analytics
```

**Generating the code** is the deep dive:

| Approach | Pros | Cons |
|---|---|---|
| Hash long URL, take 7 chars | Same URL → same code | Collisions need check-and-retry |
| Single global counter + base62 | No collisions, short | SPOF; sequential codes are enumerable |
| Counter **ranges** leased per server | No per-request coordination | Gaps on crash (harmless); scramble to hide order |
| Snowflake 64-bit ID | Fully decentralised | Up to 11 base62 chars — not short |

A solid answer: each link-service instance leases a block of 1 M IDs from a small coordination store (a DB row updated in a transaction, or etcd), applies a reversible scramble, then encodes base62:

```js
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function toBase62(n) {
  if (n === 0n) return ALPHABET[0];

  let out = '';

  while (n > 0n) {
    out = ALPHABET[Number(n % 62n)] + out;
    n /= 62n;
  }

  return out;
}

toBase62(125n);           // '21'  (2 x 62 + 1)
toBase62(62n ** 7n - 1n); // 'ZZZZZZZ' — largest 7-character code
```

**Redirect status:** `301` lets browsers cache the redirect (less load, but repeat clicks vanish from analytics and the target is hard to change); `302` sends every click through you — the usual choice when analytics matters.

Also say: store `code → {longUrl, ownerId, expiresAt}` in a KV store partitioned by code (scrambled codes spread evenly, no hot shards); cache-aside with TTL; click events go async so analytics can never slow a redirect; custom aliases use a conditional "insert if not exists" to avoid races.

---

## 8. Worked design: rate limiter

**Requirements:** e.g. 100 requests/minute per API key, shared across many gateway nodes, < 1–2 ms overhead, respond `429 Too Many Requests` with `Retry-After`. **Placement:** API gateway or middleware — never trust the client (on AWS: API Gateway throttling, WAF rate-based rules).

| Algorithm | How it works | Trade-off |
|---|---|---|
| Token bucket | Refill r tokens/s up to capacity b; request takes one | Allows bursts up to b; most common |
| Leaky bucket | Requests queue and leave at a fixed rate | Smooth output; bursts wait or drop |
| Fixed window counter | Count per clock minute | Cheap; up to 2× limit across a boundary |
| Sliding window log | Keep every timestamp in the last 60 s | Exact; memory grows with traffic |
| Sliding window counter | current + previous × overlap | Close approximation, O(1) memory |

Fixed-window flaw: 100 requests at 12:00:59 and 100 at 12:01:00 are both legal — 200 in two seconds. Sliding window counter fixes most of it: limit 100, previous minute 80, current 30, 25 % into the minute → `30 + 80 × 0.75 = 90` → allowed.

Counters live in Redis so all nodes share them. `INCR` then a separate `EXPIRE` is not atomic: if the caller dies in between, the key never expires and the user is blocked forever. Use one Lua script:

```lua
-- KEYS[1] = rl:{api_key}:<window>, ARGV[1] = limit, ARGV[2] = window seconds
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[2])
end
if current > tonumber(ARGV[1]) then
  return 0
end
return 1
```

**Sizing:** 10 M active keys × ~100 bytes = 1 GB — a small primary + replica. In Redis Cluster the `{api_key}` hash tag keeps one caller's keys on one slot.

**Trade-offs:** fail **open** when Redis is down (protects availability) vs fail **closed** (protects a fragile backend); a local per-node pre-check saves Redis calls but over-admits slightly.

---

## 9. Worked design: chat system — requirements and connections

**Functional:** 1:1 and group chat (≤ 500 members), history, sent/delivered/read receipts, presence, multiple devices, push when offline. **Non-functional:** < 200 ms delivery online, no lost messages, order preserved per conversation.

**Assumptions:** 50 M DAU, 40 messages/user/day, ~100 bytes/message, 20 % of DAU connected at peak.

```text
Messages/day = 50 M x 40                 = 2 billion
Avg QPS      = 2,000,000,000 / 86,400    ~= 23,000 msg/s  (peak x3 ~= 69,000)
Storage      = 2 B x 100 B = 200 GB/day  -> x 365 = 73 TB/year (before replication)
Connections  = 20 % x 50 M               = 10 M concurrent
Gateways     = 10 M / 50,000 per node (assumed) = 200 nodes + headroom
```

Plain request/response cannot push to a client, so use **WebSocket** (full-duplex over one TCP connection), with long polling as fallback. The connection tier becomes **stateful**, so separate it from stateless logic:

```text
 device --wss--> LB --> chat gateway (holds sockets)
                             |
                             v
                   message service (stateless) --> message store (wide-column)
                      |              |
       session registry (Redis:      +--> recipient's gateway --> device
       user -> gateway, device)      +--> queue --> push worker --> APNs / FCM
```

Deploys drain connections gradually, and clients reconnect with jittered backoff so a gateway restart does not cause a thundering herd.

---

## 10. Chat system — storage, ordering, delivery, presence

**Send flow (at-least-once plus dedupe):**

```text
 1. A -> gateway: send {clientMsgId, conversationId, body}
 2. message service assigns messageId + per-conversation seq, persists
 3. server -> A: ack {clientMsgId, messageId, seq}        -> "sent"
 4. find B's devices in session registry, push via their gateways
    (offline -> enqueue push notification)
 5. B -> server: delivered {messageId}, later read {seq}   -> receipts to A
```

The client retries until acked, so the server **dedupes on `clientMsgId`** — the idempotent-consumer pattern. Each device keeps a cursor (last seq); on reconnect it asks for everything after it, which also syncs multiple devices.

Write-heavy, append-only, read-by-conversation → wide-column store:

```sql
-- Cassandra CQL
CREATE TABLE messages (
  conversation_id bigint,
  bucket          int,     -- e.g. days since epoch, keeps partitions bounded
  message_id      bigint,  -- Snowflake-style: 41-bit ms time, 10-bit node, 12-bit seq
  sender_id       bigint,
  body            text,
  PRIMARY KEY ((conversation_id, bucket), message_id)
) WITH CLUSTERING ORDER BY (message_id DESC);
```

Without the bucket, an active group becomes an ever-growing hot partition.

**Groups:** ≤ 500 members → fan out on send to online members' gateways; very large channels → clients pull when they open the channel. **Presence:** heartbeat every ~30 s refreshes a Redis key with a TTL of about two intervals; expiry means offline. Publish presence only to contacts currently online, or one login becomes an update storm. **End-to-end encryption** means the server cannot read or search bodies — a product decision with architectural consequences.

---

## 11. Worked design: news feed

**Functional:** publish posts; a paginated home feed of followed accounts. **Non-functional:** feed p99 < 300 ms, new posts visible within seconds (eventual consistency OK), read-heavy.

**Assumptions:** 200 M DAU, 10 feed loads/user/day, 10 % of users post once a day, 200 followers on average.

```text
Feed reads = 200 M x 10 = 2 B/day      -> / 86,400 ~= 23,000/s
Posts      = 10 % x 200 M = 20 M/day   -> / 86,400 ~= 230/s
Fan-out    = 20 M x 200 = 4 B inserts/day -> ~46,000/s
Feed cache = 200 M x 500 post IDs x 8 B = 800 GB raw (cache active users only)
```

The key decision is **when** to build the feed:

| | Fan-out on write (push) | Fan-out on read (pull) |
|---|---|---|
| How | On post, insert ID into every follower's feed | On load, fetch followees' posts and merge |
| Read latency | Very fast (precomputed) | Slow when following many accounts |
| Write cost | Proportional to follower count | Constant |
| Breaks on | Celebrity with 50 M followers: at 10,000 inserts/s one post takes 5,000 s ≈ 83 min | Heavy reads, hard to cache |

Standard answer: **hybrid** — push for normal accounts (skipping inactive followers), pull for accounts above a follower threshold, merge both at read time, then rank.

```text
 post -> post service -> posts DB (+ media -> object storage/CDN)
            |
            v
          queue -> fan-out workers --(follower list)--> feed cache (Redis ZSET)

 load -> feed service -> feed cache IDs + celebrity posts (pull) -> rank
                      -> hydrate from post & user caches -> response
```

```bash
# fan-out worker: add post 9876 to user 42's feed (score = created_at), keep newest 500
redis-cli ZADD feed:42 1757836800 9876
redis-cli ZREMRANGEBYRANK feed:42 0 -501
# next page: 20 items strictly older than the cursor score
redis-cli ZRANGE feed:42 '(1757836800' -inf BYSCORE REV LIMIT 0 20
```

Use **cursor pagination** — offsets skip or repeat items as new posts arrive. Deleted posts are filtered at hydration rather than removed from millions of feeds.

---

## 12. Common mistakes

- **Boxes before requirements** — designing the wrong system well.
- **Numbers without consequences** — computing 23,000 QPS and never saying what it implies.
- **Over-engineering** — Kafka, Kubernetes and sharding for a 50 QPS internal tool. Match the design to the estimates and say which threshold would trigger the next step.
- **Buzzwords** — "add Redis" without the key, TTL and invalidation.
- **Ignoring failure** — no answer to "what if this node, queue or AZ dies?"
- **No trade-offs** — the interviewer assumes you did not see the cost.
- **Monologue or silence**, and trying to cover everything instead of going deep on two parts.

---

## Key interview points

- Framework: requirements → estimates → API → data model → high-level design → deep dive → bottlenecks, on a time budget.
- Clarify scope; when unanswered, **state assumptions aloud** and write them down.
- QPS = daily volume / 86,400 (1 M/day ≈ 11.6/s), peak 2–3×; show the arithmetic and **use** the result.
- URL shortener: 7 base62 chars = 3.5 trillion codes; leased counter ranges + scramble; 302 for analytics.
- Rate limiter: token bucket (bursts) or sliding window counter (O(1), accurate); atomic Lua in Redis; 429 + `Retry-After`; fail-open vs fail-closed.
- Chat: stateful WebSocket gateways + stateless message service; `clientMsgId` dedupe; per-conversation seq; partition by conversation + time bucket.
- News feed: hybrid fan-out; cache IDs in sorted sets; cursor pagination.
- Name the trade-off of every decision and the failure mode of every component.

## Summary

- The interview grades structured reasoning, not a memorised diagram.
- Requirements and estimates decide the architecture.
- API and access-pattern-driven data modelling come before boxes and arrows.
- Deep dives target what is genuinely hard: ID generation, distributed counting, stateful connections, fan-out.
- Evolve a simple design to meet stated numbers, and say what each step costs.
