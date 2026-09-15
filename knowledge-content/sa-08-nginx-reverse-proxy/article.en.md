# Nginx – Reverse proxy, load balancing & caching

## 1. Nginx and its event-driven model

Nginx ("engine-x") is a web server, reverse proxy, load balancer and HTTP cache in one binary. It was built for the **C10K problem** — ten thousand concurrent connections on one machine — which the "one process or thread per connection" model handled poorly.

```text
              +------------------+
              |  master process  |  reads config, binds :80/:443,
              +--------+---------+  manages workers, handles signals
         +-------------+-------------+
         v             v             v
   +----------+  +----------+  +----------+
   | worker 1 |  | worker 2 |  | worker N |   worker_processes auto;
   |  epoll   |  |  epoll   |  |  epoll   |   (one per CPU core)
   +----------+  +----------+  +----------+
   each: one thread, thousands of non-blocking sockets
```

- Each **worker** is single-threaded and runs an **event loop** on `epoll` (Linux) or `kqueue` (BSD). It never waits on one socket; it asks the kernel which sockets are ready and serves them in turn. An idle keep-alive connection costs kilobytes, not a thread.
- `worker_connections` (default 512) is **per worker**, and a proxied request uses two connections (client + upstream). File-descriptor limits (`worker_rlimit_nofile`) also cap it.
- Blocking work (slow disk) stalls every connection on that worker; `aio threads` moves file I/O to a thread pool.

**Zero-downtime reload:** `nginx -t` validates the config; `nginx -s reload` makes the master load it, start new workers and let old workers finish in-flight requests. A broken config is rejected and old workers keep serving.

---

## 2. Reverse proxy vs forward proxy

```text
Forward proxy (acts for clients)
  [laptop] --> [office proxy] --> internet     site sees the proxy IP

Reverse proxy (acts for servers)
  clients --> [nginx :443] --> app-1:3000      client sees only nginx
                           --> app-2:3000
```

| | Forward proxy | Reverse proxy |
|---|---|---|
| Configured by | The client (`HTTPS_PROXY`, browser) | The server owner (DNS points at it) |
| Hides | Clients | Backends |
| Uses | Egress filtering, content policy | TLS termination, load balancing, caching, routing |
| Tools | Squid, secure web gateways | Nginx, HAProxy, Envoy, ALB |

Nginx is a reverse proxy; core nginx does not implement `CONNECT`, so it is not a general HTTPS forward proxy. On AWS the reverse-proxy role is an ALB.

---

## 3. Configuration anatomy: contexts and server blocks

Config is a tree of **contexts** holding **directives** that end in `;`. Most directives inherit from outer to inner contexts.

```nginx
worker_processes auto;
events { worker_connections 4096; }

http {
    include  /etc/nginx/mime.types;
    sendfile on;

    server {
        listen      80 default_server;
        server_name _;
        return      444;             # drop requests for unknown hosts
    }

    server {
        listen      80;
        server_name shop.example.com www.shop.example.com;
        location / { proxy_pass http://127.0.0.1:3000; }
    }
}
```

A **server block** is a virtual host. Nginx picks the `listen` port, then matches the `Host` header against `server_name` in this order: **exact name** → **longest wildcard starting with `*`** (`*.example.com`) → **longest wildcard ending with `*`** (`mail.*`) → **first regex** in file order. If none match, the port's **default server** answers — the one marked `default_server`, else the first block listed. That is why an unknown domain can land on the wrong site.

---

## 4. How location blocks are matched

| Modifier | Meaning |
|---|---|
| `= /path` | Exact match; stop immediately |
| `^~ /path` | Prefix that, if it is the longest prefix, **skips regexes** |
| `~` / `~*` | Regex, case-sensitive / case-insensitive |
| `/path` | Plain prefix |

```text
1. Exact "=" match?                        -> use it
2. Remember the LONGEST matching prefix
3. That prefix has ^~ ?                    -> use it
4. Try regexes IN FILE ORDER               -> first match wins
5. No regex matched                        -> use remembered prefix
```

```nginx
location = /healthz      { return 200 "ok"; }
location ^~ /static/     { root /var/www; }
location ~* \.(png|jpg)$ { expires 30d; }
location /               { proxy_pass http://app; }
```

`/static/logo.png` goes to `^~ /static/`. Without `^~`, the image regex would win, because regexes beat plain prefixes. File order matters **only** among regexes.

