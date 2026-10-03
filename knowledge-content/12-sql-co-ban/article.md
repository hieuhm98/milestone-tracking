# SQL cơ bản

## 1. SQL là gì?

**SQL** (Structured Query Language) là ngôn ngữ dùng để tương tác với cơ sở dữ liệu quan hệ: tạo bảng, thêm/sửa/xóa dữ liệu và truy vấn.

Người ta đọc là "ét-kiu-eo" (S-Q-L) hoặc "si-quồ" (sequel); cách nào cũng được.

**Ví von:** SQL giống gọi món ở nhà hàng. Bạn nói với phục vụ bạn *muốn gì* ("một tô phở, không hành"), chứ không chỉ cách nấu. Trong SQL bạn viết "cho tôi tên các khách hàng ở Hà Nội", còn database tự tìm cách lấy ra. Vì vậy SQL được gọi là ngôn ngữ **khai báo (declarative)**: bạn khai báo kết quả mình muốn.

Một đoạn SQL được gọi là **câu lệnh (statement)** hay **câu truy vấn (query)**, và thường kết thúc bằng dấu chấm phẩy `;`. Đây là câu lệnh hữu ích nhỏ nhất:

```sql
SELECT name FROM users;
```

Đọc như tiếng Anh: "chọn cột name từ bảng users".

Thêm mệnh đề **WHERE** để lọc theo điều kiện: `SELECT name FROM users WHERE city = 'Hanoi';` chỉ trả về những dòng thỏa điều kiện, ở đây là các khách hàng ở Hà Nội.

SQL không phân biệt hoa thường (`SELECT` = `select`), nhưng quy ước viết **keyword** in hoa.

**Keyword (từ khóa)** là những từ thuộc về chính SQL (SELECT, FROM, WHERE…). Viết hoa giúp chúng nổi bật so với tên bảng, tên cột của bạn. Lưu ý điều này chỉ áp dụng cho từ khóa: còn *dữ liệu* có phân biệt hoa thường hay không ('Hanoi' với 'hanoi') thì tùy database.

Bạn cũng sẽ thấy các dòng bắt đầu bằng `--`. Đó là **chú thích (comment)**: ghi chú cho người đọc, database bỏ qua.

---

## 2. Các nhóm lệnh SQL

Các lệnh SQL chia thành bốn nhóm. Bạn không cần thuộc lòng các chữ viết tắt, nhưng sẽ nghe chúng ở chỗ làm.

| Nhóm | Lệnh | Dùng cho |
|------|------|---------|
| **DQL** | SELECT | Truy vấn dữ liệu |
| **DML** | INSERT, UPDATE, DELETE | Thao tác dữ liệu |
| **DDL** | CREATE, ALTER, DROP | Định nghĩa cấu trúc |
| **DCL** | GRANT, REVOKE | Phân quyền |

Nói đơn giản, lấy hình ảnh một tủ hồ sơ:

- **DQL** (Data Query Language): *đọc* hồ sơ trong tủ.
- **DML** (Data Manipulation Language): thêm, sửa hoặc hủy từng tờ hồ sơ.
- **DDL** (Data Definition Language): đóng thêm, sửa lại hoặc vứt bỏ cả ngăn tủ (bảng).
- **DCL** (Data Control Language): quyết định ai giữ chìa khóa ngăn nào.

Hãy cẩn thận với DML: `UPDATE` và `DELETE` thay đổi dữ liệu thật, và một câu `DELETE FROM users;` không có điều kiện `WHERE` sẽ xóa sạch mọi dòng trong bảng.

Là BA, tester hay người phân tích dữ liệu, gần như toàn bộ thời gian bạn dùng **SELECT**. Developer viết DML và DDL; quản trị viên database (DBA) lo DCL.

---

## 3. Dữ liệu mẫu dùng trong bài

