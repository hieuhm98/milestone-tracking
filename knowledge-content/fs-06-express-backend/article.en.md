# Backend with Express: Routes, Middleware & REST APIs

## 1. The backend's job: the only part you can trust

In the to-do app, the React frontend runs in the user's browser, and the user controls the browser completely. They can open DevTools, edit the page, turn off form validation, or skip the page entirely and send requests with a tool like `curl`. So everything the frontend "checks" is only a convenience for honest users.

The **backend** (the Express server in `server/`) runs on a machine the user cannot touch. That makes it the only place that can be trusted to:

- **Validate** input: a title is required and at most 200 characters, an email looks like an email, a password has at least 8 characters.
- **Enforce ownership**: user A can never read, change or delete user B's to-dos.
- **Talk to the database**: only the server holds the `todo.db` file and the SQL. The browser never sees them.
- **Keep secrets**: the JWT secret and the password hashes stay on the server.

```text
 Browser (untrusted)                  Server (trusted)                  Database
 ┌──────────────────┐   HTTP + JSON   ┌───────────────────────┐   SQL   ┌──────────┐
 │ React form       │ ──────────────► │ Express               │ ──────► │ todo.db  │
 │ "title required" │                 │ validates AGAIN,      │         │ users    │
 │ (nice to have)   │ ◄────────────── │ checks the cookie,    │ ◄────── │ todos    │
 └──────────────────┘   status + JSON │ filters by user_id    │         └──────────┘
                                      └───────────────────────┘
```

**So what for a BA?** Every business rule you write ("a title cannot be empty", "users only see their own items") must be enforced on the backend. A rule that exists only in the UI is a suggestion, not a rule. When you write acceptance criteria, you can ask: "Is this also checked by the API?"

---

## 2. The smallest Express server, then the real one

**Express** is a small Node.js library for building web servers. A complete server fits in five lines:

```js
import express from 'express';

const app = express();
app.get('/hello', (req, res) => res.json({ message: 'Hello from Express' }));
app.listen(3000, () => console.log('Listening on http://localhost:3000'));
```

Run it with `node hello.js`, open `http://localhost:3000/hello`, and you get `{"message":"Hello from Express"}`. Any other URL gets Express's default 404 page.

- `express()` creates the application.
- `app.get(path, handler)` says: "when a **GET** request for this **path** arrives, run this function".
- `app.listen(port)` starts listening for requests on a **port**, a numbered "door" on the machine. One port can be used by only one program at a time, which is why the to-do app uses **4000** for the API and **5173** for the Vite frontend. If you start the server twice, the second one cannot open the door: Node reports an `EADDRINUSE` error ("address already in use"), and the to-do server turns it into the message `Port 4000 is already in use.` and stops.

The real `server/src/index.js` follows the same shape, just with more steps. Here it is, shortened:

