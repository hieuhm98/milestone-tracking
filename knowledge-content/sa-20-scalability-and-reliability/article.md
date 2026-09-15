# Khả năng mở rộng & độ tin cậy

## 1. Scalability, availability, reliability — nói cho đúng nghĩa

Trong các cuộc họp, mấy từ này hay bị dùng lẫn lộn. Nhưng trong một buổi review kiến trúc, chúng mang nghĩa khác nhau:

| Thuật ngữ | Trả lời câu hỏi | Đo bằng |
|---|---|---|
| **Hiệu năng** (performance) | Một request nhanh cỡ nào? | Độ trễ (latency) p50, p99 |
| **Khả năng mở rộng** (scalability) | Có chịu được tải *lớn hơn* bằng cách thêm tài nguyên mà không phải thiết kế lại không? | Throughput trên mỗi đơn vị chi phí khi tải tăng |
| **Tính co giãn** (elasticity) | Năng lực có tự động tăng *và giảm* theo tải không? | Thời gian scale, chi phí lúc rảnh |
| **Tính sẵn sàng** (availability) | Hệ thống có đang chạy và trả lời không? | % thời gian (hoặc % request) phục vụ thành công |
| **Độ tin cậy** (reliability) | Hệ thống có làm *đúng* việc, ổn định theo thời gian không? | Tỉ lệ lỗi, MTBF, tính đúng đắn |
| **Khả năng chống chịu** (resilience) | Hấp thụ và phục hồi sau sự cố tốt đến đâu? | MTTR, phạm vi ảnh hưởng (blast radius) |

Một hệ thống có thể nhanh mà không mở rộng được (một server đơn được tinh chỉnh kỹ), hoặc sẵn sàng mà không tin cậy (vẫn trả lời, nhưng dữ liệu cũ hoặc sai). Availability thường được biểu diễn bằng số "số 9" (nines):

| Availability | Downtime mỗi năm | Downtime mỗi tháng 30 ngày |
|---|---|---|
| 99% | ~3,65 ngày | ~7,2 giờ |
| 99,9% | ~8,76 giờ | ~43 phút |
| 99,95% | ~4,38 giờ | ~21,6 phút |
| 99,99% | ~52,6 phút | ~4,3 phút |
| 99,999% | ~5,26 phút | ~26 giây |

Mỗi số 9 thêm vào tốn công sức nhiều hơn khoảng một bậc: dự phòng, tự động hoá, kiểm thử và độ trưởng thành của đội on-call. Câu hỏi kiến trúc đầu tiên luôn là "*nghiệp vụ* thực sự cần mấy số 9?". Việc biến con số đó thành SLI, SLO và error budget được trình bày ở bài observability (16).

---

## 2. Scale dọc và scale ngang

**Scale dọc** (vertical scaling, scale up) là cho một máy thêm CPU, RAM hoặc đĩa nhanh hơn. **Scale ngang** (horizontal scaling, scale out) là thêm nhiều máy phía sau một load balancer.

| | Scale dọc | Scale ngang |
|---|---|---|
| Sửa code | Không cần | App phải stateless hoặc tự phân vùng state |
| Giới hạn trên | Instance lớn nhất có bán | Thực tế rất cao |
| Đường chi phí | Máy càng to càng đắt không tương xứng | Gần tuyến tính |
| Khi hỏng | Vẫn là điểm lỗi duy nhất | Mất một node chỉ mất 1/N năng lực |
| Thao tác scale | Thường phải restart/đổi size | Thêm node, thường không downtime |
| Phù hợp | DB quan hệ primary, app legacy, cứu cháy nhanh | Tầng web/API stateless, worker, cache |

Thực tế ta dùng cả hai: scale dọc database primary cho tới khi không chịu nổi nữa (đây là thứ khó scale ngang nhất), còn mọi thứ stateless thì scale ngang. Scale ngang *tầng dữ liệu* — replica, partitioning, sharding — là một bài riêng (12). Nhớ rằng scale ngang chỉ dời điểm nghẽn: thêm mười API server có thể chỉ có nghĩa là gấp mười lần kết nối dội vào một database.

---

## 3. Service stateless: điều kiện tiên quyết để scale ngang

