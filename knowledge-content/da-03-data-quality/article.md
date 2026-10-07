# Chất lượng dữ liệu & làm sạch: tìm và xử lý lỗi trong dữ liệu fintech

## 1. Vì sao chất lượng dữ liệu phải đi trước

Sếp hỏi thu nhập trung bình hằng tháng của khách hàng ở Hải Phòng. Bạn chạy một câu query, ra **22 triệu đồng**, và Hải Phòng thành "thành phố giàu nhất" trong báo cáo. Sau đó có người phát hiện hai khách ở đó đã gõ `999,999,999` vào ô thu nhập. Con số thật chỉ khoảng 14,7 triệu.

Đó là bài học của cả chủ đề này: **query chạy được không có nghĩa là câu trả lời đúng.** SQL vẫn vui vẻ tính trung bình cả lỗi gõ phím, đếm một giao dịch hai lần và xếp một đơn mua lúc nửa đêm vào sai ngày. Dữ liệu không bao giờ tự cảnh báo bạn.

**Chất lượng dữ liệu (data quality)** nghĩa là "dữ liệu này có đủ tin cậy cho quyết định ta sắp đưa ra không?". Các team thường chia nó thành sáu **chiều (dimension)**, tức sáu góc để kiểm tra:

| Chiều | Câu hỏi đơn giản | Ví dụ trong fintech.db |
|---|---|---|
| **Completeness** (đầy đủ) | Có thiếu gì không? | `monthly_income` bị NULL ở một số khách |
| **Validity** (hợp lệ) | Giá trị có theo đúng quy tắc (kiểu, khoảng, danh sách cho phép)? | Thu nhập 999.999.999 đồng/tháng |
| **Consistency** (nhất quán) | Cùng một thứ có được viết cùng một cách? | "Hanoi", "Ha Noi", "HN", " Hanoi" |
| **Uniqueness** (duy nhất) | Mỗi sự kiện thật có được ghi đúng một lần? | Một giao dịch thẻ bị lưu hai lần |
| **Timeliness** (kịp thời) | Dữ liệu có mới không, mọi quy trình đã xong chưa? | Giao dịch vẫn `pending` sau nhiều tháng |
| **Accuracy** (chính xác) | Có khớp với thực tế hoặc một nguồn đáng tin? | Số dư ví lệch với tổng giao dịch của chính ví đó |

Hãy dùng sáu chiều này như một **checklist**: trước khi tin một bảng, đi lần lượt qua sáu câu hỏi và ghi lại những gì tìm được.

```text
 raw data ──► profile ──► find problems ──► agree a rule ──► clean copy ──► analysis
 (never edited)  (counts, NULLs,  (six dimensions)               (view, CTE,
                  min, max, distinct)                             new sheet)
```

Database thực hành là công ty cho vay giả lập **VayNhanh** (ngày chốt số liệu 2026-06-30, mọi thời điểm lưu theo UTC), với mọi lỗi ở bảng trên được cài sẵn có chủ đích. Mở [SQL Practice → Fintech](/practice/sql?db=fintech) và chạy từng query trong lúc đọc.

> **Common misconception:** "Dữ liệu sạch là không có NULL." Có những NULL hoàn toàn đúng: `decided_at` là NULL khi hồ sơ vay còn đang chờ, `failure_reason` là NULL với giao dịch thành công. Chất lượng nghĩa là **phù hợp với mục đích sử dụng**, không phải trông gọn gàng.

## 2. Giá trị bị thiếu (completeness)

`COUNT(*)` đếm số dòng; `COUNT(cột)` chỉ đếm những dòng mà cột đó **không** NULL. Khoảng chênh giữa hai số chính là dữ liệu bị thiếu.

```sql
SELECT COUNT(*)              AS rows_total,
       COUNT(monthly_income) AS rows_with_income,
       COUNT(*) - COUNT(monthly_income) AS missing_income
FROM customers;
```

| rows_total | rows_with_income | missing_income |
|---|---|---|
| 4000 | 3768 | 232 |

Vậy 232 trên 4.000 khách (khoảng 5,8%) chưa từng khai thu nhập. Kiểm tra tương tự trên `loan_applications` cho thấy 307 trên 6.854 hồ sơ (khoảng 4,5%) không có `credit_score`: đó là khách **"thin-file"** (hồ sơ mỏng), chưa có lịch sử tín dụng để chấm điểm.

### NULL là "chưa biết", không phải số 0

