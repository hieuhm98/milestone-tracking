# Phân tích mô tả: Mô tả dữ liệu bằng con số

## 1. Mô tả trước, giải thích sau

Sếp chuyển cho bạn câu hỏi từ team thanh toán: "Checkout của mình đang ổn không?" Trước khi ai đó trả lời được *vì sao*, phải có người nói rõ *chuyện gì đang xảy ra*: bao nhiêu giao dịch, bao nhiêu tiền, một giao dịch điển hình trông thế nào, nhóm nào khác nhóm nào, xu hướng ra sao. Việc đó gọi là **phân tích mô tả** (**descriptive analysis**): tóm tắt dữ liệu bằng vài con số trung thực.

```text
  4. Prescriptive   "Nên làm gì?"                    -> khuyến nghị
  3. Predictive     "Sắp tới sẽ ra sao?"             -> dự báo
  2. Diagnostic     "Vì sao lại như vậy?"            -> điều tra nguyên nhân
  1. Descriptive    "Chuyện gì đã xảy ra? Bao nhiêu?" -> đếm, tổng, tỷ lệ, xu hướng
     ^ bài này: mọi bậc phía trên đều đứng trên bậc này
```

Phần lớn câu hỏi mà một BA hay data analyst mới vào nghề nhận được ở ngân hàng, công ty cho vay hay ví điện tử đều nằm ở bậc 1, và một con số sai ở bậc 1 làm hỏng mọi thứ phía trên. Sáu câu hỏi nên đặt cho bất kỳ bảng dữ liệu nào:

| Câu hỏi | Công cụ |
|---|---|
| Bao nhiêu cái? | `COUNT(*)`, `COUNT(DISTINCT …)`, COUNTIFS |
| Bao nhiêu tiền? | `SUM`, SUMIFS |
| Giá trị điển hình là bao nhiêu? | trung bình (`AVG`), **trung vị** (median) |
| Dữ liệu trải rộng thế nào? | min, max, **phân vị** (percentile), histogram |
| Nhóm nào khác nhóm nào? | **phân khúc** (segmentation): `GROUP BY`, pivot table |
| Đang thay đổi ra sao? | tăng trưởng **MoM** (so với tháng trước), **YoY** (so với cùng kỳ năm trước) |

Ta dùng database VayNhanh (ngày chốt số liệu 2026-06-30, số tiền tính bằng VND, thời gian lưu theo UTC). Mọi câu query đều chạy được ở [SQL Practice → Fintech](/practice/sql?db=fintech).

---

## 2. Đếm và cộng: bao nhiêu cái, bao nhiêu tiền

Một dòng trong bảng `loans` là một khoản vay đã giải ngân.

```sql
SELECT COUNT(*) AS loans, COUNT(DISTINCT customer_id) AS customers,
       SUM(principal) AS total_principal, ROUND(AVG(principal)) AS avg_principal
FROM loans;
```

| loans | customers | total_principal | avg_principal |
|---|---|---|---|
| 3106 | 2108 | 34040900000 | 10959723 |

VayNhanh đã **giải ngân** (disburse, tức chuyển tiền vay cho khách) 3.106 khoản vay cho 2.108 khách, tổng khoảng 34,0 tỷ VND. **Giá trị trung bình** (**mean**: tổng ÷ số lượng, chính là "trung bình" quen thuộc) khoảng 11,0 triệu VND mỗi khoản.

- **`COUNT(*)` khác `COUNT(DISTINCT customer_id)`**: có khách vay nhiều lần, nên "bao nhiêu khoản vay?" và "bao nhiêu người vay?" cho hai đáp án khác nhau. Hãy nói rõ bạn đang đếm cái gì.
- **`COUNT(cột)` và `AVG` bỏ qua NULL**, và chỉ một giá trị sai cũng kéo trung bình đi rất xa:

```sql
SELECT COUNT(*) AS customers, COUNT(monthly_income) AS with_income,
       ROUND(AVG(monthly_income)) AS avg_income,
       ROUND(AVG(CASE WHEN monthly_income < 999999999 THEN monthly_income END)) AS avg_without_typos
FROM customers;
```

| customers | with_income | avg_income | avg_without_typos |
|---|---|---|---|
| 4000 | 3768 | 17069878 | 16286667 |

232 khách bỏ trống thu nhập và `AVG` lặng lẽ loại họ ra. Ba dòng gõ nhầm 999.999.999 mà bạn đã gặp ở bài chất lượng dữ liệu đẩy trung bình lên gần 0,8 triệu VND.

Với giao dịch thanh toán, ta coi một payment là "đã đi qua" khi status là `success` hoặc `refunded`: tiền đã chuyển, dù sau đó có thể được hoàn lại.

```sql
SELECT COUNT(*) AS payments, SUM(amount) AS gross_value,
       ROUND(AVG(amount)) AS avg_amount, MIN(amount) AS min_amount, MAX(amount) AS max_amount
FROM payments
WHERE status IN ('success', 'refunded');
```

| payments | gross_value | avg_amount | min_amount | max_amount |
|---|---|---|---|---|
| 6991 | 5124819000 | 733060 | 34000 | 22630000 |

> **Hiểu lầm thường gặp:** "Tổng là tổng thôi." Một con số tổng chỉ có nghĩa khi đi kèm điều kiện lọc. Bỏ dòng `WHERE` đi, bạn sẽ được 7.630 dòng, gồm cả các lần thanh toán thất bại và đang chờ, tức là tiền chưa hề chuyển. Mỗi con số bạn báo cáo nên kèm định nghĩa của nó: dòng nào, status nào, khoảng ngày nào.

---

## 3. Giá trị điển hình: trung vị, phân vị và độ lệch

733.000 VND có phải là số tiền một khách điển hình trả không? Hãy kiểm tra **trung vị** (**median**): sắp xếp các giá trị rồi lấy giá trị ở giữa; một nửa nhỏ hơn, một nửa lớn hơn. SQLite không có hàm `MEDIAN()`. Bạn có thể sắp xếp rồi nhảy tới dòng giữa (`ORDER BY amount LIMIT 1 OFFSET (n - 1) / 2`), nhưng cách đánh số dòng xử lý được cả trường hợp số dòng chẵn:

