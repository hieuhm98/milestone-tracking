# Continuous Delivery & Deployment Strategies

## 1. Continuous delivery vs continuous deployment

CI (topic 13) ends with a tested, versioned artifact in a registry. **CD** is everything after that: getting it safely into environments and in front of users. The abbreviation hides two practices:

| | Continuous delivery | Continuous deployment |
|---|---|---|
| Promise | Every green change **could** go to production at any time | Every green change **does** go to production |
| Production step | Human decision (button, approval) | Fully automatic |
| Needs | Automated tests, repeatable deploys | All that + strong monitoring, automated rollback, feature flags |
| Typical fit | Regulated domains, mobile/on-prem releases | SaaS web products |

In continuous delivery, releasing is a **business decision, not a technical event**. If a release needs a two-week "hardening" phase, you do not have continuous delivery.

Second distinction: **deploy ≠ release**. *Deploying* puts code on servers; *releasing* exposes behaviour to users. Separating them (dark launches, feature flags) is what makes frequent deploys low-risk.

---

## 2. Environments and artifact promotion

Golden rule: **build once, promote the same artifact**. Production runs the exact image digest that was tested, never a rebuild.

```text
 commit ─► CI ─► registry/checkout@sha256:9f3c...
                   │
                   ▼
                  dev ........ auto deploy, smoke tests
                   │
                   ▼
                staging ...... auto deploy, e2e + load tests
                   │
                   ▼  approval (delivery) or automatic (deployment)
               production
 same digest everywhere; only configuration differs
```

What changes between environments is **configuration** (URLs, credentials, replica counts), injected at deploy time from env vars, ConfigMaps or a secrets manager.

Promotion gates: **automated** (smoke tests, error-rate checks, scan results) and **manual** (e.g. a GitHub Actions `environment: production` with required reviewers). Frequent deploy freezes are a smell that deploys are too risky.

Staging never matches production (data volume, traffic shape, third parties). That gap is why the strategies below — which test *in* production, safely — exist.

---

## 3. Recreate and rolling updates

**Recreate**: stop all old instances, then start new ones. Old and new never coexist, but there is **guaranteed downtime**. Fine for dev, batch workers, or versions that truly cannot run side by side.

**Rolling update**: replace instances a few at a time behind the load balancer — the Kubernetes Deployment default.

```yaml
# Deployment spec excerpt
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 25%       # extra pods above replicas (default 25%)
      maxUnavailable: 0   # never drop below 10 ready pods (default 25%)
```

```bash
kubectl rollout status deployment/checkout    # wait for completion
kubectl rollout undo deployment/checkout      # back to previous revision
```

Trade-offs:

- **No extra capacity** (only `maxSurge`) and no downtime — *if* readiness probes are honest.
- **Both versions serve traffic at once**, so v2 must be compatible with v1 (APIs, message formats, DB schema).
- **Rollback is another rolling update**, as slow as the rollout.
- No controlled exposure: any user may hit v2 before you notice a problem.

On AWS: ECS uses `minimumHealthyPercent`/`maximumPercent`; Auto Scaling groups use instance refresh.

---

## 4. Blue-green deployment

Run two full production environments. **Blue** is live; deploy v2 to **green**, test it privately, then **switch the router** to green. Blue stays warm for instant rollback.

```text
 users ─► load balancer ──(switch)──┐
            │                       │
            ▼                       ▼
   ┌──────────────┐        ┌──────────────┐
   │ BLUE  v1     │        │ GREEN v2     │
   │ live→standby │        │ tested→live  │
   └──────┬───────┘        └──────┬───────┘
          └──── shared database ──┘
```

| Aspect | Blue-green |
|---|---|
| Downtime | Near zero — one atomic switch |
| Rollback | Fastest: switch back while blue still runs |
| Cost | ~**2× capacity** during the release |
| Mixed versions | None at the app tier |
| Exposure | 100% of users at once after the switch |

Switch at the **load balancer** (ALB listener to another target group, Kubernetes Service `selector` from `version: blue` to `version: green`) — immediate. A **DNS** switch is slow and unreliable because resolvers and clients cache records and some ignore the TTL.