Mọi câu truy vấn trong bài này chạy trên cùng hai bảng nhỏ của một shop online, để bạn tự kiểm tra từng kết quả bằng mắt.

**users** — khách hàng

| id | name | email | age | city |
|----|------|-------|-----|------|
| 1 | Nguyen An | an@gmail.com | 25 | Hanoi |
| 2 | Tran Binh | binh@mail.com | 32 | HCM |
| 3 | Nguyen Chi | chi@gmail.com | 28 | Hanoi |
| 4 | Le Dung | NULL | 41 | DaNang |
| 5 | Pham Hoa | hoa@mail.com | 19 | HCM |

**orders** — những gì họ đã mua (`amount` tính bằng đồng)

| id | user_id | amount | status | created_at |
|----|---------|--------|--------|------------|
| 101 | 1 | 250000 | paid | 2026-08-03 |
| 102 | 1 | 120000 | paid | 2026-09-10 |
| 103 | 2 | 900000 | cancelled | 2026-08-15 |
| 104 | 3 | 450000 | paid | 2026-09-02 |
| 105 | 2 | 300000 | pending | 2026-09-20 |
| 106 | 3 | 80000 | paid | 2026-09-25 |

Vài điều cần để ý trước khi bắt đầu:

- `orders.user_id` là **khóa ngoại** trỏ tới `users.id`: đơn 101 thuộc user 1, Nguyen An.
- Le Dung không có email: ô đó là **NULL** ("không có giá trị").
- Le Dung và Pham Hoa chưa từng đặt đơn nào. Điều này sẽ quan trọng khi tới phần JOIN.

---

## 4. SELECT – Truy vấn dữ liệu

`SELECT` đọc dữ liệu. Nó không bao giờ thay đổi gì, nên luôn chạy an toàn.

```sql
-- Lấy tất cả
SELECT * FROM users;

-- Chọn cột cụ thể
SELECT name, email FROM users;

-- Có điều kiện
SELECT * FROM users WHERE age > 25;

-- Sắp xếp
SELECT * FROM users ORDER BY name ASC;

-- Giới hạn số kết quả
SELECT * FROM products LIMIT 10;

-- Kết hợp
SELECT name, email
FROM users
WHERE age > 25
ORDER BY name ASC
LIMIT 5;
```

Ý nghĩa từng phần:

- `*` nghĩa là "tất cả các cột". Tiện để xem nhanh, nhưng trong báo cáo thật hãy ghi rõ các cột cần lấy.
- `FROM users` cho biết đọc bảng nào.
- `ORDER BY name ASC` sắp xếp A→Z (**tăng dần – ascending**); `DESC` sắp xếp Z→A, hoặc số lớn nhất trước (**giảm dần – descending**).
- `LIMIT 10` trả về tối đa 10 dòng, hữu ích với bảng có hàng triệu dòng.

### Ví dụ có kết quả

```sql
SELECT name, city
FROM users
WHERE age > 25
ORDER BY name;
```

Kết quả:

| name | city |
|------|------|
| Le Dung | DaNang |
| Nguyen Chi | Hanoi |
| Tran Binh | HCM |

Nguyen An (25 tuổi) không có mặt vì 25 không *lớn hơn* 25, còn Pham Hoa (19) thì quá trẻ. Nếu không có `ORDER BY`, database có thể trả các dòng theo thứ tự bất kỳ.

### Ví dụ: ba khách hàng lớn tuổi nhất

```sql
SELECT name, age
FROM users
ORDER BY age DESC
LIMIT 3;
```

| name | age |
|------|-----|
| Le Dung | 41 |
| Tran Binh | 32 |
| Nguyen Chi | 28 |

---

## 5. WHERE – Điều kiện lọc

**Ví von:** `WHERE` chính là nút lọc (filter) trong Excel. Chỉ những dòng thỏa điều kiện mới được giữ lại.

