# SQL cho phân tích dữ liệu

## 1. Từ "SQL cơ bản" đến "SQL cho phân tích"

Trong bài SQL cơ bản, bạn đã biết `SELECT`, lọc bằng `WHERE`, `JOIN` hai bảng và tổng hợp bằng `GROUP BY`. Như vậy là đủ để *lấy* dữ liệu ra. Phân tích thì đòi hỏi nhiều hơn: "Tháng trước bao nhiêu phần trăm giao dịch thẻ thành công?", "Mỗi tháng khách nạp ví bao nhiêu tiền?", "Tháng này tốt hơn hay kém tháng trước?". Những câu hỏi đó cần thêm vài công cụ, và vài thói quen giúp bạn không tự tin báo cáo một con số sai.

Bài này dùng database thực hành của VayNhanh (`fintech.db`) mà bạn đã gặp ở các bài trước. Mọi query bên dưới đều đã được chạy thật trên database này, và mọi bảng kết quả là output thật. Mở [SQL Practice → Fintech](/practice/sql?db=fintech) và chạy theo trong lúc đọc. Mỗi lần chạy dùng một bản sao tạm, nên bạn không thể làm hỏng gì.

Các bảng dùng nhiều nhất:

| Bảng | Một dòng = | Dùng ở bài này để |
|---|---|---|
| `payments` | một lần thử thanh toán ở checkout | tỷ lệ thành công, số tiền theo tháng |
| `loans` | một khoản vay đã giải ngân | khoản vay đầu tiên của mỗi khách, fan-out |
| `repayment_schedule` | một kỳ trả góp hằng tháng của một khoản vay | cái bẫy fan-out |
| `wallets` / `wallet_transactions` | một ví / một lần tiền ra vào ví | LEFT JOIN, số dư lũy kế |
| `customers`, `merchants` | một khách hàng / một cửa hàng | phân nhóm |

### Vòng lặp của người phân tích

```text
 1. Viết câu hỏi thành một câu             "Card success rate, June 2026, VN time"
 2. Chọn grain của kết quả                 one row per ... (method? month?)
 3. Xây query từng bước nhỏ                filter -> join -> group -> compare
 4. Kiểm tra kết quả trước khi gửi         row counts, totals that must match
```

Bước 4 là bước người mới hay bỏ qua, và cũng là bước sếp nhớ mãi khi một con số hóa ra sai. Ta sẽ quay lại nó ở mục 9.

> **Hiểu lầm thường gặp:** "Query chạy không báo lỗi thì con số là đúng." SQL vui vẻ trả về một đáp án sai cho một câu hỏi viết sai. Báo lỗi mới là kết cục *tốt*; một con số sai mà trông hợp lý mới là thứ nguy hiểm.

## 2. Lọc theo ngày và giờ

Gần như câu hỏi kinh doanh nào cũng có khung thời gian: "tháng trước", "quý 2", "từ khi chạy chiến dịch". Trong `fintech.db`, timestamp là chuỗi dạng `YYYY-MM-DD HH:MM:SS`, lưu theo giờ **UTC** (Việt Nam là UTC+7). Ngày không có giờ, như `loans.disbursed_date`, có dạng `YYYY-MM-DD`. Vì định dạng đi từ đơn vị lớn đến nhỏ, so sánh chuỗi cũng chính là so sánh thời gian đúng thứ tự.

### Cái bẫy BETWEEN

"Tháng 6/2026 có bao nhiêu giao dịch thanh toán?" Đây là hai cách người ta hay viết:

```sql
-- Version A: looks natural
SELECT COUNT(*) FROM payments
WHERE created_at BETWEEN '2026-06-01' AND '2026-06-30';

-- Version B: half-open range
SELECT COUNT(*) FROM payments
WHERE created_at >= '2026-06-01' AND created_at < '2026-07-01';
```

| Cách viết | Kết quả |
|---|---|
| A: `BETWEEN '2026-06-01' AND '2026-06-30'` | 682 |
| B: `>= '2026-06-01' AND < '2026-07-01'` | 695 |

Cách A làm mất 13 giao dịch. Chuỗi `'2026-06-30 09:15:00'` *lớn hơn* `'2026-06-30'`, nên mọi giao dịch trong ngày 30/6 đều rơi ra ngoài khoảng. Cách B là **khoảng nửa mở** (half-open range: "từ mốc bắt đầu, đến *trước* mốc bắt đầu kế tiếp"), đúng cho cả ngày lẫn timestamp và không bao giờ đếm trùng ở ranh giới. Hãy dùng nó làm mặc định.

### "Tháng 6" theo giờ nào?

Con số 695 là tháng 6 theo giờ UTC. Một quản lý người Việt hiểu "tháng 6" theo giờ Việt Nam, tức là bắt đầu từ `2026-05-31 17:00:00` UTC. Bạn có thể dời ranh giới, hoặc dời timestamp:

```sql
-- Shift the timestamp to Vietnam time, then filter on the VN date
SELECT COUNT(*) FROM payments
WHERE date(created_at, '+7 hours') >= '2026-06-01'
  AND date(created_at, '+7 hours') <  '2026-07-01';
```

Kết quả là **697**. Ở đây chênh lệch nhỏ, nhưng trên báo cáo theo ngày, ngày UTC sẽ đẩy mọi giao dịch từ nửa đêm đến 7 giờ sáng (giờ Việt Nam) sang ngày hôm trước. Bài chất lượng dữ liệu đã giải thích vì sao; từ đây trở đi, mọi tháng và ngày trong bài này đều tính theo **giờ Việt Nam**, trừ khi ghi khác.

Dời ranh giới (`created_at >= '2026-05-31 17:00:00' AND created_at < '2026-06-30 17:00:00'`) cho ra đúng những dòng đó, và nhanh hơn trên bảng lớn, vì database so sánh trực tiếp cột thay vì phải tính `date(...)` cho từng dòng.

