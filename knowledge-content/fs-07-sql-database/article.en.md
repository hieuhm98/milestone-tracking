# The App's Database: SQL with SQLite, MySQL & PostgreSQL

## 1. Where the data lives, and why a database

You already know the theory from the topics *What Is a Database?* and *SQL Basics*: tables, rows, keys, `SELECT`, `JOIN`. This topic opens the real database of the To-do app ([todo-auth-app.zip](/downloads/todo-auth-app.zip)) and shows how the backend talks to it.

Every user and every to-do lives in **one file**: `server/todo.db`. The file does not exist when you download the project; `src/db.js` creates it the first time the server starts.

```text
 Browser (React)        Express server (Node.js)          todo.db (SQLite)
 ───────────────        ────────────────────────          ────────────────
 fetch('/api/todos') ─► routes/todos.js
                          db.prepare('SELECT …').all() ─► users, todos tables
                        ◄─ rows ─────────────────────────
 ◄─ JSON { todos } ───
```

Why not something simpler? Three tempting alternatives, and why each fails:

| Option | What goes wrong |
| --- | --- |
| A JavaScript array in the server's memory | Gone on every restart. `npm run dev` restarts the server **each time you save a file**. |
| A `todos.json` file | Two requests writing at the same moment overwrite each other (a lost update). Nothing stops a to-do with no title, or one that points to a user who does not exist. |
| The browser's `localStorage` | Lives in one browser on one device. Your phone would not see what you added on your laptop, and the user can edit or wipe it. |

A database gives four guarantees at once: data survives restarts, it is shared by every device that calls the API, it handles concurrent writes safely, and it enforces constraints (rules such as "email must be unique") even when the code has a bug. That is why the app keeps only two harmless UI preferences in `localStorage` (`todo:lastEmail`, `todo:filter`) and everything that matters in `todo.db`.

**So what for a BA?** When a story says "the user sees their to-dos on any device", that sentence is a requirement for server-side storage. You now know where it lives.

## 2. SQLite, MySQL, PostgreSQL: which one and why

All three are relational databases that speak SQL. The big difference is *how they run*.

| | SQLite | MySQL | PostgreSQL ("Postgres") |
| --- | --- | --- | --- |
| Runs as | A library inside your app + **one file** | A separate server process (port 3306) | A separate server process (port 5432) |
| Setup effort | None: `npm install` and go | Install or Docker, create a user and a password | Same as MySQL |
| Typical use | Mobile and desktop apps, prototypes, tests, small sites | Classic web apps, CMSs such as WordPress | Modern web apps, complex queries, JSON and geo data |
| Concurrency | Many readers, **one writer at a time** | Many concurrent writers | Many concurrent writers |
| Cost | Free (public domain) | Free Community edition (owned by Oracle), paid support | Free and open source |
| Who uses it | Every Android and iPhone, web browsers | WordPress, Wikipedia, GitHub | Instagram, Reddit, many startups |

Cloud providers sell MySQL and Postgres as managed services (for example AWS RDS and Aurora), so nobody on the team has to patch the database server.

The course uses SQLite because it has zero setup: no server to install, no password, and the whole database is one file you can open, copy or delete. Production apps with many users usually pick **Postgres or MySQL**, because many servers can share one database and many users can write at the same time. The good news: the SQL you learn here is 90% the same everywhere (section 7 shows the differences).

**So what for a BA?** "Which database?" is a developer decision, but it has business effects: licence cost, hosting cost, and who can run reports on it.

## 3. Reading db/schema.sql

The whole database is described by one file, `server/db/schema.sql`. `db.js` runs it on every start; `IF NOT EXISTS` makes that safe.

```sql
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS todos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT    NOT NULL,
  done       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
```

Line by line:

- `PRIMARY KEY AUTOINCREMENT`: the database hands out `id` 1, 2, 3… and never reuses a number, even after a delete.
- `NOT NULL`: the column must have a value. A to-do without a title is refused.
- `UNIQUE` on `email`: two accounts can never share an email. SQLite builds an index for it automatically, so login lookups are fast.
- `DEFAULT CURRENT_TIMESTAMP`: if the `INSERT` does not give `created_at`, the database fills in the current time, in **UTC** (7 hours behind Vietnam).
- `REFERENCES users(id)`: a **foreign key**. Every to-do must belong to a user who exists.
- `ON DELETE CASCADE`: when a user row is deleted, all their to-dos are deleted with it.
- `CREATE INDEX … ON todos(user_id)`: every to-do query filters by `user_id`, so the index lets the database jump to one user's rows instead of scanning the whole table.

