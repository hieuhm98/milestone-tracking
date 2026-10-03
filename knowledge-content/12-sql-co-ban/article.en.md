# SQL Basics

## 1. What Is SQL?

**SQL** (Structured Query Language) is a language used to interact with relational databases: creating tables, adding/modifying/deleting data, and querying.

People pronounce it either "S-Q-L" or "sequel"; both are fine.

**Analogy:** SQL is like ordering at a restaurant. You tell the waiter *what* you want ("a bowl of phở, no onions"), not *how* to cook it. In SQL you write "give me the names of customers in Hanoi", and the database works out by itself how to find them. That is why SQL is called a **declarative** language: you declare the result you want.

A piece of SQL is called a **statement** or a **query**, and it usually ends with a semicolon `;`. Here is the smallest useful one:

```sql
SELECT name FROM users;
```

Read it as English: "select the name column from the users table".

Add a **WHERE** clause to filter by a condition: `SELECT name FROM users WHERE city = 'Hanoi';` returns only the rows that match, here the customers in Hanoi.

SQL is not case-sensitive (`SELECT` = `select`), but the convention is to write **keywords** in uppercase.

**Keywords** are the words that belong to SQL itself (SELECT, FROM, WHERE…). Writing them in uppercase makes them stand out from your own table and column names. Note that this is about keywords only: whether the *data* is case-sensitive ('Hanoi' vs 'hanoi') depends on the database.

You will also see lines starting with `--`. That is a **comment**: a note for humans that the database ignores.

---

## 2. SQL Command Categories

SQL commands fall into four families. You do not need to memorise the abbreviations, but you will hear them at work.

| Category | Commands | Used for |
|------|------|---------|
| **DQL** | SELECT | Querying data |
| **DML** | INSERT, UPDATE, DELETE | Manipulating data |
| **DDL** | CREATE, ALTER, DROP | Defining structure |
| **DCL** | GRANT, REVOKE | Managing permissions |

In plain words, using a filing cabinet as the picture:

- **DQL** (Data Query Language): *reading* the files in the cabinet.
- **DML** (Data Manipulation Language): adding, editing or shredding individual files.
- **DDL** (Data Definition Language): building, reshaping or throwing away whole drawers (tables).
- **DCL** (Data Control Language): deciding who holds a key to which drawer.

Be careful with DML: `UPDATE` and `DELETE` change real data, and a `DELETE FROM users;` with no `WHERE` condition wipes every row in the table.

As a BA, tester or analyst you will spend almost all your time on **SELECT**. Developers write the DML and DDL; database administrators handle DCL.

---

## 3. The Example Data We Will Use

Every query in this lesson runs on the same two small tables from an online shop, so you can check each result with your own eyes.

**users** — the customers

| id | name | email | age | city |
|----|------|-------|-----|------|
| 1 | Nguyen An | an@gmail.com | 25 | Hanoi |
| 2 | Tran Binh | binh@mail.com | 32 | HCM |
| 3 | Nguyen Chi | chi@gmail.com | 28 | Hanoi |
| 4 | Le Dung | NULL | 41 | DaNang |
| 5 | Pham Hoa | hoa@mail.com | 19 | HCM |

**orders** — what they bought (`amount` in VND)

| id | user_id | amount | status | created_at |
|----|---------|--------|--------|------------|
| 101 | 1 | 250000 | paid | 2026-08-03 |
| 102 | 1 | 120000 | paid | 2026-09-10 |
| 103 | 2 | 900000 | cancelled | 2026-08-15 |
| 104 | 3 | 450000 | paid | 2026-09-02 |
| 105 | 2 | 300000 | pending | 2026-09-20 |
| 106 | 3 | 80000 | paid | 2026-09-25 |

Things to notice before we start:

- `orders.user_id` is a **foreign key** pointing at `users.id`: order 101 belongs to user 1, Nguyen An.
- Le Dung has no email: the cell is **NULL** ("no value").
- Le Dung and Pham Hoa have never ordered anything. That will matter when we get to JOIN.

---

## 4. SELECT – Querying Data

`SELECT` reads data. It never changes anything, so it is always safe to run.

