# Thiết kế API & API Gateway

## 1. API là một hợp đồng — chọn kiểu API trước

API sống lâu hơn code đứng sau nó: khi client đã phát hành, mọi field, status code và định dạng lỗi đều là một lời hứa. Quyết định đầu tiên là **kiểu API** (API style), vì nó quyết định giao thức truyền, công cụ và cách hệ thống hỏng.

| Kiểu | Giao thức | Mạnh ở | Yếu ở |
|---|---|---|---|
| **REST** | HTTP + JSON | API công khai, CRUD, HTTP caching | Nhiều round trip với dữ liệu lồng nhau |
| **gRPC** | HTTP/2 + Protobuf | Gọi nội bộ, streaming, hợp đồng chặt | Trình duyệt cần proxy |
| **GraphQL** | HTTP + JSON | Nhiều loại client cần dữ liệu khác nhau | Caching, kiểm soát chi phí, N+1 |
| **Event** | Broker | Tách rời (decoupling), việc chạy lâu | Không có câu trả lời ngay |
| **WebSocket / SSE** | Kết nối sống lâu | Server chủ động đẩy (push) | Scale kết nối có trạng thái |

Một lựa chọn mặc định dễ bảo vệ: **REST ở biên công khai, gRPC giữa các service, event cho việc có thể chờ** (broker nằm ở bài message queue). Viết hợp đồng trước — OpenAPI, `.proto` hoặc GraphQL SDL — rồi sinh client, mock và tài liệu từ đó (contract-first).

---

## 2. Thiết kế tài nguyên REST

Mô hình hoá **tài nguyên** (resource — danh từ); HTTP method đóng vai động từ.

```text
GET    /orders?status=paid&limit=20    list (filter + paginate)
POST   /orders                         create -> 201 + Location header
GET    /orders/ord_123                 read
PATCH  /orders/ord_123                 partial update
DELETE /orders/ord_123                 delete -> 204
POST   /orders/ord_123/cancellations   action modelled as a resource
```

Dùng danh từ số nhiều, ID mờ (opaque ID — ID tự tăng làm lộ quy mô dữ liệu và dễ bị dò lần lượt), thời gian ISO 8601 theo UTC, và tiền là số nguyên theo đơn vị nhỏ nhất kèm mã tiền tệ — không bao giờ dùng float.

Retry, proxy và cache đều dựa vào ngữ nghĩa của method:

| Method | An toàn (safe) | **Idempotent** (gọi N lần = gọi 1 lần) |
|---|---|---|
| GET, HEAD | Có | Có |
| PUT, DELETE | Không | Có |
| POST | Không | **Không** |
| PATCH | Không | Không đảm bảo |

**Khoá lạc quan** (optimistic concurrency): trả `ETag`; client gửi `If-Match` khi cập nhật; nếu tài nguyên đã bị người khác sửa trong lúc đó thì trả **412 Precondition Failed** thay vì âm thầm ghi đè (lost update).

---

## 3. Status code và định dạng lỗi

Gateway, logic retry và dashboard đều rẽ nhánh theo status code.

| Code | Ý nghĩa |
|---|---|
| 201 / 202 / 204 | Đã tạo / đã nhận để xử lý bất đồng bộ / không có nội dung |
| 400 | Request sai định dạng |
| 401 | **Chưa xác thực** — thiếu hoặc hết hạn token |
| 403 | **Đã xác thực nhưng không có quyền** |
| 404 / 409 | Không tìm thấy / xung đột trạng thái hoặc trùng lặp |
| 422 | Đúng định dạng nhưng không qua validation |
| 429 | Bị giới hạn tốc độ — gửi kèm `Retry-After` |
| 502 / 503 / 504 | Upstream lỗi / quá tải / upstream timeout |

Quy tắc nhanh: **4xx = client phải sửa gì đó, đừng retry mù quáng; 5xx và 429 = retry với backoff.** Đừng bao giờ trả 200 kèm `"success": false`.

Dùng một định dạng lỗi duy nhất: **RFC 9457 Problem Details** (`application/problem+json`, thay thế RFC 7807).

