# Message Queue & Streaming – RabbitMQ, Kafka và giao tiếp bất đồng bộ

## 1. Đồng bộ vs bất đồng bộ: vì sao đặt một broker ở giữa

Trong lời gọi **đồng bộ** (synchronous – HTTP, gRPC), bên gọi phải chờ bên được gọi. Cách này đơn giản nhưng buộc các service phụ thuộc nhau về thời gian: payment chậm thì checkout chậm, payment chết thì checkout lỗi. Độ trễ cộng dồn còn availability thì nhân với nhau — năm service 99.9% nối chuỗi chỉ còn khoảng 99.5%.

Với **nhắn tin bất đồng bộ** (asynchronous messaging), producer giao message cho một **broker** (bộ trung gian thông điệp) rồi đi tiếp; consumer xử lý khi nó sẵn sàng.

```text
Sync:   Checkout --HTTP--> Payment      user waits for both
           |<----- 200 -----|

Async:  Checkout --publish--> [broker] --deliver--> Payment
           |  returns in ~5 ms              works at its own pace
           v  "order received"
```

Broker mang lại **tách rời về thời gian** (temporal decoupling – consumer có thể tắt để deploy, message vẫn chờ), **san tải** (load levelling – đợt đột biến 10.000 đơn/s được xử lý dần ở 2.000/s thay vì đập thẳng vào database), **fan-out** (email, fraud, analytics cùng phản ứng với một event) và **scale độc lập**. Cái giá: **nhất quán cuối cùng** (eventual consistency), message trùng lặp và sai thứ tự mà thiết kế phải xử lý, debug khó hơn (trace ID phải đi theo header của message), và thêm một hệ thống có trạng thái cần vận hành.

Quy tắc kinh nghiệm: dùng **sync** khi bên gọi cần câu trả lời để đi tiếp (xác thực, kiểm tra giá); dùng **async** khi việc có thể làm sau khi đã phản hồi (gửi email, xuất hoá đơn, đánh index tìm kiếm).

---

## 2. Ba mô hình: queue, pub/sub và log

| | Queue | Pub/sub | Log (stream) |
|---|---|---|---|
| Ai nhận message | **Một** trong các consumer cạnh tranh | **Mọi** subscriber | Mỗi consumer group đọc độc lập |
| Sau khi tiêu thụ | Bị xoá khi ack | Bị xoá theo từng subscription | **Được giữ** tới hết thời gian retention |
| Đọc lại (replay) | Không | Không | Có — tua lại offset |
| Tiến độ do ai giữ | Broker, theo từng message | Broker, theo subscription | Consumer, dưới dạng **offset** |
| Ví dụ | Queue RabbitMQ, SQS | SNS, fanout exchange | Kafka, Kinesis, Redis Streams |

```text
Queue                  Pub/sub                    Log
       +-> worker A           +-> email queue     offset: 0  1  2  3  4  5
 P -> [Q]              P -> (T)-> fraud queue       [ e0 e1 e2 e3 e4 e5 ] <- append
       +-> worker B           +-> analytics queue          ^        ^
 one worker per msg    a copy per subscriber          group A   group B
```

Điểm tư duy then chốt với log: **đọc không làm mất dữ liệu**. Consumer chỉ là con trỏ (cursor) vào một file bền vững, có thứ tự; nhờ vậy một service mới có thể khởi tạo dữ liệu bằng cách đọc topic Kafka từ offset 0 — điều không thể làm với SQS.

---

## 3. RabbitMQ: exchange, binding và routing

RabbitMQ hiện thực giao thức **AMQP 0-9-1** (cổng **5672**, TLS **5671**, giao diện quản trị **15672**). Producer publish vào một **exchange** kèm **routing key**; các **binding** (liên kết) quyết định queue nào nhận bản sao.

| Exchange | Định tuyến theo | Ví dụ binding |
|---|---|---|
| **direct** | Khớp chính xác key | `invoice` |
| **fanout** | Bỏ qua key, sao chép tới mọi queue đã bind | — |
| **topic** | Mẫu: `*` = đúng một từ, `#` = không hoặc nhiều từ | `order.*.created` |
| **headers** | Giá trị header thay cho key | `x-match: all` |

**Default exchange** (exchange không tên) tự bind mọi queue bằng chính tên queue, vì vậy publish với key `my-queue` trông như "gửi thẳng vào queue".