```sql
-- Get everything
SELECT * FROM users;

-- Select specific columns
SELECT name, email FROM users;

-- With a condition
SELECT * FROM users WHERE age > 25;

-- Sorting
SELECT * FROM users ORDER BY name ASC;

-- Limiting the number of results
SELECT * FROM products LIMIT 10;

-- Combined
SELECT name, email
FROM users
WHERE age > 25
ORDER BY name ASC
LIMIT 5;
```

What each part means:

- `*` means "all columns". Handy for a quick look, but in real reports name the columns you need.
- `FROM users` says which table to read.
- `ORDER BY name ASC` sorts A→Z (**ascending**); `DESC` sorts Z→A, or largest number first (**descending**).
- `LIMIT 10` returns at most 10 rows, useful on tables with millions of rows.

### Worked example

```sql
SELECT name, city
FROM users
WHERE age > 25
ORDER BY name;
```

Result:

| name | city |
|------|------|
| Le Dung | DaNang |
| Nguyen Chi | Hanoi |
| Tran Binh | HCM |

Nguyen An (25) is missing because 25 is not *greater than* 25, and Pham Hoa (19) is too young. Without `ORDER BY` the database may return rows in any order it likes.

### Worked example: the three oldest customers

```sql
SELECT name, age
FROM users
ORDER BY age DESC
LIMIT 3;
```

| name | age |
|------|-----|
| Le Dung | 41 |
| Tran Binh | 32 |
| Nguyen Chi | 28 |

---

## 5. WHERE – Filter Conditions

**Analogy:** `WHERE` is the filter button in Excel. Only rows that pass the condition come through.

```sql
-- Comparison
WHERE age = 25
WHERE age > 25
WHERE age >= 25
WHERE age != 25

-- Range of values
WHERE age BETWEEN 20 AND 30

-- In a list
WHERE city IN ('Hanoi', 'HCM', 'DaNang')

-- String search (LIKE)
WHERE name LIKE 'Nguyen%'   -- starts with 'Nguyen'
WHERE email LIKE '%@gmail.com'  -- ends with '@gmail.com'

-- Combining conditions
WHERE age > 25 AND city = 'Hanoi'
WHERE age < 20 OR age > 60

-- Null check
WHERE phone IS NULL
WHERE phone IS NOT NULL
```

Notes for beginners:

- Text values go in **single quotes**: `'Hanoi'`. Numbers do not: `25`.
- `!=` means "not equal"; many databases also accept `<>`.
- `BETWEEN 20 AND 30` **includes** both ends: 20 and 30 both match.
- In `LIKE`, `%` means "any characters, any number of them". `'Nguyen%'` = starts with Nguyen.
- `AND` needs both conditions to be true; `OR` needs at least one.
- You cannot write `= NULL`. NULL means "unknown", so you must ask `IS NULL` / `IS NOT NULL`.

### Worked examples

```sql
SELECT name, email FROM users WHERE email LIKE '%@gmail.com';
```

| name | email |
|------|-------|
| Nguyen An | an@gmail.com |
| Nguyen Chi | chi@gmail.com |

```sql
SELECT name FROM users WHERE email IS NULL;
```

| name |
|------|
| Le Dung |

> **At work:** a support ticket says "customers without an email never receive the order confirmation". A tester runs the `IS NULL` query above to count how many customers are affected.

---

## 6. INSERT – Adding Data

`INSERT` adds new rows.

```sql
-- Add one record
INSERT INTO users (name, email, age)
VALUES ('Nguyen Van A', 'a@mail.com', 25);

-- Add multiple records
INSERT INTO users (name, email, age)
VALUES 
  ('Tran Thi B', 'b@mail.com', 30),
  ('Le Van C', 'c@mail.com', 28);
```

How to read it: "into the users table, in the columns name, email, age, put these values". The values must be in the **same order** as the columns listed.

You usually do not give an `id`: the database fills it in automatically (auto-increment). Columns you leave out, like `city` above, become NULL, unless the schema gives them a default value or marks them required, in which case the INSERT fails with an error.

