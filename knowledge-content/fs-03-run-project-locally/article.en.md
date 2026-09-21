# Install & Run the Project Locally

## 1. What "local" means, and why everything starts there

**Local** means "on my own computer". When a developer says "it works locally", they mean the app runs on their laptop, not on a server on the internet.

Two names point to your own machine:

- **localhost**: a hostname that always means "this computer".
- **127.0.0.1**: the IP address behind it (the *loopback* address). Traffic to it never leaves your machine.

So `http://localhost:5173` reads as "the program listening on **port** 5173 of this computer". A port is a numbered door: one computer can run many servers at once, each behind its own door. Our app uses two doors: **5173** for the frontend and **4000** for the backend.

Nobody else can open your `localhost`. If you send a colleague the link `http://localhost:5173`, it opens *their* computer, where nothing is running.

Where local sits among the usual environments:

| Environment | Where it runs | Who uses it | Data |
| --- | --- | --- | --- |
| **Local** | Your own laptop | One developer (or you) | Fake, throw-away |
| **Dev** | A shared server | The whole team, for integration | Fake |
| **Staging / UAT** | A copy of production | QA, BA, business users | Realistic, anonymised |
| **Production** | Live servers | Real customers | Real |

Developers run everything locally first because it is fast (a change shows in a second), safe (breaking it hurts nobody) and free. Only code that works locally moves on.

**So what for a BA?** Running the app locally lets you try a feature before it reaches staging, reproduce a bug on your own terms, and understand what a developer means by "can't reproduce on my machine".

## 2. Install the tools

You need four things. Only Node.js is strictly required.

| Tool | Why | Where |
| --- | --- | --- |
| **Node.js LTS** (22 or newer) | Runs the backend and the frontend dev server; includes **npm** | nodejs.org |
| **VS Code** | Editor with a built-in terminal | code.visualstudio.com |
| **Git** (optional) | Download code with `git clone`; on Windows also gives you Git Bash | git-scm.com |
| **Chrome** | Browser with DevTools for testing | google.com/chrome |

**Node.js**: pick the **LTS** (Long-Term Support) version, the stable one companies use. Two ways to install it:

1. **Installer** (simplest): download the LTS installer from nodejs.org and click through with the defaults.
2. **Version manager** (useful when projects need different Node versions): **nvm-windows** on Windows, **nvm** on macOS.

```bash
nvm install lts      # nvm-windows;  macOS nvm: nvm install --lts
nvm use lts          # nvm-windows;  macOS nvm: nvm use --lts
```

**Verify** in a *new* terminal (one opened before the install does not see the new program):

```powershell
node -v
# v24.x.x   (any version 22 or newer is fine)
npm -v
# 11.x.x
```

Why 22 or newer? The server's scripts use Node flags (`--env-file-if-exists`, `--watch`) that older versions do not have.

**So what for a BA?** "Which Node version are you on?" is often the first question when something works for one person and not another. Now you know how to answer it.

## 3. Terminal survival kit