```js
const app = express();
const PORT = process.env.PORT ?? 4000;

// Middleware: small functions every request passes through, in order.
app.use(express.json()); // turns a JSON request body into req.body
app.use(cookieParser()); // turns the Cookie header into req.cookies
app.use((req, res, next) => { /* the request logger, see section 5 */ });

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/todos', todoRoutes);

// ... the 404 catch-all and the error handler, see section 5

app.listen(PORT, (err) => {
  // Express 5 reports a failed start here instead of crashing, so check for it.
  if (err?.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the other server (Ctrl + C in its terminal) or set PORT in .env.`);
    process.exit(1);
  }

  if (err) throw err;

  console.log(`API running on http://localhost:${PORT}`);
});
```

`process.env.PORT ?? 4000` means "use the `PORT` from the `.env` file (or the environment) if there is one, otherwise 4000". Start it with `npm run dev` in `server/` and you should see:

```text
API running on http://localhost:4000
```

`npm run dev` uses `node --watch`, so the server restarts by itself every time you save a file.

---

## 3. Routes: method + path → handler

A **route** is one rule: an HTTP **method** plus a **path** mapped to a **handler** function. The handler receives two objects:

- `req` (the **request**): everything the client sent.
- `res` (the **response**): the tools to answer.

The parts of `req` this app uses:

| Property | Comes from | Example |
| --- | --- | --- |
| `req.body` | The JSON body (filled in by `express.json()`) | `{ "title": "Buy milk" }` → `req.body.title` |
| `req.params` | A `:name` placeholder in the path | `/api/todos/5` matched by `/:id` → `req.params.id` is `"5"` |
| `req.cookies` | The `Cookie` header (filled in by `cookieParser()`) | `req.cookies.token` |
| `req.method`, `req.originalUrl` | The request line | `PATCH`, `/api/todos/5` |

And the ways it answers:

| Code | Meaning |
| --- | --- |
| `res.json({ todos })` | Status 200 with a JSON body |
| `res.status(201).json({ todo })` | Set the status code first, then send JSON |
| `res.status(204).end()` | "Done, nothing to send back" (no body) |
| `res.cookie(...)`, `res.clearCookie(...)` | Set or remove a cookie (used by login and logout) |

Here is the real route that creates a to-do, from `server/src/routes/todos.js`:

```js
router.post('/', (req, res) => {
  const title = String(req.body?.title ?? '').trim();

  if (!title) return res.status(400).json({ error: 'Title is required.' });
  if (title.length > MAX_TITLE) return res.status(400).json({ error: `Title must be ${MAX_TITLE} characters or fewer.` });

  const result = db.prepare('INSERT INTO todos (user_id, title) VALUES (?, ?)').run(req.userId, title);
  const todo = findOwnTodo(result.lastInsertRowid, req.userId);

  return res.status(201).json({ todo: toJson(todo) });
});
```

Read it top to bottom: take the title from the body, reject it if empty or too long, insert it, read it back, answer **201 Created**. The `?.` in `req.body?.title` matters: in Express 5, `req.body` is `undefined` when the request has no JSON body, and `?.` avoids a crash. Each handler must send **exactly one** response; `return res.status(400)...` stops the function so it cannot answer twice.

**So what for a BA?** One row of your API spec ("POST /api/todos creates a to-do") is one route in the code. If a requirement has no row in the spec, it has no route, and nobody will build it.

---

## 4. Routers and mounting

Putting every route in `index.js` would get messy. Express lets you group routes in a **Router** (a mini-app) and **mount** it under a prefix:

```js
// server/src/index.js
app.use('/api/auth', authRoutes);
app.use('/api/todos', todoRoutes);
```

Inside `routes/todos.js` the paths are short (`'/'`, `'/:id'`) because the prefix `/api/todos` is added by the mount. The full URL is **prefix + route path**:

| Full URL | Defined in | Line in that file |
| --- | --- | --- |
| `GET /api/health` | `src/index.js` | `app.get('/api/health', ...)` |
| `POST /api/auth/signup` | `src/routes/auth.js` | `router.post('/signup', ...)` |
| `POST /api/auth/login` | `src/routes/auth.js` | `router.post('/login', ...)` |
| `POST /api/auth/logout` | `src/routes/auth.js` | `router.post('/logout', ...)` |
| `GET /api/auth/me` | `src/routes/auth.js` | `router.get('/me', requireAuth, ...)` |
| `GET /api/todos` | `src/routes/todos.js` | `router.get('/', ...)` |
| `POST /api/todos` | `src/routes/todos.js` | `router.post('/', ...)` |
| `PATCH /api/todos/:id` | `src/routes/todos.js` | `router.patch('/:id', ...)` |
| `DELETE /api/todos/:id` | `src/routes/todos.js` | `router.delete('/:id', ...)` |

This table is also a debugging map: when a tester reports "PATCH /api/todos/7 returns 404", a developer knows to open `routes/todos.js` and look at `router.patch('/:id')`. You can build the same map for any project by asking the team where each endpoint lives.

---

## 5. Middleware: a pipeline every request flows through

A **middleware** is a function `(req, res, next)` that runs before the route handler. It can read or add to `req`, answer early (and stop the request), or call `next()` to pass the request to the next function. `app.use(...)` adds one to the pipeline, and they run **in the order they are added**. Think of it as a series of checkpoints: each one may inspect the request, attach something to it, or reject it.

```text
 request: POST /api/todos  {"title":"Buy milk"}  Cookie: token=...
    │
    ▼
 express.json()      body text  ──►  req.body = { title: "Buy milk" }
    │ next()
    ▼
 cookieParser()      Cookie header  ──►  req.cookies = { token: "eyJ..." }
    │ next()
    ▼
 logger              remembers the start time, prints a line when the response is sent
    │ next()
    ▼
 requireAuth         no token?  ──►  401 {"error":"Please log in first."}   (stops here)
    │ next()         valid token  ──►  req.userId = 1
    ▼
 route handler       validate, INSERT, res.status(201).json({ todo })
    │
    ▼
 response: 201 Created   →   log: POST /api/todos → 201 (9 ms)
