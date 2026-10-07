# Digital Lending Analytics: Funnel, Credit Risk, DPD & Vintages

## 1. The life of a loan, as data

A digital lender lives on two questions: **how many good loans did we make**, and **how many of them are paying back**? Every metric in this topic answers one of the two.

Follow one customer. Chị Lan opens the VayNhanh app, asks for 12 million VND over 12 months, passes eKYC, gets an automatic decision in a few minutes, accepts the offer, receives the money and then pays a fixed amount every month. Most customers pay on time. Some pay late, some catch up, and a few stop paying for good.

```text
 apply ──► decision ──► offer accepted ──► disbursed ──► repaying ──► closed (fully paid)
              │                │                            │
           rejected         cancelled                    late (DPD > 0)
                                                            │
                                         cured ◄────────────┤
                                                            ▼
                                             default (90+) ──► write-off
```

In VayNhanh's `fintech.db` the journey is split across three tables:

| Stage | Table | What to read |
|---|---|---|
| Application and decision | `loan_applications` | `status`: approved, rejected, cancelled, pending; `reject_reason` |
| The loan itself | `loans` | `principal`, `annual_rate_pct`, `term_months`, `monthly_installment`, `disbursed_date`, `status` |
| Each monthly installment | `repayment_schedule` | `due_date`, `amount_due`, `paid_date` (NULL = not paid), `amount_paid` |

One VayNhanh detail matters for the funnel: `approved` means the customer accepted and the money went out (every approved application has exactly one row in `loans`: 3,106 of each), while `cancelled` means the lender said yes but the customer never accepted the offer.

The snapshot date is **2026-06-30**. Every "today", every overdue count and every rate below is **as of** that day. Run the queries yourself at [SQL Practice → Fintech](/practice/sql?db=fintech).

## 2. The application funnel: approval rate and take-up

A **funnel** counts how many people survive each step. For lending:

```text
applied 6,854 ─► decided 6,825 ─► approved 3,401 ─► disbursed 3,106
                 (29 pending)      (approval 49.8%)   (take-up 91.3%)
```

Three rates come out of it, and each has its own **denominator** (the number you divide by):

| Metric | Formula | VayNhanh, all time |
|---|---|---|
| **Approval rate** | approved ÷ decided | 3,401 ÷ 6,825 = 49.8% |
| **Take-up rate** | disbursed ÷ approved | 3,106 ÷ 3,401 = 91.3% |
| End-to-end conversion | disbursed ÷ applied | 3,106 ÷ 6,854 = 45.3% |

"Approved" here counts `approved` + `cancelled`, because both got a yes. Pending applications are left out of the approval rate: they have no decision yet, so counting them as "not approved" would make the latest days look stricter than they are.

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

Applications jumped in March–April and the approval rate climbed from about 51% to about 53–57% from March to June. Sales will call that good news. Hold that thought until section 7.

### Why were people rejected?

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

Almost half of rejections are about affordability (DTI, section 9), a third about the credit score. `kyc_failed` is a different kind of problem: the customer never got through identity checks, which is an onboarding issue for the product team rather than a credit decision.

> **Common misconception:** "Approval rate went up, so the business is healthier." An approval rate can rise because better customers arrived, or because the lender relaxed its rules. The first is good news; the second only shows up months later, in repayments. Never judge a credit decision by the approval rate alone.

> **BA corner:** when a report spec says "approval rate", write the formula down: which statuses count as approved, whether pending is excluded, which time zone defines the month, and whether the month is the application month or the decision month. Two teams computing "approval rate" differently is one of the most common reasons two dashboards disagree.

## 3. The loan book: disbursed vs outstanding

The **loan book** (or **portfolio**) is all the money currently lent out. Two numbers are easy to mix up:

- **Disbursed amount**: money paid out when loans were opened. It only grows.
- **Outstanding principal**: the part of the principal still owed today. It shrinks as customers repay and is the base for most risk ratios.

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

The **average ticket** (average loan size) is about 4.6 million VND for BNPL and about 16.1 million for cash loans. In total VayNhanh has disbursed about 34.0 billion VND across 3,106 loans.

