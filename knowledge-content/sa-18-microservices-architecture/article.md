# Kiến trúc Microservices – Ranh giới, khả năng chịu lỗi và dữ liệu phân tán

## 1. Một dải lựa chọn: monolith, modular monolith, microservices

"Monolith hay microservices" là một lựa chọn nhị phân giả tạo — thực tế đó là một dải liên tục về số đơn vị triển khai và độ chặt của ranh giới:

| Kiểu | Triển khai | Dữ liệu | Ranh giới được giữ bởi |
|---|---|---|---|
| **Monolith** (khối nguyên khối) | Một đơn vị | Một schema chung, code nào cũng đụng được bảng nào | Không gì cả |
| **Modular monolith** (monolith chia module) | Một đơn vị | Một database, mỗi module sở hữu bảng của mình | API của module, architecture test |
| **Microservices** | Nhiều đơn vị triển khai độc lập | **Mỗi service một database** (database per service) | Mạng |

Một **microservice** sở hữu một năng lực nghiệp vụ (business capability) cùng dữ liệu của nó, và chỉ nói chuyện với bên ngoài qua API hoặc event. Từ khoá là *triển khai độc lập*: nếu năm service phải release cùng lúc, bạn đang có một **distributed monolith** (monolith phân tán) — gánh mọi chi phí của hệ phân tán mà không nhận được lợi ích nào.

Modular monolith là điểm xuất phát đúng cho phần lớn hệ thống: gọi hàm trong cùng process nhanh và có transaction, còn ranh giới module sạch sẽ giúp việc tách sau này rẻ hơn nhiều.

---

## 2. Vì sao chọn microservices — và "thuế" của hệ phân tán

Động lực thật sự là **tổ chức**, không phải kỹ thuật: mỗi team triển khai độc lập, quyền sở hữu rõ ràng (**định luật Conway** — hệ thống phản chiếu cấu trúc giao tiếp của tổ chức xây nó), scale riêng phần đang nóng, và cô lập lỗi.

Cái giá phải trả hằng ngày:

| Chi phí | Thực tế |
|---|---|
| Gọi qua mạng | Độ trễ, lỗi cục bộ (partial failure), timeout, serialization |
| Không còn transaction chung | Saga, nhất quán cuối cùng (eventual consistency), bù trừ |
| Vận hành | CI/CD, dashboard, on-call cho từng service; cần platform team |

Độ sẵn sàng (availability) **nhân với nhau** dọc theo một chuỗi gọi đồng bộ:

```text
5 services in series, each 99.9% available
0.999 ^ 5 = 0.995  ->  ~99.5% end to end
99.9% = ~43 min downtime/month     99.5% = ~3.6 h downtime/month
```

---

## 3. Bounded context và ranh giới service

Ranh giới đến từ **Domain-Driven Design (DDD)**. Một **bounded context** (ngữ cảnh giới hạn) là một vùng của domain mà trong đó một mô hình chỉ có một nghĩa nhất quán. "Product" trong Catalog có ảnh và mô tả; trong Inventory là tồn kho theo từng kho; trong Shipping là cân nặng và kích thước. Ép cả ba dùng chung một model `Product` sẽ trói chúng vào nhau.

```text
+----------------+    +----------------+    +----------------+
| Catalog        |    | Ordering       |    | Shipping       |
| Product: name, |    | Order, Line,   |    | Shipment,      |
| images, price  |    | customerId     |    | weight, address|
| [catalog DB]   |    | [orders DB]    |    | [shipping DB]  |
+-------+--------+    +-------+--------+    +-------+--------+
        +------- APIs / events ------+--------------+
```

Vài nguyên tắc kinh nghiệm:

- Tách theo **năng lực nghiệp vụ**, đừng bao giờ tách theo tầng kỹ thuật ("validation service", "DB service").
- **Gắn kết cao bên trong, lỏng lẻo bên ngoài** (high cohesion, loose coupling) — hai service luôn thay đổi cùng nhau thì thực chất là một service.
- **Database per service**: không ai khác được đọc bảng của bạn.
- Tham chiếu thực thể của service khác bằng **ID**; giữ bản sao cục bộ vài trường cần dùng, cập nhật qua event.
- Tránh **nanoservice**: gọi qua lại liên tục, không service nào tự làm được việc gì có ích.

---

## 4. Service discovery

Instance sinh ra và mất đi liên tục, nên bên gọi không thể hard-code IP. **Service discovery** (khám phá dịch vụ) dùng một **registry** theo dõi các instance còn khoẻ.

