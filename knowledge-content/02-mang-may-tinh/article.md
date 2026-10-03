# Mạng máy tính

## 1. Mạng máy tính là gì?

**Ví dụ đời thường:** hãy tưởng tượng một nhóm hàng xóm thỏa thuận cho nhau mượn dụng cụ. Thay vì nhà nào cũng mua thang, máy khoan, máy cắt cỏ, họ chuyền tay nhau dùng. Để làm được vậy cần hai thứ: đường đi để đến nhà nhau và quy tắc chung (ai hỏi, ai trả lời, trả đồ thế nào).

Mạng máy tính hoạt động y như vậy. Mạng máy tính (computer network) là tập hợp nhiều thiết bị (máy tính, điện thoại, máy in...) được kết nối với nhau để **chia sẻ dữ liệu và tài nguyên**.

- **Dữ liệu** là thông tin: một bức ảnh, một email, một bảng tính, một luồng video.
- **Tài nguyên** là thứ mà một thiết bị có và thiết bị khác có thể dùng chung: máy in, ổ cứng lớn, đường truyền Internet.

Các thiết bị trong mạng thường được gọi là **host** hoặc **node** — chỉ là cách gọi "một thiết bị đang cắm vào mạng".

Mạng cho phép: gửi email, duyệt web, chia sẻ file, họp online, in qua mạng...

### Bạn đang dùng nhiều mạng mỗi ngày

- Ở nhà, laptop, điện thoại và TV thông minh đều kết nối vào cùng một cục WiFi.
- Ở công ty, máy tính của bạn nối vào mạng văn phòng, máy in chung và máy chủ chứa file của công ty.
- Khi bạn mở Facebook hay Google, mạng nhà bạn kết nối với một mạng lớn hơn rất nhiều — **Internet** — nơi liên kết hàng triệu mạng khác với nhau.

> **Hiểu lầm thường gặp:** "Internet" và "WiFi" không phải là một. WiFi chỉ là *cách kết nối không dây vào một mạng cục bộ* (thường là mạng trong nhà). Internet là mạng khổng lồ toàn cầu mà mạng cục bộ của bạn nối vào. Bạn có thể bắt WiFi rất mạnh mà vẫn "không có Internet" nếu đường truyền từ nhà bạn đến nhà mạng bị đứt.

---

## 2. Các loại mạng phổ biến

Mạng thường được phân loại theo **phạm vi khu vực mà nó bao phủ**. Hãy nghĩ đến đường sá: hành lang trong nhà, đường phố trong thành phố và đường cao tốc giữa các quốc gia đều là "đường", nhưng ở quy mô rất khác nhau.

### LAN – Mạng cục bộ (Local Area Network)
Kết nối các thiết bị trong **một khu vực nhỏ**: văn phòng, trường học, nhà ở.

- Tốc độ cao, độ trễ thấp.
- Ví dụ: mạng WiFi tại nhà bạn là một LAN.
- Thường một tổ chức sở hữu và quản lý toàn bộ LAN (bạn sở hữu router nhà mình; đội IT công ty quản lý mạng văn phòng).
- Một LAN có thể trải qua nhiều tầng của cùng một tòa nhà — "cục bộ" nói về phạm vi và quyền sở hữu, không phải chỉ một phòng.

### WAN – Mạng diện rộng (Wide Area Network)
Kết nối các mạng LAN qua khoảng cách **địa lý lớn**: thành phố, quốc gia, toàn cầu.

- **Internet** chính là WAN lớn nhất thế giới.
- WAN thường dùng đường truyền thuê từ các công ty viễn thông (cáp quang biển, cáp quang liên tỉnh, vệ tinh), nên chậm hơn và đắt hơn tính trên mỗi đơn vị dữ liệu so với LAN.
- Ví dụ: một ngân hàng nối LAN của trụ sở ở Hà Nội với các chi nhánh ở Đà Nẵng và TP.HCM qua một WAN riêng.

### MAN – Mạng đô thị (Metropolitan Area Network)
Phạm vi một thành phố. Ví dụ: mạng nội bộ của một trường đại học nhiều campus.

### So sánh nhanh