How much is still outstanding? You cannot just add up unpaid installments: each installment mixes interest and principal (section 4), and unpaid future installments include interest that has not been earned yet. The exact remaining principal after `k` paid installments of an annuity loan is:

```text
balance after k payments = P × (1 + r)^k − M × ((1 + r)^k − 1) ÷ r
P = principal, r = monthly rate (annual % ÷ 1200), M = monthly installment
(for a 0% loan such as BNPL: P − M × k)
```

Section 6 turns that into SQL. The answer, for the 1,816 loans not yet closed: about 15.3 billion VND outstanding, less than half of everything ever disbursed.

> **Try it yourself:** run the product query above, then add `WHERE disbursed_date >= '2026-01-01'`. You should see 1,435 loans, about 45% of them BNPL, the same share as in the whole history. But because BNPL terms are only 3 or 6 months, those loans leave the book much faster than cash loans.

## 4. Interest, APR and the monthly installment

### Reducing balance vs flat rate

VayNhanh's cash loans charge a **nominal annual rate** (`annual_rate_pct`, between 18% and 38%) on the **reducing balance**: each month's interest is computed only on the principal still owed. BNPL loans here are 0% for the customer (the merchant pays a fee instead, which is a payments topic).

Every month the customer pays the same **installment**, computed with the **annuity** formula:

```text
M = P × r ÷ (1 − (1 + r)^(−n))      n = number of months
```

Loan 519 is 12,000,000 VND at 28% over 12 months: r = 28 ÷ 1200 ≈ 2.33% a month, M ≈ 1,158,000, and VayNhanh rounds up to the next thousand: `monthly_installment` = 1,159,000. A recursive CTE shows how each payment splits:

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

Read it like this: early payments are mostly interest, later ones mostly principal, because interest is charged on a shrinking balance. The small negative at the end is the rounding-up of the installment; a real system would trim the last payment. Total paid: 12 × 1,159,000 = 13,908,000, so the interest cost is 1,908,000 VND.

### Why a "flat" rate looks cheaper than it is

Some lenders advertise a **flat rate**: interest is charged every month on the *original* principal, even though the customer is paying it down. Same loan, flat 1.5% a month: interest = 12,000,000 × 1.5% × 12 = 2,160,000, so the installment is (12,000,000 + 2,160,000) ÷ 12 = 1,180,000. An annuity at about 31.7% a year gives that same 1,179,903 installment. "1.5% a month" (18% a year) is really about 31.7% a year on a reducing balance.

That is why consumer-protection rules in many countries require lenders to show an **APR** (annual percentage rate): the yearly cost of credit on a reducing-balance basis, normally including mandatory fees. When you compare products, compare APRs, never a flat rate against a reducing-balance rate.

> **Common misconception:** "A 24% loan costs 24% of the principal." A 12-month annuity at 24% costs much less than 24% of the principal in total interest, because the balance falls every month; a flat 2% a month costs exactly 24% and has a much higher APR.

## 5. DPD: how late is a loan?

**DPD** (days past due) counts how many days the **oldest unpaid installment** is overdue. If nothing is overdue, DPD = 0 and the loan is **current**.

Loan 2208 is a 13.5 million cash loan with an installment of 1,327,000. The first four rows of its schedule (`SELECT installment_no, due_date, paid_date FROM repayment_schedule WHERE loan_id = 2208`):

| installment_no | due_date | paid_date |
|---|---|---|
| 1 | 2026-04-14 | 2026-04-11 |
| 2 | 2026-05-14 | NULL |
| 3 | 2026-06-14 | NULL |
| 4 | 2026-07-14 | NULL |

On 2026-06-30 the oldest unpaid installment fell due on 2026-05-14, so DPD = 47 days. The **overdue amount** is two installments, 2,654,000 VND. Installment 4 is unpaid but not yet due, so it is not overdue at all.

Three rules people get wrong:

1. DPD uses the **oldest** unpaid due date, not the newest.
2. An installment due *today* is not overdue yet: use `due_date < '2026-06-30'`.
3. DPD is measured **as of a date**. The same loan has a different DPD every day.

### Delinquency buckets

