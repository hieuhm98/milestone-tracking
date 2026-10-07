# Phân tích thanh toán, checkout và ví điện tử

## 1. Một giao dịch thanh toán đi qua những đâu, và dữ liệu nằm ở đâu

Cho vay kiếm tiền chậm, qua nhiều tháng trả góp. Thanh toán thì ngược lại: hàng nghìn sự kiện nhỏ mỗi ngày, mỗi sự kiện thành công hay thất bại chỉ trong vài giây. Câu hỏi của người phân tích thanh toán là: "bao nhiêu tiền đã chảy qua?", "cái gì thất bại, vì sao?", "khách bỏ cuộc ở bước nào?" và "mình thu được bao nhiêu?".

Một khách mua giày trong app của shop và trả bằng thẻ:

```text
customer        merchant app       payment gateway     card network       issuing bank
   |  view cart,     |                   |               (Visa, Napas...)   (customer's bank)
   |  checkout  ---> |  submit payment -> | -- authorise ----> | ---------------> | OTP / 3-D Secure
   |                 |                   | <-- approved / declined (+ reason) --|
   |  <-- "Paid!" or "Payment failed"    |
   |                 |   next day (T+1): merchant is paid the amount minus the fee (settlement)
```

Ngân hàng phát hành thẻ cho khách gọi là **issuer** (ngân hàng phát hành); ngân hàng hoặc công ty thu tiền hộ cho người bán gọi là **acquirer** (ngân hàng thanh toán, hay cổng thanh toán – payment gateway). Issuer có thể **decline** (từ chối) giao dịch, chẳng hạn vì tài khoản không đủ tiền hoặc khách không nhập được **OTP** (mã dùng một lần gửi qua SMS hoặc hiện trong app ngân hàng).

Trong database thực hành của VayNhanh, các bảng sau kể câu chuyện này:

| Bảng | Một dòng = | Dùng để |
|---|---|---|
| `checkout_events` | một bước khách thực hiện trong một phiên checkout | funnel và điểm rơi rụng |
| `payments` | một lần thử thanh toán | khối lượng, tỷ lệ thành công, lý do từ chối, hoàn tiền |
| `merchants` | một cửa hàng, kèm phí `mdr_pct` | doanh thu theo ngành hàng |
| `wallets` | một ví điện tử, số dư và trạng thái tại 2026-06-30 | tập ví |
| `wallet_transactions` | một lần tiền vào hoặc ra khỏi ví | nạp tiền, rút tiền, ví hoạt động |

Hai quy tắc cho cả bài. Một: thời gian lưu theo **UTC**; Việt Nam là UTC+7, nên với câu hỏi "ngày nào", "mấy giờ" ta luôn đổi bằng `datetime(created_at, '+7 hours')`. Hai: `payments.status` = `refunded` nghĩa là giao dịch **đã thành công trước**, sau đó mới được hoàn tiền, nên vẫn tính là một lần thanh toán thành công. `pending` nghĩa là chưa biết kết quả.

Bạn chạy được mọi câu query trong bài tại [SQL Practice → Fintech](/practice/sql?db=fintech).

## 2. Khối lượng: GMV, TPV, số giao dịch và AOV

**GMV** (gross merchandise value – tổng giá trị hàng hóa) là tổng giá trị hàng hóa, dịch vụ bán qua nền tảng, trước khi trừ hoàn tiền. **TPV** (total payment volume – tổng khối lượng thanh toán) là tổng giá trị các khoản thanh toán nền tảng đã xử lý. Với một doanh nghiệp chỉ làm checkout, hai con số gần như bằng nhau; với ví điện tử, TPV thường lớn hơn vì còn gồm nạp tiền và chuyển tiền không phải mua hàng. Luôn ghi rõ bạn đã tính những status nào.

**AOV** (average order value – giá trị trung bình một đơn) = GMV ÷ số giao dịch thành công.

```sql
SELECT COUNT(*) AS payments,
       SUM(amount) AS gmv,
       ROUND(AVG(amount)) AS aov,
       COUNT(DISTINCT customer_id) AS buyers
FROM payments
WHERE status IN ('success', 'refunded');
```

| payments | gmv | aov | buyers |
|---|---|---|---|
| 6991 | 5124819000 | 733060 | 2833 |

Vậy từ tháng 7/2025 đến tháng 6/2026: khoảng 7.000 giao dịch thành công, GMV khoảng **5,12 tỷ đồng**, AOV khoảng **733.000 đồng**.

Số trung bình che mất độ lệch. SQLite không có hàm `MEDIAN`, nên ta sắp xếp rồi lấy dòng ở giữa:

```sql
SELECT amount AS median_amount
FROM payments
WHERE status IN ('success', 'refunded')
ORDER BY amount
LIMIT 1 OFFSET (SELECT COUNT(*) / 2 FROM payments WHERE status IN ('success', 'refunded'));
```

Trung vị (median) là **334.000 đồng**, chưa bằng một nửa AOV. Vài đơn điện tử lớn kéo số trung bình lên, trong khi giỏ hàng điển hình chỉ là một bữa ăn hay ít đồ tạp hóa. Hãy báo cáo cả hai con số.

Xu hướng theo tháng, chia theo tháng giờ Việt Nam:

```sql
SELECT strftime('%Y-%m', created_at, '+7 hours') AS month,
       COUNT(*) AS payments,
       SUM(amount) AS gmv,
       ROUND(AVG(amount)) AS aov
FROM payments
WHERE status IN ('success', 'refunded')
  AND datetime(created_at, '+7 hours') >= '2026-01-01'
GROUP BY month
ORDER BY month;
```

