# Dữ liệu đằng sau ngân hàng, cho vay và thanh toán

## 1. Có bản đồ rồi mới phân tích

Trước khi tính approval rate (tỷ lệ duyệt) hay payment success rate (tỷ lệ thanh toán thành công), bạn cần một tấm bản đồ: có những bảng nào, một dòng trong mỗi bảng nghĩa là gì, và các bảng nối với nhau ra sao. Gần như mọi con số trong fintech đều được dựng từ vài "thứ" cơ bản: **khách hàng** (customer), các **tài khoản** (account) giữ tiền của họ, các **giao dịch** (transaction) làm tiền dịch chuyển, **chuỗi cho vay** (hồ sơ vay → khoản vay → trả nợ) và **chuỗi thanh toán** (merchant → checkout → payment → hoàn tiền).

Bài này nghiên cứu *hình dạng* của database thực hành **VayNhanh**, một công ty cho vay số (digital lender) hư cấu của Việt Nam có kèm ví điện tử. Hãy mở [SQL Practice → Fintech](/practice/sql?db=fintech) ở một tab khác và chạy các câu query trong lúc đọc; mỗi lần chạy dùng một bản sao tạm, nên không thể làm hỏng gì.

Hình vẽ thể hiện các bảng nối với nhau thế nào gọi là **ERD** (entity-relationship diagram, sơ đồ thực thể – quan hệ). Đây là ERD của fintech.db, kèm số dòng của từng bảng (lấy từ `SELECT COUNT(*) FROM <bảng>`):

```text
 customers (4,000)
 ├── 1 : n ──── loan_applications (6,854)
 │                └── 1 : 0..1 ──── loans (3,106)
 │                                    └── 1 : n ──── repayment_schedule (28,824)
 ├── 1 : 0..1 ─ wallets (2,235)
 │                └── 1 : n ──── wallet_transactions (26,923)
 │                                 └ reference ┄┄► payments.payment_id  (e-wallet rows)
 ├── 1 : n ──── checkout_events (46,526)
 │                └ session_id ┄┄► payments.session_id
 └── 1 : n ──── payments (7,630)

 merchants (33)
 ├── 1 : n ──── checkout_events
 └── 1 : n ──── payments

 ──  foreign key (declared)      ┄┄►  soft link (same value, not declared as a key)
```

Đọc như sau: "một khách hàng có **1 : n** (một – nhiều) hồ sơ vay", "một hồ sơ có **0..1** khoản vay" (nhiều nhất một). Hai **liên kết mềm** (soft link) không được khai báo là khóa, nhưng bạn vẫn JOIN được: `payments.session_id` khớp với `checkout_events.session_id`, và `wallet_transactions.reference` chứa `payment_id` cho các dòng thanh toán và hoàn tiền bằng ví.

> **Góc BA:** Khi vào một dự án fintech mới, hãy xin (hoặc tự vẽ) tấm bản đồ này ngay tuần đầu. Rất nhiều cuộc cãi nhau kiểu "số không khớp" thực chất là hai người đang đếm hai bảng khác nhau: hồ sơ vay với khoản vay, lần thử thanh toán với thanh toán thành công.

## 2. Khách hàng và KYC: ai được phép làm gì

Một dòng **customer** là một người đã đăng ký. Còn được *phép* vay tiền hay giữ tiền thì phải đợi: một công ty chịu quản lý phải xác minh danh tính người đó trước. Việc này gọi là **KYC** (Know Your Customer, "hiểu khách hàng của bạn"). Ở Việt Nam, KYC trực tuyến (**eKYC**) thường là quét căn cước công dân gắn chip (CCCD) và chụp selfie để so khớp với ảnh trên thẻ. fintech.db lưu kết quả ở cột `customers.kyc_status`.

KYC là một **cửa chặn** (gate). Kiểm tra bằng LEFT JOIN sang bảng ví:

```sql
SELECT c.kyc_status,
       COUNT(*)           AS customers,
       COUNT(w.wallet_id) AS with_wallet
FROM customers c
LEFT JOIN wallets w ON w.customer_id = c.customer_id
GROUP BY c.kyc_status;
```

| kyc_status | customers | with_wallet |
| --- | --- | --- |
| pending | 241 | 0 |
| rejected | 141 | 0 |
| verified | 3618 | 2235 |

Không khách hàng chưa xác minh nào có ví. Họ vẫn *nộp* hồ sơ vay được, nhưng:

```sql
SELECT a.status, a.reject_reason, COUNT(*) AS applications
FROM loan_applications a
JOIN customers c ON c.customer_id = a.customer_id
WHERE c.kyc_status <> 'verified'
GROUP BY a.status, a.reject_reason;
```

| status | reject_reason | applications |
| --- | --- | --- |
| pending | NULL | 2 |
| rejected | kyc_failed | 630 |

Mọi hồ sơ đã có quyết định của khách chưa xác minh đều bị từ chối với lý do `kyc_failed`. Vậy "số khách hàng" (4,000) và "số khách hàng thực sự dùng được sản phẩm" là hai con số khác nhau, và báo cáo phải nói rõ mình đang đưa con số nào.

Để ý thêm: `kyc_status` chỉ cho biết *khách hàng hiện đang ở trạng thái nào*. Không có cột nào cho biết họ được xác minh *khi nào*. Mục 4 giải thích vì sao điều này quan trọng.

> **Hiểu lầm thường gặp:** "Khách hàng và tài khoản là một." Một khách hàng có thể có một ví, hai khoản vay và một tài khoản tiết kiệm. Luôn hỏi lại: chỉ số này đếm *khách hàng* hay đếm *tài khoản*?

## 3. Tài khoản, sổ cái và bút toán kép

Trong ngân hàng, **tài khoản** (account) là một "chiếc hộp" đựng tiền có tên, có chủ và có số dư: tài khoản thanh toán, ví điện tử, khoản vay (khi đó số dư là số tiền bạn còn nợ). Số dư chỉ thay đổi qua các **giao dịch** (transaction).

Ngân hàng và ví thật ghi mọi lần dịch chuyển tiền vào một **sổ cái** (ledger): một cuốn sổ chỉ được ghi thêm, không sửa xóa. Sổ cái tốt dùng **bút toán kép** (double-entry bookkeeping): mỗi lần tiền di chuyển được ghi hai lần, một lần là tiền rời khỏi một tài khoản, một lần là tiền vào tài khoản khác, nên không có đồng nào tự sinh ra hay biến mất. Kế toán gọi hai vế là **Nợ** (debit) và **Có** (credit); trong mỗi bút toán, tổng Nợ = tổng Có.

Đây là ví 520 nếu được ghi bằng sổ cái bút toán kép (số tiền thật từ fintech.db; bản thân cuốn sổ cái chỉ là minh họa):

| Bút toán | Chuyện gì xảy ra | Nợ (debit) | Có (credit) | VND |
| --- | --- | --- | --- | --- |
| E1 | Khách nạp tiền vào ví từ ngân hàng | Tiền của VayNhanh tại ngân hàng | Ví 520 (nợ khách hàng) | 190,000 |
| E2 | Khách trả tiền cho Kids Corner | Ví 520 (nợ khách hàng) | Phải trả Kids Corner | 133,000 |
| E3 | Kids Corner hoàn tiền đơn hàng | Phải trả Kids Corner | Ví 520 (nợ khách hàng) | 133,000 |

Tiền trong ví của khách không phải tiền của VayNhanh: đó là khoản VayNhanh **đang nợ** khách, nên ghi Có làm nó tăng, ghi Nợ làm nó giảm. Bạn không cần thuộc chiều Nợ/Có; chỉ cần nhớ ý chính: **mỗi lần tiền dịch chuyển đều có hai vế, và hai vế luôn cân nhau.** Nhờ vậy bộ phận tài chính chứng minh được không có đồng nào tự sinh ra hay mất đi.

> **Quan trọng:** fintech.db là mô hình **đơn giản hóa**. Nó **không có bảng sổ cái và không có bảng tài khoản**. Thứ gần nhất là `wallet_transactions`, chỉ lưu vế phía ví của mỗi lần dịch chuyển, dưới dạng một số tiền có dấu (tiền vào > 0, tiền ra < 0). Tiền trả nợ vay được ghi thẳng lên các dòng lịch trả nợ. Đi làm, bạn sẽ hay gặp bảng `ledger_entries` hoặc `journal_lines`; khi gặp, hãy kiểm tra các dòng của mỗi bút toán có cân nhau không.

## 4. Số dư và giao dịch, snapshot và event

Có hai cách biết trong ví có bao nhiêu tiền: đọc **số dư** (balance) đã lưu, hoặc cộng các **giao dịch** thành công lại. Hai cách phải ra cùng một số. Ví 520:

```sql
SELECT txn_id, created_at, txn_type, amount, status, reference
FROM wallet_transactions
WHERE wallet_id = 520
ORDER BY created_at;
```