```text
 ┌────────────────────┐         ┌──────────────────────────┐
 │ users              │         │ todos                    │
 ├────────────────────┤         ├──────────────────────────┤
 │ id  PK             │ 1 ─── n │ id       PK              │
 │ name               │         │ user_id  FK → users.id   │
 │ email  UNIQUE      │         │ title                    │
 │ password_hash      │         │ done     0 / 1           │
 │ created_at         │         │ created_at               │
 └────────────────────┘         └──────────────────────────┘
      One user has many to-dos; each to-do has exactly one user.
```

Two SQLite quirks you will meet:

- SQLite has no real boolean type, so `done` is stored as `0` or `1`. The route turns it back into `true`/`false` before sending JSON: `done: row.done === 1` in the `toJson` helper.
- SQLite ignores foreign keys unless they are switched on, which is why `db.js` runs `db.pragma('foreign_keys = ON')`.

The constraints are not decoration. We tried to break them directly against the database, and each attempt was refused:

```text
INSERT a second user with lan@example.com  → UNIQUE constraint failed: users.email
INSERT a to-do for user_id 99 (no such user) → FOREIGN KEY constraint failed
INSERT a to-do without a title             → NOT NULL constraint failed: todos.title
```

**So what for a BA?** Each constraint is a business rule written in SQL. "Email must be unique" in your requirements becomes `UNIQUE`; "a to-do always has an owner" becomes `NOT NULL REFERENCES users(id)`.

## 4. The SQL behind every API endpoint

The backend uses the `better-sqlite3` package. Its pattern is always `db.prepare(sql)` followed by one of three methods: **`.get()`** returns one row (or `undefined`), **`.all()`** returns an array of rows, **`.run()`** performs a write and reports `changes` (rows affected) and `lastInsertRowid` (the new id).

| Endpoint | SQL the server runs |
| --- | --- |
| `POST /api/auth/signup` | `SELECT id FROM users WHERE email = ?` (409 if found), then `INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)` |
| `POST /api/auth/login` | `SELECT * FROM users WHERE email = ?` |
| `POST /api/auth/logout` | none: it only clears the cookie |
| `GET /api/auth/me` | `SELECT * FROM users WHERE id = ?` |
| `GET /api/todos` | `SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC, id DESC` |
| `POST /api/todos` | `INSERT INTO todos (user_id, title) VALUES (?, ?)`, then reads the new row back |
| `PATCH /api/todos/:id` | `SELECT * FROM todos WHERE id = ? AND user_id = ?` (404 if none), then `UPDATE todos SET title = ?, done = ? WHERE id = ?` |
| `DELETE /api/todos/:id` | `DELETE FROM todos WHERE id = ? AND user_id = ?` (404 if `changes` is 0) |
| `npm run db:reset` | `DELETE FROM todos; DELETE FROM users;` |

Details worth noticing:

- `ORDER BY created_at DESC, id DESC`: `created_at` only has whole seconds, so two to-dos added in the same second are ordered by `id` as a tie-breaker.
- Signup never inserts `created_at` or `id`; the defaults fill them in.

**Ownership lives in SQL.** The `user_id` comes from the login cookie (`req.userId`), never from the request body. Every to-do query adds `AND user_id = ?`:

```js
const findOwnTodo = (id, userId) =>
  db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?').get(id, userId);
```

So if Minh (user 2) sends `DELETE /api/todos/1` for Lan's to-do, the `WHERE` matches zero rows and he gets **404 `To-do not found.`**, not 403 (the rule you met in fs-06). The server log confirms it: `DELETE /api/todos/1 → 404`. The API does not even admit that to-do 1 exists. The `UPDATE` in PATCH only filters by `id`, which is safe because `findOwnTodo` has already checked the owner.

## 5. Parameterized queries vs SQL injection

