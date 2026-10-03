# Host & Server

## 1. Host là gì?

**Host** là bất kỳ thiết bị nào kết nối vào mạng và có địa chỉ IP — máy tính, điện thoại, máy chủ, router... Thuật ngữ "host" đơn giản chỉ một thiết bị tham gia mạng.

**Ví von:** hãy nghĩ đến một con phố. Mỗi ngôi nhà có địa chỉ bưu điện đều gửi và nhận được thư. Trong mạng, mỗi thiết bị có địa chỉ đều gửi và nhận được dữ liệu — và mỗi thiết bị đó là một host. Laptop của bạn trong Wi-Fi văn phòng là host, điện thoại dùng 4G là host, smart TV ở nhà là host, và cỗ máy khổng lồ chạy Facebook cũng là host.

Bản thân địa chỉ đó là **địa chỉ IP** (IP = Internet Protocol). Đó là một dãy số như `192.168.1.23` cho mạng biết phải giao dữ liệu tới đâu — ta sẽ xem kỹ ở Mục 5. Host thường còn có một **hostname** (tên máy) dễ đọc, như `HARRY-LAPTOP` hay `mail.company.com`.

Bạn cũng sẽ gặp "host" dùng như động từ: *"Chúng tôi host website trên AWS"* nghĩa là file và chương trình của website nằm trên máy của AWS và được phục vụ từ đó.

> **Tự thử:** tìm tên và địa chỉ IP của máy bạn.
> - **Windows:** mở **Command Prompt** (phím Windows, gõ `cmd`, Enter) và chạy `ipconfig`. Tìm dòng kiểu `IPv4 Address. . . . . . : 192.168.1.23`. Chạy `hostname` để xem tên máy.
> - **macOS:** mở **Terminal** và chạy `ipconfig getifaddr en0`. Nó in ra một dòng như `192.168.1.23` (nếu không in gì, có thể bạn đang cắm dây mạng — thử `en1`). Chạy `hostname` để xem tên máy Mac.

---

## 2. Mô hình Client – Server

Hầu hết các ứng dụng Internet hoạt động theo mô hình **Client – Server**:

```text
Client (Người dùng)         Server (Máy chủ)
─────────────────           ─────────────────
Browser, App          ───►  Nhận request
                      ◄───  Xử lý & trả về response
```

- **Client**: thiết bị của người dùng, gửi yêu cầu (request).
- **Server**: máy tính chuyên dụng, nhận và xử lý yêu cầu, trả về dữ liệu (response).

**Ví von:** một **nhà hàng**. Bạn (client) ngồi vào bàn và gọi: "cho một tô phở" — đó là **request**. Nhà bếp (server) nấu và mang ra một tô phở — đó là **response**. Nhà bếp không nấu khi chưa ai gọi, và phục vụ nhiều bàn cùng lúc.

Gần như server nào cũng có những đặc điểm sau:

- Nó **chờ** request và trả lời; client mới là bên **bắt đầu** cuộc trò chuyện.
- Nó **luôn bật**, 24/7, thường đặt trong **trung tâm dữ liệu** (data center) — một tòa nhà lớn có điều hòa, đầy các tủ máy tính và có nguồn điện dự phòng.
- Nó thường **không gắn màn hình hay bàn phím**; kỹ sư quản lý nó từ xa.
- Nó phục vụ **rất nhiều client cùng lúc** — hàng nghìn hoặc hàng triệu.

**Ví dụ:**
- Bạn gõ `facebook.com` → browser (client) gửi request đến server Facebook → server trả về HTML trang web.
- Bạn đặt hàng trên Shopee → app (client) gửi request đến server Shopee → server xử lý đơn hàng.

### Từng bước: chuyện gì xảy ra khi bạn mở một website

