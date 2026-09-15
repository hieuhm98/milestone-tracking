# Kubernetes Operations – Running Workloads in Production

## 1. From "it runs" to "it runs in production"

Topic 6 put a Deployment behind a Service. Production must also answer: can this container really serve traffic (**probes**)? How much CPU and memory, and who is killed first (**requests, limits, QoS**)? What if traffic triples (**autoscalers**)? How do we ship and undo safely (**rollouts, PDB**)? Where does state live (**StatefulSet, PV**)? Who may do what, and which pod may talk to which (**RBAC, NetworkPolicy**)? How do we package it (**Helm**)?

Every feature is a controller reacting to a signal. When something misbehaves, ask: *which controller acts on which signal?*

```text
 signal                         controller                     action
 ---------------------------    ---------------------------    -----------------------------
 liveness/startup result    ->  kubelet                    ->  restart container
 readiness result           ->  EndpointSlice controller   ->  add/remove pod from Service
 CPU / memory / custom      ->  HPA / VPA                  ->  change replicas / requests
 Pending (unschedulable)    ->  Cluster Autoscaler         ->  add or remove nodes
 changed pod template       ->  Deployment controller      ->  rolling update
```

---

## 2. Health probes: liveness, readiness, startup

The kubelet runs probes of type `httpGet` (status 200–399 = success), `tcpSocket`, `exec` (exit 0) or `grpc`.

| Probe | Asks | On failure |
|---|---|---|
| **liveness** | Is the process stuck for good? | container is **restarted** |
| **readiness** | Can it serve *right now*? | pod **removed from Service endpoints**, not restarted |
| **startup** | Has it finished booting? | other probes wait until it succeeds; if it never does, restart |

```yaml
startupProbe:
  httpGet: { path: /healthz, port: 8080 }
  periodSeconds: 5
  failureThreshold: 30      # up to 150 s to boot
readinessProbe:
  httpGet: { path: /ready, port: 8080 }
  periodSeconds: 5
livenessProbe:
  httpGet: { path: /healthz, port: 8080 }
  timeoutSeconds: 2
```

Defaults: `periodSeconds: 10`, `timeoutSeconds: 1`, `failureThreshold: 3`, `initialDelaySeconds: 0`. So a hung container is restarted after about 30 seconds.

---

## 3. Designing probes that do not cause outages

- **Liveness checks only the process.** If `/healthz` queries the database and the DB blips, every replica fails at once and the whole fleet restarts. Dependency checks, if any, go in readiness.
- **Slow starters get a startup probe**, not a huge `initialDelaySeconds` on liveness.
- **The 1 s default timeout** is short for a JVM in a GC pause; a timeout counts as failure.
- **Graceful shutdown:** endpoint removal and `SIGTERM` happen concurrently; `SIGKILL` follows after `terminationGracePeriodSeconds` (default 30), so add a short `preStop` sleep.

| Symptom | Likely cause |
|---|---|
| `CrashLoopBackOff`, restarts climbing | liveness failing, crash at start, or `OOMKilled` |
| `Running` but `0/1 READY`, Service 503 | readiness failing |
| Restarts only during boot | no startup probe; liveness fires too early |
| All pods restart when the DB is slow | liveness checks a dependency |

`CrashLoopBackOff` restarts with exponential back-off (10 s, 20 s, 40 s … capped at 5 min). Use `kubectl describe pod` and `kubectl logs <pod> --previous`.

---

## 4. Requests, limits and QoS classes

```yaml
resources:
  requests:
    cpu: 250m          # 0.25 core, reserved by the scheduler
    memory: 256Mi
  limits:
    memory: 256Mi      # exceed it -> OOMKilled
```

- **Requests** are what the **scheduler** reserves; a pod fits a node only if the node's allocatable minus existing requests covers it. Real usage does not matter for placement.
- **CPU limit** → the container is **throttled** (CFS quota), never killed — seen as latency spikes with low average CPU.
- **Memory limit** → the container is **OOMKilled** (exit code 137).
- `1` CPU = `1000m`; `Mi` = 2^20 bytes, `M` = 10^6.