After the first INSERT on our data, `users` has a 6th row: `6 | Nguyen Van A | a@mail.com | 25 | NULL`.

---

## 7. UPDATE – Updating Data

`UPDATE` changes rows that already exist.

```sql
-- Update one user
UPDATE users
SET email = 'newemail@mail.com', age = 26
WHERE id = 1;

-- ⚠️ NO WHERE → updates ALL records!
UPDATE users SET age = 0;  -- VERY DANGEROUS!
```

Read it as: "in users, set email to … and age to 26, but only where id is 1". After the first statement, Nguyen An's row becomes `1 | Nguyen An | newemail@mail.com | 26 | Hanoi`; the other four rows are untouched.

The `WHERE` is what limits the change. Forget it and **every** row is changed: all five customers would suddenly be 0 years old.

> **Common misconception:** "I can just press Undo." There is no Undo button in a database. Once an UPDATE is committed, getting the old values back means restoring from a backup, which is slow and may lose other recent data.

A safe habit: first run a `SELECT` with the same `WHERE` (`SELECT * FROM users WHERE id = 1;`), check that it returns exactly the rows you expect, then turn it into the UPDATE.

---

## 8. DELETE – Deleting Data

`DELETE` removes whole rows.

```sql
-- Delete one record
DELETE FROM users WHERE id = 5;

-- ⚠️ NO WHERE → deletes the ENTIRE table!
DELETE FROM users;  -- VERY DANGEROUS!
```

On our data, the first statement removes Pham Hoa (id 5). The second removes all five customers. The table itself still exists, but it is empty.

Two related words you may hear:

- `DROP TABLE users;` (DDL) removes the table **and** its structure, not just the rows.
- **Soft delete**: many apps never really delete. They set a column like `deleted_at` or `is_active = false` and simply hide those rows. If a user "deletes" their account but support can still see it, this is usually why.

> **Common misconception:** "Deleting a customer is harmless." If the customer still has orders, the foreign key may block the DELETE with an error, which is the database protecting your data.

---

## 9. JOIN – Combining Tables

The orders table only stores `user_id`, not the customer's name. To show names next to orders we **join** the two tables.

**Analogy:** you have a list of parcel numbers with customer IDs and a separate address book. Joining is laying the two side by side and matching each parcel to its customer by ID.

```sql
-- Get orders along with the user's name
SELECT orders.id, users.name, orders.amount
FROM orders
INNER JOIN users ON orders.user_id = users.id;

-- LEFT JOIN: get all orders, even orders with no user
SELECT orders.id, users.name
FROM orders
LEFT JOIN users ON orders.user_id = users.id;
```

`ON orders.user_id = users.id` is the matching rule: "an order goes with the user whose id equals the order's user_id". Writing `orders.id` and `users.name` (table name + dot + column) tells the database which table each column comes from, since both tables have an `id`.

### INNER JOIN result

| id | name | amount |
|----|------|--------|
| 101 | Nguyen An | 250000 |
| 102 | Nguyen An | 120000 |
| 103 | Tran Binh | 900000 |
| 104 | Nguyen Chi | 450000 |
| 105 | Tran Binh | 300000 |
| 106 | Nguyen Chi | 80000 |

Le Dung and Pham Hoa do not appear: they have no orders, so there is nothing to match.

### LEFT JOIN: keep everyone from the left table

"Show every customer and their orders, including customers who never ordered":

```sql
SELECT users.name, orders.id AS order_id, orders.amount
FROM users
LEFT JOIN orders ON orders.user_id = users.id
ORDER BY users.id, orders.id;
```

| name | order_id | amount |
|------|----------|--------|
| Nguyen An | 101 | 250000 |
| Nguyen An | 102 | 120000 |
| Tran Binh | 103 | 900000 |
| Tran Binh | 105 | 300000 |
| Nguyen Chi | 104 | 450000 |
| Nguyen Chi | 106 | 80000 |
| Le Dung | NULL | NULL |
| Pham Hoa | NULL | NULL |

The "left" table is the one written after `FROM`. Every one of its rows is kept; where there is no match on the right, the right-hand columns are filled with NULL. This is how you find "customers who have never ordered": add `WHERE orders.id IS NULL`.

