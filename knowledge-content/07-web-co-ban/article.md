# Web hoạt động thế nào?

## 1. Tổng quan

Khi bạn gõ một địa chỉ web vào browser và nhấn Enter, hàng loạt bước xảy ra trong vài trăm millisecond để trang web hiện ra. Hiểu được luồng này giúp bạn giao tiếp tốt hơn với team kỹ thuật.

**Ví von:** truy cập một website giống như gọi món ở nhà hàng. Bạn (khách) xem thực đơn và gọi món với người phục vụ. Nhà bếp — nơi bạn không bao giờ nhìn thấy — chế biến món ăn rồi gửi ra. Bạn chỉ thấy cái đĩa trên bàn, nhưng rất nhiều việc đã diễn ra sau cánh cửa bếp.

### Ba nhân vật chính

- **Browser** (trình duyệt) — ứng dụng bạn dùng để xem web: Chrome, Safari, Edge, Firefox. Nó là vị khách gọi món, rồi "bày" kết quả ra màn hình của bạn. Trong ngôn ngữ kỹ thuật, nó được gọi là **client**.
- **Server** (máy chủ) — một máy tính, thường đặt trong trung tâm dữ liệu, luôn bật và chờ yêu cầu. Nó là nhà bếp. "Server" cũng chỉ phần mềm chạy trên máy đó, có nhiệm vụ trả lời các yêu cầu.
- **Internet** — những con đường nối hai bên. Yêu cầu của bạn đi qua Wi-Fi, nhà mạng và rất nhiều router trước khi tới server.

Browser và server nói chuyện bằng một bộ quy tắc đã thống nhất gọi là **HTTP** (HyperText Transfer Protocol). Một tin nhắn từ browser gửi tới server là một **request** ("cho tôi trang này"); câu trả lời là **response** ("đây này", hoặc "xin lỗi, không tìm thấy").

```text
 Bạn            Browser (client)                         Server
  │  gõ URL    ──►  │                                        │
  │                 │ ──── HTTP request ──────────────────►  │
  │                 │                                        │ (xử lý
  │                 │ ◄─── HTTP response (HTML...) ────────  │  câu trả lời)
  │  thấy trang ◄── │                                        │
```

> **Hiểu lầm thường gặp:** "Website nằm trong máy tính của tôi." Không hẳn: website nằm trên một server ở nơi khác. Mỗi lần bạn truy cập, browser tải về một bản sao của trang rồi hiển thị cho bạn.

---

## 2. Cấu trúc URL

URL (Uniform Resource Locator) là địa chỉ đầy đủ của một tài nguyên trên web:

```
https://shop.example.com:443/products/detail?id=123&lang=vi#reviews
│       │                │   │               │               │
│       │                │   │               query string    fragment
│       │                │   path
│       │                port (ẩn nếu dùng cổng mặc định)
│       subdomain.domain
scheme (giao thức)
```

**Ví von:** URL giống một địa chỉ bưu điện đầy đủ: dịch vụ chuyển phát nào, toà nhà nào, căn hộ nào, và một lời nhắn cho người nhận.

- **Scheme**: `http` hoặc `https` — giao thức dùng.
- **Host**: `shop.example.com` — máy chủ đích.
- **Path**: `/products/detail` — đường dẫn tài nguyên.
- **Query String**: `?id=123&lang=vi` — tham số lọc/tìm kiếm.
- **Fragment**: `#reviews` — vị trí trong trang (xử lý ở browser).

Vài lưu ý cho người mới:

- **Tài nguyên** (resource) là bất cứ thứ gì server có thể đưa cho bạn: một trang, một bức ảnh, một file PDF, một mẩu dữ liệu.
- **https** là phiên bản an toàn của **http**: cuộc trò chuyện được mã hoá nên không ai trên đường truyền (ví dụ trên Wi-Fi quán cà phê) đọc được. Trình duyệt hiện ổ khoá hoặc "Không bảo mật" dựa vào điều này.
- **Port** giống như số cửa trên server. `443` là cửa chuẩn của https và `80` của http, nên trình duyệt ẩn chúng đi.
- Query string là danh sách các cặp `key=value` nối bằng `&`. Ở đây: `id` là `123` và `lang` là `vi`.
- Fragment không bao giờ được gửi lên server; trình duyệt chỉ cuộn tới phần có tên `reviews` trong trang.

