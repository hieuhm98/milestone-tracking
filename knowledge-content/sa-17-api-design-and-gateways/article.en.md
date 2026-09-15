# API Design & API Gateways

## 1. The API is a contract — pick the style first

An API outlives the code behind it: once clients ship, every field, status code and error shape is a promise. The first decision is the **style**, because it fixes transport, tooling and failure modes.

| Style | Transport | Best at | Weak at |
|---|---|---|---|
| **REST** | HTTP + JSON | Public APIs, CRUD, HTTP caching | Chatty for nested data |
| **gRPC** | HTTP/2 + Protobuf | Internal calls, streaming, strict contracts | Browsers need a proxy |
| **GraphQL** | HTTP + JSON | Many clients needing different shapes | Caching, cost control, N+1 |
| **Events** | Broker | Decoupling, slow work | No immediate answer |
| **WebSocket / SSE** | Long-lived connection | Server push | Stateful scaling |

A defensible default: **REST at the public edge, gRPC between services, events for work that can wait** (brokers are covered in the messaging topic). Write the contract first — OpenAPI, `.proto` or GraphQL SDL — and generate clients, mocks and docs from it.

---

## 2. REST resource design

Model **resources (nouns)**; HTTP methods are the verbs.

```text
GET    /orders?status=paid&limit=20    list (filter + paginate)
POST   /orders                         create -> 201 + Location header
GET    /orders/ord_123                 read
PATCH  /orders/ord_123                 partial update
DELETE /orders/ord_123                 delete -> 204
POST   /orders/ord_123/cancellations   action modelled as a resource
```

Use plural nouns, opaque IDs (auto-increment integers leak volume and invite enumeration), ISO 8601 UTC timestamps, and money as integer minor units plus currency — never floats.

Retries, proxies and caches rely on method semantics:

| Method | Safe | Idempotent (N calls = 1 call) |
|---|---|---|
| GET, HEAD | Yes | Yes |
| PUT, DELETE | No | Yes |
| POST | No | **No** |
| PATCH | No | Not guaranteed |

**Optimistic concurrency:** return an `ETag`; the client sends `If-Match` on update; if the resource changed meanwhile, answer **412 Precondition Failed** instead of silently overwriting (lost update).

---

## 3. Status codes and error format

Gateways, retry logic and dashboards branch on status codes.

| Code | Meaning |
|---|---|
| 201 / 202 / 204 | Created / accepted for async processing / no content |
| 400 | Malformed request |
| 401 | **Not authenticated** — missing or expired token |
| 403 | **Authenticated, not allowed** |
| 404 / 409 | Not found / state conflict or duplicate |
| 422 | Well-formed but fails validation |
| 429 | Rate limited — send `Retry-After` |
| 502 / 503 / 504 | Bad upstream / overloaded / upstream timeout |

Rule of thumb: **4xx = client must change something, don't blindly retry; 5xx and 429 = retry with backoff.** Never return 200 with `"success": false`.

Use one error shape: **RFC 9457 Problem Details** (`application/problem+json`, replaces RFC 7807).

```json
{
  "type": "https://api.example.com/problems/insufficient-funds",
  "title": "Insufficient funds",
  "status": 422,
  "detail": "Balance is 30.00 USD, transfer needs 50.00 USD.",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736"
}
```

Include a trace ID for support; never leak stack traces or SQL.

---

## 4. Idempotency keys

Networks fail *after* the server did the work: the client times out, retries `POST /payments`, and the customer pays twice. The client therefore sends a UUID **idempotency key** per logical operation, identical on every retry.

```text
Client                          API                         Key store
  | POST /payments               |                               |
  | Idempotency-Key: 7f3a        |-- reserve key (NX) ---------->| new -> process
  |     (timeout, no response)   |-- save 201 + body ----------->|
  | POST /payments (retry)       |                               |
  | Idempotency-Key: 7f3a        |-- lookup -------------------->| exists
  |<-- 201, same stored body ----|                               |
```