Look at every query above: the values are never glued into the SQL text. They are `?` placeholders, and the values travel separately:

```js
// Safe: the value is sent separately and can never become SQL
db.prepare('SELECT * FROM users WHERE email = ?').get(email);

// Dangerous: never do this
db.prepare("SELECT * FROM users WHERE email = '" + email + "'").get();
```

Why the second line is dangerous: suppose an attacker types this into the email box:

```text
' OR '1'='1
```

String concatenation produces this SQL:

```sql
SELECT * FROM users WHERE email = '' OR '1'='1'
```

`'1'='1'` is always true, so the `WHERE` matches **every** row. We ran both versions against a copy of the database: the concatenated query returned all three users (`lan@`, `minh@`, `hoa@example.com`); the `?` version returned an empty list, because it searched for a user whose email is literally `' OR '1'='1`. Sending the same text to the real login endpoint gives `401 Email or password is incorrect.`

This attack is SQL injection: user input changes the meaning of the query. In a badly written app it can log someone in without a password, dump the users table, or delete data. The sample is safe because **every** query uses placeholders.

**So what for a BA?** Add an input like `' OR '1'='1` to your negative test cases for search boxes and login forms. The expected result is "treated as plain text", never "shows more data".

## 6. Look inside todo.db yourself

Start the app, create two or three accounts and add some to-dos. Then open the database.

**Option A: DB Browser for SQLite** (free GUI, Windows/macOS/Linux).

1. Install it from sqlitebrowser.org, or `winget install DBBrowserForSQLite.DBBrowserForSQLite` on Windows (`brew install --cask db-browser-for-sqlite` on macOS).
2. **Open Database** → choose `server/todo.db`. Use Open Database Read Only while the server runs, so you do not lock the file.
3. **Browse Data** shows the rows; **Execute SQL** runs any query you type.

**Option B: the `sqlite3` command line.** It is preinstalled on macOS; on Windows `winget install SQLite.SQLite`. Run `sqlite3 todo.db`, then `.tables`, `.mode box`, any SQL, and `.quit`.

**Option C: no install at all.** `better-sqlite3` is already in `node_modules`, so save this helper as `server/peek.mjs` (your own file, not part of the sample):

```js
// peek.mjs: your own helper, not part of the sample. Usage: node peek.mjs "SELECT ..."
import Database from 'better-sqlite3';

const db = new Database('todo.db', { readonly: true });

console.table(db.prepare(process.argv[2]).all());
```

Practice queries (the outputs come from a test run with three users: Lan, Minh and Hoa):

```powershell
node peek.mjs "SELECT id, name, email, created_at FROM users ORDER BY created_at DESC"
```

```text
┌─────────┬────┬────────┬────────────────────┬───────────────────────┐
│ (index) │ id │ name   │ email              │ created_at            │
├─────────┼────┼────────┼────────────────────┼───────────────────────┤
│ 0       │ 3  │ 'Hoa'  │ 'hoa@example.com'  │ '2026-09-21 15:16:59' │
│ 1       │ 2  │ 'Minh' │ 'minh@example.com' │ '2026-09-21 15:16:55' │
│ 2       │ 1  │ 'Lan'  │ 'lan@example.com'  │ '2026-09-21 15:16:51' │
└─────────┴────┴────────┴────────────────────┴───────────────────────┘
```

Count to-dos per user. `LEFT JOIN` keeps Hoa, who has none; a plain `JOIN` would drop her:

```powershell
node peek.mjs "SELECT u.name, COUNT(t.id) AS todos, COALESCE(SUM(t.done), 0) AS done FROM users u LEFT JOIN todos t ON t.user_id = u.id GROUP BY u.id ORDER BY todos DESC"
```

```text
┌─────────┬────────┬───────┬──────┐
│ (index) │ name   │ todos │ done │
├─────────┼────────┼───────┼──────┤
│ 0       │ 'Lan'  │ 3     │ 1    │
│ 1       │ 'Minh' │ 2     │ 1    │
│ 2       │ 'Hoa'  │ 0     │ 0    │
└─────────┴────────┴───────┴──────┘
```

Find finished to-dos and their owners:

```powershell
node peek.mjs "SELECT t.id, t.title, u.name AS owner FROM todos t JOIN users u ON u.id = t.user_id WHERE t.done = 1"
```

