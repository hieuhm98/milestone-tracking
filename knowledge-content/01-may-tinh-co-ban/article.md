# Máy tính là gì?

## 1. Tổng quan

Máy tính (computer) là thiết bị điện tử có khả năng nhận dữ liệu đầu vào, xử lý dữ liệu theo các lệnh đã được lập trình, và xuất kết quả đầu ra. Máy tính hoạt động dựa trên hai thành phần cốt lõi: **phần cứng** (hardware) và **phần mềm** (software).

Định nghĩa này nghe hơi trừu tượng, nên hãy hình dung một **bếp nhà hàng**:

- Phục vụ mang phiếu gọi món vào bếp (**đầu vào – input**).
- Đầu bếp làm theo công thức để nấu món (**xử lý theo lệnh**).
- Món ăn hoàn thành được mang ra cho khách (**đầu ra – output**).
- Nguyên liệu chưa dùng đến nằm chờ trong tủ lạnh và kho (**lưu trữ – storage**).

Máy tính làm đúng như vậy, chỉ khác là với dữ liệu thay vì đồ ăn, và hàng tỷ lần mỗi giây. Laptop, điện thoại, **server** (máy tính trong trung tâm dữ liệu chạy website cho hàng triệu người) và những máy tính nhỏ ẩn bên trong smart TV, ô tô hay cây ATM (**hệ thống nhúng – embedded system**) đều theo mô hình này.

Trong căn bếp, **phần cứng** là bếp lò, dao thớt và tủ lạnh; **phần mềm** là công thức nấu ăn và tay nghề của đầu bếp. Thiếu một trong hai thì vô dụng: bếp không có công thức thì chẳng nấu ra món gì, còn công thức không có bếp thì chỉ là tờ giấy.

---

## 2. Phần cứng (Hardware)

Phần cứng là toàn bộ các linh kiện vật lý có thể nhìn thấy và chạm vào được.

```text
 Bo mạch chủ (motherboard – nối mọi thứ với nhau)
   [ CPU ] ◄──► [ RAM ] ◄──► [ Ổ lưu trữ: SSD/HDD ]
      │
   [ GPU ] ──► màn hình     bàn phím · chuột ──► CPU
```

### CPU – Bộ xử lý trung tâm

**Ví von:** CPU là **bếp trưởng**. Nó đọc từng bước trong công thức và thực hiện, rất nhanh, bước này nối tiếp bước kia.

CPU (Central Processing Unit) là "bộ não" của máy tính. Nó thực thi các lệnh của chương trình, thực hiện phép tính toán và điều phối hoạt động của các thành phần khác.

- Tốc độ CPU đo bằng **GHz** (gigahertz) — số tỷ chu kỳ xử lý mỗi giây. CPU 3 GHz "nhịp" khoảng 3 tỷ lần mỗi giây.
- CPU hiện đại có nhiều **nhân (core)**: quad-core (4 nhân), octa-core (8 nhân)... Mỗi **nhân** giống như thêm một đầu bếp: càng nhiều nhân, máy càng làm được nhiều việc **song song** (nghe nhạc, gọi video và quét virus cùng lúc).
- Ví dụ: Intel Core i7, AMD Ryzen 5. Máy Mac dùng chip do Apple tự làm (M1, M2, M3…).

> **Hiểu lầm thường gặp:** "GHz càng cao thì máy càng nhanh." Một CPU đời mới 3 GHz có thể nhanh hơn CPU đời cũ 4 GHz vì mỗi nhịp làm được nhiều việc hơn và có nhiều nhân hơn.

### RAM – Bộ nhớ tạm thời

**Ví von:** RAM là **mặt bàn bếp**. Đầu bếp để nguyên liệu của những món *đang nấu* ngay trên bàn vì lấy ở đó là tức thì. Bàn càng rộng, càng nấu được nhiều món cùng lúc.

RAM (Random Access Memory) là bộ nhớ **tạm thời**, lưu trữ dữ liệu và chương trình đang chạy. Khi tắt máy, mọi dữ liệu trong RAM bị xóa. Đó là lý do khi mất điện, phần việc chưa lưu sẽ mất: nó chỉ tồn tại trong RAM. Thuật ngữ cho tính chất "cần điện mới giữ được dữ liệu" là **volatile** (khả biến).