- Scope keys per account; store key, request hash and response with a TTL (Stripe keeps them about 24 hours).
- **Reserve atomically** (unique constraint or Redis `SET key val NX EX ttl`) so concurrent retries cannot both run.
- Key still in progress → **409**; same key, different body → **422**.
- Write the business row and the key record in one transaction where possible.

PUT and DELETE are idempotent by definition; keys are for POST. Consumers downstream still deduplicate on their own.

---

## 5. Pagination

Never return an unbounded list.

| | Offset (`?page=5`) | Cursor / keyset (`?after=<cursor>`) |
|---|---|---|
| Deep pages | Slow: DB reads and discards skipped rows | Constant cost via index |
| Concurrent inserts | Items skipped or duplicated | Stable |
| Jump to page N | Yes | No |
| Fits | Admin tables, small data | Feeds, large or live data |

```sql
-- keyset: the cursor encodes the last row's (created_at, id)
SELECT id, created_at, total_minor
FROM orders
WHERE (created_at, id) < ($1, $2)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

Make cursors **opaque** (base64 of the sort key) so internals can change, and always include a unique tiebreaker (`id`) or rows with equal timestamps vanish. Cap `limit` server-side; avoid exact totals on big tables — `COUNT(*)` can cost more than the page.

---

## 6. Versioning and evolution

The best strategy is **not breaking clients**. Additive changes (new optional fields, new endpoints) are safe if clients are **tolerant readers** that ignore unknown fields. Breaking: removing/renaming a field, changing a type or meaning, adding a required input, changing status codes.

| Strategy | Example | Trade-off |
|---|---|---|
| URI path | `/v1/orders` | Visible, easy gateway routing; most common |
| Media type | `Accept: application/vnd.acme.v2+json` | Clean URIs; caches must `Vary` |
| Date-based | `Stripe-Version: 2024-06-20` | Fine-grained, pinned per account; needs a compatibility layer |

Retiring a version is a process: announce, measure remaining callers per client at the gateway, send a `Sunset` header (RFC 8594) with the date, brown-out, then switch off.

---

## 7. gRPC and Protocol Buffers

gRPC runs on **HTTP/2** with **Protobuf** as contract and binary encoding; typed clients and servers are generated from `.proto`.

```protobuf
syntax = "proto3";

package orders.v1;

service OrderService {
  rpc GetOrder(GetOrderRequest) returns (Order);
  rpc WatchOrders(WatchOrdersRequest) returns (stream OrderEvent);
}

