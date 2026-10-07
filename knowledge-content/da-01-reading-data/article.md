# Đọc hiểu dữ liệu: dòng, grain, khóa và cái nhìn đầu tiên

## 1. Vì sao phải đọc trước khi phân tích

Hãy hình dung tuần đầu tiên bạn làm Business Analyst (BA) ở một công ty cho vay số. Sếp chuyển cho bạn file `loans_june.xlsx` và hỏi: "Tháng 6 mình giải ngân bao nhiêu khoản vay, có gì bất thường không em?"

Rất dễ bị cám dỗ chọn một cột rồi đọc con số tổng ở góc màn hình. Phần lớn các con số sai trong ngân hàng hay fintech bắt đầu đúng như vậy. Trước khi **phân tích** (analyse) dữ liệu, bạn phải **đọc** được nó: một dòng nghĩa là gì, từng cột nghĩa là gì, con số tính bằng đơn vị nào, ngày giờ theo múi giờ nào, chỗ nào thiếu hoặc đáng ngờ. Bài này dạy kỹ năng đó và kết thúc bằng một checklist "nhìn lần đầu" mà bạn dùng được cho bất kỳ bảng nào.

### Làm quen với VayNhanh, công ty dùng để thực hành

Mọi ví dụ đều dùng **VayNhanh**, một công ty cho vay số hư cấu ở Việt Nam, có thêm ví điện tử. Database của nó (`fintech.db`) là một **snapshot**: bức ảnh "đóng băng" dữ liệu **tại ngày 2026-06-30**. Ba quy ước áp dụng cho mọi bảng:

- Số tiền là **VND** nguyên (trên thực tế tiền đồng không có phần thập phân).
- Thời điểm (timestamp) là chuỗi **UTC** dạng `YYYY-MM-DD HH:MM:SS`; Việt Nam là UTC+7.
- Ngày không kèm giờ có dạng `YYYY-MM-DD`.

Bạn chạy được mọi câu query trong bài tại [SQL Practice → Fintech](/practice/sql?db=fintech). Mỗi lần chạy dùng một bản sao dùng-xong-bỏ, nên không thể làm hỏng gì. Trang này chạy từng câu lệnh một: khối nào có nhiều câu thì chạy lần lượt từng câu.

> **Tự làm thử:** Chạy `SELECT COUNT(*) FROM loans;` trong SQL Practice với dataset Fintech. Bạn sẽ thấy 3106. Nếu không, hãy kiểm tra lại đã chọn đúng dataset chưa.

---

## 2. Dòng, cột và grain: "một dòng = một cái gì?"

Mỗi **cột** (column) là một thuộc tính (số tiền, ngày, trạng thái); mỗi **dòng** (row) là một bản ghi. Câu hỏi quan trọng nhất với bất kỳ bảng nào là: **một dòng đại diện cho cái gì?** Câu trả lời đó gọi là **grain** (độ chi tiết) của bảng. Số dòng dưới đây lấy từ `SELECT COUNT(*) FROM <tên bảng>`.

| Bảng | Một dòng = … | Số dòng |
|---|---|---|
| `customers` | một người đã đăng ký | 4000 |
| `loan_applications` | một hồ sơ vay (một khách có thể nộp nhiều lần) | 6854 |
| `loans` | một khoản vay đã thực sự giải ngân (disbursed) | 3106 |
| `repayment_schedule` | một kỳ trả góp hằng tháng của một khoản vay | 28824 |
| `wallets` | một ví điện tử (mỗi khách tối đa một ví) | 2235 |
| `wallet_transactions` | một lần tiền vào hoặc ra khỏi ví | 26923 |
| `checkout_events` | một bước người mua thực hiện trong một phiên checkout | 46526 |
| `payments` | một lần thử thanh toán tại một merchant | 7630 |
| `merchants` | một cửa hàng nhận thanh toán | 33 |

### Theo dấu một khoản vay qua ba bảng

```sql
SELECT a.application_id, a.status, l.loan_id, l.principal, l.term_months,
       l.monthly_installment,
       (SELECT COUNT(*) FROM repayment_schedule r WHERE r.loan_id = l.loan_id) AS n_inst
FROM loan_applications a
JOIN loans l USING (application_id)
WHERE a.application_id = 5;
```

| application_id | status | loan_id | principal | term_months | monthly_installment | n_inst |
|---|---|---|---|---|---|---|
| 5 | approved | 2 | 5500000 | 18 | 398000 | 18 |

Một sự kiện kinh doanh, ba grain: **một** dòng hồ sơ, **một** dòng khoản vay (vay tiền mặt 5.500.000 đồng), **mười tám** dòng kỳ trả góp.

### Vì sao grain làm thay đổi câu trả lời

