# IDE & trình soạn code: Làm quen với VS Code

## 1. Code thực chất là gì: văn bản thuần

**Ví dụ so sánh:** hãy nghĩ đến một công thức nấu ăn viết tay trên tờ giấy trắng. Ai cũng đọc được, chép lại được, hay dán lên tủ lạnh được. Giờ nghĩ đến chính công thức đó in trên một tạp chí bóng bẩy: có font chữ, màu sắc, hình ảnh, bố cục trang. Trang tạp chí đẹp hơn, nhưng người nấu chỉ cần phần chữ.

Code chính là tờ công thức viết tay. Một chương trình, một trang web hay một câu truy vấn database đều được lưu thành **file văn bản thuần (plain text file)**: file chỉ chứa các ký tự (chữ cái, chữ số, ký hiệu, dấu cách, dấu xuống dòng) và không có gì khác. Bên trong file không có in đậm, không có cỡ chữ, không có lề trang.

Đó là lý do bạn không thể viết code trong Microsoft Word hay Google Docs. Một phần mềm soạn thảo văn bản lưu nhiều thứ hơn hẳn những ký tự bạn gõ:

| | File văn bản thuần (`index.html`, `notes.txt`) | Tài liệu Word (`report.docx`) |
|--|--|--|
| Bên trong có gì | Chỉ những ký tự bạn gõ | Chữ của bạn cộng thêm font, style, lề, hình ảnh, lịch sử |
| Ai đọc được | Mọi trình soạn thảo, mọi trình duyệt, mọi chương trình | Chỉ những chương trình hiểu định dạng Word |
| Thay đổi ngầm | Không có | Dấu nháy thẳng thành nháy cong, `--` thành gạch dài, chữ đầu câu tự viết hoa |

Dòng cuối là dòng "đau" nhất. Code cần dấu nháy thẳng `"`, nhưng Word âm thầm đổi nó thành nháy cong `“` và `”`. Với mắt người, chúng gần như giống nhau. Với máy tính, đó là những ký tự khác nhau, và chương trình ngừng chạy.

> **Hiểu lầm thường gặp:** "Code là thứ gì đó bí ẩn, phải có phần mềm đặc biệt mới mở được." Thực ra bạn mở được bất kỳ file code nào bằng trình soạn thảo đơn giản nhất trên máy. Công cụ chuyên dụng chỉ giúp công việc nhanh hơn và an toàn hơn.

> **Tự thử:** trên Windows mở **Notepad** (trên macOS mở **TextEdit**, rồi chọn *Format → Make Plain Text*). Gõ `Hello` và lưu file với tên `hello.txt`. Dung lượng của nó là 5 byte: mỗi chữ cái một byte. Giờ gõ đúng từ đó trong Word và lưu thành `hello.docx`. File này nặng hàng nghìn byte, vì tất cả những thứ Word thêm vào quanh năm chữ cái của bạn.

---

## 2. Text editor, code editor, IDE và những công cụ bạn sẽ nghe nhắc tên

**Ví dụ so sánh:** để nấu ăn, bạn có thể dùng một con dao nhỏ, một bộ dụng cụ bếp tốt, hoặc cả một gian bếp nhà hàng. Cả ba đều nấu được bữa tối. Chúng khác nhau ở chỗ giúp bạn được bao nhiêu và mất bao lâu để học cách dùng.

- **Text editor (trình soạn thảo văn bản thuần)** là con dao nhỏ. Nó chỉ cho bạn gõ và lưu văn bản thuần. Notepad và TextEdit là text editor.
- **Code editor (trình soạn code)** là bộ dụng cụ bếp. Nó vẫn nhanh và nhẹ, nhưng hiểu code: tô màu code, tự hoàn thành từ cho bạn, và cảnh báo khi có lỗi. **Visual Studio Code** (ai cũng gọi là **VS Code**) là một code editor.
- **IDE** (Integrated Development Environment — môi trường phát triển tích hợp) là gian bếp nhà hàng. Nó gói một editor cùng các công cụ nặng cho một loại công việc: debugger (công cụ tạm dừng chương trình để nhìn vào bên trong), hệ thống build, trình xem database, các trình hướng dẫn tạo dự án. IntelliJ IDEA và Android Studio là IDE.

VS Code nằm ở giữa. Nó khởi đầu là một code editor, và bạn có thể thêm từng công cụ một cho tới khi nó hoạt động gần như một IDE. Nó miễn phí, do Microsoft làm ra, và chạy giống nhau trên Windows, macOS và Linux. Đó là lý do phần lớn web developer dùng nó, và cũng là lý do khoá học này dùng nó.

### Những cái tên bạn sẽ nghe ở chỗ làm

