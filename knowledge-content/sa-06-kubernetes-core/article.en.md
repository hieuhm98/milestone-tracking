# Kubernetes Core – Pods, Deployments, Services

## 1. Why container orchestration exists

Docker answers "how do I run one container". Production asks more: run 40 copies across 12 machines, restart crashed ones, move them off a dead server, roll out versions without downtime, give them stable addresses and inject config. Scripts around `docker run` stop working after a handful of hosts.

An **orchestrator** turns a fleet of machines into one pool of compute and keeps your containers running according to a description you provide.

| Concern | Without an orchestrator | With Kubernetes |
|---|---|---|
| Placement | You pick a host | Scheduler picks a node with free resources |
| Crash / node failure | A human restarts or migrates | Controllers recreate Pods elsewhere |
| Discovery | Hard-coded IPs | Service with stable IP and DNS name |
| Scaling | Launch containers by hand | Change `replicas: 3` to `replicas: 10` |

**Kubernetes** (K8s) grew out of Google's Borg, was open-sourced in 2014 and is governed by the CNCF. On AWS, **ECS** is the AWS-native orchestrator and **EKS** is managed Kubernetes. Kubernetes has a real cost in concepts and operations: for three containers on one VM, Docker Compose or a PaaS is often the better answer.

---

## 2. Cluster architecture: control plane and worker nodes

A cluster has a **control plane** (stores desired state, makes decisions) and **worker nodes** (run Pods).

```text
                        CONTROL PLANE
  +---------------------------------------------------------+
  |  kube-apiserver <----> etcd (all cluster state)         |
  |     ^   ^                                               |
  |     |   +-- kube-scheduler          (Pod -> node)       |
  |     +------ kube-controller-manager (reconcile loops)   |
  |             cloud-controller-manager (LBs, nodes)       |
  +-----|---------------------------------------------------+
        | HTTPS :6443 (everyone talks only to the API server)
   +----+----------------+------------------------+
   |                     |                        |
+--v---------------+  +--v---------------+   kubectl / CI
| NODE 1           |  | NODE 2           |
| kubelet          |  | kubelet          |
| kube-proxy       |  | kube-proxy       |
| containerd (CRI) |  | containerd (CRI) |
| [pod] [pod]      |  | [pod] [pod]      |
+------------------+  +------------------+
```

| Component | Job |
|---|---|
| `kube-apiserver` | The only front door: authenticates, validates, persists to etcd. Default port **6443** |
| `etcd` | Raft-based consistent key-value store holding every object — back it up |
| `kube-scheduler` | Assigns unscheduled Pods to nodes (resources, affinity, taints) |
| `kube-controller-manager` | Runs controllers: Deployment, ReplicaSet, Node, EndpointSlice, Job… |
| `kubelet` (every node) | Makes sure the Pods assigned to its node are running; reports status |
| `kube-proxy` (every node) | Programs iptables/IPVS/nftables rules so Service IPs reach Pods |
| Container runtime | Runs containers via the CRI — usually **containerd** or CRI-O |

Components **coordinate through the API server**, not by calling each other: the scheduler writes a node name onto the Pod, and that node's kubelet notices through a watch. Also, **dockershim was removed in v1.24** (2022), so nodes no longer use Docker Engine — but Docker-built images are standard OCI images and run unchanged.

---

## 3. The declarative model and reconciliation

You don't say "start three containers". You declare "desired state: three replicas of this template", and **controllers** continuously compare `spec` (desired) with `status` (observed) and fix the difference — the **reconciliation loop**.

```text
 spec: replicas 3          status: 2 running (a node died)
            \                   /
             +--> controller: diff +1 --> create Pod via API server
                     ^                             |
                     +------- watch events <-------+   (forever)
```

Every object has the same shape:

```yaml
apiVersion: apps/v1     # API group/version
kind: Deployment        # object type
metadata:
  name: web
  namespace: shop
  labels:
    app: web
spec:                   # desired state, written by you
  replicas: 3
# status: ...           # observed state, written by controllers
```