```sql
-- So sánh
WHERE age = 25
WHERE age > 25
WHERE age >= 25
WHERE age != 25

-- Khoảng giá trị
WHERE age BETWEEN 20 AND 30

-- Trong danh sách
WHERE city IN ('Hanoi', 'HCM', 'DaNang')

-- Tìm kiếm chuỗi (LIKE)
WHERE name LIKE 'Nguyen%'   -- bắt đầu bằng 'Nguyen'
WHERE email LIKE '%@gmail.com'  -- kết thúc bằng '@gmail.com'

-- Kết hợp điều kiện
WHERE age > 25 AND city = 'Hanoi'
WHERE age < 20 OR age > 60

-- Null check
WHERE phone IS NULL
WHERE phone IS NOT NULL
```

Lưu ý cho người mới:

- Giá trị chữ đặt trong **dấu nháy đơn**: `'Hanoi'`. Số thì không: `25`.
- `!=` nghĩa là "khác"; nhiều database cũng chấp nhận `<>`.
- `BETWEEN 20 AND 30` **bao gồm** cả hai đầu: 20 và 30 đều khớp.
- Trong `LIKE`, `%` nghĩa là "bất kỳ ký tự nào, bao nhiêu cũng được". `'Nguyen%'` = bắt đầu bằng Nguyen.
- `AND` cần cả hai điều kiện đúng; `OR` chỉ cần ít nhất một.
- Không viết được `= NULL`. NULL nghĩa là "chưa biết", nên phải hỏi bằng `IS NULL` / `IS NOT NULL`.

### Ví dụ có kết quả

```sql
SELECT name, email FROM users WHERE email LIKE '%@gmail.com';
```

| name | email |
|------|-------|
| Nguyen An | an@gmail.com |
| Nguyen Chi | chi@gmail.com |

```sql
SELECT name FROM users WHERE email IS NULL;
```

| name |
|------|
| Le Dung |

> **Ở nơi làm việc:** một ticket hỗ trợ báo "khách không có email thì không bao giờ nhận được xác nhận đơn hàng". Tester chạy câu `IS NULL` ở trên để đếm xem bao nhiêu khách bị ảnh hưởng.

---

## 6. INSERT – Thêm dữ liệu

`INSERT` thêm dòng mới.

```sql
-- Thêm 1 bản ghi
INSERT INTO users (name, email, age)
VALUES ('Nguyen Van A', 'a@mail.com', 25);

-- Thêm nhiều bản ghi
INSERT INTO users (name, email, age)
VALUES 
  ('Tran Thi B', 'b@mail.com', 30),
  ('Le Van C', 'c@mail.com', 28);
```

Cách đọc: "vào bảng users, ở các cột name, email, age, đặt các giá trị này". Các giá trị phải theo **đúng thứ tự** các cột đã liệt kê.

Thường bạn không cần ghi `id`: database tự điền (auto-increment). Những cột bị bỏ qua, như `city` ở trên, sẽ thành NULL — trừ khi schema đặt giá trị mặc định cho cột đó hoặc đánh dấu bắt buộc, khi đó lệnh INSERT sẽ báo lỗi.

Sau lệnh INSERT đầu tiên trên dữ liệu mẫu, bảng `users` có thêm dòng thứ 6: `6 | Nguyen Van A | a@mail.com | 25 | NULL`.

---

## 7. UPDATE – Cập nhật dữ liệu

`UPDATE` sửa các dòng đã có.

```sql
-- Cập nhật một user
UPDATE users
SET email = 'newemail@mail.com', age = 26
WHERE id = 1;

-- ⚠️ KHÔNG có WHERE → cập nhật TẤT CẢ bản ghi!
UPDATE users SET age = 0;  -- RẤT NGUY HIỂM!
```

Đọc là: "trong users, đặt email thành … và age thành 26, nhưng chỉ ở dòng có id bằng 1". Sau câu lệnh đầu, dòng của Nguyen An thành `1 | Nguyen An | newemail@mail.com | 26 | Hanoi`; bốn dòng còn lại không bị đụng tới.