"Mình có bao nhiêu khoản vay?" Đáp án là 3.106, đếm từ `loans`. Đếm `loan_applications` (6.854) là đếm hồ sơ; đếm `repayment_schedule` (28.824) là đếm kỳ trả góp. Cái bẫy này cũng xảy ra với con người:

```sql
SELECT COUNT(*) AS rows_, COUNT(DISTINCT customer_id) AS customers
FROM loan_applications;
```

| rows_ | customers |
|---|---|
| 6854 | 2664 |

6.854 hồ sơ đến từ 2.664 khách hàng; riêng khách số 78 đã nộp 14 lần. "Số hồ sơ" (applications) và "số người nộp" (applicants) là hai chỉ số khác nhau.

Grain còn quyết định bạn được phép cộng cái gì. `principal` (tiền gốc) nằm ở grain khoản vay. Nếu gắn các dòng kỳ trả góp vào từng khoản vay rồi cộng, mỗi khoản vay sẽ bị đếm lặp theo số kỳ:

```sql
-- Right grain: one row per loan. Result: 34040900000
SELECT SUM(principal) FROM loans;

-- Wrong grain: one row per installment. Result: 395210700000
SELECT SUM(l.principal)
FROM loans l JOIN repayment_schedule r ON r.loan_id = l.loan_id;
```

Con số thứ hai lớn gấp hơn mười một lần. Hiện tượng này gọi là **fan-out** (nhân dòng), sẽ được học kỹ ở da-05.

> **Hiểu lầm thường gặp:** "Bảng càng to thì kinh doanh càng nhiều." `checkout_events` có 46.526 dòng nhưng chỉ thuộc về 13.773 phiên, vì mỗi phiên ghi tới năm sự kiện (xem giỏ hàng, bắt đầu checkout, chọn phương thức, gửi thanh toán, thanh toán thành công).

---

## 3. Khóa và ID

**Khóa chính** (primary key) xác định duy nhất từng dòng, như `loan_id` trong `loans`. **Khóa ngoại** (foreign key) trỏ tới một dòng ở bảng khác, như `loans.customer_id` trỏ tới `customers.customer_id`. Các bảng nối với nhau qua khóa:

```text
customers ──< loan_applications ──1:0..1── loans ──< repayment_schedule
    │
    ├──1:0..1── wallets ──< wallet_transactions
    │
    └──< payments >── merchants
         (payments.session_id links to checkout_events.session_id)

──<      one to many: one customer, many applications
1:0..1   one to at most one: an application becomes at most one loan
```

(`──<` là quan hệ một-nhiều: một khách, nhiều hồ sơ. `1:0..1` là một-với-tối-đa-một: một hồ sơ thành nhiều nhất một khoản vay.)

### Kiểm tra khóa có thật sự duy nhất

Đừng bao giờ mặc định một cột là duy nhất chỉ vì tên nó kết thúc bằng `_id`. Hãy so số dòng với số giá trị khác nhau:

```sql
SELECT COUNT(*) AS n,
       COUNT(DISTINCT payment_id) AS ids,
       COUNT(DISTINCT session_id) AS sessions
FROM payments;
```

| n | ids | sessions |
|---|---|---|
| 7630 | 7630 | 7593 |

`payment_id` là duy nhất. Nhưng một phiên checkout bình thường chỉ kết thúc bằng tối đa một giao dịch thanh toán, vậy mà 7.630 payment chỉ thuộc 7.593 phiên. Khách cố ý trả hai lần, hay app trừ tiền khách hai lần? Hãy ghi lại thành một câu hỏi; bài da-03 sẽ điều tra.

### ID là nhãn, không phải số lượng

ID là một cái tên được viết bằng chữ số. `SELECT SUM(customer_id) FROM payments` vẫn vui vẻ trả về 15439519, một con số không mô tả gì ngoài đời thật. Số điện thoại, số tài khoản, số CCCD 12 chữ số dùng trong eKYC cũng vậy. Hãy lưu những mã này dưới dạng **text**: bảng tính sẽ coi chúng là số, nên `0912345678` mất **số 0 ở đầu** (leading zero), còn một ID dài có thể biến thành dạng khoa học như `7.91E+11`, và lúc đó giá trị gốc đã mất.

> **Góc BA:** Khi đặc tả một file export hay báo cáo, hãy ghi rõ khóa của từng sheet ("mỗi dòng là một payment, duy nhất theo payment_id") và đánh dấu các cột dạng ID là text. Chỉ một dòng đó đã giúp người đọc khỏi đếm trùng và khỏi bị hỏng số tài khoản.

---

## 4. Kiểu dữ liệu, đơn vị và tiền tệ

