# Chrome DevTools (2): Testing APIs with the Network Tab

## 1. What the Network tab records

The screen tells you what the app *shows*. The **Network** tab tells you what the app *did*: every request the page sends and every response it gets back, from the HTML page, scripts and images to the API calls our React code makes with `fetch`.

The key rule: **DevTools only records while it is open.** A request that happened before you opened the panel is gone. So either open the Network tab before you click, or reload the page to capture everything from the start.

1. Start the backend and the frontend as in fs-03 (two terminals, `npm run dev` in each).
2. Open **http://localhost:5173** in Chrome.
3. Press **F12** or **Ctrl + Shift + I** (macOS: **Cmd + Option + I**) and click the **Network** tab. If you cannot see it, look behind the `>>` overflow arrow.
4. Press **F5** (macOS: **Cmd + R**) to reload with the panel open.

You will see dozens of rows: in development Vite serves every source file (`main.jsx`, `App.jsx`, `api.js`, React itself) as a separate request. A status bar at the bottom sums it up, for example `42 requests | 1.1 MB transferred`.

Two toolbar buttons matter from day one: the round **record** button (red means recording) and **Clear** (a circle with a line through it), which empties the list so the next action is easy to read.

**So what for a BA?** "The button does nothing" is an opinion. "Clicking Add sends no request at all" or "it sends a request and gets a 500 back" is evidence that tells the team exactly where to look.

---

## 2. Filter to API calls and read the columns

Most rows are files, not API calls. Above the list there is a row of type filters: **All, Fetch/XHR, Doc, CSS, JS, Font, Img, Media, Manifest, Socket (WS), Wasm, Other** (the exact set varies by version). Click **Fetch/XHR** and only the calls made by JavaScript remain. In our app that is everything under `/api`.

The text box next to it narrows things further. Type `api` to match URLs, or use a property filter such as `method:POST` or `status-code:401`. Put a minus in front (`-status-code:200`) to hide matches.

| Column | What it tells you | Example in our app |
|---|---|---|
| **Name** | The last part of the URL; hover to see the full URL | `me`, `todos`, `login`, `5` (for `/api/todos/5`) |
| **Status** | The HTTP status code, or why there was none | `200`, `401`, `(failed)` |
| **Type** | What kind of request it was | `fetch` for every API call |
| **Initiator** | Which code or file started it | `api.js:6` |
| **Size** | Bytes transferred, headers included | a few hundred bytes |
| **Time** | Total time from start to last byte | usually a few ms locally |
| **Waterfall** | A bar showing when the request ran and how long it took | long bars are slow requests |

The Method column (GET, POST, PATCH, DELETE) is hidden by default. Right-click any column header and tick **Method**. Now `todos` as GET (load the list) and `todos` as POST (add one) are no longer confusing.

**So what for a BA?** With Fetch/XHR and Method on, the Network tab becomes a live view of the API contract from fs-01: one row per endpoint call, in the order the user triggered them.

---

## 3. Inspecting one request: Headers, Payload, Response, Timing

Log in with the Network tab open, then click the `login` row. A details pane opens with several tabs.

**Headers → General** is the summary line:

```http
Request URL: http://localhost:5173/api/auth/login
Request Method: POST
Status Code: 200 OK
Referrer Policy: strict-origin-when-cross-origin
```

Notice the port: **5173**, not 4000. The browser only talks to Vite; the proxy that forwards `/api` to Express is invisible from here.

**Response Headers** (excerpt) show what the server sent back. On a successful login or sign-up you will find the cookie being set:

```http
X-Powered-By: Express
Set-Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Max-Age=604800; Path=/; Expires=Mon, 28 Sep 2026 09:15:02 GMT; HttpOnly; SameSite=Lax
Content-Type: application/json; charset=utf-8
```

**Request Headers** show what the browser sent. Click a later request such as `todos` and you will see the browser attaching that cookie automatically. Our code never touches it:

```http
GET /api/todos HTTP/1.1
Host: localhost:5173
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Where the cookie is stored, and what `HttpOnly` means in practice, is the subject of fs-11.

The other tabs:

- **Payload**: the body you sent, parsed (**view source** shows the raw JSON). For login: `{"email":"lan@mail.com","password":"secret123"}`. GET and DELETE requests have no body, so the tab is missing.
- **Preview**: the response JSON as an expandable tree. **Response**: the same body as raw text. A `204` shows "no response data available", which is correct.
- **Timing**: phases such as *Queueing*, *Request sent*, *Waiting for server response* and *Content Download*. Login and sign-up wait noticeably longer than other calls, because hashing a password with bcrypt is deliberately slow.

**So what for a BA?** Each tab answers one question in a bug report: *what did we send* (Payload), *what came back* (Status, Preview), *how long did it take* (Timing).

---

## 4. The whole app, request by request

Here is the exact traffic you should see with the **Fetch/XHR** filter on. The bodies are the real strings from the server code.

| User action | Request | Expected status | Expected body |
|---|---|---|---|
| Open the app, logged out | `GET /api/auth/me` | **401** | `{"error":"Please log in first."}` |
| Open the app, logged in | `GET /api/auth/me` | 200 | `{"user":{"id":1,"name":"Lan","email":"lan@mail.com"}}` |
| Sign up (new email) | `POST /api/auth/signup` | 201 + `Set-Cookie` | `{"user":{...}}` |
| Sign up (same email again) | `POST /api/auth/signup` | 409 | `{"error":"This email is already registered."}` |
| Log in, wrong password | `POST /api/auth/login` | 401 | `{"error":"Email or password is incorrect."}` |
| Log in, correct | `POST /api/auth/login` | 200 + `Set-Cookie` | `{"user":{...}}` |
| List loads after login | `GET /api/todos` | 200 | `{"todos":[...]}` |
| Add "Buy milk" | `POST /api/todos` | 201 | `{"todo":{"id":1,"title":"Buy milk","done":false,"createdAt":"..."}}` |
| Click Add with an empty box | `POST /api/todos` | 400 | `{"error":"Title is required."}` |
| Tick the checkbox | `PATCH /api/todos/1` | 200 | `{"todo":{...,"done":true,...}}` |
| Delete | `DELETE /api/todos/1` | 204 | (empty) |
| Log out | `POST /api/auth/logout` | 204 + `Set-Cookie` that clears `token` | (empty) |
| Click a filter chip | none | none | stored in `localStorage` only |

Walk through it yourself:

1. Log out if needed, open the Network tab, filter **Fetch/XHR**, add the **Method** column.
2. Reload. Sign up, add two to-dos, tick one, delete one, log out.
3. Compare every row with the table. Keep the backend terminal visible: it prints one line per request, such as `POST /api/todos → 201 (3 ms)`.

**Two things that look like bugs but are not:**

- **The first GETs appear twice.** `main.jsx` wraps the app in React `<StrictMode>`, which in development runs every effect twice on purpose to expose mistakes. So you see two `me` rows on load and two `todos` rows after login. A production build sends each once.
- **Red 401 errors in the Console when logged out.** The two `GET /api/auth/me → 401` calls also appear in the Console as `Failed to load resource: the server responded with a status of 401 (Unauthorized)`. Chrome logs every 4xx/5xx response that way. Here the 401 is the designed answer to "am I logged in?" and the app correctly shows the login form. Do not file it.

**So what for a BA?** This table *is* a test script. Paste it into the test plan, add an "Actual" column, and you have API-level acceptance tests that any tester can run.

---

## 5. Reading status codes, and whose bug is it?

| Range | Meaning | In this app | Usually assigned to |
|---|---|---|---|
| **2xx** | It worked | 200 OK, 201 Created, 204 No Content | Nobody, unless the body is wrong |
| **3xx** | Go elsewhere / use your cache | 304 on static files, never on our API | Rarely a bug |
| **4xx** | The request was wrong or not allowed | 400 invalid input, 401 not logged in, 404 not found, 409 conflict | Often expected behaviour. A bug only if a *valid* request gets it (then check the payload) |
| **5xx** | The server broke | 500 `Something went wrong on the server.` | Backend, almost always |

Some Status values are not HTTP codes at all: `(failed)`, `(canceled)` or `(blocked:devtools)` mean no response ever arrived.

One environment trap: if the Express terminal is stopped, Vite's proxy cannot reach port 4000 and the browser gets a 500 with an empty body. The form shows `Request failed (500)` and the Vite terminal logs a proxy error with `ECONNREFUSED`. That is "the backend is not running", not a code bug.

**Is it a frontend or a backend bug?** Follow the request:

```text
Did a request appear in Network when you acted?
 +- No  -> FRONTEND: the click never reached api()
 +- Yes -> Are the method, URL and Payload what the contract says?
           +- No  -> FRONTEND: it sends the wrong thing
           +- Yes -> Are the status and body what the contract says?
                     +- No  -> BACKEND: right question, wrong answer
                     +- Yes -> Does the screen show that answer correctly?
                               +- No  -> FRONTEND: right answer, wrong display
                               +- Yes -> Not a code bug: re-check the requirement