`AVG` lặng lẽ bỏ qua NULL, nên con số trung bình chỉ mô tả những người đã trả lời. Cách "sửa" nguy hiểm là biến NULL thành 0:

```sql
SELECT ROUND(AVG(credit_score), 1)              AS avg_known_scores,
       ROUND(AVG(COALESCE(credit_score, 0)), 1) AS avg_null_as_zero
FROM loan_applications;
```

| avg_known_scores | avg_null_as_zero |
|---|---|
| 631.2 | 603 |

Coi "chưa có lịch sử" là điểm 0 kéo trung bình xuống khoảng 28 điểm và tự bịa ra 307 người vay cực tệ. Thiếu điểm tín dụng là **một kiểu khách hàng khác**, không phải khách hàng xấu.

Các cách xử lý giá trị thiếu, từ an toàn nhất: **báo cáo** tỉ lệ thiếu; **tách nhóm** riêng ("không khai thu nhập"); **hỏi nguyên nhân** (trường không bắt buộc? app phiên bản cũ?); **điền giá trị (impute)** bằng một giá trị điển hình, chỉ khi có quy tắc đã thống nhất và luôn kèm một cột cờ (flag).

> **Try it yourself:** chạy `SELECT employment, COUNT(*) - COUNT(monthly_income) AS missing FROM customers GROUP BY employment;` Thu nhập bị thiếu xuất hiện ở cả bốn nhóm nghề; nhóm salaried (làm công ăn lương) thiếu nhiều nhất (133) đơn giản vì đó là nhóm đông nhất.

## 3. Giá trị ngoại lai và giá trị không hợp lệ (validity)

**Outlier** (giá trị ngoại lai) là giá trị nằm rất xa phần còn lại. Có outlier là thật (một khách kiếm 70 triệu/tháng); có outlier là **không hợp lệ (invalid)**, tức không thể đúng. Luôn xem hai đầu cực trước:

```sql
SELECT customer_id, city, employment, monthly_income
FROM customers
ORDER BY monthly_income DESC
LIMIT 5;
```

| customer_id | city | employment | monthly_income |
|---|---|---|---|
| 417 | Hai Phong | freelancer | 999999999 |
| 1288 | Hai Phong | salaried | 999999999 |
| 2650 | Hanoi | salaried | 999999999 |
| 1473 | Can Tho | salaried | 74200000 |
| 777 | Hanoi | salaried | 73300000 |

Chín số 9 liên tiếp là kiểu **giá trị giữ chỗ (placeholder) hoặc lỗi gõ** kinh điển. Giá trị kế tiếp, 74,2 triệu, thì hoàn toàn tin được. Ba dòng trên 4.000 nghe có vẻ vô hại, nhưng hãy nhìn một phân khúc:

```sql
SELECT city,
       ROUND(AVG(monthly_income))                    AS avg_raw,
       ROUND(AVG(NULLIF(monthly_income, 999999999))) AS avg_clean
FROM customers
WHERE city IN ('Ho Chi Minh City', 'Hanoi', 'Hai Phong', 'Da Nang')
GROUP BY city
ORDER BY avg_raw DESC;
```

| city | avg_raw | avg_clean |
|---|---|---|
| Hai Phong | 22089552 | 14736842 |
| Hanoi | 18793156 | 17859562 |
| Ho Chi Minh City | 17024164 | 17024164 |
| Da Nang | 14075779 | 14075779 |

Chỉ hai lỗi gõ đã đẩy Hải Phòng từ hạng ba lên hạng nhất. `NULLIF(x, 999999999)` trả về NULL khi `x` bằng giá trị lỗi, nên `AVG` bỏ qua nó: ta coi lỗi gõ là "chưa biết" thay vì đoán khách định gõ gì. Tính trên toàn bộ khách, trung bình giảm từ khoảng 17,1 xuống khoảng 16,3 triệu.

### Quy tắc hợp lệ

**Validity rule** (quy tắc hợp lệ) là một phép kiểm tra mà mọi dòng đều phải qua. Hãy viết sao cho nó trả về các dòng **sai**; không có dòng nào nghĩa là đạt.

| Quy tắc | Dòng sai | Kết quả |
|---|---|---|
| Điểm tín dụng trong khoảng 300–850 | `WHERE credit_score NOT BETWEEN 300 AND 850` | 0 |
| Số tiền thanh toán dương | `WHERE amount <= 0` | 0 |
| Hồ sơ bị từ chối phải có lý do | `WHERE status = 'rejected' AND reject_reason IS NULL` | 0 |
| Quyết định đến sau ngày nộp hồ sơ | `WHERE decided_at < applied_at` | 0 |
| Thu nhập dưới một mức trần hợp lý | `WHERE monthly_income > 200000000` | 3 |

