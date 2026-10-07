# Payments, Checkout & E-wallet Analytics

## 1. How a payment moves, and where the data lands

Lending makes money slowly, over months of repayments. Payments are the opposite: thousands of small events a day, each one succeeding or failing in seconds. The questions are "how much went through?", "what failed, and why?", "where do shoppers give up?" and "what did we earn?".

A customer buys shoes in a shop's app and pays by card:

```text
customer        merchant app       payment gateway     card network       issuing bank
   |  view cart,     |                   |               (Visa, Napas...)   (customer's bank)
   |  checkout  ---> |  submit payment -> | -- authorise ----> | ---------------> | OTP / 3-D Secure
   |                 |                   | <-- approved / declined (+ reason) --|
   |  <-- "Paid!" or "Payment failed"    |
   |                 |   next day (T+1): merchant is paid the amount minus the fee (settlement)
```

The bank that issued the customer's card is the **issuer**; the bank or company that collects money for the merchant is the **acquirer** (or payment gateway). The issuer can **decline** (refuse) a payment, for example for lack of funds or a failed **OTP** (the one-time code sent by SMS or shown in the bank app).

In the VayNhanh practice database, these tables tell the story:

| Table | One row = | Use it for |
|---|---|---|
| `checkout_events` | one step a shopper took in one checkout session | the funnel and drop-off |
| `payments` | one payment attempt | volume, success rate, decline reasons, refunds |
| `merchants` | one shop, with its `mdr_pct` fee | revenue per category |
| `wallets` | one e-wallet, balance and status as of 2026-06-30 | wallet base |
| `wallet_transactions` | one money movement in or out of a wallet | top-ups, cash-out, active wallets |

Two rules for the whole topic. First, timestamps are **UTC**; Vietnam is UTC+7, so for "which day" and "what hour" questions we always convert with `datetime(created_at, '+7 hours')`. Second, a `payments.status` of `refunded` means the payment **succeeded first** and was refunded later, so it counts as a successful attempt. `pending` means we don't know the outcome yet.

You can run every query here at [SQL Practice → Fintech](/practice/sql?db=fintech).

## 2. Volume: GMV, TPV, transaction count and AOV

**GMV** (gross merchandise value) is the total value of goods and services sold through the platform, before refunds. **TPV** (total payment volume) is the total value of payments the platform processed. For a pure checkout business they are almost the same number; for an e-wallet, TPV is usually larger because it also includes top-ups and transfers that are not purchases. Always write down which statuses you included.

**AOV** (average order value) = GMV ÷ number of successful payments.

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

So over July 2025 – June 2026, about 7,000 successful payments, a GMV of about **5.12 billion VND**, and an AOV of about **733,000 VND**.

The mean hides a skew. SQLite has no `MEDIAN`, so sort and take the middle row:

```sql
SELECT amount AS median_amount
FROM payments
WHERE status IN ('success', 'refunded')
ORDER BY amount
LIMIT 1 OFFSET (SELECT COUNT(*) / 2 FROM payments WHERE status IN ('success', 'refunded'));
```

The median is **334,000 VND**, less than half the AOV. A few large electronics orders pull the average up while the typical basket is a meal or groceries. Report both.

Monthly trend, bucketed by Vietnam month:

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

GMV = number of payments × AOV. When GMV moves, check which of the two moved. April's payment count fell but AOV rose, so GMV barely changed.

> **Common misconception:** "GMV is our revenue." It isn't. GMV is the shoppers' money flowing to merchants. The platform's revenue is the fee it keeps (section 6), roughly 1–2% of GMV here.

## 3. Payment success rate and decline reasons

**Payment success rate** (also called authorization rate or approval rate) = successful attempts ÷ attempts with a known outcome. Decide the denominator explicitly:

- `refunded` → success (the money moved; the refund is a later, separate event).
- `pending` → excluded (no outcome yet). Stuck pendings are a data-quality issue to report separately.
- `failed` → failure.

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

