# Node.js, npm & yarn: Managing Packages

## 1. What Node.js is and why you need it

JavaScript was born inside the browser. **Node.js** takes the same JavaScript engine that Chrome uses (V8) and lets it run **outside the browser**, directly on your computer or on a server. With Node.js, JavaScript can read files, open network ports and talk to a database, which is exactly what a backend does.

In our reference project, [todo-auth-app.zip](/downloads/todo-auth-app.zip), Node.js is needed **twice**:

```text
 todo-auth-app/
 ├── server/   Express API on :4000   → Node.js RUNS the backend itself
 └── client/   React + Vite on :5173  → Node.js runs the TOOLS (Vite dev server, build)
                                        the React code itself finally runs in the browser
```

So even a "pure frontend" project needs Node.js on the developer's machine: the dev server, the bundler and the test runner are all Node programs.

**Versions.** Node.js releases new major versions regularly. The ones marked **LTS** (Long-Term Support; so far the even-numbered ones such as 20, 22 and 24) receive bug and security fixes for about three years, so companies standardise on them. Always install the version labelled **LTS** on nodejs.org. The sample needs **Node.js 22 or newer**.

Check what you have (PowerShell, macOS Terminal and Linux all accept the same commands):

```bash
node -v
# v22.21.1
npm -v
# 10.9.4
```

Higher numbers are fine. **npm** (Node Package Manager) comes with Node, so one installer gives you both.

For a BA, "which Node version?" is an environment question just like "which browser?". When a bug only happens on one developer's laptop, a different Node version is one of the first suspects.

---

## 2. Packages, libraries and the npm registry

A **package** (also called a library or dependency) is a folder of code someone else wrote, published so that anyone can reuse it. Think of cooking: you *could* make your own soy sauce, noodles and fish sauce from scratch, but a sensible cook buys good ingredients and spends their effort on the dish itself. Our to-do server "buys" its ingredients:

| Package | Job in the sample |
|---|---|
| `express` | Receives HTTP requests and routes them |
| `better-sqlite3` | Reads and writes the `todo.db` file |
| `bcryptjs` | Hashes passwords (never write your own cryptography) |
| `jsonwebtoken` | Signs and checks the login token |
| `cookie-parser` | Turns the `Cookie` header into `req.cookies` |

The public warehouse where packages live is the **npm registry** (registry.npmjs.org), with millions of packages. A **package manager** is the tool that downloads packages from the registry, puts them in your project and remembers exactly which versions you got. The three you will hear about are **npm**, **yarn** and **pnpm**. They all read the same `package.json` and download from the same registry; they differ in speed, disk usage and lock-file format.

Packages depend on other packages. The server lists only 5, yet installing them brings in **over 100**, because Express alone depends on dozens of smaller ones. These indirect ones are **transitive dependencies**, and every one of them is code your product ships.

---

## 3. `package.json`, field by field

`package.json` is the project's ID card and shopping list. Here is the sample's server file, unchanged:

```json
{
  "name": "todo-server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "dev": "node --env-file-if-exists=.env --watch src/index.js",
    "start": "node --env-file-if-exists=.env src/index.js",
    "db:reset": "node --env-file-if-exists=.env src/reset-db.js"
  },
  "dependencies": {
    "bcryptjs": "^3.0.2",
    "better-sqlite3": "^12.4.1",
    "cookie-parser": "^1.4.7",
    "express": "^5.1.0",
    "jsonwebtoken": "^9.0.2"
  }
}
```

| Field | Meaning |
|---|---|
| `name`, `version` | The project's own name and version. |
| `private: true` | A safety catch: npm refuses to publish this project to the public registry by accident. |
| `type: "module"` | Files use modern `import … from '…'` syntax (ES modules) instead of the older `require()`. |
| `engines` | Which Node versions the project supports. `>=22` because the scripts use `--env-file-if-exists`, which older Node does not know. |
| `scripts` | Named shortcuts for commands (section 6). |
| `dependencies` | Packages needed **when the app runs**. |

And the client's file:

```json
{
  "name": "todo-client",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "vite": "^7.0.0"
  }
}
```