| txn_id | created_at | txn_type | amount | status | reference |
| --- | --- | --- | --- | --- | --- |
| 10324 | 2025-11-27 09:55:41 | top_up | 190000 | success | NULL |
| 15382 | 2026-02-12 23:26:07 | payment | -133000 | success | 4598 |
| 15775 | 2026-02-17 23:26:07 | refund | 133000 | success | 4598 |
| 17392 | 2026-03-11 15:30:13 | transfer_out | -310000 | failed | NULL |
| 17793 | 2026-03-17 05:32:30 | top_up | 750000 | success | NULL |
| 20815 | 2026-04-23 09:07:31 | transfer_out | -130000 | success | NULL |

Các dòng thành công: 190,000 − 133,000 + 133,000 + 750,000 − 130,000 = **810,000**. Lần chuyển tiền thất bại không làm tiền dịch chuyển nên không tính. So với số dư đã lưu:

```sql
SELECT w.wallet_id,
       w.balance AS stored_balance,
       SUM(CASE WHEN t.status = 'success' THEN t.amount ELSE 0 END) AS computed_balance
FROM wallets w
JOIN wallet_transactions t ON t.wallet_id = w.wallet_id
WHERE w.wallet_id = 520
GROUP BY w.wallet_id, w.balance;
```

| wallet_id | stored_balance | computed_balance |
| --- | --- | --- |
| 520 | 810000 | 810000 |

Khớp. So sánh hai bản ghi độc lập của cùng một khoản tiền gọi là **đối soát** (reconciliation); chỗ lệch gọi là **break**. Có vài ví trong fintech.db không khớp; bài sau sẽ đi săn chúng.

### Hai loại bảng

| | **Event** (giao dịch, nhật ký) | **Snapshot** (trạng thái hiện tại) |
| --- | --- | --- |
| Một dòng nghĩa là | Một việc đã xảy ra, tại một thời điểm | Một thứ đang như thế nào (hoặc tính đến một ngày) |
| Thay đổi bằng cách | Thêm dòng mới (chỉ ghi thêm) | Ghi đè lên cột |
| Trong fintech.db | `wallet_transactions`, `checkout_events` | `wallets.balance`, `customers.kyc_status`, `loans.status` |

Có bảng lai cả hai. `payments` có một dòng cho mỗi lần thử thanh toán (event), nhưng `status` của nó bị ghi đè về sau (`success` thành `refunded`). `repayment_schedule` là một kế hoạch, và `paid_date`, `amount_paid` được điền vào khi khách trả tiền. Mọi trạng thái trong fintech.db đều tính **đến ngày 2026-06-30**.

Quy tắc: **từ event luôn dựng lại được snapshot, nhưng từ snapshot không bao giờ dựng lại được event.** Số dư ở trên được dựng lại từ giao dịch. Nhưng không câu query nào cho bạn biết khách hàng 933 (chủ ví 520, theo `wallets.customer_id`) trở thành `verified` vào *ngày nào*, vì `kyc_status` chỉ giữ giá trị mới nhất.

> **Góc BA:** Nếu có ai đó sẽ hỏi "vào ngày D có bao nhiêu X đang ở trạng thái Y?", hãy viết yêu cầu cho một bảng **lịch sử trạng thái** (status history: mỗi lần đổi trạng thái là một dòng, có thời điểm). Thêm bảng đó sau này không lấy lại được lịch sử bạn chưa từng ghi.

## 5. Chuỗi cho vay: hồ sơ → quyết định → khoản vay → lịch trả nợ → trả nợ

Mỗi mắt xích của chuỗi cho vay là một bảng với **grain** riêng (một dòng nghĩa là gì): `loan_applications` một dòng cho mỗi hồ sơ (quyết định được ghi lên chính dòng đó), `loans` một dòng cho mỗi khoản vay đã giải ngân, `repayment_schedule` một dòng cho mỗi kỳ trả.

Đi theo khách hàng 3152 qua cả chuỗi:

```sql
SELECT a.application_id, a.product, a.amount_requested,
       a.status AS app_status, l.loan_id, l.principal, l.status AS loan_status
FROM loan_applications a
LEFT JOIN loans l ON l.application_id = a.application_id
WHERE a.customer_id = 3152
ORDER BY a.applied_at;
```