Một service là **stateless** khi bất kỳ instance nào cũng xử lý được bất kỳ request nào, vì không có gì request cần mà chỉ nằm trong bộ nhớ hay đĩa cục bộ của một instance. Nhờ đó ta thêm, bớt, thay thế hay để instance chết thoải mái.

State được chuyển đi đâu:

| State | Anti-pattern stateful | Cách stateless |
|---|---|---|
| Phiên đăng nhập (session) | Bộ nhớ trong process | Token có chữ ký (JWT) hoặc store dùng chung (Redis) |
| File upload | Đĩa cục bộ | Object storage (S3) |
| Job định kỳ | `cron` trên "server 1" | Scheduler service / queue với một consumer group |
| Lock, bộ đếm | Map trong bộ nhớ | Database hoặc Redis với ngữ nghĩa đúng |

**Sticky session** (session affinity — LB ghim một client vào một instance qua cookie) chỉ là cái nạng, không phải lời giải: instance chết thì user trên đó vẫn bị đăng xuất, scale-in gây gián đoạn, và tải lệch vì user nặng dính chặt một node. Chỉ dùng như bước chuyển tiếp khi migrate. Stateless cũng có nghĩa là **dùng xong bỏ được** (disposable): instance khởi động nhanh, tắt êm khi nhận `SIGTERM`, và có thể bị kill bất cứ lúc nào — đúng những gì autoscaling, rolling deploy và chaos experiment sẽ làm với nó.

---

## 4. Cân bằng tải & health check

Load balancer chia request cho các instance khoẻ và loại instance hỏng ra. (Cơ chế L4 vs L7 ở bài 3; cấu hình nginx ở bài 8.) Về mặt độ tin cậy, có ba quyết định quan trọng.

**Thuật toán.** Round robin giả định mọi request và instance như nhau. **Least connections / least outstanding requests** thích nghi khi có request chậm. **Consistent hashing** giữ một key luôn về cùng backend (hữu ích cho cache). **Power of two random choices** — chọn ngẫu nhiên hai backend, gửi cho cái ít tải hơn — scale tốt mà không cần state toàn cục.

**Health check.**

- **Chủ động** (active): LB gọi thử một endpoint như `GET /healthz` mỗi N giây; sau X lần lỗi thì target bị đánh dấu unhealthy, sau Y lần thành công thì healthy trở lại.
- **Bị động** (passive, outlier detection): LB quan sát traffic thật và loại backend đang trả lỗi hoặc timeout.

```nginx
upstream api {
    least_conn;
    # passive checks: 3 failures within 30s ejects the server for 30s
    server 10.0.1.10:8080 max_fails=3 fail_timeout=30s;
    server 10.0.1.11:8080 max_fails=3 fail_timeout=30s;
    server 10.0.1.12:8080 backup;
}
```

**Check nông vs check sâu** (shallow vs deep) là cái bẫy kinh điển. Một deep check kiểm tra luôn cả database trông rất kỹ, nhưng khi database chập chờn, *mọi* instance cùng fail check một lúc và LB gỡ bỏ toàn bộ fleet — biến sự cố một phần thành sập toàn phần. Hãy để health check của LB chỉ trả lời "process này có phục vụ được traffic không", còn sức khoẻ dependency thì báo qua metric và phản hồi suy giảm. (Vì lý do này, AWS ALB "fail open": nếu mọi target trong group đều unhealthy, nó gửi traffic tới tất cả.)

**Connection draining.** Khi một instance bị gỡ (scale-in, deploy), LB phải ngừng gửi request mới nhưng để request đang chạy hoàn tất — *deregistration delay* của ALB mặc định là 300 giây. App cũng phải phối hợp: nhận `SIGTERM` thì fail readiness check, làm xong việc đang dở, rồi thoát.

---

## 5. Tính sẵn sàng cao & dự phòng

Tính sẵn sàng cao (high availability) nghĩa là **không có điểm lỗi duy nhất** (single point of failure – SPOF): với mỗi thành phần, hỏi "chuyện gì xảy ra khi cái này chết?". Các SPOF hay bị ẩn: một NAT gateway duy nhất, một nhà cung cấp DNS duy nhất, database primary, config server dùng chung, pipeline deploy, một người duy nhất giữ mật khẩu root.