| month | payments | gmv | aov |
|---|---|---|---|
| 2026-01 | 646 | 474188000 | 734037 |
| 2026-02 | 617 | 432344000 | 700720 |
| 2026-03 | 619 | 450394000 | 727616 |
| 2026-04 | 579 | 444033000 | 766896 |
| 2026-05 | 630 | 465175000 | 738373 |
| 2026-06 | 660 | 493203000 | 747277 |

GMV = số giao dịch × AOV. Khi GMV thay đổi, hãy xem thành phần nào thay đổi. Tháng 4 số giao dịch giảm nhưng AOV tăng, nên GMV gần như không đổi.

> **Hiểu lầm thường gặp:** "GMV là doanh thu của mình." Không phải. GMV là tiền của người mua chảy về người bán. Doanh thu của nền tảng là phần phí giữ lại (mục 6), ở đây khoảng 1–2% GMV.

## 3. Tỷ lệ thanh toán thành công và lý do bị từ chối

**Payment success rate** (tỷ lệ thanh toán thành công, còn gọi là authorization rate hay approval rate) = số lần thử thành công ÷ số lần thử đã có kết quả. Hãy chốt mẫu số rõ ràng:

- `refunded` → thành công (tiền đã chuyển; hoàn tiền là một sự kiện khác, xảy ra sau).
- `pending` → loại ra (chưa có kết quả). Các giao dịch pending bị "kẹt" là vấn đề chất lượng dữ liệu, báo cáo riêng.
- `failed` → thất bại.

```sql
SELECT method,
       COUNT(*) AS attempts,
       SUM(status IN ('success', 'refunded')) AS succeeded,
       ROUND(100.0 * SUM(status IN ('success', 'refunded')) / COUNT(*), 1) AS success_pct
FROM payments
WHERE status <> 'pending'
GROUP BY method
ORDER BY success_pct;
```

| method | attempts | succeeded | success_pct |
|---|---|---|---|
| card | 2846 | 2541 | 89.3 |
| e_wallet | 1767 | 1600 | 90.5 |
| qr_code | 1559 | 1480 | 94.9 |
| bank_transfer | 1024 | 973 | 95 |
| bnpl | 416 | 397 | 95.4 |

Tính chung là 6.991 trên 7.612, khoảng **91,8%**. Định nghĩa rất quan trọng: nếu chỉ đếm `status = 'success'` trên toàn bộ dòng, bạn được 89,3%, tức là lặng lẽ coi mọi giao dịch đã hoàn tiền là thất bại.

Vì sao thẻ thất bại nhiều nhất? Xem lý do:

```sql
SELECT failure_reason,
       COUNT(*) AS failed,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct_of_failures
FROM payments
WHERE method = 'card' AND status = 'failed'
GROUP BY failure_reason
ORDER BY failed DESC;
```

| failure_reason | failed | pct_of_failures |
|---|---|---|
| bank_declined | 138 | 45.2 |
| otp_timeout | 83 | 27.2 |
| insufficient_funds | 56 | 18.4 |
| network_error | 21 | 6.9 |
| fraud_blocked | 7 | 2.3 |

Nhóm các lý do theo "ai sửa được":

| Loại | Ví dụ | Ai xử lý |
|---|---|---|
| Phía khách hàng | insufficient_funds | khách; product có thể gợi ý phương thức khác hoặc nạp ví |
| Quyết định của issuer | bank_declined | issuer; xin acquirer mã phản hồi chi tiết |
| Xác thực | otp_timeout (chưa hoàn tất 3-D Secure / OTP) | product + nhà cung cấp SMS/OTP; thường sửa được |
| Kỹ thuật | network_error | đội kỹ thuật; thường thử lại được |
| Rủi ro | fraud_blocked | đội risk; chặn quá tay cũng mất khách tốt |

**3-D Secure** là bước xác thực thêm cho thanh toán thẻ online: issuer kiểm tra đúng chủ thẻ đang trả tiền, thường bằng OTP hoặc xác nhận trong app ngân hàng. Bước này giảm gian lận nhưng thêm một chỗ khách có thể bị hết thời gian.

> **Góc BA:** "Tỷ lệ thành công theo phương thức" chưa phải là một report spec hoàn chỉnh. Acceptance criteria cần ghi: refunded tính là thành công, loại pending, ngày theo giờ Việt Nam, và có loại 37 giao dịch bị trừ tiền hai lần (từ bài chất lượng dữ liệu) hay không. Nếu không, hai đội sẽ cãi nhau về hai con số đều "đúng".

## 4. Funnel checkout và điểm rơi rụng

**Funnel** (phễu) đếm xem bao nhiêu phiên đi tới từng bước. Trong `checkout_events` các bước là `view_cart → start_checkout → select_payment → submit_payment → payment_success`. Hãy đếm **số phiên khác nhau** (distinct session), không đếm số event: trong log thật, khách bấm "Thanh toán" hai lần sẽ tạo hai event `submit_payment` trong cùng một phiên.

```sql
WITH steps AS (
  SELECT event_name,
         CASE event_name
           WHEN 'view_cart' THEN 1 WHEN 'start_checkout' THEN 2
           WHEN 'select_payment' THEN 3 WHEN 'submit_payment' THEN 4
           WHEN 'payment_success' THEN 5
         END AS step_no,
         COUNT(DISTINCT session_id) AS sessions
  FROM checkout_events
  GROUP BY event_name
)
SELECT step_no,
       event_name,
       sessions,
       ROUND(100.0 * sessions / LAG(sessions) OVER (ORDER BY step_no), 1) AS pct_of_previous,
       ROUND(100.0 * sessions / FIRST_VALUE(sessions) OVER (ORDER BY step_no), 1) AS pct_of_carts
FROM steps
ORDER BY step_no;
```