The **terminal** (also called shell or command line) is a window where you type commands instead of clicking. In VS Code open it with **Ctrl + `** (backtick) or the menu *Terminal → New Terminal*. It opens in the folder you opened in VS Code.

| Task | PowerShell (Windows) | macOS Terminal / Git Bash |
| --- | --- | --- |
| Where am I? | `pwd` | `pwd` |
| List files | `ls` or `dir` | `ls` (`ls -a` shows hidden files) |
| Go into a folder | `cd server` | `cd server` |
| Go up one level | `cd ..` | `cd ..` |
| Copy a file | `copy a b` (`cp` also works) | `cp a b` |

Habits that save time:

- **Tab completion**: type `cd se` and press **Tab**; the shell completes `server`. Fewer typos.
- **Up arrow**: brings back your previous command. Press it again for older ones.
- **Ctrl + C**: stops the program running in this terminal (for example a server). The terminal is then free again.
- **Relative vs absolute paths**: `cd server` is *relative* (a folder inside where you are now). `cd C:\projects\todo-auth-app\server` is *absolute* (the full address from the drive root). On macOS it looks like `/Users/lan/projects/...`; Git Bash writes `C:\projects` as `/c/projects`.

Which shell? VS Code on Windows uses **PowerShell** by default, and every command in this topic works there. **Git Bash** understands the macOS-style commands. The old **Command Prompt (cmd)** uses `dir` and `copy` and does not understand `ls` or `cp`.

**So what for a BA?** Most "it doesn't work" moments are a command typed in the wrong folder. `pwd` first, then act.

## 4. Get the code

Option A, the download (no Git needed):

1. Download [todo-auth-app.zip](/downloads/todo-auth-app.zip).
2. Move it to a short path without spaces or accents, for example `C:\projects\` (macOS: `~/projects/`). Avoid folders synced by OneDrive or iCloud: `node_modules` holds thousands of small files.
3. Right-click → **Extract All…** (macOS: double-click).
4. Check you did not get a double folder like `todo-auth-app\todo-auth-app\`. You want the folder that directly contains `client` and `server`.
5. In VS Code: **File → Open Folder…** and choose `todo-auth-app`.

Option B, with Git: if your team gives you a repository URL, run `git clone <url>` in the folder where you keep projects, then open the new folder in VS Code.

What you should see:

```text
todo-auth-app/
  README.md
  .gitignore
  client/                 # frontend: React + Vite, port 5173
    index.html
    package.json
    vite.config.js        # contains the /api proxy
    src/                  # main.jsx, App.jsx, api.js, styles.css
      components/         # AuthForm.jsx, TodoPage.jsx
  server/                 # backend: Express, port 4000
    package.json
    .env.example
    db/schema.sql
    src/                  # index.js, db.js, auth-token.js, reset-db.js
      middleware/         # requireAuth.js
      routes/             # auth.js, todos.js
```

There is no `node_modules` folder and no `todo.db` yet. Both are created on your machine in the next steps, which is exactly why they are never shared.

**So what for a BA?** Two `package.json` files means two separate programs. That is the frontend/backend split from the earlier topics, now visible as folders.

## 5. Configure the backend with `.env`

Settings that differ between machines (ports, secrets, file names) live in **environment variables**. Locally we keep them in a file called `.env` in the `server` folder. The project ships a template, `.env.example`:

```bash
# Copy this file to .env and change the values.
# .env holds secrets and machine-specific settings, so never commit it.

PORT=4000
JWT_SECRET=change-me-to-a-long-random-string
DB_FILE=todo.db
```

Create your own copy:

```powershell
# Windows PowerShell (inside the server folder)
cd server
copy .env.example .env
```

```bash
# macOS / Git Bash
cd server
cp .env.example .env
```

| Variable | What it does | If you change it |
| --- | --- | --- |
| `PORT` | The port Express listens on | The Vite proxy still points to 4000, so `client/vite.config.js` must change too |
| `JWT_SECRET` | The secret key that signs the login token in the `token` cookie | Every existing login becomes invalid: everyone is logged out |
| `DB_FILE` | The name of the SQLite database file | The app starts with a new, empty database file |

How is `.env` read? The script `npm run dev` runs `node --env-file-if-exists=.env ...`, a Node 22+ feature, so no extra library is needed. If `.env` is missing, the code falls back to defaults (port 4000 and a development-only secret), so the app still runs.

Why `.env` is **never committed**: it may contain real secrets (database passwords, API keys), and each machine has its own values. The project's `.gitignore` lists `.env`, while `.env.example` with harmless placeholder values *is* committed so newcomers know which variables exist.

Two traps: Notepad may save the file as `.env.txt` (use the copy command instead), and macOS Finder hides files whose name starts with a dot (VS Code shows them).

**So what for a BA?** A setting that "only breaks on staging" is often a missing or wrong environment variable, not a code bug. Configuration is part of the release checklist.

## 6. Start the backend

Terminal 1 does the backend and stays open while you work.

1. Make sure you are in `server` (`pwd` ends in `server`).
2. Install the dependencies (first time only, or after `package.json` changes):

   ```powershell
   npm install
   ```

   npm reads `package.json`, downloads Express, better-sqlite3 and the others into `node_modules`, and ends with something like:

   ```text
   added 118 packages, and audited 119 packages in 3s
   found 0 vulnerabilities
   ```

   Lines starting with `npm warn` (for example a *deprecated* package) are harmless. Lines starting with `npm error` mean the install failed.
3. Start the server in development mode:

   ```powershell
   npm run dev
   ```

   ```text
   > todo-server@1.0.0 dev
   > node --env-file-if-exists=.env --watch src/index.js

   API running on http://localhost:4000
   ```

   The terminal now "hangs": that is correct. The server is running and waiting for requests.
4. In Chrome, open **http://localhost:4000/api/health**. You should see:

   ```json
   {"status":"ok"}
   ```

   and terminal 1 prints `GET /api/health → 200 (5 ms)`.
5. Look in the `server` folder: a new file **`todo.db`** has appeared. On start, `db.js` opens (or creates) the SQLite file and runs `db/schema.sql` to create the tables.

Opening **http://localhost:4000** itself shows `Cannot GET /`. That is normal: this backend only answers URLs under `/api`. The screens come from the frontend.

**So what for a BA?** The health endpoint is the quickest "is the backend alive?" check, and many real systems have one. It is a good first step in any smoke test.

## 7. Start the frontend and see how the two connect

Open a **second** terminal (the **+** in the terminal panel, or split it) and leave terminal 1 running.

1. `cd client`
2. `npm install`
3. `npm run dev`

   ```text
     VITE v7.x.x  ready in 845 ms

     ➜  Local:   http://localhost:5173/
     ➜  Network: use --host to expose
   ```

4. Ctrl + click the Local link, or type **http://localhost:5173** in Chrome. The "Log in" form appears.

Why two terminals and two ports? They are two programs. **Vite** (terminal 2) serves the React files to the browser. **Express** (terminal 1) answers the API and owns the database. Each running program keeps its terminal busy.

The browser only ever talks to 5173. Vite's **proxy** (in `client/vite.config.js`) forwards every request that starts with `/api` to port 4000:

```text
 Chrome ── every request goes to http://localhost:5173
   |
   v
 [Terminal 2: Vite, port 5173] -- /, /src/App.jsx, styles.css: answered here
   |
   |  /api/... forwarded by the proxy
   v
 [Terminal 1: Express, port 4000] -- JSON answers
   |
   v
 server/todo.db (SQLite)
