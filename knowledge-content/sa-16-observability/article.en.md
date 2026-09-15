# Observability – Logs, Metrics, Traces & SLOs

## 1. Monitoring vs observability

**Monitoring** answers questions you knew to ask in advance: "is CPU above 90%?", "is the error rate above 1%?". It is excellent for *known* failure modes. **Observability** is a property of the system: how well you can understand its internal state from the data it emits — including failures nobody predicted. "Why do only Android users on app 4.2 see slow checkouts since 14:05?" is not a dashboard you built beforehand; you need rich telemetry you can slice after the fact.

| | Monitoring | Observability |
|---|---|---|
| Question type | Predefined ("is X broken?") | Open-ended ("why is X broken for these users?") |
| Typical output | Dashboards, threshold alerts | Ad-hoc queries, trace exploration |
| Data shape | Aggregated, low cardinality | Detailed, high cardinality, linked by context |

They are not rivals: monitoring is something you *do* with an observable system. On one server you could SSH in and read a log; with 40 microservices and autoscaled pods, one request touches a dozen processes that may no longer exist. That is why observability is an architecture concern.

---

## 2. The three pillars: logs, metrics, traces

| Signal | What it is | Strength | Weakness |
|---|---|---|---|
| **Logs** | Timestamped records of discrete events | Full detail for one event | Costly to store and search at volume |
| **Metrics** | Numbers aggregated over time | Cheap, fast; ideal for alerts and trends | No per-request detail |
| **Traces** | One request's path across services, as a tree of spans | Shows *where* time and errors happen | Needs propagation; usually sampled |

A typical investigation crosses all three: a **metric** alert fires (p99 up), a **trace** shows the slow span is payment-svc calling its database, and the **logs** for that trace ID show a lock timeout. The value comes from **linking** them — trace IDs in logs, exemplars on metrics, the same `service`/`env` labels everywhere. Also overlay **events** (deploys, flag flips): most incidents start with a change.

**Cardinality** — the number of distinct label combinations of a metric — is what bites. `http_requests_total{method, status, route}` with 5 × 10 × 50 values is 2,500 series: fine. Add `user_id` with a million users and the metrics backend falls over. High-cardinality detail belongs in logs and traces, never in metric labels.

---

## 3. Structured logging & correlation IDs

Plain text (`User 42 failed to pay`) is for humans with `grep`. At scale, emit **structured logs** — one JSON object per line with consistent fields:

```json
{"ts":"2026-09-14T08:15:02.317Z","level":"error","service":"payment-api","trace_id":"4bf92f3577b34da6a3ce929d0e0e4736","route":"POST /payments","duration_ms":1840,"error":"card_declined","msg":"payment failed"}
```

A **correlation ID** is created at the edge (gateway or first service), passed on every downstream call (HTTP header, message attribute) and written into every log line. With OpenTelemetry, the **trace ID** plays this role. In Node.js, `AsyncLocalStorage` makes it available to every log call:

```js
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

const als = new AsyncLocalStorage();

export function requestContext(req, res, next) {
  const requestId = req.headers['x-request-id'] ?? randomUUID();
  res.setHeader('x-request-id', requestId);

  als.run({ requestId }, next);
}

export function log(level, msg, fields = {}) {
  const ctx = als.getStore() ?? {};

  console.log(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...ctx, ...fields }));
}
```

Rules to enforce:

- **Log to stdout** in containers; an agent (Fluent Bit, Vector, OTel Collector) ships the logs.
- **Levels mean something**: `error` = may need action; `warn` = degraded but handled; `debug` off in production.
- **Never log secrets or raw PII**; redact at the source.
- **Control volume**: sample noisy success logs, keep all errors, tier retention (hot days, cold archive).

Stacks: ELK/OpenSearch (full-text index, powerful but costly) vs **Grafana Loki** (indexes only labels, chunks in object storage — far cheaper, slower for free-text search). On AWS: CloudWatch Logs + Logs Insights.

---

## 4. Metrics and their types

A metric is a time series: name + labels + (timestamp, value) samples.

