# API là gì?

## 1. API là gì?

**API** (Application Programming Interface) là **giao diện** cho phép các hệ thống phần mềm giao tiếp với nhau.

### Hình dung bằng nhà hàng

Hãy tưởng tượng một nhà hàng. Bạn muốn ăn và nhà bếp có thể nấu, nhưng bạn không tự vào bếp nấu. Bạn đọc **thực đơn** (những món được phép gọi), nói với **người phục vụ** ("một tô phở, không hành"), và người phục vụ mang món ra — hoặc báo "xin lỗi, hết thịt bò rồi".

API chính là người phục vụ cộng với thực đơn. Một chương trình (bạn) yêu cầu một chương trình khác (nhà bếp) làm gì đó, theo một danh sách yêu cầu được phép cố định, và nhận về một kiểu câu trả lời cố định. Bạn không bao giờ thấy nhà bếp làm việc *như thế nào* bên trong — và cũng không cần thấy.

Chỗ hình ảnh này chưa khớp: "người phục vụ" API không biết linh động. Gọi món không có trong thực đơn, hoặc nói sai cách, bạn nhận về một lỗi chứ không phải một lời gợi ý tử tế.

**Ví dụ thực tế**: Khi bạn đặt xe Grab, app Grab gọi API của Google Maps để lấy bản đồ và tính đường đi. Grab không tự xây dựng bản đồ — họ gọi API của người khác.

### Client và server

Trong mỗi cuộc giao tiếp có hai vai:
- **Client** (bên gọi): app/website gửi yêu cầu, ví dụ app Grab.
- **Server** (bên cung cấp): hệ thống chạy API và trả dữ liệu về, ví dụ Google Maps.

"Client" và "server" là vai trò, không phải loại máy. Cùng một hệ thống có thể là server đối với app của chính nó, và là client khi nó gọi Google Maps.

Quy tắc quan trọng: **client luôn là bên chủ động gửi request**, server chỉ phản hồi. Server không bao giờ "gọi cho bạn trước" — hãy nhớ điều này, vì mục 8 sẽ cho thấy cách lách khéo léo.

> **Hiểu lầm thường gặp:** API không phải là một màn hình. "Interface" ở đây nghĩa là *điểm kết nối giữa các chương trình*; người dùng chỉ thấy app đang dùng nó.

---

## 2. REST API

Có nhiều cách thiết kế API. **REST** (Representational State Transfer) là kiến trúc API phổ biến nhất hiện nay, hoạt động qua HTTP. **HTTP** chính là "ngôn ngữ" mà trình duyệt dùng để tải trang web, nên REST API đi qua internet bình thường như mọi website.

### Nguyên tắc cơ bản
- Mỗi tài nguyên có một **URL riêng** (endpoint). **Tài nguyên** (resource) là bất kỳ "thứ" gì hệ thống quản lý: sản phẩm, đơn hàng, người dùng. **Endpoint** là địa chỉ web cụ thể dành cho nó, giống một quầy có đánh số ở bưu điện.
- Dùng **HTTP Methods** để biểu đạt hành động. Method là một động từ ngắn gửi kèm request, nói rõ *bạn muốn làm gì* với tài nguyên.
- Stateless: mỗi request độc lập, không nhớ state trước.

**Stateless, nói đơn giản:** giống một tổng đài mà mỗi cuộc gọi do một nhân viên khác trả lời, không ai có ghi chú từ cuộc gọi trước, nên lần nào bạn cũng phải đọc lại mã khách hàng. Mỗi request REST mang theo đủ mọi thứ server cần (bạn là ai, bạn muốn gì).

Ý nghĩa từng method: **GET** "cho tôi xem" (chỉ đọc, không đổi gì), **POST** "tạo cái mới", **PUT** "thay thế toàn bộ", **PATCH** "chỉ sửa vài trường này", **DELETE** "xóa nó đi".

### Ví dụ: API quản lý sản phẩm

| HTTP Method | Endpoint | Hành động |
|-------------|----------|-----------|
| GET | `/api/products` | Lấy danh sách sản phẩm |
| GET | `/api/products/5` | Lấy sản phẩm id=5 |
| POST | `/api/products` | Tạo sản phẩm mới |
| PUT | `/api/products/5` | Cập nhật toàn bộ sản phẩm id=5 |
| PATCH | `/api/products/5` | Cập nhật một phần sản phẩm id=5 |
| DELETE | `/api/products/5` | Xóa sản phẩm id=5 |