1. Bạn gõ `shopee.vn` vào trình duyệt và nhấn Enter.
2. Trình duyệt hỏi một **DNS server** ("danh bạ điện thoại" của Internet): "địa chỉ IP của `shopee.vn` là gì?" và nhận về một dãy số.
3. Trình duyệt kết nối tới server ở địa chỉ IP đó.
4. Nó gửi một **request**: "cho tôi trang chủ".
5. Server chạy các chương trình của mình, đọc sản phẩm từ cơ sở dữ liệu và dựng trang.
6. Server gửi lại **response**: HTML của trang, kèm hình ảnh, style và script.
7. Trình duyệt vẽ trang lên màn hình. Mỗi lần bạn bấm tiếp là một vòng request – response mới.

> **Hiểu lầm thường gặp:** "Server là một loại siêu máy tính đặc biệt." Server là một **vai trò**, không phải một loại máy. Bất kỳ máy tính nào chạy phần mềm chờ và trả lời request đều đang đóng vai server — kể cả laptop của bạn (xem Mục 4). Và một máy có thể đóng cả hai vai: web server của công ty là server đối với trình duyệt của bạn, nhưng lại là **client** khi nó hỏi dữ liệu từ database server.

---

## 3. Các loại Server

| Loại | Chức năng | Ví dụ |
|------|-----------|-------|
| **Web Server** | Phục vụ trang web (HTML, CSS, JS) | Nginx, Apache |
| **Application Server** | Xử lý logic nghiệp vụ | Node.js, Django, Spring |
| **Database Server** | Lưu trữ và truy vấn dữ liệu | MySQL, PostgreSQL, MongoDB |
| **File Server** | Lưu trữ và chia sẻ file | Samba, FTP server |
| **Mail Server** | Gửi/nhận email | Postfix, Gmail SMTP |
| **DNS Server** | Phân giải tên miền | Cloudflare DNS, Google DNS |

Nói dễ hiểu:

- **Web server** — cửa trước. Nó đưa cho trình duyệt các file làm sẵn: HTML (cấu trúc trang), CSS (giao diện) và JavaScript (hành vi). Những file không thay đổi này gọi là file **tĩnh** (static).
- **Application server** — bộ não sau quầy. Nó chạy **logic nghiệp vụ** (business logic): các quy tắc kinh doanh, như "kiểm tra tồn kho, áp voucher, tính phí ship, tạo đơn hàng".
- **Database server** — kho lưu trữ ngăn nắp. Nó lưu dữ liệu (người dùng, sản phẩm, đơn hàng) và trả lời các câu hỏi về dữ liệu ("tất cả đơn hàng của khách này trong tháng").
- **File server** — ổ đĩa dùng chung trong mạng văn phòng, như ổ `S:` nơi cả nhóm để tài liệu. Với lượng ảnh và video khổng lồ trên web, ngày nay các công ty thường dùng dịch vụ **object storage** (lưu trữ đối tượng) như Amazon S3.
- **Mail server** — bưu điện cho email.
- **DNS server** — danh bạ đổi tên như `google.com` thành địa chỉ IP (ví dụ `1.1.1.1` của Cloudflare và `8.8.8.8` của Google).

### Chúng phối hợp ra sao: kiến trúc 3 tầng

Hầu hết ứng dụng doanh nghiệp chia công việc thành ba lớp, gọi là **kiến trúc 3 tầng** (3-tier architecture):

```text
 Browser / App ──► [ Web server ] ──► [ Application server ] ──► [ Database server ]
   (client)           cửa trước          logic nghiệp vụ            dữ liệu lưu trữ
```

**Ví von:** người phục vụ (web server) nhận món, đầu bếp (application server) quyết định nấu thế nào, và kho (database server) giữ nguyên liệu. Khách không bao giờ bước vào kho — tương tự, trình duyệt không bao giờ nói chuyện trực tiếp với database. Sự tách biệt này tốt cho bảo mật và giúp từng lớp dễ mở rộng hơn.