| Type | Behaviour | Examples | Query with |
|---|---|---|---|
| **Counter** | Only goes up; resets on restart | requests, errors, bytes sent | `rate()` / `increase()` |
| **Gauge** | Up and down | memory, queue depth, connections | raw value, `max`, `avg` |
| **Histogram** | Counts observations into buckets + `_sum`, `_count` | request duration | `histogram_quantile()` |
| **Summary** | Quantiles computed in the client | duration in one process | read directly |

The review-worthy detail: **summary quantiles cannot be aggregated** — averaging the p99 of 20 pods does not give the fleet p99. Histogram buckets *can* be summed across instances first, so prefer histograms. Their accuracy depends on bucket boundaries, so put buckets around your SLO threshold (e.g. 0.1, 0.25, 0.5, 1, 2.5 s).

Never stop at average latency: a 120 ms mean can hide a 4 s p99 hitting your biggest customers.

---

## 5. Prometheus and the pull model

**Prometheus** (CNCF graduated) is the standard open-source metrics system. It **pulls**: the server scrapes `/metrics` over HTTP from each target at a fixed interval and stores samples in its local TSDB.

```text
 service discovery          +------ Prometheus (:9090) ------+
 (k8s API, EC2, Consul) --> | scrape -> TSDB -> PromQL/rules |--> Alertmanager (:9093) --> Slack/PagerDuty
                            +---------------+----------------+--> Grafana (:3000)
                                            | GET /metrics every 15-60 s
               +----------------------------+---------------------------+
               v                            v                           v
        app pods (/metrics)        node_exporter (:9100)       kube-state-metrics
```

Why pull? A failed scrape sets **`up == 0`**, so liveness comes free; **service discovery** decides what to monitor, so targets need no knowledge of the server; and you can point a second Prometheus at the same targets for HA. Pull struggles with **short-lived batch jobs** (use the **Pushgateway**, :9091, only for those) and targets behind NAT. Third-party software is covered by **exporters** (`node_exporter`, `postgres_exporter`, `blackbox_exporter` for external probes).

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: node
    static_configs:
      - targets: ["10.0.1.10:9100", "10.0.1.11:9100"]
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
```

Local retention defaults to **15 days**, and a single Prometheus is not clustered. For long-term storage, global queries and HA, `remote_write` to **Thanos**, **Grafana Mimir** or a managed service (on AWS: Amazon Managed Service for Prometheus). On Kubernetes, the Prometheus Operator (`ServiceMonitor`, `PrometheusRule`) is the usual install.

---

## 6. PromQL basics and alert rules

```text
# per-second request rate over 5 minutes
rate(http_requests_total{job="checkout"}[5m])

# 5xx error ratio per service
sum by (service) (rate(http_requests_total{status=~"5.."}[5m]))
  / sum by (service) (rate(http_requests_total[5m]))

# p99 latency per service
histogram_quantile(0.99, sum by (service, le) (rate(http_request_duration_seconds_bucket[5m])))
```

- `[5m]` makes a **range vector**; make it at least ~4× the scrape interval.
- **`rate` first, then `sum`** — `rate()` handles counter resets per series; summing raw counters breaks that.
- Keep `le` in the `by` clause for `histogram_quantile`, or the buckets collapse.
- **Recording rules** precompute heavy expressions so dashboards and alerts stay fast.

```yaml
groups:
  - name: checkout
    rules:
      - alert: CheckoutHighErrorRate
        expr: |
          sum(rate(http_requests_total{job="checkout",status=~"5.."}[5m]))
            / sum(rate(http_requests_total{job="checkout"}[5m])) > 0.05
        for: 10m
        labels:
          severity: page
        annotations:
          runbook_url: "https://runbooks.example.com/checkout-errors"
