# Continuous Delivery & các chiến lược triển khai

## 1. Continuous delivery và continuous deployment

CI (bài 13) kết thúc bằng một artifact đã test và có version nằm trong registry. **CD** là mọi thứ sau đó: đưa artifact đó vào các môi trường một cách an toàn và tới tay người dùng. Nhưng chữ viết tắt này che mất hai cách làm khác nhau:

| | Continuous delivery (chuyển giao liên tục) | Continuous deployment (triển khai liên tục) |
|---|---|---|
| Cam kết | Mọi thay đổi pass pipeline **có thể** lên production bất cứ lúc nào | Mọi thay đổi pass pipeline **sẽ** lên production |
| Bước lên production | Con người quyết định (bấm nút, approve) | Hoàn toàn tự động |
| Cần có | Test tự động, deploy lặp lại được | Tất cả những thứ đó + monitoring tốt, rollback tự động, feature flag |
| Phù hợp | Ngành bị quản lý chặt, app mobile/on-prem | Sản phẩm SaaS trên web |

Với continuous delivery, việc phát hành là **quyết định kinh doanh, không phải sự kiện kỹ thuật**. Nếu mỗi lần release cần hai tuần "ổn định hoá" thì bạn chưa có continuous delivery.

Phân biệt thứ hai: **deploy ≠ release**. *Deploy* là đưa code lên server; *release* là để người dùng thấy hành vi mới. Tách hai việc này ra (dark launch, feature flag) chính là điều khiến deploy thường xuyên trở nên ít rủi ro.

---

## 2. Môi trường và promote artifact

Quy tắc vàng: **build một lần, promote (thăng cấp) cùng một artifact**. Production chạy đúng image digest đã được test, không bao giờ build lại.

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

Thứ thay đổi giữa các môi trường là **cấu hình** (URL, credential, số replica), được inject lúc deploy từ biến môi trường, ConfigMap hoặc secrets manager.

Các **cổng kiểm soát** (promotion gate): **tự động** (smoke test, kiểm tra tỉ lệ lỗi, kết quả scan) và **thủ công** (ví dụ GitHub Actions `environment: production` với required reviewers). Nếu thường xuyên phải "đóng băng deploy" (deploy freeze) thì đó là dấu hiệu deploy đang quá rủi ro.

Staging không bao giờ giống hệt production (khối lượng dữ liệu, hình dạng traffic, dịch vụ bên thứ ba). Chính khoảng cách đó là lý do các chiến lược bên dưới — test *ngay trên* production một cách an toàn — ra đời.

---

## 3. Recreate và rolling update

**Recreate**: dừng toàn bộ instance cũ rồi mới khởi động instance mới. Bản cũ và mới không bao giờ chạy cùng lúc, nhưng **chắc chắn có downtime**. Chấp nhận được cho môi trường dev, batch worker, hoặc khi hai version thật sự không thể chạy song song.

**Rolling update** (cập nhật cuốn chiếu): thay dần từng nhóm nhỏ instance phía sau load balancer — đây là mặc định của Kubernetes Deployment.

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

Đánh đổi:

- **Không cần thêm capacity** (chỉ phần `maxSurge`) và không downtime — *với điều kiện* readiness probe phản ánh đúng sự thật.
- **Hai version cùng phục vụ traffic**, nên v2 phải tương thích với v1 (API, định dạng message, schema DB).
- **Rollback cũng là một lần rolling update**, chậm y như lúc rollout.
- Không kiểm soát được mức phơi nhiễm: bất kỳ user nào cũng có thể gặp v2 trước khi bạn phát hiện lỗi.

Trên AWS: ECS dùng `minimumHealthyPercent`/`maximumPercent`; Auto Scaling group dùng instance refresh.

---

## 4. Blue-green deployment

Chạy hai môi trường production đầy đủ. **Blue** đang live; deploy v2 lên **green**, test nội bộ, rồi **chuyển router** sang green. Blue vẫn chạy sẵn để rollback tức thì.

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

| Khía cạnh | Blue-green |
|---|---|
| Downtime | Gần như bằng 0 — một lần chuyển nguyên tử |
| Rollback | Nhanh nhất: chuyển ngược lại khi blue vẫn còn chạy |
| Chi phí | Khoảng **gấp đôi capacity** trong lúc release |
| Trộn version | Không có ở tầng app |
| Phơi nhiễm | 100% user cùng lúc sau khi chuyển |

Hãy chuyển ở **load balancer** (đổi ALB listener sang target group khác, đổi `selector` của Kubernetes Service từ `version: blue` sang `version: green`) — có hiệu lực ngay. Chuyển bằng **DNS** thì chậm và không tin cậy vì resolver và client cache bản ghi, có nơi còn phớt lờ TTL.