```sql
WITH ranked AS (
  SELECT amount, ROW_NUMBER() OVER (ORDER BY amount) AS rn, COUNT(*) OVER () AS n
  FROM payments
  WHERE status IN ('success', 'refunded')
)
SELECT AVG(amount) AS median_amount
FROM ranked
WHERE rn IN ((n + 1) / 2, (n + 2) / 2);
```

Kết quả: **334000**. Khi số dòng chẵn, `(n + 1) / 2` và `(n + 2) / 2` (chia lấy phần nguyên) là hai dòng ở giữa và `AVG` lấy điểm giữa của chúng, giống hàm MEDIAN của Excel; khi số dòng lẻ, hai biểu thức cùng trỏ vào một dòng.

Trung bình (733.060) lớn hơn **gấp đôi** trung vị. Khoảng cách đó là dấu hiệu của một phân phối **lệch** (**skewed**): đa số giao dịch nhỏ, và một "cái đuôi" dài gồm các giao dịch lớn (laptop, vé máy bay, học phí) kéo trung bình lên.

### Phân vị

**Phân vị** (**percentile**) cho biết "p% giá trị nhỏ hơn hoặc bằng số này". P50 chính là trung vị; P25 và P75 là các **tứ phân vị** (**quartiles**).

```sql
WITH ranked AS (
  SELECT amount, ROW_NUMBER() OVER (ORDER BY amount) AS rn, COUNT(*) OVER () AS n
  FROM payments
  WHERE status IN ('success', 'refunded')
)
SELECT MIN(CASE WHEN rn >= 0.10 * n THEN amount END) AS p10,
       MIN(CASE WHEN rn >= 0.25 * n THEN amount END) AS p25,
       MIN(CASE WHEN rn >= 0.50 * n THEN amount END) AS p50,
       MIN(CASE WHEN rn >= 0.75 * n THEN amount END) AS p75,
       MIN(CASE WHEN rn >= 0.90 * n THEN amount END) AS p90,
       MIN(CASE WHEN rn >= 0.99 * n THEN amount END) AS p99
FROM ranked;
```

| p10 | p25 | p50 | p75 | p90 | p99 |
|---|---|---|---|---|---|
| 101000 | 167000 | 334000 | 747000 | 1731000 | 6000000 |

Đây là phương pháp **nearest-rank** (hạng gần nhất): giá trị nhỏ nhất mà có ít nhất p% số dòng nhỏ hơn hoặc bằng nó. Excel thì nội suy (xem mục 8). Cách đọc: một nửa số giao dịch ở giữa nằm trong khoảng 167.000 đến 747.000 VND; trung bình gần chạm P75, nên chỉ khoảng một phần tư số giao dịch cao hơn "mức trung bình"; nhóm 1% lớn nhất bắt đầu từ 6 triệu.

### Histogram

**Histogram** đếm số giá trị rơi vào từng khoảng (**bucket**): `CASE WHEN amount < 100000 THEN '1. < 100k' WHEN amount < 250000 THEN … END AS amount_band`, rồi `GROUP BY amount_band`, và `ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1)` để ra tỷ trọng.

```text
amount band    payments   share
< 100k            664     9.5%  #########
100k-250k        2064    29.5%  ##############################
250k-500k        1754    25.1%  #########################
500k-1M          1224    17.5%  #################
1M-2M             703    10.1%  ##########
2M-5M             474     6.8%  #######
5M+               108     1.5%  ##
                    ^ median (334k)       ^ mean (733k) nằm tận đây
```

Phần lớn dồn bên trái, đuôi dài kéo sang phải: **lệch phải** (**right-skewed**). Dữ liệu tiền trong fintech gần như luôn như vậy: khoản vay (gốc trung bình khoảng 11,0 triệu, trung vị 8,0 triệu: chạy cùng câu query trung vị trên `loans.principal`), giao dịch, số dư, thu nhập. Và cái đuôi mang phần lớn tiền: 10% giao dịch lớn nhất (699 dòng) chiếm **48,3%** tổng giá trị thanh toán (sắp xếp theo `amount DESC`, `LIMIT` một phần mười số dòng, rồi chia tổng của chúng cho tổng chung).

| Câu hỏi | Nên báo cáo | Vì sao |
|---|---|---|
| Một khách điển hình trả, vay, kiếm bao nhiêu? | **trung vị** | Không bị đuôi hay lỗi gõ kéo lệch: trung vị thu nhập là 14,6 triệu dù có hay không có ba dòng gõ nhầm |
| Tổng cộng bao nhiêu tiền? | **tổng**, **trung bình** | Trung bình × số lượng = tổng, thứ mà team tài chính cần |
| Rủi ro, chênh lệch tới đâu? | **P90, P99, max** | Gian lận, hạn mức và các khoản lỗ lớn nằm ở đuôi |

> **Hiểu lầm thường gặp:** "Trung bình là giá trị điển hình." Chỉ đúng khi dữ liệu gần cân đối. Với dữ liệu tiền bị lệch, trung bình cao hơn mức mà đa số khách thực sự chi. Hãy báo cáo trung vị bên cạnh và nói rõ bạn dùng số nào.

---

## 4. Phân khúc: tách tổng thành từng nhóm

**Phân khúc** (**segmentation**) là chia dữ liệu theo một thuộc tính (sản phẩm, kênh, ngành hàng của merchant, phương thức thanh toán, thiết bị, thành phố) rồi mô tả từng nhóm: `GROUP BY` trong SQL, pivot table trong Excel. Chạy lại câu query khoản vay ở mục 2 với `GROUP BY product`: BNPL (**buy now, pay later**, mua trước trả sau) có 1.397 khoản, trung bình khoảng 4,6 triệu VND; vay tiền mặt (cash loan) có 1.709 khoản, trung bình khoảng 16,1 triệu, và chiếm khoảng 81% tổng tiền gốc đã giải ngân. Trung vị (thêm `PARTITION BY product` vào cả hai window function của câu query trung vị, rồi `SELECT product, …` kèm `GROUP BY product`) là 4,0 và 13,5 triệu. Một con số "khoản vay trung bình 11 triệu" của cả công ty không mô tả đúng sản phẩm nào.

