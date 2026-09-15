# Vận hành Kubernetes – Chạy workload trên production

## 1. Từ "chạy được" tới "chạy được trên production"

Topic 6 đã đặt một Deployment sau một Service. Production còn phải trả lời thêm: container này có thật sự phục vụ được traffic không (**probe**)? Cần bao nhiêu CPU và memory, và ai bị kill trước (**requests, limits, QoS**)? Traffic tăng gấp ba thì sao (**autoscaler**)? Deploy và hoàn tác an toàn thế nào (**rollout, PDB**)? Dữ liệu có trạng thái nằm ở đâu (**StatefulSet, PV**)? Ai được làm gì, pod nào được nói chuyện với pod nào (**RBAC, NetworkPolicy**)? Đóng gói tất cả ra sao (**Helm**)?

Mọi tính năng đều là một **controller** (bộ điều khiển) phản ứng với một tín hiệu. Khi có sự cố, hãy hỏi: *controller nào đang hành động dựa trên tín hiệu nào?*

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

## 2. Health probe: liveness, readiness, startup

Kubelet chạy các **probe** (phép kiểm tra sức khoẻ) dạng `httpGet` (status 200–399 là thành công), `tcpSocket`, `exec` (exit code 0) hoặc `grpc`.

| Probe | Câu hỏi | Khi thất bại |
|---|---|---|
| **liveness** | Process có bị treo vĩnh viễn không? | container bị **restart** |
| **readiness** | *Ngay lúc này* có phục vụ được không? | pod bị **gỡ khỏi endpoints của Service**, không restart |
| **startup** | Đã khởi động xong chưa? | các probe khác chờ tới khi nó thành công; không bao giờ thành công thì restart |

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

Giá trị mặc định: `periodSeconds: 10`, `timeoutSeconds: 1`, `failureThreshold: 3`, `initialDelaySeconds: 0`. Tức là một container bị treo sẽ bị restart sau khoảng 30 giây.

---

## 3. Thiết kế probe để không tự gây sự cố

- **Liveness chỉ kiểm tra chính process.** Nếu `/healthz` gọi database và DB chập chờn, mọi replica cùng fail và cả đội pod bị restart một lúc. Kiểm tra dependency, nếu có, đặt ở readiness.
- **Ứng dụng khởi động chậm cần startup probe**, không phải một `initialDelaySeconds` thật lớn trên liveness.
- **Timeout mặc định 1 s** là quá ngắn cho JVM đang GC pause; timeout cũng tính là fail.
- **Tắt êm (graceful shutdown):** việc gỡ khỏi endpoints và gửi `SIGTERM` diễn ra đồng thời; `SIGKILL` tới sau `terminationGracePeriodSeconds` (mặc định 30), nên thêm một `preStop` sleep ngắn.

| Triệu chứng | Nguyên nhân thường gặp |
|---|---|
| `CrashLoopBackOff`, số restart tăng dần | liveness fail, app crash lúc khởi động, hoặc `OOMKilled` |
| `Running` nhưng `0/1 READY`, Service trả 503 | readiness fail |
| Chỉ restart trong lúc boot | thiếu startup probe; liveness chạy quá sớm |
| Mọi pod restart khi DB chậm | liveness đang kiểm tra dependency |

`CrashLoopBackOff` restart với **exponential back-off** (10 s, 20 s, 40 s … tối đa 5 phút). Dùng `kubectl describe pod` và `kubectl logs <pod> --previous` để xem lý do.

---

## 4. Requests, limits và QoS class

```yaml
resources:
  requests:
    cpu: 250m          # 0.25 core, reserved by the scheduler
    memory: 256Mi
  limits:
    memory: 256Mi      # exceed it -> OOMKilled
```

- **Requests** là phần **scheduler** giữ chỗ; pod chỉ vào được node nếu allocatable của node trừ tổng requests hiện có còn đủ. Mức dùng thật không ảnh hưởng việc xếp chỗ.
- **CPU limit** → container bị **throttle** (bóp băng thông CPU theo CFS quota), không bao giờ bị kill — biểu hiện là latency tăng vọt dù CPU trung bình thấp.
- **Memory limit** → container bị **OOMKilled** (exit code 137).
- `1` CPU = `1000m`; `Mi` = 2^20 byte, `M` = 10^6.