> **Tự làm thử:** trong SQL Practice, chạy `SELECT COUNT(*) FROM payments WHERE created_at LIKE '2026-06-30%';`. Bạn sẽ thấy 13: đúng số giao dịch mà cách A làm mất.

## 3. Conditional aggregation: nhiều con số trong một lần quét

Sếp hiếm khi chỉ cần một con số. Họ cần một bảng nhỏ: theo từng phương thức thanh toán, bao nhiêu lần thử, bao nhiêu lần trót lọt, bao nhiêu lần lỗi, và tỷ lệ thành công. Bạn có thể viết bốn query. Người làm phân tích viết một query, dùng **conditional aggregation** (tổng hợp có điều kiện): đặt `CASE` bên trong `SUM()`.

```sql
SELECT
  method,
  COUNT(*)                                                           AS attempts,
  SUM(CASE WHEN status IN ('success', 'refunded') THEN 1 ELSE 0 END) AS went_through,
  SUM(CASE WHEN status = 'failed'  THEN 1 ELSE 0 END)                AS failed,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)                AS pending,
  ROUND(100.0 * SUM(CASE WHEN status IN ('success', 'refunded') THEN 1 ELSE 0 END)
        / SUM(CASE WHEN status <> 'pending' THEN 1 ELSE 0 END), 1)   AS success_rate_pct
FROM payments
GROUP BY method
ORDER BY attempts DESC;
```

| method | attempts | went_through | failed | pending | success_rate_pct |
|---|---|---|---|---|---|
| card | 2855 | 2541 | 305 | 9 | 89.3 |
| e_wallet | 1770 | 1600 | 167 | 3 | 90.5 |
| qr_code | 1563 | 1480 | 79 | 4 | 94.9 |
| bank_transfer | 1026 | 973 | 51 | 2 | 95 |
| bnpl | 416 | 397 | 19 | 0 | 95.4 |

Đọc `SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)` như sau: "với mỗi dòng, ghi 1 nếu nó lỗi, ngược lại ghi 0, rồi cộng các số 1 lại", tức là đếm số dòng lỗi. Đổi `1` thành `amount` là bạn có *số tiền* của các giao dịch lỗi.

Query trên giấu ba quyết định, và quyết định nào cũng làm con số thay đổi:

1. **`refunded` được tính là trót lọt.** Một giao dịch đã hoàn tiền *đã* thành công; tiền chỉ được trả lại sau đó. Chỉ đếm `status = 'success'` sẽ coi các giao dịch hoàn tiền như giao dịch thất bại.
2. **`pending` bị loại khỏi mẫu số.** Giao dịch đang chờ chưa có kết quả, nên không được tính là thất bại. Gộp quyết định 1 và 2 lại thì khác biệt rõ: trên toàn bảng, tính kiểu cẩu thả (`success` ÷ tất cả các dòng) ra 89.3%; tính theo cả hai quyết định ra 91.8%.
3. **`100.0`, không phải `100`.** Trong SQLite, số nguyên ÷ số nguyên là phép chia nguyên. `SUM(...) / COUNT(*)` trên các dòng thẻ trả về **0**, không phải 0.89. Nhân với `100.0` (hoặc `1.0`) trước sẽ biến nó thành số thập phân.

### Lối tắt của SQLite

Trong SQLite, một phép so sánh tự nó đã là 1 (đúng) hoặc 0 (sai), nên `SUM(status = 'failed')` đếm số dòng lỗi, còn `AVG(status = 'failed')` là *tỷ lệ* dòng lỗi. Ví dụ, `SELECT product, COUNT(*), SUM(status = 'approved') FROM loan_applications GROUP BY product;` trả về bnpl 2,916 hồ sơ với 1,397 được duyệt, và cash_loan 3,938 hồ sơ với 1,709 được duyệt.

Lối tắt này tiện khi khám phá dữ liệu. Với query mà người khác sẽ dùng lại, nên viết dạng `CASE`: nó chạy được ở mọi database (PostgreSQL, SQL Server, BigQuery…) và dễ đọc hơn.

### COUNT(cột) bỏ qua NULL

`COUNT(*)` đếm số dòng; `COUNT(credit_score)` chỉ đếm những dòng mà `credit_score` không NULL. Trên `loan_applications`, `COUNT(*)` là 6,854 nhưng `COUNT(credit_score)` là 6,547: 307 người nộp hồ sơ không có điểm. Khoảng chênh đó là thông tin, không phải lỗi: hãy nhớ đến nó mỗi khi bạn tính trung bình hoặc đếm một cột.

> **Hiểu lầm thường gặp:** "Tỷ lệ thành công chỉ là `success` chia cho tổng." Trạng thái nào được tính là thành công, dòng nào thuộc mẫu số, đều là quyết định nghiệp vụ. Hãy ghi chúng ngay cạnh con số.

## 4. Chia thời gian thành bucket với strftime

Để thấy xu hướng, bạn xếp mỗi dòng vào một **bucket** (ô) thời gian (một tháng, một tuần, một thứ trong tuần) rồi `GROUP BY` theo bucket đó. Hàm `strftime(format, timestamp, modifier)` của SQLite cắt timestamp xuống phần bạn cần; modifier `'+7 hours'` đồng thời đổi sang giờ Việt Nam.

| Bạn cần | Biểu thức | Ví dụ output |
|---|---|---|
| Tháng (giờ VN) | `strftime('%Y-%m', created_at, '+7 hours')` | `2026-06` |
| Ngày (giờ VN) | `date(created_at, '+7 hours')` | `2026-06-14` |
| Thứ trong tuần (0 = Chủ nhật) | `strftime('%w', created_at, '+7 hours')` | `0` |
| Thứ Hai đầu tuần (giờ VN) | `date(created_at, '+7 hours', '-6 days', 'weekday 1')` | `2026-06-08` |

