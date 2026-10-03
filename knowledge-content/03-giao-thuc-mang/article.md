# Giao thức mạng

## 1. Giao thức là gì?

**Giao thức (protocol)** là tập hợp các quy tắc và quy ước mà các thiết bị phải tuân theo để giao tiếp với nhau. Giống như ngôn ngữ chung — hai người phải nói cùng ngôn ngữ thì mới hiểu nhau.

**Ví dụ đời thường:** hãy nghĩ đến một cuộc gọi điện thoại. Không ai viết ra luật cho bạn, nhưng ai cũng làm theo: người gọi bấm số, người kia nói "A lô?", người gọi giới thiệu mình, hai bên lần lượt nói, rồi cùng chào trước khi cúp máy. Nếu ai đó bỏ bước — ví dụ nói luôn khi đầu bên kia chưa nhấc máy — cuộc trò chuyện sẽ hỏng. Giao thức mạng chính là kiểu "phép lịch sự" này, nhưng được viết ra chính xác để máy móc do nhiều hãng khác nhau sản xuất đều làm theo được.

Một giao thức thường quy định:

- **Định dạng** — tin nhắn trông thế nào (phần nào là địa chỉ, phần nào là nội dung).
- **Thứ tự** — ai nói trước và câu trả lời nào được mong đợi.
- **Xử lý lỗi** — làm gì khi tin nhắn bị mất, bị hỏng hoặc không hiểu được.

### Sao lại có nhiều giao thức đến vậy?

Việc giao tiếp được chia thành nhiều phần việc nhỏ, và mỗi phần có giao thức riêng. Một giao thức chở lá thư qua đường, một giao thức đảm bảo không thiếu trang nào, một giao thức khác mô tả yêu cầu lấy trang web trông ra sao. Chia việc như vậy giúp từng phần được cải tiến riêng: bạn nâng cấp WiFi mà không cần thay đổi cách trình duyệt web giao tiếp.

> **Hiểu lầm thường gặp:** "Giao thức là một chương trình." Không hẳn. Giao thức là một *bộ quy tắc*, giống luật chơi cờ vua. Các chương trình (trình duyệt, ứng dụng email, máy chủ) *thực hiện* các quy tắc đó, giống như nhiều ứng dụng cờ vua khác nhau đều theo cùng một luật cờ.

---

## 2. Mô hình TCP/IP

TCP/IP là bộ giao thức nền tảng của Internet, gồm 4 tầng:

| Tầng | Chức năng | Ví dụ giao thức |
|------|-----------|-----------------|
| Ứng dụng (Application) | Giao tiếp với phần mềm người dùng | HTTP, HTTPS, FTP, SMTP, DNS |
| Vận chuyển (Transport) | Truyền dữ liệu end-to-end, kiểm soát lỗi | TCP, UDP |
| Mạng (Internet) | Định địa chỉ và định tuyến | IP |
| Liên kết (Link) | Truyền dữ liệu qua vật lý | Ethernet, WiFi |

**Bộ giao thức (protocol suite)** là một "gia đình" các giao thức được thiết kế để làm việc cùng nhau. Cái tên "TCP/IP" lấy từ hai thành viên nổi tiếng nhất của nó: TCP và IP.

### Các tầng giống như hệ thống bưu chính

**Ví dụ đời thường:** hãy tưởng tượng bạn gửi quà cho một người bạn ở nước ngoài.

- **Tầng Ứng dụng** — *gửi cái gì* và ở dạng nào: bạn viết thư bằng ngôn ngữ mà bạn mình đọc được. Trên mạng, đó là trình duyệt và máy chủ web nói chuyện bằng HTTP, hoặc ứng dụng email dùng SMTP.
- **Tầng Vận chuyển** — *gửi cẩn thận đến mức nào*: bạn chọn thư bảo đảm có theo dõi và ký nhận (đó là **TCP**), hay một tấm bưu thiếp rẻ tiền thường thì đến nhưng có thể thất lạc (đó là **UDP**)?
- **Tầng Mạng (Internet)** — *địa chỉ và lộ trình*: bưu điện đọc địa chỉ người nhận và chuyển bưu kiện từ trung tâm phân loại này sang trung tâm khác. Trên mạng, đó là **IP** (Internet Protocol), còn các trung tâm phân loại là router.
- **Tầng Liên kết** — *phương tiện thực sự trên một chặng đường*: xe tải, máy bay, người giao hàng bằng xe đạp. Trên mạng, đó là sóng WiFi hoặc dây Ethernet nối hai thiết bị cạnh nhau.