```json
{
  "type": "https://api.example.com/problems/insufficient-funds",
  "title": "Insufficient funds",
  "status": 422,
  "detail": "Balance is 30.00 USD, transfer needs 50.00 USD.",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736"
}
```

Kèm trace ID để đội hỗ trợ tra log; không bao giờ để lộ stack trace hay câu SQL.

---

## 4. Idempotency key

Mạng thường hỏng *sau khi* server đã làm xong việc: client timeout, retry `POST /payments`, và khách bị trừ tiền hai lần. Vì vậy client gửi một UUID làm **idempotency key** cho mỗi thao tác logic, giữ nguyên qua mọi lần retry.

```text
Client                          API                         Key store
  | POST /payments               |                               |
  | Idempotency-Key: 7f3a        |-- reserve key (NX) ---------->| new -> process
  |     (timeout, no response)   |-- save 201 + body ----------->|
  | POST /payments (retry)       |                               |
  | Idempotency-Key: 7f3a        |-- lookup -------------------->| exists
  |<-- 201, same stored body ----|                               |
```

- Phạm vi key theo từng tài khoản; lưu key, hash của request và response kèm TTL (Stripe giữ khoảng 24 giờ).
- **Giữ chỗ nguyên tử** (atomic) bằng unique constraint hoặc Redis `SET key val NX EX ttl`, để hai lần retry đồng thời không cùng xử lý.
- Key đang được xử lý → **409**; cùng key nhưng body khác → **422**.
- Ghi bản ghi nghiệp vụ và bản ghi key trong cùng một transaction nếu có thể.

PUT và DELETE vốn idempotent theo định nghĩa; key dành cho POST. Consumer phía sau vẫn phải tự khử trùng lặp.

---

## 5. Phân trang

Không bao giờ trả về một danh sách không giới hạn. Hai cách **phân trang** (pagination) chính:

| | Offset (`?page=5`) | Cursor / keyset (`?after=<cursor>`) |
|---|---|---|
| Trang sâu | Chậm: DB vẫn đọc rồi bỏ các dòng bị skip | Chi phí hằng số nhờ index |
| Có insert đồng thời | Phần tử bị bỏ sót hoặc lặp lại | Ổn định |
| Nhảy tới trang N | Được | Không |
| Phù hợp | Bảng admin, dữ liệu nhỏ | Feed, dữ liệu lớn hoặc thay đổi liên tục |

```sql
-- keyset: the cursor encodes the last row's (created_at, id)
SELECT id, created_at, total_minor
FROM orders
WHERE (created_at, id) < ($1, $2)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

Làm cursor **mờ** (base64 của khoá sắp xếp) để có thể đổi cách cài đặt bên trong, và luôn thêm cột phá hoà duy nhất (`id`), nếu không các dòng trùng timestamp sẽ biến mất. Giới hạn `limit` tối đa phía server; tránh trả tổng chính xác trên bảng lớn — `COUNT(*)` có thể tốn hơn cả trang dữ liệu.

---

## 6. Versioning và tiến hoá API

Chiến lược tốt nhất là **không làm vỡ client**. Thay đổi bổ sung (field tuỳ chọn mới, endpoint mới) là an toàn nếu client là **tolerant reader** — bỏ qua field lạ. Thay đổi phá vỡ (breaking): xoá/đổi tên field, đổi kiểu hoặc ý nghĩa, thêm input bắt buộc, đổi status code.

| Chiến lược | Ví dụ | Đánh đổi |
|---|---|---|
| URI path | `/v1/orders` | Dễ thấy, gateway dễ định tuyến; phổ biến nhất |
| Media type | `Accept: application/vnd.acme.v2+json` | URI gọn; cache phải `Vary` |
| Theo ngày | `Stripe-Version: 2024-06-20` | Chi tiết, ghim theo tài khoản; cần lớp tương thích |

Khai tử một version là cả một quy trình: thông báo, đo lường ai còn gọi theo từng client tại gateway, gửi header `Sunset` (RFC 8594) kèm ngày, tắt thử từng đợt (brown-out), rồi mới tắt hẳn.

---

## 7. gRPC và Protocol Buffers

gRPC chạy trên **HTTP/2**, dùng **Protobuf** vừa làm hợp đồng vừa làm định dạng nhị phân; client và server có kiểu được sinh ra từ file `.proto`.

```protobuf
syntax = "proto3";