| Mô hình | Cách hoạt động | Ví dụ |
|---|---|---|
| **Client-side** | Client hỏi registry rồi tự cân bằng tải | Netflix Eureka, Consul + thư viện client |
| **Server-side** | Client gọi một tên cố định; router/LB chọn instance | Kubernetes Service, AWS ALB |
| **Dựa trên DNS** | Instance được công bố thành bản ghi DNS | Consul DNS (port 8600), CoreDNS, AWS Cloud Map |

Việc đăng ký có thể là **self-registration** (instance tự gửi heartbeat tới registry) hoặc **third-party** (nền tảng làm hộ — Kubernetes đưa Pod vào endpoints của Service khi readiness probe đạt).

Trong Kubernetes, `http://orders.shop.svc.cluster.local` phân giải ra một ClusterIP và kube-proxy rải các **kết nối** lên những Pod đang ready. Lưu ý: kết nối gRPC/HTTP/2 sống lâu được cân bằng theo kết nối chứ không theo request, nên một Pod có thể ôm toàn bộ tải — lý do phổ biến để dùng service mesh hoặc cân bằng tải gRPC phía client.

---

## 5. Giao tiếp đồng bộ và bất đồng bộ

| | Đồng bộ (REST, gRPC) | Bất đồng bộ (event, message) |
|---|---|---|
| Ràng buộc | **Ràng buộc thời gian** (temporal coupling) — bên được gọi phải sống ngay lúc đó | Producer và consumer hỏng độc lập nhau |
| Độ trễ | Cộng dồn dọc chuỗi | Bên gọi trả về nhanh |
| Nhất quán | Tức thời | Cuối cùng (eventual) |
| Hợp với | Truy vấn mà người dùng đang chờ | Tác dụng phụ, fan-out, việc chạy lâu |

Quy tắc dễ nhớ: **đồng bộ cho những lần đọc người dùng đang đợi, bất đồng bộ cho "những việc nên xảy ra vì một việc khác vừa xảy ra"**. `OrderPlaced` kích hoạt gửi email, cộng điểm thưởng và analytics — không việc nào trong số đó được phép làm hỏng bước thanh toán.

```text
Sync chain (fragile):  client -> order -> payment -> fraud -> bank

Async (resilient):     client -> order --OrderPlaced--> broker --> email
                                                              +--> loyalty
                                                              +--> analytics
```

Broker và các đảm bảo giao nhận thuộc bài 11; các kiểu API thuộc bài 17.

---

## 6. Timeout và retry

**Timeout.** Mọi lời gọi từ xa đều phải có timeout; một dependency *chậm* giữ chặt thread của bạn còn tệ hơn một dependency *chết*. Đặt timeout dựa trên p99 đo được của dependency, và **giảm dần theo chiều sâu chuỗi gọi**: nếu tầng ngoài cùng cho 2 s thì các lời gọi bên trong phải nằm gọn trong ngân sách đó (**deadline propagation** — gRPC hỗ trợ sẵn).

**Retry.** Chỉ thử lại lỗi **tạm thời** (transient: timeout, 503, 429 kèm tôn trọng `Retry-After`), không bao giờ retry 400/401/404, và chỉ với thao tác **idempotent** (hoặc dùng idempotency key). Dùng **exponential backoff kèm jitter** để các client không retry đồng loạt cùng một nhịp.

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

**Bão retry** (retry storm). Retry nhân lên qua các tầng: ba tầng, mỗi tầng thử tối đa 3 lần, biến một request thành 3 × 3 × 3 = **27 lời gọi** tới service dưới cùng — đúng lúc nó đang quá tải. Chỉ retry ở **một** tầng và giới hạn tải phát sinh bằng **retry budget** (ví dụ retry ≤ 10–20% lưu lượng).

---

## 7. Circuit breaker, bulkhead và fallback

**Circuit breaker** (cầu dao) ngừng gọi một dependency đang hỏng rõ ràng: bên gọi thất bại nhanh thay vì chồng chất timeout, còn dependency có khoảng trống để hồi phục.

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

Giá trị mặc định của Resilience4j là điển hình: mở khi tỉ lệ lỗi đạt **50%** trên cửa sổ 100 lời gọi, giữ trạng thái mở **60 s**, rồi cho **10** lời gọi thử ở half-open. Nên tính cả **lời gọi chậm** là lỗi.

**Bulkhead** (vách ngăn) cô lập tài nguyên như các khoang kín nước trên tàu: mỗi dependency có connection pool hoặc giới hạn đồng thời riêng, nên nếu service gợi ý sản phẩm bị treo thì nó chỉ ăn hết 20 slot của chính nó, còn checkout vẫn chạy.

