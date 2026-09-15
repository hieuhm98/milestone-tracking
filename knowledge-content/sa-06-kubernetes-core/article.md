# Kubernetes cốt lõi – Pod, Deployment, Service

## 1. Vì sao cần điều phối container

Docker trả lời câu hỏi "chạy một container thế nào". Production đòi hỏi nhiều hơn: chạy 40 bản sao trên 12 máy, khởi động lại cái bị crash, dời chúng khỏi server chết, rollout phiên bản mới không downtime, cấp địa chỉ ổn định và bơm cấu hình vào. Mấy script bọc quanh `docker run` sẽ gãy khi vượt quá vài máy.

Một **bộ điều phối** (orchestrator) biến cả dàn máy thành một bể tài nguyên tính toán duy nhất và giữ cho container luôn chạy đúng theo bản mô tả bạn cung cấp.

| Vấn đề | Không có orchestrator | Có Kubernetes |
|---|---|---|
| Đặt container ở đâu | Bạn tự chọn máy | Scheduler chọn node còn tài nguyên |
| Crash / node chết | Con người khởi động lại hoặc dời đi | Controller tạo lại Pod ở nơi khác |
| Tìm địa chỉ dịch vụ | Hard-code IP | Service có IP và tên DNS ổn định |
| Scale | Tự tay chạy thêm container | Sửa `replicas: 3` thành `replicas: 10` |

**Kubernetes** (K8s) ra đời từ kinh nghiệm với Borg của Google, được mã nguồn mở năm 2014 và do CNCF quản lý. Trên AWS, **ECS** là orchestrator "thuần AWS" còn **EKS** là Kubernetes được quản lý. Kubernetes có chi phí thật về khái niệm và vận hành: với ba container trên một VM, Docker Compose hoặc một PaaS thường là câu trả lời kiến trúc tốt hơn.

---

## 2. Kiến trúc cluster: control plane và worker node

Một cluster gồm **control plane** (lưu trạng thái mong muốn, ra quyết định) và các **worker node** (chạy Pod).

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

| Thành phần | Nhiệm vụ |
|---|---|
| `kube-apiserver` | Cửa ngõ duy nhất: xác thực, kiểm tra hợp lệ, ghi xuống etcd. Cổng mặc định **6443** |
| `etcd` | Kho key-value nhất quán dựa trên Raft, chứa mọi object — phải backup |
| `kube-scheduler` | Gán Pod chưa có node vào một node (tài nguyên, affinity, taint) |
| `kube-controller-manager` | Chạy các controller: Deployment, ReplicaSet, Node, EndpointSlice, Job… |
| `kubelet` (mỗi node) | Đảm bảo các Pod được gán cho node của nó đang chạy; báo cáo trạng thái |
| `kube-proxy` (mỗi node) | Cài luật iptables/IPVS/nftables để IP của Service tới được Pod |
| Container runtime | Chạy container qua CRI — thường là **containerd** hoặc CRI-O |

Các thành phần **phối hợp qua API server** chứ không gọi thẳng nhau: scheduler ghi tên node lên Pod, và kubelet của node đó phát hiện ra nhờ cơ chế watch. Ngoài ra, **dockershim đã bị gỡ từ v1.24** (2022), nên node không còn dùng Docker Engine làm runtime — nhưng image build bằng Docker là image OCI chuẩn nên vẫn chạy bình thường.

---

## 3. Mô hình khai báo và vòng lặp reconcile

Bạn không ra lệnh "chạy ba container". Bạn khai báo "trạng thái mong muốn: ba bản sao của template này", và các **controller** liên tục so sánh `spec` (mong muốn) với `status` (thực tế) rồi sửa phần chênh lệch — đó là **vòng lặp đối soát** (reconciliation loop).

```text
 spec: replicas 3          status: 2 running (a node died)
            \                   /
             +--> controller: diff +1 --> create Pod via API server
                     ^                             |
                     +------- watch events <-------+   (forever)
```

Mọi object đều có cùng một hình dạng:

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

`kubectl create -f` là kiểu mệnh lệnh (imperative, lỗi nếu object đã tồn tại); **`kubectl apply -f`** là kiểu khai báo (declarative) và idempotent — cách làm của production, với YAML được review trong Git (GitOps, chủ đề 14). Ai đó chạy tay `kubectl scale` sẽ bị lần apply tiếp theo từ Git lặng lẽ đè lại — và đó chính là mục đích.

