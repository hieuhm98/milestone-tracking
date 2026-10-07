# SQL for Analysis

## 1. From "SQL basics" to "SQL for analysis"

In SQL Basics you learned to `SELECT`, filter with `WHERE`, `JOIN` two tables and summarise with `GROUP BY`. That is enough to *fetch* data. Analysis asks for more: "What share of card payments went through last month?", "How much did customers top up per month?", "Is this month better than last month?". Those questions need a few extra tools, and a few habits that stop you from reporting a wrong number with confidence.

This topic uses the VayNhanh practice database (`fintech.db`) you met earlier. Every query below was run on it, and every result table is the real output. Open [SQL Practice → Fintech](/practice/sql?db=fintech) and run them as you read. Every run uses a throwaway copy, so nothing can break.

The tables we lean on most:

| Table | One row = | Used here for |
|---|---|---|
| `payments` | one payment attempt at checkout | success rates, monthly amounts |
| `loans` | one disbursed loan | first loan per customer, fan-out |
| `repayment_schedule` | one monthly installment of one loan | the fan-out trap |
| `wallets` / `wallet_transactions` | one wallet / one money movement in a wallet | LEFT JOIN, running balance |
| `customers`, `merchants` | one customer / one shop | segments |

### The analyst's loop

```text
 1. Write the question in one sentence     "Card success rate, June 2026, VN time"
 2. Decide the grain of the answer          one row per ... (method? month?)
 3. Build the query in small steps          filter -> join -> group -> compare
 4. Check the result before sending it      row counts, totals that must match
```

Step 4 is the one beginners skip, and it is the one managers remember when a number turns out wrong. We will come back to it in section 9.

> **Common misconception:** "If the query runs without an error, the number is right." SQL happily returns a wrong answer to a badly worded question. An error is the *good* outcome; a plausible wrong number is the dangerous one.

## 2. Filtering by date and time

Almost every business question has a time window: "last month", "Q2", "since the campaign". In `fintech.db`, timestamps are text in the form `YYYY-MM-DD HH:MM:SS`, stored in **UTC** (Vietnam is UTC+7). Dates without a time, such as `loans.disbursed_date`, look like `YYYY-MM-DD`. Because the format goes from biggest unit to smallest, comparing the text compares the time correctly.

### The BETWEEN trap

"How many payments were made in June 2026?" Here are two ways people write it:

```sql
-- Version A: looks natural
SELECT COUNT(*) FROM payments
WHERE created_at BETWEEN '2026-06-01' AND '2026-06-30';

-- Version B: half-open range
SELECT COUNT(*) FROM payments
WHERE created_at >= '2026-06-01' AND created_at < '2026-07-01';
```

| Version | Result |
|---|---|
| A: `BETWEEN '2026-06-01' AND '2026-06-30'` | 682 |
| B: `>= '2026-06-01' AND < '2026-07-01'` | 695 |

Thirteen payments disappeared in version A. The text `'2026-06-30 09:15:00'` is *greater* than `'2026-06-30'`, so every payment made during 30 June falls outside the range. Version B, the **half-open range** ("from the start, up to but not including the next start"), works for both dates and timestamps and never double-counts a boundary. Use it by default.

### Whose "June"?

The 695 is June in UTC. A Vietnamese manager means June in Vietnam time, which starts at `2026-05-31 17:00:00` UTC. You can either shift the boundaries or shift the timestamp:

```sql
-- Shift the timestamp to Vietnam time, then filter on the VN date
SELECT COUNT(*) FROM payments
WHERE date(created_at, '+7 hours') >= '2026-06-01'
  AND date(created_at, '+7 hours') <  '2026-07-01';
```

This returns **697**. The difference is small here, but on a daily report UTC dates push every payment made between midnight and 7 a.m. Vietnam time into the previous day. The data-quality topic showed why; from now on, every month and day in this topic is in **Vietnam time** unless stated otherwise.

Shifting the boundaries (`created_at >= '2026-05-31 17:00:00' AND created_at < '2026-06-30 17:00:00'`) gives the same rows and is faster on big tables, because the database can compare the column directly instead of computing `date(...)` for every row.

> **Try it yourself:** in SQL Practice, run `SELECT COUNT(*) FROM payments WHERE created_at LIKE '2026-06-30%';`. You should get 13: exactly the payments that version A lost.

## 3. Conditional aggregation: many numbers in one pass

A manager rarely wants one number. They want a small table: per payment method, how many attempts, how many went through, how many failed, and the success rate. You could write four queries. Analysts write one, using **conditional aggregation**: a `CASE` inside `SUM()`.

