# Build a Website A–Z: The To-do Project Overview

## 1. Why a BA should build one app, once

You already know the vocabulary: frontend, backend, API, JSON, database, SQL. This run of eleven topics turns those words into something you have **seen working with your own eyes**. Together we will download, run, read and test one small but real web app: a to-do list with sign-up and login.

**What you will get out of it:**

- A mental model you can trust. When a developer says "the API returns 401" or "it's stored in a cookie", you will know which box in the diagram they mean.
- Better requirements. Once you have watched a password check fail on the server, you will write acceptance criteria for the unhappy paths too.
- Confident testing. With Chrome DevTools you will inspect requests, read status codes and look inside cookies and `localStorage` instead of saying "it doesn't work".
- A shared language with the team, which makes estimates and trade-off talks shorter.

**What you will NOT become:** a developer. You will not learn to design a system from a blank page, tune performance or ship to production. The app is deliberately small so every file can be read in one sitting. The goal is literacy, not a career change.

---

## 2. What we build: features and screens

The app is called **My To-dos**. It has only two screens, and React decides which one to show.

```text
+-------------------------------+      +------------------------------------+
|  Log in                       |      |  Hi, Lan                [Log out]  |
|  Email    [lan@mail.com   ]   | ---> |  [What needs doing?     ] [Add]    |
|  Password [********       ]   |      |  (all) (active) (done)    1 left   |
|  [ Log in ]                   |      |  [ ] Buy milk            Delete    |
|  New here? Create an account  |      |  [x] Call the bank       Delete    |
+-------------------------------+      +------------------------------------+
```

| Feature | What the user does | What happens behind the scenes |
|---|---|---|
| Sign up | Enters name, email, password (8+ characters) | Account is saved, user is logged in immediately |
| Log in | Enters email and password | Server sets a login cookie |
| Add a to-do | Types a title, clicks **Add** | New item appears at the top of the list |
| Tick / untick | Clicks the checkbox | Item is marked done or active |
| Delete | Clicks **Delete** | Item disappears for good |
| Filter | Clicks **all**, **active** or **done** | List is filtered; the choice is remembered |
| Log out | Clicks **Log out** | Cookie is cleared, login screen returns |
| Stay logged in | Refreshes the page (F5) | App asks the server "who am I?" and restores the session |

A small comfort feature: the login form pre-fills the **last email** you typed. The password is never remembered.

**So what for a BA?** This table is the scope statement. Everything outside it (password reset, email verification, sharing lists) is out of scope, and saying so explicitly is part of your job.

---

## 3. The requirements, as a BA would write them

Before any code, a BA writes user stories with testable acceptance criteria. Here are the ones this app satisfies. Every message in quotes is the exact text the app shows.

**US-1 Sign up.** As a new visitor, I want to create an account so that my to-dos are private to me.

- Given I am on the sign-up form, when I submit a valid name, email and a password of 8+ characters, then my account is created and I see my (empty) to-do list.
- Given the email is already registered, when I submit the form, then I see "This email is already registered." and no second account is created.
- Given my password has fewer than 8 characters, when I submit, then I see "Password must be at least 8 characters."

**US-2 Log in.** As a registered user, I want to log in so that I can see my to-dos.

- Given a correct email and password, when I click **Log in**, then I see "Hi, Lan" (my name) and my list.
- Given a wrong password **or** an unknown email, when I click **Log in**, then I see "Email or password is incorrect." (the same message for both, so nobody can probe which emails have accounts).

**US-3 Manage to-dos.** As a logged-in user, I want to add, tick and delete to-dos so that I can track my work.

- Given I typed "Buy milk", when I click **Add**, then "Buy milk" appears at the top of the list as not done.
- Given the title box is empty or only spaces, when I click **Add**, then I see "Title is required." and nothing is added.
- Given an item exists, when I tick it, then it shows as done and the "left" counter drops by one.

**US-4 Privacy.** As a user, I want my to-dos to be invisible to other users so that my data stays mine.