- Đơn vị: GB (gigabyte). Máy tính phổ thông thường có 8–32 GB RAM.
- RAM càng lớn → máy chạy được nhiều ứng dụng cùng lúc mà không chậm.
- Ví dụ: Mở Chrome với 20 tab = tốn khoảng 2–4 GB RAM.

Khi bàn bếp đầy, máy phải liên tục cất bớt đồ vào kho (ổ cứng) rồi lấy ra lại. Việc chuyển qua chuyển lại này rất chậm — nguyên nhân phổ biến nhất khiến máy bị giật khi bạn mở thêm một tab.

### Ổ cứng (Storage)

**Ví von:** ổ cứng là **tủ lạnh và kho**. Nó chứa mọi thứ của căn bếp — kể cả ban đêm khi đã tắt đèn — nhưng lấy đồ từ đó chậm hơn lấy trên bàn.

Ổ cứng lưu trữ dữ liệu **vĩnh viễn** (kể cả khi tắt máy). Ảnh, tài liệu, ứng dụng đã cài và chính hệ điều hành đều nằm ở đây. Thuật ngữ là **non-volatile** (bất biến).

| Loại | Tốc độ | Bền | Giá |
|------|--------|-----|-----|
| HDD (đĩa cứng cơ) | Chậm | Dễ hỏng | Rẻ |
| SSD (ổ thể rắn) | Nhanh | Bền hơn | Đắt hơn |

- **HDD** (Hard Disk Drive) lưu dữ liệu trên các đĩa quay, đọc bằng một cần di chuyển, giống máy hát đĩa than — chậm hơn và dễ hỏng nếu bị rơi.
- **SSD** (Solid-State Drive) dùng chip nhớ, không có bộ phận chuyển động — nhanh hơn nhiều lần, nên laptop khởi động chỉ vài giây.
- Đơn vị: GB, TB (terabyte). Trên vỏ hộp, nhà sản xuất tính 1 TB = 1.000 GB; còn máy tính đếm theo bậc 1.024 (xem Mục 5 để biết vì sao ổ "1 TB" hiển thị ít hơn).

> **Hiểu lầm thường gặp:** "Laptop của tôi có 512 GB bộ nhớ." 512 GB đó thường là **ổ cứng** (SSD), không phải bộ nhớ RAM. "16 GB RAM, 512 GB SSD" nghĩa là 16 GB mặt bàn, 512 GB kho.

### Mainboard (Bo mạch chủ)

Là bảng mạch kết nối tất cả linh kiện lại với nhau: CPU, RAM, ổ cứng, card đồ họa... Giống **sàn và hành lang của căn bếp**, nó dẫn tín hiệu và điện giữa các bộ phận để chúng "nói chuyện" được với nhau.

### Card đồ họa (GPU)

Xử lý hình ảnh và video. **GPU** (Graphics Processing Unit) là "chuyên gia" làm hàng nghìn việc nhỏ giống nhau cùng lúc — đúng thứ cần để vẽ hàng triệu điểm ảnh.

GPU tích hợp sẵn trong CPU (Intel HD Graphics); GPU rời (NVIDIA, AMD) dành cho đồ họa nặng, gaming, AI. GPU tích hợp là đủ cho công việc văn phòng và xem YouTube.

### Các thiết bị ngoại vi

- **Đầu vào** (thông tin đi *vào* máy): bàn phím, chuột, webcam, microphone.
- **Đầu ra** (thông tin đi *ra*): màn hình, loa, máy in.
- Màn hình cảm ứng làm cả hai: vừa hiển thị hình ảnh vừa nhận biết ngón tay bạn.

> **Tự thử:** xem phần cứng máy của bạn.
> - **Windows:** nhấn `Ctrl + Shift + Esc` để mở **Task Manager** → tab **Performance**. Bạn sẽ thấy CPU (tốc độ và số nhân), Memory (RAM tính bằng GB), Disk (SSD hay HDD) và GPU.
> - **macOS:** menu Apple → **About This Mac** hiển thị chip (vd. "Apple M2") và Memory (vd. "16 GB"). Dung lượng ổ cứng nằm ở **System Settings → General → Storage**.