Chủ đề *Domain, URL & DNS* đi sâu hơn nhiều vào từng phần.

---

## 3. Luồng khi truy cập website

```
1. Bạn gõ URL và nhấn Enter
2. Browser phân giải DNS: domain → IP
3. Browser thiết lập kết nối TCP (3-way handshake)
4. Nếu HTTPS: thêm bước TLS handshake (mã hóa)
5. Browser gửi HTTP GET request đến server
6. Server nhận request, xử lý, trả HTTP response
7. Browser nhận HTML
8. Browser parse HTML → tải thêm CSS, JS, ảnh
9. Browser render trang (vẽ ra màn hình)
```

### Từng bước bằng lời dễ hiểu

1. **Bạn gõ URL và nhấn Enter.** Trình duyệt kiểm tra đó có phải địa chỉ hợp lệ không. Nếu bạn gõ những từ không phải địa chỉ, nó gửi sang công cụ tìm kiếm.
2. **Tra cứu DNS.** Máy tính tìm nhau bằng số (**địa chỉ IP**, ví dụ `142.250.186.46`), không phải bằng tên. Trình duyệt hỏi **DNS** — cuốn danh bạ của Internet — "`shop.example.com` là số mấy?". Các câu trả lời gần đây được ghi nhớ (cache), nên bước này thường diễn ra tức thì.
3. **Kết nối TCP.** Trước khi nói chuyện, hai bên mở một đường truyền tin cậy. **3-way handshake** giống mở đầu cuộc gọi: "Nghe rõ không?" — "Rõ, bạn nghe rõ không?" — "Rõ." (về kỹ thuật, các tin nhắn tên là SYN, SYN-ACK, ACK). **TCP** đảm bảo mọi mảnh dữ liệu đều tới nơi, đúng thứ tự.
4. **TLS handshake (chỉ với HTTPS).** Browser và server thống nhất khoá bí mật, và server chứng minh danh tính bằng **chứng chỉ** (certificate). Từ đây mọi thứ đều được mã hoá. Ổ khoá trên thanh địa chỉ đến từ bước này.
5. **HTTP GET request.** Trình duyệt gửi một tin nhắn văn bản ngắn như `GET /products/detail?id=123`. **GET** nghĩa là "đưa tôi"; một method phổ biến khác là **POST**, nghĩa là "đây là dữ liệu" (ví dụ khi gửi form).
6. **Server làm việc.** Nó có thể chỉ lấy một file có sẵn, hoặc chạy code, đọc database và dựng trang riêng cho bạn (xem mục 5). Rồi nó gửi lại response kèm **mã trạng thái** (status code) như `200 OK` hay `404 Not Found` (mục 8).
7. **Trình duyệt nhận HTML.** **HTML** là văn bản mô tả cấu trúc trang: tiêu đề, đoạn văn, nút bấm, liên kết.
8. **Tải thêm.** HTML nhắc tới các file khác: **CSS** (màu sắc, phông chữ, bố cục), **JavaScript** hay **JS** (hành vi: menu, pop-up, cập nhật trực tiếp) và ảnh. Trình duyệt request từng file, thường là hàng chục request phụ.
9. **Render.** Trình duyệt kết hợp HTML + CSS thành bố cục, vẽ các điểm ảnh và chạy JavaScript. Trang hiện ra và có thể bấm được.

> **Hiểu lầm thường gặp:** "Một trang web là một file." Một trang thông thường gồm hàng chục, thậm chí hàng trăm file. Khi một file bị lỗi, ví dụ thiếu ảnh hoặc script hỏng, trang có thể trông như tải dở dù file HTML chính đã về đầy đủ.

---

## 4. Frontend vs Backend

