# Kiến Trúc Frontend & Backend

## 1. Tổng quan

Mọi ứng dụng web hiện đại đều chia thành hai phần chính:

```text
Người dùng → [FRONTEND] ←→ [BACKEND] ←→ [DATABASE]
              Trình duyệt    Server        Dữ liệu
```

- **Frontend (FE)**: Những gì người dùng nhìn thấy và tương tác
- **Backend (BE)**: Logic xử lý, bảo mật, lưu trữ dữ liệu
- **Database**: Nơi lưu trữ dữ liệu lâu dài

**Ví von:** hãy nghĩ tới một chi nhánh ngân hàng. **Frontend** là quầy giao dịch: các mẫu đơn, màn hình gọi số, nhân viên giao dịch thân thiện. **Backend** là phòng nghiệp vụ phía sau, nơi nhân viên kiểm tra danh tính, áp dụng quy định của ngân hàng và duyệt giao dịch. **Database** là kho tiền và sổ cái. Khách chỉ làm việc với quầy, nhưng không có gì thật sự xảy ra cho tới khi phòng nghiệp vụ đồng ý.

Ba từ bạn sẽ nghe liên tục:

- **Server** — một máy tính luôn bật, đặt ở trung tâm dữ liệu hoặc trên cloud, chờ các yêu cầu.
- **Database** — kho lưu trữ lâu dài có tổ chức, giống một bộ bảng tính khổng lồ (khách hàng, đơn hàng, sản phẩm) mà backend đọc và ghi.
- **API** — "ô cửa giao dịch" qua đó frontend nhờ backend làm việc (mục 4).

### Góc nhìn ba tầng

Developer thường mô tả cùng bức tranh này thành ba tầng:

| Tầng | Còn gọi là | Chứa gì | Ví von ngân hàng |
|---|---|---|---|
| Presentation (trình bày) | UI, frontend | Màn hình, nút, form | Quầy giao dịch |
| Business / logic (nghiệp vụ) | Application, backend | Các **quy tắc nghiệp vụ** | Phòng nghiệp vụ |
| Data (dữ liệu) | Persistence, database | Các bản ghi đã lưu | Kho tiền và sổ cái |

**Quy tắc nghiệp vụ** (business rules) là các quy định của công ty được viết thành code: "đơn trên 500.000 VND được miễn phí vận chuyển", "chỉ quản lý mới được duyệt hoàn tiền". Chúng thuộc về tầng business/logic, không phải trên màn hình.

---

## 2. Frontend làm gì?

Frontend là tầng giao diện — chạy **trong trình duyệt** của người dùng.

Nghĩa là code frontend được tải về thiết bị *của bạn* và chạy ở đó. Trên điện thoại, app di động đóng vai trò tương tự.

**Trách nhiệm của FE:**
- Hiển thị giao diện (HTML, CSS)
- Xử lý tương tác người dùng (click, nhập liệu, scroll)
- Validate form phía client
- Gọi API để lấy / gửi dữ liệu
- Quản lý trạng thái màn hình (loading, error, empty)
- Routing (chuyển trang không reload)
- Xử lý cache, optimize tốc độ tải

### Giải thích vài mục cho dễ hiểu

- **Validate form phía client** — kiểm tra tức thì ngay trong trình duyệt, như dòng chữ đỏ "Email không hợp lệ" hiện ra khi bạn gõ. Nó cho phản hồi nhanh nhưng không phải lớp bảo vệ thật (xem bên dưới).
- **Trạng thái màn hình** — mỗi màn hình tải dữ liệu đều có thể rơi vào một trong bốn tình huống, và tình huống nào cũng cần được thiết kế: **Loading** (biểu tượng xoay trong lúc chờ), **Success** (có dữ liệu), **Error** (có lỗi, kèm thông báo và có thể có nút "Thử lại"), và **Empty** (thành công nhưng không có gì để hiển thị, ví dụ "Bạn chưa có đơn hàng nào").
- **Chuyển trang không reload** — trong một **Single Page Application (SPA)**, trình duyệt tải ứng dụng một lần. Khi bạn sang trang khác, JavaScript thay nội dung trên màn hình và chỉ gọi API lấy dữ liệu mới, thay vì tải lại cả trang. Đó là lý do các app như Gmail cho cảm giác mượt mà.