Mỗi cột có một **kiểu dữ liệu** (data type): số nguyên (INTEGER), số thập phân (REAL), văn bản (TEXT), ngày hoặc thời điểm (trong SQLite được lưu dưới dạng text). Kiểu dữ liệu cho biết phép tính nào hợp lý; **đơn vị** (unit) cho biết con số nghĩa là gì.

| Cột | Kiểu | Đơn vị và ý nghĩa |
|---|---|---|
| `loans.principal` | INTEGER | VND đã giải ngân: 5500000 = 5,5 triệu đồng |
| `loans.monthly_installment` | INTEGER | VND phải trả **mỗi tháng** |
| `loans.annual_rate_pct` | REAL | phần trăm **mỗi năm**: 24.0 nghĩa là 24%, không phải 0,24 |
| `merchants.mdr_pct` | REAL | phí tính theo % mỗi giao dịch: 1.5 nghĩa là 1,5% |
| `wallet_transactions.amount` | INTEGER | VND, **có dấu**: tiền vào > 0, tiền ra < 0 |
| `payments.amount` | INTEGER | VND, luôn dương |

Ba thói quen giúp bạn an toàn:

1. **Đọc đơn vị trước khi đọc giá trị.** Một lãi suất có thể được lưu là 24, 0,24 hay 2400 điểm cơ bản (basis point). Hãy xem khoảng giá trị: trong `loans`, lãi suất BNPL đều bằng 0 còn vay tiền mặt từ 18 đến 38 (`SELECT product, MIN(annual_rate_pct), MAX(annual_rate_pct) FROM loans GROUP BY product;`), nên đơn vị rõ ràng là "% mỗi năm".
2. **Để ý dấu âm dương.** Trong `wallet_transactions`, một lần thanh toán 657.000 đồng được lưu là `-657000`. Cộng cả cột sẽ ra biến động ròng, không phải tổng chi tiêu.
3. **Đọc to quy mô con số.** `SUM(principal)` trả về 34040900000, tức 34.040.900.000 đồng, khoảng **34 tỷ đồng**. Hãy ghi rõ quy mô ("triệu đồng") ở tiêu đề cột của mọi báo cáo.

> **Hiểu lầm thường gặp:** "Số nào chả là số." Theo cách viết Việt Nam, `1.500.000` là một triệu rưỡi; theo cách viết tiếng Anh, `1.500` là một phẩy năm. Mở một file CSV ghi theo kiểu Việt Nam bằng thiết lập tiếng Anh, `1.500.000` sẽ thành chữ còn `400.000` có thể bị đọc thành 400. Mở bất kỳ file export nào xong, hãy đối chiếu vài số tiền với hệ thống gốc.

---

## 5. Thời điểm và múi giờ

**Ngày** (date, ví dụ `2026-06-21`) là một ngày nghiệp vụ: ngày đến hạn, ngày giải ngân. **Thời điểm** (timestamp, ví dụ `2026-06-21 13:05:44`) là một khoảnh khắc chính xác, và chỉ có nghĩa khi đi kèm **múi giờ** (time zone). VayNhanh lưu mọi timestamp theo UTC; Việt Nam đi trước bảy giờ.

```sql
SELECT payment_id,
       created_at                         AS created_at_utc,
       datetime(created_at, '+7 hours')   AS created_at_vn,
       date(created_at)                   AS utc_date,
       date(created_at, '+7 hours')       AS vn_date
FROM payments
WHERE payment_id = 1;
```

| payment_id | created_at_utc | created_at_vn | utc_date | vn_date |
|---|---|---|---|---|
| 1 | 2025-06-30 20:24:34 | 2025-07-01 03:24:34 | 2025-06-30 | 2025-07-01 |

Với khách hàng, giao dịch này diễn ra lúc 3 giờ 24 sáng ngày 1/7; theo UTC thì vẫn là 30/6. Mọi thứ từ 17:00 UTC trở đi đã sang ngày hôm sau ở Việt Nam. Trên toàn bảng, 571 trong 7.630 payment rơi vào một ngày khác ở Việt Nam so với UTC (`SUM(date(created_at) <> date(created_at, '+7 hours'))`), nên báo cáo theo ngày cắt theo UTC sẽ xếp chúng nhầm ngày. Bài da-03 sẽ đo ảnh hưởng lên tổng theo ngày.

Giờ cũng bị lệch. Nhóm theo `strftime('%H', created_at)` thì 13:00 là giờ đông nhất (690 payment). Nhóm theo `strftime('%H', created_at, '+7 hours')` mới thấy sự thật: 20:00, 21:00 và 22:00 giờ Việt Nam (690, 657 và 540 payment), đúng cao điểm mua sắm buổi tối mà product manager quan tâm.

### Cái bẫy cuối ngày

