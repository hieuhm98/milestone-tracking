# UML cơ bản

## 1. UML là gì?

**Ví dụ so sánh:** trước khi xây một ngôi nhà, kiến trúc sư vẽ nhiều bản vẽ: bản vẽ mặt bằng (có những phòng nào), bản vẽ điện (dây đi thế nào), bản vẽ cấp thoát nước (nước chảy ra sao). Mỗi bản vẽ thể hiện *cùng một ngôi nhà* từ một góc nhìn khác, và thợ xây ở bất kỳ đâu cũng đọc được vì chúng dùng ký hiệu chuẩn. UML chính là bộ bản vẽ đó dành cho phần mềm.

**UML** (Unified Modeling Language) là ngôn ngữ mô hình hóa chuẩn để mô tả thiết kế hệ thống phần mềm bằng sơ đồ trực quan.

Hãy tách từng chữ ra:

- **Mô hình hóa (modeling)** nghĩa là làm một bức tranh đơn giản hóa của thứ có thật để mọi người cùng bàn bạc — giống mô hình thu nhỏ của một tòa nhà.
- **Ngôn ngữ (language)** ở đây không phải ngôn ngữ lập trình. Đây là ngôn ngữ *hình ảnh*: một bộ hình, đường nối và nhãn đã được thống nhất, mỗi thứ có ý nghĩa chính xác.
- **Thống nhất (unified)** vì vào thập niên 1990, ba phương pháp vẽ thiết kế phần mềm nổi tiếng đã được gộp lại thành một. Ngày nay UML được duy trì bởi một tổ chức tiêu chuẩn tên là **OMG (Object Management Group)**.

UML có 14 loại diagram, nhưng BA/PM cần biết chủ yếu 3 loại sau.

### 14 loại, chia thành hai nhóm

Bạn sẽ không bao giờ cần thuộc lòng tất cả, nhưng nên biết hai nhóm lớn:

| Nhóm | Trả lời câu hỏi | Ví dụ |
|------|-----------------|-------|
| **Sơ đồ cấu trúc (structure)** (7) | "Hệ thống gồm những phần nào và chúng nối với nhau ra sao?" | Class, Object, Component, Deployment, Package… |
| **Sơ đồ hành vi (behaviour)** (7) | "Hệ thống *làm* gì, theo thứ tự nào?" | Use Case, Activity, State Machine, Sequence… |

Ba loại quan trọng nhất với **BA (Business Analyst — chuyên viên phân tích nghiệp vụ)** hoặc **PM (Project Manager — quản lý dự án)** đều là sơ đồ hành vi: **Use Case**, **Activity** và **Sequence**. Chúng ta cũng sẽ xem qua **Class diagram**, vì developer dùng nó liên tục và bạn sẽ gặp nó trong các cuộc họp.

### Ví dụ xuyên suốt: ứng dụng đặt đồ ăn

Để cho cụ thể, mọi sơ đồ trong bài này đều mô tả cùng một ứng dụng giả định tên **FoodNow** — giống các app giao đồ ăn trên điện thoại của bạn:

- **Khách hàng** xem các nhà hàng, thêm món vào giỏ, đặt hàng và thanh toán.
- **Nhà hàng** nhận đơn và nấu.
- **Tài xế** lấy đồ ăn và giao đi.
- Một **cổng thanh toán (payment gateway)** bên ngoài — dịch vụ thực sự trừ tiền thẻ hoặc ví điện tử — lo phần tiền.

Cùng một ứng dụng, bốn sơ đồ khác nhau — giống như ngôi nhà với bốn bản vẽ.

> **Hiểu lầm thường gặp:** "UML là code." Sơ đồ UML mô tả thiết kế; nó không chạy được. Một số công cụ có thể sinh ra khung code từ class diagram, nhưng với BA, UML là công cụ giao tiếp.

---

## 2. Use Case Diagram

**Ví dụ so sánh:** tấm bảng thực đơn ở nhà hàng. Nó không nói bếp nấu món nào ra sao — nó chỉ liệt kê bạn có thể gọi gì và dành cho ai (thực đơn trẻ em, thực đơn đồ uống). Use case diagram là "thực đơn" của một hệ thống: hệ thống cung cấp gì và cho ai.

**Mục đích**: mô tả hệ thống làm gì (chức năng) và ai sử dụng nó.

### Ký hiệu