Thực tế, một máy chủ vật lý có thể chạy nhiều loại server software cùng lúc. Website của một công ty nhỏ có thể chạy Nginx, ứng dụng và database trên cùng một máy; một trang lớn thì trải mỗi tầng ra nhiều máy.

---

## 4. Localhost

**Localhost** là tên đặc biệt trỏ về chính máy tính bạn đang dùng, tương đương địa chỉ IP `127.0.0.1`.

**Ví von:** viết một lá thư và ghi địa chỉ người nhận là "chính tôi". Lá thư không bao giờ ra khỏi nhà — bác đưa thư (mạng) thậm chí không cần tham gia. Máy nào cũng có localhost của riêng nó, và nó luôn có nghĩa là *chính máy này*, dù ai đang dùng.

Khi lập trình viên phát triển web, họ chạy server ngay trên máy tính cá nhân và truy cập qua:

```text
http://localhost:3000
http://127.0.0.1:3000
```

Điều này cho phép test ứng dụng mà không cần deploy lên Internet. **Deploy** (triển khai) nghĩa là đưa ứng dụng lên một server thật để người khác dùng được.

### `:3000` là gì? Port

Một máy tính chạy được nhiều chương trình server cùng lúc, nên mỗi chương trình "nghe" ở một **port** (cổng) có đánh số. **Ví von:** địa chỉ IP là số nhà của tòa chung cư; port là số căn hộ bên trong. `localhost:3000` nghĩa là "máy này, căn hộ 3000".

| Port | Thường dùng cho |
|---|---|
| 80 | Website qua HTTP |
| 443 | Website qua HTTPS (bảo mật) |
| 3000, 5173, 8080 | Ứng dụng đang phát triển trên laptop của developer |
| 5432 / 3306 | Database PostgreSQL / MySQL |

Bạn hiếm khi thấy 80 hay 443 trên trình duyệt vì đó là mặc định: `https://shopee.vn` thực ra là `https://shopee.vn:443`.

> **Hiểu lầm thường gặp:** một developer dán `http://localhost:3000/orders` vào nhóm chat và nhờ tester kiểm tra. Tester mở ra và nhận *"This site can't be reached"*. Không có gì hỏng cả: trên laptop của tester, `localhost` nghĩa là **chính laptop của tester**, nơi ứng dụng không hề chạy. Để chia sẻ, developer phải đưa IP mạng của máy mình (ví dụ `http://192.168.1.23:3000`, chỉ dùng được trong cùng mạng văn phòng) hoặc tốt hơn là deploy lên một **server test** dùng chung.

> **Tự thử:** chạy `ping 127.0.0.1` (hoặc `ping localhost`).
> - **Windows:** nó gửi 4 tin và hiện `Reply from 127.0.0.1: bytes=32 time<1ms`.
> - **macOS:** nó chạy liên tục với các dòng như `64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.05 ms`; nhấn `Ctrl + C` để dừng.
> Thời gian gần như bằng 0 vì tin nhắn không hề rời khỏi máy bạn.

---

## 5. Địa chỉ IP

Mỗi host trong mạng có địa chỉ IP duy nhất:

**Ví von:** địa chỉ IP là **địa chỉ bưu điện** của dữ liệu. Không có nó, một gói dữ liệu sẽ không biết đi đâu — và câu trả lời cũng không biết quay về đâu.

### IPv4

- Dạng: `192.168.1.100` — 4 nhóm số, mỗi nhóm 0-255.
- Tổng số: ~4.3 tỷ địa chỉ (đã gần cạn kiệt).

Vì sao lại là 0–255 và 4,3 tỷ? Mỗi nhóm là một byte (8 bit), và 8 bit chứa được 256 giá trị (0–255). Bốn nhóm = 32 bit, cho ra 2³² ≈ 4,3 tỷ tổ hợp. Con số đó tưởng là dư dả vào thập niên 1980, nhưng ngày nay riêng số điện thoại đã nhiều hơn thế.

### IPv6

