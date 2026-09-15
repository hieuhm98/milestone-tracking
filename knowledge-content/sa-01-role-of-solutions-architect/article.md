# Vai trò của Solutions Architect

## 1. Solutions Architect thực sự làm gì

**Kiến trúc sư giải pháp** (Solutions Architect – SA) biến một bài toán kinh doanh thành một giải pháp kỹ thuật có thể xây được, vận hành được và trả tiền được — rồi đảm bảo những người phải xây, vận hành và trả tiền cho nó hiểu và đồng ý với nó. Công việc này ít là "vẽ các ô vuông" mà nhiều hơn là "quyết định ô nào, và bảo vệ được vì sao".

Một tuần làm việc điển hình chạm tới tất cả những việc sau:

- **Khám phá** (discovery) — tìm ra vấn đề thật, mục tiêu, ràng buộc và thế nào là thành công, bằng con số.
- **Thiết kế và đánh đổi** (trade-off) — chọn các khối xây dựng (service, kho dữ liệu, kiểu tích hợp, nơi chạy) và so sánh phương án theo chi phí, rủi ro, thời gian ra thị trường và thuộc tính chất lượng.
- **Tài liệu hoá** — sơ đồ và hồ sơ quyết định sống lâu hơn cuộc họp.
- **Quản trị** (governance) — kiểm tra thứ được xây vẫn khớp thiết kế, và sửa thiết kế khi thực tế nói khác.
- **Giao tiếp** — giải thích một giải pháp cho CFO, người phụ trách bảo mật và developer theo ba cách khác nhau.

Chữ "giải pháp" rất quan trọng: SA chịu trách nhiệm đầu-cuối cho một giải pháp (một sản phẩm, một đợt migration, một tích hợp), thường trải qua nhiều hệ thống và nhiều đội. Ở AWS, "Solutions Architect" còn là một chức danh làm việc trực tiếp với khách hàng — kiến trúc sư pre-sales hoặc partner thiết kế thay cho khách — nên khi phỏng vấn hãy nói rõ bạn đang nói tới loại nào.

---

## 2. SA khác gì software, enterprise và cloud architect

Các chức danh chồng lấn nhau và mỗi công ty dùng một kiểu, nhưng cách phân biệt hữu ích nhất là **phạm vi** (scope) — tầm nhìn rộng tới đâu và đi sâu vào code tới mức nào.

| Vai trò | Phạm vi | Câu hỏi chính | Sản phẩm điển hình |
|---|---|---|---|
| **Software architect** | Một ứng dụng hoặc một codebase | "Bên trong hệ thống này được tổ chức ra sao?" | Ranh giới module, pattern, quy ước code, sơ đồ component |
| **Solutions Architect** | Một giải pháp trải qua nhiều hệ thống | "Những hệ thống nào, tích hợp ra sao, đáp ứng được yêu cầu này?" | Solution design, sơ đồ C4 context/container, ADR, ước lượng |
| **Enterprise architect** | Toàn bộ danh mục hệ thống của tổ chức | "Công ty nên có những năng lực và nền tảng nào trong 3–5 năm tới?" | Capability map, roadmap, tiêu chuẩn, framework như TOGAF |
| **Cloud architect** | Chính nền tảng cloud | "Chạy workload trên cloud sao cho an toàn và tiết kiệm?" | Landing zone, cấu trúc account/network, guardrail, module IaC |

Enterprise nhìn rộng nhất, software đi sâu nhất, SA ở giữa; còn cloud architect sở hữu nền tảng mà mọi giải pháp chạy lên. SA nhận tiêu chuẩn từ enterprise architect, guardrail từ cloud architect, và giao phần thiết kế bên trong cho software architect hoặc tech lead. Ở công ty nhỏ, một người đội cả bốn chiếc mũ.

---

## 3. Yêu cầu: functional, non-functional và ràng buộc

Kiến trúc bắt đầu từ yêu cầu, và kỹ năng đầu tiên là phân loại chúng.

