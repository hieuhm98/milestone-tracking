# Phân tích cho vay số: Funnel, rủi ro tín dụng, DPD & Vintage

## 1. Vòng đời một khoản vay, nhìn dưới dạng dữ liệu

Một công ty cho vay số sống nhờ hai câu hỏi: **mình đã cho vay được bao nhiêu khoản tốt**, và **trong số đó bao nhiêu khoản đang trả nợ đều**? Mọi chỉ số trong bài này đều trả lời một trong hai câu đó.

Hãy đi theo một khách hàng. Chị Lan mở app VayNhanh, xin vay 12 triệu VND trong 12 tháng, qua bước eKYC, nhận quyết định tự động sau vài phút, đồng ý với đề nghị (offer), nhận tiền rồi trả một số tiền cố định mỗi tháng. Phần lớn khách trả đúng hạn. Một số trả trễ, một số trả bù được, và một số ít ngừng trả hẳn.

```text
 nộp hồ sơ ──► quyết định ──► khách nhận offer ──► giải ngân ──► đang trả ──► tất toán (trả đủ)
                  │                 │                              │
              từ chối            hủy (không nhận)              trễ hạn (DPD > 0)
                                                                   │
                                            trả bù (cure) ◄────────┤
                                                                   ▼
                                                      vỡ nợ (90+) ──► xóa nợ (write-off)
```

Trong `fintech.db` của VayNhanh, hành trình này nằm ở ba bảng:

| Giai đoạn | Bảng | Cần đọc gì |
|---|---|---|
| Hồ sơ và quyết định | `loan_applications` | `status`: approved, rejected, cancelled, pending; `reject_reason` |
| Bản thân khoản vay | `loans` | `principal`, `annual_rate_pct`, `term_months`, `monthly_installment`, `disbursed_date`, `status` |
| Từng kỳ trả góp hàng tháng | `repayment_schedule` | `due_date`, `amount_due`, `paid_date` (NULL = chưa trả), `amount_paid` |

Có một chi tiết của VayNhanh rất quan trọng cho funnel: `approved` nghĩa là khách đã nhận offer và tiền đã được chuyển đi (mỗi hồ sơ approved có đúng một dòng trong `loans`: 3.106 ở mỗi bên), còn `cancelled` nghĩa là công ty đã đồng ý nhưng khách không nhận offer.

Ngày chốt số liệu (snapshot) là **2026-06-30**. Mọi "hôm nay", mọi số khoản quá hạn và mọi tỷ lệ bên dưới đều tính **tại ngày** đó. Bạn tự chạy các query tại [SQL Practice → Fintech](/practice/sql?db=fintech).

## 2. Funnel hồ sơ vay: approval rate và take-up

**Funnel** (phễu) đếm xem bao nhiêu người đi qua được từng bước. Với cho vay:

```text
nộp 6.854 ─► có quyết định 6.825 ─► được duyệt 3.401 ─► giải ngân 3.106
             (29 đang chờ)          (approval 49,8%)     (take-up 91,3%)
```

Từ đó ra ba tỷ lệ, mỗi tỷ lệ có **mẫu số** (con số đem chia) riêng:

| Chỉ số | Công thức | VayNhanh, toàn bộ lịch sử |
|---|---|---|
| **Approval rate** (tỷ lệ duyệt) | được duyệt ÷ đã có quyết định | 3.401 ÷ 6.825 = 49,8% |
| **Take-up rate** (tỷ lệ nhận vay) | giải ngân ÷ được duyệt | 3.106 ÷ 3.401 = 91,3% |
| Chuyển đổi đầu-cuối | giải ngân ÷ đã nộp | 3.106 ÷ 6.854 = 45,3% |

"Được duyệt" ở đây gồm `approved` + `cancelled`, vì cả hai đều nhận được câu "đồng ý". Hồ sơ pending bị loại khỏi approval rate: chúng chưa có quyết định, nếu tính là "không được duyệt" thì mấy ngày gần nhất sẽ trông khắt khe hơn thực tế.

```sql
SELECT
  strftime('%Y-%m', applied_at, '+7 hours') AS month,  -- Vietnam month
  COUNT(*) AS applied,
  SUM(status IN ('approved', 'cancelled')) AS approved,
  SUM(status = 'approved') AS disbursed,
  ROUND(100.0 * SUM(status IN ('approved', 'cancelled'))
        / SUM(status <> 'pending'), 1) AS approval_rate_pct,
  ROUND(100.0 * SUM(status = 'approved')
        / SUM(status IN ('approved', 'cancelled')), 1) AS take_up_pct
FROM loan_applications
WHERE applied_at >= '2025-12-31 17:00:00'  -- 2026-01-01 00:00 in Vietnam
GROUP BY month
ORDER BY month;
```

| month | applied | approved | disbursed | approval_rate_pct | take_up_pct |
|---|---|---|---|---|---|
| 2026-01 | 446 | 226 | 201 | 50.7 | 88.9 |
| 2026-02 | 458 | 234 | 214 | 51.1 | 91.5 |
| 2026-03 | 589 | 310 | 285 | 52.6 | 91.9 |
| 2026-04 | 570 | 313 | 290 | 54.9 | 92.7 |
| 2026-05 | 429 | 245 | 228 | 57.1 | 93.1 |
| 2026-06 | 453 | 229 | 216 | 54.0 | 94.3 |

Số hồ sơ tăng vọt trong tháng 3–4 và approval rate leo từ khoảng 51% lên khoảng 53–57% từ tháng 3 đến tháng 6. Phòng kinh doanh sẽ gọi đó là tin vui. Hãy giữ ý nghĩ đó lại cho đến mục 7.

### Vì sao khách bị từ chối?

```sql
SELECT reject_reason, COUNT(*) AS n,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM loan_applications
WHERE status = 'rejected'
GROUP BY reject_reason
ORDER BY n DESC;
```

| reject_reason | n | pct |
|---|---|---|
| high_dti | 1596 | 46.6 |
| low_score | 1096 | 32.0 |
| kyc_failed | 630 | 18.4 |
| fraud_suspected | 102 | 3.0 |

Gần một nửa số ca từ chối là do khả năng chi trả (**DTI**, mục 9), một phần ba do điểm tín dụng. `kyc_failed` là loại vấn đề khác: khách chưa qua được bước xác minh danh tính, nên đó là chuyện onboarding của đội sản phẩm chứ không phải một quyết định tín dụng.