Lenders group DPD into **buckets**: current, 1–30, 31–60, 61–90 and 90+. A loan that is behind on payments is called **delinquent**. Collections teams work by bucket (a reminder SMS for 1–30, calls for 31–60, field visits or agencies later).

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

The `LEFT JOIN` matters: a loan with no overdue installment finds no match, `MIN(due_date)` is NULL and `COALESCE` turns it into DPD 0. With an inner `JOIN`, every current loan would vanish. (In this snapshot no payment is dated after 2026-06-30, so `paid_date IS NULL` is enough; for a past date, also treat `paid_date > as_of_date` as unpaid.)

> **Try it yourself:** list the 55 loans in the 90+ bucket and look at their `status`. All of them are `defaulted`, and no `active` loan is above 90 DPD. So VayNhanh's `defaulted` simply means "more than 90 days past due". That is a useful thing to confirm before you trust any status column.

## 6. Portfolio quality: PAR30, NPL, debt groups and write-off

### PAR30

**PAR30** (portfolio at risk, 30 days) = outstanding principal of loans more than 30 days past due ÷ total outstanding principal. Note the numerator: the whole outstanding balance of a late loan, not only its overdue installments, because once a customer is a month behind the whole balance is in danger.

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

About 15.3 billion VND is outstanding; PAR30 is about 5.1% and the 90+ share is about 3.0%. Some teams use "30 or more days" instead of "more than 30": both exist, so write the definition on the report.

### NPL and Vietnam's five debt groups

**NPL** (non-performing loan) usually means a loan more than 90 days past due, or one the lender no longer expects to be repaid in full. The **NPL ratio** is NPL outstanding ÷ total outstanding: about 3.0% for VayNhanh on the 90+ definition.

In Vietnam, banks and finance companies classify loans into **five debt groups**, mainly by days overdue (plus qualitative rules, for example for restructured loans). For many years the day ranges have been roughly:

| Group | Common name | Roughly |
|---|---|---|
| 1 | Standard (current) | on time or less than 10 days overdue |
| 2 | Special mention | 10–90 days |
| 3 | Substandard | 91–180 days |
| 4 | Doubtful | 181–360 days |
| 5 | Loss (likely loss of capital) | more than 360 days |

Groups 3–5 are what Vietnamese reports call **bad debt** ("nợ xấu"). The rules are set by a State Bank of Vietnam circular and are revised from time to time, so always check the circular currently in force before you build a report on them.

### Provisions, write-off and loss

A lender sets money aside in advance for expected losses: a **provision**. A **write-off** removes a loan from the loan book. The lender writes a loan off when it judges the loan uncollectible, and charges the loss against the provision. Collections may continue after write-off, and any money recovered later is a **recovery**. **Net loss** = write-offs − recoveries. VayNhanh's data has no write-off column, so its 90+ loans are still in the book; in a real company the write-off rule (for example "after N days past due") would be in the credit policy.

> **Common misconception:** "PAR30 fell, so collections improved." PAR30 is a ratio. If disbursements double, the denominator grows with fresh loans that cannot be late yet, and PAR30 falls even if no customer behaves better. Section 7 fixes that.

## 7. Vintage analysis: comparing loans of the same age

A **vintage** (or **cohort**) is a group of loans disbursed in the same month. **MOB** (month on book) is how many months have passed since that month. A vintage table puts vintages in rows and MOB in columns, so every cell compares loans at the same age.

The usual cell is **ever 30+ by MOB k**: the share of the vintage that has been more than 30 days past due at any time up to the end of month k. "Ever" matters: a loan that went 45 days late and then caught up still counts, because the vintage is about how the loans *behaved*, not where they are today.

Here MOB k means the month-end k months after the vintage month (for the March 2026 vintage, MOB 3 = 30 June 2026). The first installment falls due at MOB 1 and needs 31 more days to become 30+, so MOB 1 is always 0% and the table starts at MOB 2.

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

(The query returns 2025-01 to 2025-06 too; earlier vintages sit in the same 0–3% range at MOB 2 and 1.6–4.4% at MOB 3.)

### Reading the table

