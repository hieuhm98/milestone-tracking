# Flowchart

## 1. Flowchart là gì?

**Ví dụ so sánh:** hãy nghĩ đến tờ hướng dẫn lắp ráp đi kèm một chiếc kệ sách tự lắp. Bạn không nhận được một bài văn dài — bạn nhận được các hình vẽ đánh số: "làm bước này, rồi bước này; nếu có chi tiết B thì gắn vào đây". Flowchart cũng y như vậy, nhưng dùng cho bất kỳ quy trình nào: một bức hình gồm các bước nối với nhau bằng mũi tên, ai cũng có thể dò theo bằng ngón tay.

**Flowchart (lưu đồ)** là công cụ trực quan hóa quy trình, luồng xử lý hoặc thuật toán bằng các ký hiệu chuẩn và mũi tên kết nối.

Có ba từ trong câu trên đáng giải thích kỹ:

- **Quy trình (process)** là bất kỳ chuỗi bước nào biến một tình huống ban đầu thành một kết quả — duyệt đơn nghỉ phép, tiếp nhận nhân viên mới, hoàn tiền cho khách.
- **Luồng xử lý (processing flow)** là con đường mà công việc hoặc dữ liệu đi qua trong một hệ thống — ví dụ, ứng dụng làm gì sau khi bạn bấm "Thanh toán".
- **Thuật toán (algorithm)** đơn giản là một công thức từng bước thật chính xác để giải quyết một vấn đề — chính xác đến mức máy tính có thể làm theo.

Flowchart giúp:
- Hiểu và giao tiếp quy trình nghiệp vụ.
- Phát hiện bước thừa, điểm tắc nghẽn.
- Tài liệu hóa quy trình.
- Mô tả logic cho developer.

### Vì sao một bức hình tốt hơn một đoạn văn

Hãy đọc câu này: "Nếu khách là thành viên và đơn hàng trên 500.000đ thì giảm 10%, trừ khi đã dùng voucher, khi đó áp dụng mức giảm nào lớn hơn." Giờ thử giải thích lại cho đồng nghiệp. Phần lớn mọi người sẽ bị rối. Vẽ thành flowchart, quy tắc đó chỉ còn ba hình thoi và vài hình chữ nhật — và trường hợp bị thiếu (nếu khách *không* phải thành viên thì sao?) lộ ra ngay, vì có một mũi tên không biết đi đâu.

Đó chính là "siêu năng lực" của flowchart: **nó làm lỗ hổng hiện ra**. Văn bản cho phép bạn bỏ sót một trường hợp mà không hề nhận ra; sơ đồ thì không.

### Ai dùng flowchart trong công việc?

- **BA (Business Analyst)** — người "phiên dịch" mong muốn của bên nghiệp vụ thành yêu cầu cho đội IT — vẽ flowchart để thống nhất "hiện tại đang làm thế nào" và "sau này nên làm thế nào".
- **Developer** đọc flowchart để hiểu logic và các điều kiện trước khi viết code.
- **Tester** biến mỗi đường đi trong sơ đồ thành một test case.
- **Quản lý và nhân viên vận hành** dùng flowchart để đào tạo và làm quy trình chuẩn ("làm gì khi khách khiếu nại").

> **Hiểu lầm thường gặp:** "Flowchart chỉ dành cho lập trình viên." Thực tế, phần lớn flowchart trong công ty mô tả công việc nghiệp vụ — phê duyệt, bàn giao, khiếu nại — và không hề có dòng code nào.

---

## 2. Ký hiệu chuẩn (ISO 5807)

**Ví dụ so sánh:** biển báo giao thông. Biển bát giác màu đỏ nghĩa là "dừng lại" ở hầu hết các nước, nên tài xế không cần đọc chữ. Ký hiệu flowchart cũng vậy: **hình dạng** cho bạn biết đây là loại bước gì trước cả khi đọc chữ bên trong.

Các hình này đến từ một tiêu chuẩn quốc tế tên là **ISO 5807** (tiêu chuẩn đơn giản là một bộ quy tắc được thống nhất và công bố, để mọi người vẽ giống nhau).