### Đóng gói và mở gói

Khi gửi dữ liệu, mỗi tầng thêm nhãn riêng của mình (gọi là **header**) bọc quanh những gì nhận được từ tầng trên — giống như cho lá thư vào phong bì, rồi vào hộp, rồi lên pallet. Ở phía nhận, mỗi tầng gỡ nhãn của mình ra và chuyển phần còn lại lên trên. Quá trình này gọi là **đóng gói (encapsulation)**.

```text
Bên gửi                                          Bên nhận
[Ứng dụng]    yêu cầu trang web                  [Ứng dụng]    đọc yêu cầu
[Vận chuyển]  + header TCP (cổng, số thứ tự)     [Vận chuyển]  kiểm tra thứ tự, gỡ header
[Mạng]        + header IP (địa chỉ gửi/nhận)     [Mạng]        kiểm tra địa chỉ, gỡ header
[Liên kết]    + khung WiFi/Ethernet              [Liên kết]    nhận tín hiệu, gỡ khung
      \__________ qua dây cáp, sóng và nhiều router __________/
```

> Bạn cũng có thể nghe đến **mô hình OSI**, chia cùng những ý tưởng này thành 7 tầng thay vì 4. Nó chủ yếu dùng để giảng dạy và làm từ vựng khi xử lý sự cố ("lỗi ở tầng 3" = lỗi IP/định tuyến). Internet thực tế chạy trên TCP/IP.

---

## 3. TCP vs UDP

Cả TCP và UDP đều nằm ở tầng Vận chuyển. Nhiệm vụ của chúng là chở dữ liệu từ một chương trình trên máy này tới một chương trình trên máy khác. Hai giao thức đánh đổi theo hai hướng ngược nhau.

### TCP (Transmission Control Protocol)
TCP đảm bảo dữ liệu **đến đủ, đúng thứ tự**:
- Thiết lập kết nối trước (3-way handshake).
- Kiểm tra lỗi, gửi lại nếu mất gói.
- Chậm hơn UDP nhưng **đáng tin cậy**.
- Dùng cho: web (HTTP), email, tải file.

**Ví dụ đời thường:** TCP giống thư bảo đảm có đánh số trang và giấy báo nhận. Người nhận ký xác nhận cho từng đợt nhận được ("Tôi đã nhận trang 1–10"). Nếu người gửi không nhận được xác nhận cho trang 7, họ gửi lại trang 7. Người nhận chờ và xếp các trang đúng thứ tự rồi mới giao. Không thiếu gì cả, nhưng việc chờ và ký nhận tốn thời gian.

**3-Way Handshake:**
```text
Client → Server: SYN (xin kết nối)
Server → Client: SYN-ACK (đồng ý)
Client → Server: ACK (xác nhận)
→ Kết nối được thiết lập
```

Nói đơn giản: "Mình nói chuyện được không?" — "Được — bạn nghe rõ không?" — "Rõ rồi." Chỉ sau ba tin nhắn này dữ liệu thật mới bắt đầu được gửi. **SYN** là viết tắt của "synchronise" (đồng bộ) và **ACK** là "acknowledge" (xác nhận). **Client** là phía bắt đầu cuộc trò chuyện (ví dụ trình duyệt của bạn); **server** là phía chờ nhận yêu cầu (ví dụ máy tính của một website).

### UDP (User Datagram Protocol)
UDP gửi dữ liệu **không cần xác nhận**:
- Không thiết lập kết nối trước.
- Nhanh hơn, nhưng có thể mất gói.
- Dùng cho: video streaming, game online, DNS, VoIP (cuộc gọi).

