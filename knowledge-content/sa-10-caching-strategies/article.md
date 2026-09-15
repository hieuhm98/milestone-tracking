# Chiến lược Caching – Nhanh mà không "nói dối" người dùng

## 1. Vì sao cần cache, và cái giá thật sự

**Bộ nhớ đệm** (cache) là một bản sao nhỏ hơn, nhanh hơn của dữ liệu mà **nguồn sự thật** (source of truth) nằm ở một nơi chậm hơn. Caching đánh đổi **độ tươi của dữ liệu và độ phức tạp** để lấy **độ trễ (latency), thông lượng (throughput) và chi phí**. Kiến trúc sư thêm cache vì một trong ba lý do: nguồn chậm (một query tổng hợp mất 40 ms), nguồn đắt hoặc bị giới hạn tần suất (API bên thứ ba tính tiền), hoặc nguồn không chịu nổi tải (database primary đang 80% CPU).

Các con số độ trễ ước lượng để ra quyết định:

| Dữ liệu nằm ở đâu | Độ trễ điển hình |
|---|---|
| Bộ nhớ trong tiến trình (một map trong service) | ~100 ns |
| Cache phân tán cùng AZ (Redis, Memcached) | ~0,5–1 ms một vòng |
| Query database có index | ~1–10 ms; query nặng 50 ms+ |
| Gọi khác region / API bên thứ ba | 50–300 ms |

Con số quan trọng nhất là **tỉ lệ trúng cache** (hit ratio). Độ trễ hiệu dụng:

```text
effective = hit_ratio * cache_latency + (1 - hit_ratio) * (cache_latency + source_latency)

cache 1 ms, database 40 ms
  hit ratio 95% -> 0.95*1 + 0.05*41 = 3.0 ms
  hit ratio 50% -> 0.50*1 + 0.50*41 = 21.0 ms
```

Một cache có hit ratio thấp chỉ thêm một bước nhảy mạng và một điểm lỗi mà chẳng được bao nhiêu. Trước khi thêm cache, hãy hỏi: *dữ liệu có được đọc nhiều hơn hẳn số lần thay đổi không, và nghiệp vụ có chấp nhận nó cũ đi một chút không?* Nếu một trong hai câu trả lời là không, hãy sửa query hoặc index thay vì thêm cache.

---

## 2. Cache nhiều tầng: từ trình duyệt tới database

Hệ thống thực tế cache ở nhiều tầng. Tầng càng gần người dùng càng tiết kiệm nhiều công việc nhưng càng khó vô hiệu hoá.

```text
 user
  v
[Browser cache]        Cache-Control, ETag           a hit = no request at all
  v
[CDN edge]             s-maxage, cache key, purge    a hit = no trip to your region
  v
[Reverse proxy]        nginx proxy_cache (topic 8)   a hit = no app CPU
  v
[App: in-process L1]   small LRU, seconds of TTL     a hit = no network hop
  v
[Distributed L2]       Redis / Memcached / Valkey    shared across instances
  v
[Database]             buffer pool (pages in RAM)    the source of truth
```

Trình duyệt là tầng khó vô hiệu hoá nhất (bạn không thể với tay vào trình duyệt của người dùng), CDN cần lệnh purge, bản sao in-process lệch nhau giữa các instance, còn cache phân tán chỉ có một chỗ để xoá. Nguyên tắc: **tầng càng xa ra ngoài thì nội dung càng phải ngắn hạn hoặc có phiên bản**. Không bao giờ đặt dữ liệu cá nhân hoá vào tầng dùng chung nếu cache key không chứa danh tính người dùng.

---

## 3. Cache-aside (lazy loading)

**Cache-aside** là pattern mặc định: ứng dụng nắm toàn bộ logic, cache chỉ là kho key-value thụ động.

```text
read:   app -> cache GET key
          hit  -> return value
          miss -> app -> DB SELECT -> app -> cache SET key value TTL -> return

write:  app -> DB UPDATE -> app -> cache DEL key
```