**Công nghệ FE điển hình:**
- HTML, CSS, JavaScript
- React / Vue / Angular
- Next.js, Nuxt.js
- Tailwind CSS, Bootstrap

HTML là cấu trúc, CSS là giao diện, JavaScript là hành vi. React, Vue và Angular là các **framework**: bộ công cụ làm sẵn giúp xây dựng màn hình phức tạp nhanh hơn.

**FE KHÔNG làm:**
- Xử lý logic nghiệp vụ quan trọng (dễ bị người dùng bypass)
- Lưu trữ dữ liệu nhạy cảm
- Xác thực quyền truy cập cuối cùng

Vì sao? Vì mọi thứ trong trình duyệt đều nằm trong tay người dùng. Ai cũng có thể mở công cụ developer của trình duyệt, sửa trang, hoặc bỏ qua màn hình và gửi request trực tiếp bằng các công cụ như **Postman** hay **curl**.

> **Hiểu lầm thường gặp:** "Chúng ta đã ẩn nút Xoá với người dùng thường, nên họ không xoá được." Ẩn nút chỉ là bề ngoài. Nếu backend không kiểm tra quyền của người dùng, một người tò mò vẫn có thể gọi thẳng API xoá.

---

## 3. Backend làm gì?

Backend chạy **trên server** — người dùng không nhìn thấy, không tương tác trực tiếp.

**Ví von:** nhà bếp của nhà hàng. Khách không bao giờ bước vào, nhưng chính bếp quyết định món nào thật sự được nấu, kiểm tra nguyên liệu tồn kho, và từ chối những order vi phạm quy định.

**Trách nhiệm của BE:**
- Xử lý logic nghiệp vụ (business logic)
- Xác thực và phân quyền (authentication & authorization)
- Kết nối và truy vấn database
- Gửi email, thông báo
- Tích hợp bên thứ ba (payment gateway, SMS, AI...)
- Xử lý file upload
- Caching ở tầng server
- Logging, monitoring

Vài thuật ngữ:

- **Bên thứ ba** (third party) — dịch vụ của công ty bên ngoài mà backend kết nối tới, ví dụ **cổng thanh toán** (payment gateway — VNPay, Stripe) là nơi thật sự chuyển tiền.
- **Caching** — giữ sẵn một bản sao của dữ liệu hay được hỏi, để backend không phải dựng lại mỗi lần.
- **Logging, monitoring** — ghi lại những gì đã xảy ra (log) và theo dõi các dashboard sức khoẻ hệ thống, để team điều tra khi có sự cố.
- **Tác vụ nền** (background job) — công việc không chờ người dùng bấm. **Cron job** là tác vụ tự động chạy theo lịch, ví dụ "2 giờ sáng mỗi đêm, gửi nhắc nhở hoá đơn quá hạn" hoặc "mỗi giờ, đồng bộ tồn kho với kho hàng".

**Công nghệ BE điển hình:**
- Node.js, Python, Java, Go, .NET
- Express, FastAPI, Spring Boot, Laravel
- PostgreSQL, MySQL, MongoDB (database)
- Redis (cache)
- AWS, Google Cloud, Azure (cloud)

Bạn không cần biết dùng các công cụ này, nhưng nhận ra tên của chúng giúp bạn theo kịp một buổi họp kỹ thuật.

---

## 4. Giao tiếp FE ↔ BE qua API

FE và BE nói chuyện với nhau qua **API** (Application Programming Interface). Phổ biến nhất là **REST API**.

**Ví von:** API là thực đơn cộng với ô cửa chuyển món giữa phòng ăn và nhà bếp. Thực đơn liệt kê chính xác bạn được gọi gì và gọi thế nào; ô cửa là nơi order đi vào và món ăn đi ra. Khách không cần biết bếp làm việc ra sao.