| Ký hiệu | Hình dạng | Ý nghĩa |
|---------|-----------|---------|
| **Terminal** | Hình oval/tròn | Điểm bắt đầu hoặc kết thúc |
| **Process** | Hình chữ nhật | Bước xử lý, hành động |
| **Decision** | Hình thoi | Điểm quyết định (Yes/No, If/Else) |
| **Input/Output** | Hình bình hành | Nhập/xuất dữ liệu |
| **Connector** | Hình tròn nhỏ | Kết nối giữa các phần |
| **Arrow** | Mũi tên | Hướng đi của luồng |
| **Database** | Hình trụ | Lưu trữ dữ liệu |
| **Document** | Hình chữ nhật + sóng | Tài liệu, báo cáo |

### Giải thích từng ký hiệu bằng lời thường

- **Terminal (hình oval):** "Bắt đầu" và "Kết thúc" của câu chuyện. Mỗi flowchart có đúng một điểm Bắt đầu và ít nhất một điểm Kết thúc.
- **Process (hình chữ nhật):** một việc được *làm* — "Tính tổng tiền", "Gửi email", "Quản lý ký đơn". Hãy dùng động từ.
- **Decision (hình thoi):** một câu hỏi có số câu trả lời cố định, thường là Có/Không. Luồng sẽ tách nhánh ở đây. Câu hỏi được ghi bên trong: "Còn hàng?"
- **Input/Output (hình bình hành):** thông tin đi vào hoặc đi ra — người dùng gõ mật khẩu, màn hình hiện thông báo, cây ATM in hóa đơn.
- **Connector (hình tròn nhỏ):** dấu "xem tiếp tại A". Khi sơ đồ quá lớn so với một trang, bạn đặt vòng tròn **A** ở cuối trang 1 và vòng tròn **A** ở đầu trang 2.
- **Mũi tên (Arrow):** thể hiện thứ tự. Không có mũi tên thì các hình chỉ là một danh sách rời rạc.
- **Database (hình trụ):** dữ liệu được lưu vào hoặc đọc ra từ kho lưu trữ — "Lưu đơn hàng vào database".
- **Document (hình chữ nhật đáy lượn sóng):** một giấy tờ hoặc file được tạo ra — hóa đơn, báo cáo, hợp đồng.

### Các hình trông như thế nào khi vẽ bằng ký tự

Nhiều ví dụ trong bài này được vẽ bằng ký tự thường. Đây là bảng chú thích:

```text
( Bắt đầu )      Terminal  — hình oval
[ Làm X ]        Process   — hình chữ nhật
◇ Câu hỏi? ◇     Decision  — hình thoi
/ Nhập liệu /    Input/Output — hình bình hành
[( Database )]   Database  — hình trụ
(A)              Connector — hình tròn nhỏ
──▶  │  ▼        Mũi tên
```

> **Hiểu lầm thường gặp:** "Màu sắc mang ý nghĩa." Trong flowchart chuẩn, chỉ **hình dạng** là quan trọng. Tô màu cho dễ nhìn thì được, nhưng người đọc phải hiểu được sơ đồ ngay cả khi in đen trắng.

---

## 3. Đọc flowchart: ví dụ đời thường

Cách nhanh nhất để nhớ các ký hiệu là dò theo vài sơ đồ về những việc bạn đã quen. Đặt ngón tay lên **Bắt đầu** và đi theo mũi tên.

### Ví dụ 1: Pha một ly cà phê phin

```text
          ( Bắt đầu )
              │
              ▼
       [ Đun nước sôi ]
              │
              ▼
   [ Cho cà phê vào phin ]
              │
              ▼
   [ Rót nước sôi, chờ 4 phút ]
              │
              ▼
     ◇ Uống sữa không? ◇ ──Không──┐
              │ Có                │
              ▼                   │
     [ Thêm sữa đặc ]             │
              │                   │
              ▼                   │
     [ Khuấy đều và dùng ] ◀──────┘
              │
              ▼
          ( Kết thúc )
```

Điều cần để ý:

1. Sơ đồ bắt đầu và kết thúc bằng hình oval.
2. Mỗi hình chữ nhật là một hành động, viết bằng động từ.
3. Hình thoi hỏi đúng một câu và có **hai** lối ra — Có và Không. Cả hai lối ra cuối cùng đều tới Kết thúc. Không ai bị bỏ lại đứng trong bếp mà không biết làm gì tiếp.

### Ví dụ 2: Rút tiền ở cây ATM

