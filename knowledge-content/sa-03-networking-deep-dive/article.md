# Mạng máy tính chuyên sâu cho kiến trúc sư

## 1. OSI và TCP/IP: những tầng bạn thực sự nhắc tới

Mô hình OSI bảy tầng là mô hình để dạy; Internet thực tế chạy trên mô hình TCP/IP bốn tầng. Dù vậy, kiến trúc sư vẫn dùng *số tầng* của OSI như một thứ từ vựng chung — "load balancer L4", "firewall L7".

| Tầng OSI | Tầng TCP/IP | Giao thức | Xuất hiện trong buổi review dưới dạng |
|---|---|---|---|
| 7 Application (+6, 5) | Application | HTTP, gRPC, DNS | ALB định tuyến theo path, rule WAF |
| 4 Transport | Transport | TCP, UDP | NLB trên TCP 443, số port |
| 3 Network | Internet | IP, ICMP | Route table, CIDR, NAT |
| 2 Data link / 1 Physical | Link | Ethernet, ARP | Traffic cùng subnet, khoảng cách |

TLS nằm lửng lơ giữa tầng 4 và 7, còn QUIC là giao thức transport xây trên UDP — đừng tranh cãi chuyện đó; hãy nói thành phần ấy *nhìn thấy gì*. Chỉ thấy IP và port → L4. Đọc được header, path hay cookie HTTP → L7. **Thành phần hiểu tầng càng cao thì quyết định càng thông minh, nhưng càng tốn CPU và độ trễ**: security group gần như miễn phí, còn WAF phân tích từng body request thì không.

---

## 2. Đóng gói, MTU và MSS

Mỗi tầng **đóng gói** (encapsulation) dữ liệu của tầng trên bằng header riêng của nó.

```text
+----------+----------+----------+----------------------+
| Ethernet | IP hdr   | TCP hdr  | payload              |
| 14 bytes | 20 bytes | 20 bytes | up to MSS bytes      |
+----------+----------+----------+----------------------+
           |<------------ MTU = 1500 bytes ------------>|
                           MSS = 1500 - 20 - 20 = 1460
```

- **MTU** (Maximum Transmission Unit) là kích thước gói IP lớn nhất mà một đường truyền mang được: 1.500 byte trên Ethernet chuẩn. Bên trong AWS VPC, đa số instance type hiện nay hỗ trợ **jumbo frame 9.001 byte**, nhưng traffic ra khỏi VPC (internet gateway, VPN) bị giới hạn ở 1.500 hoặc thấp hơn.
- **MSS** (Maximum Segment Size) là phần payload TCP trong mỗi segment, được thông báo ngay trong gói SYN.
- **Path MTU Discovery** cần các gói ICMP "fragmentation needed". Firewall chặn toàn bộ ICMP sẽ tạo ra **hố đen** (black hole): handshake (gói nhỏ) vẫn thành công, nhưng response lớn thì treo mãi. Tunnel và VPN thêm header nên hay gặp lỗi này — hãy giới hạn (clamp) MSS.

---

## 3. TCP: handshake, độ tin cậy và đóng kết nối

TCP cung cấp một luồng byte có thứ tự và tin cậy trên một mạng không tin cậy, đổi lại bằng trạng thái lưu cho từng kết nối và các vòng khứ hồi (round trip, RTT).

```text
Client                                   Server (LISTEN)
  | ---- SYN seq=x ----------------------> |
  |  SYN_SENT                              |  SYN_RECEIVED
  | <--- SYN+ACK seq=y ack=x+1 ----------- |
  | ---- ACK ack=y+1 --------------------> |
  |  ESTABLISHED (1 RTT spent)             |  ESTABLISHED
  |                                        |
  | ---- FIN ----------------------------> |  (client closes first)
  |  FIN_WAIT_1                            |  CLOSE_WAIT
  | <--- ACK ----------------------------- |
  |  FIN_WAIT_2                            |
  | <--- FIN ----------------------------- |  LAST_ACK
  | ---- ACK ----------------------------> |  CLOSED
  |  TIME_WAIT (2 x MSL) -> CLOSED         |
```

