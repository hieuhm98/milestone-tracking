// Fintech data-analysis exercises for the /practice/questions page.
//
// Same format as exercises.ts (see the authoring notes there), but every
// exercise is a banking / digital-lending / payments scenario, and most are
// solved with SQL against the fintech practice database — open
// /practice/sql?db=fintech to run the model answers.
//
// Every number quoted in an answer comes from running the shown query with
// node scripts/query-fintech.mjs against data/fintech.db (as of 2026-06-30).
// If the seed script changes, re-run the queries and update the tables.

import type { Exercise } from "./exercises";

// ---------------------------------------------------------------------------
// SQL ON fintech.db
// ---------------------------------------------------------------------------

const finApprovalByChannel: Exercise = {
  id: "fin-approval-by-channel",
  category: "fintech",
  difficulty: "easy",
  title: { vi: "Tỷ lệ phê duyệt theo tháng và kênh", en: "Monthly approval rate by channel" },
  prompt: {
    vi: "Trưởng nhóm tín dụng của VayNhanh hỏi: “Tỷ lệ phê duyệt (approval rate) từng tháng, theo từng kênh app / web / partner, từ 12/2025 đến 06/2026 là bao nhiêu?” Viết truy vấn trên bảng loan_applications. Trước khi viết, hãy tự quyết định: mẫu số là gì, đơn đang pending tính thế nào, và đơn cancelled (đã duyệt nhưng khách không nhận tiền) thuộc tử số hay không? Chạy SQL tại /practice/sql?db=fintech.",
    en: "VayNhanh's credit lead asks: “What is the monthly approval rate per channel (app / web / partner) from Dec 2025 to Jun 2026?” Write the query on loan_applications. Before writing, decide: what is the denominator, what happens to pending applications, and does a cancelled application (approved, but the customer never took the money) count as approved? Run SQL at /practice/sql?db=fintech.",
  },
  answer: {
    vi: `## Lời giải mẫu

**Cách tiếp cận**
1. **Mẫu số** = các đơn **đã có quyết định**. Đơn **pending** chưa có kết quả nên phải loại ra — nếu giữ lại, tháng gần nhất sẽ bị kéo tụt một cách giả tạo.
2. **Tử số** = các đơn được duyệt. Trong VayNhanh, **cancelled** nghĩa là "đã duyệt nhưng khách không nhận khoản vay", tức vẫn là một lần duyệt → tính vào tử số. Câu hỏi "bao nhiêu đơn thành khoản vay thật" là một chỉ số khác (**take-up / booking rate**).
3. Nhóm theo tháng nộp đơn và **channel**. Dùng tổng có điều kiện (**conditional aggregation**): trong SQLite, phép so sánh trả về 1 hoặc 0, nên **SUM(status IN (...))** đếm số dòng thỏa điều kiện chỉ trong một lần quét bảng.

    SELECT
      strftime('%Y-%m', applied_at) AS month,
      channel,
      COUNT(*) AS decided,
      SUM(status IN ('approved', 'cancelled')) AS approved,
      ROUND(100.0 * SUM(status IN ('approved', 'cancelled')) / COUNT(*), 1) AS approval_rate_pct
    FROM loan_applications
    WHERE status <> 'pending'          -- only applications with a decision
      AND applied_at >= '2025-12-01'
    GROUP BY month, channel
    ORDER BY month, channel;

**Kết quả (trích)**

| month | channel | decided | approved | approval_rate_pct |
|---|---|---|---|---|
| 2026-02 | app | 309 | 156 | 50.5 |
| 2026-02 | partner | 42 | 26 | 61.9 |
| 2026-02 | web | 105 | 52 | 49.5 |
| 2026-03 | app | 205 | 117 | 57.1 |
| 2026-03 | partner | 296 | 144 | 48.6 |
| 2026-03 | web | 88 | 48 | 54.5 |
| 2026-04 | partner | 282 | 157 | 55.7 |
| 2026-05 | app | 245 | 146 | 59.6 |
| 2026-05 | partner | 51 | 21 | 41.2 |

**Đọc kết quả**
- Kênh app tăng từ khoảng 50% (T1–T2/2026) lên 57,1% (T3) và 59,6% (T5): tỷ lệ duyệt tăng thật **bên trong cùng một kênh** — dấu hiệu chính sách duyệt đã thay đổi từ tháng 3.
- Kênh partner nhảy từ khoảng 40 đơn/tháng lên 296 (T3) và 282 (T4) — một chiến dịch đối tác. Khi một kênh đột ngột chiếm nửa số đơn, tỷ lệ chung của công ty thay đổi vì **cơ cấu kênh**, không chỉ vì chính sách. Vì vậy luôn cắt theo kênh trước khi kết luận.
- Partner dao động mạnh (61,9% → 48,6% → 55,7% → 41,2%) ở những tháng chỉ có 30–50 đơn: mẫu nhỏ thì vài đơn đã đổi vài điểm phần trăm. Đừng đọc quá nhiều vào từng con số lẻ.

**Lỗi thường gặp**
- Chia cho **COUNT(*)** của mọi đơn, kể cả pending.
- Bỏ cancelled khỏi tử số nhưng vẫn để trong mẫu số. Ở cấp toàn công ty tháng 4/2026, cách đó cho 50,9% thay vì 55,1% — hai chỉ số khác nhau mang cùng một cái tên.
- Lưu ý: **applied_at** là giờ UTC. Query trên nhóm theo tháng UTC cho gọn; báo cáo chính thức nên dùng giờ Việt Nam: **strftime('%Y-%m', applied_at, '+7 hours')**.

Thử ngay tại [SQL Practice → Fintech](/practice/sql?db=fintech).`,
    en: `## Model solution

**Approach**
1. **Denominator** = applications that **have a decision**. **Pending** ones have no outcome yet, so drop them — keeping them artificially drags the latest month down.
2. **Numerator** = approved applications. At VayNhanh, **cancelled** means "approved, but the customer never took the loan", so it is still an approval → count it. "How many applications became real loans" is a different metric (**take-up / booking rate**).
3. Group by application month and **channel**. Use **conditional aggregation**: in SQLite a comparison returns 1 or 0, so **SUM(status IN (...))** counts the matching rows in a single pass.

    SELECT
      strftime('%Y-%m', applied_at) AS month,
      channel,
      COUNT(*) AS decided,
      SUM(status IN ('approved', 'cancelled')) AS approved,
      ROUND(100.0 * SUM(status IN ('approved', 'cancelled')) / COUNT(*), 1) AS approval_rate_pct
    FROM loan_applications
    WHERE status <> 'pending'          -- only applications with a decision
      AND applied_at >= '2025-12-01'
    GROUP BY month, channel
    ORDER BY month, channel;

**Result (excerpt)**

| month | channel | decided | approved | approval_rate_pct |
|---|---|---|---|---|
| 2026-02 | app | 309 | 156 | 50.5 |
| 2026-02 | partner | 42 | 26 | 61.9 |
| 2026-02 | web | 105 | 52 | 49.5 |
| 2026-03 | app | 205 | 117 | 57.1 |
| 2026-03 | partner | 296 | 144 | 48.6 |
| 2026-03 | web | 88 | 48 | 54.5 |
| 2026-04 | partner | 282 | 157 | 55.7 |
| 2026-05 | app | 245 | 146 | 59.6 |
| 2026-05 | partner | 51 | 21 | 41.2 |

**How to read it**
- The app channel goes from about 50% (Jan–Feb 2026) to 57.1% (Mar) and 59.6% (May): approvals rose **within the same channel** — a sign the approval policy changed in March.
- Partner volume jumps from about 40 applications a month to 296 (Mar) and 282 (Apr) — a partner campaign. When one channel suddenly makes up half the applications, the company-wide rate moves because of the **channel mix**, not only the policy. Always split by channel before concluding.
- Partner swings a lot (61.9% → 48.6% → 55.7% → 41.2%) in months with only 30–50 applications: with a small sample a handful of applications moves the rate several points. Do not over-read single cells.

**Common mistakes**
- Dividing by **COUNT(*)** of all applications, pending included.
- Dropping cancelled from the numerator but keeping it in the denominator. At company level in April 2026 that gives 50.9% instead of 55.1% — two different metrics sharing one name.
- Note: **applied_at** is UTC. The query groups by UTC month for brevity; an official report should use Vietnam time: **strftime('%Y-%m', applied_at, '+7 hours')**.

Try it at [SQL Practice → Fintech](/practice/sql?db=fintech).`,
  },
};

const finDpdPar30: Exercise = {
  id: "fin-dpd-par30",
  category: "fintech",
  difficulty: "medium",
  title: { vi: "Nhóm DPD và PAR30 tại ngày 30/06/2026", en: "DPD buckets and PAR30 as of 2026-06-30" },
  prompt: {
    vi: "Phòng rủi ro cần ảnh chụp danh mục cho vay tại ngày 2026-06-30: mỗi khoản vay còn dư nợ được xếp vào nhóm số ngày quá hạn (DPD) — current, 1–30, 31–60, 61–90, 90+ — kèm số khoản vay và dư nợ của từng nhóm, rồi tính PAR30. Dùng loans và repayment_schedule. Tự định nghĩa rõ DPD và “dư nợ” trước khi viết SQL. Chạy tại /practice/sql?db=fintech.",
    en: "The risk team wants a snapshot of the loan book as of 2026-06-30: put every loan that still has a balance into a days-past-due (DPD) bucket — current, 1–30, 31–60, 61–90, 90+ — with the number of loans and the outstanding amount per bucket, then compute PAR30. Use loans and repayment_schedule. Define DPD and “outstanding” precisely before writing SQL. Run it at /practice/sql?db=fintech.",
  },
  answer: {
    vi: `## Lời giải mẫu

**Định nghĩa trước, SQL sau**
- **DPD** (days past due) của một khoản vay = số ngày kể từ hạn của kỳ **chưa trả cũ nhất** đã đến hạn tính đến ngày chốt. Khách lỡ kỳ tháng 4 và tháng 5 thì DPD đếm từ kỳ tháng 4 — món nợ quá hạn lâu nhất quyết định độ rủi ro.
- **Dư nợ (outstanding)** ở đây = tổng **amount_due** của các kỳ chưa trả (cả kỳ chưa tới hạn). Con số này gồm cả lãi tương lai; hệ thống thật dùng dư nợ gốc từ sổ cái. Ghi rõ giả định này trong báo cáo.
- **PAR30** (portfolio at risk 30) = dư nợ của các khoản có DPD > 30 / tổng dư nợ. Lưu ý: **toàn bộ** dư nợ của khoản vay đó được tính là "at risk", không chỉ phần đang quá hạn.
- Ngày chốt luôn là chuỗi cố định **'2026-06-30'**, không dùng **date('now')** — nếu không, kết quả thay đổi mỗi ngày bạn chạy lại.

    WITH loan_dpd AS (
      SELECT
        l.loan_id,
        -- days past due = age of the OLDEST unpaid installment that is already due
        COALESCE(MAX(CASE WHEN s.paid_date IS NULL AND s.due_date <= '2026-06-30'
                          THEN julianday('2026-06-30') - julianday(s.due_date) END), 0) AS dpd,
        -- exposure = everything still unpaid on the schedule (due or not yet due)
        SUM(CASE WHEN s.paid_date IS NULL THEN s.amount_due ELSE 0 END) AS outstanding
      FROM loans l
      JOIN repayment_schedule s ON s.loan_id = l.loan_id
      GROUP BY l.loan_id
    ),
    bucketed AS (
      SELECT *,
        CASE
          WHEN dpd = 0   THEN '0 current'
          WHEN dpd <= 30 THEN '1-30'
          WHEN dpd <= 60 THEN '31-60'
          WHEN dpd <= 90 THEN '61-90'
          ELSE '90+'
        END AS bucket
      FROM loan_dpd
      WHERE outstanding > 0          -- fully repaid loans carry no risk
    )
    SELECT
      bucket,
      COUNT(*) AS loans,
      SUM(outstanding) AS outstanding_vnd,
      ROUND(100.0 * SUM(outstanding) / SUM(SUM(outstanding)) OVER (), 1) AS pct_of_book
    FROM bucketed
    GROUP BY bucket
    ORDER BY bucket;

**Kết quả**

| bucket | loans | outstanding_vnd | pct_of_book |
|---|---|---|---|
| 0 current | 1644 | 16088717000 | 91.5 |
| 1-30 | 77 | 615127000 | 3.5 |
| 31-60 | 25 | 187032000 | 1.1 |
| 61-90 | 15 | 164882000 | 0.9 |
| 90+ | 55 | 519994000 | 3 |

PAR30 bằng một query nhỏ trên cùng CTE **loan_dpd**:

    SELECT
      SUM(outstanding) AS total_outstanding,
      SUM(CASE WHEN dpd > 30 THEN outstanding ELSE 0 END) AS outstanding_dpd30plus,
      ROUND(100.0 * SUM(CASE WHEN dpd > 30 THEN outstanding ELSE 0 END) / SUM(outstanding), 2) AS par30_pct,
      ROUND(100.0 * SUM(dpd > 30) / COUNT(*), 2) AS pct_of_loans_30plus
    FROM loan_dpd
    WHERE outstanding > 0;

| total_outstanding | outstanding_dpd30plus | par30_pct | pct_of_loans_30plus |
|---|---|---|---|
| 17575752000 | 871908000 | 4.96 | 5.23 |

**Đọc kết quả**
- Khoảng 17,6 tỷ đồng còn phải thu; 91,5% thuộc các khoản đang trả đúng hạn.
- **PAR30 ≈ 4,96%**: cứ 100 đồng dư nợ thì khoảng 5 đồng nằm ở khoản vay quá hạn trên 30 ngày. Tính theo **số khoản vay** là 5,23% — hai con số khác nhau vì khoản quá hạn có dư nợ trung bình khác khoản đang tốt. Báo cáo rủi ro dùng **theo tiền**.
- 55 khoản ở nhóm 90+ chính là 55 khoản có **status = 'defaulted'** trong bảng loans — một phép kiểm tra chéo cho thấy logic DPD khớp với hệ thống.

**Lỗi thường gặp**
- Lấy DPD từ kỳ chưa trả **gần nhất** (MIN thay vì MAX) → đánh giá thấp rủi ro.
- Coi kỳ **chưa tới hạn** là quá hạn chỉ vì **paid_date IS NULL** — phải có điều kiện **due_date <= '2026-06-30'**.
- Để khoản đã tất toán (dư nợ 0) trong mẫu số → PAR30 bị pha loãng, trông đẹp hơn thực tế.
- Ở Việt Nam, ngân hàng phân loại nợ thành 5 nhóm theo số ngày quá hạn; các nhóm DPD ở đây là cách phân tích nội bộ, ngưỡng pháp lý chính xác cần tra thông tư hiện hành.

Chạy thử tại [SQL Practice → Fintech](/practice/sql?db=fintech).`,
    en: `## Model solution

**Definitions first, SQL second**
- A loan's **DPD** (days past due) = days since the due date of its **oldest unpaid** installment that is already due at the snapshot date. If a customer missed April and May, DPD counts from April — the longest-overdue debt sets the risk.
- **Outstanding** here = the sum of **amount_due** over unpaid installments (including ones not yet due). It includes future interest; a real system uses outstanding principal from the ledger. State this assumption in the report.
- **PAR30** (portfolio at risk 30) = outstanding of loans with DPD > 30 / total outstanding. Note that the **whole** balance of such a loan counts as "at risk", not just the overdue part.
- The snapshot is always the literal **'2026-06-30'**, never **date('now')** — otherwise the answer changes every day you re-run it.

    WITH loan_dpd AS (
      SELECT
        l.loan_id,
        -- days past due = age of the OLDEST unpaid installment that is already due
        COALESCE(MAX(CASE WHEN s.paid_date IS NULL AND s.due_date <= '2026-06-30'
                          THEN julianday('2026-06-30') - julianday(s.due_date) END), 0) AS dpd,
        -- exposure = everything still unpaid on the schedule (due or not yet due)
        SUM(CASE WHEN s.paid_date IS NULL THEN s.amount_due ELSE 0 END) AS outstanding
      FROM loans l
      JOIN repayment_schedule s ON s.loan_id = l.loan_id
      GROUP BY l.loan_id
    ),
    bucketed AS (
      SELECT *,
        CASE
          WHEN dpd = 0   THEN '0 current'
          WHEN dpd <= 30 THEN '1-30'
          WHEN dpd <= 60 THEN '31-60'
          WHEN dpd <= 90 THEN '61-90'
          ELSE '90+'
        END AS bucket
      FROM loan_dpd
      WHERE outstanding > 0          -- fully repaid loans carry no risk
    )
    SELECT
      bucket,
      COUNT(*) AS loans,
      SUM(outstanding) AS outstanding_vnd,
      ROUND(100.0 * SUM(outstanding) / SUM(SUM(outstanding)) OVER (), 1) AS pct_of_book
    FROM bucketed
    GROUP BY bucket
    ORDER BY bucket;

**Result**

| bucket | loans | outstanding_vnd | pct_of_book |
|---|---|---|---|
| 0 current | 1644 | 16088717000 | 91.5 |
| 1-30 | 77 | 615127000 | 3.5 |
| 31-60 | 25 | 187032000 | 1.1 |
| 61-90 | 15 | 164882000 | 0.9 |
| 90+ | 55 | 519994000 | 3 |

PAR30 is a small query on the same **loan_dpd** CTE:

    SELECT
      SUM(outstanding) AS total_outstanding,
      SUM(CASE WHEN dpd > 30 THEN outstanding ELSE 0 END) AS outstanding_dpd30plus,
      ROUND(100.0 * SUM(CASE WHEN dpd > 30 THEN outstanding ELSE 0 END) / SUM(outstanding), 2) AS par30_pct,
      ROUND(100.0 * SUM(dpd > 30) / COUNT(*), 2) AS pct_of_loans_30plus
    FROM loan_dpd
    WHERE outstanding > 0;

| total_outstanding | outstanding_dpd30plus | par30_pct | pct_of_loans_30plus |
|---|---|---|---|
| 17575752000 | 871908000 | 4.96 | 5.23 |

**How to read it**
- About 17.6 billion VND is still to be collected; 91.5% of it sits in loans that are paying on time.
- **PAR30 ≈ 4.96%**: of every 100 VND outstanding, about 5 VND is in loans more than 30 days overdue. By **loan count** it is 5.23% — different because overdue loans have a different average balance from good ones. Risk reporting uses the **money** version.
- The 55 loans in 90+ are exactly the 55 loans with **status = 'defaulted'** in loans — a cross-check that the DPD logic agrees with the system.

**Common mistakes**
- Taking DPD from the **latest** unpaid installment (MIN instead of MAX) → understates risk.
- Treating a **not-yet-due** installment as overdue just because **paid_date IS NULL** — you need **due_date <= '2026-06-30'**.
- Leaving fully repaid loans (balance 0) in the denominator → PAR30 is diluted and looks better than reality.
- In Vietnam, banks classify debt into five groups by days overdue; the DPD buckets here are an internal analytics view — check the current circular for the exact regulatory thresholds.

Try it at [SQL Practice → Fintech](/practice/sql?db=fintech).`,
  },
};