**Các mô hình dự phòng** (redundancy)

| Mô hình | Ý nghĩa | Chịu được |
|---|---|---|
| **N** | Vừa đủ năng lực cho giờ cao điểm | Không gì cả |
| **N+1** | Thêm một đơn vị dự phòng | Một sự cố (hoặc một node đang bảo trì) |
| **N+2** | Thêm hai đơn vị | Một sự cố *trong lúc* đang bảo trì |
| **2N** | Nhân đôi toàn bộ | Mất trọn một bên |

**Active-passive** giữ một bản standby để tiếp quản khi có sự cố (đơn giản hơn, nhưng failover tốn thời gian và standby có thể hỏng từ lâu mà không ai biết). **Active-active** phục vụ traffic từ mọi bản sao (không có bước failover, năng lực luôn được dùng thật, nhưng phải xử lý nhất quán dữ liệu và mỗi bản phải gánh được tải của các bản kia).

**Phép tính availability.** Các thành phần **nối tiếp** (series) thì nhân availability với nhau; các thành phần dự phòng **song song** (parallel) thì nhân *unavailability* với nhau:

```text
Series:    LB (99.99%) -> App (99.9%) -> DB (99.9%)
           0.9999 * 0.999 * 0.999 = 0.9979  -> ~99.8%

Parallel:  two independent app nodes, each 99%
           1 - (0.01 * 0.01) = 0.9999        -> 99.99%
```

Mỗi dependency thêm vào theo kiểu nối tiếp kéo availability xuống thấp hơn cả mắt xích yếu nhất; dự phòng nâng nó lên — nhưng chỉ khi các sự cố **độc lập** với nhau. Hai replica cùng một rack, cùng dính một lần đẩy config lỗi, hay cùng dùng một certificate hết hạn thì sẽ chết cùng nhau.

---

## 6. Miền lỗi: multi-AZ và multi-region

**Miền lỗi** (failure domain) là tập hợp những thứ hỏng cùng nhau: một process, một host, một rack, một availability zone (AZ — một hay nhiều data center có nguồn điện và mạng độc lập), một region, một nhà cung cấp cloud, và — hay bị quên — một lần deploy hay một thay đổi cấu hình.

```text
                         Region (e.g. ap-southeast-1)
   +----------------------------------------------------------------+
   |          Load balancer (spans all AZs)                         |
   |       /                 |                  \                   |
   |  +---------+       +---------+        +---------+              |
   |  |  AZ a   |       |  AZ b   |        |  AZ c   |              |
   |  | app x2  |       | app x2  |        | app x2  |              |
   |  | DB prim.| ----> | DB stby |        | replica |              |
   |  +---------+ sync  +---------+        +---------+              |
   +----------------------------------------------------------------+
```

**Multi-AZ** là mặc định cho production: replication đồng bộ giữa các AZ có độ trễ thấp nên khả thi, và nó bảo vệ trước những sự cố lớn phổ biến nhất. **Multi-region** bảo vệ trước sự cố cả region và phục vụ người dùng toàn cầu, nhưng độ trễ liên region (hàng chục tới hàng trăm ms) buộc phải replication **bất đồng bộ** — tức là có thể mất dữ liệu khi failover và rất khó giữ nhất quán khi ghi active-active. Chỉ làm khi bài toán nghiệp vụ (RTO/RPO, quy định pháp lý, độ trễ toàn cầu) xứng đáng với chi phí và độ phức tạp.

**Ổn định tĩnh** (static stability) là ý tưởng thiết kế then chốt: hệ thống phải tiếp tục chạy qua sự cố *mà không cần thực hiện thay đổi nào* — vì control plane (API autoscaling, cập nhật DNS) thường cũng bị ảnh hưởng trong các sự cố lớn. Cụ thể: muốn chịu được mất một trong ba AZ, hãy cấp sẵn năng lực sao cho hai AZ còn lại gánh được giờ cao điểm — mỗi AZ ~50% peak, tổng 150% — thay vì định "khi nào có chuyện thì autoscale".