Phần khó thật sự: **database thường dùng chung**, nên schema phải hợp với cả hai version (mục 8); request đang xử lý và WebSocket phải được drain (xả hết); session phải nằm ngoài instance. Trên AWS, CodeDeploy hỗ trợ blue/green cho EC2, ECS và Lambda.

---

## 5. Canary release và progressive delivery

**Canary** đưa một phần nhỏ traffic thật sang v2, so sánh metric, rồi tăng dần tỉ lệ theo từng bước — hoặc huỷ. Nó giới hạn **bán kính ảnh hưởng** (blast radius): một bản lỗi chỉ làm hại 5% user trong mười phút, chứ không phải tất cả.

```text
 v2 weight:  5% ──► 25% ──► 50% ──► 100%
             │       │       │
          analyse analyse analyse   (error rate, p99, KPIs vs baseline)
             └── any check fails ──► weight back to 0%, alert
```

**Progressive delivery** (phát hành luỹ tiến) là phiên bản tự động: một controller dịch trọng số và chạy phân tích metric. Ví dụ với Argo Rollouts:

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

Ghi chú của kiến trúc sư:

- **Độ chính xác khi chia traffic** — không có service mesh hay ingress thông minh thì trọng số chỉ xấp xỉ theo số pod (1 trên 10 pod ≈ 10%). Istio, Linkerd, ingress controller hoặc Gateway API cho tỉ lệ chính xác. Flagger làm việc này cho Flux; Lambda alias hỗ trợ kiểu dịch như `Canary10Percent5Minutes`; ALB hỗ trợ weighted target group.
- **Traffic thấp làm canary vô dụng** — 5% của 20 request/phút là một request; không có tín hiệu thống kê.
- **Tính dính** (stickiness) — định tuyến theo user nếu việc nhảy qua lại giữa hai version gây rối cho người dùng.
- So sánh với một **baseline chạy v1 cùng lúc**, không so với số liệu hôm qua.

---

## 6. Shadow traffic và A/B testing

**Shadow deployment** (nhân bản traffic – traffic mirroring): request được **sao chép** sang v2 và response của v2 bị **bỏ đi**; người dùng chỉ thấy câu trả lời của v1.

```text
            ┌──────────► v1 (live) ───► response to user
 request ─► proxy/mesh
            └── copy ──► v2 (shadow) ─► response dropped, metrics recorded
```

Nó cho phép test một bản viết lại hay một datastore mới dưới tải thật mà **không ảnh hưởng người dùng** (Istio `mirror`, nginx `mirror`). Cái bẫy là **tác dụng phụ** (side effect): một `POST /payments` bị mirror sẽ trừ tiền hai lần, request bị mirror vẫn gửi email. Chỉ mirror luồng đọc, hoặc stub các downstream của v2. Nó cũng nhân đôi tải lên các dependency dùng chung.

| | Canary | A/B test | Shadow |
|---|---|---|---|
| Câu hỏi | v2 có *an toàn* không? | B có *tốt hơn* cho kinh doanh không? | v2 có chạy đúng dưới tải thật không? |
| User thấy v2 | Có, tỉ lệ nhỏ tăng dần | Có, chia cố định và dính theo user | Không |
| Thời gian | Vài phút – vài giờ | Vài ngày – vài tuần (đạt ý nghĩa thống kê) | Tuỳ nhu cầu |
| Cơ chế | Router / mesh | Nền tảng experiment / feature flag | Proxy mirroring |

---

## 7. Feature flag: tách deploy khỏi release

**Feature flag** (cờ tính năng) là một điều kiện lúc runtime, đánh giá theo request, user hoặc tenant, để bật/tắt một nhánh code. Code được ship ở trạng thái tắt rồi bật dần mà không cần deploy.

```js
const enabled = await flags.getBooleanValue('new-checkout', false, {
  targetingKey: user.id,
});

if (enabled) {
  return renderNewCheckout(cart);
}

return renderLegacyCheckout(cart);
```

| Loại | Mục đích | Vòng đời |
|---|---|---|
| Release toggle | Giấu tính năng dở dang trên trunk | Vài ngày – vài tuần, rồi **xoá** |
| Experiment toggle | A/B test | Vài tuần |
| Ops toggle / kill switch | Tắt tính năng tốn tài nguyên hoặc đang lỗi | Dài hạn |
| Permission toggle | Tính năng premium, beta, nội bộ | Dài hạn |

Lợi ích: rollback một *tính năng* trong vài giây, release theo từng tenant, test trên production với user nội bộ, merge code chưa xong một cách an toàn.