---

## 5. proxy_pass, headers and the trailing slash

Whether `proxy_pass` has a **URI part** (anything after host:port, even a lone `/`) changes the path the backend sees:

- **No URI** (`http://app:3000`) — the request URI is passed unchanged.
- **With a URI** (`http://app:3000/`) — the part matching the `location` is **replaced** by that URI.

| location | proxy_pass | Request | Backend gets |
|---|---|---|---|
| `/api/` | `http://app:3000` | `/api/users` | `/api/users` |
| `/api/` | `http://app:3000/` | `/api/users` | `/users` |
| `/api/` | `http://app:3000/v2/` | `/api/users` | `/v2/users` |
| `/api` | `http://app:3000/` | `/api/users` | `//users` |
| `/api/` | `http://app:3000/v2` | `/api/users` | `/v2users` |

Keep the slashes symmetric. A URI part is not allowed in a regex location, and a prefix location ending in `/` with `proxy_pass` answers `/api` with a **301** to `/api/`.

By default nginx sets `Host` to the upstream name and uses HTTP/1.0 upstream, so set headers explicitly:

```nginx
location /api/ {
    proxy_pass         http://app_backend/;
    proxy_http_version 1.1;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
}
```

Without `X-Forwarded-Proto`, an app behind TLS termination believes requests are plain HTTP and can loop on `https` redirects.

---

## 6. Upstreams and load-balancing algorithms

```nginx
upstream app_backend {
    least_conn;
    server 10.0.1.10:3000 weight=3;
    server 10.0.1.11:3000 max_fails=3 fail_timeout=30s;
    server 10.0.1.12:3000 backup;
    keepalive 32;
}
```

| Method | Directive | Choose it when |
|---|---|---|
| Weighted round robin | *(default)* | Similar, stateless requests |
| Least connections | `least_conn` | Request durations vary widely |
| IP hash | `ip_hash` | Crude stickiness by client address |
| Generic hash | `hash $key consistent` | Pin a key (user, URL) to a node with minimal remapping |
| Two random choices | `random two least_conn` | Many nginx instances share one pool |

- **Health checks** in open-source nginx are **passive**: after `max_fails` (default 1) failures within `fail_timeout` (default 10s) the server is skipped for `fail_timeout`. Active `health_check` is NGINX Plus.
- `proxy_next_upstream` (default `error timeout`) retries elsewhere, but not POST and other non-idempotent requests unless you add `non_idempotent`.
- **Upstream keepalive** needs `keepalive N`, `proxy_http_version 1.1` and `proxy_set_header Connection "";`. Miss one and every request opens a new TCP connection, piling up `TIME_WAIT` sockets.

Prefer stateless backends with sessions in Redis over stickiness.

---

## 7. TLS termination, HTTP/2 and HTTP/3

**TLS termination**: nginx decrypts at the edge and proxies plain HTTP inside the private network. Certificates live in one place.

```nginx
server {
    listen 80;
    server_name shop.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    http2  on;
    server_name shop.example.com;

    ssl_certificate     /etc/ssl/shop/fullchain.pem;
    ssl_certificate_key /etc/ssl/shop/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_session_cache   shared:SSL:10m;

    add_header Strict-Transport-Security "max-age=63072000" always;
    location / { proxy_pass http://app_backend; }
}
```

Alternatives: **re-encryption** (proxy to `https://` when encryption in transit is mandatory everywhere) and **passthrough** (the `stream` module forwards raw TCP; the backend holds the key, but no L7 routing is possible).

- `ssl_certificate` must hold the **full chain**; leaf-only works in some browsers but fails in `curl` and many mobile clients.
- **HTTP/2**: since 1.25.1 use `http2 on;` (`listen … http2` is deprecated). It applies to clients; `proxy_pass` to backends speaks HTTP/1.x.
- **HTTP/3** (QUIC over UDP 443) since 1.25.0: `listen 443 quic reuseport;` plus an `Alt-Svc` header, and open UDP 443.

---

## 8. Serving static files and gzip

Nginx serves files far more cheaply than an app runtime, using `sendfile` to copy from page cache to socket in the kernel.

