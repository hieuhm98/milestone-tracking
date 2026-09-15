# Observability – Log, Metric, Trace & SLO

## 1. Monitoring và observability

**Giám sát** (monitoring) trả lời những câu hỏi bạn đã biết trước để hỏi: "CPU có vượt 90% không?", "tỉ lệ lỗi có trên 1% không?". Nó rất tốt cho các kiểu hỏng *đã biết*. **Khả năng quan sát** (observability) là một thuộc tính của hệ thống: bạn hiểu được trạng thái bên trong của nó tốt đến đâu chỉ từ dữ liệu nó phát ra — kể cả những lỗi không ai lường trước. "Vì sao chỉ người dùng Android bản app 4.2 bị checkout chậm từ 14:05?" không phải một dashboard bạn dựng sẵn; bạn cần dữ liệu **telemetry** phong phú để cắt lát sau khi sự việc đã xảy ra.

| | Monitoring | Observability |
|---|---|---|
| Kiểu câu hỏi | Định sẵn ("X có hỏng không?") | Mở ("vì sao X hỏng với nhóm người dùng này?") |
| Đầu ra điển hình | Dashboard, cảnh báo theo ngưỡng | Truy vấn tuỳ ý, khám phá trace |
| Dạng dữ liệu | Đã gộp, cardinality thấp | Chi tiết, cardinality cao, liên kết theo ngữ cảnh |

Hai khái niệm không đối lập: monitoring là việc bạn *làm* trên một hệ thống quan sát được. Với một server, bạn có thể SSH vào đọc log; với 40 microservice và pod tự co giãn, một request đi qua cả chục process mà có thể giờ đã không còn tồn tại. Vì vậy observability là mối quan tâm của kiến trúc, không chỉ của đội vận hành.

---

## 2. Ba trụ cột: log, metric, trace

| Tín hiệu | Là gì | Điểm mạnh | Điểm yếu |
|---|---|---|---|
| **Log** | Bản ghi có timestamp của từng sự kiện rời rạc | Đầy đủ chi tiết cho một sự kiện | Tốn kém để lưu và tìm khi khối lượng lớn |
| **Metric** | Con số được gộp theo thời gian | Rẻ, truy vấn nhanh; lý tưởng cho cảnh báo và xu hướng | Mất chi tiết từng request |
| **Trace** | Đường đi của một request qua các service, dạng cây span | Chỉ ra thời gian và lỗi nằm *ở đâu* | Cần truyền ngữ cảnh; thường bị lấy mẫu |

Một cuộc điều tra điển hình đi qua cả ba: cảnh báo **metric** bật (p99 tăng), **trace** cho thấy span chậm là payment-svc gọi database, và **log** của trace ID đó ghi lỗi lock timeout. Giá trị nằm ở việc **liên kết** chúng — trace ID trong log, exemplar trên metric, cùng một bộ nhãn `service`/`env` ở mọi nơi. Hãy phủ thêm **sự kiện** (deploy, bật/tắt feature flag) lên dashboard: phần lớn sự cố bắt đầu từ một thay đổi.

**Cardinality** — số tổ hợp nhãn (label) khác nhau của một metric — là thứ hay "cắn" kiến trúc sư nhất. `http_requests_total{method, status, route}` với 5 × 10 × 50 giá trị là 2.500 series: ổn. Thêm `user_id` với một triệu người dùng và backend metric sẽ sập. Chi tiết cardinality cao thuộc về log và trace, không bao giờ thuộc về nhãn metric.

---

## 3. Structured logging & correlation ID

Log dạng văn bản thuần (`User 42 failed to pay`) dành cho người đọc bằng `grep`. Ở quy mô lớn, hãy ghi **log có cấu trúc** (structured log) — mỗi dòng một object JSON với tên trường nhất quán:

```json
{"ts":"2026-09-14T08:15:02.317Z","level":"error","service":"payment-api","trace_id":"4bf92f3577b34da6a3ce929d0e0e4736","route":"POST /payments","duration_ms":1840,"error":"card_declined","msg":"payment failed"}
```

**Mã tương quan** (correlation ID) được tạo ở biên (gateway hoặc service đầu tiên), truyền theo mọi lời gọi xuôi dòng (HTTP header, thuộc tính message) và ghi vào mọi dòng log. Khi dùng OpenTelemetry, **trace ID** đảm nhận vai trò này. Trong Node.js, `AsyncLocalStorage` giúp mọi lời gọi log đều lấy được nó:

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