| QoS class | Rule | Under node memory pressure |
|---|---|---|
| **Guaranteed** | every container: CPU and memory requests = limits | evicted last |
| **Burstable** | some request/limit set, not Guaranteed | in between (over-request pods first) |
| **BestEffort** | nothing set | evicted first |

Review guidance: set **memory request = limit** for important services; many teams set **CPU requests without CPU limits** to avoid throttling. Requests too high waste nodes; too low cause evictions. Enforce defaults with **LimitRange** and totals with **ResourceQuota**.

---

## 5. Horizontal Pod Autoscaler (HPA)

HPA changes `replicas`. CPU/memory come from **metrics-server**; custom metrics (RPS, queue length) come via Prometheus Adapter or **KEDA**.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: api }
  minReplicas: 3
  maxReplicas: 30
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 70 }
```

```text
desiredReplicas = ceil(currentReplicas × currentMetric / targetMetric)
4 pods at 140% of CPU request, target 70%  ->  ceil(4 × 140 / 70) = 8
```

- **Utilization is a percentage of the request.** Without a CPU request, HPA cannot compute it and does not scale.
- It evaluates about every **15 s**, ignores ~10% deviation, and waits a **300 s stabilization window** before scaling down.
- New pods still need scheduling, image pull and readiness — keep headroom (`minReplicas`) or scale on a leading metric such as queue depth.
- Do not also pin `replicas` in GitOps manifests; Git and HPA will fight.

---

## 6. VPA, Cluster Autoscaler and Karpenter

| Autoscaler | Scales | Trigger |
|---|---|---|
| **VPA** | pod requests/limits | historical usage |
| **Cluster Autoscaler** | nodes in node groups | **Pending** pods; under-used nodes |
| **Karpenter** | nodes, picks instance types | Pending pods; consolidation (basis of EKS Auto Mode) |

**VPA** is an add-on. `updateMode: "Off"` only recommends — a safe right-sizing tool; other modes apply requests by evicting pods. **Never let HPA and VPA both act on CPU/memory of one workload**: VPA raises requests, utilization drops, HPA scales in, and they oscillate.

**Cluster Autoscaler ignores CPU usage.** It adds a node when a pod is unschedulable for lack of *requested* resources, and removes nodes whose pods can fit elsewhere. Wrong requests break node scaling too.

```text
 traffic up -> HPA 4 -> 8 replicas
            -> scheduler: 3 pods Pending (Insufficient cpu)
            -> Cluster Autoscaler / Karpenter launches nodes (~1-2 min)
            -> image pull, startup + readiness pass -> pods join Service
```

So scale-out takes minutes when nodes are full; keep headroom or low-priority placeholder pods.

---

## 7. Rolling updates, rollback and disruption budgets

Changing the **pod template** creates a new ReplicaSet and a new revision; changing `replicas` does not.

```yaml
spec:
  replicas: 10
  minReadySeconds: 10
  progressDeadlineSeconds: 600
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 25%        # up to 13 pods during rollout
      maxUnavailable: 0    # never below 10 ready