- **Sequence number và ACK** giúp phát hiện mất gói và sắp lại thứ tự byte; segment bị mất sẽ được gửi lại.
- **Kiểm soát luồng** (flow control): bên nhận quảng bá một window để bên gửi nhanh không làm tràn nó.
- **Kiểm soát tắc nghẽn** (congestion control — CUBIC là mặc định trên Linux, BBR phổ biến ở các nhà cung cấp lớn) bắt đầu nhỏ — initial window 10 segment — rồi tăng dần. Kết nối mới thì chậm; kết nối đã "ấm" thì nhanh.
- **SYN flood**: kẻ tấn công không bao giờ hoàn tất handshake, làm đầy hàng đợi half-open; **SYN cookie** cho phép server không lưu trạng thái cho tới khi nhận ACK cuối.
- **Head-of-line blocking** (chặn đầu hàng): một segment bị mất sẽ làm đứng mọi byte phía sau nó.

Mẹo xử lý sự cố: rất nhiều socket kẹt ở **CLOSE_WAIT** nghĩa là *ứng dụng của bạn* đã nhận FIN nhưng không bao giờ gọi `close()` — lỗi rò rỉ trong code, không phải lỗi mạng.

---

## 4. TIME_WAIT, ephemeral port và tái sử dụng kết nối

Bên **đóng trước** giữ trạng thái **TIME_WAIT** trong 2×MSL — trên Linux được cố định là **60 giây** — để các gói đến trễ không bị nhầm sang kết nối mới dùng cùng 4-tuple (source IP, source port, destination IP, destination port). Bản thân TIME_WAIT rất rẻ, nhưng nó giữ chỗ 4-tuple đó, và thứ cạn đầu tiên là **port tạm** (ephemeral port) ở phía client.

```bash
# Linux default ephemeral range: 32768-60999 (about 28,000 ports)
sysctl net.ipv4.ip_local_port_range

# Count sockets in TIME_WAIT
ss -tan state time-wait | wc -l
```

Một service mở kết nối mới cho mỗi request tới cùng một IP:port database, với vài trăm request/giây, sẽ đốt hết số port đó trong khoảng một phút và báo lỗi `EADDRNOTAVAIL` ("cannot assign requested address"). Cách sửa, tốt nhất trước:

1. **Tái sử dụng kết nối**: HTTP keep-alive, **connection pool** cho database, dùng chung một HTTP client.
2. Nới rộng không gian 4-tuple (thêm IP đích) nếu không thể tái sử dụng.
3. `net.ipv4.tcp_tw_reuse=1` cho phép dùng lại socket TIME_WAIT cho kết nối *đi ra*. Tuỳ chọn cũ `tcp_tw_recycle` đã bị gỡ khỏi Linux 4.12 vì nó làm hỏng các client đứng sau NAT.

Hãy căn chỉnh **idle timeout** dọc đường đi: nếu load balancer cắt kết nối rảnh sau 60 giây mà connection pool của client giữ tới 300 giây, client sẽ ghi vào socket đã chết và nhận reset. Idle timeout của client phải ngắn hơn của mọi thiết bị trung gian.

---

## 5. UDP: khi "không đảm bảo gì" lại là tính năng

UDP chỉ thêm port và checksum (header 8 byte) lên trên IP: không handshake, không thứ tự, không gửi lại, không kiểm soát tắc nghẽn.

| | TCP | UDP |
|---|---|---|
| Thiết lập | Handshake 3 bước (1 RTT) | Không có |
| Truyền tải | Tin cậy, có thứ tự | Best effort |
| Head-of-line blocking | Có | Không |
| Dùng điển hình | HTTP/1.1, HTTP/2, database, SSH | DNS, VoIP/video, game, QUIC, WireGuard |

Chọn UDP khi **dữ liệu đến trễ là vô giá trị** (một frame thoại trễ 300 ms thì vứt đi) hoặc khi bạn tự xây cơ chế tin cậy riêng ở trên, như QUIC làm. Cái giá: UDP dễ giả mạo địa chỉ nguồn, là "nhiên liệu" cho **DDoS khuếch đại** (amplification — DNS, NTP, memcached), và một số firewall doanh nghiệp chặn UDP — vì thế client HTTP/3 luôn giữ đường lui về TCP.