> **Hiểu lầm thường gặp:** "Approval rate tăng nghĩa là kinh doanh khỏe hơn." Approval rate có thể tăng vì khách tốt hơn kéo đến, hoặc vì công ty nới lỏng tiêu chí. Trường hợp đầu là tin tốt; trường hợp sau chỉ lộ ra vài tháng sau, trong dữ liệu trả nợ. Đừng bao giờ đánh giá một quyết định tín dụng chỉ bằng approval rate.

> **Góc BA:** khi spec báo cáo ghi "approval rate", hãy viết rõ công thức: status nào được tính là duyệt, có loại pending không, tháng tính theo múi giờ nào, và là tháng nộp hồ sơ hay tháng ra quyết định. Hai team tính "approval rate" theo hai cách là một trong những lý do phổ biến nhất khiến hai dashboard ra hai con số khác nhau.

## 3. Danh mục cho vay: giải ngân và dư nợ

**Loan book** (hay **portfolio**, danh mục cho vay) là toàn bộ số tiền đang cho vay ra. Hai con số rất dễ nhầm:

- **Số tiền giải ngân** (disbursed): tiền đã chi ra khi mở khoản vay. Nó chỉ tăng.
- **Dư nợ gốc** (outstanding principal): phần gốc khách còn nợ tính đến hôm nay. Nó giảm dần khi khách trả nợ, và là nền cho hầu hết các tỷ lệ rủi ro.

```sql
SELECT product,
       COUNT(*) AS loans,
       SUM(principal) AS total_disbursed,
       ROUND(AVG(principal)) AS avg_ticket,
       ROUND(AVG(term_months), 1) AS avg_term
FROM loans
GROUP BY product;
```

| product | loans | total_disbursed | avg_ticket | avg_term |
|---|---|---|---|---|
| bnpl | 1397 | 6469900000 | 4631281 | 4.3 |
| cash_loan | 1709 | 27571000000 | 16132826 | 13.3 |

**Average ticket** (khoản vay trung bình) khoảng 4,6 triệu VND với BNPL và khoảng 16,1 triệu với vay tiền mặt. Tổng cộng VayNhanh đã giải ngân khoảng 34,0 tỷ VND cho 3.106 khoản vay.

Vậy còn bao nhiêu dư nợ? Bạn không thể chỉ cộng các kỳ chưa trả: mỗi kỳ trả góp gồm cả lãi lẫn gốc (mục 4), và các kỳ tương lai chưa trả có chứa phần lãi chưa phát sinh. Dư nợ gốc chính xác sau `k` kỳ đã trả của một khoản vay trả góp đều (annuity) là:

```text
dư nợ sau k kỳ = P × (1 + r)^k − M × ((1 + r)^k − 1) ÷ r
P = gốc vay, r = lãi suất tháng (% năm ÷ 1200), M = tiền trả mỗi tháng
(với khoản vay 0% như BNPL: P − M × k)
```

Mục 6 biến công thức này thành SQL. Kết quả, với 1.816 khoản vay chưa tất toán: khoảng **15,3 tỷ VND dư nợ**, chưa bằng một nửa tổng số tiền từng giải ngân.

> **Tự thử:** chạy query theo product ở trên, rồi thêm `WHERE disbursed_date >= '2026-01-01'`. Bạn sẽ thấy 1.435 khoản vay, khoảng 45% là BNPL, đúng bằng tỷ trọng trong toàn bộ lịch sử. Nhưng vì BNPL chỉ có kỳ hạn 3 hoặc 6 tháng, các khoản này rời khỏi danh mục nhanh hơn nhiều so với vay tiền mặt.

## 4. Lãi suất, APR và tiền trả hàng tháng

### Dư nợ giảm dần và lãi phẳng

Khoản vay tiền mặt của VayNhanh tính một **lãi suất danh nghĩa theo năm** (`annual_rate_pct`, từ 18% đến 38%) trên **dư nợ giảm dần**: lãi mỗi tháng chỉ tính trên phần gốc còn nợ. Khoản BNPL ở đây có lãi 0% với khách (người bán trả phí thay, đó là chủ đề thanh toán).

Mỗi tháng khách trả cùng một **khoản trả góp** (installment), tính bằng công thức **annuity** (niên kim):

```text
M = P × r ÷ (1 − (1 + r)^(−n))      n = số tháng
```

Khoản vay 519 là 12.000.000 VND, lãi 28%/năm, 12 tháng: r = 28 ÷ 1200 ≈ 2,33%/tháng, M ≈ 1.158.000, và VayNhanh làm tròn lên nghìn đồng: `monthly_installment` = 1.159.000. Một recursive CTE cho thấy mỗi kỳ trả được chia ra sao:

```sql
WITH RECURSIVE amort(n, opening, interest, principal_part, closing) AS (
  SELECT 1, 12000000.0,
         12000000.0 * 0.28 / 12,
         1159000 - 12000000.0 * 0.28 / 12,
         12000000.0 - (1159000 - 12000000.0 * 0.28 / 12)
  UNION ALL
  SELECT n + 1, closing,
         closing * 0.28 / 12,
         1159000 - closing * 0.28 / 12,
         closing - (1159000 - closing * 0.28 / 12)
  FROM amort
  WHERE n < 12
)
SELECT n, ROUND(opening) AS opening, ROUND(interest) AS interest,
       ROUND(principal_part) AS principal_part, ROUND(closing) AS closing
FROM amort;
```

| n | opening | interest | principal_part | closing |
|---|---|---|---|---|
| 1 | 12000000 | 280000 | 879000 | 11121000 |
| 2 | 11121000 | 259490 | 899510 | 10221490 |
| 3 | 10221490 | 238501 | 920499 | 9300991 |
| … | … | … | … | … |
| 11 | 2227210 | 51968 | 1107032 | 1120178 |
| 12 | 1120178 | 26137 | 1132863 | -12684 |

Cách đọc: các kỳ đầu chủ yếu là lãi, các kỳ sau chủ yếu là gốc, vì lãi tính trên số dư ngày càng nhỏ. Số âm nhỏ ở cuối là do làm tròn lên tiền trả góp; hệ thống thật sẽ điều chỉnh kỳ cuối. Tổng tiền trả: 12 × 1.159.000 = 13.908.000, vậy chi phí lãi là 1.908.000 VND.

### Vì sao "lãi phẳng" trông rẻ hơn thực tế

