# Database là gì?

## 1. Database là gì?

Hầu như ứng dụng nào bạn dùng cũng có "trí nhớ". Ngân hàng nhớ số dư của bạn, Shopee nhớ các đơn bạn từng đặt, Zalo nhớ danh bạ của bạn. Trí nhớ đó nằm trong một **database (cơ sở dữ liệu)**.

**Database (cơ sở dữ liệu)** là hệ thống lưu trữ và quản lý dữ liệu có tổ chức, cho phép truy vấn, cập nhật và xóa dữ liệu hiệu quả.

- **Truy vấn (query)** nghĩa là "đặt câu hỏi cho dữ liệu", ví dụ "cho tôi xem mọi đơn hàng tuần trước".
- **Cập nhật (update)** nghĩa là sửa thứ đã được lưu, ví dụ số điện thoại mới.
- **Xóa (delete)** nghĩa là bỏ nó đi.

### Bắt đầu từ thứ bạn đã biết: Excel

Chắc hẳn bạn đã dùng bảng tính Excel hoặc Google Sheets. Hãy tưởng tượng một cửa hàng nhỏ theo dõi khách hàng trong một sheet:

| A: Tên | B: Điện thoại | C: Thành phố |
|---------|----------|---------|
| Nguyễn An | 0901 111 222 | Hà Nội |
| Trần Bình | 0902 333 444 | TP.HCM |

Một bảng trong database trông rất giống sheet này: tên cột ở hàng trên cùng, mỗi dòng là một đối tượng. Nếu bạn hiểu bảng tính, bạn đã hiểu được một nửa database.

### Vậy sao không dùng luôn Excel?

Bảng tính chạy tốt cho một người và vài nghìn dòng. Nó bắt đầu "gãy" khi một ứng dụng thật dùng nó:

| Vấn đề | Bảng tính | Database |
|---------|-------------|----------|
| Nhiều người sửa cùng lúc | Sửa đè, xung đột lẫn nhau | Phục vụ an toàn hàng nghìn người dùng cùng lúc |
| Hàng triệu dòng | Chậm hoặc không mở nổi | Được xây cho hàng triệu, hàng tỷ dòng |
| Gõ sai dữ liệu ("abc" vào ô Tuổi) | Thường vẫn nhận | Bị từ chối theo quy tắc bạn đặt ra |
| Sập giữa lúc đang lưu | File có thể hỏng | Được thiết kế để khôi phục về trạng thái đúng |
| Ai được xem/sửa gì | Chia sẻ cả file | Phân quyền chi tiết theo người dùng và theo bảng |

Không có database → dữ liệu lưu trong file → khó tìm kiếm, không đảm bảo nhất quán.

**Nhất quán (consistency)** ở đây nghĩa là dữ liệu không bao giờ tự mâu thuẫn, ví dụ một đơn hàng trỏ tới một khách hàng không hề tồn tại.

### Database và DBMS

Nói cho chính xác, **database** là bản thân dữ liệu được lưu, còn **DBMS** (Database Management System – hệ quản trị cơ sở dữ liệu) là phần mềm lưu trữ dữ liệu, trả lời câu hỏi và bắt buộc tuân thủ quy tắc. MySQL, PostgreSQL, SQL Server là các DBMS. Trong giao tiếp hằng ngày, người ta gọi chung cả hai là "database", và như vậy cũng không sao.

> **Ví von:** database là nhà kho đầy kệ hàng; DBMS là đội nhân viên kho — cất hàng vào, tìm hàng giúp bạn, và từ chối nhận thùng hàng không có nhãn.

---

## 2. RDBMS – Cơ sở dữ liệu quan hệ

Loại database phổ biến nhất là database quan hệ.

**RDBMS** (Relational Database Management System) tổ chức dữ liệu thành **bảng (table)** có cấu trúc.

Chữ "quan hệ" (relational) xuất phát từ ý tưởng các bảng có thể **liên kết** với nhau — bạn sẽ thấy ở phần tiếp theo. Một ứng dụng thường có nhiều bảng: một bảng người dùng, một bảng đơn hàng, một bảng sản phẩm… Hãy nghĩ chúng như các sheet (tab) trong cùng một file Excel, chỉ khác là database biết các sheet nối với nhau thế nào.

