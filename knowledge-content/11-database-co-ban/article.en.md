# What Is a Database?

## 1. What Is a Database?

Almost every app you use keeps a memory. Your bank remembers your balance, Shopee remembers your past orders, Zalo remembers your contacts. That memory lives in a **database**.

A **database** is an organized system for storing and managing data, allowing data to be queried, updated, and deleted efficiently.

- **Query** means "ask a question of the data", for example "show me every order from last week".
- **Update** means change something that is already stored, for example a new phone number.
- **Delete** means remove it.

### Start from something you already know: Excel

You have probably used an Excel or Google Sheets spreadsheet. Imagine a small shop that tracks its customers in one sheet:

| A: Name | B: Phone | C: City |
|---------|----------|---------|
| Nguyễn An | 0901 111 222 | Hanoi |
| Trần Bình | 0902 333 444 | HCM |

A database table looks very much like this sheet: named columns across the top, one item per row. If you understand a spreadsheet, you already understand half of a database.

### So why not just use Excel?

A spreadsheet works fine for one person and a few thousand rows. It starts to break when a real app uses it:

| Problem | Spreadsheet | Database |
|---------|-------------|----------|
| Many people editing at the same time | Edits clash or overwrite each other | Handles thousands of users at once safely |
| Millions of rows | Becomes slow or will not open | Built for millions or billions of rows |
| Wrong data typed in ("abc" in an Age cell) | Usually accepted | Rejected by rules you define |
| A crash in the middle of saving | File can be corrupted | Designed to recover to a correct state |
| Who may see or change what | Whole file is shared | Fine-grained permissions per user and table |

Without a database → data is stored in files → hard to search and impossible to guarantee consistency.

**Consistency** here means the data never contradicts itself, for example an order that points at a customer who does not exist.

### Database vs DBMS

Strictly speaking, the **database** is the stored data itself, and the **DBMS** (Database Management System) is the software that stores it, answers questions, and enforces the rules. MySQL, PostgreSQL and SQL Server are DBMSs. In everyday conversation people say "the database" for both, and that is fine.

> **Analogy:** the database is the warehouse full of shelves; the DBMS is the warehouse staff who put things away, find them for you, and refuse to accept a box with no label.

---

## 2. RDBMS – Relational Database

The most common kind of database is the relational one.

An **RDBMS** (Relational Database Management System) organizes data into structured **tables**.

"Relational" comes from the idea that tables can be **related** (linked) to each other, which you will see in the next section. A typical app has many tables: one for users, one for orders, one for products, and so on. Think of them as the sheets (tabs) inside one workbook, except the database knows how the sheets connect.

### Table

Here is a `users` table:

| id | name | email | age |
|----|------|-------|-----|
| 1 | Nguyễn A | a@mail.com | 25 |
| 2 | Trần B | b@mail.com | 30 |
| 3 | Lê C | c@mail.com | 28 |

- **Column/Field**: an attribute — id, name, email, age.
- **Row/Record**: a single record — one user.
- **Schema**: the structure of the table (column names, data types).

The big difference from a spreadsheet is the **schema**. Before any data goes in, someone (usually a developer) declares exactly which columns exist and what type of value each one holds. The database then **enforces** it: you cannot put text into the `age` column or leave out a required value.

> **Common misconception:** "The database is just a big Excel file." It looks similar on screen, but a spreadsheet lets you type anything anywhere; a database checks every value against the schema and refuses data that breaks the rules.

### Common data types

Every column has a **data type**, which says what kind of value is allowed.

| Type | Used for |
|------|---------|
| INTEGER / BIGINT | Whole numbers, IDs |
| VARCHAR(n) | Strings with a limited length |
| TEXT | Long strings |
| DECIMAL(p,s) | Real numbers (currency) |
| BOOLEAN | True/false |
| DATE / TIMESTAMP | Dates and times |
| JSON / JSONB | JSON data |

A few notes for beginners:

- A **string** is just text: a name, an email, an address. `VARCHAR(100)` means "text, at most 100 characters".
- Money should use **DECIMAL** (also called NUMERIC), not a "floating-point" number type, because floating-point numbers can produce tiny rounding errors like 0.1 + 0.2 = 0.30000000000000004. Nobody wants that on an invoice.
- A **TIMESTAMP** holds date and time together. You will often see columns such as `created_at` (when the row was created) and `updated_at` (when it was last changed).