package orders.v1;

service OrderService {
  rpc GetOrder(GetOrderRequest) returns (Order);
  rpc WatchOrders(WatchOrdersRequest) returns (stream OrderEvent);
}

message Order {
  string id = 1;
  int64 total_minor = 2;
  reserved 3; // removed field: never reuse the number
}
```

- Bốn kiểu gọi: unary, server streaming, client streaming, bidirectional.
- **Số thứ tự field (field number) mới là hợp đồng trên dây**, không phải tên — không bao giờ tái sử dụng; số 1–15 chỉ tốn một byte.
- Luôn đặt **deadline**; nó được truyền qua các hop và hết hạn thành `DEADLINE_EXCEEDED`. `UNAVAILABLE` là mã thường được retry.
- Kích thước message nhận tối đa mặc định là 4 MB ở hầu hết các bản cài đặt — payload lớn thì dùng stream.

Bẫy thường gặp: HTTP/2 ghép nhiều lời gọi trên **một kết nối sống lâu**, nên load balancer L4 dồn toàn bộ traffic vào một backend — cần proxy L7 (Envoy, ALB) hoặc cân bằng tải phía client. Trình duyệt không nói được gRPC thuần: dùng gRPC-Web qua proxy hoặc chuyển đổi (transcode) sang REST tại gateway.

---

## 8. Đánh đổi của GraphQL

Một endpoint, một schema có kiểu, và client chọn đúng những field cần — không lấy thừa dữ liệu, mỗi màn hình một round trip.

| Vấn đề | Cách giảm thiểu |
|---|---|
| **N+1 query** — mỗi resolver tự tải dữ liệu của nó | Gom lô theo request bằng DataLoader |
| **Mất HTTP caching** — POST vào một URL | Persisted query qua GET, cache phía client |
| **Query đắt** — lồng sâu tuỳ ý | Giới hạn độ sâu/độ phức tạp, danh sách persisted query cho phép |
| **Lỗi bị giấu** — HTTP 200 kèm mảng `errors` | Cảnh báo dựa trên field `errors` |
| **Rate limiting** — một request có thể tốn 1 hoặc 10.000 đơn vị | Giới hạn theo chi phí query tính được |

Chọn GraphQL khi nhiều client cần những góc nhìn khác nhau trên một domain phong phú (thường làm BFF); với CRUD hoặc gọi giữa service, REST hay gRPC rẻ hơn khi vận hành.

---

## 9. Real-time: SSE, WebSocket, webhook

| Lựa chọn | Chiều | Ghi chú |
|---|---|---|
| Long polling | Client kéo, server giữ request | Chạy ở mọi nơi, lãng phí |
| **SSE** | Server → client | HTTP thường `text/event-stream`; `EventSource` tự kết nối lại kèm `Last-Event-ID` |
| **WebSocket** | Hai chiều (full duplex) | `Upgrade` → `101 Switching Protocols`; text hoặc nhị phân |
| **Webhook** | Server → server | Callback ký HMAC, có retry; bên nhận phải idempotent |

SSE hợp với thông báo, tiến độ, stream token của LLM; WebSocket hợp với chat, cộng tác thời gian thực và game. Phần khó là scale: tin nhắn cho user A phải tới đúng node đang giữ socket của A, nên cần một **pub/sub backplane** (Redis, NATS), heartbeat ngắn hơn idle timeout của load balancer, và kết nối lại có jitter để tránh "bão reconnect" sau mỗi lần deploy.

---

## 10. API gateway

**API gateway** là cổng vào duy nhất áp dụng các **mối quan tâm cắt ngang** (cross-cutting concerns) để service không phải tự cài lại từng thứ.

```text
 clients ---> +-------------------- API GATEWAY --------------------+
              | TLS termination -> WAF/IP rules -> authN (JWT, key) |
              | -> scopes check -> rate limit / quota -> validation |
              | -> routing & versions -> transform -> cache         |
              | -> access logs, metrics, trace headers              |
              +-----------+-----------------+-----------------+-----+
                          |                 |                 |
                     orders-svc         users-svc        search-svc
               (fine-grained authorization stays in each service)