---

## 4. Pod: đơn vị triển khai nhỏ nhất

**Pod** là một hoặc nhiều container được lên lịch cùng nhau trên một node, dùng chung **một network namespace** (một IP, gọi nhau qua `localhost`) và các **volume** của Pod.

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

Pod nhiều container dành cho **các tiến trình phụ gắn chặt** với app: gửi log, proxy sidecar, và `initContainers` chạy trước khi app khởi động. App và database của nó **không** nằm chung một Pod — chúng scale và hỏng độc lập với nhau.

Tính chất quan trọng nhất: **Pod là thứ tạm thời** (ephemeral). Pod không bao giờ được "sửa" hay "dời"; nó bị thay bằng một Pod mới với **IP mới**. Đừng hard-code IP của Pod, và đừng tạo Pod trần — hãy để controller quản lý. Probe và resource request thuộc chủ đề 7.

---

## 5. Label, selector và ReplicaSet

**Label** là các cặp key-value gắn lên object (`app: web`, `tier: frontend`); **selector** dùng để truy vấn chúng. Sự liên kết lỏng này là cách các object tìm thấy nhau: ReplicaSet không giữ danh sách tên Pod, nó sở hữu "mọi Pod khớp `app=web`".

**ReplicaSet** giữ N Pod giống hệt nhau luôn chạy, tạo từ một template:

```text
ReplicaSet web-7d9f   replicas: 3   selector: app=web
   counts Pods labelled app=web
     found 2 -> create 1 from template
     found 4 -> delete 1
```

Hệ quả: xoá một Pod thì Pod thay thế xuất hiện ngay; gỡ label khỏi một Pod (`kubectl label pod web-abc app-`) thì nó thành "mồ côi" — Pod mới được tạo, còn Pod cũ vẫn sống để bạn debug. Sửa template của ReplicaSet **không** đụng tới các Pod đang chạy, nên ReplicaSet không tự rollout phiên bản mới được. Đó là việc của Deployment.

---

## 6. Deployment: ReplicaSet có phiên bản

**Deployment** quản lý các ReplicaSet cho ứng dụng stateless. Khi bạn đổi Pod template (ví dụ tag image), nó tạo **một ReplicaSet mới** và dần dần chuyển Pod sang.

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

Chuỗi sở hữu **Deployment → ReplicaSet → Pod** giải thích vì sao tên Pod trông như `web-7d9f5c6b8-x2kqp`. ReplicaSet cũ được giữ ở 0 replica (mặc định 10 bản gần nhất, `revisionHistoryLimit`) nên rollback chỉ là scale một bản cũ lên lại. Chỉ thay đổi trong `spec.template` mới kích hoạt rollout; `spec.selector` thì **không sửa được** sau khi tạo. Tinh chỉnh chiến lược rollout và `kubectl rollout undo` nằm ở chủ đề 7.

---

## 7. Service: địa chỉ ổn định cho những Pod hay đổi chỗ

**Service** cấp cho nhóm Pod khớp selector một **IP ảo ổn định** và **tên DNS**, rồi phân phối kết nối tới các Pod đang **ready**.

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

- **EndpointSlice** chứa IP của các Pod vừa khớp selector **vừa ready**.
- Tên DNS: `<service>.<namespace>.svc.cluster.local`; trong cùng namespace chỉ cần `web`, từ namespace khác dùng `web.shop`.
- kube-proxy cân bằng tải ở **L4, theo từng kết nối**. Kết nối sống lâu như HTTP/2 hay gRPC sẽ dính vào một Pod — nguyên nhân kinh điển của tải lệch.

---

## 8. Các loại Service: ClusterIP, NodePort, LoadBalancer

Các loại xếp chồng lên nhau: Service NodePort cũng có ClusterIP; Service LoadBalancer (cách hiện thực cổ điển) cũng có NodePort.

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