### NULL – "no value yet"

A cell can also be **NULL**, meaning "unknown / not entered". NULL is not zero and not an empty string: a customer with phone = NULL simply has not given a phone number. The schema can mark a column as `NOT NULL` to make it required.

---

## 3. Primary Key & Foreign Key

### Primary Key

**Analogy:** in Vietnam, two people can share the name "Nguyễn Văn An", but they never share a citizen ID number. The ID number is what tells them apart.

A **primary key** plays the same role for rows.

A **unique** value that identifies each record in a table. It is usually the `id` column.

- Cannot be null.
- Cannot be duplicated.
- Each table has one primary key.

Most tables use an **auto-increment** id: the database hands out 1, 2, 3… automatically, so nobody has to invent one. Even if a customer changes their name, email and phone, their id stays the same, so everything linked to them stays linked.

> **Common misconception:** "Email is unique, so let's use it as the primary key." Emails change, and a primary key should never change. Use a separate id and mark email as unique instead.

### Foreign Key

A column that references the Primary Key of another table — creating a relationship between tables.

```text
Table users:   id, name, email
Table orders:  id, user_id (FK → users.id), product, amount
```

`orders.user_id` is a foreign key pointing to `users.id` → this tells us which user an order belongs to.

Instead of copying the customer's name and email into every order, the order stores just the customer's id. To see the name, the database follows the link:

```text
orders (id, user_id, amount)          users (id, name)
  10, user_id 1, 200000   ───────►      1, Nguyễn A
  11, user_id 1,  50000   ───────►      1, Nguyễn A
  12, user_id 2, 300000   ───────►      2, Trần B
```

Why this matters:

- **No duplication:** the name is stored once. If Nguyễn A changes her email, you fix one row, not hundreds of orders.
- **Referential integrity:** the database refuses an order with `user_id = 99` if user 99 does not exist. This prevents "orphan" orders that belong to nobody.

> **At work:** a tester tries to delete a customer who still has orders and gets an error like `violates foreign key constraint`. That is not a bug; it is the database protecting the links between tables.

---

## 4. Relationships Between Tables

Foreign keys let us describe how real-world things relate to each other. There are three patterns.

| Relationship | Meaning | Example |
|---------|---------|-------|
| **One-to-Many** | 1 record → many other records | 1 user has many orders |
| **Many-to-Many** | Many ↔ many (needs a junction table) | Many students - many courses |
| **One-to-One** | 1 record ↔ 1 record | 1 user - 1 profile |

### One-to-Many (the most common)

**Analogy:** one mother can have several children, but each child has exactly one (biological) mother.

One user places many orders; each order belongs to one user. The foreign key always goes on the "many" side: `orders.user_id`. Read from the orders side, the same relationship is **Many-to-One** (many orders → one user).

### Many-to-Many

**Analogy:** a student signs up for several courses, and each course has many students. You cannot fit "all my courses" into one cell of the students table, and you cannot fit "all my students" into one cell of the courses table.

The fix is a third table in the middle, called a **junction table** (also "join table" or "bridge table"):

```text
students            enrollments                courses
+----+------+       +------------+-----------+  +----+---------+
| id | name |       | student_id | course_id |  | id | title   |
+----+------+       +------------+-----------+  +----+---------+
|  1 | An   |       |     1      |    10     |  | 10 | SQL     |
|  2 | Bình |       |     1      |    11     |  | 11 | Excel   |
+----+------+       |     2      |    10     |  +----+---------+
                    +------------+-----------+
```

Each row of `enrollments` says "this student is in this course". An is in SQL and Excel; Bình is in SQL.

### One-to-One

One user has exactly one profile (avatar, bio, address). This is less common; often the extra columns could simply live in the same table, and they are split out only for tidiness or security.

---

## 5. Index

An **index** speeds up searching — like a book's table of contents.

**Analogy:** to find "foreign key" in a 600-page textbook, you can flip through every page, or you can open the index at the back, look under F, and jump straight to page 214. A database index is that index at the back of the book, built for one column.

Without an index: finding the user with email="a@mail.com" → scans the entire table (O(n)).
With an index on the email column: finds it directly (O(log n)).