**Kiến trúc cell** (cell-based architecture) thu hẹp blast radius thêm nữa: chia khách hàng vào các cell độc lập (mỗi cell là một bản sao đầy đủ của stack), để một lần deploy lỗi hay một "poison request" chỉ ảnh hưởng một cell chứ không phải tất cả.

---

## 7. RTO, RPO và các chiến lược khôi phục thảm hoạ

Hai con số quyết định mọi thiết kế **khôi phục thảm hoạ** (disaster recovery – DR):

- **RPO (Recovery Point Objective)** — lượng *dữ liệu* chấp nhận mất, đo bằng thời gian. RPO 15 phút nghĩa là có thể mất 15 phút ghi dữ liệu gần nhất.
- **RTO (Recovery Time Objective)** — thời gian chấp nhận *ngừng dịch vụ* trước khi khôi phục xong.

```text
          last good backup/replica         disaster            service restored
  ------------------|------------------------X--------------------------|------> time
                    <-------- RPO ---------->  <----------- RTO -------->
                        (data lost)                  (downtime)
```

Bốn chiến lược kinh điển đánh đổi chi phí lấy RTO/RPO:

| Chiến lược | Thứ đang chạy ở site DR | RPO điển hình | RTO điển hình | Chi phí |
|---|---|---|---|---|
| **Backup & restore** | Không có gì; backup được sao ra ngoài | Hàng giờ (theo tần suất backup) | Hàng giờ tới một ngày | $ |
| **Pilot light** | Dữ liệu được replicate; hạ tầng lõi đã định nghĩa, app server tắt | Vài phút | Hàng chục phút | $$ |
| **Warm standby** | Bản sao chạy đầy đủ nhưng thu nhỏ | Vài giây tới vài phút | Vài phút | $$$ |
| **Multi-site active-active** | Production đầy đủ ở cả hai site, cả hai cùng phục vụ | Gần bằng 0 | Gần bằng 0 | $$$$ |

Những điều phân biệt một kế hoạch DR thật với một slide:

- **Backup chưa từng restore thì không phải là backup.** Kiểm thử restore theo lịch và đo RTO thực tế.
- **Bảo vệ trước lỗi logic**, không chỉ mất site: replication sẽ sao chép trung thành cả một lệnh `DROP TABLE` hay dữ liệu bị ransomware mã hoá. Cần point-in-time recovery và bản sao bất biến (immutable) hoặc offline.
- **Infrastructure as code** (bài 15) là thứ khiến pilot light và warm standby khả thi — không ai dựng tay nổi một region lúc 3 giờ sáng.
- **Quyết định trước ai bấm nút failover** và cách *quay về* (fail back).

---

## 8. Timeout, retry và suy giảm có kiểm soát

Phần lớn sự cố lớn không phải do một server chết, mà do một dependency *chậm*: request chờ nó dồn lại cho tới khi mọi thứ phía trên cạn thread, kết nối hay bộ nhớ — gọi là **lỗi dây chuyền** (cascading failure).

**Timeout** là tuyến phòng thủ đầu tiên: mọi lời gọi mạng đều cần timeout, đặt theo độ trễ thật của dependency (ví dụ cao hơn p99 một chút), và timeout tổng của bên gọi phải lớn hơn tổng thời gian nó chờ phía dưới. Mặc định "không timeout" hay 60 giây là bug.

**Retry** sửa được lỗi thoáng qua (transient) nhưng lại nhân tải đúng lúc dependency đang khốn đốn:

```text
 client --3 tries--> API --3 tries--> service --3 tries--> DB
 worst case at the DB: 3 * 3 * 3 = 27 attempts for one user click
```

Quy tắc: chỉ retry thao tác idempotent (hoặc dùng idempotency key), retry ở **một** tầng duy nhất, giới hạn số lần, và dùng **exponential backoff kèm jitter** để hàng nghìn client không retry cùng một nhịp (hiện tượng *thundering herd*):

```js
async function withRetry(fn, { attempts = 4, baseMs = 100, capMs = 5000 } = {}) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      const last = i === attempts - 1;

      if (last || !err.retryable) throw err;

      // full jitter: random delay between 0 and the exponential ceiling
      const ceiling = Math.min(capMs, baseMs * 2 ** i);
      await new Promise((r) => setTimeout(r, Math.random() * ceiling));
    }
  }
}
```