Giao dịch theo ngành hàng merchant, kèm **tỷ trọng** (share) của từng nhóm:

```sql
SELECT m.category,
       COUNT(*) AS payments,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct_of_payments,
       SUM(p.amount) AS gross_value,
       ROUND(100.0 * SUM(p.amount) / SUM(SUM(p.amount)) OVER (), 1) AS pct_of_value
FROM payments p
JOIN merchants m ON m.merchant_id = p.merchant_id
WHERE p.status IN ('success', 'refunded')
GROUP BY m.category
ORDER BY gross_value DESC;
```

| category | payments | pct_of_payments | gross_value | pct_of_value |
|---|---|---|---|---|
| electronics | 613 | 8.8 | 2001624000 | 39.1 |
| education | 579 | 8.3 | 734311000 | 14.3 |
| fashion | 1152 | 16.5 | 627992000 | 12.3 |
| travel | 391 | 5.6 | 624763000 | 12.2 |
| grocery | 1493 | 21.4 | 494726000 | 9.7 |
| utilities | 919 | 13.1 | 395737000 | 7.7 |
| food_delivery | 1844 | 26.4 | 245666000 | 4.8 |

Có hai "ngành lớn nhất" khác nhau: giao đồ ăn lớn nhất theo **số lượng** (26,4% số giao dịch), điện tử lớn nhất theo **giá trị** (39,1% số tiền chỉ từ 8,8% số giao dịch). Team chăm sóc khách hàng quan tâm số lượng; team tài chính quan tâm giá trị. Trung vị số tiền dao động từ 120.000 VND (giao đồ ăn) đến 2.442.000 VND (điện tử), nên một luật chống gian lận "gắn cờ mọi giao dịch trên 2 triệu" sẽ dính 63% đơn điện tử và không một đơn đồ ăn nào.

Thói quen tốt:

1. Chọn phân khúc mà ai đó có thể hành động được, và **luôn ghi số lượng bên cạnh mọi tỷ lệ hay trung bình**: một nhóm chỉ có 12 dòng có thể cho ra bất kỳ con số nào do ngẫu nhiên.
2. **Làm sạch thuộc tính trước**: cột `city` thô tách TP. Hồ Chí Minh thành "HCMC", "TP.HCM" và nhiều biến thể khác (bài chất lượng dữ liệu).
3. **Kiểm tra các phần cộng lại bằng tổng** (ở đây là 6.991 giao dịch và 5.124.819.000 VND).

> **Góc BA:** khi stakeholder yêu cầu "báo cáo theo thành phố", hãy ghi định nghĩa phân khúc vào requirement: dùng cột nào, các cách viết khác nhau được gộp ra sao, dòng trống đi đâu (dòng "Không rõ"), và các dòng phải cộng lại bằng tổng toàn công ty. Chỉ một acceptance criterion đó đã chặn được phần lớn các cuộc cãi nhau kiểu "số không khớp".

---

## 5. Tỷ lệ và số đếm: chọn mẫu số

**Số đếm** (count) cho biết bao nhiêu; **tỷ lệ** (rate) cho biết bao nhiêu *trên tổng bao nhiêu*. Phần dưới của phân số, tức **mẫu số** (**denominator**), quyết định tỷ lệ đó mang ý nghĩa gì.

```sql
SELECT m.category,
       SUM(p.status IN ('success', 'refunded')) AS paid,
       SUM(p.status = 'refunded') AS refunded,
       ROUND(100.0 * SUM(p.status = 'refunded') / SUM(p.status IN ('success', 'refunded')), 1) AS refund_rate_pct
FROM payments p
JOIN merchants m ON m.merchant_id = p.merchant_id
GROUP BY m.category
ORDER BY refund_rate_pct DESC;
```

| category | paid | refunded | refund_rate_pct |
|---|---|---|---|
| fashion | 1152 | 83 | 7.2 |
| electronics | 613 | 26 | 4.2 |
| education | 579 | 9 | 1.6 |
| grocery | 1493 | 23 | 1.5 |
| food_delivery | 1844 | 21 | 1.1 |
| utilities | 919 | 9 | 1 |
| travel | 391 | 4 | 1 |

Điện tử (26 lần hoàn tiền) và tạp hóa (23 lần) trông giống nhau nếu chỉ đếm, nhưng điện tử hoàn tiền 4,2% số giao dịch còn tạp hóa 1,5%: tỷ lệ gần gấp ba. Thời trang nổi bật với 7,2% (sai size, sai màu).

Hai mẹo SQLite: `SUM(status = 'refunded')` đếm được số dòng thỏa điều kiện vì phép so sánh trả về 1 hoặc 0, và `100.0 *` buộc phép chia ra số thập phân. Thiếu `.0`, SQLite chia số nguyên và trả về 0.

### Cùng một sự kiện, khác mẫu số

Toàn công ty, 175 lần hoàn tiền ÷ toàn bộ 7.630 dòng payment = 2,29%, nhưng ÷ 6.991 giao dịch đã đi qua = 2,50%. Một giao dịch thất bại không thể được hoàn tiền, nên nó không thuộc về mẫu số. Quy tắc: **mẫu số là tất cả những ai *có thể* gặp kết quả đó.**

**Tỷ lệ thanh toán thành công** (payment success rate) cũng có lựa chọn tương tự. Các status là `success`, `refunded` (thành công rồi được hoàn sau), `failed` và `pending` (chưa có kết quả cuối):