---

## 3. Phần mềm (Software)

Phần mềm là tập hợp các chương trình (code) điều khiển phần cứng và thực hiện các tác vụ.

Một **chương trình** là danh sách dài các lệnh chính xác do lập trình viên viết — chính là công thức nấu ăn. Các lệnh được viết bằng ngôn ngữ lập trình rồi chuyển thành các số 0 và 1 mà CPU hiểu được. Phần mềm vô hình: bạn không chạm được vào Chrome, nhưng thấy được nó làm gì.

Phần mềm được xếp thành các tầng, như một tòa nhà:

```text
 ┌──────────────────────────────────────────────────┐
 │  Phần mềm ứng dụng      (Word, Chrome, Zalo)     │  ← thứ bạn dùng
 ├──────────────────────────────────────────────────┤
 │  Hệ điều hành           (Windows, macOS)         │  ← người quản lý
 │  + phần mềm hệ thống    (driver, tiện ích)       │
 ├──────────────────────────────────────────────────┤
 │  Phần cứng              (CPU, RAM, ổ lưu trữ)    │  ← cỗ máy vật lý
 └──────────────────────────────────────────────────┘
```

### Hệ điều hành (Operating System – OS)

Là phần mềm nền tảng, quản lý toàn bộ tài nguyên máy tính và cung cấp môi trường để chạy các phần mềm khác.

**Ví von:** hệ điều hành là **quản lý nhà hàng**. Các đầu bếp (ứng dụng) không tranh nhau bếp lò; người quản lý quyết định ai dùng bếp nào, mỗi người được bao nhiêu chỗ trên bàn, và không cho người lạ vào bếp. Về mặt máy tính, OS chia thời gian CPU và RAM cho các ứng dụng, sắp xếp file vào thư mục, giao tiếp với thiết bị, quản lý tài khoản người dùng và mật khẩu.

- **Windows** (Microsoft) – phổ biến nhất cho PC.
- **macOS** (Apple) – dùng trên máy Mac.
- **Linux** – mã nguồn mở, phổ biến trên server. "Mã nguồn mở" nghĩa là code được công khai, ai cũng được dùng và sửa miễn phí; phần lớn website và hệ thống đám mây bạn dùng đều chạy Linux.
- **Android/iOS** – hệ điều hành di động. Android (Google) chạy trên phần lớn điện thoại thế giới; iOS (Apple) chạy trên iPhone.

OS là phần mềm đầu tiên được nạp khi bạn bấm nút nguồn, và nhờ nó mà cùng một ứng dụng chạy được trên hàng nghìn mẫu máy khác nhau: ứng dụng nói chuyện với OS, còn OS lo phần cứng cụ thể.

### Phần mềm ứng dụng

Các chương trình phục vụ nhu cầu cụ thể: Microsoft Word, Chrome, Photoshop, Spotify... Thường gọi tắt là **app**. Bạn cài chúng lên trên OS, và mỗi app được làm cho một OS nhất định — đó là lý do file cài `.exe` của Windows không chạy được trên Mac.

### Phần mềm hệ thống

Các chương trình hỗ trợ hệ điều hành vận hành: driver thiết bị, tiện ích hệ thống...

- **Driver** là chương trình "phiên dịch" nhỏ giúp OS giao tiếp với một phần cứng cụ thể. Khi bạn cắm máy in mới và Windows báo "Setting up device", nó đang cài driver cho máy in. Driver card đồ họa sai hoặc cũ là nguyên nhân kinh điển gây nháy màn hình.
- **Tiện ích (utility)** là công cụ bảo trì: diệt virus, dọn ổ đĩa, sao lưu, công cụ cập nhật hệ thống.

> **Hiểu lầm thường gặp:** "Ứng dụng tôi dùng hằng ngày cho công việc chắc là phần mềm hệ thống." Không — phần mềm kế toán của công ty, CRM hay ứng dụng chat đều là **phần mềm ứng dụng**, dù quan trọng đến đâu. Phần mềm hệ thống là tầng hậu trường giữ cho OS và phần cứng hoạt động.

---

## 4. Cách máy tính hoạt động

Mọi máy tính, từ điện thoại đến server khổng lồ, đều theo cùng một vòng lặp cơ bản:

```text
Input → CPU xử lý (dùng RAM làm bộ nhớ tạm) → Output
                 ↑↓
           Ổ cứng (lưu trữ lâu dài)
```

1. Bạn nhấn phím → bàn phím gửi tín hiệu đến CPU.
2. CPU tra lệnh trong RAM (chương trình đang chạy).
3. CPU xử lý và gửi kết quả ra màn hình.
4. Nếu cần lưu → ghi xuống ổ cứng.

### Từng bước: chuyện gì xảy ra khi bạn mở và sửa một tài liệu

Hãy theo dõi một ví dụ thật — mở file Word tên `report.docx`, gõ một câu, rồi lưu.

1. **Bạn nhấp đúp vào file.** Cú nhấp chuột là đầu vào. OS nhận cú nhấp và biết rằng file `.docx` được mở bằng Word.
2. **Nạp từ ổ cứng lên RAM.** Bản thân Word (chương trình) và `report.docx` (dữ liệu của bạn) đều đang nằm trong ổ cứng. OS chép chúng lên RAM, vì CPU chỉ làm việc nhanh với những gì có trên bàn bếp. Đó là lý do chương trình lớn mất vài giây để mở — đó là thời gian sao chép.
3. **CPU chạy các lệnh của Word.** Nó đọc lần lượt các lệnh của Word từ RAM và vẽ cửa sổ tài liệu. GPU giúp biến kết quả thành điểm ảnh trên màn hình (đầu ra).
4. **Bạn gõ một câu.** Mỗi lần nhấn phím là đầu vào; CPU làm theo lệnh của Word để thêm chữ vào bản tài liệu **trong RAM** và vẽ lại màn hình.
5. **Bạn nhấn Ctrl + S (Cmd + S trên Mac).** Lúc này tài liệu đã sửa mới được ghi từ RAM xuống **ổ cứng**. Thay đổi giờ mới là vĩnh viễn.
6. **Bạn đóng Word.** OS thu hồi phần RAM Word đã dùng để ứng dụng khác dùng.

Nếu mất điện giữa bước 4 và bước 5, câu bạn vừa gõ sẽ mất: nó chỉ nằm trong RAM. Đó chính là lý do có tính năng "AutoSave" — nó âm thầm lặp lại bước 5 vài phút một lần.

### Vì sao tốc độ phụ thuộc vào tất cả các bộ phận

Máy tính chỉ nhanh bằng mắt xích chậm nhất cho công việc bạn đang làm:

| Triệu chứng | "Nút thắt" khả năng cao nhất |
|---|---|
| Chậm khi mở nhiều ứng dụng/tab | Thiếu **RAM** |
| Khởi động hoặc mở file rất lâu | **Ổ cứng** chậm (HDD cũ) |
| Tính toán nặng (xuất video, Excel lớn) chậm | **CPU** |
| Game hoặc đồ họa 3D bị giật | **GPU** |

> **Ví dụ thực tế:** một tester báo lỗi "Ứng dụng bị đơ khi mở trang sản phẩm thứ 50." Developer mở Task Manager và thấy Memory ở mức 98%. Ticket được cập nhật: *"Bộ nhớ tăng dần sau mỗi trang và không được giải phóng — nghi ngờ memory leak (rò rỉ bộ nhớ)."* Hiểu bốn bộ phận giúp bạn mô tả vấn đề chính xác thay vì chỉ nói "máy chậm".

---

## 5. Đơn vị dữ liệu

Mọi thứ trong máy tính — chữ, ảnh, nhạc, video — đều được lưu thành chuỗi dài các số **0 và 1**. Vì sao? Vì phần cứng phân biệt hai trạng thái rất đáng tin cậy: có điện hay không, một công tắc nhỏ đóng hay mở. Mỗi số 0-hoặc-1 như vậy là một **bit** (viết tắt của *binary digit* – chữ số nhị phân).

**Ví von:** một bit là một công tắc đèn. Tám công tắc xếp hàng cho ra 256 kiểu bật/tắt khác nhau (2 × 2 × 2 × 2 × 2 × 2 × 2 × 2 = 256) — đủ để mỗi chữ cái, chữ số và dấu câu có một kiểu riêng. Nhóm 8 bit là một **byte**, và khoảng một byte lưu được một ký tự tiếng Anh.