- **Read down a column** to compare vintages at the same age. At MOB 3, vintages from 2025-07 to 2026-02 range from 0% to about 4%. March 2026 is at about 7.4%.
- **Read along a row** to see one vintage age. Numbers can only go up, because "ever" never forgets.
- **Empty cells are not zeros.** They are months the vintage has not reached yet.

### Right-censoring: the young-vintage trap

Data about young loans is right-censored: their future is cut off by the snapshot date. Compare a naive version: for each vintage, the share of loans that have been more than 30 DPD at any time up to 2026-06-30 ("ever 30+ so far"), with no MOB alignment:

| vintage | loans | ever30_so_far_pct |
|---|---|---|
| 2026-02 | 218 | 5.0 |
| 2026-03 | 282 | 7.4 |
| 2026-04 | 290 | 4.1 |
| 2026-05 | 231 | 0.0 |
| 2026-06 | 217 | 0.0 |

May and June look perfect, and April looks better than March. Both are illusions: May and June loans cannot be 30+ yet, and April has had one month less than March to go bad. Only compare vintages at a MOB they have **all** reached.

### A first look at March and April 2026

Compared at the same age, the two newest measurable vintages stand out: at MOB 2, March (3.2%) and April (4.1%) are above every vintage since July 2025; at MOB 3, March (7.4%) is more than double the usual level. These are also the months when applications and the approval rate jumped (section 2). That is a *correlation in time*, not yet an explanation: channel mix, product mix, the score cut-off and the economy could all play a part. The full investigation is the case study in da-08.

> **BA corner:** an acceptance criterion for a vintage report could read: "Rows = disbursement month; columns = MOB 2–12; cell = % of the vintage's loans ever more than 30 DPD by the end of that MOB; cells the vintage has not reached are blank, not 0; the definition of DPD and the snapshot date are printed under the table."

## 8. Roll rates and cures

Vintages tell you how fast new loans go bad. **Roll rates** tell you how delinquent loans move from one bucket to the next, month to month. Take every loan still open on 2026-05-31, put it in its bucket on that date and again on 2026-06-30:

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

How to read a **roll rate**: of the 68 loans in 1–30 at the end of May, 24 **rolled forward** to 31–60 (24 ÷ 68 ≈ 35%). Of the 20 in 31–60, 15 rolled to 61–90 (75%), and all 7 in 61–90 rolled to 90+. The deeper a loan sinks, the less likely it is to come back, which is why collections teams push hardest on the early buckets.

A **cure** is the opposite move: a delinquent loan that returns to current. Here 35 of the 68 loans that were 1–30 days delinquent (about 51%) cured in June, but only 4 of 20 from 31–60. Over the whole history, 119 loans have ever been more than 30 days late (an installment paid more than 30 days after its due date, or still unpaid 31+ days after it); 21 of them (about 18%) have no overdue installment today. Loan 522 is one of them: a 3.1 million BNPL loan whose first two installments were paid 59 and 37 days late. Measured with the DPD rule at three month-ends, it was 25 DPD on 2025-06-30, 56 DPD on 2025-07-31, and back to 0 on 2025-08-31 after the customer paid everything owed.

Multiply roll rates along the chain and you get a rough forecast: of 100 loans that are 1–30 late today, about 35 reach 31–60, about 26 of those reach 61–90, and almost all of those reach 90+. With these small counts (7, 20, 68 loans) treat one month as a hint; risk teams average roll rates over several months.

## 9. Credit scoring: cut-off, DTI and thin files

### The score and the cut-off

A **credit score** (300–850 at VayNhanh) ranks applicants by expected risk, built from bureau data such as CIC records and the lender's own data. The **cut-off** is the minimum score to approve. Moving it is a trade-off: a lower cut-off approves more people and also more bad loans.

Use 2025 loans, which have all reached MOB 6, and ask: "if we had used a higher cut-off, what would we have kept?" (bad = ever 30+ by MOB 6; the 11 loans with no score are left out):

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

Moving from 560 to 600 would have given up about 18% of loans but removed more than half the bad ones (59 → 28). Moving to 680 cuts volume by two thirds for almost no further gain, and with only 5 bad loans the 0.9% is mostly noise. The right cut-off depends on money: the interest earned on good loans against the principal lost on bad ones.