```

| Thành phần | Nhiệm vụ |
|---|---|
| Load balancer | Phân tải lên các instance khoẻ |
| **API gateway** | Quản lý API chiều bắc–nam (north–south): danh tính, quota, API key, version |
| Service mesh | Chiều đông–tây (east–west): mTLS, retry, telemetry giữa các service |
| BFF | Mỗi loại client một gateway, định hình response cho UI đó |

Giữ gateway **mỏng** — nhét business logic vào gateway sẽ tạo nút thắt mà team nào cũng phải sửa. Nó là một hop quan trọng: chạy dự phòng và theo dõi p99. Trên AWS, **Amazon API Gateway** mặc định throttle 10.000 request/giây với burst 5.000 cho mỗi tài khoản mỗi Region; các lựa chọn khác gồm Kong, gateway dựa trên Envoy và Apigee.

---

## 11. OAuth 2.0 và OpenID Connect

**Xác thực** (authentication — authN) = bạn là ai; **phân quyền** (authorization — authZ) = bạn được làm gì. **OAuth 2.0** uỷ quyền bằng cách cấp **access token**. **OIDC** bổ sung phần xác thực: một **ID token** mô tả người dùng, gửi cho ứng dụng client.

| Flow | Dùng cho |
|---|---|
| **Authorization Code + PKCE** | Người dùng đăng nhập trên web, SPA, mobile |
| **Client Credentials** | Máy gọi máy (machine-to-machine) |
| **Device Authorization** | TV, CLI |
| ~~Implicit~~, ~~Password~~ | Bị loại bỏ bởi OAuth security BCP (RFC 9700) |

```text
App                        Authorization server               API
 | 1. /authorize?code_challenge=S256(verifier)&state=xyz       |
 |------------------------->| 2. user logs in, consents        |
 |<-- 3. redirect ?code=abc&state=xyz                          |
 | 4. POST /token code + code_verifier                         |
 |------------------------->| verifies hash matches challenge  |
 |<-- 5. access_token, id_token, refresh_token                 |
 | 6. Authorization: Bearer <access_token> ------------------->|
```

PKCE khiến authorization code bị đánh cắp trở nên vô dụng nếu không có verifier; `state` chặn CSRF. **API nhận access token, không bao giờ nhận ID token.** Scope là quyền thô (`orders:read`); câu hỏi "user này có được xem *đơn hàng này* không" phải kiểm tra trong service. Với ứng dụng trình duyệt, một **BFF** có thể giữ token phía server và chỉ đưa cho trình duyệt một cookie `HttpOnly`.

---

## 12. Những cái bẫy của JWT

JWT là `header.payload.signature` mã hoá base64url — **được ký, không được mã hoá**; ai cũng đọc được nội dung.

Kiểm tra ở mọi request:

- Chữ ký với **danh sách thuật toán cho phép**; từ chối `alg: none`.
- Chặn **nhầm lẫn thuật toán** (algorithm confusion): kẻ tấn công đổi `RS256` thành `HS256` và ký bằng *public key* của bạn như thể đó là HMAC secret — không bao giờ để header quyết định thuật toán.
- `exp`, `iss` và **`aud`** — token cấp cho một API khác phải bị từ chối.
- Lấy key từ JWKS của IdP theo `kid`, cache lại và làm mới khi xoay vòng key.

| Cái bẫy | Cách tốt hơn |
|---|---|
| Token sống lâu, không thu hồi được | Access token 5–15 phút + refresh token xoay vòng |
| Dữ liệu cá nhân trong claim | Chỉ để định danh và scope |
| Token trong `localStorage` (XSS đọc được) | Cookie `HttpOnly` qua BFF, hoặc giữ trong bộ nhớ |
| Bearer token bị lộ dùng được ở mọi nơi | Token ràng buộc người gửi: mTLS (RFC 8705) hoặc DPoP (RFC 9449) |

Khi cần thu hồi tức thì, dùng **opaque token + introspection** (RFC 7662), cache ngắn tại gateway.

---

## 13. Thuật toán rate limiting

**Giới hạn tốc độ** (rate limiting) bảo vệ năng lực hệ thống và sự công bằng. Đặt khoá theo API key, user hoặc tenant — không chỉ theo IP, vì NAT giấu cả một văn phòng sau một địa chỉ.

| Thuật toán | Ý tưởng | Đánh đổi |
|---|---|---|
| Fixed window | Một bộ đếm mỗi phút | Burst tới 2× ở ranh giới cửa sổ |
| Sliding log | Lưu mọi timestamp | Chính xác, tốn bộ nhớ |
| **Sliding window counter** | Cộng có trọng số cửa sổ trước + hiện tại | Gần chính xác, bộ nhớ O(1) |
| **Token bucket** | Nạp r token/giây tới sức chứa b; mỗi request tiêu một token | Cho phép burst có kiểm soát |
| Leaky bucket | Xả ra với tốc độ cố định | Đầu ra đều, burst phải xếp hàng hoặc bị bỏ |

```text
Token bucket: b = 10, r = 5/s
t=0.0  10 tokens -> burst of 10 allowed -> 0 left, 11th gets 429
t=1.0   5 tokens -> next 5 allowed