const finVintageEver30: Exercise = {
  id: "fin-vintage-ever30",
  category: "fintech",
  difficulty: "hard",
  title: { vi: "Vintage: tỷ lệ ever-30+ tại tháng thứ 3", en: "Vintage analysis: ever-30+ at month-on-book 3" },
  prompt: {
    vi: "Nhóm rủi ro muốn so sánh chất lượng các lứa giải ngân (vintage) từ 07/2025 đến 06/2026: với mỗi tháng giải ngân, bao nhiêu % khoản vay đã từng quá hạn trên 30 ngày tính đến tháng thứ 3 sau giải ngân (ever-30+ @ MOB3)? Chú ý: các vintage gần đây chưa “đủ tuổi” để quan sát tới MOB3 tại ngày 2026-06-30 — xử lý thế nào cho đúng? Giải thích vì sao phải so sánh theo vintage thay vì nhìn tỷ lệ nợ xấu của cả danh mục. Chạy SQL tại /practice/sql?db=fintech.",
    en: "The risk team wants to compare the quality of monthly disbursement cohorts (vintages) from Jul 2025 to Jun 2026: for each disbursement month, what % of loans had ever been more than 30 days past due by their third month on book (ever-30+ @ MOB3)? Careful: recent vintages are not yet “old enough” to be observed at MOB3 on 2026-06-30 — how do you handle that correctly? Explain why you compare by vintage instead of looking at the whole book's bad rate. Run SQL at /practice/sql?db=fintech.",
  },
  answer: {
    vi: `## Lời giải mẫu

**Vì sao phải dùng vintage?** Tỷ lệ nợ xấu của cả danh mục trộn lẫn khoản vay mới (chưa kịp xấu) với khoản vay cũ. Khi công ty giải ngân nhiều hơn, mẫu số phình ra bằng các khoản "non" và tỷ lệ chung trông **tốt lên** đúng lúc chất lượng có thể đang **xấu đi**. Vintage so sánh các lứa **ở cùng độ tuổi** (MOB — month on book), nên công bằng.

**Cách tiếp cận**
1. Mỗi khoản vay: **vintage** = tháng giải ngân; mốc quan sát = **disbursed_date + 3 tháng**.
2. Khoản vay "ever-30+ @ MOB3" nếu có một kỳ mà **hạn + 30 ngày** rơi trước mốc quan sát và kỳ đó chưa trả, hoặc trả sau hạn + 30 ngày.
3. **Khả năng quan sát**: chỉ khi mốc quan sát **≤ 2026-06-30** ta mới biết kết quả. Khoản chưa tới mốc thì **không phải 0** — nó là "chưa biết" và phải bị loại khỏi cả tử lẫn mẫu.

    WITH loan_flag AS (
      SELECT
        l.loan_id,
        strftime('%Y-%m', l.disbursed_date) AS vintage,
        date(l.disbursed_date, '+3 months') <= '2026-06-30' AS observable,
        -- 1 if, by MOB3, some installment had been unpaid for more than 30 days
        MAX(CASE
              WHEN date(s.due_date, '+30 days') < date(l.disbursed_date, '+3 months')
               AND (s.paid_date IS NULL OR s.paid_date > date(s.due_date, '+30 days'))
              THEN 1 ELSE 0
            END) AS ever30
      FROM loans l
      JOIN repayment_schedule s ON s.loan_id = l.loan_id
      GROUP BY l.loan_id
    )
    SELECT
      vintage,
      COUNT(*) AS loans,
      SUM(observable) AS observable_loans,
      SUM(ever30 * observable) AS ever30_loans,
      ROUND(100.0 * SUM(ever30 * observable) / NULLIF(SUM(observable), 0), 1) AS ever30_mob3_pct
    FROM loan_flag
    WHERE vintage >= '2025-07'
    GROUP BY vintage
    ORDER BY vintage;

**Kết quả (trích)**

| vintage | loans | observable_loans | ever30_loans | ever30_mob3_pct |
|---|---|---|---|---|
| 2025-07 | 139 | 139 | 3 | 2.2 |
| 2025-08 | 147 | 147 | 1 | 0.7 |
| 2025-11 | 149 | 149 | 5 | 3.4 |
| 2026-01 | 197 | 197 | 3 | 1.5 |
| 2026-02 | 218 | 218 | 6 | 2.8 |
| 2026-03 | 282 | 267 | 21 | 7.9 |
| 2026-04 | 290 | 0 | 0 | NULL |
| 2026-05 | 231 | 0 | 0 | NULL |
| 2026-06 | 217 | 0 | 0 | NULL |

**Đọc kết quả**
- Các vintage 07/2025 – 02/2026 dao động trong khoảng 0,7% – 3,4%. Vintage 03/2026 nhảy lên **7,9%** (21/267 khoản quan sát được) — gấp khoảng 2–4 lần. Mỗi vintage cũ chỉ có 1–6 khoản xấu nên chênh 1 điểm là nhiễu; nhưng 7,9% thì vượt xa nhiễu.
- 03/2026 trùng với thời điểm chính sách duyệt thay đổi (01/03/2026) và chiến dịch kênh partner. Đây là **tín hiệu sớm**: chưa đợi tới khi nợ thành 90+ mới phát hiện.
- 04/2026 trở đi hiển thị **NULL**, không phải 0: ta chưa biết. Vintage 04/2026 sẽ quan sát được ở MOB3 từ tháng 7 — đặt lịch xem lại.
- 15 khoản của vintage 03/2026 chưa quan sát được (giải ngân 31/03: cộng 3 tháng thành 01/07 trong SQLite).

**Lỗi thường gặp**
- **Quên điều kiện quan sát được.** Phiên bản đầu tiên của query này (chưa có cột **observable**) cho vintage 05/2026 tới **219/231 khoản "xấu"** — vì kỳ chưa tới hạn có **paid_date IS NULL** và bị đếm như đã quá hạn. Một con số kinh hoàng nhưng hoàn toàn sai.
- Coi vintage chưa đủ tuổi là 0% → biểu đồ vintage "đẹp dần" về cuối, che giấu đúng chỗ đáng lo nhất.
- So sánh vintage ở **MOB khác nhau** (lứa cũ ở MOB 12, lứa mới ở MOB 3) — không so sánh được.

Chạy và đổi MOB3 thành MOB2 hay MOB6 tại [SQL Practice → Fintech](/practice/sql?db=fintech).`,
    en: `## Model solution

**Why vintages?** The whole book's bad rate mixes young loans (which have not had time to go bad) with old ones. When the company lends more, the denominator fills up with "fresh" loans and the overall rate looks **better** exactly when quality may be getting **worse**. A vintage view compares cohorts **at the same age** (MOB — month on book), which is fair.

**Approach**
1. Per loan: **vintage** = disbursement month; observation point = **disbursed_date + 3 months**.
2. A loan is "ever-30+ @ MOB3" if some installment whose **due date + 30 days** falls before the observation point was still unpaid, or was paid more than 30 days late.
3. **Observability**: we only know the outcome if the observation point is **≤ 2026-06-30**. A loan that has not reached it is **not 0** — it is "unknown" and must leave both numerator and denominator.

    WITH loan_flag AS (
      SELECT
        l.loan_id,
        strftime('%Y-%m', l.disbursed_date) AS vintage,
        date(l.disbursed_date, '+3 months') <= '2026-06-30' AS observable,
        -- 1 if, by MOB3, some installment had been unpaid for more than 30 days
        MAX(CASE
              WHEN date(s.due_date, '+30 days') < date(l.disbursed_date, '+3 months')
               AND (s.paid_date IS NULL OR s.paid_date > date(s.due_date, '+30 days'))
              THEN 1 ELSE 0
            END) AS ever30
      FROM loans l
      JOIN repayment_schedule s ON s.loan_id = l.loan_id
      GROUP BY l.loan_id
    )
    SELECT
      vintage,
      COUNT(*) AS loans,
      SUM(observable) AS observable_loans,
      SUM(ever30 * observable) AS ever30_loans,
      ROUND(100.0 * SUM(ever30 * observable) / NULLIF(SUM(observable), 0), 1) AS ever30_mob3_pct
    FROM loan_flag
    WHERE vintage >= '2025-07'
    GROUP BY vintage
    ORDER BY vintage;

**Result (excerpt)**

| vintage | loans | observable_loans | ever30_loans | ever30_mob3_pct |
|---|---|---|---|---|
| 2025-07 | 139 | 139 | 3 | 2.2 |
| 2025-08 | 147 | 147 | 1 | 0.7 |
| 2025-11 | 149 | 149 | 5 | 3.4 |
| 2026-01 | 197 | 197 | 3 | 1.5 |
| 2026-02 | 218 | 218 | 6 | 2.8 |
| 2026-03 | 282 | 267 | 21 | 7.9 |
| 2026-04 | 290 | 0 | 0 | NULL |
| 2026-05 | 231 | 0 | 0 | NULL |
| 2026-06 | 217 | 0 | 0 | NULL |

**How to read it**
- Vintages Jul 2025 – Feb 2026 sit between 0.7% and 3.4%. The Mar 2026 vintage jumps to **7.9%** (21 of 267 observable loans) — roughly 2–4× higher. Each older vintage has only 1–6 bad loans, so a one-point difference is noise; 7.9% is far beyond it.
- March 2026 coincides with the approval-policy change (2026-03-01) and the partner-channel campaign. This is an **early warning**: you do not wait for loans to hit 90+ to see it.
- April 2026 onwards shows **NULL**, not 0: we do not know yet. The April vintage becomes observable at MOB3 in July — schedule the re-check.
- 15 loans of the March vintage are not observable yet (disbursed on 31 March; adding 3 months gives 1 July in SQLite).

**Common mistakes**
- **Forgetting observability.** The first version of this query (without the **observable** column) showed the May 2026 vintage at **219 of 231 loans "bad"** — because installments not yet due have **paid_date IS NULL** and were counted as missed. A scary number and completely wrong.
- Treating immature vintages as 0% → the vintage chart "improves" towards the end, hiding exactly the place to worry about.
- Comparing vintages at **different MOBs** (old cohorts at MOB 12, new at MOB 3) — not comparable.

Run it and switch MOB3 to MOB2 or MOB6 at [SQL Practice → Fintech](/practice/sql?db=fintech).`,
  },
};