Overall it is 6,991 of 7,612, about **91.8%**. The definition matters: counting only `status = 'success'` over all rows gives 89.3%, which quietly treats every refunded payment as a failure.

Why do cards fail most? Look at the reasons:

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

Group reasons by who can fix them:

| Kind | Examples | Who acts |
|---|---|---|
| Customer-side | insufficient_funds | customer; product can suggest another method or a wallet top-up |
| Issuer decisions | bank_declined | issuer; ask the acquirer for detailed response codes |
| Authentication | otp_timeout (3-D Secure / OTP not completed) | product + SMS/OTP provider; often fixable |
| Technical | network_error | engineering; usually retryable |
| Risk | fraud_blocked | risk team; too many blocks also lose good customers |

**3-D Secure** is the extra authentication step for online card payments: the issuer checks it is really the cardholder, typically with an OTP or a confirmation in the banking app. It cuts fraud but adds a step where shoppers can time out.

> **BA corner:** "Success rate by method" is not a finished report spec. Its acceptance criteria should say: refunded counts as success, pending is excluded, dates are in Vietnam time, and whether the 37 double charges (from the data-quality topic) are removed. Otherwise two teams will argue over two "correct" numbers.

## 4. The checkout funnel and drop-off

A **funnel** counts how many sessions reach each step. In `checkout_events` the steps are `view_cart → start_checkout → select_payment → submit_payment → payment_success`. Count **distinct sessions**, not events: in real logs a shopper who taps "Pay" twice creates two `submit_payment` events in one session.

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

How to read it:

1. **Step conversion** (`pct_of_previous`) shows *where* people leave. The biggest leak is cart → checkout: about 29% of carts never start checkout.
2. **Overall conversion** (`pct_of_carts`) is 50.5%: half of all carts end in a payment.
3. Submit → success is the payment success rate seen from the funnel. These people *wanted* to pay, so this drop-off is the most valuable one to fix.

Self-check: `payments` has 7,630 rows but only 7,593 sessions submitted a payment. The difference, 37, is exactly the double charges: one session, two payment rows.

> **Try it yourself:** add `device` to the query (`GROUP BY device, event_name`) and compare. Overall conversion is almost the same on Android, iOS and web (50.4%, 51%, 50%), so the device alone doesn't explain the leaks over the full year.

## 5. Refunds, chargebacks and fraud signals

A **refund** is the merchant returning money (wrong size, cancelled order). **Refund rate** = refunded payments ÷ successful payments. Measure it by count and by value.

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

Overall, 175 of 6,991 successful payments were refunded (2.5%), worth 150.9 million VND, or 2.9% of GMV. Fashion's 7.2% is normal for clothes (sizes); the same jump in grocery would be strange. Compare each category with its own history.

A **chargeback** is different: the *cardholder* disputes a card payment with their issuing bank ("I never bought this", "the goods never arrived"). The dispute follows the card scheme's rules; the money is pulled back from the merchant, usually with a fee, and the merchant can contest it. **fintech.db has no chargeback table**, so we can't measure it here. At work you would get dispute data from the acquirer: chargeback rate = disputed card payments ÷ card payments, by the month of the original payment.

**Fraud signals** to watch: **velocity** (many attempts from one customer, card or device in minutes), **card testing** (many small failed card payments, then a big one), a new account on a new device buying expensive electronics, and rising `fraud_blocked` declines. Here 39 attempts (about 0.5%) were `fraud_blocked`. Blocking has a cost too: every good customer blocked by mistake is a lost sale.

## 6. Revenue: MDR, take rate and settlement

The merchant pays a fee on each payment, the **MDR** (merchant discount rate), stored in `merchants.mdr_pct`. The platform's **gross revenue** is the sum of those fees; **take rate** = revenue ÷ GMV.

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

In total about 76 million VND of fees on 5.12 billion VND of GMV, a take rate of about **1.48%**. Electronics is about 39% of GMV. Food delivery has the most payments but little revenue, because baskets are small.

