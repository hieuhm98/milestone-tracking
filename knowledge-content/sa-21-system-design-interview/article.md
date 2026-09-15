# Phỏng vấn System Design – Khung tư duy và các bài thiết kế mẫu

## 1. Buổi phỏng vấn thực sự đánh giá điều gì

Phỏng vấn **thiết kế hệ thống** (system design) không có một sơ đồ đúng duy nhất. Trong 45–60 phút, người phỏng vấn quan sát **cách bạn suy luận**: bạn có làm rõ bài toán mơ hồ không, có định lượng bằng con số không, có chọn thành phần kèm lý do không, có tìm ra **điểm nghẽn** (bottleneck) và nói rõ **đánh đổi** (trade-off) mình chấp nhận không? Với ứng viên senior hay architect, người ta còn chờ bạn **tự dẫn dắt** cuộc trò chuyện.

Lần nào cũng đi theo cùng bảy bước, kèm một chiếc đồng hồ ước lượng:

| Bước | Kết quả cần có | Thời gian (trên ~50 phút) |
|---|---|---|
| 1. Yêu cầu | Danh sách functional + non-functional, những gì nằm ngoài phạm vi | 5–8 phút |
| 2. Ước lượng | Chỉ những con số làm thay đổi thiết kế | 3–5 phút |
| 3. API | 3–6 endpoint hoặc message | 3–5 phút |
| 4. Mô hình dữ liệu | Thực thể, khoá, access pattern, loại store | 3–5 phút |
| 5. Thiết kế tổng quan | Luồng đọc và luồng ghi chính | 8–10 phút |
| 6. Đào sâu | 1–2 phần thực sự khó | 10–15 phút |
| 7. Điểm nghẽn & tổng kết | Kịch bản lỗi, giới hạn mở rộng, bước tiếp theo | 3–5 phút |

Hãy nghĩ thành tiếng, viết con số lên bảng và thường xuyên hỏi lại: "Tôi muốn đi sâu vào phần sinh ID — hay anh/chị muốn xem phần cache trước?" Nếu người phỏng vấn lái sang hướng khác, hãy đi theo.

---

## 2. Bước 1 — Yêu cầu và phạm vi

Mọi đề bài ("thiết kế ứng dụng chat") đều cố tình mơ hồ. Việc đầu tiên là biến nó thành một bản "hợp đồng":

- **Yêu cầu chức năng** (functional) — 3–4 tính năng cốt lõi, và nói rõ những gì bạn *không* thiết kế ("không gọi video, không tìm kiếm").
- **Yêu cầu phi chức năng** (non-functional) — quy mô (DAU, tỉ lệ đọc/ghi), độ trễ (p99 < 200 ms), **tính sẵn sàng** (availability: 99,9 % hay 99,99 %), **tính nhất quán** (consistency: đọc dữ liệu cũ có chấp nhận được không?), độ bền dữ liệu, địa lý, tuân thủ.
- **Ràng buộc** — stack hiện có, đội ngũ, ngân sách, deadline.

Câu hỏi tốt là câu hỏi làm thay đổi kiến trúc: *"Feed theo thời gian hay có xếp hạng?"*, *"Redirect có phải chạy được khi hệ thống analytics sập không?"*, *"Nhóm chat tối đa bao nhiêu người?"* Nếu câu trả lời là "bạn tự quyết", hãy **nói ra giả định và ghi lên bảng**: "Tôi giả định 100 M DAU, tỉ lệ đọc/ghi 10:1." Giả định được nói ra là điểm cộng; giả định ngầm là một con bug.

---

## 3. Bước 2 — Ước lượng nhanh (back-of-the-envelope)

Ước lượng chỉ để trả lời một câu: hệ thống này có vừa trên một máy không, hay cần **phân mảnh** (partition), cache hoặc queue? Làm tròn mạnh tay, nhưng phải trình bày phép tính.

