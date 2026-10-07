# Dashboards, KPIs & an End-to-End Case Study

## 1. From analysis to decisions

A query result is not a decision. Someone (a CEO, a Head of Risk, a product owner) has to see a number, trust it, understand what it means and decide what to do. Your job as an analyst or BA is to make that path short and safe. A stakeholder who cannot trace a number back to its source will either ignore it or, worse, act on it blindly.

This topic has two halves. First **the tools**: KPI definition cards, choosing and reading charts, dashboards with alerts, A/B tests and writing the "so what". Then **a full case study** on `fintech.db`: *"Approvals are up 15% — the CEO is happy, the risk team is worried."* We follow the March 2026 policy change from the first question to a one-page memo.

```text
question -> trustworthy data -> metric -> fair comparison -> "so what" -> decision
```

Most bad decisions in lending do not come from wrong SQL. They come from a number defined loosely, compared with the wrong baseline, or read from a chart that hid something.

---

## 2. KPI definition cards

A **KPI** (key performance indicator) is a number the business watches to know whether things are going well. Trouble starts when two teams compute "the same" KPI differently: for March–April 2026, Risk says the approval rate was 49.6% and Growth says 53.8%. Both are right; they use different definitions.

The fix is a **KPI definition card**, a short written contract for each metric:

| Field | Approval rate (VayNhanh) |
|---|---|
| Question | Of the applications we decided, what share did we approve? |
| Formula | `status = 'approved'` ÷ `status != 'pending'` |
| Grain | one row = one loan application; grouped by month of application in **Vietnam time** |
| Filters | all products and channels; `cancelled` (an offer the customer never accepted) counts as *not* approved |
| Source · owner · refresh | `loan_applications` · Head of Credit Risk · daily |
| Paired with | early delinquency by vintage |
| Caveats | recent days still contain `pending` applications |

The fields that cause most arguments are **grain** ("one row = one what?": an applicant who applies three times counts three times), **filters** (counting `cancelled` as approved is exactly the 49.6% vs 53.8% gap) and **owner** (the one person who may change the definition).

You met the other definition in da-06 (Digital Lending Analytics), which counted `cancelled` as approved because the lender did say yes. Neither is wrong: da-06 measures the credit decision, this card measures loans the business actually booked. What matters is that the card says which one, so every report uses the same rule.

The **"paired with"** field is a habit worth stealing. Almost every KPI can be pushed up in a harmful way: approve riskier people and the approval rate rises; switch off fraud checks and payment success rises. Pair each KPI with a **guardrail metric** that would expose the cheat. Once the card is signed off, nobody has to reconcile two versions of the same number in a meeting again.

> **Common misconception:** "43.2% → 49.6% is a 6.4% increase." No: it is **6.4 percentage points (pp)**, a **14.8% relative** increase. Always say which one you mean. This exact confusion is how "approvals are up 15%" reaches the CEO.

---

## 3. Picking the right chart, and reading charts critically

| Question | Chart |
|---|---|
| How does it change over time? | Line (or columns for a few periods) |
| Which category is bigger? | Horizontal bar, sorted |
| What share is each part? | 100% stacked bar; a pie only with 2–3 slices |
| How are values spread? | Histogram or box plot |
| Where do people drop out? | Funnel |
| How does each cohort perform as it ages? | Vintage lines or a coloured cohort table |
| One number right now | KPI tile with a comparison ("vs last month") |

Five ways a chart can mislead you:

1. **Truncated axis.** The same two approval rates, with the axis starting at 0% and at 38%:

```text
Axis from 0%                          Axis from 38%
Nov-25 ███████████████ 38.5           Nov-25 █ 38.5
Apr-26 ████████████████████ 50.9      Apr-26 ████████████████████████ 50.9
```

On the right the rate seems to have grown twenty-fold. Start bars for rates at zero.

