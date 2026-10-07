# Dashboard, KPI và một case study trọn vẹn

## 1. Từ phân tích đến quyết định

Kết quả của một câu query chưa phải là một quyết định. Phải có ai đó (CEO, Head of Risk, product owner) nhìn vào con số, tin nó, hiểu nó có ý nghĩa gì và quyết định làm gì. Việc của bạn, với vai trò analyst hay BA, là làm cho con đường đó ngắn và an toàn. Một stakeholder (bên liên quan) không truy được con số về nguồn gốc của nó sẽ hoặc bỏ qua nó, hoặc tệ hơn, làm theo nó một cách mù quáng.

Bài này có hai nửa. Nửa đầu là **công cụ**: thẻ định nghĩa KPI, chọn và đọc biểu đồ, dashboard kèm cảnh báo, A/B test và cách viết phần "so what" (vậy thì sao?). Nửa sau là **một case study trọn vẹn** trên `fintech.db`: *"Approval tăng 15% — CEO vui, đội rủi ro lo."* Chúng ta theo dõi thay đổi chính sách tháng 3/2026 từ câu hỏi đầu tiên đến một bản memo một trang.

```text
question -> trustworthy data -> metric -> fair comparison -> "so what" -> decision
```

Phần lớn quyết định sai trong cho vay không đến từ SQL sai. Chúng đến từ một con số được định nghĩa lỏng lẻo, được so với mốc (baseline) sai, hoặc được đọc từ một biểu đồ đã che giấu điều gì đó.

---

## 2. Thẻ định nghĩa KPI

**KPI** (key performance indicator, chỉ số hiệu suất chính) là con số doanh nghiệp theo dõi để biết mọi thứ có đang ổn không. Rắc rối bắt đầu khi hai đội tính "cùng một" KPI theo hai cách: với tháng 3–4/2026, đội Risk nói approval rate (tỷ lệ duyệt) là 49,6%, đội Growth nói 53,8%. Cả hai đều đúng; họ dùng hai định nghĩa khác nhau.

Cách chữa là một **thẻ định nghĩa KPI (KPI definition card)**: một "hợp đồng" ngắn, viết ra giấy, cho từng chỉ số:

| Trường | Approval rate (VayNhanh) |
|---|---|
| Câu hỏi | Trong các hồ sơ đã ra quyết định, ta duyệt bao nhiêu phần trăm? |
| Công thức | `status = 'approved'` ÷ `status != 'pending'` |
| Grain | một dòng = một hồ sơ vay; nhóm theo tháng nộp hồ sơ, tính theo **giờ Việt Nam** |
| Bộ lọc | mọi sản phẩm và kênh; `cancelled` (khách được duyệt nhưng không nhận khoản vay) tính là *không* duyệt |
| Nguồn · chủ sở hữu · tần suất cập nhật | `loan_applications` · Head of Credit Risk · hằng ngày |
| Đi kèm với | tỷ lệ trễ hạn sớm theo vintage |
| Lưu ý | những ngày gần nhất vẫn còn hồ sơ `pending` |

Các trường gây tranh cãi nhiều nhất là **grain** ("một dòng = một cái gì?": một người nộp ba lần được tính ba lần), **bộ lọc** (tính `cancelled` là được duyệt chính là khoảng cách giữa 49,6% và 53,8%) và **owner** (người duy nhất được quyền đổi định nghĩa).

Bạn đã gặp định nghĩa còn lại ở da-06 (Phân tích cho vay số), nơi `cancelled` được tính là được duyệt vì bên cho vay đã nói "có". Không cách nào sai: da-06 đo quyết định tín dụng, còn thẻ này đo các khoản vay doanh nghiệp thực sự giải ngân. Điều quan trọng là thẻ KPI ghi rõ dùng cách nào, để mọi báo cáo theo cùng một quy tắc.

Trường **"đi kèm với"** là một thói quen đáng học. Gần như KPI nào cũng có thể bị đẩy lên theo cách có hại: duyệt cả những người rủi ro hơn thì approval rate tăng; tắt kiểm tra gian lận thì tỷ lệ thanh toán thành công tăng. Hãy ghép mỗi KPI với một **guardrail metric** (chỉ số "lan can bảo vệ") sẽ để lộ cách "ăn gian" đó. Khi thẻ đã được phê duyệt (sign off), sẽ không ai phải ngồi đối chiếu hai phiên bản của cùng một con số trong cuộc họp nữa.

> **Hiểu lầm thường gặp:** "43,2% → 49,6% là tăng 6,4%." Không: đó là tăng **6,4 điểm phần trăm (percentage point, pp)**, tức **tăng tương đối 14,8%**. Luôn nói rõ bạn đang dùng cách nào. Chính sự nhầm lẫn này là cách câu "approval tăng 15%" đến tai CEO.

---

## 3. Chọn đúng biểu đồ, và đọc biểu đồ một cách tỉnh táo

| Câu hỏi | Biểu đồ |
|---|---|
| Thay đổi thế nào theo thời gian? | Đường (line), hoặc cột nếu ít kỳ |
| Nhóm nào lớn hơn? | Thanh ngang (bar), đã sắp xếp |
| Mỗi phần chiếm bao nhiêu? | Cột chồng 100%; biểu đồ tròn chỉ khi có 2–3 phần |
| Giá trị phân bố ra sao? | Histogram hoặc box plot |
| Người dùng rơi rụng ở đâu? | Funnel (phễu) |
| Mỗi cohort diễn biến thế nào khi "già" đi? | Các đường vintage hoặc bảng cohort tô màu |
| Một con số ngay lúc này | Ô KPI (KPI tile) kèm so sánh ("so với tháng trước") |

Năm cách một biểu đồ có thể đánh lừa bạn:

1. **Trục bị cắt (truncated axis).** Cùng hai approval rate, trục bắt đầu từ 0% và từ 38%:

```text
Axis from 0%                          Axis from 38%
Nov-25 ███████████████ 38.5           Nov-25 █ 38.5
Apr-26 ████████████████████ 50.9      Apr-26 ████████████████████████ 50.9
```

Ở bên phải, tỷ lệ trông như tăng gấp hai mươi lần. Biểu đồ cột cho tỷ lệ nên bắt đầu từ 0.

2. **Lũy kế hay theo từng kỳ.** Một đường cộng dồn (running total) luôn đi lên, kể cả khi lượng giao dịch mỗi ngày sụp đổ.
3. **Mẫu nhỏ.** Một tỷ lệ tính trên 2 giao dịch nhảy giữa 0%, 50% và 100%. Luôn ghi *n* (số mẫu) cạnh mỗi tỷ lệ.
4. **Cohort còn non (right-censoring).** Khoản vay mới chưa có thời gian để thành nợ xấu, nên "tỷ lệ xấu tính đến nay" khiến các tháng mới nhất trông đẹp nhất. Chỉ so các cohort ở **cùng độ tuổi**.
5. **Trung bình che giấu cơ cấu (mix).** Một con số tổng có thể đổi chỉ vì tỷ trọng các nhóm thay đổi. Hãy chia nhỏ ra trước khi tin.

---

## 4. Dashboard cho rủi ro, thanh toán và vận hành, kèm cảnh báo

**Dashboard** là một trang gồm các KPI mà một nhóm người xem thường xuyên. Dashboard tốt trả lời được câu "mọi thứ có ổn không, nếu không thì hỏng ở đâu?" trong chưa đầy một phút.

| Dashboard | Người xem | Các ô thường có |
|---|---|---|
| Rủi ro tín dụng | Head of Risk, CEO | approval rate, số hồ sơ, tỷ lệ xấu theo vintage, PAR30, cơ cấu theo nhóm điểm và kênh |
| Thanh toán | PM mảng thanh toán | tỷ lệ thành công theo phương thức và thiết bị, lý do từ chối, TPV, tỷ lệ hoàn tiền |
| Vận hành | Đội Ops | giao dịch `pending` bị treo, lệch đối soát, lỗi từ nhà cung cấp |

Bố cục phổ biến: hàng trên cùng là các ô KPI kèm so sánh, giữa là xu hướng theo thời gian, dưới cùng là phần chia nhỏ và bảng chi tiết. Ghi rõ "dữ liệu tính đến ngày …" và gắn link từ mỗi ô sang thẻ KPI của nó.

Không ai ngồi nhìn dashboard cả ngày, nên một **cảnh báo (alert)** sẽ gửi tin nhắn khi chỉ số vượt qua một **ngưỡng (threshold)**: ngưỡng cố định ("dưới 80%"), ngưỡng so với mốc ("thấp hơn trung bình 4 tuần gần nhất 10 pp"), và thường kèm một **khối lượng tối thiểu** để mẫu quá nhỏ không làm cảnh báo bật lên. Đây là phép kiểm tra hằng tuần cho thanh toán thẻ trên Android (tuần bắt đầu từ thứ Hai, giờ Việt Nam):

```sql
SELECT date(created_at, '+7 hours', 'weekday 0', '-6 days') AS week_start,
       COUNT(*) AS attempts,
       ROUND(100.0 * SUM(status IN ('success', 'refunded')) / COUNT(*), 1) AS success_pct,
       CASE WHEN 100.0 * SUM(status IN ('success', 'refunded')) / COUNT(*) < 80
            THEN 'ALERT' ELSE '' END AS flag
FROM payments
WHERE method = 'card' AND device = 'android' AND status != 'pending'
  AND date(created_at, '+7 hours') BETWEEN '2026-04-20' AND '2026-05-31'
GROUP BY week_start
ORDER BY week_start;
```

| week_start | attempts | success_pct | flag |
|---|---|---|---|
| 2026-04-20 | 34 | 94.1 | |
| 2026-04-27 | 30 | 90 | |
| 2026-05-04 | 24 | 91.7 | |
| 2026-05-11 | 22 | 40.9 | ALERT |
| 2026-05-18 | 30 | 90 | |
| 2026-05-25 | 39 | 89.7 | |

Tuần sự cố OTP bạn đã gặp trong bài về thanh toán nổi bật hẳn lên. Vì sao theo tuần? Nếu nhóm theo ngày, tháng 4 chỉ có khoảng 4 giao dịch thẻ Android mỗi ngày (từ 1 đến 9), và một ngày bình thường, 29/4, đã rơi xuống 40% (5 giao dịch thì 3 thất bại). Cảnh báo theo ngày sẽ kêu vì nhiễu.

> **Góc BA:** cảnh báo cũng là một yêu cầu (requirement). Hãy viết acceptance criteria cho nó: chỉ số (và thẻ KPI), ngưỡng, khối lượng tối thiểu, khung thời gian, người nhận, hành động cần làm. "Cảnh báo khi tỷ lệ thành công thẻ trên Android < 80% với ≥ 20 giao dịch trong một tuần thứ Hai–Chủ nhật theo giờ VN; gửi vào #payments-oncall; người phụ trách kiểm tra nhà cung cấp OTP trong 30 phút."

---

## 5. A/B test cơ bản cho một thay đổi ở checkout

Đội product muốn đưa ví điện tử và VietQR lên đầu màn hình thanh toán. So sánh "trước và sau" là yếu, vì giữa hai tháng có rất nhiều thứ khác cũng thay đổi. **A/B test** chia khách hàng ngẫu nhiên, cùng một thời điểm: nhóm **control (A)** thấy màn hình cũ, nhóm **variant (B)** thấy màn hình mới. Quyết định trước khi chạy:

1. **Chỉ số chính:** số phiên có `payment_success` ÷ số phiên có `start_checkout`.
2. **Đơn vị chia ngẫu nhiên:** khách hàng, để một người luôn thấy cùng một màn hình.
3. **Guardrail:** tỷ lệ hoàn tiền, lỗi thanh toán, giá trị đơn trung bình.
4. **Cỡ mẫu và thời gian chạy.** Dừng ngay khi thấy "có vẻ tốt" (**peeking**, nhìn trộm kết quả giữa chừng) sẽ tạo ra những chiến thắng giả.

Chia khách hàng ngẫu nhiên giúp mọi yếu tố khác, như ngày nhận lương, khuyến mãi hay sự cố, được rải đều cho cả hai nhóm.

Mốc ban đầu từ `fintech.db` (1–28/6/2026, giờ Việt Nam):

```sql
SELECT event_name, COUNT(DISTINCT session_id) AS sessions
FROM checkout_events
WHERE date(event_time, '+7 hours') BETWEEN '2026-06-01' AND '2026-06-28'
  AND event_name IN ('start_checkout', 'payment_success')
GROUP BY event_name;
```

| event_name | sessions |
|---|---|
| payment_success | 622 |
| start_checkout | 851 |

Tỷ lệ chuyển đổi là 622 ÷ 851 = **73,1%**, khoảng 213 phiên mỗi tuần. Một quy tắc ước lượng nhanh cỡ mẫu mỗi nhóm là n ≈ 16 × p × (1 − p) ÷ d², với *p* là tỷ lệ hiện tại và *d* là mức tăng nhỏ nhất bạn quan tâm. Với p = 0,73, d = 0,03: 16 × 0,73 × 0,27 ÷ 0,0009 ≈ **3.500 phiên mỗi nhóm**, tức khoảng 33 tuần với lưu lượng này. Sản phẩm nhỏ chỉ phát hiện nhanh được những hiệu ứng lớn.

**Đọc kết quả** (số liệu giả định để luyện tập): A chuyển đổi 2.628 trên 3.600 phiên (73,0%), B 2.736 trên 3.600 (76,0%). Biên nhiễu cho chênh lệch giữa hai tỷ lệ vào khoảng 1,96 × √(2 × p × (1 − p) ÷ n) với p trung bình = 0,745: ≈ **2,0 pp**. Mức tăng 3,0 pp lớn hơn biên này, nên khó có thể chỉ là ngẫu nhiên. Kiểm tra các guardrail trước khi triển khai.

---

## 6. Viết phần "so what"

Quản lý không cần câu query của bạn; họ cần biết phải làm gì. Hãy dùng ba phần: **insight** (dữ liệu cho thấy gì, kèm con số và phép so sánh), **impact** (vì sao nó quan trọng, tính bằng tiền, khách hàng hoặc rủi ro) và **recommendation** (khuyến nghị: làm gì, ai quyết, làm sao biết là đã hiệu quả).

| Yếu | Mạnh |
|---|---|
| "Tỷ lệ thành công thẻ Android là 40,9% trong tuần 2026-05-11." | "Thanh toán thẻ trên Android thất bại nhiều bất thường trong tuần 11/5: thành công 40,9% so với khoảng 90% ở các tuần khác." |
| "Nhiều khách hàng bị ảnh hưởng." | "Mọi lượt checkout bằng thẻ trên Android tuần đó đều gặp rủi ro: mất GMV và tăng ticket hỗ trợ." |
| "Chúng ta nên xem xét." | "Thêm nhà cung cấp OTP thứ hai có failover (Engineering) và cảnh báo hằng tuần ở trên (Data). Rà soát lại sau một tháng." |

Nói câu trả lời trước, trích ít con số và kiểm tra từng con số, và đặt các **lưu ý (caveat)** ở chỗ người đọc sẽ thấy. Câu "chúng tôi chưa chắc vì…" tạo dựng niềm tin; giấu nó đi sẽ phá hủy niềm tin ngay lần đầu một con số hóa ra sai. Một khuyến nghị không có người phụ trách và hạn chót chỉ là một mong ước. Đừng rào đón ở mọi câu; hãy nói rõ mức độ chắc chắn của bạn một lần.

---

## 7. Case study (1): đặt câu hỏi, kiểm tra dữ liệu, xu hướng approval và cơ cấu

> **Tình huống (dữ liệu tính đến 30/6/2026).** Dashboard của CEO cho thấy approval tăng 15% kể từ tháng 3. Ngày 1/3, VayNhanh thay đổi chính sách tín dụng và chạy chiến dịch kênh đối tác (partner). Đội rủi ro cho rằng các khoản vay mới tệ hơn. Câu hỏi dành cho bạn: *"Thay đổi tháng 3 có tốt cho doanh nghiệp không?"*

### Bước 1 — Đặt câu hỏi cho đúng

"Có tốt không?" thì không query được. Hãy tách ra: cái gì tăng, tăng bao nhiêu? **Đối tượng** ta cho vay có đổi không (kênh, nhóm điểm: tức **cơ cấu - mix**)? Khoản vay mới trả nợ có kém hơn không, khi so **ở cùng độ tuổi**? Chỉ nhóm khách mới tệ, hay ai cũng tệ hơn (**so sánh tương đồng - like for like**)? Nó đáng bao nhiêu tiền, và nên làm gì? Ta cố định ba giai đoạn: **trước** = 9/2025–2/2026, **thay đổi** = 3–4/2026 (chính sách + chiến dịch), **sau chiến dịch** = 5–6/2026.

### Bước 2 — Kiểm tra dữ liệu có đáng tin không

```sql
SELECT
  (SELECT COUNT(*) FROM loan_applications WHERE status = 'approved') AS approved_apps,
  (SELECT COUNT(*) FROM loans) AS loans,
  (SELECT COUNT(*) FROM loans l JOIN loan_applications a ON a.application_id = l.application_id
    WHERE a.status != 'approved') AS loans_not_approved,
  (SELECT COUNT(*) FROM loans l WHERE term_months !=
    (SELECT COUNT(*) FROM repayment_schedule r WHERE r.loan_id = l.loan_id)) AS bad_schedules,
  (SELECT COUNT(*) FROM loan_applications WHERE credit_score IS NULL) AS no_score;
```