- **Yêu cầu chức năng** (functional requirement – FR) — hệ thống *làm gì*: "Khách hàng đặt được đơn hàng", "Gửi email hoá đơn sau khi thanh toán". Chúng mô tả hành vi và thường được ghi dưới dạng user story hoặc use case.
- **Yêu cầu phi chức năng** (non-functional requirement – NFR) — hệ thống làm việc đó *tốt tới mức nào*: "Độ trễ p95 của checkout dưới 300 ms ở mức 2.000 request/s", "Mất tối đa 5 phút dữ liệu khi một region sập". NFR định hình kiến trúc mạnh hơn FR rất nhiều.
- **Ràng buộc** (constraint) — những quyết định đã được đưa ra sẵn, không thương lượng được trong dự án này: "Phải chạy trên AWS organization hiện có", "Dữ liệu khách hàng EU phải nằm ở EU", "Đội biết Java, không biết Go", "Go-live trước Black Friday".
- **Giả định** (assumption) — điều bạn tin nhưng chưa kiểm chứng: "Traffic tăng 20% mỗi năm". Hãy ghi lại; một giả định sai chính là một rủi ro.

Hai lỗi kinh điển: thu thập năm mươi FR mà không có NFR nào (hệ thống chạy tốt khi demo và sập khi lên production), và coi một ràng buộc như yêu cầu có thể đánh đổi. Gần như mọi phạm vi chức năng đều làm được bằng một monolith đơn giản; chính NFR — quy mô, tính sẵn sàng, độ trễ, bảo mật, tuân thủ — mới buộc ta phải phân tán, cache, replicate và tốn tiền.

---

## 4. Thuộc tính chất lượng và cách đo được chúng

NFR được gom thành các **thuộc tính chất lượng** (quality attributes, hay "các -ility"). Những thuộc tính phổ biến:

| Thuộc tính | Trả lời câu hỏi | Ví dụ thước đo |
|---|---|---|
| Performance (hiệu năng) | Nhanh tới đâu khi có tải? | Độ trễ p95/p99, throughput |
| Scalability (khả năng mở rộng) | Tăng tải bằng cách thêm tài nguyên được không? | RPS tối đa trước khi độ trễ xấu đi |
| Availability (tính sẵn sàng) | Có chạy khi cần không? | Uptime 99,9% mỗi tháng |
| Reliability / durability | Có mất hoặc hỏng dữ liệu không? | RPO, RTO |
| Security (bảo mật) | Ai được làm gì; dữ liệu có được bảo vệ? | Kết quả pen-test, độ phủ mã hoá |
| Maintainability (dễ bảo trì) | Thay đổi rẻ tới đâu? | Lead time cho một thay đổi điển hình |
| Cost efficiency (hiệu quả chi phí) | Tốn bao nhiêu cho mỗi đơn vị giá trị? | Chi phí trên 1.000 đơn hàng |

ISO/IEC 25010 là danh mục chuẩn; sáu trụ cột của AWS Well-Architected là phiên bản mang màu sắc cloud.

"Hệ thống phải nhanh và sẵn sàng cao" không phải là yêu cầu — không ai kiểm thử được nó. Hãy viết lại thành một **kịch bản thuộc tính chất lượng** (quality attribute scenario, từ SEI):

```text
Source:            customers on mobile
Stimulus:          submit checkout
Environment:       Black Friday peak, 3,000 requests/s
Artifact:          checkout API
Response:          order accepted and confirmed
Response measure:  p95 < 400 ms, error rate < 0.1%
```

Cũng hãy quy đổi mục tiêu availability ra thời gian downtime, vì các bên liên quan cảm nhận được phút, không cảm nhận được "số 9":

| Availability | Downtime mỗi năm | Downtime mỗi tháng 30 ngày |
|---|---|---|
| 99% | ~3,65 ngày | ~7,2 giờ |
| 99,9% | ~8,76 giờ | ~43,2 phút |
| 99,95% | ~4,38 giờ | ~21,6 phút |
| 99,99% | ~52,6 phút | ~4,3 phút |
| 99,999% | ~5,26 phút | ~26 giây |