| application_id | product | amount_requested | app_status | loan_id | principal | loan_status |
| --- | --- | --- | --- | --- | --- | --- |
| 2645 | cash_loan | 4500000 | approved | 1150 | 4500000 | closed |
| 3003 | bnpl | 6100000 | cancelled | NULL | NULL | NULL |
| 5440 | cash_loan | 7000000 | approved | 2384 | 7000000 | active |

Từng bước với hồ sơ đầu tiên (chi tiết lấy từ `SELECT * FROM loan_applications WHERE application_id = 2645` và `SELECT * FROM loans WHERE loan_id = 1150`):

1. **Hồ sơ.** Ngày 2025-09-19, khách xin vay 4,500,000 VND trong 6 tháng. Dòng này lưu yêu cầu và **điểm tín dụng** (credit score, 632) do mô hình chấm điểm đưa ra.
2. **Quyết định.** Khoảng bốn phút sau, hồ sơ được `approved` và `decided_at` được điền. Công ty cho vay số quyết định tự động, trong vài giây đến vài phút.
3. **Khoản vay.** Khoản vay 1150 được **giải ngân** (disburse, chuyển tiền cho người vay) ngay trong ngày: lãi suất danh nghĩa 31%/năm, 6 kỳ, mỗi kỳ 820,000.
4. **Lịch trả nợ và trả nợ.** Sáu dòng xuất hiện trong `repayment_schedule`, mỗi tháng một dòng. Mỗi lần khách trả, `paid_date` và `amount_paid` được điền vào:

```sql
SELECT installment_no, due_date, amount_due, paid_date, amount_paid
FROM repayment_schedule
WHERE loan_id = 1150
ORDER BY installment_no;
```

| installment_no | due_date | amount_due | paid_date | amount_paid |
| --- | --- | --- | --- | --- |
| 1 | 2025-10-19 | 820000 | 2025-10-17 | 820000 |
| 2 | 2025-11-19 | 820000 | 2025-11-16 | 820000 |
| 3 | 2025-12-19 | 820000 | 2025-12-18 | 820000 |
| 4 | 2026-01-19 | 820000 | 2026-01-16 | 820000 |
| 5 | 2026-02-19 | 820000 | 2026-02-18 | 820000 |
| 6 | 2026-03-19 | 820000 | 2026-03-16 | 820000 |

Trả đủ và đúng hạn, nên khoản vay là `closed`. Hồ sơ BNPL được mô hình duyệt nhưng khách không bao giờ nhận lời đề nghị: `cancelled`, không có khoản vay. Trong database này, `approved` nghĩa là "được duyệt **và** đã thành khoản vay". Kiểm tra trên toàn bảng:

```sql
SELECT a.status AS app_status,
       COUNT(*)         AS applications,
       COUNT(l.loan_id) AS loans_created
FROM loan_applications a
LEFT JOIN loans l ON l.application_id = a.application_id
GROUP BY a.status
ORDER BY applications DESC;
```

| app_status | applications | loans_created |
| --- | --- | --- |
| rejected | 3424 | 0 |
| approved | 3106 | 3106 |
| cancelled | 295 | 0 |
| pending | 29 | 0 |

Đúng một khoản vay cho mỗi hồ sơ được duyệt. Ràng buộc `UNIQUE` trên `loans.application_id` đảm bảo "nhiều nhất một"; dữ liệu cho thấy "đúng một".

> **Đơn giản hóa:** công ty cho vay thật còn có bảng `repayments` (mỗi lần nhận tiền là một dòng), vì khách có thể trả nửa kỳ, trả gộp hai kỳ, hay trả trễ thành nhiều lần. fintech.db ghi thẳng việc trả tiền lên lịch trả nợ. Ngoài ra, các thanh toán `bnpl` lúc checkout không được nối với dòng nào trong `loans`; một công ty BNPL thật sẽ nối chúng bằng một ID.

> **Tự làm thử:** chạy câu query lịch trả nợ với `loan_id = 2086`. Bạn sẽ thấy kỳ 1 đã trả, còn kỳ 2–4 (đến hạn 2026-04-27, 05-27 và 06-27) có `paid_date` NULL và `amount_paid` 0: **quá hạn** (overdue), tức đến hạn trước 2026-06-30 mà chưa trả. Đo trễ bao nhiêu ngày (DPD) là việc của bài chỉ số cho vay.

## 6. Trạng thái là một máy trạng thái

Cột `status` không phải chữ tự do. Mỗi giá trị là một **trạng thái** (state), và chỉ một số bước chuyển giữa các trạng thái là hợp lệ: đó là **máy trạng thái** (state machine). Vẽ nó ra là cách nhanh nhất để hiểu một bảng.