```text
┌─────────┬────┬──────────────────────┬────────┐
│ (index) │ id │ title                │ owner  │
├─────────┼────┼──────────────────────┼────────┤
│ 0       │ 1  │ 'Write user stories' │ 'Lan'  │
│ 1       │ 3  │ 'Buy milk'           │ 'Minh' │
└─────────┴────┴──────────────────────┴────────┘
```

Now look at the passwords: `SELECT email, password_hash FROM users`. You will see values like `$2b$10$cMOO8.fgOWJXMXZ4redm7u4xtq79Gd.K5odN0rYjoSC5p1xg9o4Vq`: `$2b$` means bcrypt, `10` is the cost factor, and the rest is salt plus hash. **The password itself is not stored anywhere**, so even you, holding the file, cannot read it.

Finally, test the cascade on a **copy** of the file: delete Minh with `DELETE FROM users WHERE email = 'minh@example.com'` and count the to-dos. In our run the count went from 5 to 3; Minh's two to-dos vanished with him. In the `sqlite3` CLI, run `PRAGMA foreign_keys = ON;` first, or the cascade will not fire.

## 7. Switching to PostgreSQL or MySQL

You do not need to install either: Docker runs a throwaway database server with one command.

```bash
# PostgreSQL 17 on port 5432 (use -p 5433:5432 if a local Postgres already uses 5432)
docker run --name todo-pg -e POSTGRES_PASSWORD=devpass -e POSTGRES_DB=todo -p 5432:5432 -d postgres:17

# MySQL 8.4 on port 3306
docker run --name todo-mysql -e MYSQL_ROOT_PASSWORD=devpass -e MYSQL_DATABASE=todo -p 3306:3306 -d mysql:8.4

# Open an SQL prompt inside each container
docker exec -it todo-pg psql -U postgres -d todo
docker exec -it todo-mysql mysql -uroot -pdevpass todo
```

The same commands work in PowerShell. Stop and remove with `docker rm -f todo-pg todo-mysql`.

The schema needs small changes:

| Idea | SQLite (sample) | PostgreSQL | MySQL |
| --- | --- | --- | --- |
| Auto-numbered id | `INTEGER PRIMARY KEY AUTOINCREMENT` | `INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY` (older: `SERIAL`) | `INT AUTO_INCREMENT PRIMARY KEY` |
| True/false | `INTEGER` 0/1 | `BOOLEAN` (`true`/`false`) | `BOOLEAN` (stored as `TINYINT(1)`, 0/1) |
| Date and time | `TEXT` with `CURRENT_TIMESTAMP` | `TIMESTAMPTZ DEFAULT now()` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| Unique text | `TEXT UNIQUE` | `TEXT UNIQUE` | `VARCHAR(255) UNIQUE` (TEXT cannot be UNIQUE) |
| Foreign key | inline `REFERENCES` | inline `REFERENCES` | a separate `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE` line |

Then `db.js` changes. The big difference: Postgres and MySQL are separate servers reached over the network, so every query is asynchronous and the route handlers become `async`. The two versions below are illustrative only, not in the sample:

```js
// db.js with PostgreSQL (illustrative, NOT in the sample): npm install pg
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export default pool;

// In routes/todos.js: placeholders are $1, $2… and every call is awaited
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM todos WHERE user_id = $1 ORDER BY created_at DESC, id DESC',
    [req.userId]
  );

  res.json({ todos: rows.map(toJson) });
});
```

```js
// db.js with MySQL (illustrative, NOT in the sample): npm install mysql2
import mysql from 'mysql2/promise';

const pool = mysql.createPool(process.env.DATABASE_URL);

export default pool;

// In routes/todos.js: placeholders stay ?, results come back as [rows, fields]
const [rows] = await pool.query('SELECT * FROM todos WHERE user_id = ?', [req.userId]);
```

A Pool keeps a few open connections and reuses them, because opening a network connection for every request is slow. `DATABASE_URL` would go in `.env`, for example `postgres://postgres:devpass@localhost:5432/todo`. With Postgres, `done` is a real boolean, so `toJson` would no longer need `=== 1`.

## 8. ORMs, query builders and migrations