Mỗi số 9 thêm vào thường có nghĩa là thêm một bậc chi phí và độ phức tạp (multi-AZ, rồi multi-region, rồi failover tự động không cần con người can thiệp).

---

## 5. Tư duy đánh đổi

Định luật thứ nhất của kiến trúc phần mềm (Richards & Ford): **mọi thứ đều là đánh đổi**. Nếu bạn nghĩ mình đã tìm được phương án không có nhược điểm, nghĩa là bạn chưa tìm ra nhược điểm đó. Giá trị của kiến trúc sư là gọi tên sự đánh đổi một cách rõ ràng, chứ không phải giả vờ nó không tồn tại.

Những thế giằng co lặp đi lặp lại:

| Bạn được | Thường phải trả bằng |
|---|---|
| Availability (replica, multi-region) | Chi phí, độ phức tạp về tính nhất quán |
| Nhất quán mạnh (strong consistency) | Độ trễ, availability khi mạng bị chia cắt |
| Microservices deploy độc lập | Độ phức tạp vận hành, lỗi mạng, dữ liệu phân tán |
| Cache để tăng hiệu năng | Dữ liệu cũ (stale), bug khi invalidate |
| Managed service (nhanh, ít vận hành) | Ít quyền kiểm soát, vendor lock-in, đơn giá cao khi quy mô lớn |

Kỹ thuật thực hành:

- **So sánh ít nhất hai phương án thật** (cộng thêm "không làm gì") theo các tiêu chí có trọng số lấy từ NFR — không phải theo sở thích cá nhân.
- **Tách "cửa một chiều" và "cửa hai chiều"** (one-way vs two-way doors). Quyết định đảo ngược được (thư viện logging, cỡ instance) nên quyết nhanh. Quyết định không đảo ngược được hoặc đảo ngược rất đắt (mô hình dữ liệu chính, database engine cho dữ liệu lõi, hợp đồng API công khai, nhà cung cấp cloud) xứng đáng có prototype và review.
- **Tìm sensitivity point và trade-off point**, theo cách gọi của phương pháp ATAM của SEI: một tham số ảnh hưởng mạnh tới một thuộc tính (sensitivity point) hoặc tới nhiều thuộc tính theo hướng ngược nhau (trade-off point) — ví dụ replication factor cùng lúc ảnh hưởng tới độ bền dữ liệu, độ trễ ghi và chi phí.

Bối cảnh quyết định tất cả. "Microservices tốt hơn" không bao giờ là câu trả lời; "với một đội 4 người làm MVP trong 3 tháng, chọn modular monolith trên managed service, vì deploy độc lập giữa các đội chưa phải vấn đề chúng ta đang có" mới là câu trả lời.

---

## 6. Quy trình kiến trúc: từ khám phá tới tiến hoá

Kiến trúc là một vòng lặp, không phải một giai đoạn kết thúc khi bắt đầu viết code.

```text
 1. Understand     business drivers, stakeholders, FR/NFR, constraints
        |
 2. Explore        2-3 candidate designs, spikes/prototypes for unknowns
        |
 3. Decide         trade-off analysis -> ADR per significant decision
        |
 4. Communicate    C4 diagrams, design doc, review with stakeholders
        |
 5. Guide build    pairing with tech leads, reviews, fitness checks
        |
 6. Evolve         measure in production, revisit assumptions -> back to 1
```

SA có kinh nghiệm làm gì ở mỗi bước:

- **Hiểu:** hỏi "chuyện gì xảy ra nếu ta không làm gì?" và "làm sao biết việc này thành công?". Lấy con số: người dùng, tăng trưởng, đỉnh tải, khối lượng dữ liệu, ngân sách, hạn chót.
- **Khám phá:** làm các **spike** (thử nghiệm ngắn có giới hạn thời gian) cho những ẩn số rủi ro nhất (rate limit của API bên thứ ba, database ở lưu lượng ghi của bạn) thay vì tranh luận.
- **Quyết định** ở đúng tầng: không phải tên class, mà là kiểu tích hợp và ai sở hữu dữ liệu nào.
- **Dẫn dắt:** ở gần quá trình xây dựng — kiến trúc sư biến mất sau khi nộp tài liệu sẽ tạo ra thiết kế "tháp ngà" (ivory tower) mà đội lặng lẽ bỏ qua.
- **Tiến hoá:** các **fitness function** tự động (test độ trễ trong CI, luật làm build fail nếu UI gọi thẳng database) giữ kiến trúc không bị xói mòn.

Checklist **design review**: NFR có con số; các phương án đã cân nhắc; chế độ lỗi (nếu từng dependency chậm hoặc chết thì sao?); bảo mật và phân loại dữ liệu; chi phí; khả năng vận hành (log, metric, alert, runbook); kế hoạch migration và rollback.

---

## 7. Architecture Decision Record (ADR)

Code cho thấy *cái gì* đã được xây; nó gần như không bao giờ cho thấy *vì sao*. **Hồ sơ quyết định kiến trúc** (Architecture Decision Record – ADR) là một tài liệu ngắn ghi lại một quyết định quan trọng về kiến trúc, bối cảnh và hệ quả của nó. Định dạng gọn nhẹ được dùng rộng rãi nhất đến từ Michael Nygard (2011).

```text
ADR-0003: Use Kafka for order events

Status:  Superseded by ADR-0004
Date:    2025-03-12

Context:
  Five downstream services need order events; two need replay of the
  last 7 days. Peak is 1,500 events/s. The team already runs Kafka
  for analytics.

Decision:
  Publish order events to a Kafka topic partitioned by order ID.

Consequences:
  + Consumers can replay; ordering is kept per order.
  - We operate brokers and must monitor consumer lag.
  - Exactly-once end to end is NOT provided; consumers must be idempotent.
```

Trong file thật, các mục này là heading Markdown (Title, Status, Context, Decision, Consequences); nhiều đội thêm mục "Options considered" (các phương án đã cân nhắc).

Những quy tắc làm ADR thực sự có ích:

- **Mỗi hồ sơ một quyết định**, tối đa một hai trang.
- **Vòng đời trạng thái:** proposed → accepted → deprecated hoặc superseded. ADR đã accepted là **bất biến** (immutable): khi quyết định thay đổi, viết ADR mới thay thế (supersede) cái cũ và liên kết hai chiều — *vì sao ta đổi ý* chính là phần giá trị.
- **Phần hệ quả có cả mặt tiêu cực** — ta từ bỏ điều gì, chấp nhận rủi ro nào.
- **Lưu cạnh code** (ví dụ `docs/adr/0003-use-kafka-for-order-events.md`) và review trong pull request.
- Chỉ ghi quyết định **có ý nghĩa kiến trúc**: đảo ngược tốn kém, ảnh hưởng NFR, hoặc vượt ranh giới giữa các đội.

---

## 8. Mô hình C4: context và container

Sơ đồ ô-và-đường thường thất bại vì không ai biết một ô nghĩa là gì. **Mô hình C4** (Simon Brown) sửa điều đó bằng bốn mức phóng to, giống như bản đồ:

| Mức | Thể hiện | Người xem |
|---|---|---|
| 1. System Context | Hệ thống của bạn là một ô, cùng người dùng và các hệ thống bên ngoài nó giao tiếp | Tất cả mọi người, kể cả người không làm kỹ thuật |
| 2. Container | Các đơn vị chạy/deploy riêng rẽ bên trong: web app, API, database, queue | Kiến trúc sư, developer, ops |
| 3. Component | Các thành phần chính bên trong một container | Developer của container đó |
| 4. Code | Class/bảng — thường do IDE sinh ra, hiếm khi vẽ tay | Developer, nếu cần |