Chính `WHERE` giới hạn phạm vi thay đổi. Quên nó là **mọi** dòng đều bị sửa: cả năm khách hàng bỗng nhiên 0 tuổi.

> **Hiểu lầm thường gặp:** "Cứ bấm Undo là xong." Database không có nút Undo. Khi lệnh UPDATE đã được commit, muốn lấy lại giá trị cũ phải khôi phục từ bản sao lưu (backup) — vừa chậm vừa có thể mất các dữ liệu mới khác.

Thói quen an toàn: chạy trước một câu `SELECT` với đúng `WHERE` đó (`SELECT * FROM users WHERE id = 1;`), kiểm tra nó trả về đúng những dòng bạn muốn, rồi mới đổi thành UPDATE.

---

## 8. DELETE – Xóa dữ liệu

`DELETE` xóa nguyên dòng.

```sql
-- Xóa một bản ghi
DELETE FROM users WHERE id = 5;

-- ⚠️ KHÔNG có WHERE → xóa TOÀN BỘ bảng!
DELETE FROM users;  -- RẤT NGUY HIỂM!
```

Trên dữ liệu mẫu, câu đầu xóa Pham Hoa (id 5). Câu thứ hai xóa cả năm khách hàng. Bản thân cái bảng vẫn còn, nhưng trống rỗng.

Hai từ liên quan bạn có thể nghe:

- `DROP TABLE users;` (DDL) xóa cả bảng **lẫn** cấu trúc của nó, không chỉ các dòng.
- **Soft delete (xóa mềm)**: nhiều ứng dụng không bao giờ xóa thật. Họ đặt một cột như `deleted_at` hoặc `is_active = false` rồi chỉ ẩn các dòng đó đi. Nếu user "xóa" tài khoản mà bộ phận hỗ trợ vẫn thấy, thường là vì lý do này.

> **Hiểu lầm thường gặp:** "Xóa một khách hàng thì có hại gì." Nếu khách đó vẫn còn đơn hàng, khóa ngoại có thể chặn lệnh DELETE bằng một lỗi — đó là database đang bảo vệ dữ liệu của bạn.

---

## 9. JOIN – Kết hợp bảng

Bảng orders chỉ lưu `user_id`, không lưu tên khách. Muốn hiện tên bên cạnh đơn hàng, ta **nối (join)** hai bảng.

**Ví von:** bạn có một danh sách mã bưu kiện kèm mã khách hàng và một cuốn sổ địa chỉ riêng. Join là đặt hai thứ cạnh nhau và ghép từng bưu kiện với khách hàng của nó theo mã.

```sql
-- Lấy đơn hàng kèm tên user
SELECT orders.id, users.name, orders.amount
FROM orders
INNER JOIN users ON orders.user_id = users.id;

-- LEFT JOIN: lấy tất cả orders, kể cả order không có user
SELECT orders.id, users.name
FROM orders
LEFT JOIN users ON orders.user_id = users.id;
```

`ON orders.user_id = users.id` là quy tắc ghép: "một đơn đi với user có id bằng user_id của đơn". Viết `orders.id` và `users.name` (tên bảng + dấu chấm + tên cột) cho database biết mỗi cột lấy từ bảng nào, vì cả hai bảng đều có cột `id`.

### Kết quả INNER JOIN

| id | name | amount |
|----|------|--------|
| 101 | Nguyen An | 250000 |
| 102 | Nguyen An | 120000 |
| 103 | Tran Binh | 900000 |
| 104 | Nguyen Chi | 450000 |
| 105 | Tran Binh | 300000 |
| 106 | Nguyen Chi | 80000 |

Le Dung và Pham Hoa không xuất hiện: họ không có đơn nào nên không có gì để ghép.

### LEFT JOIN: giữ lại mọi dòng của bảng bên trái