```

`requireAuth` (in `src/middleware/requireAuth.js`) is the guard. `routes/todos.js` runs it for every to-do route with one line, `router.use(requireAuth);`, and `auth.js` uses it only on `/me`. If there is no valid cookie, it answers 401 itself and the route **never runs**.

**Order matters.** Three real consequences in this project:

1. `cookieParser()` must come before `requireAuth`. Without it, `req.cookies` would be `undefined`, reading the token would throw, and every protected request would fail with a 500.
2. The logger is added **after** `express.json()`. If a request body is not valid JSON, `express.json()` fails first, so the logger never runs and that request does **not** appear in the log. Worth knowing when "the log shows nothing".
3. Two special handlers sit at the **end**, after all routes:

```js
// Any /api URL we did not define.
app.use('/api', (req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
});

// Anything that throws ends up here.
app.use((err, req, res, next) => {
  const status = err.status ?? 500;

  if (status >= 500) console.error(err);

  res.status(status).json({ error: err.expose ? err.message : 'Something went wrong on the server.' });
});
```

The **404 catch-all** only runs if no route above answered. The **error handler** is recognised by its four parameters `(err, req, res, next)`. A client mistake (like broken JSON) keeps its 4xx status and message; a real bug becomes a 500 with a generic message, while the details go to the server console, not to the user.

**So what for a BA?** "Only logged-in users can..." in a requirement usually becomes one middleware, applied once to a whole group of routes. That is cheaper and safer than checking in every screen.

---

## 6. Designing the REST API for to-dos

**REST** is a style for designing HTTP APIs: URLs name **resources** (nouns), and HTTP **methods** say what to do with them (verbs). The to-do app has two resources: the session (`/api/auth/...`) and the to-dos (`/api/todos`, one item at `/api/todos/:id`).

The full contract, from the project README:

| Method | Path | Body | Success | Errors |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/signup` | `{ name, email, password }` | 201 `{user}` | 400 invalid, 409 email taken |
| POST | `/api/auth/login` | `{ email, password }` | 200 `{user}` | 401 wrong email/password |
| POST | `/api/auth/logout` | none | 204 | none |
| GET | `/api/auth/me` | none | 200 `{user}` | 401 not logged in |
| GET | `/api/todos` | none | 200 `{todos}` | 401 |
| POST | `/api/todos` | `{ title }` | 201 `{todo}` | 400, 401 |
| PATCH | `/api/todos/:id` | `{ title?, done? }` | 200 `{todo}` | 400, 401, 404 |
| DELETE | `/api/todos/:id` | none | 204 | 401, 404 |

The status codes used, and why each one:

| Code | Name | Used when |
| --- | --- | --- |
| 200 | OK | A read or update worked and a body comes back |
| 201 | Created | Something new was created (sign-up, new to-do) |
| 204 | No Content | Success with nothing to return (logout, delete) |
| 400 | Bad Request | The input breaks a rule (empty title, short password, broken JSON) |
| 401 | Unauthorized | Not logged in, bad/expired cookie, wrong email or password |
| 404 | Not Found | No such route, or no such to-do **for this user** |
| 409 | Conflict | The request clashes with existing data: the email is already registered |
| 500 | Internal Server Error | A bug on the server; never the user's fault |

**PATCH vs PUT.** `PUT` means "replace the whole resource with what I send", so a client would have to send every field. `PATCH` means "change only the fields I send". Ticking a checkbox sends just `{ "done": true }`; renaming sends just `{ "title": "..." }`. The handler keeps the old value for any field that is missing. This app defines no `PUT` route at all, so `PUT /api/todos/1` gets the catch-all `404 {"error":"No route for PUT /api/todos/1"}`.

---

## 7. Server-side validation, ownership and one error shape