Một số bên cho vay quảng cáo **lãi phẳng** (flat rate): lãi mỗi tháng tính trên số gốc *ban đầu*, dù khách đã trả bớt gốc. Cùng khoản vay, lãi phẳng 1,5%/tháng: lãi = 12.000.000 × 1,5% × 12 = 2.160.000, nên tiền trả mỗi tháng là (12.000.000 + 2.160.000) ÷ 12 = 1.180.000. Một khoản annuity khoảng 31,7%/năm cho ra đúng mức trả đó: 1.179.903. Nghĩa là "1,5% một tháng" (18% một năm) thực chất khoảng 31,7% một năm tính trên dư nợ giảm dần.

Vì thế quy định bảo vệ người tiêu dùng ở nhiều nước yêu cầu bên cho vay công bố **APR** (annual percentage rate, lãi suất thực tế theo năm): chi phí vay theo năm tính trên dư nợ giảm dần, thường gồm cả các khoản phí bắt buộc. Khi so sánh sản phẩm, hãy so APR với APR, đừng bao giờ so lãi phẳng với lãi dư nợ giảm dần.

> **Hiểu lầm thường gặp:** "Vay lãi 24% thì tốn 24% tiền gốc." Một khoản annuity 12 tháng lãi 24% tốn tổng tiền lãi ít hơn hẳn 24% tiền gốc, vì dư nợ giảm mỗi tháng; còn lãi phẳng 2%/tháng thì tốn đúng 24% và có APR cao hơn nhiều.

## 5. DPD: khoản vay trễ bao lâu?

**DPD** (days past due, số ngày quá hạn) đếm xem **kỳ chưa trả cũ nhất** đã quá hạn bao nhiêu ngày. Nếu không có gì quá hạn, DPD = 0 và khoản vay đang **current** (trong hạn).

Khoản vay 2208 là khoản vay tiền mặt 13,5 triệu với mức trả 1.327.000 mỗi kỳ. Bốn dòng đầu trong lịch trả nợ của nó (`SELECT installment_no, due_date, paid_date FROM repayment_schedule WHERE loan_id = 2208`):

| installment_no | due_date | paid_date |
|---|---|---|
| 1 | 2026-04-14 | 2026-04-11 |
| 2 | 2026-05-14 | NULL |
| 3 | 2026-06-14 | NULL |
| 4 | 2026-07-14 | NULL |

Ngày 2026-06-30, kỳ chưa trả cũ nhất đến hạn ngày 2026-05-14, nên DPD = 47 ngày. **Số tiền quá hạn** là hai kỳ, 2.654.000 VND. Kỳ 4 chưa trả nhưng chưa đến hạn, nên hoàn toàn không phải quá hạn.

Ba quy tắc hay bị làm sai:

1. DPD dùng ngày đến hạn chưa trả **cũ nhất**, không phải mới nhất.
2. Kỳ đến hạn *hôm nay* chưa phải quá hạn: dùng `due_date < '2026-06-30'`.
3. DPD luôn đo **tại một ngày**. Cùng một khoản vay, mỗi ngày có một DPD khác.

### Nhóm quá hạn (bucket)

Bên cho vay gom DPD thành các **bucket**: trong hạn, 1–30, 31–60, 61–90 và 90+. Khoản vay đang chậm trả gọi là **delinquent**; đội thu hồi nợ làm việc theo bucket (SMS nhắc cho 1–30, gọi điện cho 31–60, sau đó là đi thực địa hoặc thuê đơn vị bên ngoài).

```sql
WITH dpd AS (
  SELECT l.loan_id,
         COALESCE(CAST(julianday('2026-06-30')
                       - julianday(MIN(r.due_date)) AS INTEGER), 0) AS dpd
  FROM loans l
  LEFT JOIN repayment_schedule r
         ON r.loan_id = l.loan_id
        AND r.due_date < '2026-06-30'
        AND r.paid_date IS NULL
  WHERE l.status <> 'closed'
  GROUP BY l.loan_id
)
SELECT CASE WHEN dpd = 0 THEN '0 current'
            WHEN dpd <= 30 THEN '1-30'
            WHEN dpd <= 60 THEN '31-60'
            WHEN dpd <= 90 THEN '61-90'
            ELSE '90+' END AS bucket,
       COUNT(*) AS loans,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM dpd
GROUP BY bucket
ORDER BY bucket;
```

| bucket | loans | pct |
|---|---|---|
| 0 current | 1644 | 90.5 |
| 1-30 | 77 | 4.2 |
| 31-60 | 25 | 1.4 |
| 61-90 | 15 | 0.8 |
| 90+ | 55 | 3.0 |

`LEFT JOIN` ở đây rất quan trọng: khoản vay không có kỳ nào quá hạn sẽ không khớp dòng nào, `MIN(due_date)` ra NULL và `COALESCE` đổi nó thành DPD 0. Nếu dùng `JOIN` thường, mọi khoản vay trong hạn sẽ biến mất. (Trong snapshot này không có khoản thanh toán nào có ngày sau 2026-06-30, nên `paid_date IS NULL` là đủ; khi tính cho một ngày trong quá khứ, phải coi cả `paid_date > ngày_tính` là chưa trả.)

> **Tự thử:** liệt kê 55 khoản vay trong bucket 90+ và xem cột `status`. Tất cả đều là `defaulted`, và không có khoản `active` nào trên 90 DPD. Vậy `defaulted` của VayNhanh đơn giản là "quá hạn hơn 90 ngày". Kiểm tra kiểu này trước khi tin bất kỳ cột status nào là thói quen rất đáng giữ.

## 6. Chất lượng danh mục: PAR30, NPL, nhóm nợ và xóa nợ

### PAR30

**PAR30** (portfolio at risk 30 ngày) = dư nợ gốc của các khoản quá hạn hơn 30 ngày ÷ tổng dư nợ gốc. Chú ý tử số: **toàn bộ** dư nợ của khoản vay trễ, không chỉ các kỳ quá hạn, vì khi khách đã chậm một tháng thì cả khoản vay đang gặp nguy.