"Hiện mọi khách hàng và đơn của họ, kể cả khách chưa từng đặt":

```sql
SELECT users.name, orders.id AS order_id, orders.amount
FROM users
LEFT JOIN orders ON orders.user_id = users.id
ORDER BY users.id, orders.id;
```

| name | order_id | amount |
|------|----------|--------|
| Nguyen An | 101 | 250000 |
| Nguyen An | 102 | 120000 |
| Tran Binh | 103 | 900000 |
| Tran Binh | 105 | 300000 |
| Nguyen Chi | 104 | 450000 |
| Nguyen Chi | 106 | 80000 |
| Le Dung | NULL | NULL |
| Pham Hoa | NULL | NULL |

Bảng "bên trái" là bảng viết sau `FROM`. Mọi dòng của nó đều được giữ; chỗ nào không có dòng khớp ở bên phải thì các cột bên phải được điền NULL. Đây là cách tìm "khách chưa từng đặt hàng": thêm `WHERE orders.id IS NULL`.

| Loại JOIN | Lấy gì |
|-----------|--------|
| INNER JOIN | Chỉ bản ghi khớp ở cả hai bảng |
| LEFT JOIN | Tất cả bảng trái + khớp bảng phải |
| RIGHT JOIN | Tất cả bảng phải + khớp bảng trái |
| FULL JOIN | Tất cả từ cả hai bảng |

Trên thực tế INNER JOIN và LEFT JOIN đáp ứng gần như mọi nhu cầu. (SQLite chỉ mới hỗ trợ RIGHT và FULL JOIN từ phiên bản 3.39, còn MySQL không có FULL JOIN.)

---

## 10. Aggregate Functions

Đến giờ mọi câu truy vấn đều trả về từng dòng riêng lẻ. **Hàm tổng hợp (aggregate function)** gộp nhiều dòng thành một con số, giống các công thức SUM và AVERAGE trong Excel.

```sql
-- Đếm
SELECT COUNT(*) FROM orders;

-- Tổng
SELECT SUM(amount) FROM orders WHERE user_id = 1;

-- Trung bình
SELECT AVG(amount) FROM orders;

-- Max/Min
SELECT MAX(amount), MIN(amount) FROM orders;

-- Nhóm kết quả
SELECT user_id, COUNT(*) as order_count, SUM(amount) as total
FROM orders
GROUP BY user_id
HAVING SUM(amount) > 500000;
```

Trên dữ liệu mẫu:

| Câu truy vấn | Kết quả |
|-------|--------|
| `COUNT(*)` | 6 (đơn) |
| `SUM(amount) … WHERE user_id = 1` | 370000 (250000 + 120000) |
| `AVG(amount)` | 350000 (2100000 ÷ 6) |
| `MAX(amount), MIN(amount)` | 900000, 80000 |

### GROUP BY: mỗi nhóm một kết quả

**Ví von:** chia hóa đơn thành từng chồng, mỗi khách một chồng, rồi cộng từng chồng. Đó chính là pivot table trong Excel.

```sql
SELECT user_id, COUNT(*) AS order_count, SUM(amount) AS total
FROM orders
GROUP BY user_id;
```

| user_id | order_count | total |
|---------|-------------|-------|
| 1 | 2 | 370000 |
| 2 | 2 | 1200000 |
| 3 | 2 | 530000 |

### HAVING: lọc các nhóm

`WHERE` lọc **từng dòng trước** khi gộp nhóm; `HAVING` lọc **các nhóm sau** khi gộp, nên dùng được các con số tổng. Thêm `HAVING SUM(amount) > 500000` vào câu trên thì chỉ còn user 2 và 3; chồng của user 1 (370000) bị loại.

Có thể dùng cả hai trong một câu: `WHERE status = 'paid'` trước tiên bỏ các đơn đã hủy và đang chờ, sau đó `GROUP BY` và `HAVING` làm việc trên phần còn lại.

---