Một **container** trong C4 là *bất cứ thứ gì chạy hoặc lưu dữ liệu một cách riêng rẽ*: single-page app, mobile app, backend API, database, blob store, serverless function. Khái niệm này có trước Docker và không có nghĩa là Docker container.

```text
LEVEL 1 - SYSTEM CONTEXT

   [Customer]                         [Support agent]
   (person)                           (person)
       |  places orders using              |  looks up orders using
       v                                   v
  +-----------------------------------------------+
  |           Online Shop (software system)       |
  +-----------------------------------------------+
       |  takes payments via        |  sends emails via
       v                            v
  [Payment provider]          [Email service]
  (external system)           (external system)
```

```text
LEVEL 2 - CONTAINERS (inside Online Shop)

 [Customer] --HTTPS--> [Web SPA: React] --JSON/HTTPS--> [Order API: Java]
                                                          |        |
                                        reads/writes SQL  |        | publishes
                                                          v        v OrderPlaced
                                              [Orders DB:     [Message queue]
                                               PostgreSQL]         |
                                                                   v
                                                   [Notification worker] --> [Email service]
```

Phần lớn các buổi review giải pháp diễn ra ở mức 1 và 2. Trên AWS, container ánh xạ tự nhiên sang những thứ như SPA trên CloudFront + S3, một ECS service hoặc Lambda function, một database RDS và một hàng đợi SQS — nhưng hãy vẽ container logic trước, icon AWS sau.

---

## 9. C4 trong thực tế: component, sơ đồ bổ trợ và ký hiệu

**Mức 3** phóng vào một container: ví dụ bên trong Order API có `CheckoutController`, `PricingService`, adapter `PaymentGateway` và `OrderRepository`. Chỉ vẽ mức này cho những container phức tạp hoặc đang gây tranh cãi; nó lỗi thời rất nhanh.

C4 còn có các **sơ đồ bổ trợ** (supplementary diagrams):

- **System landscape** — nhiều hệ thống của tổ chức đặt cạnh nhau (nơi góc nhìn enterprise và solution gặp nhau).
- **Dynamic** — các tương tác được đánh số cho một kịch bản, ví dụ "khách hàng đặt đơn".
- **Deployment** — container được đặt lên hạ tầng thế nào: region, AZ, cluster, instance.

Quy tắc ký hiệu giúp mọi sơ đồ dễ đọc:

- Mỗi sơ đồ có **tiêu đề** và **chú giải** (key/legend).
- Mỗi ô ghi **tên, loại và công nghệ**: "Order API — container — Java/Spring Boot".
- Mỗi mũi tên **một chiều và có nhãn** mô tả mục đích, và từ mức 2 trở đi ghi cả giao thức: "publishes OrderPlaced [AMQP]". Một đường không nhãn là một phỏng đoán.
- **Mỗi sơ đồ một mức trừu tượng** — đừng trộn class với hệ thống bên ngoài trong cùng một hình.
- Ưu tiên **diagrams as code** (Structurizr DSL, PlantUML với macro C4, hoặc tương tự) để sơ đồ nằm trong Git và được review như code.

---

## 10. Giao tiếp với các bên liên quan

Một thiết kế đúng mà không ai ủng hộ thì sẽ không được xây. Hãy phân loại **các bên liên quan** (stakeholder) theo mối quan tâm và nói đúng vào mối quan tâm đó:

| Bên liên quan | Quan tâm | Đưa cho họ |
|---|---|---|
| Lãnh đạo / nhà tài trợ | Kết quả, chi phí, rủi ro, tiến độ | Một trang: vấn đề, phương án, khuyến nghị, khoảng chi phí, rủi ro |
| Product owner | Tính năng, thời gian ra thị trường | Cái gì ra lúc nào, đánh đổi điều gì |
| Bảo mật / tuân thủ | Bảo vệ dữ liệu, audit | Luồng dữ liệu, phân loại dữ liệu, các biện pháp kiểm soát |
| Vận hành / SRE | Có chạy nổi lúc 3 giờ sáng không? | Góc nhìn deployment, monitoring, runbook, chế độ lỗi |
| Developer | Rõ ràng, tự chủ, khả thi | Sơ đồ container/component, ADR, interface |