| Ký hiệu | Mô tả |
|---------|-------|
| Hình người que (stick figure) | **Actor** — người dùng hoặc hệ thống bên ngoài |
| Hình oval | **Use Case** — chức năng của hệ thống |
| Hình chữ nhật | **System boundary** — ranh giới hệ thống |
| Đường liền | **Association** — actor sử dụng use case |
| `<<include>>` | Use case này bao gồm use case khác (bắt buộc) |
| `<<extend>>` | Use case này mở rộng use case khác (tùy chọn) |

### Các ký hiệu bằng lời thường

- **Actor** là một *vai trò*, không phải một người cụ thể. "Khách hàng" là một actor dù có mười người dùng hay mười triệu. Actor cũng có thể là một hệ thống khác — cổng thanh toán là một actor vì nó nằm *bên ngoài* ứng dụng của chúng ta và giao tiếp với nó.
- **Use case** là một mục tiêu mà actor đạt được nhờ hệ thống, viết theo dạng động từ + danh từ: "Đặt hàng", "Theo dõi giao hàng".
- **System boundary (ranh giới hệ thống)** là chiếc hộp bao quanh các use case. Thứ gì nằm trong là thứ chúng ta xây dựng; thứ gì nằm ngoài (các actor) thì không.
- **Association (liên kết)** là một đường thẳng nối actor với use case mà họ tham gia.

### Ví dụ: FoodNow

```text
                 ┌────────────── Ứng dụng FoodNow ──────────────┐
                 │                                              │
  Khách hàng ────┼──── (Tìm nhà hàng)                           │
     │           │                                              │
     ├───────────┼──── (Đặt hàng) ─ ─<<include>>─ ─▶ (Đăng nhập)│
     │           │          ▲                                   │
     │           │          ┆ <<extend>>                        │
     │           │    (Áp voucher)                              │
     │           │                                              │
     ├───────────┼──── (Thanh toán)─────────────────────────────┼──── Cổng thanh toán
     │           │                                              │
     └───────────┼──── (Theo dõi giao hàng)                     │
                 │                                              │
  Nhà hàng ──────┼──── (Xác nhận đơn)                           │
                 │                                              │
  Tài xế ────────┼──── (Giao đơn)                               │
                 └──────────────────────────────────────────────┘
```

### Include và extend — phần ai cũng hay nhầm

- **`<<include>>` = bắt buộc.** "Đặt hàng" *luôn luôn* cần "Đăng nhập" — không có tài khoản thì không đặt được. Mũi tên nét đứt đi **từ** use case chính **tới** use case được bao gồm. Dùng include để tách ra một bước mà nhiều use case cùng dùng (đăng nhập cũng cần cho "Theo dõi giao hàng").
- **`<<extend>>` = tùy chọn, có điều kiện.** "Áp voucher" *đôi khi* bổ sung thêm hành vi cho "Đặt hàng" — chỉ khi khách có voucher. Mũi tên nét đứt đi **từ** phần mở rộng tùy chọn **tới** use case chính.

Mẹo nhớ nhanh: *include* giống phần cơm luôn đi kèm món ăn; *extend* giống quả trứng ốp la gọi thêm nếu muốn.

### Use case diagram KHÔNG thể hiện điều gì

Nó không cho thấy thứ tự các bước, các màn hình hay quy tắc nghiệp vụ bên trong "Đặt hàng". Nó chỉ trả lời **ai làm được gì**. Phần *làm thế nào* nằm trong bản mô tả use case bằng chữ, hoặc trong activity diagram (mục tiếp theo).

### Ví dụ thực tế trong công việc

Ở buổi kick-off dự án, BA chiếu sơ đồ này lên màn hình và hỏi khách hàng: "Trong hộp còn thiếu gì không? Tài xế có được hủy đơn không? Nhà hàng có được đổi giá không?" Mỗi câu "có" trở thành một hình oval mới; mỗi câu "chưa làm ở giai đoạn này" thì nằm ngoài hộp. Đó là cách **phạm vi (scope)** — cái gì thuộc và không thuộc dự án — được thống nhất.

---

## 3. Activity Diagram

**Ví dụ so sánh:** tấm thẻ công thức cho một bếp có nhiều người: "Thái rau — *trong lúc đó* một người khác đun nước — rồi trộn cả hai lại." Nó thể hiện các bước, các lựa chọn, và những việc diễn ra cùng lúc.