| Con số hay dùng | Giá trị |
|---|---|
| Số giây trong một ngày | 86.400 (≈ 10⁵ khi tính nhẩm) |
| 1 M request/ngày | ≈ 11,6 request/giây |
| Cao điểm so với trung bình | giả định 2–3× (nói rõ ra) |
| KB / MB / GB / TB | 10³ / 10⁶ / 10⁹ / 10¹² byte |
| Truy cập RAM | ~100 ns |
| Đọc ngẫu nhiên SSD | ~0,1 ms |
| Round trip trong một datacenter | ~0,5 ms |
| Round trip xuyên đại dương | ~100–150 ms |

```text
QPS      = daily actions / 86,400                       (x2..x3 for peak)
Storage  = records/day x bytes/record x 365 x years     (x replication factor)
Memory   = hot items x bytes/item                       (80/20: cache the hot 20 %)
Servers  = peak QPS / QPS per server                    (+ headroom to lose a node or AZ)
```

Ví dụ: 10 M bản ghi/ngày × 1 KB = 10 GB/ngày → 3.650 GB/năm → ≈ 18 TB sau 5 năm, ≈ 55 TB với 3 bản sao. Rồi phải **dùng** con số đó: 18 TB không nằm thoải mái trên một node database, nên cần tính đến phân mảnh. Con số tính ra mà không dùng là phí thời gian.

---

## 4. Bước 3–4 — API và mô hình dữ liệu

Định nghĩa "hợp đồng" trước khi vẽ các hộp:

```text
POST /v1/urls        { "longUrl": "...", "customAlias": "opt" }  -> 201 { "code": "aZ3kQ9x" }
GET  /{code}                                                     -> 302 Location: <longUrl>
GET  /v1/feed?cursor=<opaque>&limit=20                           -> 200 { "items": [...], "nextCursor": "..." }
```

Mỗi phần xuyên suốt chỉ cần một câu: xác thực ở gateway (OAuth 2.0 / JWT), **idempotency key** cho các lệnh tạo mới, **phân trang bằng cursor** (cursor pagination) cho dữ liệu thay đổi trong lúc lật trang, rate limit theo API key.

Chọn store dựa trên **access pattern** (cách dữ liệu được truy cập), không phải dựa trên thực thể:

| Access pattern | Lựa chọn tự nhiên |
|---|---|
| Tra theo một khoá, khối lượng cực lớn | Key-value / wide-column (DynamoDB, Cassandra) |
| Quan hệ, transaction, truy vấn tuỳ ý | Quan hệ (PostgreSQL) — shard khi cần |
| Ghi nối đuôi nhiều, theo thời gian cho từng thực thể | Wide-column, partition theo thực thể + time bucket |
| Bộ đếm, TTL, top-N | Redis (cache hoặc store phụ, không phải nguồn sự thật) |
| Ảnh, video | Object storage + CDN (S3 + CloudFront) |

---

## 5. Bước 5–7 — Thiết kế tổng quan, đào sâu, điểm nghẽn

Vẽ **thiết kế đơn giản nhất đáp ứng yêu cầu**, rồi tiến hoá dần:

```text
 client --> DNS --> CDN (static/media)
   |
   v
 load balancer (L7) --> API gateway (auth, rate limit)
                            |
                 +----------+-----------+
                 v                      v
          stateless service A    stateless service B
            |        |                  |
            v        v                  v
         cache    database            queue
        (Redis)  (primary +             |
                  replicas) <------- workers
```

Đi qua **luồng ghi** và **luồng đọc** riêng biệt. Sau đó đào sâu vào phần khó *của chính bài toán này*: sinh ID cho URL shortener, fan-out cho news feed, quản lý kết nối cho chat.

Với điểm nghẽn, hỏi từng thành phần: "chuyện gì xảy ra khi tải gấp 10, và khi nó chết?"

- Một DB primary duy nhất → read replica, rồi shard theo khoá phân tán đều tải.
- Hot key / người nổi tiếng → cache có jitter, tách khoá, đường xử lý riêng.
- Chuỗi gọi đồng bộ → timeout, circuit breaker, đẩy việc không quan trọng ra sau queue.
- Một AZ → multi-AZ; multi-region chỉ khi yêu cầu bắt buộc (trả giá bằng tính nhất quán và tiền).