```text
key "order.eu.created" --> [topic exchange "orders"]
                              |- "order.*.created" --> [billing]
                              |- "order.#"         --> [audit]
                              `- "order.us.*"      --X  no match
```

Các nút vặn độ tin cậy: **consumer ack** (message chưa ack sẽ được giao lại; auto-ack nghĩa là at-most-once), **prefetch** (`basic.qos`, giới hạn số message chưa ack mỗi consumer giữ, để một worker chậm không ôm hàng nghìn message), **publisher confirm**, **durable queue + persistent message**, và **quorum queue** (nhân bản bằng Raft; classic mirrored queue đã bị gỡ bỏ trong RabbitMQ 4.0).

```js
import amqp from 'amqplib';

const conn = await amqp.connect('amqp://localhost:5672');
const ch = await conn.createChannel();

await ch.assertExchange('orders', 'topic', { durable: true });
await ch.assertQueue('billing', {
  durable: true,
  arguments: { 'x-queue-type': 'quorum', 'x-dead-letter-exchange': 'orders.dlx' },
});
await ch.bindQueue('billing', 'orders', 'order.*.created');
await ch.prefetch(10);

await ch.consume('billing', async (msg) => {
  try {
    await chargeCustomer(JSON.parse(msg.content.toString()));
    ch.ack(msg);
  } catch (err) {
    ch.nack(msg, false, false); // no requeue: dead-lettered
  }
});
```

---

## 4. Kafka: topic, partition và replication

Kafka là một **commit log phân tán** (distributed commit log, cổng **9092**). Broker chỉ append record vào file và trả dữ liệu theo offset; việc ghi nhớ đã đọc tới đâu là của consumer.

- Một **topic** được chia thành các **partition** (phân vùng), mỗi partition là một chuỗi chỉ-ghi-thêm có thứ tự, mỗi record có một **offset** tăng dần.
- Dữ liệu được giữ trong thời gian **retention** (`log.retention.hours` mặc định 168 = 7 ngày) bất kể đã có ai đọc hay chưa. **Log compaction** thì thay vào đó giữ record mới nhất cho mỗi key.
- Mỗi partition có một **leader** và các follower nằm trên broker khác; các follower bắt kịp leader tạo thành **ISR** (in-sync replicas).
- Khi có key, producer chọn `hash(key) % partitions`, nên một key luôn rơi vào cùng một partition.

```text
Topic "orders", 3 partitions, replication factor 3
          Broker 1    Broker 2    Broker 3
 P0       LEADER      follower    follower
 P1       follower    LEADER      follower
 P2       follower    follower    LEADER

 P0: | 0 | 1 | 2 | 3 | 4 |  <- key "cust-42" always appends here
```

| Thiết lập độ bền | Phạm vi | Giá trị an toàn |
|---|---|---|
| `replication.factor` | Topic | 3 |
| `min.insync.replicas` | Topic/broker | 2 |
| `acks` | Producer | `all` (mặc định từ Kafka 3.0) |

Với bộ thiết lập này, một lần ghi chỉ được xác nhận khi ít nhất hai replica đã có dữ liệu: một broker chết cũng không mất dữ liệu. Nếu số replica in-sync ít hơn, producer nhận lỗi `NotEnoughReplicas` — Kafka chọn tính nhất quán thay vì tính sẵn sàng.

```bash
kafka-topics.sh --bootstrap-server localhost:9092 --create --topic orders \
  --partitions 12 --replication-factor 3 --config min.insync.replicas=2
```

Metadata của cluster từng nằm trong ZooKeeper; Kafka hiện dùng **KRaft** (controller Raft tích hợp sẵn), và **Kafka 4.0 đã gỡ bỏ hoàn toàn ZooKeeper**. Trên AWS: **Amazon MSK**.

---

## 5. Consumer group, offset và lag

Các consumer dùng chung `group.id` tạo thành một **consumer group**. Mỗi partition được giao cho **đúng một consumer trong group** — vừa song song vừa giữ thứ tự trong partition. Các group khác nhau đọc hoàn toàn độc lập.

```text
Topic "orders", 4 partitions
 group "billing":   C1 <- P0,P1   C2 <- P2   C3 <- P3
 group "analytics": C1 <- P0,P1,P2,P3
 add C4, C5 to "billing": C4 takes a partition, C5 sits IDLE
