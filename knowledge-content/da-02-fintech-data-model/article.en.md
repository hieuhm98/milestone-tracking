# The Data Behind Banking, Lending & Payments

## 1. The map before the analysis

Before you calculate an approval rate or a payment success rate, you need a map: which tables exist, what one row in each means, and how they connect. Almost every fintech number is built from a few "things": a **customer**, the **accounts** that hold their money, the **transactions** that move it, the **lending chain** (application → loan → repayments) and the **payments chain** (merchant → checkout → payment → refund).

This topic studies the *shape* of the practice database of **VayNhanh**, a fictional Vietnamese digital lender with an e-wallet. Open [SQL Practice → Fintech](/practice/sql?db=fintech) in another tab and run the queries as you read; every run uses a throwaway copy.

A picture of how tables connect is an **ERD** (entity-relationship diagram). Here is fintech.db's, with each table's row count (from `SELECT COUNT(*) FROM <table>`):

```text
 customers (4,000)
 ├── 1 : n ──── loan_applications (6,854)
 │                └── 1 : 0..1 ──── loans (3,106)
 │                                    └── 1 : n ──── repayment_schedule (28,824)
 ├── 1 : 0..1 ─ wallets (2,235)
 │                └── 1 : n ──── wallet_transactions (26,923)
 │                                 └ reference ┄┄► payments.payment_id  (e-wallet rows)
 ├── 1 : n ──── checkout_events (46,526)
 │                └ session_id ┄┄► payments.session_id
 └── 1 : n ──── payments (7,630)

 merchants (33)
 ├── 1 : n ──── checkout_events
 └── 1 : n ──── payments

 ──  foreign key (declared)      ┄┄►  soft link (same value, not declared as a key)
```

Read it as: "one customer has **1 : n** (one-to-many) loan applications", "one application has **0..1** loan" (at most one). The two **soft links** are not declared as keys, but you can join on them: `payments.session_id` matches `checkout_events.session_id`, and `wallet_transactions.reference` holds a `payment_id` for e-wallet payments and refunds.

> **BA corner:** On a new fintech project, ask for (or draw) this map in week one. Many "the numbers don't match" arguments are two people counting different tables: applications vs loans, payment attempts vs successful payments.

## 2. Customers and KYC: who is allowed to do what

A **customer** row is a person who signed up. Being *allowed* to borrow or hold money comes later: a regulated company must first check the person's identity. That is **KYC** (Know Your Customer). In Vietnam, digital KYC (**eKYC**) usually means scanning the chip ID card (CCCD) and taking a selfie that is matched to the ID photo. fintech.db keeps the result in `customers.kyc_status`.

KYC is a **gate**. Check it with a LEFT JOIN to wallets:

```sql
SELECT c.kyc_status,
       COUNT(*)           AS customers,
       COUNT(w.wallet_id) AS with_wallet
FROM customers c
LEFT JOIN wallets w ON w.customer_id = c.customer_id
GROUP BY c.kyc_status;
```

| kyc_status | customers | with_wallet |
| --- | --- | --- |
| pending | 241 | 0 |
| rejected | 141 | 0 |
| verified | 3618 | 2235 |

No unverified customer has a wallet. They can still *apply* for a loan, but:

```sql
SELECT a.status, a.reject_reason, COUNT(*) AS applications
FROM loan_applications a
JOIN customers c ON c.customer_id = a.customer_id
WHERE c.kyc_status <> 'verified'
GROUP BY a.status, a.reject_reason;
```

| status | reject_reason | applications |
| --- | --- | --- |
| pending | NULL | 2 |
| rejected | kyc_failed | 630 |

Every decided application from an unverified customer was rejected with `kyc_failed`. So "customers" (4,000) and "customers who can actually use the product" are different numbers, and a report must say which one it shows.

Notice also that `kyc_status` says *what the customer is now*. There is no column saying *when* they were verified. Section 4 explains why that matters.

> **Common misconception:** "A customer is the same as an account." One customer can hold a wallet, two loans and a savings account. Always ask whether a metric counts *customers* or *accounts*.

## 3. Accounts, ledgers and double-entry

In banking, an **account** is a named container for money with an owner and a balance: a current account, an e-wallet, a loan (where the balance is what you owe). The balance changes only through **transactions**.