| step_no | event_name | sessions | pct_of_previous | pct_of_carts |
|---|---|---|---|---|
| 1 | view_cart | 13773 | NULL | 100 |
| 2 | start_checkout | 9801 | 71.2 | 71.2 |
| 3 | select_payment | 8405 | 85.8 | 61 |
| 4 | submit_payment | 7593 | 90.3 | 55.1 |
| 5 | payment_success | 6954 | 91.6 | 50.5 |

Cách đọc:

1. **Tỷ lệ chuyển đổi từng bước** (`pct_of_previous`) cho biết khách rời đi *ở đâu*. Chỗ rò lớn nhất là giỏ hàng → bắt đầu checkout: khoảng 29% giỏ hàng không bao giờ bắt đầu checkout.
2. **Tỷ lệ chuyển đổi tổng** (`pct_of_carts`) là 50,5%: một nửa số giỏ hàng kết thúc bằng một lần thanh toán.
3. Bước submit → success chính là tỷ lệ thanh toán thành công nhìn từ funnel. Những người này *đã muốn* trả tiền, nên đây là điểm rơi đáng sửa nhất.

Tự kiểm tra: bảng `payments` có 7.630 dòng nhưng chỉ 7.593 phiên đã submit thanh toán. Chênh lệch 37 đúng bằng số giao dịch bị trừ tiền hai lần: một phiên, hai dòng payment.

> **Tự làm thử:** thêm `device` vào query (`GROUP BY device, event_name`) và so sánh. Tỷ lệ chuyển đổi tổng gần như bằng nhau trên Android, iOS và web (50,4%, 51%, 50%), nên xét cả năm thì riêng thiết bị không giải thích được các điểm rò.

## 5. Hoàn tiền, chargeback và dấu hiệu gian lận

**Refund** (hoàn tiền) là người bán trả lại tiền (sai size, hủy đơn). **Refund rate** (tỷ lệ hoàn tiền) = số giao dịch bị hoàn ÷ số giao dịch thành công. Đo theo cả số lượng và giá trị.

```sql
SELECT m.category,
       COUNT(*) AS succeeded,
       SUM(p.status = 'refunded') AS refunded,
       ROUND(100.0 * SUM(p.status = 'refunded') / COUNT(*), 1) AS refund_pct
FROM payments p
JOIN merchants m ON m.merchant_id = p.merchant_id
WHERE p.status IN ('success', 'refunded')
GROUP BY m.category
ORDER BY refund_pct DESC;
```

| category | succeeded | refunded | refund_pct |
|---|---|---|---|
| fashion | 1152 | 83 | 7.2 |
| electronics | 613 | 26 | 4.2 |
| education | 579 | 9 | 1.6 |
| grocery | 1493 | 23 | 1.5 |
| food_delivery | 1844 | 21 | 1.1 |
| utilities | 919 | 9 | 1 |
| travel | 391 | 4 | 1 |

Tính chung, 175 trên 6.991 giao dịch thành công bị hoàn tiền (2,5%), trị giá 150,9 triệu đồng, tức 2,9% GMV. Thời trang 7,2% là bình thường với quần áo (chọn sai size); cùng mức tăng đó ở tạp hóa mới là lạ. Hãy so mỗi ngành hàng với lịch sử của chính nó.

**Chargeback** (bồi hoàn do tranh chấp) thì khác: *chủ thẻ* khiếu nại một giao dịch thẻ với ngân hàng phát hành ("tôi không hề mua", "hàng không tới"). Tranh chấp đi theo quy tắc của tổ chức thẻ; tiền bị rút lại từ người bán, thường kèm phí, và người bán có thể phản bác. **fintech.db không có bảng chargeback**, nên ở đây ta không đo được. Khi đi làm, bạn lấy dữ liệu tranh chấp từ acquirer: chargeback rate = số giao dịch thẻ bị khiếu nại ÷ số giao dịch thẻ, tính theo tháng của giao dịch gốc.

**Dấu hiệu gian lận** cần theo dõi: **velocity** (nhiều lần thử từ một khách, một thẻ hay một thiết bị trong vài phút), **card testing** (thử thẻ: nhiều giao dịch thẻ nhỏ thất bại rồi một giao dịch lớn), tài khoản mới trên thiết bị mới mua đồ điện tử đắt tiền, và số lần bị `fraud_blocked` tăng lên. Ở đây có 39 lần thử (khoảng 0,5%) bị `fraud_blocked`. Chặn cũng có giá: mỗi khách tốt bị chặn nhầm là một đơn hàng mất đi.

## 6. Doanh thu: MDR, take rate và quyết toán

Người bán trả một khoản phí trên mỗi giao dịch, gọi là **MDR** (merchant discount rate – phí chiết khấu người bán), lưu trong `merchants.mdr_pct`. **Doanh thu gộp** của nền tảng là tổng các khoản phí đó; **take rate** (tỷ lệ thu) = doanh thu ÷ GMV.

```sql
SELECT m.category,
       SUM(p.amount) AS gmv,
       ROUND(SUM(p.amount * m.mdr_pct / 100.0)) AS mdr_revenue,
       ROUND(100.0 * SUM(p.amount * m.mdr_pct / 100.0) / SUM(p.amount), 2) AS take_rate_pct
FROM payments p
JOIN merchants m ON m.merchant_id = p.merchant_id
WHERE p.status IN ('success', 'refunded')
GROUP BY m.category
ORDER BY gmv DESC;
```