```sql
WITH sched AS (
  SELECT loan_id,
         COUNT(paid_date) AS k,
         MIN(CASE WHEN paid_date IS NULL AND due_date < '2026-06-30'
                  THEN due_date END) AS oldest_unpaid_due
  FROM repayment_schedule
  GROUP BY loan_id
),
book AS (
  SELECT l.loan_id,
         COALESCE(CAST(julianday('2026-06-30')
                       - julianday(s.oldest_unpaid_due) AS INTEGER), 0) AS dpd,
         MAX(0, CASE WHEN l.annual_rate_pct = 0
                     THEN l.principal - l.monthly_installment * s.k
                     ELSE l.principal * pow(1 + l.annual_rate_pct / 1200.0, s.k)
                          - l.monthly_installment
                            * (pow(1 + l.annual_rate_pct / 1200.0, s.k) - 1)
                            / (l.annual_rate_pct / 1200.0)
                END) AS outstanding
  FROM loans l
  JOIN sched s ON s.loan_id = l.loan_id
  WHERE l.status <> 'closed'
)
SELECT COUNT(*) AS open_loans,
       ROUND(SUM(outstanding) / 1e6) AS book_m_vnd,
       ROUND(100.0 * SUM(CASE WHEN dpd > 30 THEN outstanding END)
             / SUM(outstanding), 1) AS par30_pct,
       ROUND(100.0 * SUM(CASE WHEN dpd > 90 THEN outstanding END)
             / SUM(outstanding), 1) AS par90_pct,
       ROUND(100.0 * SUM(dpd > 30) / COUNT(*), 1) AS par30_by_count_pct
FROM book;
```

| open_loans | book_m_vnd | par30_pct | par90_pct | par30_by_count_pct |
|---|---|---|---|---|
| 1816 | 15333 | 5.1 | 3.0 | 5.2 |

Dư nợ khoảng 15,3 tỷ VND; PAR30 khoảng 5,1% và phần 90+ khoảng 3,0%. Có team dùng "từ 30 ngày trở lên" thay cho "hơn 30 ngày": cả hai cách đều tồn tại, nên hãy ghi định nghĩa ngay trên báo cáo.

### NPL và năm nhóm nợ ở Việt Nam

**NPL** (non-performing loan, nợ xấu) thường là khoản vay quá hạn hơn 90 ngày, hoặc khoản mà bên cho vay không còn kỳ vọng thu đủ. **Tỷ lệ NPL** = dư nợ NPL ÷ tổng dư nợ: khoảng 3,0% với VayNhanh theo định nghĩa 90+.

Ở Việt Nam, ngân hàng và công ty tài chính phân loại khoản vay vào **năm nhóm nợ**, chủ yếu theo số ngày quá hạn (cộng thêm các tiêu chí định tính, ví dụ với nợ được cơ cấu lại). Trong nhiều năm, các khoảng ngày đại khái như sau:

| Nhóm | Tên thường gọi | Đại khái |
|---|---|---|
| 1 | Nợ đủ tiêu chuẩn | trong hạn hoặc quá hạn dưới 10 ngày |
| 2 | Nợ cần chú ý | 10–90 ngày |
| 3 | Nợ dưới tiêu chuẩn | 91–180 ngày |
| 4 | Nợ nghi ngờ | 181–360 ngày |
| 5 | Nợ có khả năng mất vốn | trên 360 ngày |

Nhóm 3–5 là cái mà báo cáo ở Việt Nam gọi là **nợ xấu**. Các quy tắc này do một thông tư của Ngân hàng Nhà nước Việt Nam quy định và được sửa đổi theo thời gian, nên luôn kiểm tra thông tư đang có hiệu lực trước khi xây báo cáo dựa trên chúng.

### Dự phòng, xóa nợ và tổn thất

Bên cho vay trích trước một khoản tiền cho tổn thất dự kiến: gọi là **dự phòng** (provision). **Xóa nợ** (write-off) là đưa một khoản vay ra khỏi danh mục. Công ty xóa nợ khi đánh giá khoản vay không thu hồi được, và bù phần tổn thất bằng quỹ dự phòng. Việc thu hồi vẫn có thể tiếp tục sau khi xóa nợ, và tiền thu được sau đó gọi là **recovery** (thu hồi). **Tổn thất ròng** (net loss) = số xóa nợ − số thu hồi. Dữ liệu VayNhanh không có cột xóa nợ, nên các khoản 90+ vẫn nằm trong danh mục; ở công ty thật, quy tắc xóa nợ (ví dụ "sau N ngày quá hạn") nằm trong chính sách tín dụng.

> **Hiểu lầm thường gặp:** "PAR30 giảm, vậy thu hồi nợ đã tốt hơn." PAR30 là một tỷ lệ. Nếu giải ngân tăng gấp đôi, mẫu số phình ra với những khoản vay mới chưa thể trễ được, và PAR30 giảm dù không khách nào trả nợ tốt hơn. Mục 7 giải quyết chuyện này.

## 7. Phân tích vintage: so sánh các khoản vay cùng "tuổi"

Một **vintage** (hay **cohort**, nhóm khoản vay cùng lứa) là nhóm khoản vay giải ngân trong cùng một tháng. **MOB** (month on book, số tháng trên sổ) là số tháng đã trôi qua kể từ tháng đó. Bảng vintage đặt vintage theo hàng và MOB theo cột, nên mỗi ô so sánh các khoản vay **ở cùng một tuổi**.

Ô thường dùng nhất là **ever 30+ tại MOB k**: tỷ lệ khoản vay trong vintage đã từng quá hạn hơn 30 ngày vào bất kỳ lúc nào tính đến cuối tháng k. Chữ "ever" (từng) rất quan trọng: khoản vay trễ 45 ngày rồi trả bù vẫn được tính, vì vintage đo cách các khoản vay đã *hành xử*, không phải chúng đang ở đâu hôm nay.

Ở đây MOB k là ngày cuối tháng sau tháng vintage k tháng (với vintage tháng 3/2026, MOB 3 = 30/6/2026). Kỳ trả đầu tiên đến hạn ở MOB 1 và cần thêm 31 ngày mới thành 30+, nên MOB 1 luôn là 0% và bảng bắt đầu từ MOB 2.

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
         date(strftime('%Y-%m-01', l.disbursed_date), '+4 months', '-1 day') AS end_m3,
         date(strftime('%Y-%m-01', l.disbursed_date), '+5 months', '-1 day') AS end_m4,
         date(strftime('%Y-%m-01', l.disbursed_date), '+7 months', '-1 day') AS end_m6
  FROM loans l
  LEFT JOIN first_30 f ON f.loan_id = l.loan_id
)
SELECT vintage,
       COUNT(*) AS loans,
       CASE WHEN end_m2 <= '2026-06-30'  -- only months already observed
            THEN ROUND(100.0 * SUM(hit_30_date <= end_m2) / COUNT(*), 1) END AS mob2,
       CASE WHEN end_m3 <= '2026-06-30'
            THEN ROUND(100.0 * SUM(hit_30_date <= end_m3) / COUNT(*), 1) END AS mob3,
       CASE WHEN end_m4 <= '2026-06-30'
            THEN ROUND(100.0 * SUM(hit_30_date <= end_m4) / COUNT(*), 1) END AS mob4,
       CASE WHEN end_m6 <= '2026-06-30'
            THEN ROUND(100.0 * SUM(hit_30_date <= end_m6) / COUNT(*), 1) END AS mob6