---

## 6. CIDR và chia subnet

`10.0.0.0/16` nghĩa là 16 trên 32 bit đầu là phần mạng, còn lại **2^(32−16) = 65.536 địa chỉ**.

| Prefix | Số địa chỉ | Dùng được trên AWS | Dùng điển hình |
|---|---|---|---|
| /16 | 65.536 | 65.531 | VPC lớn nhất |
| /20 | 4.096 | 4.091 | Private subnet cho node và pod EKS |
| /24 | 256 | 251 | Subnet phổ biến |
| /28 | 16 | 11 | Subnet nhỏ nhất trên AWS |

AWS giữ lại **5 địa chỉ mỗi subnet** (địa chỉ mạng, +1 router, +2 DNS, +3 dự phòng, địa chỉ cuối); mạng truyền thống chỉ giữ 2. Các dải private (RFC 1918): `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.

Những mối lo ở tầm kiến trúc:

- **Không bao giờ để chồng lấn.** Các VPC hoặc mạng on-prem có CIDR chồng nhau không thể peering hay định tuyến với nhau nếu không dùng NAT rất phức tạp. Hãy có một bản quy hoạch IP toàn công ty thay vì để VPC nào cũng mặc định `10.0.0.0/16`.
- **Tính cho Kubernetes**: với AWS VPC CNI, mỗi pod chiếm một IP thật của VPC, nên /24 mỗi AZ hết rất nhanh.
- **IPv6** xoá bỏ chuyện thiếu địa chỉ (subnet thường là /64), nhưng client chỉ có IPv6 cần NAT64/DNS64 để gọi service IPv4.

---

## 7. NAT: cách máy trong mạng private ra Internet

- **SNAT / PAT** (source NAT, port address translation): nhiều máy private dùng chung một IP public; thiết bị ghi đè IP nguồn *và* port nguồn, rồi lưu ánh xạ vào bảng **connection tracking** (conntrack). Router gia đình và AWS NAT Gateway làm đúng việc này.
- **DNAT** (destination NAT): traffic tới một IP:port public được ghi đè sang backend private (port forwarding).

```text
private subnet               NAT gateway 203.0.113.10            internet
10.0.1.25:43512 --\
                   >- SNAT -> 203.0.113.10:1025 ----------> 93.184.216.34:443
10.0.1.26:39001 --/          203.0.113.10:1026 ----------> 93.184.216.34:443

conntrack: 1025 <-> 10.0.1.25:43512   1026 <-> 10.0.1.26:39001
```

- NAT là **có trạng thái và chỉ khởi tạo từ trong ra**: Internet không thể mở kết nối vào trong. Đó là tác dụng phụ, không phải firewall — vẫn phải có security group.
- **Cạn port**: AWS NAT Gateway hỗ trợ tối đa **55.000 kết nối đồng thời tới mỗi đích duy nhất** (IP, port, protocol), vượt quá sẽ báo `ErrorPortAllocation`. Cách sửa: gắn thêm IP public phụ, tái sử dụng kết nối, hoặc dùng **VPC endpoint** cho S3/DynamoDB (còn tiết kiệm phí xử lý dữ liệu của NAT).
- **Idle timeout**: NAT Gateway cắt kết nối rảnh sau 350 giây; kết nối rảnh lâu cần TCP keepalive ngắn hơn mức đó.
- Đứng sau NAT hay proxy, server chỉ thấy IP đã dịch; IP thật của client phải được truyền qua `X-Forwarded-For` hoặc PROXY protocol.

---

## 8. Chuỗi phân giải DNS và TTL

Với kiến trúc sư, DNS là **một bộ nhớ đệm (cache) phân tán toàn cầu mà độ "cũ" được điều khiển bằng TTL**.

```text
app --> stub resolver (OS, /etc/resolv.conf)
          v
     recursive resolver (ISP, 8.8.8.8, VPC resolver at base+2)
          |  cache miss -> walk the tree:
          |--1--> root server        "ask the .com servers"
          |--2--> .com TLD server    "ask ns-123.awsdns-45.com"
          |--3--> authoritative NS   "api.example.com A 198.51.100.7 TTL 60"
          v
     answer cached for up to TTL at every layer