Notice what the table **cannot** show: the minimum score among 2025 loans is 560, so there is no 2025 history for anyone below it. Nobody can read the bad rate of a 540-score customer from approved loans, because those customers were rejected. This is the **reject inference** problem. The honest way to learn about a lower cut-off is a small, controlled test, with the losses budgeted in advance.

### DTI: can the customer afford it?

**DTI** (debt-to-income) = all monthly debt payments ÷ monthly income. Chị Lan earns 15,000,000 a month, already pays 3,000,000 on another loan, and the new installment would be 1,159,000: DTI = 4,159,000 ÷ 15,000,000 ≈ 27.7%. Lenders set a maximum DTI, and "already has an open loan" counts too, which is why VayNhanh's `high_dti` is the top rejection reason. Watch the income field: it is self-declared, sometimes missing, and da-03 found typo values like 999,999,999 that would make anyone look affordable.

### Thin-file customers

A **thin-file** customer has little or no credit history, so the model cannot score them: 307 of 6,854 applications (about 4.5%) have `credit_score` NULL. VayNhanh approved none of the 184 unscored cash-loan applications and only 24 of 123 unscored BNPL ones. Young people and first-time borrowers are often thin-file, so a lender that wants to grow has to find other signals (wallet history, bill payments, a small first limit that grows with good behaviour).

> **BA corner:** a request like "lower the cut-off to grow approvals" needs, at minimum: the expected extra approvals, the expected extra bad rate (with the reject-inference caveat), the profit impact, a test design with a size limit, and the vintage report that will judge the result after 3–6 months.

## 10. Practice exercises

Use [SQL Practice → Fintech](/practice/sql?db=fintech) for the SQL ones.

### Exercise 1 — Read a funnel

A partner channel's weekly report shows: applied 420, pending 20, approved 210, cancelled 30, rejected 160. (Here "approved" means accepted and disbursed, as in VayNhanh.) Compute the approval rate and the take-up rate.

**Answer:** decided = 420 − 20 = 400. Lender said yes = 210 + 30 = 240, so the approval rate = 240 ÷ 400 = 60%. Take-up = 210 ÷ 240 = 87.5%. Dividing by 420 (all applications) would give 57.1% and wrongly count pending applications as "not approved".

### Exercise 2 — DPD by hand

A cash loan's schedule as of 2026-06-30: installment 1 due 2026-04-20 paid 2026-04-19; installment 2 due 2026-05-20 paid 2026-06-02; installment 3 due 2026-06-20 not paid; installment 4 due 2026-07-20 not paid. What is the DPD and the bucket?

**Answer:** installment 2 was late (13 days) but is paid, so it no longer counts. The oldest unpaid *due* installment is number 3 (installment 4 is not due yet). DPD = 30 June − 20 June = 10 days: bucket 1–30.

### Exercise 3 — Approval rate by product (SQL)

Write a query for the approval rate of `cash_loan` and `bnpl`, excluding pending applications.

**Answer:**

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

### Exercise 4 — Spot the bug

A colleague computes DPD like this and gets −257 for loan 2208. What is wrong?

```sql
SELECT loan_id,
       CAST(julianday('2026-06-30') - julianday(MAX(due_date)) AS INTEGER) AS dpd
FROM repayment_schedule
WHERE paid_date IS NULL
  AND loan_id = 2208
GROUP BY loan_id;
```

**Answer:** two bugs. `MAX(due_date)` picks the *newest* unpaid installment (2027-03-14) instead of the oldest, and the filter keeps installments not yet due. Use `MIN(due_date)` and add `AND due_date < '2026-06-30'`; the result becomes 47.

### Exercise 5 — "BNPL is three times riskier!"

A snapshot report shows the share of open loans more than 30 DPD: BNPL 9.8% (50 of 510), cash loans 3.4% (45 of 1,306). The product head concludes BNPL is three times riskier. Check this with a vintage view of 2025 loans (ever 30+ by MOB 3).

**Answer:**

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