2. **Cumulative vs per-period.** A running total always goes up, even when daily volume collapses.
3. **Small samples.** A rate built on 2 payments jumps between 0%, 50% and 100%. Show *n* next to every rate.
4. **Immature cohorts (right-censoring).** Young loans have had no time to go bad, so "bad rate to date" makes the newest months look best. Compare cohorts at the **same age**.
5. **Averages that hide mix.** A total can move only because the share of segments changed. Break it down before you believe it.

---

## 4. Dashboards for risk, payments and ops, with alerts

A **dashboard** is a page of KPIs that one audience checks regularly. A good one answers "is everything OK, and if not, where?" in under a minute.

| Dashboard | Audience | Typical tiles |
|---|---|---|
| Credit risk | Head of Risk, CEO | approval rate, applications, bad rate by vintage, PAR30, mix by score band and channel |
| Payments | Payments PM | success rate by method and device, decline reasons, TPV, refund rate |
| Operations | Ops team | stuck `pending` payments, reconciliation breaks, provider errors |

A common layout: KPI tiles with comparisons on top, trends in the middle, breakdowns and a detail table at the bottom. Show "data as of …" and link every tile to its KPI card.

Nobody watches a dashboard all day, so an **alert** sends a message when a metric crosses a **threshold**: a fixed line ("below 80%"), a line relative to a baseline ("10 pp below the last 4 weeks"), and usually a **minimum volume** so tiny samples don't fire it. A weekly check on Android card payments (weeks start Monday, Vietnam time):

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

The OTP outage week from the payments topic stands out. Why weekly? Grouped by day instead, April has only about 4 Android card attempts a day (between 1 and 9), and an ordinary day, 29 April, already fell to 40% (3 failures out of 5). A daily alert would fire on noise.

> **BA corner:** an alert is a requirement. Write its acceptance criteria: metric (and its KPI card), threshold, minimum volume, time window, recipient, expected action. "Alert when Android card success < 80% on ≥ 20 attempts in a Monday–Sunday VN week; send to #payments-oncall; the owner checks the OTP provider within 30 minutes."

---

## 5. A/B test basics for a checkout change

Product wants to show e-wallet and VietQR first on the payment screen. Comparing "before vs after" is weak because many other things change between two months. An **A/B test** randomly splits customers at the same time: **control (A)** sees the old screen, **variant (B)** the new one. Decide in advance:

1. **Primary metric:** sessions with `payment_success` ÷ sessions with `start_checkout`.
2. **Randomisation unit:** the customer, so one person always sees the same screen.
3. **Guardrails:** refund rate, payment failures, average order value.
4. **Sample size and duration.** Stopping as soon as it "looks good" (**peeking**) produces false wins.

Randomly assigning customers spreads everything else, such as payday, promotions and outages, evenly across both groups.

Baseline from `fintech.db` (1–28 June 2026, Vietnam time):

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

Conversion is 622 ÷ 851 = **73.1%**, about 213 sessions a week. A rule of thumb for the sample per group is n ≈ 16 × p × (1 − p) ÷ d², where *p* is the baseline and *d* the smallest lift you care about. For p = 0.73, d = 0.03: 16 × 0.73 × 0.27 ÷ 0.0009 ≈ **3,500 per group**, roughly 33 weeks at this traffic. Small products can only detect big effects quickly.

**Reading a result** (invented numbers): A converts 2,628 of 3,600 (73.0%), B 2,736 of 3,600 (76.0%). The noise margin for the difference is about 1.96 × √(2 × p × (1 − p) ÷ n) with the average p = 0.745: ≈ **2.0 pp**. The 3.0 pp lift is bigger, so it is unlikely to be chance. Check the guardrails before shipping.

---

## 6. Writing the "so what"

Managers do not want your query; they want to know what to do. Use three parts: **insight** (what the data shows, with the number and the comparison), **impact** (why it matters in money, customers or risk) and **recommendation** (what to do, who decides, how we will know it worked).

| Weak | Strong |
|---|---|
| "Android card success was 40.9% in week 2026-05-11." | "Android card payments failed far more than usual in the week of 11 May: 40.9% success vs about 90% in other weeks." |
| "Many customers were affected." | "Every Android card checkout that week was at risk: lost GMV and support tickets." |
| "We should look into it." | "Add a second OTP provider with failover (Engineering) and the weekly alert above (Data). Review in a month." |