| Loại | Truy cập được từ | Dùng khi | Cần lưu ý |
|---|---|---|---|
| `ClusterIP` | Bên trong cluster | API nội bộ, cache, DB | Cần Ingress/LB để ra public |
| `NodePort` | IP của mọi node, cổng 30000–32767 | Môi trường dev, đứng sau LB tự quản | Cổng lạ, mở trên mọi node |
| `LoadBalancer` | Địa chỉ của cloud LB | Public một service, TCP/UDP | **Mỗi Service một cloud LB** — tốn tiền |
| `ExternalName` | CNAME DNS | Đặt bí danh cho host bên ngoài | Không proxy |

**Headless Service** (`clusterIP: None`) trả thẳng IP của Pod qua DNS — dùng cho StatefulSet (chủ đề 7). Hai mươi microservice đều để `LoadBalancer` nghĩa là hai mươi load balancer trên hoá đơn; đó là lý do Ingress tồn tại.

---

## 9. Ingress và ingress controller

**Ingress** chứa các **luật định tuyến L7 HTTP(S)** — host và path tới Service — để nhiều Service dùng chung **một** điểm vào và một chứng chỉ TLS.

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

**Bản thân object Ingress không làm gì cả.** Phải có **ingress controller** — các Pod chạy proxy, hoặc một operator điều khiển cloud LB — theo dõi Ingress và hiện thực nó. Không cài controller thì Ingress không bao giờ có địa chỉ.

```text
client -> DNS -> [ one LB ] -> ingress controller -> /api -> Service api
                                                  -> /    -> Service web
```

Các controller phổ biến: **ingress-nginx** (Pod NGINX đứng sau một Service `LoadBalancer`; dự án đã thông báo ngừng phát triển vào cuối 2025), **AWS Load Balancer Controller** (tạo ALB), Traefik, HAProxy và Kong. Mọi thứ ngoài host/path (rewrite, auth, rate limit) đều là **annotation** riêng của từng controller — không mang đi nơi khác được. **Gateway API** (`Gateway`, `HTTPRoute`; GA năm 2023) là mô hình kế nhiệm, tách vai trò rõ ràng và định tuyến phong phú, portable hơn.

---

## 10. ConfigMap và Secret

Theo 12-factor, cấu hình nằm ngoài image.

- **ConfigMap** — dữ liệu không nhạy cảm dạng key hoặc cả file (feature flag, `nginx.conf`); tối đa **1 MiB**.
- **Secret** — mật khẩu, token, khoá; các type gồm `Opaque`, `kubernetes.io/tls`, `kubernetes.io/dockerconfigjson`.

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

| Dùng dưới dạng | Có nhận thay đổi không? |
|---|---|
| Biến môi trường | **Không** — chỉ đọc lúc khởi động; phải restart Pod |
| Volume mount | Có, sau khi kubelet đồng bộ (trừ khi dùng `subPath`) |

**Secret chỉ được mã hoá base64, không phải được mã hoá bảo mật.** Ai đọc được Secret trong namespace, hoặc đọc được etcd, đều thấy nội dung. Mức tối thiểu: bật **mã hoá khi lưu trữ** (encryption at rest) cho etcd, giới hạn quyền đọc Secret bằng RBAC (chủ đề 7), không commit YAML Secret vào Git, và tốt nhất là dùng kho bên ngoài (AWS Secrets Manager, Vault) đồng bộ qua External Secrets Operator hoặc Secrets Store CSI Driver.

---

## 11. Namespace

**Namespace** là một phân vùng ảo trong cluster: tên object là duy nhất trong namespace, và đây là đơn vị để gắn **RBAC**, **ResourceQuota**, **LimitRange** và **NetworkPolicy**.

Namespace có sẵn: `default` (object không chỉ định namespace), `kube-system` (CoreDNS, kube-proxy, CNI), `kube-public` và `kube-node-lease` (heartbeat của node).

- Namespace **mặc định không cô lập mạng**: Pod ở các namespace khác nhau gọi nhau thoải mái cho tới khi có NetworkPolicy chặn, và vẫn chung node. Tenant không tin cậy nhau thì cần cluster riêng.
- Một số object là **cluster-scoped**: Node, PersistentVolume, chính Namespace, ClusterRole.
- Để prod và non-prod thành hai namespace trong một cluster thì rẻ nhưng rủi ro — một lần nâng cấp hỏng hay "hàng xóm ồn ào" sẽ ảnh hưởng production. Phần lớn tổ chức tách cluster prod riêng.

---

