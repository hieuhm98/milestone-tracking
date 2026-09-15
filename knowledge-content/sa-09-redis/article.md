# Redis – Cấu trúc dữ liệu trong bộ nhớ ở quy mô lớn

## 1. Redis là gì và vì sao kiến trúc sư hay dùng nó

**Redis** là một **máy chủ cấu trúc dữ liệu trong bộ nhớ** (in-memory data structure server). Client giao tiếp bằng một giao thức đơn giản (RESP) qua TCP, cổng mặc định **6379**, và mỗi giá trị là một cấu trúc dữ liệu thật — string, hash, list, set, sorted set, stream — kèm các lệnh phía server thao tác lên nó một cách nguyên tử (atomic). Vì dữ liệu nằm trong RAM, lệnh thông thường chạy **dưới 1 mili giây**, và một instance thường phục vụ hơn 100 nghìn thao tác đơn giản mỗi giây.

Redis được dùng làm **bộ nhớ đệm** (cache), nơi lưu session, bộ giới hạn tốc độ (rate limiter), bảng xếp hạng (leaderboard), hàng đợi nhẹ, kênh pub/sub và dịch vụ khoá. Nó **không** phải hệ thống lưu trữ gốc (system of record): RAM đắt, và độ bền dữ liệu (durability) là thứ cấu hình được chứ không được đảm bảo.

**Giấy phép — nói đúng trong buổi review.** Redis dùng giấy phép BSD tới tháng 3/2024, khi Redis 7.4 chuyển sang RSALv2/SSPLv1. Linux Foundation fork bản BSD cuối cùng (7.2.4) thành **Valkey**, tương thích lệnh; Redis 8 (2025) bổ sung thêm lựa chọn AGPLv3. Trên AWS, **ElastiCache** và **MemoryDB** cung cấp Valkey bên cạnh Redis OSS. Với code ứng dụng, hiện tại hai bên dùng thay nhau được.

| Chọn Redis khi… | Tìm giải pháp khác khi… |
|---|---|
| Dữ liệu nóng cần truy cập dưới mili giây | Dữ liệu không vừa RAM với chi phí hợp lý |
| Cách truy cập khớp một cấu trúc dữ liệu (bộ đếm, xếp hạng, hàng đợi) | Cần truy vấn tuỳ ý, join, secondary index |
| Chấp nhận mất khoảng một giây ghi cuối | Mọi lệnh ghi đã xác nhận phải sống sót khi crash |

---

## 2. Bên trong: event loop đơn luồng

Redis thực thi lệnh trên **một luồng chính** (main thread). Một **vòng lặp sự kiện** (event loop, dùng epoll trên Linux) đa hợp hàng nghìn socket; mỗi lệnh sẵn sàng được chạy đến khi xong rồi mới tới lệnh tiếp theo.

```text
 clients ──► socket 1 ─┐
             socket 2 ─┼─► epoll ─► [ main thread: read ─► execute ─► reply ] ─► RAM
             socket N ─┘            one command at a time, no locks
```

Nó nhanh vì **không có lock, không chuyển ngữ cảnh** (context switch), và nút thắt thật sự là mạng và bộ nhớ chứ không phải CPU. Từ Redis 6 có **I/O threads** tuỳ chọn (`io-threads`) để song song hoá đọc/ghi socket, còn phần thực thi lệnh vẫn đơn luồng. Và **mọi lệnh đều atomic** một cách tự nhiên.

Mặt trái: **một lệnh chậm sẽ chặn tất cả client.**

| Nguy hiểm | Vì sao | Dùng thay |
|---|---|---|
| `KEYS *` | O(N) trên toàn bộ keyspace | `SCAN` với cursor |
| `DEL` trên hash/set khổng lồ | Giải phóng hàng triệu phần tử đồng bộ | `UNLINK` (giải phóng ở nền) |
| `HGETALL` / `LRANGE 0 -1` trên key lớn | Reply khổng lồ trên main thread | `HSCAN`, phân trang |
| Script Lua dài | Chạy atomic, chặn mọi lệnh khác | Giữ script ngắn |