**Retry budget** (ví dụ retry chỉ được thêm tối đa 10% tải) và **circuit breaker** ngừng gọi dependency đang hỏng sẽ hoàn thiện bức tranh — circuit breaker và bulkhead được trình bày ở bài microservices (18).

**Suy giảm có kiểm soát** (graceful degradation) nghĩa là quyết định trước sản phẩm sẽ làm gì khi mất một dependency: hiện trang sản phẩm mà không có gợi ý cá nhân hoá, hiện giá từ cache kèm ghi chú "có thể chưa cập nhật", nhận đơn vào queue rồi xác nhận qua email sau, chuyển tìm kiếm sang chế độ chỉ đọc. Phân loại tính năng *thiết yếu* (checkout) và *tuỳ chọn* (review, gợi ý), và cho các tính năng tuỳ chọn fail nhanh, lặng lẽ. Trả dữ liệu cũ từ cache là fallback phổ biến — còn thiết kế cache là bài 10.

---

## 9. Backpressure và load shedding

Hệ thống nào cũng có throughput tối đa. Khi tải tới vượt quá mức đó, phần việc thừa phải đi *đâu đó*: vào hàng đợi không giới hạn (độ trễ tăng tới khi request timeout — server vẫn bận làm những việc không còn ai chờ), vào bộ nhớ (OOM), hoặc đẩy ngược về bên gửi. Mục đích của phần này là chọn điều đó một cách có chủ đích.

**Áp lực ngược** (backpressure) đẩy tín hiệu "chậm lại" ngược lên phía trên để producer chạy theo nhịp của consumer: queue có giới hạn sẽ block hoặc từ chối khi đầy, TCP flow control, consumer kiểu pull (Kafka consumer chỉ fetch lượng nó xử lý nổi), reactive streams có tín hiệu demand. Quy tắc vàng: **mọi queue đều phải có giới hạn**, và phải quyết định chuyện gì xảy ra khi nó đầy.

**Cắt bớt tải** (load shedding) là chủ động từ chối một phần việc sớm và rẻ để phần còn lại thành công. Từ chối trong 1 ms tốt hơn nhiều so với nhận vào rồi timeout sau 30 giây.

```js
// Minimal concurrency-based load shedder (Express-style middleware)
const MAX_IN_FLIGHT = 200;
let inFlight = 0;

function shedLoad(req, res, next) {
  if (inFlight >= MAX_IN_FLIGHT && req.priority !== 'critical') {
    res.set('Retry-After', '2');

    return res.status(503).json({ error: 'overloaded, retry later' });
  }

  inFlight++;
  res.on('close', () => inFlight--);
  next();
}
```

Load shedding tốt thì:

- **Có ưu tiên**: health check bị cắt sau cùng, traffic nền/batch và gói miễn phí bị cắt trước, giữ lại checkout và đăng nhập.
- **Trả tín hiệu nhanh, rõ ràng**: `503 Service Unavailable` khi quá tải hoặc `429 Too Many Requests` cho giới hạn theo từng client (thuật toán rate limiting ở bài 17), kèm `Retry-After`.
- **Bỏ việc đã quá hạn**: nếu request đã chờ lâu hơn timeout của client thì đừng xử lý nữa (truyền deadline – deadline propagation).

---

## 10. Hoạch định năng lực và autoscaling

**Hoạch định năng lực** (capacity planning) trả lời "cần bao nhiêu, và khi nào?" trước khi người dùng trả lời hộ bạn.

**Vì sao không bao giờ chạy ở 100%.** Với mô hình hàng đợi đơn giản, thời gian phản hồi xấp xỉ `R = S / (1 - U)`, trong đó `S` là thời gian phục vụ và `U` là mức sử dụng (utilisation):

```text
 utilisation   50%    70%    80%    90%    95%
 latency       2x     3.3x   5x     10x    20x   (relative to service time)
```

Độ trễ bùng nổ sau "điểm gãy" (knee) quanh 70–80%. Đó là lý do mục tiêu autoscaling thường quanh 50–70% CPU chứ không phải 90%.