## 12. Những lệnh kubectl cần biết

`kubectl` là client gọi API server, được cấu hình bằng **kubeconfig** (`~/.kube/config`): gồm cluster, user và **context**.

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

Quy trình xử lý khi "app sập": `get pods` → `describe pod` (xem events) → `logs --previous` → kiểm tra Service có endpoint không.

| Triệu chứng | Nguyên nhân hay gặp nhất |
|---|---|
| `Pending` | Không node nào đủ CPU/memory đã request, hoặc luật affinity/volume không thoả |
| `ImagePullBackOff` | Sai tag, hoặc registry private mà thiếu pull Secret |
| `CrashLoopBackOff` | Tiến trình liên tục thoát: sai config, thiếu biến môi trường, dependency chết |
| Service không có endpoint | Selector không khớp label của Pod, hoặc Pod chưa ready |

---

## 13. Ánh xạ sang Amazon EKS

**Amazon EKS** vận hành control plane giúp bạn — API server và etcd trải trên nhiều AZ, AWS lo vá lỗi — với phí theo giờ cho mỗi cluster ($0.10/giờ ở mức standard support). Bạn vẫn sở hữu năng lực worker và workload.

| Kubernetes | Trên EKS |
|---|---|
| Worker node | Managed node group (EC2 + ASG), Karpenter, Fargate (mỗi Pod một micro-VM), EKS Auto Mode |
| Mạng của Pod | **Amazon VPC CNI** — mỗi Pod nhận một IP thật trong VPC (nhớ tính kích thước subnet) |
| Service `LoadBalancer` | **NLB** qua AWS Load Balancer Controller |
| Ingress | **ALB** qua AWS Load Balancer Controller |
| Pod gọi AWS API | **IRSA** hoặc **EKS Pod Identity**, không bao giờ dùng key chung cho cả node |
| Secret | Envelope encryption bằng KMS; lấy từ Secrets Manager qua External Secrets / CSI driver |
| Registry / quyền truy cập của người | ECR; IAM principal qua **access entries** (cách cũ: ConfigMap `aws-auth`) |

**EKS hay ECS**: ECS cho đội chỉ dùng AWS và muốn vận hành ít; EKS khi cần tính di động giữa nhiều cloud hoặc on-prem, cần hệ sinh thái CNCF (Helm, Argo CD, operator), hoặc tổ chức đã có sẵn kỹ năng Kubernetes.

---

## Điểm cần nhớ khi phỏng vấn

- Kubernetes là hệ **khai báo**: trạng thái mong muốn đi qua API server vào etcd; controller **reconcile** về phía nó mãi mãi.
- Control plane: **apiserver, etcd, scheduler, controller-manager**. Node: **kubelet, kube-proxy, runtime**. Mọi giao tiếp đi qua API server.
- **Pod là tạm thời**, IP thay đổi; **Deployment → ReplicaSet → Pod**, và đổi template sẽ tạo ReplicaSet mới.
- **Label/selector** nối các object với nhau; Service không có endpoint thường là do selector không khớp hoặc Pod chưa ready.
- **ClusterIP** nội bộ, **NodePort** 30000–32767 trên mọi node, **LoadBalancer** mỗi Service một cloud LB; cân bằng tải ở L4 theo kết nối.
- **Ingress** cần **ingress controller**; Gateway API là mô hình kế nhiệm.
- **Secret chỉ là base64**, mặc định không được mã hoá; biến môi trường không tự cập nhật nếu không restart.
- **Namespace** phân vùng tên, RBAC và quota — không cô lập mạng.
- **EKS**: control plane được quản lý, Pod nhận IP VPC qua VPC CNI, ALB cho Ingress, NLB cho LoadBalancer, IRSA/Pod Identity.

## Tóm tắt

- Orchestration biến nhiều máy thành một bể tài nguyên; control plane ra quyết định, node chạy Pod, tất cả qua API server.
- Pod dùng xong bỏ, ReplicaSet giữ số lượng, Deployment thêm rollout có phiên bản.
- Service cấp IP và DNS ổn định; NodePort/LoadBalancer đưa ra ngoài; Ingress chia sẻ một điểm vào HTTP.
- ConfigMap, Secret và namespace lo cấu hình và phân vùng; EKS là Kubernetes được quản lý trên AWS.