Sliding window counter: limit 100/min, 15 s into current minute
estimate = prev 80 * (45/60) + curr 30 = 90 -> allowed
```

Trong cụm nhiều node, bộ đếm phải nằm ở kho dùng chung, thường là **Redis** với một Lua script nguyên tử — `GET` rồi `SET` tách rời sẽ để lọt race condition. Quyết định trước khi Redis sập: fail open (ưu tiên sẵn sàng) hay fail closed (ưu tiên bảo vệ). Trả **429** kèm `Retry-After`. `limit_req` của nginx là leaky bucket; throttling của API Gateway là token bucket. Thiết kế rate limiter phân tán đầy đủ nằm ở bài system design interview.

---

## Điểm cần nhớ khi phỏng vấn

- POST không safe cũng không idempotent; PUT và DELETE là idempotent.
- **401 = chưa xác thực, 403 = không có quyền**; đừng retry 4xx mù quáng; retry 5xx/429 với backoff; lỗi theo RFC 9457.
- **Idempotency key** giúp retry POST an toàn: giữ chỗ nguyên tử, lưu response, từ chối key dùng lại với body khác.
- **Cursor pagination** cho dữ liệu lớn hoặc thay đổi liên tục; offset chậm ở trang sâu và bị lệch khi có insert.
- Tiến hoá theo kiểu bổ sung; chỉ tăng version khi có thay đổi phá vỡ; khai tử bằng số liệu và `Sunset`.
- gRPC: HTTP/2 + Protobuf, deadline, không tái sử dụng field number, cần cân bằng tải L7 hoặc phía client.
- GraphQL: linh hoạt cho nhiều loại client; phải tính tới N+1, caching và chi phí query.
- SSE cho push một chiều, WebSocket cho hai chiều; cả hai cần backplane để scale.
- Gateway = xác thực, rate limit, định tuyến, telemetry — **không chứa business logic**.
- Auth Code + PKCE cho người dùng, Client Credentials cho máy; API nhận **access token**.
- JWT: ghim thuật toán, kiểm tra `aud`/`iss`/`exp`, thời gian sống ngắn.
- Token bucket cho phép burst; sliding window counter rẻ và gần chính xác; bộ đếm dùng chung phải nguyên tử.

## Tóm tắt

- Chọn kiểu API theo người dùng nó: REST ở biên, gRPC bên trong, event cho việc có thể chờ, SSE/WebSocket để push.
- Ngữ nghĩa method, status code và một định dạng lỗi thống nhất là thứ client, proxy và logic retry dựa vào.
- Idempotency key, cursor pagination và tiến hoá bổ sung giúp API an toàn khi retry, scale và thay đổi.
- Một API gateway mỏng tập trung xác thực, rate limiting, định tuyến và telemetry.
- OAuth 2.0 uỷ quyền, OIDC bổ sung danh tính, và JWT chỉ an toàn khi được kiểm tra chặt.
- Các thuật toán rate limiting đánh đổi độ chính xác, bộ nhớ và khả năng chịu burst; giới hạn trong cụm cần trạng thái dùng chung nguyên tử.