Luôn đi kèm giải pháp với cái giá của nó: "Shard theo user ID gỡ được nghẽn ghi, nhưng truy vấn liên user thành scatter-gather."

---

## 6. Bài mẫu: URL shortener — yêu cầu và ước lượng

**Chức năng:** tạo link ngắn (alias tuỳ chọn, thời hạn), redirect, đếm lượt click. **Phi chức năng:** redirect p99 < 50 ms, luồng đọc sẵn sàng rất cao, một mã không bao giờ trỏ nhầm URL, mã không dễ đoán.

**Giả định:** 100 M link mới/ngày, đọc:ghi = 10:1, lưu 10 năm, ~500 byte mỗi bản ghi.

```text
Write QPS  = 100,000,000 / 86,400              ~= 1,160/s   (peak x2 ~= 2,300/s)
Reads/day  = 10 x 100 M = 1,000,000,000 -> / 86,400 ~= 11,600/s (peak ~= 23,000/s)
Records    = 100 M x 365 x 10                  = 365 billion
Storage    = 365,000,000,000 x 500 B           = 182.5 TB  (~550 TB with 3 replicas)
Cache      = 20 % x 1 B reads x 500 B          = 100 GB (upper bound: repeats overlap)
Code       : 62^6 = 56.8 billion   < 365 billion
             62^7 = 3.52 trillion  > 365 billion   -> 7 base62 characters
```

Kết luận: đọc nhiều, chỉ tra theo khoá, dữ liệu quá lớn cho một node, cache vừa một cụm Redis nhỏ.

---

## 7. URL shortener — thiết kế và đánh đổi

```text
 create:   client -> LB -> link service -> ID range lease -> scramble -> base62 -> KV store
 redirect: client -> LB -> redirect service -> Redis (hit) ----------------> 302
                                              \-> KV store (miss) -> fill cache
                                    redirect service -> click event -> queue -> analytics
```

**Sinh mã ngắn** là phần đào sâu:

| Cách làm | Ưu | Nhược |
|---|---|---|
| Hash URL dài, lấy 7 ký tự | Cùng URL → cùng mã | Trùng (collision) phải kiểm tra rồi thử lại |
| Một bộ đếm toàn cục + base62 | Không trùng, ngắn | SPOF; mã tuần tự dễ bị dò lần lượt |
| **Dải bộ đếm** cấp cho từng server | Không cần phối hợp mỗi request | Hở số khi server chết (vô hại); cần xáo trộn để giấu thứ tự |
| Snowflake ID 64-bit | Phi tập trung hoàn toàn | Tới 11 ký tự base62 — không còn "ngắn" |

Câu trả lời chắc chắn: mỗi instance link service **thuê** (lease) một khối 1 M ID từ một store điều phối nhỏ (một dòng DB cập nhật trong transaction, hoặc etcd), áp một phép xáo trộn đảo ngược được, rồi mã hoá base62:

```js
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function toBase62(n) {
  if (n === 0n) return ALPHABET[0];

  let out = '';

  while (n > 0n) {
    out = ALPHABET[Number(n % 62n)] + out;
    n /= 62n;
  }

  return out;
}

toBase62(125n);           // '21'  (2 x 62 + 1)
toBase62(62n ** 7n - 1n); // 'ZZZZZZZ' — largest 7-character code
```

**Mã trạng thái redirect:** `301` cho phép trình duyệt cache redirect (giảm tải, nhưng click lặp lại biến mất khỏi analytics và khó đổi đích); `302` khiến mọi click đi qua hệ thống của bạn — lựa chọn thường thấy khi analytics quan trọng.

Nên nói thêm: lưu `code → {longUrl, ownerId, expiresAt}` trong KV store partition theo code (mã đã xáo trộn phân bố đều, không có shard nóng); cache-aside có TTL; sự kiện click đi bất đồng bộ để analytics không bao giờ làm chậm redirect; alias tuỳ chọn dùng thao tác có điều kiện "insert if not exists" để tránh race condition.

---

## 8. Bài mẫu: rate limiter