Real banks and wallets record every money movement in a **ledger**: an append-only book of entries. Good ledgers use **double-entry bookkeeping**: every movement is written twice, as money leaving one account and money arriving in another, so nothing appears or disappears. Accountants call the two sides **debit** and **credit**; in every entry, total debits = total credits.

Here is wallet 520 as a double-entry ledger would record it (real amounts from fintech.db; the ledger itself is an illustration):

| Entry | What happened | Debit | Credit | VND |
| --- | --- | --- | --- | --- |
| E1 | Customer tops up from their bank | VayNhanh cash at bank | Wallet 520 (owed to customer) | 190,000 |
| E2 | Customer pays Kids Corner | Wallet 520 (owed to customer) | Payable to Kids Corner | 133,000 |
| E3 | Kids Corner refunds the order | Payable to Kids Corner | Wallet 520 (owed to customer) | 133,000 |

Money in a customer's wallet is not VayNhanh's money: it is money VayNhanh **owes** the customer, so a credit increases it and a debit decreases it. You don't need to memorise debit/credit directions; remember the idea: **every movement has two sides, and they always balance.** That is how finance proves no money was created or lost.

> **Important:** fintech.db is a **simplified** model. It has **no ledger table and no accounts table**. The closest thing is `wallet_transactions`, which stores only the wallet side of each movement as one signed amount (money in > 0, money out < 0). Loan repayments are written straight onto schedule rows. At work you will often meet a `ledger_entries` or `journal_lines` table; when you do, check that each entry's lines balance.

## 4. Balances vs transactions, snapshots vs events

There are two ways to know what is in a wallet: read the stored **balance**, or add up the successful **transactions**. They should agree. Wallet 520:

```sql
SELECT txn_id, created_at, txn_type, amount, status, reference
FROM wallet_transactions
WHERE wallet_id = 520
ORDER BY created_at;
```

| txn_id | created_at | txn_type | amount | status | reference |
| --- | --- | --- | --- | --- | --- |
| 10324 | 2025-11-27 09:55:41 | top_up | 190000 | success | NULL |
| 15382 | 2026-02-12 23:26:07 | payment | -133000 | success | 4598 |
| 15775 | 2026-02-17 23:26:07 | refund | 133000 | success | 4598 |
| 17392 | 2026-03-11 15:30:13 | transfer_out | -310000 | failed | NULL |
| 17793 | 2026-03-17 05:32:30 | top_up | 750000 | success | NULL |
| 20815 | 2026-04-23 09:07:31 | transfer_out | -130000 | success | NULL |

Successful rows: 190,000 − 133,000 + 133,000 + 750,000 − 130,000 = **810,000**. The failed transfer never moved money. Compare with the stored balance:

```sql
SELECT w.wallet_id,
       w.balance AS stored_balance,
       SUM(CASE WHEN t.status = 'success' THEN t.amount ELSE 0 END) AS computed_balance
FROM wallets w
JOIN wallet_transactions t ON t.wallet_id = w.wallet_id
WHERE w.wallet_id = 520
GROUP BY w.wallet_id, w.balance;
```

| wallet_id | stored_balance | computed_balance |
| --- | --- | --- |
| 520 | 810000 | 810000 |

They match. Comparing two independent records of the same money is **reconciliation**; a difference is a **break**. A few wallets in fintech.db do not match; the next topic hunts them down.

### Two kinds of tables

| | **Event** (transaction, log) | **Snapshot** (current state) |
| --- | --- | --- |
| One row means | Something that happened, at a time | How a thing is now (or as of a date) |
| Changes by | Adding rows (append-only) | Overwriting columns |
| In fintech.db | `wallet_transactions`, `checkout_events` | `wallets.balance`, `customers.kyc_status`, `loans.status` |

Some tables mix both. `payments` has one row per payment attempt (an event), but its `status` is overwritten later (`success` becomes `refunded`). `repayment_schedule` is a plan whose `paid_date` and `amount_paid` are filled in when the customer pays. Every status in fintech.db is **as of 2026-06-30**.

The rule: **you can rebuild a snapshot from events, but never events from a snapshot.** The balance above was rebuilt from transactions. But no query can tell you *on which day* customer 933 (the owner of wallet 520, per `wallets.customer_id`) became `verified`, because `kyc_status` keeps only the latest value.

> **BA corner:** If anyone will ever ask "how many X were in state Y on date D?", write a requirement for a **status history** table (one row per status change, with a timestamp). Adding it later does not bring back history you never recorded.