| Loại | Phạm vi | Chủ sở hữu thường gặp | Ví dụ |
|------|---------|----------------------|-------|
| LAN | Một phòng, nhà, tầng hoặc tòa nhà | Bạn / công ty bạn | WiFi gia đình, mạng văn phòng |
| MAN | Một thành phố hoặc đô thị | Thành phố, trường đại học hoặc nhà cung cấp | Các campus đại học trong một thành phố |
| WAN | Quốc gia, châu lục, toàn cầu | Công ty viễn thông, tổ chức lớn | Internet, mạng chi nhánh ngân hàng |

> Bạn cũng có thể nghe đến **PAN** (Personal Area Network – mạng cá nhân): một mạng rất nhỏ quanh một người, ví dụ điện thoại kết nối với tai nghe không dây qua Bluetooth.

---

## 3. Các thiết bị mạng quan trọng

**Ví dụ đời thường:** hãy tưởng tượng một chung cư có phòng thư. Trong tòa nhà, một nhân viên chuyển thư giữa các căn hộ (đó là **switch**). Phòng thư của tòa nhà gửi thư ra thành phố và nhận thư từ bên ngoài vào (đó là **router**). Người phiên dịch chuyển định dạng bưu chính của thành phố sang định dạng của tòa nhà là **modem**. Còn những chiếc loa liên lạc nội bộ ở mỗi hành lang giúp mọi người nói chuyện mà không cần đi lại chính là **access point**.

### Router (Bộ định tuyến)
Router kết nối mạng LAN của bạn với Internet (WAN). Nó **định tuyến** các gói dữ liệu đến đúng đích.

- Mỗi router có một địa chỉ IP công khai (public IP) từ nhà cung cấp dịch vụ (ISP).
- Router tại nhà thường kiêm luôn chức năng WiFi access point.
- "Định tuyến" nghĩa là chọn bước đi tiếp theo trên đường. Router đọc địa chỉ đích trên mỗi gói tin và quyết định gửi nó theo hướng nào, giống bưu điện quyết định lá thư lên xe tải nào.
- **ISP** (Internet Service Provider – nhà cung cấp dịch vụ Internet) là công ty bạn trả tiền để dùng Internet — ví dụ VNPT, Viettel hay FPT ở Việt Nam.

### Switch (Bộ chuyển mạch)
Switch kết nối nhiều thiết bị trong cùng một mạng LAN. Nó chuyển dữ liệu **trực tiếp** giữa hai thiết bị cần giao tiếp.

- Khác router: Switch làm việc trong nội bộ mạng, không kết nối ra Internet.
- Ở văn phòng, bạn sẽ thấy switch là những hộp kim loại có rất nhiều cổng mạng (thường 24 hoặc 48 cổng) đặt trong tủ máy chủ. Mọi dây mạng từ các bàn làm việc đều dẫn về đó.
- Switch tự học thiết bị nào nằm ở cổng nào, nên khi máy bạn in, dữ liệu chỉ đi tới cổng của máy in chứ không gửi cho tất cả mọi người.

### Access Point (Điểm truy cập WiFi)
Phát sóng WiFi để thiết bị kết nối không dây. Router gia đình thường tích hợp sẵn access point.

- Ở văn phòng lớn hay khách sạn, nhiều access point riêng được gắn trên trần để WiFi phủ tới mọi phòng. Tất cả đều được nối dây về switch.

### Modem
Thiết bị chuyển đổi tín hiệu từ ISP (cáp đồng, cáp quang...) thành tín hiệu số mà router hiểu được.

- Với Internet cáp quang, hộp này thường gọi là **ONT** hoặc "modem quang". Nhiều nhà mạng phát cho bạn một hộp gộp cả modem + router + access point, vì vậy ở nhà ít khi ta thấy chúng là các thiết bị riêng.

### Chúng ghép lại với nhau thế nào ở nhà

```text
 Internet (ISP)
      |
   [Modem]        chuyển đổi tín hiệu của nhà mạng
      |
   [Router]       nối LAN gia đình <-> Internet, cấp IP nội bộ
    /   |   \
 [Switch] [Access Point] ...
   |   |       )))  (((
  PC  Máy in   Điện thoại  Laptop
```