`kubectl create -f` is imperative (fails if the object exists); **`kubectl apply -f`** is declarative and idempotent — the production way, with YAML reviewed in Git (GitOps, topic 14). A manual `kubectl scale` is silently reverted by the next apply from Git, which is exactly the point.

---

## 4. The Pod: the smallest deployable unit

A **Pod** is one or more containers scheduled together on one node, sharing **one network namespace** (one IP, reachable to each other on `localhost`) and the Pod's **volumes**.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web
  labels:
    app: web
spec:
  containers:
    - name: app
      image: ghcr.io/acme/web:1.4.2
    - name: log-shipper       # sidecar: same IP, shared volumes
      image: fluent/fluent-bit:3.0
```

Multi-container Pods are for **tightly coupled helpers**: log shippers, proxy sidecars, and `initContainers` that run before the app starts. Your app and its database do **not** share a Pod — they scale and fail independently.

The key property: **Pods are ephemeral**. A Pod is never repaired or moved; it is replaced by a new Pod with a **new IP**. Never hard-code Pod IPs, and don't create bare Pods — let a controller manage them. Probes and resource requests are topic 7.

---

## 5. Labels, selectors and the ReplicaSet

**Labels** are key-value tags on objects (`app: web`, `tier: frontend`); **selectors** query them. This loose coupling is how objects find each other: a ReplicaSet does not keep a list of Pod names, it owns "every Pod matching `app=web`".

A **ReplicaSet** keeps N identical Pods running from a template:

```text
ReplicaSet web-7d9f   replicas: 3   selector: app=web
   counts Pods labelled app=web
     found 2 -> create 1 from template
     found 4 -> delete 1
```

Consequences: delete a Pod and a replacement appears at once; remove the label from a Pod (`kubectl label pod web-abc app-`) and it is orphaned — a new one is created while the old Pod stays alive for debugging. Changing a ReplicaSet's template does **not** touch existing Pods, so it cannot roll out a new version. That is the Deployment's job.

---

## 6. The Deployment: versioned ReplicaSets

A **Deployment** manages ReplicaSets for stateless apps. Change the Pod template (e.g. the image tag) and it creates a **new ReplicaSet**, shifting Pods over gradually.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web          # must match the template labels
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: app
          image: ghcr.io/acme/web:1.4.2
          ports:
            - containerPort: 8080
```

```text
Deployment web
  |-- ReplicaSet web-6b8c (1.4.1)  3 -> 2 -> 1 -> 0   (kept for rollback)
  +-- ReplicaSet web-7d9f (1.4.2)  0 -> 1 -> 2 -> 3
```

The chain **Deployment → ReplicaSet → Pod** explains names like `web-7d9f5c6b8-x2kqp`. Old ReplicaSets stay at zero replicas (last 10 by default, `revisionHistoryLimit`) so rollback is scaling one back up. Only changes to `spec.template` trigger a rollout; `spec.selector` is **immutable**. Rollout tuning and `kubectl rollout undo` are covered in topic 7.

---

## 7. Services: a stable address for moving Pods

A **Service** gives the Pods matching a selector a **stable virtual IP** and **DNS name**, and spreads connections across the ones that are **ready**.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: shop
spec:
  type: ClusterIP       # default
  selector:
    app: web
  ports:
    - port: 80          # port clients call
      targetPort: 8080  # port the container listens on
```

```text
curl http://web.shop.svc.cluster.local
  | 1. CoreDNS -> ClusterIP 10.96.12.34
  v
10.96.12.34:80   (virtual: no process listens here)
  | 2. kube-proxy rules on the node DNAT to a ready endpoint
  v
EndpointSlice: 10.244.1.7:8080, 10.244.2.3:8080, 10.244.2.9:8080
```

- The **EndpointSlice** holds IPs of Pods that match the selector **and are ready**.
- DNS name: `<service>.<namespace>.svc.cluster.local`; `web` works in the same namespace, `web.shop` from another.
- kube-proxy balances at **L4, per connection**. Long-lived HTTP/2 or gRPC connections stick to one Pod — a classic cause of uneven load.

---

## 8. Service types: ClusterIP, NodePort, LoadBalancer

The types stack: a NodePort Service also has a ClusterIP; a LoadBalancer Service (classic implementation) also has a NodePort.

```text
Internet
  |