`created_at` chứa cả ngày **lẫn** giờ, và so sánh nó với một ngày "trần" là so sánh chuỗi: `'2026-06-30 14:55:18'` đứng sau `'2026-06-30'`.

```sql
-- Looks right, but returns 7617
SELECT COUNT(*) FROM payments WHERE created_at <= '2026-06-30';

-- Correct: returns 7630
SELECT COUNT(*) FROM payments WHERE created_at < '2026-07-01';
```

Bộ lọc đầu âm thầm bỏ sót 13 payment phát sinh trong ngày 30/6. Muốn lấy trọn ngày cuối, hãy dùng "nhỏ hơn ngày hôm sau".

File export còn thêm một nguy cơ: **định dạng ngày**. `03/04/2026` ở Việt Nam là mùng 3 tháng 4, còn ở Mỹ là ngày 4 tháng 3. Định dạng ISO `YYYY-MM-DD` không gây nhầm lẫn và sắp xếp đúng ngay cả khi là text.

---

## 6. Mã trạng thái và mã liệt kê (enum)

Nhiều cột chứa một mã ngắn lấy từ một danh sách cố định, gọi là **enumeration** (**enum**): `status`, `reject_reason`, `method`, `txn_type`. Cần đọc hai điều: mỗi mã nghĩa là gì, và khi nào cột được phép có giá trị.

```sql
SELECT status, reject_reason, COUNT(*) AS n
FROM loan_applications
GROUP BY status, reject_reason
ORDER BY status, n DESC;
```

| status | reject_reason | n |
|---|---|---|
| approved | NULL | 3106 |
| cancelled | NULL | 295 |
| pending | NULL | 29 |
| rejected | high_dti | 1596 |
| rejected | low_score | 1096 |
| rejected | kyc_failed | 630 |
| rejected | fraud_suspected | 102 |

- `reject_reason` **chỉ** có giá trị ở các dòng bị từ chối, nên NULL ở dòng approved là đúng, không phải thiếu. Một quy tắc nối hai cột như vậy là **business rule** (quy tắc nghiệp vụ) mà bạn có thể kiểm tra.
- `approved` (3.106) bằng đúng số dòng của `loans`: mỗi hồ sơ được duyệt trở thành một khoản vay.
- `cancelled` = đã được duyệt nhưng khách không nhận khoản vay.
- `high_dti` = khoản trả góp quá lớn so với thu nhập của khách (**DTI**, debt-to-income, tỷ lệ nợ trên thu nhập). Những mã như thế cần data dictionary để giải nghĩa (mục 8).

**Cùng một từ có thể mang nghĩa khác nhau.** `pending` trong `loan_applications` nghĩa là "chưa có quyết định"; trong `customers.kyc_status` là "chưa xác minh xong danh tính"; trong `payments` là "chưa xác nhận kết quả". Đừng so sánh trạng thái giữa các bảng chỉ vì chữ giống nhau.

**Trạng thái là tình trạng tại thời điểm snapshot.** Payment 881 là một lần thanh toán bằng ví 657.000 đồng tại một shop thời trang, thành công ngày 18/8/2025. Mười ngày sau nó được hoàn tiền (refund), nên bây giờ dòng của nó ghi `refunded`. Nếu đếm "payment thành công trong tháng 8" từ cột này, payment 881 sẽ bị thiếu, dù nó đã thành công trong tháng 8. Lịch sử nằm ở các bảng sự kiện như `wallet_transactions` (mục 8).

> **Tự làm thử:** Chạy `SELECT city, COUNT(*) FROM customers GROUP BY city ORDER BY 2 DESC;`. Khách hàng sống ở chín thành phố, vậy mà bạn sẽ thấy 20 giá trị khác nhau, trong đó có `hanoi`, `HN` và `TP.HCM`. Ô nhập tự do không phải là enum; da-03 sẽ làm sạch cột này.

---

## 7. NULL, 0 và ô trống

| Giá trị | Ý nghĩa | Ví dụ ở VayNhanh |
|---|---|---|
| **NULL** | không biết, không cung cấp, hoặc không áp dụng | không khai thu nhập; `paid_date` của kỳ chưa trả |
| **0** | một giá trị 0 có thật, đã biết | `annual_rate_pct = 0` với BNPL nghĩa là không lãi |
| **chuỗi rỗng** `''` | text không có ký tự nào | hay gặp trong file CSV; thường nghĩa là NULL, đôi khi là lỗi |

### Thu nhập: ba cách ra ba con số trung bình

```sql
SELECT COUNT(*) AS all_rows,
       COUNT(monthly_income) AS with_income,
       COUNT(*) - COUNT(monthly_income) AS null_income,
       SUM(monthly_income = 0) AS zero_income,
       SUM(monthly_income = 999999999) AS nines
FROM customers;
```