**Quy trình thực tế**

1. **Đo một đơn vị**: load test một instance để tìm RPS tối đa ở mức p99 chấp nhận được (công cụ: k6, Gatling, Locust, JMeter) — tìm điểm nghẽn thật (CPU, kết nối DB, một lock), không phải cái bạn đoán.
2. **Dự báo nhu cầu**: peak hiện tại × tăng trưởng × sự kiện mùa vụ (sale Tết, 11.11, chiến dịch marketing).
3. **Cộng phần dư** (headroom): mức sử dụng mục tiêu (ví dụ 60%) + chịu được mất một miền lỗi (N+1 / mất AZ) + biên cho đột biến.
4. **Tính thời gian chờ** (lead time): instance mới mất vài phút để boot và warm up; nâng cấp database hay mua capacity dự trữ mất vài ngày tới vài tuần.
5. **Kiểm tra lại** sau mỗi release lớn — suy giảm hiệu năng âm thầm ăn mất năng lực.

Ví dụ: peak 6.000 RPS, một instance chịu 500 RPS ở p99 mục tiêu, chạy ở 60% → 300 RPS mỗi instance → 20 instance. Muốn chịu mất một trong 3 AZ → hai AZ còn lại phải gánh hết → 30 instance, mỗi AZ 10.

**Autoscaling** có các kiểu policy: *target tracking* (giữ CPU hoặc RPS mỗi target quanh một giá trị), *step* (thêm N khi vượt ngưỡng), *scheduled* (scale trước một sự kiện đã biết), và *predictive* (dự báo từ lịch sử). Autoscaling xử lý thay đổi từ từ; nó **không** xử lý được đợt tăng vọt đến nhanh hơn thời gian instance khởi động — cho trường hợp đó cần pre-warm, headroom và load shedding. Luôn đặt giới hạn max (một bug hay một cuộc tấn công không nên scale hoá đơn tới vô cực) và scale-in chậm hơn scale-out. (Kubernetes HPA và cluster autoscaler ở bài 7.)

---

## 11. Chaos engineering

Bạn không biết hệ thống có chống chịu tốt hay không cho tới khi tận mắt thấy nó hỏng. **Chaos engineering** là chạy các thí nghiệm có kiểm soát, cố tình gây lỗi để xác nhận — hoặc bác bỏ — các giả định của bạn, trước khi một sự cố thật làm việc đó. Netflix phổ biến cách làm này với Chaos Monkey, công cụ tắt ngẫu nhiên các instance production.

**Vòng lặp thí nghiệm**

1. Định nghĩa **trạng thái ổn định** (steady state) bằng một metric nghiệp vụ (số đơn mỗi phút, số lần đăng nhập thành công), không phải CPU.
2. Đặt **giả thuyết**: "Nếu một AZ mất hết app instance, tỉ lệ checkout thành công vẫn trên 99,5% và p99 vẫn dưới 800 ms."
3. **Gây lỗi** thực tế: kill instance, thêm 300 ms độ trễ vào một dependency, drop gói tin, làm đầy đĩa, cho certificate hết hạn, throttle một API, failover database.
4. **Giới hạn blast radius**: bắt đầu ở staging, rồi một phần trăm nhỏ traffic production, có nút huỷ và điều kiện dừng tự động gắn với alarm.
5. **Quan sát, rút kinh nghiệm, sửa**, rồi tự động hoá thí nghiệm để bắt lỗi tái phát.

**Game day** là buổi diễn tập theo lịch, cả đội cùng chạy một kịch bản (failover region, restore từ backup) để luyện runbook và cách phối hợp, không chỉ riêng công nghệ.

Công cụ: AWS Fault Injection Service (FIS), Azure Chaos Studio, Chaos Mesh và LitmusChaos cho Kubernetes, Gremlin (thương mại), Toxiproxy để giả lập lỗi mạng trong test. Điều kiện tiên quyết: observability tốt (bài 16) và văn hoá postmortem không đổ lỗi — chaos mà không có monitoring thì chỉ là phá đồ.

---

## 12. Checklist review độ tin cậy và các anti-pattern