| approved_apps | loans | loans_not_approved | bad_schedules | no_score |
|---|---|---|---|---|
| 3106 | 3106 | 0 | 0 | 307 |

Mỗi hồ sơ được duyệt có đúng một khoản vay, và mỗi khoản vay có một kỳ trả góp cho mỗi tháng trong kỳ hạn. 307 hồ sơ không có điểm tín dụng (khách "thin-file", chưa có lịch sử tín dụng) được giữ thành một nhóm riêng. Ghi vào danh sách lưu ý: tháng 6 vẫn còn 29 hồ sơ `pending` (thêm `SUM(status = 'pending')` vào query tiếp theo để thấy), và timestamp là giờ UTC nên ta nhóm theo **ngày Việt Nam**. Hồ sơ 4817 được nộp lúc 04:28 ngày 1/3 giờ VN, khi đó vẫn là ngày 28/2 theo UTC.

### Bước 3 — Xu hướng approval

```sql
SELECT strftime('%Y-%m', date(applied_at, '+7 hours')) AS month,
  SUM(status = 'approved') AS approved,
  ROUND(100.0 * SUM(status = 'approved') / SUM(status != 'pending'), 1) AS approval_pct,
  MIN(CASE WHEN status = 'approved' THEN credit_score END) AS min_approved_score,
  ROUND(100.0 * SUM(channel = 'partner') / COUNT(*), 1) AS partner_pct
FROM loan_applications
WHERE date(applied_at, '+7 hours') >= '2025-11-01'
GROUP BY month
ORDER BY month;
```

| month | approved | approval_pct | min_approved_score | partner_pct |
|---|---|---|---|---|
| 2025-11 | 146 | 38.5 | 563 | 8.4 |
| 2025-12 | 171 | 44.1 | 561 | 10.1 |
| 2026-01 | 201 | 45.1 | 561 | 9.6 |
| 2026-02 | 214 | 46.7 | 561 | 9.2 |
| 2026-03 | 285 | 48.4 | 520 | 50.1 |
| 2026-04 | 290 | 50.9 | 522 | 49.6 |
| 2026-05 | 228 | 53.1 | 521 | 11.9 |
| 2026-06 | 216 | 50.9 | 521 | 7.5 |

Chính dữ liệu đã cho thấy sự thay đổi: **điểm thấp nhất được duyệt** giảm từ khoảng 560 xuống khoảng 520 vào tháng 3, và **tỷ trọng kênh partner** trong số hồ sơ nhảy từ khoảng 10% lên khoảng 50%, chỉ trong tháng 3–4. Cũng lưu ý rằng tỷ lệ đã tăng dần từ tháng 11 đến tháng 2, trước khi có thay đổi nào: không phải toàn bộ mức tăng là nhờ chính sách.

### Bước 4 — Con số "15%" từ đâu ra?

```sql
SELECT CASE WHEN date(applied_at, '+7 hours') < '2026-03-01' THEN '1 Sep25-Feb26'
            WHEN date(applied_at, '+7 hours') < '2026-05-01' THEN '2 Mar-Apr26'
            ELSE '3 May-Jun26' END AS period,
  SUM(status != 'pending') AS decided,
  SUM(status = 'approved') AS approved,
  SUM(status = 'approved' AND credit_score BETWEEN 520 AND 559) AS approved_520_559,
  ROUND(100.0 * SUM(status = 'approved') / SUM(status != 'pending'), 1) AS approval_pct,
  ROUND(100.0 * SUM(status = 'approved' AND NOT (credit_score BETWEEN 520 AND 559 AND credit_score IS NOT NULL))
        / SUM(status != 'pending'), 1) AS approval_pct_old_cutoff,
  ROUND(100.0 * SUM(channel = 'partner') / COUNT(*), 1) AS partner_pct
FROM loan_applications
WHERE date(applied_at, '+7 hours') >= '2025-09-01'
GROUP BY period;
```

| period | decided | approved | approved_520_559 | approval_pct | approval_pct_old_cutoff | partner_pct |
|---|---|---|---|---|---|---|
| 1 Sep25-Feb26 | 2382 | 1029 | 0 | 43.2 | 43.2 | 9.8 |
| 2 Mar-Apr26 | 1159 | 575 | 56 | 49.6 | 44.8 | 49.9 |
| 3 May-Jun26 | 853 | 444 | 53 | 52.1 | 45.8 | 9.6 |

"15%" của CEO chính là 43,2% → 49,6%: **+6,4 pp, tức tăng tương đối 14,8%**. Nếu bỏ các hồ sơ được duyệt trong nhóm điểm mới 520–559, tháng 3–4 chỉ còn 44,8%, nghĩa là việc hạ ngưỡng điểm (cut-off) giải thích khoảng 4,8 trong 6,4 pp. **Khối lượng** tăng mạnh hơn tỷ lệ nhiều: khoảng 580 hồ sơ được quyết định mỗi tháng so với khoảng 397 trước đó (+46%), chủ yếu nhờ chiến dịch partner. Và ngưỡng vẫn là 520 trong tháng 5–6: thêm 53 hồ sơ được duyệt trong nhóm mới.

---

## 8. Case study (2): đường vintage và so sánh tương đồng

### Bước 5 — Đường vintage, xử lý right-censoring

Ta dùng lại định nghĩa vintage của bài chỉ số cho vay: một **vintage** là tất cả khoản vay giải ngân trong cùng một tháng, **MOB k** (month on book) là ngày cuối tháng thứ *k* sau tháng của vintage, và mỗi ô là tỷ lệ khoản vay **từng quá hạn hơn 30 ngày (30+) tính đến MOB k**.