Các quy tắc cần áp dụng:

- **Ghi log ra stdout** trong container; một agent (Fluent Bit, Vector, OTel Collector) lo việc chuyển log đi.
- **Level phải có ý nghĩa**: `error` = có thể cần người xử lý; `warn` = suy giảm nhưng đã xử lý được; `debug` tắt ở production.
- **Không bao giờ log secret hay PII thô**; che (redact) ngay tại nguồn.
- **Kiểm soát khối lượng**: lấy mẫu log thành công ồn ào, giữ mọi lỗi, phân tầng thời gian lưu (nóng vài ngày, lưu trữ lạnh).

Các stack: ELK/OpenSearch (đánh chỉ mục full-text, mạnh nhưng đắt) vs **Grafana Loki** (chỉ đánh chỉ mục nhãn, lưu chunk trong object storage — rẻ hơn nhiều, tìm văn bản tự do chậm hơn). Trên AWS: CloudWatch Logs + Logs Insights.

---

## 4. Metric và các loại metric

Một metric là một **chuỗi thời gian** (time series): tên + nhãn + các mẫu (timestamp, giá trị).

| Loại | Hành vi | Ví dụ | Truy vấn bằng |
|---|---|---|---|
| **Counter** | Chỉ tăng; về 0 khi process khởi động lại | số request, lỗi, byte gửi | `rate()` / `increase()` |
| **Gauge** | Tăng và giảm | bộ nhớ, độ sâu hàng đợi, số kết nối | giá trị thô, `max`, `avg` |
| **Histogram** | Đếm các quan sát vào bucket + `_sum`, `_count` | thời gian xử lý request | `histogram_quantile()` |
| **Summary** | Quantile tính sẵn ở client | thời gian xử lý trong một process | đọc trực tiếp |

Chi tiết đáng nêu khi review: **quantile của summary không gộp được** — lấy trung bình p99 của 20 pod không ra p99 của cả cụm. Bucket của histogram thì *cộng được* qua các instance trước khi tính quantile, nên hãy ưu tiên histogram. Độ chính xác phụ thuộc ranh giới bucket, vì vậy đặt bucket quanh ngưỡng SLO (ví dụ 0.1, 0.25, 0.5, 1, 2.5 s).

Đừng dừng ở độ trễ trung bình: trung bình 120 ms có thể che giấu p99 4 s đang rơi vào đúng những khách hàng lớn nhất.

---

## 5. Prometheus và mô hình pull

**Prometheus** (dự án CNCF đã graduated) là hệ thống metric mã nguồn mở tiêu chuẩn. Nó **kéo** (pull): server định kỳ scrape endpoint `/metrics` qua HTTP của từng target và lưu mẫu vào TSDB cục bộ.

```text
 service discovery          +------ Prometheus (:9090) ------+
 (k8s API, EC2, Consul) --> | scrape -> TSDB -> PromQL/rules |--> Alertmanager (:9093) --> Slack/PagerDuty
                            +---------------+----------------+--> Grafana (:3000)
                                            | GET /metrics every 15-60 s
               +----------------------------+---------------------------+
               v                            v                           v
        app pods (/metrics)        node_exporter (:9100)       kube-state-metrics
```

Vì sao pull? Một lần scrape thất bại đặt **`up == 0`**, nên kiểm tra sống/chết có sẵn miễn phí; **service discovery** quyết định cần giám sát gì, target không cần biết server ở đâu; và bạn có thể cho Prometheus thứ hai scrape cùng target để có HA. Pull gặp khó với **batch job chạy ngắn** (chỉ dùng **Pushgateway**, cổng 9091, cho trường hợp này) và target nằm sau NAT. Phần mềm bên thứ ba được phủ bằng **exporter** (`node_exporter`, `postgres_exporter`, `blackbox_exporter` để thăm dò từ bên ngoài).

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

Thời gian lưu cục bộ mặc định là **15 ngày**, và một Prometheus đơn lẻ không chạy dạng cluster. Để lưu dài hạn, truy vấn toàn cục và HA, dùng `remote_write` sang **Thanos**, **Grafana Mimir** hoặc dịch vụ managed (trên AWS: Amazon Managed Service for Prometheus). Trên Kubernetes, Prometheus Operator (`ServiceMonitor`, `PrometheusRule`) là cách cài phổ biến.

---

## 6. PromQL cơ bản và alert rule