The sample writes raw SQL on purpose, so you can see it. Many teams use a library instead. An **ORM** (Object-Relational Mapper) such as **Prisma** or **Sequelize** lets developers write `prisma.todo.findMany({ where: { userId } })` and generates the SQL. A **query builder** such as **Knex** or **Drizzle** stays closer to SQL but builds it with code. All of them use placeholders under the hood and make switching databases easier. When a developer says "it's in the Prisma schema", that file is their version of `schema.sql`.

**Migrations** solve a different problem: the schema changes over time. Suppose v2 adds a due date. `CREATE TABLE IF NOT EXISTS` skips the table because it already exists, so the new column would never appear in anyone's existing `todo.db`. Real projects keep numbered change files instead:

```text
migrations/
  001_create_users_and_todos.sql
  002_add_due_date_to_todos.sql      -- ALTER TABLE todos ADD COLUMN due_date TEXT;
```

A migration tool (Prisma Migrate, Knex, Flyway, Liquibase) records which files each database has already run and applies only the new ones, the same way on a laptop, on staging and in production.

**So what for a BA?** A new field in a story is not "just a field". It is a migration: what value do existing rows get? Is the field required for old to-dos too? Put that in the acceptance criteria.

## 9. BA corner: data requirements and the data dictionary

> **BA corner:** Every column in `schema.sql` answers a requirement question, and every missing rule is a question you should have asked. Write the answers in a **data dictionary** (a table describing each field) before development starts, and test each rule afterwards.

A data dictionary for this app, built by reading the schema **and** the route code:

| Field | Type | Required | Rule | Enforced where |
| --- | --- | --- | --- | --- |
| `users.name` | text | yes | trimmed, not empty; **no maximum length** | route + `NOT NULL` |
| `users.email` | text | yes | valid format, stored lowercase, unique | route + `UNIQUE` |
| `users.password_hash` | text | yes | password ≥ 8 characters, stored only as a bcrypt hash | route |
| `todos.title` | text | yes | trimmed, 1–200 characters | route (`MAX_TITLE`) + `NOT NULL` |
| `todos.done` | 0/1 | yes | defaults to not done | `DEFAULT 0` |
| `todos.user_id` | number | yes | the logged-in user, never taken from the request body | route + foreign key |
| `created_at` (both) | text | auto | set by the database, in UTC | `DEFAULT CURRENT_TIMESTAMP` |

Questions this table raises, which a BA should turn into requirements:

- **Field lengths:** names have no limit. Is a 5,000-character name acceptable? Probably not.
- **Uniqueness:** is `Lan@Example.com` the same account as `lan@example.com`? Here yes, because the route lowercases emails before saving.
- **Deletion:** there is no "delete my account" feature yet. When it arrives, `ON DELETE CASCADE` means the user's to-dos disappear too. That is a business rule, not a technical detail: some products must keep data (invoices, audit logs), others must erase it (privacy laws such as GDPR).
- **Time zones:** timestamps are UTC. Should the screen show local time?

Each answer becomes an acceptance criterion, for example: *Given a user with 3 to-dos, when the account is deleted, then the user and all 3 to-dos are removed.*

## 10. Summary

You opened the real database behind the app and followed the data from API to table. You can now:

- [ ] Explain why the app persists data in a database instead of memory, a JSON file or the browser's local storage.
- [ ] Compare SQLite, MySQL and PostgreSQL, and justify SQLite for learning and Postgres/MySQL for production.
- [ ] Read the schema file and name each constraint: primary key, NOT NULL, UNIQUE, default, foreign key, cascade, index.
- [ ] Map each API endpoint to the SQL it runs, including the ownership filter on the user id.
- [ ] Explain SQL injection and why placeholders prevent it.
- [ ] Inspect the database file with DB Browser or a script, and write JOIN and GROUP BY queries.
- [ ] Describe what changes when migrating to Postgres or MySQL, and what migrations and ORMs are for.
- [ ] Turn a schema into a data dictionary and derive business rules from it.

The habit to keep: whenever a requirement mentions data, ask where it is stored, which rule protects it, and what happens to it when related records are deleted.

Next: **fs-08** opens the authentication code: password hashing, the JWT and the login cookie.