Cái bẫy là **right-censoring** (dữ liệu bị cắt bên phải): khoản vay tháng 4 chưa đến MOB 3, nên ta chỉ được điền một ô khi **mọi** khoản vay trong nhóm đã đến ngày cuối tháng đó (`MAX(end_m3) <= '2026-06-30'`). Lần này ta gộp sáu vintage "trước" lại, và thêm tháng 3–4 **năm 2025** để kiểm tra yếu tố mùa vụ:

```sql
WITH first_30 AS (
  -- the first day each loan was more than 30 days past due
  SELECT loan_id, MIN(date(due_date, '+31 days')) AS hit_30_date
  FROM repayment_schedule
  WHERE paid_date IS NULL OR paid_date > date(due_date, '+30 days')
  GROUP BY loan_id
),
cells AS (
  SELECT strftime('%Y-%m', l.disbursed_date) AS vintage, f.hit_30_date,
         date(strftime('%Y-%m-01', l.disbursed_date), '+3 months', '-1 day') AS end_m2,
         date(strftime('%Y-%m-01', l.disbursed_date), '+4 months', '-1 day') AS end_m3
  FROM loans l
  LEFT JOIN first_30 f ON f.loan_id = l.loan_id
)
SELECT CASE WHEN vintage BETWEEN '2025-09' AND '2026-02' THEN 'Sep25-Feb26 (pooled)' ELSE vintage END AS vintage_group,
       COUNT(*) AS loans,
       CASE WHEN MAX(end_m2) <= '2026-06-30'  -- only ages every loan has reached
            THEN ROUND(100.0 * SUM(hit_30_date <= end_m2) / COUNT(*), 1) END AS mob2,
       CASE WHEN MAX(end_m3) <= '2026-06-30'
            THEN ROUND(100.0 * SUM(hit_30_date <= end_m3) / COUNT(*), 1) END AS mob3
FROM cells
WHERE vintage BETWEEN '2025-03' AND '2025-04' OR vintage >= '2025-09'
GROUP BY vintage_group
ORDER BY MIN(vintage);
```

| vintage_group | loans | mob2 | mob3 |
|---|---|---|---|
| 2025-03 | 118 | 1.7 | 3.4 |
| 2025-04 | 122 | 0 | 1.6 |
| Sep25-Feb26 (pooled) | 1031 | 1.8 | 2.6 |
| 2026-03 | 282 | 3.2 | 7.4 |
| 2026-04 | 290 | 4.1 | NULL |
| 2026-05 | 231 | NULL | NULL |
| 2026-06 | 217 | NULL | NULL |

`NULL` nghĩa là "chưa quan sát được", **không phải** bằng 0. Thay `CASE` bằng `vintage` để xem từng tháng riêng:

```text
Ever 30+ by MOB 3, by vintage (each █ = 0.5 pp)
2025-09  █████              2.7
2025-10  ████               2.0
2025-11  ███████            3.4
2025-12  ████               1.8
2026-01  ███                1.5
2026-02  ████████           4.1
2026-03  ███████████████    7.4   <- first vintage under the new policy
2026-04  (not observable yet: MOB 3 ends on 31 July)
```

Vintage tháng 3/2026 ở mức 7,4% tại MOB 3, gần gấp ba mức 2,6% của nhóm gộp; vintage tháng 4/2026 ở mức 4,1% tại MOB 2, hơn gấp đôi 1,8%. Có phải do mùa vụ? Tháng 3 và tháng 4 **năm 2025** chỉ ở mức 3,4% và 1,6% tại MOB 3. Mùa xuân năm ngoái hoàn toàn bình thường.

> **Hiểu lầm thường gặp:** "Cứ đánh dấu khoản vay là xấu nếu kỳ 1 hoặc kỳ 2 chưa trả hoặc trả trễ trên 30 ngày." Nếu không kiểm tra xem đã thực sự trôi qua 30 ngày chưa, các kỳ đến hạn tháng 6 của khoản vay tháng 4 sẽ bị tính là xấu chỉ vì *chưa* được trả. Lần thử đầu tiên của chúng tôi mắc đúng lỗi này và ra 10% "xấu" cho tháng 3–4/2026, trộn lẫn nợ xấu thật với những hóa đơn chưa hề trễ.

### Bước 6 — So sánh tương đồng (like for like)

Tháng 3 mang đến một loại khoản vay mới (điểm 520–559) và nhiều khoản vay qua partner hơn hẳn. Nó tệ hơn chỉ vì **cơ cấu** này, hay những khoản vay tương đương cũng tệ hơn? Ta so sánh tỷ lệ từng 30+ tính đến MOB 3 giữa các vintage "trước" và vintage tháng 3/2026, vì tất cả đều đã đến MOB 3.

```sql
WITH first_30 AS (
  SELECT loan_id, MIN(date(due_date, '+31 days')) AS hit_30_date
  FROM repayment_schedule
  WHERE paid_date IS NULL OR paid_date > date(due_date, '+30 days')
  GROUP BY loan_id
),
loans_mob3 AS (
  -- one row per loan: ever 30+ by the end of MOB 3?
  SELECT l.loan_id, a.channel,
         CASE WHEN l.disbursed_date BETWEEN '2025-09-01' AND '2026-02-28' THEN 'before'
              WHEN l.disbursed_date BETWEEN '2026-03-01' AND '2026-03-31' THEN 'mar26' END AS grp,
         CASE WHEN a.credit_score IS NULL THEN 'no score'
              WHEN a.credit_score < 560 THEN '520-559'
              WHEN a.credit_score < 600 THEN '560-599'
              WHEN a.credit_score < 650 THEN '600-649'
              ELSE '650+' END AS band,
         COALESCE(f.hit_30_date <= date(strftime('%Y-%m-01', l.disbursed_date), '+4 months', '-1 day'), 0) AS bad
  FROM loans l
  JOIN loan_applications a ON a.application_id = l.application_id
  LEFT JOIN first_30 f ON f.loan_id = l.loan_id
)
SELECT band,
  SUM(grp = 'before') AS loans_before,
  ROUND(100.0 * AVG(CASE WHEN grp = 'before' THEN bad END), 1) AS bad_before_pct,
  SUM(grp = 'mar26') AS loans_mar26,
  SUM(CASE WHEN grp = 'mar26' THEN bad END) AS bad_mar26,
  ROUND(100.0 * AVG(CASE WHEN grp = 'mar26' THEN bad END), 1) AS bad_mar26_pct
FROM loans_mob3
WHERE grp IS NOT NULL
GROUP BY band
ORDER BY band;
```