| category | gmv | mdr_revenue | take_rate_pct |
|---|---|---|---|
| electronics | 2001624000 | 30379037 | 1.52 |
| education | 734311000 | 10351449 | 1.41 |
| fashion | 627992000 | 12345432 | 1.97 |
| travel | 624763000 | 11498542 | 1.84 |
| grocery | 494726000 | 5536447 | 1.12 |
| utilities | 395737000 | 2328500 | 0.59 |
| food_delivery | 245666000 | 3531986 | 1.44 |

Tổng cộng khoảng 76 triệu đồng phí trên 5,12 tỷ đồng GMV, take rate khoảng **1,48%**. Điện tử chiếm khoảng 39% GMV. Giao đồ ăn có nhiều giao dịch nhất nhưng doanh thu ít, vì giỏ hàng nhỏ.

Đây là doanh thu *gộp*. **Doanh thu thuần** (net revenue) còn phải trừ những gì nền tảng trả cho bên khác: phí interchange cho issuer, phí tổ chức thẻ, phí cổng thanh toán, chi phí SMS/OTP, và phần phí không được hoàn khi refund. fintech.db không lưu các chi phí này, nên hãy nói "doanh thu MDR", đừng nói "lợi nhuận".

**Settlement** (quyết toán) là việc trả tiền cho người bán. Ví dụ minh họa (số tự đặt) với một shop thời trang có MDR 1,9%, quyết toán T+1:

| Khoản | VND |
|---|---|
| 3 giao dịch thành công: 500.000 + 300.000 + 200.000 | 1.000.000 |
| Phí MDR 1,9% | −19.000 |
| Hoàn tiền hôm nay cho một đơn trước đó | −250.000 |
| **Chuyển cho người bán ngày mai** | **731.000** |

**Reconciliation** (đối soát) kiểm tra xem bảng payments, file quyết toán của acquirer và sao kê ngân hàng có khớp nhau không. Mọi chênh lệch ("break") đều phải được giải thích.

## 7. Chỉ số ví điện tử

Ví có tiền vào và tiền ra. Các KPI ví thường gặp:

- **Cash-in** (nạp tiền vào hệ thống): tiền từ bên ngoài đi vào ví, ví dụ nạp từ tài khoản ngân hàng đã liên kết.
- **Cash-out** (rút tiền ra): tiền rời ví về tài khoản ngân hàng (`withdraw`).
- **Spend** (chi tiêu): thanh toán bằng ví tại người bán. Ngoài ra còn chuyển tiền P2P giữa người dùng.
- **Active wallets** (ví hoạt động): ví có ít nhất một giao dịch thành công do chính khách thực hiện trong kỳ. Loại `cashback` và `refund` ra, vì do hệ thống tạo chứ không phải người dùng.
- **Tỷ lệ nạp tiền thành công**, và **float** (số dư thả nổi): tổng số dư khách đang để trong ví.

```sql
SELECT strftime('%Y-%m', created_at, '+7 hours') AS month,
       COUNT(DISTINCT CASE WHEN txn_type NOT IN ('cashback', 'refund') THEN wallet_id END) AS active_wallets,
       SUM(CASE WHEN txn_type = 'top_up' THEN amount ELSE 0 END) AS cash_in,
       -SUM(CASE WHEN txn_type = 'withdraw' THEN amount ELSE 0 END) AS cash_out,
       -SUM(CASE WHEN txn_type = 'payment' THEN amount ELSE 0 END) AS spent_at_merchants
FROM wallet_transactions
WHERE status = 'success'
  AND datetime(created_at, '+7 hours') >= '2026-01-01'
GROUP BY month
ORDER BY month;
```

| month | active_wallets | cash_in | cash_out | spent_at_merchants |
|---|---|---|---|---|
| 2026-01 | 903 | 651480000 | 70030000 | 114776000 |
| 2026-02 | 940 | 620340000 | 62370000 | 100800000 |
| 2026-03 | 1044 | 721360000 | 71190000 | 114596000 |
| 2026-04 | 1138 | 821700000 | 101990000 | 95104000 |
| 2026-05 | 1203 | 826710000 | 101330000 | 109816000 |
| 2026-06 | 1294 | 861160000 | 92230000 | 111987000 |

Số ví hoạt động tăng đều mỗi tháng, từ 903 lên 1.294. Cash-in lớn hơn nhiều so với cash-out cộng chi tiêu tại người bán. Tiền đang tích lại trong ví (float): tốt cho doanh nghiệp, nhưng cũng có nghĩa ví điện tử đang giữ nhiều tiền của khách, phải được bảo đảm an toàn và đối soát. Trong 14.036 lần nạp tiền, 3,1% thất bại.

Chú ý quy ước dấu của `amount`: tiền ra là số âm, nên cash-out là `-SUM(...)`.

> **Hiểu lầm thường gặp:** "Ví hoạt động = ví có status `active`." `wallets.status` là ảnh chụp (snapshot) tại 2026-06-30. Mức độ hoạt động phải lấy từ bảng giao dịch, trong một kỳ được nêu rõ.

## 8. Quy luật thời gian và khách quay lại

### Giờ trong ngày, theo giờ Việt Nam

```sql
SELECT CAST(strftime('%H', created_at, '+7 hours') AS INTEGER) AS vn_hour,
       COUNT(*) AS payments
FROM payments
WHERE status IN ('success', 'refunded')
GROUP BY vn_hour
ORDER BY payments DESC
LIMIT 5;
```

| vn_hour | payments |
|---|---|
| 20 | 630 |
| 21 | 593 |
| 22 | 491 |
| 19 | 484 |
| 12 | 428 |