```text
            ( Bắt đầu )
                │
                ▼
           / Đưa thẻ vào /
                │
                ▼
           / Nhập mã PIN /
                │
                ▼
       ◇ PIN đúng? ◇ ──Không──▶ / Báo "Sai PIN" / ──▶ [ Trả thẻ ] ──▶ ( Kết thúc )
                │ Có
                ▼
          / Nhập số tiền /
                │
                ▼
     ◇ Đủ số dư? ◇ ──Không──▶ / Báo "Số dư không đủ" / ──▶ [ Trả thẻ ] ──▶ ( Kết thúc )
                │ Có
                ▼
  [ Trừ tiền ] ──▶ [( Database tài khoản ngân hàng )]
                │
                ▼
      / Nhả tiền và trả thẻ /
                │
                ▼
            ( Kết thúc )
```

Điều cần để ý:

- **Hình bình hành** được dùng ở mọi chỗ thông tin đi qua lại giữa bạn và cái máy: bạn gõ PIN (input), màn hình hiện thông báo (output), máy nhả tiền (output).
- **Hình trụ** cho thấy số dư được lưu trong database của ngân hàng, và bước "Trừ tiền" cập nhật nó.
- Có **ba** điểm Kết thúc. Điều này hoàn toàn được phép — quan trọng là mọi đường đi đều kết thúc ở đâu đó.

> **Tự thử:** chọn một việc bạn làm mỗi ngày — khóa cửa nhà, thanh toán hóa đơn trên app ngân hàng — và phác nó ra giấy chỉ bằng hình oval, chữ nhật, hình thoi và mũi tên. Sau đó tự hỏi: "Mỗi hình thoi đã có nhánh Có và Không chưa? Mọi đường đi có tới Kết thúc không?" Rất có thể bạn sẽ phát hiện ít nhất một trường hợp mình quên.

---

## 4. Quy tắc vẽ Flowchart

1. **Bắt đầu và kết thúc** bằng hình oval (Terminal).
2. **Mũi tên** chỉ hướng đi của luồng, thường từ trên xuống hoặc trái sang phải.
3. **Decision** phải có ít nhất 2 nhánh ra (Yes/No hoặc True/False).
4. **Mỗi bước** chỉ có một mục đích rõ ràng.
5. **Tránh chéo nhau** giữa các đường kết nối.

### Giải thích các quy tắc

- **Mọi nhánh đều phải dẫn tới Kết thúc.** Đây là điều quan trọng nhất cần kiểm tra. Nếu nhánh "Không" của một quyết định dừng lại lơ lửng, người đọc — và sau này là developer — phải tự đoán chuyện gì xảy ra. Trong dự án thật, bug sinh ra chính từ những chỗ này.
- **Mỗi hình một mục đích.** "Kiểm tra tồn kho và gửi email" là hai bước. Hãy tách ra, vì mỗi bước có thể lỗi riêng.
- **Ghi nhãn cho mọi mũi tên đi ra từ hình thoi** (Có/Không, hoặc điều kiện như "> 500k").
- **Trong hình thoi hãy viết câu hỏi, không viết câu khẳng định:** "Đã thanh toán?" thay vì "Thanh toán".
- **Dùng connector (A, B, C…) khi sơ đồ quá lớn so với một trang**, thay vì vẽ những mũi tên dài ngoằn ngoèo khắp tờ giấy.
- **Chọn mức chi tiết phù hợp.** Với quản lý, một sơ đồ tổng quan 8–10 hình là đủ. Với developer, sơ đồ phải đủ chi tiết để họ hiểu mọi điều kiện mà không phải đoán — nhưng không cần mô tả đến từng dòng code.

### Vòng lặp: quay lại một bước trước đó

**Vòng lặp (loop)** nghĩa là "lặp lại một số bước cho đến khi một điều kiện thay đổi". Không có ký hiệu vòng lặp riêng: bạn vẽ nó bằng **một mũi tên đi từ hình thoi quay ngược về một bước phía trước**.

Ví dụ kinh điển — **đăng nhập, sai tối đa 3 lần**:

```text
               ( Bắt đầu )
                   │
                   ▼
          [ Đặt số lần sai = 0 ]
                   │
                   ▼
    ┌──▶ / Nhập tên đăng nhập + mật khẩu /
    │              │
    │              ▼
    │      ◇ Đúng? ◇ ──Có──▶ [ Mở trang chủ ] ──▶ ( Kết thúc )
    │              │ Không
    │              ▼
    │    [ Số lần sai = số lần sai + 1 ]
    │              │
    │              ▼
    │     ◇ Số lần sai < 3? ◇ ──Không──▶ [ Khóa tài khoản ] ──▶ / Báo "Tài khoản bị khóa" / ──▶ ( Kết thúc )
    │              │ Có
    │              ▼
    └──── / Báo "Sai mật khẩu, thử lại" /
```

Đi qua từng bước:

1. Bộ đếm bắt đầu từ 0.
2. Người dùng gõ sai mật khẩu → bộ đếm thành 1 → 1 < 3, nên báo "thử lại" và quay vòng lại.
3. Sai tiếp → 2 → vẫn < 3 → quay lại.
4. Sai lần thứ ba → 3 → **không** còn < 3 → tài khoản bị khóa và luồng kết thúc.

Để ý rằng vòng lặp chắc chắn sẽ dừng, vì bộ đếm tăng sau mỗi lần. Một vòng lặp không có lối thoát được gọi là **vòng lặp vô hạn (infinite loop)** — một loại bug kinh điển.

### Ví dụ thực tế trong công việc

Tester nhận sơ đồ này và viết một test case **cho mỗi đường đi**: "đúng ngay lần đầu", "sai một lần rồi đúng", "sai hai lần rồi đúng", "sai ba lần → bị khóa". Nếu sơ đồ quên nhánh "khóa tài khoản", tester sẽ đặt câu hỏi trong ticket: *"Sau lần sai thứ 3 thì chuyện gì xảy ra? Spec không ghi."* Chỉ một câu hỏi đó có thể tiết kiệm nhiều ngày làm lại.

---

## 5. Ví dụ: Quy trình đặt hàng online

Giờ là một quy trình nghiệp vụ bạn đã từng trải qua với vai trò khách hàng: mua hàng online.

```text
[Bắt đầu]
    ↓
[Khách hàng chọn sản phẩm]
    ↓
[Thêm vào giỏ hàng]
    ↓
◆ Đăng nhập chưa? ──Không──→ [Yêu cầu đăng nhập] ──→ ◆ Đăng nhập thành công?
    ↓ Có                                               ↓ Không → [Thông báo lỗi] → [Kết thúc]
[Nhập địa chỉ giao hàng]                               ↓ Có
    ↓                                              [Nhập địa chỉ giao hàng]
[Chọn phương thức thanh toán]
    ↓
◆ Đủ hàng trong kho?
    ↓ Có                  ↓ Không
[Xử lý đơn hàng]          [Thông báo hết hàng]
    ↓                         ↓
[Gửi email xác nhận]      [Kết thúc]
    ↓
[Kết thúc]
```

### Đọc từng bước

1. Khách chọn sản phẩm và thêm vào giỏ (hai hình xử lý).
2. **Quyết định — "Đăng nhập chưa?"** Nếu chưa, hệ thống yêu cầu đăng nhập. Một quyết định thứ hai kiểm tra đăng nhập có thành công không; nếu thất bại, hiện thông báo lỗi và nhánh đó kết thúc.
3. Khi đã đăng nhập, khách nhập địa chỉ và chọn cách thanh toán.
4. **Quyết định — "Đủ hàng trong kho?"** Hình thoi này là nơi chứa quy tắc nghiệp vụ. Có → xử lý đơn và gửi email xác nhận. Không → báo cho khách là hết hàng.
5. Mọi đường đi đều kết thúc tại một Terminal Kết thúc.

### Những câu hỏi BA sẽ đặt ra với sơ đồ này

Vẽ sơ đồ mới là một nửa công việc; đặt câu hỏi cho nó là nửa còn lại:

- Nếu thanh toán thất bại thì sao? (Hiện chưa có hình thoi "Thanh toán thành công?".)
- Nếu hết hàng, có cho khách đăng ký chờ hàng hoặc gợi ý sản phẩm tương tự không?
- Email xác nhận được gửi trước hay sau khi tiền đã được trừ?

Mỗi câu hỏi sẽ trở thành một hình mới trong sơ đồ hoặc một dòng trong tài liệu yêu cầu.

---

## 6. Swimlane Flowchart