Hãy giữ cả những kiểm tra đã đạt: chúng là bằng chứng, và sẽ bắt được ngày một bản release làm hỏng dữ liệu.

> **Common misconception:** "Outlier thì phải xóa." Xóa người kiếm 74 triệu là bạn xóa một khách hàng thật. Chỉ những giá trị **không thể đúng hoặc đã xác nhận là sai** mới bị loại, và chỉ loại trong bản sao đã làm sạch.

## 4. Danh mục không nhất quán (consistency)

Cột `city` lấy từ một ô nhập tự do trên form đăng ký. Hãy **profile** (khảo sát nhanh) mọi cột danh mục bằng `GROUP BY`:

```sql
SELECT city, COUNT(*) AS customers
FROM customers
GROUP BY city
ORDER BY customers DESC;
```

Kết quả có **20 giá trị khác nhau cho 9 thành phố thật**: chín tên chuẩn, cộng thêm `hanoi` (20), `Ha Noi` (14), `HCMC` (14), `TP.HCM` (13), ` Hanoi` có dấu cách ở đầu (13), `HN` (12), `ho chi minh city` (10), `Ho Chi Minh` (10), `Danang` (8), `Ho Chi Minh City ` có dấu cách ở cuối (7) và `DN` (6). Dấu cách thừa vô hình trong hầu hết công cụ, nên chúng sống rất lâu.

Cách sửa là một **bảng ánh xạ (mapping)**: cắt khoảng trắng, chuyển chữ thường, rồi dịch mỗi biến thể về một tên chuẩn.

```sql
SELECT CASE
         WHEN LOWER(TRIM(city)) IN ('ho chi minh city', 'ho chi minh', 'hcmc', 'tp.hcm') THEN 'Ho Chi Minh City'
         WHEN LOWER(TRIM(city)) IN ('hanoi', 'ha noi', 'hn') THEN 'Hanoi'
         WHEN LOWER(TRIM(city)) IN ('da nang', 'danang', 'dn') THEN 'Da Nang'
         ELSE TRIM(city)
       END AS city_clean,
       COUNT(*) AS customers
FROM customers
GROUP BY city_clean
ORDER BY customers DESC
LIMIT 3;
```

| city_clean | customers |
|---|---|
| Ho Chi Minh City | 1331 |
| Hanoi | 1166 |
| Da Nang | 316 |

Số thô trước đó là 1.277, 1.107 và 302. Báo cáo dựa trên cột thô đếm thiếu mọi thành phố lớn và còn hiện ra những "thành phố ma" tên "HN", "DN".

### Cùng cách sửa trong Excel hoặc Google Sheets

1. Xuất bảng `customers`; cạnh cột `city` (cột E) thêm cột phụ F: `=LOWER(TRIM(E2))`.
2. Ở một tab khác, lập **bảng mapping**: cột A = biến thể (`hcmc`, `tp.hcm`, `ha noi`…), cột B = tên chuẩn.
3. Ở cột `city_clean`: `=IFERROR(XLOOKUP(F2, Mapping!A:A, Mapping!B:B), PROPER(F2))` (Excel cũ dùng `VLOOKUP`).
4. Kiểm tra: pivot table trên `city_clean` phải ra đúng 9 thành phố.

Bảng mapping tốt hơn một chuỗi Find & Replace: nó nhìn thấy được, review được và dùng lại được tháng sau.

> **Góc BA:** danh mục không nhất quán trước hết là vấn đề **yêu cầu (requirements)**. Trong user story của form đăng ký, hãy quy định dropdown cho thành phố và một acceptance criterion kiểu "Thành phố được chọn từ danh sách tỉnh/thành chính thức; không chấp nhận nhập tự do". Một dòng trong story tiết kiệm một bước làm sạch ở mọi báo cáo về sau.

## 5. Bản ghi trùng: trừ tiền hai lần và retry (uniqueness)

Khách trả tiền bằng mã QR, mạng chập chờn, app tự **retry** (gửi lại yêu cầu), và giao dịch bị ghi hai lần. Đó là **double charge** (trừ tiền hai lần): tiền thật bị lấy hai lần cho một lần mua.

Đầu tiên phải chốt **business key** (khóa nghiệp vụ): những cột nào gộp lại nghĩa là "cùng một sự kiện thật"? Với checkout, một `session_id` chỉ nên kết thúc bằng tối đa một giao dịch thành công.