```

In short: no request, or the wrong payload → **FE**. The right payload but the wrong response → **BE**. The right response but the wrong screen → **FE**. Everything matches the contract → question the requirement itself.

**So what for a BA?** This one diagram removes most "FE says BE, BE says FE" ping-pong. Attach the request, its status and its body, and the ticket lands on the right desk the first time.

---

## 6. Testing error states on purpose

On a fast laptop, loading states flash by and failures never happen. The Network toolbar lets you create them:

| Control | What it does |
|---|---|
| **Preserve log** | Keeps rows when the page reloads or navigates, so you can see what happened *before* the reload |
| **Disable cache** | While DevTools is open, always download files fresh (useful after a code change) |
| **Throttling** dropdown | Simulates slow networks: *Fast 4G*, *Slow 4G*, *3G* (older versions: *Fast 3G*, *Slow 3G*), plus **Offline** and custom profiles |
| **Request blocking** | Right-click a row → **Block request URL**, to simulate that one endpoint being down |

**Slow network.** Choose **3G**, then:

1. Log in: the button shows `Please wait…` and is disabled, so it cannot be double-submitted.
2. Reload: `Loading…` appears while `GET /api/auth/me` is in flight, then `Loading…` again in the list while `GET /api/todos` loads.
3. Type a title and click **Add** twice quickly. The Add button is *not* disabled while saving, so you get two `POST /api/todos` rows and two identical to-dos. That is a real finding: a missing requirement ("Add is disabled while saving").

**Offline.** Load the list, then choose **Offline** and click **Add**. The row shows `(failed)` with `net::ERR_INTERNET_DISCONNECTED`, and the app shows the raw browser text `Failed to fetch` in red. It is technically correct and unhelpful to a user, which is exactly the kind of message a BA should specify. The Console may also show Vite complaining that its dev-server connection was lost; ignore that.

**One endpoint down.** Right-click the `todos` row → **Block request URL**, then reload. A drawer tab opens listing the blocked pattern (called *Network request blocking*, or *Request conditions* in the newest versions). The row shows `(blocked:devtools)`, and the app shows `Failed to fetch` and `Nothing here yet.`: an error plus a misleading empty state. Now block `me` instead and reload: the login form appears although your cookie is valid, so an outage looks like a logout. Use a pattern such as `*/api/*` to take the whole API down.

When you finish, set Throttling back to **No throttling** and remove the blocking rules. Chrome shows a warning icon on the Network tab while either is active.

**So what for a BA?** Loading, empty, error and offline states are part of the requirement. Now you can test each one in minutes instead of waiting for a bad Wi-Fi day.

---

## 7. Calling the API yourself from the Console

The UI only sends what it allows. The server must defend itself against anything, because anyone can skip the form. The Console lets you prove it.

**Replay.** Right-click an API row: Chrome may offer **Replay XHR**, which resends exactly the same request. Replaying `POST /api/todos` creates a second, identical to-do.

**Copy and edit.** Right-click → **Copy** → **Copy as fetch**. Paste it into the **Console**, change the `body`, press Enter, and watch a new row appear in Network. Chrome has no built-in "Edit and Resend" (Firefox does); copy-and-edit is the Chrome equivalent. The first time you paste, Chrome may block it with a self-XSS warning and ask you to type `allow pasting`. Only do this with code you understand.

A smaller helper is easier to reuse. Paste this once into the Console on `localhost:5173`. The browser sends your cookie automatically, just like `api.js`:

```js
// Test helper: call our API and print status + body.
async function call(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json();

  console.log(res.status, data);
}
```

Then run checks one by one (the Console allows `await` at the top level):

```js
await call('POST', '/todos', { title: '' });
// 400 {error: 'Title is required.'}
await call('POST', '/todos', { title: 'x'.repeat(201) });
// 400 {error: 'Title must be 200 characters or fewer.'}
await call('PATCH', '/todos/99999', { done: true });
// 404 {error: 'To-do not found.'}
await call('POST', '/auth/signup', { name: 'Test', email: 'test@mail.com', password: '123' });
// 400 {error: 'Password must be at least 8 characters.'}
```

The last one is the important kind: **validation the UI hides.** The form stops short passwords before any request is sent, so you never see the server's rule in normal use. Calling the API directly proves the server enforces it too. Try also `'x'.repeat(200)` (201, the boundary), an email without `@` (`Email is not valid.`), and, after logging out, `await call('GET', '/todos')` (`401 {error: 'Please log in first.'}`).

For another user's data, sign up a second account in an Incognito window, add a to-do, note its id from the Response, then `PATCH` that id from the first account: expect `404 To-do not found.`, never 200.

**cURL.** **Copy as cURL (bash)** works in the macOS Terminal. On Windows use **Copy as cURL (cmd)** in Command Prompt: in Windows PowerShell 5.1, plain `curl` is an alias for `Invoke-WebRequest`. The copied command contains your `token` cookie, so treat it like a password.

**So what for a BA?** Every server rule in the requirements ("title max 200 characters", "password 8+") deserves a check that bypasses the UI. That is how you catch a rule that exists only in the form.

---

## 8. Security peeks and HAR files

A tester does not need to be a security expert to check a few things any user could see:

1. **No secrets in responses.** Open Preview for `signup`, `login` and `me`: the user object has only `id`, `name` and `email`. Press **Ctrl + F** (macOS: **Cmd + F**) with the Network panel focused to search all requests and responses for `password_hash`. Expect zero results.
2. **Same message for unknown email and wrong password.** Try both. Both must return `401` with `Email or password is incorrect.`, so nobody can use the form to discover who has an account. Advanced observation: the Timing tab may show the unknown-email answer arriving faster, because the slow password check is skipped. That is a subtle leak worth mentioning to the developers.
3. **The token only travels in the cookie.** It appears in `Set-Cookie` with `HttpOnly`, never in a response body or a URL.
4. **After logout, the API refuses.** Log out, then `await call('GET', '/todos')` must return 401.

The password is visible in the Payload tab. That is normal: your own browser knows what you typed, and on a real site HTTPS encrypts it on the wire.

**HAR files.** A HAR (HTTP Archive) file is the whole recording saved as JSON, which a developer can load into their own DevTools to see exactly what you saw.

1. Clear the list, tick **Preserve log**, reproduce the bug with as few steps as possible.
2. Click the **Export HAR** download arrow in the Network toolbar (or right-click the list → *Save all as HAR*).
3. Attach the `.har` file to the ticket with the steps. A developer drags it onto their own Network panel to see exactly what you saw.

**Warning:** a HAR contains everything, including cookies, tokens, typed passwords and personal data. Recent Chrome versions export a sanitized HAR by default, which drops the `Cookie`, `Set-Cookie` and `Authorization` headers, but request bodies are still inside. Record with a test account, open the file in a text editor, search for `password` and `token`, and never share a HAR from a real customer session publicly.

**So what for a BA?** These peeks turn security requirements such as "never expose the password hash" and "do not reveal which emails are registered" into checks you can run in two minutes.

---

## 9. BA corner: an API test checklist for this app

> **BA corner:** write acceptance criteria that name the **status code** and the **exact message**, not just "shows an error". "Given an empty title, then the API returns 400 with `Title is required.` and the list is unchanged" can be checked in the Network tab by anyone, and it cannot be argued about.

| # | Check | How | Expected |
|---|---|---|---|
| 1 | Session check on load, logged out | Reload | `GET /api/auth/me` 401 (twice in dev), login form shown |
| 2 | Sign up | Submit a new account | 201, `Set-Cookie: token=…; HttpOnly; SameSite=Lax` |
| 3 | Duplicate email | Sign up again | 409 `This email is already registered.` |
| 4 | Short password, UI bypassed | Console `call('POST', '/auth/signup', …)` | 400 `Password must be at least 8 characters.` |
| 5 | Wrong password vs unknown email | Log in both ways | Both 401 `Email or password is incorrect.` |
| 6 | No password hash leaked | Search Network for `password_hash` | No results |
| 7 | Add, title rules | Empty, 200 and 201 characters | 400, 201, 400 |
| 8 | Tick and delete | Click checkbox, Delete | PATCH 200 `done: true`; DELETE 204 |
| 9 | Someone else's to-do | PATCH another user's id | 404 `To-do not found.` |
| 10 | Protected after logout | Log out, then `GET /api/todos` | 401 `Please log in first.` |
| 11 | Slow network | Throttle to 3G, log in and add | Loading text shown; no duplicate submits |
| 12 | Endpoint down / offline | Block `todos`, or go Offline | Clear error message, no misleading empty list |

Rows 11 and 12 fail today: that is the point. They turn into new user stories.

A good bug report built from the Network tab has **steps**, **expected** (from this table), **actual** (method, URL, status, body) and **evidence** (a screenshot of the row or a sanitized HAR). The checklist is reusable: swap the endpoints and messages and it fits any web app.

---

## 10. Summary

The Network tab turns "it doesn't work" into evidence: which request was sent, what it carried, what came back, and how long it took. You can now:

- [ ] Open the Network tab before acting (or reload) and filter to **Fetch/XHR** with the **Method** column on.
- [ ] Inspect one request: General, Request and Response headers (`Cookie`, `Set-Cookie`), Payload, Preview, Timing.
- [ ] Predict every request and status code in the to-do app, and recognise the StrictMode duplicates and the expected 401 on load as normal.
- [ ] Read 2xx/4xx/5xx and decide whether a bug belongs to the frontend or the backend.
- [ ] Reproduce loading, offline and outage states with throttling, Offline mode and request blocking.
- [ ] Call the API from the Console to verify server validation that the UI hides.
- [ ] Run basic security peeks, and export a sanitized HAR without leaking credentials.
- [ ] Turn all of this into acceptance criteria with exact status codes and messages.

**Next:** fs-11 opens the Application panel to look inside the `token` cookie and `localStorage`, then runs a full end-to-end test of the app.