- Dạng: `2001:0db8:85a3:0000:0000:8a2e:0370:7334` — 8 nhóm hex.
- Tổng số: 340 undecillion địa chỉ (thực tế là vô hạn với hiện tại).

**Hệ thập lục phân** (hexadecimal, "hex") đếm bằng 16 ký hiệu: 0–9 rồi a–f. IPv6 dùng 128 bit, cho ra 2¹²⁸ ≈ 3,4 × 10³⁸ địa chỉ — đủ để mỗi hạt cát trên Trái Đất có rất nhiều địa chỉ. IPv6 ra đời vì IPv4 sắp hết. Các dãy số 0 dài có thể viết gọn: ví dụ trên có thể viết thành `2001:db8:85a3::8a2e:370:7334`.

### Private vs Public IP

- **Private**: chỉ dùng trong mạng nội bộ. Dải: `192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`.
- **Public**: địa chỉ trên Internet, duy nhất toàn cầu.

**Ví von:** **số máy lẻ** điện thoại nội bộ của công ty. "Máy lẻ 105" gọi được trong văn phòng, và công ty khác cũng có thể có máy lẻ 105 — nhưng từ bên ngoài bạn không gọi thẳng vào được. Muốn gọi vào công ty từ bên ngoài, bạn cần số điện thoại **công khai** của công ty. Tương tự, hàng nghìn hộ gia đình đều dùng `192.168.1.x` bên trong, và các địa chỉ đó không bao giờ được định tuyến trên Internet công cộng.

```text
 Mạng gia đình / văn phòng (private)                Internet (public)
 Laptop      192.168.1.23 ─┐
 Điện thoại  192.168.1.24 ─┼──► Router ── IP public 113.161.x.x ──► server của Shopee
 TV          192.168.1.25 ─┘
```

**Router** Wi-Fi của bạn nối hai thế giới này: mọi thiết bị bên trong dùng chung một IP public của router. Router nhớ thiết bị nào bên trong đã hỏi gì và chuyển mỗi câu trả lời về đúng thiết bị. Kỹ thuật này gọi là **NAT** (Network Address Translation – chuyển đổi địa chỉ mạng), và là lý do lớn giúp IPv4 trụ được lâu đến vậy.

> **Tự thử:** so sánh IP private và public của bạn. Chạy `ipconfig` (Windows) hoặc `ipconfig getifaddr en0` (macOS) — bạn sẽ thấy địa chỉ private như `192.168.x.x` hoặc `10.x.x.x`. Rồi tìm "what is my IP" trên trình duyệt — website sẽ hiện một địa chỉ hoàn toàn khác, địa chỉ **public**: của router nhà bạn.

---

## 6. Web Hosting

**Hosting** là dịch vụ cho thuê không gian trên server để lưu website.

Hầu như không ai chạy website công khai từ laptop ở nhà: máy phải bật 24/7, có IP public ổn định, và chịu được mất điện. Vì vậy người ta thuê chỗ trên server của người khác. **Ví von:** chọn chỗ ở.

| Loại | Mô tả | Phù hợp |
|------|-------|---------|
| **Shared Hosting** | Nhiều website dùng chung 1 server | Blog, web nhỏ, rẻ |
| **VPS (Virtual Private Server)** | Server ảo riêng trên phần cứng chung | Web trung bình, linh hoạt hơn |
| **Dedicated Server** | Thuê nguyên 1 máy chủ vật lý | Website lớn, hiệu năng cao |
| **Cloud Hosting** | Tài nguyên từ nhiều server (AWS, GCP, Azure) | Scale linh hoạt |
| **Serverless** | Không quản lý server, trả theo lần dùng | Microservices, API nhỏ |

