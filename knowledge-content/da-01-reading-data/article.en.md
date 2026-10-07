# Reading Data: Rows, Grain, Keys and the First Look

## 1. Why reading comes before analysing

Picture your first week as a Business Analyst at a digital lender. Your manager forwards an export called `loans_june.xlsx` and asks: "How many loans did we give out in June, and does anything look odd?"

It is tempting to select a column and read the total in the corner of the screen. Most bad numbers in a bank or a fintech start exactly like that. Before you can **analyse** data, you have to **read** it: what one row means, what every column means, what unit each number is in, which time zone the dates use, and what is missing or suspicious. This topic teaches that skill, ending with a first-look checklist you can run on any table.

### Meet VayNhanh, our practice company

Every example uses **VayNhanh**, a fictional Vietnamese digital lender that also runs an e-wallet. Its database (`fintech.db`) is a **snapshot**: a frozen picture of the data **as of 2026-06-30**. Three rules hold everywhere:

- Amounts are whole **VND** (the đồng has no decimal part in practice).
- Timestamps are **UTC** text `YYYY-MM-DD HH:MM:SS`; Vietnam is UTC+7.
- Dates without a time are `YYYY-MM-DD`.

You can run every query here at [SQL Practice → Fintech](/practice/sql?db=fintech). Each run uses a throwaway copy, so you cannot break anything. The page runs one statement at a time: when a block holds several, run them one by one.

> **Try it yourself:** Run `SELECT COUNT(*) FROM loans;` in SQL Practice with the Fintech dataset selected. You should see 3106. If not, check that you picked the right dataset.

---

## 2. Rows, columns and grain: "one row = one what?"

Each **column** is one property (an amount, a date, a status); each **row** is one record. The most important question about any table is: **what does one row represent?** That answer is called the **grain** of the table. The row counts below come from `SELECT COUNT(*) FROM <table>`.

| Table | One row = … | Rows |
|---|---|---|
| `customers` | one person who signed up | 4000 |
| `loan_applications` | one application (a customer can apply many times) | 6854 |
| `loans` | one loan that was actually disbursed (paid out) | 3106 |
| `repayment_schedule` | one monthly installment of one loan | 28824 |
| `wallets` | one e-wallet (at most one per customer) | 2235 |
| `wallet_transactions` | one money movement in or out of a wallet | 26923 |
| `checkout_events` | one step a shopper took in a checkout session | 46526 |
| `payments` | one payment attempt at a merchant | 7630 |
| `merchants` | one shop that accepts payments | 33 |

### Following one loan through three tables

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

One business event, three grains: **one** application row, **one** loan row (a 5,500,000 VND cash loan), **eighteen** installment rows.

### Why grain changes your answer

"How many loans do we have?" The answer is 3,106, from `loans`. Counting `loan_applications` (6,854) counts applications; counting `repayment_schedule` (28,824) counts installments. The same trap applies to people:

```sql
SELECT COUNT(*) AS rows_, COUNT(DISTINCT customer_id) AS customers
FROM loan_applications;
```

| rows_ | customers |
|---|---|
| 6854 | 2664 |

6,854 applications came from 2,664 customers; customer 78 alone applied 14 times. "Applications" and "applicants" are different metrics.

Grain also decides what you may add up. `principal` lives at the loan grain. Attach the installment rows to each loan, then sum, and every loan is counted once per installment:

```sql
-- Right grain: one row per loan. Result: 34040900000
SELECT SUM(principal) FROM loans;

-- Wrong grain: one row per installment. Result: 395210700000
SELECT SUM(l.principal)
FROM loans l JOIN repayment_schedule r ON r.loan_id = l.loan_id;
```

The second number is more than eleven times too big. This is called **fan-out**, and da-05 covers it properly.

> **Common misconception:** "A bigger table means more business." `checkout_events` has 46,526 rows, but they belong to only 13,773 sessions, because one session writes up to five events (view cart, start checkout, select payment, submit payment, payment success).

---

