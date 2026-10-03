# Port & Socket

## 1. Port (Cổng) là gì?

Địa chỉ IP xác định **máy tính** nào. Nhưng một máy tính có thể chạy nhiều ứng dụng mạng cùng lúc (web browser, email, game...). **Port** (cổng) giúp phân biệt ứng dụng nào nhận dữ liệu nào.

**Ví dụ trực quan:**
- IP = địa chỉ tòa nhà.
- Port = số phòng trong tòa nhà.
- Bạn đến tòa nhà → vào đúng phòng mới gặp đúng người.

Hãy tưởng tượng một tòa văn phòng lớn. Người đưa thư chỉ biết địa chỉ đường phố, nên nếu không có số phòng thì mọi bưu kiện sẽ chất đống ở lễ tân và không ai biết của ai. Khi trên bưu kiện ghi "Phòng 443", lễ tân chuyển thẳng tới đúng nhóm. Hệ điều hành của máy tính đóng vai lễ tân: khi dữ liệu đến, nó nhìn số port và giao dữ liệu cho chương trình đang "ngồi trong phòng đó".

```text
Địa chỉ đầy đủ: 192.168.1.100:3000
                 IP address    Port
```

Dấu hai chấm `:` ngăn cách hai phần: phía trước là địa chỉ IP (máy nào), con số phía sau là port (chương trình nào trên máy đó).

Port là một số nguyên từ **0 đến 65535**.

Giới hạn trên trông "lẻ" này đến từ cách lưu con số: port dùng 16 bit, và 16 bit chứa được 65.536 giá trị khác nhau (từ 0 đến 65535).

### Port không phải cái lỗ trên vỏ máy

> **Hiểu lầm thường gặp:** "Port là cổng USB hay lỗ cắm dây mạng phía sau máy tính." Đó là cổng *vật lý*. Port mạng chỉ là một **con số** trong phần mềm — không liên quan đến phần cứng. Một sợi dây mạng có thể cùng lúc mang dữ liệu cho hàng nghìn số port.

### Ai dùng port nào?

- Chương trình **cung cấp** dịch vụ (web server, database) "ngồi" ở một port cố định, ai cũng biết, và chờ đợi. Việc này gọi là **lắng nghe (listening)** trên một port.
- Chương trình **sử dụng** dịch vụ (trình duyệt, ứng dụng email) là khách đến thăm. Nó không cần số phòng nổi tiếng; hệ điều hành cấp cho nó một số tạm thời trong suốt cuộc trò chuyện.

TCP và UDP mỗi bên có một bộ 65.536 port riêng. Port 53 của TCP và port 53 của UDP về kỹ thuật là hai "phòng" khác nhau, dù DNS dùng cả hai cho cùng một dịch vụ.

---

## 2. Các nhóm Port

| Nhóm | Dải | Ý nghĩa |
|------|-----|---------|
| Well-known Ports | 0 – 1023 | Dành riêng cho dịch vụ chuẩn |
| Registered Ports | 1024 – 49151 | Đăng ký bởi ứng dụng cụ thể |
| Dynamic/Private Ports | 49152 – 65535 | Client dùng tạm thời |

**Ví dụ đời thường:** lại nghĩ về tòa nhà. Phòng 0–1023 là các quầy chính thức ở tầng trệt mà ai cũng biết: "Lễ tân", "Phòng thư", "Bảo vệ". Phòng 1024–49151 là văn phòng mà các công ty đã đăng ký thuê và có tên trên bảng chỉ dẫn. Phòng 49152–65535 là chỗ ngồi linh hoạt: ai cũng có thể dùng một lúc, rồi trả lại.

- **Well-known ports** được một tổ chức quốc tế tên là **IANA** (Internet Assigned Numbers Authority) cấp cho các dịch vụ cốt lõi của Internet: web, email, DNS, SSH...
- **Registered ports** là các số mà nhà sản xuất phần mềm đã đề nghị IANA ghi nhận cho sản phẩm của họ, ví dụ 3306 cho MySQL. Đăng ký chỉ là quy ước, không phải khóa cứng — không có gì ngăn một chương trình khác dùng 3306.
- **Dynamic (ephemeral) ports** là những "chỗ ngồi linh hoạt" mà hệ điều hành cho các chương trình client mượn. Khi trình duyệt mở một kết nối, nó có thể nhận port 54321 trong vài giây rồi trả lại. (Mỗi hệ điều hành có thể dùng một dải hơi khác cho việc này, nhưng ý tưởng là như nhau.)