const finPaymentSuccessTrend: Exercise = {
  id: "fin-payment-success-trend",
  category: "fintech",
  difficulty: "medium",
  title: { vi: "Tỷ lệ thanh toán thành công theo phương thức, thiết bị và tuần", en: "Payment success rate by method, device and week" },
  prompt: {
    vi: "Bộ phận CSKH nhận nhiều phàn nàn “thanh toán thẻ không được” vào giữa tháng 5/2026. Trên bảng payments: (1) tính tỷ lệ thanh toán thành công theo method × device từ 01/04/2026; (2) vẽ xu hướng theo tuần (từ 06/04 đến 14/06/2026) cho nhóm card + android so với mọi giao dịch còn lại; (3) tìm lý do thất bại trong tuần bất thường. Nêu rõ: trạng thái refunded và pending tính thế nào? Chạy SQL tại /practice/sql?db=fintech.",
    en: "Customer support gets many “my card payment won't go through” complaints in mid-May 2026. On payments: (1) compute the payment success rate by method × device since 2026-04-01; (2) build a weekly trend (6 Apr – 14 Jun 2026) for card + android versus everything else; (3) find the failure reason in the abnormal week. Be explicit: how do refunded and pending rows count? Run SQL at /practice/sql?db=fintech.",
  },
  answer: {
    vi: `## Lời giải mẫu

**Định nghĩa**
- **Thành công** = **success** hoặc **refunded**. Một giao dịch bị hoàn tiền sau đó **đã thanh toán thành công** lúc diễn ra; hoàn tiền là một sự kiện khác. Đếm refunded là thất bại sẽ làm ngành hàng có nhiều đổi trả (thời trang) trông như cổng thanh toán tệ.
- **pending** chưa có kết quả → loại khỏi mẫu số.

**Bước 1 — phương thức × thiết bị**

    SELECT
      method,
      device,
      COUNT(*) AS attempts,
      ROUND(100.0 * SUM(status IN ('success', 'refunded')) / COUNT(*), 1) AS success_rate_pct
    FROM payments
    WHERE status <> 'pending'
      AND created_at >= '2026-04-01'
    GROUP BY method, device
    ORDER BY method, device;

| method | device | attempts | success_rate_pct |
|---|---|---|---|
| card | android | 377 | 88.3 |
| card | ios | 202 | 91.6 |
| card | web | 140 | 92.9 |
| e_wallet | android | 245 | 90.2 |
| qr_code | ios | 119 | 99.2 |

Card + android thấp nhất (88,3%) — nhưng đây là trung bình cả quý, chưa cho biết vấn đề xảy ra khi nào.

**Bước 2 — xu hướng theo tuần**

    SELECT
      date(created_at, '-6 days', 'weekday 1') AS week_start,   -- Monday of that week
      SUM(method = 'card' AND device = 'android') AS card_android_attempts,
      ROUND(100.0 * SUM(method = 'card' AND device = 'android' AND status IN ('success', 'refunded'))
            / SUM(method = 'card' AND device = 'android'), 1) AS card_android_pct,
      ROUND(100.0 * SUM(NOT (method = 'card' AND device = 'android') AND status IN ('success', 'refunded'))
            / SUM(NOT (method = 'card' AND device = 'android')), 1) AS everything_else_pct
    FROM payments
    WHERE status <> 'pending'
      AND created_at >= '2026-04-06' AND created_at < '2026-06-15'
    GROUP BY week_start
    ORDER BY week_start;

| week_start | card_android_attempts | card_android_pct | everything_else_pct |
|---|---|---|---|
| 2026-04-27 | 30 | 90 | 97.3 |
| 2026-05-04 | 24 | 91.7 | 91.3 |
| 2026-05-11 | 23 | 43.5 | 94.1 |
| 2026-05-18 | 29 | 89.7 | 92.8 |
| 2026-05-25 | 40 | 90 | 91.2 |

**Bước 3 — lý do thất bại** trong tuần 11–17/05: chạy **GROUP BY failure_reason** cho card + android với **status = 'failed'** → cả **13** giao dịch thất bại đều là **otp_timeout**.

**Đọc kết quả**
- Tuần bắt đầu 11/05, card + android rơi xuống **43,5%** trong khi mọi nhóm khác vẫn ở 94,1%. Chỉ một phương thức trên một nền tảng, chỉ một tuần, lý do toàn là **otp_timeout** → rất giống sự cố của nhà cung cấp SMS-OTP chứ không phải khách hàng hay ngân hàng.
- Mỗi tuần chỉ có 23–40 giao dịch card + android: 83% của một tuần thường là dao động bình thường; 43,5% thì không.
- Hành động: gửi bằng chứng cho đội kỹ thuật/đối tác OTP, đề xuất cảnh báo tự động theo **phương thức × thiết bị** (cảnh báo tổng sẽ bỏ lỡ, vì 23 giao dịch chìm giữa hàng trăm giao dịch khác).

**Lỗi thường gặp**
- Tính tuần bằng **date(created_at, 'weekday 1', '-7 days')**: với giao dịch đúng ngày thứ Hai, kết quả lùi về thứ Hai **tuần trước**. Cách đúng là **'-6 days', 'weekday 1'**. Luôn kiểm tra vài ngày biên.
- Chỉ nhìn tỷ lệ tổng: sự cố cục bộ bị pha loãng.
- **created_at** là UTC; nếu cần ranh giới ngày theo giờ Việt Nam, cộng **'+7 hours'** trước khi cắt ngày.

Chạy thử tại [SQL Practice → Fintech](/practice/sql?db=fintech).`,
    en: `## Model solution

**Definitions**
- **Success** = **success** or **refunded**. A payment that is refunded later **did succeed** at the time; the refund is a separate event. Counting refunded as failed makes categories with many returns (fashion) look like a broken gateway.
- **pending** has no outcome yet → leave it out of the denominator.

**Step 1 — method × device**

    SELECT
      method,
      device,
      COUNT(*) AS attempts,
      ROUND(100.0 * SUM(status IN ('success', 'refunded')) / COUNT(*), 1) AS success_rate_pct
    FROM payments
    WHERE status <> 'pending'
      AND created_at >= '2026-04-01'
    GROUP BY method, device
    ORDER BY method, device;

| method | device | attempts | success_rate_pct |
|---|---|---|---|
| card | android | 377 | 88.3 |
| card | ios | 202 | 91.6 |
| card | web | 140 | 92.9 |
| e_wallet | android | 245 | 90.2 |
| qr_code | ios | 119 | 99.2 |

Card + android is the lowest (88.3%) — but this is a quarter average and does not say when the problem happened.

**Step 2 — weekly trend**

    SELECT
      date(created_at, '-6 days', 'weekday 1') AS week_start,   -- Monday of that week
      SUM(method = 'card' AND device = 'android') AS card_android_attempts,
      ROUND(100.0 * SUM(method = 'card' AND device = 'android' AND status IN ('success', 'refunded'))
            / SUM(method = 'card' AND device = 'android'), 1) AS card_android_pct,
      ROUND(100.0 * SUM(NOT (method = 'card' AND device = 'android') AND status IN ('success', 'refunded'))
            / SUM(NOT (method = 'card' AND device = 'android')), 1) AS everything_else_pct
    FROM payments
    WHERE status <> 'pending'
      AND created_at >= '2026-04-06' AND created_at < '2026-06-15'
    GROUP BY week_start
    ORDER BY week_start;

| week_start | card_android_attempts | card_android_pct | everything_else_pct |
|---|---|---|---|
| 2026-04-27 | 30 | 90 | 97.3 |
| 2026-05-04 | 24 | 91.7 | 91.3 |
| 2026-05-11 | 23 | 43.5 | 94.1 |
| 2026-05-18 | 29 | 89.7 | 92.8 |
| 2026-05-25 | 40 | 90 | 91.2 |

**Step 3 — failure reason** for 11–17 May: a **GROUP BY failure_reason** on card + android with **status = 'failed'** → all **13** failures are **otp_timeout**.

**How to read it**
- In the week starting 11 May, card + android drops to **43.5%** while everything else stays at 94.1%. One method, one platform, one week, and the reason is always **otp_timeout** → this looks like an SMS-OTP provider incident, not customers or banks.
- Each week has only 23–40 card + android attempts: 83% in one week is ordinary noise; 43.5% is not.
- Action: send the evidence to engineering / the OTP partner, and propose automatic alerts by **method × device** (a company-wide alert would miss it — 23 attempts vanish among hundreds).

**Common mistakes**
- Bucketing weeks with **date(created_at, 'weekday 1', '-7 days')**: for a payment made on a Monday, that returns the **previous** Monday. The right form is **'-6 days', 'weekday 1'**. Always test a few boundary days.
- Only watching the overall rate: a local incident gets diluted.
- **created_at** is UTC; if you need Vietnam-time day boundaries, add **'+7 hours'** before cutting the date.

Try it at [SQL Practice → Fintech](/practice/sql?db=fintech).`,
  },
};

const finDoubleCharges: Exercise = {
  id: "fin-double-charges",
  category: "fintech",
  difficulty: "medium",
  title: { vi: "Tìm giao dịch bị trừ tiền hai lần", en: "Find double charges" },
  prompt: {
    vi: "Một khách gọi tổng đài: “Tôi mua một lần mà bị trừ tiền hai lần.” Bạn nghi ứng dụng đã gửi lại (retry) một yêu cầu thanh toán vốn đã thành công. Viết SQL trên bảng payments để tìm mọi cặp giao dịch trùng: cùng khách, cùng merchant, cùng số tiền, cả hai success, cách nhau không quá 60 giây. Có bao nhiêu cặp, tổng tiền bị trừ thừa bao nhiêu, và có cách nào kiểm tra chéo con số đó? Chạy SQL tại /practice/sql?db=fintech.",
    en: "A customer calls: “I bought once but was charged twice.” You suspect the app retried a payment request that had already succeeded. Write SQL on payments to find every duplicate pair: same customer, same merchant, same amount, both success, at most 60 seconds apart. How many pairs, how much was overcharged, and how can you cross-check that number? Run SQL at /practice/sql?db=fintech.",
  },
  answer: {
    vi: `## Lời giải mẫu

**Cách tiếp cận** — **self-join**: ghép bảng payments với chính nó, điều kiện là "cùng khách, cùng merchant, cùng số tiền, dòng sau mới hơn dòng trước và cách nhau ≤ 60 giây". Điều kiện **b.payment_id > a.payment_id** để mỗi cặp chỉ xuất hiện một lần (không có cả (A,B) lẫn (B,A), cũng không ghép một dòng với chính nó).

    SELECT
      a.payment_id AS original_id,
      b.payment_id AS duplicate_id,
      a.customer_id,
      a.merchant_id,
      a.amount,
      a.method,
      a.created_at,
      CAST(ROUND((julianday(b.created_at) - julianday(a.created_at)) * 86400) AS INTEGER) AS seconds_apart
    FROM payments a
    JOIN payments b
      ON  b.customer_id = a.customer_id
      AND b.merchant_id = a.merchant_id
      AND b.amount      = a.amount
      AND b.payment_id  > a.payment_id                       -- each pair once
      AND julianday(b.created_at) - julianday(a.created_at) BETWEEN 0 AND 60.0 / 86400
    WHERE a.status = 'success'
      AND b.status = 'success'
    ORDER BY a.created_at;

**Kết quả (5 dòng đầu)**

| original_id | duplicate_id | customer_id | merchant_id | amount | method | created_at | seconds_apart |
|---|---|---|---|---|---|---|---|
| 52 | 7625 | 3751 | 20 | 134000 | qr_code | 2025-07-03 15:55:59 | 2 |
| 77 | 7594 | 1227 | 12 | 122000 | bank_transfer | 2025-07-05 10:01:38 | 5 |
| 352 | 7616 | 653 | 1 | 1366000 | qr_code | 2025-07-20 13:39:07 | 5 |
| 591 | 7626 | 1370 | 21 | 157000 | card | 2025-08-02 03:46:57 | 2 |
| 821 | 7610 | 2129 | 8 | 368000 | card | 2025-08-15 15:01:33 | 2 |

Thay phần SELECT bằng **COUNT(*) AS pairs, SUM(a.amount) AS overcharged_vnd, SUM(a.session_id = b.session_id) AS same_session** → **37 cặp**, **20.103.000 đồng** bị trừ thừa, và **cả 37** cặp có cùng **session_id**. Khoảng cách giữa hai lần trừ là 1–8 giây.

**Kiểm tra chéo** — hai nguồn độc lập phải khớp nhau:
- **payments** có 7.630 dòng, nhưng **checkout_events** chỉ có 7.593 phiên đi tới bước **submit_payment**. Chênh lệch đúng **37**.
- Đếm session có hơn một payment (**GROUP BY session_id HAVING COUNT(*) > 1**) cũng ra 37.

**Tại sao quan trọng**
- Mỗi cặp là một khách bị trừ tiền oan → phải hoàn tiền chủ động, trước khi khách khiếu nại hay đòi **chargeback** qua ngân hàng.
- Bản trùng làm **GMV**, doanh thu phí và tỷ lệ thành công bị thổi phồng.
- Nguyên nhân gốc: thiếu **idempotency key** — yêu cầu thanh toán gửi lại phải được nhận diện là "đã xử lý" thay vì trừ tiền lần nữa. Đó là yêu cầu cho đội kỹ thuật, không chỉ là việc dọn dữ liệu.

**Lỗi thường gặp**
- Thiếu **b.payment_id > a.payment_id** → mỗi dòng tự ghép với chính nó, mỗi cặp bị đếm hai lần.
- Cửa sổ thời gian quá rộng (cả ngày) có thể bắt nhầm hai lần mua thật (hai ly trà sữa cùng giá trong một ngày). Hãy dùng thêm bằng chứng mạnh như **session_id** trùng.
- Tự **DELETE** bản trùng trong dữ liệu nguồn: không bao giờ sửa nguồn; đánh dấu, báo cáo và để quy trình hoàn tiền xử lý.

Chạy thử tại [SQL Practice → Fintech](/practice/sql?db=fintech).`,
    en: `## Model solution

**Approach** — a **self-join**: join payments to itself on "same customer, same merchant, same amount, the second row is newer and at most 60 seconds later". The condition **b.payment_id > a.payment_id** makes each pair appear once (no (A,B) and (B,A), and no row matched with itself).

    SELECT
      a.payment_id AS original_id,
      b.payment_id AS duplicate_id,
      a.customer_id,
      a.merchant_id,
      a.amount,
      a.method,
      a.created_at,
      CAST(ROUND((julianday(b.created_at) - julianday(a.created_at)) * 86400) AS INTEGER) AS seconds_apart
    FROM payments a
    JOIN payments b
      ON  b.customer_id = a.customer_id
      AND b.merchant_id = a.merchant_id
      AND b.amount      = a.amount
      AND b.payment_id  > a.payment_id                       -- each pair once
      AND julianday(b.created_at) - julianday(a.created_at) BETWEEN 0 AND 60.0 / 86400
    WHERE a.status = 'success'
      AND b.status = 'success'
    ORDER BY a.created_at;

**Result (first 5 rows)**

| original_id | duplicate_id | customer_id | merchant_id | amount | method | created_at | seconds_apart |
|---|---|---|---|---|---|---|---|
| 52 | 7625 | 3751 | 20 | 134000 | qr_code | 2025-07-03 15:55:59 | 2 |
| 77 | 7594 | 1227 | 12 | 122000 | bank_transfer | 2025-07-05 10:01:38 | 5 |
| 352 | 7616 | 653 | 1 | 1366000 | qr_code | 2025-07-20 13:39:07 | 5 |
| 591 | 7626 | 1370 | 21 | 157000 | card | 2025-08-02 03:46:57 | 2 |
| 821 | 7610 | 2129 | 8 | 368000 | card | 2025-08-15 15:01:33 | 2 |

Replace the SELECT list with **COUNT(*) AS pairs, SUM(a.amount) AS overcharged_vnd, SUM(a.session_id = b.session_id) AS same_session** → **37 pairs**, **20,103,000 VND** overcharged, and **all 37** pairs share the same **session_id**. The two charges are 1–8 seconds apart.

**Cross-check** — two independent sources must agree:
- **payments** has 7,630 rows, but **checkout_events** has only 7,593 sessions that reached **submit_payment**. The gap is exactly **37**.
- Counting sessions with more than one payment (**GROUP BY session_id HAVING COUNT(*) > 1**) also gives 37.

**Why it matters**
- Each pair is a customer charged for nothing → refund proactively, before they complain or raise a **chargeback** through their bank.
- The duplicates inflate **GMV**, fee revenue and the success rate.
- Root cause: no **idempotency key** — a retried payment request should be recognised as "already processed" instead of charging again. That is a requirement for engineering, not just a data clean-up.

**Common mistakes**
- Forgetting **b.payment_id > a.payment_id** → every row matches itself and each pair is counted twice.
- A window that is too wide (a whole day) can catch two genuine purchases (two bubble teas at the same price on one day). Use stronger evidence such as a shared **session_id**.
- **DELETE**-ing the duplicates in the source data: never edit the source; flag them, report them and let the refund process handle them.

Try it at [SQL Practice → Fintech](/practice/sql?db=fintech).`,
  },
};