```sql
SELECT
  method,
  COUNT(*)                                                           AS attempts,
  SUM(CASE WHEN status IN ('success', 'refunded') THEN 1 ELSE 0 END) AS went_through,
  SUM(CASE WHEN status = 'failed'  THEN 1 ELSE 0 END)                AS failed,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)                AS pending,
  ROUND(100.0 * SUM(CASE WHEN status IN ('success', 'refunded') THEN 1 ELSE 0 END)
        / SUM(CASE WHEN status <> 'pending' THEN 1 ELSE 0 END), 1)   AS success_rate_pct
FROM payments
GROUP BY method
ORDER BY attempts DESC;
```

| method | attempts | went_through | failed | pending | success_rate_pct |
|---|---|---|---|---|---|
| card | 2855 | 2541 | 305 | 9 | 89.3 |
| e_wallet | 1770 | 1600 | 167 | 3 | 90.5 |
| qr_code | 1563 | 1480 | 79 | 4 | 94.9 |
| bank_transfer | 1026 | 973 | 51 | 2 | 95 |
| bnpl | 416 | 397 | 19 | 0 | 95.4 |

Read `SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)` as "for each row, write 1 if it failed, else 0, then add up the 1s": a count of failed rows. Swap `1` for `amount` and you get the *amount* of failed payments instead.

Three decisions hide in that query, and each one changes the number:

1. **`refunded` counts as went through.** A refunded payment *did* succeed; the money came back later. Counting only `status = 'success'` would treat refunds as failures.
2. **`pending` is left out of the denominator.** A pending payment has no outcome yet, so it should not count as a failure. Together, decisions 1 and 2 matter: on the whole table, success counted the careless way (`success` ÷ all rows) is 89.3%; counted with both decisions it is 91.8%.
3. **`100.0`, not `100`.** In SQLite, integer ÷ integer is integer division. `SUM(...) / COUNT(*)` on the card rows returns **0**, not 0.89. Multiplying by `100.0` (or `1.0`) first turns it into a decimal.

### The SQLite shortcut

In SQLite a comparison is itself 1 (true) or 0 (false), so `SUM(status = 'failed')` counts failed rows and `AVG(status = 'failed')` is the *share* of failed rows. For example, `SELECT product, COUNT(*), SUM(status = 'approved') FROM loan_applications GROUP BY product;` returns bnpl 2,916 applications with 1,397 approved, and cash_loan 3,938 with 1,709 approved.

The shortcut is handy for exploring. In a query other people will reuse, prefer the `CASE` form: it works in every database (PostgreSQL, SQL Server, BigQuery…), and it reads more clearly.

### COUNT(column) skips NULLs

`COUNT(*)` counts rows; `COUNT(credit_score)` counts rows where `credit_score` is not NULL. On `loan_applications`, `COUNT(*)` is 6,854 but `COUNT(credit_score)` is 6,547: 307 applicants had no score. That difference is information, not an error: keep it in mind whenever you average or count a column.

> **Common misconception:** "Success rate is just `success` divided by the total." Which statuses count as success, and which rows belong in the denominator, are business decisions. Write them down next to the number.

## 4. Date buckets with strftime

To see a trend you put each row into a time **bucket** (a month, a week, a weekday) and group by the bucket. SQLite's `strftime(format, timestamp, modifier)` cuts a timestamp down to the part you want; the `'+7 hours'` modifier converts to Vietnam time at the same moment.

| You want | Expression | Example output |
|---|---|---|
| Month (VN) | `strftime('%Y-%m', created_at, '+7 hours')` | `2026-06` |
| Day (VN) | `date(created_at, '+7 hours')` | `2026-06-14` |
| Weekday (0 = Sunday) | `strftime('%w', created_at, '+7 hours')` | `0` |
| Monday of the week (VN) | `date(created_at, '+7 hours', '-6 days', 'weekday 1')` | `2026-06-08` |

(Other databases spell this differently: `DATE_TRUNC` in PostgreSQL and BigQuery, `DATE_FORMAT` in MySQL. The idea is the same.)

### Monthly payment volume

The total value of payments that went through is often called **TPV** (total payment volume); the payments topic defines it properly.

```sql
SELECT
  strftime('%Y-%m', created_at, '+7 hours') AS month_vn,
  COUNT(*)                                  AS payments,
  SUM(amount)                               AS tpv_vnd
FROM payments
WHERE status IN ('success', 'refunded')
  AND created_at >= '2025-12-31 17:00:00'   -- 1 Jan 2026, 00:00 VN time
GROUP BY month_vn
ORDER BY month_vn;
```