```

- **Mức song song tối đa = số partition.** Có thể thêm partition sau, nhưng `hash(key) % n` thay đổi và thứ tự theo key bị phá với các key đang có.
- **Rebalance** (phân chia lại) xảy ra khi consumer tham gia, rời đi, hoặc vượt `max.poll.interval.ms` (mặc định 5 phút) — xử lý chậm trong vòng poll là nguyên nhân kinh điển của rebalance liên tục.
- **Offset** được commit vào topic nội bộ `__consumer_offsets`. Commit **sau** khi xử lý → at-least-once; commit **trước** → at-most-once.
- **Consumer lag** (độ trễ tiêu thụ) = log-end offset − committed offset. Lag tăng dần là tín hiệu sức khoẻ quan trọng nhất.

```bash
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group billing
# TOPIC   PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
# orders  0          10412           10415           3
# orders  1          9870            15230           5360  <- stuck consumer
```

Vì dữ liệu vẫn nằm trong log, bạn có thể **replay** sau khi sửa bug bằng cách reset offset của group (`--reset-offsets --to-datetime ... --execute`).

---

## 6. RabbitMQ vs Kafka: khi nào chọn cái nào

| | RabbitMQ | Kafka |
|---|---|---|
| Mô hình | Broker thông minh, routing, queue | Broker đơn giản, log chia partition |
| Sau khi ack | Message bị xoá | Được giữ; replay theo offset |
| Routing | Direct/topic/fanout/headers | Topic + key → partition |
| Thứ tự | Theo queue, một consumer | Theo partition |
| Tính năng theo từng message | Ack/reject, TTL, priority | Không — consumer commit một vị trí |
| Scale consumer | Thêm consumer tuỳ ý | Bị giới hạn bởi số partition |
| Hợp nhất cho | Task queue, routing phức tạp, retry từng message | Event streaming, CDC, analytics, nhiều bên đọc, replay |

- "Mỗi job xử lý một lần, retry riêng từng job" → **queue** (RabbitMQ, SQS).
- "Nhiều team đọc cùng event, có thể đọc sau, cần replay" → **log** (Kafka, Kinesis).
- "Thông báo cho vài service" → **pub/sub** (SNS, fanout), thường kèm một queue cho mỗi subscriber.

Sai lầm kinh điển là dùng Kafka làm job queue: một message chậm hoặc message độc làm tắc cả partition (**head-of-line blocking** – nghẽn đầu hàng), và retry theo từng message phải tự xây.

---

## 7. Đảm bảo giao nhận

| Đảm bảo | Cơ chế | Khi crash | Dùng cho |
|---|---|---|---|
| **At-most-once** (tối đa một lần) | Ack **trước** khi xử lý | Message **mất** | Telemetry |
| **At-least-once** (ít nhất một lần) | Ack **sau** khi xử lý | Message **giao lại** | Mặc định cho event nghiệp vụ |
| **Exactly-once** (đúng một lần) | Khử trùng + commit nguyên tử kết quả và vị trí | Không mất, không thấy trùng | Thanh toán, tổng hợp số liệu |

```text
consumer: receive(m1) -> charge card -> CRASH (ack never sent)
broker:   timeout -> redeliver m1
consumer: receive(m1) -> charge card AGAIN   <- duplicate side effect
```

"Giao đúng một lần" thực sự qua mạng là bất khả thi; các hệ thống cung cấp **xử lý đúng một lần** (exactly-once processing) trong một phạm vi nhất định:

- **Kafka** — **idempotent producer** (producer ID + sequence number, mặc định từ 3.0) loại bỏ bản trùng do producer retry; **transaction** ghi nguyên tử cả record đầu ra *và* offset của consumer, đọc với `isolation.level=read_committed` (Kafka Streams: `processing.guarantee=exactly_once_v2`). Nó chỉ đúng cho **Kafka → Kafka**; gọi database hay API bên ngoài là bạn quay về at-least-once.
- **SQS FIFO** — loại bỏ message có cùng deduplication ID trong cửa sổ **5 phút**.

Câu trả lời phỏng vấn: *thiết kế cho at-least-once và làm consumer idempotent.*

---

## 8. Consumer idempotent

**Idempotent** (tính luỹ đẳng) nghĩa là xử lý một message hai lần cho kết quả giống như một lần.

1. **Thao tác ghi vốn idempotent** — `SET status = 'SHIPPED'` hay upsert là an toàn; `balance = balance - 10` thì không.
2. **Ghi có điều kiện** — `UPDATE ... WHERE version = 7`; lần chạy lại thấy version 8 và không làm gì.
3. **Bảng khử trùng** (dedup table) — ghi event ID trong **cùng transaction** với tác dụng phụ.

```js
async function handlePaymentRequested(message, db) {
  const { eventId, orderId, amount } = JSON.parse(message.value);

  await db.transaction(async (tx) => {
    const result = await tx.query(
      'INSERT INTO processed_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING',
      [eventId]
    );

    if (result.rowCount === 0) return; // duplicate: already processed

    await tx.query(
      'INSERT INTO payments (order_id, amount) VALUES ($1, $2)',
      [orderId, amount]
    );
  });
}
```

- Dùng **event ID do producer tạo**, không dùng ID giao nhận của broker (receipt handle của SQS đổi sau mỗi lần receive).
- Lệnh insert khử trùng và tác dụng phụ phải **nguyên tử**; tách thành hai commit là mở lại khe hở.
- Với lời gọi ra ngoài, truyền **idempotency key** cho nhà cung cấp (bài 17).
- Chỉ xoá các dòng dedup sau khi đã qua cửa sổ giao lại/replay dài nhất.

---

## 9. Thứ tự message

Thứ tự toàn cục và scale ngang mâu thuẫn nhau: một luồng có thứ tự nghĩa là một consumer. Hệ thống thực tế chỉ đảm bảo **thứ tự theo key**.

| Hệ thống | Phạm vi thứ tự | Công cụ |
|---|---|---|
| Kafka | Theo partition | Message key |
| Kinesis Data Streams | Theo shard | Partition key |
| SQS FIFO | Theo message group | `MessageGroupId` |
| SQS standard | Chỉ best effort | — |
| RabbitMQ | Theo queue | Một consumer hoạt động (`x-single-active-consumer`) |

Những thứ âm thầm phá thứ tự: **retry đẩy message về cuối hàng**, **nhiều consumer hoặc nhiều thread** trên một luồng có thứ tự, **đổi số partition** của topic có key, và việc né **hot key** (một tenant khổng lồ dồn vào một partition).

Thường thiết kế tốt hơn là **chấp nhận sai thứ tự**: mỗi event mang một version, bỏ qua event cũ hơn trạng thái đang lưu.

---

## 10. Retry, backoff và dead-letter queue

- Lỗi **tạm thời** (timeout, 503, xung đột khoá) → retry sau một khoảng chờ.
- **Poison message** (message độc – payload hỏng, bug) → retry mãi chỉ phí tài nguyên, và trong log thì chặn cả partition. Hãy cất nó sang một bên.

**Exponential backoff kèm jitter** (lùi thời gian theo cấp số nhân, cộng ngẫu nhiên) ngăn các consumer retry đồng loạt vào một dependency đang hồi phục:

```js
function retryDelayMs(attempt, baseMs = 500, capMs = 60000) {
  const ceiling = Math.min(capMs, baseMs * 2 ** attempt);

  return Math.floor(Math.random() * ceiling); // full jitter
}
```

**Dead-letter queue** (DLQ – hàng đợi thư chết) nhận các message vượt giới hạn retry để luồng chính tiếp tục chạy.

```text
[main queue] -> consumer -> fail -> attempts < N ? -> retry with backoff
                                        | no
                                        v
                                      [DLQ] -> alert -> inspect/fix -> redrive