### Bảng (Table)

Đây là bảng `users`:

| id | name | email | age |
|----|------|-------|-----|
| 1 | Nguyễn A | a@mail.com | 25 |
| 2 | Trần B | b@mail.com | 30 |
| 3 | Lê C | c@mail.com | 28 |

- **Cột (Column/Field)**: thuộc tính — id, name, email, age.
- **Hàng (Row/Record)**: một bản ghi — một người dùng.
- **Schema**: cấu trúc của bảng (tên cột, kiểu dữ liệu).

Khác biệt lớn so với bảng tính chính là **schema**. Trước khi có dữ liệu, ai đó (thường là developer) khai báo chính xác bảng có những cột nào và mỗi cột chứa kiểu giá trị gì. Sau đó database **bắt buộc** tuân theo: bạn không thể nhét chữ vào cột `age` hay bỏ trống một giá trị bắt buộc.

> **Hiểu lầm thường gặp:** "Database chỉ là một file Excel to." Nhìn trên màn hình thì giống, nhưng bảng tính cho bạn gõ gì vào đâu cũng được; database kiểm tra từng giá trị theo schema và từ chối dữ liệu vi phạm quy tắc.

### Kiểu dữ liệu phổ biến

Mỗi cột có một **kiểu dữ liệu (data type)**, cho biết loại giá trị nào được phép.

| Kiểu | Dùng cho |
|------|---------|
| INTEGER / BIGINT | Số nguyên, ID |
| VARCHAR(n) | Chuỗi có độ dài giới hạn |
| TEXT | Chuỗi dài |
| DECIMAL(p,s) | Số thực (tiền tệ) |
| BOOLEAN | Đúng/sai |
| DATE / TIMESTAMP | Ngày giờ |
| JSON / JSONB | Dữ liệu JSON |

Vài lưu ý cho người mới:

- **Chuỗi (string)** đơn giản là văn bản: tên, email, địa chỉ. `VARCHAR(100)` nghĩa là "văn bản, tối đa 100 ký tự".
- Tiền nên dùng **DECIMAL** (còn gọi là NUMERIC), không dùng kiểu số "dấu phẩy động" (floating-point), vì kiểu này có thể sinh sai số làm tròn rất nhỏ như 0.1 + 0.2 = 0.30000000000000004. Chẳng ai muốn thấy điều đó trên hóa đơn.
- **TIMESTAMP** lưu cả ngày lẫn giờ. Bạn sẽ hay gặp các cột như `created_at` (thời điểm bản ghi được tạo) và `updated_at` (thời điểm sửa gần nhất).

### NULL – "chưa có giá trị"

Một ô cũng có thể là **NULL**, nghĩa là "chưa biết / chưa nhập". NULL không phải số 0 và cũng không phải chuỗi rỗng: một khách hàng có phone = NULL đơn giản là chưa cung cấp số điện thoại. Schema có thể đánh dấu một cột là `NOT NULL` để bắt buộc phải nhập.

---

## 3. Primary Key & Foreign Key

### Primary Key (Khóa chính)

**Ví von:** ở Việt Nam, hai người có thể cùng tên "Nguyễn Văn An", nhưng không bao giờ trùng số căn cước công dân. Số căn cước chính là thứ phân biệt họ.

**Khóa chính (primary key)** đóng vai trò y như vậy cho từng dòng.

Giá trị **duy nhất** xác định từng bản ghi trong bảng. Thường là cột `id`.

- Không được null.
- Không được trùng lặp.
- Mỗi bảng có một primary key.

Hầu hết các bảng dùng id **tự tăng (auto-increment)**: database tự cấp 1, 2, 3… nên không ai phải tự nghĩ ra. Kể cả khi khách hàng đổi tên, email và số điện thoại, id của họ vẫn giữ nguyên, nên mọi thứ liên kết với họ vẫn còn liên kết.

> **Hiểu lầm thường gặp:** "Email là duy nhất, vậy dùng email làm khóa chính đi." Email có thể đổi, còn khóa chính thì không bao giờ nên đổi. Hãy dùng một cột id riêng và đánh dấu email là duy nhất (unique).

### Foreign Key (Khóa ngoại)

