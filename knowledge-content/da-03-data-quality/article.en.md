# Data Quality & Cleaning: Finding and Fixing Problems in Fintech Data

## 1. Why data quality comes first

A manager asks for the average monthly income of customers in Hai Phong. You run one query, get **22 million VND**, and Hai Phong becomes the richest city in the report. Later someone notices that two customers there typed `999,999,999` into the income field. The real answer was about 14.7 million.

That is the lesson of this topic: **a query that runs is not the same as an answer that is right.** SQL will happily average typos, count one payment twice and file a late-night purchase under the wrong day. The data never warns you.

**Data quality** means "can this data be trusted for the decision we want to make?" Teams split it into six **dimensions** (angles to check from):

| Dimension | Plain question | Example in fintech.db |
|---|---|---|
| **Completeness** | Is anything missing? | `monthly_income` is NULL for some customers |
| **Validity** | Does the value follow the rules (type, range, allowed list)? | An income of 999,999,999 VND a month |
| **Consistency** | Is the same thing written the same way? | "Hanoi", "Ha Noi", "HN", " Hanoi" |
| **Uniqueness** | Is each real event recorded once? | One card payment stored twice |
| **Timeliness** | Is the data fresh, has every process finished? | A payment still `pending` months later |
| **Accuracy** | Does it match reality or a trusted source? | A wallet balance that disagrees with its transactions |

Use them as a **checklist**: before trusting a table, walk through the six questions and write down what you find.

```text
 raw data ──► profile ──► find problems ──► agree a rule ──► clean copy ──► analysis
 (never edited)  (counts, NULLs,  (six dimensions)               (view, CTE,
                  min, max, distinct)                             new sheet)
```

The practice database is the fictional lender **VayNhanh** (snapshot date 2026-06-30, timestamps in UTC), with every problem above planted on purpose. Open [SQL Practice → Fintech](/practice/sql?db=fintech) and run each query as you read.

> **Common misconception:** "Clean data has no NULLs." Some NULLs are correct: `decided_at` is NULL while a loan application is pending, `failure_reason` is NULL for a successful payment. Quality means **fit for the purpose**, not tidy-looking.

## 2. Missing values (completeness)

`COUNT(*)` counts rows; `COUNT(column)` counts only rows where that column is **not** NULL. The gap is your missing data.

```sql
SELECT COUNT(*)              AS rows_total,
       COUNT(monthly_income) AS rows_with_income,
       COUNT(*) - COUNT(monthly_income) AS missing_income
FROM customers;
```

| rows_total | rows_with_income | missing_income |
|---|---|---|
| 4000 | 3768 | 232 |

So 232 of 4,000 customers (about 5.8%) never declared an income. The same check on `loan_applications` finds 307 of 6,854 applications (about 4.5%) with no `credit_score`: "thin-file" applicants with no credit history to score.

### NULL is "unknown", not zero

`AVG` silently skips NULLs, so an average describes only the people who answered. The dangerous "fix" is to turn NULL into 0:

```sql
SELECT ROUND(AVG(credit_score), 1)              AS avg_known_scores,
       ROUND(AVG(COALESCE(credit_score, 0)), 1) AS avg_null_as_zero
FROM loan_applications;
```

| avg_known_scores | avg_null_as_zero |
|---|---|
| 631.2 | 603 |

Treating a missing history as a score of 0 drags the average down by about 28 points and invents 307 terrible borrowers. A missing score is a **different kind of customer**, not a bad one.

Options for missing values, safest first: report the share missing; segment them as their own group; ask why (optional field? old app version?); impute (fill with a typical value) only under an agreed rule and with a flag column.

> **Try it yourself:** run `SELECT employment, COUNT(*) - COUNT(monthly_income) AS missing FROM customers GROUP BY employment;` Missing incomes appear in all four employment types; salaried has the most (133) simply because it is the biggest group.

## 3. Outliers and invalid values (validity)