```sql
SELECT session_id, COUNT(*) AS successful_payments
FROM payments
WHERE status = 'success'
GROUP BY session_id
HAVING COUNT(*) > 1
LIMIT 3;
```

| session_id | successful_payments |
|---|---|
| S000096 | 2 |
| S000144 | 2 |
| S000645 | 2 |

Bỏ `LIMIT` sẽ thấy **37 session**. Trong session `S000096`, hai giao dịch 52 và 7625 cùng 134.000 đồng qua `qr_code`, tạo cách nhau hai giây. Trên cả 37 cặp, khoảng cách là 1 đến 8 giây: dấu vân tay của một lần retry tự động, không phải khách mua hai lần.

Một khóa lỏng hơn, "cùng khách, cùng merchant, cùng số tiền", tìm ra **40** cặp. Ba cặp thừa là các session khác nhau, cách nhau nhiều ngày hoặc nhiều tháng (giao dịch 5889 và 6001: mỗi cái 83.000 đồng, cách nhau khoảng sáu ngày), tức khách đặt lại đúng suất cơm trưa quen thuộc. Xóa chúng là xóa doanh thu thật. **Chọn khóa nào thì ra đáp án đó.**

`ROW_NUMBER()` đánh số các dòng trong mỗi session; chỉ giữ dòng số 1:

```sql
WITH ranked AS (
  SELECT payment_id, session_id, amount,
         ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at, payment_id) AS rn
  FROM payments
  WHERE status = 'success'
)
SELECT COUNT(*)                              AS success_rows,
       SUM(rn > 1)                           AS duplicate_rows,
       SUM(amount)                           AS gmv_raw,
       SUM(CASE WHEN rn = 1 THEN amount END) AS gmv_dedup
FROM ranked;
```

| success_rows | duplicate_rows | gmv_raw | gmv_dedup |
|---|---|---|---|
| 6816 | 37 | 4973965000 | 4953862000 |

Bản ghi trùng cộng thêm 20.103.000 đồng, khoảng 0,4% tổng. Nhỏ trên biểu đồ, nhưng với 37 khách hàng đó là tiền phải hoàn, còn với team thanh toán đó là một bug cần **idempotency key** (một mã yêu cầu duy nhất, để retry không bao giờ tạo ra lần trừ tiền thứ hai).

## 6. Trạng thái bị treo và độ mới của dữ liệu (timeliness)

`pending` là bình thường trong vài giây hay vài phút khi ngân hàng xác nhận. Một giao dịch vẫn `pending` sau nhiều tuần là bị **treo (stuck)**: không ai biết tiền đã chuyển hay chưa.

```sql
SELECT payment_id, created_at, amount, method,
       CAST(julianday('2026-06-30') - julianday(created_at) AS INTEGER) AS days_pending
FROM payments
WHERE status = 'pending'
ORDER BY created_at
LIMIT 4;
```

| payment_id | created_at | amount | method | days_pending |
|---|---|---|---|---|
| 271 | 2025-07-15 14:16:50 | 439000 | qr_code | 349 |
| 1341 | 2025-09-13 05:38:03 | 309000 | card | 289 |
| 1366 | 2025-09-14 06:41:28 | 1216000 | qr_code | 288 |
| 1772 | 2025-10-05 16:23:19 | 520000 | card | 267 |

Có 18 giao dịch pending. Một cái (7568, ngày 2026-06-29) chưa đầy một ngày tuổi, chấp nhận được; **17 cái còn lại, tổng 14.090.000 đồng, đã quá một tuần**. Ngày chốt được viết cứng trong query: nếu dùng ngày hôm nay, "số ngày pending" sẽ thay đổi mỗi lần chạy lại.

Một quy tắc tốt dùng **ngưỡng đã thống nhất với nghiệp vụ** ("pending quá 24 giờ = bị treo, chuyển cho vận hành"). Analyst không tự quyết giao dịch treo đã thành công hay chưa; việc đó cần bản ghi của cổng thanh toán (gateway).

Timeliness còn hỏi từng bảng có **mới** không:

```sql
SELECT 'payments' AS source, MAX(created_at) AS latest FROM payments
UNION ALL SELECT 'loan_applications', MAX(applied_at) FROM loan_applications
UNION ALL SELECT 'wallet_transactions', MAX(created_at) FROM wallet_transactions;
```