Công cụ gom lệnh: **pipelining** gửi nhiều lệnh trong một round trip (không atomic); **`MULTI`/`EXEC`** chạy các lệnh đã xếp hàng mà không bị xen ngang (không rollback); **Lua script** (`EVAL`) hoặc **Functions** của Redis 7 chạy logic đọc–sửa–ghi một cách atomic.

---

## 3. Key và string

Keyspace là một từ điển phẳng; quy ước đặt tên phân tách bằng dấu hai chấm như `user:42:profile`. String an toàn với dữ liệu nhị phân (binary-safe), tối đa **512 MB**, nhưng giá trị vượt vài KB đã là dấu hiệu thiết kế có vấn đề.

```bash
SET user:42:name "Linh"
SET page:home "<html>..." EX 300      # value with a 300-second TTL
SET lock:order:7 "a1b2" NX PX 10000   # only if absent, 10 s TTL
INCR stats:pageviews                  # atomic counter, returns new value
MGET user:42:name user:43:name        # one round trip
GETDEL otp:42                         # read once, then remove
```

`INCR` tốt hơn kiểu "đọc, cộng một, ghi lại" trong code ứng dụng: phép cộng diễn ra trên luồng duy nhất, nên các client đồng thời không bao giờ làm mất cập nhật của nhau.

---

## 4. Hash, list và set

**Hash** — một map các field bên trong một key, hợp với object được cập nhật từng field.

```bash
HSET user:42 name "Linh" plan "pro" logins 0
HINCRBY user:42 logins 1
```

**List** — dãy có thứ tự; push/pop ở hai đầu O(1), truy cập theo index ở giữa O(N).

```bash
LPUSH jobs:email '{"to":"a@x.io"}'
BRPOP jobs:email 5                                   # block up to 5 s for a job
LMOVE jobs:email jobs:email:processing RIGHT LEFT    # reliable-queue handoff
LTRIM feed:42 0 99                                   # keep newest 100 items
```

**Set** — tập phần tử duy nhất không thứ tự; thêm/xoá/kiểm tra thành viên O(1), kèm các phép toán tập hợp.

```bash
SADD post:9:likes user:42 user:43
SINTER user:42:follows user:43:follows               # mutual follows
```

Collection nhỏ dùng mã hoá gọn **listpack**, và chỉ chuyển sang hash table/skiplist đầy đủ khi vượt ngưỡng kích thước — vì vậy nhiều hash nhỏ tốn ít bộ nhớ hơn hẳn so với nhiều key string rời rạc.

---

## 5. Sorted set và các kiểu chuyên dụng

**Sorted set (ZSET)** chứa các member duy nhất, mỗi member có một điểm số (score) kiểu số thực, được sắp theo score. Bên trong nó ghép một **skiplist** (duyệt theo thứ tự) với một **hash table** (tra score O(1)), nên `ZADD`, `ZREM`, `ZRANK` là **O(log N)** và đọc theo khoảng là O(log N + M).

```bash
ZADD leaderboard 1500 "alice" 1720 "bob" 1610 "chi"
ZINCRBY leaderboard 50 "alice"
ZRANGE leaderboard 0 9 REV WITHSCORES       # top 10, highest first
ZREVRANK leaderboard "alice"                # 0-based rank from the top
ZRANGE delayed:jobs 0 1700000000 BYSCORE    # jobs due by a timestamp
```

Dùng timestamp làm score biến sorted set thành một chỉ mục thời gian — nền tảng của hàng đợi job trì hoãn (delayed job) và rate limiter kiểu cửa sổ trượt.

| Kiểu | Cho bạn | Dùng điển hình |
|---|---|---|
| Bitmap (`SETBIT`, `BITCOUNT`) | Một bit cho mỗi id số nguyên | Người dùng hoạt động theo ngày |
| HyperLogLog (`PFADD`, `PFCOUNT`) | Đếm phần tử khác nhau xấp xỉ, ≤ 12 KB, sai số ~0,81% | Khách truy cập duy nhất |
| Geo (`GEOADD`, `GEOSEARCH`) | Tìm theo bán kính/hình chữ nhật | "Tài xế trong vòng 2 km" |