```sql
SELECT method,
       COUNT(*) AS attempts,
       ROUND(100.0 * SUM(status = 'success') / COUNT(*), 1) AS naive_pct,
       ROUND(100.0 * SUM(status IN ('success', 'refunded')) / SUM(status <> 'pending'), 1) AS success_rate_pct
FROM payments
GROUP BY method
ORDER BY attempts DESC;
```

| method | attempts | naive_pct | success_rate_pct |
|---|---|---|---|
| card | 2855 | 86.5 | 89.3 |
| e_wallet | 1770 | 87.9 | 90.5 |
| qr_code | 1563 | 92.8 | 94.9 |
| bank_transfer | 1026 | 93 | 95 |
| bnpl | 416 | 92.3 | 95.4 |

Cách tính ngây thơ (naive) coi giao dịch đã hoàn tiền là thất bại (thực ra không phải) và coi giao dịch pending là thất bại khi chúng chưa xong. Toàn công ty: 89,3% so với 91,8%, chênh lệch hoàn toàn do định nghĩa.

Với bất kỳ tỷ lệ nào, hãy hỏi: **tính trên cái gì?** (lần thử, phiên checkout, khách hàng: một khách thử lại ba lần là 3 lần thử nhưng chỉ 1 khách), **ai bị loại ra và vì sao?** (pending, giao dịch test, bản ghi trùng), và **kỳ đó đã kết thúc chưa?** (hoàn tiền đến sau vài ngày, nên tỷ lệ hoàn tiền của tuần này luôn trông thấp hơn thực tế).

> **Tự làm thử:** chạy câu query tỷ lệ thành công với `GROUP BY device`. Kiểm tra cột `attempts` cộng lại bằng 7.630.

> **Góc BA:** một KPI không ghi rõ mẫu số là một cuộc tranh cãi trong tương lai. Trong report spec, hãy viết mỗi tỷ lệ dưới dạng tử số / mẫu số, bộ lọc, kỳ: "Payment success rate = số payment có status success hoặc refunded / số payment đã có status cuối, theo ngày tạo tính giờ Việt Nam".

---

## 6. Phần trăm và điểm phần trăm, tăng trưởng

### % và pp

Tỷ lệ thành công của thẻ là 89,3%, của QR là 94,9%. QR tốt hơn bao nhiêu?

- **Điểm phần trăm** (**percentage points**, **pp**), hiệu số đơn thuần: 94,9 − 89,3 = **5,6 pp**.
- **% tương đối**, phần chênh lệch so với giá trị ban đầu: 5,6 ÷ 89,3 ≈ **cao hơn 6,3%**.
- Nhìn từ phía thất bại: thẻ thất bại 10,7% số lần, QR 5,1%, tức thẻ thất bại nhiều **gấp khoảng 2,1 lần**.

Cả ba đều đúng; còn câu "QR tốt hơn 5,6%" thì sai. Dùng "pp" cho khoảng cách giữa hai tỷ lệ và "%" cho thay đổi tương đối.

### Tăng trưởng: MoM, QoQ, YoY

**Tốc độ tăng trưởng** (growth rate) = (kỳ này − kỳ trước) ÷ kỳ trước. Giá trị thanh toán theo tháng giờ Việt Nam (`'+7 hours'`); `LAG` lấy giá trị của dòng trước (bài da-05 sẽ giải thích kỹ):

```sql
WITH monthly AS (
  SELECT strftime('%Y-%m', created_at, '+7 hours') AS month_vn, SUM(amount) AS gross_value
  FROM payments
  WHERE status IN ('success', 'refunded')
  GROUP BY month_vn
)
SELECT month_vn, gross_value,
       ROUND(100.0 * (gross_value - LAG(gross_value) OVER (ORDER BY month_vn))
             / LAG(gross_value) OVER (ORDER BY month_vn), 1) AS mom_pct
FROM monthly
ORDER BY month_vn;
```

| month_vn | giá trị (triệu VND) | mom_pct |
|---|---|---|
| 2025-07 | 326,7 | NULL |
| 2025-08 | 419,6 | 28.4 |
| 2025-09 | 353,6 | -15.7 |
| 2025-10 | 440,2 | 24.5 |
| 2025-11 | 436,7 | -0.8 |
| 2025-12 | 388,7 | -11 |
| 2026-01 | 474,2 | 22 |
| 2026-02 | 432,3 | -8.8 |
| 2026-03 | 450,4 | 4.2 |
| 2026-04 | 444,0 | -1.4 |
| 2026-05 | 465,2 | 4.8 |
| 2026-06 | 493,2 | 6 |

MoM dao động từ +28% đến −16%. Với 500–650 giao dịch mỗi tháng và một cái đuôi dài bên phải, vài đơn điện tử tiền triệu cũng đủ làm lệch cả tháng. Hãy nhìn rộng ra trước khi gọi bất cứ thứ gì là xu hướng: Quý 2/2026 đạt 1.402.411.000 VND so với 1.356.926.000 của Quý 1, tức khoảng **+3,4% QoQ**. Các tháng cũng dài ngắn khác nhau (tháng Hai ngắn, và Tết 2026 rơi vào tháng Hai).

### YoY và hiệu ứng nền thấp

Số lần nạp ví thành công (`txn_type = 'top_up'`) và số ví đã mở tính đến cuối tháng (`SUM(opened_date <= '2025-06-30')` trên bảng `wallets`):

| tháng (giờ VN) | số lần nạp | giá trị nạp (VND) | số ví đã mở |
|---|---|---|---|
| 2025-06 | 447 | 268.800.000 | 708 |
| 2026-06 | 1.413 | 861.160.000 | 2.235 |

Giá trị nạp ví tăng khoảng **+220% YoY** (gấp 3,2 lần). Khách hàng có yêu ví hơn không? Tính trên mỗi ví: 447 ÷ 708 ≈ 0,63 lần nạp vào tháng 6/2025, 1.413 ÷ 2.235 ≈ 0,63 vào tháng 6/2026. Mức dùng trên mỗi ví đi ngang; tăng trưởng đến từ việc có thêm ví. Cả hai nhận định đều đúng và dẫn tới những quyết định khác nhau.