| | Frontend | Backend |
|--|----------|---------|
| **Chạy ở đâu** | Trình duyệt của user | Server |
| **Ngôn ngữ** | HTML, CSS, JavaScript | Python, Node.js, Java, PHP... |
| **Làm gì** | Hiển thị giao diện, tương tác người dùng | Logic nghiệp vụ, database, bảo mật |
| **Thấy được không** | Có (source code) | Không (ở server) |

**Ví von:** trong nhà hàng, **frontend** là phòng ăn: thực đơn, bàn ghế, cách trình bày món. **Backend** là nhà bếp và kho: công thức, hàng tồn, và các quy định (không bán rượu cho người dưới 18 tuổi). Khách nhìn thấy và chạm vào phòng ăn; họ không bao giờ bước vào bếp.

- **UI** (User Interface — giao diện người dùng) = mọi thứ bạn nhìn thấy và bấm được: nút, form, menu.
- **Logic nghiệp vụ** (business logic) = các quy tắc kinh doanh được viết thành code: giảm giá tính thế nào, ai được duyệt hoàn tiền.
- **Database** = kho lưu trữ dữ liệu lâu dài có tổ chức: khách hàng, đơn hàng, sản phẩm.

Chuyện "thấy được" rất quan trọng: ai cũng có thể mở code frontend trong trình duyệt để đọc, thậm chí sửa trên máy của chính họ. Vì vậy mật khẩu, giá tiền không được phép bị sửa, và việc kiểm tra quyền luôn nằm ở backend.

**Full-stack developer**: biết cả frontend lẫn backend.

> **Ví dụ thực tế:** tester báo "nút Lưu không làm gì cả". Dev frontend kiểm tra xem cú click có gửi request đi không; dev backend kiểm tra server có nhận được không và vì sao lỗi. Biết nên nhìn phía nào trước giúp tiết kiệm hàng giờ.

---

## 5. Static vs Dynamic Website

**Ví von:** site **tĩnh** (static) giống thực đơn in sẵn — khách nào cũng nhận cùng một bản, chuẩn bị từ trước. Site **động** (dynamic) giống người phục vụ viết gợi ý riêng cho từng khách sau khi xem hôm nay bếp còn gì.

### Static (Tĩnh)
HTML được tạo sẵn, gửi thẳng cho browser. Nhanh, đơn giản, không cần database.
- Ví dụ: trang giới thiệu công ty, blog đơn giản.

"Tạo sẵn" nghĩa là các file trang đã tồn tại trước khi có ai truy cập. Server chỉ việc đưa file, nên nhanh, rẻ để vận hành và ít thứ có thể hỏng.

### Dynamic (Động)
HTML được tạo ra **khi có request** — server chạy code, query database, tạo HTML phù hợp với từng user.
- Ví dụ: trang Facebook (mỗi user thấy newsfeed khác nhau).

Ví dụ khác: ngân hàng trực tuyến (số dư của bạn), giỏ hàng, kết quả tìm kiếm. Bất cứ thứ gì phụ thuộc vào *bạn là ai* hoặc *điều gì vừa thay đổi* đều cần xử lý động ở đâu đó.

| | Static | Dynamic |
|---|---|---|
| Trang được tạo khi nào? | Từ trước | Ngay lúc có mỗi request |
| Ai cũng thấy giống nhau? | Có | Không — có thể khác theo user |
| Cần database? | Không | Thường là có |
| Tốc độ & chi phí | Rất nhanh, rẻ | Chậm hơn, cần server mạnh hơn |
| Dùng cho | Landing page, tài liệu, portfolio | Mạng xã hội, thương mại điện tử, ngân hàng |

> **Hiểu lầm thường gặp:** "Tĩnh nghĩa là không có hiệu ứng hay tương tác." Trang tĩnh vẫn có thể có slider và form bằng JavaScript. "Tĩnh" chỉ có nghĩa server gửi cùng những file tạo sẵn cho mọi người. Nhiều site hiện đại kết hợp cả hai: trang tĩnh gọi backend để lấy dữ liệu trực tiếp.

---

## 6. CDN (Content Delivery Network)