> **Ví dụ thực tế ở công ty:** một ticket ghi "Tầng 3 mất mạng, tầng 2 vẫn bình thường." Đội IT sẽ nghi ngờ switch của tầng 3 trước (một đoạn LAN bị hỏng), chứ không phải router — nếu router hỏng thì tầng nào cũng mất Internet.

---

## 4. Gói tin (Packet)

**Ví dụ đời thường:** giả sử bạn muốn gửi một cuốn sách 300 trang cho bạn bè, nhưng bưu điện chỉ nhận phong bì mỏng. Bạn xé cuốn sách thành 300 trang, cho mỗi trang vào một phong bì, ghi địa chỉ người gửi và người nhận lên từng phong bì, rồi đánh số "1/300", "2/300"... Các phong bì có thể đi trên những xe tải khác nhau và đến nơi lộn xộn thứ tự, nhưng người nhận vẫn ghép lại được cuốn sách nhờ số thứ tự.

Dữ liệu truyền qua mạng được chia nhỏ thành các **gói tin (packet)**. Mỗi gói tin chứa:

- Địa chỉ nguồn (source IP)
- Địa chỉ đích (destination IP)
- Một phần dữ liệu thực sự
- Thông tin kiểm tra lỗi

Phần địa chỉ và thông tin điều khiển gọi là **header** (chữ viết trên phong bì); phần dữ liệu thật gọi là **payload** (trang giấy bên trong). Một gói tin điển hình chứa khoảng 1.500 byte — nên chỉ một bức ảnh cũng thành hàng trăm, hàng nghìn gói tin.

Gói tin đi qua nhiều router khác nhau trước khi đến đích, rồi được **lắp ráp lại** theo thứ tự.

### Vì sao phải chia dữ liệu thành gói tin?

1. **Dùng chung đường truyền:** dữ liệu của nhiều người có thể lần lượt đi trên cùng một sợi cáp, từng gói một, thay vì một file lớn chặn đường tất cả.
2. **Sửa lỗi rẻ:** nếu một gói bị hỏng hoặc thất lạc, chỉ cần gửi lại gói đó, không phải gửi lại cả file.
3. **Đường đi linh hoạt:** nếu một tuyến bị nghẽn hoặc đứt, router có thể gửi các gói sau theo tuyến khác.

**Mất gói (packet loss)** nghĩa là có gói tin không bao giờ đến nơi. Khi tải file, máy chỉ cần xin gửi lại (chậm hơn một chút), nhưng trong cuộc gọi video trực tiếp thì không kịp gửi lại, nên bạn thấy hình bị đứng hoặc giọng nói bị rè, méo.

> **Tự thử:** mở cửa sổ dòng lệnh (Windows: bấm Start, gõ `cmd`, nhấn Enter; macOS: mở ứng dụng **Terminal**) và chạy `ping google.com`. Trên Windows lệnh gửi 4 gói thử nhỏ rồi dừng; trên macOS nó chạy liên tục cho đến khi bạn bấm Ctrl+C. Mỗi dòng hiển thị một phản hồi và giá trị `time=`, ví dụ `time=23ms`. Cuối cùng bạn thấy số gói đã gửi, đã nhận và bị **mất** — "0% packet loss" là kết quả bạn mong muốn.

---

## 5. Băng thông và tốc độ mạng

**Ví dụ đời thường:** hãy nghĩ đến một ống nước. **Băng thông** là ống *rộng* đến đâu — bao nhiêu nước chảy qua mỗi giây. **Độ trễ** là ống *dài* đến đâu — một giọt nước mất bao lâu để đi từ đầu này sang đầu kia. Ống rộng nhưng rất dài thì vẫn chuyển được nhiều nước, nhưng giọt đầu tiên phải chờ một lúc mới tới.

**Băng thông (Bandwidth)**: lượng dữ liệu tối đa có thể truyền trong 1 giây.
- Đơn vị: **Mbps** (Megabit per second), **Gbps** (Gigabit per second).
- 100 Mbps = 100 triệu bit/giây ≈ 12.5 MB/s tốc độ tải thực tế.

### Bit và byte — lời giải cho câu hỏi "sao tải chậm hơn quảng cáo?"