```

- Default: `RollingUpdate`, `maxSurge: 25%`, `maxUnavailable: 25%`. `Recreate` stops all old pods first.
- **Readiness gates the rollout.** Without a readiness probe, a broken version counts as available as soon as it starts.
- Past `progressDeadlineSeconds` the rollout is marked failed, but Kubernetes **does not roll back automatically**.

```bash
kubectl set image deployment/api api=registry.example.com/api:1.5.0
kubectl rollout status deployment/api --timeout=5m
kubectl rollout history deployment/api
kubectl rollout undo deployment/api --to-revision=3
```

Rollback restores only the pod template — not a ConfigMap edited in place, not a DB migration (strategies like canary and expand–contract are topic 14).

A **PodDisruptionBudget** (`policy/v1`, e.g. `minAvailable: 2` for `app: api`) limits *voluntary* disruptions — `kubectl drain`, node upgrades, autoscaler scale-down — not node crashes. A PDB allowing zero disruptions (`minAvailable: 1` on one replica) blocks drains indefinitely.

---

## 8. StatefulSets and persistent storage

A **StatefulSet** gives each pod a **stable name** (`db-0`, `db-1`), **stable DNS** via a headless Service (`db-0.db.prod.svc.cluster.local`), **its own PVC** from `volumeClaimTemplates`, and **ordered** create/scale/update.

A **PersistentVolumeClaim** (PVC) requests storage ("20Gi, ReadWriteOnce, class gp3"); a **StorageClass** tells the CSI driver (e.g. `ebs.csi.aws.com`) how to provision a **PersistentVolume** (PV), bound 1:1 to the claim.

```text
 StatefulSet db (3 replicas) + headless Service db
   db-0 -- PVC data-db-0 -- PV (EBS, zone a)
   db-1 -- PVC data-db-1 -- PV (EBS, zone b)
   db-2 -- PVC data-db-2 -- PV (EBS, zone c)
 pod db-1 deleted -> new db-1 re-attaches data-db-1
 scale to 2       -> db-2 removed, data-db-2 kept by default
```

- **Access modes:** `ReadWriteOnce` (one node), `ReadOnlyMany`, `ReadWriteMany` (needs shared FS such as EFS/NFS), `ReadWriteOncePod`. EBS is RWO and **zonal**.
- **`WaitForFirstConsumer`** provisions the disk in the zone where the pod was scheduled; `Immediate` may create it in the wrong zone.
- Dynamic PVs default to reclaim **`Delete`** — deleting the PVC deletes the disk. Use `Retain` for precious data.
- A StatefulSet is identity, **not** replication, backup or failover; that comes from the database or an **operator** (CloudNativePG, Strimzi). Many teams keep data in RDS/ElastiCache and run only stateless tiers in-cluster.

---

## 9. DaemonSets, Jobs and CronJobs

| Object | Runs | Typical use |
|---|---|---|
| **DaemonSet** | one pod per (matching) node | log shipper, node-exporter, CNI, kube-proxy |
| **Job** | pods until N complete successfully | migration, reindex, batch |
| **CronJob** | a Job on a cron schedule | nightly report, cleanup |

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-report
spec:
  schedule: "0 2 * * *"
  timeZone: "Asia/Ho_Chi_Minh"
  concurrencyPolicy: Forbid          # Allow (default) | Forbid | Replace
  jobTemplate:
    spec:
      backoffLimit: 4                # retries (default 6)
      activeDeadlineSeconds: 3600
      template:
        spec:
          restartPolicy: OnFailure   # Jobs allow only OnFailure or Never
          containers:
            - name: report
              image: registry.example.com/report:1.2.0
```

DaemonSets need tolerations to run on tainted nodes (e.g. control plane). CronJob is only **approximately once**: a run can be duplicated or skipped, so batch work must be **idempotent**; use `Forbid` when runs must not overlap.

---

## 10. RBAC: who can do what

| Object | Scope | Purpose |
|---|---|---|
| **Role** | namespace | allowed verbs on resources |
| **ClusterRole** | cluster | same for cluster resources, or reusable in many namespaces |
| **RoleBinding** | namespace | grants a Role *or ClusterRole* inside one namespace |
| **ClusterRoleBinding** | cluster | grants a ClusterRole everywhere |

Subjects: **Users** and **Groups** (from the authenticator; Kubernetes stores no user objects) and **ServiceAccounts** (pod identities).

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata: { name: config-reader, namespace: payments }
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata: { name: api-config-reader, namespace: payments }
subjects:
  - { kind: ServiceAccount, name: payments-api, namespace: payments }