Cái giá: **nợ flag** (flag debt — flag cũ là dead code nguy hiểm; vụ thiệt hại của Knight Capital năm 2012 liên quan tới code cũ bị một flag kích hoạt lại), nên mỗi release flag cần có người sở hữu và hạn xoá; test cả trạng thái bật và tắt của các flag đang hoạt động; đánh giá flag cục bộ với giá trị mặc định an toàn để sự cố của dịch vụ flag không thành sự cố của bạn. Công cụ: LaunchDarkly, Unleash, Flagsmith, AWS AppConfig; **OpenFeature** (CNCF) là API trung lập nhà cung cấp, được dùng trong ví dụ trên.

---

## 8. Migration database không downtime: expand–contract

Code rollback được trong vài giây; **dữ liệu thì không**. Trong rolling, blue-green hay canary, hai version app dùng **chung một database**, nên mọi thay đổi schema phải chạy được với cả hai. Dùng **expand–contract** (mở rộng – thu hẹp, còn gọi là parallel change). Ví dụ đổi tên `users.fullname` thành `display_name`:

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

Các quy tắc hay gặp khi review:

- Migration mang tính **bổ sung** deploy **trước** code cần nó; migration **phá huỷ** (drop, rename, thêm `NOT NULL`) chạy **sau** khi code cũ đã biến mất.
- Mỗi bước đều **an toàn để rollback**: tại bất kỳ thời điểm nào app cũng lùi được một version.
- Cẩn thận với lock: việc rewrite cả bảng sẽ chặn ghi. Dùng online DDL (`CREATE INDEX CONCURRENTLY`, gh-ost hoặc pt-online-schema-change cho MySQL) và đặt `lock_timeout`.
- Chạy migration (Flyway, Liquibase, công cụ của framework) đúng một lần như một bước pipeline hoặc Kubernetes Job, không chạy từ mọi replica lúc khởi động.

---

## 9. Chiến lược rollback

"Có gì thì rollback" chưa phải kế hoạch cho tới khi bạn biết **cái gì** rollback được và **nhanh cỡ nào**.

| Phương án | Tốc độ | Dùng được khi |
|---|---|---|
| Tắt feature flag | Vài giây | Thay đổi nằm sau flag |
| Chuyển ngược blue-green | Vài giây | Môi trường cũ còn chạy, schema tương thích |
| Huỷ canary | Vài giây – vài phút | Chỉ phần canary bị ảnh hưởng |
| Deploy lại artifact trước (`rollout undo`, `git revert`) | Vài phút | Image cũ còn giữ, schema tương thích |
| **Roll forward** (sửa rồi deploy tiếp) | Bằng thời gian chạy pipeline | Pipeline nhanh; rollback rủi ro hơn |

Deploy lại code **không thể hoàn tác**: thay đổi schema mang tính phá huỷ, dữ liệu đã ghi theo định dạng mới, thanh toán và email đã gửi, message đã được service khác tiêu thụ.

Một chiến lược chắc chắn: định nghĩa **ngưỡng kích hoạt rollback từ trước** (ví dụ tỉ lệ lỗi gấp 2 baseline trong 5 phút) và tự động hoá nó; giữ **N−1 luôn deploy được** (Kubernetes mặc định giữ `revisionHistoryLimit: 10` ReplicaSet cũ); **diễn tập** rollback; **khôi phục dịch vụ trước**, tìm nguyên nhân gốc sau. "Chỉ roll forward" với pipeline 45 phút nghĩa là sự cố kéo dài 45 phút.

---

## 10. GitOps: Git là nguồn sự thật

**GitOps**: trạng thái mong muốn của mỗi môi trường được **khai báo trong Git**, và một agent chạy trong cluster liên tục làm cho thực tế khớp với nó. Các nguyên tắc OpenGitOps: **khai báo** (declarative), **có version và bất biến** (versioned and immutable), **được kéo về tự động** (pulled automatically), **liên tục đối soát** (continuously reconciled).

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

Vì sao kiến trúc sư thích nó:

- **Bảo mật** — CI không cần credential của cluster; API của cluster không cần mở cho CI truy cập.
- **Audit và rollback** — mọi thay đổi là một commit đã được review; rollback là `git revert`.
- **Sửa drift** (lệch cấu hình) — một lệnh `kubectl edit` thủ công bị phát hiện và bị hoàn tác.
- **DR** — một cluster mới tự hội tụ về trạng thái trong repo.

Bố cục thường gặp: **app repo** (CI build image) và **config repo** (manifest, Helm values, Kustomize overlay cho từng môi trường). Bước cuối của CI commit hoặc mở PR để tăng image tag; promote lên production chính là một lần merge.

Lưu ý: không để secret dạng plaintext trong Git (Sealed Secrets, SOPS, External Secrets Operator); các bước mệnh lệnh như migration cần sync hook hoặc Job; nhiều app × nhiều cluster cần cấu trúc rõ ràng để còn đọc được.

---

## 11. Argo CD và Flux

Cả hai đều là dự án **graduated** của CNCF cho GitOps kiểu pull trên Kubernetes. Một `Application` của Argo CD:

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