Lead with the answer, quote few numbers and check each one, and put **caveats** where the reader will see them. "We are not sure yet because…" builds trust; hiding it destroys trust the first time a number turns out wrong. A recommendation without an owner and a deadline is only a wish. Avoid hedging every sentence; state your confidence once, clearly.

---

## 7. Case study (1): framing, data checks, approval trend and mix

> **The situation (data as of 30 June 2026).** The CEO's dashboard says approvals are up 15% since March. On 1 March VayNhanh changed its credit policy and launched a partner-channel campaign. The risk team thinks the new loans are worse. Your question: *"Was the March change good for the business?"*

### Step 1 — Frame the question

"Was it good?" cannot be queried. Break it into: what went up, and by how much? Did **who** we lend to change (channel, score band: the **mix**)? Do the new loans repay worse, **at the same age**? Is it only the new kind of customer, or everyone (**like for like**)? What is it worth, and what should we do? We fix three periods: **before** = Sep 2025–Feb 2026, **change** = Mar–Apr 2026 (policy + campaign), **after the campaign** = May–Jun 2026.

### Step 2 — Check the data is trustworthy

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

Each approved application has one loan and each loan has one installment per month of its term. The 307 applications without a score (thin-file customers) stay as their own group. For the caveats list: June still has 29 `pending` applications (add `SUM(status = 'pending')` to the next query), and timestamps are UTC, so we group by **Vietnam date**. Application 4817 was made at 04:28 on 1 March VN time, still 28 February in UTC.

### Step 3 — The approval trend

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

The data itself reveals the change: the **lowest approved score** falls from about 560 to about 520 in March, and the **partner share** of applications jumps from about 10% to about 50% in March–April only. Note that the rate was already rising from November to February, before any change: not all of the rise belongs to the policy.

### Step 4 — Where does "15%" come from?

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

The CEO's "15%" is 43.2% → 49.6%: **+6.4 pp, or +14.8% relative**. Without the 520–559 approvals, March–April would be 44.8%, so the lower cut-off explains about 4.8 of the 6.4 pp. **Volume** grew far more than the rate: about 580 decided applications a month against about 397 before (+46%), mostly from the partner campaign. And the cut-off is still 520 in May–June: 53 more approvals in the new band.

---

## 8. Case study (2): vintage curves and like-for-like comparisons

### Step 5 — Vintage curves, handling right-censoring

We reuse the vintage definition from the lending-metrics topic: a **vintage** is all loans disbursed in the same month, **MOB k** is the month-end *k* months after the vintage month, and a cell is the share of loans **ever more than 30 days past due (30+) by MOB k**.

The trap is **right-censoring**: an April loan has not reached MOB 3 yet, so we may only fill a cell when **every** loan in the group has reached that month-end (`MAX(end_m3) <= '2026-06-30'`). This time we also pool the six "before" vintages, and add March–April **2025** to check for seasonality:

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

`NULL` means "not observable yet", **not** zero. Replace the `CASE` by plain `vintage` to see each month separately:

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

March 2026 is at 7.4% by MOB 3, almost three times the pooled 2.6%; April 2026 is at 4.1% by MOB 2, more than double 1.8%. Seasonal? March and April **2025** were at 3.4% and 1.6% by MOB 3. Last spring was normal.

> **Common misconception:** "Just flag a loan as bad if installment 1 or 2 is unpaid or paid 30+ days late." Without checking that 30 days have actually passed, April's June installments count as bad simply because they are not paid *yet*. Our first attempt did exactly that and showed 10% "bad" for March–April 2026, mixing real defaults with bills that were never late.

### Step 6 — Compare like with like

March brought a new kind of loan (scores 520–559) and many more partner loans. Is it worse only because of this **mix**, or are comparable loans worse too? We compare ever 30+ by MOB 3 for the "before" vintages and the March 2026 vintage, which have all reached MOB 3.

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

