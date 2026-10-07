# Descriptive Analysis: Describing Data with Numbers

## 1. Describe Before You Explain

Your manager forwards a question from the payments team: "Is our checkout doing well?" Before anyone can say *why* something happens, someone has to say clearly *what* happens: how many payments, how much money, what a typical payment looks like, which groups differ, how things change. That job is **descriptive analysis**: summarising data with a few honest numbers.

```text
  4. Prescriptive   "What should we do?"        -> recommendation
  3. Predictive     "What will happen next?"    -> forecast
  2. Diagnostic     "Why did it happen?"        -> investigation
  1. Descriptive    "What happened? How much?"  -> counts, sums, rates, trends
     ^ this topic: every step above stands on this one
```

Most questions a BA or junior analyst gets at a bank, lender or e-wallet sit on step 1, and a wrong step-1 number ruins everything above it. Six questions to ask of any table:

| Question | Tools |
|---|---|
| How many? | `COUNT(*)`, `COUNT(DISTINCT …)`, COUNTIFS |
| How much? | `SUM`, SUMIFS |
| What is typical? | mean (`AVG`), **median** |
| How spread out? | min, max, **percentiles**, histogram |
| Which groups differ? | **segmentation**: `GROUP BY`, pivot table |
| How is it changing? | growth **MoM** (month over month), **YoY** (year over year) |

We use the VayNhanh database (snapshot 2026-06-30, amounts in VND, timestamps in UTC). Every query runs at [SQL Practice → Fintech](/practice/sql?db=fintech).

---

## 2. Counting and Summing: How Many, How Much

One row in `loans` is one disbursed loan.

```sql
SELECT COUNT(*) AS loans, COUNT(DISTINCT customer_id) AS customers,
       SUM(principal) AS total_principal, ROUND(AVG(principal)) AS avg_principal
FROM loans;
```

| loans | customers | total_principal | avg_principal |
|---|---|---|---|
| 3106 | 2108 | 34040900000 | 10959723 |

VayNhanh has **disbursed** (paid out) 3,106 loans to 2,108 customers, about 34.0 billion VND. The **mean** (total ÷ count, the everyday "average") is about 11.0 million VND per loan.

- **`COUNT(*)` vs `COUNT(DISTINCT customer_id)`**: some customers borrowed more than once, so "how many loans?" and "how many borrowers?" have different answers. Say which one you counted.
- **`COUNT(column)` and `AVG` skip NULL**, and one wrong value can move a mean a lot:

```sql
SELECT COUNT(*) AS customers, COUNT(monthly_income) AS with_income,
       ROUND(AVG(monthly_income)) AS avg_income,
       ROUND(AVG(CASE WHEN monthly_income < 999999999 THEN monthly_income END)) AS avg_without_typos
FROM customers;
```

| customers | with_income | avg_income | avg_without_typos |
|---|---|---|---|
| 4000 | 3768 | 17069878 | 16286667 |

232 customers left income empty and `AVG` quietly leaves them out. The three 999,999,999 typos from the data-quality topic push the mean up by almost 0.8 million VND.

For payments, a payment "went through" when its status is `success` or `refunded`: the money moved, even if some came back later.

```sql
SELECT COUNT(*) AS payments, SUM(amount) AS gross_value,
       ROUND(AVG(amount)) AS avg_amount, MIN(amount) AS min_amount, MAX(amount) AS max_amount
FROM payments
WHERE status IN ('success', 'refunded');
```

| payments | gross_value | avg_amount | min_amount | max_amount |
|---|---|---|---|---|
| 6991 | 5124819000 | 733060 | 34000 | 22630000 |

> **Common misconception:** "A total is a total." A total only means something with its filter. Without the `WHERE` line you get 7,630 rows, including failed and pending attempts where no money moved. Every number you report should carry its definition: which rows, statuses, dates.

---

## 3. What Is Typical? Median, Percentiles and Skew

Is 733,000 VND what a typical customer pays? Check the **median**: sort the values and take the middle one; half are below, half above. SQLite has no `MEDIAN()`. You can sort and skip to the middle row (`ORDER BY amount LIMIT 1 OFFSET (n - 1) / 2`), but numbering the rows handles even counts too:

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

Result: **334000**. With an even count, `(n + 1) / 2` and `(n + 2) / 2` (integer division) are the two middle rows and `AVG` takes their midpoint, as Excel's MEDIAN does; with an odd count both point at the same row.