---

## 6. Pub/Sub và Streams

**Pub/Sub** là kiểu bắn-rồi-quên (fire-and-forget): `PUBLISH` giao message cho ai đang subscribe *đúng lúc đó*; không có gì được lưu, nên subscriber đang offline sẽ mất message. Phù hợp để phát tín hiệu vô hiệu hoá cache hay thông báo trực tiếp. Redis 7 thêm **sharded pub/sub** (`SPUBLISH`/`SSUBSCRIBE`) để message trong cluster không bị phát tới mọi node.

**Streams** là một log chỉ-ghi-thêm (append-only) với ID (`<ms>-<seq>`) và **consumer group**:

```bash
XADD orders MAXLEN ~ 100000 * id 991 total 25.50    # auto ID, capped length
XGROUP CREATE orders billing $ MKSTREAM
XREADGROUP GROUP billing worker-1 COUNT 10 BLOCK 5000 STREAMS orders >
XACK orders billing 1700000000000-0
XAUTOCLAIM orders billing worker-2 60000 0-0         # take over stuck entries
```

```text
 producer ─XADD─► [ orders: e1 e2 e3 e4 ... ]
                        │ group "billing"
             ┌──────────┴──────────┐
         worker-1               worker-2
   read ► process ► XACK   unacked entries stay in the PEL until acked/claimed
```

Mỗi group giữ một **Pending Entries List (PEL)** gồm các entry đã giao nhưng chưa ack, cho xử lý kiểu at-least-once. Streams hợp với lưu lượng vừa phải khi bạn đã chạy Redis sẵn; cần lưu lâu và thông lượng rất cao thì xem Kafka ở bài 11.

| | Pub/Sub | Streams |
|---|---|---|
| Có lưu trữ | Không | Có |
| Consumer offline | Mất message | Đọc bù được |
| Ack / giao lại | Không | Có (PEL) |

---

## 7. TTL và hết hạn

```bash
EXPIRE session:9f1c 1800
TTL session:9f1c                 # seconds left; -1 = no TTL, -2 = no such key
PERSIST session:9f1c             # remove the TTL
SET session:9f1c "{...}" KEEPTTL # overwrite value, keep TTL
```

Bẫy hay gặp: một lệnh **`SET` thường lên key đã có sẽ xoá TTL của nó**, trừ khi bạn truyền `EX`/`PX`/`KEEPTTL`; còn `INCR` và `HSET` thì giữ TTL.

Key hết hạn bị xoá theo hai cách: **lười** (lazy — khi có client truy cập) và **chủ động** (active — một chu kỳ nền lấy mẫu các key có TTL và xoá key đã hết hạn). Bộ nhớ được thu hồi nhanh nhưng không tức thì. Replica không tự cho key hết hạn; chúng áp dụng lệnh `DEL` do primary gửi sang. Các key được ghi cùng lúc với cùng TTL cũng sẽ hết hạn cùng lúc — hãy thêm độ nhiễu ngẫu nhiên (jitter); xử lý cache stampede là chủ đề của bài 10.

---

## 8. Giới hạn bộ nhớ và chính sách eviction

`maxmemory` giới hạn dung lượng dữ liệu; `maxmemory-policy` quyết định chuyện gì xảy ra khi chạm ngưỡng. Trên bản 64-bit, `maxmemory` mặc định là **0 (không giới hạn)** và policy mặc định là **`noeviction`** — lệnh ghi bị lỗi OOM thay vì **loại bỏ key** (eviction).