Cột tham chiếu đến **Primary Key của bảng khác** — tạo quan hệ giữa các bảng.

```text
Bảng users:   id, name, email
Bảng orders:  id, user_id (FK → users.id), product, amount
```

`orders.user_id` là foreign key trỏ đến `users.id` → biết đơn hàng thuộc user nào.

Thay vì chép tên và email của khách vào từng đơn hàng, đơn hàng chỉ lưu id của khách. Muốn xem tên, database đi theo đường liên kết:

```text
orders (id, user_id, amount)          users (id, name)
  10, user_id 1, 200000   ───────►      1, Nguyễn A
  11, user_id 1,  50000   ───────►      1, Nguyễn A
  12, user_id 2, 300000   ───────►      2, Trần B
```

Vì sao điều này quan trọng:

- **Không trùng lặp:** tên chỉ lưu một lần. Nếu Nguyễn A đổi email, bạn sửa một dòng, không phải hàng trăm đơn hàng.
- **Toàn vẹn tham chiếu (referential integrity):** database từ chối một đơn hàng có `user_id = 99` nếu user 99 không tồn tại. Điều này ngăn các đơn hàng "mồ côi" không thuộc về ai.

> **Ở nơi làm việc:** một tester thử xóa một khách hàng vẫn còn đơn hàng và nhận lỗi kiểu `violates foreign key constraint`. Đó không phải bug; đó là database đang bảo vệ liên kết giữa các bảng.

---

## 4. Quan hệ giữa các bảng

Khóa ngoại cho phép mô tả cách các thứ ngoài đời thực liên quan với nhau. Có ba kiểu.

| Quan hệ | Ý nghĩa | Ví dụ |
|---------|---------|-------|
| **One-to-Many** | 1 bản ghi → nhiều bản ghi khác | 1 user có nhiều order |
| **Many-to-Many** | Nhiều ↔ nhiều (cần bảng trung gian) | Nhiều student - nhiều course |
| **One-to-One** | 1 bản ghi ↔ 1 bản ghi | 1 user - 1 profile |

### One-to-Many – Một-nhiều (phổ biến nhất)

**Ví von:** một người mẹ có thể có nhiều con, nhưng mỗi đứa con chỉ có đúng một mẹ (ruột).

Một user đặt nhiều đơn hàng; mỗi đơn hàng thuộc về một user. Khóa ngoại luôn nằm ở phía "nhiều": `orders.user_id`. Nhìn từ phía orders, cùng quan hệ đó là **Many-to-One** (nhiều đơn → một user).

### Many-to-Many – Nhiều-nhiều

**Ví von:** một học viên đăng ký nhiều khóa học, và mỗi khóa học có nhiều học viên. Bạn không thể nhét "tất cả khóa học của tôi" vào một ô của bảng students, cũng không thể nhét "tất cả học viên của tôi" vào một ô của bảng courses.

Cách giải là thêm một bảng thứ ba ở giữa, gọi là **bảng trung gian (junction table)** — còn gọi là "join table" hay "bridge table":

```text
students            enrollments                courses
+----+------+       +------------+-----------+  +----+---------+
| id | name |       | student_id | course_id |  | id | title   |
+----+------+       +------------+-----------+  +----+---------+
|  1 | An   |       |     1      |    10     |  | 10 | SQL     |
|  2 | Bình |       |     1      |    11     |  | 11 | Excel   |
+----+------+       |     2      |    10     |  +----+---------+
                    +------------+-----------+
```

Mỗi dòng của `enrollments` nói "học viên này học khóa này". An học SQL và Excel; Bình học SQL.

### One-to-One – Một-một

Một user có đúng một profile (ảnh đại diện, giới thiệu, địa chỉ). Kiểu này ít gặp hơn; thường các cột thêm đó có thể nằm luôn trong cùng bảng, chỉ tách ra cho gọn gàng hoặc vì lý do bảo mật.

---

## 5. Index (Chỉ mục)

**Index** tăng tốc tìm kiếm — như mục lục sách.

**Ví von:** để tìm "foreign key" trong một cuốn giáo trình 600 trang, bạn có thể lật từng trang, hoặc mở phần chỉ mục ở cuối sách, tra chữ F và nhảy thẳng tới trang 214. Index trong database chính là phần chỉ mục cuối sách đó, được xây cho một cột.

