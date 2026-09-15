# Scalability & Reliability

## 1. Scalability, availability, reliability — say what you mean

These words get used interchangeably in meetings. In an architecture review they mean different things:

| Term | Question it answers | Measured by |
|---|---|---|
| **Performance** | How fast is one request? | Latency (p50, p99) |
| **Scalability** | Can we handle *more* load by adding resources, without redesign? | Throughput per unit of cost as load grows |
| **Elasticity** | Can capacity follow load up *and down* automatically? | Time to scale, idle cost |
| **Availability** | Is the system up and answering right now? | % of time (or % of requests) served successfully |
| **Reliability** | Does it do the *correct* thing, consistently, over time? | Failure rate, MTBF, correctness |
| **Resilience** | How well does it absorb and recover from failure? | MTTR, blast radius |

A system can be fast but not scalable (a single tuned server), or available but not reliable (it answers, but with stale or wrong data). Availability is usually expressed in "nines":

| Availability | Downtime per year | Downtime per 30-day month |
|---|---|---|
| 99% | ~3.65 days | ~7.2 hours |
| 99.9% | ~8.76 hours | ~43 minutes |
| 99.95% | ~4.38 hours | ~21.6 minutes |
| 99.99% | ~52.6 minutes | ~4.3 minutes |
| 99.999% | ~5.26 minutes | ~26 seconds |

Each extra nine costs roughly an order of magnitude more effort: redundancy, automation, testing and on-call maturity. The first architecture question is always "how many nines does the *business* actually need?" Turning that into SLIs, SLOs and error budgets is covered in the observability topic (16).

---

## 2. Vertical vs horizontal scaling

**Vertical scaling** (scale up) gives one machine more CPU, RAM or faster disk. **Horizontal scaling** (scale out) adds more machines behind a load balancer.

| | Vertical | Horizontal |
|---|---|---|
| Code changes | None | App must be stateless or partition its state |
| Ceiling | Largest instance available | Practically very high |
| Cost curve | Big instances cost disproportionately more | Roughly linear |
| Failure | Still a single point of failure | Losing one node loses 1/N of capacity |
| Scaling action | Usually a restart/resize | Add nodes, often with no downtime |
| Good fit | Relational primary DB, legacy apps, quick relief | Stateless web/API tiers, workers, caches |

In practice you do both: scale up the database primary until it hurts (it is the hardest thing to scale out), scale out everything stateless. Scaling out the *data* tier — replicas, partitioning, sharding — is its own topic (12). Remember that horizontal scaling moves the bottleneck: ten more API servers can simply mean ten times more connections hammering one database.

---

## 3. Stateless services: the precondition for scale-out

A service is **stateless** when any instance can handle any request, because nothing a request needs lives only in one instance's memory or local disk. That is what lets you add, remove, replace or crash instances freely.

Where the state goes instead:

| State | Stateful anti-pattern | Stateless alternative |
|---|---|---|
| User session | In-process memory | Signed token (JWT) or shared store (Redis) |
| Uploaded files | Local disk | Object storage (S3) |
| Scheduled jobs | `cron` on "server 1" | Scheduler service / queue with one consumer group |
| Locks, counters | In-memory map | Database or Redis with proper semantics |

**Sticky sessions** (session affinity — the LB pins a client to one instance via a cookie) are a crutch, not a solution: a crashed instance still logs its users out, scale-in becomes disruptive, and load becomes uneven because heavy users stay glued to one node. Use them only as a migration step. Stateless also means **disposable**: instances start fast, shut down gracefully on `SIGTERM`, and can be killed at any time — which is exactly what autoscaling, rolling deploys and chaos experiments will do to them.

---

## 4. Load balancing & health checks

A load balancer spreads requests across healthy instances and removes unhealthy ones. (L4 vs L7 mechanics are in topic 3; nginx configuration in topic 8.) From a reliability point of view, three decisions matter.