```

- **SQS** — message nhận mà chưa xoá sẽ hiện lại sau **visibility timeout** (mặc định 30 giây, tối đa 12 giờ); **redrive policy** chuyển nó sang DLQ sau `maxReceiveCount` lần nhận. Đặt timeout lớn hơn thời gian xử lý tệ nhất.
- **RabbitMQ** — `nack` với `requeue=false` đưa message tới **dead-letter exchange**; retry có trễ thường dùng một retry queue có TTL rồi dead-letter ngược về.
- **Kafka** — không có DLQ sẵn; dùng **retry topic** (`orders.retry.10m`) và topic `orders.dlq`, commit offset gốc để partition không bị chặn.

**Cảnh báo khi DLQ có message** — một DLQ không ai theo dõi chỉ là cách mất dữ liệu chậm hơn.

---

## 11. Transactional outbox pattern

**Vấn đề ghi kép** (dual-write problem): service phải cập nhật database *và* publish event, nhưng không có transaction nào bao trùm cả hai.

```text
Dual write (broken)                   Outbox (correct)
 1. UPDATE orders  -> commit OK        BEGIN
 2. publish event  -> broker down        INSERT INTO orders ...
 => order placed, nobody told            INSERT INTO outbox ...
                                       COMMIT   <- one local transaction
                                       relay: read outbox -> publish -> mark sent