| source | latest |
|---|---|
| payments | 2026-06-30 14:55:18 |
| loan_applications | 2026-06-30 15:34:54 |
| wallet_transactions | 2026-06-30 16:33:56 |

Cả ba bảng đều có dữ liệu tới ngày chốt. Nếu một bảng ngừng nạp từ ba ngày trước, biểu đồ "7 ngày gần nhất" sẽ cho thấy một cú sụt giả. Tương tự, 29 hồ sơ vay còn `pending` đều được nộp từ 2026-06-27 trở đi: mới và chưa có quyết định, đúng như mong đợi.

## 7. Múi giờ: ngày UTC và ngày Việt Nam

fintech.db lưu mọi thời điểm theo **UTC** (giờ chuẩn quốc tế); Việt Nam là **UTC+7**. Một đơn mua lúc 00:41 ngày 2/6 giờ Việt Nam được lưu thành `2026-06-01 17:41:03`.

```text
 UTC      00:00 ─────────── 16:59 │ 17:00 ─────── 23:59
 Vietnam  07:00 ─────────── 23:59 │ 00:00 ─────── 06:59 (next day)
          rows stored at 17:00–23:59 UTC belong to the NEXT day in Vietnam
```

Group theo ngày UTC thì mọi tổng theo ngày đều bị lệch bảy tiếng:

```sql
SELECT 'UTC date' AS basis, COUNT(*) AS payments, SUM(amount) AS amount_vnd
FROM payments
WHERE status = 'success' AND date(created_at) = '2026-06-01'
UNION ALL
SELECT 'Vietnam date', COUNT(*), SUM(amount)
FROM payments
WHERE status = 'success' AND date(created_at, '+7 hours') = '2026-06-01';
```

| basis | payments | amount_vnd |
|---|---|---|
| UTC date | 15 | 9077000 |
| Vietnam date | 13 | 13373000 |

Cùng một ngày, hai đáp án: khoảng 9,1 so với 13,4 triệu đồng. Con số theo giờ Việt Nam mới khớp với những gì merchant và khách hàng trải qua. Trên toàn bảng, 571 trên 7.630 giao dịch (khoảng 7,5%) chuyển sang một ngày khác sau khi đổi múi giờ.

Trong SQLite dùng `date(created_at, '+7 hours')` hoặc `datetime(created_at, '+7 hours')`. Trong Excel, một timestamp là một số ngày: giờ Việt Nam là `=A2 + 7/24`, ngày Việt Nam là `=INT(A2 + 7/24)`.

> **Góc BA:** mọi đặc tả báo cáo (report spec) cần một dòng nói rõ múi giờ nào định nghĩa "một ngày", ví dụ "Tổng theo ngày tính theo giờ Việt Nam (UTC+7), từ 0h đến 24h". Thiếu dòng đó, báo cáo của tài chính và dashboard của product sẽ lệch nhau mỗi ngày, và cả hai team đều "đúng".

## 8. Đối soát: số dư so với sổ giao dịch (accuracy)

**Reconciliation** (đối soát) là so hai bản ghi về cùng một khoản tiền vốn phải khớp nhau, và điều tra mọi chênh lệch (gọi là **break**). Mỗi ví lưu một `balance`; tách riêng, mọi lần nạp tiền, thanh toán, chuyển khoản là một dòng trong `wallet_transactions`. Số dư phải bằng tổng các giao dịch **thành công**.

```sql
SELECT w.wallet_id, w.status,
       w.balance                              AS stored_balance,
       COALESCE(SUM(t.amount), 0)             AS ledger_balance,
       w.balance - COALESCE(SUM(t.amount), 0) AS difference
FROM wallets w
LEFT JOIN wallet_transactions t
       ON t.wallet_id = w.wallet_id AND t.status = 'success'
GROUP BY w.wallet_id
HAVING difference <> 0
ORDER BY w.wallet_id;
```

| wallet_id | status | stored_balance | ledger_balance | difference |
|---|---|---|---|---|
| 12 | active | 7741000 | 7666000 | 75000 |
| 377 | closed | 200000 | 0 | 200000 |
| 801 | active | 5450000 | 5500000 | -50000 |
| 1150 | active | 1311000 | 1111000 | 200000 |
| 1499 | active | 1000000 | 0 | 1000000 |
| 1733 | closed | 180000 | 105000 | 75000 |

Sáu trên 2.235 ví bị lệch. Ví 1499 có 1.000.000 đồng mà **không có giao dịch nào**; ví 801 thiếu 50.000 đồng, tức khách có thể đã mất tiền. Analyst tìm ra và đo độ lớn các break; bên tài chính quyết định bên nào đúng.