```nginx
location /assets/ {
    root    /var/www/shop;           # /assets/a.js -> /var/www/shop/assets/a.js
    expires 1y;
}

location /media/ {
    alias   /data/uploads/;          # /media/a.png -> /data/uploads/a.png
}

location / {
    root      /var/www/shop;
    try_files $uri $uri/ /index.html;   # SPA fallback
}

gzip            on;
gzip_comp_level 5;
gzip_types      text/css application/javascript application/json image/svg+xml;
gzip_vary       on;
```

- `root` **appends** the full URI; `alias` **replaces** the location prefix.
- Fingerprinted assets (`app.3f9a1c.js`) can be cached for a year; `index.html` should not be.
- With gzip on, `text/html` is always compressed; other types must be in `gzip_types`. Skip JPEG, PNG, video, zip — already compressed. Brotli needs a third-party module.

---

## 9. Proxy caching

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=app_cache:10m
                 max_size=1g inactive=60m use_temp_path=off;

location /products/ {
    proxy_cache           app_cache;
    proxy_cache_valid     200 10m;
    proxy_cache_valid     404 1m;
    proxy_cache_lock      on;
    proxy_cache_use_stale error timeout updating http_502 http_503 http_504;
    add_header            X-Cache-Status $upstream_cache_status;
    proxy_pass            http://app_backend;
}
```

- `keys_zone` is shared memory for keys (1 MB ≈ 8,000 keys); `max_size` caps disk; `inactive` evicts items not requested for that long.
- Default key `$scheme$proxy_host$request_uri`; only `GET` and `HEAD` are cached.
- Nginx honours upstream `Cache-Control`/`Expires` and by default skips responses with `Set-Cookie` or `Cache-Control: private`/`no-store`.
- `proxy_cache_lock` sends one request per key upstream while others wait — **stampede** protection. `proxy_cache_use_stale` serves old copies when the backend fails.

`$upstream_cache_status` shows `HIT`, `MISS`, `EXPIRED`, `STALE`, `UPDATING`. Never cache personalised pages under a key without the user. Invalidation is covered in the caching strategies topic.

---

## 10. Rate limiting and connection limiting

`limit_req` is a **leaky bucket** per key; `limit_conn` caps concurrent connections per key.

```nginx
http {
    limit_req_zone  $binary_remote_addr zone=api:10m rate=10r/s;
    limit_conn_zone $binary_remote_addr zone=peraddr:10m;

    server {
        location /api/ {
            limit_req        zone=api burst=20 nodelay;
            limit_req_status 429;
            limit_conn       peraddr 20;
            proxy_pass       http://app_backend;
        }
    }
}
```

- `rate=10r/s` is tracked per millisecond: one request per 100 ms. Without `burst`, a second request within 100 ms is rejected.
- `burst=20` queues up to 20 extra requests released at the rate; `nodelay` forwards them **immediately** while still using burst slots.
- Default rejection is **503**; `limit_req_status 429` is clearer for clients.
- `$binary_remote_addr` saves memory; 1 MB holds about 16,000 states.

Traps: **behind a load balancer** all requests share the LB's IP, so restore the client IP with `set_real_ip_from` and `real_ip_header X-Forwarded-For`. And counters are **per nginx instance** — four nodes allow roughly 4× the rate. Global limits need Redis or a gateway.

---

## 11. WebSockets, streaming and timeouts

A WebSocket starts as HTTP/1.1 with `Upgrade: websocket` and `Connection: Upgrade`. These are **hop-by-hop** headers, so nginx drops them unless told otherwise:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    location /ws/ {
        proxy_pass         http://chat_backend;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection $connection_upgrade;
        proxy_read_timeout 3600s;
    }
}
```

```text
client               nginx                 backend
  |-- GET Upgrade ----->|                      |
  |                     |-- GET Upgrade ------>|
  |                     |<-- 101 Switching ----|
  |<-- 101 -------------|                      |
  |<=========== frames tunnelled both ways ===>|
```

| Directive | Default | Effect |
|---|---|---|
| `proxy_connect_timeout` | 60s | Time to open the upstream connection |
| `proxy_read_timeout` | 60s | Max gap **between two reads** — then 504, or a closed WebSocket |
| `client_max_body_size` | 1m | Bigger uploads get **413** |
| `proxy_buffering` | on | Turn off for Server-Sent Events |

An idle WebSocket closes after 60 s unless the timeout is raised or the app sends pings. For SSE, disable buffering (`proxy_buffering off;` or backend header `X-Accel-Buffering: no`) or events arrive in clumps.

---