An **outlier** is a value far from the others. Some are real (a customer who earns 70 million a month); some are **invalid**, values that cannot be true. Always look at the extremes first:

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

Nine 9s is a classic placeholder or typo. The next value, 74.2 million, is believable. Three rows out of 4,000 look harmless, but watch a segment:

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

Two typos move Hai Phong from third place to first. `NULLIF(x, 999999999)` returns NULL when `x` is the typo, so `AVG` skips it: we treat the typo as "unknown" instead of guessing. Across all customers the average falls from about 17.1 to about 16.3 million.

### Validity rules

A **validity rule** is a test every row should pass. Write it to return the **bad** rows; zero rows means the check passed.

| Rule | Bad rows | Result |
|---|---|---|
| Credit score within 300–850 | `WHERE credit_score NOT BETWEEN 300 AND 850` | 0 |
| Payment amount positive | `WHERE amount <= 0` | 0 |
| Rejected application has a reason | `WHERE status = 'rejected' AND reject_reason IS NULL` | 0 |
| Decision after application | `WHERE decided_at < applied_at` | 0 |
| Income below a sanity ceiling | `WHERE monthly_income > 200000000` | 3 |

Keep passing checks too: they are evidence, and they catch the day a release breaks something.

> **Common misconception:** "Outliers should be deleted." Delete the 74-million earner and you erase a real customer. Only **impossible or confirmed-wrong** values are excluded, and only in your clean copy.

## 4. Inconsistent categories (consistency)

`city` comes from a free-text box on the sign-up form. Profile any category column with `GROUP BY`:

```sql
SELECT city, COUNT(*) AS customers
FROM customers
GROUP BY city
ORDER BY customers DESC;
```

You get **20 distinct values for 9 real cities**: the nine clean names plus `hanoi` (20), `Ha Noi` (14), `HCMC` (14), `TP.HCM` (13), ` Hanoi` with a leading space (13), `HN` (12), `ho chi minh city` (10), `Ho Chi Minh` (10), `Danang` (8), `Ho Chi Minh City ` with a trailing space (7) and `DN` (6). Stray spaces are invisible in most tools, which is why they survive.

The fix is a **mapping**: trim, lower-case, translate each variant to one standard name.

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

Raw counts were 1,277, 1,107 and 302. A report on the raw column undercounts every big city and shows ghost cities called "HN" and "DN".

### The same fix in Excel or Google Sheets

1. Export `customers`; next to `city` (column E) add a helper column F: `=LOWER(TRIM(E2))`.
2. On a second tab, build a **mapping table**: column A = variant (`hcmc`, `tp.hcm`, `ha noi`…), column B = standard name.
3. In `city_clean`: `=IFERROR(XLOOKUP(F2, Mapping!A:A, Mapping!B:B), PROPER(F2))` (`VLOOKUP` in older Excel).
4. Check: a pivot table on `city_clean` shows exactly 9 cities.

A mapping table beats a chain of Find & Replace: it is visible, reviewable and reusable next month.

> **BA corner:** inconsistent categories are a **requirements** problem first. In the sign-up story, specify a dropdown for city and an acceptance criterion such as "City is chosen from the official province list; free text is not accepted". One line in a story saves a cleaning step in every future report.

## 5. Duplicates: double charges and retries (uniqueness)

A customer pays by QR code, the network hiccups, the app retries, and the payment is recorded twice. That is a **double charge**: real money taken twice for one purchase.

First decide the **business key**: which columns together mean "the same real event"? For checkout, one `session_id` should end in at most one successful payment.

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

Without `LIMIT` there are **37 sessions**. In session `S000096`, payments 52 and 7625 are both 134,000 VND by `qr_code`, created two seconds apart. Across all 37 pairs the gap is 1 to 8 seconds: the fingerprint of an automatic retry, not a customer buying twice.

