# Hệ điều hành

## 1. Hệ điều hành là gì?

**Hệ điều hành (OS - Operating System)** là phần mềm nền tảng quản lý toàn bộ tài nguyên phần cứng và cung cấp môi trường để chạy các phần mềm khác.

Không có OS → phần mềm không chạy được.

**Ví von:** hãy nghĩ đến một **tòa chung cư**. Tòa nhà có tài nguyên dùng chung — điện, nước, thang máy, kho chứa đồ. Cư dân (các ứng dụng) ai cũng muốn dùng. Nếu ai thích gì lấy nấy thì sẽ loạn: hai người tranh một thang máy, người này đi nhầm vào căn hộ người kia. Vì vậy tòa nhà có **ban quản lý**. Ban quản lý phát chìa khóa, sắp xếp ai dùng thang máy lúc nào, ghi chỉ số đồng hồ, và không cho cư dân vào nhà nhau. OS chính là ban quản lý của máy tính: "tài nguyên dùng chung" là CPU, RAM, ổ cứng, màn hình, bàn phím và mạng.

Trên thực tế, OS làm ba việc lớn:

1. **Chia sẻ phần cứng** — quyết định ứng dụng nào được dùng CPU, mỗi ứng dụng được bao nhiêu RAM, ai được dùng máy in.
2. **Che giấu chi tiết phần cứng** — ứng dụng chỉ cần nói "lưu file này" hay "vẽ cửa sổ này"; OS tự lo cách làm điều đó trên ổ cứng và card đồ họa cụ thể của *bạn*. Nhờ vậy cùng một bản Chrome chạy được trên hàng nghìn mẫu laptop khác nhau.
3. **Bảo vệ** — không cho ứng dụng phá hỏng lẫn nhau, và không cho người dùng xem file của nhau.

### Chuyện gì xảy ra khi bạn bấm nút nguồn

Quá trình khởi động máy gọi là **boot**. Từng bước:

1. **Firmware thức dậy.** Một chương trình nhỏ lưu trên chip của bo mạch chủ (gọi là **BIOS**, hoặc trên PC hiện đại là **UEFI**) kiểm tra phần cứng cơ bản có hoạt động không.
2. **Bootloader chạy.** Firmware tìm một chương trình rất nhỏ trên ổ cứng, chỉ có nhiệm vụ nạp OS.
3. **Kernel được nạp.** Lõi của OS (**kernel**, xem Mục 6) được chép lên RAM và nắm quyền điều khiển phần cứng.
4. **Driver và service khởi động.** OS nạp driver cho màn hình, Wi-Fi, bàn phím, và khởi động các chương trình chạy nền (**service**), như mạng và phần mềm diệt virus.
5. **Màn hình đăng nhập.** Bạn gõ mật khẩu; OS mở màn hình làm việc với file và thiết lập riêng của bạn.

Từ lúc này, mọi thứ bạn làm đều đi qua OS.

---

## 2. Các OS phổ biến

| OS | Nhà phát triển | Phổ biến ở |
|----|---------------|-----------|
| Windows 11/10 | Microsoft | PC cá nhân, doanh nghiệp |
| macOS | Apple | MacBook, iMac |
| Linux (Ubuntu, CentOS) | Cộng đồng mã nguồn mở | Server, developer |
| Android | Google | Điện thoại Android |
| iOS | Apple | iPhone, iPad |
| Windows Server | Microsoft | Server doanh nghiệp |

Vài ghi chú hữu ích cho người mới:

- **Windows** là thứ chạy trên đa số laptop văn phòng. Doanh nghiệp chuộng nó vì tương thích với gần như mọi máy in, phần mềm kế toán và ứng dụng nghiệp vụ, và phòng IT quản lý tập trung được hàng nghìn máy.
- **macOS** chỉ chạy trên máy tính của Apple. Được nhiều designer và developer ưa dùng.
- **Linux** không phải một sản phẩm mà là cả một họ. Phần lõi (Linux kernel) miễn phí và **mã nguồn mở** — code được công khai, ai cũng được dùng và sửa. Các nhóm khác nhau đóng gói nó cùng công cụ bổ sung thành các **bản phân phối** ("distro"): Ubuntu, Debian, Red Hat Enterprise Linux, Rocky Linux (một bản kế thừa CentOS — CentOS đã ngừng phát triển), v.v. Phần lớn web server và máy chủ đám mây trên Internet chạy Linux, vì nó miễn phí, ổn định, bảo mật, hiệu năng cao và tùy biến sâu.
- **Android** được xây dựng trên Linux kernel, với ứng dụng và giao diện của Google ở bên trên.
- **iOS / iPadOS** chạy trên iPhone và iPad; chúng dùng chung nền tảng với macOS.
- **Windows Server** là phiên bản máy chủ của Windows, dùng ở nơi doanh nghiệp phụ thuộc vào sản phẩm Microsoft (ví dụ đăng nhập công ty bằng Active Directory).