**Ví dụ đời thường:** UDP giống như hét thông báo qua sân bóng. Bạn không kiểm tra từng chữ có được nghe thấy không; bạn cứ nói tiếp. Nếu lỡ mất một chữ, nhắc lại cũng chẳng để làm gì — trận đấu đã sang tình huống khác. (**Datagram** đơn giản là một tin nhắn UDP độc lập.)

### Sao lại có người muốn gửi "không đảm bảo"?

Trong cuộc gọi video trực tiếp, một đoạn âm thanh đến muộn nửa giây là vô dụng — cuộc trò chuyện đã đi tiếp. TCP sẽ dừng mọi thứ để gửi lại đoạn bị mất, khiến cả cuộc gọi bị đứng hình. UDP chỉ bỏ qua: có thể bạn thấy một chút giật nhẹ, nhưng cuộc gọi vẫn tiếp tục. Còn với chuyển khoản ngân hàng hay tải file, chỉ thiếu một byte là kết quả hỏng, nên TCP mới là lựa chọn đúng.

| | TCP | UDP |
|--|-----|-----|
| Kết nối trước? | Có (handshake) | Không |
| Đảm bảo đến đủ và đúng thứ tự? | Có | Không |
| Tốc độ / độ trễ | Chậm hơn, nhiều chi phí hơn | Nhanh hơn, độ trễ thấp hơn |
| Khi mất gói | Gửi lại | Bỏ qua (ứng dụng tự xoay xở) |
| Dùng điển hình | Trang web, email, tải file, ngân hàng | Gọi video, phát trực tiếp, game, tra cứu DNS |

---

## 4. HTTP và HTTPS

### HTTP (HyperText Transfer Protocol)
Giao thức truyền tải trang web. Hoạt động theo mô hình **Request – Response**:

```text
Browser gửi: GET /index.html HTTP/1.1
Server trả:  HTTP/1.1 200 OK + nội dung trang web
```

**Ví dụ đời thường:** HTTP giống như gọi món ở quầy nhà hàng. Bạn (trình duyệt) đặt món ("Cho tôi trang thực đơn"), nhà bếp (máy chủ) chuẩn bị rồi đưa lại một khay kèm phiếu ghi kết quả ("200 OK — của bạn đây", hoặc "404 — quán không có món đó"). Mỗi lần gọi món là riêng biệt: quầy không nhớ lần trước bạn gọi gì trừ khi bạn đưa thẻ thành viên (trên web, "thẻ" này thường là **cookie** hoặc token đăng nhập).

Một yêu cầu (request) có vài phần:

- **Method** — động từ: bạn muốn làm gì (`GET`, `POST`...).
- **URL / đường dẫn** — bạn muốn thứ gì (`/index.html`, `/api/orders/42`).
- **Headers** — ghi chú thêm, như "tôi đọc tiếng Việt" hoặc "đây là token đăng nhập của tôi".
- **Body** — nội dung gửi kèm (không bắt buộc), ví dụ dữ liệu của form bạn vừa điền.

**HTTP Methods phổ biến:**
- `GET`: lấy dữ liệu.
- `POST`: gửi dữ liệu lên server.
- `PUT/PATCH`: cập nhật dữ liệu.
- `DELETE`: xóa dữ liệu.

Khác biệt giữa hai động từ "cập nhật": `PUT` thường **thay thế toàn bộ bản ghi** bằng dữ liệu bạn gửi, còn `PATCH` **chỉ sửa một vài trường** (ví dụ chỉ số điện thoại của một khách hàng).

**HTTP Status Codes:**
- `200 OK`: thành công.
- `404 Not Found`: không tìm thấy.
- `500 Internal Server Error`: lỗi server.
- `401 Unauthorized`: chưa xác thực.
- `403 Forbidden`: không có quyền.

Chữ số đầu tiên cho biết nhóm mã, thường đủ để biết ai cần điều tra:

| Nhóm | Ý nghĩa | Ai thường xử lý |
|------|---------|-----------------|
| 2xx | Thành công | Không ai — mọi thứ chạy tốt |
| 3xx | Chuyển hướng: "hãy sang chỗ khác mà lấy" | Thường không ai cả |
| 4xx | **Yêu cầu** bị sai (sai địa chỉ, chưa đăng nhập, không có quyền) | Phía gọi / người dùng / frontend |
| 5xx | **Server** gặp lỗi khi xử lý một yêu cầu hợp lệ | Đội backend / vận hành |