A looser key, "same customer, merchant and amount", finds **40** pairs. The extra three are different sessions days or months apart (payments 5889 and 6001: 83,000 VND each, about six days apart), a customer reordering the same lunch. Removing those would delete real revenue. **The key decides the answer.**

`ROW_NUMBER()` numbers the rows in each session; keep only number 1:

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

The duplicates add 20,103,000 VND, about 0.4% of the total. Small for a chart, but for 37 customers it is money to refund, and for the payments team it is a bug that needs an **idempotency key** (one request ID, so a retry can never create a second charge).

## 6. Stuck statuses and fresh data (timeliness)

`pending` is normal for seconds or minutes while the bank confirms. A payment still `pending` weeks later is **stuck**: nobody knows whether money moved.

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

There are 18 pending payments. One (7568, from 2026-06-29) is under a day old, which is plausible; the other 17, worth 14,090,000 VND, are over a week old. The snapshot date is written literally: today's date would make the days-pending figure change on every rerun.

A good rule uses a **threshold agreed with the business** ("pending over 24 hours = stuck, send to operations"). The analyst does not decide whether a stuck payment succeeded; that needs the gateway's record.

Timeliness also asks whether each table is **fresh**:

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

All three reach the snapshot day. If one stopped loading three days earlier, a last-7-days chart would show a fake drop. Likewise the 29 loan applications still `pending` were all submitted from 2026-06-27 on: recent and undecided, which is expected.

## 7. Time zones: UTC vs Vietnam date

fintech.db stores every timestamp in **UTC**; Vietnam is **UTC+7**. A purchase at 00:41 on 2 June in Vietnam is stored as `2026-06-01 17:41:03`.

```text
 UTC      00:00 ─────────── 16:59 │ 17:00 ─────── 23:59
 Vietnam  07:00 ─────────── 23:59 │ 00:00 ─────── 06:59 (next day)
          rows stored at 17:00–23:59 UTC belong to the NEXT day in Vietnam
```

Group by the UTC date and every daily total is shifted by seven hours:

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

Same day, two answers: about 9.1 vs 13.4 million VND. The Vietnam figure matches what merchants and customers experienced. Across the table, 571 of 7,630 payments (about 7.5%) move to a different calendar day once converted.

In SQLite use `date(created_at, '+7 hours')` or `datetime(created_at, '+7 hours')`. In Excel a timestamp is a number of days: Vietnam time is `=A2 + 7/24`, the Vietnam date `=INT(A2 + 7/24)`.

> **BA corner:** every report spec needs a line saying which time zone defines a day, e.g. "Daily totals use Vietnam time (UTC+7), midnight to midnight". Without it, the finance report and the product dashboard disagree every day, and both teams are "right".

## 8. Reconciliation: balance vs ledger (accuracy)

**Reconciliation** compares two records of the same money that should agree, and investigates every difference (a **break**). Each wallet stores a `balance`; separately, every top-up, payment and transfer is a row in `wallet_transactions`. The balance should equal the sum of the successful transactions.

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

Six of 2,235 wallets break. Wallet 1499 holds 1,000,000 VND with **no transactions at all**; wallet 801 is 50,000 VND short, so the customer may have lost money. The analyst finds and sizes breaks; finance decides which side is right.

| Detail in the query | What goes wrong without it |
|---|---|
| `t.status = 'success'` | Failed transactions count as money that moved: **1,035 wallets** look broken. |
| That filter in `ON`, not `WHERE` | `WHERE` drops wallets with no successful transaction: 377 and 1499 vanish, you report 4 breaks. |
| `LEFT JOIN` + `COALESCE(…, 0)` | Wallets with no transactions disappear or show a NULL difference. |

> **Common misconception:** "If the totals match, the details match." A +200,000 break on one wallet and -200,000 on another cancel out in the grand total. Reconcile at the grain of the account, not only in aggregate.

## 9. Cleaning rules: fix in a copy, write it down