## 11. SQL cho BA – Làm báo cáo

Phần lớn BA không viết lệnh sửa/xóa; điều giá trị nhất là **đọc và viết câu truy vấn báo cáo** để tự lấy số liệu thay vì chờ dev.

### Đặt tên cột dễ đọc với `AS`
```sql
SELECT
  user_id      AS "Mã KH",
  COUNT(*)     AS "Số đơn",
  SUM(amount)  AS "Tổng chi tiêu"
FROM orders
GROUP BY user_id;
```

`AS` đặt cho cột kết quả một cái tên dễ hiểu (**bí danh – alias**), để kết quả có thể dán thẳng vào slide hay email.

### Đếm giá trị không trùng với `DISTINCT`
```sql
-- Có bao nhiêu khách hàng đã từng đặt hàng?
SELECT COUNT(DISTINCT user_id) AS so_khach
FROM orders;
```

Trên dữ liệu mẫu, đáp án là **3**: bảng orders có sáu dòng, nhưng chỉ có ba user_id khác nhau (1, 2, 3). `COUNT(*)` sẽ nói sai là 6.

### Vài "công thức" báo cáo hay dùng

```sql
-- 1) Doanh thu theo tháng
SELECT
  strftime('%Y-%m', created_at) AS thang,
  SUM(amount)                   AS doanh_thu
FROM orders
GROUP BY thang
ORDER BY thang;

-- 2) Số đơn theo trạng thái
SELECT status, COUNT(*) AS so_don
FROM orders
GROUP BY status;

-- 3) Top 5 khách chi nhiều nhất
SELECT user_id, SUM(amount) AS tong
FROM orders
GROUP BY user_id
ORDER BY tong DESC
LIMIT 5;
```

Kết quả trên dữ liệu mẫu: công thức 1 cho 2026-08 → 1150000 và 2026-09 → 950000; công thức 2 cho paid 4, cancelled 1, pending 1. `strftime` là cách của SQLite để cắt ngày xuống còn năm-tháng; MySQL dùng `DATE_FORMAT`, PostgreSQL dùng `to_char` cho cùng việc đó.

> **Hiểu lầm thường gặp:** doanh thu ở trên đã tính cả đơn 900000 bị hủy. Báo cáo doanh thu thật cần thêm `WHERE status = 'paid'`. Luôn hỏi "những dòng nào nên được tính?" trước khi tin vào một con số.

### Đọc hiểu một câu query có sẵn
Đọc theo thứ tự nghiệp vụ: **FROM** (lấy từ bảng nào) → **JOIN** (nối bảng nào) → **WHERE** (lọc gì) → **GROUP BY** (gộp theo gì) → **SELECT** (hiển thị cột nào) → **ORDER BY / LIMIT** (sắp xếp, giới hạn). Nắm được mạch này là hiểu được đa số báo cáo.

> 💡 BA nên yêu cầu quyền **chỉ đọc (read-only)** trên môi trường báo cáo để chạy SELECT an toàn, không lo lỡ tay sửa/xóa dữ liệu thật.

---

## 12. Thực hành ngay trong app: Luyện tập SQL

Đọc SQL đã tốt; gõ SQL còn tốt hơn. App này có sẵn một sân tập: mở **Luyện tập SQL** ở thanh bên (địa chỉ `/practice/sql`). Gõ câu truy vấn, bấm **▶ Chạy** (hoặc Ctrl+Enter; Cmd+Enter trên Mac), và bảng kết quả hiện ra bên dưới. Khung bên cạnh hiển thị các cột của từng bảng.

Sân tập dùng một kho từ vựng tiếng Anh (SQLite) với ba bảng:

- `words`: id, word, pronunciation, pos_code, meaning_en, meaning_vi, first_letter, length
- `parts_of_speech`: id, code, name_en, name_vi (ví dụ `n` → noun / danh từ)
- `word_reviews`: id, word_id, reviewed_on, remembered (1 = nhớ, 0 = quên)