| Công cụ | Loại | Thường dùng để | Nên biết |
|---------|------|----------------|----------|
| Notepad / TextEdit | Text editor | Ghi chú nhanh, sửa lặt vặt | Có sẵn trên máy; không hỗ trợ gì cho code |
| Notepad++ | Code editor | Sửa nhanh trên Windows | Miễn phí, chỉ có trên Windows, rất nhẹ |
| Sublime Text | Code editor | Lập trình nói chung | Rất nhanh; cần mua bản quyền, được dùng thử miễn phí |
| **VS Code** | Code editor (lớn dần nhờ extension) | Web, JavaScript, Python và nhiều thứ khác | Miễn phí; là công cụ của khoá học này |
| Các IDE của JetBrains (IntelliJ IDEA, WebStorm, PyCharm) | IDE | Dự án Java, JavaScript, Python ở công ty | Mạnh và nặng hơn; nhiều phiên bản phải trả phí |
| Visual Studio | IDE | C# và .NET, C++ | Chủ yếu cho Windows; **không** phải là VS Code |
| Android Studio | IDE | Ứng dụng Android | Miễn phí, của Google |
| Xcode | IDE | Ứng dụng iPhone và Mac | Miễn phí, chỉ có trên macOS, của Apple |
| Cursor và các editor có AI hỗ trợ khác | Code editor kèm trợ lý AI | Viết code với gợi ý từ AI | Cursor được xây trên mã nguồn của VS Code nên trông rất quen |
| CodePen, StackBlitz | Sân chơi online (playground) | Thử một ý tưởng ngay trong trình duyệt | Không cần cài gì; rất hợp để chia sẻ một demo nhỏ |

> **Hiểu lầm thường gặp:** "Visual Studio và Visual Studio Code là cùng một chương trình." Chúng chỉ chung cái tên và chung công ty, ngoài ra không còn gì. Visual Studio là một IDE lớn, chủ yếu dành cho developer C# và C++. Visual Studio Code là editor nhỏ, miễn phí trong bài này. Nếu hướng dẫn bảo "mở VS Code" mà màn hình của bạn trông khác hẳn, có thể bạn đã cài nhầm.

Dù bạn chọn công cụ nào, các file vẫn là văn bản thuần. Một trang viết bằng VS Code vẫn mở được trong WebStorm, trong Notepad, hay trong editor của đồng nghiệp mà không cần chuyển đổi gì.

---

## 3. Cài đặt VS Code trên Windows và macOS

Việc cài đặt mất khoảng năm phút. Chỉ tải từ trang chính thức, **code.visualstudio.com**, đừng bao giờ tải từ một trang download bất kỳ.

### Windows

1. Mở `https://code.visualstudio.com` trong trình duyệt và bấm nút **Download** lớn (trang web tự nhận ra bạn đang dùng Windows).
2. Chạy file cài đặt (installer) vừa tải về, tên có dạng `VSCodeUserSetup-….exe`.
3. Chấp nhận điều khoản và giữ nguyên vị trí cài đặt được gợi ý.
4. Ở trang **Select Additional Tasks**, tick các ô (checkbox) sau:
   - **Add "Open with Code" action to Windows Explorer file context menu**
   - **Add "Open with Code" action to Windows Explorer directory context menu**
   - **Add to PATH** (thường đã tick sẵn; cứ để nguyên)
5. Bấm **Install**, rồi **Finish**.

Vì sao các ô này quan trọng: "Open with Code" cho phép bạn bấm chuột phải vào bất kỳ thư mục nào trong File Explorer và mở nó bằng VS Code. **PATH** là danh sách những nơi Windows tìm kiếm khi bạn gõ tên một chương trình, nên "Add to PATH" giúp lệnh `code` chạy được trong terminal sau này.

### macOS

1. Mở `https://code.visualstudio.com` và bấm nút **Download** cho macOS.
2. Mở file vừa tải về. Bạn nhận được một ứng dụng tên **Visual Studio Code**.
3. Kéo ứng dụng vào thư mục **Applications**. Đừng chạy nó từ thư mục Downloads.
4. Mở nó từ Applications hoặc từ Spotlight (`Cmd + Space`, gõ "code"). Lần đầu tiên, macOS hỏi bạn có thật sự muốn mở một ứng dụng tải từ internet không; bấm **Open**.

### Lần mở đầu tiên

Lần mở đầu tiên hiện một tab **Welcome** với vài lựa chọn thiết lập, chẳng hạn giao diện màu (theme). Cứ chọn theme bạn thích; sau này đổi được. Các phiên bản mới có thể còn mời bạn đăng nhập hoặc thiết lập trợ lý AI. Bạn có thể bỏ qua hết: không có gì trong bài này cần tài khoản.

Sớm muộn gì bạn cũng gặp câu hỏi này:

```text
Do you trust the authors of the files in this folder?

[ Yes, I trust the authors ]     [ No, I don't trust the authors ]
```

Đây là **Workspace Trust** (tin cậy không gian làm việc). Một số thư mục dự án chứa cấu hình có thể chạy chương trình trên máy bạn, nên VS Code hỏi trước khi cho phép. Với thư mục do chính bạn tạo, trả lời **Yes**. Với thư mục tải về từ nguồn không rõ, trả lời **No**: khi đó VS Code mở nó ở **Restricted Mode** (chế độ hạn chế), bạn vẫn đọc và sửa file được, nhưng các tác vụ tự động và nhiều extension bị tắt.

> **Tự thử:** sau khi cài, mở VS Code và chọn *Help → About* (trên macOS: *Code → About Visual Studio Code*). Một cửa sổ nhỏ hiện số phiên bản. Đó là bằng chứng việc cài đặt đã thành công.

---

## 4. Tham quan cửa sổ VS Code

**Ví dụ so sánh:** cửa sổ này giống bảng điều khiển xe hơi. Ngày đầu trông nó rối mắt, nhưng thật ra chỉ có năm khu vực, mỗi khu vực làm đúng một việc.