Những thói quen hiệu quả:

- **Kết luận trước** (bottom line up front). Mở đầu bằng khuyến nghị cùng chi phí/rủi ro; chi tiết để sau cho ai muốn đào sâu.
- **Trình bày các phương án, không phải một đáp án duy nhất.** Hai ba phương án kèm đánh đổi và một khuyến nghị tạo được niềm tin; một phương án duy nhất trông như việc đã rồi.
- **Nói bằng hệ quả, không bằng công nghệ.** Không phải "chúng ta cần Kafka", mà là "năm đội có thể phản ứng với đơn hàng mà đội order không phải sửa code".
- **Gây ảnh hưởng mà không cần quyền lực** (influence without authority). Kiến trúc sư hiếm khi quản lý đội xây dựng. Khi developer phản đối, hãy lắng nghe — có thể họ biết điều bạn không biết — rồi giải quyết bằng một spike và ghi kết quả vào ADR.

---

## 11. Những con số ước lượng nhanh mọi kiến trúc sư cần biết

**Ước lượng nhanh** (back-of-the-envelope estimation) quan tâm tới **bậc độ lớn** (order of magnitude), không phải độ chính xác. Mục tiêu là trong năm phút biết được bạn cần một server hay một trăm, gigabyte hay petabyte.

**Thời gian và tốc độ**

- 1 ngày = 86.400 s ≈ **10⁵ s** để tính nhẩm.
- 1 triệu request/ngày ≈ **12 request/s** trung bình (1.000.000 / 86.400 ≈ 11,6).
- 100 triệu/ngày ≈ 1.160/s. Lên kế hoạch cho **đỉnh ≈ 2–5 lần trung bình** tuỳ hình dạng traffic.

**Kích thước:** dùng luỹ thừa của 10 — KB 10³, MB 10⁶, GB 10⁹, TB 10¹², PB 10¹⁵ byte. Một bản ghi JSON ngắn ~1 KB, một bức ảnh đã nén ~1 MB.

**Thang độ trễ** (bậc độ lớn; giá trị chính xác tuỳ phần cứng)

```text
CPU L1 cache reference              ~1 ns
Main memory (RAM) reference         ~100 ns
SSD random read                     ~0.1 ms  (100 us)
Round trip within one data centre   ~0.5 ms
Disk (HDD) seek                     ~10 ms
Round trip same continent           ~20-50 ms
Round trip across the Atlantic      ~70-100 ms
Round trip US <-> Asia              ~150-200 ms
```

Bài học từ cái thang này: bộ nhớ nhanh hơn một lần đọc SSD khoảng một nghìn lần, một hop mạng trong data centre tốn cỡ vài lần đọc SSD, và **không gì thắng được vật lý khi vượt đại dương** — đó là lý do CDN và triển khai theo region tồn tại.

**Availability tổng hợp**

- Các thành phần **nối tiếp** (tất cả phải chạy): nhân lại. Ba dependency, mỗi cái 99,9% → 0,999³ ≈ **99,7%**.
- Các thành phần **song song** (chỉ cần một cái chạy): 1 − (xác suất tất cả cùng hỏng). Hai replica độc lập, mỗi cái 99% → 1 − 0,01² = **99,99%**.

Đó là lý do một chuỗi dài các lời gọi đồng bộ làm giảm availability, còn dư thừa (redundancy) làm tăng nó — với điều kiện các lỗi thực sự độc lập với nhau.

---

## 12. Ví dụ ước lượng năng lực hoàn chỉnh

**Tình huống:** tính năng chia sẻ ảnh. 20 triệu người dùng hoạt động hằng ngày (DAU). Mỗi người xem khoảng 50 mục mỗi ngày và đăng 1 mục mỗi ngày. 10% bài đăng có ảnh ~500 KB; mọi bài đăng có ~1 KB metadata. Giữ dữ liệu 5 năm.