**Ví dụ so sánh:** một bể bơi chia thành nhiều làn. Mỗi vận động viên bơi trong làn của mình, nên nhìn qua là biết ai đang ở đâu. Trong **swimlane flowchart**, mỗi làn thuộc về một người, một nhóm hoặc một hệ thống, và mỗi hình được đặt trong làn của người thực hiện bước đó.

Khi quy trình có nhiều người/bộ phận tham gia, dùng **Swimlane** (làn bơi) để phân chia rõ trách nhiệm:

```text
│ Khách hàng    │ Nhân viên sale  │ Hệ thống        │
│               │                 │                 │
│ Đặt hàng ─────┼─────────────────┼─▶ Nhận order    │
│               │                 │        │        │
│               │  Duyệt đơn     ◀┼────────┘        │
│               │        │        │                 │
│               │        └────────┼─▶ Gửi email     │
│               │                 │        │        │
│ Nhận xác     ◀┼─────────────────┼────────┘        │
│ nhận          │                 │                 │
```

Swimlane diagram rõ hơn ai làm gì, tránh nhầm lẫn trách nhiệm.

### Vì sao các làn lại quan trọng

- **Thấy rõ các điểm bàn giao.** Mỗi lần mũi tên vượt qua vạch chia làn, công việc được chuyển từ người này sang người khác. Bàn giao chính là nơi xảy ra chậm trễ và kiểu "tôi tưởng anh làm việc đó".
- **Trách nhiệm rõ ràng.** Nếu một hình nằm trong làn Sale, Sale chịu trách nhiệm — khỏi tranh cãi trong cuộc họp.
- **Dễ phát hiện thời gian chờ.** Nếu một việc nằm ở làn "Quản lý" suốt hai ngày, đó chính là điểm tắc nghẽn.

Làn có thể dọc (cột, như trên) hoặc ngang (hàng). Hãy dùng swimlane khi quy trình đi qua nhiều vai trò; với quy trình chỉ một người làm, flowchart thường là đủ.

---

## 7. Tools vẽ Flowchart

- **draw.io / diagrams.net**: miễn phí, dùng trên web.
- **Lucidchart**: trả phí, nhiều tính năng.
- **Figma**: thiết kế kết hợp diagram.
- **Microsoft Visio**: phổ biến trong doanh nghiệp.
- **Mermaid**: viết flowchart bằng code (markdown-like).

### Người mới nên dùng công cụ nào?

Hãy bắt đầu với **draw.io** (còn gọi là diagrams.net): miễn phí, chạy trên trình duyệt, không cần tài khoản, và có sẵn đủ các hình chuẩn trong mục "Flowchart" ở bên trái. Lucidchart và Visio dùng tương tự nhưng phải trả phí; nhiều công ty đã mua sẵn bản quyền. **Mermaid** thì khác: thay vì kéo thả hình, bạn gõ một đoạn mô tả ngắn bằng chữ và công cụ tự vẽ sơ đồ. Developer thích Mermaid vì sơ đồ có thể nằm ngay cạnh code và tài liệu.

Một ví dụ Mermaid nhỏ (sơ đồ pha cà phê ở trên):

```text
flowchart TD
    A([Bắt đầu]) --> B[Đun nước sôi]
    B --> C{Uống sữa không?}
    C -- Có --> D[Thêm sữa đặc]
    C -- Không --> E[Khuấy đều và dùng]
    D --> E
    E --> F([Kết thúc])
```

`([ ])` vẽ hình oval, `[ ]` vẽ hình chữ nhật và `{ }` vẽ hình thoi.

> **Tự thử:** mở `https://app.diagrams.net` trên bất kỳ trình duyệt nào (Windows hoặc macOS), chọn "Device" khi được hỏi lưu ở đâu, rồi tạo một sơ đồ trống. Ở khung bên trái, tìm "flowchart" và kéo vào một hình oval, một hình chữ nhật và một hình thoi. Rê chuột lên một hình và kéo một trong các mũi tên nhỏ màu xanh để nối nó với hình tiếp theo. Vẽ lại ví dụ ATM ở Mục 3 — mất khoảng 10 phút.

> **Tự thử (Mermaid):** mở `https://mermaid.live`, xóa đoạn mẫu, rồi dán ví dụ Mermaid ở trên vào. Sơ đồ hiện ra ngay ở bên phải. Đổi "Uống sữa không?" thành "Uống đường không?" và xem nó tự cập nhật.

---

## 8. Flowchart vs BPMN