The new field is **`devDependencies`**: packages needed only **while developing or building**. Vite is the kitchen equipment: it serves and bundles the code but is not part of the meal. React is an ingredient: it ends up inside the JavaScript the user's browser downloads. A production server can skip dev dependencies with `npm install --omit=dev`, which makes it smaller and gives attackers less to work with.

---

## 4. Semantic versioning: what `^5.1.0` really means

Almost every package uses **semantic versioning** (SemVer): `MAJOR.MINOR.PATCH`.

```text
      5 . 1 . 0
      │   │   └─ PATCH: bug fix, nothing else changes
      │   └───── MINOR: new features, old code still works
      └───────── MAJOR: breaking change, your code may need edits
```

The symbol in front of the version in `package.json` is a **range**: which future versions npm is allowed to install.

| Written | Accepts | Example: allowed | Example: refused |
|---|---|---|---|
| `^5.1.0` (caret, the default) | same MAJOR | 5.1.1, 5.2.1, 5.9.2 | 6.0.0 |
| `~5.1.0` (tilde) | same MAJOR.MINOR | 5.1.1, 5.1.9 | 5.2.0 |
| `5.1.0` (exact) | only that version | 5.1.0 | 5.1.1 |

Real evidence from the sample: `package.json` asks for `"express": "^5.1.0"`, and the lock file recorded that **5.2.1** was actually installed. Likewise `better-sqlite3` `^12.4.1` became 12.11.1, and `vite` `^7.0.0` became 7.3.6. One exception to remember: for `0.x` versions the caret is stricter (`^0.2.3` accepts 0.2.9 but not 0.3.0), because before 1.0 every minor release may break things.

SemVer is a **promise, not a guarantee**. A package author can ship a "patch" that still breaks you. That is why the lock file in the next section exists.

---

## 5. `node_modules` and lock files

When you install, the package manager downloads every package into a folder called **`node_modules`** inside the project. It gets big fast: in the sample, `server/node_modules` is about 18 MB and `client/node_modules` about 48 MB, for a tiny app.

Three rules about `node_modules`:

1. **Never commit it** to Git. The sample's `.gitignore` starts with `node_modules/`.
2. **Never edit files inside it.** Your change disappears on the next install.
3. **You can always delete it and reinstall.** It is a cache, rebuilt from `package.json` plus the lock file. "Delete `node_modules` and install again" is the IT equivalent of "turn it off and on again", and it fixes a surprising number of problems.

The **lock file** is the exact receipt of what was installed: every package, including transitive ones, with its precise version, download URL and an `integrity` checksum. An excerpt from the sample's `server/package-lock.json`:

```json
"node_modules/accepts": {
  "version": "2.0.0",
  "resolved": "https://registry.npmjs.org/accepts/-/accepts-2.0.0.tgz",
  "integrity": "sha512-5cvg6CtKwfgdmVqY1WIiXKc3Q1bkRqGLi+2W/6ao+6Y7gu/RCwRuAhGEzh5B4KlszSuTLgZYuqFqo5bImjNKng==",
  "license": "MIT"
}
```

yarn writes `yarn.lock` and pnpm writes `pnpm-lock.yaml`: same job, different format. `package.json` says "express 5.something"; the lock file says "express 5.2.1, exactly this file". **Always commit the lock file.** Without it, a developer who installs next month may get express 5.3.0 while CI tests 5.2.1: the classic **"works on my machine"** bug. With it, every laptop, the CI server and production install byte-for-byte the same code.

---

## 6. npm scripts and the everyday commands

The `scripts` block gives commands short names. You run them with `npm run <name>`:

```bash
cd server
npm run dev        # runs: node --env-file-if-exists=.env --watch src/index.js
npm run db:reset   # runs: node --env-file-if-exists=.env src/reset-db.js
npm start          # "start" (and "test") work without the word "run"
```

What the pieces of `dev` do:

- `node src/index.js` starts the server.
- `--env-file-if-exists=.env` loads settings such as `PORT` and `JWT_SECRET` from `.env`, if that file exists.
- `--watch` restarts the server automatically every time you save a file. That is why `dev` is for your laptop and `start` (no watching) is for a real server.