message Order {
  string id = 1;
  int64 total_minor = 2;
  reserved 3; // removed field: never reuse the number
}
```

- Four call types: unary, server streaming, client streaming, bidirectional.
- **Field numbers are the wire contract**, not names — never reuse them; numbers 1–15 take one byte.
- Set **deadlines**; they propagate across hops and expire as `DEADLINE_EXCEEDED`. `UNAVAILABLE` is the usual retryable code.
- Default max received message is 4 MB in most implementations — stream big payloads.

Gotchas: HTTP/2 multiplexes calls over **one long-lived connection**, so an L4 load balancer pins everything to one backend — use an L7 proxy (Envoy, ALB) or client-side balancing. Browsers cannot speak raw gRPC: use gRPC-Web through a proxy or transcode to REST at the gateway.

---

## 8. GraphQL trade-offs

One endpoint, a typed schema, and the client selects exactly the fields it needs — no over-fetching, one round trip per screen.

| Problem | Mitigation |
|---|---|
| **N+1 queries** — each resolver loads its own rows | Batch per request with DataLoader |
| **HTTP caching lost** — POST to one URL | Persisted queries over GET, client-side cache |
| **Expensive queries** — arbitrary nesting | Depth/complexity limits, allow-listed persisted queries |
| **Errors hidden** — HTTP 200 with `errors` array | Alert on the `errors` field |
| **Rate limiting** — one request may cost 1 or 10,000 | Limit by computed query cost |

Choose GraphQL when many clients need different views of a rich domain (often as a BFF); for CRUD or service-to-service, REST or gRPC is cheaper to run.

---

## 9. Real-time: SSE, WebSocket, webhooks

| Option | Direction | Notes |
|---|---|---|
| Long polling | Client pulls, server holds | Works everywhere, wasteful |
| **SSE** | Server → client | Plain HTTP `text/event-stream`; `EventSource` reconnects with `Last-Event-ID` |
| **WebSocket** | Full duplex | `Upgrade` → `101 Switching Protocols`; text or binary |
| **Webhook** | Server → server | HMAC-signed callback, retried; receiver must be idempotent |

SSE fits notifications, progress and LLM token streams; WebSocket fits chat, collaboration and games. Scaling is the hard part: a message for user A must reach the node holding A's socket, so add a **pub/sub backplane** (Redis, NATS), heartbeats under the load balancer idle timeout, and jittered reconnects to avoid storms after deploys.

---

## 10. The API gateway

The single entry point that applies **cross-cutting concerns** so services don't each reimplement them.

```text
 clients ---> +-------------------- API GATEWAY --------------------+
              | TLS termination -> WAF/IP rules -> authN (JWT, key) |
              | -> scopes check -> rate limit / quota -> validation |
              | -> routing & versions -> transform -> cache         |
              | -> access logs, metrics, trace headers              |
              +-----------+-----------------+-----------------+-----+
                          |                 |                 |
                     orders-svc         users-svc        search-svc
               (fine-grained authorization stays in each service)
```

| Component | Job |
|---|---|
| Load balancer | Spread traffic over healthy instances |
| **API gateway** | North–south API management: identity, quotas, keys, versions |
| Service mesh | East–west: mTLS, retries, telemetry between services |
| BFF | One gateway per client type shaping responses for that UI |

Keep it **thin** — business logic in the gateway creates a bottleneck every team must change. It is a critical hop: run it redundantly and watch its p99. On AWS, **Amazon API Gateway** throttles by default at 10,000 requests/s with a 5,000 burst per account per Region; alternatives include Kong, Envoy-based gateways and Apigee.

---

## 11. OAuth 2.0 and OpenID Connect

**AuthN** = who you are; **authZ** = what you may do. **OAuth 2.0** delegates authorization by issuing **access tokens**. **OIDC** adds authentication: an **ID token** describing the user, addressed to the client app.

| Flow | Use for |
|---|---|
| **Authorization Code + PKCE** | Web, SPA, mobile user login |
| **Client Credentials** | Machine-to-machine |
| **Device Authorization** | TVs, CLIs |
| ~~Implicit~~, ~~Password~~ | Deprecated by the OAuth security BCP (RFC 9700) |

```text
App                        Authorization server               API
 | 1. /authorize?code_challenge=S256(verifier)&state=xyz       |
 |------------------------->| 2. user logs in, consents        |
 |<-- 3. redirect ?code=abc&state=xyz                          |
 | 4. POST /token code + code_verifier                         |
 |------------------------->| verifies hash matches challenge  |
 |<-- 5. access_token, id_token, refresh_token                 |
 | 6. Authorization: Bearer <access_token> ------------------->|