**Yêu cầu:** ví dụ 100 request/phút cho mỗi API key, dùng chung giữa nhiều node gateway, overhead < 1–2 ms, trả về `429 Too Many Requests` kèm `Retry-After`. **Đặt ở đâu:** API gateway hoặc middleware — không bao giờ tin client (trên AWS: throttling của API Gateway, rate-based rule của WAF).

| Thuật toán | Cách hoạt động | Đánh đổi |
|---|---|---|
| Token bucket | Nạp r token/giây tới dung lượng b; mỗi request lấy một token | Cho phép burst tới b; phổ biến nhất |
| Leaky bucket | Request xếp hàng, chảy ra với tốc độ cố định | Đầu ra đều; burst phải chờ hoặc bị bỏ |
| Fixed window counter | Đếm theo từng phút đồng hồ | Rẻ; có thể lọt 2× giới hạn quanh ranh giới |
| Sliding window log | Lưu mọi timestamp trong 60 s gần nhất | Chính xác; bộ nhớ tăng theo lưu lượng |
| Sliding window counter | hiện tại + trước đó × phần chồng lấn | Xấp xỉ tốt, bộ nhớ O(1) |

Lỗ hổng của fixed window: 100 request lúc 12:00:59 và 100 request lúc 12:01:00 đều hợp lệ — 200 request trong hai giây. Sliding window counter gần như khắc phục được: giới hạn 100, phút trước 80, phút này 30, đang ở 25 % của phút → `30 + 80 × 0,75 = 90` → cho qua.

Bộ đếm nằm trong Redis để mọi node dùng chung. `INCR` rồi `EXPIRE` riêng lẻ không **nguyên tử** (atomic): nếu tiến trình chết giữa hai lệnh, key không bao giờ hết hạn và user bị chặn vĩnh viễn. Gộp vào một Lua script:

```lua
-- KEYS[1] = rl:{api_key}:<window>, ARGV[1] = limit, ARGV[2] = window seconds
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[2])
end
if current > tonumber(ARGV[1]) then
  return 0
end
return 1
```

**Định cỡ:** 10 M key đang hoạt động × ~100 byte = 1 GB — một primary nhỏ + một replica. Trong Redis Cluster, hash tag `{api_key}` giữ các key của cùng một caller trên cùng một slot.

**Đánh đổi:** **fail open** khi Redis sập (bảo vệ availability) hay **fail closed** (bảo vệ backend mong manh); kiểm tra sơ bộ trong bộ nhớ từng node giúp bớt gọi Redis nhưng cho lọt hơi quá giới hạn.

---

## 9. Bài mẫu: hệ thống chat — yêu cầu và kết nối

**Chức năng:** chat 1:1 và nhóm (≤ 500 thành viên), lịch sử, trạng thái đã gửi/đã nhận/đã xem, trạng thái online (presence), nhiều thiết bị, push notification khi offline. **Phi chức năng:** giao tin < 200 ms khi online, không mất tin, giữ thứ tự trong mỗi cuộc hội thoại.

**Giả định:** 50 M DAU, 40 tin/người/ngày, ~100 byte/tin, 20 % DAU kết nối lúc cao điểm.

```text
Messages/day = 50 M x 40                 = 2 billion
Avg QPS      = 2,000,000,000 / 86,400    ~= 23,000 msg/s  (peak x3 ~= 69,000)
Storage      = 2 B x 100 B = 200 GB/day  -> x 365 = 73 TB/year (before replication)
Connections  = 20 % x 50 M               = 10 M concurrent
Gateways     = 10 M / 50,000 per node (assumed) = 200 nodes + headroom
```

Mô hình request/response thuần không đẩy dữ liệu xuống client được, nên dùng **WebSocket** (song công toàn phần trên một kết nối TCP), long polling làm phương án dự phòng. Tầng kết nối vì thế trở thành **có trạng thái** (stateful), nên tách nó khỏi phần logic không trạng thái:

```text
 device --wss--> LB --> chat gateway (holds sockets)
                             |
                             v
                   message service (stateless) --> message store (wide-column)
                      |              |
       session registry (Redis:      +--> recipient's gateway --> device
       user -> gateway, device)      +--> queue --> push worker --> APNs / FCM
```