## 3. Keys and IDs

A **primary key** identifies each row uniquely, like `loan_id` in `loans`. A **foreign key** points to a row in another table, like `loans.customer_id` pointing to `customers.customer_id`. Keys are how tables connect:

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

### Check that a key really is unique

Never assume a column is unique because its name ends in `_id`. Compare the row count with the distinct count:

```sql
SELECT COUNT(*) AS n,
       COUNT(DISTINCT payment_id) AS ids,
       COUNT(DISTINCT session_id) AS sessions
FROM payments;
```

| n | ids | sessions |
|---|---|---|
| 7630 | 7630 | 7593 |

`payment_id` is unique. But a checkout session should normally end in at most one payment, and 7,630 payments share only 7,593 sessions. Did some customers pay twice on purpose, or did the app charge them twice? Write it down as a question; topic da-03 investigates.

### IDs are labels, not quantities

An ID is a name written with digits. `SELECT SUM(customer_id) FROM payments` happily returns 15439519, which describes nothing in the real world. The same goes for phone numbers, account numbers and the 12-digit citizen ID (CCCD) used in eKYC. Store such codes as **text**: a spreadsheet treats them as numbers, so `0912345678` loses its **leading zero** and a long ID may turn into scientific notation such as `7.91E+11`, after which the original value is gone.

> **BA corner:** When you specify an export or a report, state the key of each sheet ("one row per payment, unique by payment_id") and mark ID-like columns as text. That one line saves readers from double counting and from mangled account numbers.

---

## 4. Data types, units and currency

Every column has a **data type**: whole number (INTEGER), decimal (REAL), text (TEXT), date or timestamp (stored as text in SQLite). The type tells you which operations make sense; the **unit** tells you what the number means.

| Column | Type | Unit and meaning |
|---|---|---|
| `loans.principal` | INTEGER | VND paid out: 5500000 = 5.5 million VND |
| `loans.monthly_installment` | INTEGER | VND due **per month** |
| `loans.annual_rate_pct` | REAL | percent per **year**: 24.0 means 24%, not 0.24 |
| `merchants.mdr_pct` | REAL | fee as a percent of each payment: 1.5 means 1.5% |
| `wallet_transactions.amount` | INTEGER | VND, **signed**: money in > 0, money out < 0 |
| `payments.amount` | INTEGER | VND, always positive |

Three habits keep you safe:

1. **Read the unit before the value.** A rate might be stored as 24, 0.24 or 2400 basis points. Check the range: in `loans`, BNPL rates are all 0 and cash-loan rates run from 18 to 38 (`SELECT product, MIN(annual_rate_pct), MAX(annual_rate_pct) FROM loans GROUP BY product;`), so the unit is clearly "percent per year".
2. **Notice signs.** In `wallet_transactions` a 657,000 VND payment is stored as `-657000`. Summing the column gives a net movement, not total spending.
3. **Say the scale out loud.** `SUM(principal)` returned 34040900000: that is 34,040,900,000 VND, about **34 billion VND** (34 tỷ đồng). Label the scale ("million VND") in every report header.

> **Common misconception:** "A number is a number." In Vietnamese formatting `1.500.000` is one and a half million; in English formatting `1.500` is one and a half. Open a CSV written with Vietnamese separators under English settings and `1.500.000` becomes text while `400.000` may be read as 400. After opening any export, check a few amounts against the source.

---

## 5. Timestamps and time zones

A **date** (`2026-06-21`) is a business day: a due date, a disbursement date. A **timestamp** (`2026-06-21 13:05:44`) is an exact moment, and it only makes sense together with its **time zone**. VayNhanh stores every timestamp in UTC; Vietnam is seven hours ahead.

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

For the customer, this payment happened at 3:24 in the morning on 1 July; in UTC it is still 30 June. Anything from 17:00 UTC onwards is already the next day in Vietnam. Across the table, 571 of the 7,630 payments fall on a different date in Vietnam than in UTC (`SUM(date(created_at) <> date(created_at, '+7 hours'))`), so a daily report cut in UTC moves them to the wrong day. Topic da-03 measures the effect on daily totals.