| band | loans_before | bad_before_pct | loans_mar26 | bad_mar26 | bad_mar26_pct |
|---|---|---|---|---|---|
| 520-559 | 1 | 100 | 24 | 6 | 25 |
| 560-599 | 170 | 8.8 | 42 | 9 | 21.4 |
| 600-649 | 330 | 2.7 | 80 | 3 | 3.8 |
| 650+ | 519 | 0.2 | 133 | 3 | 2.3 |
| no score | 11 | 9.1 | 3 | 0 | 0 |

(Khoản vay "trước" duy nhất trong nhóm 520–559 là hồ sơ 4817: được duyệt theo quy tắc mới, giải ngân ngày 28/2 theo UTC.) Thay `band` bằng `channel` ở query ngoài cùng, ta có:

| channel | loans_before | bad_before_pct | loans_mar26 | bad_mar26 | bad_mar26_pct |
|---|---|---|---|---|---|
| app | 677 | 3.1 | 114 | 6 | 5.3 |
| partner | 94 | 2.1 | 127 | 12 | 9.4 |
| web | 260 | 1.5 | 41 | 3 | 7.3 |

Cách đọc:

- **Nhóm điểm mới** rõ ràng là xấu: 6 trên 24 khoản vay tháng 3 (25%) đã từng 30+ tính đến MOB 3.
- Những khoản vay mà **quy tắc cũ cũng sẽ duyệt** cũng tệ đi: nhóm điểm 560+ (và không có điểm) có 15 khoản xấu trên 258. Áp tỷ lệ "trước" của từng nhóm điểm vào cơ cấu tháng 3 thì chỉ dự đoán khoảng **6,4** (thêm một CTE tính `AVG(bad)` theo nhóm điểm cho `grp = 'before'`, join vào các khoản vay tháng 3 rồi `SUM` các tỷ lệ).
- Khoản vay qua partner tệ nhất trong tháng 3 (9,4%), nhưng khoản vay qua app và web cũng tệ đi. Có điều gì đó khiến người vay tháng 3 rủi ro hơn trên diện rộng, không chỉ những người lọt vào nhờ hạ ngưỡng.

Hãy trung thực về quy mô: đây chỉ là 6, 9 và 15 khoản vay xấu. Xu hướng nhất quán giữa các nhóm điểm, các kênh và các tháng, đó là điều khiến nó đáng tin, nhưng con số phần trăm chính xác sẽ còn thay đổi khi các khoản vay "già" đi. Một xu hướng nhất quán qua nhiều nhóm nhỏ là bằng chứng mạnh hơn một con số lớn duy nhất.

> **Tự thử:** trong [SQL Practice → Fintech](/practice/sql?db=fintech), chạy query của Bước 6 với `'+4 months'` đổi thành `'+3 months'` (MOB 2) và `'2026-03-31'` đổi thành `'2026-04-30'`. Bạn sẽ có 572 khoản vay "sau"; ở MOB 2, nhóm 520–559 đã nổi bật (9 trên 53, 17%), còn các nhóm khác thay đổi ít hơn nhiều.

---

## 9. Case study (3): ước lượng tác động và bản memo một trang

### Bước 7 — Ước lượng, thật đơn giản

Trước hết là khối lượng:

```sql
SELECT CASE WHEN disbursed_date < '2026-03-01' THEN 'Jan-Feb 2026' ELSE 'Mar-Apr 2026' END AS period,
       COUNT(*) AS loans,
       ROUND(SUM(principal) / 1e6, 1) AS principal_m
FROM loans
WHERE disbursed_date BETWEEN '2026-01-01' AND '2026-04-30'
GROUP BY period;
```

| period | loans | principal_m |
|---|---|---|
| Jan-Feb 2026 | 415 | 4391.9 |
| Mar-Apr 2026 | 572 | 6163.5 |

Tức là thêm khoảng **157 khoản vay và 1,77 tỷ đồng** được cho vay. Giờ đến tiền ở cả hai phía cho các vintage tháng 3–4:

```sql
WITH mar_apr AS (
  SELECT l.loan_id, l.principal,
         CASE WHEN a.credit_score BETWEEN 520 AND 559 THEN 'new band 520-559'
              ELSE 'old-eligible' END AS grp,
         -- interest written into the contract (cash loans; BNPL is 0% for the customer)
         CASE WHEN l.product = 'cash_loan'
              THEN l.monthly_installment * l.term_months - l.principal ELSE 0 END AS contract_interest,
         -- has any installment already been more than 30 days past due?
         EXISTS (SELECT 1 FROM repayment_schedule r
                 WHERE r.loan_id = l.loan_id
                   AND date(r.due_date, '+31 days') <= '2026-06-30'
                   AND (r.paid_date IS NULL OR r.paid_date > date(r.due_date, '+30 days'))) AS hit30,
         -- everything still unpaid on the schedule (due or not yet due)
         (SELECT SUM(r.amount_due) FROM repayment_schedule r
          WHERE r.loan_id = l.loan_id AND r.paid_date IS NULL) AS still_owed
  FROM loans l
  JOIN loan_applications a ON a.application_id = l.application_id
  WHERE l.disbursed_date BETWEEN '2026-03-01' AND '2026-04-30'
)
SELECT grp,
  COUNT(*) AS loans,
  ROUND(SUM(principal) / 1e6, 1) AS principal_m,
  ROUND(SUM(CASE WHEN NOT hit30 THEN contract_interest ELSE 0 END) / 1e6, 1) AS interest_good_loans_m,
  SUM(hit30) AS loans_30plus,
  ROUND(SUM(CASE WHEN hit30 THEN still_owed ELSE 0 END) / 1e6, 1) AS owed_by_30plus_m
FROM mar_apr
GROUP BY grp;
```