| Đơn vị | Ký hiệu | Quy đổi |
|--------|---------|---------|
| Bit | b | Đơn vị nhỏ nhất (0 hoặc 1) |
| Byte | B | 8 bit |
| Kilobyte | KB | 1,024 Byte |
| Megabyte | MB | 1,024 KB |
| Gigabyte | GB | 1,024 MB |
| Terabyte | TB | 1,024 GB |

### Mỗi đơn vị lớn cỡ nào trong đời thực?

| Dung lượng | Chứa được khoảng |
|---|---|
| 1 KB | Một email chữ ngắn |
| 1 MB | Một ảnh từ điện thoại đời cũ, hoặc một cuốn sách chữ 500 trang |
| 5 MB | Một bài hát MP3 thông thường hoặc một ảnh điện thoại đời mới |
| 1 GB | Khoảng một giờ video chất lượng thường (SD) |
| 1 TB | Khoảng 200.000 ảnh điện thoại |

### Quy đổi giữa các đơn vị

Đi **lên** một bậc thì chia cho 1.024; đi **xuống** thì nhân với 1.024. Để tính nhẩm nhanh, dùng 1.000 là đủ gần.

- Ảnh 5 MB = 5 × 1.024 = **5.120 KB**.
- Yêu cầu nói file xuất không được vượt 500 MB và mỗi bản ghi khoảng 1 KB → khoảng 500 × 1.000 = **khoảng 500 nghìn bản ghi**.

### 1.000 hay 1.024? Vì sao ổ cứng mới trông nhỏ hơn

Máy tính đếm theo lũy thừa của 2, nên 1 KB = 1.024 byte (2¹⁰). Còn nhà sản xuất ổ cứng dùng nghĩa hệ mét thông thường: 1 KB = 1.000 byte, 1 TB = 1.000.000.000.000 byte. Windows lấy con số đó chia cho 1.024 ba lần và hiển thị khoảng **931 GB**. Không mất gì cả — vẫn là cùng một lượng, chỉ đếm theo hai cách. (macOS hiển thị theo đơn vị 1.000, nên máy Mac sẽ hiện gần đủ 1 TB.)

### Bit và byte: cái bẫy tốc độ Internet

Tốc độ Internet được tính bằng **bit** mỗi giây (chữ **b** thường: Mbps), còn dung lượng file tính bằng **byte** (chữ **B** hoa: MB). Vì 1 byte = 8 bit, hãy chia cho 8:

- Đường truyền "100 Mbps" tải tối đa khoảng 100 ÷ 8 = **12,5 MB mỗi giây**.
- Vậy file 1 GB mất ít nhất khoảng 80 giây — không phải 10 giây.

> **Tự thử:** nhấp chuột phải vào một file bất kỳ và chọn **Properties** (Windows), hoặc chọn file rồi nhấn `Cmd + I` (macOS). Bạn sẽ thấy dung lượng, ví dụ "2.4 MB (2,516,582 bytes)". Lấy số byte chia cho 1.024 hai lần và kiểm tra xem có ra đúng số MB không.

---

## 6. Đọc bảng cấu hình máy tính

Giờ bạn đã đọc được "bảng cấu hình" (spec sheet – danh sách thông số) mà mọi cửa hàng laptop và mọi ticket IT đều dùng. Một bảng điển hình trông như sau:

```text
Laptop XYZ 14"
CPU:      Intel Core i5-1335U (10 cores, up to 4.6 GHz)
RAM:      16 GB DDR5
Storage:  512 GB NVMe SSD
Graphics: Intel Iris Xe (integrated)
Display:  14" Full HD (1920 × 1080)
OS:       Windows 11 Home
```

Từng dòng, bằng lời dễ hiểu:

- **CPU** — bếp trưởng. "10 cores" nghĩa là làm được nhiều việc song song; "up to 4.6 GHz" là tốc độ tối đa.
- **RAM 16 GB** — độ rộng của bàn bếp. DDR5 chỉ là thế hệ công nghệ RAM (mới hơn = nhanh hơn).
- **Storage 512 GB NVMe SSD** — cái kho. NVMe là một kiểu kết nối SSD tốc độ cao.
- **Graphics: integrated** — GPU tích hợp trong CPU: đủ cho văn phòng, không hợp chơi game nặng.
- **Display** — Full HD nghĩa là 1920 × 1080 điểm ảnh (pixel – các chấm màu nhỏ).
- **OS** — phần mềm quản lý được cài sẵn.