```

```sql
BEGIN;

INSERT INTO orders (id, customer_id, total)
VALUES ('o-123', 'c-9', 49.90);

INSERT INTO outbox (id, aggregate_id, event_type, payload)
VALUES ('e-777', 'o-123', 'OrderPlaced', '{"orderId":"o-123","total":49.90}');

COMMIT;
```

| Relay | Cách làm | Đánh đổi |
|---|---|---|
| **Polling publisher** | Job lấy các dòng chưa gửi, publish, đánh dấu đã gửi | Đơn giản; tăng tải DB, trễ bằng chu kỳ poll |
| **CDC** (change data capture) | Đọc WAL/binlog (ví dụ Debezium → Kafka) | Trễ thấp; thêm hạ tầng |

Relay có thể crash sau khi publish nhưng trước khi đánh dấu, nên outbox là **at-least-once**: consumer vẫn phải idempotent, dùng ID của dòng outbox làm event ID (bảng khử trùng phía nhận thường gọi là **inbox**). Outbox là nền móng giúp saga đáng tin cậy — saga và CQRS thuộc bài 18.

---

## 12. Ánh xạ sang AWS

| Nhu cầu | Dịch vụ | Ghi chú |
|---|---|---|
| Work queue | **SQS standard** | At-least-once, thứ tự best effort, throughput gần như không giới hạn |
| Queue có thứ tự + khử trùng | **SQS FIFO** | Thứ tự theo group, dedup 5 phút; 300 msg/s mỗi API action, 3.000 khi batch (cao hơn ở high-throughput mode) |
| Fan-out pub/sub | **SNS** | Tới SQS, Lambda, HTTP, email |
| Event bus theo rule | **EventBridge** | Định tuyến theo nội dung, event của AWS/SaaS |
| Stream / log | **Kinesis Data Streams** | Mỗi shard ghi 1 MB/s hoặc 1.000 record/s; retention mặc định 24 giờ, tối đa 365 ngày |
| Kafka được quản lý | **Amazon MSK** | API Kafka chuẩn |
| RabbitMQ được quản lý | **Amazon MQ** | Chuyển nguyên trạng ứng dụng AMQP/JMS |

Chi tiết hay gặp khi review: bật **long polling** (`WaitTimeSeconds` tối đa 20 giây) để giảm lượt receive rỗng; consumer Lambda nên dùng **`ReportBatchItemFailures`** để một message lỗi không bắt cả batch retry; message SQS đã xoá không replay được — nếu cần replay, hãy chọn Kinesis hoặc MSK.

---

## Điểm cần nhớ khi phỏng vấn

- **Sync** khi bên gọi cần câu trả lời ngay; **async** cho việc làm sau khi phản hồi, đổi lại là eventual consistency.
- **Queue** = mỗi message cho một consumer; **pub/sub** = mỗi subscriber một bản sao; **log** = được giữ lại, replay được, dùng offset.
- Mức song song của group Kafka bị giới hạn bởi **số partition**; thứ tự là **theo partition**; theo dõi **consumer lag**.
- Kafka bền vững: **RF=3, `min.insync.replicas=2`, `acks=all`**; Kafka 4.0 chỉ chạy **KRaft**.
- Thiết kế cho **at-least-once** với **consumer idempotent**; exactly-once của Kafka chỉ đúng Kafka → Kafka.
- **Backoff kèm jitter**, giới hạn retry, **DLQ** có cảnh báo; **outbox** giải quyết ghi kép.

## Tóm tắt

- Broker tách rời service về thời gian và hấp thụ đột biến tải, nhưng kéo theo trùng lặp, sai thứ tự và eventual consistency.
- Chọn mô hình trước (queue, pub/sub, log), rồi mới chọn sản phẩm (RabbitMQ/SQS vs Kafka/Kinesis).
- At-least-once cộng idempotency, retry với DLQ và outbox pattern làm cho hệ thống nhắn tin đáng tin cậy.