| grp | loans | principal_m | interest_good_loans_m | loans_30plus | owed_by_30plus_m |
|---|---|---|---|---|---|
| new band 520-559 | 53 | 571.6 | 97 | 11 | 120.9 |
| old-eligible | 519 | 5591.9 | 776.3 | 22 | 174.6 |

**Một ước lượng cố tình làm đơn giản.** Trong nhóm điểm mới, 42 khoản vay vẫn đang trả tốt chỉ có thể mang về tối đa khoảng 97 triệu đồng tiền lãi, và chỉ khi tất cả đều trả đến kỳ cuối. 11 khoản đã 30+ DPD vẫn còn nợ khoảng 121 triệu đồng. Kể cả khi đội thu hồi nợ lấy lại được phần lớn, nhóm này cùng lắm chỉ hòa vốn, chưa tính chi phí vốn và chi phí vận hành, và các khoản vay này mới chỉ được hai đến bốn tháng. Nhóm mà quy tắc cũ cũng duyệt vẫn kiếm được nhiều hơn hẳn phần đang gặp rủi ro (khoảng 776 so với 175 triệu), nhưng Bước 6 cho thấy tỷ lệ xấu của nhóm này cũng đang tăng. Những gì bị bỏ qua (phải nói rõ): chi phí vốn và chi phí thu hồi nợ, khoản thu hồi được, phí merchant của BNPL (không có trong `loans`) và nợ xấu trong tương lai.

### Bước 8 — Bản memo một trang

Memo viết bằng tiếng Anh, đúng như khi gửi ban lãnh đạo ở nhiều công ty fintech:

```text
TO:   CEO, Head of Credit Risk, Head of Growth
FROM: Data team              DATA AS OF: 30 Jun 2026 (fintech.db)
RE:   The 1 March credit policy change

HEADLINE
The March change bought volume, but the new 520-559 band is not
paying for itself, and March loans are weaker across the board.

INSIGHT
- Approval rate 43.2% -> 49.6% (+6.4 pp; the "15%" is relative).
  About 4.8 pp comes from approving scores 520-559; volume grew
  mainly through the partner campaign (+46% applications/month).
- March 2026 vintage: 7.4% of loans ever 30+ DPD by MOB 3, vs 2.6%
  for Sep 2025-Feb 2026 and 3.4% / 1.6% for Mar / Apr 2025.
- New band: 6 of 24 March loans bad. Loans the old rule would also
  approve: 15 bad of 258 vs about 6 expected.

IMPACT (estimate)
- Mar-Apr: +157 loans, +1.77 bn VND lent vs Jan-Feb.
- New band (53 loans, 571.6 m VND): at most ~97 m interest from the
  good loans vs ~121 m still owed by 11 loans already 30+ DPD.
- The 520 cut-off is still live: May-Jun added 55 such loans
  (642.2 m VND) that we cannot judge yet.

RECOMMENDATION
1. Risk: return the cut-off to 560 now (or cap 520-559 volume).
2. Risk + Growth: find why March applicants above 560 did worse
   (partner sources, score calibration) before the next campaign.
3. Data: put "ever 30+ by MOB 2-3, by vintage" next to approval
   rate on the CEO dashboard, with an alert.
4. Re-run this analysis in late August.

CAVEATS
Small counts (6, 9, 15 bad loans); young vintages; policy and
campaign started together, so their effects overlap; the money
estimate ignores costs, recoveries and BNPL merchant fees.
```

> **Góc BA:** các khuyến nghị trong memo sẽ trở thành requirement. "Thêm ô trễ hạn sớm lên dashboard" cần một thẻ KPI (công thức, grain, quy tắc xử lý censoring, owner) và acceptance criteria kiểu "một ô vintage để trống cho đến khi mọi khoản vay trong đó đã đến MOB tương ứng".

---

## 10. Bài tập thực hành

### Bài 1 — pp hay phần trăm?

Theo bảng ở Bước 3, approval rate là 46,7% trong tháng 2/2026 và 48,4% trong tháng 3. Hãy diễn đạt mức thay đổi theo cả hai cách.

**Đáp án:** +1,7 điểm phần trăm (48,4 − 46,7), tức tăng tương đối khoảng 3,6% (1,7 ÷ 46,7). Tiêu đề báo cáo phải nói rõ đang dùng cách nào.

### Bài 2 — "Vintage tốt nhất từ trước đến nay"

Một dashboard hiển thị "tỷ lệ khoản vay từng 30+ DPD tính đến nay" theo vintage. Tháng 6/2026 hiện 0,0%, tốt nhất từ trước đến nay, và một quản lý kết luận chính sách đang cải thiện. Sai ở đâu?

**Đáp án:** right-censoring. Tính đến 30/6, chưa khoản vay tháng 6 nào có kỳ trả góp đến hạn, nên không thể có khoản nào 30+ DPD. Hãy so các vintage ở cùng MOB và để trống ô cho đến khi mọi khoản vay đã đến MOB đó, như query ở Bước 5.

### Bài 3 — Approval rate theo kênh

Viết query tính approval rate theo kênh cho các hồ sơ nộp trong tháng 3–4/2026 (giờ Việt Nam). Kênh nào thấp nhất?

**Đáp án:**

```sql
SELECT channel,
       SUM(status != 'pending') AS decided,
       ROUND(100.0 * SUM(status = 'approved') / SUM(status != 'pending'), 1) AS approval_pct
FROM loan_applications
WHERE date(applied_at, '+7 hours') BETWEEN '2026-03-01' AND '2026-04-30'
GROUP BY channel
ORDER BY approval_pct DESC;
```