(Database khác viết khác: `DATE_TRUNC` trong PostgreSQL và BigQuery, `DATE_FORMAT` trong MySQL. Ý tưởng thì giống nhau.)

### Giá trị thanh toán theo tháng

Tổng giá trị các giao dịch trót lọt thường gọi là **TPV** (total payment volume, tổng giá trị thanh toán); bài về payments sẽ định nghĩa kỹ.

```sql
SELECT
  strftime('%Y-%m', created_at, '+7 hours') AS month_vn,
  COUNT(*)                                  AS payments,
  SUM(amount)                               AS tpv_vnd
FROM payments
WHERE status IN ('success', 'refunded')
  AND created_at >= '2025-12-31 17:00:00'   -- 1 Jan 2026, 00:00 VN time
GROUP BY month_vn
ORDER BY month_vn;
```

| month_vn | payments | tpv_vnd |
|---|---|---|
| 2026-01 | 646 | 474188000 |
| 2026-02 | 617 | 432344000 |
| 2026-03 | 619 | 450394000 |
| 2026-04 | 579 | 444033000 |
| 2026-05 | 630 | 465175000 |
| 2026-06 | 660 | 493203000 |

> **Tự làm thử:** nhóm cùng những giao dịch đó theo `strftime('%w', created_at, '+7 hours')` thay vì theo tháng. Bạn sẽ thấy `0` (Chủ nhật) có 1,155 giao dịch và `6` (thứ Bảy) có 1,147, so với 909–993 cho mỗi ngày trong tuần: khách thanh toán nhiều hơn vào cuối tuần. Hãy sắp xếp theo con số chứ không theo tên thứ, nếu không "Fri" sẽ đứng trước "Mon".

### Cẩn thận với bucket cuối cùng

Bucket theo tuần cho tháng 6/2026 (giờ VN) cho thấy một cái bẫy kinh điển:

```sql
SELECT
  date(created_at, '+7 hours', '-6 days', 'weekday 1') AS week_start_vn,
  COUNT(*)                                            AS payments,
  SUM(amount)                                         AS tpv_vnd
FROM payments
WHERE status IN ('success', 'refunded')
  AND created_at >= '2026-05-31 17:00:00'
  AND created_at <  '2026-06-30 17:00:00'
GROUP BY week_start_vn
ORDER BY week_start_vn;
```

| week_start_vn | payments | tpv_vnd |
|---|---|---|
| 2026-06-01 | 146 | 100745000 |
| 2026-06-08 | 159 | 110617000 |
| 2026-06-15 | 164 | 145287000 |
| 2026-06-22 | 155 | 117612000 |
| 2026-06-29 | 36 | 18942000 |

"Cú sụt" ở tuần cuối không có thật: tuần đó chỉ có hai ngày (29 và 30/6) vì tháng đã hết. Một bucket chưa đủ kỳ phải được ghi chú, bỏ đi, hoặc so sánh theo trung bình ngày; đừng bao giờ đặt nó cạnh các tuần đủ ngày trên biểu đồ mà không có chú thích.

> **Góc BA:** spec của báo cáo nên ghi rõ bucket: "Tháng = tháng dương lịch theo giờ Việt Nam (UTC+7); tuần bắt đầu từ thứ Hai; kỳ hiện tại chưa đủ ngày được tô xám." Hai developer cùng đọc chữ "theo tháng" mà không có dòng này sẽ làm ra hai báo cáo khác nhau.

## 5. JOIN và LEFT JOIN trên dữ liệu fintech

Bạn đã biết khác biệt từ bài SQL cơ bản: `JOIN` chỉ giữ những dòng khớp ở cả hai bên; `LEFT JOIN` giữ mọi dòng của bảng bên trái và điền NULL khi không khớp. Trong phân tích, lựa chọn này quyết định **ai nằm trong mẫu số** của bạn.

Câu hỏi: "Bao nhiêu phần trăm khách hàng có ví?"

```sql
-- INNER JOIN: only customers who HAVE a wallet survive
SELECT COUNT(*) FROM customers c
JOIN wallets w ON w.customer_id = c.customer_id;           -- 2235

-- LEFT JOIN: every customer survives
SELECT COUNT(*) FROM customers c
LEFT JOIN wallets w ON w.customer_id = c.customer_id;      -- 4000
```

Với inner join, mọi khách bạn đếm đều có ví, nên "tỷ lệ" luôn là 100% theo cách xây dựng. Left join giữ đủ 4,000 khách, và `COUNT(w.wallet_id)` (bỏ qua NULL) chỉ đếm những người có ví:

```sql
SELECT
  c.kyc_status,
  COUNT(*)                       AS customers,
  COUNT(w.wallet_id)             AS with_wallet,
  COUNT(*) - COUNT(w.wallet_id)  AS without_wallet
FROM customers c
LEFT JOIN wallets w ON w.customer_id = c.customer_id
GROUP BY c.kyc_status
ORDER BY customers DESC;
```

| kyc_status | customers | with_wallet | without_wallet |
|---|---|---|---|
| verified | 3618 | 2235 | 1383 |
| pending | 241 | 0 | 241 |
| rejected | 141 | 0 | 141 |

Vậy 2,235 trên 4,000 khách (khoảng 56%) có ví, và chỉ khách đã qua eKYC mới có. Phát hiện sau cũng có ích: đó là một quy tắc sản phẩm hiện ra trong dữ liệu.

### Cái WHERE âm thầm biến LEFT JOIN thành JOIN

"Liệt kê mọi khách hàng, kèm ví nếu ví đang active." Cách thử đầu tiên rất tự nhiên:

```sql
SELECT COUNT(*)
FROM customers c
LEFT JOIN wallets w ON w.customer_id = c.customer_id
WHERE w.status = 'active';                                  -- 2130
```