[ cloud load balancer ]        <- LoadBalancer
  |
<any node IP>:31080            <- NodePort (30000-32767)
  |
ClusterIP 10.96.12.34:80       <- ClusterIP (internal)
  |
Pods :8080
```

| Type | Reachable from | Use | Watch out |
|---|---|---|---|
| `ClusterIP` | Inside the cluster | Internal APIs, caches, DBs | Needs Ingress/LB to go public |
| `NodePort` | Every node's IP, port 30000–32767 | Dev, behind your own LB | Odd ports, open on every node |
| `LoadBalancer` | A cloud LB address | Exposing one service, TCP/UDP | **One cloud LB per Service** — cost |
| `ExternalName` | DNS CNAME | Alias an external host | No proxying |

A **headless Service** (`clusterIP: None`) returns Pod IPs directly from DNS — used by StatefulSets (topic 7). Twenty microservices as `LoadBalancer` means twenty load balancers on the bill; that is why Ingress exists.

---

## 9. Ingress and the ingress controller

An **Ingress** holds **L7 HTTP(S) rules** — host and path to Service — so many Services share **one** entry point and TLS certificate.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shop
spec:
  ingressClassName: nginx
  tls:
    - hosts: [shop.example.com]
      secretName: shop-tls
  rules:
    - host: shop.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api
                port:
                  number: 80
```

**An Ingress object does nothing by itself.** An **ingress controller** — proxy Pods, or an operator driving a cloud LB — watches Ingresses and implements them. With no controller, the Ingress never gets an address.

```text
client -> DNS -> [ one LB ] -> ingress controller -> /api -> Service api
                                                  -> /    -> Service web
```

Common controllers: **ingress-nginx** (NGINX Pods behind one `LoadBalancer` Service; its retirement was announced in late 2025), the **AWS Load Balancer Controller** (provisions an ALB), Traefik, HAProxy and Kong. Anything beyond host/path (rewrites, auth, rate limits) is a controller-specific **annotation** — not portable. The **Gateway API** (`Gateway`, `HTTPRoute`; GA 2023) is the successor with role separation and richer, portable routing.

---

## 10. ConfigMap and Secret

Following 12-factor, config lives outside the image.

- **ConfigMap** — non-sensitive keys or files (flags, `nginx.conf`); max **1 MiB**.
- **Secret** — passwords, tokens, keys; types include `Opaque`, `kubernetes.io/tls`, `kubernetes.io/dockerconfigjson`.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: web-db
type: Opaque
stringData:             # stored base64-encoded
  DB_PASSWORD: s3cr3t
# container spec:
#   envFrom:
#     - configMapRef: { name: web-config }
#   env:
#     - name: DB_PASSWORD
#       valueFrom:
#         secretKeyRef: { name: web-db, key: DB_PASSWORD }
```

| Consumed as | Picks up changes? |
|---|---|
| Environment variables | **No** — read at start; restart the Pods |
| Mounted volume | Yes, after kubelet sync (not with `subPath`) |

**Secrets are base64-encoded, not encrypted.** Anyone who can read Secrets in the namespace, or etcd, sees them. Baseline: encryption at rest for etcd, RBAC limits on Secrets (topic 7), no Secret YAML in Git, and ideally an external store (AWS Secrets Manager, Vault) synced by External Secrets Operator or the Secrets Store CSI Driver.

---

## 11. Namespaces

A **namespace** is a virtual partition of a cluster: names are unique within it, and it is the unit for **RBAC**, **ResourceQuota**, **LimitRange** and **NetworkPolicy**.

Built-ins: `default` (objects with no namespace given), `kube-system` (CoreDNS, kube-proxy, CNI), `kube-public` and `kube-node-lease` (node heartbeats).

- Namespaces are **not network isolation by default**: Pods talk across them until a NetworkPolicy restricts it, and share nodes. Hostile tenants need separate clusters.
- Some objects are **cluster-scoped**: Nodes, PersistentVolumes, Namespaces, ClusterRoles.
- Prod and non-prod as namespaces in one cluster is cheap but risky — a bad upgrade or noisy neighbour hits production. Most organisations separate prod clusters.

---

## 12. kubectl essentials

`kubectl` is an API client configured by **kubeconfig** (`~/.kube/config`): clusters, users and **contexts**.

```bash
kubectl config use-context prod-eks
kubectl config set-context --current --namespace=shop