In the client, `npm run dev` simply runs `vite`. Scripts double as documentation: they tell a newcomer how the project is started, built and tested.

**The commands you will actually type**, npm vs yarn side by side (yarn here means Yarn 1 "classic", which is what `npm install -g yarn` gives you):

| Task | npm | yarn |
|---|---|---|
| Install everything in `package.json` | `npm install` (or `npm i`) | `yarn` |
| Add a package | `npm install dayjs` | `yarn add dayjs` |
| Add a dev-only package | `npm install -D vite` | `yarn add -D vite` |
| Remove a package | `npm uninstall dayjs` | `yarn remove dayjs` |
| Run a script | `npm run dev` | `yarn dev` |
| Clean install exactly from the lock file (CI) | `npm ci` | `yarn install --frozen-lockfile` |
| Run a package's command without installing it | `npx cowsay hi` | `yarn dlx cowsay hi` (Yarn 2+ only) |
| List known vulnerabilities | `npm audit` | `yarn audit` |

`npm ci` deletes `node_modules`, installs **exactly** what the lock file says, and fails if `package.json` and the lock file disagree: the strictness a build server needs.

**pnpm** is a third option with the same ideas (`pnpm install`, `pnpm add dayjs`, `pnpm dlx`); it stores each package version once on disk, so it is fast and saves space.

**Rule: one package manager per project.** Look at which lock file is committed and use that tool. If a project has both `package-lock.json` and `yarn.lock`, the two can drift apart and people get different versions again. Newer projects often pin the tool itself with a `"packageManager": "yarn@…"` field in `package.json`; a helper called **corepack** reads that field and runs the right version. Corepack was bundled with Node up to version 24; newer Node versions leave it out, so you install it with `npm install -g corepack`.

---

## 7. Hands-on: your first package in five minutes

Do this in any empty folder outside the sample, for example on your Desktop.

1. Create a folder and a `package.json`:

   ```powershell
   mkdir hello-dayjs
   cd hello-dayjs
   npm init -y
   ```

   `-y` answers "yes" to every question, and npm prints the new file:

   ```text
   Wrote to C:\Users\you\Desktop\hello-dayjs\package.json:

   {
     "name": "hello-dayjs",
     "version": "1.0.0",
     ...
     "license": "ISC"
   }
   ```

2. Install a small date library and switch the project to `import` syntax, like the sample:

   ```powershell
   npm install dayjs
   npm pkg set type=module
   ```

   ```text
   added 1 package, and audited 2 packages in 1s

   found 0 vulnerabilities
   ```

3. Create `index.js` with three lines:

   ```js
   import dayjs from 'dayjs';

   console.log('Today is', dayjs().format('DD/MM/YYYY'));
   ```

4. Run it:

   ```powershell
   node index.js
   ```

   ```text
   Today is 21/09/2026
   ```

5. Look around. The folder now has `index.js`, `package.json`, `package-lock.json` and `node_modules/` (with a `dayjs` folder inside). `package.json` gained `"dependencies": { "dayjs": "^1.11.23" }` and `"type": "module"`, and the lock file pins `"version": "1.11.23"` with its `integrity` hash.
6. Prove that `node_modules` is disposable: delete it (`Remove-Item -Recurse node_modules` in PowerShell, `rm -rf node_modules` on macOS), run `node index.js` and watch it fail with `Cannot find package 'dayjs'`, then run `npm install` and it works again.

**The yarn version.** In a second empty folder (install yarn once with `npm install -g yarn`):

```powershell
mkdir hello-yarn
cd hello-yarn
yarn init -y
yarn add dayjs
```

```text
success Saved lockfile.
success Saved 1 new dependency.
info Direct dependencies
└─ dayjs@1.11.23
```

Copy the same `index.js`, add `"type": "module"`, and run `node index.js`. This time the lock file is `yarn.lock` instead of `package-lock.json`: same idea, different format. Delete both practice folders when you are done.

---

## 8. Common errors and what they mean