roleRef: { apiGroup: rbac.authorization.k8s.io, kind: Role, name: config-reader }
```

- RBAC is **additive, allow-only** — no deny rules.
- Test: `kubectl auth can-i list secrets -n payments --as=system:serviceaccount:payments:payments-api`.
- Near-admin grants: reading **secrets**, **creating pods** (a pod can mount any secret/SA in its namespace), **`pods/exec`**, the `escalate`/`bind`/`impersonate` verbs, `*` wildcards.
- One ServiceAccount per workload; `automountServiceAccountToken: false` if it never calls the API.
- **EKS:** humans via access entries (or legacy `aws-auth`); pods get AWS permissions via **IRSA** or **EKS Pod Identity**.

---

## 11. NetworkPolicy: which pod can talk to which

By default **every pod can reach every pod**. A NetworkPolicy is a namespaced L3/L4 allow-list, enforced by the **CNI** (Calico, Cilium, AWS VPC CNI with policy enabled). On a CNI without support, policies are accepted and silently ignored.

Once any policy selects a pod for a direction, that direction is **isolated**; only traffic some policy allows passes.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: default-deny-ingress, namespace: payments }
spec:
  podSelector: {}
  policyTypes: ["Ingress"]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: api-from-ingress, namespace: payments }
spec:
  podSelector:
    matchLabels: { app: payments-api }
  policyTypes: ["Ingress"]
  ingress:
    - from:
        - namespaceSelector:
            matchLabels: { kubernetes.io/metadata.name: ingress-nginx }
          podSelector:
            matchLabels: { app.kubernetes.io/name: ingress-nginx }
      ports:
        - { protocol: TCP, port: 8080 }
```

- **AND vs OR:** selectors in the *same* `from` item are ANDed (ingress-nginx pods *in* that namespace). A `-` before `podSelector` makes two items, ORed — a much wider rule.
- **Default-deny egress breaks DNS**: allow UDP and TCP 53 to CoreDNS first.
- No HTTP paths or mTLS — use Cilium L7 policy or a service mesh. On AWS it complements security groups.

---

## 12. Helm: packaging Kubernetes applications

A **chart** holds `Chart.yaml` (chart `version`, `appVersion`, dependencies), default `values.yaml` and Go-templated `templates/`, e.g. `image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"`. Installing it creates a **release** with revision history. Values merge from `values.yaml`, then `-f` files, then `--set` (later wins). Charts can live in OCI registries (ECR, GHCR).

```bash
helm lint ./my-api
helm template api ./my-api -f values-prod.yaml    # render and review
helm upgrade --install api ./my-api -n payments -f values-prod.yaml \
  --set image.tag=1.5.0 --wait --timeout 5m
helm rollback api 4 -n payments
```

- Helm 3 has **no in-cluster Tiller**; it uses your kubeconfig/RBAC and stores release history as Secrets in the namespace.
- `helm rollback` reverts every resource in the release; `kubectl rollout undo` only one Deployment's pod template.
- **Kustomize** (`kubectl apply -k`) patches plain YAML with overlays, no templating; both work with GitOps (topic 14).
- Keep secrets out of values in Git (External Secrets Operator, Sealed Secrets).

---

## Key interview points

- **Liveness restarts, readiness removes from endpoints, startup protects slow boots.** Never check dependencies in liveness.
- **Requests drive scheduling, HPA and Cluster Autoscaler; limits drive CPU throttling and OOMKilled.** Eviction: BestEffort → Burstable → Guaranteed.
- **HPA** = more pods (needs requests); **VPA** = bigger pods, not on HPA's metric; **Cluster Autoscaler/Karpenter** = more nodes, triggered by Pending pods.
- **Rollouts** are gated by readiness and never auto-rollback; **PDB** covers voluntary disruptions only.
- **StatefulSet** = stable name, DNS, per-pod PVC — not replication or backup.
- **RBAC** is additive; secrets read, pod create and `pods/exec` are near-admin. **NetworkPolicy** needs a CNI that enforces it; default deny plus DNS egress.
- **Helm** = chart + values → versioned release; `helm rollback` reverts the whole release.

## Summary

- Production Kubernetes means feeding controllers honest signals: real probes, accurate requests, meaningful metrics.
- Probes decide restarts and traffic; resources decide placement, throttling, OOM kills and eviction.
- Autoscalers act on pods, pod size and nodes, and only cooperate when requests are right.
- StatefulSets give identity and disks; RBAC and NetworkPolicy give least privilege; Helm packages it all.