kubectl get pods -o wide                  # node + Pod IP
kubectl get pods -A                       # all namespaces
kubectl describe pod web-7d9f5c6b8-x2kqp  # events at the bottom
kubectl explain deployment.spec.strategy

kubectl diff -f k8s/                      # preview changes
kubectl apply -f k8s/

kubectl logs deploy/web --previous        # crashed container's logs
kubectl exec -it web-7d9f5c6b8-x2kqp -- sh
kubectl port-forward svc/web 8080:80
kubectl create deployment web --image=nginx:1.27 --dry-run=client -o yaml
```

Triage "the app is down": `get pods` → `describe pod` (events) → `logs --previous` → check the Service has endpoints.

| Symptom | Most likely cause |
|---|---|
| `Pending` | No node fits the requested CPU/memory, or an affinity/volume rule fails |
| `ImagePullBackOff` | Wrong tag, or private registry without a pull Secret |
| `CrashLoopBackOff` | Process keeps exiting: bad config, missing env var, dependency down |
| Service has no endpoints | Selector doesn't match Pod labels, or Pods not ready |

---

## 13. Mapping to Amazon EKS

**Amazon EKS** runs the control plane — API server and etcd across multiple AZs, patched by AWS — for a per-cluster hourly fee ($0.10/hour on standard support). You own worker capacity and workloads.

| Kubernetes | On EKS |
|---|---|
| Worker nodes | Managed node groups (EC2 + ASG), Karpenter, Fargate (one micro-VM per Pod), EKS Auto Mode |
| Pod networking | **Amazon VPC CNI** — each Pod gets a real VPC IP (size subnets for it) |
| `LoadBalancer` Service | **NLB** via the AWS Load Balancer Controller |
| Ingress | **ALB** via the AWS Load Balancer Controller |
| Pod → AWS APIs | **IRSA** or **EKS Pod Identity**, never node-wide keys |
| Secrets | KMS envelope encryption; Secrets Manager via External Secrets / CSI driver |
| Registry / human access | ECR; IAM principals via **access entries** (older: `aws-auth` ConfigMap) |

**EKS vs ECS**: ECS for AWS-only teams wanting less to operate; EKS for multi-cloud or on-prem portability, the CNCF ecosystem (Helm, Argo CD, operators) or existing Kubernetes skills.

---

## Key interview points

- Kubernetes is **declarative**: desired state goes through the API server into etcd; controllers **reconcile** toward it forever.
- Control plane: **apiserver, etcd, scheduler, controller-manager**. Node: **kubelet, kube-proxy, runtime**. All traffic goes via the API server.
- **Pods are ephemeral** with changing IPs; **Deployment → ReplicaSet → Pod**, and a template change creates a new ReplicaSet.
- **Labels/selectors** wire objects together; a Service without endpoints usually means a selector mismatch or unready Pods.
- **ClusterIP** internal, **NodePort** 30000–32767 on every node, **LoadBalancer** one cloud LB per Service; balancing is L4 per connection.
- **Ingress** needs an **ingress controller**; Gateway API is the successor.
- **Secrets are base64, not encrypted** by default; env vars don't refresh without a restart.
- **Namespaces** scope names, RBAC and quotas — not network isolation.
- **EKS**: managed control plane, VPC CNI Pod IPs, ALB for Ingress, NLB for LoadBalancer, IRSA/Pod Identity.

## Summary

- Orchestration turns machines into one pool; the control plane decides, nodes run Pods, all through the API server.
- Pods are disposable, ReplicaSets keep a count, Deployments add versioned rollouts.
- Services give stable IPs and DNS; NodePort/LoadBalancer expose them; Ingress shares one HTTP entry point.
- ConfigMaps, Secrets and namespaces handle config and partitioning; EKS is managed Kubernetes on AWS.