Flux chia ý tưởng đó thành các controller: một source `GitRepository` cộng với một `Kustomization` hoặc `HelmRelease` được đối soát theo `interval`.

| | Argo CD | Flux |
|---|---|---|
| Trải nghiệm | Web UI phong phú, xem diff, SSO/RBAC | Ưu tiên CLI và CRD |
| Mô hình | `Application`/`ApplicationSet`, thường một hub quản lý nhiều cluster | Bộ controller ghép được, thường mỗi cluster một bộ |
| Đồng bộ | Poll Git (mặc định 3 phút) hoặc webhook | Mỗi object theo `interval` riêng, có webhook receiver |
| Progressive delivery | Argo Rollouts | Flagger |

Kinh nghiệm: cần một control plane trực quan cho nhiều team và nhiều cluster → Argo CD; cần bộ công cụ nhẹ, khai báo hoàn toàn, theo từng cluster → Flux. Cả hai đều là lựa chọn tốt trên EKS.

---

## 12. DORA metrics: đo hiệu quả chuyển giao

Nghiên cứu DORA (DevOps Research and Assessment, nay thuộc Google Cloud) chỉ ra rằng một vài chỉ số dự đoán được hiệu quả chuyển giao phần mềm, và **tốc độ với độ ổn định cùng tăng**, chứ không đánh đổi nhau.

| Chỉ số | Loại | Câu hỏi |
|---|---|---|
| **Deployment frequency** (tần suất deploy) | Thông lượng | Bao lâu ta deploy lên production một lần? |
| **Lead time for changes** (thời gian đưa thay đổi lên) | Thông lượng | Từ commit tới chạy trên production mất bao lâu? |
| **Change failure rate** (tỉ lệ thay đổi gây lỗi) | Ổn định | Bao nhiêu % lần deploy phải xử lý sự cố (rollback, hotfix)? |
| **Time to restore** (nay gọi là *failed deployment recovery time*) | Ổn định | Mất bao lâu để phục hồi sau một lần deploy lỗi? |

Các báo cáo gần đây bổ sung **rework rate** (số lần deploy ngoài kế hoạch để sửa lỗi người dùng gặp phải). Nhóm dẫn đầu deploy theo nhu cầu, nhiều lần mỗi ngày, với lead time và thời gian phục hồi tính bằng giờ hoặc ít hơn.

Bài này tác động lên chúng thế nào: batch nhỏ và pipeline tự động → tần suất và lead time; canary, flag, expand–contract → giảm tỉ lệ lỗi; rollback nhanh và kill switch → phục hồi nhanh hơn.

Cạm bẫy: các chỉ số mô tả **hệ thống của một team**, không phải cá nhân — gắn chúng vào đánh giá hiệu suất thì mọi người sẽ "lách số". Định nghĩa "deployment" và "failure" nhất quán, thu thập dữ liệu tự động, và nhìn xu hướng.

---

## Điểm cần nhớ khi phỏng vấn

- **Continuous delivery** = luôn sẵn sàng release, con người quyết định; **continuous deployment** = mọi thay đổi xanh tự động lên production. **Deploy ≠ release.**
- **Build một lần, promote cùng một digest**; chỉ cấu hình khác nhau giữa các môi trường.
- **Recreate** = có downtime; **rolling** = không tốn thêm capacity, trộn version, rollback chậm; **blue-green** = chuyển/rollback tức thì với chi phí ~gấp đôi; **canary** = blast radius nhỏ với cổng metric; **shadow** = tải thật, không ảnh hưởng user, cẩn thận side effect.
- Chuyển traffic ở **load balancer**, không phải DNS.
- **Feature flag** tách release khỏi deploy; phải quản lý nợ flag.
- **Expand–contract**: bổ sung trước, phá huỷ sau cùng, mỗi bước tương thích với version trước.
- Biết cái gì **không thể** rollback; đặt ngưỡng rollback từ trước.
- **GitOps** = trạng thái trong Git, được agent trong cluster kéo về và đối soát (Argo CD, Flux); CI không giữ credential cluster; rollback là `git revert`.
- **DORA**: deployment frequency, lead time, change failure rate, recovery time.

## Tóm tắt

- CD đưa artifact từ CI lên production an toàn; bước cuối là thủ công với continuous delivery, tự động với continuous deployment.
- Các chiến lược đánh đổi giữa chi phí, tốc độ rollback, việc trộn version và blast radius; canary tự động là mặc định hiện đại cho service nhiều traffic.
- Feature flag và migration kiểu expand–contract mới là thứ làm cho deploy thường xuyên và rollback nhanh thật sự an toàn.
- GitOps biến việc deploy thành vòng lặp đối soát kiểu pull từ Git, qua Argo CD hoặc Flux.
- DORA metrics cho bạn biết tất cả những điều đó có hiệu quả hay không.