> **Tự thử:** bạn có thể xem các port đang được dùng trên máy mình. Trên Windows, mở `cmd` và chạy `netstat -an`. Trên macOS, mở Terminal và chạy `netstat -an -p tcp`. Bạn sẽ thấy nhiều dòng như `192.168.1.25:54321   142.250.66.78:443   ESTABLISHED`: bên trái là máy bạn với một port tạm thời, bên phải là một web server ở port 443 (macOS ghi port sau dấu chấm thay vì dấu hai chấm, ví dụ `192.168.1.25.54321`). Các dòng ghi `LISTENING` (Windows) hoặc `LISTEN` (macOS) là các chương trình trên máy bạn đang chờ khách.

---

## 3. Các Port phổ biến cần biết

| Port | Giao thức | Dịch vụ |
|------|-----------|---------|
| 21 | FTP | Truyền file |
| 22 | SSH | Điều khiển server từ xa |
| 25 | SMTP | Gửi email |
| 53 | DNS | Phân giải tên miền |
| 80 | HTTP | Web không mã hóa |
| 443 | HTTPS | Web có mã hóa |
| 3306 | MySQL | Database MySQL |
| 5432 | PostgreSQL | Database PostgreSQL |
| 6379 | Redis | Cache/Message queue |
| 27017 | MongoDB | Database MongoDB |
| 3000 | Dev servers | Convention cho Node.js dev |
| 8080 | HTTP alternative | Thay thế port 80 khi dev |

Bạn không cần thuộc hết một lúc. Hãy bắt đầu với "bộ năm" mà bạn sẽ nghe trong hầu như mọi buổi họp dự án:

1. **80** — web thường (HTTP).
2. **443** — web bảo mật (HTTPS). Gần như mọi website thật ngày nay.
3. **22** — SSH, cách kỹ sư đăng nhập vào server.
4. **3306 / 5432** — hai loại database phổ biến nhất (MySQL / PostgreSQL).
5. **3000 / 8080** — "cái app tôi đang chạy trên laptop của mình".

Vài từ xuất hiện trong bảng:

- **Database** (cơ sở dữ liệu) là chương trình lưu dữ liệu của ứng dụng (khách hàng, đơn hàng...) một cách có tổ chức.
- **Cache** như **Redis** là bộ nhớ ngắn hạn siêu nhanh: ứng dụng giữ dữ liệu hay dùng ở đó để khỏi phải hỏi database mỗi lần.
- **Dev server** là bản sao của ứng dụng mà lập trình viên chạy trên máy của mình trong lúc xây dựng.

> **Ví dụ thực tế ở công ty:** trong nhóm chat dự án bạn có thể đọc: "DB staging ở 5432, nhưng không expose ra ngoài — dùng VPN nhé." Dịch ra: database PostgreSQL của môi trường thử nghiệm lắng nghe ở port 5432, nhưng firewall không cho người ngoài tới port đó, nên bạn phải kết nối vào mạng công ty qua VPN trước.

---

## 4. Firewall và Port

**Firewall** (tường lửa) kiểm soát traffic mạng bằng cách **mở hoặc chặn port**:

- Chặn port 22 → không ai SSH vào server được.
- Chỉ mở port 80 và 443 → server chỉ phục vụ web.

**Ví dụ đời thường:** firewall là người bảo vệ ở cửa tòa nhà cầm một danh sách: "Khách đến phòng 80 và 443 được vào. Những người khác, mời quay về." Các phòng phía sau vẫn có thể có người (một database ở 5432 vẫn chạy bình thường), nhưng người bên ngoài không thể tới được.

### Quy tắc, không phải bức tường

Firewall hoạt động bằng các **quy tắc (rule)**. Một quy tắc thường nêu: *chiều nào* (vào hay ra), *port nào*, *giao thức nào* (TCP/UDP), *từ đâu* (bất kỳ địa chỉ nào, hay chỉ vài IP nhất định), và *cho phép hay từ chối*. Ví dụ:

| Chiều | Port | Từ đâu | Hành động | Lý do |
|-------|------|--------|-----------|-------|
| Vào | 443 | Bất kỳ ai | Cho phép | Website công khai |
| Vào | 22 | Chỉ IP văn phòng | Cho phép | Kỹ sư đăng nhập được, người lạ thì không |
| Vào | 5432 | Chỉ app server | Cho phép | Chỉ ứng dụng được nói chuyện với database |
| Vào | Mọi port khác | Bất kỳ ai | Từ chối | Mặc định: đóng |