FROM cells
GROUP BY vintage
ORDER BY vintage;
```

| vintage | loans | mob2 | mob3 | mob4 | mob6 |
|---|---|---|---|---|---|
| 2025-07 | 139 | 2.2 | 2.9 | 2.9 | 2.9 |
| 2025-08 | 147 | 0.0 | 0.0 | 0.7 | 1.4 |
| 2025-09 | 148 | 2.7 | 2.7 | 2.7 | 4.1 |
| 2025-10 | 148 | 2.0 | 2.0 | 4.1 | 4.7 |
| 2025-11 | 149 | 2.0 | 3.4 | 3.4 | 5.4 |
| 2025-12 | 171 | 1.2 | 1.8 | 1.8 | 3.5 |
| 2026-01 | 197 | 0.5 | 1.5 | 2.5 | |
| 2026-02 | 218 | 2.8 | 4.1 | 5.0 | |
| 2026-03 | 282 | 3.2 | 7.4 | | |
| 2026-04 | 290 | 4.1 | | | |
| 2026-05 | 231 | | | | |
| 2026-06 | 217 | | | | |

(Query cũng trả về các vintage 2025-01 đến 2025-06; chúng nằm trong cùng khoảng 0–3% ở MOB 2 và 1,6–4,4% ở MOB 3.)

### Đọc bảng

- **Đọc dọc theo cột** để so các vintage ở cùng tuổi. Ở MOB 3, các vintage từ 2025-07 đến 2026-02 dao động từ 0% đến khoảng 4%. Tháng 3/2026 ở mức khoảng 7,4%.
- **Đọc ngang theo hàng** để thấy một vintage già đi. Con số chỉ có thể tăng, vì "ever" không bao giờ quên.
- **Ô trống không phải số 0.** Đó là những tháng vintage chưa đi tới.

### Right-censoring: cái bẫy vintage non trẻ

Dữ liệu về các khoản vay mới bị **right-censored** (bị cắt phía bên phải): tương lai của chúng bị ngày snapshot chặn lại. Hãy so với một phiên bản ngây thơ: với mỗi vintage, tỷ lệ khoản vay đã từng quá hạn hơn 30 ngày vào bất kỳ lúc nào tính đến 2026-06-30 ("ever 30+ so far"), không căn theo MOB:

| vintage | loans | ever30_so_far_pct |
|---|---|---|
| 2026-02 | 218 | 5.0 |
| 2026-03 | 282 | 7.4 |
| 2026-04 | 290 | 4.1 |
| 2026-05 | 231 | 0.0 |
| 2026-06 | 217 | 0.0 |

Tháng 5 và 6 trông hoàn hảo, tháng 4 trông tốt hơn tháng 3. Cả hai đều là ảo giác: khoản vay tháng 5 và 6 chưa thể thành 30+, còn tháng 4 có ít hơn tháng 3 một tháng để xấu đi. Chỉ so các vintage tại MOB mà **tất cả** chúng đã đi tới.

### Cái nhìn đầu tiên về tháng 3 và tháng 4/2026

So ở cùng tuổi, hai vintage mới nhất đo được nổi bật hẳn: ở MOB 2, tháng 3 (3,2%) và tháng 4 (4,1%) cao hơn mọi vintage kể từ tháng 7/2025; ở MOB 3, tháng 3 (7,4%) cao hơn gấp đôi mức thường thấy. Đây cũng là những tháng mà số hồ sơ và approval rate tăng vọt (mục 2). Đó là một *tương quan về thời gian*, chưa phải lời giải thích: cơ cấu kênh, cơ cấu sản phẩm, ngưỡng điểm và nền kinh tế đều có thể góp phần. Cuộc điều tra đầy đủ là case study ở da-08.

> **Góc BA:** acceptance criteria cho một báo cáo vintage có thể viết: "Hàng = tháng giải ngân; cột = MOB 2–12; ô = % khoản vay của vintage từng quá hạn hơn 30 DPD tính đến cuối MOB đó; ô mà vintage chưa đi tới để trống, không ghi 0; định nghĩa DPD và ngày snapshot in ngay dưới bảng."

## 8. Roll rate và cure

Vintage cho biết khoản vay mới xấu đi nhanh cỡ nào. **Roll rate** (tỷ lệ chuyển nhóm) cho biết các khoản đang trễ di chuyển từ bucket này sang bucket kế tiếp ra sao, tháng qua tháng. Lấy mọi khoản vay còn mở tại 2026-05-31, xếp vào bucket ở ngày đó và một lần nữa ở ngày 2026-06-30:

```sql
WITH as_of(tag, d) AS (
  VALUES ('may', '2026-05-31'), ('jun', '2026-06-30')
),
open_loans AS (
  -- loans disbursed and not yet fully repaid on 31 May
  SELECT DISTINCT loan_id FROM repayment_schedule
  WHERE paid_date IS NULL OR paid_date > '2026-05-31'
),
dpd AS (
  SELECT a.tag, o.loan_id,
         COALESCE(CAST(julianday(a.d) - julianday(MIN(r.due_date)) AS INTEGER), 0) AS dpd
  FROM as_of a
  CROSS JOIN open_loans o
  JOIN loans l ON l.loan_id = o.loan_id AND l.disbursed_date <= '2026-05-31'
  LEFT JOIN repayment_schedule r
         ON r.loan_id = o.loan_id
        AND r.due_date < a.d
        AND (r.paid_date IS NULL OR r.paid_date > a.d)
  GROUP BY a.tag, o.loan_id
),
b AS (
  SELECT tag, loan_id,
         CASE WHEN dpd = 0 THEN '0'
              WHEN dpd <= 30 THEN '1-30'
              WHEN dpd <= 60 THEN '31-60'
              WHEN dpd <= 90 THEN '61-90'
              ELSE '90+' END AS bucket
  FROM dpd
)
SELECT m.bucket AS may_bucket,
       COUNT(*) AS loans,
       SUM(j.bucket = '0') AS to_0,
       SUM(j.bucket = '1-30') AS to_1_30,
       SUM(j.bucket = '31-60') AS to_31_60,
       SUM(j.bucket = '61-90') AS to_61_90,
       SUM(j.bucket = '90+') AS to_90p