```

`for: 10m` keeps the alert *pending* until the condition holds for 10 minutes, filtering blips. **Alertmanager** then deduplicates, **groups** related alerts, **routes** by labels (team, severity), and supports **silences** and **inhibition** (mute pod alerts while "cluster down" fires).

---

## 7. Grafana and dashboards

**Grafana** stores no telemetry; it queries **data sources** — Prometheus, Loki, Tempo/Jaeger, CloudWatch, SQL — and lets you jump from a latency spike to exemplar traces to that trace's logs. (The "LGTM" stack: Loki, Grafana, Tempo, Mimir. On AWS: Amazon Managed Grafana.)

Dashboards that help at 3 a.m.:

- **Top-down**: a service overview of golden signals first, drill-downs per dependency after.
- **Template variables** (`$service`, `$env`) instead of 40 copied dashboards.
- **Percentiles with the SLO line drawn**, and **deploy annotations** on the time axis.
- **Dashboards as code** in Git, provisioned automatically.

Dashboards are for diagnosis, not detection: if a human must stare at a graph to notice an outage, alerting is missing.

---

## 8. Distributed tracing

A **trace** is a tree of **spans**; each span is one unit of work (handler, DB query, publish) with start, duration, status, attributes and a parent span ID.

```text
trace 4bf92f35...                                   time ->
GET /checkout (gateway)        [===============================] 1900 ms
  POST /orders (order-svc)       [==========================]    1750 ms
    SELECT cart (postgres)         [==]                            80 ms
    POST /charge (payment-svc)         [===================]     1500 ms
      card network call (HTTP)           [=================]     1400 ms  <- culprit
```

**Context propagation** makes it work: every hop forwards the **W3C Trace Context** header.

```text
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
             version-trace-id (32 hex)-parent span-id (16 hex)-flags (01 = sampled)
```

**Baggage** carries user-defined key/values (e.g. tenant) along. For async hops, put context in message headers. One service that drops the header splits the trace into fragments — the most common cause of "broken" traces.

| Sampling | Decided | Pros | Cons |
|---|---|---|---|
| **Head-based** (keep 10%) | At the root, propagated | Cheap, consistent | Randomly drops rare error/slow traces |
| **Tail-based** | After the trace completes, in a collector | Keep all errors and slow traces | Buffers whole traces in memory; more infra |

Backends: Jaeger, Grafana Tempo, Zipkin, commercial APM. On AWS: X-Ray, with OpenTelemetry (ADOT) recommended for new instrumentation.

---

## 9. OpenTelemetry

**OpenTelemetry (OTel)**, the CNCF merger of OpenTracing and OpenCensus, standardises *producing and shipping* telemetry. It is **not a backend**, which removes vendor lock-in at the instrumentation layer.

- **API + SDK** per language (sampling, batching, exporters), plus **auto-instrumentation** for HTTP, gRPC, DB drivers and Kafka clients.
- **OTLP** wire protocol: **4317** gRPC, **4318** HTTP.
- **Semantic conventions**: standard attribute names (`service.name`, `http.request.method`).
- **Collector**: pipelines of **receivers → processors → exporters**, run as an agent (DaemonSet/sidecar) and/or a central gateway.

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
processors:
  memory_limiter:
    check_interval: 1s
    limit_percentage: 80
  batch: {}
exporters:
  otlphttp/tempo:
    endpoint: http://tempo:4318
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp/tempo]
```

Why a Collector instead of exporting straight from apps: switch backends, add tail sampling, redact PII and buffer during backend outages **without redeploying services**. Put `memory_limiter` first, `batch` after it.

---

## 10. What to measure: golden signals, RED and USE

| Method | For | Signals |
|---|---|---|
| **Four golden signals** (Google SRE) | User-facing systems | Latency, Traffic, Errors, Saturation |
| **RED** (Tom Wilkie) | Request-driven services | **Rate**, **Errors**, **Duration** |
| **USE** (Brendan Gregg) | Resources: CPU, disk, pools, queues | **Utilization**, **Saturation**, **Errors** |

```text
   RED per service (symptom)              USE per resource (cause)
   Rate      1,200 req/s                  Utilization  DB pool 50/50 in use
   Errors    4% 5xx          <-- why? --  Saturation   180 requests waiting
   Duration  p99 3.2 s                    Errors       pool acquire timeouts
```

RED tells you **that** users suffer; USE helps find **why**. Saturation is the leading indicator — a full pool with waiters shows trouble before latency explodes. Separate latency of successes and failures (fast 500s flatter the numbers), and track p95/p99, not just p50.

---

## 11. SLI, SLO, SLA and error budgets

- **SLI** — measured ratio of good to valid events: "share of `GET /api/*` requests answered non-5xx in < 300 ms, measured at the load balancer".
- **SLO** — internal target for an SLI over a window: "99.9% over rolling 30 days".
- **SLA** — customer contract with penalties; always **looser** than the SLO.