```text
+----+----------------+---------------------------------------------+
| A  |  SIDE BAR      |  EDITOR AREA                                |
| C  |                |  [ index.html ] [ style.css ]   <- tabs     |
| T  |  EXPLORER      |                                             |
| I  |  MY-FIRST-SITE |   1  <!DOCTYPE html>                        |
| V  |    index.html  |   2  <html lang="en">                       |
| I  |    style.css   |   3  <head>                                 |
| T  |                |                                             |
| Y  |                +---------------------------------------------+
|    |                |  PANEL                                      |
| B  |                |  Problems | Output | Terminal               |
| A  |                |  PS C:\Users\you\my-first-site>             |
| R  |                |                                             |
+----+----------------+---------------------------------------------+
|  STATUS BAR    x 0  ! 0         Ln 3, Col 7   UTF-8   HTML        |
+-------------------------------------------------------------------+
```

| Khu vực | Ở đâu | Dùng để làm gì |
|---------|-------|----------------|
| **Activity Bar** | Dải icon hẹp, sát mép trái | Chuyển đổi nội dung mà Side Bar hiển thị |
| **Side Bar** | Ngay cạnh Activity Bar | Khung nhìn (view) bạn đã chọn: các file, kết quả tìm kiếm, extension |
| **Editor area** (vùng soạn thảo) | Phần lớn ở giữa | Nơi bạn đọc và gõ; mỗi file đang mở có một **tab** |
| **Panel** | Bên dưới editor | Terminal, Problems (danh sách lỗi), Output (thông báo từ các công cụ) |
| **Status Bar** (thanh trạng thái) | Dải màu mỏng dưới cùng | Thông tin về file hiện tại: dòng và cột, ngôn ngữ, số lỗi |

Các icon trên Activity Bar, từ trên xuống dưới:

| Icon | View | Bạn dùng nó để |
|------|------|----------------|
| Hai tờ giấy | **Explorer** | Xem và quản lý các file của dự án |
| Kính lúp | **Search** | Tìm chữ trong tất cả các file cùng lúc |
| Đường rẽ nhánh | **Source Control** | Làm việc với Git (xem bài về Git) |
| Nút play kèm con bọ | **Run and Debug** | Chạy chương trình từng bước; chưa cần lúc này |
| Bốn ô vuông | **Extensions** | Cài các tiện ích mở rộng |

Bấm một icon một lần để hiện view của nó; bấm lại đúng icon đó để thu gọn Side Bar và có thêm chỗ cho code. Panel cũng hoạt động như vậy: bạn có thể ẩn nó đi và gọi lại từ menu *View*.

Đừng lo nếu cửa sổ của bạn không giống hệt sơ đồ. Bố cục có thể tuỳ biến, và các phiên bản mới đôi khi thêm một khung chat bên phải, bạn đóng nó lại được.

> **Tự thử:** lần lượt bấm từng icon trên Activity Bar và đọc tiêu đề ở đầu Side Bar. Sau đó bấm `Ctrl + B` (macOS: `Cmd + B`) hai lần. Side Bar biến mất rồi hiện lại.

---

## 5. Làm việc với thư mục dự án

**Ví dụ so sánh:** một dự án là một bìa hồ sơ, không phải một tờ giấy rời. Một trang web cần nhiều file tham chiếu lẫn nhau (trang, phần trang trí, hình ảnh), nên chúng phải nằm chung trong một **thư mục (folder)**, còn gọi là directory. Thư mục đó chính là **dự án (project)** của bạn.

Thói quen quan trọng nhất trong VS Code: **mở thư mục, đừng mở một file lẻ.**

1. Chọn *File → Open Folder…*.
2. Chọn thư mục dự án và xác nhận.
3. Explorer giờ hiện tên thư mục bằng chữ in hoa, bên dưới là tất cả các file của nó.

Khi một thư mục đang mở, rê chuột lên tên của nó trong Explorer, bạn sẽ thấy các nút nhỏ: **New File**, **New Folder**, **Refresh** và **Collapse**. Bạn cũng có thể bấm chuột phải trong Explorer để đổi tên hoặc xoá file.

### File extension: phần cuối của tên file

**File extension (phần mở rộng tên file, hay "đuôi file")** là phần của tên file nằm sau dấu chấm cuối cùng: `.html`, `.css`, `.js`, `.txt`. Nó cho máy tính, trình duyệt và VS Code biết bên trong là loại nội dung gì. Đặt tên file là `index.html` thì VS Code coi nó là HTML; đặt là `index.txt` thì cùng nội dung đó được coi là ghi chú thường.

Windows mặc định ẩn đuôi file, và điều này gây ra một lỗi kinh điển của người mới: file trông như `index.html` nhưng thật ra là `index.html.txt`. Hãy bật hiển thị một lần rồi quên nó đi:

- **Windows 11:** trong File Explorer chọn *View → Show → File name extensions*.
- **Windows 10:** trong File Explorer mở tab *View* và tick *File name extensions*.
- **macOS:** trong Finder chọn *Finder → Settings → Advanced* (*Preferences* ở các phiên bản cũ) và tick *Show all filename extensions*.

### Lưu file: để ý dấu chấm tròn