```text
# per-second request rate over 5 minutes
rate(http_requests_total{job="checkout"}[5m])

# 5xx error ratio per service
sum by (service) (rate(http_requests_total{status=~"5.."}[5m]))
  / sum by (service) (rate(http_requests_total[5m]))

# p99 latency per service
histogram_quantile(0.99, sum by (service, le) (rate(http_request_duration_seconds_bucket[5m])))
```

- `[5m]` tạo ra một **range vector**; nên để khoảng này ít nhất ~4 lần scrape interval.
- **`rate` trước, `sum` sau** — `rate()` xử lý việc counter bị reset trên từng series; cộng counter thô trước sẽ phá vỡ điều đó.
- Giữ `le` trong mệnh đề `by` khi dùng `histogram_quantile`, nếu không các bucket bị gộp mất.
- **Recording rule** tính trước các biểu thức nặng để dashboard và cảnh báo luôn nhanh.

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

`for: 10m` giữ cảnh báo ở trạng thái *pending* cho tới khi điều kiện đúng liên tục 10 phút, lọc bỏ các cú nháy ngắn. Sau đó **Alertmanager** loại trùng lặp, **gom nhóm** các cảnh báo liên quan, **định tuyến** theo nhãn (team, severity), hỗ trợ **silence** và **inhibition** (tắt tiếng cảnh báo pod khi "cluster down" đang bật).

---

## 7. Grafana và dashboard

**Grafana** không lưu telemetry; nó truy vấn các **data source** — Prometheus, Loki, Tempo/Jaeger, CloudWatch, SQL — và cho phép nhảy từ một đỉnh độ trễ sang exemplar trace rồi sang log của trace đó. (Stack "LGTM": Loki, Grafana, Tempo, Mimir. Trên AWS: Amazon Managed Grafana.)

Dashboard hữu ích lúc 3 giờ sáng:

- **Từ trên xuống**: trang tổng quan golden signals của service trước, trang đào sâu từng dependency sau.
- **Biến template** (`$service`, `$env`) thay vì 40 dashboard sao chép.
- **Hiển thị percentile kèm đường ngưỡng SLO**, và **đánh dấu (annotation) các lần deploy** trên trục thời gian.
- **Dashboard as code** trong Git, được provision tự động.

Dashboard dùng để chẩn đoán, không phải để phát hiện: nếu phải có người nhìn chằm chằm vào biểu đồ mới nhận ra sự cố, thì hệ thống cảnh báo đang thiếu.

---

## 8. Distributed tracing

**Truy vết phân tán** (distributed tracing): một **trace** là một cây các **span**; mỗi span là một đơn vị công việc (handler, câu truy vấn DB, publish message) với thời điểm bắt đầu, thời lượng, trạng thái, thuộc tính và ID của span cha.

```text
trace 4bf92f35...                                   time ->
GET /checkout (gateway)        [===============================] 1900 ms
  POST /orders (order-svc)       [==========================]    1750 ms
    SELECT cart (postgres)         [==]                            80 ms
    POST /charge (payment-svc)         [===================]     1500 ms
      card network call (HTTP)           [=================]     1400 ms  <- culprit
```

**Truyền ngữ cảnh** (context propagation) là thứ làm nó hoạt động: mọi chặng đều chuyển tiếp header **W3C Trace Context**.

```text
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
             version-trace-id (32 hex)-parent span-id (16 hex)-flags (01 = sampled)
```

**Baggage** mang theo các cặp key/value do người dùng định nghĩa (ví dụ tenant). Với chặng bất đồng bộ, đặt ngữ cảnh vào header của message. Chỉ một service làm rơi header là trace bị vỡ thành nhiều mảnh — nguyên nhân phổ biến nhất của trace "đứt đoạn".

| Lấy mẫu (sampling) | Quyết định lúc | Ưu | Nhược |
|---|---|---|---|
| **Head-based** (giữ 10%) | Ở span gốc, truyền xuống dưới | Rẻ, nhất quán | Bỏ ngẫu nhiên cả những trace lỗi/chậm hiếm gặp |
| **Tail-based** | Sau khi trace hoàn tất, trong collector | Giữ mọi trace lỗi và chậm | Phải đệm cả trace trong bộ nhớ; thêm hạ tầng |

Backend: Jaeger, Grafana Tempo, Zipkin, các công cụ APM thương mại. Trên AWS: X-Ray, và AWS khuyến nghị OpenTelemetry (ADOT) cho instrumentation mới.

---

## 9. OpenTelemetry