| Chi tiết trong query | Thiếu nó thì sai thế nào |
|---|---|
| `t.status = 'success'` | Giao dịch thất bại bị tính như tiền đã chuyển: **1.035 ví** trông như bị lệch. |
| Điều kiện đó nằm trong `ON`, không phải `WHERE` | `WHERE` loại các ví không có giao dịch thành công: 377 và 1499 biến mất, bạn báo cáo 4 break. |
| `LEFT JOIN` + `COALESCE(…, 0)` | Ví không có giao dịch bị mất hoặc ra chênh lệch NULL. |

> **Common misconception:** "Tổng khớp thì chi tiết cũng khớp." Lệch +200.000 ở ví này và -200.000 ở ví kia triệt tiêu nhau trong tổng chung. Hãy đối soát ở **grain** (mức chi tiết) của từng tài khoản, không chỉ ở tổng.

## 9. Quy tắc làm sạch: sửa trên bản sao, ghi lại thành văn bản

1. **Không bao giờ sửa dữ liệu gốc.** Bảng gốc là bằng chứng. `UPDATE` xóa con số 999.999.999 đi thì không ai kiểm tra được ban đầu có gì, cũng không ai báo được cho product rằng form đang lỗi.
2. **Làm sạch ở một lớp bên trên**: view, CTE, một sheet mới. Giữ cột thô ngay cạnh cột sạch.
3. **Gắn cờ, đừng giấu**: thêm cột như `income_flag` để ai cũng đếm được cái gì đã bị thay đổi.
4. **Viết cleaning log** (nhật ký làm sạch) để người khác đọc và phản biện được.
5. **Báo lỗi ngược lại** cho team sở hữu nguồn dữ liệu.

Một lớp làm sạch cho khách hàng, viết dạng CTE dùng lại được (thực tế nó sẽ mang theo cả `CASE` thành phố ở mục 4):

```sql
WITH customers_clean AS (
  SELECT customer_id,
         monthly_income AS income_raw,
         NULLIF(monthly_income, 999999999) AS monthly_income,
         CASE
           WHEN monthly_income IS NULL THEN 'missing'
           WHEN monthly_income = 999999999 THEN 'invalid_typo'
           ELSE 'ok'
         END AS income_flag
  FROM customers
)
SELECT income_flag, COUNT(*) AS customers, ROUND(AVG(monthly_income)) AS avg_income
FROM customers_clean
GROUP BY income_flag;
```

| income_flag | customers | avg_income |
|---|---|---|
| invalid_typo | 3 | NULL |
| missing | 232 | NULL |
| ok | 3765 | 16286667 |

Kết quả tự ghi lại việc làm sạch: 3 không hợp lệ, 232 bị thiếu, 3.765 được dùng. Đi kèm là một **cleaning log**:

| Cột / bảng | Vấn đề | Số dòng | Quy tắc | Đã báo |
|---|---|---|---|---|
| customers.city | 11 biến thể của 3 thành phố | 127 | Trim, chữ thường, mapping | Product |
| customers.monthly_income | Lỗi gõ 999.999.999 | 3 | Coi là NULL, gắn cờ | Product |
| customers.monthly_income | Không khai | 232 | Để NULL, báo cáo % | n/a |
| payments | Thành công lần 2 trong một session | 37 | Loại ra; gửi danh sách để hoàn tiền | Payments |
| payments.status | Pending > 24 giờ | 17 | Hiển thị là "bị treo" | Vận hành |
| mọi timestamp | Lưu theo UTC | tất cả | Group theo `date(x, '+7 hours')` | n/a |
| wallets.balance | Lệch với sổ giao dịch | 6 | Không sửa; gửi bằng chứng | Tài chính |

(127 là tổng số dòng của mười một biến thể ở mục 4.)

> **Góc BA:** mỗi dòng trong log là một **yêu cầu dữ liệu** đang chờ được viết: dropdown thành phố, kiểm tra khoảng giá trị thu nhập trên form, idempotency key cho retry, cảnh báo khi giao dịch pending quá 24 giờ, một job đối soát hằng ngày. Biến mỗi dòng thành một story có acceptance criteria thì lỗi sẽ ngừng chảy vào.

## 10. Bài tập thực hành

### Bài 1 — Giao dịch này thuộc ngày nào?

Các giao dịch thành công, thời gian theo UTC:

| payment_id | created_at (UTC) | amount |
|---|---|---|
| 6898 | 2026-05-31 16:08:58 | 412000 |
| 6899 | 2026-05-31 23:55:12 | 445000 |
| 6900 | 2026-05-31 23:55:30 | 5778000 |
| 6911 | 2026-06-01 15:58:24 | 362000 |
| 6913 | 2026-06-01 17:41:03 | 882000 |

Những dòng nào thuộc ngày 1/6 theo giờ Việt Nam, tổng bao nhiêu? Báo cáo theo UTC sẽ đặt gì vào ngày 1/6?

**Đáp án:** cộng 7 tiếng. 6898 → 23:08 ngày 31/5 (loại). 6899 và 6900 → 06:55 ngày 1/6, 6911 → 22:58 ngày 1/6 (tính). 6913 → 00:41 ngày 2/6 (loại). Ngày 1/6 giờ Việt Nam = 445.000 + 5.778.000 + 362.000 = **6.585.000 đồng**. Báo cáo theo UTC chỉ có 6911 và 6913: **1.244.000 đồng**. Kiểm tra bằng `SELECT payment_id, datetime(created_at, '+7 hours') AS vn_time FROM payments WHERE payment_id IN (6898, 6899, 6900, 6911, 6913);`

### Bài 2 — Tính trung bình bằng tay

Năm mức thu nhập khai báo: 12.000.000; 15.000.000; (trống); 9.000.000; 999.999.999. Tính (a) `AVG()` trên cột thô, (b) trung bình khi coi 999.999.999 là chưa biết, (c) trung bình nếu ô trống và giá trị chưa biết bị đổi thành 0.

**Đáp án:** (a) `AVG` bỏ ô trống và chia cho 4: ≈ **259 triệu**, vô lý. (b) 36.000.000 / 3 = **12.000.000**. (c) 36.000.000 / 5 = **7.200.000**, quá thấp. Chỉ (b) là trung thực, và phải ghi kèm "dựa trên 3 trên 5 khách".

### Bài 3 — Thật sự có bao nhiêu khách ở Đà Nẵng?

`GROUP BY city` trên cột thô cho ra 302. Hãy đếm mọi cách viết.

**Đáp án:**

```sql
SELECT COUNT(*) AS da_nang_customers
FROM customers
WHERE LOWER(TRIM(city)) IN ('da nang', 'danang', 'dn');
```

Kết quả **316** (302 + 8 `Danang` + 6 `DN`). Trước đó nên chạy lại `SELECT DISTINCT city FROM customers` phòng khi có biến thể mới.

### Bài 4 — Phương thức thanh toán nào hay trừ tiền hai lần?

Đếm các giao dịch thành công thứ hai trong mỗi session, và số tiền của chúng, theo phương thức.

**Đáp án:**

```sql
SELECT b.method, COUNT(*) AS duplicates, SUM(b.amount) AS overcharged_vnd
FROM payments a
JOIN payments b
  ON b.session_id = a.session_id AND b.payment_id > a.payment_id
WHERE a.status = 'success' AND b.status = 'success'
GROUP BY b.method
ORDER BY overcharged_vnd DESC;
```

| method | duplicates | overcharged_vnd |
|---|---|---|
| card | 15 | 9377000 |
| qr_code | 13 | 5177000 |
| bank_transfer | 8 | 3585000 |
| bnpl | 1 | 1964000 |

Thẻ dẫn đầu (15 dòng, khoảng 9,4 triệu đồng); không có dòng nào từ ví điện tử. Đây là manh mối cho team thanh toán, chưa phải kết luận.

### Bài 5 — Tìm lỗi trong query đối soát

Query của một đồng nghiệp chỉ tìm ra **4** ví bị lệch. Vì sao?

```sql
SELECT w.wallet_id, w.balance, SUM(t.amount) AS ledger,
       w.balance - SUM(t.amount) AS difference
FROM wallets w
LEFT JOIN wallet_transactions t ON t.wallet_id = w.wallet_id
WHERE t.status = 'success'
GROUP BY w.wallet_id
HAVING difference <> 0;
```

**Đáp án:** `WHERE t.status = 'success'` chạy sau phép join và loại các ví không có giao dịch thành công nào, biến `LEFT JOIN` thành inner join. Ví 377 (200.000 đồng) và 1499 (1.000.000 đồng) không có giao dịch nào, nên hai break đáng ngờ nhất biến mất. Chuyển điều kiện vào `ON` và dùng `COALESCE(SUM(t.amount), 0)` như ở mục 8.