FROM b m
JOIN b j ON j.loan_id = m.loan_id AND j.tag = 'jun'
WHERE m.tag = 'may'
GROUP BY m.bucket
ORDER BY m.bucket;
```

| may_bucket | loans | to_0 | to_1_30 | to_31_60 | to_61_90 | to_90p |
|---|---|---|---|---|---|---|
| 0 | 1591 | 1523 | 68 | 0 | 0 | 0 |
| 1-30 | 68 | 35 | 9 | 24 | 0 | 0 |
| 31-60 | 20 | 4 | 0 | 1 | 15 | 0 |
| 61-90 | 7 | 0 | 0 | 0 | 0 | 7 |
| 90+ | 48 | 0 | 0 | 0 | 0 | 48 |

Cách đọc **roll rate**: trong 68 khoản ở bucket 1–30 cuối tháng 5, có 24 khoản **roll forward** (trượt xuống) 31–60 (24 ÷ 68 ≈ 35%). Trong 20 khoản ở 31–60, 15 khoản trượt xuống 61–90 (75%), và cả 7 khoản ở 61–90 đều trượt xuống 90+. Khoản vay càng lún sâu thì càng khó quay lại, đó là lý do đội thu hồi nợ dồn sức vào các bucket đầu.

**Cure** (trả bù, quay về trong hạn) là chiều ngược lại: khoản vay đang trễ quay về current. Ở đây 35 trong 68 khoản đang trễ 1–30 ngày (khoảng 51%) đã cure trong tháng 6, nhưng chỉ 4 trong 20 khoản từ 31–60. Tính trên toàn bộ lịch sử, 119 khoản vay từng quá hạn hơn 30 ngày (có kỳ được trả muộn hơn 30 ngày so với ngày đến hạn, hoặc vẫn chưa trả sau 31 ngày trở lên); 21 khoản trong số đó (khoảng 18%) hôm nay không còn kỳ nào quá hạn. Khoản vay 522 là một ví dụ: khoản BNPL 3,1 triệu có hai kỳ đầu được trả muộn 59 và 37 ngày. Đo bằng quy tắc DPD tại ba ngày cuối tháng, nó ở mức 25 DPD ngày 2025-06-30, 56 DPD ngày 2025-07-31, và về 0 ngày 2025-08-31 sau khi khách trả hết phần nợ.

Nhân các roll rate dọc theo chuỗi, bạn có một dự báo thô: trong 100 khoản đang trễ 1–30 hôm nay, khoảng 35 khoản sẽ tới 31–60, khoảng 26 trong số đó tới 61–90, và gần như tất cả số đó tới 90+. Với số đếm nhỏ thế này (7, 20, 68 khoản), hãy coi một tháng chỉ là gợi ý; đội rủi ro thường lấy trung bình roll rate qua nhiều tháng.

## 9. Chấm điểm tín dụng: ngưỡng điểm, DTI và khách thiếu lịch sử

### Điểm và ngưỡng duyệt

**Credit score** (điểm tín dụng, 300–850 ở VayNhanh) xếp hạng người nộp hồ sơ theo rủi ro dự kiến, xây từ dữ liệu bureau như hồ sơ CIC và dữ liệu riêng của công ty. **Cut-off** (ngưỡng điểm) là điểm tối thiểu để được duyệt. Dịch ngưỡng là một bài toán đánh đổi: ngưỡng thấp hơn duyệt được nhiều người hơn **và** nhiều khoản xấu hơn.

Dùng các khoản vay năm 2025, đều đã tới MOB 6, và hỏi: "nếu hồi đó dùng ngưỡng cao hơn thì giữ lại được gì?" (xấu = ever 30+ tại MOB 6; bỏ ra 11 khoản không có điểm):

```sql
WITH first_30 AS (
  SELECT loan_id, MIN(date(due_date, '+31 days')) AS hit_30_date
  FROM repayment_schedule
  WHERE paid_date IS NULL OR paid_date > date(due_date, '+30 days')
  GROUP BY loan_id
),
l25 AS (
  SELECT a.credit_score,
         COALESCE(f.hit_30_date <= date(strftime('%Y-%m-01', l.disbursed_date),
                                        '+7 months', '-1 day'), 0) AS bad
  FROM loans l
  JOIN loan_applications a ON a.application_id = l.application_id
  LEFT JOIN first_30 f ON f.loan_id = l.loan_id
  WHERE l.disbursed_date BETWEEN '2025-01-01' AND '2025-12-31'
    AND a.credit_score IS NOT NULL
)
SELECT c.cutoff,
       SUM(credit_score >= c.cutoff) AS loans_kept,
       ROUND(100.0 * SUM(credit_score >= c.cutoff) / COUNT(*), 1) AS pct_kept,
       SUM(bad AND credit_score >= c.cutoff) AS bad_kept,
       ROUND(100.0 * SUM(bad AND credit_score >= c.cutoff)
             / SUM(credit_score >= c.cutoff), 1) AS bad_rate_pct
FROM l25
CROSS JOIN (SELECT 560 AS cutoff UNION ALL SELECT 600
            UNION ALL SELECT 640 UNION ALL SELECT 680) c