```text
 loan_applications.status                 loans.status (as of 2026-06-30)
            ┌──► approved ──► loan created           ┌──► closed     (all paid)
 pending ───┼──► rejected  + reject_reason   active ──┤
            └──► cancelled (offer not taken)         └──► defaulted  (unpaid > 90 days)

 payments.status
            ┌──► success ──► refunded
 pending ───┤
            └──► failed  + failure_reason
```

Mỗi trạng thái kéo theo quy tắc cho các cột khác, và mỗi quy tắc là một phép kiểm tra bạn chạy được:

| Quy tắc | Trong SQL |
| --- | --- |
| Chỉ hồ sơ bị từ chối mới có lý do từ chối | `status = 'rejected'` ⇔ `reject_reason IS NOT NULL` |
| Hồ sơ đang chờ chưa có thời điểm quyết định | `status = 'pending'` ⇔ `decided_at IS NULL` |
| Chỉ thanh toán thất bại mới có lý do thất bại | `status = 'failed'` ⇔ `failure_reason IS NOT NULL` |

```sql
SELECT status,
       COUNT(*)                        AS payments,
       SUM(failure_reason IS NOT NULL) AS with_reason
FROM payments
GROUP BY status
ORDER BY payments DESC;
```

| status | payments | with_reason |
| --- | --- | --- |
| success | 6816 | 0 |
| failed | 621 | 621 |
| refunded | 175 | 0 |
| pending | 18 | 0 |

Quy tắc đúng. (Trong SQLite, `failure_reason IS NOT NULL` trả về 1 hoặc 0, nên `SUM` đếm số dòng thỏa.) 18 dòng `pending` đáng để hỏi: một thanh toán lẽ ra phải rời trạng thái `pending` trong vài giây, nên một thanh toán treo `pending` nhiều ngày là bị "kẹt". Bài Chất lượng dữ liệu sẽ xem xét chúng.

> **Hiểu lầm thường gặp:** "`status = 'success'` đếm đủ mọi thanh toán đã thành công." Hoàn tiền *ghi đè* `success` thành `refunded`, nên 175 thanh toán đã hoàn tiền cũng từng thành công. Khi trạng thái có thể đi tiếp, hãy hỏi chỉ số của bạn cần tính những trạng thái nào.

## 7. Ví, merchant, checkout, thanh toán và hoàn tiền

Phía thanh toán gồm bốn bảng:

- **`merchants`**: 33 cửa hàng (merchant), mỗi cửa hàng có ngành hàng và một **MDR** (merchant discount rate): phần trăm phí merchant phải trả trên mỗi giao dịch.
- **`checkout_events`**: nhật ký từng cú bấm. Một **session** = một lần mua hàng; mỗi bước là một dòng: `view_cart` → `start_checkout` → `select_payment` → `submit_payment` → `payment_success`.
- **`payments`**: một dòng cho mỗi lần thử thanh toán, với `method` (e_wallet, card, qr_code, bank_transfer, bnpl), `status` và `failure_reason`.
- **`wallet_transactions`**: với thanh toán `e_wallet`, tiền cũng rời khỏi ví, và `reference` chứa `payment_id`.

Đi theo thanh toán 4598, chính là giao dịch trong ví 520. Dòng của nó (`SELECT * FROM payments WHERE payment_id = 4598`, JOIN sang `merchants`) cho biết: 133,000 VND trả cho Kids Corner (thời trang, MDR 2.05%), method `e_wallet`, status `refunded`. Session checkout của nó:

```sql
SELECT event_name, event_time, device, payment_method
FROM checkout_events
WHERE session_id = (SELECT session_id FROM payments WHERE payment_id = 4598)
ORDER BY event_time;
```

| event_name | event_time | device | payment_method |
| --- | --- | --- | --- |
| view_cart | 2026-02-12 23:23:23 | ios | NULL |
| start_checkout | 2026-02-12 23:25:15 | ios | NULL |
| select_payment | 2026-02-12 23:25:53 | ios | e_wallet |
| submit_payment | 2026-02-12 23:26:05 | ios | e_wallet |
| payment_success | 2026-02-12 23:26:08 | ios | e_wallet |

Dấu vết dòng tiền nằm ở `wallet_transactions`: `WHERE reference = '4598'` trả về dòng `payment` (−133,000 ngày 2026-02-12) và dòng `refund` (+133,000 ngày 2026-02-17), đúng hai dòng bạn đã thấy ở mục 4. Câu chuyện: checkout chưa đầy ba phút, trả bằng ví, được hoàn tiền năm ngày sau. Có hai chi tiết quan trọng:

1. **Múi giờ.** 23:26 UTC ngày 12/2 là **06:26 ngày 13/2** giờ Việt Nam. Nếu báo cáo theo ngày Việt Nam, thanh toán này thuộc ngày 13.
2. **Lịch sử nằm ở đâu.** Dòng `payments` chỉ còn ghi `refunded`; thời điểm thành công đã mất. Các event và giao dịch ví thì vẫn giữ: event thì nhớ, snapshot thì quên.

Cẩn thận với grain: `checkout_events` có một dòng cho mỗi *bước*, nên `COUNT(*)` trên bảng này không bao giờ là "số người mua". Hãy đếm `DISTINCT session_id`.

### Hoàn tiền và chargeback

**Hoàn tiền** (refund) là merchant tự nguyện trả lại tiền (sai size, hủy đơn). **Chargeback** là khi chủ thẻ khiếu nại một giao dịch thẻ với ngân hàng của mình, và tiền bị thu hồi bắt buộc từ merchant, thường kèm phí, qua quy trình tranh chấp của tổ chức thẻ. fintech.db có hoàn tiền nhưng **không có dữ liệu chargeback**; ở công ty thật, chargeback về dưới dạng các file tranh chấp riêng từ ngân hàng thanh toán (acquiring bank).

## 8. Quyết toán, đối soát và idempotency key

### Quyết toán (settlement, T+1)

Merchant không nhận được tiền ngay giây khách thanh toán. Thường mỗi ngày một lần, công ty thanh toán chuyển cho merchant tổng tiền trong ngày trừ đi phí: đó là **quyết toán** (settlement). "**T+1**" nghĩa là "một ngày làm việc sau ngày giao dịch (T)"; thời gian cụ thể tùy hợp đồng.

fintech.db không có bảng settlement, nhưng bạn tự tính được. ComNgon (giao đồ ăn, MDR 1.33%) trong ngày Việt Nam 2025-12-12:

```sql
SELECT m.merchant_name,
       date(p.created_at, '+7 hours') AS vn_business_day,
       COUNT(*) AS payments,
       SUM(p.amount) AS gross_vnd,
       m.mdr_pct,
       ROUND(SUM(p.amount) * m.mdr_pct / 100) AS mdr_fee_vnd,
       SUM(p.amount) - ROUND(SUM(p.amount) * m.mdr_pct / 100) AS net_to_merchant_vnd
FROM payments p
JOIN merchants m ON m.merchant_id = p.merchant_id
WHERE p.merchant_id = 17
  AND p.status = 'success'
  AND date(p.created_at, '+7 hours') = '2025-12-12'
GROUP BY m.merchant_name, vn_business_day, m.mdr_pct;
```

| merchant_name | vn_business_day | payments | gross_vnd | mdr_pct | mdr_fee_vnd | net_to_merchant_vnd |
| --- | --- | --- | --- | --- | --- | --- |
| ComNgon | 2025-12-12 | 7 | 1133000 | 1.33 | 15069 | 1117931 |

ComNgon nhận 1,117,931 VND, VayNhanh giữ 15,069 VND tiền phí. Ngày 12/12/2025 là thứ Sáu (`strftime('%w', '2025-12-12')` trả về 5), nên với T+1 tính theo ngày làm việc, tiền về vào thứ Hai 15/12. Một trong bảy thanh toán được tạo lúc `2025-12-11 23:30:47` UTC; nếu nhóm theo ngày UTC thì nó sẽ rơi nhầm ngày. (Quyết toán thật còn trừ thêm hoàn tiền và chargeback.)

### Đối soát (reconciliation)

**Đối soát** là so sánh hai bản ghi của cùng một khoản tiền đến từ hai hệ thống khác nhau, và giải thích được từng chỗ lệch. Các cặp hay gặp: số dư ví với tổng giao dịch của ví (mục 4); thanh toán của mình trong ngày T với file quyết toán của ngân hàng cho ngày T; số tiền đã trả merchant với báo cáo doanh số của chính merchant. Bộ phận tài chính và vận hành làm việc này hằng ngày, và analyst thường là người viết query cho một vế.

### Idempotency key