```text
FE gửi HTTP Request:
GET  /api/products          → lấy danh sách sản phẩm
POST /api/orders            → tạo đơn hàng mới
PUT  /api/orders/123        → cập nhật đơn hàng 123
DELETE /api/orders/123      → xóa đơn hàng 123

BE trả về HTTP Response:
{
  "status": "success",
  "data": { "id": 123, "total": 500000 }
}
```

Từ đứng đầu là **HTTP method** — động từ của request:

| Method | Ý nghĩa | Tương đương đời thường |
|---|---|---|
| `GET` | Đọc dữ liệu | "Cho tôi xem thực đơn" |
| `POST` | Tạo mới | "Đặt một order mới" |
| `PUT` / `PATCH` | Cập nhật | "Đổi order của tôi" |
| `DELETE` | Xoá | "Huỷ order của tôi" |

Dữ liệu được gửi đi dưới dạng **JSON**, một định dạng văn bản đơn giản gồm tên và giá trị, như response ở trên.

### Status code: kết quả trong ba chữ số

Mỗi response mang một **status code**: `200` OK, `201` đã tạo, `400` request sai, `401` chưa đăng nhập, `403` không có quyền, `404` không tìm thấy tài nguyên được yêu cầu, `422` dữ liệu không qua được kiểm tra hợp lệ, `500` server bị lỗi. Khi BE trả về `422`, nó thường liệt kê các trường bị sai, và FE nên hiển thị thông báo cụ thể cạnh từng trường thay vì một câu chung chung "Đã có lỗi xảy ra".

**Một request đầy đủ:**
1. Người dùng click "Đặt hàng"
2. FE validate form (email đúng format? số lượng > 0?)
3. FE gửi `POST /api/orders` kèm dữ liệu JSON
4. BE nhận request, kiểm tra token xác thực
5. BE validate lại dữ liệu (không tin FE)
6. BE kiểm tra tồn kho trong database
7. BE tạo order, trừ tồn kho, gửi email xác nhận
8. BE trả về `{ "orderId": 456, "status": "confirmed" }`
9. FE nhận response, hiển thị màn hình "Đặt hàng thành công"

Để ý rằng việc kiểm tra dữ liệu diễn ra **hai lần**: ở FE để nhanh và tiện cho người dùng, ở BE vì đó mới là lớp bảo vệ thật.

### API contract

Trước khi xây dựng, team FE và BE thống nhất một **API contract** (hợp đồng API): địa chỉ, method, các trường request và định dạng response chính xác của từng API. Khi đã thống nhất, hai team có thể làm **song song** — FE thậm chí có thể dùng dữ liệu giả theo đúng khuôn của contract cho tới khi API thật sẵn sàng.

Đây cũng là lý do khi ước lượng công việc, cần biết một thay đổi thuộc FE, BE hay cả hai: điều đó quyết định team nào làm, việc gì phụ thuộc việc gì, và có phải sửa mô hình dữ liệu hay không.

> **Ví dụ thực tế:** người dùng báo "tổng tiền đơn hàng hiện 0". Câu hỏi đầu tiên là: *response của API có đúng không?* Mở tab Network của trình duyệt và xem response. Nếu nó ghi `"total": 500000`, bug nằm ở cách FE hiển thị. Nếu nó ghi `"total": 0`, bug nằm ở phần xử lý của BE.

---

## 5. Authentication & Authorization

| Khái niệm | Ý nghĩa | Ví dụ |
|---|---|---|
| **Authentication** | Xác thực *bạn là ai* | Đăng nhập bằng email/password |
| **Authorization** | Phân quyền *bạn được làm gì* | Admin mới xóa được user |

**Ví von:** ở một toà nhà văn phòng, trình thẻ nhân viên ở lễ tân là **authentication** (chứng minh bạn là ai). Thẻ của bạn có mở được cửa phòng server hay không là **authorization** (bạn được phép làm gì). Bạn có thể được xác định danh tính đầy đủ mà vẫn không được vào.