**Error budget = 100% − SLO.**

| SLO | Downtime budget / 30 days | / year |
|---|---|---|
| 99% | 7 h 12 min | ~3.65 days |
| 99.9% | 43.2 min | ~8.76 h |
| 99.95% | 21.6 min | ~4.38 h |
| 99.99% | 4.32 min | ~52.6 min |

For request-based SLOs it is a count: 99.9% of 100 million requests allows 100,000 failures. An agreed **error budget policy** says what happens: budget left → ship and experiment; budget exhausted → freeze risky releases and fix reliability.

- **100% is the wrong target** — users cannot perceive it through their own networks, and each nine costs far more.
- **Dependencies cap you**: three independent 99.9% dependencies in series give at best ~99.7%.
- **Measure near the user** (load balancer, synthetic probes), and start with a few critical journeys (login, checkout).

---

## 12. Alerting on symptoms, burn rates & on-call

**Page on symptoms, not causes.** Users care that checkout fails, not that one pod's CPU is 95%. Cause alerts are noisy when nothing is user-visible and miss failures you did not predict — keep them on dashboards or as tickets. A page must be **urgent, actionable and user-impacting**, with a **runbook** link.

**Burn rate** = how fast the error budget is consumed relative to plan (1 = exactly used up by the window's end).

```text
SLO 99.9% over 30 days (budget 0.1%)
burn 14.4  error ratio 1.44%  2% of budget in 1 h   -> page  (long 1h AND short 5m window)
burn 6     error ratio 0.6%   5% of budget in 6 h   -> page  (6h AND 30m)
burn 1     error ratio 0.1%   10% of budget in 3 d  -> ticket
```

**Multi-window** conditions fire fast on real incidents and clear fast once fixed, because the short window recovers. Also alert on what symptoms reveal too late: certificates expiring, disks filling (`predict_linear`), failed backups, and **missing data** (`absent()`, `up == 0`) — a dead exporter looks just like a quiet, healthy system.

On-call practice:

- **Page vs ticket** severities; most alerts should be tickets.
- **Alert fatigue** is a reliability risk: review pages regularly and delete or tune non-actionable ones.
- Primary/secondary rotation, escalation path, handover notes, sustainable load.
- Incident roles (incident commander, comms, operators) and **blameless postmortems** with owned action items.
- Track **MTTD** and **MTTR**; good observability shrinks both.

---

## Key interview points

- Monitoring answers **predefined** questions; observability lets you ask **new** ones of correlated, high-cardinality telemetry.
- Logs = per-event detail, metrics = cheap aggregates for alerting, traces = where time goes. Link them via trace IDs.
- Never put user IDs, request IDs or raw URLs in **metric labels** (cardinality).
- Structured JSON logs to stdout, one trace/correlation ID across all hops, no secrets or PII.
- Counters → `rate()`; **histograms aggregate across instances, summaries do not**.
- Prometheus **pulls** `/metrics` (`up`, service discovery); Pushgateway only for short-lived jobs; 15-day default retention; `remote_write` to Thanos/Mimir for scale.
- Tracing needs **W3C `traceparent`** propagation; head sampling is cheap, tail sampling keeps errors.
- **OpenTelemetry** = vendor-neutral API/SDK + OTLP (4317/4318) + Collector — not a storage backend.
- **RED** for services, **USE** for resources.
- SLI measures, SLO targets, SLA contracts (looser). 99.9% ≈ **43 min per 30 days**.
- Alert on **symptoms** with multi-window **burn rates**; every page actionable with a runbook.

## Summary

- Distributed systems need observability because failures are novel and spread over many short-lived components.
- Logs, metrics and traces answer different questions at different costs; correlation is where the value is.
- Prometheus + Grafana is the standard metrics and dashboard stack; `rate`, `sum by` and `histogram_quantile` cover most needs.
- OpenTelemetry standardises instrumentation; the Collector decouples apps from backends.
- RED/USE decide what to measure; SLOs and error budgets decide how reliable is reliable enough.
- Page rarely, on user-facing burn rates, and learn from incidents with blameless postmortems.