| JOIN type | Returns |
|-----------|--------|
| INNER JOIN | Only records that match in both tables |
| LEFT JOIN | All rows from the left table + matches from the right |
| RIGHT JOIN | All rows from the right table + matches from the left |
| FULL JOIN | All rows from both tables |

In practice INNER JOIN and LEFT JOIN cover almost everything. (SQLite only added RIGHT and FULL JOIN in version 3.39, and MySQL has no FULL JOIN.)

---

## 10. Aggregate Functions

So far every query returned individual rows. **Aggregate functions** squash many rows into one number, like the SUM and AVERAGE formulas in Excel.

```sql
-- Count
SELECT COUNT(*) FROM orders;

-- Sum
SELECT SUM(amount) FROM orders WHERE user_id = 1;

-- Average
SELECT AVG(amount) FROM orders;

-- Max/Min
SELECT MAX(amount), MIN(amount) FROM orders;

-- Group results
SELECT user_id, COUNT(*) as order_count, SUM(amount) as total
FROM orders
GROUP BY user_id
HAVING SUM(amount) > 500000;
```

On our data:

| Query | Result |
|-------|--------|
| `COUNT(*)` | 6 (orders) |
| `SUM(amount) … WHERE user_id = 1` | 370000 (250000 + 120000) |
| `AVG(amount)` | 350000 (2100000 ÷ 6) |
| `MAX(amount), MIN(amount)` | 900000, 80000 |

### GROUP BY: one result per group

**Analogy:** sorting receipts into piles, one pile per customer, then adding up each pile. That is a pivot table in Excel.

```sql
SELECT user_id, COUNT(*) AS order_count, SUM(amount) AS total
FROM orders
GROUP BY user_id;
```

| user_id | order_count | total |
|---------|-------------|-------|
| 1 | 2 | 370000 |
| 2 | 2 | 1200000 |
| 3 | 2 | 530000 |

### HAVING: filter the groups

`WHERE` filters **rows before** grouping; `HAVING` filters **groups after** grouping, so it can use the totals. Adding `HAVING SUM(amount) > 500000` to the query above keeps only users 2 and 3; user 1's pile (370000) is dropped.

You can use both in one query: `WHERE status = 'paid'` first throws away cancelled and pending orders, then `GROUP BY` and `HAVING` work on what is left.

---

## 11. SQL for BAs – Building Reports

Most BAs don't write update/delete statements; the most valuable skill is **reading and writing report queries** so you can pull numbers yourself instead of waiting on a developer.

### Readable column names with `AS`
```sql
SELECT
  user_id      AS "Customer ID",
  COUNT(*)     AS "Orders",
  SUM(amount)  AS "Total spend"
FROM orders
GROUP BY user_id;
```

`AS` gives a result column a friendly name (an **alias**), so the output can be pasted straight into a slide or an email.

### Count unique values with `DISTINCT`
```sql
-- How many customers have ever placed an order?
SELECT COUNT(DISTINCT user_id) AS customers
FROM orders;
```

On our data the answer is **3**: the orders table has six rows, but only three different user_ids (1, 2, 3). `COUNT(*)` would wrongly say 6.

### A few handy report "recipes"

```sql
-- 1) Revenue by month
SELECT
  strftime('%Y-%m', created_at) AS month,
  SUM(amount)                   AS revenue
FROM orders
GROUP BY month
ORDER BY month;

-- 2) Order count by status
SELECT status, COUNT(*) AS orders
FROM orders
GROUP BY status;

-- 3) Top 5 highest-spending customers
SELECT user_id, SUM(amount) AS total
FROM orders
GROUP BY user_id
ORDER BY total DESC
LIMIT 5;
```

Results on our data: recipe 1 gives 2026-08 → 1150000 and 2026-09 → 950000; recipe 2 gives paid 4, cancelled 1, pending 1. `strftime` is the SQLite way to cut a date down to year-month; MySQL uses `DATE_FORMAT` and PostgreSQL `to_char` for the same job.