> **Ví dụ thực tế ở công ty:** một tester ghi trong ticket lỗi: "Bấm *Lưu* thì báo lỗi. DevTools hiện `POST /api/orders` → 500." Chỉ một dòng đó đã cho cả nhóm biết trình duyệt gửi yêu cầu đúng và server bị lỗi — vấn đề nằm ở backend. Nếu là 403, câu hỏi đầu tiên sẽ là "người dùng này có đúng vai trò (quyền) không?"

> **Tự thử:** trong Chrome hoặc Edge, bấm F12 (trên Mac: Cmd+Option+I) để mở **DevTools**, chọn tab **Network**, rồi tải lại trang. Mỗi dòng là một yêu cầu HTTP. Hãy nhìn cột **Method** và **Status** — bạn sẽ thấy nhiều dòng `GET` với status `200`, và có thể vài dòng `304` (dùng bản lưu tạm) hoặc `404`.

### HTTPS (HTTP Secure)
HTTPS = HTTP + **mã hóa TLS/SSL**. Dữ liệu được mã hóa trước khi truyền, bảo vệ khỏi nghe lén.

- Nhận biết qua icon ổ khóa 🔒 trên trình duyệt.
- Bắt buộc cho mọi website xử lý thông tin nhạy cảm.

**Ví dụ đời thường:** HTTP thường giống như gửi bưu thiếp — mọi nhân viên bưu điện trên đường đi đều đọc được. HTTPS cho tin nhắn vào một chiếc hộp có khóa mà chỉ website mới mở được. Nó còn kiểm tra **chứng chỉ (certificate)** của website — một thẻ căn cước điện tử do một tổ chức đáng tin cậy cấp — để bạn biết mình đang nói chuyện thật với ngân hàng chứ không phải kẻ mạo danh.

- **TLS** (Transport Layer Security) là tên hiện đại; **SSL** là phiên bản cũ trước đó. Mọi người vẫn quen miệng gọi "chứng chỉ SSL".
- Mặc định, HTTP dùng cổng 80 và HTTPS dùng cổng 443 (cổng được giải thích trong chủ đề "Port & Socket").

> **Hiểu lầm thường gặp:** "Có ổ khóa nghĩa là website an toàn và đáng tin." Không — nó chỉ có nghĩa kết nối được **mã hóa** và tên miền khớp với chứng chỉ. Trang lừa đảo cũng có thể có ổ khóa. Hãy luôn kiểm tra chính tên miền.

---

## 5. DNS (Domain Name System)

DNS là hệ thống chuyển đổi tên miền dễ nhớ thành địa chỉ IP:

```text
google.com → 142.250.186.46
```

**Ví dụ đời thường:** DNS là danh bạ của Internet. Bạn nhớ "Mẹ", không nhớ số điện thoại của mẹ; điện thoại tra số giúp bạn. Máy tính chỉ kết nối được tới địa chỉ IP dạng số, còn con người nhớ những cái tên như `google.com`. DNS làm việc tra cứu đó. (IP bạn nhận được cho Google có thể khác địa chỉ ở trên — các trang lớn có rất nhiều máy chủ và trả về máy ở gần bạn.)

**Quá trình DNS Resolution:**
1. Bạn gõ `google.com`.
2. Browser kiểm tra cache DNS nội bộ.
3. Nếu không có → hỏi DNS server của ISP.
4. DNS server tìm và trả về IP: `142.250.186.46`.
5. Browser kết nối đến IP đó.

### "Tìm" ở bước 4 nghĩa là gì

DNS server của ISP (gọi là **resolver**) không biết mọi tên miền trên thế giới. Nếu câu trả lời không có trong bộ nhớ đệm của nó, nó đi hỏi lần lượt từ trên xuống, giống như hỏi đường:

```text
Resolver → Root server:          "Ai phụ trách .com?"
Root     → Resolver:             "Hỏi các server .com."
Resolver → Server .com:          "Ai phụ trách google.com?"
.com     → Resolver:             "Hỏi name server của chính Google."
Resolver → Name server Google:   "IP của google.com là gì?"
Google   → Resolver:             "142.250.186.46"
```