Buổi tối (19:00–23:59) chiếm khoảng 36% số giao dịch, cộng thêm một đỉnh nhỏ lúc 12:00 trưa. Chạy lại mà bỏ `'+7 hours'`, đỉnh sẽ hiện ra lúc "13:00", một con số vô nghĩa nếu bạn dùng nó để xếp ca chăm sóc khách hàng hay chọn giờ gửi khuyến mãi.

### Ngày cao điểm

Nhóm các giao dịch thành công theo `date(created_at, '+7 hours')` rồi sắp theo số lượng: ngày 11.11 có 54 giao dịch, 12.12 có 47, trong khi trung bình khoảng 19 giao dịch mỗi ngày. Lấy trung bình số giao dịch theo ngày cho từng giai đoạn (một CTE đếm theo ngày, rồi `CASE` theo ngày) sẽ thấy rõ Tết (17/2/2026): khoảng 19/ngày đầu tháng 1, 27,6/ngày trong ba tuần trước Tết, và chỉ 9/ngày trong kỳ nghỉ 17–21/2. Hãy chuẩn bị hạ tầng, luật chống gian lận và nhân sự hỗ trợ cho những ngày này.

### Cohort khách mua lại

**Cohort** (nhóm thuần tập) gom khách theo thời điểm bắt đầu, ở đây là tháng của giao dịch thành công đầu tiên. Câu hỏi: "bao nhiêu phần trăm mua lại trong vòng 90 ngày?"

```sql
WITH ok AS (
  SELECT customer_id, datetime(created_at, '+7 hours') AS vn_time
  FROM payments
  WHERE status IN ('success', 'refunded')
),
firsts AS (
  SELECT customer_id, MIN(vn_time) AS first_time
  FROM ok
  GROUP BY customer_id
),
flagged AS (
  SELECT strftime('%Y-%m', f.first_time) AS cohort,
         EXISTS (
           SELECT 1 FROM ok
           WHERE ok.customer_id = f.customer_id
             AND ok.vn_time > f.first_time
             AND ok.vn_time <= datetime(f.first_time, '+90 days')
         ) AS repeated
  FROM firsts f
  WHERE f.first_time < '2026-04-01'   -- every cohort gets a full 90 days before 2026-06-30
)
SELECT cohort,
       COUNT(*) AS new_buyers,
       SUM(repeated) AS repeat_90d,
       ROUND(100.0 * AVG(repeated), 1) AS repeat_90d_pct
FROM flagged
GROUP BY cohort
ORDER BY cohort;
```

| cohort | new_buyers | repeat_90d | repeat_90d_pct |
|---|---|---|---|
| 2025-07 | 445 | 262 | 58.9 |
| 2025-08 | 329 | 193 | 58.7 |
| 2025-09 | 262 | 144 | 55 |
| 2025-10 | 240 | 109 | 45.4 |
| 2025-11 | 220 | 105 | 47.7 |
| 2025-12 | 204 | 93 | 45.6 |
| 2026-01 | 217 | 114 | 52.5 |
| 2026-02 | 189 | 76 | 40.2 |
| 2026-03 | 187 | 75 | 40.1 |

Có hai cái bẫy. Cohort tháng 7/2025 bị phóng đại vì dữ liệu *bắt đầu* từ tháng 7/2025, nên những khách trung thành đã mua từ nhiều tháng trước bị tính là "mới" (hiện tượng này gọi là **left-censoring** – bị cắt phía trái). Và các cohort sau tháng 3/2026 bị cắt bỏ vì chưa đủ 90 ngày. Xu hướng giảm từ khoảng 59% xuống khoảng 40% đáng để hỏi đội product, nhưng hãy kiểm tra cái bẫy thứ nhất trước khi khẳng định khách ít quay lại hơn.

## 9. Điều tra: tỷ lệ thanh toán thẻ thành công giảm vào tháng 5/2026

Đầu tháng 7, khi chuẩn bị báo cáo quý, trưởng bộ phận thanh toán hỏi: "Hồi tháng 5 có lúc thanh toán thẻ có vẻ tệ. Có gì trục trặc không, và mình mất bao nhiêu?" Dưới đây là cuộc điều tra, từng bước một.

### Bước 1: xem xu hướng theo tuần, không xem trung bình cả năm

Tính cả năm, tỷ lệ thành công của thẻ trên Android (89,1%) và trên iOS (89,7%) trông như nhau. Một sự cố kéo dài một tuần sẽ biến mất trong trung bình 12 tháng, nên ta xem theo tuần (tuần bắt đầu thứ Hai, giờ Việt Nam).

```sql
WITH card AS (
  SELECT date(created_at, '+7 hours', 'weekday 0', '-6 days') AS week_start,
         status
  FROM payments
  WHERE method = 'card'
    AND status <> 'pending'
)
SELECT week_start,
       COUNT(*) AS attempts,
       SUM(status IN ('success', 'refunded')) AS succeeded,
       ROUND(100.0 * SUM(status IN ('success', 'refunded')) / COUNT(*), 1) AS success_pct
FROM card
WHERE week_start BETWEEN '2026-04-13' AND '2026-06-22'
GROUP BY week_start
ORDER BY week_start;
```