GROUP BY c.cutoff
ORDER BY c.cutoff;
```

| cutoff | loans_kept | pct_kept | bad_kept | bad_rate_pct |
|---|---|---|---|---|
| 560 | 1660 | 100.0 | 59 | 3.6 |
| 600 | 1363 | 82.1 | 28 | 2.1 |
| 640 | 948 | 57.1 | 7 | 0.7 |
| 680 | 560 | 33.7 | 5 | 0.9 |

Nâng từ 560 lên 600 sẽ mất khoảng 18% số khoản vay nhưng loại được hơn một nửa số khoản xấu (59 → 28). Nâng lên 680 cắt hai phần ba khối lượng mà gần như không được thêm gì, và với chỉ 5 khoản xấu thì con số 0,9% chủ yếu là nhiễu. Ngưỡng đúng phụ thuộc vào tiền: lãi thu từ khoản tốt so với gốc mất ở khoản xấu.

Để ý điều bảng này **không** thể cho thấy: điểm thấp nhất trong các khoản vay 2025 là 560, nên không có lịch sử 2025 nào cho người dưới mức đó. Không ai đọc được tỷ lệ xấu của khách 540 điểm từ dữ liệu khoản vay đã duyệt, vì những khách đó đã bị từ chối. Đây là bài toán **reject inference** (suy luận về nhóm bị từ chối). Cách trung thực để biết về một ngưỡng thấp hơn là một thử nghiệm nhỏ, có kiểm soát, với mức lỗ được dự trù trước.

### DTI: khách có kham nổi không?

**DTI** (debt-to-income, tỷ lệ nợ trên thu nhập) = tổng tiền trả nợ hàng tháng ÷ thu nhập hàng tháng. Chị Lan thu nhập 15.000.000 một tháng, đang trả 3.000.000 cho một khoản vay khác, và khoản mới phải trả 1.159.000: DTI = 4.159.000 ÷ 15.000.000 ≈ 27,7%. Bên cho vay đặt mức DTI tối đa, và "đang có một khoản vay khác" cũng được tính vào, đó là lý do `high_dti` là lý do từ chối nhiều nhất ở VayNhanh. Cẩn thận với cột thu nhập: khách tự khai, đôi khi bỏ trống, và da-03 đã tìm thấy giá trị gõ nhầm như 999.999.999, khiến ai trông cũng đủ khả năng trả.

### Khách "thin-file"

Khách **thin-file** (hồ sơ tín dụng mỏng) có rất ít hoặc không có lịch sử tín dụng, nên mô hình không chấm điểm được: 307 trong 6.854 hồ sơ (khoảng 4,5%) có `credit_score` NULL. VayNhanh không duyệt hồ sơ nào trong 184 hồ sơ vay tiền mặt không có điểm, và chỉ duyệt 24 trong 123 hồ sơ BNPL không có điểm. Người trẻ và người vay lần đầu thường là thin-file, nên muốn tăng trưởng thì công ty phải tìm tín hiệu khác (lịch sử ví điện tử, thanh toán hóa đơn, hạn mức nhỏ ban đầu rồi tăng dần khi khách trả tốt).

> **Góc BA:** một yêu cầu kiểu "hạ ngưỡng điểm để tăng số duyệt" cần tối thiểu: số khoản duyệt thêm dự kiến, tỷ lệ xấu tăng thêm dự kiến (kèm lưu ý reject inference), tác động lợi nhuận, thiết kế thử nghiệm có giới hạn quy mô, và báo cáo vintage sẽ dùng để đánh giá kết quả sau 3–6 tháng.

## 10. Bài tập thực hành

Dùng [SQL Practice → Fintech](/practice/sql?db=fintech) cho các bài có SQL.

### Bài 1 — Đọc một funnel

Báo cáo tuần của một kênh đối tác ghi: nộp 420, đang chờ 20, approved 210, cancelled 30, rejected 160. (Ở đây "approved" nghĩa là đã nhận và đã giải ngân, giống VayNhanh.) Tính approval rate và take-up rate.

**Đáp án:** có quyết định = 420 − 20 = 400. Công ty đồng ý = 210 + 30 = 240, nên approval rate = 240 ÷ 400 = 60%. Take-up = 210 ÷ 240 = 87,5%. Nếu chia cho 420 (toàn bộ hồ sơ) sẽ ra 57,1% và vô tình tính hồ sơ đang chờ là "không được duyệt".

### Bài 2 — Tính DPD bằng tay

Lịch trả nợ một khoản vay tiền mặt tại ngày 2026-06-30: kỳ 1 đến hạn 2026-04-20, trả 2026-04-19; kỳ 2 đến hạn 2026-05-20, trả 2026-06-02; kỳ 3 đến hạn 2026-06-20, chưa trả; kỳ 4 đến hạn 2026-07-20, chưa trả. DPD bằng bao nhiêu và thuộc bucket nào?

**Đáp án:** kỳ 2 đã trễ (13 ngày) nhưng đã trả, nên không còn tính. Kỳ chưa trả *đã đến hạn* cũ nhất là kỳ 3 (kỳ 4 chưa đến hạn). DPD = 30/6 − 20/6 = 10 ngày: bucket 1–30.

### Bài 3 — Approval rate theo sản phẩm (SQL)

Viết query tính approval rate của `cash_loan` và `bnpl`, loại hồ sơ pending.

**Đáp án:**

```sql
SELECT product,
       SUM(status <> 'pending') AS decided,
       SUM(status IN ('approved', 'cancelled')) AS approved,
       ROUND(100.0 * SUM(status IN ('approved', 'cancelled'))
             / SUM(status <> 'pending'), 1) AS approval_rate_pct
FROM loan_applications
GROUP BY product;
```

| product | decided | approved | approval_rate_pct |
|---|---|---|---|
| bnpl | 2905 | 1530 | 52.7 |
| cash_loan | 3920 | 1871 | 47.7 |

### Bài 4 — Tìm lỗi

Một đồng nghiệp tính DPD như dưới đây và ra −257 cho khoản vay 2208. Sai ở đâu?

```sql
SELECT loan_id,
       CAST(julianday('2026-06-30') - julianday(MAX(due_date)) AS INTEGER) AS dpd
FROM repayment_schedule
WHERE paid_date IS NULL
  AND loan_id = 2208
GROUP BY loan_id;
```

**Đáp án:** hai lỗi. `MAX(due_date)` lấy kỳ chưa trả *mới nhất* (2027-03-14) thay vì cũ nhất, và điều kiện lọc giữ cả những kỳ chưa đến hạn. Dùng `MIN(due_date)` và thêm `AND due_date < '2026-06-30'`; kết quả thành 47.

### Bài 5 — "BNPL rủi ro gấp ba!"

Một báo cáo snapshot cho thấy tỷ lệ khoản vay đang mở quá hạn hơn 30 ngày: BNPL 9,8% (50 trên 510), vay tiền mặt 3,4% (45 trên 1.306). Trưởng sản phẩm kết luận BNPL rủi ro gấp ba. Hãy kiểm tra bằng góc nhìn vintage cho các khoản vay 2025 (ever 30+ tại MOB 3).

**Đáp án:**

```sql
WITH first_30 AS (
  SELECT loan_id, MIN(date(due_date, '+31 days')) AS hit_30_date
  FROM repayment_schedule
  WHERE paid_date IS NULL OR paid_date > date(due_date, '+30 days')
  GROUP BY loan_id
)
SELECT l.product,
       COUNT(*) AS loans,
       ROUND(100.0 * SUM(f.hit_30_date <= date(strftime('%Y-%m-01', l.disbursed_date),
                                               '+4 months', '-1 day'))
             / COUNT(*), 1) AS ever30_mob3_pct