URL nói **cái gì** (`/api/products` = mọi sản phẩm, `/api/products/5` = sản phẩm số 5); method nói **làm gì**.

**PUT và PATCH, qua ví dụ:** một sản phẩm có tên, giá và màu. Với **PATCH**, bạn chỉ gửi `price`, các trường khác giữ nguyên. Với **PUT**, bạn gửi cả sản phẩm; trường nào bỏ trống có thể bị xóa hoặc đặt lại.

---

## 3. Cấu trúc một Request (4 phần)

**Request** là thông điệp client gửi đi. Hãy coi nó như một lá thư gửi qua bưu điện. Một HTTP request đầy đủ luôn gồm 4 phần:

| Phần | Vai trò | Ví dụ |
|------|---------|-------|
| **URL** | Địa chỉ tài nguyên muốn tác động | `https://api.shop.com/orders` |
| **Method** | Hành động muốn làm | `POST` |
| **Headers** | Thông tin đi kèm (định dạng, xác thực…) | `Content-Type: application/json` |
| **Body** | Dữ liệu gửi lên (chỉ với POST/PUT/PATCH) | `{ "productId": 5 }` |

Theo hình ảnh lá thư: URL là địa chỉ trên phong bì, method là loại dịch vụ ("thư bảo đảm"), headers là ghi chú trên phong bì ("viết bằng tiếng Anh", "có kèm giấy tờ người gửi"), còn body là lá thư bên trong. Request GET thường không có body — "cho tôi xem sản phẩm 5" không cần thêm nội dung gì.

**Response** trả về cũng có cấu trúc tương tự nhưng thay Method + URL bằng một **Status Code** (mục 6). Response cũng có headers và thường có body chứa dữ liệu bạn yêu cầu.

---

## 4. JSON – Định dạng dữ liệu

Body của request hay response chỉ là văn bản, nên hai bên phải thống nhất cách viết. **JSON** (JavaScript Object Notation) là định dạng văn bản phổ biến nhất để trao đổi dữ liệu qua API. Dù tên có chữ "JavaScript", mọi ngôn ngữ lập trình đều đọc và ghi được JSON.

```json
{
  "id": 5,
  "name": "Laptop Dell XPS",
  "price": 25000000,
  "inStock": true,
  "tags": ["laptop", "dell", "premium"]
}
```

Đọc nó như một tờ khai: nhãn bên trái (`"name"`), câu trả lời điền bên phải (`"Laptop Dell XPS"`).

- `{}` = object (cặp key-value), `[]` = array (danh sách).
- Giá trị: string, number, boolean, null, object, array.

> 📖 JSON có bài riêng — xem **"JSON là gì?"** để hiểu object lồng nhau, mảng các object và cách đọc dữ liệu theo đường dẫn.

---

## 5. Request và Response

Đây là một lượt trao đổi đầy đủ: khách đặt mua 2 cái sản phẩm số 5.

### HTTP Request
```text
POST /api/orders HTTP/1.1
Host: api.shop.com
Content-Type: application/json
Authorization: Bearer eyJhbGci...

{
  "productId": 5,
  "quantity": 2,
  "address": "123 Lê Lợi, HCM"
}
```

Từng dòng: `POST /api/orders` = "tạo đơn hàng mới". `Host` = server nào. `Content-Type` = "body là JSON". `Authorization` = "đây là bằng chứng tôi là ai" (mục 9). Sau một dòng trống là body.

### HTTP Response
```text
HTTP/1.1 201 Created
Content-Type: application/json

{
  "orderId": "ORD-20240408-001",
  "status": "confirmed",
  "total": 50000000
}
```

`201 Created` = thành công, một thứ mới đã được tạo. Body cho biết mã đơn hàng mới và tổng tiền.

### Từng bước khi bạn bấm "Đặt hàng"

1. App tạo một request: `POST /api/orders`, headers, và body JSON chứa giỏ hàng.
2. Request đi qua internet (được mã hóa bằng HTTPS) tới server của shop.
3. Server kiểm tra bạn là ai và tồn kho, rồi lưu đơn hàng.
4. Server trả lời bằng một status code kèm body JSON.
5. App hiện "Đặt hàng thành công!" — hoặc một thông báo lỗi.