**Fallback** là thứ bạn trả về thay thế: dữ liệu cache, giá trị mặc định, phản hồi rút gọn, hoặc một lỗi rõ ràng. Fallback phải an toàn — đừng bao giờ "fallback" thành trừ tiền thẻ hai lần.

Thư viện: Resilience4j (Java; Hystrix đã ở chế độ bảo trì từ 2018), Polly (.NET), opossum (Node.js) — hoặc cấu hình cùng các chính sách đó trong service mesh.

---

## 8. Dữ liệu phân tán và saga

Với database per service, "tạo đơn, giữ hàng, trừ tiền" trải trên ba database, nên không thể có một transaction ACID duy nhất. **Two-phase commit (2PC)** giữ lock xuyên service, bị treo nếu coordinator chết giữa chừng, và phần lớn broker cũng như NoSQL không hỗ trợ.

**Saga** là một chuỗi **local transaction** (transaction cục bộ); mỗi bước commit trong một service rồi kích hoạt bước tiếp theo. Nếu một bước thất bại, các **compensating transaction** (giao dịch bù) sẽ hoàn tác các bước trước về mặt nghiệp vụ.

```text
Happy path:     T1 order PENDING -> T2 reserve stock -> T3 charge card -> T4 order APPROVED
Fails at T3:    C2 release stock -> C1 order REJECTED
```

Hệ quả khi thiết kế:

- **Không có isolation**: request khác có thể thấy trạng thái trung gian. Dùng semantic lock (trạng thái `PENDING`) và kiểm tra lại trước khi hành động.
- **Bù trừ là hành động nghiệp vụ** (hoàn tiền, email huỷ đơn), không phải rollback. Đặt các bước không đảo ngược được ở cuối — sau **pivot transaction** saga chỉ đi tiếp chứ không lùi.
- Mọi bước và mọi bước bù phải **idempotent**, vì message sẽ bị giao lại.
- Lưu trạng thái và phát event một cách nguyên tử cần outbox pattern (bài 11).

---

## 9. Saga: orchestration và choreography

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

| | Choreography (biên đạo) | Orchestration (điều phối) |
|---|---|---|
| Điều khiển | Rải khắp các service | Một state machine trung tâm |
| Ràng buộc | Service biết event, không biết nhau | Orchestrator biết mọi bên tham gia |
| Khả năng quan sát | Ngầm định — khó trả lời "đơn 42 đang ở đâu?" | Luồng và trạng thái nằm một chỗ |
| Rủi ro | Chuỗi event vòng tròn, khó sửa | Orchestrator phình thành "god service" |
| Hợp với | Ít bước, liên hệ lỏng | Quy trình nghiệp vụ nhiều bước, phức tạp |

Công cụ orchestration: Temporal, Camunda, Netflix Conductor. Trên AWS, **Step Functions** (dùng `Catch` để chạy bước bù) là orchestrator tự nhiên, còn **EventBridge** hoặc SNS/SQS hợp với choreography. Hệ thống thực tế thường kết hợp cả hai.

---

## 10. CQRS và event sourcing (tổng quan)

**CQRS** (Command Query Responsibility Segregation — tách trách nhiệm ghi và đọc) tách mô hình ghi (command, bất biến nghiệp vụ) khỏi các mô hình đọc được định hình cho truy vấn.

```text
commands --> [write model] --> write DB --events--> [projector] --> read DB(s)
queries  -------------------------------------------------------------^
```

Nó cho phép đọc và ghi scale độc lập, và cho phép một **projection** gộp dữ liệu từ event của nhiều service mà không cần gọi chéo. Cái giá: phía đọc **nhất quán cuối cùng** và có thêm nhiều thành phần.

**Event sourcing** lưu **chuỗi event** làm nguồn sự thật thay cho trạng thái hiện tại; trạng thái được suy ra bằng cách phát lại (replay) event (`AccountOpened`, `MoneyDeposited` → số dư).

| Lợi ích | Chi phí |
|---|---|
| Lịch sử audit đầy đủ, xem trạng thái tại mọi thời điểm | Truy vấn cần projection (nên đi kèm CQRS) |
| Dựng read model mới bằng cách replay | Phải quản lý phiên bản event mãi mãi; stream dài cần **snapshot** |

CQRS không kèm event sourcing khá phổ biến; event sourcing thì gần như luôn kéo theo CQRS. Chỉ áp dụng cho bounded context thực sự cần (sổ cái, đặt chỗ), không áp cho toàn hệ thống.

---

## 11. Service mesh

**Service mesh** đưa các mối quan tâm về mạng ra khỏi code ứng dụng. Mô hình kinh điển: mỗi Pod có một **sidecar proxy** (**data plane**), được cấu hình bởi **control plane**.