**Ví dụ so sánh:** một tấm bản đồ vẽ tay so với bản đồ chính thức của thành phố. Bản đồ vẽ tay thì nhanh và ai cũng đọc được. Bản đồ chính thức có bảng chú giải với hàng chục ký hiệu chuẩn — trạm xe buýt, đường một chiều, bệnh viện — và đủ chính xác để dân chuyên nghiệp dùng lập kế hoạch.

**BPMN (Business Process Model and Notation)** chính là "bản đồ chính thức" cho quy trình nghiệp vụ. Nó được duy trì bởi một tổ chức tiêu chuẩn tên là **OMG (Object Management Group)**.

| | Flowchart | BPMN |
|--|-----------|------|
| **Mục đích** | General purpose | Business Process cụ thể |
| **Độ phức tạp** | Đơn giản | Phức tạp, chi tiết hơn |
| **Người dùng** | Mọi người | BA, Process engineer |
| **Chuẩn** | ISO 5807 | OMG BPMN 2.0 |

### BPMN có thêm gì

BPMN có một bộ ký hiệu phong phú và chuẩn hóa hơn cho những thứ mà flowchart đơn giản khó diễn đạt rõ:

- **Sự kiện (event)** (vẽ bằng hình tròn) — "có tin nhắn đến", "hẹn giờ sau 2 ngày", "xảy ra lỗi".
- **Thông điệp (message)** giữa các tổ chức — khách hàng gửi biểu mẫu cho ngân hàng.
- **Quy trình con (sub-process)** — một hình chứa cả một quy trình nhỏ hơn bên trong.
- **Gateway** (hình thoi có ký hiệu bên trong) — bao gồm cả "làm các bước này song song".

Một số công cụ còn có thể chạy sơ đồ BPMN như một quy trình tự động.

### Nên dùng loại nào?

- Để giải thích ý tưởng trong cuộc họp, đào tạo nhân viên mới hoặc mô tả logic của một màn hình → **flowchart**.
- Để mô hình hóa chính xác một quy trình nghiệp vụ phức tạp, liên phòng ban (có hẹn giờ, thông điệp, công việc song song) → **BPMN**.

Nhiều BA bắt đầu bằng flowchart để thống nhất ý tưởng, rồi chuyển sang BPMN nếu quy trình cần được mô hình hóa chính thức.

---

## 9. Tóm tắt

- **Oval**: bắt đầu/kết thúc.
- **Chữ nhật**: bước xử lý.
- **Hình thoi**: quyết định (decision).
- **Bình hành**: input/output.
- **Hình trụ**: database; **hình tròn nhỏ**: connector nối sang trang khác.
- **Swimlane**: phân chia trách nhiệm theo vai trò.
- Mỗi quyết định cần ít nhất hai nhánh có ghi nhãn, và **mọi nhánh đều phải tới Kết thúc**.
- **Vòng lặp** là mũi tên từ hình thoi quay về một bước trước đó — hãy chắc chắn nó có thể dừng.
- Bắt đầu với draw.io; dùng Mermaid nếu thích viết bằng chữ; dùng BPMN cho quy trình nghiệp vụ phức tạp, cần chuẩn hóa.
- Flowchart là công cụ giao tiếp — vẽ đủ chi tiết để không bị hiểu sai.

### Thuật ngữ chính

| Thuật ngữ | Nghĩa dễ hiểu |
|-----------|---------------|
| Flowchart | Bức hình mô tả quy trình: hình dạng cho các bước, mũi tên cho thứ tự |
| Process (quy trình) | Một chuỗi bước tạo ra một kết quả |
| Algorithm (thuật toán) | Công thức từng bước chính xác mà máy tính có thể làm theo |
| Terminal | Hình oval đánh dấu Bắt đầu hoặc Kết thúc |
| Decision | Hình thoi chứa câu hỏi; luồng tách nhánh theo câu trả lời |
| Input/Output | Hình bình hành: thông tin đi vào hoặc đi ra |
| Connector | Hình tròn nhỏ nối các phần của sơ đồ qua nhiều trang |
| Loop (vòng lặp) | Lặp lại các bước bằng mũi tên quay về bước trước |
| Swimlane | Các làn cho thấy người hoặc nhóm nào làm từng bước |
| BPMN | Ký hiệu chuẩn, chính thức và phong phú hơn cho quy trình nghiệp vụ |