```

To the browser, frontend and API look like one site, so the login cookie just works and no CORS setup is needed.

Now watch terminal 1 while you use the app. Create an account and add a to-do:

```text
GET /api/auth/me → 401 (2 ms)
GET /api/auth/me → 401 (1 ms)
POST /api/auth/signup → 201 (74 ms)
GET /api/todos → 200 (1 ms)
GET /api/todos → 200 (1 ms)
POST /api/todos → 201 (3 ms)
```

The first `401` is expected: on page load the app asks "am I logged in?" and the answer is "not yet". Some lines appear twice because React's development mode (StrictMode) runs page-load effects twice on purpose to catch bugs; in production they run once.

**So what for a BA?** Every click you make becomes one visible request with a status code. This is the same list you will study in the Network tab of DevTools.

## 8. Hot reload: change code, see it instantly

In development both servers watch your files.

**Frontend experiment:**

1. Open `client/src/components/AuthForm.jsx` and find the heading:

   ```jsx
   <h1>{isSignup ? 'Create an account' : 'Log in'}</h1>
   ```

2. Change `'Log in'` to `'Log in to My To-dos'` and save (Ctrl + S).
3. Look at the browser: the heading changes at once, without a refresh, and what you typed in the form stays. Terminal 2 logs a line such as `[vite] (client) hmr update /src/components/AuthForm.jsx`. This is **HMR** (Hot Module Replacement).

**Backend experiment:**

1. Open `server/src/index.js` and change the health answer to `res.json({ status: 'ok', hello: 'BA' });`, then save.
2. Terminal 1 shows `Restarting 'src/index.js'` and then `API running on http://localhost:4000` again. That is `node --watch` restarting the whole server.
3. Refresh http://localhost:4000/api/health to see the new field.

Undo both edits afterwards (Ctrl + Z, then save). Note the difference: the frontend swaps one module in place, the backend restarts completely. Our data survives the restart because it lives in `todo.db`.

**So what for a BA?** Small text changes are cheap to try live with a developer: sitting together and editing a label beats three rounds of screenshots.