Hours shift too. Grouping by `strftime('%H', created_at)` makes 13:00 the busiest hour (690 payments). Grouping by `strftime('%H', created_at, '+7 hours')` shows the truth: 20:00, 21:00 and 22:00 Vietnam time (690, 657 and 540 payments), the evening shopping peak a product manager actually cares about.

### The end-of-day trap

`created_at` holds a date **and** a time, and comparing it with a bare date compares text: `'2026-06-30 14:55:18'` sorts after `'2026-06-30'`.

```sql
-- Looks right, but returns 7617
SELECT COUNT(*) FROM payments WHERE created_at <= '2026-06-30';

-- Correct: returns 7630
SELECT COUNT(*) FROM payments WHERE created_at < '2026-07-01';
```

The first filter silently drops 13 payments made during 30 June. For an inclusive end date, use "less than the next day".

Exports add one more danger: date **formats**. `03/04/2026` is 3 April in Vietnam and March 4 in the US. The ISO format `YYYY-MM-DD` is unambiguous and sorts correctly even as text.

---

## 6. Status and enum codes

Many columns hold a short code from a fixed list, called an **enumeration** (**enum**): `status`, `reject_reason`, `method`, `txn_type`. Read two things: what each code means, and when the column may be filled.

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

- `reject_reason` is filled **only** on rejected rows, so NULL on an approved row is correct, not missing. A rule linking two columns like this is a **business rule** you can test.
- `approved` (3,106) equals the number of rows in `loans`: every approved application became one loan.
- `cancelled` = approved, but the customer never accepted the offer.
- `high_dti` = the installment would be too large for the customer's income (**DTI**, debt-to-income). Codes like this need a data dictionary (section 8).

**The same word can mean different things.** `pending` in `loan_applications` means "no decision yet"; in `customers.kyc_status`, "identity check not finished"; in `payments`, "result not confirmed". Never compare statuses across tables just because the words match.

**A status is the state as of the snapshot.** Payment 881 was a successful 657,000 VND e-wallet payment at a fashion shop on 18 August 2025. Ten days later it was refunded, so today its row says `refunded`. Count "successful payments in August" from this column and payment 881 is missing, although it succeeded in August. History lives in event tables such as `wallet_transactions` (section 8).

> **Try it yourself:** Run `SELECT city, COUNT(*) FROM customers GROUP BY city ORDER BY 2 DESC;`. Customers live in nine cities, yet you should see 20 different values, including `hanoi`, `HN` and `TP.HCM`. A free-text field is not an enum; da-03 cleans it.

---

## 7. NULL vs 0 vs empty

| Value | Meaning | Example in VayNhanh |
|---|---|---|
| **NULL** | unknown, not provided, or not applicable | income not declared; `paid_date` of an unpaid installment |
| **0** | a real, known zero | `annual_rate_pct = 0` on BNPL means interest-free |
| **empty text** `''` | text with no characters | common in CSV exports; usually means NULL, sometimes a bug |

### Income: three ways to get an average

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

`COUNT(*)` counts rows; `COUNT(column)` counts only non-NULL values. 232 customers declared no income and three typed 999,999,999. Watch the "average income" move:

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

Three typos moved the average by about 0.8 million VND; treating "not declared" as "earns nothing" pulled it down by almost another million. No version is automatically right. Choose on purpose and write the choice down.

### "Not paid" is not "missed"

An unpaid installment has `paid_date` NULL and `amount_paid` 0, but most of those are simply **not due yet**:

```sql
SELECT SUM(amount_paid = 0) AS zero_paid,
       SUM(paid_date IS NULL AND due_date <= '2026-06-30') AS unpaid_due,
       SUM(paid_date IS NULL AND due_date >  '2026-06-30') AS not_yet_due
FROM repayment_schedule;
```

| zero_paid | unpaid_due | not_yet_due |
|---|---|---|
| 13922 | 446 | 13476 |