> **Hiểu lầm thường gặp:** "Linux chỉ dành cho hacker." Bạn dùng Linux mỗi ngày mà không biết: phần lớn website bạn vào đều được phục vụ bởi máy Linux, và nếu bạn dùng điện thoại Android, nó chạy trên Linux kernel.

> **Tự thử:** xem chính xác bạn đang dùng OS và phiên bản nào.
> - **Windows:** nhấn `Windows key + R`, gõ `winver`, nhấn Enter. Một cửa sổ nhỏ hiện ra, ví dụ "Windows 11, Version 23H2".
> - **macOS:** bấm menu Apple → **About This Mac**. Bạn sẽ thấy tên và phiên bản macOS, ví dụ "macOS Sonoma 14.5".

---

## 3. Chức năng của OS

### Quản lý Process (tiến trình)

Process là một chương trình đang chạy. OS phân phối CPU time cho từng process:
- **Multi-tasking**: chạy nhiều process đồng thời (Chrome, Word, Spotify cùng lúc).
- **Scheduling**: CPU chuyển nhanh giữa các process tạo cảm giác chạy song song.
- **Process isolation**: process này không can thiệp vào bộ nhớ của process khác.

**Ví von:** một kiện tướng cờ vua đấu cùng lúc với 30 người, lần lượt đi một nước ở từng bàn. Mỗi đối thủ đều cảm thấy được cô ấy chú ý. Một nhân CPU làm y như vậy với các process, nhưng chuyển hàng nghìn lần mỗi giây. Có nhiều nhân thì có nhiều "kiện tướng" làm việc song song thật sự. Phần của OS quyết định ai được chạy tiếp theo là **scheduler** (bộ lập lịch); nếu một chương trình bị treo, nó vẫn tiếp tục phục vụ các chương trình khác, nên bạn vẫn mở được Task Manager.

### Quản lý bộ nhớ (Memory Management)
- Cấp phát RAM cho từng process khi cần.
- Thu hồi RAM khi process kết thúc.
- **Virtual Memory**: dùng ổ cứng làm RAM ảo khi RAM thật đầy.

**Ví von:** RAM là mặt bàn làm việc, ổ cứng là tủ hồ sơ. Khi bàn đầy, OS cất những giấy tờ lâu không đụng tới vào tủ (gọi là **page file** trên Windows, **swap** trên macOS/Linux) và lấy ra lại khi cần. Tủ chậm hơn bàn rất nhiều — nên máy thiếu RAM sẽ trở nên ì ạch chứ không sập.

### Quản lý File System

OS tổ chức dữ liệu trên ổ cứng theo cấu trúc thư mục (folder/directory):

```text
Windows:              Unix/Linux/macOS:
C:\                   /
├── Windows\          ├── home/
├── Program Files\    │   └── user/
└── Users\            ├── etc/
    └── Harry\        ├── var/
        └── Desktop\  └── usr/
```