| QoS class | Quy tắc | Khi node thiếu memory |
|---|---|---|
| **Guaranteed** | mọi container: requests = limits cho cả CPU và memory | bị evict sau cùng |
| **Burstable** | có đặt request/limit nào đó, nhưng không Guaranteed | ở giữa (pod vượt request bị trước) |
| **BestEffort** | không đặt gì | bị evict đầu tiên |

Hướng dẫn hay gặp khi review: đặt **memory request = limit** cho service quan trọng; nhiều team đặt **CPU request mà không đặt CPU limit** để tránh throttle. Request quá cao thì lãng phí node; quá thấp thì bị evict. Áp giá trị mặc định bằng **LimitRange** và giới hạn tổng bằng **ResourceQuota**.

---

## 5. Horizontal Pod Autoscaler (HPA)

HPA thay đổi số `replicas`. Số liệu CPU/memory lấy từ **metrics-server**; metric tuỳ biến (RPS, độ dài hàng đợi) đi qua Prometheus Adapter hoặc **KEDA**.

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

- **Utilization là phần trăm so với request.** Không có CPU request thì HPA không tính được và không scale.
- HPA đánh giá khoảng mỗi **15 s**, bỏ qua chênh lệch trong ngưỡng ~10%, và chờ **stabilization window 300 s** trước khi scale down.
- Pod mới vẫn cần được xếp chỗ, pull image và pass readiness — hãy chừa dư (`minReplicas`) hoặc scale theo metric đi trước như độ sâu hàng đợi.
- Đừng ghim cứng `replicas` trong manifest GitOps; Git và HPA sẽ giành nhau.

---

## 6. VPA, Cluster Autoscaler và Karpenter

| Autoscaler | Scale cái gì | Kích hoạt bởi |
|---|---|---|
| **VPA** | requests/limits của pod | lịch sử sử dụng |
| **Cluster Autoscaler** | số node trong node group | pod **Pending**; node dùng ít |
| **Karpenter** | node, tự chọn instance type | pod Pending; consolidation (nền tảng của EKS Auto Mode) |

**VPA** là add-on. `updateMode: "Off"` chỉ đưa ra khuyến nghị — cách an toàn để **right-size** (chọn đúng kích thước); các mode khác áp request mới bằng cách evict pod. **Đừng để HPA và VPA cùng tác động lên CPU/memory của một workload**: VPA tăng request, utilization giảm, HPA scale in, và hai bên dao động mãi.

**Cluster Autoscaler không nhìn mức dùng CPU.** Nó thêm node khi có pod không xếp được chỗ vì thiếu tài nguyên *request*, và gỡ node khi các pod trên đó có thể dời đi nơi khác. Request sai thì scale node cũng sai.

```text
 traffic up -> HPA 4 -> 8 replicas
            -> scheduler: 3 pods Pending (Insufficient cpu)
            -> Cluster Autoscaler / Karpenter launches nodes (~1-2 min)
            -> image pull, startup + readiness pass -> pods join Service
```

Vì vậy khi node đã đầy, scale-out mất vài phút; hãy chừa dư hoặc dùng pod giữ chỗ độ ưu tiên thấp.

---

## 7. Rolling update, rollback và disruption budget

Thay đổi **pod template** sẽ tạo ReplicaSet mới và revision mới; chỉ đổi `replicas` thì không.

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

- Mặc định: `RollingUpdate`, `maxSurge: 25%`, `maxUnavailable: 25%`. `Recreate` dừng hết pod cũ trước.
- **Readiness là cửa chặn của rollout.** Không có readiness probe, một phiên bản hỏng được coi là available ngay khi vừa khởi động.
- Quá `progressDeadlineSeconds`, rollout bị đánh dấu failed, nhưng Kubernetes **không tự rollback**.

```bash
kubectl set image deployment/api api=registry.example.com/api:1.5.0
kubectl rollout status deployment/api --timeout=5m
kubectl rollout history deployment/api
kubectl rollout undo deployment/api --to-revision=3
```

Rollback chỉ khôi phục pod template — không khôi phục ConfigMap bị sửa tại chỗ, không khôi phục migration DB (canary, expand–contract là topic 14).