const finWalletRecon: Exercise = {
  id: "fin-wallet-recon",
  category: "fintech",
  difficulty: "medium",
  title: { vi: "Đối soát số dư ví với lịch sử giao dịch", en: "Wallet reconciliation: balance vs ledger" },
  prompt: {
    vi: "Bảng wallets lưu số dư hiện tại (balance) do dịch vụ ví ghi. Bảng wallet_transactions lưu mọi giao dịch (amount có dấu: tiền vào > 0, tiền ra < 0). Nguyên tắc: số dư phải bằng tổng các giao dịch thành công. Viết SQL liệt kê mọi ví lệch, kèm số dư lưu, số dư tính lại và chênh lệch. Chú ý: ví chưa có giao dịch nào thì sao? Giao dịch failed thì sao? Chạy SQL tại /practice/sql?db=fintech.",
    en: "wallets stores the current balance written by the wallet service. wallet_transactions stores every transaction (signed amount: money in > 0, money out < 0). Rule: the balance must equal the sum of the successful transactions. Write SQL that lists every wallet that breaks the rule, with stored balance, recomputed balance and difference. Watch out: what about wallets with no transactions at all? And failed transactions? Run SQL at /practice/sql?db=fintech.",
  },
  answer: {
    vi: `## Lời giải mẫu

**Cách tiếp cận**
1. Tính lại số dư từ sổ giao dịch (**ledger**): tổng **amount** chỉ của dòng **success** — giao dịch failed không làm tiền di chuyển.
2. **LEFT JOIN** từ wallets sang kết quả đó, và **COALESCE(..., 0)**: ví không có giao dịch nào thì số dư đúng phải là 0.
3. Giữ lại các ví có chênh lệch khác 0, sắp xếp theo độ lớn chênh lệch.

    WITH ledger AS (
      SELECT
        wallet_id,
        SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END) AS ledger_balance
      FROM wallet_transactions
      GROUP BY wallet_id
    )
    SELECT
      w.wallet_id,
      w.status,
      w.balance AS stored_balance,
      COALESCE(l.ledger_balance, 0) AS ledger_balance,
      w.balance - COALESCE(l.ledger_balance, 0) AS difference
    FROM wallets w
    LEFT JOIN ledger l ON l.wallet_id = w.wallet_id
    WHERE w.balance <> COALESCE(l.ledger_balance, 0)
    ORDER BY ABS(w.balance - COALESCE(l.ledger_balance, 0)) DESC;

**Kết quả**

| wallet_id | status | stored_balance | ledger_balance | difference |
|---|---|---|---|---|
| 1499 | active | 1000000 | 0 | 1000000 |
| 377 | closed | 200000 | 0 | 200000 |
| 1150 | active | 1311000 | 1111000 | 200000 |
| 12 | active | 7741000 | 7666000 | 75000 |
| 1733 | closed | 180000 | 105000 | 75000 |
| 801 | active | 5450000 | 5500000 | -50000 |

**Đọc kết quả**
- **6 ví lệch** trên tổng 2.235 ví. Chênh lệch dương = ví "có nhiều tiền hơn sổ sách" → khách có thể tiêu số tiền không tồn tại (rủi ro mất tiền cho công ty). Chênh âm (ví 801) = khách bị thiếu 50.000 đồng → rủi ro khiếu nại.
- Ví **1499** và **377** **không có giao dịch nào** nhưng lại có số dư — loại lệch nghiêm trọng nhất, vì không có dấu vết tiền đến từ đâu.
- Mỗi dòng lệch cần: người phụ trách, nguyên nhân, cách xử lý (bút toán điều chỉnh có phê duyệt), không bao giờ sửa thẳng số dư.

**Lỗi thường gặp (đều đã chạy thử)**
- Dùng **JOIN** thường thay vì LEFT JOIN: chỉ tìm thấy **4** ví lệch — hai ví không có giao dịch biến mất khỏi kết quả, đúng hai ví đáng lo nhất.
- Cộng cả giao dịch failed (**SUM(amount)** không lọc status): **1.035** ví bị báo lệch — báo động giả hàng loạt, khiến người đọc bỏ qua cả 6 lỗi thật.
- So sánh số dư ở hai thời điểm khác nhau (số dư chốt lúc 23:59 với giao dịch tới 00:05 hôm sau). Đối soát thật luôn chốt cùng một mốc thời gian.

Chạy thử tại [SQL Practice → Fintech](/practice/sql?db=fintech).`,
    en: `## Model solution

**Approach**
1. Recompute the balance from the transaction **ledger**: the sum of **amount** over **success** rows only — a failed transaction moves no money.
2. **LEFT JOIN** from wallets to that result, with **COALESCE(..., 0)**: a wallet with no transactions should have a balance of 0.
3. Keep wallets whose difference is not 0, sorted by the size of the difference.

    WITH ledger AS (
      SELECT
        wallet_id,
        SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END) AS ledger_balance
      FROM wallet_transactions
      GROUP BY wallet_id
    )
    SELECT
      w.wallet_id,
      w.status,
      w.balance AS stored_balance,
      COALESCE(l.ledger_balance, 0) AS ledger_balance,
      w.balance - COALESCE(l.ledger_balance, 0) AS difference
    FROM wallets w
    LEFT JOIN ledger l ON l.wallet_id = w.wallet_id
    WHERE w.balance <> COALESCE(l.ledger_balance, 0)
    ORDER BY ABS(w.balance - COALESCE(l.ledger_balance, 0)) DESC;

**Result**

| wallet_id | status | stored_balance | ledger_balance | difference |
|---|---|---|---|---|
| 1499 | active | 1000000 | 0 | 1000000 |
| 377 | closed | 200000 | 0 | 200000 |
| 1150 | active | 1311000 | 1111000 | 200000 |
| 12 | active | 7741000 | 7666000 | 75000 |
| 1733 | closed | 180000 | 105000 | 75000 |
| 801 | active | 5450000 | 5500000 | -50000 |

**How to read it**
- **6 broken wallets** out of 2,235. A positive difference = the wallet "holds more than the books say" → the customer could spend money that does not exist (a loss for the company). A negative one (wallet 801) = the customer is 50,000 VND short → a complaint waiting to happen.
- Wallets **1499** and **377** have **no transactions at all** yet hold a balance — the most serious kind of break, because there is no trace of where the money came from.
- Each break needs an owner, a root cause and a fix (an approved adjusting entry) — never overwrite the balance directly.

**Common mistakes (all tested)**
- Using a plain **JOIN** instead of LEFT JOIN: you find only **4** breaks — the two wallets without transactions disappear, and they are the two that matter most.
- Summing failed transactions too (**SUM(amount)** with no status filter): **1,035** wallets look broken — mass false alarms that bury the 6 real ones.
- Comparing a balance and transactions taken at different moments (balance snapped at 23:59, transactions up to 00:05 next day). Real reconciliation always uses one cut-off time.

Try it at [SQL Practice → Fintech](/practice/sql?db=fintech).`,
  },
};

const finGmvVnTime: Exercise = {
  id: "fin-gmv-vn-time",
  category: "fintech",
  difficulty: "easy",
  title: { vi: "GMV theo ngày giờ Việt Nam quanh 11.11 và 12.12", en: "Daily GMV in Vietnam time around 11.11 and 12.12" },
  prompt: {
    vi: "Marketing muốn biết GMV (tổng giá trị giao dịch) mỗi ngày quanh hai đợt sale 11.11 và 12.12 năm 2025 (từ 09–13/11 và 10–14/12). Mọi thời gian trong payments là UTC, còn khách mua theo giờ Việt Nam (UTC+7). Viết SQL tính số đơn và GMV theo ngày giờ Việt Nam, đặt cạnh GMV theo ngày UTC để thấy khác biệt. Giao dịch nào được tính vào GMV? Chạy SQL tại /practice/sql?db=fintech.",
    en: "Marketing wants daily GMV (gross merchandise value) around the 11.11 and 12.12 sales of 2025 (9–13 Nov and 10–14 Dec). Every timestamp in payments is UTC, but customers shop on Vietnam time (UTC+7). Write SQL for orders and GMV per Vietnam-time day, next to GMV per UTC day to see the difference. Which payments count towards GMV? Run SQL at /practice/sql?db=fintech.",
  },
  answer: {
    vi: `## Lời giải mẫu

**Cách tiếp cận**
- **GMV** = tổng giá trị các giao dịch đã bán được: **success** và cả **refunded** (đơn đã bán, hoàn tiền là sự kiện sau). Không tính failed hay pending. Muốn "GMV ròng" thì trừ hoàn tiền — nhưng phải đặt tên khác và ghi rõ.
- Đổi sang ngày Việt Nam bằng **date(created_at, '+7 hours')**. Mọi giao dịch từ 00:00 đến 06:59 sáng giờ Việt Nam nằm ở **ngày hôm trước** theo UTC.

    WITH paid AS (
      SELECT created_at, amount
      FROM payments
      WHERE status IN ('success', 'refunded')      -- GMV counts every completed sale
    ),
    vn AS (
      SELECT date(created_at, '+7 hours') AS day, COUNT(*) AS orders, SUM(amount) AS gmv_vn
      FROM paid
      GROUP BY day
    ),
    utc AS (
      SELECT date(created_at) AS day, SUM(amount) AS gmv_utc
      FROM paid
      GROUP BY day
    )
    SELECT vn.day, vn.orders, vn.gmv_vn, utc.gmv_utc
    FROM vn
    LEFT JOIN utc ON utc.day = vn.day
    WHERE vn.day BETWEEN '2025-11-09' AND '2025-11-13'
       OR vn.day BETWEEN '2025-12-10' AND '2025-12-14'
    ORDER BY vn.day;

**Kết quả**

| day | orders | gmv_vn | gmv_utc |
|---|---|---|---|
| 2025-11-09 | 19 | 18621000 | 16792000 |
| 2025-11-10 | 25 | 34153000 | 40511000 |
| 2025-11-11 | 54 | 45147000 | 39947000 |
| 2025-11-12 | 18 | 11169000 | 9308000 |
| 2025-11-13 | 17 | 14293000 | 14874000 |
| 2025-12-10 | 14 | 8488000 | 7287000 |
| 2025-12-11 | 21 | 16593000 | 16984000 |
| 2025-12-12 | 47 | 27507000 | 33571000 |
| 2025-12-13 | 21 | 16011000 | 9761000 |
| 2025-12-14 | 19 | 16798000 | 23000000 |

**Đọc kết quả**
- Theo giờ Việt Nam, 11.11 có **54 đơn** — khoảng gấp đôi đến gấp ba các ngày xung quanh (17–25 đơn); 12.12 có 47 đơn.
- Theo ngày UTC, 10/11 (40,5 triệu) gần như ngang 11/11 (39,9 triệu) — đỉnh sale bị "san" sang hôm trước. 13/12 theo UTC chỉ còn 9,8 triệu thay vì 16,0 triệu. Cùng dữ liệu, hai câu chuyện khác nhau.
- Số đơn mỗi ngày chỉ vài chục, nên vài đơn điện tử giá trị lớn đổi chỗ đã làm GMV một ngày lệch hàng triệu đồng. Nhìn cả **số đơn** lẫn **GMV**.

**Lỗi thường gặp**
- Dùng **date(created_at)** cho báo cáo ngày — đó là ngày UTC, không phải ngày khách và merchant trải nghiệm.
- Cộng 7 giờ vào giờ nhưng quên rằng bộ lọc **WHERE created_at >= '2025-11-11'** vẫn đang là UTC. Lọc trên cột ngày đã quy đổi (như **vn.day** ở trên).
- Tính failed vào GMV → "GMV" tăng đúng lúc cổng thanh toán đang lỗi.

Chạy thử tại [SQL Practice → Fintech](/practice/sql?db=fintech).`,
    en: `## Model solution

**Approach**
- **GMV** = the value of completed sales: **success** plus **refunded** (the sale happened; the refund is a later event). Leave out failed and pending. If you want "net GMV", subtract refunds — but give it a different name and say so.
- Convert to the Vietnam date with **date(created_at, '+7 hours')**. Every payment between 00:00 and 06:59 Vietnam time sits on the **previous day** in UTC.

    WITH paid AS (
      SELECT created_at, amount
      FROM payments
      WHERE status IN ('success', 'refunded')      -- GMV counts every completed sale
    ),
    vn AS (
      SELECT date(created_at, '+7 hours') AS day, COUNT(*) AS orders, SUM(amount) AS gmv_vn
      FROM paid
      GROUP BY day
    ),
    utc AS (
      SELECT date(created_at) AS day, SUM(amount) AS gmv_utc
      FROM paid
      GROUP BY day
    )
    SELECT vn.day, vn.orders, vn.gmv_vn, utc.gmv_utc
    FROM vn
    LEFT JOIN utc ON utc.day = vn.day
    WHERE vn.day BETWEEN '2025-11-09' AND '2025-11-13'
       OR vn.day BETWEEN '2025-12-10' AND '2025-12-14'
    ORDER BY vn.day;

**Result**

| day | orders | gmv_vn | gmv_utc |
|---|---|---|---|
| 2025-11-09 | 19 | 18621000 | 16792000 |
| 2025-11-10 | 25 | 34153000 | 40511000 |
| 2025-11-11 | 54 | 45147000 | 39947000 |
| 2025-11-12 | 18 | 11169000 | 9308000 |
| 2025-11-13 | 17 | 14293000 | 14874000 |
| 2025-12-10 | 14 | 8488000 | 7287000 |
| 2025-12-11 | 21 | 16593000 | 16984000 |
| 2025-12-12 | 47 | 27507000 | 33571000 |
| 2025-12-13 | 21 | 16011000 | 9761000 |
| 2025-12-14 | 19 | 16798000 | 23000000 |

**How to read it**
- In Vietnam time, 11.11 has **54 orders** — roughly two to three times the days around it (17–25); 12.12 has 47.
- By UTC day, 10 Nov (40.5 million) is almost level with 11 Nov (39.9 million) — the sale peak gets smeared into the day before. 13 Dec by UTC shows only 9.8 million instead of 16.0 million. Same data, two different stories.
- Daily volumes are only a few dozen orders, so a couple of big electronics tickets moving across midnight shifts a day's GMV by millions. Look at **orders** and **GMV** together.

**Common mistakes**
- Using **date(created_at)** for a daily report — that is the UTC day, not the day customers and merchants experienced.
- Shifting the time by 7 hours but forgetting that a filter like **WHERE created_at >= '2025-11-11'** is still UTC. Filter on the converted date column (like **vn.day** above).
- Counting failed payments in GMV → "GMV" goes up exactly when the gateway is failing.

Try it at [SQL Practice → Fintech](/practice/sql?db=fintech).`,
  },
};