| Policy | Loại bỏ trong | Chọn key |
|---|---|---|
| `noeviction` (mặc định) | — | Từ chối lệnh ghi |
| `allkeys-lru` / `allkeys-lfu` | Mọi key | Lâu nhất chưa dùng / ít dùng nhất |
| `allkeys-random` | Mọi key | Ngẫu nhiên |
| `volatile-lru` / `volatile-lfu` / `volatile-random` | Chỉ key có TTL | LRU / LFU / ngẫu nhiên |
| `volatile-ttl` | Chỉ key có TTL | TTL còn lại ngắn nhất |

```bash
# redis.conf for a pure cache node
maxmemory 12gb
maxmemory-policy allkeys-lfu
```

**Cache thuần** → `allkeys-lru`/`allkeys-lfu`. **Cache trộn với dữ liệu phải giữ** → `volatile-*` và chỉ gắn TTL cho key cache (tốt hơn: tách instance). **Hàng đợi hoặc kho dữ liệu** → `noeviction` kèm cảnh báo. LRU/LFU là *xấp xỉ* bằng lấy mẫu (`maxmemory-samples`, mặc định 5). Đặt `maxmemory` thấp hơn RAM vật lý để chừa chỗ cho phân mảnh (fragmentation), buffer replication và copy-on-write khi fork; theo dõi `evicted_keys` và `mem_fragmentation_ratio` trong `INFO`, tìm key lớn bằng `redis-cli --bigkeys`.

---

## 9. Persistence: RDB vs AOF

**RDB** — Redis gọi `fork()` và tiến trình con ghi một bản chụp (snapshot) gọn tại một thời điểm. Cơ chế copy-on-write nhân bản các trang bị sửa trong lúc chụp, nên instance ghi nhiều có thể cần tới ~2× bộ nhớ khi `BGSAVE`. Đặt `vm.overcommit_memory = 1` để fork không bị lỗi.

**AOF** (append-only file) — mọi lệnh ghi được nối vào log và phát lại khi khởi động. `appendfsync` quyết định độ bền: `always` (an toàn nhất, chậm nhất), **`everysec`** (mặc định, mất tối đa ~1 giây), `no` (để hệ điều hành quyết định). Log được nén lại bằng rewrite chạy nền; với `aof-use-rdb-preamble yes` (mặc định), phần gốc ở định dạng RDB để nạp nhanh.

```bash
# redis.conf
save 3600 1 300 100 60 10000   # snapshot after 1 change/1h, 100/5m, 10000/1m
appendonly yes
appendfsync everysec
```

| | RDB | AOF (`everysec`) |
|---|---|---|
| Mất dữ liệu khi crash | Từ snapshot gần nhất (vài phút) | ~1 giây |
| Khởi động lại | Nhanh | Chậm hơn |
| Hợp với | Backup, cache chịu mất được | Dữ liệu bạn không muốn mất |

Production thường bật **cả hai**; cache thuần có thể tắt persistence. Cần mọi lệnh ghi đều bền mà vẫn giữ ngữ nghĩa Redis? Trên AWS, MemoryDB dùng transaction log Multi-AZ.

---

## 10. Replication và Sentinel

Primary truyền các lệnh ghi sang replica (`REPLICAOF host port`): đầu tiên đồng bộ toàn phần bằng RDB, sau đó là luồng lệnh, và khi mất kết nối ngắn thì **đồng bộ một phần** (partial resync) từ backlog.

Replication là **bất đồng bộ** (asynchronous): client được xác nhận trước khi replica nhận lệnh ghi, nên failover có thể mất các lệnh ghi gần nhất. `WAIT 1 100` thu hẹp khoảng hở nhưng không biến Redis thành nhất quán mạnh; `min-replicas-to-write` khiến primary từ chối ghi khi có quá ít replica kết nối.

**Sentinel** bổ sung failover tự động cho triển khai không dùng cluster:

```text
  Sentinel A      Sentinel B      Sentinel C     (port 26379, separate AZs)
        \              |              /
          agree "primary down" (quorum), majority authorises failover
                       │
   [ primary ✗ ]  ── promote ──►  [ replica → new primary ]

   clients ask Sentinel: "who is primary for mymaster?"
```