| week_start | attempts | succeeded | success_pct |
|---|---|---|---|
| 2026-04-13 | 44 | 40 | 90.9 |
| 2026-04-20 | 48 | 44 | 91.7 |
| 2026-04-27 | 51 | 48 | 94.1 |
| 2026-05-04 | 57 | 50 | 87.7 |
| 2026-05-11 | 48 | 33 | 68.8 |
| 2026-05-18 | 56 | 51 | 91.1 |
| 2026-05-25 | 80 | 67 | 83.8 |
| 2026-06-01 | 56 | 54 | 96.4 |
| 2026-06-08 | 55 | 52 | 94.5 |
| 2026-06-15 | 63 | 61 | 96.8 |
| 2026-06-22 | 48 | 46 | 95.8 |

(`'weekday 0', '-6 days'` đẩy ngày tới Chủ nhật gần nhất, rồi lùi về thứ Hai của tuần đó.) Các tuần bình thường dao động khoảng 84% đến 97%: với khoảng 50 lần thử mỗi tuần, chỉ một giao dịch thất bại đã làm tỷ lệ lệch khoảng 2 điểm. Tuần **11/5** ở mức 68,8% nằm hẳn ngoài khoảng đó.

### Bước 2: chia theo thiết bị

```sql
SELECT device,
       CASE WHEN date(created_at, '+7 hours') BETWEEN '2026-05-11' AND '2026-05-17'
            THEN 'outage week' ELSE 'other weeks' END AS period,
       COUNT(*) AS attempts,
       ROUND(100.0 * SUM(status IN ('success', 'refunded')) / COUNT(*), 1) AS success_pct
FROM payments
WHERE method = 'card' AND status <> 'pending'
  AND date(created_at, '+7 hours') BETWEEN '2026-04-13' AND '2026-06-21'
GROUP BY device, period
ORDER BY device, period;
```

| device | period | attempts | success_pct |
|---|---|---|---|
| android | other weeks | 270 | 92.2 |
| android | outage week | 22 | 40.9 |
| ios | other weeks | 151 | 90.1 |
| ios | outage week | 13 | 92.3 |
| web | other weeks | 89 | 92.1 |
| web | outage week | 13 | 92.3 |

Mức giảm **chỉ xảy ra trên Android**. iOS và web bình thường. ("Other weeks" = 4 tuần trước và 5 tuần sau.)

### Bước 3: chia theo lý do thất bại

```sql
SELECT device, failure_reason, COUNT(*) AS failed
FROM payments
WHERE method = 'card' AND status = 'failed'
  AND date(created_at, '+7 hours') BETWEEN '2026-05-11' AND '2026-05-17'
GROUP BY device, failure_reason
ORDER BY failed DESC;
```

| device | failure_reason | failed |
|---|---|---|
| android | otp_timeout | 13 |
| ios | bank_declined | 1 |
| web | bank_declined | 1 |

Cả 13 lần thất bại trên Android đều là `otp_timeout`: khách không hoàn tất được bước OTP. Các phương thức khác trên Android tuần đó vẫn ổn: ví điện tử thất bại 2 trên 24 lần, QR 0 trên 22 (cùng query, nhóm theo `method, device`). Bằng chứng không ủng hộ giả thuyết "app Android bị lỗi" mà chỉ về đường gửi OTP (SMS).

### Bước 4: tìm đúng những ngày bị ảnh hưởng

```sql
SELECT date(created_at, '+7 hours') AS vn_day,
       COUNT(*) AS attempts,
       SUM(status = 'failed') AS failed,
       COUNT(CASE WHEN failure_reason = 'otp_timeout' THEN 1 END) AS otp_timeout
FROM payments
WHERE method = 'card' AND device = 'android' AND status <> 'pending'
  AND date(created_at, '+7 hours') BETWEEN '2026-05-09' AND '2026-05-19'
GROUP BY vn_day
ORDER BY vn_day;
```

| vn_day | attempts | failed | otp_timeout |
|---|---|---|---|
| 2026-05-09 | 5 | 2 | 1 |
| 2026-05-10 | 3 | 0 | 0 |
| 2026-05-11 | 2 | 1 | 1 |
| 2026-05-12 | 2 | 1 | 1 |
| 2026-05-13 | 3 | 2 | 2 |
| 2026-05-14 | 5 | 3 | 3 |
| 2026-05-16 | 4 | 2 | 2 |
| 2026-05-17 | 6 | 4 | 4 |
| 2026-05-18 | 5 | 0 | 0 |
| 2026-05-19 | 4 | 0 | 0 |

Sự cố bắt đầu ngày 11/5 và dừng ngày 18/5 (theo ngày Việt Nam). Không có dòng cho ngày 15/5: hôm đó không có lần thử thẻ nào trên Android. Thiếu dòng nghĩa là không có lần thử, chứ không phải không có thất bại. Cột OTP dùng `COUNT(CASE …)`, vì `SUM(failure_reason = 'otp_timeout')` sẽ trả về NULL vào ngày mà mọi `failure_reason` đều NULL.

### Bước 5: xác nhận bằng funnel

Đếm số phiên khác nhau có `submit_payment` và có `payment_success` trong `checkout_events`, với `device = 'android'` và `payment_method = 'card'`, chia theo hai giai đoạn như trên. Các tuần khác: 248 trên 270 phiên thành công (91,9%); tuần sự cố: 9 trên 22 (40,9%). Hai nguồn dữ liệu độc lập cho cùng một kết luận. (Bảng payments ghi 249 lần thành công ở các tuần khác, vì có một phiên bị trừ tiền hai lần.)

### Bước 6: ước lượng thiệt hại