## 5. The lending chain: application → decision → loan → schedule → repayment

Each link of the lending chain is a table with its own **grain** (what one row means): `loan_applications` has one row per request (the decision is written onto the same row), `loans` one row per disbursed loan, `repayment_schedule` one row per installment.

Follow customer 3152 through it:

```sql
SELECT a.application_id, a.product, a.amount_requested,
       a.status AS app_status, l.loan_id, l.principal, l.status AS loan_status
FROM loan_applications a
LEFT JOIN loans l ON l.application_id = a.application_id
WHERE a.customer_id = 3152
ORDER BY a.applied_at;
```

| application_id | product | amount_requested | app_status | loan_id | principal | loan_status |
| --- | --- | --- | --- | --- | --- | --- |
| 2645 | cash_loan | 4500000 | approved | 1150 | 4500000 | closed |
| 3003 | bnpl | 6100000 | cancelled | NULL | NULL | NULL |
| 5440 | cash_loan | 7000000 | approved | 2384 | 7000000 | active |

Step by step for the first one (the details come from `SELECT * FROM loan_applications WHERE application_id = 2645` and `SELECT * FROM loans WHERE loan_id = 1150`):

1. **Application.** On 2025-09-19 the customer asked for 4,500,000 VND over 6 months. The row stores the request and the **credit score** (632) from the scoring model.
2. **Decision.** About four minutes later it was `approved` and `decided_at` was filled in. Digital lenders decide automatically, in seconds or minutes.
3. **Loan.** Loan 1150 was **disbursed** (paid out) the same day: 31% nominal yearly rate, 6 installments of 820,000.
4. **Schedule and repayment.** Six rows appeared in `repayment_schedule`, one per month. Each payment filled in `paid_date` and `amount_paid`:

```sql
SELECT installment_no, due_date, amount_due, paid_date, amount_paid
FROM repayment_schedule
WHERE loan_id = 1150
ORDER BY installment_no;
```

| installment_no | due_date | amount_due | paid_date | amount_paid |
| --- | --- | --- | --- | --- |
| 1 | 2025-10-19 | 820000 | 2025-10-17 | 820000 |
| 2 | 2025-11-19 | 820000 | 2025-11-16 | 820000 |
| 3 | 2025-12-19 | 820000 | 2025-12-18 | 820000 |
| 4 | 2026-01-19 | 820000 | 2026-01-16 | 820000 |
| 5 | 2026-02-19 | 820000 | 2026-02-18 | 820000 |
| 6 | 2026-03-19 | 820000 | 2026-03-16 | 820000 |

All paid on time, so the loan is `closed`. The BNPL application was approved by the model but the customer never accepted the offer: `cancelled`, no loan. In this database `approved` means "approved **and** booked as a loan". Check it on the whole table:

```sql
SELECT a.status AS app_status,
       COUNT(*)         AS applications,
       COUNT(l.loan_id) AS loans_created
FROM loan_applications a
LEFT JOIN loans l ON l.application_id = a.application_id
GROUP BY a.status
ORDER BY applications DESC;
```

| app_status | applications | loans_created |
| --- | --- | --- |
| rejected | 3424 | 0 |
| approved | 3106 | 3106 |
| cancelled | 295 | 0 |
| pending | 29 | 0 |

Exactly one loan per approved application. The `UNIQUE` constraint on `loans.application_id` guarantees "at most one"; the data shows "exactly one".

> **Simplification:** real lenders also keep a `repayments` table (one row per money transfer received), because customers pay half an installment, two at once, or late in pieces. fintech.db writes payments straight onto the schedule. Also, `bnpl` payments at checkout are not linked to rows in `loans`; a real BNPL company would link them with an ID.

> **Try it yourself:** run the schedule query with `loan_id = 2086`. You should see installment 1 paid and installments 2–4 (due 2026-04-27, 05-27 and 06-27) with `paid_date` NULL and `amount_paid` 0: **overdue**, due before 2026-06-30 and unpaid. Measuring how late (DPD) is the lending-metrics topic.

## 6. Statuses are state machines

A `status` column is not free text. Each value is a **state**, and only some moves between states are allowed: a **state machine**. Drawing it is the fastest way to understand a table.