Chạy **ít nhất 3 Sentinel** ở các vùng lỗi độc lập; client phải **hiểu Sentinel** (Sentinel-aware) thay vì hard-code địa chỉ primary. Primary cũ bị cô lập vẫn có thể nhận lệnh ghi rồi bị huỷ khi nó quay lại — `min-replicas-to-write` hạn chế điều này. Trên AWS, đây là ElastiCache với cluster mode disabled: một primary, tối đa 5 replica, failover Multi-AZ.

---

## 11. Redis Cluster và hash slot

Sentinel tăng tính sẵn sàng chứ không tăng năng lực ghi. **Redis Cluster** chia dữ liệu (sharding) qua nhiều primary:

- **16.384 hash slot**; `slot = CRC16(key) mod 16384`. Mỗi primary sở hữu các dải slot và có replica riêng.
- Các node trao đổi trạng thái (gossip) qua **cluster bus** (cổng dữ liệu + 10000, ví dụ 16379). Tối thiểu **3 primary**; failover có sẵn, không cần Sentinel.

```text
  Node A: slots 0–5460     Node B: slots 5461–10922     Node C: slots 10923–16383

  client ── GET user:42 ──► Node A
  Node A ── "MOVED 9500 10.0.1.12:6379" ──► client retries on Node B, caches slot map
```

Client xử lý chuyển hướng **`MOVED`** (slot nằm ở node khác) và **`ASK`** (slot đang được di chuyển). Ràng buộc khi thiết kế:

- **Lệnh nhiều key, `MULTI` và Lua cần mọi key cùng một slot**, nếu không sẽ gặp lỗi `CROSSSLOT`. Dùng **hash tag**: chỉ phần trong `{}` được băm, nên `{user:42}:cart` và `{user:42}:profile` nằm cùng chỗ.
- Lạm dụng một hash tag tạo ra **shard nóng** (hot shard).
- Chỉ có database 0; key lớn làm việc chia lại shard (resharding) chậm.

Trên AWS: ElastiCache "cluster mode enabled" với configuration endpoint.

---

## 12. Khoá phân tán và những lưu ý

```bash
SET lock:invoice:77 "c3f9-token" NX PX 30000   # acquire only if absent, auto-expire
```

Việc nhả khoá phải kiểm tra quyền sở hữu một cách atomic — một lệnh `DEL` trần có thể xoá nhầm khoá đã hết hạn và bị người khác lấy:

```lua
-- KEYS[1] = lock key, ARGV[1] = my token
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
```

Như vậy vẫn **không** đảm bảo tính đúng đắn:

- **Failover làm mất khoá** — replication bất đồng bộ nên primary mới có thể không có khoá.
- **Tiến trình bị dừng** — một lần GC pause dài hơn TTL khiến bên giữ khoá vẫn tưởng mình còn giữ.
- **Đồng hồ nhảy** làm sai lệch thời điểm hết hạn.

**Redlock** lấy khoá trên đa số N primary độc lập (thường là 5). Nó giảm vấn đề failover nhưng gây tranh cãi (bài phản biện của Kleppmann và phản hồi của antirez) vì vẫn giả định thời gian dừng và độ lệch đồng hồ có giới hạn.

Quy tắc: khoá Redis ổn cho mục đích **hiệu quả** (tránh làm trùng việc). Với **tính đúng đắn** (tiền, tồn kho), tài nguyên được bảo vệ phải kiểm tra **fencing token** — một số tăng dần phát kèm khoá; tầng lưu trữ từ chối token cũ hơn token đã thấy — hoặc dùng etcd/ZooKeeper hay ràng buộc của database.

---

## 13. Ứng dụng: session, leaderboard, rate limiter

**Session.** App server phi trạng thái (stateless) lưu `SET session:<id> <json> EX 1800`, làm mới TTL mỗi khi người dùng hoạt động. Mọi instance sau load balancer đều thấy cùng một session.