This is *gross* revenue. **Net revenue** subtracts what the platform pays others: interchange to the issuer, scheme fees, gateway and SMS/OTP costs, and fees not returned on refunds. fintech.db doesn't store those costs, so say "MDR revenue" and not "profit".

**Settlement** is paying the merchant. A worked example (illustrative numbers) for a fashion shop with a 1.9% MDR, settled T+1:

| Item | VND |
|---|---|
| 3 successful payments: 500,000 + 300,000 + 200,000 | 1,000,000 |
| MDR fee 1.9% | −19,000 |
| Refund issued today for an earlier order | −250,000 |
| **Paid to the merchant tomorrow** | **731,000** |

**Reconciliation** checks that the payments table, the acquirer's settlement file and the bank statement agree. Every difference ("break") must be explained.

## 7. E-wallet metrics

A wallet has money coming in and going out. Typical wallet KPIs:

- **Cash-in**: money entering the wallet from outside, e.g. a top-up from a linked bank account.
- **Cash-out**: money leaving to a bank account (`withdraw`).
- **Spend**: wallet payments at merchants. Plus P2P transfers between users.
- **Active wallets**: wallets with at least one customer-initiated successful transaction in the period. Exclude `cashback` and `refund`, which the system triggers, not the user.
- **Top-up success rate**, and **float**: the total balance customers keep in wallets.

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

Active wallets grew every month, from 903 to 1,294. Cash-in is far larger than cash-out plus merchant spend. Money is accumulating in wallets (float), which is useful for the business but means the e-wallet holds a lot of customer money that must be safeguarded and reconciled. Of 14,036 top-up attempts, 3.1% failed.

Note the `amount` sign convention: money out is negative, so cash-out is `-SUM(...)`.

> **Common misconception:** "Active wallets = wallets with status `active`." `wallets.status` is a snapshot as of 2026-06-30. Activity comes from the transactions table, in a stated period.

## 8. Time patterns and repeat customers

### Time of day, in Vietnam time

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

The evening (19:00–23:59) carries about 36% of payments, with a lunch bump at 12:00. Run it without `'+7 hours'` and the peak appears at "13:00", which is meaningless for scheduling support staff or a promotion push.

### Peak days

Group successful payments by `date(created_at, '+7 hours')` and sort by count: 11.11 had 54 and 12.12 had 47, against an average of about 19 a day. Averaging the daily counts by period (a CTE of daily counts, then a `CASE` on the date) shows Tết (17 Feb 2026): about 19 a day in early January, 27.6 a day in the three weeks before Tết, and only 9 a day over the 17–21 Feb holiday. Plan capacity, fraud rules and support staff for those days.

### Repeat purchase cohorts

A **cohort** groups customers by when they started, here the month of their first successful payment. The question is "what share bought again within 90 days?"

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

Two traps. The July 2025 cohort is inflated because the data *starts* in July 2025, so loyal customers who had been buying for months show up as "new" (this is called **left-censoring**). And cohorts after March 2026 are cut off because they haven't had 90 days yet. The downward drift from about 59% to about 40% is worth a question to the product team, but check the first trap before you claim retention got worse.

## 9. Investigation: the May 2026 drop in card payment success

In early July, preparing the quarterly review, the head of payments asks: "Card payments felt bad at some point in May. Was something wrong, and how much did it cost us?" Here is the investigation, step by step.

### Step 1: a weekly trend, not a yearly average

Over the whole year, Android card success (89.1%) and iOS card success (89.7%) look the same. A one-week incident disappears in a twelve-month average, so we look at weeks (Monday-start, Vietnam time).

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