### Bài 6 — Đo quy mô giao dịch bị treo

Bộ phận vận hành hỏi có bao nhiêu giao dịch pending quá một tuần, và bao nhiêu tiền (ngày chốt 2026-06-30).

**Đáp án:**

```sql
SELECT COUNT(*) AS stuck_payments, SUM(amount) AS stuck_vnd
FROM payments
WHERE status = 'pending' AND created_at < '2026-06-23';
```

**17 giao dịch, 14.090.000 đồng.** Gửi danh sách theo `payment_id` để vận hành hỏi gateway trạng thái cuối cùng của từng giao dịch.

### Bài 7 — "Cứ sửa thẳng trong database đi"

Trưởng nhóm tài chính nói: "Xóa 37 giao dịch trùng và sửa tên thành phố ngay trong bảng production." Bạn trả lời thế nào?

**Đáp án:** đồng ý với mục tiêu, không đồng ý với cách làm. Các bản ghi trùng là **bằng chứng khách bị trừ tiền hai lần**; xóa đi là che mất khoản phải hoàn và cả con bug gây ra nó. Hãy loại chúng ở lớp làm sạch, gửi danh sách để hoàn tiền, và đề nghị engineering thêm idempotency key. Với thành phố, mapping trong một view sửa được báo cáo hôm nay mà vẫn giữ chữ gốc; cách sửa lâu dài là dropdown trên form. Thay đổi dữ liệu production thuộc về chủ hệ thống, qua một thay đổi có review, không phải một câu `UPDATE` của analyst.

## 11. Tóm tắt

- **Query chạy được không có nghĩa là câu trả lời đúng.** Kiểm tra sáu chiều trước khi tin một bảng: completeness, validity, consistency, uniqueness, timeliness, accuracy.
- **Thiếu không phải là 0.** So `COUNT(*)` với `COUNT(cột)`, báo cáo tỉ lệ thiếu, và đừng biến NULL thành 0 chỉ để có con số.
- **Nhìn vào hai đầu cực.** Một lỗi gõ như 999.999.999 có thể làm lệch cả một phân khúc; chỉ loại các giá trị không thể đúng, bằng `NULLIF`, trên bản sao sạch.
- **Profile mọi cột danh mục** bằng `GROUP BY`, rồi gộp biến thể bằng `TRIM`, `LOWER` và bảng mapping.
- **Chốt business key trước khi săn bản ghi trùng.** Khóa lỏng quá sẽ xóa cả những lần mua lại thật.
- **Thống nhất ngưỡng cho trạng thái bị treo**, kiểm tra bảng nào cũng mới, và viết cứng ngày chốt.
- **Nói rõ múi giờ nào định nghĩa một ngày.** fintech.db lưu UTC; ngày Việt Nam cần `date(x, '+7 hours')`.
- **Đối soát ở grain từng tài khoản**, đặt điều kiện lọc trong `ON`, và giao mỗi break cho chủ của nó kèm bằng chứng.
- **Không bao giờ sửa lặng lẽ.** Làm sạch ở một lớp riêng, gắn cờ thứ đã đổi, giữ cleaning log, báo lỗi ngược về nguồn.

### Thuật ngữ chính

| Thuật ngữ | Nghĩa đơn giản |
|---|---|
| Data quality | Dữ liệu có đủ tin cậy cho một quyết định cụ thể không |
| Completeness / validity | Không thiếu thứ quan trọng / giá trị theo đúng quy tắc |
| Consistency / uniqueness | Cùng một thứ viết cùng một cách / mỗi sự kiện ghi đúng một lần |
| Timeliness / accuracy | Dữ liệu mới và quy trình đã xong / dữ liệu khớp thực tế |
| Outlier | Giá trị nằm xa phần còn lại, có thể thật hoặc sai |
| Business key | Các cột cùng nhau xác định một sự kiện thật |
| Double charge | Khách bị trừ tiền hai lần cho một lần mua |
| Idempotency key | Mã yêu cầu giúp retry không tạo ra lần trừ tiền thứ hai |
| Reconciliation / break | Đối soát hai bản ghi của cùng một khoản tiền / chênh lệch tìm thấy |
| Cleaning log | Danh sách ghi lại từng lỗi và quy tắc đã áp dụng |

Tiếp theo: **da-04 "Describing Data" (Mô tả dữ liệu)**, nơi dữ liệu đã sạch trở thành số đếm, trung bình, trung vị, phân phối và tỉ lệ mà bạn giải thích được cho sếp.