**OpenTelemetry (OTel)**, hợp nhất từ OpenTracing và OpenCensus trong CNCF, chuẩn hoá việc *tạo ra và vận chuyển* telemetry. Nó **không phải backend**, nhờ vậy loại bỏ việc bị khoá vào nhà cung cấp (vendor lock-in) ở tầng instrumentation.

- **API + SDK** cho từng ngôn ngữ (sampling, batching, exporter), cộng **auto-instrumentation** cho HTTP, gRPC, driver DB và Kafka client.
- Giao thức **OTLP**: **4317** cho gRPC, **4318** cho HTTP.
- **Semantic conventions**: tên thuộc tính chuẩn (`service.name`, `http.request.method`).
- **Collector**: các pipeline **receivers → processors → exporters**, chạy dạng agent (DaemonSet/sidecar) và/hoặc gateway trung tâm.

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

Vì sao đi qua Collector thay vì export thẳng từ app: đổi backend, thêm tail sampling, che PII và đệm dữ liệu khi backend gặp sự cố **mà không phải deploy lại service**. Đặt `memory_limiter` đầu tiên, `batch` sau nó.

---

## 10. Đo cái gì: golden signals, RED và USE

| Phương pháp | Dành cho | Tín hiệu |
|---|---|---|
| **Four golden signals** (Google SRE) | Hệ thống hướng người dùng | Latency, Traffic, Errors, Saturation |
| **RED** (Tom Wilkie) | Service xử lý request | **Rate**, **Errors**, **Duration** |
| **USE** (Brendan Gregg) | Tài nguyên: CPU, đĩa, pool, hàng đợi | **Utilization**, **Saturation**, **Errors** |

```text
   RED per service (symptom)              USE per resource (cause)
   Rate      1,200 req/s                  Utilization  DB pool 50/50 in use
   Errors    4% 5xx          <-- why? --  Saturation   180 requests waiting
   Duration  p99 3.2 s                    Errors       pool acquire timeouts
```

RED cho biết **rằng** người dùng đang chịu ảnh hưởng; USE giúp tìm ra **vì sao**. **Độ bão hoà** (saturation) là chỉ báo sớm — một pool đầy kèm hàng người chờ báo hiệu rắc rối trước khi độ trễ bùng nổ. Tách độ trễ của request thành công và thất bại (lỗi 500 trả về nhanh làm số liệu đẹp giả tạo), và theo dõi p95/p99, không chỉ p50.

---

## 11. SLI, SLO, SLA và error budget

- **SLI** (chỉ số mức dịch vụ) — tỉ lệ đo được giữa sự kiện tốt và sự kiện hợp lệ: "tỉ lệ request `GET /api/*` trả về không phải 5xx trong < 300 ms, đo tại load balancer".
- **SLO** (mục tiêu) — mục tiêu nội bộ cho một SLI trong một cửa sổ thời gian: "99.9% trong 30 ngày cuốn chiếu".
- **SLA** (thoả thuận) — hợp đồng với khách hàng kèm chế tài; luôn **lỏng hơn** SLO.

**Ngân sách lỗi** (error budget) **= 100% − SLO.**

| SLO | Ngân sách downtime / 30 ngày | / năm |
|---|---|---|
| 99% | 7 h 12 phút | ~3,65 ngày |
| 99.9% | 43,2 phút | ~8,76 h |
| 99.95% | 21,6 phút | ~4,38 h |
| 99.99% | 4,32 phút | ~52,6 phút |

Với SLO tính theo request, ngân sách là một con số đếm: 99.9% của 100 triệu request cho phép 100.000 lỗi. Một **error budget policy** được thống nhất trước quy định điều gì xảy ra: còn ngân sách → cứ release và thử nghiệm; hết ngân sách → đóng băng các release rủi ro và tập trung sửa độ tin cậy.

- **100% là mục tiêu sai** — người dùng không cảm nhận được qua mạng của chính họ, và mỗi số 9 thêm vào đắt hơn rất nhiều.
- **Dependency giới hạn bạn**: ba dependency độc lập 99.9% gọi nối tiếp cho tối đa ~99.7%.
- **Đo gần người dùng** (load balancer, synthetic probe), và bắt đầu với vài hành trình quan trọng (đăng nhập, checkout).

---

## 12. Cảnh báo theo triệu chứng, burn rate & on-call