| all_rows | with_income | null_income | zero_income | nines |
|---|---|---|---|---|
| 4000 | 3768 | 232 | 0 | 3 |

`COUNT(*)` đếm số dòng; `COUNT(cột)` chỉ đếm giá trị khác NULL. 232 khách không khai thu nhập, còn ba khách gõ 999.999.999. Hãy xem "thu nhập trung bình" thay đổi thế nào:

```sql
-- 1) Raw column (AVG skips NULLs): 17069878
SELECT ROUND(AVG(monthly_income)) FROM customers;

-- 2) The three typos excluded: 16286667
SELECT ROUND(AVG(monthly_income)) FROM customers
WHERE monthly_income < 999999999;

-- 3) NULL treated as 0, typos excluded: 15341331
SELECT ROUND(AVG(COALESCE(monthly_income, 0))) FROM customers
WHERE monthly_income IS NULL OR monthly_income < 999999999;
```

Ba lỗi gõ phím làm trung bình lệch khoảng 0,8 triệu đồng; coi "không khai" là "không có thu nhập" lại kéo nó xuống thêm gần một triệu nữa. Không cách nào tự động đúng. Hãy chọn có chủ đích và ghi lại lựa chọn đó.

### "Chưa trả" không phải là "trễ hạn"

Một kỳ chưa trả có `paid_date` là NULL và `amount_paid` bằng 0, nhưng phần lớn trong số đó chỉ đơn giản là **chưa đến hạn**:

```sql
SELECT SUM(amount_paid = 0) AS zero_paid,
       SUM(paid_date IS NULL AND due_date <= '2026-06-30') AS unpaid_due,
       SUM(paid_date IS NULL AND due_date >  '2026-06-30') AS not_yet_due
FROM repayment_schedule;
```

| zero_paid | unpaid_due | not_yet_due |
|---|---|---|
| 13922 | 446 | 13476 |

Trong 13.922 kỳ chưa trả đồng nào, chỉ 446 kỳ đã đến hạn tính đến ngày snapshot. Báo với team rủi ro rằng "có 13.922 kỳ chưa trả" sẽ gây hoảng loạn không cần thiết.

Tương tự, `credit_score` là NULL ở 307 trên 6.854 hồ sơ (`SELECT COUNT(*) - COUNT(credit_score) FROM loan_applications;`). Đây là những khách **thin-file** (hồ sơ tín dụng mỏng): người chưa có lịch sử tín dụng để chấm điểm. NULL ở đây là thông tin về khách hàng, và chắc chắn không phải điểm 0 (điểm chạy từ 300 đến 850).

> **Hiểu lầm thường gặp:** "Cứ thay ô trống bằng 0 cho công thức chạy được." Làm vậy là biến "chúng ta không biết" thành "chúng ta biết nó bằng 0", và làm méo mọi số trung bình, giá trị nhỏ nhất và tỷ lệ tính sau đó.

---

## 8. Đọc file export và viết data dictionary

Rất nhiều dữ liệu đến tay bạn dưới dạng file CSV hoặc Excel: sao kê ngân hàng, lịch sử ví, báo cáo đối soát merchant. Câu query sau dựng lịch sử giao dịch của ví số 47 theo giờ Việt Nam, kèm số dư lũy kế (phần `OVER (…)` sẽ học ở da-05):

```sql
SELECT txn_id, datetime(created_at, '+7 hours') AS vn_time, txn_type, amount, status, reference,
       SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END)
         OVER (ORDER BY created_at, txn_id) AS running_balance
FROM wallet_transactions
WHERE wallet_id = 47
ORDER BY created_at, txn_id;
```

Các dòng tháng 8/2025, như khi app xuất ra file:

```text
Thời gian (VN),Mã GD,Loại,Số tiền (VND),Trạng thái,Tham chiếu,Số dư sau GD (VND)
08/08/2025 16:09,4941,transfer_in,400000,success,,569000
18/08/2025 20:12,5359,top_up,100000,success,,669000
18/08/2025 20:13,5360,payment,-657000,success,881,12000
27/08/2025 08:34,5702,withdraw,-910000,failed,,12000
28/08/2025 20:13,5767,refund,657000,success,881,669000
```

Đọc từng dòng:

1. **Grain:** mỗi dòng là một giao dịch ví, kể cả giao dịch thất bại.
2. **Dấu:** tiền vào là số dương, tiền ra là số âm.
3. **Dòng thất bại không làm đổi số dư:** lệnh rút 910.000 thất bại (ví chỉ còn 12.000), nên số dư vẫn là 12.000.
4. **Câu chuyện:** khách nạp (top-up) 100.000 và 39 giây sau thanh toán 657.000 cho payment 881; khoản nạp bù đúng phần còn thiếu. Mười ngày sau, 657.000 quay về dưới dạng refund với cùng mã tham chiếu.
5. **Đối chiếu chéo:** dòng của payment 881 trong `payments` giờ ghi `refunded`. Bảng sự kiện giữ cả hai sự kiện; dòng payment chỉ giữ trạng thái mới nhất.