> **Common misconception:** the revenue above includes the cancelled 900000 order. A real revenue report needs `WHERE status = 'paid'`. Always ask "which rows should count?" before trusting a number.

### Reading an existing query
Read it in business order: **FROM** (which table) → **JOIN** (which tables to link) → **WHERE** (what to filter) → **GROUP BY** (what to group by) → **SELECT** (which columns to show) → **ORDER BY / LIMIT** (sort, limit). Follow this flow and you can understand most reports.

> 💡 A BA should request **read-only** access on the reporting environment to run SELECTs safely, with no risk of accidentally modifying or deleting real data.

---

## 12. Practice in the App: SQL Practice

Reading SQL is good; typing it is better. This app has a built-in playground: open **SQL Practice** in the sidebar (address `/practice/sql`). Type a query, press **▶ Run** (or Ctrl+Enter; Cmd+Enter on a Mac), and the result table appears below. The side panel shows each table's columns.

The playground uses an English word bank (SQLite) with three tables:

- `words`: id, word, pronunciation, pos_code, meaning_en, meaning_vi, first_letter, length
- `parts_of_speech`: id, code, name_en, name_vi (for example `n` → noun)
- `word_reviews`: id, word_id, reviewed_on, remembered (1 = remembered, 0 = missed)

Each query runs on a **fresh copy** of the data, so you cannot break anything: even `DELETE FROM words;` only affects that one run, and the next query sees all the words again. Run one statement at a time.

> **Try it yourself:** paste these three queries one at a time.
>
> 1. Filter with `LIKE` (expect two rows: *data* and *database*):
>    `SELECT word, meaning_vi FROM words WHERE word LIKE 'data%';`
> 2. JOIN + GROUP BY (expect one row per part of speech, with *noun* on top by a wide margin):
>    `SELECT p.name_en, COUNT(*) AS total FROM words w JOIN parts_of_speech p ON w.pos_code = p.code GROUP BY p.name_en ORDER BY total DESC;`
> 3. Study history (expect five words with their review count and how many times they were remembered):
>    `SELECT w.word, COUNT(*) AS reviews, SUM(r.remembered) AS remembered FROM word_reviews r JOIN words w ON r.word_id = w.id GROUP BY w.word ORDER BY reviews DESC LIMIT 5;`

In queries 2 and 3, `words w` gives the table a short nickname (`w`) so you can write `w.word` instead of `words.word`.

Then experiment: change `'data%'` to `'%tion'`, swap `DESC` for `ASC`, or add `WHERE w.length > 10`.

---

## 13. Summary

- **SELECT**: read data.
- **WHERE**: filter by condition.
- **ORDER BY / LIMIT**: sort the result and cap the number of rows.
- **INSERT/UPDATE/DELETE**: manipulate data — always be careful with an UPDATE/DELETE that is missing a WHERE!
- **JOIN**: combine multiple tables.
- **GROUP BY + Aggregate**: statistics and reporting.
- **BA**: use `AS`, `DISTINCT`, and `GROUP BY` to write your own reports; request **read-only** access to run them safely.
- Practise in the app's **SQL Practice** page (`/practice/sql`) — every run uses a fresh copy, so nothing can break.

### Key terms

| Term | Plain-language meaning |
|------|------------------------|
| SQL | The language for asking a relational database questions and changing its data |
| Query / statement | One SQL instruction, usually ending with `;` |
| Keyword | A word that belongs to SQL itself: SELECT, FROM, WHERE… |
| `*` | "All columns" |
| WHERE | Keep only rows that match a condition |
| ORDER BY ASC / DESC | Sort A→Z / Z→A (or smallest / largest first) |
| NULL / IS NULL | "No value"; checked with IS NULL, never `= NULL` |
| JOIN … ON | Match rows of two tables by a shared value |
| INNER / LEFT JOIN | Matches only / everything from the left table plus matches |
| Aggregate function | COUNT, SUM, AVG, MAX, MIN: many rows → one number |
| GROUP BY / HAVING | Make one result per group / filter the groups |
| Alias (AS) | A friendly name for a column or table in the result |
| Read-only access | Permission to run SELECT but not change data |