CDN là mạng lưới server phân tán khắp thế giới, lưu bản sao của nội dung tĩnh (ảnh, CSS, JS) ở **server gần người dùng nhất**.

**Ví von:** thay vì một kho trung tâm ở California giao mọi đơn đi khắp thế giới, chuỗi cửa hàng mở chi nhánh nhỏ ở mỗi thành phố, trữ sẵn những món bán chạy nhất. Khách lấy hàng ở chi nhánh gần nhất; chỉ đơn đặc biệt mới phải gửi về trụ sở.

```
User ở Hà Nội → CDN server ở Hà Nội (nhanh)
Thay vì:
User ở Hà Nội → server ở California (chậm)
```

Dù dữ liệu chạy trong cáp quang gần bằng tốc độ ánh sáng, một vòng đi về qua Thái Bình Dương vẫn mất một phần giây đáng kể, mà một trang cần rất nhiều vòng như vậy. Rút ngắn khoảng cách giúp tiết kiệm thời gian rất nhanh.

**Lợi ích**: giảm độ trễ, tăng tốc độ tải, giảm tải cho server gốc.

- **Độ trễ** (latency) = thời gian chờ dữ liệu đi tới nơi rồi quay về.
- **Server gốc** (origin server) = server chính thật sự của công ty; các bản sao trên CDN được lấy từ đây.

Các nhà cung cấp CDN nổi tiếng gồm Cloudflare, Akamai và Amazon CloudFront. Dữ liệu cá nhân, như số dư tài khoản ngân hàng, thường không được cache trên CDN; nó vẫn đến từ server gốc.

> **Ví dụ thực tế:** sau một đợt release, designer nói "tôi vẫn thấy logo cũ". Thường là CDN (hoặc trình duyệt) đang phục vụ bản cache. Team sẽ "purge cache" (xoá cache) hoặc đợi nó hết hạn.

---

## 7. Browser Dev Tools

Trong Chrome/Firefox, nhấn `F12` để mở Dev Tools:
- **Network tab**: xem tất cả request/response.
- **Console**: xem lỗi JavaScript.
- **Elements**: inspect HTML/CSS.

Đây là công cụ cơ bản để hiểu website đang làm gì.

Trên bàn phím Mac, dùng `Cmd + Option + I` (chạy được trên Chrome, Edge và Firefox). Với Safari, trước tiên hãy bật menu nhà phát triển trong Settings → Advanced, rồi dùng cùng phím tắt đó. Bạn cũng có thể click chuột phải vào bất kỳ đâu trên trang và chọn **Inspect** (Kiểm tra).

**Ví von:** Dev Tools là ô kính nhìn vào nhà bếp. Bạn có thể thấy mọi order đi vào và mọi món đi ra, mà không thay đổi gì với những khách khác.

### Mỗi tab dùng để làm gì

- **Elements** — hiển thị HTML của trang; rê chuột lên một dòng thì phần tương ứng trên trang sáng lên. Bạn thậm chí có thể sửa chữ ở đây để thử thay đổi. Việc này chỉ ảnh hưởng màn hình của bạn và biến mất khi tải lại trang.
- **Console** — các thông báo màu đỏ ở đây là lỗi JavaScript. Ảnh chụp các lỗi này rất hữu ích trong báo cáo bug.
- **Network** — mỗi request là một dòng: tên file, **Status** (200, 404...), **Type**, **Size** và **Time**. Bấm vào một dòng để xem headers và dữ liệu trả về.

> **Tự thử nhé:** mở một trang báo bất kỳ, nhấn `F12` (Windows) hoặc `Cmd + Option + I` (macOS), bấm tab **Network**, rồi nhấn `F5` / `Cmd + R` để tải lại. Bạn sẽ thấy hàng chục dòng xuất hiện. Nhìn thanh dưới cùng: nó cho biết có bao nhiêu request và tổng dung lượng đã tải. Bấm vào dòng đầu tiên (chính là trang) và mở **Headers** để xem status code.

---

## 8. HTTP Response có gì?