At the same age, BNPL is somewhat worse, not three times worse. The snapshot is distorted by its denominator: BNPL loans last 3–6 months, so good ones close quickly (887 BNPL loans are already closed) and leave behind a small open book where the bad loans are overrepresented.

### Exercise 6 — PAR30 vs overdue amount

Four open loans: A outstanding 10M, current; B outstanding 6M, 15 DPD (overdue 1M); C outstanding 3M, 45 DPD (overdue 2M); D outstanding 1M, 120 DPD (overdue 1M). Compute PAR30 and the "overdue amount ÷ book" ratio.

**Answer:** book = 20M. PAR30 = (3 + 1) ÷ 20 = 20%. Overdue amount ÷ book = (1 + 2 + 1) ÷ 20 = 20% here too, but only by coincidence; the two measure different things. PAR30 counts the whole balance of C and D because the whole balance is at risk; B is not in PAR30 at all, since 15 DPD is under 30.

### Exercise 7 — A stakeholder scenario

The head of sales asks you to report that the March 2026 vintage "is fine, it has the same ever-30+ as the August 2025 vintage had at the same point in its life". August 2025 shows 0.0% at MOB 3 and March 2026 shows 7.4%. What do you reply?

**Answer:** the claim is wrong on the numbers we have: at MOB 3, March 2026 is 7.4% against 0.0% for August 2025 and about 2–4% for most vintages. Explain that the comparison has to be at the same MOB (and that young vintages cannot be judged at a MOB they have not reached), share the vintage table, and propose watching March and April at MOB 4–6 while the cause is investigated.

## 11. Summary

- A lending funnel has three rates with three denominators: approval (÷ decided), take-up (÷ approved) and end-to-end (÷ applied). A higher approval rate is not automatically good news.
- The loan book is measured by outstanding principal, not by total disbursed. Annuity installments are fixed, but early payments are mostly interest. Compare loan prices by APR, never by a flat monthly rate.
- DPD counts days since the oldest unpaid due installment, as of a date. Buckets (1–30, 31–60, 61–90, 90+) drive collections work.
- PAR30 puts the whole outstanding balance of 30+ loans over the whole book; NPL is the 90+ (or unlikely-to-pay) part. In Vietnam, loans are classified into five debt groups by days overdue; check the current SBV circular for the rules.
- Snapshot ratios are distorted by growth and by loans that close early. Vintage tables compare loans at the same MOB; blank cells are right-censored, not zero. At MOB 2–3, the March and April 2026 vintages are clearly worse than earlier ones, which da-08 investigates.
- Roll rates show how delinquent loans move between buckets; cures show how many come back. A lower cut-off buys volume at the price of more bad loans, and the bad rate below the old cut-off is unknown (reject inference). DTI checks affordability; thin-file customers need other signals.

### Key terms

| Term | Plain meaning |
|---|---|
| Approval rate | Share of decided applications the lender said yes to |
| Take-up rate | Share of approved offers the customer accepted and received |
| Outstanding principal | Principal still owed today |
| Annuity installment | Equal monthly payment covering interest plus some principal |
| APR | Yearly cost of credit on a reducing balance, usually incl. mandatory fees |
| DPD | Days the oldest unpaid installment is overdue |
| Bucket | DPD range, e.g. 31–60 |
| PAR30 | Outstanding of loans more than 30 DPD ÷ total outstanding |
| NPL | Loan 90+ DPD or unlikely to be repaid |
| Vintage / cohort | Loans disbursed in the same month |
| MOB | Months since the vintage month |
| Ever 30+ | Has been more than 30 DPD at any time so far |
| Right-censoring | The future of young loans is not yet observed |
| Roll rate | Share of loans moving to the next, worse bucket |
| Cure | Delinquent loan returning to current |
| Write-off | Removing an uncollectible loan from the book |
| Cut-off | Minimum score needed for approval |
| DTI | Monthly debt payments ÷ monthly income |
| Thin file | Too little credit history to score |

Next: **da-07 "Payments, Checkout & E-wallet Analytics"**, where the same funnel and rate thinking moves to card, QR and wallet payments, and you investigate the May 2026 OTP outage.