**Algorithm.** Round robin assumes identical requests and instances. **Least connections / least outstanding requests** adapts when some requests are slow. **Consistent hashing** keeps a key on the same backend (useful for caches). **Power of two random choices** — pick two backends at random, send to the less loaded — scales well without global state.

**Health checks.**

- **Active**: the LB probes an endpoint such as `GET /healthz` every N seconds; after X failures the target is marked unhealthy, after Y successes healthy again.
- **Passive** (outlier detection): the LB watches real traffic and ejects a backend that returns errors or times out.

```nginx
upstream api {
    least_conn;
    # passive checks: 3 failures within 30s ejects the server for 30s
    server 10.0.1.10:8080 max_fails=3 fail_timeout=30s;
    server 10.0.1.11:8080 max_fails=3 fail_timeout=30s;
    server 10.0.1.12:8080 backup;
}
```

**Shallow vs deep checks** is the classic trap. A deep check that also verifies the database looks thorough, but when the database blips, *every* instance fails its check at once and the LB removes the whole fleet — turning a partial outage into a total one. Keep the LB health check about "can this process serve traffic", and report dependency health through metrics and degraded responses. (AWS ALB, for this reason, fails open: if every target in a group is unhealthy it routes to all of them.)

**Connection draining.** When an instance is removed (scale-in, deploy), the LB should stop sending new requests but let in-flight ones finish — ALB's *deregistration delay* defaults to 300 seconds. The app must cooperate: on `SIGTERM`, fail the readiness check, finish current work, then exit.

---

## 5. High availability & redundancy

High availability means **no single point of failure (SPOF)**: for every component, ask "what happens when this dies?" Common hidden SPOFs: the one NAT gateway, the one DNS provider, the primary database, a shared config server, the deploy pipeline, a single person with the root password.

**Redundancy models**

| Model | Meaning | Survives |
|---|---|---|
| **N** | Exactly enough capacity for peak | Nothing |
| **N+1** | One spare unit | One failure (or one node down for maintenance) |
| **N+2** | Two spares | A failure *during* maintenance |
| **2N** | A full duplicate of everything | Loss of an entire side |