```

- **Recursive resolver** cache cả câu trả lời lẫn các bản ghi uỷ quyền NS, nên phần lớn truy vấn không bao giờ chạm tới root.
- **Câu trả lời phủ định** (NXDOMAIN) cũng được cache, trong khoảng thời gian lấy từ bản ghi SOA của zone.
- DNS dùng **UDP 53**, và **TCP 53** cho response lớn và zone transfer.
- **Không đặt CNAME ở zone apex** (`example.com` phải chứa SOA và NS). Dùng ALIAS/ANAME; trên AWS là alias record của Route 53.

```bash
dig +trace api.example.com                  # follow the delegation from the root
dig api.example.com A +noall +answer        # answer with remaining TTL
```

**Đánh đổi của TTL**: 30–60 giây cho failover nhanh nhưng nhiều truy vấn hơn; tính bằng giờ thì ít truy vấn nhưng thay đổi chậm. Kịch bản migration: **hạ TTL trước thời điểm chuyển ít nhất một khoảng bằng TTL cũ**, chuyển, kiểm tra, rồi nâng TTL lên lại. Các kiểu lỗi: runtime bỏ qua TTL (JVM cache vĩnh viễn khi có security manager; vài connection pool chỉ phân giải một lần lúc khởi động) và giới hạn của resolver — VPC resolver giới hạn số gói mỗi network interface, nên service "nói nhiều" nên cache DNS cục bộ.

---

## 9. TLS 1.3 handshake và chứng chỉ

TLS mang lại tính bí mật, toàn vẹn và xác thực server. Hãy thiết kế cho **TLS 1.3** (RFC 8446); 1.0/1.1 đã bị loại bỏ, 1.2 vẫn chấp nhận được với cipher hiện đại.

```text
Client                                          Server
  | --- ClientHello ------------------------------> |
  |     versions, ciphers, key_share, SNI, ALPN     |
  | <-- ServerHello (key_share) ------------------- |
  |     {EncryptedExtensions} {Certificate}         |
  |     {CertificateVerify} {Finished}              |
  | --- {Finished} {HTTP request} ----------------> |   1 RTT, then data
  {...} = encrypted with keys derived from ECDHE