**Leaderboard.** `ZINCRBY` khi có sự kiện cộng điểm, `ZRANGE … REV WITHSCORES` cho top N, `ZREVRANK` cho "hạng của bạn" — O(log N), trong khi SQL phải sắp xếp hoặc chạy window function tính hạng.

**Rate limiter** (cửa sổ cố định; so sánh các thuật toán ở bài 17):

```js
// ioredis: at most `limit` requests per user per 60-second window
const script = `
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  return count
`;

async function isAllowed(redis, userId, limit = 100) {
  const window = Math.floor(Date.now() / 60000);
  const key = `rl:${userId}:${window}`;
  const count = await redis.eval(script, 1, key, 60);

  return count <= limit;
}
```

Script làm cho `INCR` + `EXPIRE` thành atomic; nếu gọi hai lệnh riêng mà app crash ở giữa, bộ đếm sẽ tồn tại mãi không có TTL. Cửa sổ trượt dùng một sorted set cho mỗi user: `ZREMRANGEBYSCORE` các timestamp cũ, `ZADD` thời điểm hiện tại, rồi `ZCARD`.

**Redis vs Memcached:** Memcached đa luồng, chỉ lưu string không cấu trúc, không persistence, không replication; chỉ chọn nó cho một cache string đơn giản và rất lớn. **Gia cố bảo mật:** không bao giờ mở cổng 6379 ra internet, bật ACL và TLS (Redis 6+), giữ `protected-mode yes`, và theo dõi `SLOWLOG GET`, số key bị evict và độ trễ replication.

---

## Điểm cần nhớ khi phỏng vấn

- **Thực thi lệnh đơn luồng** — nhanh vì không có lock và nút thắt là mạng/RAM; một lệnh chậm (`KEYS`, `DEL` key khổng lồ) chặn tất cả.
- Chọn kiểu dữ liệu theo cách truy cập: bộ đếm → `INCR`; object → hash; hàng đợi → list/stream; tính duy nhất → set; xếp hạng/chỉ mục thời gian → **sorted set** (O(log N)).
- `SET` thường **xoá TTL**; `TTL` trả -1 (không có TTL) hoặc -2 (key không tồn tại).
- `maxmemory-policy` mặc định là **`noeviction`**; cache dùng `allkeys-lru`/`allkeys-lfu`; `volatile-*` chỉ loại key có TTL.
- **RDB** = fork + snapshot, mất vài phút dữ liệu; **AOF `everysec`** mất ~1 giây; production thường bật cả hai.
- Replication **bất đồng bộ**; failover có thể mất lệnh ghi đã xác nhận. Sentinel cần ≥ 3 node và client hiểu Sentinel.
- Cluster: **16.384 slot**, `CRC16(key) mod 16384`, `MOVED`/`ASK`, lệnh nhiều key cần **hash tag**.
- Pub/Sub làm mất message với subscriber offline; Streams có consumer group, ack và PEL.
- Khoá: `SET NX PX` + nhả khoá bằng Lua có kiểm tra token; cần đúng đắn thì thêm **fencing token**.
- Redis 7.4+ là source-available; **Valkey** là bản fork BSD; Redis 8 thêm AGPLv3.

## Tóm tắt

- Redis giữ cấu trúc dữ liệu trong RAM và chạy lệnh lần lượt từng cái, cho thao tác atomic và độ trễ dưới mili giây.
- Mỗi kiểu dữ liệu khớp một nhu cầu: bộ đếm, object, hàng đợi, tính duy nhất, xếp hạng, log sự kiện.
- TTL cộng với chính sách eviction có chủ đích tạo ra cache có giới hạn; `noeviction` bảo vệ kho dữ liệu.
- RDB và AOF đánh đổi điểm khôi phục với chi phí; replication bất đồng bộ nên failover có thể mất lệnh ghi gần nhất.
- Sentinel cho HA trên một shard; Cluster chia lệnh ghi qua 16.384 slot với ràng buộc cùng slot.
- Session, leaderboard, rate limiter và khoá phục vụ hiệu quả là những ứng dụng tự nhiên trong các giới hạn đó.