Không có index: tìm user có email="a@mail.com" → quét toàn bộ bảng (O(n)).
Có index trên cột email: tìm trực tiếp (O(log n)).

Nói đơn giản: **O(n)** nghĩa là "công sức tăng theo số dòng": bảng lớn gấp 10 lần thì mất khoảng gấp 10 lần thời gian. **O(log n)** nghĩa là công sức gần như không tăng: từ 1 triệu dòng lên 1 tỷ dòng chỉ thêm vài bước, vì index luôn được sắp xếp sẵn và database có thể liên tục chia đôi vùng tìm kiếm.

**Trade-off**: index tăng tốc đọc nhưng chậm ghi (phải cập nhật index khi thêm/sửa).

Index cũng tốn thêm dung lượng lưu trữ. Vì vậy không ai đánh index mọi cột; người ta đánh index cho những cột hay được tìm, lọc hoặc nối bảng (email, user_id, created_at…). Khóa chính được đánh index tự động.

> **Ở nơi làm việc:** "Báo cáo tháng mất ba phút mới tải xong." Developer kiểm tra câu truy vấn, thấy nó lọc theo một cột chưa có index, thêm index vào, và báo cáo tải chưa tới một giây. Là BA hay tester, bạn sẽ không tự tạo index, nhưng biết từ này giúp bạn hiểu cách sửa.

---

## 6. SQL vs NoSQL

Database quan hệ là lựa chọn kinh điển, nhưng không phải duy nhất. Database đại khái chia thành hai họ.

### SQL (Relational)

Bảng có cấu trúc cố định, quan hệ rõ ràng, dùng SQL.
- MySQL, PostgreSQL, SQLite, SQL Server, Oracle.
- Phù hợp: dữ liệu có quan hệ phức tạp, cần nhất quán cao (tài chính, ERP).

**SQL** (Structured Query Language) là ngôn ngữ dùng để đặt câu hỏi cho database quan hệ; nó có bài riêng ngay sau bài này. **ERP** là phần mềm vận hành các hoạt động cốt lõi của doanh nghiệp: kế toán, kho, mua hàng, nhân sự.

### NoSQL

Linh hoạt hơn, không cần schema cố định.

"NoSQL" ban đầu nghĩa là "không phải SQL", nay thường được hiểu là "not only SQL" (không chỉ SQL). Đây là tên gọi chung cho nhiều thiết kế khác nhau:

| Loại | Ví dụ | Phù hợp |
|------|-------|---------|
| Document | MongoDB | Dạng giống JSON, schema linh hoạt |
| Key-Value | Redis | Cache, session |
| Column | Cassandra | Big data, chuỗi thời gian |
| Graph | Neo4j | Mạng xã hội, quan hệ phức tạp |

- **Document:** mỗi bản ghi là một "tài liệu" tự chứa đủ thông tin (giống một file JSON). Hai sản phẩm có thể có các trường khác nhau: áo có size, laptop có CPU.
- **Key-Value:** giống quầy gửi đồ khổng lồ: bạn đưa một khóa (số vé) và nhận lại đúng một giá trị. Cực nhanh; Redis giữ dữ liệu trong bộ nhớ RAM nên hay được dùng làm **cache** (bản sao nhanh của dữ liệu hay đọc) hoặc lưu **session** đăng nhập.
- **Column (wide-column):** trải lượng dữ liệu khổng lồ ra nhiều máy chủ; hợp với log, số đo cảm biến và các **chuỗi thời gian (time series)** khác (giá trị được ghi lại theo thời gian).
- **Graph:** lưu các đối tượng và mối nối giữa chúng, lý tưởng cho câu hỏi kiểu "bạn của bạn".

### Chọn thế nào

Nghiêng về **SQL** khi hình dạng dữ liệu ổn định, các bản ghi liên quan chặt chẽ với nhau, và các con số như tiền hay tồn kho luôn phải khớp tuyệt đối. Nghiêng về **NoSQL** khi hình dạng dữ liệu thay đổi nhiều, khối lượng cực lớn, và bạn không cần các giao dịch phức tạp trên nhiều bảng.