The hard parts: the **database is usually shared**, so the schema must suit both versions (section 8); in-flight requests and WebSockets must drain; sessions must live outside instances. On AWS, CodeDeploy does blue/green for EC2, ECS and Lambda.

---

## 5. Canary releases and progressive delivery

A **canary** sends a small slice of real traffic to v2, compares metrics, and raises the share step by step — or aborts. It limits the **blast radius**: a bad release hurts 5% of users for ten minutes, not everyone.

```text
 v2 weight:  5% ──► 25% ──► 50% ──► 100%
             │       │       │
          analyse analyse analyse   (error rate, p99, KPIs vs baseline)
             └── any check fails ──► weight back to 0%, alert
```

**Progressive delivery** automates it: a controller shifts weights and runs metric analysis. Argo Rollouts example:

```yaml
# Rollout spec excerpt (apiVersion: argoproj.io/v1alpha1)
strategy:
  canary:
    steps:
      - setWeight: 5
      - pause: { duration: 10m }
      - analysis:
          templates:
            - templateName: success-rate   # Prometheus query
      - setWeight: 50
      - pause: { duration: 10m }
```

Architect notes:

- **Split precision** — without a mesh or smart ingress, weight is approximated by pod count (1 of 10 pods ≈ 10%). Istio, Linkerd, ingress controllers or Gateway API give exact percentages. Flagger does this for Flux; Lambda aliases support shifts like `Canary10Percent5Minutes`; ALB supports weighted target groups.
- **Low traffic breaks canaries** — 5% of 20 requests/minute is one request; no signal.
- **Stickiness** — route by user when bouncing between versions would confuse users.
- Compare against a **baseline running v1 at the same time**, not yesterday's numbers.

---

## 6. Shadow traffic and A/B testing

**Shadow deployment** (traffic mirroring): requests are **copied** to v2 and its responses **discarded**; users only see v1's answer.

```text
            ┌──────────► v1 (live) ───► response to user
 request ─► proxy/mesh
            └── copy ──► v2 (shadow) ─► response dropped, metrics recorded
```

It tests a rewrite or new datastore under real load with **zero user impact** (Istio `mirror`, nginx `mirror`). The trap is **side effects**: a mirrored `POST /payments` charges twice and mirrored requests send emails. Mirror read paths only, or stub v2's downstreams. It also doubles load on shared dependencies.

| | Canary | A/B test | Shadow |
|---|---|---|---|
| Question | Is v2 *safe*? | Is B *better* for the business? | Does v2 work under real load? |
| Users see v2 | Yes, small rising share | Yes, fixed sticky split | No |
| Duration | Minutes–hours | Days–weeks (statistical significance) | As needed |
| Mechanism | Router / mesh | Experimentation / flag platform | Proxy mirroring |

---

## 7. Feature flags: separating deploy from release

A **feature flag** is a runtime condition, evaluated per request, user or tenant, that turns a code path on or off. Code ships dark and is enabled gradually without a deploy.

```js
const enabled = await flags.getBooleanValue('new-checkout', false, {
  targetingKey: user.id,
});

if (enabled) {
  return renderNewCheckout(cart);
}

return renderLegacyCheckout(cart);
```

| Type | Purpose | Lifetime |
|---|---|---|
| Release toggle | Hide unfinished work on trunk | Days–weeks, then **delete** |
| Experiment toggle | A/B tests | Weeks |
| Ops toggle / kill switch | Disable a costly or failing feature | Long-lived |
| Permission toggle | Premium, beta, internal features | Long-lived |

Benefits: roll back a *feature* in seconds, release per tenant, test in production with internal users, merge incomplete code safely.