```

- **1 RTT thay vì 2**: client gửi key share ngay trong thông điệp đầu tiên.
- **Forward secrecy là bắt buộc**: trao đổi khoá RSA tĩnh đã bị bỏ, nên khoá bị đánh cắp sau này cũng không giải mã được traffic đã ghi lại.
- Các cipher cũ bị loại bỏ và chứng chỉ được truyền ở dạng mã hoá.
- **0-RTT resumption** gửi dữ liệu ngay lượt đầu, nhưng dữ liệu đó **có thể bị phát lại** (replay) — chỉ cho phép với request idempotent.

Server gửi **chứng chỉ lá (leaf) kèm các chứng chỉ trung gian** (intermediate); client dựng chuỗi tin cậy lên tới một **root CA** trong trust store, rồi kiểm tra tên (SAN), thời hạn và chữ ký. Sự cố kinh điển là **thiếu intermediate**: trình duyệt vẫn chạy (vì đã cache intermediate) trong khi `curl`, Java hay app mobile báo lỗi. **SNI** trong ClientHello (dạng rõ) cho phép một IP phục vụ nhiều chứng chỉ; **ALPN** thương lượng `h2`.

Thời hạn chứng chỉ đang ngắn lại: CA/Browser Forum đã thông qua lộ trình giảm thời hạn chứng chỉ public từ 398 ngày xuống **47 ngày vào năm 2029**. Hãy tự động gia hạn bằng ACME (Let's Encrypt, cert-manager) hoặc AWS Certificate Manager. mTLS thuộc về bài bảo mật.

```bash
openssl s_client -connect api.example.com:443 -servername api.example.com -showcerts </dev/null
```

---

## 10. HTTP/1.1 vs HTTP/2 vs HTTP/3 (QUIC)

| | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| Transport | TCP | TCP (+TLS trên trình duyệt) | QUIC trên UDP 443 |
| Định dạng | Văn bản | Frame nhị phân | Frame nhị phân |
| Đồng thời | Mỗi kết nối một request một lúc; trình duyệt mở ~6 kết nối mỗi host | Nhiều stream ghép kênh trên một kết nối | Các stream độc lập trên một kết nối |
| Nén header | Không | HPACK | QPACK |
| Head-of-line blocking | Theo từng kết nối | **Vẫn còn ở tầng TCP** | Chỉ ảnh hưởng stream bị mất gói |
| Thiết lập nguội với TLS 1.3 | 2 RTT | 2 RTT | **1 RTT** (0-RTT khi resume) |
| Chuyển Wi-Fi → 4G | Kết nối chết | Kết nối chết | Sống sót (connection ID) |

- HTTP/2 được thương lượng qua ALPN. Server push đã bị các trình duyệt bỏ; hãy dùng `103 Early Hints` hoặc preload.
- Trên đường mobile hay mất gói, một gói mất làm đứng mọi stream HTTP/2; HTTP/3 chuyển stream vào QUIC để tránh điều đó.
- Trình duyệt biết server hỗ trợ HTTP/3 qua header `Alt-Svc` hoặc bản ghi DNS HTTPS, và lùi về TCP nếu UDP bị chặn.

Lựa chọn của kiến trúc sư: kết thúc HTTP/2 và HTTP/3 **ở biên** (edge — CDN, load balancer), nơi client ở xa và đường truyền kém. Bên trong VPC, HTTP/1.1 với keep-alive thường là đủ; dùng HTTP/2 xuyên suốt khi cần, ví dụ **gRPC bắt buộc HTTP/2**.

```bash
curl -so /dev/null -w 'dns=%{time_namelookup} tcp=%{time_connect} tls=%{time_appconnect} ttfb=%{time_starttransfer}\n' https://api.example.com/health
```

---

## 11. Cân bằng tải L4 vs L7

| | L4 | L7 |
|---|---|---|
| Nhìn thấy | IP, port, TCP/UDP | Method, host, path, header, cookie |
| TLS | Có thể pass-through | Phải kết thúc TLS để đọc request |
| Cân bằng | Theo kết nối | Theo request |
| IP client | Có thể giữ nguyên | Truyền qua `X-Forwarded-For` |
| Điểm mạnh | Throughput cực lớn, mọi giao thức, IP tĩnh | Rule định tuyến, sticky cookie, retry, WAF, xác thực |
| AWS | Network Load Balancer | Application Load Balancer |

```text
L4: client ==TCP==> [LB picks backend per connection] ==same stream==> backend
L7: client ==TLS/HTTP==> [LB terminates, parses, picks per request] ==new conn==> backend
```

- **Giao thức không phải HTTP, IP tĩnh cho đối tác whitelist, hoặc TLS mà LB không được giải mã** → L4.
- **Định tuyến theo host/path tới nhiều service, WAF, xác thực ở biên** → L7.
- **Cái bẫy gRPC**: gRPC ghép mọi lời gọi trên một kết nối HTTP/2 sống lâu, mà L4 thì chia *kết nối*, nên mỗi client dính chặt vào một backend. Hãy dùng L7 hiểu HTTP/2, cân bằng phía client, hoặc service mesh.
- Chỉ tin `X-Forwarded-For` từ chính proxy của bạn — client có thể giả mạo header này.
- Health check L4 chỉ chứng minh port nhận kết nối; health check L7 chứng minh `/health` trả về 200.

Thuật toán cân bằng tải và cấu hình proxy nằm ở bài nginx.

---

## 12. Những con số độ trễ kiến trúc sư phải thuộc

Ánh sáng trong cáp quang đi khoảng **200.000 km/s**: mỗi 1.000 km cộng thêm khoảng **5 ms một chiều, 10 ms khứ hồi**, chưa tính đường vòng và hàng đợi.

| Tuyến | RTT điển hình |
|---|---|
| Cùng AZ / data centre | ~0,1–0,5 ms |
| Giữa các AZ trong một region AWS | ~1–2 ms |
| Hà Nội ↔ TP. Hồ Chí Minh | ~20–30 ms |
| Việt Nam ↔ Singapore | ~30–50 ms |
| US East ↔ US West | ~60–80 ms |
| Việt Nam ↔ bờ Tây nước Mỹ | ~150–200 ms |

Một request HTTPS **nguội** (cold) qua đường truyền RTT 170 ms:

```text
TCP handshake              1 RTT = 170 ms
TLS 1.3 handshake          1 RTT = 170 ms
Request -> first byte      1 RTT = 170 ms + server time
---------------------------------------------------------
Cold, HTTP/1.1 or HTTP/2   ~510 ms + server time (+ DNS)
Cold, HTTP/3               ~340 ms + server time
Warm (reused connection)   ~170 ms + server time
```

- **Không thể tối ưu hoá tốc độ ánh sáng** — hãy đưa điểm cuối lại gần người dùng: CDN edge, triển khai theo region, kết thúc TLS ở biên với kết nối "ấm" về origin.
- **Tái sử dụng kết nối đáng giá hơn phần lớn tối ưu code** trên đường truyền RTT cao.
- **API "nói nhiều" nhân RTT lên**: 20 lời gọi tuần tự ở 50 ms là trọn một giây. Hãy gộp (batch), chạy song song, hoặc điều phối ở phía server.
- Gọi chéo AZ rẻ về độ trễ nhưng bị tính phí truyền dữ liệu; hạn chế gọi đồng bộ chéo region.

---

## Điểm cần nhớ khi phỏng vấn

- Gọi tên thành phần theo thứ nó nhìn thấy: IP/port = **L4**, host/path/header HTTP = **L7**.
- MTU 1.500 → MSS 1.460; chặn ICMP làm hỏng Path MTU Discovery ("handshake được, response lớn thì treo").
- TCP tốn **1 RTT**, TLS 1.3 tốn **1 RTT**; HTTP/3 trên QUIC gộp cả hai thành **1 RTT**.
- **TIME_WAIT** nằm ở bên đóng trước (60 giây trên Linux); hàng đống **CLOSE_WAIT** = ứng dụng không đóng socket. Sửa cạn port bằng tái sử dụng kết nối.
- UDP khi dữ liệu trễ là vô dụng hoặc tự xây độ tin cậy; cẩn thận DDoS khuếch đại.
- /n cho 2^(32−n) địa chỉ; AWS giữ **5 địa chỉ mỗi subnet**; không để CIDR chồng lấn nếu có thể phải peering.
- NAT Gateway: **55.000 kết nối mỗi đích duy nhất**, idle timeout 350 giây; dùng VPC endpoint.
- DNS: stub → recursive → root → TLD → authoritative, cache theo TTL; **hạ TTL trước khi migration**; dùng alias ở apex.
- TLS 1.3: 1 RTT, forward secrecy, 0-RTT có thể bị replay; coi chừng hết hạn và **thiếu intermediate**.
- HTTP/2 vẫn bị head-of-line blocking ở TCP; HTTP/3 loại bỏ nó và sống sót khi đổi mạng.
- gRPC sau load balancer L4 dính vào một backend — cân bằng ở L7 hoặc phía client.
- ~10 ms RTT mỗi 1.000 km: đưa điểm cuối lại gần và giảm số round trip.

## Tóm tắt

- Số tầng OSI là từ vựng; TCP/IP là thứ thực sự chạy. Tầng cao hơn = thông minh hơn và đắt hơn.
- TCP mua độ tin cậy bằng round trip và trạng thái; TIME_WAIT và CLOSE_WAIT giải thích rất nhiều sự cố.
- UDP đánh đổi sự đảm bảo lấy độ trễ thấp và là nền của QUIC.
- Quy hoạch CIDR tốt tránh chồng lấn và cạn IP; NAT có giới hạn port và idle timeout.
- DNS là cache được điều khiển bởi TTL; TLS 1.3 bảo mật kết nối trong một round trip với chứng chỉ ngắn hạn.
- HTTP/2 và HTTP/3 giảm chi phí kết nối và nên được kết thúc ở biên.
- Cân bằng tải L4 vs L7 là lựa chọn giữa tốc độ thô và hiểu biết về giao thức.
- Độ trễ = khoảng cách × số round trip: giảm cả hai.
