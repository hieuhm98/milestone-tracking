# Caching Strategies – Speed Without Lying to Users

## 1. Why cache, and what it really costs

A **cache** is a faster, smaller copy of data whose source of truth lives somewhere slower. Caching trades **freshness and complexity** for **latency, throughput and cost**. Architects add a cache for one of three reasons: the source is slow (a 40 ms aggregate query), the source is expensive or rate-limited (a paid third-party API), or the source cannot take the load (a primary database at 80% CPU).

Rough latencies that justify the decision:

| Where the data is | Typical latency |
|---|---|
| In-process memory (a map in your service) | ~100 ns |
| Distributed cache in the same AZ (Redis, Memcached) | ~0.5–1 ms round trip |
| Indexed database query | ~1–10 ms; heavy queries 50 ms+ |
| Cross-region call / third-party API | 50–300 ms |

The number that matters is the **hit ratio**. Effective latency is:

```text
effective = hit_ratio * cache_latency + (1 - hit_ratio) * (cache_latency + source_latency)

cache 1 ms, database 40 ms
  hit ratio 95% -> 0.95*1 + 0.05*41 = 3.0 ms
  hit ratio 50% -> 0.50*1 + 0.50*41 = 21.0 ms
```

A cache with a poor hit ratio adds a network hop and a failure mode for little gain. Before adding one, ask: *is the data read far more often than it changes, and can the business tolerate it being slightly stale?* If either answer is no, fix the query or the index instead.

---

## 2. Multi-layer caching: browser to database

Real systems cache at several layers. Each layer closer to the user saves more work but is harder to invalidate.

```text
 user
  v
[Browser cache]        Cache-Control, ETag           a hit = no request at all
  v
[CDN edge]             s-maxage, cache key, purge    a hit = no trip to your region
  v
[Reverse proxy]        nginx proxy_cache (topic 8)   a hit = no app CPU
  v
[App: in-process L1]   small LRU, seconds of TTL     a hit = no network hop
  v
[Distributed L2]       Redis / Memcached / Valkey    shared across instances
  v
[Database]             buffer pool (pages in RAM)    the source of truth
```

The browser is the hardest to invalidate (you cannot reach into it), a CDN needs a purge, in-process copies diverge between instances, and a distributed cache has one place to delete. The rule of thumb: **the further out a layer is, the shorter or more versioned its content must be**. Never put personalised data in a shared layer without making the user part of the cache key.

---

## 3. Cache-aside (lazy loading)

**Cache-aside** is the default pattern: the application owns the logic, and the cache is a passive key-value store.

```text
read:   app -> cache GET key
          hit  -> return value
          miss -> app -> DB SELECT -> app -> cache SET key value TTL -> return

write:  app -> DB UPDATE -> app -> cache DEL key
```

```js
async function getProduct(id) {
  const key = `product:v1:${id}`;
  const cached = await redis.get(key);

  if (cached !== null) return JSON.parse(cached);

  const product = await db.products.findById(id);

  if (product) {
    await redis.set(key, JSON.stringify(product), { EX: 300 });
  }

  return product;
}

async function updateProduct(id, changes) {
  await db.products.update(id, changes);
  await redis.del(`product:v1:${id}`); // delete, do not overwrite
}
```

Strengths: only requested data is cached, and if the cache is down the app still reads the database. Weaknesses: the first request per key is slow (a **cold cache** after failover can overwhelm the DB), and application code must handle every miss and invalidation correctly.

---

## 4. Read-through, write-through, write-behind, refresh-ahead

In the other patterns the **cache layer itself talks to the source**, so the application sees only the cache.

| Pattern | How it works | Main risk |
|---|---|---|
| **Read-through** | On a miss, the cache (or a library in front of it) loads from the DB via a configured loader | Loader logic hidden in infrastructure |
| **Write-through** | App writes to the cache; the cache synchronously writes the DB, then acknowledges | Write latency = cache + DB; caches data nobody reads |
| **Write-behind** (write-back) | App writes to the cache; the cache acknowledges and flushes to the DB asynchronously, often batched | **Data loss** if the cache dies before flushing |
| **Refresh-ahead** | Entries close to expiry are reloaded in the background | Wasted reloads for keys that go cold |