```sql
WITH android_card AS (
  SELECT date(created_at, '+7 hours') AS vn_day, status, amount
  FROM payments
  WHERE method = 'card' AND device = 'android' AND status <> 'pending'
    AND date(created_at, '+7 hours') BETWEEN '2026-04-13' AND '2026-06-21'
),
baseline AS (
  -- success rate in the 4 weeks before and the 5 weeks after the outage week
  SELECT 1.0 * SUM(status IN ('success', 'refunded')) / COUNT(*) AS rate
  FROM android_card
  WHERE vn_day NOT BETWEEN '2026-05-11' AND '2026-05-17'
),
outage AS (
  SELECT COUNT(*) AS attempts,
         SUM(status IN ('success', 'refunded')) AS succeeded,
         AVG(amount) AS avg_amount
  FROM android_card
  WHERE vn_day BETWEEN '2026-05-11' AND '2026-05-17'
)
SELECT o.attempts,
       o.succeeded,
       ROUND(100 * b.rate, 1) AS baseline_pct,
       ROUND(o.attempts * b.rate, 1) AS expected_succeeded,
       ROUND(o.attempts * b.rate - o.succeeded, 1) AS lost_payments,
       ROUND(o.avg_amount) AS avg_amount,
       ROUND((o.attempts * b.rate - o.succeeded) * o.avg_amount) AS lost_gmv
FROM outage o, baseline b;
```

| attempts | succeeded | baseline_pct | expected_succeeded | lost_payments | avg_amount | lost_gmv |
|---|---|---|---|---|---|---|
| 22 | 9 | 92.2 | 20.3 | 11.3 | 677318 | 7646170 |

Với tỷ lệ bình thường 92,2%, lẽ ra có khoảng 20 lần thành công, nhưng thực tế chỉ có 9. Vậy mất khoảng **11 giao dịch** và khoảng **7,6 triệu đồng GMV** trong mẫu dữ liệu này. Với take rate khoảng 1,5%, phần phí mất chỉ khoảng 115.000 đồng. Thiệt hại lớn hơn là niềm tin: không ai trong 13 khách gặp `otp_timeout` thanh toán thành công trong 24 giờ sau đó (kiểm tra bằng self-join theo `customer_id`), nên đây là đơn hàng mất hẳn chứ không phải chỉ bị trễ.

### Bước 7: viết kết luận

> **Sự cố thanh toán thẻ, 11–17/5/2026 (giờ Việt Nam).** Tỷ lệ thanh toán thẻ thành công trên Android giảm từ khoảng 92% xuống 41% trong một tuần; iOS, web và các phương thức khác bình thường. Toàn bộ phần thất bại tăng thêm là `otp_timeout`, chỉ về khâu gửi OTP (SMS) chứ không phải app của mình. Mất khoảng 11 giao dịch và khoảng 7,6 triệu đồng GMV trong bộ dữ liệu này, và khách bị ảnh hưởng không quay lại trong vòng một ngày. **Đề xuất:** xác nhận mốc thời gian với nhà cung cấp OTP/SMS; thêm cảnh báo hằng ngày cho tỷ lệ thành công của thẻ theo thiết bị; khi gặp `otp_timeout`, cho phương án dự phòng ngay trong app (gửi lại mã, hoặc chuyển sang ví/QR).

> **Góc BA:** biến phát hiện thành yêu cầu: "Cảnh báo khi tỷ lệ thành công của thẻ trên Android trong 2 giờ gần nhất thấp hơn trung bình 4 tuần quá 10 điểm, với tối thiểu 30 lần thử" (ngưỡng số lần thử tối thiểu giúp cảnh báo không kêu vì nhiễu), kèm một user story cho phương án dự phòng OTP với acceptance criteria kiểm thử được.

## 10. Bài tập thực hành

### Bài 1 — Đọc bảng tỷ lệ thành công

Giao dịch thẻ của một ngân hàng hôm qua: success 1.840, refunded 60, failed 180, pending 20. Tỷ lệ thành công là bao nhiêu?

**Đáp án:** refunded tính là thành công, pending loại ra: (1.840 + 60) ÷ (1.840 + 60 + 180) = 1.900 ÷ 2.080 ≈ **91,3%**. Báo cáo riêng 20 giao dịch pending; nếu chúng pending nhiều ngày thì đó là giao dịch bị kẹt.

### Bài 2 — Tính tay một ngày của người bán

Một shop điện tử (MDR 1,6%) hôm qua có 4 giao dịch thành công: 2.000.000, 3.500.000, 1.500.000 và 3.000.000 đồng. Tính GMV, AOV, doanh thu MDR của nền tảng và số tiền quyết toán cho shop (không có hoàn tiền).

**Đáp án:** GMV = 10.000.000 đồng; AOV = 10.000.000 ÷ 4 = 2.500.000 đồng; doanh thu MDR = 1,6% × 10.000.000 = 160.000 đồng; quyết toán = 10.000.000 − 160.000 = **9.840.000 đồng**.

### Bài 3 — Vì sao thanh toán bằng ví thất bại?

Viết SQL cho cơ cấu lý do thất bại của các giao dịch ví điện tử.

**Đáp án:**

```sql
SELECT failure_reason,
       COUNT(*) AS failed,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM payments
WHERE method = 'e_wallet' AND status = 'failed'
GROUP BY failure_reason
ORDER BY failed DESC;
```

`insufficient_funds` chiếm 122 trên 167 lần thất bại (73,1%), tiếp theo là `network_error` 29 lần (17,4%). Cách sửa nằm ở product: một luồng "nạp tiền và thanh toán" thật mượt, chứ không phải đi làm việc với ngân hàng.

### Bài 4 — Ví hoạt động trong tháng 6

Có bao nhiêu ví hoạt động trong tháng 6/2026 (giờ Việt Nam), và chiếm tỷ lệ bao nhiêu trên tổng nào?

