# Chrome DevTools (3): Cookies, localStorage & End-to-End Testing

## 1. The Application panel and the three kinds of browser storage

In fs-09 you inspected the page and in fs-10 you watched requests travel. The last piece is what the browser **keeps** between requests. That lives in the **Application** panel.

1. Start both servers (fs-03), open **http://localhost:5173** and log in.
2. Open DevTools with **F12** or **Ctrl + Shift + I** (macOS: **Cmd + Option + I**).
3. Click the **Application** tab. If you cannot see it, it is hidden behind the **»** overflow arrow next to the other tabs.

The left sidebar is a tree. Labels move a little between Chrome versions, but the shape is stable:

```text
Application
  Manifest, Service workers      (for installable apps; empty here)
  Storage                        usage summary + the "Clear site data" button
Storage
  Local storage
    http://localhost:5173        todo:lastEmail, todo:filter
  Session storage
    http://localhost:5173        (empty: the app does not use it)
  IndexedDB                      (empty: a database inside the browser)
  Cookies
    http://localhost:5173        token
  Cache storage, ...             (advanced; ignore for now)
Background services, Frames      (ignore for now)
```

**IndexedDB** is a real database inside the browser, used by offline apps such as web email clients. Our app does not use it, so it stays empty. Three kinds of storage matter for us, and each has different rules:

| | Cookie | localStorage | sessionStorage |
|---|---|---|---|
| Typical size limit | about 4 KB per cookie | about 5 MB per origin | about 5 MB per origin |
| Sent to the server automatically? | **Yes**, with every matching request | No | No |
| Readable by page JavaScript? | Yes, **unless HttpOnly** | Yes | Yes |
| Lifetime | Until `Expires` / `Max-Age` (or browser close) | Until deleted | Until the **tab** is closed |
| Scope | Domain + path (the port is **ignored**) | Origin (scheme + host + port) | Origin **and one tab** |
| Who usually writes it | The server, with `Set-Cookie` | Page JavaScript | Page JavaScript |
| In our app | `token` (the login session) | `todo:lastEmail`, `todo:filter` | not used |

An **origin** is the scheme, host and port together: `http://localhost:5173` and `http://localhost:4000` are two different origins.

**So what for a BA?** When a requirement says "remember X", the first design question is *where*. A choice the user makes on one laptop (a filter) is browser storage; anything that must follow the user to another device belongs in the database.

---

## 2. The `token` cookie up close

Click **Cookies → http://localhost:5173**. After a login you see one row:

| Column | What you see | What it means |
|---|---|---|
| Name | `token` | The name set in `server/src/auth-token.js` |
| Value | `eyJhbGciOiJIUzI1NiIs...` | The signed JWT. Every JWT starts with `eyJ` |
| Domain | `localhost` | Sent to this host only |
| Path | `/` | Sent for every path on the site |
| Expires / Max-Age | a date about 7 days from now | `maxAge: SEVEN_DAYS_MS` |
| HttpOnly | ✓ | Page JavaScript cannot read it |
| Secure | (empty) | Only switched on in production, over HTTPS |
| SameSite | `Lax` | Not sent on cross-site POSTs |

There are a few more columns (Size, Priority, partition information) you can ignore. Click the row and the full value appears in a pane at the bottom.

These columns come straight from the options object on the server:

```js
// server/src/auth-token.js
export const COOKIE_OPTIONS = {
  httpOnly: true, // page JavaScript cannot read it, so an XSS bug cannot steal it
  sameSite: 'lax', // not sent on cross-site POSTs: basic CSRF protection
  secure: process.env.NODE_ENV === 'production', // HTTPS-only once deployed
  maxAge: SEVEN_DAYS_MS,
};
```

**Prove that HttpOnly works.** Open the **Console** tab and type:

```js
document.cookie
// ''
```

An empty string: the page cannot see `token`, even though the browser sends it on every request. DevTools can show it because DevTools is a privileged tool, not page code. This is exactly the point: if an attacker ever manages to run a script on the page (an **XSS** bug, cross-site scripting), that script cannot read the token either.

**Why does the cookie appear under localhost:5173 and not 4000?** Because the browser never talked to port 4000. The login response came back from `localhost:5173`; Vite's proxy fetched it from Express behind the scenes. As far as Chrome knows, the whole app is one site. One detail surprises people: cookies ignore the port, so the same cookie would also be sent if you opened `http://localhost:4000/api/auth/me` directly in a tab. localStorage does not work like that, as section 4 shows.

**So what for a BA?** "The session lasts 7 days", "the token is not readable by scripts" and "it is only sent over HTTPS in production" are three testable non-functional requirements, and this one table row verifies all three.

---

## 3. Five experiments that test the authentication rules

Keep the **Network** tab open in a second DevTools tab (or dock), so you can see the evidence for each step. Before each experiment, log in again if needed.