In plain words: **O(n)** means "the work grows with the number of rows": a table 10 times bigger takes about 10 times longer. **O(log n)** means the work barely grows: going from 1 million rows to 1 billion rows only adds a few extra steps, because the index is kept sorted and the database can keep cutting the search in half.

**Trade-off**: an index speeds up reads but slows down writes (the index must be updated on every insert/update).

An index also takes extra storage space. So you do not index every column; you index the columns people often search, filter or join by (email, user_id, created_at…). The primary key is indexed automatically.

> **At work:** "The monthly report takes three minutes to load." A developer checks the query, finds it filters on a column with no index, adds one, and the report loads in under a second. As a BA or tester you will not create indexes yourself, but knowing the word helps you understand the fix.

---

## 6. SQL vs NoSQL

Relational databases are the classic choice, but not the only one. Databases are roughly split into two families.

### SQL (Relational)

Tables have a fixed structure, clear relationships, and use SQL.
- MySQL, PostgreSQL, SQLite, SQL Server, Oracle.
- Best for: data with complex relationships that requires high consistency (finance, ERP).

**SQL** (Structured Query Language) is the language used to ask relational databases questions; it has its own lesson next. **ERP** means the software that runs a company's core operations: accounting, inventory, purchasing, HR.

### NoSQL

More flexible, with no fixed schema required.

"NoSQL" originally meant "not SQL" and is now usually read as "not only SQL". It is a family name for several different designs:

| Type | Example | Best for |
|------|-------|---------|
| Document | MongoDB | JSON-like, flexible schema |
| Key-Value | Redis | Cache, session |
| Column | Cassandra | Big data, time series |
| Graph | Neo4j | Social networks, complex relationships |

- **Document:** each record is a self-contained "document" (like a JSON file). Two products can have different fields: a shirt has sizes, a laptop has a CPU.
- **Key-Value:** like a giant coat-check: you hand over a key (ticket number) and get back exactly one value. Extremely fast; Redis keeps data in memory, so it is often used as a **cache** (a quick copy of data you read often) or to store login **sessions**.
- **Column (wide-column):** spreads huge amounts of data across many servers; good for logs, sensor readings and other **time series** (values recorded over time).
- **Graph:** stores things and the connections between them, ideal for "friends of friends" questions.

### How to choose

Lean towards **SQL** when the data shape is stable, records are tightly related, and numbers such as money or stock must always add up exactly. Lean towards **NoSQL** when the data shape varies a lot, the volume is enormous, and you do not need complex transactions across many tables.

NoSQL databases are usually designed to **scale horizontally**: add more servers to handle more data, instead of buying one bigger server. Many real systems use both: PostgreSQL for orders and payments, Redis as a cache in front of it.

> **Common misconception:** "NoSQL is newer, so it is better." It is a trade-off, not an upgrade. For most business apps a relational database is still the safe default.

---

## 7. ACID – Key Properties

A **transaction** is a group of changes that must be treated as one unit of work. The classic example is a bank transfer: "take money from A" and "give money to B" are two changes, but they only make sense together.

**ACID** is a set of properties that guarantee data integrity:

- **A**tomicity: a transaction either completes entirely or does nothing at all.
- **C**onsistency: the database is always in a valid state.
- **I**solation: transactions run independently of one another.
- **D**urability: committed data is not lost even if a failure occurs.

**Bank transfer example**: deducting 1 million from A and adding it to B must happen together — if step 2 fails, step 1 must be rolled back.

### Step by step: a transfer of 1,000,000 VND

1. **Begin** the transaction.
2. Subtract 1,000,000 from account A.
3. Add 1,000,000 to account B.
4. **Commit**: save both changes permanently.

If the server crashes after step 2 but before step 4, the database performs a **rollback**: it undoes step 2, so A gets the money back. Money never disappears and never appears from nowhere.

### Each letter in plain words

| Property | Plain meaning | In the transfer |
|----------|---------------|-----------------|
| Atomicity | All or nothing | Both steps happen, or neither |
| Consistency | Rules are never broken | A balance cannot go below zero if a rule forbids it |
| Isolation | Simultaneous transactions don't trip over each other | Two transfers from A at the same moment cannot both spend the same money |
| Durability | Once saved, it stays saved | After "Transfer successful", a power cut cannot undo it |