**Mục đích**: mô tả luồng hoạt động, quy trình từng bước — tương tự flowchart nhưng trong ngữ cảnh UML.

### Ký hiệu

| Ký hiệu | Mô tả |
|---------|-------|
| Hình tròn đặc | Initial node (bắt đầu) |
| Hình tròn đặc + vòng ngoài | Final node (kết thúc) |
| Hình chữ nhật bo góc | Activity (hành động) |
| Hình thoi | Decision/Merge node |
| Thanh đen ngang | Fork/Join (song song) |
| Swimlane | Phân chia theo vai trò |

- Hình thoi **decision** tách luồng theo một điều kiện ("Đã trả online?"); hình thoi **merge** gộp các nhánh thay thế lại với nhau.
- Thanh **fork** tách một luồng thành nhiều luồng chạy **cùng lúc**; thanh **join** chờ cho đến khi **tất cả** các luồng đó xong rồi mới đi tiếp.

### Ví dụ: chuyện gì xảy ra sau khi khách đặt một đơn FoodNow

```text
                    ●  bắt đầu
                    │
     [Khách hàng] ( Đặt hàng )
                    │
                    ▼
            ◇ Đã trả online? ◇
           Có │            │ Không
              │   [App] ( Ghi "thu tiền khi giao" )
              │            │
              └───▶ ◇ ◀────┘  merge
                    │
     ═══════════════╪═══════════════  fork
           │                 │
      [Nhà hàng]         [Tài xế]
     ( Nấu món )     ( Chạy tới nhà hàng )
           │                 │
     ═══════════════╪═══════════════  join
                    │
        [Tài xế] ( Giao đơn )
                    │
                    ◉  kết thúc
```

Cách đọc:

1. ● Luồng bắt đầu khi khách đặt hàng.
2. App kiểm tra: đã trả online chưa? Nếu chưa, đánh dấu đơn là thu tiền khi giao. Hình thoi merge gộp hai nhánh lại.
3. **Fork:** hai việc giờ diễn ra *song song* — nhà hàng nấu, và tài xế chạy tới nhà hàng. Không ai phải chờ ai mới bắt đầu.
4. **Join:** việc giao hàng chỉ bắt đầu khi **cả hai** đã xong (món đã nấu xong *và* tài xế đã tới).
5. Tài xế giao đơn, và ◉ luồng kết thúc.

Các nhãn trong [ngoặc vuông] cho biết ai làm từng bước. Trong activity diagram thật, chúng được vẽ thành các cột gọi là **swimlane** (trong UML gọi là **partition**), và mỗi hành động nằm trong cột của người phụ trách.

### Điểm khác biệt với Flowchart
- Activity Diagram có **Fork/Join** để mô tả hoạt động song song.
- Tích hợp tốt hơn với các diagram UML khác.
- Dùng **swimlane** gọi là **partition** trong UML.

> **Hiểu lầm thường gặp:** "Fork nghĩa là lựa chọn, như ngã ba đường." Không — lựa chọn là *hình thoi decision* (chỉ đi một nhánh). *Thanh fork* nghĩa là **tất cả** các nhánh đi ra đều chạy cùng lúc.

---

## 4. Sequence Diagram

**Ví dụ so sánh:** kịch bản một vở kịch, viết theo dòng thời gian. Mỗi diễn viên đứng ở một chỗ riêng trên sân khấu; các câu thoại đi từ người này sang người kia, và thời gian chạy từ trên xuống dưới trang giấy. Bạn đọc được chính xác ai nói gì với ai, theo thứ tự nào.

**Mục đích**: mô tả **thứ tự** các tương tác giữa các đối tượng theo thời gian.

**Đối tượng (object)** ở đây đơn giản là một bên tham gia: một người, một ứng dụng, một server, một database, một dịch vụ bên ngoài.

### Ký hiệu

| Ký hiệu | Mô tả |
|---------|-------|
| Hình chữ nhật trên đỉnh | **Lifeline** — đối tượng/actor tham gia |
| Đường đứt dọc | **Lifeline** — tồn tại theo thời gian |
| Hình chữ nhật hẹp | **Activation box** — đang xử lý |
| Mũi tên liền | **Synchronous message** (gọi và chờ) |
| Mũi tên đứt | **Return message** (trả về) |
| Mũi tên mở | **Asynchronous message** (gọi không chờ) |

Bằng lời thường:

- **Synchronous message (thông điệp đồng bộ)** (nét liền, đầu mũi tên đặc): giống một cuộc gọi điện thoại — bạn hỏi và **chờ** trên máy để nghe câu trả lời.
- **Return message (thông điệp trả về)** (nét đứt): câu trả lời quay lại.
- **Asynchronous message (thông điệp bất đồng bộ)** (đầu mũi tên mở, dạng hai nét): giống gửi tin nhắn — bạn gửi đi rồi làm việc khác, không chờ.

### Ví dụ: thanh toán một đơn FoodNow

```text
Khách hàng     App FoodNow      Cổng thanh toán     Nhà hàng
   │                │                  │                 │
   │──Đặt hàng─────▶│                  │                 │
   │                │──Trừ 150k───────▶│                 │
   │                │                  │ (kiểm tra số dư)│
   │                │◀ ─ ─Thành công─ ─│                 │
   │                │──Đơn mới───────────────────────────▷  (async)
   │◀ ─ Đã xác nhận │                  │                 │
   │                │                  │                 │
```

Đọc từ trên xuống dưới:

1. Khách bấm "Đặt hàng".
2. App yêu cầu cổng thanh toán trừ 150.000đ và **chờ** (đồng bộ).
3. Cổng thanh toán trả lời "Thành công" (mũi tên trả về nét đứt).
4. App báo đơn mới cho nhà hàng **mà không chờ** nhà hàng trả lời (bất đồng bộ) — máy tính bảng ở nhà hàng sẽ đổ chuông khi nhận được.
5. App hiển thị "Đã xác nhận đơn" cho khách.

### Cùng ý tưởng đó bằng ngôn ngữ của developer: đăng nhập

Bạn sẽ thường gặp sequence diagram với các nhãn kỹ thuật. Đừng hoảng — khuôn mẫu vẫn y như vậy:

```text
Browser           Server               Database
  │                 │                      │
  │──POST /login───►│                      │
  │                 │──SELECT user────────►│
  │                 │◄──dữ liệu user───────│
  │                 │ (kiểm tra mật khẩu)  │
  │◄──200 + token───│                      │
  │                 │                      │
```

- `POST /login` = trình duyệt gửi tên đăng nhập và mật khẩu lên server.
- `SELECT user` = server hỏi database lấy bản ghi của người dùng đó.
- `200 + token` = "thành công", kèm một tấm thẻ thông hành số (token) chứng minh bạn đã đăng nhập cho các yêu cầu tiếp theo.

### Vì sao BA cần quan tâm

Sequence diagram là nơi các **vấn đề tích hợp** lộ ra: "Nếu cổng thanh toán không trả lời trong 30 giây thì sao? Hủy đơn hay thử lại?" Đặt câu hỏi đó trong buổi họp thiết kế rẻ hơn rất nhiều so với phát hiện ra khi hệ thống đã chạy thật.

---

## 5. Class Diagram

**Ví dụ so sánh:** một mẫu đơn trống so với một tờ đơn đã điền. Mẫu đơn ("Họ tên: ___, Điện thoại: ___") là một **class**. Mỗi bản đã điền ("Họ tên: Lan, Điện thoại: 0901…") là một **object (đối tượng)**. Class diagram cho thấy tất cả các "mẫu đơn" trong hệ thống và chúng liên quan với nhau thế nào.

**Mục đích**: mô tả **cấu trúc** của hệ thống — hệ thống lưu những loại thông tin (dữ liệu) nào và chúng nối với nhau ra sao. Đây là sơ đồ cấu trúc, khác với ba sơ đồ ở trên.

### Đọc một hộp class

Mỗi class là một hình chữ nhật có ba ngăn:

```text
┌──────────────────────┐
│        Order         │  ← tên class
├──────────────────────┤
│ id                   │
│ status               │  ← thuộc tính (dữ liệu nó chứa)
│ totalAmount          │
├──────────────────────┤
│ place()              │  ← thao tác (việc nó làm được)
│ cancel()             │
└──────────────────────┘
```

### Ví dụ: các class chính của FoodNow

```text
┌──────────┐ 1    đặt     0..* ┌───────┐ 1      1..* ┌───────────┐
│ Customer │───────────────────│ Order │◆────────────│ OrderItem │
└──────────┘                   └───────┘             └───────────┘
                                                           │ 0..*
                                                           │
                                                           │ 1
┌────────────┐ 1  cung cấp  0..* ┌──────┐                  │
│ Restaurant │───────────────────│ Dish │◀─────────────────┘
└────────────┘                   └──────┘
```