### Gợi ý chọn máy cho người dùng phổ thông

| Nhu cầu | CPU | RAM | Ổ cứng |
|---|---|---|---|
| Email, web, Office, gọi video | i3 / Ryzen 3 đời mới / Apple M-series | 8 GB (16 GB thoải mái hơn) | SSD 256 GB |
| Nhân viên văn phòng / BA mở nhiều tab, Excel, Teams | i5 / Ryzen 5 / Apple M-series | 16 GB | SSD 512 GB |
| Developer, làm dữ liệu, chỉnh ảnh/video | i7 / Ryzen 7 / Apple M Pro | 16–32 GB | SSD 512 GB–1 TB |

> **Ví dụ thực tế:** trong buổi họp yêu cầu, có người nói *"Ứng dụng phải chạy được trên laptop của nhân viên."* Một BA giỏi sẽ hỏi: *"Cấu hình tối thiểu là gì — CPU, RAM, dung lượng ổ trống và phiên bản hệ điều hành?"* Câu trả lời (ví dụ "8 GB RAM, Windows 10 trở lên, trống 2 GB ổ cứng") được ghi vào **yêu cầu phi chức năng** (non-functional requirements) — phần mô tả hệ thống phải chạy tốt đến mức nào và chạy trên gì. Nhầm RAM với ổ cứng ở đây sẽ đặt sai giới hạn.

---

## 7. Tóm tắt

- Máy tính nhận **đầu vào**, **xử lý** theo lệnh, và tạo ra **đầu ra**; nó **lưu trữ** những gì cần giữ lại.
- **CPU**: bộ não – xử lý mọi thứ. Nhiều nhân = nhiều việc song song; GHz = số nhịp mỗi giây.
- **RAM**: bộ nhớ tạm – lưu những thứ đang dùng. Nhanh, nhưng bị xóa khi mất điện.
- **Ổ cứng**: bộ nhớ dài hạn – lưu file, hệ điều hành, phần mềm. SSD nhanh; HDD rẻ và chậm.
- **GPU**: vẽ hình ảnh; loại tích hợp cho văn phòng, loại rời cho game, video và AI.
- **OS**: phần mềm nền – cầu nối giữa phần cứng và ứng dụng.
- **Driver** giúp OS giao tiếp với phần cứng; **ứng dụng** phục vụ nhu cầu cụ thể của người dùng.
- **Đơn vị dữ liệu**: 8 bit = 1 byte; mỗi bậc lên (KB → MB → GB → TB) là ×1.024. Tốc độ mạng tính bằng bit, dung lượng file tính bằng byte.
- **Hardware + Software** = Máy tính hoàn chỉnh.

### Thuật ngữ chính

| Thuật ngữ | Nghĩa dễ hiểu |
|---|---|
| Hardware (phần cứng) | Các bộ phận vật lý chạm được |
| Software (phần mềm) | Chương trình — các lệnh bảo phần cứng phải làm gì |
| CPU | Con chip thực thi lệnh ("bếp trưởng") |
| Core (nhân) | Một "người làm" độc lập bên trong CPU |
| RAM | Chỗ làm việc tạm, nhanh; trống trơn khi mất điện |
| Storage (SSD/HDD) | Chỗ lưu lâu dài cho file, ứng dụng và OS |
| GPU | Chip chuyên vẽ hình và tính toán song song |
| Motherboard (bo mạch chủ) | Tấm mạch chính nối mọi bộ phận |
| Peripheral (ngoại vi) | Thiết bị đầu vào (bàn phím) hoặc đầu ra (màn hình) |
| Operating system (OS) | Phần mềm quản lý đứng giữa phần cứng và ứng dụng |
| Driver | Chương trình phiên dịch giúp OS dùng một thiết bị |
| Bit / Byte | Một số 0-hoặc-1 / một nhóm 8 bit |