(The one "before" loan in 520–559 is application 4817: approved under the new rule, disbursed on 28 February UTC.) Replacing `band` with `channel` in the outer query gives:

| channel | loans_before | bad_before_pct | loans_mar26 | bad_mar26 | bad_mar26_pct |
|---|---|---|---|---|---|
| app | 677 | 3.1 | 114 | 6 | 5.3 |
| partner | 94 | 2.1 | 127 | 12 | 9.4 |
| web | 260 | 1.5 | 41 | 3 | 7.3 |

Reading it:

- The **new band** is clearly bad: 6 of 24 March loans (25%) were already 30+ by MOB 3.
- Loans the **old rule would also have approved** got worse too: scores 560+ (and no score) gave 15 bad loans out of 258. Applying each band's "before" rate to March's mix predicts only about **6.4** (add a CTE with `AVG(bad)` per band for `grp = 'before'`, join it to the March loans and `SUM` the rates).
- Partner loans are the worst in March (9.4%), but app and web loans also got worse. Something made March applicants riskier across the board, not only the people the lower cut-off let in.

Be honest about size: these are 6, 9 and 15 bad loans. The direction is the same across bands, channels and months, which is what makes it believable, but the exact percentages will move as the loans age. A consistent pattern across many small groups is stronger evidence than one big number.

> **Try it yourself:** in [SQL Practice → Fintech](/practice/sql?db=fintech), run the Step 6 query with `'+4 months'` changed to `'+3 months'` (MOB 2) and `'2026-03-31'` changed to `'2026-04-30'`. You get 572 "after" loans; at MOB 2 the 520–559 band already stands out (9 of 53, 17%), while the other bands move much less.

---

## 9. Case study (3): sizing the impact and the one-page memo

### Step 7 — Size it, simply

The volume first:

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

About **157 extra loans and 1.77 billion VND** more lent. Now the money on both sides for the March–April vintages:

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

**A deliberately simple estimate.** In the new band, the 42 loans still performing can earn at most about 97 million VND of interest, and only if every one pays to the end. The 11 loans already 30+ DPD still owe about 121 million VND. Even if collections recover a good part of it, the band is at best around break-even before funding and operating costs, and these loans are only two to four months old. The old-eligible group still earns far more than it has at risk (about 776 vs 175 million), but Step 6 showed its bad rate is rising too. Left out (say so): funding and collection costs, recoveries, BNPL merchant fees (not in `loans`) and future defaults.

### Step 8 — The one-page memo

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

> **BA corner:** the memo's recommendations become requirements. "Put an early-delinquency tile on the dashboard" needs a KPI card (formula, grain, the censoring rule, owner) and acceptance criteria such as "a vintage cell stays empty until every loan in it has reached that MOB".

---

## 10. Practice exercises

### Exercise 1 — pp or percent?

From the Step 3 table, approval was 46.7% in February 2026 and 48.4% in March. State the change both ways.

**Answer:** +1.7 percentage points (48.4 − 46.7), a relative increase of about 3.6% (1.7 ÷ 46.7). The headline must say which one it uses.

### Exercise 2 — The "best vintage ever"

A dashboard shows "loans ever 30+ DPD to date" by vintage. June 2026 shows 0.0%, the best month ever, and a manager says the policy is improving. What is wrong?

**Answer:** right-censoring. As of 30 June no June loan has even had an installment fall due, so none can be 30+ DPD. Compare vintages at the same MOB and leave cells empty until every loan has reached that MOB, as the Step 5 query does.

### Exercise 3 — Approval rate by channel

Write a query for the approval rate by channel for applications made in March–April 2026 (Vietnam time). Which channel is lowest?

**Answer:**

```sql
SELECT channel,
       SUM(status != 'pending') AS decided,
       ROUND(100.0 * SUM(status = 'approved') / SUM(status != 'pending'), 1) AS approval_pct
FROM loan_applications
WHERE date(applied_at, '+7 hours') BETWEEN '2026-03-01' AND '2026-04-30'
GROUP BY channel
ORDER BY approval_pct DESC;
```