Mỗi câu truy vấn chạy trên một **bản sao mới** của dữ liệu, nên bạn không thể làm hỏng gì: kể cả `DELETE FROM words;` cũng chỉ ảnh hưởng lần chạy đó, câu tiếp theo vẫn thấy đủ các từ. Mỗi lần chạy một câu lệnh.

> **Tự làm thử:** dán lần lượt từng câu dưới đây.
>
> 1. Lọc bằng `LIKE` (kỳ vọng hai dòng: *data* và *database*):
>    `SELECT word, meaning_vi FROM words WHERE word LIKE 'data%';`
> 2. JOIN + GROUP BY (kỳ vọng mỗi từ loại một dòng, *noun* đứng đầu với cách biệt lớn):
>    `SELECT p.name_en, COUNT(*) AS total FROM words w JOIN parts_of_speech p ON w.pos_code = p.code GROUP BY p.name_en ORDER BY total DESC;`
> 3. Lịch sử ôn tập (kỳ vọng năm từ, kèm số lần ôn và số lần nhớ đúng):
>    `SELECT w.word, COUNT(*) AS reviews, SUM(r.remembered) AS remembered FROM word_reviews r JOIN words w ON r.word_id = w.id GROUP BY w.word ORDER BY reviews DESC LIMIT 5;`

Ở câu 2 và 3, `words w` đặt cho bảng một biệt danh ngắn (`w`) để bạn viết `w.word` thay vì `words.word`.

Sau đó thử biến tấu: đổi `'data%'` thành `'%tion'`, đổi `DESC` thành `ASC`, hoặc thêm `WHERE w.length > 10`.

---

## 13. Tóm tắt

- **SELECT**: đọc dữ liệu.
- **WHERE**: lọc theo điều kiện.
- **ORDER BY / LIMIT**: sắp xếp kết quả và giới hạn số dòng.
- **INSERT/UPDATE/DELETE**: thao tác dữ liệu — luôn cẩn thận với UPDATE/DELETE thiếu WHERE!
- **JOIN**: kết hợp nhiều bảng.
- **GROUP BY + Aggregate**: thống kê, báo cáo.
- **BA**: dùng `AS`, `DISTINCT`, `GROUP BY` để tự viết báo cáo; xin quyền **read-only** để chạy an toàn.
- Thực hành ở trang **Luyện tập SQL** của app (`/practice/sql`) — mỗi lần chạy dùng một bản sao mới, nên không gì có thể hỏng.

### Thuật ngữ chính

| Thuật ngữ | Nghĩa dễ hiểu |
|------|------------------------|
| SQL | Ngôn ngữ để hỏi database quan hệ và thay đổi dữ liệu trong đó |
| Query / statement | Một câu lệnh SQL, thường kết thúc bằng `;` |
| Keyword | Từ thuộc về chính SQL: SELECT, FROM, WHERE… |
| `*` | "Tất cả các cột" |
| WHERE | Chỉ giữ các dòng thỏa điều kiện |
| ORDER BY ASC / DESC | Sắp A→Z / Z→A (hoặc nhỏ trước / lớn trước) |
| NULL / IS NULL | "Không có giá trị"; kiểm tra bằng IS NULL, không bao giờ `= NULL` |
| JOIN … ON | Ghép các dòng của hai bảng theo một giá trị chung |
| INNER / LEFT JOIN | Chỉ dòng khớp / mọi dòng của bảng trái cộng các dòng khớp |
| Aggregate function | COUNT, SUM, AVG, MAX, MIN: nhiều dòng → một con số |
| GROUP BY / HAVING | Mỗi nhóm một kết quả / lọc các nhóm |
| Alias (AS) | Tên dễ hiểu cho một cột hoặc bảng trong kết quả |
| Read-only access | Quyền chạy SELECT nhưng không được sửa dữ liệu |