## 12. Common configuration mistakes and troubleshooting

| Symptom | Likely cause |
|---|---|
| **502 Bad Gateway** | Backend down, wrong port, connection refused or reset |
| **504 Gateway Timeout** | Backend alive but slower than `proxy_read_timeout` |
| **499** in access log | Client closed the connection first (nginx-specific) |
| **413** | Upload above `client_max_body_size` |
| Backend sees `//users` | `location` / `proxy_pass` slash mismatch |
| HTTPS redirect loop | App never receives `X-Forwarded-Proto` |
| Security headers missing in one location | `add_header` declared in that location |
| Traffic still hits old IPs | `proxy_pass` hostname resolved once at load |

- **`add_header` inheritance:** outer headers are inherited **only if the current level defines no `add_header`**. One `X-Cache-Status` in a location silently drops server-level HSTS. Without `always`, headers skip error responses.
- **`alias` traversal:** `location /img { alias /data/images/; }` maps `/img../secret` to `/data/images/../secret`. Use `location /img/`.
- **`if` in `location`** is only safe with `return` or `rewrite … last`; prefer `map` and `try_files`.
- **DNS:** for backends whose IPs change (ELB, containers), use `resolver` with a variable in `proxy_pass`, or the `resolve` parameter on upstream servers in recent releases.
- Always `nginx -t` before `reload`, and read `error.log` — upstream failures are explained there, not in the access log.

---

## 13. Nginx vs HAProxy vs Envoy vs cloud load balancers

| | Nginx | HAProxy | Envoy | Cloud LB (ALB/NLB) |
|---|---|---|---|---|
| Strength | Web server + proxy + cache | Pure L4/L7 load balancer | Dynamic proxy for meshes | Managed, auto-scaling |
| Static files / cache | Yes / yes | No / small | No / limited | No (use a CDN) |
| Config changes | File + reload | File + reload, runtime API | **xDS API**, no reload | API / IaC |
| Active health checks (OSS) | No (Plus) | Yes | Yes | Yes |
| Typical home | App edge, Ingress | High-traffic LB tier | Istio data plane, gateways | AWS front door |

- **Nginx** when you also need static files, caching or rewrites with a familiar config.
- **HAProxy** when balancing is the product: stick tables, active checks, very high connection counts.
- **Envoy** when hundreds of services need config pushed live, retries, circuit breaking and tracing — usually under Istio.
- **Cloud LB** when you do not want to run proxies. A common AWS layout: **ALB (TLS, routing) → nginx (cache, static) → app**.

In Kubernetes, nginx often appears as an Ingress controller; the community `ingress-nginx` project announced its retirement (maintenance ending March 2026) and the ecosystem is moving to the Gateway API.

---

## Key interview points

- Nginx = **master + single-threaded event-loop workers** on epoll; thousands of connections per worker; zero-downtime `reload`.
- Reverse proxy acts for **servers**; forward proxy acts for **clients**.
- `server_name`: exact → leading wildcard → trailing wildcard → regex → `default_server`.
- `location`: `=` → longest prefix (stop if `^~`) → regexes in file order → remembered prefix.
- `proxy_pass` **with a URI replaces** the matched part; **without** passes the path unchanged. Match the slashes.
- Set `Host`, `X-Forwarded-For`, `X-Forwarded-Proto`; upstream keepalive needs `keepalive` + HTTP/1.1 + empty `Connection`.
- Algorithms: round robin, `least_conn`, `ip_hash`, `hash … consistent`, `random two`; OSS health checks are passive.
- Rate limiting: leaky bucket, `burst` + `nodelay`, default 503, per instance, needs the real client IP.
- WebSockets: HTTP/1.1, `Upgrade` + `Connection` headers, longer `proxy_read_timeout`.
- 502 = backend unreachable, 504 = too slow, 499 = client gave up, 413 = body too large.

## Summary

- The event loop lets nginx hold huge numbers of connections with little memory.
- Server blocks pick the virtual host; locations route the URI by a precise priority order.
- `proxy_pass` behaviour hinges on its URI part — the trailing slash breaks more routes than anything else.
- Upstreams give load balancing, passive failover and connection reuse.
- At the edge nginx terminates TLS, speaks HTTP/2 and HTTP/3, compresses, serves files, caches and rate-limits.
- Pick nginx, HAProxy, Envoy or a cloud LB by what you need beyond forwarding.