Khi deploy phải rút kết nối từ từ (drain), và client kết nối lại với backoff có jitter để một lần restart gateway không gây hiệu ứng **thundering herd** (cả đàn cùng ùa vào).

---

## 10. Hệ thống chat — lưu trữ, thứ tự, giao nhận, presence

**Luồng gửi tin (at-least-once cộng khử trùng):**

```text
 1. A -> gateway: send {clientMsgId, conversationId, body}
 2. message service assigns messageId + per-conversation seq, persists
 3. server -> A: ack {clientMsgId, messageId, seq}        -> "sent"
 4. find B's devices in session registry, push via their gateways
    (offline -> enqueue push notification)
 5. B -> server: delivered {messageId}, later read {seq}   -> receipts to A
```

Client gửi lại cho tới khi nhận ack, nên server **khử trùng theo `clientMsgId`** — chính là pattern idempotent consumer. Mỗi thiết bị giữ một cursor (seq cuối cùng đã có); khi kết nối lại, nó xin mọi tin sau cursor đó, nhờ vậy đồng bộ luôn được nhiều thiết bị.

Ghi nhiều, chỉ nối đuôi, đọc theo cuộc hội thoại → store dạng wide-column:

```sql
-- Cassandra CQL
CREATE TABLE messages (
  conversation_id bigint,
  bucket          int,     -- e.g. days since epoch, keeps partitions bounded
  message_id      bigint,  -- Snowflake-style: 41-bit ms time, 10-bit node, 12-bit seq
  sender_id       bigint,
  body            text,
  PRIMARY KEY ((conversation_id, bucket), message_id)
) WITH CLUSTERING ORDER BY (message_id DESC);
```

Không có bucket, một nhóm hoạt động sôi nổi sẽ thành một partition nóng phình to mãi.

**Nhóm:** ≤ 500 thành viên → fan-out ngay khi gửi tới gateway của các thành viên online; kênh rất lớn → client tự kéo tin khi mở kênh. **Presence:** heartbeat mỗi ~30 s làm mới một key Redis có TTL khoảng hai chu kỳ; key hết hạn nghĩa là offline. Chỉ phát thay đổi presence tới những người liên hệ đang online, nếu không một lần đăng nhập sẽ thành cơn bão cập nhật. **Mã hoá đầu cuối** (end-to-end encryption) nghĩa là server không đọc hay tìm kiếm được nội dung — một quyết định sản phẩm kéo theo hệ quả kiến trúc.

---

## 11. Bài mẫu: news feed

**Chức năng:** đăng bài; home feed có phân trang gồm bài của những tài khoản mình theo dõi. **Phi chức năng:** feed p99 < 300 ms, bài mới hiện với follower trong vài giây (chấp nhận **nhất quán sau cùng** – eventual consistency), đọc nhiều.

**Giả định:** 200 M DAU, mỗi người mở feed 10 lần/ngày, 10 % người dùng đăng một bài/ngày, trung bình 200 follower.

```text
Feed reads = 200 M x 10 = 2 B/day      -> / 86,400 ~= 23,000/s
Posts      = 10 % x 200 M = 20 M/day   -> / 86,400 ~= 230/s
Fan-out    = 20 M x 200 = 4 B inserts/day -> ~46,000/s
Feed cache = 200 M x 500 post IDs x 8 B = 800 GB raw (cache active users only)
```

Quyết định then chốt là **khi nào** dựng feed:

| | Fan-out khi ghi (push) | Fan-out khi đọc (pull) |
|---|---|---|
| Cách làm | Khi đăng bài, chèn ID vào feed của mọi follower | Khi mở feed, lấy bài của những người đang theo dõi rồi trộn |
| Độ trễ đọc | Rất nhanh (tính sẵn) | Chậm khi theo dõi nhiều tài khoản |
| Chi phí ghi | Tỉ lệ với số follower | Không đổi |
| Gãy khi | Người nổi tiếng 50 M follower: với 10.000 lượt chèn/giây, một bài mất 5.000 s ≈ 83 phút | Đọc nặng, khó cache |