Người làm bảo mật gọi đây là **nguyên tắc đặc quyền tối thiểu (principle of least privilege)**: chỉ mở những gì thực sự cần, cho đúng người thực sự cần. Mỗi port mở là một cánh cửa kẻ tấn công có thể thử.

Khi deploy ứng dụng trên cloud (AWS, GCP...), bạn phải cấu hình **Security Group / Firewall rules** để mở đúng port.

**Security Group** là tên AWS đặt cho firewall gắn với một server trên cloud. Firewall cũng có trên laptop của bạn (Windows Defender Firewall, Firewall của macOS trong System Settings → Network) và trong router ở nhà.

> **Ví dụ thực tế ở công ty:** "App chạy tốt trong mạng nội bộ, nhưng khách hàng bên ngoài không vào được port 8080." Nguyên nhân thường gặp là chưa ai thêm quy tắc firewall cho phép traffic đi vào port 8080. App vẫn chạy — chỉ là bảo vệ chưa cho khách vào.

---

## 5. Socket là gì?

**Socket** là điểm cuối (endpoint) của một kết nối mạng — tổ hợp của:
```text
Socket = IP Address + Port + Protocol
Ví dụ: (192.168.1.1, 80, TCP)
```

**Ví dụ đời thường:** nếu IP là tòa nhà và port là căn phòng, thì socket là **chiếc ống nghe điện thoại trong phòng** đang thực sự được nối vào một cuộc gọi. Cuộc gọi luôn có hai ống nghe, mỗi đầu một cái. Các chương trình không tự xử lý dây cáp hay gói tin; chúng chỉ "nói vào ống nghe" (ghi dữ liệu vào socket) và "nghe từ ống nghe" (đọc dữ liệu từ socket), còn lại hệ điều hành lo.

Khi bạn kết nối đến một server, HĐH tạo ra một cặp socket:
- **Server socket**: `server_IP:80` (lắng nghe)
- **Client socket**: `client_IP:54321` (port ngẫu nhiên)

### Từng bước: trình duyệt kết nối tới web server

1. Chương trình web server khởi động và xin hệ điều hành: "Cho tôi **lắng nghe** ở port 443." Giờ đã có một socket lắng nghe đang chờ khách.
2. Bạn mở trang web. Trình duyệt xin hệ điều hành một kết nối tới `server_IP:443`. Hệ điều hành chọn cho bạn một port tạm thời còn trống, ví dụ `54321`.
3. TCP handshake (SYN → SYN-ACK → ACK) diễn ra giữa hai bên.
4. Giờ đã có một kết nối giữa hai socket: `your_IP:54321` ⇄ `server_IP:443`.
5. Hai bên gửi và nhận dữ liệu qua socket của mình.
6. Khi xong, kết nối được đóng và port `54321` được trả lại.

```text
 Laptop của bạn                                Web server
 192.168.1.25:54321  <====== kết nối ======>     203.0.113.10:443
 (client socket, port tạm thời)                  (server socket, port cố định)
```

### Sao một server nói chuyện được với hàng nghìn người trên cùng một port?

Mỗi kết nối được nhận diện bằng **cả hai** đầu: IP và port của bạn, cộng với IP và port của server. Hai người có thể cùng kết nối tới `server:443`, nhưng cặp IP/port của họ khác nhau, nên hệ điều hành của server không bao giờ nhầm lẫn — giống một số tổng đài vẫn tiếp được nhiều người gọi vì mỗi người gọi có số điện thoại khác nhau. Ngay cả hai tab trình duyệt trên cùng laptop của bạn cũng dùng hai port tạm thời khác nhau.

---

## 6. WebSocket

**WebSocket** là giao thức cho phép **kết nối hai chiều, liên tục** (persistent) giữa client và server — khác với HTTP chỉ giao tiếp theo kiểu request-response một chiều.

```text
HTTP:      Client ──request──► Server ──response──► (kết thúc)
WebSocket: Client ◄────────────────────────────►  Server
           (giao tiếp real-time, không cắt kết nối)
```