**Gọi người (page) khi có triệu chứng, không phải nguyên nhân.** Người dùng quan tâm checkout bị lỗi, không quan tâm CPU của một pod là 95%. Cảnh báo theo nguyên nhân gây ồn khi người dùng không bị ảnh hưởng và bỏ sót những lỗi bạn không lường trước — hãy để chúng trên dashboard hoặc thành ticket. Một page phải **khẩn cấp, hành động được và ảnh hưởng người dùng**, kèm link **runbook**.

**Tốc độ đốt** (burn rate) = error budget đang bị tiêu nhanh bao nhiêu so với kế hoạch (1 = vừa đúng hết khi kết thúc cửa sổ).

```text
SLO 99.9% over 30 days (budget 0.1%)
burn 14.4  error ratio 1.44%  2% of budget in 1 h   -> page  (long 1h AND short 5m window)
burn 6     error ratio 0.6%   5% of budget in 6 h   -> page  (6h AND 30m)
burn 1     error ratio 0.1%   10% of budget in 3 d  -> ticket
```

Điều kiện **nhiều cửa sổ** (multi-window) bật nhanh khi có sự cố thật và tắt nhanh sau khi đã sửa, vì cửa sổ ngắn hồi phục sớm. Hãy cảnh báo thêm những thứ mà triệu chứng lộ ra quá muộn: chứng chỉ sắp hết hạn, đĩa sắp đầy (`predict_linear`), backup thất bại, và **mất dữ liệu** (`absent()`, `up == 0`) — một exporter đã chết trông y hệt một hệ thống yên ắng, khoẻ mạnh.

Thực hành on-call:

- Mức độ **page vs ticket**; phần lớn cảnh báo nên là ticket.
- **Mệt mỏi vì cảnh báo** (alert fatigue) là rủi ro độ tin cậy: rà soát page định kỳ, xoá hoặc chỉnh những cái không hành động được.
- Luân phiên primary/secondary, đường leo thang (escalation), ghi chú bàn giao, tải công việc bền vững.
- Vai trò khi sự cố (incident commander, truyền thông, người vận hành) và **postmortem không đổ lỗi** (blameless) với action item có người chịu trách nhiệm.
- Theo dõi **MTTD** và **MTTR**; observability tốt rút ngắn cả hai.

---

## Điểm cần nhớ khi phỏng vấn

- Monitoring trả lời câu hỏi **định sẵn**; observability cho phép đặt câu hỏi **mới** trên telemetry liên kết, cardinality cao.
- Log = chi tiết từng sự kiện, metric = số liệu gộp rẻ để cảnh báo, trace = thời gian đi đâu. Liên kết chúng bằng trace ID.
- Không bao giờ đưa user ID, request ID hay URL thô vào **nhãn metric** (cardinality).
- Log JSON có cấu trúc ra stdout, một trace/correlation ID xuyên suốt mọi chặng, không secret hay PII.
- Counter → `rate()`; **histogram gộp được qua các instance, summary thì không**.
- Prometheus **pull** `/metrics` (`up`, service discovery); Pushgateway chỉ cho job chạy ngắn; lưu mặc định 15 ngày; `remote_write` sang Thanos/Mimir khi cần mở rộng.
- Tracing cần truyền **W3C `traceparent`**; head sampling rẻ, tail sampling giữ được trace lỗi.
- **OpenTelemetry** = API/SDK trung lập nhà cung cấp + OTLP (4317/4318) + Collector — không phải backend lưu trữ.
- **RED** cho service, **USE** cho tài nguyên.
- SLI đo, SLO đặt mục tiêu, SLA là hợp đồng (lỏng hơn). 99.9% ≈ **43 phút mỗi 30 ngày**.
- Cảnh báo theo **triệu chứng** bằng **burn rate** nhiều cửa sổ; mọi page đều hành động được và có runbook.

## Tóm tắt

- Hệ thống phân tán cần observability vì lỗi thường mới lạ và trải trên nhiều thành phần sống ngắn.
- Log, metric và trace trả lời các câu hỏi khác nhau với chi phí khác nhau; giá trị nằm ở sự liên kết.
- Prometheus + Grafana là stack metric và dashboard tiêu chuẩn; `rate`, `sum by` và `histogram_quantile` đủ cho phần lớn nhu cầu.
- OpenTelemetry chuẩn hoá instrumentation; Collector tách ứng dụng khỏi backend.
- RED/USE quyết định đo cái gì; SLO và error budget quyết định tin cậy đến mức nào là đủ.
- Page ít, dựa trên burn rate hướng người dùng, và học từ sự cố bằng postmortem không đổ lỗi.