const finRepeatBorrowers: Exercise = {
  id: "fin-repeat-borrowers",
  category: "fintech",
  difficulty: "hard",
  title: { vi: "Khoản vay đầu tiên và khách vay lặp lại (window function)", en: "First loan and repeat borrowers (window functions)" },
  prompt: {
    vi: "Ban giám đốc hỏi: “Bao nhiêu % khách quay lại vay lần hai? Khách vay lặp lại có khoản vay đầu nhỏ hơn không? Và tỷ lệ quay lại đang tốt lên hay xấu đi?” Dùng bảng loans và window function (ROW_NUMBER, COUNT OVER) để: (1) lấy khoản vay đầu tiên của mỗi khách; (2) so sánh khách chỉ vay một lần với khách vay lặp lại; (3) tính tỷ lệ quay lại theo quý của khoản vay đầu. Có bẫy gì khi so sánh các quý? Chạy SQL tại /practice/sql?db=fintech.",
    en: "Management asks: “What % of customers come back for a second loan? Do repeat borrowers start with smaller loans? Is the repeat rate getting better or worse?” Use loans and window functions (ROW_NUMBER, COUNT OVER) to: (1) get each customer's first loan; (2) compare one-time borrowers with repeat borrowers; (3) compute the repeat rate by the quarter of the first loan. What trap lies in comparing quarters? Run SQL at /practice/sql?db=fintech.",
  },
  answer: {
    vi: `## Lời giải mẫu

**Cách tiếp cận** — **window function** tính trên một "cửa sổ" các dòng liên quan mà **không gộp** dòng như GROUP BY:
- **ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY disbursed_date, loan_id)** đánh số 1, 2, 3… các khoản vay của mỗi khách theo thời gian. Khoản số 1 là khoản đầu tiên. Thêm **loan_id** vào ORDER BY để hai khoản cùng ngày vẫn có thứ tự cố định.
- **COUNT(*) OVER (PARTITION BY customer_id)** gắn tổng số khoản vay của khách lên **mọi** dòng của khách đó.

**Bước 1–2**

    WITH numbered AS (
      SELECT
        loan_id,
        customer_id,
        principal,
        disbursed_date,
        ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY disbursed_date, loan_id) AS loan_seq,
        COUNT(*)     OVER (PARTITION BY customer_id) AS loans_per_customer
      FROM loans
    )
    SELECT
      CASE WHEN loans_per_customer = 1 THEN 'one loan only' ELSE 'repeat borrower' END AS segment,
      COUNT(*) AS customers,
      ROUND(AVG(principal)) AS avg_first_principal,
      ROUND(AVG(loans_per_customer), 2) AS avg_loans
    FROM numbered
    WHERE loan_seq = 1               -- one row per customer: their first loan
    GROUP BY segment;

| segment | customers | avg_first_principal | avg_loans |
|---|---|---|---|
| one loan only | 1374 | 11510262 | 1 |
| repeat borrower | 734 | 9861308 | 2.36 |

→ 734 / 2.108 khách ≈ **34,8%** đã vay lại. Khách vay lặp lại bắt đầu với khoản đầu trung bình khoảng **9,9 triệu**, thấp hơn khách vay một lần (khoảng **11,5 triệu**) — gợi ý "bắt đầu nhỏ, xây dựng niềm tin".

**Bước 3 — theo quý của khoản vay đầu**

    WITH numbered AS (
      SELECT
        customer_id,
        disbursed_date,
        ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY disbursed_date, loan_id) AS loan_seq,
        COUNT(*)     OVER (PARTITION BY customer_id) AS loans_per_customer
      FROM loans
    )
    SELECT
      strftime('%Y', disbursed_date) || '-Q' || ((CAST(strftime('%m', disbursed_date) AS INTEGER) + 2) / 3) AS first_loan_quarter,
      COUNT(*) AS new_borrowers,
      SUM(loans_per_customer > 1) AS came_back,
      ROUND(100.0 * SUM(loans_per_customer > 1) / COUNT(*), 1) AS repeat_pct
    FROM numbered
    WHERE loan_seq = 1
    GROUP BY first_loan_quarter
    ORDER BY first_loan_quarter;

| first_loan_quarter | new_borrowers | came_back | repeat_pct |
|---|---|---|---|
| 2025-Q1 | 331 | 228 | 68.9 |
| 2025-Q2 | 300 | 184 | 61.3 |
| 2025-Q3 | 291 | 136 | 46.7 |
| 2025-Q4 | 311 | 99 | 31.8 |
| 2026-Q1 | 439 | 63 | 14.4 |
| 2026-Q2 | 436 | 24 | 5.5 |

**Đọc kết quả — cái bẫy**
- Tỷ lệ "rơi" từ 68,9% xuống 5,5%, nhưng **không** có nghĩa khách mới tệ hơn. Khách vay lần đầu ở 2026-Q2 mới có vài tuần để quay lại; thường họ còn đang trả khoản đầu. Đây là **dữ liệu bị cắt phải (right-censoring)** — giống vintage chưa đủ tuổi.
- So sánh công bằng: "tỷ lệ quay lại **trong vòng N tháng** kể từ khoản đầu", chỉ tính những khách đã có đủ N tháng tính tới 2026-06-30. (Thử: đổi điều kiện thành khoản thứ hai giải ngân trong vòng 6 tháng và chỉ lấy khách có khoản đầu trước 2026-01-01.)
- Con số 34,8% tổng cũng bị kéo xuống bởi các khách mới — báo cáo nên ghi rõ "tính tới 30/06/2026".

**Lỗi thường gặp**
- Lấy khoản đầu bằng **MIN(disbursed_date)** rồi JOIN ngược lại bảng loans: hai khoản cùng ngày sẽ nhân đôi dòng. ROW_NUMBER tránh được.
- Quên **PARTITION BY** → đánh số trên toàn bảng, không theo khách.
- Lọc **WHERE loan_seq = 1** ngay trong CTE đánh số: không được, vì window function tính sau WHERE — phải lọc ở bước ngoài như trên.

Chạy thử tại [SQL Practice → Fintech](/practice/sql?db=fintech).`,
    en: `## Model solution

**Approach** — a **window function** computes over a "window" of related rows **without collapsing** them like GROUP BY does:
- **ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY disbursed_date, loan_id)** numbers each customer's loans 1, 2, 3… in time order. Number 1 is the first loan. Adding **loan_id** to the ORDER BY gives two same-day loans a stable order.
- **COUNT(*) OVER (PARTITION BY customer_id)** puts the customer's total loan count on **every** one of their rows.

**Steps 1–2**

    WITH numbered AS (
      SELECT
        loan_id,
        customer_id,
        principal,
        disbursed_date,
        ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY disbursed_date, loan_id) AS loan_seq,
        COUNT(*)     OVER (PARTITION BY customer_id) AS loans_per_customer
      FROM loans
    )
    SELECT
      CASE WHEN loans_per_customer = 1 THEN 'one loan only' ELSE 'repeat borrower' END AS segment,
      COUNT(*) AS customers,
      ROUND(AVG(principal)) AS avg_first_principal,
      ROUND(AVG(loans_per_customer), 2) AS avg_loans
    FROM numbered
    WHERE loan_seq = 1               -- one row per customer: their first loan
    GROUP BY segment;

| segment | customers | avg_first_principal | avg_loans |
|---|---|---|---|
| one loan only | 1374 | 11510262 | 1 |
| repeat borrower | 734 | 9861308 | 2.36 |

→ 734 of 2,108 customers ≈ **34.8%** borrowed again. Repeat borrowers started with a smaller first loan on average (about **9.9 million** vs about **11.5 million** for one-time borrowers) — a hint of "start small, build trust".

**Step 3 — by quarter of the first loan**

    WITH numbered AS (
      SELECT
        customer_id,
        disbursed_date,
        ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY disbursed_date, loan_id) AS loan_seq,
        COUNT(*)     OVER (PARTITION BY customer_id) AS loans_per_customer
      FROM loans
    )
    SELECT
      strftime('%Y', disbursed_date) || '-Q' || ((CAST(strftime('%m', disbursed_date) AS INTEGER) + 2) / 3) AS first_loan_quarter,
      COUNT(*) AS new_borrowers,
      SUM(loans_per_customer > 1) AS came_back,
      ROUND(100.0 * SUM(loans_per_customer > 1) / COUNT(*), 1) AS repeat_pct
    FROM numbered
    WHERE loan_seq = 1
    GROUP BY first_loan_quarter
    ORDER BY first_loan_quarter;

| first_loan_quarter | new_borrowers | came_back | repeat_pct |
|---|---|---|---|
| 2025-Q1 | 331 | 228 | 68.9 |
| 2025-Q2 | 300 | 184 | 61.3 |
| 2025-Q3 | 291 | 136 | 46.7 |
| 2025-Q4 | 311 | 99 | 31.8 |
| 2026-Q1 | 439 | 63 | 14.4 |
| 2026-Q2 | 436 | 24 | 5.5 |

**How to read it — the trap**
- The rate "falls" from 68.9% to 5.5%, but that does **not** mean newer customers are worse. Someone whose first loan was in 2026-Q2 has had only weeks to come back, and is usually still repaying the first loan. This is **right-censored data** — the same problem as an immature vintage.
- A fair comparison: "repeat rate **within N months** of the first loan", counting only customers who have had a full N months by 2026-06-30. (Try it: require the second loan within 6 months and keep only customers whose first loan is before 2026-01-01.)
- The overall 34.8% is also dragged down by recent customers — label it "as of 2026-06-30".

**Common mistakes**
- Finding the first loan with **MIN(disbursed_date)** and joining back to loans: two loans on the same day duplicate the row. ROW_NUMBER avoids that.
- Forgetting **PARTITION BY** → numbering runs over the whole table, not per customer.
- Filtering **WHERE loan_seq = 1** inside the numbering CTE: not allowed, because window functions are computed after WHERE — filter in the outer step as above.

Try it at [SQL Practice → Fintech](/practice/sql?db=fintech).`,
  },
};

// ---------------------------------------------------------------------------
// ANALYSIS & REASONING (little or no SQL)
// ---------------------------------------------------------------------------