```

PKCE makes a stolen code useless without the verifier; `state` blocks CSRF. **APIs accept access tokens, never ID tokens.** Scopes are coarse (`orders:read`); "may this user see *this* order" is checked in the service. For browser apps, a **BFF** can hold tokens server-side and give the browser only an `HttpOnly` cookie.

---

## 12. JWT pitfalls

A JWT is `header.payload.signature` in base64url — **signed, not encrypted**; anyone can read it.

Validate on every request:

- Signature with an **allow-listed algorithm**; reject `alg: none`.
- Block **algorithm confusion**: an attacker changes `RS256` to `HS256` and signs with your *public* key as the HMAC secret — never let the header pick the algorithm.
- `exp`, `iss` and **`aud`** — a token minted for another API must fail.
- Keys from the IdP's JWKS by `kid`, cached and refreshed on rotation.

| Pitfall | Better |
|---|---|
| Long-lived, unrevocable token | 5–15 min access token + rotating refresh token |
| Personal data in claims | Identifiers and scopes only |
| Token in `localStorage` (XSS-readable) | `HttpOnly` cookie via BFF, or memory |
| Stolen bearer token works anywhere | Sender-constrained tokens: mTLS (RFC 8705) or DPoP (RFC 9449) |

When instant revocation matters, use **opaque tokens + introspection** (RFC 7662), cached briefly at the gateway.

---

## 13. Rate limiting algorithms

Rate limits protect capacity and fairness. Key them by API key, user or tenant — not only IP, since NAT hides whole offices behind one address.

| Algorithm | Idea | Trade-off |
|---|---|---|
| Fixed window | Counter per minute | Up to 2× burst at window edges |
| Sliding log | Keep every timestamp | Exact, memory-heavy |
| **Sliding window counter** | Weighted previous + current window | Near-exact, O(1) memory |
| **Token bucket** | Refill r/s up to capacity b; request spends a token | Allows controlled bursts |
| Leaky bucket | Drain at fixed rate | Smooth output, bursts queue or drop |

```text
Token bucket: b = 10, r = 5/s
t=0.0  10 tokens -> burst of 10 allowed -> 0 left, 11th gets 429
t=1.0   5 tokens -> next 5 allowed

Sliding window counter: limit 100/min, 15 s into current minute
estimate = prev 80 * (45/60) + curr 30 = 90 -> allowed
```

In a cluster the counter lives in a shared store, typically **Redis** with an atomic Lua script — a separate `GET` then `SET` lets races through. Decide what happens if Redis is down: fail open or fail closed. Return **429** with `Retry-After`. nginx `limit_req` is a leaky bucket; API Gateway throttling is a token bucket. The full distributed design is in the system design interview topic.

---

## Key interview points

- POST is neither safe nor idempotent; PUT and DELETE are idempotent.
- **401 = unauthenticated, 403 = forbidden**; don't retry 4xx blindly; retry 5xx/429 with backoff; RFC 9457 errors.
- **Idempotency keys** make POST retry-safe: atomic reservation, stored response, reject reuse with another body.
- **Cursor pagination** for large or live data; offset is slow deep and drifts on inserts.
- Evolve additively; version only for breaking changes; retire with metrics and `Sunset`.
- gRPC: HTTP/2 + Protobuf, deadlines, never reuse field numbers, needs L7 or client-side balancing.
- GraphQL: flexible for varied clients; plan for N+1, caching and query cost.
- SSE for one-way push, WebSocket for duplex; both need a backplane to scale.
- Gateway = auth, rate limits, routing, telemetry — **no business logic**.
- Auth Code + PKCE for users, Client Credentials for machines; APIs take **access tokens**.
- JWT: pin algorithms, check `aud`/`iss`/`exp`, keep lifetimes short.
- Token bucket permits bursts; sliding window counter is cheap and near-exact; shared counters must be atomic.

## Summary

- Choose the style by consumer: REST at the edge, gRPC inside, events for deferred work, SSE/WebSocket for push.
- Method semantics, status codes and one error format are what clients, proxies and retries depend on.
- Idempotency keys, cursor pagination and additive evolution make an API safe to retry, scale and change.
- A thin API gateway centralises authentication, rate limiting, routing and telemetry.
- OAuth 2.0 delegates authorization, OIDC adds identity, and JWTs are safe only with strict validation.
- Rate limiting algorithms trade precision, memory and burst tolerance; clustered limits need atomic shared state.