Toàn bộ quá trình này thường mất chưa tới một giây.

> **Tự thử:** mở `https://api.github.com/users/octocat` trên trình duyệt. Thay vì một trang web, bạn thấy JSON thô, ví dụ `"login": "octocat"` — bạn vừa gửi một request GET tới API công khai của GitHub. Để xem cả trạng thái và headers, chạy `curl -i https://api.github.com/users/octocat` trong cửa sổ dòng lệnh (Windows: PowerShell, gõ `curl.exe`; macOS: Terminal). Dòng đầu tiên sẽ có dạng `HTTP/2 200`.

> **Tự thử (DevTools):** trên một website bất kỳ, bấm `F12` (Windows) hoặc `Cmd+Option+I` (macOS), mở tab **Network**, chọn **Fetch/XHR**, rồi tải lại trang. Mỗi dòng là một lần gọi API; bấm vào để xem URL, method, status code và response.

---

## 6. HTTP Status Codes

Mỗi response mang một **mã trạng thái** 3 chữ số cho biết request thành công hay lỗi. Đây là thứ BA thường thấy khi đọc log hoặc trao đổi với dev.

Hình dung: chữ số đầu tiên giống màu đèn giao thông — nó cho bạn biết tình hình chung trước khi đọc chi tiết.

| Nhóm | Ý nghĩa chung | Mã thường gặp |
|------|---------------|---------------|
| **2xx** | Thành công | `200 OK`, `201 Created`, `204 No Content` |
| **3xx** | Chuyển hướng | `301 Moved`, `304 Not Modified` |
| **4xx** | Lỗi phía **client** (người gọi) | `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `429 Too Many Requests` |
| **5xx** | Lỗi phía **server** | `500 Internal Server Error`, `503 Service Unavailable` |

**Mẹo nhớ:** `4xx` = "lỗi do bạn gửi sai", `5xx` = "lỗi do server hỏng".

### Những mã bạn sẽ gặp nhiều nhất

- **201 Created** — thành công và đã tạo ra một thứ mới (câu trả lời điển hình cho POST).
- **400 Bad Request** — request sai dạng, ví dụ thiếu một trường bắt buộc.
- **404 Not Found** — không có gì ở địa chỉ đó: sản phẩm 99999 không tồn tại, hoặc URL gõ sai.
- **409 Conflict** — xung đột với dữ liệu hiện có, ví dụ đăng ký một email đã có người dùng.
- **429 Too Many Requests** — bạn gọi quá dày; nhiều API đặt **giới hạn tần suất** (rate limit — tối đa bao nhiêu lần gọi mỗi phút).
- **500 / 503** — server bị lỗi, hoặc quá tải / đang bảo trì. Không phải lỗi của bên gọi.

Phân biệt hai mã hay nhầm:
- **401 Unauthorized**: chưa đăng nhập / thiếu hoặc sai token.
- **403 Forbidden**: đã đăng nhập nhưng **không có quyền** truy cập.

Hình dung ở văn phòng: **401** là bảo vệ nói "cho xem thẻ nhân viên". **403** là "tôi thấy thẻ của anh rồi, nhưng anh không được lên tầng này".

**Ví dụ thực tế trong công việc:** ticket của tester ghi *"Bấm Lưu ở trang hồ sơ thì hiện 'Đã có lỗi xảy ra'. Tab Network: `PATCH /api/users/42` → 500."* Mã 500 cho cả nhóm biết phải xem phía server; nếu là 400 thì phải xem app đã gửi gì.

---

## 7. Phân trang & Lọc dữ liệu (Query String)

Khi dữ liệu lớn (hàng triệu bản ghi), API không trả hết một lần. Gửi một triệu sản phẩm trong một câu trả lời sẽ làm chậm server, mạng và cả điện thoại của bạn. Client dùng **query string** — phần sau dấu `?` trên URL — để lọc và phân trang.

Hình dung: ở thư viện, bạn không xin "tất cả sách". Bạn xin "sách nấu ăn, mới nhất trước, cho tôi 20 cuốn đầu" — rồi lát nữa quay lại lấy 20 cuốn tiếp theo.

```text
GET /api/products?category=laptop&inStock=true&sort=price&page=2&size=20
```

| Tham số | Ý nghĩa |
|---------|---------|
| `category=laptop` | **Lọc**: chỉ lấy sản phẩm loại laptop |
| `inStock=true` | Lọc thêm điều kiện còn hàng |
| `sort=price` | **Sắp xếp** theo giá |
| `page=2&size=20` | **Phân trang**: trang 2, mỗi trang 20 kết quả (bản ghi 21–40) |

Nhiều tham số nối nhau bằng dấu `&`. Mỗi tham số là một cặp `tên=giá trị`. Bạn thấy điều này hằng ngày: tìm kiếm trên một trang mua sắm, thanh địa chỉ thường đổi thành `...?q=laptop&page=1`.

BA cần điều này khi mô tả màn hình danh sách: bộ lọc nào, sắp xếp ra sao, "tải thêm"/phân trang thế nào. Cũng cần chốt: sắp xếp mặc định, số mục mỗi trang, và màn hình hiện gì khi không có kết quả nào.

---

## 8. Webhook vs Polling – Cập nhật real-time

Vì **client mới là bên chủ động gọi**, làm sao client biết khi dữ liệu **đổi ở phía server** (ví dụ đơn hàng chuyển sang "đang giao")? Có hai cách:

- **Polling**: client hỏi lặp đi lặp lại "xong chưa? xong chưa?" mỗi vài giây/phút. Đơn giản nhưng tốn tài nguyên và có độ trễ.
- **Webhook**: client cung cấp một **Callback URL**; khi có sự kiện, **server chủ động gọi ngược** về URL đó. Real-time và hiệu quả (chỉ 1 request mỗi khi có thay đổi).

Hình dung: chờ nhận hàng. **Polling** là cứ 10 phút lại ra cổng xem shipper tới chưa. **Webhook** là đưa số điện thoại cho shipper để họ gọi bạn ngay khi tới nơi.

Quy tắc "client gọi trước" vẫn đúng: Callback URL là một endpoint nhỏ do shop chạy, nên khi cổng thanh toán gửi webhook, cổng thanh toán chính là *client* trong lần gọi đó.

| Tiêu chí | Polling | Webhook |
|----------|---------|---------|
| Ai gọi | Client hỏi liên tục | Server gọi khi có sự kiện |
| Độ trễ | Có (theo chu kỳ hỏi) | Gần như tức thì |
| Hiệu quả | Tốn request thừa | Rất hiệu quả |
| Ví dụ | App liên tục refresh trạng thái | VNPAY gọi webhook báo "đã thanh toán" |

Khi viết yêu cầu tích hợp, BA nên hỏi: *"Hệ thống này có hỗ trợ webhook không, hay phải polling?"* Và: *"Nếu bên mình đang sập lúc webhook tới, bên kia có gửi lại không?"*

---

## 9. API Key và Authentication

Một API mở hoàn toàn sẽ cho bất kỳ ai đọc hoặc sửa mọi thứ, mà công ty thì phải trả tiền cho server. Vì vậy hầu hết API thương mại yêu cầu xác thực: chứng minh **ai đang gọi** trước khi được trả lời — giống phòng gym kiểm tra thẻ hội viên.

- **API Key**: chuỗi bí mật gửi kèm mỗi request (header hoặc query param). Nó thường định danh *một ứng dụng hoặc một công ty*, dùng để đếm lượt sử dụng và tính tiền.
- **Bearer Token (JWT)**: token ngắn hạn sau khi đăng nhập. Nó định danh *một người dùng*. "Bearer" nghĩa là "ai cầm token này thì được vào" — chính vì vậy nó phải được giữ bí mật.
- **OAuth**: cho phép đăng nhập qua Google/Facebook mà không chia sẻ mật khẩu. Nút "Đăng nhập bằng Google" chính là OAuth: Google xác nhận bạn là ai rồi trao cho website một token; website không bao giờ thấy mật khẩu Google của bạn.

Nếu xác thực sai/thiếu, server trả về **401** (chưa xác thực) hoặc **403** (không có quyền).

> **Hiểu lầm thường gặp:** "API key chỉ là một thông số, dán vào chat cũng được." Không — ai có key là có thể gọi API **dưới danh nghĩa của bạn**, và API trả phí sẽ tính tiền công ty bạn. Đừng để key trong ảnh chụp màn hình, ticket hay code công khai; nếu lỡ lộ, hãy yêu cầu thu hồi và thay key mới.

---

## 10. API Documentation

Bạn không thể đoán API nhận gì, cũng như không thể gọi món khi không có thực đơn. Mỗi API có tài liệu mô tả:
- Endpoint nào tồn tại.
- Cần gửi dữ liệu gì (request body, parameters).
- Nhận về dữ liệu gì (response format).
- Lỗi có thể xảy ra.

**Swagger/OpenAPI** là chuẩn phổ biến để viết API docs. Trang Swagger liệt kê mọi endpoint và thường có nút "Try it out" để gửi một request thật.

BA thường đọc tài liệu này để hiểu hệ thống trả về gì và viết yêu cầu/kiểm thử. Nhiều người cũng dùng **Postman**, một app để gửi request bằng tay: gõ URL, chọn method, bấm *Send*, đọc status và JSON.

**Ví dụ thực tế trong công việc:** dev nói *"`GET /orders/{id}` chưa trả về phí giao hàng."* BA xem ví dụ response trên Swagger, xác nhận đúng vậy, rồi tạo ticket bổ sung `deliveryFee`.

---

## 11. Ví dụ thực tế: Shopee & Grab

Một app thường là tập hợp của rất nhiều lần gọi API — có lần gọi server của chính công ty, có lần gọi nhà cung cấp bên ngoài.

| Tình huống | API được dùng |
|-----------|--------------|
| Shopee hiển thị bản đồ địa chỉ giao hàng | Google Maps API |
| App Grab tính giá cước | Internal pricing API |
| Website cho đăng nhập bằng Google | Google OAuth API |
| Thanh toán bằng VNPAY | VNPAY Payment API |
| VNPAY báo kết quả thanh toán về shop | Webhook (Callback URL) |
| Gửi SMS OTP | Twilio/VIETGUYS SMS API |

API "nội bộ" (internal) là API công ty tự xây cho app của mình; API "bên thứ ba" (third-party) do một công ty khác cung cấp, thường có tính phí.

Một lần thanh toán có thể chạm tới năm API liên tiếp: giỏ hàng (API của shop) → bản đồ → thanh toán → webhook → SMS. Chỉ cần một lần gọi thất bại là người dùng gặp sự cố. Vì vậy yêu cầu tích hợp phải nói rõ chuyện gì xảy ra khi lỗi hoặc hết thời gian chờ (timeout), chứ không chỉ khi thành công.

---

## 12. Tóm tắt

- **API** = giao diện để các hệ thống giao tiếp; **client** gọi, **server** trả lời.
- **REST API** dùng HTTP Methods + URL endpoint. GET đọc; POST tạo; PUT/PATCH cập nhật; DELETE xóa.
- Một **request** gồm 4 phần: URL, Method, Headers, Body.
- **Status code**: 2xx thành công, 4xx lỗi client, 5xx lỗi server (401 ≠ 403).
- **Query string** (`?key=value`) dùng để **lọc, sắp xếp, phân trang**.
- **Webhook** giúp server đẩy cập nhật real-time thay vì client phải **polling**.
- **JSON** = định dạng dữ liệu phổ biến nhất (xem bài JSON riêng).
- **Authentication** = API Key, Bearer Token, OAuth; **API Docs** (Swagger) mô tả cách dùng.

### Thuật ngữ chính

| Thuật ngữ | Nghĩa đơn giản |
|-----------|----------------|
| API | "Người phục vụ + thực đơn" giữa các chương trình |
| Endpoint | Địa chỉ web của một tài nguyên, ví dụ `/api/products/5` |
| HTTP method | Động từ: GET, POST, PUT, PATCH, DELETE |
| Status code | Kết quả 3 chữ số: 2xx ổn, 4xx lỗi bên gọi, 5xx lỗi server |
| Query string | Phần `?a=1&b=2` trên URL |
| Webhook | Bên cung cấp gọi vào Callback URL của bạn khi có sự kiện |
| API key / token | Chuỗi bí mật chứng minh ai đang gọi |