FROM loans l
LEFT JOIN first_30 f ON f.loan_id = l.loan_id
WHERE l.disbursed_date BETWEEN '2025-01-01' AND '2025-12-31'
GROUP BY l.product;
```

| product | loans | ever30_mob3_pct |
|---|---|---|
| bnpl | 752 | 3.1 |
| cash_loan | 919 | 2.0 |

Ở cùng tuổi, BNPL có xấu hơn một chút, không phải gấp ba. Báo cáo snapshot bị méo vì mẫu số: khoản BNPL chỉ kéo dài 3–6 tháng, nên khoản tốt tất toán rất nhanh (887 khoản BNPL đã đóng) và để lại một danh mục đang mở nhỏ, trong đó khoản xấu chiếm tỷ trọng quá lớn.

### Bài 6 — PAR30 và tỷ lệ số tiền quá hạn

Bốn khoản vay đang mở: A dư nợ 10 triệu, trong hạn; B dư nợ 6 triệu, 15 DPD (quá hạn 1 triệu); C dư nợ 3 triệu, 45 DPD (quá hạn 2 triệu); D dư nợ 1 triệu, 120 DPD (quá hạn 1 triệu). Tính PAR30 và tỷ lệ "số tiền quá hạn ÷ danh mục".

**Đáp án:** danh mục = 20 triệu. PAR30 = (3 + 1) ÷ 20 = 20%. Số tiền quá hạn ÷ danh mục = (1 + 2 + 1) ÷ 20 cũng bằng 20%, nhưng chỉ là trùng hợp; hai chỉ số đo hai thứ khác nhau. PAR30 tính toàn bộ dư nợ của C và D vì cả khoản đang gặp nguy; B hoàn toàn không nằm trong PAR30, vì 15 DPD chưa tới 30.

### Bài 7 — Tình huống với stakeholder

Trưởng kinh doanh nhờ bạn báo cáo rằng vintage tháng 3/2026 "vẫn ổn, ever-30+ của nó bằng vintage tháng 8/2025 ở cùng thời điểm". Tháng 8/2025 ở MOB 3 là 0,0%, tháng 3/2026 là 7,4%. Bạn trả lời thế nào?

**Đáp án:** nhận định này sai theo chính số liệu đang có: ở MOB 3, tháng 3/2026 là 7,4% so với 0,0% của tháng 8/2025 và khoảng 2–4% của hầu hết các vintage. Hãy giải thích rằng phải so ở cùng MOB (và không thể đánh giá vintage non trẻ ở MOB mà nó chưa tới), gửi kèm bảng vintage, và đề xuất theo dõi tháng 3 và tháng 4 ở MOB 4–6 trong lúc tìm nguyên nhân.

## 11. Tóm tắt

- Funnel cho vay có ba tỷ lệ với ba mẫu số: approval (÷ đã có quyết định), take-up (÷ được duyệt) và đầu-cuối (÷ đã nộp). Approval rate tăng không tự động là tin tốt.
- Danh mục cho vay được đo bằng **dư nợ gốc**, không phải tổng giải ngân. Tiền trả góp annuity cố định, nhưng các kỳ đầu chủ yếu là lãi. So giá khoản vay bằng **APR**, đừng bao giờ bằng lãi phẳng theo tháng.
- **DPD** đếm số ngày kể từ kỳ chưa trả đã đến hạn cũ nhất, tại một ngày. Bucket (1–30, 31–60, 61–90, 90+) quyết định cách đội thu hồi nợ làm việc.
- **PAR30** lấy toàn bộ dư nợ của khoản 30+ chia cho toàn danh mục; **NPL** là phần 90+ (hoặc khó thu hồi). Ở Việt Nam, khoản vay được phân vào năm nhóm nợ theo số ngày quá hạn; hãy kiểm tra thông tư hiện hành của NHNN để biết quy tắc.
- Tỷ lệ snapshot bị méo bởi tăng trưởng và bởi các khoản tất toán sớm. Bảng **vintage** so khoản vay ở cùng **MOB**; ô trống là right-censored, không phải số 0. Ở MOB 2–3, vintage tháng 3 và tháng 4/2026 xấu hơn rõ rệt so với trước, và da-08 sẽ điều tra chuyện này.
- **Roll rate** cho thấy khoản trễ di chuyển giữa các bucket thế nào; **cure** cho thấy bao nhiêu khoản quay lại. Hạ **cut-off** là mua thêm khối lượng với cái giá là thêm khoản xấu, và tỷ lệ xấu dưới ngưỡng cũ là điều chưa biết (reject inference). **DTI** kiểm tra khả năng chi trả; khách thin-file cần những tín hiệu khác.

### Thuật ngữ chính

| Thuật ngữ | Nghĩa dễ hiểu |
|---|---|
| Approval rate | Tỷ lệ hồ sơ đã có quyết định được công ty đồng ý |
| Take-up rate | Tỷ lệ offer được duyệt mà khách nhận và được giải ngân |
| Outstanding principal (dư nợ gốc) | Phần gốc khách còn nợ hôm nay |
| Annuity installment | Khoản trả đều hàng tháng gồm lãi cộng một phần gốc |
| APR | Chi phí vay theo năm trên dư nợ giảm dần, thường gồm phí bắt buộc |
| DPD | Số ngày kỳ chưa trả cũ nhất đã quá hạn |
| Bucket | Khoảng DPD, ví dụ 31–60 |
| PAR30 | Dư nợ của khoản quá hạn hơn 30 ngày ÷ tổng dư nợ |
| NPL (nợ xấu) | Khoản vay 90+ DPD hoặc khó thu hồi |
| Vintage / cohort | Các khoản vay giải ngân trong cùng một tháng |
| MOB | Số tháng kể từ tháng của vintage |
| Ever 30+ | Đã từng quá hạn hơn 30 ngày vào bất kỳ lúc nào |
| Right-censoring | Tương lai của khoản vay mới chưa quan sát được |
| Roll rate | Tỷ lệ khoản vay trượt sang bucket tệ hơn kế tiếp |
| Cure | Khoản vay đang trễ quay về trong hạn |
| Write-off (xóa nợ) | Đưa khoản không thu hồi được ra khỏi danh mục |
| Cut-off | Điểm tối thiểu để được duyệt |
| DTI | Tiền trả nợ hàng tháng ÷ thu nhập hàng tháng |
| Thin file | Quá ít lịch sử tín dụng để chấm điểm |

Tiếp theo: **da-07 "Phân tích thanh toán, checkout & ví điện tử"**, nơi cách nghĩ về funnel và tỷ lệ chuyển sang thanh toán thẻ, QR và ví, và bạn sẽ điều tra sự cố OTP tháng 5/2026.