```js
async function getProduct(id) {
  const key = `product:v1:${id}`;
  const cached = await redis.get(key);

  if (cached !== null) return JSON.parse(cached);

  const product = await db.products.findById(id);

  if (product) {
    await redis.set(key, JSON.stringify(product), { EX: 300 });
  }

  return product;
}

async function updateProduct(id, changes) {
  await db.products.update(id, changes);
  await redis.del(`product:v1:${id}`); // delete, do not overwrite
}
```

Ưu điểm: chỉ dữ liệu thực sự được yêu cầu mới vào cache, và nếu cache sập thì ứng dụng vẫn đọc được database. Nhược điểm: request đầu tiên cho mỗi key luôn chậm (**cache nguội** – cold cache – sau failover có thể đè bẹp DB), và code ứng dụng phải xử lý đúng mọi lần miss và mọi lần invalidation.

---

## 4. Read-through, write-through, write-behind, refresh-ahead

Ở các pattern còn lại, **chính tầng cache nói chuyện với nguồn dữ liệu**, nên ứng dụng chỉ nhìn thấy cache.

| Pattern | Cách hoạt động | Rủi ro chính |
|---|---|---|
| **Read-through** | Khi miss, cache (hoặc thư viện đứng trước nó) tự nạp từ DB qua một loader đã cấu hình | Logic nạp dữ liệu bị giấu trong hạ tầng |
| **Write-through** | App ghi vào cache; cache ghi đồng bộ xuống DB rồi mới xác nhận | Độ trễ ghi = cache + DB; cache cả dữ liệu không ai đọc |
| **Write-behind** (write-back) | App ghi vào cache; cache xác nhận ngay và đẩy xuống DB bất đồng bộ, thường theo lô | **Mất dữ liệu** nếu cache chết trước khi kịp đẩy |
| **Refresh-ahead** | Các entry sắp hết hạn được nạp lại ngầm | Tốn công nạp lại những key đã nguội |

Trên AWS, **DynamoDB Accelerator (DAX)** là cache read-through/write-through cho DynamoDB; **ElastiCache** là kho thuần mà bạn dùng theo kiểu cache-aside. Write-behind hợp với bộ đếm lưu lượng lớn, lượt xem hay telemetry — nơi mất một giây dữ liệu ghi là chấp nhận được — tuyệt đối không dùng cho thanh toán hay tồn kho.

---

## 5. Thiết kế TTL

**TTL** (time to live – thời gian sống) là giới hạn trên của độ cũ dữ liệu và là lưới an toàn cho các bug invalidation. Luôn đặt TTL, kể cả khi bạn đã chủ động xoá cache.

Cách chọn:

- **Bắt đầu từ mức chịu đựng của nghiệp vụ.** "Giá được phép sai tối đa 60 s" nghĩa là TTL ≤ 60 s. Mô tả sản phẩm có thể chịu được một giờ; số lượng tồn kho chỉ vài giây.
- **Cân tốc độ thay đổi với tốc độ đọc.** Một key được đọc 1.000 lần mỗi giây và đổi một lần mỗi ngày là ứng viên lý tưởng cho TTL dài cộng invalidation theo sự kiện.
- **Thêm jitter (độ lệch ngẫu nhiên).** Nếu 100.000 key được nạp cùng lúc với cùng TTL (ví dụ warm-up cache sau deploy), chúng sẽ hết hạn cùng lúc. Hãy ngẫu nhiên hoá: `ttl = base + random(0, base * 0.1)`.
- **Mỗi tầng một TTL.** Trình duyệt 60 s, CDN 5 phút kèm purge khi thay đổi, ứng dụng 10 phút kèm xoá khi ghi.
- **Cache kết quả rỗng trong thời gian ngắn.** Cache "user 42 không tồn tại" trong 30–60 s giúp DB khỏi bị hỏi lặp lại về key không có.
- **Biết cái gì không nên cache.** Asset có fingerprint được một năm (URL đổi thay vì nội dung); session dùng hết hạn trượt (sliding expiry); số dư hoặc tồn kho dùng để *quyết định* một lần checkout phải đọc từ nguồn.

---

## 6. Các chiến lược invalidation