Câu trả lời chuẩn: **hybrid** — push cho tài khoản thường (bỏ qua follower không hoạt động), pull cho tài khoản vượt ngưỡng follower, trộn cả hai lúc đọc rồi xếp hạng.

```text
 post -> post service -> posts DB (+ media -> object storage/CDN)
            |
            v
          queue -> fan-out workers --(follower list)--> feed cache (Redis ZSET)

 load -> feed service -> feed cache IDs + celebrity posts (pull) -> rank
                      -> hydrate from post & user caches -> response
```

```bash
# fan-out worker: add post 9876 to user 42's feed (score = created_at), keep newest 500
redis-cli ZADD feed:42 1757836800 9876
redis-cli ZREMRANGEBYRANK feed:42 0 -501
# next page: 20 items strictly older than the cursor score
redis-cli ZRANGE feed:42 '(1757836800' -inf BYSCORE REV LIMIT 0 20
```

Dùng **cursor pagination** — phân trang bằng offset sẽ bỏ sót hoặc lặp bài khi có bài mới chen vào. Bài đã xoá được lọc ở bước hydrate thay vì xoá khỏi hàng triệu feed.

---

## 12. Những lỗi thường gặp

- **Vẽ hộp trước khi hỏi yêu cầu** — thiết kế rất tốt… một hệ thống sai.
- **Có số mà không có hệ quả** — tính ra 23.000 QPS nhưng không nói nó dẫn tới quyết định gì.
- **Thiết kế quá đà** (over-engineering) — Kafka, Kubernetes và sharding cho một tool nội bộ 50 QPS. Hãy khớp thiết kế với ước lượng và nói ngưỡng nào sẽ kích hoạt bước tiếp theo.
- **Nói từ khoá suông** — "thêm Redis" mà không nói key, TTL và cách invalidate.
- **Bỏ qua lỗi** — không trả lời được "nếu node, queue hay AZ này chết thì sao?"
- **Không nêu đánh đổi** — người phỏng vấn sẽ cho rằng bạn không thấy cái giá phải trả.
- **Độc thoại hoặc im lặng**, và cố phủ mọi thứ thay vì đi sâu vào hai phần.

---

## Điểm cần nhớ khi phỏng vấn

- Khung: yêu cầu → ước lượng → API → mô hình dữ liệu → thiết kế tổng quan → đào sâu → điểm nghẽn, có phân bổ thời gian.
- Làm rõ phạm vi; khi không được trả lời, **nói to giả định** và ghi lên bảng.
- QPS = khối lượng mỗi ngày / 86.400 (1 M/ngày ≈ 11,6/s), cao điểm 2–3×; trình bày phép tính và **dùng** kết quả.
- URL shortener: 7 ký tự base62 = 3,5 nghìn tỉ mã; dải bộ đếm thuê theo server + xáo trộn; 302 nếu cần analytics.
- Rate limiter: token bucket (burst) hoặc sliding window counter (O(1), khá chính xác); Lua nguyên tử trên Redis; 429 + `Retry-After`; chọn fail-open hay fail-closed.
- Chat: WebSocket gateway có trạng thái + message service không trạng thái; khử trùng bằng `clientMsgId`; seq theo từng hội thoại; partition theo hội thoại + time bucket.
- News feed: fan-out hybrid; cache ID trong sorted set; cursor pagination.
- Nêu đánh đổi của mọi quyết định và kịch bản lỗi của mọi thành phần.

## Tóm tắt

- Buổi phỏng vấn chấm điểm cách suy luận có cấu trúc, không phải một sơ đồ học thuộc.
- Yêu cầu và ước lượng quyết định kiến trúc.
- API và mô hình dữ liệu theo access pattern đi trước các hộp và mũi tên.
- Phần đào sâu nhắm vào chỗ thực sự khó: sinh ID, đếm phân tán, kết nối có trạng thái, fan-out.
- Tiến hoá một thiết kế đơn giản cho khớp với con số đã nêu, và nói rõ mỗi bước tốn gì.