**Ví dụ đời thường:** HTTP cổ điển giống như nhắn tin hỏi cửa hàng "Đơn của tôi xong chưa?" — cửa hàng chỉ trả lời khi bạn hỏi, nên bạn cứ vài giây lại hỏi một lần. WebSocket giống một cuộc gọi đang mở: một khi đã kết nối, bên nào cũng có thể nói bất cứ lúc nào. Cửa hàng có thể báo "Đơn của bạn xong rồi!" ngay khi việc đó xảy ra.

### Sao không cứ hỏi đi hỏi lại?

Trước khi có WebSocket, trang web thường dùng **polling**: trình duyệt cứ vài giây lại hỏi server "có gì mới không?". Phần lớn câu trả lời là "không", gây lãng phí băng thông và pin, mà tin mới vẫn đến muộn (tối đa bằng khoảng thời gian giữa hai lần hỏi). Với WebSocket, server **đẩy (push)** cập nhật ngay lúc nó xảy ra.

### Nó bắt đầu thế nào

WebSocket khởi đầu là một yêu cầu HTTP bình thường nói rằng "hãy **nâng cấp (upgrade)** kết nối này lên WebSocket". Nếu server đồng ý, chính kết nối đó được giữ mở và chuyển sang giao thức WebSocket. Địa chỉ của nó bắt đầu bằng `ws://` (không mã hóa, port mặc định 80) hoặc `wss://` (có mã hóa, port mặc định 443) — vì vậy nó đi qua cùng những "cửa" firewall như traffic web thông thường.

**Dùng cho**: chat app, thông báo real-time, game online, live dashboard.

> **Tự thử:** mở một ứng dụng chat trên web (ví dụ bản web của một ứng dụng nhắn tin), bấm F12 (Mac: Cmd+Option+I) để mở DevTools, chọn tab **Network** và lọc theo **WS** (đôi khi ghi là "Socket"). Tải lại trang. Thường bạn sẽ thấy một kết nối tồn tại lâu; bấm vào nó và mở mục **Messages** sẽ thấy dữ liệu chạy hai chiều khi bạn chat.

> **Hiểu lầm thường gặp:** "WebSocket và socket là một." *Socket* là điểm cuối chung ở mức hệ điều hành mà mọi chương trình mạng đều dùng. *WebSocket* là một giao thức cụ thể dành cho trình duyệt, chạy bên trên một socket TCP bình thường.

---

## 7. Port trong URL

Khi không gõ port trong URL, browser dùng port mặc định:
- `http://example.com` = `http://example.com:80`
- `https://example.com` = `https://example.com:443`

Đó là lý do URL công khai hầu như không bao giờ hiện port: phần scheme ở đầu (`http` hoặc `https`) đã cho trình duyệt biết phải gõ cửa "phòng" mặc định nào.

### Đọc URL từng phần

```text
https://shop.example.com:8443/orders?id=42
\___/   \______________/ \__/\_____/ \___/
scheme      host name    port  path   query
```

- **Scheme** — dùng giao thức nào (`http`, `https`, `ws`, `wss`).
- **Host name** — máy nào (DNS chuyển nó thành địa chỉ IP).
- **Port** — chương trình nào trên máy đó. Có thể bỏ qua nếu là port mặc định.
- **Path** và **query** — bạn muốn trang hay dữ liệu nào từ chương trình đó.

Khi dev local: `http://localhost:3000` — phải gõ rõ port vì không có mặc định.

**localhost** là một tên đặc biệt có nghĩa "chính máy tính này" (địa chỉ là `127.0.0.1`). Lập trình viên thường chạy nhiều thứ cùng lúc — website ở 3000, API ở 8080, database ở 5432 — và port là cách họ chọn nói chuyện với cái nào. Nếu tester mở `http://localhost:3000` trên laptop *của mình*, họ sẽ vào chính máy của họ chứ không phải máy của lập trình viên — một nhầm lẫn hay gặp khi ai đó dán link localhost vào nhóm chat.

---

## 8. Xử lý sự cố liên quan đến port

Khi có gì đó "không kết nối được", hiểu về port giúp bạn mô tả vấn đề chính xác. Đây là những tình huống bạn sẽ gặp nhiều nhất:

| Bạn thấy gì | Thường có nghĩa là |
|-------------|--------------------|
| **Connection refused** (bị từ chối kết nối) | Máy có trả lời, nhưng không có chương trình nào lắng nghe ở port đó (app chưa chạy, hoặc chạy ở port khác). |
| **Connection timed out** (hết thời gian chờ) | Không có phản hồi nào: thường do firewall âm thầm bỏ traffic, hoặc sai IP. |
| **Address already in use** (ví dụ `EADDRINUSE` trong Node.js) | Bạn cố khởi động một chương trình trên port mà chương trình khác đang dùng. Tại một thời điểm chỉ một chương trình được lắng nghe trên một port. |
| Trang vào được bằng `http` nhưng không vào được bằng `https` | Port 443 bị chặn, hoặc server chưa cấu hình HTTPS. |

**Ví dụ đời thường:** "refused" giống gõ cửa và nghe "ở đây không có ai tên vậy"; "timed out" giống gõ cửa mà không nghe gì cả vì bảo vệ đã lặng lẽ chặn bạn ở cổng.

### Tự kiểm tra một port

> **Tự thử:** kiểm tra xem một port trên server có tới được không. Trên Windows, mở **PowerShell** và chạy `Test-NetConnection google.com -Port 443`; tìm dòng `TcpTestSucceeded : True`. Trên macOS, trong Terminal chạy `nc -vz google.com 443`; bạn sẽ thấy một dòng kết thúc bằng `succeeded!`. Giờ thử một port thường bị đóng, như `25` trên mạng gia đình hoặc `3306` trên google.com: Windows báo `TcpTestSucceeded : False`, còn trên macOS `nc` sẽ báo bị từ chối kết nối hoặc có vẻ bị treo cho đến khi hết thời gian chờ (bấm Ctrl+C để dừng).

> **Tự thử (món ruột của lập trình viên):** tìm chương trình nào đang chiếm port 3000. Windows `cmd`: `netstat -ano | findstr :3000` — số cuối cùng là mã tiến trình (PID), bạn có thể tra trong tab **Details** của Task Manager. macOS Terminal: `lsof -i :3000` — lệnh hiện tên chương trình và PID của nó.

### Viết một ticket tốt

So sánh hai báo cáo lỗi này:

- "API không chạy."
- "Từ mạng văn phòng, `https://api.staging.example.com` (port 443) bị timeout; ở nhà thì vào được. Ping tới host vẫn thành công."

Báo cáo thứ hai cho cả nhóm biết ngay server vẫn sống và vấn đề nhiều khả năng là quy tắc firewall cho mạng văn phòng. Ghi rõ **host, port, loại lỗi và bạn thử từ đâu** giúp tiết kiệm hàng giờ.

---

## 9. Tóm tắt

- **Port** = số phòng trong tòa nhà (IP).
- Port là số từ 0 đến 65535; well-known port (0–1023) dành cho dịch vụ chuẩn, còn client được cấp port động tạm thời.
- **Port 80/443**: HTTP/HTTPS (web).
- **Port 22**: SSH (quản lý server).
- **Port 3306/5432**: MySQL/PostgreSQL (database).
- **Firewall**: kiểm soát port nào được mở.
- **Socket**: tổ hợp IP + Port + Protocol tạo thành điểm kết nối.
- **WebSocket**: kết nối hai chiều liên tục cho real-time app.
- **URL** ẩn port mặc định (80 cho http, 443 cho https); `localhost:3000` thì phải ghi rõ.
- **"Refused" và "timed out"**: không có ai lắng nghe và không có phản hồi nào (thường do firewall).

### Thuật ngữ chính

| Thuật ngữ | Nghĩa dễ hiểu |
|-----------|---------------|
| Port (cổng) | Con số cho máy tính biết chương trình nào sẽ nhận dữ liệu |
| Listening (lắng nghe) | Chương trình đang chờ kết nối trên một port |
| Well-known port | 0–1023, dành cho dịch vụ chuẩn như web và SSH |
| Ephemeral (dynamic) port | Port tạm thời hệ điều hành cho client mượn trong một kết nối |
| IANA | Tổ chức giữ danh sách chính thức các số port |
| Firewall (tường lửa) | "Bảo vệ" cho phép hoặc chặn traffic theo port và nguồn |
| Security Group | Firewall của nhà cung cấp cloud gắn với server (thuật ngữ AWS) |
| Socket | Một đầu của kết nối: IP + port + giao thức |
| WebSocket | Giao thức của trình duyệt cho kết nối hai chiều luôn mở |
| Polling | Hỏi server liên tục "có gì mới không?" |
| localhost | "Chính máy này" (địa chỉ `127.0.0.1`) |
| Connection refused / timed out | Không ai lắng nghe ở port đó / hoàn toàn không có phản hồi |