```text
 loan_applications.status                 loans.status (as of 2026-06-30)
            ┌──► approved ──► loan created           ┌──► closed     (all paid)
 pending ───┼──► rejected  + reject_reason   active ──┤
            └──► cancelled (offer not taken)         └──► defaulted  (unpaid > 90 days)

 payments.status
            ┌──► success ──► refunded
 pending ───┤
            └──► failed  + failure_reason
```

Each state implies rules about other columns, and each rule is a check you can run:

| Rule | In SQL |
| --- | --- |
| Rejected applications, and only those, have a reason | `status = 'rejected'` ⇔ `reject_reason IS NOT NULL` |
| Pending applications have no decision time | `status = 'pending'` ⇔ `decided_at IS NULL` |
| Failed payments, and only those, have a failure reason | `status = 'failed'` ⇔ `failure_reason IS NOT NULL` |

```sql
SELECT status,
       COUNT(*)                        AS payments,
       SUM(failure_reason IS NOT NULL) AS with_reason
FROM payments
GROUP BY status
ORDER BY payments DESC;
```

| status | payments | with_reason |
| --- | --- | --- |
| success | 6816 | 0 |
| failed | 621 | 621 |
| refunded | 175 | 0 |
| pending | 18 | 0 |

The rule holds. (In SQLite, `failure_reason IS NOT NULL` is 1 or 0, so `SUM` counts the true rows.) The 18 `pending` rows deserve a question: a payment should leave `pending` within seconds, so one pending for days is "stuck". Data Quality looks at those.

> **Common misconception:** "`status = 'success'` counts every payment that went through." A refund *overwrites* `success` with `refunded`, so the 175 refunded payments also succeeded once. When a status can move forward, ask which states your metric should include.

## 7. Wallets, merchants, checkout, payments and refunds

Four tables make up the payments side:

- **`merchants`**: 33 shops, each with a category and an **MDR** (merchant discount rate): the fee percentage the merchant pays on each payment.
- **`checkout_events`**: a click log. One **session** = one shopping attempt; each step is a row: `view_cart` → `start_checkout` → `select_payment` → `submit_payment` → `payment_success`.
- **`payments`**: one row per payment attempt, with `method` (e_wallet, card, qr_code, bank_transfer, bnpl), `status` and `failure_reason`.
- **`wallet_transactions`**: for `e_wallet` payments, the money also leaves the wallet, and `reference` holds the `payment_id`.

Follow payment 4598, the one in wallet 520. Its row (`SELECT * FROM payments WHERE payment_id = 4598`, joined to `merchants`) says: 133,000 VND to Kids Corner (fashion, MDR 2.05%), method `e_wallet`, status `refunded`. Its checkout session:

```sql
SELECT event_name, event_time, device, payment_method
FROM checkout_events
WHERE session_id = (SELECT session_id FROM payments WHERE payment_id = 4598)
ORDER BY event_time;
```

| event_name | event_time | device | payment_method |
| --- | --- | --- | --- |
| view_cart | 2026-02-12 23:23:23 | ios | NULL |
| start_checkout | 2026-02-12 23:25:15 | ios | NULL |
| select_payment | 2026-02-12 23:25:53 | ios | e_wallet |
| submit_payment | 2026-02-12 23:26:05 | ios | e_wallet |
| payment_success | 2026-02-12 23:26:08 | ios | e_wallet |

The money trail is in `wallet_transactions`: `WHERE reference = '4598'` returns the `payment` row (−133,000 on 2026-02-12) and the `refund` row (+133,000 on 2026-02-17), the same two rows you saw in section 4. The story: checkout in under three minutes, paid from the wallet, refunded five days later. Two details matter:

1. **Time zone.** 23:26 UTC on 12 February is **06:26 on 13 February** in Vietnam. Reported by Vietnam day, this payment belongs to the 13th.
2. **Where history lives.** The `payments` row only says `refunded`; the moment of success is gone. The events and wallet transactions keep it: events remember, snapshots forget.

Mind the grain: `checkout_events` has one row per *step*, so `COUNT(*)` on it is never "number of shoppers". Count `DISTINCT session_id` instead.

### Refunds vs chargebacks

A **refund** is the merchant giving money back voluntarily (wrong size, cancelled order). A **chargeback** is the cardholder disputing a card payment with their bank, which forcibly pulls the money back from the merchant, usually with a fee, through the card network's dispute process. fintech.db has refunds but **no chargeback data**; in a real company chargebacks arrive in separate dispute files from the acquiring bank.