Most install problems fall into a handful of patterns. Read the **first** error line, not the last one.

| You see | What it means | What to do |
|---|---|---|
| `'npm' is not recognized as an internal or external command` (or `The term 'npm' is not recognized` in PowerShell) | Node is missing, or the terminal was opened before installing it | Install Node LTS, then **reopen** the terminal (and VS Code) |
| `npm.ps1 cannot be loaded because running scripts is disabled on this system` | Windows PowerShell blocks script files by default | Run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, then reopen PowerShell |
| `Cannot find module 'express'` / `Cannot find package 'dayjs'` | The package is not in `node_modules`: not installed yet, or wrong folder | `cd` into the folder with the `package.json` (e.g. `server/`), then `npm install` |
| `npm error code ERESOLVE` … `unable to resolve dependency tree` | Two packages need incompatible versions of a shared **peer dependency** (e.g. a plugin built for React 18 in a React 19 project) | Upgrade or replace the plugin; `--legacy-peer-deps` is a last resort, not a fix |
| `EACCES: permission denied` (macOS/Linux), `EPERM` (Windows) | No right to write that folder, or a file is locked by a running server, editor or antivirus | Don't use `sudo npm`; stop servers, close the editor, retry |
| `gyp ERR!` while installing `better-sqlite3`, or `was compiled against a different Node.js version` | A **native** (C++) package: npm fetches a prebuilt binary for your exact Node version; if none exists it tries to compile, which needs build tools | Use an LTS Node (22 or 24), delete `node_modules`, reinstall |

For a BA or tester: paste the exact error text into the bug report together with `node -v` and `npm -v`. That often lets a developer answer in one message.

---

## 9. Security basics and the BA corner

Installing a package means running a stranger's code with your permissions. Three habits keep that safe:

- **Beware typosquatting.** Attackers publish packages with names one letter away from popular ones (`expresss`, `reakt`). In 2017 a fake `crossenv` (the real one is `cross-env`) stole environment variables, including secrets, from everyone who installed it. Copy package names from official documentation, not from memory.
- **Prefer well-known, maintained packages.** Before adding one, check its npm page: weekly downloads, last publish date, licence. A package with 40 downloads a week, untouched for years, is a risk however handy it looks.
- **Run `npm audit`.** It checks your installed versions against a database of known vulnerabilities. `npm audit fix` applies safe upgrades; `npm audit fix --force` may jump MAJOR versions and break the app, so it needs testing.

> **BA corner:** "Just upgrade the library" is never free. A MAJOR upgrade (Express 4 → 5, React 18 → 19) can change behaviour the users rely on, so treat it as a **story with risk**: its own ticket, a regression test pass, and acceptance criteria such as "sign-up, login, logout and every to-do action behave exactly as before". Even MINOR upgrades deserve a smoke test. Second, **licences are a business matter**: every package carries one (the lock file even records `"license": "MIT"`). MIT, ISC and Apache-2.0 are permissive; GPL-style licences can oblige a company to publish its own source code. In enterprise or client projects, ask early whether there is an approved-licence list and add "no new dependency with a non-approved licence" to the definition of done.

---

## 10. Summary

Node.js runs JavaScript outside the browser: it runs our Express backend and the tools that build our React frontend. Packages are reusable ingredients downloaded from the npm registry by a package manager (npm, yarn or pnpm). `package.json` lists what a project needs and how to run it; the lock file records exactly what was installed; `node_modules` is a disposable, never-committed copy of it all.

You can now:

- [ ] Check your environment with `node -v` and `npm -v` and explain what LTS means
- [ ] Read a `package.json` and tell `dependencies` from `devDependencies`
- [ ] Explain why `^5.1.0` may install 5.2.1 but never 6.0.0
- [ ] Explain why the lock file is committed and `node_modules` is not
- [ ] Run project scripts with `npm run dev`, `npm start` or `yarn dev`
- [ ] Recognise the common install errors and attach useful details to a bug report
- [ ] Treat a library upgrade and a new dependency as work with risk, licence and test impact

**Next:** fs-03 installs and runs the whole to-do app on your own machine, using exactly these commands.