Cẩn thận với **hiệu ứng nền thấp** (**base effect**): xuất phát từ một con số rất nhỏ thì tăng trưởng trông rất lớn. Số lần nạp ví đi từ 16 vào tháng 10/2024 (tháng đầu tiên có ví) lên 47 vào tháng 11, một mức "+194%" gần như chẳng nói lên điều gì.

> **Hiểu lầm thường gặp:** "Giá trị tháng 6 tăng 6%, vậy là tính năng mới hiệu quả." Một tháng thay đổi trong một chuỗi số nhiễu không phải là bằng chứng. Hãy so các khoảng thời gian dài hơn, so với cùng tháng năm trước, và kiểm tra xem khối lượng đằng sau có thay đổi không.

---

## 7. Nghịch lý Simpson và tương quan khác nhân quả

### Nghịch lý Simpson

Con số tổng có thể chỉ về một hướng trong khi **mọi** nhóm con lại chỉ về hướng ngược lại. Số liệu dưới đây là số giả định để minh họa. Một team thanh toán so sánh hai cổng thanh toán thẻ (gateway):

| Loại thẻ | Gateway A | Gateway B |
|---|---|---|
| Thẻ nội địa | 950 / 1.000 = 95,0% | 288 / 300 = 96,0% |
| Thẻ quốc tế | 60 / 100 = 60,0% | 560 / 900 = 62,2% |
| **Tất cả thẻ** | **1.010 / 1.100 = 91,8%** | **848 / 1.200 = 70,7%** |

B tốt hơn ở thẻ nội địa *và* thẻ quốc tế, nhưng lại thua đậm ở con số tổng, vì **cơ cấu** (mix): B nhận chủ yếu thẻ quốc tế, loại thẻ thất bại nhiều ở bất kỳ cổng nào. Chuyển traffic sang A "vì A có tỷ lệ thành công cao hơn" là một sai lầm. Bất cứ khi nào so sánh con số tổng của hai nhóm, hãy hỏi "cơ cấu có giống nhau không?" và tách so sánh theo yếu tố chính (loại thẻ, sản phẩm, khoảng số tiền, thời gian sử dụng).

### Tương quan không phải nhân quả

Hai thứ **tương quan** (**correlated**) khi chúng cùng thay đổi theo nhau; điều đó không có nghĩa thứ này *gây ra* thứ kia. Ví dụ thật: ví nào được nhận cashback thì có thanh toán bằng ví nhiều hơn không?

```sql
WITH cb AS (
  SELECT w.wallet_id,
         CASE WHEN w.opened_date < '2025-10-01' THEN 'a. opened before Oct 2025'
              ELSE 'b. opened Oct 2025 or later' END AS tenure,
         SUM(t.txn_type = 'cashback') AS cashbacks,
         SUM(t.txn_type = 'payment' AND t.status = 'success') AS wallet_payments
  FROM wallets w
  JOIN wallet_transactions t ON t.wallet_id = w.wallet_id
  GROUP BY w.wallet_id
)
SELECT tenure,
       CASE WHEN cashbacks > 0 THEN 'got cashback' ELSE 'no cashback' END AS grp,
       COUNT(*) AS wallets,
       ROUND(AVG(wallet_payments), 2) AS avg_wallet_payments
FROM cb
GROUP BY tenure, grp
ORDER BY tenure, grp;
```

| tenure | grp | wallets | avg_wallet_payments |
|---|---|---|---|
| a. opened before Oct 2025 | got cashback | 671 | 1.23 |
| a. opened before Oct 2025 | no cashback | 379 | 1.12 |
| b. opened Oct 2025 or later | got cashback | 357 | 0.44 |
| b. opened Oct 2025 or later | no cashback | 664 | 0.3 |

Bỏ cột `tenure` khỏi câu query, bạn được 1.028 ví có cashback với trung bình 0,95 giao dịch so với 1.043 ví còn lại ở mức 0,6: "nhiều hơn khoảng 60%, tăng gấp đôi ngân sách cashback thôi!" Tách theo thời gian mở ví thì khoảng cách co lại từ 0,35 xuống còn 0,11 và 0,14, và phần lớn ví có cashback là ví cũ (671 trên 1.028). Ví mở lâu hơn thì có nhiều tháng hơn để nhận cashback *và* để thanh toán. Tuổi của ví là một **biến gây nhiễu** (**confounder**): một yếu tố thứ ba tác động lên cả hai.

```text
  A và B thay đổi cùng nhau. Các lý do có thể:
  1. A gây ra B               (điều ai cũng mong)
  2. B gây ra A               (nhân quả ngược)
  3. C gây ra cả hai          (biến gây nhiễu: tuổi ví, thu nhập, mùa vụ, quy mô thành phố)
  4. Chọn lọc (selection)     (chỉ một số khách mới có thể nhận A)
  5. Ngẫu nhiên               (nhóm nhỏ, so sánh quá nhiều lần)
```

Muốn chứng minh cashback *gây ra* nhiều giao dịch hơn, bạn cần một thí nghiệm: cho một nửa ngẫu nhiên các ví tương tự nhận cashback rồi so sánh (A/B testing, trong bài da-08). Phân tích mô tả chỉ có thể nói "hai thứ này đi cùng nhau, và đây là những điểm khác nhau khác giữa các nhóm".

> **Góc BA:** khi stakeholder nói "X thúc đẩy Y", hãy viết lại thành một requirement kiểm chứng được: "Nếu một nhóm ngẫu nhiên nhận X, thì sau N tuần, Y của họ cao hơn nhóm đối chứng ít nhất Z." Một ý kiến trở thành acceptance criterion cho một thí nghiệm.

---

## 8. Excel và Google Sheets: mô tả một bảng export

Một buổi chiều giao dịch (2/6/2026, 12:00–20:00 giờ Việt Nam), export bằng:

```sql
SELECT p.payment_id, time(p.created_at, '+7 hours') AS time_vn, m.category, p.method, p.amount, p.status
FROM payments p
JOIN merchants m ON m.merchant_id = p.merchant_id
WHERE datetime(p.created_at, '+7 hours') BETWEEN '2026-06-02 12:00:00' AND '2026-06-02 19:59:59'
ORDER BY p.payment_id;
```

Dán vào sheet sao cho tiêu đề ở dòng 1 và dữ liệu ở dòng 2–12 (cột A–F):

| payment_id | time_vn | category | method | amount | status |
|---|---|---|---|---|---|
| 6922 | 12:24:49 | fashion | qr_code | 654000 | success |
| 6923 | 12:55:34 | grocery | card | 323000 | success |
| 6924 | 14:00:48 | grocery | qr_code | 616000 | refunded |
| 6925 | 14:23:15 | electronics | qr_code | 2218000 | success |
| 6926 | 14:26:05 | food_delivery | qr_code | 108000 | success |
| 6927 | 15:50:28 | food_delivery | card | 163000 | success |
| 6928 | 16:22:58 | food_delivery | e_wallet | 62000 | success |
| 6929 | 17:47:03 | food_delivery | qr_code | 231000 | success |
| 6930 | 17:46:18 | electronics | bank_transfer | 4061000 | failed |
| 6931 | 18:29:32 | grocery | card | 324000 | success |
| 6932 | 19:52:58 | food_delivery | card | 49000 | success |

### Bước 1: COUNTIFS, SUMIFS, AVERAGEIFS (và cái bẫy)

| Cần tính | Công thức | Kết quả |
|---|---|---|
| Số dòng | `=COUNTA(A2:A12)` | 11 |
| Số giao dịch thành công | `=COUNTIFS(F2:F12,"success")` | 9 |
| Trung bình mọi số tiền | `=AVERAGE(E2:E12)` | 800.818 (sai: tính cả khoản thất bại 4.061.000) |
| Giá trị giao dịch thành công | `=SUMIFS(E2:E12,F2:F12,"success")` | 4.132.000 |
| Trung bình giao dịch thành công | `=AVERAGEIFS(E2:E12,F2:F12,"success")` | 459.111 |
| Số giao dịch thẻ thành công | `=COUNTIFS(D2:D12,"card",F2:F12,"success")` | 4 |
| Giá trị đơn đồ ăn trả bằng thẻ thành công | `=SUMIFS(E2:E12,D2:D12,"card",C2:C12,"food_delivery",F2:F12,"success")` | 212.000 |

AVERAGE thông thường trông ổn nhưng sai. Nhóm hàm `…IFS` nhận từng cặp (vùng dữ liệu, điều kiện); SUMIFS và AVERAGEIFS đặt vùng cần cộng/tính trung bình **lên đầu**. Chuyện chọn mẫu số cũng quay lại: `=COUNTIFS(F2:F12,"success")/COUNTA(F2:F12)` cho 81,8%, còn nếu tính dòng refunded là "đã đi qua", `=(COUNTIFS(F2:F12,"success")+COUNTIFS(F2:F12,"refunded"))/COUNTIFS(F2:F12,"<>pending")` cho 90,9%.

### Bước 2: MEDIAN và PERCENTILE có điều kiện

Hai hàm này không có bản "IFS", nên phải lọc trước:

- Google Sheets và Excel 365: `=MEDIAN(FILTER(E2:E12,F2:F12="success"))` → **231.000**. Excel đời cũ: `=MEDIAN(IF(F2:F12="success",E2:E12))` rồi nhấn Ctrl+Shift+Enter (công thức mảng, array formula).
- `=PERCENTILE.INC(FILTER(E2:E12,F2:F12="success"),0.9)` → **966.800** (hàm `PERCENTILE` của Sheets cho cùng kết quả).

Trung bình (459.111) gấp đôi trung vị (231.000) vì một đơn điện tử 2.218.000: độ lệch của cả database thu nhỏ lại. Còn 966.800 không có trong bảng vì PERCENTILE.INC **nội suy**: vị trí 1 + 0,9 × 8 = 8,2 không phải một dòng tròn, nên nó đi 20% quãng đường từ giá trị thứ 8 sau khi sắp xếp (654.000) tới giá trị thứ 9 (2.218.000). Phương pháp nearest-rank trong SQL sẽ cho 2.218.000. Với 9 giá trị, P90 nào cũng chông chênh; hãy chọn một phương pháp, nói rõ, và chỉ đưa ra phân vị khi có đủ số dòng. Kiểm tra bằng SQL trên cùng khung giờ (`status = 'success'`) cho 9 giao dịch, 4.132.000 và 459.111, khớp với sheet.

### Bước 3: pivot table

**Pivot table** chính là `GROUP BY` bằng chuột.

1. Click vào một ô trong dữ liệu. Excel: **Insert → PivotTable → New worksheet**. Sheets: **Insert → Pivot table → New sheet**.
2. Kéo `method` vào **Rows**.
3. Vào **Values**: `payment_id` dạng **Count** (Sheets: COUNTA) và `amount` dạng **Sum**.
4. Đặt `status` vào **Filters**, chỉ giữ `success`, rồi sắp xếp theo tổng.

| method | Count of payment_id | Sum of amount |
|---|---|---|
| qr_code | 4 | 3.211.000 |
| card | 4 | 859.000 |
| e_wallet | 1 | 62.000 |
| **Grand total** | **9** | **4.132.000** |

Grand total khớp với SUMIFS: luôn kiểm tra điều này. Để ý `bank_transfer` biến mất: dòng duy nhất của nó bị thất bại. Và QR "thắng" chỉ vì đơn 2.218.000 chiếm 69% tổng của QR. Với 9 dòng, một giao dịch quyết định cả thứ hạng: đó là cảnh báo cỡ mẫu nhỏ, không phải insight. Thử thêm `category` vào Rows và `status` vào **Columns**.

### Bước 4: conditional formatting