Để mở file export an toàn: dùng chức năng import (Excel **Data → From Text/CSV**, Google Sheets **File → Import**) thay vì nhấp đúp, đặt các cột ID, tham chiếu, số điện thoại là **Text**, kiểm tra ngày và tháng trên vài dòng, rồi so số dòng và một con số tổng với hệ thống gốc ("5 dòng, ròng +500.000 đồng từ các dòng thành công") trước khi xây gì lên trên.

### Data dictionary

**Data dictionary** (từ điển dữ liệu) mô tả từng cột: kiểu, đơn vị, ý nghĩa, giá trị hợp lệ và NULL nghĩa là gì. Một bản ngắn cho `payments`:

| Cột | Ý nghĩa | Giá trị hợp lệ / đơn vị | NULL nghĩa là |
|---|---|---|---|
| `payment_id` | khóa chính: một lần thử thanh toán | số nguyên duy nhất | không bao giờ NULL |
| `created_at` | thời điểm tạo payment | UTC, `YYYY-MM-DD HH:MM:SS` | không bao giờ NULL |
| `amount` | số tiền thanh toán | VND, dương | không bao giờ NULL |
| `status` | trạng thái mới nhất tại 2026-06-30 | success, failed, refunded, pending | không bao giờ NULL |
| `failure_reason` | lý do thất bại | insufficient_funds, otp_timeout, bank_declined, fraud_blocked, network_error | không phải payment thất bại |

> **Góc BA:** Hãy coi data dictionary là một phần của yêu cầu cho mọi báo cáo hay dashboard. Một acceptance criterion như "số tiền tính bằng VND, ngày theo giờ Việt Nam, mỗi dòng một payment, payment đã hoàn tiền hiển thị là `refunded`" giúp tránh hàng tuần tranh cãi "số của anh không khớp số của em" giữa tài chính và product.

---

## 9. Checklist "nhìn lần đầu" (có ví dụ từng bước)

Chạy mười bước kiểm tra này với bất kỳ bảng mới nào trước khi phân tích:

1. **Kích thước và giai đoạn:** bao nhiêu dòng, trải trong khoảng thời gian nào?
2. **Grain:** một dòng = một cái gì?
3. **Khóa:** khóa chính có duy nhất không? Khóa ngoại có trỏ tới đâu không?
4. **Kiểu và đơn vị:** VND hay nghìn đồng? Phần trăm hay phân số? Có dấu không?
5. **Múi giờ:** UTC hay giờ địa phương? Ngày hay thời điểm?
6. **Enum:** các giá trị khác nhau của mọi cột mã.
7. **NULL:** mỗi cột bao nhiêu NULL, và NULL ở từng cột nghĩa là gì.
8. **Khoảng giá trị:** min và max của mọi cột số và ngày. Có gì vô lý không?
9. **Business rule:** những cột phải khớp với nhau.
10. **Nhật ký câu hỏi:** mọi điều bạn chưa giải thích được, để hỏi người quản lý dữ liệu (data owner).

### Ví dụ trên bảng `payments`

```sql
SELECT COUNT(*), MIN(created_at), MAX(created_at),
       MIN(amount), MAX(amount), ROUND(AVG(amount))
FROM payments;
```

| COUNT(*) | MIN(created_at) | MAX(created_at) | MIN(amount) | MAX(amount) | ROUND(AVG(amount)) |
|---|---|---|---|---|---|
| 7630 | 2025-06-30 20:24:34 | 2026-06-30 14:55:18 | 30000 | 22630000 | 742469 |

Bước 1, 5 và 8: một năm dữ liệu thanh toán, từ 1/7/2025 đến 30/6/2026 theo giờ Việt Nam; số tiền từ 30.000 đến 22.630.000 đồng, trung bình khoảng 742.000. Không có số âm hay vô lý. Lưu ý các bảng phủ những giai đoạn khác nhau: hồ sơ vay bắt đầu từ 2025-01-01, giao dịch ví từ tháng 10/2024.

Bước 2 và 3: 7.630 `payment_id` duy nhất nhưng chỉ 7.593 phiên (mục 3). Ghi lại.

```sql
SELECT status, COUNT(*) AS n, COUNT(failure_reason) AS with_reason
FROM payments
GROUP BY status
ORDER BY n DESC;
```

| status | n | with_reason |
|---|---|---|
| success | 6816 | 0 |
| failed | 621 | 621 |
| refunded | 175 | 0 |
| pending | 18 | 0 |