Cách đọc:

- Các **đường nối** là **association (liên kết)**: hai class có liên quan với nhau. Nhãn cho biết liên quan thế nào ("đặt", "cung cấp").
- **Các con số ở mỗi đầu** là **multiplicity (bội số)** — "bao nhiêu". `1` nghĩa là đúng một; `0..*` nghĩa là không hoặc nhiều; `1..*` nghĩa là ít nhất một. Vậy: một khách hàng đặt không hoặc nhiều đơn; mỗi đơn thuộc về đúng một khách hàng.
- **Hình thoi đặc** (◆) là **composition (quan hệ hợp thành)**: một đơn hàng *được tạo thành từ* các dòng món (order item), và nếu xóa đơn thì các dòng món cũng mất theo.
- Mỗi **OrderItem** liên kết tới một **Dish** (món ăn), ví dụ "2 × Phở bò".

Một ký hiệu khác bạn sẽ gặp: đường nối có **tam giác rỗng** nghĩa là **kế thừa (inheritance)** ("là một loại của") — ví dụ *CardPayment* (trả bằng thẻ) và *CashPayment* (trả tiền mặt) đều là một loại *Payment* (thanh toán).

### Vì sao BA nên đọc được class diagram

Thường bạn sẽ không phải vẽ class diagram — developer và kiến trúc sư làm việc đó. Nhưng đọc được nó giúp bạn kiểm tra quy tắc nghiệp vụ rất nhanh: "Khoan — một đơn có thể chứa món từ hai nhà hàng khác nhau à? Sơ đồ đang cho phép điều đó. Bên kinh doanh có muốn vậy không?" Chỉ một câu hỏi đó có thể tránh được một lần thiết kế lại tốn kém.

> **Tự thử:** mở `https://mermaid.live` trên trình duyệt (Windows hoặc macOS), xóa đoạn mẫu bên trái, rồi dán khối đầu tiên bên dưới vào. Một sequence diagram hiện ra bên phải: `->>` vẽ mũi tên gọi nét liền và `-->>` vẽ mũi tên trả về nét đứt. Sau đó thay toàn bộ bằng khối thứ hai, bạn sẽ có một class diagram nhỏ với multiplicity và hình thoi composition.

```text
sequenceDiagram
    actor C as Khách hàng
    participant A as App FoodNow
    participant P as Cổng thanh toán
    C->>A: Đặt hàng
    A->>P: Trừ 150k
    P-->>A: Thanh toán thành công
    A-->>C: Đã xác nhận đơn
```

```text
classDiagram
    Customer "1" --> "0..*" Order : đặt
    Order "1" *-- "1..*" OrderItem
```

---

## 6. Khi nào dùng loại diagram nào?

| Tình huống | Dùng diagram |
|-----------|--------------|
| Xác định chức năng hệ thống, ai dùng gì | Use Case Diagram |
| Mô tả quy trình nghiệp vụ step-by-step | Activity Diagram |
| Mô tả cách các component giao tiếp theo thời gian | Sequence Diagram |
| Thiết kế cấu trúc class/object | Class Diagram |
| Mô tả trạng thái của đối tượng | State Diagram |

### Cùng một ứng dụng, bốn câu hỏi

Hãy coi mỗi sơ đồ là câu trả lời cho một câu hỏi khác nhau về FoodNow:

| Câu hỏi | Sơ đồ | Ví dụ FoodNow |
|---------|-------|---------------|
| **Ai** làm được **gì**? | Use Case | Khách đặt hàng; tài xế giao đơn |
| Theo những **bước** nào, có những **lựa chọn** gì? | Activity | Đã trả online? → nấu và tìm tài xế song song |
| **Ai nói chuyện với ai**, theo **thứ tự** nào? | Sequence | App → cổng thanh toán → app → nhà hàng |
| Có những **dữ liệu** gì và chúng **liên kết** ra sao? | Class | Customer 1 — 0..* Order |
| Một thứ đi qua những **trạng thái** nào? | State | Đơn: Mới → Đang nấu → Đang giao → Đã giao (hoặc Đã hủy) |

**State diagram** (state machine — máy trạng thái) ở dòng cuối đáng được nhắc tới: nó thể hiện vòng đời của một thứ duy nhất — như một đơn hàng đi từ "Mới" tới "Đã giao" — và sự kiện nào chuyển nó từ trạng thái này sang trạng thái khác. Nó rất hữu ích khi bên kinh doanh cứ hỏi "đơn có được hủy *sau khi* tài xế đã lấy hàng không?"