- Given Lan and Minh both have to-dos, when Minh logs in, then he sees only his own.
- Given Minh knows the id of Lan's to-do, when he tries to change or delete it through the API, then he gets "To-do not found." and nothing changes.

**US-5 Session.** As a user, I want to stay logged in after a refresh and to be able to log out.

- Given I am logged in, when I refresh the page, then I still see my list without typing my password again.
- Given I click **Log out**, when the login screen appears and I refresh, then I stay logged out.

> **BA corner:** notice that half of the criteria are unhappy paths. In fs-10 you will verify each of them in the Network tab: 409 for a duplicate email, 401 for a wrong password, 400 for an empty title, 404 for someone else's to-do. A criterion you can map to a status code is a criterion a tester can check without arguing.

---

## 4. The architecture: what runs where

The app has three parts, and on your laptop they run as **two programs plus one file**.

```text
  Your browser (Chrome)
  shows the React app, keeps the "token" cookie and localStorage
        |
        |  http://localhost:5173        (every request goes here, even /api)
        v
  Vite dev server  :5173   (Terminal 2, folder client/)
    - serves index.html and the React code
    - proxy: anything starting with /api  --->  http://localhost:4000
        |
        v
  Express API server  :4000   (Terminal 1, folder server/)
    - middleware: JSON body, cookies, request log, requireAuth
    - routes: /api/auth/*, /api/todos/*
        |
        |  SQL through better-sqlite3 (same process, no network)
        v
  SQLite database file  server/todo.db
    - tables: users, todos
```

Three ideas to take away:

1. **The browser only ever talks to port 5173.** The Vite **proxy** quietly forwards `/api` calls to Express. To the browser, frontend and API look like one site, so the login cookie is sent automatically and no extra cross-site setup (CORS) is needed.
2. **React runs in the browser; Express runs on the server.** In development the "server" is your laptop, but the split is the same as in production.
3. **SQLite is not a server.** It is a library inside the Express process that reads and writes a single file.

**So what for a BA?** When a bug appears, the first question is "which box?". A wrong label is a frontend bug; a wrong status code is a backend bug; missing data after a restart points at the database.

---

## 5. The tech stack, and why each piece

| Layer | Chosen | Why for this course | Common alternatives |
|---|---|---|---|
| Frontend library | **React 19** (with **Vite 7** as the dev server) | Most requested frontend skill; small components are easy to read | Vue, Angular, Svelte, plain HTML + JS |
| Backend framework | **Express 5** on **Node.js 22+** | Same language (JavaScript) as the frontend; a route is a few lines | NestJS, Fastify, Python FastAPI, Java Spring Boot, .NET |
| Database | **SQLite** via `better-sqlite3` | One file, zero setup, real SQL | MySQL, PostgreSQL (separate servers) |
| Package manager | **npm** (yarn works too) | Ships with Node.js | yarn, pnpm |
| Testing tool | **Chrome DevTools** | Already in every browser; shows what really travelled | Postman, Insomnia, curl |

A few smaller libraries on the server do one job each: `bcryptjs` turns passwords into one-way **hashes**, `jsonwebtoken` creates the signed login token (a **JWT**), and `cookie-parser` reads the cookie on each request.

**SQLite vs MySQL vs PostgreSQL**

| | SQLite | MySQL | PostgreSQL |
|---|---|---|---|
| Runs as | A file inside your app, no setup | A separate server | A separate server |
| Best for | Learning, prototypes, mobile apps, small tools | Classic web apps, hosting providers | Complex queries, strict data rules |
| Many users writing at once | Limited | Good | Very good |

The SQL is nearly identical across all three. Switching mostly means changing `server/src/db.js` and the query placeholders (fs-07): a small change that still needs retesting.

**So what for a BA?** Every choice is a **trade-off**. SQLite is perfect here and wrong for a bank. When a team proposes a stack, ask what it costs to set up, to run and to change later.

---

## 6. One request end-to-end: clicking "Add"

This is the heart of the whole course. Lan types "Buy milk" and clicks **Add**. Here is everything that happens, in order:

1. **Form submit.** React calls `addTodo` (the form's `onSubmit` handler). `event.preventDefault()` stops the browser from reloading the page.
2. **Fetch.** `api('POST', '/todos', { title: newTitle })` sends `POST /api/todos` to `localhost:5173` with the JSON body `{"title":"Buy milk"}`. The browser **attaches the `token` cookie by itself**; our code never touches it.
3. **Proxy.** Vite sees the path starts with `/api` and forwards the request to Express on port 4000.
4. **Middleware.** Express parses the JSON body and the cookies, then `requireAuth` verifies the token. No cookie or a bad one means **401**, and the route never runs.
5. **Validation.** The route trims the title. Empty means **400** "Title is required."; longer than 200 characters is also a 400.
6. **INSERT.** `INSERT INTO todos (user_id, title) VALUES (?, ?)` writes a row into `todo.db`, tagged with Lan's user id.
7. **Response.** The server answers **201 Created** with the new item as JSON.
8. **State update.** React puts the new to-do at the front of its list (`setTodos`) and clears the input.
9. **Re-render.** React redraws only what changed: "Buy milk" appears at the top and the "left" counter goes up by one.

The frontend half, exactly as it appears in the project (the backend half is fs-06):

```jsx
// client/src/components/TodoPage.jsx
async function addTodo(event) {
  event.preventDefault();
  setError('');

  try {
    const data = await api('POST', '/todos', { title: newTitle });
    setTodos([data.todo, ...todos]);
    setNewTitle('');
  } catch (err) {
    handleError(err);
  }
}
```

What travels over the wire, and what the backend terminal prints:

```http
POST /api/todos HTTP/1.1
Host: localhost:5173
Content-Type: application/json
Cookie: token=eyJhbGciOiJIUzI1NiIs...

{"title":"Buy milk"}

HTTP/1.1 201 Created
Content-Type: application/json

{"todo":{"id":1,"title":"Buy milk","done":false,"createdAt":"2026-09-21 08:30:00"}}
```

```text
POST /api/todos → 201 (4 ms)
```

**So what for a BA?** Each numbered step is a place where things can go wrong, and each has its own symptom. You will revisit this list in fs-05 (steps 1–2, 8–9), fs-06 (steps 4–7) and fs-10 (watching it all live).

---

## 7. The project folder, annotated

```text
todo-auth-app/
├── README.md                  how to run it, API table, storage table
├── .gitignore                 keeps node_modules, .env and *.db out of Git
├── client/                    FRONTEND (React + Vite), port 5173
│   ├── index.html             the one HTML page; React fills <div id="root">
│   ├── vite.config.js         dev server port + the /api proxy
│   ├── package.json           client dependencies and scripts
│   └── src/
│       ├── main.jsx           entry point: mounts <App />
│       ├── App.jsx            picks the screen: login form or to-do list
│       ├── api.js             the ONE function that calls the backend
│       ├── styles.css         the look
│       └── components/
│           ├── AuthForm.jsx   log in / sign up form
│           └── TodoPage.jsx   add, tick, delete, filter, log out
└── server/                    BACKEND (Express), port 4000
    ├── package.json           scripts: dev, start, db:reset
    ├── .env.example           template for settings (PORT, JWT_SECRET, DB_FILE)
    ├── db/schema.sql          the two tables: users, todos
    ├── todo.db                the database file (created on first start)
    └── src/
        ├── index.js           creates the app, middleware, mounts routes
        ├── db.js              opens todo.db and runs schema.sql
        ├── auth-token.js      creates/checks the JWT, cookie options
        ├── reset-db.js        empties the tables (npm run db:reset)
        ├── middleware/
        │   └── requireAuth.js no valid cookie → 401
        └── routes/
            ├── auth.js        signup, login, logout, me
            └── todos.js       list, add, update, delete to-dos
```

Rule of thumb: **everything under `client/` ends up in the browser**, so it must never contain secrets. That is why the JWT secret lives in `server/.env`, a file that is never committed.

**So what for a BA?** "A one-line change in `todos.js`" is a backend change: the API needs retesting, not only the screen.

---

## 8. The API contract and where data lives

The frontend and backend agree on a **contract**: which URL, which method, what goes in, what comes out. Everything under `/api/todos` needs the login cookie.

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| POST | `/api/auth/signup` | `{ name, email, password }` | 201 `{user}` | 400 invalid, 409 email taken |
| POST | `/api/auth/login` | `{ email, password }` | 200 `{user}` | 401 wrong email/password |
| POST | `/api/auth/logout` | none | 204 | none |
| GET | `/api/auth/me` | none | 200 `{user}` | 401 not logged in |
| GET | `/api/todos` | none | 200 `{todos}` | 401 |
| POST | `/api/todos` | `{ title }` | 201 `{todo}` | 400, 401 |
| PATCH | `/api/todos/:id` | `{ title?, done? }` | 200 `{todo}` | 400, 401, 404 |
| DELETE | `/api/todos/:id` | none | 204 | 401, 404 |

And where each piece of data is stored:

| What | Where | Why there |
|---|---|---|
| Users and to-dos | SQLite file `server/todo.db` | Must survive restarts, shared by devices |
| Password | Only as a bcrypt **hash** in `users.password_hash` | A leaked database must not leak passwords |
| Login session (a JWT) | Cookie `token`, **HttpOnly**, SameSite=Lax, 7 days | Page JavaScript cannot read or steal it |
| Last email typed, list filter | `localStorage` keys `todo:lastEmail`, `todo:filter` | Harmless UI preferences for this browser |

Each row of the second table is a decision with a reason: a token in `localStorage` could be stolen by any injected script, and a filter in the database would be overkill.

**So what for a BA?** The contract lets frontend and backend work in parallel; the storage table answers the privacy questions stakeholders always ask.

---

## 9. The course roadmap and the code

| Topic | What you do | What you gain as a BA |
|---|---|---|
| **fs-01** Project overview (this one) | Understand the app, its requirements and its shape | The map for everything that follows |
| **fs-02** Node.js, npm & yarn | Learn what Node is and what `package.json` does | Understand "dependencies" and "scripts" |
| **fs-03** Install & run the project locally | Run both servers, create your first account | The confidence of a working app on your laptop |
| **fs-04** React basics | Components, props, state | Why a screen changes without reloading |
| **fs-05** React forms & calling the API | Forms, `fetch`, error messages | Where client-side validation lives |
| **fs-06** Backend with Express | Routes, middleware, status codes | Why the server must re-check everything |
| **fs-07** SQL database (SQLite/MySQL/Postgres) | Tables, queries, switching databases | How data rules become constraints |
| **fs-08** Authentication: sign up, login, logout | Hashing, JWT, cookies | How to write security acceptance criteria |
| **fs-09** DevTools: Elements & Console | Inspect the page, read errors | Better bug reports with evidence |
| **fs-10** DevTools: Network (testing APIs) | Watch requests and status codes | Test APIs without extra tools |
| **fs-11** DevTools: Application & end-to-end test | Cookies, `localStorage`, a full test run | Run a complete UAT-style check yourself |

**Get the code:** download [todo-auth-app.zip](/downloads/todo-auth-app.zip) and unzip it somewhere easy to find, such as your Desktop. Do not try to run it yet; fs-02 explains the tools and fs-03 walks through installation step by step on Windows (and macOS).

---

## 10. Summary

You now have the map of the project. You can:

- Explain why a BA builds one app once, and what the goal is **not**.
- List the app's features and its two screens.
- Write user stories with Given/When/Then criteria, including unhappy paths (duplicate email, short password, wrong password, empty title, someone else's to-do).
- Draw the architecture: browser → Vite on :5173 → proxy → Express on :4000 → `todo.db`.
- Justify each technology choice and name an alternative.
- Walk through the nine steps of clicking **Add**, from `onSubmit` to re-render.
- Find the frontend and backend files in the folder tree.
- Read the API contract and say where each piece of data is stored, and why.

**Next:** fs-02 introduces Node.js, npm and yarn, the tools that install and run everything in this project.