- Trên **Windows**, mỗi ổ đĩa là một gốc riêng: `C:\`, `D:\`. Địa chỉ đầy đủ của file (**đường dẫn – path**) trông như `C:\Users\Harry\Desktop\report.docx`, dùng dấu gạch chéo ngược.
- Trên **Linux và macOS** chỉ có một cây duy nhất bắt đầu từ `/` (**thư mục gốc – root directory**), và đường dẫn dùng dấu gạch chéo xuôi: `/home/harry/report.docx` (Linux) hoặc `/Users/harry/report.docx` (macOS). Ổ đĩa gắn thêm xuất hiện như các thư mục trong cây đó.

> **Hiểu lầm thường gặp:** "`Report.pdf` và `report.pdf` là cùng một file." Trên Windows (và mặc định trên macOS) thì đúng, vì file system của chúng **không phân biệt chữ hoa/thường** (case-insensitive). Trên Linux đó là hai file khác nhau, vì Linux **phân biệt chữ hoa/thường** (case-sensitive). Đây là lý do kinh điển khiến ứng dụng chạy được trên laptop Windows của developer nhưng hỏng trên server Linux: code gọi `Logo.png`, file lại tên là `logo.png`, và server báo "file not found".

### Quản lý thiết bị (Device Management)

OS dùng **driver** để giao tiếp với phần cứng: card màn hình, bàn phím, printer...

**Driver** là một người phiên dịch: nó chuyển lệnh chung chung của OS "in trang này" thành đúng các lệnh mà một mẫu máy in cụ thể hiểu. Driver card đồ họa bị lỗi là nguyên nhân kinh điển gây nháy màn hình.

### Bảo mật

- Quản lý user account và quyền truy cập.
- Cách ly các ứng dụng khỏi nhau.
- Firewall tích hợp.

Nói đơn giản: mỗi người đăng nhập bằng **tài khoản người dùng** riêng; file có **quyền** (permission — ai được đọc, sửa hay chạy); và việc cài phần mềm hay đổi thiết lập hệ thống cần quyền **quản trị** ("admin") — thứ mà nhân viên bình thường thường không có trên laptop công ty. **Firewall** (tường lửa) là người gác cổng chặn các kết nối mạng không mong muốn.

> **Tự thử:** xem OS xoay xở với process và bộ nhớ.
> - **Windows:** nhấn `Ctrl + Shift + Esc` để mở **Task Manager**. Tab **Processes** liệt kê mọi process đang chạy cùng mức dùng CPU và Memory. Mở thêm vài tab trình duyệt và xem Memory tăng lên.
> - **macOS:** nhấn `Cmd + Space`, gõ **Activity Monitor**, nhấn Enter. Tab **CPU** và **Memory** hiển thị thông tin tương tự.

---

## 4. CLI vs GUI

Có hai cách ra lệnh cho OS. **Ví von:** ở nhà hàng, bạn có thể chỉ vào hình trong thực đơn (dễ, nhưng chỉ gọi được món có hình), hoặc nói với đầu bếp chính xác mình muốn gì (nhanh và chính xác hơn khi bạn đã biết cách gọi).

### GUI (Graphical User Interface)

Giao diện đồ họa — click, drag, drop. Dễ dùng, trực quan.
- Ví dụ: Windows Explorer, Finder trên macOS.

### CLI (Command Line Interface)

Giao diện dòng lệnh — gõ lệnh bằng text.

Chương trình để gõ lệnh gọi là **terminal** (hoặc **shell**). Trên Windows là **Terminal**, **Command Prompt** hoặc **PowerShell**; trên macOS là **Terminal**. Bạn gõ lệnh, nhấn Enter, và kết quả hiện ra dưới dạng chữ.

```bash
ls -la          # liệt kê file (Linux/macOS)
dir             # liệt kê file (Windows)
cd /home/user   # di chuyển vào thư mục
mkdir project   # tạo thư mục mới
rm -rf folder/  # xóa thư mục (cẩn thận!)
```

`cd` nghĩa là *change directory* – đổi thư mục (`cd ..` lùi lên một cấp), `mkdir` là *make directory* – tạo thư mục (thư mục được tạo ngay tại vị trí hiện tại), còn `rm -rf` xóa một thư mục cùng mọi thứ bên trong **mà không hỏi lại và không qua Thùng rác**.

**Tại sao CLI quan trọng?**
- Server thường không có GUI (tiết kiệm tài nguyên).
- Tự động hóa qua script.
- Nhanh hơn GUI cho nhiều tác vụ kỹ thuật.

**Script** là một file text chứa danh sách lệnh, chạy một lượt. Kỹ sư vận hành cần cập nhật 300 server sẽ không bấm qua 300 màn hình; họ viết lệnh một lần và chạy từ xa trên mọi máy, giống hệt nhau mỗi lần.

> **Tự thử:** những lệnh an toàn đầu tiên (không lệnh nào thay đổi gì cả).
> - **macOS:** mở **Terminal** (`Cmd + Space`, gõ "Terminal"). Gõ `pwd` rồi Enter — nó in ra thư mục bạn đang đứng, ví dụ `/Users/harry`. Gõ `ls` để xem bên trong có gì, rồi `whoami` để xem tên người dùng.
> - **Windows:** nhấn phím Windows, gõ **cmd**, nhấn Enter. Gõ `cd` rồi Enter — nó in ra thư mục hiện tại, ví dụ `C:\Users\Harry`. Gõ `dir` để liệt kê nội dung, rồi `whoami` để xem tên máy và tên người dùng.

---

## 5. Process và Thread

- **Process**: chương trình đang chạy, có bộ nhớ riêng.
- **Thread**: đơn vị thực thi nhỏ hơn trong process.

**Ví von:** process là một **nhà hàng** có bếp, tủ lạnh và nhân viên riêng; người của nhà hàng bên cạnh không được bước vào. Thread là **các đầu bếp trong cùng một nhà hàng**: họ làm việc cùng lúc và dùng chung bếp, tủ lạnh (bộ nhớ của process). Dùng chung giúp phối hợp nhanh — đầu bếp này dùng ngay nước sốt người kia vừa làm — nhưng cũng có nghĩa hai người có thể cùng chộp một cái chảo, nguồn gốc của nhiều lỗi khó tìm.

| | Process | Thread |
|---|---|---|
| Là gì | Một chương trình đang chạy | Một "người làm" bên trong process |
| Bộ nhớ | Riêng, được cách ly | Dùng chung với các thread khác trong cùng process |
| Nếu bị crash | Các process khác thường vẫn sống | Có thể kéo sập cả process |
| Ví dụ | Word, Chrome, Spotify | Trong Word: một thread xử lý gõ phím, thread khác kiểm tra chính tả |

**Chương trình** (program) là file nằm trên ổ cứng (`chrome.exe`, `Spotify.app`); **process** là chương trình đó *khi đang chạy*. Mở Notepad hai lần thì có một chương trình nhưng hai process.

Ví dụ Chrome: một process Chrome, nhưng mỗi tab là một thread (hoặc process con riêng để cách ly). Chrome hiện đại chủ yếu dùng cách thứ hai: nó cho các tab chạy trong **process con** riêng, nên một trang bị lỗi chỉ hiện "Aw, Snap!" còn các tab khác vẫn chạy bình thường. Bạn có thể thấy điều này trong trình quản lý tác vụ riêng của Chrome (`Shift + Esc` trên Windows, hoặc menu → More tools → Task manager).

> **Ví dụ thực tế:** một tester ghi trong ticket lỗi: *"Khi tôi xuất một báo cáo lớn, cả ứng dụng bị đơ 30 giây."* Developer trả lời: *"Việc xuất báo cáo đang chạy trên main thread (thread giao diện) — bọn mình sẽ chuyển nó sang background thread."* Main thread là thread vẽ lại màn hình; nếu nó bận, cửa sổ không phản hồi được, và Windows gắn nhãn "Not Responding".

---

## 6. Kernel

**Kernel** là lõi của OS — phần chạy với đặc quyền cao nhất, trực tiếp tương tác với phần cứng:
- User apps không gọi phần cứng trực tiếp → gọi qua kernel (system call).
- Kernel quản lý bộ nhớ, CPU, I/O ở mức thấp nhất.

**I/O** nghĩa là Input/Output (vào/ra): đọc và ghi với ổ cứng, mạng, bàn phím và màn hình.

**Ví von:** một **ngân hàng**. Khách hàng (ứng dụng) không bao giờ tự đi vào kho tiền. Họ ra quầy và điền phiếu: "rút 1 triệu". Giao dịch viên có quyền vào kho (kernel) kiểm tra yêu cầu rồi làm thay họ. Tờ phiếu ở quầy chính là **system call** (lời gọi hệ thống).

```text
 ┌────────────────────────────────────────────┐
 │  Ứng dụng (Chrome, Word, Zalo) — user mode │  quyền hạn chế
 ├─────────────── system call ────────────────┤
 │  Kernel                      — kernel mode │  toàn quyền
 ├────────────────────────────────────────────┤
 │  Phần cứng (CPU, RAM, ổ cứng, mạng)        │
 └────────────────────────────────────────────┘