Chỉ có 2,130 dòng, không phải 4,000. Với khách không có ví, `w.status` là NULL, mà `NULL = 'active'` không đúng, nên `WHERE` loại họ đi. Hãy đặt điều kiện của bảng bên phải **vào trong `ON`**:

```sql
SELECT COUNT(*), COUNT(w.wallet_id)
FROM customers c
LEFT JOIN wallets w
  ON w.customer_id = c.customer_id
 AND w.status = 'active';                                   -- 4000 rows, 2130 active wallets
```

Quy tắc nhớ nhanh: trong `LEFT JOIN`, điều kiện về bảng **bên trái** đặt ở `WHERE`; điều kiện về bảng **bên phải** đặt ở `ON`.

> **Tự làm thử:** tìm khách đã eKYC nhưng chưa từng mở ví: `LEFT JOIN wallets` rồi thêm `WHERE w.wallet_id IS NULL AND c.kyc_status = 'verified'`. Bạn sẽ được 1,383, một danh sách có sẵn cho chiến dịch "mở ví ngay".

## 6. Cái bẫy fan-out: khi JOIN đếm trùng

Đây là cách phổ biến nhất khiến người làm phân tích công bố một con số sai. Nó xảy ra khi bạn join một bảng phía "một" với một bảng phía "nhiều", rồi cộng một cột của phía "một".

Một khoản vay có nhiều kỳ trả góp. Hãy xem khoản vay số 1 khi join với lịch trả nợ của nó:

```sql
SELECT l.loan_id, l.principal, r.installment_no, r.due_date, r.amount_due, r.amount_paid
FROM loans l
JOIN repayment_schedule r ON r.loan_id = l.loan_id
WHERE l.loan_id = 1
ORDER BY r.installment_no;
```

| loan_id | principal | installment_no | due_date | amount_due | amount_paid |
|---|---|---|---|---|---|
| 1 | 3100000 | 1 | 2025-02-02 | 517000 | 517000 |
| 1 | 3100000 | 2 | 2025-03-02 | 517000 | 517000 |
| 1 | 3100000 | 3 | 2025-04-02 | 517000 | 517000 |
| 1 | 3100000 | 4 | 2025-05-02 | 517000 | 517000 |
| 1 | 3100000 | 5 | 2025-06-02 | 517000 | 517000 |
| 1 | 3100000 | 6 | 2025-07-02 | 517000 | 517000 |

Số tiền gốc (principal) 3,100,000 VND giờ xuất hiện **sáu lần**, mỗi kỳ một lần. `SUM(l.principal)` trên các dòng này ra 18,600,000, gấp sáu lần khoản vay thật. Hiện tượng lặp này gọi là **fan-out** ("xòe quạt"): phép join làm một dòng xòe ra thành nhiều dòng.

Ở quy mô cả công ty:

```sql
-- WRONG: principal is repeated once per installment
SELECT COUNT(*) AS rows_after_join, SUM(l.principal) AS total_principal_wrong
FROM loans l
JOIN repayment_schedule r ON r.loan_id = l.loan_id;
```

| | số dòng | tổng tiền gốc (VND) |
|---|---|---|
| Chỉ bảng `loans` | 3,106 | 34,040,900,000 |
| `loans` join `repayment_schedule` | 28,824 | 395,210,700,000 |

Con số sau khi join gấp khoảng 11.6 lần dư nợ cho vay thật: báo cáo sẽ nói đã cho vay khoảng 395 tỷ VND trong khi thực tế khoảng 34 tỷ.

### Cách sửa: tổng hợp trước, join sau

Thu bảng phía "nhiều" về một dòng cho mỗi khoản vay *trước khi* join, để phép join thành một-một:

```sql
WITH paid AS (
  SELECT loan_id, SUM(amount_paid) AS amount_paid
  FROM repayment_schedule
  GROUP BY loan_id                -- now one row per loan
)
SELECT
  l.product,
  COUNT(*)           AS loans,
  SUM(l.principal)   AS principal,
  SUM(p.amount_paid) AS amount_paid
FROM loans l
JOIN paid p ON p.loan_id = l.loan_id
GROUP BY l.product;
```

| product | loans | principal | amount_paid |
|---|---|---|---|
| bnpl | 1397 | 6469900000 | 4985175000 |
| cash_loan | 1709 | 27571000000 | 16622607000 |

Giờ tiền gốc theo sản phẩm cộng lại đúng 34,040,900,000, khớp với bảng `loans`. (`amount_paid` gồm cả lãi, nên nó không phải "tiền gốc đã trả"; bài về cho vay sẽ tách hai thứ này.)

Những cách phòng thủ khác:

- `COUNT(DISTINCT l.loan_id)` cho ra *số lượng* đúng sau fan-out, nhưng không có "SUM DISTINCT" nào an toàn cho số tiền: hai khoản vay khác nhau hoàn toàn có thể có cùng số tiền gốc.
- Join **hai** bảng phía "nhiều" vào cùng một bảng cha (các khoản vay *và* các giao dịch thanh toán của một khách) sẽ nhân số dòng của cả hai: một khách có 2 khoản vay và 5 giao dịch thành 10 dòng. Hãy tổng hợp từng bảng ở một bước riêng, rồi mới join các bản tóm tắt.

> **Hiểu lầm thường gặp:** "JOIN chỉ thêm cột." JOIN còn có thể thêm *dòng*. Trước khi tin bất kỳ phép SUM nào sau một phép join, hãy hỏi: "Một dòng bên này có thể khớp với nhiều dòng bên kia không?"

## 7. CTE: xây query từng bước

Query phân tích dài sẽ dễ đọc khi bạn tách nó thành các bước có tên. **CTE** (common table expression) là một kết quả tạm, có tên, chỉ tồn tại trong một query, viết bằng `WITH ten AS ( ... )`. Mỗi bước được đọc các bước trước nó, giống các dòng công thức nối tiếp nhau trong bảng tính.