```text
+------- Pod A -------+           +------- Pod B -------+
| app A <-> sidecar   | <--mTLS-->|   sidecar <-> app B |
+----------^----------+           +----------^----------+
           +--- control plane: config, certs, policy ---+
```

Không cần sửa code, với mọi ngôn ngữ: **mTLS** và danh tính service, retry và timeout, outlier detection (loại instance lỗi), chia lưu lượng cho canary, metric và trace đồng nhất.

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
| **Istio** | Sidecar Envoy, hoặc **ambient mode** (ztunnel trên từng node + waypoint proxy tuỳ chọn; GA từ bản 1.24) |
| **Linkerd** | Sidecar `linkerd2-proxy` viết bằng Rust, nhẹ; đơn giản hơn |
| **Consul** | Envoy; trải trên cả Kubernetes và VM |

Chi phí: thêm độ trễ mỗi hop, tốn bộ nhớ cho mỗi sidecar, thêm một hệ thống sống còn phải vận hành. Đáng giá khi có nhiều service và nhiều ngôn ngữ; quá mức cần thiết với năm service. Trên AWS, App Mesh hết hỗ trợ vào 30/09/2026; AWS khuyên chuyển sang ECS Service Connect hoặc VPC Lattice.

---

## 12. Khi nào KHÔNG nên dùng microservices — và cách chuyển đổi

Tránh microservices khi:

- Đội nhỏ (một hai team) — "thuế" vận hành lớn hơn lợi ích tự chủ.
- Domain còn mới, ranh giới chưa rõ — một ranh giới sai nằm vắt qua mạng thì dời đi rất đắt.
- CI/CD, container, monitoring và tracing còn non.
- Mục tiêu là hiệu năng — mỗi hop mạng chỉ thêm độ trễ.

Năm 2023, team Prime Video kể lại việc chuyển một pipeline giám sát từ các thành phần serverless phân tán về một process duy nhất và giảm khoảng 90% chi phí — độ mịn của việc chia nhỏ là lựa chọn theo từng workload.

Để chuyển đổi, dùng **strangler fig pattern** (mẫu "cây đa bóp nghẹt"): đặt một router phía trước, tách từng năng lực (kèm dữ liệu của nó) ra một, chuyển route của nó sang, rồi xoá code cũ.

```text
client -> [router] --/search--> new search service
                   --/orders--> new orders service
                   --/*-------> monolith (shrinks until deleted)
```

Bắt đầu với năng lực ít phụ thuộc mà giá trị cao. Một **anti-corruption layer** (lớp chống ăn mòn) chuyển đổi giữa mô hình cũ và service mới để khái niệm legacy không rò rỉ vào.

---

## Điểm cần nhớ khi phỏng vấn

- Bắt đầu bằng **modular monolith**; tách ra vì **sự độc lập của team và việc triển khai**, không phải vì hiệu năng.
- Một service sở hữu **một năng lực và dữ liệu của nó**; dùng chung DB hoặc phải deploy đồng loạt = **distributed monolith**.
- Ranh giới = **bounded context**, tách theo năng lực, không theo tầng.
- Discovery: client-side (Eureka) và server-side (Kubernetes Service, ALB).
- Gọi đồng bộ nhân availability (0.999⁵ ≈ 99.5%); ưu tiên bất đồng bộ cho tác dụng phụ.
- **Mọi lời gọi đều có timeout**; chỉ retry lỗi tạm thời + thao tác idempotent, với **exponential backoff và jitter**, ở một tầng.
- Circuit breaker **closed → open → half-open**; bulkhead cô lập pool; fallback phải an toàn.
- Không có 2PC → **saga** gồm local transaction và **giao dịch bù**; các bước idempotent; không có isolation.
- **Choreography** cho vài bước đơn giản, **orchestration** cho luồng phức tạp (Step Functions, Temporal).
- CQRS = tách model đọc/ghi; event sourcing = event là nguồn sự thật, cần projection và snapshot.
- Service mesh = proxy + control plane cho mTLS, retry, outlier detection, telemetry.
- Chuyển đổi bằng **strangler fig** và anti-corruption layer.

## Tóm tắt

- Triển khai độc lập là đặc trưng của microservices; bounded context và database per service giữ chúng lỏng lẻo.
- Các mẫu chịu lỗi ngăn lỗi cục bộ lan dây chuyền; saga thay cho transaction phân tán.
- CQRS, event sourcing và service mesh là công cụ có mục tiêu, không phải mặc định; strangler fig chuyển monolith sang service một cách an toàn.