## 8. Settlement, reconciliation and idempotency keys

### Settlement (T+1)

A merchant does not receive the money the second a customer pays. Usually once a day, the payment company pays the merchant the day's total minus fees: **settlement**. "**T+1**" means "one business day after the transaction day (T)"; exact timings depend on the contract.

fintech.db has no settlement table, but you can compute one. ComNgon (food delivery, MDR 1.33%) on Vietnam day 2025-12-12:

```sql
SELECT m.merchant_name,
       date(p.created_at, '+7 hours') AS vn_business_day,
       COUNT(*) AS payments,
       SUM(p.amount) AS gross_vnd,
       m.mdr_pct,
       ROUND(SUM(p.amount) * m.mdr_pct / 100) AS mdr_fee_vnd,
       SUM(p.amount) - ROUND(SUM(p.amount) * m.mdr_pct / 100) AS net_to_merchant_vnd
FROM payments p
JOIN merchants m ON m.merchant_id = p.merchant_id
WHERE p.merchant_id = 17
  AND p.status = 'success'
  AND date(p.created_at, '+7 hours') = '2025-12-12'
GROUP BY m.merchant_name, vn_business_day, m.mdr_pct;
```

| merchant_name | vn_business_day | payments | gross_vnd | mdr_pct | mdr_fee_vnd | net_to_merchant_vnd |
| --- | --- | --- | --- | --- | --- | --- |
| ComNgon | 2025-12-12 | 7 | 1133000 | 1.33 | 15069 | 1117931 |

ComNgon receives 1,117,931 VND and VayNhanh keeps 15,069 VND. 12 December 2025 was a Friday (`strftime('%w', '2025-12-12')` returns 5), so with T+1 business days the money arrives on Monday 15 December. One of the seven payments was created at `2025-12-11 23:30:47` UTC; grouping by UTC date would put it on the wrong day. (A real settlement would also subtract refunds and chargebacks.)

### Reconciliation

**Reconciliation** compares two records of the same money from different systems and explains every difference. Typical pairs: a wallet balance vs the sum of its transactions (section 4); our payments for day T vs the bank's settlement file for day T; what we paid a merchant vs the merchant's own sales report. Finance and ops do this daily, and analysts often write the query for one side.

### Idempotency keys

The app sends "charge 250,000 VND", the connection drops before the answer arrives, and the app retries. If the server simply processes the retry, the customer pays twice: a **double charge**. The defence is an **idempotency key**: a unique ID the app creates once per intended payment and sends with every retry. If the server has already seen the key, it returns the first result instead of charging again. **Idempotent** means "doing it twice has the same effect as doing it once".

```text
 App ── POST /payments  key=K-81f2  250,000 ──► Server: new key → charge → store K-81f2 = success
     ✗ connection lost, app retries
 App ── POST /payments  key=K-81f2  250,000 ──► Server: key seen → return "success", no new charge
```

fintech.db has no idempotency-key column. The closest natural key is `session_id`: one checkout session should produce at most one payment. A **grain check**:

```sql
SELECT COUNT(*)                   AS payment_rows,
       COUNT(DISTINCT session_id) AS sessions_with_a_payment
FROM payments;
```

| payment_rows | sessions_with_a_payment |
| --- | --- |
| 7630 | 7593 |

More rows than sessions: some sessions have more than one payment. Legitimate retries after a failure, or double charges? The next topic finds out.

> **BA corner:** For any "pay", "transfer" or "disburse" feature, write idempotency into the acceptance criteria: *"Given the client retries the same request with the same idempotency key, then the customer is charged once and the same result is returned."*

## 9. Practice exercises

### Exercise 1 — Recompute a wallet balance by hand

Wallet 1403 has these transactions, all `success`: top_up 450,000; payment −414,000; refund 414,000; top_up 510,000; transfer_in 1,560,000; top_up 240,000; top_up 270,000. What should the stored balance be?

**Answer:** 450,000 − 414,000 + 414,000 + 510,000 + 1,560,000 + 240,000 + 270,000 = **3,030,000 VND**. The section 4 query with `wallet_id = 1403` returns 3030000 for both `stored_balance` and `computed_balance`: no break.

### Exercise 2 — What did the loan cost?

Loan 1150 (section 5): principal 4,500,000, six installments of 820,000, all paid. How much interest did customer 3152 pay? Check it in SQL.