Khi bạn sửa một file, dấu **×** trên tab của nó biến thành một **chấm tròn**. Chấm tròn nghĩa là "file này có thay đổi chưa lưu". Trình duyệt và mọi chương trình khác vẫn chỉ thấy bản cũ trên ổ đĩa.

- Lưu bằng `Ctrl + S` (macOS: `Cmd + S`). Chấm tròn trở lại thành ×.
- Hoặc bật *File → Auto Save*. Khi đó VS Code tự lưu ngay sau khi bạn ngừng gõ một chút.

> **Hiểu lầm thường gặp:** "Tôi gõ rồi thì nó đã được lưu." Chưa đâu, chừng nào chấm tròn còn đó. Quên lưu là lý do số một khiến người mới không thấy thay đổi gì trên trình duyệt.

> **Góc BA:** VS Code không chỉ dành cho developer. Một Business Analyst dùng nó để đọc những file developer gửi: mẫu JSON từ API, script SQL, file log, tài liệu Markdown. Mở thư mục dự án, bấm `Ctrl + Shift + F` và tìm đúng nguyên văn một thông báo lỗi hay nhãn của một nút bấm. Sau vài giây bạn biết file nào chứa nó, và câu hỏi bạn gửi developer trở nên chính xác hơn nhiều.

---

## 6. Thực hành: trang web đầu tiên của bạn

Đã đến lúc tạo file mà bạn sẽ dùng tiếp ở bài sau, HTML Cơ Bản.

### Bước 1: tạo thư mục dự án

1. Trong File Explorer (macOS: Finder) tạo một thư mục tên `my-first-site`, ví dụ bên trong Documents. Dùng chữ thường và dấu gạch nối thay cho dấu cách; dấu cách trong tên thư mục sẽ gây rắc rối sau này trong terminal.
2. Trong VS Code chọn *File → Open Folder…* và chọn `my-first-site`.
3. Nếu câu hỏi tin cậy hiện ra, trả lời **Yes**: bạn chính là tác giả.

### Bước 2: tạo index.html

1. Trong Explorer bấm **New File**, gõ `index.html` và nhấn Enter. File mở ra trong một tab.
2. Trong editor đang trống, gõ một dấu chấm than: `!`
3. Một danh sách gợi ý nhỏ hiện ra. Nhấn **Tab**.

VS Code bung một ký tự duy nhất đó thành bộ khung hoàn chỉnh của một trang. Đây là **Emmet**, một tính năng có sẵn giúp biến các từ viết tắt ngắn thành HTML. Phần code khởi đầu chuẩn mà trang nào cũng cần được gọi là **boilerplate** (code khung mẫu).

### Bước 3: biến nó thành của bạn

Đổi title và thêm hai dòng bên trong `<body>`, sao cho file trông chính xác như sau (phiên bản VS Code của bạn có thể sinh ra nhiều hơn hoặc ít hơn một dòng trong `<head>`; không sao cả):

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My First Site</title>
</head>
<body>
    <h1>Hello, VS Code!</h1>
    <p>This is my first web page.</p>
</body>
</html>
```

Nhấn `Ctrl + S` (macOS: `Cmd + S`). Kiểm tra rằng chấm tròn trên tab đã biến mất.

### Bước 4: mở nó trong trình duyệt

1. Trong Explorer bấm chuột phải vào `index.html` và chọn **Reveal in File Explorer** (macOS: **Reveal in Finder**).
2. Bấm đúp vào file. Nó mở ra trong trình duyệt mặc định của bạn.

Bạn sẽ thấy một tiêu đề lớn in đậm, **Hello, VS Code!**, bên dưới là câu "This is my first web page." Tab của trình duyệt mang tên **My First Site**. Thanh địa chỉ bắt đầu bằng `file:///`, nghĩa là trình duyệt đang đọc file thẳng từ ổ đĩa của bạn, không phải từ internet.

Giờ hãy đổi chữ của tiêu đề trong VS Code, lưu lại, quay sang trình duyệt và nhấn `F5` để tải lại (refresh). Chữ mới hiện ra. Sửa, lưu, tải lại: đó là vòng lặp cơ bản của công việc làm web.

### Bước 5: để trang tự tải lại

Tải lại bằng tay sẽ nhanh chóng gây chán. Một extension có thể làm việc đó thay bạn (Mục 8 giải thích kỹ về extension):

1. Bấm icon **Extensions**, tìm `Live Server` và bấm **Install**.
2. Bấm chuột phải vào `index.html` trong Explorer và chọn **Open with Live Server**.
3. Trình duyệt mở một địa chỉ dạng `http://127.0.0.1:5500/index.html`.

Live Server chạy một web server tí hon ngay trên máy bạn và theo dõi thư mục của bạn. Mỗi lần bạn lưu một file, nó bảo trình duyệt tải lại trang. Việc này gọi là **auto-reload** (tự tải lại, hay live reload). Extension **Live Preview** của Microsoft làm việc tương tự và hiển thị trang ngay bên trong VS Code.

> **Tự thử:** đặt VS Code ở nửa trái màn hình và trình duyệt ở nửa phải. Đổi `Hello, VS Code!` thành tên của bạn và nhấn `Ctrl + S`. Khi Live Server đang chạy, trang cập nhật trước cả khi bạn kịp với tay tới con chuột.

---

## 7. Editor làm giúp bạn những gì