"Atomic" comes from the old idea of the atom as something that cannot be split: the transaction cannot be split into a half-done state.

---

## 8. Putting It Together: A Small Shop's Database

Let's design the database for a small online shop that sells coffee and tea. This is the kind of diagram a BA might see in a design meeting.

### Step 1: list the "things"

The shop needs to remember **customers**, **products**, and **orders**. Each becomes a table.

### Step 2: the tables

```text
customers                 products
+----+-----------+-------+ +----+---------------+--------+
| id | name      | city  | | id | name          | price  |
+----+-----------+-------+ +----+---------------+--------+
|  1 | Nguyễn An | Hanoi | |  1 | Arabica 500g  | 180000 |
|  2 | Trần Bình | HCM   | |  2 | Green tea box |  95000 |
|  3 | Lê Chi    | Hanoi | |  3 | Paper filter  |  40000 |
+----+-----------+-------+ +----+---------------+--------+

orders                              order_items
+-----+-------------+------------+  +----------+------------+----------+
| id  | customer_id | order_date |  | order_id | product_id | quantity |
+-----+-------------+------------+  +----------+------------+----------+
| 101 |      1      | 2026-09-01 |  |   101    |     1      |    2     |
| 102 |      2      | 2026-09-03 |  |   101    |     3      |    1     |
| 103 |      1      | 2026-09-05 |  |   102    |     2      |    3     |
+-----+-------------+------------+  |   103    |     2      |    1     |
                                    +----------+------------+----------+
```

### Step 3: the keys and relationships

- Every table has `id` as its **primary key** (`order_items` uses the pair order_id + product_id).
- `orders.customer_id` is a **foreign key** to `customers.id`: **one-to-many** (one customer, many orders).
- An order can contain many products, and a product appears in many orders: **many-to-many**, so `order_items` is the **junction table**.

### Step 4: answer a question by following the links

"What did Nguyễn An buy?"

1. In `customers`, Nguyễn An has id **1**.
2. In `orders`, customer_id 1 appears in orders **101** and **103**.
3. In `order_items`, order 101 holds product 1 (×2) and product 3 (×1); order 103 holds product 2 (×1).
4. In `products`: 2 × Arabica 500g, 1 × Paper filter, 1 × Green tea box.

Notice that Lê Chi has no orders: she exists in `customers`, but no row in `orders` points at her. That is perfectly valid.

In the next lesson, SQL will do these four steps for you with a single query.

> **Try it yourself:** open Excel or Google Sheets and make four tabs named customers, products, orders and order_items with the data above. Then answer "What did Trần Bình buy?" by hand, following the ids from tab to tab. You are doing exactly what a database does when it joins tables.

---

## 9. Summary

- **Database** = an organized storage system.
- A **DBMS** is the software that manages it; a spreadsheet is fine for one person, a database for real apps.
- **Table** = a data table (columns + rows); the **schema** defines columns and data types, and the database enforces it.
- **Primary Key** = a unique identifier.
- **Foreign Key** = creates relationships between tables.
- Relationships: **one-to-many** (FK on the "many" side), **many-to-many** (junction table), **one-to-one**.
- **Index** = speeds up searching, at the cost of slower writes and extra space.
- **SQL** = relational data; **NoSQL** = flexible and scales well.
- **ACID** = guarantees data integrity.

### Key terms

| Term | Plain-language meaning |
|------|------------------------|
| Database | Organized, long-term memory for an app |
| DBMS / RDBMS | The software that runs the database (MySQL, PostgreSQL…) |
| Table / Row / Column | A sheet / one item / one attribute |
| Schema | The blueprint: which columns exist and what type each holds |
| NULL | "No value yet", not zero and not empty text |
| Primary key | The unique ID of each row, like a citizen ID number |
| Foreign key | A column that points at another table's primary key |
| Junction table | The middle table that links two tables in a many-to-many relationship |
| Index | A sorted lookup that finds rows fast, like a book's index |
| NoSQL | Non-relational databases: document, key-value, column, graph |
| Transaction | A group of changes that succeed or fail together |
| ACID | Atomicity, Consistency, Isolation, Durability |