Costs: **flag debt** (stale flags are risky dead code — Knight Capital's 2012 loss involved reactivated old flag code), so give each release flag an owner and expiry; test the on and off states of active flags; evaluate locally with safe defaults so a flag-service outage does not become yours. Tools: LaunchDarkly, Unleash, Flagsmith, AWS AppConfig; **OpenFeature** (CNCF) is the vendor-neutral API used above.

---

## 8. Zero-downtime database migrations: expand–contract

Code rolls back in seconds; **data does not**. During rolling, blue-green or canary deploys, two app versions share **one database**, so every schema change must work for both. Use **expand–contract** (parallel change). Renaming `users.fullname` to `display_name`:

```text
 step  change                     app behaviour
 ────  ─────────────────────────  ──────────────────────────────────
  1    EXPAND: add display_name    v1 still uses fullname
  2    deploy v2                   writes BOTH columns, reads fullname
  3    backfill old rows (batches)
  4    deploy v3                   reads display_name, writes both
  5    deploy v4                   uses display_name only
  6    CONTRACT: drop fullname     no running version reads it
```

```sql
-- 1. Expand: nullable column, no default = fast metadata change
ALTER TABLE users ADD COLUMN display_name text;

-- 3. Backfill in small batches; repeat until 0 rows updated
UPDATE users SET display_name = fullname
WHERE id IN (SELECT id FROM users WHERE display_name IS NULL LIMIT 5000);

-- PostgreSQL: build an index without blocking writes
CREATE INDEX CONCURRENTLY idx_users_display_name ON users (display_name);

-- 6. Contract: only after every old version is gone
ALTER TABLE users DROP COLUMN fullname;
```

Review rules:

- Additive migrations deploy **before** the code that needs them; destructive ones (drop, rename, add `NOT NULL`) **after** old code is gone.
- Every step is **rollback-safe**: the app can go back one version at any point.
- Watch locks: a table rewrite blocks writes. Use online DDL (`CREATE INDEX CONCURRENTLY`, gh-ost or pt-online-schema-change for MySQL) and a `lock_timeout`.
- Run migrations (Flyway, Liquibase, framework tools) once as a pipeline step or Kubernetes Job, not from every replica at startup.

---

## 9. Rollback strategy

"We'll roll back" is not a plan until you know **what** can be rolled back and **how fast**.

| Option | Speed | Works when |
|---|---|---|
| Turn a feature flag off | Seconds | Change was behind a flag |
| Blue-green switch back | Seconds | Old env still up, schema compatible |
| Canary abort | Seconds–minutes | Only the canary slice affected |
| Redeploy previous artifact (`rollout undo`, `git revert`) | Minutes | Old image kept, schema compatible |
| **Roll forward** (fix and deploy) | Pipeline duration | Fast pipeline; rollback riskier |

Redeploying code **cannot undo**: destructive schema changes, data written in a new format, payments and emails already sent, messages already consumed by other services.

A sound strategy: define **rollback triggers in advance** (e.g. error rate 2× baseline for 5 minutes) and automate them; keep **N−1 deployable** (Kubernetes keeps `revisionHistoryLimit: 10` old ReplicaSets by default); **rehearse** rollback; **restore service first**, find the root cause later. "Roll forward only" with a 45-minute pipeline means a 45-minute outage.

---

## 10. GitOps: Git as the source of truth

**GitOps**: the desired state of each environment is **declared in Git**, and an agent inside the cluster continuously makes reality match it. OpenGitOps principles: **declarative**, **versioned and immutable**, **pulled automatically**, **continuously reconciled**.

```text
 push-based:  CI ── kubectl apply ──► cluster   (CI holds cluster credentials)

 pull-based:  dev ─ PR ─► config repo (Git)
                              ▲
                              │ watch / poll
                ┌─────────────┴─────────────┐
                │ agent in cluster          │
                │ diff Git vs live → apply, │
                │ prune, self-heal drift    │
                └───────────────────────────┘
```

Why architects like it:

- **Security** — CI needs no cluster credentials; the cluster API need not be reachable from CI.
- **Audit and rollback** — every change is a reviewed commit; rollback is `git revert`.
- **Drift correction** — a manual `kubectl edit` is detected and reverted.
- **DR** — a fresh cluster converges to the repo state.

Typical layout: an **app repo** (CI builds the image) and a **config repo** (manifests, Helm values, Kustomize overlays per environment). CI's last step commits or opens a PR bumping the image tag; promotion to production is a merge.

Caveats: no plaintext secrets in Git (Sealed Secrets, SOPS, External Secrets Operator); imperative steps like migrations need sync hooks or Jobs; many apps × clusters need structure to stay readable.

---

## 11. Argo CD and Flux

Both are CNCF **graduated** projects for pull-based GitOps on Kubernetes. An Argo CD `Application`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: checkout-prod
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/acme/deploy-config.git
    targetRevision: main
    path: apps/checkout/overlays/prod
  destination:
    server: https://kubernetes.default.svc
    namespace: checkout
  syncPolicy:
    automated:
      prune: true      # delete resources removed from Git
      selfHeal: true   # revert manual changes in the cluster
```

Flux splits the idea into controllers: a `GitRepository` source plus a `Kustomization` or `HelmRelease` reconciled on an `interval`.

| | Argo CD | Flux |
|---|---|---|
| UX | Rich web UI, diff view, SSO/RBAC | CLI and CRDs first |
| Model | `Application`/`ApplicationSet`, often one hub for many clusters | Composable toolkit controllers, usually per cluster |
| Sync | Polls Git (default 3 min) or webhook | Each object on its own `interval`, webhook receivers |
| Progressive delivery | Argo Rollouts | Flagger |

Rule of thumb: a visual control plane for many teams and clusters → Argo CD; a lightweight, fully declarative per-cluster toolkit → Flux. Both are sound choices on EKS.

---

## 12. DORA metrics: measuring delivery performance

DORA research (DevOps Research and Assessment, now at Google Cloud) found that a few metrics predict delivery performance, and that **speed and stability improve together**.

| Metric | Type | Question |
|---|---|---|
| **Deployment frequency** | Throughput | How often do we deploy to production? |
| **Lead time for changes** | Throughput | Commit → running in production: how long? |
| **Change failure rate** | Stability | What % of deployments need remediation (rollback, hotfix)? |
| **Time to restore** (now *failed deployment recovery time*) | Stability | How long to recover from a failed deployment? |

Recent reports add **rework rate** (unplanned deployments to fix user-facing issues). Top performers deploy on demand, many times a day, with lead and recovery times in hours or less.

How this topic moves them: small batches and automated pipelines → frequency and lead time; canary, flags, expand–contract → lower failure rate; fast rollback and kill switches → faster recovery.

Pitfalls: the metrics describe a **team's system**, not individuals — tie them to performance reviews and people game them. Define "deployment" and "failure" consistently, collect data automatically, and watch trends.

---

## Key interview points

- **Continuous delivery** = always releasable, human decides; **continuous deployment** = every green change ships automatically. **Deploy ≠ release.**
- **Build once, promote the same digest**; only config differs per environment.
- **Recreate** = downtime; **rolling** = no extra capacity, mixed versions, slow rollback; **blue-green** = instant switch/rollback at ~2× cost; **canary** = small blast radius with metric gates; **shadow** = real load, no user impact, beware side effects.
- Switch traffic at the **load balancer**, not DNS.
- **Feature flags** decouple release from deploy; manage flag debt.
- **Expand–contract**: additive first, destructive last, every step compatible with the previous version.
- Know what **cannot** be rolled back; set rollback triggers in advance.
- **GitOps** = state in Git, pulled and reconciled by an in-cluster agent (Argo CD, Flux); no cluster credentials in CI; rollback is `git revert`.
- **DORA**: deployment frequency, lead time, change failure rate, recovery time.

## Summary

- CD takes a CI artifact to production safely; the last step is manual in continuous delivery, automatic in continuous deployment.
- Strategies trade cost, rollback speed, mixed-version exposure and blast radius; automated canary is the modern default for busy services.
- Feature flags and expand–contract migrations make frequent deploys and fast rollback actually safe.
- GitOps turns deployment into a pull-based reconciliation loop from Git, via Argo CD or Flux.
- DORA metrics tell you whether it is working.