Of 13,922 installments with nothing paid, only 446 were due by the snapshot date. Reporting "13,922 unpaid installments" to the risk team would cause a panic.

Likewise, `credit_score` is NULL on 307 of 6,854 applications (`SELECT COUNT(*) - COUNT(credit_score) FROM loan_applications;`). These are **thin-file** applicants, people with no credit history to score. The NULL is information about the customer, and it is certainly not a score of 0 (scores run from 300 to 850).

> **Common misconception:** "Replace the blanks with 0 so the formulas work." That turns "we don't know" into "we know it is zero" and distorts every average, minimum and rate built on top.

---

## 8. Reading an export and writing a data dictionary

Much data reaches you as a CSV or Excel file: a bank statement, a wallet history, a merchant settlement report. This query builds the wallet history of wallet 47 in Vietnam time, with a running balance (the `OVER (…)` part is taught in da-05):

```sql
SELECT txn_id, datetime(created_at, '+7 hours') AS vn_time, txn_type, amount, status, reference,
       SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END)
         OVER (ORDER BY created_at, txn_id) AS running_balance
FROM wallet_transactions
WHERE wallet_id = 47
ORDER BY created_at, txn_id;
```

Its August 2025 rows, as the app would export them:

```text
Time (VN),Txn ID,Type,Amount (VND),Status,Reference,Balance after (VND)
08/08/2025 16:09,4941,transfer_in,400000,success,,569000
18/08/2025 20:12,5359,top_up,100000,success,,669000
18/08/2025 20:13,5360,payment,-657000,success,881,12000
27/08/2025 08:34,5702,withdraw,-910000,failed,,12000
28/08/2025 20:13,5767,refund,657000,success,881,669000
```

Reading it line by line:

1. **Grain:** one row per wallet transaction, failed ones included.
2. **Signs:** money in is positive, money out negative.
3. **Failed rows do not move the balance:** the 910,000 withdrawal failed (the wallet held only 12,000), so the balance stays at 12,000.
4. **The story:** the customer topped up 100,000 and, 39 seconds later, paid 657,000 for payment 881; the top-up covered the shortfall. Ten days later the 657,000 came back as a refund with the same reference.
5. **Cross-check:** the `payments` row for 881 now says `refunded`. The event table keeps both events; the payment row keeps only the latest state.

To open an export safely: import it (Excel **Data → From Text/CSV**, Google Sheets **File → Import**) rather than double-clicking, set ID, reference and phone columns to **Text**, confirm day and month on a couple of rows, and compare the row count and one total with the source ("5 rows, net +500,000 VND from the successful rows") before building anything.

### The data dictionary

A **data dictionary** describes every column: type, unit, meaning, allowed values and what NULL means. A short one for `payments`:

| Column | Meaning | Allowed values / unit | NULL means |
|---|---|---|---|
| `payment_id` | primary key: one payment attempt | unique integer | never NULL |
| `created_at` | when the payment was created | UTC, `YYYY-MM-DD HH:MM:SS` | never NULL |
| `amount` | amount charged | VND, positive | never NULL |
| `status` | latest state as of 2026-06-30 | success, failed, refunded, pending | never NULL |
| `failure_reason` | why it failed | insufficient_funds, otp_timeout, bank_declined, fraud_blocked, network_error | not a failed payment |

> **BA corner:** Make the data dictionary part of the requirement for any report or dashboard. An acceptance criterion such as "amounts in VND, dates in Vietnam time, one row per payment, refunded payments shown as `refunded`" prevents weeks of "your number doesn't match mine" between finance and product.

---

## 9. A first-look checklist (with a walkthrough)

Run these ten checks on any new table before you analyse it:

1. **Size and period:** how many rows, over what time span?
2. **Grain:** one row = one what?
3. **Keys:** is the primary key unique? Do foreign keys point somewhere?
4. **Types and units:** VND or thousands? Percent or fraction? Signed?
5. **Time zone:** UTC or local? Date or timestamp?
6. **Enums:** the distinct values of every code column.
7. **NULLs:** how many per column, and what NULL means in each.
8. **Ranges:** min and max of every number and date. Anything impossible?
9. **Business rules:** columns that must agree with each other.
10. **Questions log:** everything you cannot explain, to ask the data owner.

### Walkthrough on `payments`

```sql
SELECT COUNT(*), MIN(created_at), MAX(created_at),
       MIN(amount), MAX(amount), ROUND(AVG(amount))
FROM payments;
```

| COUNT(*) | MIN(created_at) | MAX(created_at) | MIN(amount) | MAX(amount) | ROUND(AVG(amount)) |
|---|---|---|---|---|---|
| 7630 | 2025-06-30 20:24:34 | 2026-06-30 14:55:18 | 30000 | 22630000 | 742469 |

Steps 1, 5 and 8: one year of payments, 1 July 2025 to 30 June 2026 in Vietnam time; amounts from 30,000 to 22,630,000 VND, averaging about 742,000. Nothing negative or absurd. Note that tables cover different periods: loan applications start on 2025-01-01, wallet transactions in October 2024.

Steps 2 and 3: 7,630 unique `payment_id`s but 7,593 sessions (section 3). Log it.

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

Steps 6, 7 and 9: four statuses; `failure_reason` is filled on all 621 failed payments and nowhere else, so the business rule holds.

Step 10:

```text
QUESTIONS - payments (as of 2026-06-30)
1. 37 more payments than sessions: are some sessions charged twice?
2. 18 payments still 'pending': how old are they? Is that normal?
3. Status keeps only the latest state: is there a status history?
4. Daily reports: cut days in UTC or in Vietnam time?
```

That log is not a sign of failure. It is the most valuable thing you produce on day one.

> **Try it yourself:** Run the checklist on `loans`. You should find 3,106 rows, principals from 1,000,000 to 80,000,000 VND, and three statuses: active (1,761), closed (1,290) and defaulted (55).

---

## 10. Practice exercises

### Exercise 1 — Read a repayment schedule

Loan 1794, a 10,000,000 VND cash loan, as of 2026-06-30 (`SELECT installment_no, due_date, amount_due, paid_date, amount_paid FROM repayment_schedule WHERE loan_id = 1794;`):

| installment_no | due_date | amount_due | paid_date | amount_paid |
|---|---|---|---|---|
| 1 | 2026-02-21 | 1829000 | 2026-02-28 | 1829000 |
| 2 | 2026-03-21 | 1829000 | 2026-03-31 | 1829000 |
| 3 | 2026-04-21 | 1829000 | 2026-04-17 | 1829000 |
| 4 | 2026-05-21 | 1829000 | 2026-06-07 | 1829000 |
| 5 | 2026-06-21 | 1829000 | NULL | 0 |
| 6 | 2026-07-21 | 1829000 | NULL | 0 |

What is the grain? Which installment is overdue on 2026-06-30, and by how many days? How much has been paid?

**Answer:** One row = one monthly installment of loan 1794. Only installment 5 is overdue: due 21 June, unpaid on 30 June, so 9 days. Installment 6 also shows NULL and 0, but it is not due until 21 July. Installments 1, 2 and 4 were paid late, 3 early. Paid so far: 4 × 1,829,000 = 7,316,000 VND.

```sql
SELECT installment_no, due_date,
       CAST(julianday('2026-06-30') - julianday(due_date) AS INTEGER) AS days_past_due
FROM repayment_schedule
WHERE loan_id = 1794 AND paid_date IS NULL AND due_date <= '2026-06-30';

-- Total paid so far: 7316000
SELECT SUM(amount_paid) FROM repayment_schedule WHERE loan_id = 1794;
```

### Exercise 2 — Which month does this payment belong to?

A December 2025 sales report, cut on raw `created_at` dates, includes a payment stored as `'2025-12-31 17:20:00'`. The customer insists they paid "just after midnight on New Year's Day". Who is right?