**Active-passive** keeps a standby that takes over on failure (simpler, but failover takes time and the standby may be broken without anyone noticing). **Active-active** serves traffic from every copy (no failover step, capacity is exercised continuously, but you must handle data consistency and keep each copy able to absorb the others' load).

**The availability math.** Components in **series** multiply; redundant components in **parallel** multiply their *unavailability*:

```text
Series:    LB (99.99%) -> App (99.9%) -> DB (99.9%)
           0.9999 * 0.999 * 0.999 = 0.9979  -> ~99.8%

Parallel:  two independent app nodes, each 99%
           1 - (0.01 * 0.01) = 0.9999        -> 99.99%
```

Every dependency you add in series lowers availability below that of your weakest link; redundancy raises it — but only if failures are **independent**. Two replicas in the same rack, on the same bad config push, or behind the same expired certificate fail together.

---

## 6. Failure domains: multi-AZ and multi-region

A **failure domain** is a set of things that fail together: a process, a host, a rack, an availability zone (AZ — one or more data centres with independent power and networking), a region, a cloud provider, and — often forgotten — a deployment or a configuration change.

```text
                         Region (e.g. ap-southeast-1)
   +----------------------------------------------------------------+
   |          Load balancer (spans all AZs)                         |
   |       /                 |                  \                   |
   |  +---------+       +---------+        +---------+              |
   |  |  AZ a   |       |  AZ b   |        |  AZ c   |              |
   |  | app x2  |       | app x2  |        | app x2  |              |
   |  | DB prim.| ----> | DB stby |        | replica |              |
   |  +---------+ sync  +---------+        +---------+              |
   +----------------------------------------------------------------+
```

**Multi-AZ** is the default for production: low-latency synchronous replication between AZs is practical, and it protects against the most common large failures. **Multi-region** protects against regional outages and serves global users, but cross-region latency (tens to hundreds of ms) forces **asynchronous** replication, which means possible data loss on failover and hard consistency problems for active-active writes. Do it when the business case (RTO/RPO, regulation, global latency) justifies the cost and complexity.

**Static stability** is the key design idea: the system should keep working through a failure *without having to make changes* — because control planes (autoscaling APIs, DNS updates) are often impaired during big incidents. Concretely: to survive losing one of three AZs, pre-provision so that the remaining two can carry peak — each AZ at ~50% of peak, 150% in total — rather than planning to "autoscale when it happens".

**Cell-based architecture** limits blast radius further: split customers into independent cells (full copies of the stack), so a bad deploy or poison request affects one cell, not everyone.

---

## 7. RTO, RPO and disaster recovery strategies

Two numbers drive every DR design:

- **RPO (Recovery Point Objective)** — how much *data* you can afford to lose, measured in time. RPO 15 min means you may lose the last 15 minutes of writes.
- **RTO (Recovery Time Objective)** — how long you can afford to be *down* before service is restored.

```text
          last good backup/replica         disaster            service restored
  ------------------|------------------------X--------------------------|------> time
                    <-------- RPO ---------->  <----------- RTO -------->
                        (data lost)                  (downtime)
```

The four classic strategies trade cost against RTO/RPO:

| Strategy | What runs in the DR site | Typical RPO | Typical RTO | Cost |
|---|---|---|---|---|
| **Backup & restore** | Nothing; backups copied off-site | Hours (backup frequency) | Hours to a day | $ |
| **Pilot light** | Data replicated; core infra defined, app servers off | Minutes | Tens of minutes | $$ |
| **Warm standby** | Scaled-down but fully working copy | Seconds to minutes | Minutes | $$$ |
| **Multi-site active-active** | Full production in both sites, both serving | Near zero | Near zero | $$$$ |

Things that separate a real DR plan from a slide:

- **Backups you have never restored are not backups.** Test restores on a schedule and measure the actual RTO.
- **Protect against logical failures**, not only site loss: replication faithfully copies a `DROP TABLE` or ransomware encryption. You need point-in-time recovery and immutable/offline copies.
- **Infrastructure as code** (topic 15) is what makes pilot light and warm standby possible — you cannot hand-build a region at 3 a.m.
- **Decide who presses the failover button** and how you fail *back*.

---

## 8. Timeouts, retries and graceful degradation

Most large outages are not a server dying; they are a *slow* dependency whose waiting requests pile up until everything upstream runs out of threads, connections or memory — a **cascading failure**.

**Timeouts** are the first defence: every network call needs one, set from the dependency's real latency (e.g. a bit above its p99), and the caller's total timeout must be larger than the sum of what it waits for downstream. A default of "no timeout" or 60 seconds is a bug.

**Retries** fix transient errors but multiply load exactly when the dependency is struggling:

```text
 client --3 tries--> API --3 tries--> service --3 tries--> DB
 worst case at the DB: 3 * 3 * 3 = 27 attempts for one user click
```

Rules: retry only idempotent operations (or use idempotency keys), retry at **one** layer, cap attempts, and use **exponential backoff with jitter** so thousands of clients do not retry in lockstep (a *thundering herd*):

```js
async function withRetry(fn, { attempts = 4, baseMs = 100, capMs = 5000 } = {}) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      const last = i === attempts - 1;

      if (last || !err.retryable) throw err;

      // full jitter: random delay between 0 and the exponential ceiling
      const ceiling = Math.min(capMs, baseMs * 2 ** i);
      await new Promise((r) => setTimeout(r, Math.random() * ceiling));
    }
  }
}
```

A **retry budget** (e.g. retries may add at most 10% extra load) and a **circuit breaker** that stops calling a failing dependency complete the picture — circuit breakers and bulkheads are covered with microservices (topic 18).

**Graceful degradation** means deciding in advance what the product does with a dependency gone: show the product page without personalised recommendations, serve cached prices marked "may be out of date", accept orders into a queue and confirm by email later, switch search to read-only. Classify features as *critical* (checkout) vs *optional* (reviews, recommendations) and make optional ones fail fast and quietly. Serving stale cached data is a common fallback — cache design itself is topic 10.

---

## 9. Backpressure and load shedding

Every system has a maximum throughput. When arrivals exceed it, work has to go *somewhere*: into unbounded queues (latency grows until requests time out — the server stays busy doing work nobody is waiting for any more), into memory (OOM), or back to the sender. Choosing that deliberately is the point of this section.

**Backpressure** pushes the "slow down" signal upstream so producers match the consumer's pace: bounded queues that block or reject when full, TCP flow control, pull-based consumers (a Kafka consumer fetches only what it can process), reactive streams with demand signalling. The golden rule: **every queue must be bounded**, and you must decide what happens when it is full.

**Load shedding** deliberately rejects some work early and cheaply so the rest succeeds. Rejecting in 1 ms is far better than accepting and timing out after 30 s.

```js
// Minimal concurrency-based load shedder (Express-style middleware)
const MAX_IN_FLIGHT = 200;
let inFlight = 0;

function shedLoad(req, res, next) {
  if (inFlight >= MAX_IN_FLIGHT && req.priority !== 'critical') {
    res.set('Retry-After', '2');

    return res.status(503).json({ error: 'overloaded, retry later' });
  }

  inFlight++;
  res.on('close', () => inFlight--);
  next();
}
```

Good load shedding:

- **Prioritises**: shed health checks last, background/batch and free-tier traffic first, keep checkout and login.
- **Returns fast, explicit signals**: `503 Service Unavailable` for overload or `429 Too Many Requests` for per-client limits (rate-limiting algorithms are in topic 17), with `Retry-After`.
- **Drops stale work**: if a request has already waited longer than the client's timeout, do not process it (deadline propagation).

---

## 10. Capacity planning and autoscaling

Capacity planning answers "how much do we need, and when?" before users answer it for you.

**Why you never run at 100%.** For a simple queueing model, response time is roughly `R = S / (1 - U)` where `S` is service time and `U` utilisation:

```text
 utilisation   50%    70%    80%    90%    95%
 latency       2x     3.3x   5x     10x    20x   (relative to service time)
```

Latency explodes past the "knee" around 70–80%. That is why autoscaling targets are usually around 50–70% CPU, not 90%.

**A practical process**

1. **Measure a unit**: load test one instance to find its maximum RPS at an acceptable p99 (tools: k6, Gatling, Locust, JMeter) — find the real bottleneck (CPU, DB connections, a lock), not the one you assume.
2. **Forecast demand**: current peak × growth × seasonal events (Tet sales, 11.11, a marketing push).
3. **Add headroom**: target utilisation (e.g. 60%) + surviving a failure domain (N+1 / AZ loss) + spike margin.
4. **Account for lead time**: new instances take minutes to boot and warm up; database upgrades and reserved capacity take days or weeks.
5. **Re-validate** after every major release — performance regressions silently eat capacity.

Worked example: peak 6,000 RPS, one instance sustains 500 RPS at target p99, run at 60% → 300 RPS each → 20 instances. Survive one of 3 AZs → the other two must carry it → 30 instances, 10 per AZ.

**Autoscaling** policies: *target tracking* (keep CPU or RPS-per-target near a value), *step* (add N when a threshold is crossed), *scheduled* (scale before a known event), and *predictive* (forecast from history). Autoscaling handles gradual change; it does **not** handle a spike that arrives faster than instances boot — for that you need pre-warming, headroom and load shedding. Always set a max (a bug or attack should not scale your bill to infinity) and scale in more slowly than you scale out. (Kubernetes HPA and cluster autoscaler are in topic 7.)

---

## 11. Chaos engineering

You do not know a system is resilient until you have watched it fail. **Chaos engineering** is running controlled experiments that inject failure to verify — or disprove — your assumptions, before a real incident does it for you. Netflix popularised it with Chaos Monkey, which randomly terminates production instances.

**The experiment loop**

1. Define **steady state** with a business metric (orders per minute, successful logins), not CPU.
2. Form a **hypothesis**: "If one AZ loses its app instances, checkout success stays above 99.5% and p99 stays under 800 ms."
3. **Inject** a realistic fault: kill instances, add 300 ms latency to a dependency, drop packets, fill a disk, expire a certificate, throttle an API, fail over the database.
4. **Limit the blast radius**: start in staging, then a small percentage of production traffic, with an abort switch and automatic stop conditions tied to alarms.
5. **Observe, learn, fix**, then automate the experiment so regressions are caught.

**Game days** are scheduled exercises where the team runs a scenario (region failover, restore from backup) together and practises the runbooks and communication, not only the technology.

Tools: AWS Fault Injection Service (FIS), Azure Chaos Studio, Chaos Mesh and LitmusChaos for Kubernetes, Gremlin (commercial), Toxiproxy for network faults in tests. Prerequisites: good observability (topic 16) and a culture of blameless postmortems — chaos without monitoring is just breaking things.

---

## 12. Reliability review checklist and anti-patterns

The questions a senior architect asks of any design:

| Area | Question |
|---|---|
| SPOF | What is the single component whose failure takes everything down? |
| Failure domains | Does it survive losing an instance? An AZ? A bad deploy? |
| State | Can any instance be killed right now without user impact? |
| Health checks | Would a dependency blip mark the entire fleet unhealthy? |
| Dependencies | Does every call have a timeout, bounded retries with jitter, and a fallback? |
| Overload | What happens at 3× peak — graceful rejection or collapse? Are all queues bounded? |
| Data | What are the RPO and RTO, and when was a restore last tested? |
| Verification | Which of these have been proven by a test, a game day or a real incident? |

**Anti-patterns to name in a review:** a "highly available" app tier in front of a single database; retries at every layer; unbounded queues and thread pools; deep health checks; failover that has never been exercised; autoscaling as the only overload plan; DR region in the same account/credentials as production; and assuming replicas are independent when they share config, code and deploy timing.

---

## Key interview points

- **Scale up** is simple but has a ceiling and stays a SPOF; **scale out** needs **stateless** services — move sessions, files and jobs to shared stores.
- Health checks should be **shallow**; deep checks can eject the whole fleet when a dependency blips. Drain connections on `SIGTERM`.
- **Series availability multiplies down, parallel redundancy multiplies unavailability** — and only helps when failures are independent.
- Design for **failure domains**: multi-AZ by default, multi-region only when RTO/RPO or global latency justifies async replication and its complexity. Aim for **static stability** (pre-provisioned capacity, e.g. 150% across 3 AZs).
- **RPO = data loss, RTO = downtime.** Backup & restore → pilot light → warm standby → active-active: cost rises as both shrink. Test restores; protect against logical corruption.
- Prevent cascades: **timeouts everywhere, retry at one layer with exponential backoff + jitter**, retry budgets, graceful degradation of optional features.
- **Bound every queue.** Use backpressure and **load shedding** (fast `503`/`429` + `Retry-After`, prioritised) instead of accepting work you cannot finish.
- Latency rises as `1/(1 - utilisation)`: plan for ~60–70% target utilisation plus failure-domain headroom and provisioning lead time.
- **Chaos engineering** = hypothesis + steady-state business metric + small blast radius + abort conditions.

## Summary

- Scalability, availability and reliability are distinct properties; decide how many nines the business needs before designing.
- Stateless services behind health-checked load balancers are the foundation of horizontal scale and fast recovery.
- Redundancy across independent failure domains removes SPOFs; the availability math shows why dependencies in series hurt.
- RTO and RPO choose the DR strategy, and only tested restores and failovers count.
- Timeouts, careful retries, graceful degradation, backpressure and load shedding stop one slow component from taking the system down.
- Capacity planning, sensible autoscaling and chaos experiments turn reliability from hope into something measured.