Câu hỏi từ team payments: "Khách trả tiền chia thế nào theo số lần thanh toán, và mỗi nhóm chi bao nhiêu?"

```sql
WITH paid AS (               -- step 1: only payments that went through
  SELECT customer_id, amount
  FROM payments
  WHERE status IN ('success', 'refunded')
),
per_customer AS (            -- step 2: one row per paying customer
  SELECT customer_id, COUNT(*) AS n_payments, SUM(amount) AS spend
  FROM paid
  GROUP BY customer_id
),
bucketed AS (                -- step 3: put each customer in a bucket
  SELECT *,
    CASE
      WHEN n_payments = 1 THEN '1 payment'
      WHEN n_payments <= 3 THEN '2-3 payments'
      ELSE '4+ payments'
    END AS bucket
  FROM per_customer
)
SELECT bucket,
  COUNT(*)          AS customers,
  SUM(n_payments)   AS payments,
  SUM(spend)        AS spend_vnd,
  ROUND(AVG(spend)) AS avg_spend_vnd
FROM bucketed
GROUP BY bucket
ORDER BY bucket;
```

| bucket | customers | payments | spend_vnd | avg_spend_vnd |
|---|---|---|---|---|
| 1 payment | 911 | 911 | 665448000 | 730459 |
| 2-3 payments | 1307 | 3137 | 2303834000 | 1762689 |
| 4+ payments | 615 | 2943 | 2155537000 | 3504938 |

Nhóm "4+" chỉ chiếm khoảng một phần năm số khách trả tiền nhưng mang về khoảng 42% số tiền: 2,155,537,000 trên 5,124,819,000 VND.

### Vì sao nên xây theo cách này

1. **Kiểm tra được từng bước.** Thay `SELECT` cuối bằng `SELECT * FROM per_customer LIMIT 10` để xem dòng thật trước khi đi tiếp.
2. **Grain được ghi rõ.** Comment của bước 2 nói "one row per paying customer", nên sau này không ai join nhầm nó.
3. **Dễ review.** Đồng nghiệp đọc ba bước nhỏ thay vì một khối lồng nhau.

Và phép kiểm tra: các bucket cộng lại 911 + 1,307 + 615 = 2,833 khách và 6,991 giao dịch, đúng bằng `COUNT(DISTINCT customer_id)` và `COUNT(*)` khi tính trực tiếp trên các giao dịch trót lọt.

> **Góc BA:** các bước CTE khớp gọn với định nghĩa chỉ số trong tài liệu yêu cầu: "Tập dữ liệu: giao dịch có status success hoặc refunded. Grain: mỗi khách một dòng. Quy tắc bucket: 1 / 2–3 / 4+." Nếu bạn viết định nghĩa trước, query gần như tự viết ra, và developer làm dashboard có thể đối chiếu query của họ với của bạn từng bước một.

## 8. Window function: số dư lũy kế, khoản vay đầu tiên, so với tháng trước

`GROUP BY` ép nhiều dòng thành một. Đôi khi bạn muốn giữ nguyên từng dòng *và* nhìn thấy điều gì đó về các dòng xung quanh: số dư sau mỗi giao dịch, đây có phải khoản vay đầu tiên của khách không, giá trị tháng trước đặt cạnh tháng này. Đó là việc của **window function** (hàm cửa sổ). Mẫu chung:

```text
FUNCTION(...) OVER (PARTITION BY <group> ORDER BY <order>)
   PARTITION BY = restart the calculation for each group (e.g. each wallet)
   ORDER BY     = the order in which rows are walked through
```

Hiểu nôm na: `PARTITION BY` = tính lại từ đầu cho mỗi nhóm (ví dụ mỗi ví); `ORDER BY` = thứ tự đi qua các dòng.

### Số dư ví lũy kế

```sql
SELECT
  created_at,
  txn_type,
  amount,
  status,
  SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END)
    OVER (PARTITION BY wallet_id ORDER BY created_at, txn_id) AS running_balance
FROM wallet_transactions
WHERE wallet_id = 1
ORDER BY created_at, txn_id;
```

| created_at | txn_type | amount | status | running_balance |
|---|---|---|---|---|
| 2026-03-31 15:59:42 | top_up | 100000 | success | 100000 |
| 2026-03-31 16:00:33 | payment | -62000 | success | 38000 |
| 2026-04-07 08:24:44 | payment | -136000 | failed | 38000 |
| 2026-04-14 18:49:59 | top_up | 550000 | success | 588000 |
| 2026-04-14 18:50:55 | payment | -541000 | success | 47000 |
| 2026-06-09 16:25:15 | transfer_out | -150000 | failed | 47000 |

Mỗi dòng cho biết số dư *sau* giao dịch đó. Các dòng lỗi cộng thêm 0, vì vậy số dư đứng yên khi một khoản thanh toán 136,000 VND thất bại trên số dư 38,000. Con số cuối 47,000 bằng đúng `wallets.balance` của ví 1, nên ví này khớp sổ. (`txn_id` trong `ORDER BY` để phân định khi hai dòng trùng timestamp.)

### Khoản vay đầu tiên của mỗi khách với ROW_NUMBER

`ROW_NUMBER()` đánh số các dòng 1, 2, 3… trong mỗi partition. Đánh số các khoản vay của mỗi khách theo ngày cho biết khoản nào là khoản đầu tiên:

```sql
WITH numbered AS (
  SELECT
    customer_id, loan_id, product, principal, disbursed_date,
    ROW_NUMBER() OVER (PARTITION BY customer_id
                       ORDER BY disbursed_date, loan_id) AS loan_seq
  FROM loans
)
SELECT
  CASE WHEN loan_seq = 1 THEN 'first loan' ELSE 'repeat loan' END AS loan_type,
  COUNT(*)              AS loans,
  ROUND(AVG(principal)) AS avg_principal_vnd
FROM numbered
GROUP BY loan_type;
```