On AWS, **DynamoDB Accelerator (DAX)** is a read-through/write-through cache for DynamoDB; **ElastiCache** is a plain store you use with cache-aside. Write-behind suits high-volume counters, view counts or telemetry where losing a second of writes is acceptable — never payments or inventory.

---

## 5. TTL design

A **TTL (time to live)** is your upper bound on staleness and your safety net for invalidation bugs. Always set one, even when you also invalidate explicitly.

How to pick it:

- **Start from the business tolerance.** "A price may be wrong for at most 60 s" gives TTL ≤ 60 s. Product descriptions might tolerate an hour; a stock count only seconds.
- **Weigh change rate against read rate.** A key read 1,000 times per second and changed once a day is ideal for long TTLs plus event invalidation.
- **Add jitter.** If 100,000 keys are loaded at the same moment with the same TTL (for example, a cache warm-up after deploy), they all expire at the same moment. Randomise: `ttl = base + random(0, base * 0.1)`.
- **Use different TTLs per layer.** Browser 60 s, CDN 5 min with purge on change, application 10 min with delete on write.
- **Cache negative results briefly.** "User 42 does not exist" cached for 30–60 s protects the DB from repeated lookups for missing keys.
- **Know what not to cache.** Fingerprinted assets get a year (the URL changes instead); sessions use sliding expiry; the balance or stock count used to *decide* a checkout is read from the source.

---

## 6. Invalidation strategies

"There are only two hard things in computer science: cache invalidation and naming things." The hard part is not deleting a key — it is knowing **every** key that a change affects, across every layer.

| Strategy | How | Good for |
|---|---|---|
| **TTL expiry only** | Let entries age out | Data where bounded staleness is fine |
| **Delete on write** | After the DB commit, `DEL` affected keys | Most cache-aside systems |
| **Event-driven** | Publish a change event or tail the DB log (CDC, e.g. Debezium) and invalidate from a consumer | Many services write the same data; decouples writers from cache keys |
| **Versioned keys** | Put a version in the key (`product:v7:42`) or bump a namespace counter, so old keys are simply never read again | Bulk invalidation, schema changes, deploys |
| **Tag / surrogate keys** | Tag responses (`product-42`) and purge by tag | CDN pages that embed many objects |

Why **delete** rather than **set** the new value on write? Two concurrent writers can commit to the DB in one order and update the cache in the other, leaving the older value cached until TTL. Deleting is idempotent: the next read reloads whatever the DB now holds.

Order matters too. Delete **after** the DB commit; deleting first lets a concurrent reader reload the old row before your write lands. If the delete itself fails (network blip), the TTL is your backstop — or retry the delete from an outbox or a CDC consumer so it is guaranteed to happen.

---

## 7. Consistency trade-offs

A cache sits outside the database transaction, so **cache + DB is eventually consistent at best**. Even correct cache-aside has a rare race:

```text
time  Reader A                         Writer B
 t1   GET key -> miss
 t2   SELECT row -> old value
 t3                                    UPDATE row -> new value (commit)
 t4                                    DEL key
 t5   SET key = old value              <- stale until TTL expires
```

It needs a read that starts before and finishes after a whole write, so it is rare — but at high traffic "rare" happens daily. Mitigations, from cheap to strong:

- **Short TTL** — caps the damage window.
- **Delayed double delete** — delete, commit, then delete again after a delay longer than a typical read (e.g. 500 ms).
- **Version checks / leases** — the reader receives a token on miss and its `SET` is rejected if the key was invalidated meanwhile (Facebook's Memcache paper calls these leases).
- **Read-your-writes** — after a user edits, read that user's data from the primary for a short period, or bypass the cache for them.
- **Don't cache it** — for values that drive money or irreversible decisions, read the source of truth.

The review question is always: *what is the worst consequence of serving this value N seconds stale?* A stale avatar is harmless; a stale seat count oversells a flight.

---

## 8. Cache stampede (dogpile) and its cures

A **cache stampede** (thundering herd, dogpile) happens when a hot key expires and hundreds of concurrent requests miss at once, all run the same expensive query, and the database falls over.

```text
t0         key "home:feed" expires (5,000 req/s on it)
t0+1 ms    request 1 miss -> run 800 ms query
t0+2 ms    request 2 miss -> run 800 ms query
...        ~4,000 identical queries before the first SET -> DB CPU 100%
```

The cures, usually combined:

1. **Request coalescing (single flight)** — within one instance, concurrent misses for the same key share one in-flight promise.
2. **Distributed lock / mutex** — only the request that acquires a short lock rebuilds; others wait briefly and retry the cache, or serve the stale value.
3. **Stale-while-revalidate** — keep serving the old value past its soft expiry while one background job refreshes it.
4. **Early (probabilistic) refresh** — each reader, as expiry approaches, refreshes with a probability that grows toward 1, so usually just one request refreshes before the key expires. The published formula (Vattani et al., 2015) recomputes when `now - delta * beta * ln(random()) >= expiry`, where `delta` is the recompute time and `beta` ≈ 1.
5. **TTL jitter** — prevents many different keys expiring together.

```js
const inFlight = new Map();

async function getWithCoalescing(key, load, ttlSeconds) {
  const cached = await redis.get(key);

  if (cached !== null) return JSON.parse(cached);

  if (inFlight.has(key)) return inFlight.get(key);

  const promise = (async () => {
    try {
      const value = await load();
      const jitter = Math.floor(Math.random() * ttlSeconds * 0.1);
      await redis.set(key, JSON.stringify(value), { EX: ttlSeconds + jitter });

      return value;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);

  return promise;
}
```

Coalescing protects per instance; with 50 instances you can still get 50 rebuilds, which is where a lock (`SET lock:key token NX PX 10000`) or stale-while-revalidate comes in. The lock needs an expiry so a crashed holder cannot block rebuilds forever — lock caveats are covered in the Redis topic.

---

## 9. Hot keys, penetration and avalanche

Three related failure modes come up in every caching interview.

| Problem | What happens | Defences |
|---|---|---|
| **Hot key** | One key (a celebrity profile, a flash-sale item) gets so much traffic it saturates a single cache shard or its network | L1 in-process cache with a 1–5 s TTL; replicate the key as `item:42#0..#9` and read a random copy; pre-warm before the event |
| **Cache penetration** | Requests for keys that do not exist (bugs or attackers scanning IDs) always miss and hit the DB | Cache negative results with a short TTL; a **Bloom filter** of valid IDs rejects impossible keys; validate input |
| **Cache avalanche** | A large fraction of keys expire together, or the cache cluster fails, so all traffic hits the DB | TTL jitter; replicated/HA cache; rate limit or circuit breaker in front of the DB; serve stale or degraded responses |

**Big keys** are a cousin: a 5 MB cached list costs serialisation and network time on every read. Split it (paginate, cache per item). Watch the metrics that reveal these failures: hit ratio, evictions per second, p99 cache latency, and DB QPS.

---

## 10. Eviction, sizing and choosing a cache store

A cache is finite. When it fills, an **eviction policy** decides what to drop. **LRU** (least recently used) suits most workloads with temporal locality; **LFU** (least frequently used) suits stable popularity such as top-selling products; TTL-based eviction drops keys closest to expiry; FIFO or random are cheap but rarely best.

Size the cache for the **working set**, not the whole dataset: if 20% of products get 90% of reads, cache that 20% with headroom. Steady evictions of keys that are then requested again (churn) mean the cache is too small.

Choosing where to cache:

| | In-process (Caffeine, `lru-cache`) | Distributed (Redis, Memcached, Valkey) |
|---|---|---|
| Latency | Nanoseconds | ~1 ms |
| Shared across instances | No — each copy diverges | Yes |
| Survives a restart | No | Yes (with replication) |
| Invalidation | Needs pub/sub to all instances | One `DEL` |

A common pairing is **two-tier**: a small in-process L1 with seconds of TTL for the hottest keys, a distributed L2 for everything else. Redis internals are covered in topic 9.

---

## 11. HTTP caching headers

HTTP caching (RFC 9111) is the cheapest cache you have: the browser or a CDN does the work. The origin controls it with response headers.

| Directive | Meaning |
|---|---|
| `Cache-Control: max-age=N` | Fresh for N seconds in any cache |
| `s-maxage=N` | Overrides `max-age` for **shared** caches (CDN, proxy) only |
| `public` / `private` | `private` = only the user's browser may store it (per-user data) |
| `no-cache` | May store, but **must revalidate** with the origin before each use |
| `no-store` | Must not be stored anywhere (sensitive data) |
| `immutable` | Will never change during its freshness lifetime; skip revalidation on reload |
| `stale-while-revalidate=N` | May serve stale for N s while refreshing in the background |
| `stale-if-error=N` | May serve stale for N s if the origin errors |
| `Vary: Accept-Encoding` | The listed request headers become part of the cache key |

**Revalidation** avoids re-downloading unchanged content:

```text
1st  GET /api/products          -> 200 OK
                                   ETag: "a1b2c3"
                                   Cache-Control: no-cache
2nd  GET /api/products
     If-None-Match: "a1b2c3"     -> 304 Not Modified (no body)
```

`Last-Modified` / `If-Modified-Since` works the same way with timestamps. A typical web app policy:

```text
/assets/app.3f9a1c.js   Cache-Control: public, max-age=31536000, immutable
/index.html             Cache-Control: no-cache            (+ ETag)
/api/me                 Cache-Control: private, no-store
/api/catalog            Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=30
```

Note that `no-cache` does **not** mean "don't cache" — `no-store` does. And be careful with `Vary: User-Agent` or `Vary: Cookie`: they fragment the cache into near-zero hit ratio.

---

## 12. CDN caching in practice

A **CDN** caches at edge locations close to users, cutting latency and shielding the origin. What architects must decide:

- **Cache key.** By default roughly host + path (+ selected query strings). Every header, cookie or query parameter you add multiplies the variants and lowers the hit ratio. Forward only what the origin actually uses.
- **Invalidation.** Prefer **versioned URLs** (`app.3f9a1c.js`) so a deploy needs no purge at all. Use purges for HTML and content that must change at a stable URL. On **CloudFront**, invalidations by path take effect within minutes, and beyond a free monthly allowance you pay per path, so wildcard or versioned approaches scale better.
- **Origin shield.** An extra regional caching tier in front of the origin, so edge misses from many locations collapse into one origin request (CloudFront Origin Shield; the same idea exists on other CDNs).
- **Dynamic and personalised content.** Cache the shell publicly and fetch per-user parts separately, or keep them `private`. A response with `Set-Cookie` or user data cached publicly is a classic data-leak incident.
- **Default TTLs.** If the origin sends no caching headers, the CDN falls back to its own default (CloudFront's default TTL is 24 hours) — always send explicit headers.

```text
             edge Tokyo ----\
user(VN) --> edge Singapore --> origin shield (1 region) --> origin (ALB / S3)
             edge Sydney ---/
   cache hit at edge: ~10-30 ms       miss collapses here     only one fetch
```

Measure CDN health by **edge hit ratio** and **origin requests per second**; a deploy that adds `?t=timestamp` to every asset shows up as a collapse of the first and a spike in the second.

---

## Key interview points

- Cache when reads greatly outnumber writes and bounded staleness is acceptable; justify it with **hit ratio** and effective latency, not a hunch.
- **Cache-aside** is the default: read miss → load → `SET` with TTL; write → commit DB → **`DEL`** the key. Write-behind is fast but can **lose data**.
- Always set a **TTL**, add **jitter**, and choose it from the business's staleness tolerance.
- Cache + DB is **eventually consistent**; know the read-after-delete race and its fixes (short TTL, double delete, leases, read-your-writes, or not caching decision-critical data).
- **Stampede**: single flight, lock with expiry, stale-while-revalidate, probabilistic early refresh. **Penetration**: negative caching and Bloom filter. **Avalanche**: jitter and HA. **Hot key**: L1 cache and key replication.
- Layers: browser → CDN → proxy → in-process → distributed → DB; the further out, the harder to invalidate, so version URLs.
- `no-cache` = revalidate; `no-store` = never store; `s-maxage` targets shared caches; `private` for per-user data; ETag → 304.

## Summary

- A cache trades freshness and complexity for latency, throughput and cost; its value is measured by hit ratio.
- Cache-aside, read-through, write-through, write-behind and refresh-ahead differ in who loads and writes data, and in their consistency and durability risks.
- TTLs bound staleness; invalidation by delete, events, versioned keys or tags keeps data correct sooner; delete after commit.
- Stampedes, hot keys, penetration and avalanches are predictable failure modes with standard defences.
- Eviction policy and working-set sizing decide whether the cache actually holds what is read.
- HTTP headers and CDNs push caching to the edge; versioned URLs make invalidation free and cache keys decide the hit ratio.