const finKpiCardSuccessRate: Exercise = {
  id: "fin-kpi-card-success-rate",
  category: "fintech",
  difficulty: "easy",
  title: { vi: "Thẻ định nghĩa KPI: tỷ lệ thanh toán thành công", en: "KPI definition card: payment success rate" },
  prompt: {
    vi: "Ba nhóm (sản phẩm, vận hành, tài chính) đều báo cáo “payment success rate” nhưng ra ba con số khác nhau. Bạn là BA được giao viết một thẻ định nghĩa KPI (KPI card) duy nhất cho chỉ số này: tên, mục đích, công thức, grain (một dòng = gì), bộ lọc / loại trừ, phân rã (breakdown), nguồn dữ liệu, tần suất, người sở hữu, ngưỡng cảnh báo. Giải thích vì sao từng lựa chọn quan trọng. Có thể thử các định nghĩa trên bảng payments tại /practice/sql?db=fintech.",
    en: "Three teams (product, operations, finance) all report “payment success rate” but get three different numbers. As the BA, write one KPI definition card for it: name, purpose, formula, grain (one row = what), filters / exclusions, breakdowns, data source, refresh, owner, alert threshold. Explain why each choice matters. You can try the definitions on payments at /practice/sql?db=fintech.",
  },
  answer: {
    vi: `## Lời giải mẫu

**Vì sao ba nhóm ra ba số?** Vì mỗi người âm thầm chọn mẫu số khác nhau. Trên dữ liệu VayNhanh, cùng một tên chỉ số cho các kết quả sau (đã chạy trên bảng payments):

| Phiên bản | attempts | success_rate_pct |
|---|---|---|
| Mọi dòng | 7630 | 91.63 |
| Bỏ pending | 7612 | 91.84 |
| Bỏ pending + 37 bản trùng | 7575 | 91.8 |
| Bỏ pending + bản trùng + insufficient_funds | 7360 | 94.48 |

Chênh gần 3 điểm phần trăm chỉ vì định nghĩa. KPI card tồn tại để chấm dứt chuyện đó.

**KPI card**

| Mục | Nội dung |
|---|---|
| Tên | Payment success rate (tỷ lệ thanh toán thành công) — kỹ thuật |
| Mục đích | Đo sức khỏe của luồng thanh toán: cổng, ngân hàng, OTP, mạng |
| Công thức | Số lần thanh toán thành công / số lần thanh toán đã có kết quả |
| Grain | Một **lần thanh toán duy nhất** (một payment, đã gộp các retry trùng của cùng phiên) |
| Tử số | status IN ('success', 'refunded') — hoàn tiền là sự kiện sau, không phải thất bại |
| Loại trừ | pending (chưa có kết quả); bản trùng do retry; giao dịch test |
| Phiên bản phụ | "Tỷ lệ thành công kỹ thuật" bỏ thêm lỗi do khách (insufficient_funds) — **ghi rõ tên khác** |
| Phân rã | method × device × ngân hàng phát hành; theo giờ / ngày giờ Việt Nam |
| Nguồn | Bảng payments (hệ thống thanh toán), không lấy từ sự kiện tracking ở app |
| Tần suất | Gần thời gian thực cho cảnh báo; báo cáo ngày theo giờ Việt Nam |
| Người sở hữu | Product owner của mảng Payments (một người, có tên) |
| Ngưỡng cảnh báo | Ví dụ: một nhóm method × device thấp hơn trung bình 4 tuần quá X điểm, với tối thiểu N giao dịch |

**Tại sao từng dòng quan trọng**
- **Grain**: đếm theo phiên checkout hay theo lần thử? Khách thử thẻ 3 lần rồi thành công: theo lần thử là 1/3, theo phiên là 1/1. Cả hai đều có ích, nhưng phải chọn một cho KPI này.
- **Loại trừ có tên**: ai cũng thấy được tại sao con số khác số "thô".
- **Ngưỡng có số mẫu tối thiểu**: tuần có 23 giao dịch sẽ dao động mạnh; không có N tối thiểu thì cảnh báo kêu liên tục.
- **Owner**: khi con số tụt, phải biết ai cần hành động.

**Lỗi thường gặp**
- Cùng tên, khác công thức giữa các dashboard.
- Bỏ lỗi "do khách" mà không nói → con số đẹp nhưng không ai biết.
- Không có phân rã → sự cố cục bộ (một phương thức trên một nền tảng) bị trung bình hóa và biến mất.`,
    en: `## Model solution

**Why do three teams get three numbers?** Because each quietly picks a different denominator. On VayNhanh data the same metric name gives these results (run on payments):

| Version | attempts | success_rate_pct |
|---|---|---|
| All rows | 7630 | 91.63 |
| Exclude pending | 7612 | 91.84 |
| Exclude pending + 37 duplicates | 7575 | 91.8 |
| Exclude pending + duplicates + insufficient_funds | 7360 | 94.48 |

Almost 3 percentage points of difference purely from definitions. A KPI card exists to end that.

**KPI card**

| Field | Content |
|---|---|
| Name | Payment success rate — technical |
| Purpose | Measure the health of the payment flow: gateway, banks, OTP, network |
| Formula | Successful payments / payments with an outcome |
| Grain | One **unique payment** (one payment row, with duplicate retries of the same session merged) |
| Numerator | status IN ('success', 'refunded') — a refund is a later event, not a failure |
| Exclusions | pending (no outcome yet); retry duplicates; test transactions |
| Variant | "Technical success rate" that also excludes customer-caused failures (insufficient_funds) — **under a different name** |
| Breakdowns | method × device × issuing bank; by hour / Vietnam-time day |
| Source | payments table (the payment system), not app tracking events |
| Refresh | Near real time for alerts; daily report in Vietnam time |
| Owner | The Payments product owner (one named person) |
| Alert | e.g. a method × device segment more than X points below its 4-week average, with at least N payments |

**Why each line matters**
- **Grain**: count per checkout session or per attempt? A customer tries a card 3 times and then succeeds: per attempt it is 1/3, per session 1/1. Both are useful, but this KPI must pick one.
- **Named exclusions**: everyone can see why the number differs from the "raw" one.
- **A threshold with a minimum sample**: a week with 23 payments swings a lot; without a minimum N the alert fires all the time.
- **Owner**: when the number drops, someone specific must act.

**Common mistakes**
- Same name, different formula across dashboards.
- Excluding "customer-caused" failures without saying so → a nicer number nobody can explain.
- No breakdowns → a local incident (one method on one platform) is averaged away.`,
  },
};

const finBnplLaunchRequirements: Exercise = {
  id: "fin-bnpl-launch-requirements",
  category: "fintech",
  difficulty: "medium",
  title: { vi: "Yêu cầu dữ liệu & báo cáo cho ra mắt BNPL ở checkout", en: "Data & report requirements for a BNPL checkout launch" },
  prompt: {
    vi: "VayNhanh sắp đưa “Mua trước trả sau” (BNPL) thành một lựa chọn ngay ở bước thanh toán của các merchant. Bạn là BA: hãy viết yêu cầu dữ liệu và báo cáo cho đợt ra mắt — câu hỏi kinh doanh cần trả lời, sự kiện và trường dữ liệu phải ghi, KPI (cả tăng trưởng lẫn rủi ro), báo cáo nào cho ai với tần suất nào, và tiêu chí nghiệm thu (acceptance criteria). Gợi ý: xem các bảng payments, loans, checkout_events tại /practice/sql?db=fintech — dữ liệu hiện tại có thiếu gì để trả lời các câu hỏi đó không?",
    en: "VayNhanh is about to offer Buy Now Pay Later (BNPL) as an option right at merchants' payment step. As the BA, write the data & reporting requirements for the launch — the business questions to answer, the events and fields to capture, the KPIs (growth and risk), which reports go to whom and how often, and acceptance criteria. Hint: look at payments, loans and checkout_events at /practice/sql?db=fintech — is anything missing today to answer those questions?",
  },
  answer: {
    vi: `## Lời giải mẫu

**1. Câu hỏi kinh doanh (bắt đầu từ đây, không phải từ bảng)**
- BNPL có làm **tăng tỷ lệ chuyển đổi** checkout và **giá trị đơn trung bình (AOV)** không?
- Bao nhiêu khách **đủ điều kiện**, bao nhiêu được **duyệt ngay tại checkout**, bao nhiêu **chọn** BNPL?
- Khoản BNPL có **trả đúng hạn** không — đặc biệt kỳ đầu tiên?
- Mỗi merchant và mỗi ngành hàng đem lại **doanh thu phí** bao nhiêu so với **tổn thất tín dụng**?

**2. Sự kiện và trường dữ liệu cần ghi**

| Sự kiện | Trường chính |
|---|---|
| bnpl_offer_shown | session_id, customer_id, merchant_id, amount, device, thời gian UTC |
| bnpl_eligibility_checked | kết quả (eligible / not), lý do, hạn mức, credit_score, phiên bản chính sách |
| bnpl_selected | session_id, kỳ hạn chọn (3 / 6 tháng) |
| bnpl_decision | approved / rejected, reject_reason, decided_at |
| payment | payment_id, method = bnpl, status, failure_reason |
| loan_created | loan_id, **application_id**, **payment_id / session_id**, principal, term |
| installment due / paid | như repayment_schedule |
| refund | refund_id, payment_id, amount — và **ảnh hưởng tới khoản vay** (giảm dư nợ) |

**Khoảng trống trên dữ liệu hiện tại**: bảng payments đã có 416 giao dịch **method = 'bnpl'**, bảng loans có **product = 'bnpl'**, nhưng **không có khóa nào nối một payment BNPL với khoản vay của nó** (loans không có payment_id hay session_id). Vì vậy không thể trả lời "checkout BNPL nào thành khoản vay nào, khoản đó trả nợ ra sao". Đây là yêu cầu số 1 cho đội kỹ thuật.

**3. KPI**
- Tăng trưởng: tỷ lệ hiển thị BNPL; tỷ lệ chọn BNPL trên phiên được hiển thị; tỷ lệ duyệt tại checkout; chuyển đổi checkout (nhóm có BNPL so với nhóm đối chứng); AOV; GMV qua BNPL; doanh thu MDR.
- Rủi ro: **FPD** (first payment default — quá hạn ngay kỳ đầu), ever-30+ theo vintage tại MOB 1/2/3, tỷ lệ hoàn tiền trên đơn BNPL, tỷ lệ gian lận.
- Vận hành: tỷ lệ thanh toán thành công của BNPL, thời gian ra quyết định.

**4. Báo cáo**

| Báo cáo | Người đọc | Tần suất |
|---|---|---|
| Sức khỏe luồng BNPL (lỗi, thời gian quyết định) | Vận hành, kỹ thuật | Gần thời gian thực + cảnh báo |
| Funnel & chuyển đổi theo merchant / thiết bị | Sản phẩm, kinh doanh | Hằng ngày / tuần |
| Vintage, FPD, roll rate | Rủi ro | Hằng tuần / tháng |
| Doanh thu phí so với tổn thất | Tài chính, ban giám đốc | Hằng tháng |

**5. Tiêu chí nghiệm thu (ví dụ)**
- Mọi khoản vay BNPL có đúng một **payment_id** hợp lệ; tỷ lệ khoản vay không nối được = 0.
- Mọi sự kiện có **session_id**, **customer_id**, thời gian UTC; báo cáo ngày quy đổi sang giờ Việt Nam.
- Tổng GMV BNPL trên báo cáo khớp tổng payments method = 'bnpl' (success + refunded) cho cùng kỳ.
- Từ chối luôn có **reject_reason**; lưu **phiên bản chính sách** để biết thay đổi cut-off ảnh hưởng tới đâu.

**Vì sao làm vậy**: rủi ro của BNPL chỉ lộ ra sau 1–3 tháng; nếu không nối được checkout ↔ khoản vay ngay từ ngày đầu thì không bao giờ đánh giá được "tăng trưởng này có đáng giá không".`,
    en: `## Model solution

**1. Business questions (start here, not from tables)**
- Does BNPL **raise checkout conversion** and **average order value (AOV)**?
- How many customers are **eligible**, how many are **approved at checkout**, how many **choose** BNPL?
- Do BNPL loans **repay on time** — especially the first installment?
- How much **fee revenue** does each merchant and category bring versus **credit losses**?

**2. Events and fields to capture**

| Event | Key fields |
|---|---|
| bnpl_offer_shown | session_id, customer_id, merchant_id, amount, device, UTC time |
| bnpl_eligibility_checked | result (eligible / not), reason, limit, credit_score, policy version |
| bnpl_selected | session_id, chosen term (3 / 6 months) |
| bnpl_decision | approved / rejected, reject_reason, decided_at |
| payment | payment_id, method = bnpl, status, failure_reason |
| loan_created | loan_id, **application_id**, **payment_id / session_id**, principal, term |
| installment due / paid | as in repayment_schedule |
| refund | refund_id, payment_id, amount — and its **effect on the loan** (balance reduced) |

**Gap in today's data**: payments already holds 416 **method = 'bnpl'** payments and loans has **product = 'bnpl'**, but **there is no key linking a BNPL payment to its loan** (loans has no payment_id or session_id). So you cannot answer "which BNPL checkout became which loan, and how is it repaying". That is requirement number 1 for engineering.

**3. KPIs**
- Growth: BNPL offer rate; BNPL take rate among sessions shown the offer; approval rate at checkout; checkout conversion (with BNPL vs a control group); AOV; BNPL GMV; MDR revenue.
- Risk: **FPD** (first payment default — overdue on the very first installment), ever-30+ by vintage at MOB 1/2/3, refund rate on BNPL orders, fraud rate.
- Operations: BNPL payment success rate, decision time.

**4. Reports**

| Report | Audience | Frequency |
|---|---|---|
| BNPL flow health (errors, decision time) | Operations, engineering | Near real time + alerts |
| Funnel & conversion by merchant / device | Product, sales | Daily / weekly |
| Vintages, FPD, roll rates | Risk | Weekly / monthly |
| Fee revenue vs losses | Finance, management | Monthly |

**5. Acceptance criteria (examples)**
- Every BNPL loan has exactly one valid **payment_id**; the share of unlinked loans = 0.
- Every event has **session_id**, **customer_id** and a UTC time; daily reports convert to Vietnam time.
- BNPL GMV in the report equals the sum of payments with method = 'bnpl' (success + refunded) for the same period.
- Every rejection has a **reject_reason**; the **policy version** is stored so you can see what a cut-off change affected.

**Why**: BNPL risk only shows up 1–3 months later; if checkout ↔ loan cannot be linked from day one, you can never judge whether the growth was worth it.`,
  },
};