Database NoSQL thường được thiết kế để **mở rộng theo chiều ngang (scale horizontally)**: thêm nhiều máy chủ để chứa thêm dữ liệu, thay vì mua một máy chủ to hơn. Nhiều hệ thống thật dùng cả hai: PostgreSQL cho đơn hàng và thanh toán, Redis làm cache phía trước.

> **Hiểu lầm thường gặp:** "NoSQL mới hơn nên tốt hơn." Đây là sự đánh đổi, không phải bản nâng cấp. Với đa số ứng dụng doanh nghiệp, database quan hệ vẫn là lựa chọn mặc định an toàn.

---

## 7. ACID – Tính chất quan trọng

Một **giao dịch (transaction)** là một nhóm thay đổi phải được xử lý như một đơn vị công việc duy nhất. Ví dụ kinh điển là chuyển khoản: "trừ tiền A" và "cộng tiền B" là hai thay đổi, nhưng chỉ có nghĩa khi đi cùng nhau.

**ACID** là bộ tính chất đảm bảo tính toàn vẹn dữ liệu:

- **A**tomicity: transaction hoàn thành hoàn toàn hoặc không làm gì cả.
- **C**onsistency: database luôn ở trạng thái hợp lệ.
- **I**solation: transaction chạy độc lập với nhau.
- **D**urability: dữ liệu đã commit không bị mất dù có sự cố.

**Ví dụ chuyển khoản ngân hàng**: trừ 1 triệu từ A và cộng vào B phải xảy ra đồng thời — nếu bước 2 lỗi, bước 1 phải rollback.

### Từng bước: chuyển 1.000.000 đồng

1. **Bắt đầu (begin)** giao dịch.
2. Trừ 1.000.000 khỏi tài khoản A.
3. Cộng 1.000.000 vào tài khoản B.
4. **Commit**: lưu vĩnh viễn cả hai thay đổi.

Nếu máy chủ sập sau bước 2 nhưng trước bước 4, database thực hiện **rollback**: hoàn tác bước 2, nên A được trả lại tiền. Tiền không bao giờ tự biến mất và cũng không tự sinh ra.

### Từng chữ cái, nói dễ hiểu

| Tính chất | Nghĩa đơn giản | Trong ví dụ chuyển khoản |
|----------|---------------|-----------------|
| Atomicity | Tất cả hoặc không gì cả | Cả hai bước cùng xảy ra, hoặc không bước nào |
| Consistency | Không bao giờ phá quy tắc | Số dư không thể âm nếu có quy tắc cấm |
| Isolation | Các giao dịch đồng thời không giẫm chân nhau | Hai lệnh chuyển từ A cùng lúc không thể cùng tiêu một khoản tiền |
| Durability | Đã lưu là lưu luôn | Sau thông báo "Chuyển khoản thành công", mất điện cũng không làm mất giao dịch |

"Atomic" xuất phát từ quan niệm cũ coi nguyên tử là thứ không thể chia nhỏ: giao dịch không thể bị chia ra thành trạng thái làm dở dang.

---

## 8. Ghép lại: Database của một cửa hàng nhỏ

Hãy thiết kế database cho một shop online nhỏ bán cà phê và trà. Đây là kiểu sơ đồ một BA có thể thấy trong buổi họp thiết kế.

### Bước 1: liệt kê các "đối tượng"

Shop cần nhớ **khách hàng (customers)**, **sản phẩm (products)** và **đơn hàng (orders)**. Mỗi thứ trở thành một bảng.

### Bước 2: các bảng

```text
customers                  products
+----+-----------+--------+ +----+---------------+--------+
| id | name      | city   | | id | name          | price  |
+----+-----------+--------+ +----+---------------+--------+
|  1 | Nguyễn An | Hà Nội | |  1 | Arabica 500g  | 180000 |
|  2 | Trần Bình | HCM    | |  2 | Hộp trà xanh  |  95000 |
|  3 | Lê Chi    | Hà Nội | |  3 | Giấy lọc      |  40000 |
+----+-----------+--------+ +----+---------------+--------+

orders                              order_items
+-----+-------------+------------+  +----------+------------+----------+
| id  | customer_id | order_date |  | order_id | product_id | quantity |
+-----+-------------+------------+  +----------+------------+----------+
| 101 |      1      | 2026-09-01 |  |   101    |     1      |    2     |
| 102 |      2      | 2026-09-03 |  |   101    |     3      |    1     |
| 103 |      1      | 2026-09-05 |  |   102    |     2      |    3     |
+-----+-------------+------------+  |   103    |     2      |    1     |
                                    +----------+------------+----------+
```