Bước 6, 7 và 9: bốn trạng thái; `failure_reason` có giá trị ở đủ 621 payment thất bại và không ở đâu khác, nên business rule được giữ đúng.

Bước 10:

```text
QUESTIONS - payments (as of 2026-06-30)
1. 37 more payments than sessions: are some sessions charged twice?
2. 18 payments still 'pending': how old are they? Is that normal?
3. Status keeps only the latest state: is there a status history?
4. Daily reports: cut days in UTC or in Vietnam time?
```

(Dịch: 1. Nhiều hơn 37 payment so với số phiên: có phiên nào bị trừ tiền hai lần? 2. 18 payment vẫn `pending`: đã treo bao lâu, có bình thường không? 3. Trạng thái chỉ giữ giá trị mới nhất: có lịch sử đổi trạng thái không? 4. Báo cáo theo ngày: cắt ngày theo UTC hay giờ Việt Nam?)

Nhật ký đó không phải dấu hiệu thất bại. Nó là thứ giá trị nhất bạn làm ra trong ngày đầu tiên.

> **Tự làm thử:** Chạy checklist trên bảng `loans`. Bạn sẽ thấy 3.106 dòng, tiền gốc từ 1.000.000 đến 80.000.000 đồng, và ba trạng thái: active (1.761), closed (1.290) và defaulted (55).

---

## 10. Bài tập thực hành

### Bài 1 — Đọc lịch trả nợ

Khoản vay 1794, vay tiền mặt 10.000.000 đồng, tại ngày 2026-06-30 (`SELECT installment_no, due_date, amount_due, paid_date, amount_paid FROM repayment_schedule WHERE loan_id = 1794;`):

| installment_no | due_date | amount_due | paid_date | amount_paid |
|---|---|---|---|---|
| 1 | 2026-02-21 | 1829000 | 2026-02-28 | 1829000 |
| 2 | 2026-03-21 | 1829000 | 2026-03-31 | 1829000 |
| 3 | 2026-04-21 | 1829000 | 2026-04-17 | 1829000 |
| 4 | 2026-05-21 | 1829000 | 2026-06-07 | 1829000 |
| 5 | 2026-06-21 | 1829000 | NULL | 0 |
| 6 | 2026-07-21 | 1829000 | NULL | 0 |

Grain là gì? Kỳ nào quá hạn tại ngày 2026-06-30, và quá hạn bao nhiêu ngày? Khách đã trả được bao nhiêu?

**Đáp án:** Một dòng = một kỳ trả góp hằng tháng của khoản vay 1794. Chỉ kỳ 5 quá hạn: đến hạn 21/6, chưa trả tính đến 30/6, tức 9 ngày. Kỳ 6 cũng là NULL và 0 nhưng phải đến 21/7 mới đến hạn. Kỳ 1, 2 và 4 trả trễ, kỳ 3 trả sớm. Đã trả: 4 × 1.829.000 = 7.316.000 đồng.

```sql
SELECT installment_no, due_date,
       CAST(julianday('2026-06-30') - julianday(due_date) AS INTEGER) AS days_past_due
FROM repayment_schedule
WHERE loan_id = 1794 AND paid_date IS NULL AND due_date <= '2026-06-30';

-- Total paid so far: 7316000
SELECT SUM(amount_paid) FROM repayment_schedule WHERE loan_id = 1794;
```

### Bài 2 — Giao dịch này thuộc tháng nào?

Báo cáo doanh số tháng 12/2025, cắt theo ngày thô của `created_at`, có một payment được lưu là `'2025-12-31 17:20:00'`. Khách khẳng định đã trả "ngay sau nửa đêm, tức là đã sang ngày 1/1". Ai đúng?

**Đáp án:** Khách đúng. 17:20 UTC + 7 giờ = 00:20 ngày 1/1/2026 ở Việt Nam, nên báo cáo theo giờ Việt Nam phải tính nó vào tháng 1. Kiểm tra bằng `SELECT datetime('2025-12-31 17:20:00', '+7 hours');`, kết quả là `2026-01-01 00:20:00`.

### Bài 3 — Hồ sơ thin-file theo sản phẩm

Viết query cho biết, với mỗi sản phẩm, số hồ sơ và số hồ sơ không có điểm tín dụng.

**Đáp án:**

```sql
SELECT product, COUNT(*) AS applications, SUM(credit_score IS NULL) AS no_score
FROM loan_applications
GROUP BY product;
```

| product | applications | no_score |
|---|---|---|
| bnpl | 2916 | 123 |
| cash_loan | 3938 | 184 |

123 + 184 = 307, khớp với mục 7. Luôn đối chiếu bảng chia nhỏ với con số tổng.

### Bài 4 — Hồ sơ hay người nộp?