**Đáp án:**

```sql
SELECT COUNT(DISTINCT wallet_id) AS active_june
FROM wallet_transactions
WHERE status = 'success'
  AND txn_type NOT IN ('cashback', 'refund')
  AND date(created_at, '+7 hours') BETWEEN '2026-06-01' AND '2026-06-30';
```

1.294 ví. Cả 2.235 ví đều đã mở trước 30/6, nên tỷ lệ ví hoạt động khoảng **58%**. Đừng lọc `wallets.status = 'active'`: 20 ví có hoạt động trong tháng 6 hiện mang status `closed` trong snapshot, vì status là "tính đến hôm nay", không phải "tính đến tháng 6".

### Bài 5 — Tìm lỗi

Một đồng nghiệp báo "tỷ lệ thanh toán thành công 89,3%" từ query:

```sql
SELECT ROUND(100.0 * SUM(status = 'success') / COUNT(*), 1) AS success_rate
FROM payments;
```

**Đáp án:** có hai lỗi. Query coi giao dịch `refunded` là thất bại (thực ra chúng đã thành công trước), và đưa `pending` (chưa có kết quả) vào mẫu số. Dùng `SUM(status IN ('success', 'refunded'))` và `WHERE status <> 'pending'`: tỷ lệ thành 91,8%.

### Bài 6 — Một biểu đồ đáng ngờ

Trên biểu đồ GMV theo ngày, ngày cao nhất là 23/8/2025, và team marketing nói chiến dịch hôm đó thành công. Bạn kiểm tra gì?

**Đáp án:** xem số giao dịch và các đơn lớn nhất, đừng chỉ nhìn tổng. Hôm đó chỉ có 18 giao dịch thành công, thấp hơn mức trung bình khoảng 19/ngày; một đơn điện tử 17,26 triệu đồng tạo ra cái đỉnh. GMV theo ngày rất nhiễu vì các đơn giá trị lớn. Hãy xem số giao dịch và giá trị đơn trung vị, hoặc loại outlier, trước khi ghi công cho chiến dịch.

### Bài 7 — "Rollback bản Android đi!"

Trong tuần 11/5, một product manager thấy thanh toán trên Android thất bại nhiều và muốn rollback bản app Android mới nhất. Bạn cho họ xem gì?

**Đáp án:** bảng phương thức × thiết bị của tuần sự cố. Trên Android, thẻ thất bại 13 trên 22 lần thử, toàn bộ là `otp_timeout`, trong khi ví điện tử 2 trên 24 và QR 0 trên 22. Nếu chính app bị lỗi thì mọi phương thức đều bị ảnh hưởng. Bằng chứng chỉ về bước OTP của thẻ, nên việc đầu tiên là gọi nhà cung cấp OTP/SMS, chưa phải rollback.

## 11. Tóm tắt

- **GMV** là giá trị hàng hóa bán qua nền tảng; **TPV** là toàn bộ khối lượng thanh toán đã xử lý; cả hai đều không phải doanh thu. AOV = GMV ÷ số giao dịch thành công; hãy báo cả trung vị, vì số tiền bị lệch.
- **Tỷ lệ thanh toán thành công**: refunded tính là thành công, pending loại ra. Ghi rõ quy tắc này vào report spec.
- Lý do bị từ chối cho biết **ai sửa được**: khách hàng, issuer, OTP/3-D Secure, mạng hay đội rủi ro.
- Funnel đếm **số phiên khác nhau**; bước submit → success là chỗ rò tốn kém nhất.
- Refund do người bán thực hiện; chargeback là tranh chấp của chủ thẻ qua tổ chức thẻ (fintech.db không có bảng này).
- Doanh thu = phí MDR; take rate = phí ÷ GMV (ở đây khoảng 1,48%); doanh thu thuần còn phải trừ chi phí.
- KPI ví: ví hoạt động (lấy từ giao dịch, không lấy từ status), cash-in, cash-out, tỷ lệ nạp tiền thành công, float.
- Luôn chia theo giờ Việt Nam. Trung bình cả năm có thể che một sự cố một tuần: xem theo tuần, rồi chia theo thiết bị và lý do, rồi ước lượng thiệt hại.

**Thuật ngữ chính**

| Thuật ngữ | Nghĩa dễ hiểu |
|---|---|
| GMV | Giá trị hàng hóa bán qua nền tảng, trước hoàn tiền |
| TPV | Tổng giá trị các khoản thanh toán đã xử lý |
| AOV | Giá trị trung bình của một đơn thành công |
| Success (authorization) rate | Số lần thành công ÷ số lần thử đã có kết quả |
| Decline | Issuer hoặc hệ thống từ chối giao dịch |
| 3-D Secure / OTP | Bước kiểm tra thêm để chắc đúng chủ thẻ đang trả tiền |
| Funnel | Các bước khách đi qua, đếm theo phiên |
| Refund | Người bán trả lại tiền |
| Chargeback | Chủ thẻ khiếu nại giao dịch qua ngân hàng của mình |
| MDR | Phần trăm phí người bán trả trên mỗi giao dịch |
| Take rate | Doanh thu nền tảng ÷ GMV |
| Settlement | Trả cho người bán số tiền họ được hưởng, trừ phí |
| Cash-in / cash-out | Tiền đi vào / đi ra khỏi hệ thống ví |
| Cohort | Nhóm khách gom theo thời điểm bắt đầu |

Bài tiếp theo: **Dashboard, KPI và một case study trọn vẹn**, biến các chỉ số này thành thẻ KPI, dashboard và cảnh báo, rồi đi hết một cuộc điều tra về cho vay.