**PodDisruptionBudget** (`policy/v1`, ví dụ `minAvailable: 2` cho `app: api`) giới hạn các gián đoạn *tự nguyện* (voluntary disruption) — `kubectl drain`, nâng cấp node, autoscaler gỡ node — không phải node sập. Một PDB không cho phép gián đoạn nào (`minAvailable: 1` với một replica) sẽ chặn drain vô thời hạn.

---

## 8. StatefulSet và lưu trữ bền vững

**StatefulSet** cho mỗi pod một **tên cố định** (`db-0`, `db-1`), **DNS cố định** qua headless Service (`db-0.db.prod.svc.cluster.local`), **PVC riêng** từ `volumeClaimTemplates`, và tạo/scale/update **theo thứ tự**.

**PersistentVolumeClaim** (PVC) là yêu cầu lưu trữ ("20Gi, ReadWriteOnce, class gp3"); **StorageClass** chỉ cho CSI driver (ví dụ `ebs.csi.aws.com`) cách cấp phát một **PersistentVolume** (PV), gắn 1:1 với claim.

```text
 StatefulSet db (3 replicas) + headless Service db
   db-0 -- PVC data-db-0 -- PV (EBS, zone a)
   db-1 -- PVC data-db-1 -- PV (EBS, zone b)
   db-2 -- PVC data-db-2 -- PV (EBS, zone c)
 pod db-1 deleted -> new db-1 re-attaches data-db-1
 scale to 2       -> db-2 removed, data-db-2 kept by default
```

- **Access mode:** `ReadWriteOnce` (một node), `ReadOnlyMany`, `ReadWriteMany` (cần file system dùng chung như EFS/NFS), `ReadWriteOncePod`. EBS là RWO và **gắn với một zone**.
- **`WaitForFirstConsumer`** cấp phát disk ở đúng zone mà pod được xếp vào; `Immediate` có thể tạo disk ở sai zone.
- PV cấp phát động mặc định có reclaim policy **`Delete`** — xoá PVC là xoá luôn disk. Dùng `Retain` cho dữ liệu quý.
- StatefulSet chỉ cho danh tính, **không** cho replication, backup hay failover; những thứ đó đến từ chính database hoặc một **operator** (CloudNativePG, Strimzi). Nhiều team để dữ liệu ở RDS/ElastiCache và chỉ chạy tầng stateless trong cluster.

---

## 9. DaemonSet, Job và CronJob

| Object | Chạy | Dùng cho |
|---|---|---|
| **DaemonSet** | một pod trên mỗi node (phù hợp) | log shipper, node-exporter, CNI, kube-proxy |
| **Job** | pod cho tới khi N lần hoàn thành thành công | migration, reindex, batch |
| **CronJob** | một Job theo lịch cron | báo cáo hằng đêm, dọn dẹp |

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

DaemonSet cần toleration để chạy trên node có taint (ví dụ control plane). CronJob chỉ đảm bảo **xấp xỉ một lần**: một lần chạy có thể bị nhân đôi hoặc bỏ lỡ, nên việc batch phải **idempotent** (chạy lại không đổi kết quả); dùng `Forbid` khi các lần chạy không được chồng lên nhau.

---

## 10. RBAC: ai được làm gì

| Object | Phạm vi | Mục đích |
|---|---|---|
| **Role** | namespace | các verb được phép trên resource |
| **ClusterRole** | cluster | tương tự, cho resource cấp cluster hoặc dùng lại ở nhiều namespace |
| **RoleBinding** | namespace | gán một Role *hoặc ClusterRole* trong một namespace |
| **ClusterRoleBinding** | cluster | gán một ClusterRole cho mọi namespace |

Subject gồm **User** và **Group** (đến từ bộ xác thực; Kubernetes không lưu object user) và **ServiceAccount** (danh tính của pod).

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

- RBAC là **cộng dồn, chỉ có allow** — không có rule deny.
- Kiểm tra: `kubectl auth can-i list secrets -n payments --as=system:serviceaccount:payments:payments-api`.
- Các quyền gần như admin: đọc **secrets**, **tạo pod** (pod có thể mount mọi secret/SA trong namespace), **`pods/exec`**, các verb `escalate`/`bind`/`impersonate`, wildcard `*`.
- Mỗi workload một ServiceAccount; `automountServiceAccountToken: false` nếu pod không bao giờ gọi API.
- **EKS:** người dùng qua access entries (hoặc `aws-auth` kiểu cũ); pod lấy quyền AWS qua **IRSA** hoặc **EKS Pod Identity**.