- **Shared hosting = thuê một phòng trong nhà trọ chung.** Rẻ, nhưng dùng chung bếp và nhà tắm: nếu website hàng xóm quá đông khách, website của bạn cũng chậm theo.
- **VPS = căn hộ riêng trong một tòa chung cư.** Tòa nhà (máy vật lý) là dùng chung, nhưng bạn có không gian riêng có khóa, với lượng CPU và RAM được đảm bảo, và cài gì tùy ý. Server **ảo** (virtual) là một "máy tính" được phần mềm tạo ra bằng cách chia nhỏ một máy thật.
- **Dedicated server = thuê nguyên một căn nhà.** Toàn bộ phần cứng là của bạn: hiệu năng và quyền kiểm soát tối đa, giá cũng tối đa. Hợp với một website thương mại điện tử lớn.
- **Cloud hosting = chuỗi căn hộ dịch vụ.** Cần thêm hai phòng cho mùa cao điểm? Có ngay trong vài phút và chỉ trả tiền khi đang dùng. AWS (Amazon), GCP (Google Cloud) và Azure (Microsoft) là các nhà cung cấp lớn. Lý tưởng cho startup không đoán trước được tốc độ tăng trưởng.
- **Serverless = đi taxi thay vì tự mua xe.** Bạn không quản lý server nào cả; bạn tải lên các đoạn code nhỏ, nhà cung cấp chạy chúng khi có request, và bạn **trả tiền theo số lần chạy**. (Vẫn có server — chỉ là bạn không bao giờ thấy hay phải quản lý chúng.)

> **Ví dụ thực tế:** trong buổi họp kế hoạch, có người nói *"Mình chuyển từ VPS lên cloud để scale cho đợt 11.11 nhé."* Dịch ra: cửa hàng dự kiến lượng khách tăng vọt vào ngày sale 11 tháng 11, và với cloud hosting có thể thêm server cho đợt cao điểm rồi bỏ đi sau đó, thay vì trả tiền cho một máy lớn quanh năm.

---

## 7. IP Tĩnh vs IP Động

- **IP tĩnh (Static IP)**: không thay đổi — dùng cho server, cần domain trỏ vào.
- **IP động (Dynamic IP)**: thay đổi mỗi lần kết nối — dùng cho thiết bị người dùng thông thường.

**Ví von:** IP tĩnh là **địa chỉ cố định của một cửa hàng** — in trên biển hiệu và bản đồ, nên khách luôn tìm được. IP động là **số phòng khách sạn**: mỗi lần nhận phòng bạn được phòng nào còn trống, và điều đó không sao vì chẳng ai cần gửi thư cho bạn ở đó.

Địa chỉ động được cấp tự động bởi một dịch vụ gọi là **DHCP** (trên router nhà bạn, hoặc ở nhà mạng) mỗi khi thiết bị tham gia mạng. Cách này tiện và tiết kiệm địa chỉ, nên laptop và điện thoại thông thường đều dùng.

Server thì khác: người khác phải tìm thấy nó một cách đáng tin cậy.

- Một tên miền như `shop.example.com` được cấu hình (trong DNS) để trỏ vào IP của server. Nếu IP đó đổi, tên miền sẽ trỏ sai chỗ và website bị sập.
- Đối tác thường **whitelist** server của bạn — chỉ cho phép kết nối từ một danh sách IP cụ thể. Nếu IP server của bạn đổi, firewall của họ sẽ chặn bạn.

> **Ví dụ thực tế:** một ngân hàng đối tác gửi yêu cầu: *"Vui lòng cung cấp địa chỉ IP mà hệ thống của anh chị sẽ dùng để gọi API của chúng tôi, để chúng tôi whitelist."* Câu trả lời đúng về hạ tầng là một IP **tĩnh** cho server gọi đi. IP động sẽ chạy được hôm nay và âm thầm làm hỏng tích hợp vào lần tiếp theo nó thay đổi.

---

## 8. Kết nối mọi thứ: Từ Localhost đến Production

Phần mềm thường đi qua nhiều **môi trường** (environment) — các bản sao riêng của hệ thống trên những host khác nhau — trước khi người dùng thật nhìn thấy:

```text
 Laptop của developer    Server test / staging        Server production
 localhost:3000    ──►   test.shop.com          ──►   shop.com
 (chỉ developer)         (nhóm & tester)              (khách hàng thật)
```

1. **Local** — developer chạy ứng dụng trên `localhost` để xây dựng và thử.
2. **Test / staging** — ứng dụng được deploy lên một server dùng chung có địa chỉ riêng, để tester và BA truy cập được từ máy của họ. Staging được dựng giống production nhất có thể.
3. **Production** ("prod") — hệ thống thật trên các server có IP tĩnh và tên miền thật, phục vụ khách hàng thật.

> **Ví dụ thực tế:** một tester báo *"Đăng nhập lỗi trên staging nhưng developer thì chạy được."* Những câu hỏi hữu ích, dùng từ vựng của bài này:
> - Có phải developer đang test trên **localhost** còn tôi đang dùng **server staging**? (Host khác, có thể database cũng khác.)
> - **Application server** của staging có kết nối đúng **database server** không?
> - Dịch vụ đăng nhập có nằm sau một **whitelist** chưa có IP của server staging không?
> Hỏi rõ host nào, server nào, IP nào sẽ biến câu "nó hỏng rồi" mơ hồ thành một ticket mà developer xử lý được.

---

## 9. Tóm tắt

- **Host**: bất kỳ thiết bị nào có IP trong mạng.
- **Client**: gửi request; **Server**: xử lý và trả response. "Server" là một vai trò — một máy có thể vừa là client vừa là server.
- **Các loại server**: web (file tĩnh), application (logic nghiệp vụ), database (dữ liệu), file, mail, DNS. Web → app → database tạo thành **kiến trúc 3 tầng**.
- **Localhost / 127.0.0.1**: địa chỉ của chính máy bạn. Link localhost chỉ chạy được trên máy đang chạy ứng dụng.
- **Port**: "số căn hộ" của một chương trình trên host, ví dụ `:3000`, `:443`.
- **IPv4** (~4,3 tỷ, gần cạn) vs **IPv6** (gần như vô hạn). IP **private** chỉ dùng trong một mạng; IP **public** là duy nhất trên Internet.
- **Web Hosting**: dịch vụ lưu website trên server.
- **VPS**: server ảo riêng — cân bằng giữa giá và linh hoạt. Cloud mở rộng theo nhu cầu; serverless tính tiền theo số lần chạy.
- **IP tĩnh** cho server (tên miền và whitelist phụ thuộc vào nó); **IP động** cho thiết bị thường ngày.

### Thuật ngữ chính

| Thuật ngữ | Nghĩa dễ hiểu |
|---|---|
| Host | Bất kỳ thiết bị nào trong mạng có địa chỉ |
| Địa chỉ IP | "Địa chỉ bưu điện" của một host |
| Client | Bên hỏi (trình duyệt, app) |
| Server | Bên chờ, xử lý và trả lời |
| Request / Response | Câu hỏi gửi đi / câu trả lời nhận về |
| Data center | Tòa nhà đầy server, luôn có điện và làm mát |
| Localhost (127.0.0.1) | "Chính máy tính này" |
| Port (cổng) | Cánh cửa có đánh số cho một chương trình trên host |
| IP Private / Public | Địa chỉ chỉ dùng bên trong / địa chỉ truy cập được trên Internet |
| NAT | Router chia một IP public cho nhiều thiết bị |
| Hosting | Thuê chỗ trên server của người khác |
| VPS | Server ảo riêng trên phần cứng dùng chung |
| Serverless | Chạy code mà không quản lý server; trả tiền theo lần chạy |
| IP tĩnh / động | Địa chỉ không bao giờ đổi / thay đổi theo thời gian |
| Whitelist | Danh sách những địa chỉ duy nhất được phép kết nối |
| Environment (môi trường) | Một bản sao riêng của hệ thống: local, staging, production |