## 9. Troubleshooting and resetting data

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `Port 4000 is already in use.` followed by `Failed running 'src/index.js'. Waiting for file changes before restarting...` (other Node apps print `EADDRINUSE: address already in use`) | Another program (often an old server you forgot) already uses port 4000 | Stop it with Ctrl + C in its terminal, or find and kill it (commands below) |
| Vite says `Port 5173 is in use, trying another one...` and prints `Local: http://localhost:5174/` | An older Vite is still running | Use the URL Vite prints, or stop the old one |
| Terminal 2 shows `[vite] http proxy error: /api/auth/me` with `ECONNREFUSED`; the form says `Request failed (500)` | The backend is not running, so the proxy has nobody to forward to | Start terminal 1 (`npm run dev` in `server`) |
| Blank white page | A JavaScript error in the frontend | Open DevTools (F12) → **Console** and read the red message |
| `npm : The term 'npm' is not recognized...` | Node is not installed, or the terminal was opened before installing | Reinstall Node LTS, then close and reopen the terminal (or VS Code) |
| `npm.ps1 cannot be loaded because running scripts is disabled on this system` | PowerShell's script execution policy | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or use `npm.cmd` |
| `npm install` fails on `better-sqlite3` (`gyp ERR!`, `prebuild-install`) | Node too old or an unusual version with no ready-made binary | Install the current Node LTS, delete `node_modules`, run `npm install` again |
| `Cannot GET /` on http://localhost:4000 | Normal: the backend only serves `/api` | Open http://localhost:5173 for the app |
| `npm error enoent Could not read package.json` | You are in the wrong folder (for example `todo-auth-app` instead of `server`) | `pwd`, then `cd server` or `cd client` |

Find and stop whatever holds port 4000:

```powershell
# Windows: the last column is the PID (process id)
netstat -ano | findstr :4000
#   TCP    0.0.0.0:4000    0.0.0.0:0    LISTENING    30556
taskkill /PID 30556 /F
```

```bash
# macOS
lsof -i :4000
kill -9 <PID>
```

**Resetting data.** To test sign-up again from a clean slate, run this in `server`:

```bash
npm run db:reset
# Database emptied.
```

It deletes every user and to-do but keeps the tables. The heavier option: stop the server (Windows locks the file while it runs), delete `todo.db`, and start again; the file is recreated empty from `schema.sql`. An old `token` cookie in your browser now gets a 401, so the app simply shows the login form.

> **BA corner:** A bug report a developer can act on has **steps to reproduce** and **environment info**. "Login is broken" costs a day of back-and-forth; this costs five minutes:
>
> - **Environment:** local (http://localhost:5173) / dev / staging, plus the commit or build (`git log -1 --oneline`)
> - **Browser & OS:** Chrome 1xx, Windows 11
> - **Preconditions:** empty database (`npm run db:reset`), no account yet
> - **Steps:** 1. Open the app. 2. Click "Create an account". 3. Sign up with a valid name, email and 8-character password.
> - **Expected / Actual:** the to-do list opens / the form stays and shows `Request failed (500)`
> - **Evidence:** screenshot, the failing request in the Network tab, and the matching line from terminal 1 or 2.
>
> The same fields make good acceptance tests: they force you to state the starting data and the exact expected result.

## 10. Summary

You now have the whole app running on your own computer. Checklist:

- [ ] I can explain localhost, 127.0.0.1 and a port, and why local comes before dev, staging and production.
- [ ] I installed Node.js LTS (22 or newer) and verified it with `node -v` and `npm -v`.
- [ ] I can navigate with `pwd`, `ls`, `cd` and `cd ..`, and stop a program with Ctrl + C.
- [ ] I unzipped the project and can point to `client`, `server` and `.env.example`.
- [ ] I created `.env` from the template and know why it is never committed.
- [ ] Terminal 1 runs the backend on port 4000; `/api/health` returns `{"status":"ok"}`.
- [ ] Terminal 2 runs the frontend on port 5173, and the proxy forwards `/api` to 4000.
- [ ] I watched request lines appear in terminal 1 as I clicked.
- [ ] I saw hot reload on both sides and undid my edits.
- [ ] I can diagnose a busy port, a stopped backend and a wrong folder, and I can reset the data.
- [ ] I can write a bug report with steps to reproduce and environment details.

Next topic: **React basics**, where we open the frontend code you just ran.