---

## 11. NetworkPolicy: pod nào được nói chuyện với pod nào

Mặc định **mọi pod đều gọi được mọi pod**. NetworkPolicy là một allow-list L3/L4 theo namespace, được thực thi bởi **CNI** (Calico, Cilium, AWS VPC CNI khi bật network policy). Trên CNI không hỗ trợ, policy vẫn được API chấp nhận nhưng âm thầm không có tác dụng.

Khi có bất kỳ policy nào chọn một pod cho một chiều, chiều đó của pod bị **cô lập**; chỉ traffic được một policy nào đó cho phép mới đi qua.

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

- **AND hay OR:** các selector trong *cùng* một phần tử `from` được AND (pod ingress-nginx *nằm trong* namespace đó). Thêm `-` trước `podSelector` là thành hai phần tử, OR với nhau — rule rộng hơn rất nhiều.
- **Default-deny egress làm hỏng DNS**: phải cho phép UDP và TCP 53 tới CoreDNS trước.
- Không có HTTP path hay mTLS — dùng Cilium L7 policy hoặc service mesh. Trên AWS nó bổ sung cho security group.

---

## 12. Helm: đóng gói ứng dụng Kubernetes

Một **chart** gồm `Chart.yaml` (chart `version`, `appVersion`, dependencies), `values.yaml` mặc định và thư mục `templates/` viết bằng Go template, ví dụ `image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"`. Cài chart tạo ra một **release** có lịch sử revision. Values được gộp từ `values.yaml`, rồi các file `-f`, rồi `--set` (cái sau thắng). Chart có thể lưu trong OCI registry (ECR, GHCR).

```bash
helm lint ./my-api
helm template api ./my-api -f values-prod.yaml    # render and review
helm upgrade --install api ./my-api -n payments -f values-prod.yaml \
  --set image.tag=1.5.0 --wait --timeout 5m
helm rollback api 4 -n payments
```

- Helm 3 **không còn Tiller** trong cluster; nó dùng kubeconfig/RBAC của bạn và lưu lịch sử release dưới dạng Secret trong namespace.
- `helm rollback` hoàn tác mọi resource trong release; `kubectl rollout undo` chỉ hoàn tác pod template của một Deployment.
- **Kustomize** (`kubectl apply -k`) vá YAML thuần bằng overlay, không có ngôn ngữ template; cả hai đều dùng được với GitOps (topic 14).
- Không để secret trong values trên Git (External Secrets Operator, Sealed Secrets).

---

## Điểm cần nhớ khi phỏng vấn

- **Liveness thì restart, readiness thì gỡ khỏi endpoints, startup bảo vệ app khởi động chậm.** Không bao giờ kiểm tra dependency trong liveness.
- **Requests quyết định scheduling, HPA và Cluster Autoscaler; limits quyết định CPU throttle và OOMKilled.** Thứ tự evict: BestEffort → Burstable → Guaranteed.
- **HPA** = thêm pod (cần requests); **VPA** = pod to hơn, không dùng chung metric với HPA; **Cluster Autoscaler/Karpenter** = thêm node, kích hoạt bởi pod Pending.
- **Rollout** bị chặn bởi readiness và không bao giờ tự rollback; **PDB** chỉ bảo vệ gián đoạn tự nguyện.
- **StatefulSet** = tên, DNS, PVC riêng cố định — không phải replication hay backup.
- **RBAC** cộng dồn; đọc secrets, tạo pod và `pods/exec` gần như admin. **NetworkPolicy** cần CNI thực thi; default deny kèm cho phép egress DNS.
- **Helm** = chart + values → release có version; `helm rollback` hoàn tác cả release.

## Tóm tắt

- Kubernetes trên production là cung cấp tín hiệu trung thực cho controller: probe thật, requests chính xác, metric có ý nghĩa.
- Probe quyết định restart và traffic; tài nguyên quyết định xếp chỗ, throttle, OOM kill và evict.
- Các autoscaler tác động lên số pod, kích thước pod và số node, và chỉ phối hợp tốt khi requests đúng.
- StatefulSet cho danh tính và disk; RBAC và NetworkPolicy cho least privilege; Helm đóng gói tất cả.