**Experiment 1: delete the cookie, then add a to-do.**

1. In **Cookies**, select the `token` row and press **Delete** (or click the ✕ "Delete selected" button).
2. The to-do list is still on screen: React keeps it in memory. Nothing has asked the server yet.
3. Type "Test" and click **Add**.
4. Network shows `POST /api/todos` with status **401** and the response `{"error":"Please log in first."}`.
5. The app returns to the login screen, because `handleError` calls `onSessionExpired()` on any 401. The to-do was not saved.

**Experiment 2: edit the cookie value to garbage.**

1. Log in again. In **Cookies**, double-click the Value cell of `token`, type `garbage` and press **Enter**.
2. Tick any to-do. Network shows `PATCH /api/todos/<id>` with **401** and `{"error":"Your session has expired. Please log in again."}`.
3. Back to the login screen.

Two different messages come from two different checks in `requireAuth`: no cookie at all, or a cookie whose signature `verifyToken` rejects. A forged, damaged or expired token all end in the second message.

**Experiment 3: refresh while logged in.**

1. Log in and press **F5**.
2. Network shows `GET /api/auth/me` → **200** with `{"user":{...}}`, then `GET /api/todos` → **200**.
3. You are still logged in. The React state was wiped by the refresh, but the cookie survived, and `App.jsx` asks the server "who am I?" on every page load. In development you may see each request twice: React's StrictMode runs effects twice on purpose. It is not a bug.

**Experiment 4: log out.**

1. Click **Log out**. Network shows `POST /api/auth/logout` → **204**.
2. Click that request and look at **Response Headers**: `Set-Cookie: token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`. A date in the past is how a server tells the browser to delete a cookie.
3. In **Cookies**, `token` is gone (click the refresh icon above the table if the view is stale). Note that **Local storage still holds `todo:lastEmail`**, so the login form is pre-filled.

**Experiment 5: Clear site data.**

1. Log in, pick the **done** filter, then click **Application → Storage** in the sidebar.
2. Click **Clear site data** (the checkboxes below it let you choose categories; keep the defaults).
3. Refresh the page. You are logged out, the email field is empty and, after you log in, the filter is back to **all**. The cookie and localStorage were both wiped. Your to-dos are still there, because they live in `todo.db` on the server, not in the browser.

> **BA corner:** each experiment is an acceptance criterion in disguise. "Given my session cookie is missing, when I add a to-do, then I am returned to the login screen and nothing is saved." Writing the unhappy path this precisely is what lets a tester sign it off in two minutes, with a 401 screenshot as evidence.

---

## 4. localStorage: the app's two preferences

Click **Local storage → http://localhost:5173**. You see a key/value table:

| Key | Value | Written by |
|---|---|---|
| `todo:lastEmail` | `lan@mail.com` | `AuthForm.jsx`, after a successful login or sign-up |
| `todo:filter` | `active` | `TodoPage.jsx`, whenever you click a filter chip |

`todo:filter` does not exist until you click a filter for the first time. Try these:

1. **Watch it update.** Click **all**, **active**, **done** in the app. The value changes each time (click the refresh icon if the view lags).
2. **Edit it by hand.** Double-click the value, type `done`, press **Enter**, then refresh the page. The app opens with the **done** filter selected: it read your value on start-up.
3. **Break it on purpose.** Set the value to `urgent` and refresh. The app shows **all**, because `readFilter` only accepts the three known values:

```js
// client/src/components/TodoPage.jsx
function readFilter() {
  try {
    const saved = localStorage.getItem(FILTER_KEY);

    return FILTERS.includes(saved) ? saved : 'all';
  } catch {
    return 'all';
  }
}
```

Browser storage can be edited by anyone who owns the browser, so good code never trusts it blindly. `urgent` stays in storage until you click a chip, but it can no longer break the screen.