1. **Never edit the source.** The raw table is evidence. `UPDATE` the 999,999,999 away and nobody can check what was there or tell product the form is broken.
2. **Clean in a layer on top**: a view, a CTE, a new sheet. Keep the raw column next to the clean one.
3. **Flag, don't hide**: add columns such as `income_flag` so anyone can count what changed.
4. **Write a cleaning log** someone else can read and challenge.
5. **Report problems back** to the team that owns the source.

A clean layer for customers, as a reusable CTE (in practice it would also carry the city `CASE` from section 4):

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

The output documents itself: 3 invalid, 232 missing, 3,765 used. Pair it with a **cleaning log**:

| Column / table | Problem | Rows | Rule | Told |
|---|---|---|---|---|
| customers.city | 11 variants of 3 cities | 127 | Trim, lower-case, map | Product |
| customers.monthly_income | 999,999,999 typo | 3 | Treat as NULL, flag | Product |
| customers.monthly_income | Not provided | 232 | Leave NULL, report % | n/a |
| payments | 2nd success in a session | 37 | Exclude; list for refund | Payments |
| payments.status | Pending > 24 h | 17 | Show as "stuck" | Operations |
| all timestamps | Stored in UTC | all | Group on `date(x, '+7 hours')` | n/a |
| wallets.balance | Differs from ledger | 6 | Unchanged; send evidence | Finance |

(127 is the sum of the eleven variant counts in section 4.)

> **BA corner:** each log row is a **data requirement** waiting to be written: a city dropdown, an income range check on the form, an idempotency key on retries, an alert for payments pending over 24 hours, a daily reconciliation job. Turn each into a story with acceptance criteria and the problem stops arriving.

## 10. Practice exercises

### Exercise 1 — Which day does it belong to?

Successful payments, times in UTC:

| payment_id | created_at (UTC) | amount |
|---|---|---|
| 6898 | 2026-05-31 16:08:58 | 412000 |
| 6899 | 2026-05-31 23:55:12 | 445000 |
| 6900 | 2026-05-31 23:55:30 | 5778000 |
| 6911 | 2026-06-01 15:58:24 | 362000 |
| 6913 | 2026-06-01 17:41:03 | 882000 |

Which rows belong to 1 June in Vietnam, and what is their total? What would a UTC report put on 1 June?

**Answer:** add 7 hours. 6898 → 23:08 on 31 May (out). 6899 and 6900 → 06:55 on 1 June, 6911 → 22:58 on 1 June (in). 6913 → 00:41 on 2 June (out). Vietnam 1 June = 445,000 + 5,778,000 + 362,000 = **6,585,000 VND**. A UTC report would show only 6911 and 6913: **1,244,000 VND**. Check with `SELECT payment_id, datetime(created_at, '+7 hours') AS vn_time FROM payments WHERE payment_id IN (6898, 6899, 6900, 6911, 6913);`

### Exercise 2 — An average by hand

Five declared incomes: 12,000,000; 15,000,000; (blank); 9,000,000; 999,999,999. Compute (a) raw `AVG()`, (b) the average with 999,999,999 treated as unknown, (c) the average if blanks and unknowns become 0.

**Answer:** (a) `AVG` skips the blank and divides by 4: ≈ **259 million**, absurd. (b) 36,000,000 / 3 = **12,000,000**. (c) 36,000,000 / 5 = **7,200,000**, too low. Only (b) is honest, reported as "based on 3 of 5 customers".

### Exercise 3 — How many customers really live in Da Nang?

Raw `GROUP BY city` shows 302. Count every spelling.

**Answer:**

```sql
SELECT COUNT(*) AS da_nang_customers
FROM customers
WHERE LOWER(TRIM(city)) IN ('da nang', 'danang', 'dn');
```

It returns **316** (302 + 8 `Danang` + 6 `DN`). Re-run `SELECT DISTINCT city FROM customers` first in case new variants appeared.

### Exercise 4 — Which payment methods double-charge?

Count the second successful payments per session, and their amount, by method.