App 51.9% (405 decided), web 50.6% (176), partner 47.8% (578). Partner is lowest but brings half the volume: the campaign added volume, not an easier approval rate.

### Exercise 4 — Is the exposure still growing?

How many loans disbursed in May–June 2026 are in the 520–559 band, and how much principal?

**Answer:**

```sql
SELECT COUNT(*) AS loans,
       SUM(a.credit_score BETWEEN 520 AND 559) AS loans_520_559,
       ROUND(SUM(l.principal) / 1e6, 1) AS principal_m,
       ROUND(SUM(CASE WHEN a.credit_score BETWEEN 520 AND 559 THEN l.principal ELSE 0 END) / 1e6, 1) AS principal_520_559_m
FROM loans l
JOIN loan_applications a ON a.application_id = l.application_id
WHERE l.disbursed_date BETWEEN '2026-05-01' AND '2026-06-30';
```

55 of 448 loans, 642.2 of 5,127.8 million VND (about 12.5%). None can be judged yet, which is why the memo asks for a decision now instead of "wait and see".

### Exercise 5 — Read an A/B result

Control: 1,440 paid of 2,000 sessions (72.0%). Variant: 1,500 of 2,000 (75.0%). Use the Section 5 margin with p = 0.735. Convincing?

**Answer:** margin ≈ 1.96 × √(2 × 0.735 × 0.265 ÷ 2,000) ≈ 2.7 pp. The 3.0 pp lift is only just above it: probably real, but borderline. Check the guardrails, and don't extend or stop the test early just to "get significance".

### Exercise 6 — "The whole book looks fine"

The CEO: "PAR30 for the whole book barely moved, so the new loans can't be that bad." Your answer?

**Answer:** a whole-book rate divides by every loan, mostly older ones, while the new loans are young and have not had time to go bad. They are a small, recent slice of a large denominator. Vintage curves compare loans at the same age, which is why they caught the problem first.

### Exercise 7 — Rewrite the "so what"

Rewrite: "The March vintage has a 7.4% MOB3 rate."

**Answer:** "Loans booked in March 2026 are going bad almost three times faster than before: 7.4% had been more than 30 days overdue by their third month on book, vs 2.6% for Sep–Feb loans (insight). The new 520–559 band likely costs more than it earns (impact). Return the cut-off to 560 and review again in August (recommendation)."

---

## 11. Summary

- Every KPI needs a definition card: formula, grain, filters, owner and a guardrail. Say pp or relative % explicitly.
- Choose the chart for the question; distrust truncated axes, running totals, tiny samples, immature cohorts and averages that hide mix.
- A dashboard serves one audience; an alert needs a threshold, a minimum volume and an owner.
- An A/B test fixes metric, unit, guardrails and sample size in advance.
- Write the so-what as insight, impact and recommendation, and state your caveats.
- Case study: approval 43.2% → 49.6% (+6.4 pp, "15%" relative); the March 2026 vintage reached 7.4% ever 30+ by MOB 3 vs 2.6%; the 520–559 band is likely loss-making, and comparable loans got worse too.

### Key terms

| Term | Plain meaning |
|---|---|
| KPI | A key number the business watches |
| KPI definition card | A written contract: formula, grain, filters, owner |
| Guardrail metric | A metric that must not get worse while you push the main one |
| Percentage point (pp) | The plain difference between two percentages |
| Threshold / alert | The line that, when crossed, sends a message to an owner |
| A/B test | A random split into control and variant, run at the same time |
| Peeking | Stopping a test early because it looks good |
| Vintage | All loans disbursed in the same month, followed as they age |
| Right-censoring | Young cohorts have not had time to show the outcome |
| Like-for-like | Comparing the same segment across periods |
| Mix shift | A total moves because the share of segments changed |

This is the last topic of the IT Fundamentals track. Keep practising on the [Design Exercises](/practice/questions) page (category "Fintech Data Analysis") and in [SQL Practice → Fintech](/practice/sql?db=fintech).