Mỗi câu trả lời đi kèm một thời hạn gọi là **TTL** (Time To Live – thời gian sống). Trước khi hết hạn, trình duyệt và resolver dùng lại câu trả lời đã lưu thay vì hỏi lại — vì vậy tra cứu DNS thường gần như tức thì, và cũng vì vậy khi đổi địa chỉ của một tên miền thì phải mất một lúc mọi nơi mới thấy thay đổi.

Tra cứu DNS nhỏ và nhanh, nên thường đi qua **UDP** (cổng 53).

> **Tự thử:** chạy `nslookup google.com` (dùng được cả trong `cmd` của Windows và Terminal của macOS). Bạn sẽ thấy DNS server đã trả lời (thường là router của bạn, ví dụ `192.168.1.1`) và một hoặc nhiều địa chỉ của google.com. Thử `nslookup` với một tên bịa ra như `this-does-not-exist-12345.com` — bạn sẽ nhận lỗi kiểu "Non-existent domain" hoặc "NXDOMAIN".

> **Ví dụ thực tế ở công ty:** "Đội ở Hà Nội vào trang được nhưng khách hàng thì không" ngay sau khi chuyển server thường là do bộ nhớ đệm DNS: một số người vẫn đang lưu IP cũ cho đến khi TTL hết hạn.

---

## 6. FTP, SMTP, SSH

Đây là những giao thức tầng Ứng dụng khác mà bạn sẽ nghe ở chỗ làm. Mỗi giao thức giải quyết một việc:

| Giao thức | Chức năng | Cổng mặc định |
|-----------|-----------|---------------|
| FTP | Truyền file | 21 |
| SMTP | Gửi email | 25, 587 |
| IMAP/POP3 | Nhận email | 143, 110 |
| SSH | Điều khiển server từ xa, bảo mật | 22 |

### FTP — chuyển file

**FTP** (File Transfer Protocol) tải file lên và xuống giữa máy tính và server, giống một hộp gửi đồ dùng chung. FTP cổ điển gửi mật khẩu ở dạng **không mã hóa**, nên ngày nay các công ty chuộng **SFTP** (truyền file qua SSH) hoặc FTPS (FTP kèm TLS).

### SMTP, IMAP và POP3 — email

**Ví dụ đời thường:** email hoạt động giống hệ thống bưu chính. **SMTP** (Simple Mail Transfer Protocol) là người đưa thư *chở* lá thư từ máy chủ mail của bạn tới máy chủ mail của người nhận. **IMAP** và **POP3** là cách bạn *mở hộp thư* để đọc những gì đã đến.

- **IMAP** giữ thư trên server và đồng bộ, nên điện thoại và laptop của bạn hiển thị cùng một hộp thư.
- **POP3** tải thư về một thiết bị và thường xóa khỏi server — kiểu cũ hơn.
- Khi một ứng dụng "gửi email xác nhận tự động", nó giao thư cho một SMTP server.

### SSH — điều khiển máy tính từ xa

**SSH** (Secure Shell) cho phép kỹ sư gõ lệnh trên một server ở rất xa như đang ngồi trước nó, và mọi thứ đều được mã hóa. Lập trình viên và quản trị hệ thống dùng nó hằng ngày để triển khai và sửa server.

> "Cổng mặc định" là số cửa tiêu chuẩn nơi một dịch vụ chờ kết nối. Bạn sẽ học thêm trong chủ đề "Port & Socket".

---

## 7. Ghép lại toàn bộ: tải một trang web từng bước

Đây là cách các giao thức phối hợp khi bạn gõ `https://shop.example.com` và nhấn Enter:

1. **DNS:** trình duyệt cần địa chỉ IP. Nó kiểm tra bộ nhớ đệm; nếu cần thì hỏi DNS resolver (thường qua UDP), và nhận về một địa chỉ kiểu `203.0.113.10`.
2. **TCP handshake:** trình duyệt mở kết nối TCP tới `203.0.113.10` ở cổng 443 bằng SYN → SYN-ACK → ACK.
3. **TLS handshake:** vì địa chỉ bắt đầu bằng `https://`, trình duyệt và server thống nhất khóa mã hóa và trình duyệt kiểm tra chứng chỉ của trang. Nếu ổn, ổ khóa sẽ xuất hiện.
4. **HTTP request:** trình duyệt gửi `GET /` kèm headers (ngôn ngữ, cookie...), lúc này đã được mã hóa.
5. **IP và tầng Liên kết** chở từng gói tin: IP ghi địa chỉ gửi/nhận lên gói và các router chuyển tiếp; WiFi hoặc Ethernet chở chúng qua từng chặng cục bộ.
6. **HTTP response:** server trả về `200 OK` cùng mã HTML của trang. TCP đảm bảo mọi phần đều đến đủ và đúng thứ tự.
7. **Thêm nhiều yêu cầu:** HTML nhắc tới hình ảnh, file định dạng (style) và script, nên trình duyệt gửi thêm các yêu cầu `GET` — thường hàng chục cái — dùng lại cùng kết nối khi có thể.
8. **Trang hiện ra.** Nếu sau đó bạn điền form và bấm *Mua*, trình duyệt gửi yêu cầu `POST` với dữ liệu của bạn trong body.

```text
Bạn gõ URL
   |
   v
 [DNS]  tên -> IP           (UDP, cổng 53)
   |
   v
 [TCP]  SYN / SYN-ACK / ACK (kết nối tới cổng 443)
   |
   v
 [TLS]  kiểm tra chứng chỉ + khóa mã hóa
   |
   v
 [HTTP] GET / -> 200 OK + trang web
```

Chỗ bị lỗi cho bạn biết cần tìm ở đâu: lỗi DNS ("không tìm thấy server") nghĩa là không dịch được tên; hết thời gian chờ (timeout) nghĩa là không tạo được kết nối; mã 4xx/5xx nghĩa là đã kết nối được nhưng yêu cầu hoặc server có vấn đề.

---

## 8. Tóm tắt

- **Giao thức** = quy tắc giao tiếp chung giữa các thiết bị.
- **Mô hình TCP/IP**: 4 tầng — Ứng dụng, Vận chuyển, Mạng, Liên kết — mỗi tầng thêm header riêng.
- **TCP**: tin cậy, đảm bảo thứ tự → dùng cho web, email.
- **UDP**: nhanh, không đảm bảo → dùng cho video, game.
- **HTTP/HTTPS**: giao thức của web. HTTPS mã hóa dữ liệu.
- **Mã trạng thái**: 2xx thành công, 4xx yêu cầu có vấn đề, 5xx server có vấn đề.
- **DNS**: chuyển tên miền thành IP.
- **SMTP** gửi email, **IMAP/POP3** nhận email, **SSH** điều khiển server an toàn, **FTP** truyền file.

### Thuật ngữ chính

| Thuật ngữ | Nghĩa dễ hiểu |
|-----------|---------------|
| Giao thức (protocol) | Bộ quy tắc thống nhất về cách các thiết bị nói chuyện |
| TCP/IP | Gia đình giao thức 4 tầng vận hành Internet |
| Header | Nhãn mà mỗi tầng gắn vào phía trước dữ liệu |
| TCP | Giao hàng cẩn thận: kết nối trước, không mất, đúng thứ tự |
| UDP | Giao hàng nhanh: không kết nối, không gửi lại |
| 3-way handshake | SYN, SYN-ACK, ACK — cách TCP mở kết nối |
| HTTP | Ngôn ngữ hỏi–đáp giữa trình duyệt và máy chủ web |
| HTTP method | Động từ của yêu cầu: GET, POST, PUT, PATCH, DELETE |
| Status code | Con số kết quả 3 chữ số, ví dụ 200, 404, 500 |
| HTTPS / TLS | HTTP trong một kết nối được mã hóa và xác minh danh tính |
| DNS | Danh bạ của Internet: từ tên sang địa chỉ IP |
| SMTP / IMAP / POP3 | Gửi email / đọc email (đồng bộ) / tải email về |
| SSH | Dòng lệnh từ xa được mã hóa để quản lý server |
| FTP / SFTP | Truyền file (không mã hóa / mã hóa qua SSH) |