"Trong khoa học máy tính chỉ có hai việc khó: vô hiệu hoá cache (cache invalidation) và đặt tên." Phần khó không phải là xoá một key — mà là biết **mọi** key bị một thay đổi ảnh hưởng, ở mọi tầng.

| Chiến lược | Cách làm | Phù hợp với |
|---|---|---|
| **Chỉ dựa vào TTL** | Để entry tự hết hạn | Dữ liệu chấp nhận được độ cũ có giới hạn |
| **Xoá khi ghi** | Sau khi DB commit, `DEL` các key liên quan | Phần lớn hệ thống cache-aside |
| **Theo sự kiện** | Phát event thay đổi hoặc đọc log của DB (CDC, ví dụ Debezium) rồi invalidate từ một consumer | Nhiều service cùng ghi một dữ liệu; tách người ghi khỏi cache key |
| **Key có phiên bản** | Đưa version vào key (`product:v7:42`) hoặc tăng bộ đếm namespace, key cũ đơn giản là không bao giờ được đọc nữa | Invalidation hàng loạt, đổi schema, deploy |
| **Tag / surrogate key** | Gắn tag cho response (`product-42`) và purge theo tag | Trang CDN nhúng nhiều đối tượng |

Vì sao **xoá** thay vì **ghi đè** giá trị mới khi ghi? Hai writer đồng thời có thể commit vào DB theo một thứ tự nhưng cập nhật cache theo thứ tự ngược lại, để lại giá trị cũ hơn trong cache tới khi hết TTL. Xoá thì idempotent: lần đọc tiếp theo sẽ nạp lại đúng thứ DB đang có.

Thứ tự cũng quan trọng. Xoá **sau** khi DB commit; nếu xoá trước, một reader đồng thời có thể nạp lại dòng cũ trước khi lệnh ghi của bạn hoàn tất. Nếu chính lệnh xoá thất bại (mạng chập chờn), TTL là lưới an toàn — hoặc retry lệnh xoá qua outbox hay CDC consumer để chắc chắn nó xảy ra.

---

## 7. Đánh đổi về tính nhất quán

Cache nằm ngoài transaction của database, nên **cache + DB tốt nhất cũng chỉ nhất quán cuối cùng** (eventually consistent). Ngay cả cache-aside làm đúng cũng có một race condition hiếm gặp:

```text
time  Reader A                         Writer B
 t1   GET key -> miss
 t2   SELECT row -> old value
 t3                                    UPDATE row -> new value (commit)
 t4                                    DEL key
 t5   SET key = old value              <- stale until TTL expires
```

Nó cần một lần đọc bắt đầu trước và kết thúc sau trọn một lần ghi, nên hiếm — nhưng ở lưu lượng lớn thì "hiếm" xảy ra mỗi ngày. Các cách giảm thiểu, từ rẻ tới mạnh:

- **TTL ngắn** — giới hạn cửa sổ thiệt hại.
- **Xoá kép có trễ** (delayed double delete) — xoá, commit, rồi xoá lần nữa sau một khoảng lâu hơn một lần đọc điển hình (ví dụ 500 ms).
- **Kiểm tra version / lease** — reader nhận một token khi miss, và lệnh `SET` của nó bị từ chối nếu key đã bị invalidate trong lúc đó (bài báo Memcache của Facebook gọi đây là lease).
- **Read-your-writes** — sau khi user sửa, đọc dữ liệu của user đó từ primary trong một khoảng ngắn, hoặc bỏ qua cache cho họ.
- **Đừng cache nó** — với giá trị quyết định tiền bạc hoặc hành động không đảo ngược được, hãy đọc từ nguồn sự thật.

Câu hỏi trong architecture review luôn là: *hậu quả tệ nhất khi trả về giá trị này cũ N giây là gì?* Avatar cũ thì vô hại; số ghế trống cũ thì bán vượt vé máy bay.

---

## 8. Cache stampede (dogpile) và cách chữa

**Cache stampede** (còn gọi thundering herd, dogpile) xảy ra khi một key nóng hết hạn, hàng trăm request đồng thời cùng miss, cùng chạy một query đắt, và database gục.