| loan_type | loans | avg_principal_vnd |
|---|---|---|
| first loan | 2108 | 10936101 |
| repeat loan | 998 | 11009619 |

Có 2,108 khoản vay đầu tiên, đúng bằng số khách khác nhau có khoản vay, một phép kiểm tra có sẵn. Khoảng một phần ba số khoản vay (998 trên 3,106) thuộc về khách quay lại. Muốn lấy danh sách "khoản vay đầu tiên của mỗi khách", hãy lọc `WHERE loan_seq = 1` ở bước cuối. Bạn không thể đặt window function trực tiếp trong `WHERE`; đó là lý do cần CTE.

### So với tháng trước với LAG

`LAG(x)` trả về giá trị `x` của dòng liền trước trong cửa sổ. Kết hợp với TPV theo tháng ở mục 4:

```sql
WITH monthly AS (
  SELECT strftime('%Y-%m', created_at, '+7 hours') AS month_vn,
         SUM(amount) AS tpv
  FROM payments
  WHERE status IN ('success', 'refunded')
  GROUP BY month_vn
),
with_prev AS (
  SELECT month_vn, tpv,
         LAG(tpv) OVER (ORDER BY month_vn) AS prev_tpv
  FROM monthly
)
SELECT month_vn, tpv, prev_tpv,
       ROUND(100.0 * (tpv - prev_tpv) / prev_tpv, 1) AS mom_pct
FROM with_prev
WHERE month_vn >= '2026-01'
ORDER BY month_vn;
```

| month_vn | tpv | prev_tpv | mom_pct |
|---|---|---|---|
| 2026-01 | 474188000 | 388739000 | 22 |
| 2026-02 | 432344000 | 474188000 | -8.8 |
| 2026-03 | 450394000 | 432344000 | 4.2 |
| 2026-04 | 444033000 | 450394000 | -1.4 |
| 2026-05 | 465175000 | 444033000 | 4.8 |
| 2026-06 | 493203000 | 465175000 | 6 |

Để ý *vị trí* của `WHERE month_vn >= '2026-01'`: nó nằm sau khi `LAG` đã được tính. Nếu bạn đặt bộ lọc vào bước `monthly`, tháng 12/2025 bị loại trước khi `LAG` chạy, và `prev_tpv` của tháng 1 thành NULL. Window function chỉ nhìn thấy những dòng còn sống sót sau bộ lọc của chính bước đó.

> **Hiểu lầm thường gặp:** "Window function là phần nâng cao, bỏ qua cũng được." Số dư lũy kế, "đầu tiên/cuối cùng của mỗi khách" và "so với tháng trước" thuộc loại câu hỏi gặp nhiều nhất trong báo cáo fintech. Ba mẫu này đã đủ cho phần lớn nhu cầu của bạn.

## 9. Tự kiểm tra kết quả của mình

Người làm phân tích chuyên nghiệp kiểm tra trước khi gửi. Mỗi phép kiểm tra dưới đây mất khoảng một phút và bắt được phần lớn lỗi:

| Kiểm tra | Cách làm | Ví dụ trong bài |
|---|---|---|
| Số dòng trước và sau join | `COUNT(*)` trên bảng gốc, rồi trên phép join | `loans` 3,106 → sau join 28,824: báo động fan-out |
| Các phần cộng lại bằng tổng | Cộng các nhóm, so với query không chia nhóm | Bucket: 2,833 khách = số người trả tiền |
| Hai con đường, một đáp án | Tính cùng con số từ một bảng khác | Hồ sơ approved 3,106 = số dòng `loans` 3,106 |
| Khóa thật sự duy nhất | `GROUP BY key HAVING COUNT(*) > 1` phải không trả về gì | Mỗi khách một ví: 0 dòng |
| Nhóm NULL hiện rõ | Tìm bucket NULL sau `GROUP BY` | Dải điểm: 307 hồ sơ không có điểm |
| Khung thời gian đủ | `MIN`/`MAX` của ngày; bucket cuối có thiếu ngày không? | Tuần bắt đầu 29/6 chỉ có 2 ngày |
| Độ lớn hợp lý | Con số chia theo đơn vị có hợp lý không? | 395 tỷ VND cho 3,106 khoản vay = 127 triệu mỗi khoản? Đáng ngờ |

Một phép kiểm tra tính duy nhất bằng SQL:

```sql
-- Is session_id unique in payments? (One checkout should produce one payment)
SELECT COUNT(*) AS sessions_with_2_payments
FROM (
  SELECT session_id FROM payments
  GROUP BY session_id
  HAVING COUNT(*) > 1
);
-- 37
```

Kết quả là 37, và bạn đã biết vì sao: đó là các giao dịch trừ tiền hai lần (double charge) trong bài chất lượng dữ liệu. Kiểm tra tính duy nhất là cách phát hiện những vấn đề như vậy *trước khi* chúng thổi phồng con số doanh thu.

### Bucket NULL

Nếu không có nhánh cho NULL, một biểu thức `CASE` hoặc đẩy các dòng NULL vào một nhóm NULL không tên, hoặc tệ hơn, vào nhánh `ELSE`. Hãy đặt tên cho trường hợp NULL trước tiên:

```sql
SELECT
  CASE
    WHEN credit_score IS NULL THEN 'no score'
    WHEN credit_score >= 650  THEN '650+'
    WHEN credit_score >= 560  THEN '560-649'
    ELSE 'under 560'
  END      AS score_band,
  COUNT(*) AS applications
FROM loan_applications
GROUP BY score_band
ORDER BY score_band;
```

| score_band | applications |
|---|---|
| 560-649 | 2681 |
| 650+ | 2707 |
| no score | 307 |
| under 560 | 1159 |