const finSimpsonMix: Exercise = {
  id: "fin-simpson-mix",
  category: "fintech",
  difficulty: "medium",
  title: { vi: "Tỷ lệ duyệt chung giảm dù từng kênh không đổi", en: "Overall approval rate fell though no channel changed" },
  prompt: {
    vi: "Bảng đơn giản hóa (số liệu minh họa): Tháng 1 — kênh app 600 đơn, duyệt 300; kênh partner 100 đơn, duyệt 30. Tháng 3 — kênh app 400 đơn, duyệt 200; kênh partner 600 đơn, duyệt 180. (1) Tính tỷ lệ duyệt của từng kênh và của toàn công ty mỗi tháng. (2) Giám đốc nói “chính sách duyệt đã bị siết lại” — đúng hay sai? Giải thích vì sao tỷ lệ chung thay đổi dù tỷ lệ từng kênh giữ nguyên. (3) Nên trình bày con số này thế nào trên báo cáo?",
    en: "A simplified table (illustrative numbers): January — app channel 600 applications, 300 approved; partner channel 100 applications, 30 approved. March — app 400 applications, 200 approved; partner 600 applications, 180 approved. (1) Compute each channel's and the company's approval rate per month. (2) A director says “the approval policy got stricter” — right or wrong? Explain why the overall rate moved although each channel's rate did not. (3) How should the report present this?",
  },
  answer: {
    vi: `## Lời giải mẫu

**1. Tính toán**

| Kênh | Tháng 1 | Tỷ lệ | Tháng 3 | Tỷ lệ |
|---|---|---|---|---|
| app | 300 / 600 | 50% | 200 / 400 | 50% |
| partner | 30 / 100 | 30% | 180 / 600 | 30% |
| **Toàn công ty** | **330 / 700** | **47,1%** | **380 / 1.000** | **38,0%** |

**2. Chính sách có bị siết không? — Không.** Trong mỗi kênh, tỷ lệ duyệt giữ nguyên (app 50%, partner 30%). Tỷ lệ chung giảm 9,1 điểm phần trăm vì **cơ cấu (mix)** thay đổi: partner — kênh có tỷ lệ duyệt thấp — tăng từ 14% (100/700) lên 60% (600/1.000) tổng số đơn.

Tỷ lệ chung thực chất là **trung bình có trọng số** của các kênh:
- Tháng 1: 50% × 600/700 + 30% × 100/700 = 47,1%
- Tháng 3: 50% × 400/1.000 + 30% × 600/1.000 = 38,0%

Đây là **nghịch lý Simpson** (Simpson's paradox) theo nghĩa rộng: xu hướng của tổng có thể khác — thậm chí ngược — với xu hướng của từng nhóm, khi trọng số các nhóm thay đổi.

**Kiểm tra bằng "cố định cơ cấu"**: lấy tỷ lệ tháng 3 nhưng giữ cơ cấu tháng 1 → 50% × 600/700 + 30% × 100/700 = **47,1%**, đúng bằng tháng 1. Vậy 100% mức giảm đến từ thay đổi cơ cấu, 0% từ chính sách.

**3. Trình bày trên báo cáo**
- Luôn hiển thị tỷ lệ **theo phân khúc** (kênh, sản phẩm) cạnh tỷ lệ chung, kèm **cơ cấu** (% đơn mỗi kênh).
- Viết câu "so what": "Tỷ lệ duyệt chung giảm từ 47,1% xuống 38,0% hoàn toàn do chiến dịch partner đem về nhiều đơn hơn; tỷ lệ duyệt trong từng kênh không đổi. Không cần điều chỉnh chính sách; câu hỏi thật là chất lượng khách từ partner."
- Nói "điểm phần trăm" khi so sánh hai tỷ lệ: giảm **9,1 điểm phần trăm**, tương đương giảm khoảng **19%** tương đối — hai cách nói rất khác nhau.

**Liên hệ dữ liệu thật**: trong fintech.db, kênh partner tăng từ khoảng 40 lên 296 đơn ở tháng 3/2026. Hãy chạy tỷ lệ duyệt theo kênh và theo tháng tại [SQL Practice → Fintech](/practice/sql?db=fintech) để thấy cơ cấu kênh và chính sách cùng thay đổi một lúc — khó hơn bài minh họa này, và đó chính là lý do phải tách hai hiệu ứng.

**Lỗi thường gặp**: chỉ nhìn một con số tổng rồi kết luận về nguyên nhân; hoặc cộng/trung bình đơn giản các tỷ lệ của kênh ((50% + 30%) / 2 = 40%) — sai vì bỏ qua số đơn mỗi kênh.`,
    en: `## Model solution

**1. The numbers**

| Channel | January | Rate | March | Rate |
|---|---|---|---|---|
| app | 300 / 600 | 50% | 200 / 400 | 50% |
| partner | 30 / 100 | 30% | 180 / 600 | 30% |
| **Company** | **330 / 700** | **47.1%** | **380 / 1,000** | **38.0%** |

**2. Did the policy get stricter? — No.** Within each channel the approval rate is unchanged (app 50%, partner 30%). The overall rate fell 9.1 percentage points because the **mix** changed: partner — the low-approval channel — went from 14% (100/700) to 60% (600/1,000) of applications.

The overall rate is a **weighted average** of the channel rates:
- January: 50% × 600/700 + 30% × 100/700 = 47.1%
- March: 50% × 400/1,000 + 30% × 600/1,000 = 38.0%

This is **Simpson's paradox** in the broad sense: the trend of the total can differ from — even reverse — the trend inside each group when the group weights change.

**Check with a "fixed mix"**: take March's rates with January's mix → 50% × 600/700 + 30% × 100/700 = **47.1%**, exactly January's rate. So 100% of the drop comes from the mix change and 0% from policy.

**3. Presenting it**
- Always show the rate **by segment** (channel, product) next to the overall rate, plus the **mix** (% of applications per channel).
- Write the "so what": "The overall approval rate fell from 47.1% to 38.0% entirely because the partner campaign brought in more applications; the rate within each channel is unchanged. No policy change is needed; the real question is the quality of partner customers."
- Say "percentage points" when comparing two rates: down **9.1 percentage points**, which is about **19%** in relative terms — very different statements.

**Link to the real data**: in fintech.db the partner channel jumps from about 40 to 296 applications in March 2026. Run approval rate by channel and month at [SQL Practice → Fintech](/practice/sql?db=fintech) to see the channel mix and the policy changing at the same time — harder than this illustration, which is exactly why you separate the two effects.

**Common mistakes**: reading cause from a single total; or simply averaging the channel rates ((50% + 30%) / 2 = 40%) — wrong, because it ignores how many applications each channel has.`,
  },
};

const finDashboardCritique: Exercise = {
  id: "fin-dashboard-critique",
  category: "fintech",
  difficulty: "easy",
  title: { vi: "Bắt lỗi một mô tả dashboard gây hiểu lầm", en: "Critique a misleading dashboard description" },
  prompt: {
    vi: "Email tuần gửi ban giám đốc (minh họa) viết: (1) “Tỷ lệ duyệt tăng 15%!” — từ 48% lên 55%. (2) Biểu đồ “Số khoản vay đã giải ngân” là đường đi lên đều đặn mọi tháng — “tăng trưởng kỷ lục”. (3) “PAR30 chỉ 1,9%” — tính bằng số khoản quá hạn trên 30 ngày chia cho mọi khoản vay từng giải ngân. (4) “Tỷ lệ thanh toán thành công hôm qua 99,2%” — trục tung từ 98% đến 100%, dựa trên 118 giao dịch. (5) “Tỷ lệ hoàn tiền 2,3%” = số đơn hoàn / mọi giao dịch kể cả thất bại. (6) “Khoản vay trung bình 11 triệu — khách điển hình vay 11 triệu.” Hãy chỉ ra từng vấn đề và cách sửa. Có thể kiểm tra (5) và (6) tại /practice/sql?db=fintech.",
    en: "A weekly email to management (illustrative) says: (1) “Approval rate up 15%!” — from 48% to 55%. (2) The “Disbursed loans” chart is a line that rises every month — “record growth”. (3) “PAR30 only 1.9%” — loans more than 30 days overdue divided by every loan ever disbursed. (4) “Payment success rate yesterday 99.2%” — y-axis from 98% to 100%, based on 118 payments. (5) “Refund rate 2.3%” = refunded orders / all payments including failed. (6) “Average loan 11 million — the typical customer borrows 11 million.” Point out each problem and the fix. You can check (5) and (6) at /practice/sql?db=fintech.",
  },
  answer: {
    vi: `## Lời giải mẫu

| # | Vấn đề | Cách sửa |
|---|---|---|
| 1 | 48% → 55% là tăng **7 điểm phần trăm**, tương đương khoảng **15% tương đối**. "Tăng 15%" dễ bị hiểu thành 48% → 63%. Và tỷ lệ duyệt tăng **chưa chắc là tin tốt** — có thể do nới chính sách. | Viết "tăng 7 điểm phần trăm (48% → 55%)", kèm tỷ lệ theo kênh và chỉ số rủi ro của các vintage mới. |
| 2 | Có lẽ là biểu đồ **lũy kế** — đường lũy kế luôn đi lên kể cả khi tháng này giải ngân ít hơn tháng trước. | Vẽ số giải ngân **từng tháng** (cột), lũy kế để riêng nếu cần. |
| 3 | Sai cả tử lẫn mẫu: mẫu số gồm **khoản đã tất toán** (không còn rủi ro) → pha loãng; đếm **số khoản** thay vì **dư nợ**. | PAR30 = dư nợ của khoản DPD > 30 / tổng dư nợ còn lại, tại một ngày chốt cố định. |
| 4 | **Trục cắt cụt** (98–100%) biến dao động nhỏ thành vách đá; 118 giao dịch là mẫu nhỏ — một ngày không nói lên xu hướng. | Trục từ 0 hoặc ghi rõ trục bị cắt; dùng trung bình 7 ngày, ghi số giao dịch; cảnh báo theo ngưỡng có số mẫu tối thiểu. |
| 5 | Sai mẫu số: giao dịch **thất bại** không thể bị hoàn tiền. Trên fintech.db, cách tính sai cho **2,3%**, cách đúng (refunded / (success + refunded)) cho **2,5%**. | Ghi rõ công thức; tách theo ngành hàng (thời trang hoàn nhiều hơn hẳn). |
| 6 | Số tiền vay **lệch phải** (vài khoản rất lớn kéo trung bình lên). Trên fintech.db: trung bình khoảng **11,0 triệu** nhưng **trung vị 8,0 triệu**. "Khách điển hình" là trung vị. | Báo cáo trung vị (và P25 / P75) cạnh trung bình. |

Hai kiểm tra trên dữ liệu thật:

    -- (5) refund rate: wrong vs right denominator
    SELECT
      ROUND(100.0 * SUM(status = 'refunded') / COUNT(*), 1) AS wrong_denominator_pct,
      ROUND(100.0 * SUM(status = 'refunded') / SUM(status IN ('success', 'refunded')), 1) AS right_pct
    FROM payments;

    -- (6) mean vs median principal (SQLite has no MEDIAN function)
    SELECT
      ROUND(AVG(principal)) AS avg_principal,
      (SELECT principal FROM loans ORDER BY principal
       LIMIT 1 OFFSET (SELECT COUNT(*) FROM loans) / 2) AS median_principal
    FROM loans;

| wrong_denominator_pct | right_pct |
|---|---|
| 2.3 | 2.5 |

| avg_principal | median_principal |
|---|---|
| 10959723 | 8000000 |

**Vì sao quan trọng**: ban giám đốc ra quyết định từ những dòng tiêu đề này. Một dashboard "đúng số nhưng sai cách nói" vẫn dẫn tới quyết định sai. Thói quen tốt: mọi con số đi kèm **định nghĩa**, **mẫu số**, **kỳ so sánh** và **số mẫu**.

Chạy thử tại [SQL Practice → Fintech](/practice/sql?db=fintech).`,
    en: `## Model solution

| # | Problem | Fix |
|---|---|---|
| 1 | 48% → 55% is up **7 percentage points**, about **15% relative**. "Up 15%" is easily read as 48% → 63%. And a higher approval rate is **not necessarily good news** — it may come from a looser policy. | Write "up 7 percentage points (48% → 55%)", with the rate by channel and risk metrics for the new vintages. |
| 2 | Probably a **cumulative** chart — a cumulative line always goes up, even when this month disbursed less than last month. | Plot disbursements **per month** (bars); keep cumulative separate if needed. |
| 3 | Wrong numerator and denominator: the denominator includes **repaid loans** (no risk left) → diluted; it counts **loans** instead of **outstanding balance**. | PAR30 = outstanding of loans with DPD > 30 / total outstanding, at a fixed snapshot date. |
| 4 | A **truncated axis** (98–100%) turns small wiggles into cliffs; 118 payments is a small sample — one day is not a trend. | Start the axis at 0 or label the truncation; use a 7-day average, show the count; alert with a minimum sample size. |
| 5 | Wrong denominator: a **failed** payment cannot be refunded. On fintech.db the wrong version gives **2.3%**, the right one (refunded / (success + refunded)) **2.5%**. | State the formula; split by category (fashion refunds far more). |
| 6 | Loan amounts are **right-skewed** (a few large loans pull the mean up). On fintech.db: mean about **11.0 million** but **median 8.0 million**. The "typical customer" is the median. | Report the median (and P25 / P75) next to the mean. |

Two checks on the real data:

    -- (5) refund rate: wrong vs right denominator
    SELECT
      ROUND(100.0 * SUM(status = 'refunded') / COUNT(*), 1) AS wrong_denominator_pct,
      ROUND(100.0 * SUM(status = 'refunded') / SUM(status IN ('success', 'refunded')), 1) AS right_pct
    FROM payments;

    -- (6) mean vs median principal (SQLite has no MEDIAN function)
    SELECT
      ROUND(AVG(principal)) AS avg_principal,
      (SELECT principal FROM loans ORDER BY principal
       LIMIT 1 OFFSET (SELECT COUNT(*) FROM loans) / 2) AS median_principal
    FROM loans;

| wrong_denominator_pct | right_pct |
|---|---|
| 2.3 | 2.5 |

| avg_principal | median_principal |
|---|---|
| 10959723 | 8000000 |

**Why it matters**: management decides from these headlines. A dashboard with "right numbers, wrong framing" still leads to wrong decisions. Good habit: every number comes with its **definition**, **denominator**, **comparison period** and **sample size**.

Try it at [SQL Practice → Fintech](/practice/sql?db=fintech).`,
  },
};

