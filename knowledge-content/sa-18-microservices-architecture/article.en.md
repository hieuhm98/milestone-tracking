# Microservices Architecture – Boundaries, Resilience and Distributed Data

## 1. The spectrum: monolith, modular monolith, microservices

"Monolith vs microservices" is a false binary — it is a spectrum of deployment units and boundary strength:

| Style | Deployment | Data | Boundaries enforced by |
|---|---|---|---|
| Monolith | One unit | One shared schema, any code touches any table | Nothing |
| **Modular monolith** | One unit | One database, each module owns its tables | Module APIs, architecture tests |
| **Microservices** | Many independently deployable units | **Database per service** | The network |

A **microservice** owns one business capability and its data, and talks to others only through APIs or events. The key word is *independently deployable*: if five services must be released together, you have a **distributed monolith** — all the costs of distribution, none of the benefits.

A modular monolith is the right default for most systems: in-process calls are fast and transactional, and clean module boundaries make a later split cheap.

---

## 2. Why microservices — and the distributed-systems tax

The real drivers are **organisational**: independent deployment per team, clear ownership (Conway's law — systems mirror the communication structure of the organisation), independent scaling of hot components, and fault isolation.

What you pay every day:

| Cost | In practice |
|---|---|
| Network calls | Latency, partial failure, timeouts, serialization |
| No shared transactions | Sagas, eventual consistency, compensations |
| Operations | CI/CD, dashboards, on-call per service; a platform team |

Availability multiplies along a synchronous chain:

```text
5 services in series, each 99.9% available
0.999 ^ 5 = 0.995  ->  ~99.5% end to end
99.9% = ~43 min downtime/month     99.5% = ~3.6 h downtime/month
```

---

## 3. Bounded contexts and service boundaries

Boundaries come from **Domain-Driven Design (DDD)**. A **bounded context** is a part of the domain in which a model has one consistent meaning. "Product" in Catalog has images and descriptions; in Inventory it has stock per warehouse; in Shipping it has weight and dimensions. One shared `Product` model couples all three.

```text
+----------------+    +----------------+    +----------------+
| Catalog        |    | Ordering       |    | Shipping       |
| Product: name, |    | Order, Line,   |    | Shipment,      |
| images, price  |    | customerId     |    | weight, address|
| [catalog DB]   |    | [orders DB]    |    | [shipping DB]  |
+-------+--------+    +-------+--------+    +-------+--------+
        +------- APIs / events ------+--------------+
```

Heuristics:

- Split by **business capability**, never by technical layer ("validation service", "DB service").
- **High cohesion inside, loose coupling outside** — services that always change together are one service.
- **Database per service**: nobody else reads your tables.
- Reference other services' entities by **ID**; keep local copies of the few fields you need, fed by events.
- Avoid **nanoservices**: chatty calls, nothing useful done by any single service.

---

## 4. Service discovery

Instances come and go, so callers cannot hard-code IPs. A **registry** tracks healthy instances.

| Pattern | How it works | Examples |
|---|---|---|
| **Client-side** | Client queries registry, load-balances itself | Netflix Eureka, Consul + client library |
| **Server-side** | Client calls a stable name; a router/LB picks the instance | Kubernetes Service, AWS ALB |
| **DNS-based** | Instances exposed as DNS records | Consul DNS (port 8600), CoreDNS, AWS Cloud Map |

Registration is **self-registration** (instance heartbeats the registry) or **third-party** (the platform does it — Kubernetes adds a Pod to the Service's endpoints once its readiness probe passes).

In Kubernetes, `http://orders.shop.svc.cluster.local` resolves to a ClusterIP and kube-proxy spreads **connections** across ready Pods. Caveat: long-lived gRPC/HTTP/2 connections are balanced per connection, not per request, so one Pod can take all the load — a common reason to adopt a mesh or client-side gRPC balancing.

---

## 5. Synchronous vs asynchronous communication

| | Synchronous (REST, gRPC) | Asynchronous (events, messages) |
|---|---|---|
| Coupling | **Temporal** — callee must be up now | Producer and consumer fail independently |
| Latency | Adds up along the chain | Caller returns fast |
| Consistency | Immediate | Eventual |
| Good for | Queries the user is waiting on | Side effects, fan-out, long-running work |

Rule of thumb: **sync for reads the user waits for, async for "things that should happen because something happened"**. `OrderPlaced` triggers email, loyalty points and analytics — none of which should be able to fail checkout.

```text
Sync chain (fragile):  client -> order -> payment -> fraud -> bank

Async (resilient):     client -> order --OrderPlaced--> broker --> email
                                                              +--> loyalty
                                                              +--> analytics
```

Brokers and delivery guarantees are topic 11; API styles are topic 17.

---

## 6. Timeouts and retries

**Timeouts.** Every remote call needs one; a slow dependency that holds your threads is worse than a dead one. Base it on the dependency's measured p99, and **shrink it down the chain**: if the edge allows 2 s, inner calls must fit inside that budget (**deadline propagation** — gRPC does it natively).

**Retries.** Retry only **transient** errors (timeouts, 503, 429 honouring `Retry-After`), never 400/401/404, and only **idempotent** operations (or use an idempotency key). Use **exponential backoff with jitter** so clients do not retry in lockstep.

```js
async function callWithRetry(fn, { attempts = 3, baseMs = 100, capMs = 2000 } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn(AbortSignal.timeout(800)); // per-try timeout
    } catch (err) {
      const retryable = err.name === 'TimeoutError' || err.status === 503;

      if (!retryable || attempt === attempts) throw err;

      // Full jitter: random delay between 0 and the exponential ceiling
      const ceiling = Math.min(capMs, baseMs * 2 ** attempt);

      await new Promise((resolve) => setTimeout(resolve, Math.random() * ceiling));
    }
  }
}
```

**Retry storms.** Retries multiply: three layers that each make up to 3 attempts turn one request into 3 × 3 × 3 = **27 calls** to the bottom service, just when it is struggling. Retry at **one** layer and cap extra load with a **retry budget** (e.g. retries ≤ 10–20% of traffic).

---

## 7. Circuit breaker, bulkhead and fallback

A **circuit breaker** stops calling a dependency that is clearly failing: callers fail fast instead of stacking up timeouts, and the dependency gets room to recover.

```text
          failure rate >= threshold
 CLOSED ----------------------------> OPEN
 (calls pass,                     (fail fast,
  failures counted)                no remote call)
    ^                                  |
    | trial calls succeed              | wait duration elapses
    |                                  v
    +---------------------------- HALF-OPEN
      trial calls fail -> OPEN    (a few trial calls allowed)
```

Resilience4j's defaults are typical: open at **50%** failures over a window of 100 calls, stay open **60 s**, allow **10** trial calls in half-open. Count **slow calls** as failures too.

A **bulkhead** isolates resources like watertight compartments: each downstream gets its own connection pool or concurrency limit, so a hanging recommendations service can exhaust only its own 20 slots while checkout keeps working.

A **fallback** is what you return instead: cached data, a default, a degraded response, or a clear error. It must be safe — never "fall back" into charging a card twice.

Libraries: Resilience4j (Java; Hystrix is in maintenance mode since 2018), Polly (.NET), opossum (Node.js) — or the same policies in a service mesh.

---

## 8. Distributed data and the saga pattern

With database per service, "create order, reserve stock, charge card" spans three databases, so one ACID transaction is impossible. **Two-phase commit (2PC)** holds locks across services, blocks if the coordinator dies, and is unsupported by most brokers and NoSQL stores.

A **saga** is a sequence of **local transactions**; each commits in one service and triggers the next step. If a step fails, **compensating transactions** semantically undo the earlier ones.

```text
Happy path:     T1 order PENDING -> T2 reserve stock -> T3 charge card -> T4 order APPROVED
Fails at T3:    C2 release stock -> C1 order REJECTED
```

Design consequences:

- **No isolation**: others can see intermediate states. Use semantic locks (a `PENDING` status) and re-check before acting.
- **Compensations are business actions** (refund, cancellation email), not rollbacks. Put non-reversible steps last — after the **pivot** transaction the saga only moves forward.
- Every step and compensation must be **idempotent**, because messages are redelivered.
- Saving state and publishing the event atomically needs the outbox pattern (topic 11).

---

## 9. Saga: orchestration vs choreography

```text
Choreography: services react to each other's events
  Order --OrderCreated--> Inventory --StockReserved--> Payment
    ^                                                     |
    +------------- PaymentFailed / PaymentCompleted ------+

Orchestration: a central state machine sends commands
               [ Order saga orchestrator ]
          ReserveStock |    Charge |    Approve |
                       v           v            v
                   Inventory    Payment       Order
```

| | Choreography | Orchestration |
|---|---|---|
| Control | Spread across services | One state machine |
| Coupling | Services know events, not each other | Orchestrator knows all participants |
| Visibility | Implicit — "where is order 42?" is hard | Flow and state in one place |
| Risk | Cyclic event chains, hard to change | Orchestrator grows into a "god service" |
| Good for | Few, loosely related steps | Complex multi-step business processes |

Orchestrators: Temporal, Camunda, Netflix Conductor. On AWS, **Step Functions** (with `Catch` running compensations) is a natural orchestrator, while **EventBridge** or SNS/SQS suits choreography. Real systems often mix both.

---

## 10. CQRS and event sourcing (overview)

**CQRS** (Command Query Responsibility Segregation) separates the write model (commands, invariants) from read models shaped for queries.

```text
commands --> [write model] --> write DB --events--> [projector] --> read DB(s)
queries  -------------------------------------------------------------^
```

It lets reads and writes scale independently and lets a **projection** combine data from several services' events without cross-service calls. Cost: reads are **eventually consistent** and there are more moving parts.

**Event sourcing** stores the **sequence of events** as the source of truth; current state is derived by replaying them (`AccountOpened`, `MoneyDeposited` → balance).

| Benefit | Cost |
|---|---|
| Full audit trail, state at any past time | Queries need projections (so, CQRS) |
| Rebuild new read models by replay | Event versioning forever; long streams need **snapshots** |

CQRS without event sourcing is common; event sourcing almost always implies CQRS. Apply them to the bounded contexts that need them (ledgers, bookings), not system-wide.

---

## 11. Service mesh

A **service mesh** moves network concerns out of application code. Classically, each Pod gets a **sidecar proxy** (the **data plane**), configured by a **control plane**.

```text
+------- Pod A -------+           +------- Pod B -------+
| app A <-> sidecar   | <--mTLS-->|   sidecar <-> app B |
+----------^----------+           +----------^----------+
           +--- control plane: config, certs, policy ---+
```

Without code changes, in any language: **mTLS** and service identity, retries and timeouts, outlier detection, traffic splitting for canaries, uniform metrics and traces.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payments
spec:
  host: payments.shop.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        http1MaxPendingRequests: 50   # bulkhead
    outlierDetection:
      consecutive5xxErrors: 5         # eject a failing instance
      interval: 10s
      baseEjectionTime: 30s
```

| Mesh | Data plane |
|---|---|
| **Istio** | Envoy sidecars, or **ambient mode** (per-node ztunnel + optional waypoint proxies; GA since 1.24) |
| **Linkerd** | Lightweight Rust `linkerd2-proxy` sidecars; simpler |
| **Consul** | Envoy; spans Kubernetes and VMs |

Costs: extra latency per hop, memory per sidecar, one more critical system to operate. Worth it with many services and polyglot teams; overkill for five. On AWS, App Mesh reaches end of support on 30 September 2026; AWS points to ECS Service Connect or VPC Lattice.

---

## 12. When NOT to use microservices — and how to migrate

Avoid microservices when:

- The team is small (one or two teams) — the operational tax exceeds the autonomy gain.
- The domain is new and boundaries are unclear — a wrong boundary across a network is expensive to move.
- CI/CD, containers, monitoring and tracing are immature.
- The goal is performance — network hops add latency.

In 2023 the Prime Video team described moving one monitoring pipeline from distributed serverless components into a single process and cutting its cost by about 90% — granularity is a per-workload choice.

To migrate, use the **strangler fig** pattern: put a router in front, extract one capability (with its data) at a time, redirect its routes, and delete the old code.

```text
client -> [router] --/search--> new search service
                   --/orders--> new orders service
                   --/*-------> monolith (shrinks until deleted)
```

Start with a low-dependency, high-value capability. An **anti-corruption layer** translates between the legacy model and the new service so old concepts do not leak in.

---

## Key interview points

- Start with a **modular monolith**; split for **team and deployment independence**, not performance.
- A service owns **one capability and its data**; shared DB or lockstep deploys = **distributed monolith**.
- Boundaries = **bounded contexts**, split by capability, not layer.
- Discovery: client-side (Eureka) vs server-side (Kubernetes Service, ALB).
- Sync calls multiply availability (0.999⁵ ≈ 99.5%); prefer async for side effects.
- **Timeout every call**; retry transient + idempotent only, with **exponential backoff and jitter**, at one layer.
- Circuit breaker **closed → open → half-open**; bulkheads isolate pools; fallbacks must be safe.
- No 2PC → **saga** of local transactions with **compensations**; idempotent steps; no isolation.
- **Choreography** for few simple steps, **orchestration** for complex flows (Step Functions, Temporal).
- CQRS = separate read/write models; event sourcing = events as truth, with projections and snapshots.
- Service mesh = proxies + control plane for mTLS, retries, outlier detection, telemetry.
- Migrate with the **strangler fig** and anti-corruption layers.

## Summary

- Independent deployability defines microservices; bounded contexts and database per service keep them decoupled.
- Resilience patterns stop partial failure from cascading; sagas replace distributed transactions.
- CQRS, event sourcing and service meshes are targeted tools, not defaults; the strangler fig moves a monolith safely.