Nếu bạn viết `ELSE 'under 560'` mà *không* có nhánh NULL, 307 người "hồ sơ mỏng" (thin-file, chưa có lịch sử tín dụng) sẽ bị âm thầm tính là điểm thấp, làm sai lệch mọi phân tích về điểm.

> **Góc BA:** đưa các phép kiểm tra này vào acceptance criteria của báo cáo: "Với dữ liệu tháng 6/2026, tổng các dòng theo phương thức bằng dòng tổng; số khoản vay bằng số hồ sơ được duyệt." Tester có thể nghiệm thu báo cáo mà không cần hiểu câu SQL phía sau.

## 10. Bài tập thực hành

Chạy các bài SQL trong [SQL Practice → Fintech](/practice/sql?db=fintech). Hãy tự làm trước khi đọc đáp án.

### Bài 1 — Đọc kết quả LEFT JOIN

Một đồng nghiệp vận hành gửi bạn bốn dòng từ `customers LEFT JOIN wallets` (khách 2, 3, 4 và 135):

| customer_id | kyc_status | wallet_id | wallet_status |
|---|---|---|---|
| 2 | verified | 1 | active |
| 3 | verified | NULL | NULL |
| 4 | pending | NULL | NULL |
| 135 | verified | 72 | locked |

Bao nhiêu khách trong số này có ví? Khách nào phù hợp để gửi push notification "mở ví ngay", và vì sao không phải những người còn lại?

**Đáp án:** Hai khách có ví (2 và 135; ví 72 đang bị khóa nhưng vẫn tồn tại). Khách 3 và 4 không có ví: NULL ở `wallet_id` nghĩa là "không khớp", không phải "không rõ số ví". Đối tượng phù hợp là **khách 3**: đã eKYC nhưng chưa có ví. Khách 4 chưa thể mở ví cho đến khi qua eKYC (trong dữ liệu này, chỉ khách đã xác minh mới có ví), nên thông điệp đúng cho họ là "hoàn tất eKYC".

### Bài 2 — Tính tỷ lệ thành công bằng tay

Trạng thái giao dịch thẻ trong toàn kỳ: success 2,471 · refunded 70 · failed 305 · pending 9. Tính tỷ lệ thành công của thẻ, tự quyết định cách xử lý các dòng refunded và pending.

**Đáp án:** Giao dịch đã hoàn tiền vẫn là đã trót lọt, nên số trót lọt = 2,471 + 70 = 2,541. Giao dịch pending chưa có kết quả, nên mẫu số = 2,855 − 9 = 2,846. Tỷ lệ thành công = 2,541 ÷ 2,846 ≈ **89.3%**, khớp với bảng ở mục 3. Nếu chỉ đếm `success` trên tất cả các dòng thì được 2,471 ÷ 2,855 ≈ 86.5%: thấp hơn gần ba điểm phần trăm, chỉ vì định nghĩa.

### Bài 3 — Nạp ví theo tháng (SQL)

Team ví cần, cho tháng 4–6/2026 (giờ Việt Nam): số lần nạp tiền thành công, số ví khác nhau đã nạp, và tổng số tiền, theo từng tháng.

**Đáp án:**

```sql
SELECT
  strftime('%Y-%m', created_at, '+7 hours') AS month_vn,
  COUNT(*)                                  AS top_ups,
  COUNT(DISTINCT wallet_id)                 AS wallets,
  SUM(amount)                               AS top_up_vnd
FROM wallet_transactions
WHERE txn_type = 'top_up'
  AND status = 'success'
  AND created_at >= '2026-03-31 17:00:00'   -- 1 Apr 2026 00:00 VN
  AND created_at <  '2026-06-30 17:00:00'   -- 1 Jul 2026 00:00 VN
GROUP BY month_vn
ORDER BY month_vn;
```

| month_vn | top_ups | wallets | top_up_vnd |
|---|---|---|---|
| 2026-04 | 1308 | 872 | 821700000 |
| 2026-05 | 1362 | 895 | 826710000 |
| 2026-06 | 1413 | 959 | 861160000 |

Chú ý `COUNT(DISTINCT wallet_id)`: một ví nạp ba lần vẫn là một ví, không phải ba.

### Bài 4 — Tìm lỗi: GMV theo thiết bị

Một đồng nghiệp muốn tính giá trị thanh toán theo thiết bị và viết:

```sql
SELECT p.device, COUNT(*) AS payments, SUM(p.amount) AS gmv
FROM payments p
JOIN checkout_events e ON e.session_id = p.session_id
WHERE p.status IN ('success', 'refunded')
GROUP BY p.device;
```

Kết quả: android 18,175 giao dịch và 13,200,535,000 VND. Sai ở đâu, và con số đúng là bao nhiêu?

**Đáp án:** Fan-out. `checkout_events` có nhiều dòng cho mỗi session (view_cart, start_checkout, select_payment, submit_payment, payment_success), nên mỗi giao dịch bị lặp lại theo số event: ở đây là năm lần. Phép join này hoàn toàn không cần, vì `device` đã có sẵn trong `payments`:

```sql
SELECT device, COUNT(*) AS payments, SUM(amount) AS gmv
FROM payments
WHERE status IN ('success', 'refunded')
GROUP BY device;
```

| device | payments | gmv |
|---|---|---|
| android | 3635 | 2640107000 |
| ios | 2093 | 1539622000 |
| web | 1263 | 945090000 |

18,175 ÷ 3,635 = đúng 5: phép kiểm tra số dòng lẽ ra đã bắt được lỗi này.

### Bài 5 — Bao lâu thì khách vay khoản thứ hai? (SQL, window function)

Với những khách đã vay ít nhất hai lần, trung bình bao nhiêu ngày trôi qua giữa lần giải ngân thứ nhất và thứ hai?

**Đáp án:**