### Bước 3: khóa và quan hệ

- Mỗi bảng có `id` làm **khóa chính** (`order_items` dùng cặp order_id + product_id).
- `orders.customer_id` là **khóa ngoại** trỏ tới `customers.id`: **một-nhiều** (một khách, nhiều đơn).
- Một đơn có thể chứa nhiều sản phẩm, và một sản phẩm xuất hiện trong nhiều đơn: **nhiều-nhiều**, nên `order_items` là **bảng trung gian**.

### Bước 4: trả lời câu hỏi bằng cách đi theo liên kết

"Nguyễn An đã mua những gì?"

1. Trong `customers`, Nguyễn An có id **1**.
2. Trong `orders`, customer_id 1 xuất hiện ở đơn **101** và **103**.
3. Trong `order_items`, đơn 101 có sản phẩm 1 (×2) và sản phẩm 3 (×1); đơn 103 có sản phẩm 2 (×1).
4. Trong `products`: 2 × Arabica 500g, 1 × Giấy lọc, 1 × Hộp trà xanh.

Để ý rằng Lê Chi chưa có đơn nào: cô ấy có trong `customers`, nhưng không dòng nào trong `orders` trỏ tới cô ấy. Điều đó hoàn toàn hợp lệ.

Ở bài tiếp theo, SQL sẽ làm hộ bạn cả bốn bước này chỉ bằng một câu truy vấn.

> **Tự làm thử:** mở Excel hoặc Google Sheets, tạo bốn tab tên customers, products, orders và order_items với dữ liệu ở trên. Rồi tự trả lời "Trần Bình đã mua gì?" bằng tay, lần theo các id từ tab này sang tab khác. Bạn đang làm đúng việc database làm khi nối (join) các bảng.

---

## 9. Tóm tắt

- **Database** = hệ thống lưu trữ có tổ chức.
- **DBMS** là phần mềm quản lý nó; bảng tính đủ dùng cho một người, database dành cho ứng dụng thật.
- **Table** = bảng dữ liệu (column + row); **schema** định nghĩa các cột và kiểu dữ liệu, và database bắt buộc tuân theo.
- **Primary Key** = định danh duy nhất.
- **Foreign Key** = tạo quan hệ giữa bảng.
- Quan hệ: **một-nhiều** (FK nằm ở phía "nhiều"), **nhiều-nhiều** (bảng trung gian), **một-một**.
- **Index** = tăng tốc tìm kiếm, đổi lại ghi chậm hơn và tốn thêm dung lượng.
- **SQL** = dữ liệu có quan hệ; **NoSQL** = linh hoạt, scale tốt.
- **ACID** = đảm bảo tính toàn vẹn.

### Thuật ngữ chính

| Thuật ngữ | Nghĩa dễ hiểu |
|------|------------------------|
| Database | Bộ nhớ dài hạn, có tổ chức của một ứng dụng |
| DBMS / RDBMS | Phần mềm vận hành database (MySQL, PostgreSQL…) |
| Table / Row / Column | Một sheet / một đối tượng / một thuộc tính |
| Schema | Bản thiết kế: có những cột nào và mỗi cột kiểu gì |
| NULL | "Chưa có giá trị", không phải số 0 cũng không phải chuỗi rỗng |
| Primary key | ID duy nhất của mỗi dòng, như số căn cước công dân |
| Foreign key | Cột trỏ tới khóa chính của bảng khác |
| Junction table | Bảng ở giữa nối hai bảng trong quan hệ nhiều-nhiều |
| Index | Bảng tra đã sắp xếp giúp tìm dòng nhanh, như chỉ mục sách |
| NoSQL | Các database phi quan hệ: document, key-value, column, graph |
| Transaction | Nhóm thay đổi cùng thành công hoặc cùng thất bại |
| ACID | Atomicity, Consistency, Isolation, Durability |