Trưởng nhóm marketing hỏi: "Tháng 6/2026 có bao nhiêu người nộp hồ sơ vay?" Một đồng nghiệp trả lời 453. Đúng không?

**Đáp án:** 453 là số hồ sơ; câu hỏi là về số người.

```sql
SELECT COUNT(*) AS applications, COUNT(DISTINCT customer_id) AS applicants
FROM loan_applications
WHERE applied_at >= '2026-06-01' AND applied_at < '2026-07-01';
```

| applications | applicants |
|---|---|
| 453 | 429 |

Có 429 người nộp. Cách cắt này dùng UTC; làm lại với `datetime(applied_at, '+7 hours')` thì ở đây vẫn ra 453 và 429, nhưng lần nào cũng nên kiểm tra thay vì mặc định.

### Bài 5 — Tìm vấn đề trong một slide

Một slide viết: "Khách hàng của chúng ta có thu nhập trung bình 17,07 triệu đồng/tháng." Bạn cần kiểm tra gì trước khi slide lên tới ban giám đốc?

**Đáp án:** Đó là `AVG(monthly_income)` trên cột thô. Nó tính cả ba lỗi gõ 999.999.999 (bỏ chúng đi còn 16,29 triệu) và âm thầm bỏ qua 232 khách không khai thu nhập. Slide phải nói rõ đã xử lý NULL và giá trị ngoại lai (outlier) thế nào, hoặc dùng trung vị thay thế (da-04).

### Bài 6 — Tìm lỗi

Một query chốt cuối tháng dùng `WHERE created_at <= '2026-06-30'` để lấy mọi payment đến hết 30/6/2026. Phòng tài chính nói con số bị thấp. Vì sao?

**Đáp án:** `created_at` có cả giờ, và so sánh chuỗi đặt `'2026-06-30 14:55:18'` sau `'2026-06-30'`. Query trả về 7.617 thay vì 7.630, mất 13 payment phát sinh trong ngày 30/6. Hãy dùng `created_at < '2026-07-01'`, và thống nhất mốc cắt theo UTC hay giờ Việt Nam.

---

## 11. Tóm tắt

- Trước khi phân tích, hãy **đọc**: grain, khóa, kiểu dữ liệu, đơn vị, múi giờ, mã trạng thái và giá trị thiếu.
- **Grain** ("một dòng = một cái gì?") quyết định bạn được đếm và cộng cái gì. Hồ sơ ≠ khoản vay ≠ kỳ trả góp; số hồ sơ ≠ số người nộp.
- Khóa nối các bảng với nhau. Kiểm tra tính duy nhất bằng `COUNT(*)` so với `COUNT(DISTINCT …)`. ID là nhãn: lưu dạng text và không bao giờ cộng chúng.
- Biết rõ **đơn vị**: đồng hay triệu đồng, phần trăm hay phân số, có dấu hay không.
- Timestamp ở VayNhanh là **UTC**; Việt Nam là UTC+7. Đổi múi giờ làm thay đổi ngày, giờ cao điểm và tổng theo ngày. Lọc bằng "< ngày hôm sau".
- Trạng thái là tình trạng mới nhất tại ngày snapshot, và cùng một từ mã có thể mang nghĩa khác nhau ở các bảng khác nhau.
- **NULL ≠ 0 ≠ ô trống.** NULL có thể là không biết, không áp dụng hoặc chưa đến hạn. Quyết định cách xử lý và ghi lại.
- Dùng **data dictionary** và **checklist nhìn lần đầu**, và luôn giữ một nhật ký câu hỏi.

### Thuật ngữ chính

| Thuật ngữ | Nghĩa dễ hiểu |
|---|---|
| Grain | một dòng của bảng đại diện cho cái gì |
| Primary key (khóa chính) | cột xác định duy nhất từng dòng |
| Foreign key (khóa ngoại) | cột trỏ tới một dòng ở bảng khác |
| Snapshot | dữ liệu "đóng băng" tại một ngày (ở đây là 2026-06-30) |
| UTC | giờ chuẩn quốc tế; Việt Nam = UTC+7 |
| Enum | cột có giá trị lấy từ một danh sách mã cố định |
| NULL | không có giá trị: không biết, không cung cấp hoặc không áp dụng |
| Thin-file | khách chưa có lịch sử tín dụng để chấm điểm |
| Data dictionary | bảng mô tả ý nghĩa, kiểu, đơn vị và giá trị hợp lệ của từng cột |
| Fan-out | số dòng bị nhân lên sau khi join, làm phồng tổng và số đếm |

Bài tiếp theo: **da-02 "Dữ liệu đằng sau ngân hàng, cho vay và thanh toán"** cho thấy các bảng này ghép với nhau thành một mô hình dữ liệu fintech như thế nào.