App gửi lệnh "trừ 250,000 VND", mạng rớt trước khi nhận được phản hồi, và app gửi lại (retry). Nếu server cứ thế xử lý lần gửi lại, khách bị trừ tiền hai lần: **trừ tiền trùng** (double charge). Cách phòng chuẩn là **idempotency key**: một ID duy nhất app tạo ra một lần cho mỗi ý định thanh toán và gửi kèm mọi lần retry. Nếu server đã thấy key đó rồi, nó trả lại kết quả lần đầu thay vì trừ tiền lần nữa. **Idempotent** nghĩa là "làm hai lần cũng có tác dụng như làm một lần".

```text
 App ── POST /payments  key=K-81f2  250,000 ──► Server: new key → charge → store K-81f2 = success
     ✗ connection lost, app retries
 App ── POST /payments  key=K-81f2  250,000 ──► Server: key seen → return "success", no new charge
```

fintech.db không có cột idempotency key. Khóa tự nhiên gần nhất là `session_id`: một session checkout chỉ nên sinh ra nhiều nhất một thanh toán. Một phép **kiểm tra grain**:

```sql
SELECT COUNT(*)                   AS payment_rows,
       COUNT(DISTINCT session_id) AS sessions_with_a_payment
FROM payments;
```

| payment_rows | sessions_with_a_payment |
| --- | --- |
| 7630 | 7593 |

Số dòng nhiều hơn số session: có session sinh ra hơn một thanh toán. Đó là retry hợp lệ sau một lần thất bại, hay là trừ tiền trùng? Bài sau sẽ tìm ra.

> **Góc BA:** Với mọi tính năng "thanh toán", "chuyển tiền" hay "giải ngân", hãy đưa idempotency vào acceptance criteria: *"Given client gửi lại cùng một request với cùng idempotency key, then khách chỉ bị trừ tiền một lần và nhận lại cùng một kết quả."*

## 9. Bài tập thực hành

### Bài 1 — Tự tính lại số dư ví

Ví 1403 có các giao dịch sau, tất cả đều `success`: top_up 450,000; payment −414,000; refund 414,000; top_up 510,000; transfer_in 1,560,000; top_up 240,000; top_up 270,000. Số dư đã lưu lẽ ra phải là bao nhiêu?

**Đáp án:** 450,000 − 414,000 + 414,000 + 510,000 + 1,560,000 + 240,000 + 270,000 = **3,030,000 VND**. Câu query ở mục 4 với `wallet_id = 1403` trả về 3030000 cho cả `stored_balance` lẫn `computed_balance`: không có break.

### Bài 2 — Khoản vay tốn bao nhiêu tiền lãi?

Khoản vay 1150 (mục 5): gốc 4,500,000, sáu kỳ mỗi kỳ 820,000, đã trả hết. Khách hàng 3152 đã trả bao nhiêu tiền lãi? Kiểm tra bằng SQL.

**Đáp án:** 6 × 820,000 = 4,920,000; 4,920,000 − 4,500,000 = **420,000 VND**.

```sql
SELECT COUNT(*)                   AS installments,
       SUM(amount_paid)           AS total_repaid,
       SUM(amount_paid) - 4500000 AS interest_paid
FROM repayment_schedule
WHERE loan_id = 1150;
```

Kết quả: 6, 4920000 và 420000.

### Bài 3 — Tìm con số sai

Báo cáo tuần ghi: "Số thanh toán thành công đến nay: 6,816" (`WHERE status = 'success'`). Sai ở đâu?

**Đáp án:** Hoàn tiền ghi đè `success` thành `refunded`, nên thiếu 175 thanh toán đã thực sự thành công.

```sql
SELECT COUNT(*) AS ever_succeeded
FROM payments
WHERE status IN ('success', 'refunded');
```

Kết quả là **6991**. Với tỷ lệ thanh toán thành công, hãy tính cả chúng; với doanh thu giữ lại được, còn phải trừ số tiền đã hoàn. Báo cáo phải nói rõ đang dùng cách nào.

### Bài 4 — Kiểm tra máy trạng thái bằng SQL

Viết một câu query trả về mọi hồ sơ vay vi phạm các quy tắc: rejected ⇔ có `reject_reason`; pending ⇔ không có `decided_at`. Bạn kỳ vọng bao nhiêu dòng?

**Đáp án:**

```sql
SELECT application_id, status, reject_reason, decided_at
FROM loan_applications
WHERE (status = 'rejected'  AND reject_reason IS NULL)
   OR (status <> 'rejected' AND reject_reason IS NOT NULL)
   OR (status = 'pending'   AND decided_at IS NOT NULL)
   OR (status <> 'pending'  AND decided_at IS NULL);
```