The same operations work from the **Console** (the origin must be the app's tab):

```js
localStorage.getItem('todo:filter')        // 'done'
localStorage.setItem('todo:filter', 'active')
localStorage.removeItem('todo:lastEmail')
localStorage.clear()                       // removes every key for this origin
```

Values are always **strings**: `setItem('n', 5)` stores `'5'`. And because localStorage is per origin, a key saved on `localhost:5173` is invisible on `localhost:4000`, unlike the cookie.

**So what for a BA?** "Remember my last filter" was a requirement, and localStorage is the cheapest way to meet it. But ask the privacy question too: after **Log out**, the last email stays on a shared computer. Is that acceptable for your users? That is a decision, not a technical detail.

---

## 5. sessionStorage, and what must never be stored in the browser

**sessionStorage** has the same API as localStorage, but its data lives only as long as the **tab**. The app does not use it, so try it in the Console:

1. In your app tab: `sessionStorage.setItem('demo', 'hello')`, then `sessionStorage.getItem('demo')` returns `'hello'`.
2. Open a **new tab** at `http://localhost:5173`, open its Console and run `sessionStorage.getItem('demo')`. The result is `null`. Now run `localStorage.getItem('todo:filter')`: the same value as in the first tab.
3. Close the first tab. Its sessionStorage is gone for good. (One exception: **Duplicate tab** copies it.)

Typical uses: a half-filled multi-step form, or a wizard step that should not leak into another tab.

**What must NEVER be stored in localStorage or sessionStorage:**

| Never store | Why |
|---|---|
| Passwords | Anyone with the laptop, or any script, reads them in plain text |
| Login tokens in high-risk apps (banking, health, admin) | Any script running on the page can read and send them away |
| Personal data (ID numbers, addresses, health data) | It stays on the device after logout and may breach privacy law |
| Secrets such as API keys | Everything in the browser is visible to the user |

The rule behind the table: **any JavaScript on the page can read both storages**. That includes your own code, every third-party library, analytics and chat widgets, and any script an attacker injects through an XSS bug. An HttpOnly cookie is the one place page scripts cannot reach, which is exactly why this app keeps the token there and only harmless preferences in localStorage.

**So what for a BA?** Add a "data storage" line to stories that touch personal data: "The session token must not be readable by page scripts" or "No personal data is stored in the browser after logout". Security reviewers look for exactly these sentences.

---

## 6. Testing with two users: privacy and ownership

The most serious bug a to-do app can have is showing one person's data to another. You can test that yourself.

1. **User A** stays in your normal Chrome window, logged in as Lan, with a few to-dos.
2. Open an **Incognito window** (**Ctrl + Shift + N**, macOS **Cmd + Shift + N**) and go to `http://localhost:5173`. Incognito has its own **cookie jar** and its own localStorage, so you arrive logged out. (A second Chrome profile works too; all Incognito windows share one jar with each other.)
3. Sign up as **user B** (Minh) and add one to-do. Each window shows only its own list.
4. In A's window, open Network, click `GET /api/todos` and read the `id` of one of Lan's to-dos in the **Preview** tab, say `1`.
5. In B's window, open the Console and try to change and delete Lan's to-do. (If Chrome refuses to paste, type `allow pasting` and press Enter first; it is a protection against scams.)

```js
const res = await fetch('/api/todos/1', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ done: true }),
});

console.log(res.status, await res.json());
// 404 {error: 'To-do not found.'}

(await fetch('/api/todos/1', { method: 'DELETE' })).status
// 404
```

6. Refresh A's window: Lan's to-do is unchanged.

Why **404** and not 403? Every query filters by the logged-in user, for example `SELECT * FROM todos WHERE id = ? AND user_id = ?`. For Minh, Lan's to-do simply does not exist, so the server does not even confirm that the id is real.

**So what for a BA?** This kind of bug (changing someone else's record by guessing its id) has a name: **IDOR**, insecure direct object reference. It is among the most common API flaws. Always write an acceptance criterion for it, and test it with two browsers, not one.

---

## 7. The complete end-to-end test script

End-to-end (**E2E**) testing means testing the whole chain, from the screen through the API to the database, the way a user would. Run this script after a fresh `npm run db:reset`. For each case, capture the evidence in the last column.

| ID | Scenario | Steps | Expected result | DevTools evidence |
|---|---|---|---|---|
| E2E-01 | Sign up, valid | Name Lan, `lan@mail.com`, password `password123` | List "Hi, Lan", empty | `POST /api/auth/signup` 201; `token` cookie appears |
| E2E-02 | Sign up, duplicate email | Sign up again with `lan@mail.com` | "This email is already registered." | 409 |
| E2E-03 | Duplicate, other letter case | Sign up with `LAN@Mail.com` | Same message | 409 (email is lower-cased) |
| E2E-04 | Short password | Password `1234567` | "Password must be at least 8 characters." | **No** request: the form stops it |
| E2E-05 | Invalid email | Email `lan@mail` | "Email is not valid." | 400 |
| E2E-06 | Missing name | Leave Name empty | "Please enter your name." | No request |
| E2E-07 | Log in, valid | Correct email and password | List appears | `POST /api/auth/login` 200 |
| E2E-08 | Wrong password | Correct email, wrong password | "Email or password is incorrect." | 401 |
| E2E-09 | Unknown email | `nobody@mail.com` | The **same** message as E2E-08 | 401 |
| E2E-10 | Refresh keeps session | Log in, press F5 | Still logged in | `GET /api/auth/me` 200 |
| E2E-11 | Cookie deleted | Delete `token`, add a to-do | Login screen, nothing saved | 401 "Please log in first." |
| E2E-12 | Cookie damaged or expired | Edit `token` to `garbage`, tick a to-do | Login screen | 401 "Your session has expired. Please log in again." |
| E2E-13 | Log out | Click Log out, then refresh | Login screen stays | 204; `Set-Cookie` with a 1970 date; no cookie |
| E2E-14 | Back after logout | Log out, press Back, then Forward | No to-do list is shown | No `token` cookie |
| E2E-15 | Add a to-do | Type "Buy milk", click Add | Appears at the top, "1 left" | `POST /api/todos` 201 |
| E2E-16 | Empty title | Click Add with an empty box or only spaces | "Title is required." | 400 |
| E2E-17 | Title of 200 characters | Paste exactly 200 characters | Added | 201 |
| E2E-18 | Title of 201 characters | Paste 201 characters | "Title must be 200 characters or fewer." | 400 |
| E2E-19 | Tick and delete | Tick an item, then delete another | Done style; item gone; counter correct | PATCH 200; DELETE 204 |
| E2E-20 | Filter persists | Choose **done**, refresh | **done** still selected | `todo:filter` = `done` |
| E2E-21 | Isolation between users | Section 6, users A and B | Each sees only their own; B gets 404 on A's id | PATCH/DELETE 404 "To-do not found." |

Tips that make the script repeatable:

- Make a 200-character title in the Console: `'a'.repeat(200)`, then copy the output.
- Tick **Preserve log** in Network, so requests survive the page reload after a login or logout.
- Name screenshots by case ID (`E2E-12-network.png`). A failed case plus its screenshot is already a good bug report.

**So what for a BA?** This table is a UAT script. The "Expected result" column is copied from acceptance criteria, and the "DevTools evidence" column is what turns "it works for me" into proof.

---

## 8. Wrap-up: what you built and where to go next

Over eleven topics you took one real app from a zip file to a full test run:

```text
 React 19 + Vite  (:5173)   screens, state, forms, localStorage
        |  /api proxy
 Express 5 (:4000)          routes, middleware, validation, JWT cookie
        |  SQL
 SQLite  (todo.db)          users, todos, one owner per to-do
```

**You can now:**

- [ ] Install Node.js and run a two-part web app on your own laptop.
- [ ] Read a React component and point to its state, its props and its API call.
- [ ] Read an Express route and name the status codes it can return.
- [ ] Explain how a password is hashed and how a cookie keeps you logged in.
- [ ] Find any request in Network, and any cookie or localStorage key in Application.
- [ ] Write acceptance criteria with exact messages and status codes, and test them yourself.

**Ideas to extend the app, written as user stories:**

| Idea | User story | What it touches |
|---|---|---|
| Edit a title inline | As a user, I want to edit a to-do's title in place so that I can fix a typo without deleting it. | Frontend only: `PATCH /api/todos/:id` already accepts `title` |
| Due dates | As a user, I want to give a to-do a due date so that I can see what is urgent. | New column, API field, UI, sorting |
| Password reset | As a user who forgot my password, I want to reset it by email so that I can get back into my account. | Email sending, a one-time link that expires, a new form |
| Deploy | As the product owner, I want the app on a public HTTPS address so that users can reach it from any device. | Hosting, a real `JWT_SECRET`, the `Secure` cookie flag |

Notice how the first story is much cheaper than it sounds, because the API already supports it. That is the kind of insight this course was for.

**Where to go next on this site:** the **Software Requirements** track, to turn these instincts into a full requirements practice; the **Business Analyst** track, especially *Supporting Testing & UAT* and *Security & Privacy Thinking*; and the **Solutions Architect · DevOps** track, if you want to see how an app like this is containerised, deployed and monitored.

**So what for a BA?** You are not a developer now, and you do not need to be. You are the BA who has seen every box in the diagram work and fail, which makes your requirements sharper and your conversations with developers shorter.

---

## 9. Summary

You finished the last topic of the run. You can now:

- [ ] Navigate the Application panel: Local storage, Session storage, IndexedDB, Cookies, Clear site data.
- [ ] Compare cookies, localStorage and sessionStorage by size, lifetime, scope and who can read them.
- [ ] Read the `token` cookie's columns and prove HttpOnly with `document.cookie`.
- [ ] Explain why the cookie sits under `localhost:5173` (the Vite proxy).
- [ ] Trigger both 401 messages by deleting or damaging the cookie.
- [ ] Read, edit and clear localStorage in the panel and the Console, and explain why `readFilter` validates.
- [ ] Say what must never be stored in browser storage, and why.
- [ ] Test privacy with two users in a normal and an Incognito window, and expect 404 for someone else's to-do.
- [ ] Run a 21-case end-to-end script and collect evidence for each case.

**Next:** this is the end of the "Build a website from scratch" run. Take the IT Fundamentals final test, then continue with the Software Requirements track.