**Luồng đăng nhập:**
1. User nhập email + password → FE gửi lên BE
2. BE kiểm tra trong database → đúng → tạo **JWT token**
3. BE trả token về FE
4. FE lưu token (localStorage hoặc cookie)
5. Mọi request sau đó, FE kèm token vào header
6. BE verify token trước khi xử lý mỗi request

**Token** giống chiếc vòng tay bạn nhận ở một sự kiện: sau khi soát vé một lần, nhân viên chỉ cần nhìn vòng tay. **JWT** (JSON Web Token) là một định dạng token phổ biến, được server ký số nên không thể làm giả. **Header** là phần "phong bì" ẩn của mỗi request, nơi token được gửi kèm.

Vì lý do an toàn, token thường **hết hạn** (sau vài phút hoặc vài giờ). Điều này tạo ra yêu cầu thực tế, ví dụ: nếu token hết hạn khi người dùng đang điền một form dài, dữ liệu đã nhập dở sẽ ra sao, và người dùng đăng nhập lại thế nào mà không mất công sức?

> **Hiểu lầm thường gặp:** "Đã đăng nhập nghĩa là được phép." Authentication chỉ trả lời *ai*; BE vẫn phải kiểm tra người này được làm *gì* ở mỗi request.

---

## 6. Các tầng kiến trúc phổ biến

### Monolith (Nguyên khối)
FE và BE trong cùng một project. Phổ biến với startup nhỏ.

```text
[Trình duyệt] → [Ứng dụng monolith: FE + BE + DB]
```

**Ví von:** một quán ăn gia đình nơi một nhóm người vừa nấu, vừa phục vụ, vừa làm sổ sách trong cùng một căn nhà. Đơn giản và khởi đầu nhanh, nhưng khó mở rộng.

### Tách biệt FE/BE
FE là app riêng (React), BE là API riêng. Phổ biến nhất hiện nay.

```text
[Ứng dụng React]  →  [Server REST API]  →  [Database]
```

Khi đó cùng một API backend có thể phục vụ website, app di động và đối tác cùng lúc.

### Microservices
BE chia thành nhiều service nhỏ. Phức tạp hơn, dành cho hệ thống lớn.

```text
[FE] → [API Gateway] → [Service người dùng]
                     → [Service đơn hàng]
                     → [Service thanh toán]
```

**Ví von:** một khu ẩm thực với các quầy riêng biệt, mỗi quầy có nhân viên và bếp riêng. Nếu quầy nước đóng cửa, quầy phở vẫn bán bình thường. **API Gateway** là lối vào duy nhất, chuyển mỗi request tới đúng service.

| | Monolith | Tách biệt FE/BE | Microservices |
|---|---|---|---|
| Quy mô team | Nhỏ | Nhỏ đến lớn | Lớn, nhiều team |
| Công sức khởi đầu | Thấp nhất | Trung bình | Cao nhất |
| Khi một phần lỗi | Cả app có thể sập | FE hoặc BE bị ảnh hưởng | Thường chỉ một service |

---

## 7. Môi trường phát triển

| Môi trường | Mục đích |
|---|---|
| **Local / Dev** | Developer viết code, test thoải mái |
| **Staging / UAT** | Kiểm thử nghiệm thu, QA và BA test |
| **Production** | Môi trường thật, người dùng sử dụng |

**Ví von:** một nhà hát. **Local** là diễn viên tập ở nhà, **Staging** là buổi tổng duyệt đầy đủ trên sân khấu thật nhưng không có khán giả, **Production** là đêm công diễn với khán giả mua vé. Staging nên được dựng giống Production nhất có thể, để bất ngờ xuất hiện ở buổi tổng duyệt chứ không phải đêm công diễn.

Mỗi môi trường thường có địa chỉ riêng, ví dụ `dev.shop.com`, `staging.shop.com` và `shop.com`, cùng database riêng.

BA cần lưu ý:
- Không bao giờ test tính năng mới trực tiếp trên Production
- UAT (User Acceptance Testing) luôn diễn ra trên Staging
- Dữ liệu trên Staging thường là dữ liệu giả — không dùng dữ liệu thật của khách hàng