The mean (733,060) is more than **twice** the median. That gap is the signature of a **skewed** distribution: most payments are small, and a long tail of big ones (laptops, flights, course fees) drags the mean up.

### Percentiles

A **percentile** says "p% of values are at or below this". P50 is the median; P25 and P75 are the **quartiles**.

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

This is the **nearest-rank** method: the smallest value with at least p% of rows at or below it. Excel interpolates instead (section 8). Reading it: the middle half of payments lies between about 167,000 and 747,000 VND; the mean is almost at P75, so only about a quarter of payments are above the "average"; the top 1% start at 6 million.

### A histogram

A **histogram** counts values per band (**bucket**): `CASE WHEN amount < 100000 THEN '1. < 100k' WHEN amount < 250000 THEN … END AS amount_band`, `GROUP BY amount_band`, and `ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1)` for the share.

```text
amount band    payments   share
< 100k            664     9.5%  #########
100k-250k        2064    29.5%  ##############################
250k-500k        1754    25.1%  #########################
500k-1M          1224    17.5%  #################
1M-2M             703    10.1%  ##########
2M-5M             474     6.8%  #######
5M+               108     1.5%  ##
                    ^ median (334k)       ^ mean (733k) sits out here
```

Bulk on the left, long tail to the right: **right-skewed**. Fintech money data almost always looks like this: loans (mean principal about 11.0 million, median 8.0 million: run the same median query on `loans.principal`), payments, balances, incomes. The tail carries the money: the largest 10% of payments (699 rows) add up to **48.3%** of all payment value (sort by `amount DESC`, `LIMIT` a tenth of the rows, divide their sum by the total).

| Question | Report | Why |
|---|---|---|
| What does a typical customer pay, borrow, earn? | **median** | Not pulled by the tail or by typos: the income median is 14.6 million with or without the three typos |
| How much money in total? | **sum**, **mean** | Mean × count = total, which finance needs |
| How risky or unequal? | **P90, P99, max** | Fraud, limits and big losses live in the tail |

> **Common misconception:** "The average is the typical value." Only for roughly symmetric data. With skewed money data the mean is above what most customers do. Report the median next to it and say which one you used.

---

## 4. Segmentation: Breaking the Total into Groups

**Segmentation** means splitting data by a category (product, channel, merchant category, method, device, city) and describing each group: `GROUP BY` in SQL, a pivot table in Excel. Run the loans query from section 2 with `GROUP BY product`: BNPL (**buy now, pay later**) has 1,397 loans averaging about 4.6 million VND, cash loans 1,709 loans averaging about 16.1 million, and cash loans carry about 81% of the principal. The medians (add `PARTITION BY product` to both window functions of the median query, then `SELECT product, …` with `GROUP BY product`) are 4.0 and 13.5 million. A company "average loan of 11 million" describes neither product.

Payments by merchant category, with each group's **share**:

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

Two different "biggest categories": food delivery by **count** (26.4% of payments), electronics by **value** (39.1% of the money from 8.8% of payments). Support teams care about counts; finance cares about value. Median amounts range from 120,000 VND (food delivery) to 2,442,000 VND (electronics), so a fraud rule "flag payments over 2 million" would hit 63% of electronics purchases and not one food order.

Good habits:

1. Pick segments someone can act on, and **show the count next to every rate or average**: a segment of 12 rows can show anything by chance.
2. **Clean the category first**: raw `city` splits Ho Chi Minh City into "HCMC", "TP.HCM" and friends (data-quality topic).
3. **Check that the parts add up** to the total (here 6,991 payments and 5,124,819,000 VND).

> **BA corner:** when a stakeholder asks for "a report by city", write the segment definition into the requirement: which column, how spelling variants are mapped, where blanks go ("Unknown" row), and that rows must sum to the company total. That one acceptance criterion prevents most "the numbers don't match" arguments.

---

## 5. Rates vs Counts: Choosing the Denominator

A **count** says how many; a **rate** says how many *out of how many*. The bottom of the fraction, the **denominator**, decides what the rate means.

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

Electronics (26 refunds) and grocery (23) look alike by count, but electronics refunds 4.2% of its payments and grocery 1.5%: almost three times the rate. Fashion stands out at 7.2% (wrong size, wrong colour).

Two SQLite tricks: `SUM(status = 'refunded')` counts matching rows because a comparison returns 1 or 0, and `100.0 *` forces decimal division. Without the `.0`, integer division returns 0.