Mọi thứ trong mục này là lý do người ta dùng code editor thay cho Notepad. Hãy vừa đọc vừa thử từng tính năng trong file `index.html` của bạn.

### Nó giúp bạn đọc

- **Syntax highlighting (tô màu cú pháp):** editor tô màu từng phần của code theo vai trò của nó, nên thẻ, tên thuộc tính và phần chữ trông khác nhau. Thiếu một dấu nháy rất dễ nhận ra, vì mọi thứ phía sau nó đột nhiên sai màu.
- **Bracket matching (khớp cặp ngoặc):** đặt con trỏ cạnh một dấu ngoặc thì dấu ngoặc cặp với nó được làm nổi bật. Trong HTML, bấm vào thẻ mở cũng làm nổi bật thẻ đóng của nó.
- **Minimap:** bản xem thu nhỏ của cả file ở mép phải. Nếu nó làm bạn mất tập trung, hãy ẩn đi ở *View → Appearance → Minimap*.

### Nó giúp bạn gõ

- **IntelliSense** là tên VS Code đặt cho tính năng tự hoàn thành (autocomplete). Gõ `<bu` và một danh sách gợi ý `button`; nhấn Tab hoặc Enter để chấp nhận, hoặc Esc để đóng danh sách. Nó cũng hiện một mô tả ngắn cho từng gợi ý.
- **Từ viết tắt Emmet:** `!` mới chỉ là khởi đầu. Gõ `ul>li*3` rồi nhấn Tab để có một danh sách ba mục. Gõ `p` rồi nhấn Tab để có `<p></p>`.
- **Tự đóng thẻ, đóng ngoặc:** gõ `<h2>` thì editor tự thêm `</h2>`; gõ `(` hoặc `"` thì ký tự cặp với nó tự xuất hiện.
- **Multi-cursor (nhiều con trỏ):** giữ `Alt` (macOS: `Option`) và bấm vào nhiều chỗ để gõ ở tất cả các chỗ đó cùng lúc. Hoặc chọn một từ rồi nhấn `Ctrl + D` (macOS: `Cmd + D`) để chọn thêm lần xuất hiện kế tiếp của từ đó.

### Nó bắt lỗi

Một đường gạch chân lượn sóng, thường gọi là **squiggle**, đánh dấu một vấn đề: màu đỏ là lỗi (error), màu vàng là cảnh báo (warning). Rê chuột lên nó để đọc lời giải thích. Mọi vấn đề của dự án được liệt kê trong panel **Problems** (`Ctrl + Shift + M`, macOS: `Cmd + Shift + M`), và Status Bar hiện tổng số.

VS Code khá dễ dãi với HTML, giống như các trình duyệt, nên ở đó bạn sẽ thấy ít squiggle. Bạn sẽ thấy nhiều hơn hẳn trong CSS, JavaScript và JSON. Ví dụ, viết `colr: red;` trong một file CSS sẽ có squiggle vàng kèm thông báo rằng thuộc tính này không tồn tại.

### Nó giữ cho code gọn gàng

**Formatting (định dạng code)** nghĩa là sửa lại phần thụt lề (indentation — các dấu cách ở đầu dòng) và khoảng cách mà không thay đổi việc code làm. Thụt lề gọn gàng giúp bạn nhìn thoáng qua là biết thẻ nào nằm trong thẻ nào. Bấm chuột phải trong editor và chọn **Format Document**, hoặc nhấn `Shift + Alt + F` (macOS: `Shift + Option + F`). Các đội thường cài thêm extension Prettier để code của mọi người được định dạng theo một phong cách nhất quán.

### Nó tìm kiếm giúp bạn

| Bạn muốn | Windows / Linux | macOS |
|----------|-----------------|-------|
| Tìm trong file hiện tại | `Ctrl + F` | `Cmd + F` |
| Thay thế trong file hiện tại | `Ctrl + H` | `Cmd + Option + F` |
| Tìm trong tất cả file của thư mục | `Ctrl + Shift + F` | `Cmd + Shift + F` |
| Mở file bằng cách gõ một phần tên (**Quick Open**) | `Ctrl + P` | `Cmd + P` |
| Chạy bất kỳ lệnh nào theo tên (**Command Palette**) | `Ctrl + Shift + P` | `Cmd + Shift + P` |

**Command Palette** đáng được nhắc riêng. Nó là một ô tìm kiếm cho mọi hành động VS Code làm được. Nếu bạn quên phím tắt hoặc không tìm thấy menu, hãy mở palette và gõ vài chữ cái của thứ bạn muốn. Gõ `format` hay `theme` là đủ.