```sql
WITH numbered AS (
  SELECT
    customer_id,
    disbursed_date,
    ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY disbursed_date, loan_id) AS loan_seq,
    LAG(disbursed_date) OVER (PARTITION BY customer_id ORDER BY disbursed_date, loan_id) AS prev_date
  FROM loans
)
SELECT
  COUNT(*)                                                     AS second_loans,
  ROUND(AVG(julianday(disbursed_date) - julianday(prev_date))) AS avg_days_gap,
  MIN(julianday(disbursed_date) - julianday(prev_date))        AS min_gap,
  MAX(julianday(disbursed_date) - julianday(prev_date))        AS max_gap
FROM numbered
WHERE loan_seq = 2;
```

| second_loans | avg_days_gap | min_gap | max_gap |
|---|---|---|---|
| 734 | 161 | 1 | 489 |

Có 734 khách quay lại, trung bình sau khoảng 161 ngày (chừng năm tháng). `julianday` đổi một ngày thành số thứ tự ngày để bạn trừ hai ngày cho nhau. Kiểm tra: số khách có từ 2 khoản vay trở lên, tính bằng `GROUP BY customer_id HAVING COUNT(*) >= 2`, cũng là 734.

### Bài 6 — Con số cho stakeholder

Trưởng bộ phận ví hỏi: "Tháng trước có bao nhiêu khách thanh toán bằng ví?" (Hôm nay là 30/6/2026; "tháng trước" ở đây nghĩa là tháng 6/2026, giờ Việt Nam.) Một bạn analyst mới trả lời "1,770" từ `SELECT COUNT(*) FROM payments WHERE method = 'e_wallet'`. Hãy liệt kê chỗ sai và đưa ra con số đúng.

**Đáp án:** Ba lỗi: (1) không lọc ngày, nên tính cả năm dữ liệu; (2) đếm *dòng giao dịch* chứ không đếm *khách*; (3) tính cả các lần thanh toán thất bại. Sửa lại:

```sql
SELECT
  COUNT(*)                    AS payment_rows,
  COUNT(DISTINCT customer_id) AS customers
FROM payments
WHERE method = 'e_wallet'
  AND status IN ('success', 'refunded')
  AND created_at >= '2026-05-31 17:00:00'
  AND created_at <  '2026-06-30 17:00:00';
```

| payment_rows | customers |
|---|---|
| 149 | 146 |

**146 khách** (149 giao dịch) trong tháng 6/2026. Khi trả lời, hãy kèm định nghĩa bên cạnh con số: "146 khách có ít nhất một giao dịch ví thành công hoặc đã hoàn tiền sau đó, từ 1 đến 30/6/2026, giờ Việt Nam."

## 11. Tóm tắt

- Dùng khoảng ngày nửa mở (`>= mốc đầu AND < mốc kế tiếp`), và nói rõ ngày/tháng của bạn theo múi giờ nào. `BETWEEN '…-01' AND '…-30'` làm mất ngày cuối khi cột là timestamp.
- Conditional aggregation (`SUM(CASE WHEN … THEN 1 ELSE 0 END)`, hoặc lối tắt `SUM(status = 'x')` của SQLite) dựng cả một bảng tóm tắt trong một lần quét. Nhân với `100.0` để tránh chia nguyên.
- Trạng thái nào tính là thành công, dòng nào nằm trong mẫu số, đều là định nghĩa: hãy ghi lại.
- Bucket thời gian với `strftime` cho thấy xu hướng; ghi chú hoặc bỏ bucket cuối chưa đủ kỳ.
- `LEFT JOIN` giữ mọi người trong mẫu số; điều kiện của bảng bên phải đặt ở `ON`, không đặt ở `WHERE`.
- Fan-out: join phía "một" với phía "nhiều" làm lặp dòng. Tổng hợp trước, join sau; kiểm tra số dòng.
- CTE xây query thành các bước có tên, kiểm tra được, mỗi bước có grain rõ ràng.
- Window function: `SUM() OVER` cho số lũy kế, `ROW_NUMBER()` cho đầu tiên/cuối cùng của mỗi khách, `LAG()` cho so với tháng trước.
- Kiểm tra trước khi gửi: số dòng, phần so với tổng, hai con đường, tính duy nhất, nhóm NULL, kỳ chưa đủ ngày, độ lớn hợp lý.

### Thuật ngữ chính

| Thuật ngữ | Nghĩa dễ hiểu |
|---|---|
| Half-open range (khoảng nửa mở) | Từ một mốc bắt đầu, đến trước mốc bắt đầu kế tiếp (`>=` và `<`) |
| Conditional aggregation | `SUM`/`COUNT` trên một `CASE`, để một query đếm nhiều loại cạnh nhau |
| Integer division (chia nguyên) | Số nguyên ÷ số nguyên bị bỏ phần thập phân trong SQLite (7 / 2 = 3) |
| Denominator (mẫu số) | Phần "trên tổng bao nhiêu" của một tỷ lệ |
| Bucket | Một nhóm dòng theo thời gian hoặc khoảng giá trị: một tháng, một tuần, một dải điểm |
| TPV | Total payment volume: tổng giá trị các giao dịch thanh toán trót lọt |
| Fan-out | Phép join làm lặp dòng vì một dòng khớp với nhiều dòng |
| Grain | Một dòng của kết quả đại diện cho cái gì |
| CTE (`WITH`) | Một bước tạm, có tên, bên trong một query |
| Window function | Phép tính trên các dòng liên quan mà vẫn giữ nguyên từng dòng (`OVER (...)`) |
| `PARTITION BY` | Tính lại từ đầu cho mỗi nhóm |
| `ROW_NUMBER()` | Đánh số dòng 1, 2, 3… trong mỗi partition |
| `LAG()` | Giá trị của dòng liền trước trong cửa sổ |
| Month-over-month (MoM) | Thay đổi so với tháng trước |

Bài tiếp theo: **Digital Lending Analytics** — dùng các công cụ SQL này trên danh mục cho vay: funnel hồ sơ, DPD và phân tích vintage.