### Same event, different denominators

Company-wide, 175 refunds ÷ all 7,630 payment rows = 2.29%, but ÷ the 6,991 payments that went through = 2.50%. A failed payment cannot be refunded, so it doesn't belong below the line. The rule: **the denominator is everyone who *could* have had the outcome.**

**Payment success rate** has the same choice. Statuses are `success`, `refunded` (succeeded, refunded later), `failed` and `pending` (no final answer yet):

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

The naive version treats refunded payments as failures (they weren't) and pending ones as failures before they finish. Company-wide: 89.3% vs 91.8%, a gap that comes purely from the definition.

Ask of any rate: **per what?** (attempt, session, customer: a customer who retries three times is 3 attempts but 1 customer), **who is excluded and why?** (pending, tests, duplicates), and **is the period finished?** (refunds arrive days later, so this week's refund rate always looks too low).

> **Try it yourself:** run the success-rate query with `GROUP BY device`. Check that `attempts` adds up to 7,630.

> **BA corner:** a KPI without a written denominator is a future argument. In a report spec, write each rate as numerator / denominator, filters, period: "Payment success rate = payments with status success or refunded / payments with a final status, by VN-time day of creation".

---

## 6. Percent vs Percentage Points, and Growth

### % vs pp

Card success rate 89.3%, QR 94.9%. How much better is QR?

- **Percentage points (pp)**, the plain difference: 94.9 − 89.3 = **5.6 pp**.
- **Relative %**, the difference as a share of the start: 5.6 ÷ 89.3 ≈ **6.3% higher**.
- From the failure side: card fails 10.7% of the time, QR 5.1%, about **2.1 times as often**.

All three are true; "QR is 5.6% better" is not. Use "pp" for the gap between two rates and "%" for relative change.

### Growth: MoM, QoQ, YoY

**Growth rate** = (this period − previous period) ÷ previous period. Monthly payment value by Vietnam-time month (`'+7 hours'`); `LAG` fetches the previous row (da-05 explains it):

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

| month_vn | value (million VND) | mom_pct |
|---|---|---|
| 2025-07 | 326.7 | NULL |
| 2025-08 | 419.6 | 28.4 |
| 2025-09 | 353.6 | -15.7 |
| 2025-10 | 440.2 | 24.5 |
| 2025-11 | 436.7 | -0.8 |
| 2025-12 | 388.7 | -11 |
| 2026-01 | 474.2 | 22 |
| 2026-02 | 432.3 | -8.8 |
| 2026-03 | 450.4 | 4.2 |
| 2026-04 | 444.0 | -1.4 |
| 2026-05 | 465.2 | 4.8 |
| 2026-06 | 493.2 | 6 |

MoM swings between +28% and −16%. With 500–650 payments a month and a long right tail, a few multi-million electronics orders can move a month. Zoom out before calling anything a trend: Q2 2026 totals 1,402,411,000 VND vs 1,356,926,000 in Q1, about **+3.4% QoQ**. Months also differ in length (February is short, and Tết fell in it in 2026).

### YoY and the base effect

Successful wallet top-ups (`txn_type = 'top_up'`) and wallets opened by month end (`SUM(opened_date <= '2025-06-30')` on `wallets`):

| month (VN) | top-ups | top-up value (VND) | wallets opened |
|---|---|---|---|
| 2025-06 | 447 | 268,800,000 | 708 |
| 2026-06 | 1,413 | 861,160,000 | 2,235 |

Top-up value grew about **+220% YoY** (3.2 times). Do customers love the wallet more? Per wallet: 447 ÷ 708 ≈ 0.63 top-ups in June 2025, 1,413 ÷ 2,235 ≈ 0.63 in June 2026. Usage per wallet is flat; growth came from more wallets. Both statements are true and lead to different decisions.

Beware the **base effect**: from a tiny start, growth looks huge. Top-ups went from 16 in October 2024 (the first wallet month) to 47 in November, a "+194%" that means almost nothing.

> **Common misconception:** "Value grew 6% in June, so the new feature worked." One month of change in a noisy series is not evidence. Compare longer windows and the same month last year, and check whether the volume behind it changed.

---

## 7. Simpson's Paradox and Correlation vs Causation

### Simpson's paradox

A total can point one way while **every** group points the other. The numbers below are invented for teaching. A payments team compares two card gateways:

| Card type | Gateway A | Gateway B |
|---|---|---|
| Domestic | 950 / 1,000 = 95.0% | 288 / 300 = 96.0% |
| International | 60 / 100 = 60.0% | 560 / 900 = 62.2% |
| **All cards** | **1,010 / 1,100 = 91.8%** | **848 / 1,200 = 70.7%** |

B wins for domestic *and* international cards, yet loses badly in total, because of the **mix**: B gets mostly international cards, which fail more everywhere. Moving traffic to A "because it has the better success rate" would be a mistake. Whenever you compare totals of two groups, ask "same mix?" and break the comparison down by the main driver (card type, product, amount band, tenure).

### Correlation is not causation

Two things are **correlated** when they move together; that doesn't mean one *causes* the other. Real example: do wallets that receive cashback make more wallet payments?

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

Drop `tenure` from the query and you get 1,028 cashback wallets averaging 0.95 payments vs 1,043 others at 0.6: "about 60% more payments, double the cashback budget!" Split by tenure and the gap shrinks from 0.35 to 0.11 and 0.14, and most cashback wallets are old ones (671 of 1,028). Older wallets had more months to collect cashback *and* to pay. Wallet age is a **confounder**: a third factor driving both.

```text
  A and B move together. Possible reasons:
  1. A causes B               (what everyone hopes)
  2. B causes A               (reverse causation)
  3. C causes both            (confounder: tenure, income, season, city size)
  4. Selection                (only certain customers could get A)
  5. Chance                   (small groups, many comparisons)
```

To show cashback *causes* more payments you need an experiment: give it to a random half of similar wallets and compare (A/B testing, in da-08). Descriptive analysis can only say "these move together, and here is what else differs".

> **BA corner:** when a stakeholder says "X drives Y", restate it as a testable requirement: "If a random group gets X, their Y will be at least Z higher than a control group's after N weeks." An opinion becomes an acceptance criterion for an experiment.

---

## 8. Excel and Google Sheets: Describing an Exported Table

An afternoon of payments (2 June 2026, 12:00–20:00 VN time), exported with:

```sql
SELECT p.payment_id, time(p.created_at, '+7 hours') AS time_vn, m.category, p.method, p.amount, p.status
FROM payments p
JOIN merchants m ON m.merchant_id = p.merchant_id
WHERE datetime(p.created_at, '+7 hours') BETWEEN '2026-06-02 12:00:00' AND '2026-06-02 19:59:59'
ORDER BY p.payment_id;
```

Paste it so the header is row 1 and the data rows 2–12 (columns A–F):

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

### Step 1: COUNTIFS, SUMIFS, AVERAGEIFS (and the trap)

| What | Formula | Result |
|---|---|---|
| Rows | `=COUNTA(A2:A12)` | 11 |
| Successful payments | `=COUNTIFS(F2:F12,"success")` | 9 |
| Average of all amounts | `=AVERAGE(E2:E12)` | 800,818 (wrong: includes the failed 4,061,000) |
| Value of successful payments | `=SUMIFS(E2:E12,F2:F12,"success")` | 4,132,000 |
| Average successful payment | `=AVERAGEIFS(E2:E12,F2:F12,"success")` | 459,111 |
| Successful card payments | `=COUNTIFS(D2:D12,"card",F2:F12,"success")` | 4 |
| Successful card food orders, value | `=SUMIFS(E2:E12,D2:D12,"card",C2:C12,"food_delivery",F2:F12,"success")` | 212,000 |

Plain AVERAGE looks fine and is wrong. The `…IFS` family takes pairs of (range, condition); SUMIFS and AVERAGEIFS put the range to add **first**. The denominator choice comes back too: `=COUNTIFS(F2:F12,"success")/COUNTA(F2:F12)` gives 81.8%, while counting the refunded row as "went through", `=(COUNTIFS(F2:F12,"success")+COUNTIFS(F2:F12,"refunded"))/COUNTIFS(F2:F12,"<>pending")` gives 90.9%.

### Step 2: MEDIAN and PERCENTILE with a condition

These have no "IFS" version, so filter first:

- Sheets and Excel 365: `=MEDIAN(FILTER(E2:E12,F2:F12="success"))` → **231,000**. Older Excel: `=MEDIAN(IF(F2:F12="success",E2:E12))` confirmed with Ctrl+Shift+Enter (an array formula).
- `=PERCENTILE.INC(FILTER(E2:E12,F2:F12="success"),0.9)` → **966,800** (Sheets' `PERCENTILE` gives the same).

The mean (459,111) is double the median (231,000) because of one 2,218,000 electronics order: the database's skew in miniature. And 966,800 isn't in the table because PERCENTILE.INC **interpolates**: position 1 + 0.9 × 8 = 8.2 is not a whole row, so it goes 20% of the way from the 8th sorted value (654,000) to the 9th (2,218,000). SQL nearest-rank would say 2,218,000. With 9 values a P90 is shaky whichever method you use; pick one, say which, and quote percentiles only from enough rows. A SQL check of the window (`status = 'success'`) returns 9 payments, 4,132,000 and 459,111, matching the sheet.

### Step 3: a pivot table

A **pivot table** is `GROUP BY` with a mouse.

1. Click a cell in the data. Excel: **Insert → PivotTable → New worksheet**. Sheets: **Insert → Pivot table → New sheet**.
2. Drag `method` into **Rows**.
3. Into **Values**: `payment_id` as **Count** (Sheets: COUNTA) and `amount` as **Sum**.
4. Put `status` in **Filters**, keep only `success`, and sort by the sum.

| method | Count of payment_id | Sum of amount |
|---|---|---|
| qr_code | 4 | 3,211,000 |
| card | 4 | 859,000 |
| e_wallet | 1 | 62,000 |
| **Grand total** | **9** | **4,132,000** |

The grand total matches SUMIFS: always check. Notice `bank_transfer` vanished: its only row failed. And QR "wins" only because the 2,218,000 order is 69% of QR's total. With 9 rows, one payment decides the ranking: a sample-size warning, not an insight. Try also `category` in Rows and `status` in **Columns**.

### Step 4: conditional formatting

Select A2:F12 → **Format → Conditional formatting** (Excel: Home → Conditional Formatting → New Rule → "Use a formula"), custom formula `=$F2<>"success"`, light red fill: the failed and refunded rows light up. On E2:E12 add a **color scale** so big amounts stand out.

> **Try it yourself:** in the pivot, add `refunded` to the status filter. The QR row should become 5 payments and 3,827,000 VND.

> **Common misconception:** "Pivot totals are always right." A pivot adds whatever is in the sheet, including missing, duplicated or wrong-status rows. Reconcile the grand total with a number from the source before you share.

---

## 9. Practice Exercises

### Exercise 1 — Mean and median by hand

Seven BNPL payments that went through, 1–10 June 2026 (first seven by `payment_id`): 84,000 (food), 1,140,000 (education), 1,612,000 (travel), 1,573,000 (education), 1,145,000 (travel), 264,000 (grocery), 913,000 (travel). Compute the total, mean and median. Which describes a "typical BNPL purchase"?

**Answer:** total 6,731,000 VND; mean ≈ 961,571. Sorted: 84k, 264k, 913k, **1,140k**, 1,145k, 1,573k, 1,612k, so the median is 1,140,000. Here the mean is *below* the median: two small baskets pull it down. In a small sample skew can go either way; the median describes the typical purchase, and with seven rows say "small sample".

### Exercise 2 — Percent or percentage points?

A slide says: "QR success rate is 94.9% vs 89.3% for cards: QR is 5.6% better." Fix it.

**Answer:** "QR's success rate is **5.6 percentage points** higher (94.9% vs 89.3%), about **6.3% higher in relative terms**." Or: cards fail 10.7% of the time vs 5.1%, about 2.1 times as often.

### Exercise 3 — SQL: describe wallet top-ups

Write one query for the number of successful top-ups, the mean, the median and the P90 (nearest rank).

**Answer:**

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

The typical top-up is 500,000 VND; the mean (about 614,000) is higher because of the right tail; roughly one in ten is 1.11 million or more.

### Exercise 4 — Formulas on the 2 June sheet

On the section 8 sheet, write formulas for (a) the `qr_code` success rate counting only `success`, (b) the median of successful food-delivery payments.

**Answer:** (a) `=COUNTIFS(D2:D12,"qr_code",F2:F12,"success")/COUNTIFS(D2:D12,"qr_code")` = 4 ÷ 5 = **80%** (5 ÷ 5 = 100% if the refunded row counts as "went through": say which). (b) `=MEDIAN(FILTER(E2:E12,(C2:C12="food_delivery")*(F2:F12="success")))` (multiplying two conditions means AND): sorted 49k, 62k, **108k**, 163k, 231k, so **108,000 VND**.

### Exercise 5 — Find the bugs

A refund-rate query returns 0 for every method: `SELECT method, SUM(status = 'refunded') / COUNT(*) AS refund_rate FROM payments GROUP BY method;` What is wrong?

**Answer:** (1) Integer division: both sides are integers, so SQLite returns 0; multiply by `100.0` first. (2) The denominator includes failed and pending attempts, which can never be refunded. Fixed:

```sql
SELECT method,
       SUM(status = 'refunded') AS refunded,
       ROUND(100.0 * SUM(status = 'refunded') / SUM(status IN ('success', 'refunded')), 1) AS refund_rate_pct
FROM payments
GROUP BY method
ORDER BY refund_rate_pct DESC;
```

BNPL comes out highest at 3.3%, then e-wallet and card at 2.8%, QR and bank transfer at 2.0%. But BNPL's 3.3% rests on only 13 refunds: report the count with the rate.

### Exercise 6 — Critique a monthly report

"Payment value grew 6.0% MoM in June 2026. The checkout banner launched in June is clearly working." What's wrong?

**Answer:** (1) This series has swung between +28.4% and −15.7% MoM; one month means little. (2) A few big electronics payments can move a right-skewed monthly total. (3) Compare longer windows (Q2 vs Q1 2026: about +3.4%) and the same month last year. (4) Even a real rise only *coincides* with the banner; credit it with an A/B test, or at least compare customers who saw it with similar ones who didn't. (5) Ask for the payment count and median next to the value.

### Exercise 7 — "BNPL makes people spend more"

Marketing shows average amount by method (payments that went through): BNPL 1,637,370 VND over 397 payments, card 681,159 over 2,541. "BNPL baskets are 2.4 times bigger. Make BNPL the default to raise basket size." What do you check and say?

**Answer:** check which baskets use BNPL in the first place:

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

BNPL is chosen *because* the basket is already big (17.7% of 1M+ baskets vs 3% of smaller ones): selection, or reverse causation. Tell marketing: "BNPL is used for big purchases; the data doesn't show it makes purchases bigger. Let's A/B test showing BNPL first on a random half of checkouts." And bring in the risk team: making BNPL the default changes credit exposure.

---

## 10. Summary

- **Describe before you explain**: count, sum, typical value, spread, segments, trend. Always state the definition (rows, statuses, dates, time zone).
- **Money data is right-skewed**: the mean sits above what most customers do (payments: mean 733k, median 334k). Report the median and percentiles too.
- SQLite has no MEDIAN: `ROW_NUMBER()` + `COUNT(*) OVER ()`, average the middle one or two rows; for percentiles take the smallest value with `rn >= p * n`.
- **Segment** to find differences; show counts next to rates; clean categories; check the parts add up.
- **The denominator is everyone who could have had the outcome.** Multiply by `100.0` in SQLite.
- **pp vs %**: 89.3% → 94.9% is +5.6 pp, about +6.3% relative.
- **Growth**: MoM is noisy; compare longer windows, mind the base effect, normalise (per wallet, per customer).
- **Simpson's paradox**: check the mix. **Correlation ≠ causation**: look for confounders, reverse causation and selection; only an experiment proves cause.
- **Excel / Sheets**: COUNTIFS, SUMIFS, AVERAGEIFS, MEDIAN(FILTER(…)), PERCENTILE.INC, pivot tables, conditional formatting, and reconcile with the source.

### Key terms

| Term | Plain meaning |
|---|---|
| Descriptive analysis | Summarising what happened with counts, sums, typical values, spread and trends |
| Mean / median | Total ÷ count / the middle value after sorting |
| Percentile (P90) | The value that 90% of the data is at or below |
| Skewed (right-skewed) | Most values small, with a long tail of large ones |
| Segmentation | Splitting data into groups and describing each |
| Denominator | The bottom of a fraction: what a rate is "out of" |
| Percentage point (pp) | The plain difference between two percentages |
| MoM / QoQ / YoY | Growth vs previous month / quarter / same period last year |
| Base effect | Huge growth percentages caused by a tiny starting value |
| Simpson's paradox | A total showing the opposite of every subgroup |
| Confounder | A third factor that drives two things and makes them look linked |
| Pivot table | A spreadsheet tool that groups and summarises rows, like GROUP BY |

Next: **da-05 "SQL for Analysis"**: conditional aggregation, joins without double-counting, date bucketing, CTEs and window functions on fintech.db.