**Answer:** The customer. 17:20 UTC + 7 hours = 00:20 on 1 January 2026 in Vietnam, so a Vietnam report should count it in January. Check it with `SELECT datetime('2025-12-31 17:20:00', '+7 hours');`, which returns `2026-01-01 00:20:00`.

### Exercise 3 — Thin-file applications by product

Write a query showing, per product, the number of applications and how many have no credit score.

**Answer:**

```sql
SELECT product, COUNT(*) AS applications, SUM(credit_score IS NULL) AS no_score
FROM loan_applications
GROUP BY product;
```

| product | applications | no_score |
|---|---|---|
| bnpl | 2916 | 123 |
| cash_loan | 3938 | 184 |

123 + 184 = 307, matching section 7. Always reconcile a breakdown with its total.

### Exercise 4 — Applications or applicants?

The marketing lead asks: "How many people applied for a loan in June 2026?" A colleague answers 453. Is that right?

**Answer:** 453 is the number of applications; the question is about people.

```sql
SELECT COUNT(*) AS applications, COUNT(DISTINCT customer_id) AS applicants
FROM loan_applications
WHERE applied_at >= '2026-06-01' AND applied_at < '2026-07-01';
```

| applications | applicants |
|---|---|
| 453 | 429 |

429 people applied. This cut uses UTC; repeating it with `datetime(applied_at, '+7 hours')` gives the same 453 and 429 here, but check it every time rather than assume.

### Exercise 5 — Spot the problem in a slide

A slide says: "Our customers earn 17.07 million VND a month on average." What do you check before it reaches the board?

**Answer:** It is `AVG(monthly_income)` on the raw column. It includes three 999,999,999 typos (16.29 million without them) and silently skips 232 customers who declared no income. The slide must say how NULLs and outliers were handled, or show the median instead (da-04).

### Exercise 6 — Find the bug

A month-end query uses `WHERE created_at <= '2026-06-30'` to take every payment up to 30 June 2026. Finance says the count is too low. Why?

**Answer:** `created_at` includes a time, and text comparison puts `'2026-06-30 14:55:18'` after `'2026-06-30'`. The query returns 7,617 instead of 7,630, losing the 13 payments made on 30 June. Use `created_at < '2026-07-01'`, and agree whether the cut-off is in UTC or Vietnam time.

---

## 11. Summary

- Before analysing, **read**: grain, keys, types, units, time zone, codes and missing values.
- **Grain** ("one row = one what?") decides what you may count and sum. Applications ≠ loans ≠ installments; applications ≠ applicants.
- Keys connect tables. Test uniqueness with `COUNT(*)` vs `COUNT(DISTINCT …)`. IDs are labels: store them as text and never add them up.
- Know the **unit**: VND or millions, percent or fraction, signed or not.
- VayNhanh timestamps are **UTC**; Vietnam is UTC+7. Converting changes dates, peak hours and daily totals. Filter with "< next day".
- A status is the latest state as of the snapshot, and the same code word can mean different things in different tables.
- **NULL ≠ 0 ≠ empty.** NULL can mean unknown, not applicable or not due yet. Decide how to treat it and write it down.
- Use a **data dictionary** and the **first-look checklist**, and keep a questions log.

### Key terms

| Term | Plain meaning |
|---|---|
| Grain | what one row of a table represents |
| Primary key | column that uniquely identifies each row |
| Foreign key | column that points to a row in another table |
| Snapshot | the data frozen as of one date (here 2026-06-30) |
| UTC | the reference world time; Vietnam = UTC+7 |
| Enum | a column whose values come from a fixed list of codes |
| NULL | no value: unknown, not provided or not applicable |
| Thin-file | a customer with no credit history to score |
| Data dictionary | a table documenting each column's meaning, type, unit and allowed values |
| Fan-out | rows multiplying after a join, which inflates sums and counts |

Next: **da-02 "The Data Behind Banking, Lending & Payments"** shows how these tables fit together as a fintech data model.