- **Bit** là đơn vị dữ liệu nhỏ nhất (một số 0 hoặc 1). Tốc độ mạng đo bằng bit: chữ **b** thường, như trong Mb**ps**.
- **Byte** bằng 8 bit. Dung lượng file đo bằng byte: chữ **B** hoa, như trong MB.
- Vì vậy hãy chia cho 8: gói cước 100 Mbps tải tối đa khoảng 12,5 MB mỗi giây. Thực tế thấp hơn một chút, vì header của gói tin và chi phí của WiFi chiếm một phần dung lượng.
- "1 Gbps" = 1.000 Mbps.

**Độ trễ (Latency/Ping)**: thời gian để một gói tin đi từ A đến B và quay lại.
- Đơn vị: millisecond (ms). Ping thấp = mạng phản hồi nhanh.
- Tham khảo: dưới 30 ms gần như tức thì; 50–100 ms ổn cho hầu hết việc; trên khoảng 150 ms thì gọi video và chơi game online bắt đầu thấy giật, trễ.

**Lưu ý**: Băng thông cao không đồng nghĩa với ping thấp. Một đường truyền vệ tinh có thể có băng thông cao nhưng ping rất cao (>500ms).

### Việc nào cần cái gì?

| Hoạt động | Cần băng thông cao? | Cần độ trễ thấp? |
|-----------|---------------------|------------------|
| Tải file lớn / cập nhật phần mềm | Có | Không quan trọng lắm |
| Xem phim 4K | Có | Không quan trọng lắm (video tải trước vào bộ đệm) |
| Gọi video (Zoom, Teams) | Vừa phải | Có |
| Chơi game online, giao dịch tài chính | Thấp | Có, rất cần |
| Gửi email | Thấp | Không |

Cũng lưu ý băng thông là **dùng chung**: nếu năm người trong nhà cùng xem video một lúc, mỗi người chỉ được một phần của "ống nước".

> **Tự thử:** vào một trang đo tốc độ như `speedtest.net` hoặc `fast.com` trên trình duyệt. Bạn sẽ thấy tốc độ **download** (Mbps), tốc độ **upload** (Mbps) và **ping/latency** (ms). Hãy đo một lần cạnh router và một lần ở phòng xa nhất để thấy khoảng cách WiFi ảnh hưởng thế nào.

> **Ví dụ thực tế ở công ty:** người dùng báo "Zoom bị giật nhưng speed test báo 200 Mbps." Tốc độ không có vấn đề; nguyên nhân nhiều khả năng là độ trễ cao hoặc mất gói (WiFi đông người, access point ở xa), chứ không phải thiếu băng thông.

---

## 6. Dây mạng và WiFi

**Ví dụ đời thường:** kết nối có dây giống một hành lang riêng giữa hai phòng; WiFi giống như nói chuyện qua một sảnh đông người. Ở sảnh bạn đi lại tự do, nhưng tường, khoảng cách và những người khác đang nói (các mạng WiFi khác, lò vi sóng, thiết bị Bluetooth) khiến khó nghe hơn, và ai ở gần cũng có thể cố nghe lén.

- **Ethernet** là chuẩn của mạng có dây; dây mạng có đầu cắm trông giống đầu dây điện thoại nhưng rộng hơn một chút (gọi là **RJ45**).
- **WiFi** truyền dữ liệu bằng sóng radio. Chất lượng giảm khi xa, qua tường dày và khi nhiều thiết bị dùng chung một kênh.

| | Dây mạng (Ethernet) | WiFi |
|--|---------------------|------|
| Tốc độ | Cao, ổn định | Thấp hơn, dao động |
| Độ trễ | Rất thấp | Cao hơn |
| Tiện lợi | Cần dây | Không dây |
| Bảo mật | Cao hơn | Dễ bị nghe lén hơn |

Bảo mật WiFi đến từ mật khẩu và mã hóa (hãy tìm **WPA2** hoặc **WPA3** trong phần cài đặt router). Với WiFi công cộng ở quán cà phê, mọi người trong vùng phủ sóng dùng chung "không khí", nên tránh đăng nhập vào hệ thống nhạy cảm nếu không có VPN hoặc HTTPS.