| month_vn | payments | tpv_vnd |
|---|---|---|
| 2026-01 | 646 | 474188000 |
| 2026-02 | 617 | 432344000 |
| 2026-03 | 619 | 450394000 |
| 2026-04 | 579 | 444033000 |
| 2026-05 | 630 | 465175000 |
| 2026-06 | 660 | 493203000 |

> **Try it yourself:** group the same payments by `strftime('%w', created_at, '+7 hours')` instead of the month. You should see `0` (Sunday) with 1,155 payments and `6` (Saturday) with 1,147, against 909–993 for each weekday: shoppers pay more often at weekends. Keep the number, not a day name, as the sort key, or Fri will sort before Mon.

### Watch the last bucket

Weekly buckets for June 2026 (VN time) show a classic trap:

```sql
SELECT
  date(created_at, '+7 hours', '-6 days', 'weekday 1') AS week_start_vn,
  COUNT(*)                                            AS payments,
  SUM(amount)                                         AS tpv_vnd
FROM payments
WHERE status IN ('success', 'refunded')
  AND created_at >= '2026-05-31 17:00:00'
  AND created_at <  '2026-06-30 17:00:00'
GROUP BY week_start_vn
ORDER BY week_start_vn;
```

| week_start_vn | payments | tpv_vnd |
|---|---|---|
| 2026-06-01 | 146 | 100745000 |
| 2026-06-08 | 159 | 110617000 |
| 2026-06-15 | 164 | 145287000 |
| 2026-06-22 | 155 | 117612000 |
| 2026-06-29 | 36 | 18942000 |

The "collapse" in the last week is not real: that week has only two days (29 and 30 June) because the month ends. A partial bucket must be labelled, dropped, or compared per day, never put on a chart next to full weeks without a note.

> **BA corner:** a report spec should state the bucket explicitly: "Month = calendar month in Vietnam time (UTC+7); weeks start on Monday; the current, incomplete period is shown greyed out." Two developers reading "monthly" without that line will build two different reports.

## 5. JOIN vs LEFT JOIN on fintech data

You know the difference from SQL Basics: `JOIN` keeps only rows that match on both sides; `LEFT JOIN` keeps every row of the left table and fills NULL where nothing matched. In analysis the choice decides **who is in your denominator**.

Question: "What share of our customers have a wallet?"

```sql
-- INNER JOIN: only customers who HAVE a wallet survive
SELECT COUNT(*) FROM customers c
JOIN wallets w ON w.customer_id = c.customer_id;           -- 2235

-- LEFT JOIN: every customer survives
SELECT COUNT(*) FROM customers c
LEFT JOIN wallets w ON w.customer_id = c.customer_id;      -- 4000
```

With the inner join, every customer you count has a wallet, so the "share" is 100% by construction. The left join keeps all 4,000 customers, and `COUNT(w.wallet_id)` (which skips the NULLs) counts only those with a wallet:

```sql
SELECT
  c.kyc_status,
  COUNT(*)                       AS customers,
  COUNT(w.wallet_id)             AS with_wallet,
  COUNT(*) - COUNT(w.wallet_id)  AS without_wallet
FROM customers c
LEFT JOIN wallets w ON w.customer_id = c.customer_id
GROUP BY c.kyc_status
ORDER BY customers DESC;
```

| kyc_status | customers | with_wallet | without_wallet |
|---|---|---|---|
| verified | 3618 | 2235 | 1383 |
| pending | 241 | 0 | 241 |
| rejected | 141 | 0 | 141 |

So 2,235 of 4,000 customers (about 56%) have a wallet, and only eKYC-verified customers do. That last finding is itself useful: it is a product rule showing up in the data.

### The WHERE that silently turns a LEFT JOIN into a JOIN

"List all customers, with their wallet if it is active." A natural first try:

```sql
SELECT COUNT(*)
FROM customers c
LEFT JOIN wallets w ON w.customer_id = c.customer_id
WHERE w.status = 'active';                                  -- 2130
```

Only 2,130 rows come back, not 4,000. For customers without a wallet, `w.status` is NULL, and `NULL = 'active'` is not true, so `WHERE` throws them away. Put the condition on the right-hand table **inside `ON`** instead:

```sql
SELECT COUNT(*), COUNT(w.wallet_id)
FROM customers c
LEFT JOIN wallets w
  ON w.customer_id = c.customer_id
 AND w.status = 'active';                                   -- 4000 rows, 2130 active wallets
```

Rule of thumb: in a `LEFT JOIN`, conditions about the **left** table go in `WHERE`; conditions about the **right** table go in `ON`.

> **Try it yourself:** find verified customers who never opened a wallet: `LEFT JOIN wallets` and add `WHERE w.wallet_id IS NULL AND c.kyc_status = 'verified'`. You should get 1,383, a ready-made list for an "open your wallet" campaign.

## 6. The fan-out trap: when a JOIN double-counts

This is the most common way analysts publish a wrong number. It happens when you join a "one" table to a "many" table and then add up a column from the "one" side.

One loan has many installments. Look at loan 1 joined to its repayment schedule:

```sql
SELECT l.loan_id, l.principal, r.installment_no, r.due_date, r.amount_due, r.amount_paid
FROM loans l
JOIN repayment_schedule r ON r.loan_id = l.loan_id
WHERE l.loan_id = 1
ORDER BY r.installment_no;
```

| loan_id | principal | installment_no | due_date | amount_due | amount_paid |
|---|---|---|---|---|---|
| 1 | 3100000 | 1 | 2025-02-02 | 517000 | 517000 |
| 1 | 3100000 | 2 | 2025-03-02 | 517000 | 517000 |
| 1 | 3100000 | 3 | 2025-04-02 | 517000 | 517000 |
| 1 | 3100000 | 4 | 2025-05-02 | 517000 | 517000 |
| 1 | 3100000 | 5 | 2025-06-02 | 517000 | 517000 |
| 1 | 3100000 | 6 | 2025-07-02 | 517000 | 517000 |

The principal of 3,100,000 VND now appears **six times**, once per installment. `SUM(l.principal)` over these rows says 18,600,000, six times the real loan. This repetition is called **fan-out**: a join makes rows "fan out" from one into many.

At company scale:

```sql
-- WRONG: principal is repeated once per installment
SELECT COUNT(*) AS rows_after_join, SUM(l.principal) AS total_principal_wrong
FROM loans l
JOIN repayment_schedule r ON r.loan_id = l.loan_id;
```

| | rows | total principal (VND) |
|---|---|---|
| `loans` alone | 3,106 | 34,040,900,000 |
| `loans` joined to `repayment_schedule` | 28,824 | 395,210,700,000 |

The joined figure is about 11.6 times the real loan book: a report would claim around 395 billion VND lent when the true figure is about 34 billion.

### The fix: aggregate first, then join

Bring the "many" table down to one row per loan *before* joining, so the join is one-to-one:

```sql
WITH paid AS (
  SELECT loan_id, SUM(amount_paid) AS amount_paid
  FROM repayment_schedule
  GROUP BY loan_id                -- now one row per loan
)
SELECT
  l.product,
  COUNT(*)           AS loans,
  SUM(l.principal)   AS principal,
  SUM(p.amount_paid) AS amount_paid
FROM loans l
JOIN paid p ON p.loan_id = l.loan_id
GROUP BY l.product;
```

| product | loans | principal | amount_paid |
|---|---|---|---|
| bnpl | 1397 | 6469900000 | 4985175000 |
| cash_loan | 1709 | 27571000000 | 16622607000 |

Now principal per product adds up to 34,040,900,000, matching `loans` alone. (`amount_paid` includes interest, so it is not "principal repaid"; the lending topic separates the two.)

Other defences:

- `COUNT(DISTINCT l.loan_id)` gives the right *count* after a fan-out, but there is no safe "SUM DISTINCT" for amounts: two different loans can have the same principal.
- Joining **two** "many" tables to the same parent (a customer's loans *and* their payments) multiplies the rows of both: one customer with 2 loans and 5 payments becomes 10 rows. Aggregate each one in its own step, then join the summaries.

> **Common misconception:** "A JOIN only adds columns." A JOIN can also add *rows*. Before trusting any SUM after a join, ask: "Can one row on this side match many rows on the other side?"

## 7. CTEs: building a query step by step

Long analytical queries become readable when you split them into named steps. A **CTE** (common table expression) is a temporary, named result that exists only for one query, written with `WITH name AS ( ... )`. Each step can read the steps before it, like rows of formulas in a spreadsheet.

Question from the payments team: "How are paying customers split by how often they pay, and how much does each group spend?"

```sql
WITH paid AS (               -- step 1: only payments that went through
  SELECT customer_id, amount
  FROM payments
  WHERE status IN ('success', 'refunded')
),
per_customer AS (            -- step 2: one row per paying customer
  SELECT customer_id, COUNT(*) AS n_payments, SUM(amount) AS spend
  FROM paid
  GROUP BY customer_id
),
bucketed AS (                -- step 3: put each customer in a bucket
  SELECT *,
    CASE
      WHEN n_payments = 1 THEN '1 payment'
      WHEN n_payments <= 3 THEN '2-3 payments'
      ELSE '4+ payments'
    END AS bucket
  FROM per_customer
)
SELECT bucket,
  COUNT(*)          AS customers,
  SUM(n_payments)   AS payments,
  SUM(spend)        AS spend_vnd,
  ROUND(AVG(spend)) AS avg_spend_vnd
FROM bucketed
GROUP BY bucket
ORDER BY bucket;
```

| bucket | customers | payments | spend_vnd | avg_spend_vnd |
|---|---|---|---|---|
| 1 payment | 911 | 911 | 665448000 | 730459 |
| 2-3 payments | 1307 | 3137 | 2303834000 | 1762689 |
| 4+ payments | 615 | 2943 | 2155537000 | 3504938 |

The "4+" group is about a fifth of paying customers but brings in around 42% of the money: 2,155,537,000 out of 5,124,819,000 VND.

### Why build it this way

1. **You can test each step.** Replace the final `SELECT` with `SELECT * FROM per_customer LIMIT 10` and look at real rows before going on.
2. **The grain is explicit.** Step 2's comment says "one row per paying customer", so nobody joins it the wrong way later.
3. **It is easy to review.** A colleague reads three small steps instead of one nested block.

And the check: the buckets add up to 911 + 1,307 + 615 = 2,833 customers and 6,991 payments, exactly what `COUNT(DISTINCT customer_id)` and `COUNT(*)` give on the paid payments directly.

> **BA corner:** CTE steps map neatly onto a metric definition in a requirements document: "Population: payments with status success or refunded. Grain: one row per customer. Bucket rule: 1 / 2–3 / 4+." If you write the definition first, the query almost writes itself, and the developer who builds the dashboard can check their query against yours step by step.

## 8. Window functions: running totals, first loan, month-over-month

`GROUP BY` squashes many rows into one. Sometimes you want to keep every row *and* see something about its neighbours: the balance after each transaction, whether this is the customer's first loan, last month's value next to this month's. That is what **window functions** do. The pattern is:

```text
FUNCTION(...) OVER (PARTITION BY <group> ORDER BY <order>)
   PARTITION BY = restart the calculation for each group (e.g. each wallet)
   ORDER BY     = the order in which rows are walked through
```

### Running wallet balance

```sql
SELECT
  created_at,
  txn_type,
  amount,
  status,
  SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END)
    OVER (PARTITION BY wallet_id ORDER BY created_at, txn_id) AS running_balance
FROM wallet_transactions
WHERE wallet_id = 1
ORDER BY created_at, txn_id;
```

| created_at | txn_type | amount | status | running_balance |
|---|---|---|---|---|
| 2026-03-31 15:59:42 | top_up | 100000 | success | 100000 |
| 2026-03-31 16:00:33 | payment | -62000 | success | 38000 |
| 2026-04-07 08:24:44 | payment | -136000 | failed | 38000 |
| 2026-04-14 18:49:59 | top_up | 550000 | success | 588000 |
| 2026-04-14 18:50:55 | payment | -541000 | success | 47000 |
| 2026-06-09 16:25:15 | transfer_out | -150000 | failed | 47000 |

Each row shows the balance *after* that transaction. The failed rows add 0, which is why the balance does not move when a 136,000 VND payment fails on a balance of 38,000. The final 47,000 equals `wallets.balance` for wallet 1, so this wallet reconciles. (`txn_id` in the `ORDER BY` breaks ties when two rows share a timestamp.)

### First loan per customer with ROW_NUMBER

`ROW_NUMBER()` numbers the rows 1, 2, 3… inside each partition. Numbering each customer's loans by date tells you which loan is the first one:

```sql
WITH numbered AS (
  SELECT
    customer_id, loan_id, product, principal, disbursed_date,
    ROW_NUMBER() OVER (PARTITION BY customer_id
                       ORDER BY disbursed_date, loan_id) AS loan_seq
  FROM loans
)
SELECT
  CASE WHEN loan_seq = 1 THEN 'first loan' ELSE 'repeat loan' END AS loan_type,
  COUNT(*)              AS loans,
  ROUND(AVG(principal)) AS avg_principal_vnd
FROM numbered
GROUP BY loan_type;
```

| loan_type | loans | avg_principal_vnd |
|---|---|---|
| first loan | 2108 | 10936101 |
| repeat loan | 998 | 11009619 |

There are 2,108 first loans, which is exactly the number of distinct customers with a loan, a nice built-in check. About a third of all loans (998 of 3,106) go to returning customers. To get "each customer's first loan" as a list, filter `WHERE loan_seq = 1` in a final step. You cannot put a window function directly in `WHERE`; that is why the CTE is there.

### Month-over-month with LAG

`LAG(x)` returns the value of `x` from the previous row in the window. Combined with the monthly TPV from section 4:

```sql
WITH monthly AS (
  SELECT strftime('%Y-%m', created_at, '+7 hours') AS month_vn,
         SUM(amount) AS tpv
  FROM payments
  WHERE status IN ('success', 'refunded')
  GROUP BY month_vn
),
with_prev AS (
  SELECT month_vn, tpv,
         LAG(tpv) OVER (ORDER BY month_vn) AS prev_tpv
  FROM monthly
)
SELECT month_vn, tpv, prev_tpv,
       ROUND(100.0 * (tpv - prev_tpv) / prev_tpv, 1) AS mom_pct
FROM with_prev
WHERE month_vn >= '2026-01'
ORDER BY month_vn;
```

| month_vn | tpv | prev_tpv | mom_pct |
|---|---|---|---|
| 2026-01 | 474188000 | 388739000 | 22 |
| 2026-02 | 432344000 | 474188000 | -8.8 |
| 2026-03 | 450394000 | 432344000 | 4.2 |
| 2026-04 | 444033000 | 450394000 | -1.4 |
| 2026-05 | 465175000 | 444033000 | 4.8 |
| 2026-06 | 493203000 | 465175000 | 6 |

Note *where* the `WHERE month_vn >= '2026-01'` sits: after the `LAG` has been computed. If you put the filter inside the `monthly` step, December 2025 is gone before `LAG` runs, and January's `prev_tpv` becomes NULL. Window functions only see the rows that survive the filters of their own step.

> **Common misconception:** "Window functions are an advanced topic I can skip." Running totals, "first/last per customer" and "compared with last month" are among the most frequent questions in fintech reporting. These three patterns cover most of what you will need.

## 9. Checking your own results

Professional analysts check before they send. These checks take a minute each and catch most mistakes:

| Check | How | Example from this topic |
|---|---|---|
| Row count before vs after a join | `COUNT(*)` on the base table, then on the join | `loans` 3,106 → joined 28,824: fan-out alarm |
| Parts add up to the whole | Sum the segments, compare with an unsegmented query | Buckets: 2,833 customers = distinct payers |
| Two routes, same answer | Compute the figure from a different table | Approved applications 3,106 = rows in `loans` 3,106 |
| Key really is unique | `GROUP BY key HAVING COUNT(*) > 1` should return nothing | One wallet per customer: 0 rows |
| NULL group visible | Look for a NULL bucket after `GROUP BY` | Score bands: 307 rows with no score |
| Time window complete | `MIN`/`MAX` of the date; is the last bucket partial? | Week starting 29 June has 2 days |
| Magnitude sanity | Is the number plausible per unit? | 395 billion VND lent by 3,106 loans = 127 million each? Suspicious |

A uniqueness check in SQL:

```sql
-- Is session_id unique in payments? (One checkout should produce one payment)
SELECT COUNT(*) AS sessions_with_2_payments
FROM (
  SELECT session_id FROM payments
  GROUP BY session_id
  HAVING COUNT(*) > 1
);
-- 37
```

It returns 37, and you already know why: these are the double charges from the data-quality topic. A uniqueness check is how you discover such problems *before* they inflate a revenue figure.

### The NULL bucket

Without a branch for NULL, a `CASE` either sends NULL rows to an unnamed NULL group or, worse, into its `ELSE`. Name the NULL case first:

```sql
SELECT
  CASE
    WHEN credit_score IS NULL THEN 'no score'
    WHEN credit_score >= 650  THEN '650+'
    WHEN credit_score >= 560  THEN '560-649'
    ELSE 'under 560'
  END      AS score_band,
  COUNT(*) AS applications
FROM loan_applications
GROUP BY score_band
ORDER BY score_band;
```

| score_band | applications |
|---|---|
| 560-649 | 2681 |
| 650+ | 2707 |
| no score | 307 |
| under 560 | 1159 |

If you write `ELSE 'under 560'` *without* the NULL branch, the 307 thin-file applicants are silently counted as low scorers, which would distort any analysis of scores.

> **BA corner:** add checks like these to the acceptance criteria of a report: "Given the June 2026 data, the sum of the per-method rows equals the total row; the number of loans equals the number of approved applications." Testers can then verify the report without having to understand the SQL behind it.

## 10. Practice exercises

Run the SQL ones in [SQL Practice → Fintech](/practice/sql?db=fintech). Try each before reading the answer.

### Exercise 1 — Read a LEFT JOIN result

An ops colleague sends you four rows from `customers LEFT JOIN wallets` (customers 2, 3, 4 and 135):

| customer_id | kyc_status | wallet_id | wallet_status |
|---|---|---|---|
| 2 | verified | 1 | active |
| 3 | verified | NULL | NULL |
| 4 | pending | NULL | NULL |
| 135 | verified | 72 | locked |

How many of these customers have a wallet? Which one is a good target for an "open your wallet" push notification, and why not the others?

**Answer:** Two have a wallet (2 and 135; wallet 72 is locked, but it exists). Customers 3 and 4 have none: NULL in `wallet_id` means "no match", not "wallet number unknown". The target is **customer 3**: verified but without a wallet. Customer 4 cannot open one until eKYC passes (in this data, only verified customers have wallets), so the right message for them is "finish your eKYC".

### Exercise 2 — Success rate by hand

Card payment statuses for the whole period: success 2,471 · refunded 70 · failed 305 · pending 9. Compute the card success rate, deciding what to do with refunded and pending rows.

**Answer:** Refunded payments did go through, so went through = 2,471 + 70 = 2,541. Pending have no outcome yet, so the denominator is 2,855 − 9 = 2,846. Success rate = 2,541 ÷ 2,846 ≈ **89.3%**, matching the table in section 3. Counting only `success` over all rows would give 2,471 ÷ 2,855 ≈ 86.5%: almost three points lower, just from definitions.

### Exercise 3 — Monthly wallet top-ups (SQL)

The wallet team wants, for April–June 2026 (Vietnam time): the number of successful top-ups, how many different wallets topped up, and the total amount, per month.

**Answer:**

```sql
SELECT
  strftime('%Y-%m', created_at, '+7 hours') AS month_vn,
  COUNT(*)                                  AS top_ups,
  COUNT(DISTINCT wallet_id)                 AS wallets,
  SUM(amount)                               AS top_up_vnd
FROM wallet_transactions
WHERE txn_type = 'top_up'
  AND status = 'success'
  AND created_at >= '2026-03-31 17:00:00'   -- 1 Apr 2026 00:00 VN
  AND created_at <  '2026-06-30 17:00:00'   -- 1 Jul 2026 00:00 VN
GROUP BY month_vn
ORDER BY month_vn;
```

| month_vn | top_ups | wallets | top_up_vnd |
|---|---|---|---|
| 2026-04 | 1308 | 872 | 821700000 |
| 2026-05 | 1362 | 895 | 826710000 |
| 2026-06 | 1413 | 959 | 861160000 |

Note `COUNT(DISTINCT wallet_id)`: a wallet that tops up three times is one wallet, not three.

### Exercise 4 — Spot the bug: GMV by device

A colleague wants the value of payments by device and writes:

```sql
SELECT p.device, COUNT(*) AS payments, SUM(p.amount) AS gmv
FROM payments p
JOIN checkout_events e ON e.session_id = p.session_id
WHERE p.status IN ('success', 'refunded')
GROUP BY p.device;
```

It reports android 18,175 payments and 13,200,535,000 VND. What is wrong, and what is the right figure?

**Answer:** Fan-out. `checkout_events` has several rows per session (view_cart, start_checkout, select_payment, submit_payment, payment_success), so each payment is repeated once per event: here five times. The join is not needed at all, since `device` is already on `payments`:

```sql
SELECT device, COUNT(*) AS payments, SUM(amount) AS gmv
FROM payments
WHERE status IN ('success', 'refunded')
GROUP BY device;
```

| device | payments | gmv |
|---|---|---|
| android | 3635 | 2640107000 |
| ios | 2093 | 1539622000 |
| web | 1263 | 945090000 |

18,175 ÷ 3,635 = 5 exactly: the row-count check would have caught it.

### Exercise 5 — How long until the second loan? (SQL, window functions)

For customers who took at least two loans, how many days on average passed between the first and the second disbursement?

**Answer:**

```sql
WITH numbered AS (
  SELECT
    customer_id,
    disbursed_date,
    ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY disbursed_date, loan_id) AS loan_seq,
    LAG(disbursed_date) OVER (PARTITION BY customer_id ORDER BY disbursed_date, loan_id) AS prev_date
  FROM loans
)
SELECT
  COUNT(*)                                                     AS second_loans,
  ROUND(AVG(julianday(disbursed_date) - julianday(prev_date))) AS avg_days_gap,
  MIN(julianday(disbursed_date) - julianday(prev_date))        AS min_gap,
  MAX(julianday(disbursed_date) - julianday(prev_date))        AS max_gap
FROM numbered
WHERE loan_seq = 2;
```

| second_loans | avg_days_gap | min_gap | max_gap |
|---|---|---|---|
| 734 | 161 | 1 | 489 |

734 customers came back, on average after about 161 days (roughly five months). `julianday` turns a date into a day number so you can subtract dates. Check: customers with 2+ loans, from `GROUP BY customer_id HAVING COUNT(*) >= 2`, is also 734.

### Exercise 6 — The stakeholder number

The head of wallet asks: "How many customers paid with the wallet last month?" (Today is 30 June 2026; "last month" here means June 2026, VN time.) A junior analyst replies "1,770" from `SELECT COUNT(*) FROM payments WHERE method = 'e_wallet'`. List what is wrong and give the right number.

**Answer:** Three problems: (1) no date filter, so it covers the whole year; (2) it counts payment *rows*, not *customers*; (3) failed attempts are included. Fixed:

```sql
SELECT
  COUNT(*)                    AS payment_rows,
  COUNT(DISTINCT customer_id) AS customers
FROM payments
WHERE method = 'e_wallet'
  AND status IN ('success', 'refunded')
  AND created_at >= '2026-05-31 17:00:00'
  AND created_at <  '2026-06-30 17:00:00';
```

| payment_rows | customers |
|---|---|
| 149 | 146 |

**146 customers** (149 payments) in June 2026. When you reply, state the definition with the number: "146 customers with at least one successful or later-refunded wallet payment, 1–30 June 2026, Vietnam time."

## 11. Summary

- Use half-open date ranges (`>= start AND < next start`), and say which time zone your day or month is in. `BETWEEN '…-01' AND '…-30'` loses the last day of timestamps.
- Conditional aggregation (`SUM(CASE WHEN … THEN 1 ELSE 0 END)`, or SQLite's `SUM(status = 'x')`) builds a whole summary table in one pass. Multiply by `100.0` to avoid integer division.
- Which statuses count as success, and which rows sit in the denominator, are definitions: write them down.
- Date buckets with `strftime` show trends; label or drop a partial last bucket.
- `LEFT JOIN` keeps everyone in the denominator; conditions on the right table go in `ON`, not `WHERE`.
- Fan-out: joining a one-side to a many-side repeats rows. Aggregate first, then join; check row counts.
- CTEs build a query in named, testable steps, each with a clear grain.
- Window functions: `SUM() OVER` for running totals, `ROW_NUMBER()` for first/last per customer, `LAG()` for month-over-month.
- Check before you send: row counts, parts vs whole, two routes, uniqueness, NULL groups, partial periods, plausibility.

### Key terms

| Term | Plain meaning |
|---|---|
| Half-open range | From a start time, up to but not including the next start (`>=` and `<`) |
| Conditional aggregation | `SUM`/`COUNT` over a `CASE`, so one query counts several categories side by side |
| Integer division | Whole number ÷ whole number drops the decimals in SQLite (7 / 2 = 3) |
| Denominator | The "out of how many" part of a rate |
| Bucket | A group of rows by time or range: a month, a week, a score band |
| TPV | Total payment volume: the value of payments that went through |
| Fan-out | A join repeating rows because one row matches many rows |
| Grain | What one row of a result represents |
| CTE (`WITH`) | A named, temporary step inside one query |
| Window function | A calculation over related rows that keeps every row (`OVER (...)`) |
| `PARTITION BY` | Restart the window calculation for each group |
| `ROW_NUMBER()` | Numbers rows 1, 2, 3… within each partition |
| `LAG()` | The value from the previous row in the window |
| Month-over-month (MoM) | Change compared with the previous month |

Next: **Digital Lending Analytics** — use these SQL tools on the loan book: the application funnel, DPD, and vintage analysis.