> **Ví dụ thực tế:** báo cáo bug luôn phải nói rõ lỗi xảy ra *trên môi trường nào*. "Thanh toán lỗi trên Staging với thẻ test 4111..." là thông tin làm được ngay; "thanh toán bị hỏng" khiến team phải đoán.

---

## 8. BA cần hiểu gì về FE/BE để làm việc hiệu quả?

### Khi viết User Story:
- **FE concern**: loading state, empty state, error message, responsive breakpoint, form validation message
- **BE concern**: business rule, permission, performance SLA, data retention

**Responsive breakpoint** là độ rộng màn hình mà tại đó bố cục thay đổi (ví dụ từ điện thoại sang máy tính bảng). **Performance SLA** là mục tiêu tốc độ đã thống nhất ("tìm kiếm trả kết quả trong 2 giây"). **Data retention** là dữ liệu được giữ bao lâu trước khi xoá.

### Khi chia task:
- Task FE: UI component, form validation, routing, hiển thị dữ liệu
- Task BE: API endpoint, database schema, business logic, authentication
- Task chung: API contract (định nghĩa request/response format trước)

### Câu hỏi BA nên hỏi dev:
- "Phần này FE hay BE xử lý?" → hiểu ai chịu trách nhiệm
- "API này đã có chưa hay cần tạo mới?" → ảnh hưởng đến estimate
- "Có ảnh hưởng đến hệ thống khác không?" → dependency
- "Deploy mất bao lâu? Có downtime không?" → ảnh hưởng release plan

Biết một thay đổi thuộc FE hay BE rất quan trọng khi ước tính: nó quyết định team nào làm, cái gì phụ thuộc vào cái gì, và có cần thay đổi cấu trúc dữ liệu không. Sửa chữ trên một nút thì nhanh; thay đổi thứ mà database lưu trữ sẽ lan ra API, màn hình và báo cáo.

---

## 9. Tóm tắt

- Một ứng dụng web = **frontend** (trong trình duyệt) + **backend** (trên server) + **database** (dữ liệu lâu dài).
- Ba tầng: trình bày, business/logic (chứa quy tắc nghiệp vụ), dữ liệu.
- FE hiển thị màn hình, xử lý click, validate cho tiện và quản lý bốn trạng thái: loading, success, error, empty.
- BE áp dụng quy tắc nghiệp vụ, kiểm tra quyền, làm việc với database và bên thứ ba, và chạy tác vụ theo lịch (cron).
- FE và BE nói chuyện qua **API**: method + địa chỉ + JSON, được trả lời kèm status code. Hãy thống nhất **API contract** trước.
- **Authentication** = bạn là ai; **authorization** = bạn được làm gì. Luôn thực thi cả hai ở BE.
- Kiến trúc: monolith → tách biệt FE/BE → microservices, độ phức tạp tăng dần.
- Test trên **Staging**, không bao giờ trên **Production**, với dữ liệu giả.

### Thuật ngữ chính

| Thuật ngữ | Nghĩa dễ hiểu |
|---|---|
| Frontend (FE) | Phần ứng dụng chạy trên thiết bị của người dùng |
| Backend (BE) | Phần chạy trên server, khuất tầm nhìn |
| Database | Kho lưu trữ dữ liệu lâu dài có tổ chức của ứng dụng |
| Quy tắc nghiệp vụ | Các quy định của công ty được viết thành code |
| API | "Ô cửa giao dịch" đã thống nhất giữa FE và BE |
| HTTP method | Động từ của request: GET, POST, PUT, DELETE |
| Status code | Kết quả gồm 3 chữ số: 200, 404, 422, 500... |
| API contract | Định dạng request/response đã thống nhất của từng API |
| SPA | Ứng dụng thay nội dung mà không tải lại trang |
| Token / JWT | "Vòng tay" có chữ ký chứng minh bạn đã đăng nhập |
| Cron job | Tác vụ tự động chạy theo lịch |
| Microservices | Backend được chia thành nhiều service nhỏ độc lập |
| Staging / Production | Môi trường tổng duyệt / môi trường thật |