(`'weekday 0', '-6 days'` moves a date forward to Sunday, then back to that week's Monday.) Normal weeks wobble between about 84% and 97%: with ~50 attempts a week, a single failure moves the rate about 2 points. The week of **11 May** at 68.8% is far outside that range.

### Step 2: slice by device

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

The drop is **Android only**. iOS and web were normal. ("Other weeks" = the 4 weeks before and the 5 weeks after.)

### Step 3: slice by failure reason

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

All 13 Android failures were `otp_timeout`: the customer never completed the OTP step. Other methods on Android were fine that week: e-wallet had 2 failures in 24 attempts and QR had 0 in 22 (same query, grouped by `method, device`). That points away from "the Android app is broken" and towards the OTP (SMS) delivery path.

### Step 4: find the exact days

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

The problem starts on 11 May and stops on 18 May (Vietnam dates). There is no row for 15 May: no Android card attempts that day. A missing row means zero attempts, not zero failures. We used `COUNT(CASE …)` for the OTP column. `SUM(failure_reason = 'otp_timeout')` returns NULL on a day where every `failure_reason` is NULL.

### Step 5: confirm in the funnel

Count distinct sessions with `submit_payment` and with `payment_success` in `checkout_events`, for `device = 'android'` and `payment_method = 'card'`, split by the same two periods. Other weeks: 248 of 270 sessions succeeded (91.9%); outage week: 9 of 22 (40.9%). Two independent sources agree. (The payments table shows 249 successes in the other weeks because one session there was double-charged.)

### Step 6: size the impact

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

At the normal 92.2% we would expect about 20 successes, but there were 9. So about **11 lost payments** and roughly **7.6 million VND of lost GMV** in this sample. At a ~1.5% take rate that is only about 115,000 VND of fees. The bigger cost is trust: none of the 13 customers who hit `otp_timeout` paid successfully in the following 24 hours (checked with a self-join on `customer_id`), so these were lost sales, not delayed ones.

### Step 7: write it up

> **Card payment incident, 11–17 May 2026 (Vietnam time).** Android card payment success fell from about 92% to 41% for one week; iOS, web and other methods were normal. Every extra failure was `otp_timeout`, which points to OTP (SMS) delivery rather than our app. About 11 payments and about 7.6 M VND GMV were lost in this dataset, and affected customers did not come back within a day. **Recommend:** confirm the timeline with the OTP/SMS provider; add a daily alert on card success rate by device; on `otp_timeout`, offer an in-app fallback (resend code, or switch to wallet/QR).

> **BA corner:** turn the finding into requirements: "Alert when Android card success rate over the last 2 hours is more than 10 points below its 4-week average, with at least 30 attempts" (the minimum count stops alerts firing on noise), plus a user story for the OTP fallback with acceptance criteria you can test.

## 10. Practice exercises

### Exercise 1 — Read a success-rate table

A bank's card payments yesterday: success 1,840, refunded 60, failed 180, pending 20. What is the success rate?

**Answer:** refunded counts as success and pending is excluded: (1,840 + 60) ÷ (1,840 + 60 + 180) = 1,900 ÷ 2,080 ≈ **91.3%**. Report the 20 pending separately; if they stay pending for days, they are stuck payments.

### Exercise 2 — A merchant's day by hand

An electronics shop (MDR 1.6%) had 4 successful payments yesterday: 2,000,000, 3,500,000, 1,500,000 and 3,000,000 VND. Compute GMV, AOV, the platform's MDR revenue and the amount settled to the shop (no refunds).

**Answer:** GMV = 10,000,000 VND; AOV = 10,000,000 ÷ 4 = 2,500,000 VND; MDR revenue = 1.6% × 10,000,000 = 160,000 VND; settlement = 10,000,000 − 160,000 = **9,840,000 VND**.

### Exercise 3 — Why do e-wallet payments fail?

Write SQL for the failure-reason mix of e-wallet payments.

**Answer:**

```sql
SELECT failure_reason,
       COUNT(*) AS failed,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM payments
WHERE method = 'e_wallet' AND status = 'failed'
GROUP BY failure_reason
ORDER BY failed DESC;
```

`insufficient_funds` is 122 of 167 failures (73.1%), then `network_error` 29 (17.4%). The product fix is a smooth "top up and pay" flow, not a bank conversation.

### Exercise 4 — Active wallets in June

How many wallets were active in June 2026 (Vietnam time), and as a share of what?

**Answer:**

```sql
SELECT COUNT(DISTINCT wallet_id) AS active_june
FROM wallet_transactions
WHERE status = 'success'
  AND txn_type NOT IN ('cashback', 'refund')
  AND date(created_at, '+7 hours') BETWEEN '2026-06-01' AND '2026-06-30';
```

1,294 wallets. All 2,235 wallets were opened by 30 June, so the active share is about **58%**. Don't filter on `wallets.status = 'active'`: 20 of the wallets active in June are `closed` in the snapshot, because status is "as of today", not "as of June".

### Exercise 5 — Spot the bug

A colleague reports "payment success rate 89.3%" from:

```sql
SELECT ROUND(100.0 * SUM(status = 'success') / COUNT(*), 1) AS success_rate
FROM payments;
```

**Answer:** two problems. It counts `refunded` payments as failures (they succeeded first), and it puts `pending` (unknown outcome) in the denominator. Use `SUM(status IN ('success', 'refunded'))` and `WHERE status <> 'pending'`: the rate becomes 91.8%.

### Exercise 6 — A suspicious chart

A daily GMV chart's highest day is 23 Aug 2025, and marketing says their campaign that day worked. What do you check?

**Answer:** count and the biggest orders, not just the sum. That day had only 18 successful payments, below the ~19 a day average; one electronics order of 17.26 million VND drives the spike. GMV per day is noisy because of big tickets. Look at payment counts and median order value, or exclude outliers, before you credit a campaign.

### Exercise 7 — "Roll back the Android release!"

During the week of 11 May, a product manager sees Android payments failing and wants to roll back the latest Android app release. What do you show them?

**Answer:** the outage-week method × device slice. On Android, card had 13 failures in 22 attempts, all `otp_timeout`, while e-wallet had 2 in 24 and QR 0 in 22. If the app itself were broken, every method would suffer. The evidence points to the card OTP step, so the first call is to the OTP/SMS provider, not a rollback.

## 11. Summary

- **GMV** is the value of goods sold through the platform; **TPV** is all payment volume processed; neither is revenue. AOV = GMV ÷ successful payments; show the median too, because amounts are skewed.
- **Payment success rate**: refunded counts as success, pending is excluded. Write the rule into the report spec.
- Decline reasons tell you **who can fix** a failure: customer, issuer, OTP/3-D Secure, network or risk.
- Count **distinct sessions** in a funnel; the submit → success step is the costliest leak.
- Refunds come from the merchant; chargebacks are cardholder disputes through the card scheme (no table in fintech.db).
- Revenue = MDR fees; take rate = fees ÷ GMV (about 1.48% here); net revenue also subtracts costs.
- Wallet KPIs: active wallets (from transactions, not status), cash-in, cash-out, top-up success, float.
- Always bucket by Vietnam time. A yearly average can hide a one-week outage: trend by week, then slice by device and reason, then size the impact.

**Key terms**

| Term | Plain meaning |
|---|---|
| GMV | Value of goods sold through the platform, before refunds |
| TPV | Total value of payments processed |
| AOV | Average value of one successful order |
| Success (authorization) rate | Successful attempts ÷ attempts with a known outcome |
| Decline | The issuer or system refuses a payment |
| 3-D Secure / OTP | Extra check that the cardholder is really paying |
| Funnel | Steps a shopper goes through, counted by session |
| Refund | Merchant returns the money |
| Chargeback | Cardholder disputes a payment through their bank |
| MDR | Fee % the merchant pays per payment |
| Take rate | Platform revenue ÷ GMV |
| Settlement | Paying merchants what they are owed, minus fees |
| Cash-in / cash-out | Money entering / leaving the wallet system |
| Cohort | Customers grouped by when they started |

Next: **Dashboards, KPIs & an End-to-End Case Study**, which turns these metrics into KPI cards, dashboards and alerts, then works through a full lending investigation.
