# To-do app with sign-up & login

The reference project for the **"Build a website from scratch"** run of the IT Fundamentals course
(topics `fs-01` … `fs-11`). It is deliberately small, so every file can be read in one sitting.

| Part     | Tech                        | Folder    | Runs on                  |
| -------- | --------------------------- | --------- | ------------------------ |
| Frontend | React 19 + Vite             | `client/` | http://localhost:5173    |
| Backend  | Node.js + Express 5         | `server/` | http://localhost:4000    |
| Database | SQLite (one file, `todo.db`) | `server/` | created on first start |

## Run it

You need **Node.js 22 or newer** (`node -v` to check). Open **two** terminals.

```bash
# Terminal 1: the backend
cd server
npm install
cp .env.example .env      # Windows PowerShell: copy .env.example .env
npm run dev               # → API running on http://localhost:4000
```

```bash
# Terminal 2: the frontend
cd client
npm install
npm run dev               # → Local: http://localhost:5173/
```

Open **http://localhost:5173**, create an account, and add some to-dos.
Stop either server with **Ctrl + C**. Empty the database with `npm run db:reset` (in `server/`).

Prefer yarn? `yarn` instead of `npm install`, and `yarn dev` instead of `npm run dev`.
Use one or the other in a project, not both.

## API

All routes are under `/api`. Everything under `/api/todos` needs the login cookie.

| Method | Path               | Body                          | Success     | Errors                 |
| ------ | ------------------ | ----------------------------- | ----------- | ---------------------- |
| POST   | `/api/auth/signup` | `{ name, email, password }`   | 201 `{user}` | 400 invalid, 409 email taken |
| POST   | `/api/auth/login`  | `{ email, password }`         | 200 `{user}` | 401 wrong email/password |
| POST   | `/api/auth/logout` | none                          | 204         | none                   |
| GET    | `/api/auth/me`     | none                          | 200 `{user}` | 401 not logged in      |
| GET    | `/api/todos`       | none                          | 200 `{todos}` | 401                  |
| POST   | `/api/todos`       | `{ title }`                   | 201 `{todo}` | 400, 401              |
| PATCH  | `/api/todos/:id`   | `{ title?, done? }`           | 200 `{todo}` | 400, 401, 404         |
| DELETE | `/api/todos/:id`   | none                          | 204         | 401, 404               |

## Where things are stored

| What                          | Where                                         | Why there                                  |
| ----------------------------- | --------------------------------------------- | ------------------------------------------ |
| Users and to-dos              | SQLite file `server/todo.db`                  | Must survive restarts, shared by devices   |
| Password                      | Only as a bcrypt **hash** in `users.password_hash` | A leaked database must not leak passwords |
| Login session (a JWT)         | Cookie `token`, **HttpOnly**, SameSite=Lax    | Page JavaScript cannot read or steal it    |
| Last email typed, list filter | `localStorage` keys `todo:lastEmail`, `todo:filter` | Harmless UI preferences for this browser |

## Switching to Postgres or MySQL

Only `server/src/db.js` and the SQL in the routes change. See topic **fs-07** in the course. In short,
use the `pg` package (placeholders `$1, $2`) or `mysql2` (placeholders `?`) and make the route handlers
`async`, because those drivers talk to a separate database server over the network.

## Not production-ready (on purpose)

No rate limiting on login, no email verification, no password reset, no HTTPS. Each is a good
exercise, and each is a user story a BA would write before go-live.

## Bugs left in on purpose (find them with DevTools)

The DevTools topics (fs-09 … fs-11) ask you to find and report these. Please don't fix them in the
course copy.

| Bug | How to see it | Topic |
| --- | ------------- | ----- |
| A long title with no spaces overflows the card | Device Toolbar at 320 px, add a to-do like a pasted URL | fs-09 |
| Done items' grey text has low contrast (about 3:1) | Lighthouse → Accessibility | fs-09 |
| Double-clicking **Add** creates two to-dos | Network → throttle to 3G, double-click Add | fs-05, fs-10 |
| A failed `GET /api/todos` shows the error *and* "Nothing here yet." | Network → block `/api/todos`, reload | fs-10 |
| The API being down looks like being logged out | Stop the server, reload: you get the login form | fs-10 |
| Login answers faster for an unknown email than for a wrong password | Network → Timing on the two requests | fs-08, fs-10 |