```text
t0         key "home:feed" expires (5,000 req/s on it)
t0+1 ms    request 1 miss -> run 800 ms query
t0+2 ms    request 2 miss -> run 800 ms query
...        ~4,000 identical queries before the first SET -> DB CPU 100%
```

Các cách chữa, thường kết hợp với nhau:

1. **Gộp request (request coalescing / single flight)** — trong một instance, các lần miss đồng thời cho cùng key dùng chung một promise đang chạy.
2. **Lock / mutex phân tán** — chỉ request giành được lock ngắn hạn mới dựng lại dữ liệu; các request khác chờ một chút rồi đọc lại cache, hoặc trả giá trị cũ.
3. **Stale-while-revalidate** — tiếp tục trả giá trị cũ sau mốc hết hạn mềm trong khi một job nền làm mới nó.
4. **Làm mới sớm theo xác suất** (probabilistic early refresh) — khi gần hết hạn, mỗi reader làm mới với xác suất tăng dần về 1, nên thường chỉ một request làm mới trước khi key hết hạn. Công thức đã công bố (Vattani và cộng sự, 2015) tính lại khi `now - delta * beta * ln(random()) >= expiry`, với `delta` là thời gian tính lại và `beta` ≈ 1.
5. **Jitter cho TTL** — tránh việc nhiều key khác nhau hết hạn cùng lúc.

```js
const inFlight = new Map();

async function getWithCoalescing(key, load, ttlSeconds) {
  const cached = await redis.get(key);

  if (cached !== null) return JSON.parse(cached);

  if (inFlight.has(key)) return inFlight.get(key);

  const promise = (async () => {
    try {
      const value = await load();
      const jitter = Math.floor(Math.random() * ttlSeconds * 0.1);
      await redis.set(key, JSON.stringify(value), { EX: ttlSeconds + jitter });

      return value;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);

  return promise;
}
```

Coalescing chỉ bảo vệ trong phạm vi một instance; với 50 instance bạn vẫn có thể có 50 lần dựng lại — lúc đó cần lock (`SET lock:key token NX PX 10000`) hoặc stale-while-revalidate. Lock bắt buộc có thời hạn để một holder bị crash không chặn việc dựng lại mãi mãi — các lưu ý về lock nằm ở chủ đề Redis.

---

## 9. Hot key, cache penetration và cache avalanche

Ba kiểu sự cố liên quan này xuất hiện trong mọi buổi phỏng vấn về caching.

| Vấn đề | Chuyện gì xảy ra | Cách phòng |
|---|---|---|
| **Hot key** (key nóng) | Một key (profile người nổi tiếng, món hàng flash sale) nhận lưu lượng lớn đến mức làm bão hoà một shard cache hoặc đường mạng của nó | Cache L1 in-process với TTL 1–5 s; nhân bản key thành `item:42#0..#9` và đọc ngẫu nhiên một bản; warm-up trước sự kiện |
| **Cache penetration** (xuyên thủng cache) | Request cho key không tồn tại (bug hoặc kẻ tấn công quét ID) luôn miss và đánh thẳng vào DB | Cache kết quả rỗng với TTL ngắn; **Bloom filter** chứa các ID hợp lệ để loại key không thể có; validate input |
| **Cache avalanche** (lở tuyết cache) | Một phần lớn key hết hạn cùng lúc, hoặc cụm cache sập, khiến toàn bộ lưu lượng dồn vào DB | Jitter cho TTL; cache có replica/HA; rate limit hoặc circuit breaker trước DB; trả dữ liệu cũ hoặc phản hồi suy giảm |

**Big key** (key quá lớn) là họ hàng của hot key: một list 5 MB trong cache tốn thời gian serialize và truyền mạng ở mỗi lần đọc. Hãy chia nhỏ (phân trang, cache theo từng item). Theo dõi các metric để lộ ra những sự cố này: hit ratio, số lần evict mỗi giây, p99 latency của cache và QPS của DB.

---

## 10. Eviction, định cỡ và chọn kho cache