const finGatewayBankRecon: Exercise = {
  id: "fin-gateway-bank-recon",
  category: "fintech",
  difficulty: "hard",
  title: { vi: "Thiết kế báo cáo đối soát cổng thanh toán với file quyết toán ngân hàng", en: "Design a gateway-vs-bank settlement reconciliation report" },
  prompt: {
    vi: "Mỗi sáng, ngân hàng gửi VayNhanh một file quyết toán (settlement file) liệt kê các giao dịch đã chuyển tiền của ngày hôm trước (T+1). Hệ thống cổng thanh toán của VayNhanh có log giao dịch riêng. Thiết kế báo cáo đối soát hằng ngày: dữ liệu đầu vào, khóa ghép, quy tắc khớp, các loại chênh lệch (break) và cách xử lý từng loại, mốc giờ chốt, bố cục báo cáo, người phụ trách và SLA. Liên hệ với các vấn đề có thật trong bảng payments của /practice/sql?db=fintech (giao dịch trùng, giao dịch pending bị treo).",
    en: "Every morning the bank sends VayNhanh a settlement file listing the previous day's settled transactions (T+1). VayNhanh's payment gateway keeps its own transaction log. Design the daily reconciliation report: inputs, matching keys, matching rules, the types of breaks and how each is handled, cut-off times, report layout, owners and SLAs. Relate it to real problems in the payments table at /practice/sql?db=fintech (duplicate charges, stuck pending payments).",
  },
  answer: {
    vi: `## Lời giải mẫu

**Mục tiêu**: chứng minh rằng **mọi đồng tiền** cổng thanh toán ghi nhận đều đã được ngân hàng chuyển (và ngược lại), và mọi chênh lệch đều có người theo dõi đến khi đóng.

**1. Dữ liệu đầu vào**

| Nguồn | Trường cần có |
|---|---|
| Log cổng thanh toán | payment_id, merchant_id, số tiền, phí, trạng thái, **mã tham chiếu gửi ngân hàng**, thời gian UTC |
| File quyết toán ngân hàng | mã tham chiếu ngân hàng, mã tham chiếu của VayNhanh, ngày giá trị (value date), số tiền gộp, phí, số tiền ròng, loại (sale / refund) |
| Bảng hoàn tiền | refund_id, payment_id gốc, số tiền, ngày |

Quy tắc: file gốc được lưu **nguyên trạng, chỉ đọc**; mọi xử lý tạo bảng mới. Chạy lại đối soát cho cùng ngày phải ra cùng kết quả (**idempotent**).

**2. Mốc giờ chốt (cut-off)** — chỗ sai phổ biến nhất. Ngân hàng chốt ngày theo giờ Việt Nam (ví dụ 23:00), log của ta ghi UTC. Phải quy đổi log về cùng cửa sổ thời gian của ngân hàng; giao dịch sau giờ chốt sẽ nằm trong file **ngày kế tiếp** — đó là chênh lệch **thời điểm**, không phải lỗi.

**3. Quy tắc khớp (theo thứ tự)**
1. Khớp chính xác theo mã tham chiếu + số tiền.
2. Không có mã tham chiếu: khớp theo merchant + số tiền + thời gian trong cửa sổ hẹp → đánh dấu "khớp mềm" để người kiểm tra lại.
3. Còn lại là **break**.

**4. Phân loại chênh lệch**

| Loại | Ví dụ | Xử lý |
|---|---|---|
| Khớp | Có ở cả hai, cùng số tiền | Không cần làm gì |
| Lệch thời điểm | Cổng có, ngân hàng chưa có, giao dịch sau giờ chốt | Tự động chờ file hôm sau; nếu quá T+2 → chuyển thành break thật |
| Thiếu ở ngân hàng | Cổng ghi success, ngân hàng không chuyển | Hỏi ngân hàng; có thể khách bị trừ tiền nhưng tiền chưa về |
| Thiếu ở cổng | Ngân hàng chuyển tiền cho giao dịch ta không có | Nguy cơ cao: lỗi ghi log hoặc giao dịch lạ — điều tra ngay |
| Lệch số tiền | Cùng mã, khác số tiền / phí | Kiểm tra biểu phí (MDR), tỷ giá, hoàn một phần |
| Lệch trạng thái | Cổng ghi failed / pending, ngân hàng lại quyết toán | Cập nhật trạng thái; nếu khách đã thử lại → có thể bị trừ hai lần |
| Trùng | Hai giao dịch cùng phiên, cùng số tiền, cách nhau vài giây | Hoàn tiền cho khách; báo kỹ thuật về idempotency |

**Liên hệ fintech.db**: bảng payments có **37 cặp trừ tiền hai lần** (cùng session_id, cách nhau 1–8 giây) và **18 giao dịch pending**, có giao dịch treo từ 2025-07-15. Trong đối soát thật, các giao dịch pending lâu ngày chính là loại "lệch trạng thái" — cần đối chiếu với file ngân hàng để biết tiền đã đi hay chưa.

**5. Bố cục báo cáo**
- **Tóm tắt**: tổng cổng = tổng ngân hàng + lệch thời điểm + các break đang mở (phương trình này phải cân).
- Bảng break: loại, số lượng, số tiền, **tuổi** (0–1 ngày, 2–7, > 7), người phụ trách, trạng thái.
- Xu hướng: số break mở theo ngày — break cũ tích tụ là dấu hiệu quy trình hỏng.

**6. Người phụ trách & SLA**: nhóm Đối soát / Tài chính vận hành sở hữu báo cáo; mỗi loại break có SLA (ví dụ: break "thiếu ở cổng" phải được điều tra trong ngày). Mọi điều chỉnh qua bút toán có phê duyệt, không sửa dữ liệu gốc.

**Lỗi thường gặp**: so sánh theo ngày UTC với ngày quyết toán của ngân hàng; chỉ so tổng tiền (tổng khớp nhưng hai lỗi ngược chiều triệt tiêu nhau); xóa break "cho đẹp báo cáo" thay vì đóng có lý do.`,
    en: `## Model solution

**Goal**: prove that **every dong** the gateway recorded was settled by the bank (and vice versa), and that every difference has an owner until it is closed.

**1. Inputs**

| Source | Fields needed |
|---|---|
| Gateway log | payment_id, merchant_id, amount, fee, status, **reference sent to the bank**, UTC time |
| Bank settlement file | bank reference, VayNhanh reference, value date, gross amount, fee, net amount, type (sale / refund) |
| Refunds table | refund_id, original payment_id, amount, date |

Rule: raw files are stored **as received, read-only**; all processing writes new tables. Re-running the reconciliation for the same day must give the same result (**idempotent**).

**2. Cut-off times** — the most common source of error. The bank closes its day on Vietnam time (e.g. 23:00); our log is in UTC. Convert the log into the bank's window; a payment after the cut-off appears in the **next day's** file — that is a **timing** difference, not an error.

**3. Matching rules (in order)**
1. Exact match on reference + amount.
2. No reference: match on merchant + amount + time within a narrow window → flag as a "soft match" for a human to confirm.
3. Whatever is left is a **break**.

**4. Break types**

| Type | Example | Handling |
|---|---|---|
| Matched | In both, same amount | Nothing to do |
| Timing | In gateway, not yet at bank, after cut-off | Wait for the next file automatically; past T+2 → becomes a real break |
| Missing at bank | Gateway says success, bank did not settle | Ask the bank; the customer may be charged but the money not received |
| Missing at gateway | Bank settled a payment we do not have | High risk: logging bug or unknown transaction — investigate immediately |
| Amount mismatch | Same reference, different amount / fee | Check the fee schedule (MDR), FX, partial refunds |
| Status mismatch | Gateway says failed / pending, bank settled it | Update status; if the customer retried → possible double charge |
| Duplicate | Two payments, same session and amount, seconds apart | Refund the customer; raise idempotency with engineering |

**Link to fintech.db**: payments contains **37 double-charge pairs** (same session_id, 1–8 seconds apart) and **18 pending payments**, some stuck since 2025-07-15. In a real reconciliation, long-pending payments are exactly the "status mismatch" type — the bank file tells you whether the money actually moved.

**5. Report layout**
- **Summary**: gateway total = bank total + timing differences + open breaks (this equation must balance).
- Break table: type, count, amount, **age** (0–1 day, 2–7, > 7), owner, status.
- Trend: open breaks per day — old breaks piling up means the process is broken.

**6. Owners & SLAs**: the Reconciliation / Finance Ops team owns the report; each break type has an SLA (e.g. "missing at gateway" investigated the same day). Every correction goes through an approved adjusting entry, never an edit to source data.

**Common mistakes**: comparing UTC days with the bank's settlement day; comparing only totals (totals match while two opposite errors cancel out); deleting breaks "to clean up the report" instead of closing them with a reason.`,
  },
};

const finAbTestCheckoutButton: Exercise = {
  id: "fin-ab-test-checkout-button",
  category: "fintech",
  difficulty: "hard",
  title: { vi: "Thiết kế A/B test cho nút thanh toán mới", en: "Design an A/B test for a new checkout button" },
  prompt: {
    vi: "Nhóm sản phẩm muốn thử nút “Thanh toán ngay” mới (to hơn, cố định ở cuối màn hình) ở bước chọn phương thức thanh toán. Thiết kế A/B test: giả thuyết, đơn vị chia nhóm, chỉ số chính, chỉ số phụ và guardrail (chỉ số bảo vệ), cỡ mẫu và thời gian chạy, các rủi ro làm sai kết quả, và quy tắc ra quyết định. Dùng checkout_events để lấy tỷ lệ cơ sở (baseline) và lưu lượng mỗi tháng — chạy SQL tại /practice/sql?db=fintech.",
    en: "The product team wants to test a new “Pay now” button (bigger, pinned to the bottom of the screen) on the payment-method step. Design the A/B test: hypothesis, randomisation unit, primary metric, secondary and guardrail metrics, sample size and duration, threats to validity, and the decision rule. Use checkout_events for the baseline rate and the monthly traffic — run SQL at /practice/sql?db=fintech.",
  },
  answer: {
    vi: `## Lời giải mẫu

**1. Giả thuyết**: nút mới dễ thấy hơn → nhiều khách đã chọn phương thức thanh toán sẽ bấm **submit** hơn, mà không làm tăng lỗi hay trừ tiền trùng.

**2. Tỷ lệ cơ sở và lưu lượng** — tính theo tháng giờ Việt Nam:

    SELECT
      strftime('%Y-%m', event_time, '+7 hours') AS vn_month,
      SUM(event_name = 'select_payment') AS reached_select,
      SUM(event_name = 'submit_payment') AS submitted,
      ROUND(100.0 * SUM(event_name = 'submit_payment') / SUM(event_name = 'select_payment'), 1) AS submit_rate_pct
    FROM checkout_events
    WHERE event_time >= '2026-02-28 17:00:00'     -- 2026-03-01 00:00 in Vietnam
    GROUP BY vn_month
    ORDER BY vn_month;

| vn_month | reached_select | submitted | submit_rate_pct |
|---|---|---|---|
| 2026-03 | 745 | 678 | 91 |
| 2026-04 | 677 | 610 | 90.1 |
| 2026-05 | 766 | 694 | 90.6 |
| 2026-06 | 767 | 695 | 90.6 |

Mỗi phiên chỉ có tối đa một sự kiện mỗi loại, nên đếm sự kiện ở đây chính là đếm phiên. Baseline khoảng **90,5%**, khoảng **700–770 phiên/tháng** tới bước này.

**3. Chỉ số**
- **Chính**: tỷ lệ **select_payment → submit_payment** theo phiên (đúng chỗ nút tác động).
- **Phụ**: tỷ lệ submit → payment_success; chuyển đổi toàn phễu view_cart → payment_success; AOV.
- **Guardrail** (không được xấu đi): tỷ lệ thanh toán thành công; **tỷ lệ trừ tiền trùng** (nút to dễ bị bấm hai lần — VayNhanh đã có 37 cặp trùng); tỷ lệ hoàn tiền; lỗi / thời gian phản hồi; cơ cấu phương thức thanh toán.

**4. Đơn vị chia nhóm**: theo **khách hàng** (customer_id), không theo phiên — một khách quay lại nhiều lần phải luôn thấy cùng một phiên bản. Chia đều 50/50, phân tầng theo thiết bị (android / ios / web) vì thiết bị ảnh hưởng mạnh tới thanh toán.

**5. Cỡ mẫu và thời gian** — công thức xấp xỉ cho hai tỷ lệ (độ tin cậy 95%, power 80%):
n mỗi nhóm ≈ (1,96 + 0,84)² × [p1(1 − p1) + p2(1 − p2)] / (p2 − p1)²
- Muốn phát hiện +2 điểm (90,5% → 92,5%): khoảng **3.050 phiên mỗi nhóm**, tổng khoảng 6.100 → với khoảng 750 phiên/tháng thì mất **khoảng 8 tháng**. Không thực tế.
- Muốn phát hiện +4 điểm (90,5% → 94,5%): khoảng **680 mỗi nhóm**, tổng khoảng 1.360 → **khoảng 2 tháng**.
- Kết luận cho nhóm sản phẩm: với lưu lượng hiện tại, chỉ phát hiện được hiệu ứng lớn. Hoặc chấp nhận MDE (mức hiệu ứng nhỏ nhất phát hiện được) +4 điểm, hoặc chạy trên nhiều merchant / lưu lượng hơn. Nói điều này **trước** khi chạy, không phải sau.

**6. Rủi ro làm sai kết quả**
- **Xem kết quả giữa chừng rồi dừng sớm** (peeking) khi thấy "có ý nghĩa" → tăng tỷ lệ báo động giả. Chốt thời gian trước.
- Chạy đủ **tuần trọn vẹn**; tránh hoặc ghi chú các ngày đặc biệt (11.11, 12.12, trước Tết) và sự cố (như tuần OTP lỗi 11–17/05/2026).
- **SRM** (sample ratio mismatch): nếu hai nhóm lệch xa 50/50 thì việc chia nhóm bị lỗi — không đọc kết quả.
- **Hiệu ứng mới lạ** (novelty): khách bấm vì tò mò tuần đầu.

**7. Quy tắc quyết định (viết trước khi chạy)**: triển khai nếu chỉ số chính tăng có ý nghĩa thống kê **và** không guardrail nào xấu đi vượt ngưỡng đã định (ví dụ tỷ lệ trừ trùng không tăng). Nếu không có ý nghĩa: giữ bản cũ, ghi lại kết quả — "không thấy khác biệt" cũng là thông tin.

Chạy query cơ sở tại [SQL Practice → Fintech](/practice/sql?db=fintech).`,
    en: `## Model solution

**1. Hypothesis**: a more visible button → more customers who already chose a payment method will press **submit**, without raising errors or double charges.

**2. Baseline and traffic** — by Vietnam-time month:

    SELECT
      strftime('%Y-%m', event_time, '+7 hours') AS vn_month,
      SUM(event_name = 'select_payment') AS reached_select,
      SUM(event_name = 'submit_payment') AS submitted,
      ROUND(100.0 * SUM(event_name = 'submit_payment') / SUM(event_name = 'select_payment'), 1) AS submit_rate_pct
    FROM checkout_events
    WHERE event_time >= '2026-02-28 17:00:00'     -- 2026-03-01 00:00 in Vietnam
    GROUP BY vn_month
    ORDER BY vn_month;

| vn_month | reached_select | submitted | submit_rate_pct |
|---|---|---|---|
| 2026-03 | 745 | 678 | 91 |
| 2026-04 | 677 | 610 | 90.1 |
| 2026-05 | 766 | 694 | 90.6 |
| 2026-06 | 767 | 695 | 90.6 |

Each session has at most one event of each type, so counting events here is counting sessions. Baseline is about **90.5%**, with roughly **700–770 sessions a month** reaching this step.

**3. Metrics**
- **Primary**: session-level **select_payment → submit_payment** rate (exactly where the button acts).
- **Secondary**: submit → payment_success rate; full-funnel view_cart → payment_success; AOV.
- **Guardrails** (must not get worse): payment success rate; **double-charge rate** (a big button invites double taps — VayNhanh already has 37 duplicate pairs); refund rate; errors / latency; payment-method mix.

**4. Randomisation unit**: the **customer** (customer_id), not the session — a returning customer must always see the same version. Split 50/50, stratified by device (android / ios / web) because device strongly affects payments.

**5. Sample size and duration** — approximate formula for two proportions (95% confidence, 80% power):
n per arm ≈ (1.96 + 0.84)² × [p1(1 − p1) + p2(1 − p2)] / (p2 − p1)²
- To detect +2 points (90.5% → 92.5%): about **3,050 sessions per arm**, about 6,100 in total → at roughly 750 sessions a month that is **about 8 months**. Not realistic.
- To detect +4 points (90.5% → 94.5%): about **680 per arm**, about 1,360 in total → **about 2 months**.
- Message for the product team: with current traffic you can only detect large effects. Either accept a +4-point MDE (minimum detectable effect) or run on more merchants / traffic. Say this **before** the test, not after.

**6. Threats to validity**
- **Peeking** and stopping as soon as it looks "significant" → inflates false positives. Fix the duration up front.
- Run **whole weeks**; avoid or annotate special days (11.11, 12.12, pre-Tết) and incidents (like the OTP outage week of 11–17 May 2026).
- **SRM** (sample ratio mismatch): if the arms are far from 50/50, assignment is broken — do not read the results.
- **Novelty effect**: customers click out of curiosity in week one.

**7. Decision rule (written before launch)**: ship if the primary metric improves significantly **and** no guardrail worsens beyond its agreed threshold (e.g. the double-charge rate does not rise). If not significant: keep the old version and record the result — "no difference found" is information too.

Run the baseline query at [SQL Practice → Fintech](/practice/sql?db=fintech).`,
  },
};

export const FINTECH_EXERCISES: Exercise[] = [
  finApprovalByChannel,
  finGmvVnTime,
  finKpiCardSuccessRate,
  finDashboardCritique,
  finDpdPar30,
  finPaymentSuccessTrend,
  finDoubleCharges,
  finWalletRecon,
  finSimpsonMix,
  finBnplLaunchRequirements,
  finVintageEver30,
  finRepeatBorrowers,
  finGatewayBankRecon,
  finAbTestCheckoutButton,
];