**Quy tắc chung:** cắm dây cho thiết bị cố định và cần ổn định (máy bàn, máy chủ, hệ thống họp trực tuyến trong phòng họp); dùng WiFi cho mọi thiết bị di chuyển.

---

## 7. Địa chỉ IP trong mạng

**Ví dụ đời thường:** trong một chung cư, mỗi căn hộ có một số phòng (101, 102...) chỉ có ý nghĩa *bên trong* tòa nhà. Bản thân tòa nhà có một địa chỉ đường phố mà thế giới bên ngoài dùng. Thư từ bên ngoài gửi tới địa chỉ đường phố, rồi lễ tân chuyển tới đúng căn hộ.

Mỗi thiết bị trong mạng có một **địa chỉ IP** (Internet Protocol address) để nhận dạng.

Một địa chỉ IP (phiên bản phổ biến, **IPv4**) được viết thành bốn số từ 0 đến 255 cách nhau bởi dấu chấm, ví dụ `192.168.1.25`. Router nhà bạn thường tự động cấp các địa chỉ này khi một thiết bị kết nối — dịch vụ đó gọi là **DHCP** — nên bạn không bao giờ phải tự gõ.

- **IP nội bộ (Private IP)**: dùng trong mạng LAN. Ví dụ: 192.168.1.x
- **IP công khai (Public IP)**: địa chỉ mạng của bạn trên Internet, do ISP cấp.

Các dải IP nội bộ được dành riêng và dùng lại ở hàng triệu gia đình — `192.168.1.10` của bạn và `192.168.1.10` của nhà hàng xóm không bao giờ xung đột, vì chúng ở hai "tòa nhà" khác nhau. Các dải nội bộ thường gặp bắt đầu bằng `10.`, `172.16.`–`172.31.` và `192.168.`.

Khi bạn truy cập google.com, gói tin đi từ IP nội bộ → router → IP công khai → Internet → Google.

Router làm đúng việc của "lễ tân": khi gói tin đi ra, nó thay địa chỉ nội bộ của bạn bằng địa chỉ công khai dùng chung, và ghi nhớ thiết bị nào đã hỏi để chuyển phản hồi về đúng chỗ. Kỹ thuật này gọi là **NAT** (Network Address Translation – chuyển đổi địa chỉ mạng). Đó là lý do mọi thiết bị trong nhà bạn đều hiện ra với thế giới bên ngoài bằng **một** IP công khai.

> **Tự thử:** tìm IP nội bộ của bạn. Windows: trong `cmd` chạy `ipconfig` và tìm dòng **IPv4 Address** (ví dụ `192.168.1.25`) và **Default Gateway** (chính là router, thường là `192.168.1.1`). macOS: trong Terminal chạy `ipconfig getifaddr en0` (Wi-Fi trên hầu hết máy Mac), hoặc mở System Settings → Wi-Fi → Details. Sau đó tìm "what is my IP" trên trình duyệt: địa chỉ hiện ra là IP **công khai** của bạn, và nó sẽ khác.

> **Hiểu lầm thường gặp:** "Địa chỉ IP xác định máy tính của tôi với cả thế giới." Không hẳn — các website thấy IP công khai của router, dùng chung cho mọi người trong nhà hoặc văn phòng. IP nội bộ chỉ có ý nghĩa bên trong LAN của bạn.

---

## 8. Ghép lại toàn bộ: điều gì xảy ra khi bạn mở một trang web

Hãy theo dõi từng bước điều gì xảy ra khi bạn gõ `google.com` vào trình duyệt trên laptop ở nhà và nhấn Enter:

1. **Laptop tham gia LAN.** Nó kết nối qua WiFi với access point trong router nhà bạn, và trước đó đã nhận một IP nội bộ như `192.168.1.25` qua DHCP.
2. **Trình duyệt chuẩn bị yêu cầu** và hệ điều hành chia nó thành các gói tin. Mỗi gói có header ghi nguồn (IP nội bộ của bạn) và đích (địa chỉ máy chủ của Google).
3. **Các gói tin đi tới router** ("default gateway"), vì đích không nằm trong LAN của bạn.
4. **Router thực hiện NAT:** thay IP nội bộ của bạn bằng IP công khai của gia đình và ghi nhớ thiết bị nào đã hỏi.
5. **Modem** chuyển đổi tín hiệu cho đường cáp quang hoặc cáp đồng của nhà mạng.
6. **Đi qua WAN:** các gói tin nhảy qua nhiều router của ISP và trên Internet. Mỗi router đọc địa chỉ đích và chuyển gói tin tiến thêm một bước. Các gói có thể đi những đường khác nhau.
7. **Máy chủ của Google** nhận các gói tin, ghép chúng lại và gửi trả trang web — cũng được chia thành các gói tin.
8. **Trên đường về,** router nhà bạn nhận phản hồi ở IP công khai, tra bảng NAT và chuyển nó tới `192.168.1.25`. Laptop ghép các gói tin lại và trình duyệt hiển thị trang.

```text
Laptop (192.168.1.25) --WiFi--> Router/NAT --> Modem --> ISP --> Các router Internet --> Google
       ^                                                                                    |
       +------------------------------- gói tin phản hồi -----------------------------------+
```

Tất cả thường diễn ra chưa tới một giây. Khi có gì đó chậm hoặc hỏng, người làm IT kiểm tra lần lượt chính những mắt xích này: thiết bị đã vào WiFi chưa? Có tới được router không? Router có ra được Internet không? Máy chủ bên kia có trả lời không?

> **Tự thử:** để xem các router mà gói tin của bạn đi qua, chạy `tracert google.com` trên Windows hoặc `traceroute google.com` trên macOS. Mỗi dòng đánh số là một "chặng" (hop) qua một router, kèm thời gian phản hồi. Chặng đầu tiên thường là router nhà bạn (ví dụ `192.168.1.1`). Một số chặng có thể hiện `* * *` — nghĩa là router đó chọn không trả lời, điều này bình thường.

---

## 9. Tóm tắt

- **LAN**: mạng nội bộ nhỏ (nhà, văn phòng).
- **WAN/Internet**: mạng toàn cầu.
- **Router**: kết nối LAN với Internet.
- **Switch**: kết nối thiết bị trong LAN.
- **Packet**: đơn vị dữ liệu truyền qua mạng.
- **Bandwidth**: tốc độ tối đa, đo bằng Mbps/Gbps.
- **Latency/ping**: thời gian một vòng đi–về, tính bằng ms — băng thông cao không đảm bảo ping thấp.
- **IP nội bộ và IP công khai**: IP nội bộ dùng trong LAN; router dùng NAT để chia sẻ một IP công khai ra Internet.
- **Dây mạng và WiFi**: dây nhanh hơn, ổn định và an toàn hơn; WiFi tiện hơn.

### Thuật ngữ chính

| Thuật ngữ | Nghĩa dễ hiểu |
|-----------|---------------|
| Mạng (network) | Các thiết bị kết nối để chia sẻ dữ liệu và tài nguyên |
| LAN / MAN / WAN | Mạng của một tòa nhà / một thành phố / các quốc gia và toàn cầu |
| ISP | Công ty bán dịch vụ Internet cho bạn |
| Router | "Phòng thư" nối mạng của bạn với mạng khác và chọn đường đi |
| Switch | Kết nối thiết bị trong một LAN và chuyển dữ liệu tới đúng thiết bị |
| Access point | Phát WiFi để thiết bị kết nối không dây |
| Modem | Chuyển tín hiệu đường truyền của nhà mạng thành dữ liệu số cho router |
| Packet (gói tin) | Một "phong bì" dữ liệu nhỏ có đánh số và ghi địa chỉ |
| Bandwidth (băng thông) | Lượng dữ liệu có thể truyền mỗi giây (Mbps/Gbps) |
| Latency / ping (độ trễ) | Thời gian một vòng đi–về, tính bằng mili giây |
| Địa chỉ IP | Địa chỉ của một thiết bị trong mạng |
| NAT | Kỹ thuật của router cho phép nhiều IP nội bộ dùng chung một IP công khai |
| DHCP | Dịch vụ tự động cấp địa chỉ IP |