Chọn A2:F12 → **Format → Conditional formatting** (Excel: Home → Conditional Formatting → New Rule → "Use a formula"), công thức tùy chỉnh `=$F2<>"success"`, tô nền đỏ nhạt: các dòng thất bại và hoàn tiền sẽ nổi lên. Ở cột E2:E12, thêm **color scale** để các khoản tiền lớn nổi bật.

> **Tự làm thử:** trong pivot, thêm `refunded` vào bộ lọc status. Dòng QR sẽ thành 5 giao dịch và 3.827.000 VND.

> **Hiểu lầm thường gặp:** "Tổng của pivot luôn đúng." Pivot cộng bất cứ thứ gì có trong sheet, kể cả dòng thiếu, dòng trùng hay sai status. Hãy đối chiếu grand total với một con số từ nguồn trước khi gửi đi.

---

## 9. Bài tập thực hành

### Bài 1 — Tính trung bình và trung vị bằng tay

Bảy giao dịch BNPL đã đi qua, từ 1–10/6/2026 (bảy dòng đầu theo `payment_id`): 84.000 (đồ ăn), 1.140.000 (giáo dục), 1.612.000 (du lịch), 1.573.000 (giáo dục), 1.145.000 (du lịch), 264.000 (tạp hóa), 913.000 (du lịch). Tính tổng, trung bình và trung vị. Số nào mô tả "một giao dịch BNPL điển hình"?

**Đáp án:** tổng 6.731.000 VND; trung bình ≈ 961.571. Sắp xếp: 84k, 264k, 913k, **1.140k**, 1.145k, 1.573k, 1.612k, nên trung vị là 1.140.000. Lần này trung bình lại *thấp hơn* trung vị: hai giỏ hàng nhỏ kéo nó xuống. Với mẫu nhỏ, độ lệch có thể theo hướng nào cũng được; trung vị mô tả giao dịch điển hình tốt hơn, và với bảy dòng hãy nói rõ "mẫu nhỏ".

### Bài 2 — Phần trăm hay điểm phần trăm?

Một slide viết: "Tỷ lệ thành công của QR là 94,9% so với 89,3% của thẻ: QR tốt hơn 5,6%." Hãy sửa lại.

**Đáp án:** "Tỷ lệ thành công của QR cao hơn thẻ **5,6 điểm phần trăm** (94,9% so với 89,3%), tức **cao hơn khoảng 6,3% xét tương đối**." Hoặc: thẻ thất bại 10,7% số lần so với 5,1%, nhiều gấp khoảng 2,1 lần.

### Bài 3 — SQL: mô tả các lần nạp ví

Viết một câu query trả về số lần nạp ví thành công, trung bình, trung vị và P90 (nearest-rank).

**Đáp án:**

```sql
WITH ranked AS (
  SELECT amount, ROW_NUMBER() OVER (ORDER BY amount) AS rn, COUNT(*) OVER () AS n
  FROM wallet_transactions
  WHERE txn_type = 'top_up' AND status = 'success'
)
SELECT MAX(n) AS top_ups,
       ROUND(AVG(amount)) AS avg_amount,
       AVG(CASE WHEN rn IN ((n + 1) / 2, (n + 2) / 2) THEN amount END) AS median_amount,
       MIN(CASE WHEN rn >= 0.90 * n THEN amount END) AS p90_amount
FROM ranked;
```

| top_ups | avg_amount | median_amount | p90_amount |
|---|---|---|---|
| 13598 | 614139 | 500000 | 1110000 |

Lần nạp điển hình là 500.000 VND; trung bình (khoảng 614.000) cao hơn vì cái đuôi bên phải; cứ khoảng mười lần nạp thì có một lần từ 1,11 triệu trở lên.

### Bài 4 — Công thức trên sheet ngày 2/6

Trên sheet ở mục 8, viết công thức cho (a) tỷ lệ thành công của `qr_code` chỉ tính `success`, (b) trung vị các giao dịch giao đồ ăn thành công.

**Đáp án:** (a) `=COUNTIFS(D2:D12,"qr_code",F2:F12,"success")/COUNTIFS(D2:D12,"qr_code")` = 4 ÷ 5 = **80%** (là 5 ÷ 5 = 100% nếu tính dòng refunded là "đã đi qua": hãy nói rõ bạn dùng định nghĩa nào). (b) `=MEDIAN(FILTER(E2:E12,(C2:C12="food_delivery")*(F2:F12="success")))` (nhân hai điều kiện nghĩa là AND): sắp xếp 49k, 62k, **108k**, 163k, 231k, nên được **108.000 VND**.

### Bài 5 — Tìm lỗi trong câu query

Một câu query tính tỷ lệ hoàn tiền trả về 0 cho mọi phương thức: `SELECT method, SUM(status = 'refunded') / COUNT(*) AS refund_rate FROM payments GROUP BY method;` Sai ở đâu?

**Đáp án:** (1) Chia số nguyên: cả hai vế đều là số nguyên nên SQLite trả về 0; hãy nhân với `100.0` trước. (2) Mẫu số gồm cả các lần thất bại và pending, vốn không bao giờ được hoàn tiền. Bản đã sửa:

```sql
SELECT method,
       SUM(status = 'refunded') AS refunded,
       ROUND(100.0 * SUM(status = 'refunded') / SUM(status IN ('success', 'refunded')), 1) AS refund_rate_pct
FROM payments
GROUP BY method
ORDER BY refund_rate_pct DESC;
```

BNPL cao nhất với 3,3%, tiếp theo là ví điện tử và thẻ cùng 2,8%, QR và chuyển khoản cùng 2,0%. Nhưng 3,3% của BNPL chỉ dựa trên 13 lần hoàn tiền: hãy ghi số lượng đi kèm tỷ lệ.

### Bài 6 — Phản biện một báo cáo tháng

"Giá trị thanh toán tháng 6/2026 tăng 6,0% MoM. Banner checkout ra mắt trong tháng 6 rõ ràng đang hiệu quả." Kết luận này sai ở đâu?