Thêm hai tiện nghi nữa: phóng to, thu nhỏ cả cửa sổ bằng `Ctrl + =` và `Ctrl + -` (macOS: `Cmd`), và xem hai file cạnh nhau bằng **Split Editor** (`Ctrl + \`, macOS: `Cmd + \`).

> **Tự thử:** trong `index.html` thêm một dòng mới bên trong `<body>`, gõ `ul>li*3` rồi nhấn Tab. Sau đó cố ý làm lộn xộn phần thụt lề và chạy **Format Document**. File lập tức ngay ngắn trở lại.

---

## 8. Extension: thêm công cụ cho editor

**Ví dụ so sánh:** VS Code là chiếc smartphone, còn extension là các app. Điện thoại mới mua đã dùng được ngay, và bạn chỉ cài một app khi cần đến việc nó làm.

**Extension (tiện ích mở rộng)** là một phần bổ sung đem lại cho VS Code một khả năng mới: hỗ trợ một ngôn ngữ khác, một trình định dạng code, một khung xem trước, một theme màu. Extension đến từ **Marketplace**, cửa hàng có sẵn trong VS Code.

Để cài một extension:

1. Bấm icon **Extensions** trên Activity Bar (`Ctrl + Shift + X`, macOS: `Cmd + Shift + X`).
2. Gõ tên vào ô tìm kiếm.
3. Bấm vào extension để đọc trang của nó, rồi bấm **Install**.

Sau này cũng chính trang đó có nút **Disable** (tắt) và **Uninstall** (gỡ).

> **Hiểu lầm thường gặp:** Từ "extension" có hai nghĩa không liên quan gì nhau trong bài này. *File extension* là phần `.html` ở cuối tên file. *Extension của VS Code* là phần bổ sung cho editor. Hãy xác nhận xem đồng nghiệp đang nói nghĩa nào.

### Extension này có đáng tin không?

Extension là một chương trình chạy trên máy tính của bạn, và ai cũng có thể phát hành một cái. Trước khi cài, hãy kiểm tra bốn điều trên trang của nó:

| Kiểm tra | Dấu hiệu tốt | Dấu hiệu cảnh báo |
|----------|--------------|-------------------|
| **Publisher** (nhà phát hành) | Một cái tên quen thuộc, có dấu xác minh bên cạnh | Một cái tên nhái theo extension nổi tiếng |
| **Installs** (lượt cài) | Hàng trăm nghìn hoặc hàng triệu | Vài trăm lượt cho một công cụ "phổ biến" |
| **Ratings và reviews** (đánh giá) | Nhiều đánh giá, phần lớn tích cực | Không có đánh giá, hoặc gần đây có nhiều phàn nàn |
| **Lần cập nhật cuối** | Được cập nhật trong khoảng một năm trở lại | Bị bỏ mặc nhiều năm |

Bản sao có tên và icon gần giống hệt một extension nổi tiếng thật sự có xuất hiện, nên hãy so publisher và số lượt cài trước khi bấm.

### Danh sách khởi đầu

| Extension | Nó làm gì | Khi nào |
|-----------|-----------|---------|
| **Live Server** | Chạy trang của bạn trên máy và tải lại mỗi khi lưu | Ngay bây giờ |
| **Prettier - Code formatter** | Định dạng HTML, CSS và JavaScript theo một phong cách nhất quán | Ngay bây giờ |
| Một language pack (ví dụ tiếng Việt) | Dịch các menu của VS Code | Tuỳ chọn |
| **ESLint** | Chỉ ra những lỗi dễ mắc trong JavaScript | Sau này, ở các dự án JavaScript |

Một lưu ý về language pack: hầu hết tài liệu hướng dẫn, và cả khoá học này, dùng tên menu tiếng Anh. Giữ giao diện tiếng Anh giúp bạn dễ làm theo hướng dẫn và dễ tìm trợ giúp hơn.

Hãy cưỡng lại ham muốn cài hàng chục extension ngay ngày đầu. Mỗi cái làm VS Code khởi động chậm hơn một chút, và hai extension làm cùng một việc có thể "đánh nhau". Chỉ cài khi bạn thấy thật sự cần, và gỡ những gì bạn không dùng.

---

## 9. Terminal, Source Control và Settings

### Integrated terminal: nếm thử lần đầu

**Terminal** là một cửa sổ nơi bạn gõ lệnh thay vì bấm chuột. VS Code có sẵn một cái, gọi là **integrated terminal** (terminal tích hợp). Mở nó bằng ``Ctrl + ` `` (phím backtick, bên trái phím `1` trên hầu hết bàn phím; trên macOS phím tắt cũng y như vậy) hoặc bằng *Terminal → New Terminal*.

Có hai điều cần để ý. Terminal mở ngay bên trong thư mục dự án của bạn, nên bạn không cần di chuyển đi đâu cả. Và nó chạy một **shell**, tức chương trình đọc các lệnh của bạn: **PowerShell** trên Windows, **zsh** trên macOS.

Hãy thử ba lệnh vô hại. Gõ từng lệnh rồi nhấn Enter:

```text
pwd
ls
code .
```

| Lệnh | Nó làm gì | Bạn sẽ thấy |
|------|-----------|-------------|
| `pwd` | In ra thư mục bạn đang đứng | Một đường dẫn kết thúc bằng `my-first-site` |
| `ls` | Liệt kê các file trong thư mục đó (trên Windows `dir` cũng chạy được) | `index.html` |
| `code .` | Mở thư mục hiện tại trong VS Code (dấu chấm nghĩa là "thư mục này") | Ở đây không có gì mới, vì thư mục đã mở sẵn; lệnh này hữu ích khi gõ từ một terminal bên ngoài VS Code |

Trên macOS, lệnh `code` phải được cài một lần: mở Command Palette và chạy **Shell Command: Install 'code' command in PATH**.

Hôm nay như vậy là đủ. Các bài sau dùng terminal để cài công cụ và khởi động server, và sẽ giải thích từng lệnh khi cần đến.

### Source Control trong một đoạn văn

View **Source Control** (icon rẽ nhánh) là giao diện trực quan cho **Git**, công cụ ghi lại lịch sử các file của bạn. Khi một thư mục đã là Git repository, view này liệt kê các file bạn đã sửa, hiện khác biệt theo từng dòng, và cho bạn lưu một bản chụp (snapshot) kèm lời nhắn. Bạn sẽ học các ý tưởng đằng sau nó ở bài về Git; từ giờ tới lúc đó cứ bỏ qua icon này.

### Settings, theme và cỡ chữ

Mở Settings bằng `Ctrl + ,` (macOS: `Cmd + ,`). Có hai cách để xem cùng một bộ thiết lập:

- **Settings UI**: một trang tìm kiếm được, có các checkbox và dropdown. Hãy dùng cách này.
- **settings.json**: file văn bản thuần nơi VS Code lưu các lựa chọn của bạn. Developer thích sửa trực tiếp và chia sẻ file này. Đúng vậy, ngay cả thiết lập của editor cũng là một file văn bản thuần.

Ba thiết lập đáng đổi ngay ngày đầu. Gõ tên vào ô tìm kiếm ở đầu trang Settings:

| Tìm | Đặt thành | Vì sao |
|-----|-----------|--------|
| `Font Size` | 16 hoặc hơn | Đọc cho thoải mái |
| `Auto Save` | `afterDelay` | Hết cảnh quên lưu |
| `Word Wrap` | `on` | Dòng dài vẫn hiện đủ mà không phải cuộn ngang |

Để đổi màu sắc, mở Command Palette và chạy **Preferences: Color Theme**, rồi dùng phím mũi tên di chuyển qua danh sách để xem trước từng theme. Tối hay sáng hoàn toàn là chuyện sở thích.

Settings cũng có thể được ghi đè cho riêng một dự án: tab **Workspace** trong Settings lưu chúng vào thư mục `.vscode` bên trong dự án, để cả đội dùng chung.

---

## 10. Bảng phím tắt và xử lý sự cố

Bạn không cần học thuộc bảng này. Tuần này hãy học năm dòng đầu, và thêm một phím tắt mới mỗi khi bạn bắt gặp mình đang với tay tới con chuột.

| Hành động | Windows / Linux | macOS |
|-----------|-----------------|-------|
| Lưu | `Ctrl + S` | `Cmd + S` |
| Undo / Redo | `Ctrl + Z` / `Ctrl + Y` | `Cmd + Z` / `Cmd + Shift + Z` |
| Command Palette | `Ctrl + Shift + P` | `Cmd + Shift + P` |
| Quick Open (đi tới file) | `Ctrl + P` | `Cmd + P` |
| Bật / tắt terminal | ``Ctrl + ` `` | ``Ctrl + ` `` |
| Bật / tắt Side Bar | `Ctrl + B` | `Cmd + B` |
| Tìm / Thay thế | `Ctrl + F` / `Ctrl + H` | `Cmd + F` / `Cmd + Option + F` |
| Tìm trong tất cả file | `Ctrl + Shift + F` | `Cmd + Shift + F` |
| Format Document | `Shift + Alt + F` | `Shift + Option + F` |
| Comment hoặc bỏ comment một dòng | `Ctrl + /` | `Cmd + /` |
| Di chuyển dòng lên hoặc xuống | `Alt + ↑` / `Alt + ↓` | `Option + ↑` / `Option + ↓` |
| Thêm một con trỏ | `Alt + Click` | `Option + Click` |
| Chọn lần xuất hiện kế tiếp | `Ctrl + D` | `Cmd + D` |
| Split Editor | `Ctrl + \` | `Cmd + \` |
| Phóng to / thu nhỏ | `Ctrl + =` / `Ctrl + -` | `Cmd + =` / `Cmd + -` |
| Đóng tab | `Ctrl + W` | `Cmd + W` |
| Mở Settings | `Ctrl + ,` | `Cmd + ,` |

### Khi có trục trặc

Người mới nào cũng vấp phải cùng một số ít vấn đề. Hãy tìm triệu chứng của bạn ở cột bên trái, rồi kiểm tra nguyên nhân dễ gặp trước khi thử cách sửa.

| Triệu chứng | Nguyên nhân dễ gặp | Cách sửa |
|-------------|--------------------|----------|
| Bấm đúp vào trang thì Notepad mở ra, hoặc trình duyệt hiện code của bạn dưới dạng chữ | File thật ra là `index.html.txt` (thường do tạo bằng Notepad) | Bật hiển thị đuôi file (Mục 5) và đổi tên file thành `index.html` |
| Bạn đã sửa file nhưng trình duyệt vẫn hiện trang cũ | File chưa được lưu (còn chấm tròn trên tab), hoặc bạn chưa tải lại | Nhấn `Ctrl + S`, rồi tải lại; hoặc dùng Auto Save và Live Server |
| Đã lưu và tải lại, vẫn là trang cũ | Tab trình duyệt đang hiện một bản sao khác của file | So đường dẫn trên thanh địa chỉ với đường dẫn trong VS Code; mở lại trang từ Explorer |
| Explorer không hiện thư mục nào, và "Open with Live Server" báo lỗi | Bạn đã mở một file lẻ thay vì mở thư mục | *File → Open Folder…* và chọn `my-first-site` |
| Terminal báo `code` is not recognized (macOS: `command not found: code`) | VS Code chưa nằm trong PATH, hoặc terminal được mở trước khi cài | Đóng và mở lại terminal; trên Windows cài lại với "Add to PATH"; trên macOS chạy Shell Command ở Mục 9 |
| Có dải thông báo "Restricted Mode"; extension không chạy | Bạn đã trả lời "No" ở câu hỏi tin cậy | Bấm vào dải thông báo, chọn **Manage**, rồi **Trust** (chỉ với thư mục bạn biết rõ) |
| File không có màu và không có gợi ý | Language mode (chế độ ngôn ngữ) bị sai, ví dụ Plain Text | Bấm vào tên ngôn ngữ ở đầu phải Status Bar và chọn HTML; kiểm tra cả đuôi file |
| Gõ tiếng Việt (Telex trong Unikey và các bộ gõ tương tự) ra chữ bị lặp hoặc lộn xộn | Bộ gõ và danh sách gợi ý cùng phản ứng với một lần gõ phím | Chuyển bộ gõ sang tiếng Anh khi gõ code; nhấn Esc để đóng danh sách trước khi gõ chữ tiếng Việt |

Một quy tắc chung cho tất cả các trường hợp trên: hãy đọc cái tab. Tên trên tab, chấm tròn, và ngôn ngữ hiện ở Status Bar trả lời phần lớn câu hỏi của người mới trước khi bạn cần hỏi ai.

Nếu tất cả những cách trên đều không giúp được, hãy đóng VS Code rồi mở lại thư mục; khởi động lại xử lý được nhiều trục trặc kỳ lạ hơn bạn nghĩ. Khi nhờ đồng nghiệp giúp, hãy gửi ảnh chụp cả cửa sổ, vì cái tab, Explorer và Status Bar thường cho thấy nguyên nhân.

---

## 11. Tóm tắt

- Code là văn bản thuần. Phần mềm soạn thảo như Word thêm định dạng ẩn và tự đổi ký tự, nên không dùng để viết code được.
- Text editor chỉ gõ và lưu; code editor hiểu code; IDE gói một editor cùng các công cụ nặng cho một loại công việc.
- VS Code là code editor miễn phí của Microsoft, lớn dần nhờ extension. Nó là sản phẩm khác với Visual Studio.
- Cài từ trang chính thức, và trên Windows giữ nguyên dấu tick ở "Add to PATH" cùng các tuỳ chọn "Open with Code".
- Cửa sổ có năm khu vực: Activity Bar, Side Bar, vùng editor với các tab, Panel và Status Bar.
- Luôn mở thư mục dự án, đừng mở một file lẻ. Để ý chấm tròn trên tab: nó nghĩa là có thay đổi chưa lưu.
- Đuôi file như `.html` quyết định file được xử lý thế nào, nên hãy bật hiển thị đuôi file trong hệ điều hành.
- Emmet bung `!` thành boilerplate của một trang, và Live Server tải lại trình duyệt mỗi lần lưu.
- IntelliSense, squiggle, Format Document, tìm kiếm và Command Palette giúp tiết kiệm thời gian và tránh lỗi.
- Cài ít extension thôi, và kiểm tra publisher, lượt cài và đánh giá trước.
- Integrated terminal mở ngay trong thư mục dự án. Settings được lưu dưới dạng văn bản thuần trong `settings.json`.

### Thuật ngữ chính

| Thuật ngữ | Nghĩa dễ hiểu |
|-----------|---------------|
| Plain text (văn bản thuần) | File chỉ chứa ký tự, không có định dạng |
| Code editor | Trình soạn thảo nhanh, hiểu code (VS Code) |
| IDE | Editor gói kèm các công cụ nặng như debugger |
| Workspace Trust | Câu hỏi liệu VS Code có được chạy những thứ trong một thư mục hay không |
| Activity Bar / Side Bar | Dải icon bên trái / khung nhìn mà nó mở ra |
| Explorer | View liệt kê các file của thư mục đang mở |
| Panel | Khu vực dưới editor: Terminal, Problems, Output |
| Status Bar | Dòng dưới cùng với thông tin về file hiện tại |
| File extension (đuôi file) | Phần cuối của tên file, ví dụ `.html` |
| Emmet | Các từ viết tắt ngắn được bung thành HTML |
| Boilerplate | Code khởi đầu chuẩn mà file nào thuộc loại đó cũng cần |
| IntelliSense | Tự hoàn thành kèm giải thích ngắn |
| Squiggle | Đường gạch chân lượn sóng đánh dấu lỗi hoặc cảnh báo |
| Command Palette | Ô tìm kiếm cho mọi lệnh trong VS Code |
| Extension (VS Code) | Phần bổ sung cài từ Marketplace |
| Live Server / auto-reload | Server chạy trên máy, tự tải lại trang khi bạn lưu |
| Integrated terminal | Cửa sổ gõ lệnh có sẵn trong VS Code |
| settings.json | File văn bản thuần lưu các thiết lập của bạn |

**Bài tiếp theo:** HTML Cơ Bản. Hãy giữ lại thư mục `my-first-site`: bạn sẽ mở lại chính file `index.html` đó và học xem từng dòng của nó có nghĩa gì.