**Answer:**

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

Card leads (15 rows, about 9.4 million VND); none come from the e-wallet. A lead for the payments team, not a conclusion.

### Exercise 5 — Spot the bug in the reconciliation

A colleague's query finds only **4** broken wallets. Why?

```sql
SELECT w.wallet_id, w.balance, SUM(t.amount) AS ledger,
       w.balance - SUM(t.amount) AS difference
FROM wallets w
LEFT JOIN wallet_transactions t ON t.wallet_id = w.wallet_id
WHERE t.status = 'success'
GROUP BY w.wallet_id
HAVING difference <> 0;
```

**Answer:** `WHERE t.status = 'success'` runs after the join and removes wallets with no successful transaction, turning the `LEFT JOIN` into an inner join. Wallets 377 (200,000 VND) and 1499 (1,000,000 VND) have no transactions, so the two most suspicious breaks vanish. Move the filter into `ON` and use `COALESCE(SUM(t.amount), 0)` as in section 8.

### Exercise 6 — Sizing the stuck payments

Operations asks how many payments have been pending for over a week, and for how much money (snapshot 2026-06-30).

**Answer:**

```sql
SELECT COUNT(*) AS stuck_payments, SUM(amount) AS stuck_vnd
FROM payments
WHERE status = 'pending' AND created_at < '2026-06-23';
```

**17 payments, 14,090,000 VND.** Send the list by `payment_id` so operations can ask the gateway for each final status.

### Exercise 7 — "Just fix it in the database"

A finance lead says: "Delete the 37 duplicate payments and correct the city names in the production tables." How do you answer?

**Answer:** agree with the goal, not the method. The duplicates are **evidence that customers were charged twice**; deleting them hides refunds owed and the bug behind them. Exclude them in the clean layer, send the list for refunds, and ask engineering for an idempotency key. For cities, a mapping in a view fixes today's report and keeps the original text; the lasting fix is a dropdown on the form. Production changes belong to the system owner through a reviewed change, not to an analyst's `UPDATE`.

## 11. Summary

- **A query that runs is not an answer that is right.** Check six dimensions before trusting a table: completeness, validity, consistency, uniqueness, timeliness, accuracy.
- **Missing is not zero.** Compare `COUNT(*)` with `COUNT(column)`, report the share missing, and never turn NULL into 0 to make a number appear.
- **Look at the extremes.** A typo like 999,999,999 can move a whole segment; exclude only impossible values, with `NULLIF`, in a clean copy.
- **Profile every category column** with `GROUP BY`, then map variants with `TRIM`, `LOWER` and a mapping table.
- **Define the business key before hunting duplicates.** A looser key deletes genuine repeat purchases.
- **Agree a threshold for stuck statuses**, confirm every table is fresh, and write the snapshot date literally.
- **State which time zone defines a day.** fintech.db stores UTC; Vietnam days need `date(x, '+7 hours')`.
- **Reconcile at the account grain**, keep the filter in the `ON` clause, and hand every break to its owner with evidence.
- **Never fix silently.** Clean in a layer, flag what changed, keep a cleaning log, report problems upstream.

### Key terms

| Term | Plain meaning |
|---|---|
| Data quality | Whether data can be trusted for a specific decision |
| Completeness / validity | Nothing important missing / values follow the rules |
| Consistency / uniqueness | Same thing written the same way / each event recorded once |
| Timeliness / accuracy | Data fresh and processes finished / data matches reality |
| Outlier | A value far from the rest, real or wrong |
| Business key | The columns that together identify one real event |
| Double charge | A customer charged twice for one purchase |
| Idempotency key | A request ID that stops a retry creating a second charge |
| Reconciliation / break | Comparing two records of the same money / a difference found |
| Cleaning log | A written list of each problem and the rule applied |

Next: **da-04 "Describing Data"**, where your clean data becomes counts, averages, medians, distributions and rates you can explain to a manager.