Viết giả định ra trước, rồi tính với số tròn:

```text
WRITES   20M posts/day / 10^5 s      ~ 200/s avg (exact ~231), peak x3 ~ 700/s
READS    20M x 50 = 1B views/day     ~ 10,000/s avg (exact ~11,600), peak ~ 35,000/s
         read:write = 50:1           -> read-heavy: CDN + cache + read replicas
STORAGE  metadata 20M x 1 KB         = 20 GB/day
         photos    2M x 500 KB       = 1 TB/day -> ~370 TB/year -> ~1.9 PB in 5 years
CACHE    20% of 20 GB (80/20 rule)   ~ 4 GB RAM, small cluster for HA
SERVERS  assume ~2,000 req/s each    35,000 / 2,000 ~ 18 -> +headroom, N+1 -> ~25
```

Những con số nói lên điều gì:

- **Tỉ lệ đọc/ghi 50:1** định hình thiết kế: CDN cho ảnh, cache cho metadata nóng, read replica.
- **Hàng petabyte ảnh** phải vào object storage (kiểu S3); chỉ metadata vào database.
- **Năng lực mỗi instance là giả định** — nói rõ và đề xuất load test để đo thật.
- Sai 2–3 lần là đủ tốt; sai 1.000 lần (nhầm MB với GB, mỗi ngày với mỗi giây) mới là lỗi người phỏng vấn tìm kiếm.

---

## Điểm cần nhớ khi phỏng vấn

- SA sở hữu **một giải pháp trải qua nhiều hệ thống**; software architect đi sâu vào một hệ thống, enterprise architect nhìn rộng toàn danh mục, cloud architect sở hữu nền tảng.
- **NFR định hình kiến trúc.** Tách yêu cầu khỏi **ràng buộc** (cố định) và **giả định** (rủi ro chưa kiểm chứng).
- Làm thuộc tính chất lượng **đo được** bằng kịch bản; quy đổi số 9 ra downtime (99,9% ≈ 43 phút/tháng, 99,99% ≈ 52 phút/năm).
- **Mọi thứ đều là đánh đổi.** So sánh phương án thật theo NFR có trọng số; chỉ chậm lại với cửa một chiều.
- **ADR**: context, decision, consequences (kể cả mặt tiêu cực); bất biến khi đã accepted; thay đổi là một ADR mới supersede cái cũ.
- **C4**: context → container → component → code; container trong C4 là đơn vị chạy/deploy, không phải Docker container. Gắn nhãn mọi mũi tên.
- Giao tiếp theo người nghe: kết luận trước, nhiều phương án kèm khuyến nghị, dùng spike để giải quyết bất đồng.
- Ước lượng: 1 ngày ≈ 10⁵ s, 1 triệu/ngày ≈ 12/s, đỉnh 2–5 lần trung bình; availability nối tiếp thì nhân lại.

## Tóm tắt

- Solutions Architect là cầu nối giữa mục tiêu kinh doanh và việc hiện thực kỹ thuật, và được đánh giá bằng việc giải pháp có được xây, chạy được và đạt mục tiêu hay không — không phải bằng vẻ đẹp của sơ đồ.
- Yêu cầu có ba loại — functional, non-functional, ràng buộc — cộng thêm các giả định cần được theo dõi như rủi ro.
- Thuộc tính chất lượng chỉ hữu ích khi đo được; phần trăm availability luôn nên được quy đổi ra downtime cho phép.
- Kiến trúc tốt là phân tích đánh đổi rõ ràng trong bối cảnh cụ thể, được ghi lại bằng ADR để *lý do* còn sống sót.
- Mô hình C4 cho sơ đồ một ý nghĩa chung nhờ các mức phóng to và ký hiệu chặt chẽ.
- Ước lượng nhanh theo bậc độ lớn cho bạn biết sớm một thiết kế có đúng "hạng cân" về tải, dung lượng và chi phí hay không.