App 51,9% (405 hồ sơ đã quyết định), web 50,6% (176), partner 47,8% (578). Partner thấp nhất nhưng chiếm một nửa khối lượng: chiến dịch mang thêm khối lượng, chứ không phải giúp duyệt dễ hơn.

### Bài 4 — Rủi ro có còn đang tăng?

Có bao nhiêu khoản vay giải ngân trong tháng 5–6/2026 thuộc nhóm điểm 520–559, và tổng dư nợ gốc là bao nhiêu?

**Đáp án:**

```sql
SELECT COUNT(*) AS loans,
       SUM(a.credit_score BETWEEN 520 AND 559) AS loans_520_559,
       ROUND(SUM(l.principal) / 1e6, 1) AS principal_m,
       ROUND(SUM(CASE WHEN a.credit_score BETWEEN 520 AND 559 THEN l.principal ELSE 0 END) / 1e6, 1) AS principal_520_559_m
FROM loans l
JOIN loan_applications a ON a.application_id = l.application_id
WHERE l.disbursed_date BETWEEN '2026-05-01' AND '2026-06-30';
```

55 trên 448 khoản vay, 642,2 trên 5.127,8 triệu đồng (khoảng 12,5%). Chưa khoản nào đánh giá được, đó là lý do memo đề nghị quyết định ngay thay vì "chờ xem".

### Bài 5 — Đọc kết quả A/B test

Control: 1.440 phiên thanh toán thành công trên 2.000 (72,0%). Variant: 1.500 trên 2.000 (75,0%). Dùng công thức biên nhiễu ở Mục 5 với p = 0,735. Kết quả có thuyết phục không?

**Đáp án:** biên ≈ 1,96 × √(2 × 0,735 × 0,265 ÷ 2.000) ≈ 2,7 pp. Mức tăng 3,0 pp chỉ vừa nhỉnh hơn: có lẽ là thật, nhưng sát ngưỡng. Kiểm tra guardrail, và đừng kéo dài hay dừng sớm test chỉ để "có ý nghĩa thống kê".

### Bài 6 — "Toàn bộ danh mục trông vẫn ổn"

CEO nói: "PAR30 của toàn bộ danh mục gần như không đổi, nên khoản vay mới không thể tệ đến thế." Bạn trả lời thế nào?

**Đáp án:** tỷ lệ của toàn danh mục chia cho mọi khoản vay, phần lớn là khoản vay cũ, trong khi khoản vay mới còn non và chưa có thời gian để thành nợ xấu. Chúng chỉ là một lát mỏng, mới, trong một mẫu số rất lớn. Đường vintage so các khoản vay ở cùng độ tuổi, nên chúng phát hiện vấn đề sớm hơn.

### Bài 7 — Viết lại phần "so what"

Viết lại câu: "Vintage tháng 3 có tỷ lệ MOB3 là 7,4%."

**Đáp án:** "Các khoản vay giải ngân tháng 3/2026 đang xấu đi nhanh gần gấp ba trước đây: 7,4% đã từng quá hạn hơn 30 ngày tính đến tháng thứ ba trên sổ, so với 2,6% của các khoản vay tháng 9–2 (insight). Nhóm điểm mới 520–559 nhiều khả năng tốn nhiều hơn số tiền nó mang lại (impact). Đề nghị đưa ngưỡng về 560 và rà soát lại vào tháng 8 (recommendation)."

---

## 11. Tóm tắt

- Mỗi KPI cần một thẻ định nghĩa: công thức, grain, bộ lọc, owner và một guardrail. Nói rõ là pp hay % tương đối.
- Chọn biểu đồ theo câu hỏi; cảnh giác với trục bị cắt, đường cộng dồn, mẫu quá nhỏ, cohort còn non và số trung bình che giấu cơ cấu.
- Mỗi dashboard phục vụ một nhóm người xem; một cảnh báo cần ngưỡng, khối lượng tối thiểu và người phụ trách.
- Một A/B test phải cố định trước chỉ số, đơn vị chia, guardrail và cỡ mẫu.
- Viết phần "so what" theo khung insight, impact và recommendation, và nêu rõ các lưu ý.
- Case study: approval 43,2% → 49,6% (+6,4 pp, "15%" là tương đối); vintage tháng 3/2026 đạt 7,4% từng 30+ tính đến MOB 3 so với 2,6%; nhóm điểm 520–559 nhiều khả năng lỗ, và cả các khoản vay tương đương cũng tệ đi.

### Thuật ngữ chính

| Thuật ngữ | Nghĩa dễ hiểu |
|---|---|
| KPI | Con số then chốt doanh nghiệp theo dõi |
| Thẻ định nghĩa KPI | "Hợp đồng" viết ra: công thức, grain, bộ lọc, owner |
| Guardrail metric | Chỉ số không được xấu đi khi bạn đẩy chỉ số chính |
| Điểm phần trăm (pp) | Hiệu số trực tiếp giữa hai tỷ lệ phần trăm |
| Ngưỡng / cảnh báo | Mức mà khi vượt qua sẽ gửi tin nhắn cho người phụ trách |
| A/B test | Chia ngẫu nhiên thành control và variant, chạy cùng lúc |
| Peeking | Dừng test sớm vì kết quả "trông có vẻ tốt" |
| Vintage | Các khoản vay giải ngân cùng tháng, theo dõi khi chúng "già" đi |
| Right-censoring | Cohort còn non chưa đủ thời gian để lộ ra kết quả |
| Like-for-like | So cùng một nhóm (nhóm điểm, kênh) giữa các giai đoạn |
| Mix shift | Con số tổng thay đổi vì tỷ trọng các nhóm thay đổi |

Đây là bài cuối của lộ trình IT Fundamentals. Hãy tiếp tục luyện tập ở trang [Bài tập thiết kế](/practice/questions) (danh mục "Phân tích dữ liệu Fintech") và trong [SQL Practice → Fintech](/practice/sql?db=fintech).