---

## 7. Lưu ý thực tế cho BA/PM

- Dùng Use Case Diagram khi **kick-off dự án** — scope hệ thống.
- Dùng Activity Diagram khi **mô tả nghiệp vụ** — tương tự flowchart.
- Dùng Sequence Diagram khi **làm việc với developer** về API/integration.
- Không cần biết hết 14 loại — ba loại trên đủ cho 80% công việc BA.

### Thêm vài mẹo từ dự án thật

- **Chỉ vẽ thứ có ích.** Một sơ đồ đáng vẽ khi nó làm rõ được điều mà văn bản không làm được — một luồng phức tạp, một quy trình song song, một chuỗi các lần gọi giữa hệ thống. Đừng vẽ mọi loại sơ đồ chỉ "cho đủ bộ".
- **Chọn mức chi tiết phù hợp.** Use case diagram cho khách hàng nên vừa một màn hình. Sequence diagram cho developer có thể ghi cả tên API và các trường hợp lỗi.
- **Giúp người đọc chưa biết UML.** Khách hàng hiếm khi biết ký hiệu. Hãy thêm một bảng chú giải nhỏ (hình oval, mũi tên đứt, thanh ngang nghĩa là gì), giải thích mục đích của sơ đồ, và cùng nhau đi qua một ví dụ trước khi nhờ họ review.
- **Giữ sơ đồ khớp với yêu cầu.** Một sơ đồ lỗi thời còn tệ hơn không có, vì mọi người tin vào nó.
- **Công cụ:** draw.io / diagrams.net (miễn phí) và Lucidchart có sẵn thư viện hình UML; Mermaid và PlantUML cho phép viết sơ đồ bằng chữ.

### Ví dụ thực tế trong công việc

Trong buổi sprint planning, một developer nói: *"Bước nhà hàng xác nhận là async, nên khách có thể thấy 'Đã xác nhận' trước khi nhà hàng nhận đơn."* Nếu đọc được sequence diagram, bạn có thể trả lời bằng ngôn ngữ nghiệp vụ: *"Vậy màn hình nên ghi 'Đã gửi đơn tới nhà hàng' chứ không phải 'Đã xác nhận', cho đến khi nhà hàng nhận đơn."* Đó là lúc BA tạo ra giá trị nhờ UML.

---

## 8. Tóm tắt

- **UML** là ngôn ngữ hình ảnh chuẩn để mô tả thiết kế phần mềm; có 14 loại diagram chia thành hai nhóm (cấu trúc và hành vi).
- **Use Case**: hệ thống làm gì, ai dùng.
- **Activity**: quy trình step-by-step, hỗ trợ song song.
- **Sequence**: thứ tự tương tác theo thời gian.
- **Class**: cấu trúc — có những dữ liệu gì và chúng liên kết ra sao (với multiplicity như `1` và `0..*`).
- Actor = người dùng hoặc hệ thống bên ngoài.
- `<<include>>` = bắt buộc; `<<extend>>` = tùy chọn.
- Fork/Join = công việc song song; hình thoi decision = chọn một nhánh.

### Thuật ngữ chính

| Thuật ngữ | Nghĩa dễ hiểu |
|-----------|---------------|
| UML | Bộ "bản vẽ" sơ đồ chuẩn để mô tả phần mềm |
| Actor | Một vai trò (người hoặc hệ thống bên ngoài) sử dụng hệ thống |
| Use case | Mục tiêu mà actor đạt được, viết dạng động từ + danh từ |
| System boundary | Chiếc hộp cho thấy cái gì nằm trong hệ thống ta xây dựng |
| `<<include>>` / `<<extend>>` | Bước luôn cần / bước bổ sung tùy chọn |
| Fork / Join | Tách thành việc song song / chờ mọi việc song song xong |
| Partition | Tên UML của swimlane |
| Lifeline | Đường thời gian nét đứt của một bên tham gia trong sequence diagram |
| Synchronous / Asynchronous | Gọi và chờ / gửi rồi làm tiếp |
| Class / Object | Mẫu đơn / một bản đã điền của mẫu đó |
| Multiplicity | "Bao nhiêu" ở mỗi đầu của một quan hệ (1, 0..*, 1..*) |