Cache có giới hạn. Khi đầy, **chính sách loại bỏ** (eviction policy) quyết định bỏ cái gì. **LRU** (least recently used – ít được dùng gần đây nhất) hợp với phần lớn workload có tính cục bộ theo thời gian; **LFU** (least frequently used – ít được dùng thường xuyên nhất) hợp với độ phổ biến ổn định như các sản phẩm bán chạy; eviction theo TTL bỏ các key sắp hết hạn; FIFO hay ngẫu nhiên thì rẻ nhưng hiếm khi tốt nhất.

Định cỡ cache theo **tập dữ liệu làm việc** (working set), không phải toàn bộ dữ liệu: nếu 20% sản phẩm nhận 90% lượt đọc, hãy cache 20% đó cộng dư địa. Liên tục evict những key rồi lại bị yêu cầu ngay sau đó (churn) nghĩa là cache quá nhỏ.

Chọn nơi đặt cache:

| | In-process (Caffeine, `lru-cache`) | Phân tán (Redis, Memcached, Valkey) |
|---|---|---|
| Độ trễ | Nano giây | ~1 ms |
| Dùng chung giữa các instance | Không — mỗi bản lệch nhau | Có |
| Còn sau khi restart | Không | Có (khi có replication) |
| Invalidation | Cần pub/sub tới mọi instance | Một lệnh `DEL` |

Cách ghép phổ biến là **hai tầng**: L1 in-process nhỏ với TTL vài giây cho những key nóng nhất, L2 phân tán cho mọi thứ còn lại. Chi tiết bên trong Redis nằm ở chủ đề 9.

---

## 11. HTTP caching header

HTTP caching (RFC 9111) là cache rẻ nhất bạn có: trình duyệt hoặc CDN làm hết việc. Origin điều khiển nó bằng response header.

| Directive | Ý nghĩa |
|---|---|
| `Cache-Control: max-age=N` | Còn tươi trong N giây ở mọi cache |
| `s-maxage=N` | Ghi đè `max-age` chỉ cho cache **dùng chung** (CDN, proxy) |
| `public` / `private` | `private` = chỉ trình duyệt của người dùng được lưu (dữ liệu riêng từng user) |
| `no-cache` | Được lưu, nhưng **phải revalidate** với origin trước mỗi lần dùng |
| `no-store` | Không được lưu ở bất cứ đâu (dữ liệu nhạy cảm) |
| `immutable` | Không bao giờ đổi trong thời gian còn tươi; bỏ qua revalidate khi reload |
| `stale-while-revalidate=N` | Được trả bản cũ trong N s trong khi làm mới ngầm |
| `stale-if-error=N` | Được trả bản cũ trong N s nếu origin lỗi |
| `Vary: Accept-Encoding` | Các request header được liệt kê trở thành một phần của cache key |

**Revalidation** (xác thực lại) tránh tải lại nội dung không đổi:

```text
1st  GET /api/products          -> 200 OK
                                   ETag: "a1b2c3"
                                   Cache-Control: no-cache
2nd  GET /api/products
     If-None-Match: "a1b2c3"     -> 304 Not Modified (no body)
```

`Last-Modified` / `If-Modified-Since` hoạt động tương tự nhưng dùng mốc thời gian. Một chính sách điển hình cho web app:

```text
/assets/app.3f9a1c.js   Cache-Control: public, max-age=31536000, immutable
/index.html             Cache-Control: no-cache            (+ ETag)
/api/me                 Cache-Control: private, no-store
/api/catalog            Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=30
```

Lưu ý `no-cache` **không** có nghĩa "đừng cache" — `no-store` mới là vậy. Và cẩn thận với `Vary: User-Agent` hoặc `Vary: Cookie`: chúng xé nhỏ cache tới mức hit ratio gần bằng không.

---

## 12. Caching trên CDN trong thực tế

**CDN** cache ở các edge location gần người dùng, giảm độ trễ và che chắn cho origin. Những điều kiến trúc sư phải quyết định:

- **Cache key.** Mặc định gần như là host + path (+ một số query string được chọn). Mỗi header, cookie hay query parameter thêm vào đều nhân số biến thể và hạ hit ratio. Chỉ forward những gì origin thực sự dùng.
- **Invalidation.** Ưu tiên **URL có phiên bản** (`app.3f9a1c.js`) để deploy không cần purge gì cả. Dùng purge cho HTML và nội dung phải đổi tại một URL cố định. Trên **CloudFront**, invalidation theo path có hiệu lực trong vài phút, và vượt quá hạn mức miễn phí hằng tháng thì tính tiền theo path, nên wildcard hoặc URL có phiên bản mở rộng tốt hơn.
- **Origin shield.** Một tầng cache khu vực bổ sung đứng trước origin, để các lần miss từ nhiều edge dồn thành một request tới origin (CloudFront Origin Shield; CDN khác cũng có ý tưởng tương tự).
- **Nội dung động và cá nhân hoá.** Cache phần khung chung ở chế độ public và tải phần riêng từng user riêng, hoặc để chúng `private`. Một response có `Set-Cookie` hay dữ liệu user bị cache public là sự cố lộ dữ liệu kinh điển.
- **TTL mặc định.** Nếu origin không gửi header caching, CDN dùng mặc định của nó (default TTL của CloudFront là 24 giờ) — luôn gửi header tường minh.

```text
             edge Tokyo ----\
user(VN) --> edge Singapore --> origin shield (1 region) --> origin (ALB / S3)
             edge Sydney ---/
   cache hit at edge: ~10-30 ms       miss collapses here     only one fetch
```

Đo sức khoẻ CDN bằng **hit ratio ở edge** và **số request tới origin mỗi giây**; một bản deploy vô tình thêm `?t=timestamp` vào mọi asset sẽ hiện ra dưới dạng chỉ số đầu sụp đổ và chỉ số sau tăng vọt.

---

## Điểm cần nhớ khi phỏng vấn

- Cache khi lượt đọc áp đảo lượt ghi và nghiệp vụ chấp nhận độ cũ có giới hạn; chứng minh bằng **hit ratio** và độ trễ hiệu dụng, không phải cảm tính.
- **Cache-aside** là mặc định: đọc miss → nạp → `SET` kèm TTL; ghi → commit DB → **`DEL`** key. Write-behind nhanh nhưng có thể **mất dữ liệu**.
- Luôn đặt **TTL**, thêm **jitter**, và chọn TTL từ mức chịu đựng độ cũ của nghiệp vụ.
- Cache + DB là **nhất quán cuối cùng**; nắm race condition đọc-sau-khi-xoá và cách xử lý (TTL ngắn, xoá kép, lease, read-your-writes, hoặc không cache dữ liệu dùng để ra quyết định).
- **Stampede**: single flight, lock có thời hạn, stale-while-revalidate, làm mới sớm theo xác suất. **Penetration**: cache kết quả rỗng và Bloom filter. **Avalanche**: jitter và HA. **Hot key**: cache L1 và nhân bản key.
- Các tầng: trình duyệt → CDN → proxy → in-process → phân tán → DB; càng ra ngoài càng khó invalidate, nên hãy đánh phiên bản URL.
- `no-cache` = phải revalidate; `no-store` = không bao giờ lưu; `s-maxage` dành cho cache dùng chung; `private` cho dữ liệu riêng từng user; ETag → 304.

## Tóm tắt

- Cache đánh đổi độ tươi và độ phức tạp lấy độ trễ, thông lượng và chi phí; giá trị của nó được đo bằng hit ratio.
- Cache-aside, read-through, write-through, write-behind và refresh-ahead khác nhau ở chỗ ai nạp và ai ghi dữ liệu, cùng rủi ro về nhất quán và độ bền dữ liệu.
- TTL giới hạn độ cũ; invalidation bằng xoá, sự kiện, key có phiên bản hoặc tag giúp dữ liệu đúng sớm hơn; xoá sau khi commit.
- Stampede, hot key, penetration và avalanche là những kiểu sự cố đoán trước được và có cách phòng chuẩn.
- Chính sách eviction và việc định cỡ theo working set quyết định cache có thực sự chứa thứ đang được đọc hay không.
- HTTP header và CDN đẩy caching ra tận edge; URL có phiên bản giúp invalidation miễn phí, còn cache key quyết định hit ratio.