**Đáp án:** (1) Chuỗi số này từng dao động từ +28,4% đến −15,7% MoM; một tháng chẳng nói lên nhiều. (2) Vài giao dịch điện tử lớn có thể làm lệch tổng của một tháng vì dữ liệu lệch phải. (3) Hãy so các khoảng dài hơn (Quý 2 so với Quý 1/2026: khoảng +3,4%) và so với cùng tháng năm trước. (4) Kể cả khi tăng thật, nó chỉ *trùng thời điểm* với banner; muốn ghi công cho banner cần A/B test, hoặc ít nhất so khách đã thấy banner với những khách tương tự chưa thấy. (5) Yêu cầu thêm số giao dịch và trung vị bên cạnh giá trị.

### Bài 7 — "BNPL khiến khách chi nhiều hơn"

Team marketing đưa ra số tiền trung bình theo phương thức (giao dịch đã đi qua): BNPL 1.637.370 VND trên 397 giao dịch, thẻ 681.159 trên 2.541 giao dịch. "Giỏ hàng BNPL lớn gấp 2,4 lần. Hãy để BNPL làm phương thức mặc định để tăng giá trị giỏ hàng." Bạn kiểm tra gì và nói gì?

**Đáp án:** kiểm tra xem ngay từ đầu những giỏ hàng nào dùng BNPL:

```sql
SELECT CASE WHEN amount < 1000000 THEN 'a. under 1M' ELSE 'b. 1M and above' END AS basket,
       COUNT(*) AS payments,
       SUM(method = 'bnpl') AS bnpl,
       ROUND(100.0 * SUM(method = 'bnpl') / COUNT(*), 1) AS bnpl_share_pct
FROM payments
WHERE status IN ('success', 'refunded')
GROUP BY basket;
```

| basket | payments | bnpl | bnpl_share_pct |
|---|---|---|---|
| a. under 1M | 5706 | 169 | 3 |
| b. 1M and above | 1285 | 228 | 17.7 |

BNPL được chọn *vì* giỏ hàng vốn đã lớn (17,7% giỏ từ 1 triệu trở lên so với 3% giỏ nhỏ hơn): đó là chọn lọc, hay nhân quả ngược. Hãy nói với marketing: "BNPL được dùng cho các đơn lớn; dữ liệu không cho thấy BNPL làm đơn lớn hơn. Mình A/B test hiển thị BNPL lên đầu cho một nửa ngẫu nhiên số phiên checkout nhé." Và mời team rủi ro vào cuộc: để BNPL làm mặc định sẽ thay đổi mức rủi ro tín dụng.

---

## 10. Tóm tắt

- **Mô tả trước, giải thích sau**: số lượng, tổng, giá trị điển hình, độ trải rộng, phân khúc, xu hướng. Luôn nêu định nghĩa (dòng nào, status nào, ngày nào, múi giờ nào).
- **Dữ liệu tiền lệch phải**: trung bình nằm trên mức mà đa số khách thực sự chi (giao dịch: trung bình 733k, trung vị 334k). Hãy báo cáo thêm trung vị và các phân vị.
- SQLite không có MEDIAN: dùng `ROW_NUMBER()` + `COUNT(*) OVER ()`, lấy trung bình của một hoặc hai dòng ở giữa; với phân vị, lấy giá trị nhỏ nhất có `rn >= p * n`.
- **Phân khúc** để tìm khác biệt; ghi số lượng cạnh tỷ lệ; làm sạch thuộc tính; kiểm tra các phần cộng lại bằng tổng.
- **Mẫu số là tất cả những ai có thể gặp kết quả đó.** Trong SQLite, nhân với `100.0`.
- **pp và %**: 89,3% → 94,9% là +5,6 pp, khoảng +6,3% tương đối.
- **Tăng trưởng**: MoM rất nhiễu; so các khoảng dài hơn, để ý hiệu ứng nền thấp, chuẩn hóa (trên mỗi ví, mỗi khách).
- **Nghịch lý Simpson**: kiểm tra cơ cấu. **Tương quan ≠ nhân quả**: tìm biến gây nhiễu, nhân quả ngược và chọn lọc; chỉ thí nghiệm mới chứng minh được nhân quả.
- **Excel / Sheets**: COUNTIFS, SUMIFS, AVERAGEIFS, MEDIAN(FILTER(…)), PERCENTILE.INC, pivot table, conditional formatting, và đối chiếu với nguồn.

### Thuật ngữ chính

| Thuật ngữ | Nghĩa đơn giản |
|---|---|
| Descriptive analysis (phân tích mô tả) | Tóm tắt chuyện đã xảy ra bằng số lượng, tổng, giá trị điển hình, độ trải rộng và xu hướng |
| Mean / median | Tổng ÷ số lượng / giá trị ở giữa sau khi sắp xếp |
| Percentile (P90) | Giá trị mà 90% dữ liệu nhỏ hơn hoặc bằng |
| Skewed (lệch phải) | Đa số giá trị nhỏ, kèm một đuôi dài các giá trị lớn |
| Segmentation (phân khúc) | Chia dữ liệu thành nhóm và mô tả từng nhóm |
| Denominator (mẫu số) | Phần dưới của phân số: tỷ lệ được tính "trên" cái gì |
| Percentage point (pp) | Hiệu số đơn thuần giữa hai tỷ lệ phần trăm |
| MoM / QoQ / YoY | Tăng trưởng so với tháng trước / quý trước / cùng kỳ năm trước |
| Base effect (hiệu ứng nền thấp) | Phần trăm tăng trưởng rất lớn do điểm xuất phát quá nhỏ |
| Simpson's paradox | Con số tổng cho thấy điều ngược lại với mọi nhóm con |
| Confounder (biến gây nhiễu) | Yếu tố thứ ba tác động lên hai thứ, khiến chúng trông như liên quan |
| Pivot table | Công cụ bảng tính để nhóm và tóm tắt dòng, giống GROUP BY |

Bài tiếp theo: **da-05 "SQL cho phân tích"**: tổng hợp có điều kiện, JOIN không đếm trùng, gom nhóm theo ngày, CTE và window function trên fintech.db.