```
HTTP/1.1 200 OK
Content-Type: text/html; charset=UTF-8
Content-Length: 1256

<!DOCTYPE html>
<html>...nội dung trang web...</html>
```

- **Status line**: mã trạng thái.
- **Headers**: metadata (loại nội dung, kích thước...).
- **Body**: nội dung thực sự (HTML, JSON, ảnh...).

**Ví von:** response giống một bưu kiện. **Status line** là con dấu trên cùng ("đã giao" hay "không tìm thấy địa chỉ"), **headers** là nhãn dán (bên trong có gì, nặng bao nhiêu), còn **body** là món hàng.

**Metadata** nghĩa là "dữ liệu về dữ liệu". `Content-Type: text/html` báo cho trình duyệt "đây là một trang web"; `Content-Length: 1256` cho biết body dài 1.256 byte. **JSON** là định dạng văn bản đơn giản cho dữ liệu mà các ứng dụng trao đổi, ví dụ `{"name": "An", "age": 30}`.

### Các status code bạn sẽ gặp

Chữ số đầu cho biết nhóm:

| Mã | Nhóm | Ý nghĩa dễ hiểu |
|---|---|---|
| `200 OK` | 2xx thành công | Mọi thứ đều ổn |
| `301` / `302` | 3xx chuyển hướng | "Đã chuyển — hãy sang địa chỉ khác này" |
| `401` / `403` | 4xx lỗi phía client | Chưa đăng nhập / đã đăng nhập nhưng không có quyền |
| `404 Not Found` | 4xx lỗi phía client | Server nhận được request nhưng không có tài nguyên nào ở path đó |
| `500` | 5xx lỗi phía server | Có gì đó hỏng ở phía server |

Quy tắc đơn giản: **4xx** thường nghĩa là "request có vấn đề" (sai địa chỉ, không có quyền), **5xx** nghĩa là "server bị lỗi" — bug hoặc sự cố mà developer cần sửa.

> **Ví dụ thực tế:** một ticket bug tốt ghi "Bấm *Thanh toán* thì `POST /api/orders` trả về `500` (đính kèm ảnh tab Network)" thay vì chỉ "thanh toán bị hỏng". Developer sẽ tìm ra nguyên nhân nhanh hơn nhiều.

---

## 9. Tóm tắt

- **URL** = địa chỉ đầy đủ gồm scheme, host, path, query.
- Mở một trang = tra DNS → kết nối TCP → TLS (nếu https) → HTTP request → server xử lý → response → tải file phụ → render.
- **Frontend**: chạy trong browser (HTML/CSS/JS).
- **Backend**: chạy trên server (logic + database).
- Site **tĩnh** gửi cùng các file tạo sẵn; site **động** dựng trang theo từng request.
- **CDN**: mạng server phân tán để tăng tốc độ.
- **Dev Tools (F12)**: công cụ debug và khám phá website.
- HTTP response = status line + headers + body; **2xx** ổn, **3xx** chuyển hướng, **4xx** lỗi request, **5xx** lỗi server.

### Thuật ngữ chính

| Thuật ngữ | Nghĩa dễ hiểu |
|---|---|
| Browser / client | Ứng dụng gửi yêu cầu và hiển thị trang web |
| Server | Máy tính luôn bật, chuyên trả lời các yêu cầu |
| HTTP / HTTPS | Quy tắc trao đổi giữa browser và server / phiên bản mã hoá |
| Request / response | Câu hỏi browser gửi đi / câu trả lời nhận về |
| DNS | Danh bạ của Internet: tên → địa chỉ IP |
| TCP / TLS | Kết nối tin cậy / lớp mã hoá đặt trên kết nối đó |
| HTML / CSS / JS | Cấu trúc / giao diện / hành vi của trang |
| Render | Vẽ trang ra màn hình |
| Static / dynamic | Tạo sẵn cho mọi người / dựng theo từng request |
| CDN | Bản sao các file đặt trên server gần người dùng |
| Status code | Kết quả gồm 3 chữ số: 200, 404, 500... |
| Dev Tools | Bộ công cụ có sẵn trong trình duyệt để soi trang |