Những câu một kiến trúc sư senior sẽ hỏi với bất kỳ thiết kế nào:

| Khía cạnh | Câu hỏi |
|---|---|
| SPOF | Thành phần nào hỏng là kéo sập tất cả? |
| Miền lỗi | Có sống sót khi mất một instance? Một AZ? Một lần deploy lỗi? |
| State | Kill ngay bây giờ một instance bất kỳ có ảnh hưởng người dùng không? |
| Health check | Dependency chập chờn có khiến cả fleet bị đánh dấu unhealthy không? |
| Dependency | Mọi lời gọi đã có timeout, retry có giới hạn kèm jitter, và fallback chưa? |
| Quá tải | Ở mức 3× peak thì sao — từ chối êm hay sụp đổ? Mọi queue đã có giới hạn chưa? |
| Dữ liệu | RPO và RTO là bao nhiêu, lần cuối test restore là khi nào? |
| Kiểm chứng | Điều nào ở trên đã được chứng minh bằng test, game day hay sự cố thật? |

**Các anti-pattern cần gọi tên khi review:** tầng app "high availability" đứng trước một database duy nhất; retry ở mọi tầng; queue và thread pool không giới hạn; deep health check; failover chưa bao giờ được diễn tập; coi autoscaling là kế hoạch duy nhất cho quá tải; region DR dùng chung account/credential với production; và cho rằng các replica độc lập trong khi chúng dùng chung config, code và thời điểm deploy.

---

## Điểm cần nhớ khi phỏng vấn

- **Scale dọc** đơn giản nhưng có trần và vẫn là SPOF; **scale ngang** cần service **stateless** — chuyển session, file và job ra store dùng chung.
- Health check nên **nông**; deep check có thể loại cả fleet khi dependency chập chờn. Drain kết nối khi nhận `SIGTERM`.
- **Nối tiếp thì availability nhân xuống, dự phòng song song thì nhân unavailability** — và chỉ có ích khi các sự cố độc lập.
- Thiết kế theo **miền lỗi**: multi-AZ là mặc định, multi-region chỉ khi RTO/RPO hoặc độ trễ toàn cầu xứng đáng với replication bất đồng bộ và độ phức tạp của nó. Hướng tới **static stability** (cấp sẵn năng lực, ví dụ 150% trên 3 AZ).
- **RPO = mất dữ liệu, RTO = thời gian ngừng.** Backup & restore → pilot light → warm standby → active-active: chi phí tăng khi cả hai giảm. Test restore; bảo vệ trước hỏng dữ liệu logic.
- Chặn lỗi dây chuyền: **timeout ở mọi nơi, retry ở một tầng với exponential backoff + jitter**, retry budget, suy giảm có kiểm soát cho tính năng tuỳ chọn.
- **Mọi queue phải có giới hạn.** Dùng backpressure và **load shedding** (trả nhanh `503`/`429` + `Retry-After`, có ưu tiên) thay vì nhận việc không làm xong.
- Độ trễ tăng theo `1/(1 - utilisation)`: lên kế hoạch với mức sử dụng mục tiêu ~60–70% cộng headroom cho miền lỗi và lead time cấp phát.
- **Chaos engineering** = giả thuyết + metric nghiệp vụ ở trạng thái ổn định + blast radius nhỏ + điều kiện dừng.

## Tóm tắt

- Scalability, availability và reliability là các thuộc tính khác nhau; hãy chốt nghiệp vụ cần mấy số 9 trước khi thiết kế.
- Service stateless phía sau load balancer có health check là nền móng của scale ngang và phục hồi nhanh.
- Dự phòng trên các miền lỗi độc lập loại bỏ SPOF; phép tính availability cho thấy vì sao dependency nối tiếp gây hại.
- RTO và RPO quyết định chiến lược DR, và chỉ restore hay failover đã được kiểm thử mới đáng tin.
- Timeout, retry cẩn trọng, suy giảm có kiểm soát, backpressure và load shedding ngăn một thành phần chậm kéo sập cả hệ thống.
- Hoạch định năng lực, autoscaling hợp lý và chaos experiment biến độ tin cậy từ hy vọng thành thứ đo đếm được.