**Validation** is repeated on the server even though the form already checks, because, as a comment in `auth.js` puts it, "anyone can skip the form and call the API directly". The rules in this app:

| Field | Rule | Error (400 unless noted) |
| --- | --- | --- |
| `title` | Required after trimming spaces | `Title is required.` |
| `title` | At most 200 characters | `Title must be 200 characters or fewer.` |
| `name` | Required | `Name is required.` |
| `email` | Looks like `a@b.c` | `Email is not valid.` |
| `password` | At least 8 characters | `Password must be at least 8 characters.` |
| `email` | Not already registered | `This email is already registered.` (409) |

**Ownership.** Every to-do query includes the logged-in user's id, which `requireAuth` put in `req.userId`:

```js
const findOwnTodo = (id, userId) =>
  db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?').get(id, userId);
```

Suppose Binh is logged in and guesses that to-do 1 exists (it belongs to An). `PATCH /api/todos/1` finds no row that matches **both** `id = 1` and Binh's `user_id`, so the answer is `404 {"error":"To-do not found."}`. Binh learns nothing.

**Why 404 and not 403 Forbidden?** A 403 would say "this to-do exists, but it is not yours". That leaks information: an attacker could count how many to-dos exist, or confirm that an id is real. Answering 404 makes "someone else's" and "does not exist" look identical. From Binh's point of view, An's to-dos really do not exist. (403 is the right choice when the user may know the thing exists but lacks permission, e.g. a viewer trying to edit a shared document.)

**One error shape.** Every error in this API, from validation, `requireAuth`, the 404 catch-all or the error handler, has the same body:

```json
{ "error": "Title is required." }
```

That consistency pays off twice. The frontend needs one line to show any error: `api.js` reads `data?.error` and throws it, and the page displays that text. Testers and BAs can write one assertion pattern for every negative test: "status is X and `error` is Y".

---

## 8. Testing the API without a UI

You do not need the React app to test the backend. With the server running (`npm run dev` in `server/`), open a second terminal. On macOS, Linux or **Git Bash** on Windows, use `curl`. The `-i` flag shows the status line and headers; some headers are trimmed below.

1. Check the server is alive:

   ```bash
   curl -i http://localhost:4000/api/health
   ```

   ```http
   HTTP/1.1 200 OK
   Content-Type: application/json; charset=utf-8

   {"status":"ok"}
   ```

2. Sign up and **save the cookie** to a file with `-c cookies.txt`:

   ```bash
   curl -i -X POST http://localhost:4000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"name":"An","email":"an@example.com","password":"secret123"}' \
     -c cookies.txt
   ```

   ```http
   HTTP/1.1 201 Created
   Set-Cookie: token=eyJhbGciOi...; Max-Age=604800; Path=/; Expires=...; HttpOnly; SameSite=Lax
   Content-Type: application/json; charset=utf-8

   {"user":{"id":1,"name":"An","email":"an@example.com"}}
   ```

   Run the same command again and you get `409 Conflict` with `{"error":"This email is already registered."}`.

3. Try the to-do list **without** the cookie, then create a to-do **sending** the cookie with `-b cookies.txt`:

   ```bash
   curl -i http://localhost:4000/api/todos
   # HTTP/1.1 401 Unauthorized
   # {"error":"Please log in first."}

   curl -i -X POST http://localhost:4000/api/todos \
     -H "Content-Type: application/json" \
     -d '{"title":"Buy milk"}' \
     -b cookies.txt
   # HTTP/1.1 201 Created
   # {"todo":{"id":1,"title":"Buy milk","done":false,"createdAt":"2026-09-21 15:16:36"}}
   ```

4. Try the negative cases: `-d '{"title":"   "}'` gives `400 {"error":"Title is required."}`, `PATCH /api/todos/99` gives `404 {"error":"To-do not found."}`, and `DELETE /api/todos/1` gives `204 No Content` with an empty body.

**Windows PowerShell.** In Windows PowerShell 5.1, `curl` is an alias for a different command, and quoting JSON for `curl.exe` is fragile. The native tool is `Invoke-RestMethod`; `-SessionVariable` keeps the cookie, and `-WebSession` sends it back:

```powershell
Invoke-RestMethod http://localhost:4000/api/health

$body = @{ name = "An"; email = "an@example.com"; password = "secret123" } | ConvertTo-Json
$r = Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/auth/signup `
  -ContentType "application/json" -Body $body -SessionVariable s
$r.user

$t = Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/todos `
  -ContentType "application/json" -Body '{"title":"Buy milk"}' -WebSession $s
$t.todo
```

```text
status
------
ok

id name email
-- ---- -----
 1 An   an@example.com

id title     done createdAt
-- -----     ---- ---------
 1 Buy milk False 2026-09-21 15:16:36
```

An error status makes `Invoke-RestMethod` throw. To see the code and the message:

```powershell
try { Invoke-RestMethod http://localhost:4000/api/todos }
catch { $_.Exception.Response.StatusCode.value__; $_.ErrorDetails.Message }
# 401
# {"error":"Please log in first."}
```

**Reading the server log.** Meanwhile, the server terminal prints one line per request from the logger middleware:

```text
GET /api/health → 200 (6 ms)
POST /api/auth/signup → 201 (89 ms)
POST /api/auth/signup → 409 (2 ms)
GET /api/todos → 401 (1 ms)
POST /api/todos → 201 (9 ms)
PATCH /api/todos/99 → 404 (1 ms)
DELETE /api/todos/1 → 204 (5 ms)
```

Each line is method, URL, status code and how long the server took. Sign-up is slow on purpose: hashing a password with bcrypt is designed to take time. When the UI "does nothing", this log tells you in one glance whether the request reached the server and what it answered. Watching the same traffic from the browser side is covered in the DevTools topics: the **Network** tab in **fs-10** (and the **Console** in fs-09).

---

## 9. BA corner: specifying and reviewing an API contract

> **BA corner:** "Which status code?" is a requirements question, not a coding detail. Whether a duplicate email is a 400 or a 409, or whether another user's item is a 403 or a 404, changes what the frontend shows, what testers assert and what an attacker can learn. Decide it in the spec, with the team, before anyone writes the route.

When you write or review an API spec, check each endpoint for:

- **Method and path**: nouns in the path, the verb in the method (`POST /api/todos`, not `POST /api/createTodo`).
- **Request fields**: name, type, required or optional (`title?` in the PATCH row means optional).
- **Validation rules**: exact limits ("≤ 200 characters after trimming"), not "reasonable length".
- **Success**: status code and body shape (`201 { todo }`).
- **Every error**: status code, when it happens, and the **exact message** the user will see.
- **Who may call it**: public, or logged-in only, and whose data it can touch.

Each row turns directly into acceptance criteria and test cases:

```text
Given I am logged in
When I send POST /api/todos with a title of 201 characters
Then the response is 400
And the body is {"error":"Title must be 200 characters or fewer."}
And no to-do is created
```

Common gaps to raise in a review: messages missing or written differently in the spec and in the design, a limit enforced in the UI but not the API, a missing case for items that belong to another user, and error bodies with different shapes on different endpoints.

---

## 10. Summary

- The backend is the only trusted part: it validates, enforces ownership, talks to the database and keeps secrets.
- An Express app is `express()`, some `app.use(...)` middleware, routes (method + path → handler), and `app.listen(PORT)`.
- Handlers read `req.body`, `req.params`, `req.cookies` and answer with `res.status(...).json(...)` or `res.status(204).end()`.
- Routers group routes; `app.use('/api/todos', todoRoutes)` adds the prefix.
- Middleware functions run in sequence, each one passing the request on or answering early; the login guard rejects unauthenticated requests with 401, and the 404 catch-all and the error handler come last.
- The API uses the status codes 200, 201, 204, 400, 401, 404, 409 and 500 deliberately, PATCH for partial updates, 404 for other users' items, and one consistent error shape.

You can now:

- [ ] Start the server and read `API running on http://localhost:4000`.
- [ ] Find the file that defines any URL of the app.
- [ ] Test sign-up, 401, create, 400 and 404 with `curl` or `Invoke-RestMethod`.
- [ ] Read a log line like `POST /api/todos → 201 (9 ms)`.
- [ ] Review an API contract for fields, rules, status codes and messages.

**Next:** fs-07 opens the database behind these routes: tables, SQL queries, and switching from SQLite to MySQL or Postgres.