**Answer:** 6 × 820,000 = 4,920,000; 4,920,000 − 4,500,000 = **420,000 VND**.

```sql
SELECT COUNT(*)                   AS installments,
       SUM(amount_paid)           AS total_repaid,
       SUM(amount_paid) - 4500000 AS interest_paid
FROM repayment_schedule
WHERE loan_id = 1150;
```

It returns 6, 4920000 and 420000.

### Exercise 3 — Spot the wrong number

A weekly report says: "Successful payments to date: 6,816" (`WHERE status = 'success'`). What is wrong?

**Answer:** Refunds overwrite `success` with `refunded`, so 175 payments that did go through are missing.

```sql
SELECT COUNT(*) AS ever_succeeded
FROM payments
WHERE status IN ('success', 'refunded');
```

It returns **6991**. For a payment success rate, include them; for revenue kept, also subtract refunded amounts. The report must state which.

### Exercise 4 — Check a state machine in SQL

Write one query that returns every loan application breaking these rules: rejected ⇔ has a `reject_reason`; pending ⇔ no `decided_at`. How many rows do you expect?

**Answer:**

```sql
SELECT application_id, status, reject_reason, decided_at
FROM loan_applications
WHERE (status = 'rejected'  AND reject_reason IS NULL)
   OR (status <> 'rejected' AND reject_reason IS NOT NULL)
   OR (status = 'pending'   AND decided_at IS NOT NULL)
   OR (status <> 'pending'  AND decided_at IS NULL);
```

**0 rows**: the table follows its state machine. Save checks like this and re-run them on every data load; an empty result is the success.

### Exercise 5 — A settlement by hand

Cho Xanh (grocery, MDR 1.26%) had 6 successful payments totalling 1,615,000 VND on Vietnam day 2025-11-11. What fee does VayNhanh keep, and what does Cho Xanh receive at T+1?

**Answer:** fee = 1,615,000 × 1.26% = **20,349 VND**; net = **1,594,651 VND**, paid on Wednesday 12 November (11 November was a Tuesday, so the next business day is the 12th). The section 8 query with `merchant_id = 13` and `'2025-11-11'` returns the same numbers.

### Exercise 6 — "When did they get verified?"

Compliance asks: "How many customers were still KYC-`pending` on 1 March 2026?" Can you answer from fintech.db?

**Answer:** No. `kyc_status` is a snapshot of today's status, with no date of change. You can say how many are pending now (241), not on 1 March. Say so honestly, and propose a `kyc_status_history` table (customer_id, old_status, new_status, changed_at) so the question can be answered in future.

## 10. Summary

- Learn the **map** first: which tables exist, what one row means, how they join.
- **KYC** is a gate: unverified customers have no wallet and their loan applications are rejected.
- Real money systems keep a **ledger** with **double-entry**: every movement has two sides that balance. fintech.db is simplified and has no ledger.
- A **balance** is a snapshot; **transactions** are events. You can rebuild a snapshot from events, never the reverse. Comparing them is **reconciliation**.
- Lending is a chain, **application → decision → loan → schedule → repayment**, each table with its own grain.
- **Statuses are state machines**; each state implies rules you can check in SQL. A status that moves forward (`success` → `refunded`) hides history.
- **Settlement (T+1)** pays merchants the day's total minus the MDR fee; **idempotency keys** stop retries from becoming double charges.

### Key terms

| Term | Plain meaning |
| --- | --- |
| ERD | A diagram of tables and how they connect (1 : n, 0..1) |
| KYC / eKYC | Checking who a customer really is; online with ID card + selfie |
| Ledger / double-entry | Append-only record of money movements, each written as two sides that balance |
| Snapshot vs event | A current value that gets overwritten vs a record of something that happened |
| Disburse | Pay out the loan money to the borrower |
| State machine | The allowed statuses and the allowed moves between them |
| MDR | The fee percentage a merchant pays per payment |
| Refund vs chargeback | Merchant gives money back vs cardholder disputes through the bank |
| Settlement (T+1) | Paying the merchant one business day after the transaction day |
| Reconciliation / break | Comparing two records of the same money / a difference between them |
| Idempotency key | A unique ID per intended payment so a retry does not charge twice |

Next topic: **Data Quality & Cleaning** — finding the breaks, duplicates, stuck payments and messy values this map pointed at.