```

Chính CPU áp đặt hai cấp: **user mode** (ứng dụng — bị giới hạn) và **kernel mode** (kernel — làm được mọi thứ). Vì thế một ứng dụng lỗi thường chỉ tự sập, còn lỗi trong kernel hoặc trong driver (driver chạy với quyền kernel) có thể kéo sập cả máy: **màn hình xanh** của Windows ("Your PC ran into a problem") hoặc **kernel panic** trên macOS (máy Mac khởi động lại và báo rằng nó đã khởi động lại vì gặp sự cố).

### Từng bước: chuyện gì xảy ra khi một ứng dụng lưu file

1. Bạn nhấn **Ctrl + S** trong Word.
2. Word không được tự chạm vào ổ cứng, nên nó thực hiện một **system call**: "ghi các byte này vào `report.docx`".
3. CPU chuyển sang kernel mode và trao quyền điều khiển cho kernel.
4. Kernel kiểm tra quyền: người dùng này có được ghi vào thư mục đó không?
5. Kernel hỏi file system nên đặt dữ liệu ở đâu, rồi bảo driver ổ cứng ghi xuống.
6. Kernel trả kết quả ("xong" hoặc "access denied – bị từ chối") về cho Word, và CPU chuyển lại user mode.

Tất cả chỉ mất một phần rất nhỏ của giây. Mở file, tạo process, gửi dữ liệu qua mạng hay đọc đồng hồ đều đi qua system call theo cách tương tự.

Các kernel nổi tiếng: **Linux** kernel (server Linux và Android), **XNU** (macOS và iOS) và kernel **Windows NT** (Windows 10/11 và Windows Server).

---

## 7. OS trong công việc: BA hay Tester nên hỏi gì

Phần lớn ticket công việc nhắc đến "hệ thống" đều ngầm phụ thuộc vào chi tiết của OS. Hiểu chúng giúp bạn hỏi đúng câu.

> **Ví dụ thực tế:** một yêu cầu ghi *"Ứng dụng phải chạy được trên các máy trạm hiện có của công ty."* Trước khi chốt, BA nên làm rõ:
> - **OS và phiên bản nào?** Windows 10 và 11? Có máy Mac không? (Ứng dụng chỉ làm cho Windows sẽ không chạy trên macOS.)
> - **Cấu hình tối thiểu?** CPU, RAM, dung lượng ổ trống.
> - **Quyền cài đặt?** Nhân viên có quyền admin không, hay IT phải cài giúp?
> - **Quy định bảo mật?** Firewall hoặc phần mềm diệt virus của công ty có chặn nó không?

Một số câu hỏi và thông báo điển hình bạn sẽ gặp:

| Bạn thấy / nghe | Ý nghĩa xét theo OS |
|---|---|
| "Máy tôi chạy được, lên server thì lỗi" | Thường do khác biệt OS — Windows vs Linux, tên file phân biệt hoa/thường, đường dẫn khác nhau (`\` vs `/`) |
| "Access is denied" / "Permission denied" | Tài khoản người dùng thiếu quyền hoặc thiếu quyền admin |
| "Program is Not Responding" | Main thread của process bị kẹt; có thể tắt nó bằng Task Manager |
| "Low on memory" / máy rất chậm | RAM đầy, OS phải đẩy dữ liệu xuống ổ cứng (virtual memory) |
| "Vui lòng cập nhật driver" | "Người phiên dịch" giữa OS và thiết bị đã lỗi thời |
| "Để mình SSH vào server xem log" | Kết nối từ xa vào CLI của server Linux và đọc các file ghi nhật ký |

---

## 8. Tóm tắt

- **OS** = phần mềm nền quản lý tài nguyên. Tài nguyên đó là CPU, RAM, ổ cứng, thiết bị và mạng.
- Nó **chia sẻ** phần cứng cho các ứng dụng, **che giấu** chi tiết phần cứng, và **bảo vệ** ứng dụng, người dùng khỏi nhau.
- **Process** = chương trình đang chạy; **thread** = "người làm" bên trong process, dùng chung bộ nhớ của nó.
- **Scheduling** chia cho mỗi process từng lát thời gian CPU; **virtual memory** mượn ổ cứng khi RAM đầy.
- **File System** = cách OS tổ chức file. Windows dùng gốc theo ổ đĩa như `C:\`; Linux/macOS dùng một cây duy nhất từ `/`. Tên file trên Linux phân biệt chữ hoa/thường.
- **CLI** = giao diện dòng lệnh — quan trọng với server. **GUI** = trỏ và nhấp chuột.
- **Driver** = phần mềm để OS giao tiếp với phần cứng.
- **Kernel** = lõi OS, đặc quyền cao nhất. Ứng dụng làm việc với nó qua **system call**.

### Thuật ngữ chính

| Thuật ngữ | Nghĩa dễ hiểu |
|---|---|
| Operating system (OS) | Phần mềm "ban quản lý tòa nhà" của máy tính |
| Boot | Khởi động máy và nạp OS |
| Process (tiến trình) | Một chương trình đang chạy |
| Thread (luồng) | Một "người làm" trong process, dùng chung bộ nhớ |
| Scheduler | Phần của OS quyết định process nào được dùng CPU tiếp theo |
| Virtual memory | Dùng ổ cứng làm phần dự phòng khi RAM đầy |
| File system | Cách tổ chức file và thư mục trên ổ đĩa |
| Path (đường dẫn) | Địa chỉ đầy đủ của file, vd. `C:\Users\Harry\a.txt` |
| Driver | Chương trình phiên dịch giữa OS và một thiết bị |
| GUI / CLI | Giao diện bấm chuột / giao diện gõ lệnh |
| Terminal / shell | Chương trình để gõ lệnh CLI |
| Kernel | Lõi của OS, toàn quyền với phần cứng |
| System call | Yêu cầu chính thức của ứng dụng gửi tới kernel |
| Quyền admin | Quyền cài phần mềm và thay đổi thiết lập hệ thống |