**0 dòng**: bảng tuân thủ máy trạng thái của nó. Hãy lưu những phép kiểm tra kiểu này và chạy lại mỗi lần nạp dữ liệu mới; kết quả rỗng chính là thành công.

### Bài 5 — Tính quyết toán bằng tay

Cho Xanh (tạp hóa, MDR 1.26%) có 6 thanh toán thành công, tổng 1,615,000 VND trong ngày Việt Nam 2025-11-11. VayNhanh giữ bao nhiêu phí, và Cho Xanh nhận bao nhiêu khi quyết toán T+1?

**Đáp án:** phí = 1,615,000 × 1.26% = **20,349 VND**; thực nhận = **1,594,651 VND**, chuyển vào thứ Tư 12/11 (11/11 là thứ Ba, nên ngày làm việc kế tiếp là ngày 12). Câu query ở mục 8 với `merchant_id = 13` và `'2025-11-11'` trả về đúng các con số này.

### Bài 6 — "Họ được xác minh khi nào?"

Bộ phận tuân thủ (compliance) hỏi: "Ngày 1/3/2026 có bao nhiêu khách hàng vẫn đang KYC `pending`?" Bạn trả lời được từ fintech.db không?

**Đáp án:** Không. `kyc_status` là snapshot của trạng thái hôm nay, không có ngày thay đổi. Bạn chỉ nói được bây giờ có bao nhiêu khách đang pending (241), chứ không phải ngày 1/3. Hãy nói thẳng như vậy, rồi đề xuất bảng `kyc_status_history` (customer_id, old_status, new_status, changed_at) để sau này trả lời được câu hỏi đó.

## 10. Tóm tắt

- Học **bản đồ** trước: có những bảng nào, một dòng nghĩa là gì, JOIN với nhau ra sao.
- **KYC** là cửa chặn: khách chưa xác minh không có ví và hồ sơ vay của họ bị từ chối.
- Hệ thống tiền thật dùng **sổ cái** với **bút toán kép**: mỗi lần tiền dịch chuyển có hai vế cân nhau. fintech.db được đơn giản hóa và không có sổ cái.
- **Số dư** là snapshot; **giao dịch** là event. Từ event dựng lại được snapshot, không bao giờ ngược lại. So sánh hai thứ đó là **đối soát**.
- Cho vay là một chuỗi: **hồ sơ → quyết định → khoản vay → lịch trả nợ → trả nợ**, mỗi bảng một grain riêng.
- **Trạng thái là máy trạng thái**; mỗi trạng thái kéo theo quy tắc bạn kiểm tra được bằng SQL. Trạng thái đi tiếp (`success` → `refunded`) che mất lịch sử.
- **Quyết toán (T+1)** trả cho merchant tổng tiền trong ngày trừ phí MDR; **idempotency key** ngăn retry biến thành trừ tiền trùng.

### Thuật ngữ chính

| Thuật ngữ | Nghĩa dễ hiểu |
| --- | --- |
| ERD | Sơ đồ các bảng và cách chúng nối với nhau (1 : n, 0..1) |
| KYC / eKYC | Xác minh khách hàng thật sự là ai; làm online bằng CCCD + selfie |
| Sổ cái / bút toán kép | Bản ghi chỉ-ghi-thêm mọi lần tiền dịch chuyển, mỗi lần gồm hai vế cân nhau |
| Snapshot và event | Giá trị hiện tại bị ghi đè và bản ghi một việc đã xảy ra |
| Giải ngân (disburse) | Chuyển tiền vay cho người vay |
| Máy trạng thái | Các trạng thái hợp lệ và các bước chuyển hợp lệ giữa chúng |
| MDR | Phần trăm phí merchant trả trên mỗi giao dịch |
| Hoàn tiền và chargeback | Merchant tự trả lại tiền và chủ thẻ khiếu nại qua ngân hàng |
| Quyết toán (T+1) | Trả tiền cho merchant một ngày làm việc sau ngày giao dịch |
| Đối soát / break | So sánh hai bản ghi của cùng một khoản tiền / chỗ lệch giữa chúng |
| Idempotency key | ID duy nhất cho mỗi ý định thanh toán để retry không trừ tiền hai lần |

Bài tiếp theo: **Chất lượng dữ liệu & làm sạch (Data Quality & Cleaning)** — đi tìm các break, bản ghi trùng, thanh toán bị kẹt và giá trị lộn xộn mà tấm bản đồ này đã chỉ ra.
