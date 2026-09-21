# Authentication: Sign Up, Log In & Log Out

## 1. Authentication vs authorization

Two words that sound alike and get mixed up in every project:

| | Authentication (authN) | Authorization (authZ) |
| --- | --- | --- |
| Question | **Who are you?** | **What may you do?** |
| In the to-do app | Sign up / log in with email + password | You only see and change **your own** to-dos |
| Where in the code | `server/src/routes/auth.js` | `WHERE user_id = ?` in `server/src/routes/todos.js` |
| Failure status | **401 Unauthorized** (we don't know who you are) | 403 Forbidden, or 404 as the sample does |

You met both ideas in *Security Basics*. This topic opens the real code of
[todo-auth-app.zip](/downloads/todo-auth-app.zip) and follows every step of signing up, logging in and logging out.

Authorization in the sample is quiet: every to-do query carries the user id, so asking for somebody else's
to-do simply finds nothing and returns `404 To-do not found.` The app does not even admit the row exists.

**So what for a BA?** Write authN and authZ as separate requirements. "Users can log in" is authN;
"a user can see only their own to-dos" is authZ, and it needs its own acceptance criteria and its own tests
(log in as user B, try user A's to-do id).

---

## 2. HTTP is stateless: how does the server remember you?

HTTP is **stateless**: each request arrives on its own, and the server does not remember the previous one.
After you log in, the next request (`GET /api/todos`) must somehow prove again who you are. There are two
common designs.

| | Server-side session | Token (JWT) |
| --- | --- | --- |
| Where the login state lives | On the server (memory, database, Redis) | Inside the token the browser holds |
| What the browser carries | A random, meaningless ID | A signed, readable piece of data |
| Log out / revoke | Delete the row: instantly dead everywhere | Hard: the token stays valid until it expires |
| Several servers | All need the same session store | Any server with the secret can verify it |
| Typical user | Classic web apps, banking | APIs, mobile apps, small demos |

The sample uses a **JWT stored inside an HttpOnly cookie**. The browser attaches the cookie to every
request automatically, and the server verifies it with `JWT_SECRET` from `.env`. No sessions table is needed.

**So what for a BA?** "Log out of all devices" or "an admin can kick a user out right now" is easy with
server-side sessions and costly with pure JWTs. If the business needs it, say so early.

---

## 3. Sign-up, step by step

When you fill in the form and click **Sign up**, this is the whole journey:

```text
 Browser (React)                 Express server                      SQLite
 ---------------                 --------------                      ------
 POST /api/auth/signup
 { name, email, password } --->  trim name, trim + lowercase email
                                 invalid?  <--- 400 { error }
                                 SELECT id FROM users WHERE email=? --->
                                 exists?   <--- 409 This email is already registered.
                                 bcrypt.hashSync(password, 10)
                                 INSERT INTO users (...)         --->  new row, id 1
                                 signToken(user)  (the JWT)
          <--- 201 Created
               Set-Cookie: token=eyJ...; HttpOnly; SameSite=Lax
               { "user": { "id": 1, "name": "An", "email": "an@example.com" } }
 setUser(user) -> to-do screen
```

The heart of `routes/auth.js` (excerpt):

```js
const email = String(req.body?.email ?? '').trim().toLowerCase();

// The server validates again even though the form already did:
// anyone can skip the form and call the API directly.
if (!name) return res.status(400).json({ error: 'Name is required.' });
if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: 'Email is not valid.' });
if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

if (existing) return res.status(409).json({ error: 'This email is already registered.' });

// Store a one-way hash, never the password itself.
const passwordHash = bcrypt.hashSync(password, 10);
```

Try it:

1. Start the server (`npm run dev` in `server/`) and the client (`npm run dev` in `client/`), open http://localhost:5173.
2. Open DevTools (F12) → **Network**, click **Create an account**, sign up as `an@example.com`.
3. Click the `signup` request: status **201**, and under **Response Headers** a `Set-Cookie` line.
4. Log out, then sign up again with `AN@Example.com`. You get **409** and "This email is already registered."
   because the server lowercased the email before checking.

The server terminal prints one line per request:

```text
POST /api/auth/signup → 201 (86 ms)
POST /api/auth/signup → 409 (0 ms)
```

Notice the 201 took 86 ms and the 409 took 0 ms: the slow part is the bcrypt hash, which the duplicate
case never reaches.

---

## 4. Password hashing: why the database never sees your password

**Never store passwords.** Databases leak, and people reuse passwords, so one leak of plain passwords
opens their email and bank accounts too.

| | Encryption | Hashing |
| --- | --- | --- |
| Direction | Two-way: whoever holds the key can decrypt | One-way: there is no "unhash" |
| Used for | Data you must read back (a file, a card number) | Checking a password without knowing it |

The sample stores only a **bcrypt hash** in `users.password_hash`. A real row from the test run:

```text
$2b$10$XKAMQKDPyQSZ5kvZDbs6UOkn3Pqyw8A9nrz.YmNeonzlyKchl4Bv2
 |   |  |                     |
 |   |  22 chars: the salt    31 chars: the hash itself
 |   cost 10 = 2^10 = 1,024 rounds
 algorithm version (bcrypt)
```

- **Salt**: random bytes mixed in before hashing and stored in the hash string itself. Two users with the
  same password `secret123` got completely different hashes, so an attacker cannot spot shared passwords
  or use a precomputed table.
- **Cost 10**: bcrypt is slow **on purpose** (about 70 ms here). One login does not notice; an attacker
  trying billions of guesses does. Raising the cost by 1 doubles the work.
- **Checking**: at login, `bcrypt.compareSync(password, user.password_hash)` reads the salt out of the
  stored string, hashes the typed password the same way, and compares. `secret123` → true, `Secret123` → false.

See your own hashes (in `server/`, after signing up; the same command works in PowerShell and on macOS):

```bash
node -e "const db = require('better-sqlite3')('todo.db'); console.log(db.prepare('SELECT id, email, password_hash FROM users').all())"
```

**So what for a BA?** "Forgot password → email me my password" is impossible by design and should never
appear in a requirement. The correct story is "reset my password" (section 9).

---

## 5. Log in, and the deliberately vague error

```text
 Browser                          Express server                         SQLite
 POST /api/auth/login
 { email, password }  ------>     trim + lowercase email
                                  SELECT * FROM users WHERE email=?  --->
                                  no user?  or  bcrypt.compareSync false?
                                       <--- 401 Email or password is incorrect.
                                  signToken(user)
          <--- 200 OK, Set-Cookie: token=...  { "user": {...} }
```

```js
// Same message for "no such email" and "wrong password", so nobody can
// use the login form to find out who has an account.
if (!user || !bcrypt.compareSync(password, user.password_hash)) {
  return res.status(401).json({ error: 'Email or password is incorrect.' });
}
```

If the app said "No account with this email", anyone could test a list of emails and learn who uses the
service. That is called **account enumeration**, and it matters for dating, health or HR apps where
merely having an account is private.

Two honest caveats a good tester spots:

- **Timing.** A wrong password took 67 ms (bcrypt ran), an unknown email 1 ms (bcrypt skipped). A patient
  attacker can measure that; production code compares against a dummy hash so both take the same time.
- **The sign-up form still tells.** `409 This email is already registered.` reveals the same fact.
  High-privacy products answer "Check your inbox" in both cases instead.

**So what for a BA?** Specify error messages in the acceptance criteria, word for word, and state which
facts must never leak.

---

## 6. What is inside a JWT?

A JWT is three base64url parts joined by dots: **header.payload.signature**.

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 . eyJzdWIiOjEsImVtYWlsIjoi... . G6SH5hjE7QtIRnRJ0so8...
{"alg":"HS256","typ":"JWT"}            {"sub":1,"email":"an@example.com",   HMAC-SHA256 of the first two
                                        "iat":1790003811,"exp":1790608611}   parts, made with JWT_SECRET
```

| Claim | Meaning | In the sample |
| --- | --- | --- |
| `sub` | subject: who the token is about | the user id |
| `email` | added by `signToken` | the user's email |
| `iat` | issued at (seconds since 1970) | the login moment |
| `exp` | expires at | `iat` + 604,800 s = 7 days (`expiresIn: '7d'`) |

Two facts to remember:

1. **The payload is only encoded, not encrypted.** Anyone holding the token can read it (paste it into
   jwt.io, or decode it in the console). **Never put secrets in a JWT**: no password, no card number.
2. **It cannot be forged without `JWT_SECRET`.** We changed `sub` from 1 to 2 in a copied token and called
   the API: `401 Your session has expired. Please log in again.` Change one character and the signature no
   longer matches. That is why `.env` and its secret must never be committed.

Try it:

1. DevTools → **Application** → **Cookies** → `http://localhost:5173`, copy the value of `token`.
2. Take the middle part (between the two dots), then in the **Console** run:

```js
// Replace the text in quotes with your own middle part
JSON.parse(atob('eyJzdWIiOjEsImVtYWlsIjoiYW5AZXhhbXBsZS5jb20iLCJpYXQiOjE3OTAwMDM4MTEsImV4cCI6MTc5MDYwODYxMX0'))
// → { sub: 1, email: 'an@example.com', iat: 1790003811, exp: 1790608611 }
```

(If your part contains `-` or `_`, replace them with `+` and `/` first: that is the "url" in base64url.)

---

## 7. Cookie attributes, and why the token is not in localStorage

The real header from the sign-up response:

```http
Set-Cookie: token=eyJhbGci...; Max-Age=604800; Path=/; Expires=Mon, 28 Sep 2026 15:16:50 GMT; HttpOnly; SameSite=Lax
```

| Attribute | In the sample | What it blocks |
| --- | --- | --- |
| `HttpOnly` | always on | **XSS token theft**: page JavaScript cannot read the cookie, so an injected script cannot send your token to an attacker |
| `Secure` | only when `NODE_ENV=production` | **Sniffing**: the cookie is sent over HTTPS only, never over plain HTTP on café Wi-Fi. Off on localhost, which has no HTTPS |
| `SameSite=Lax` | always on | **CSRF**: another site cannot make your browser POST to our API with your cookie; the cookie still goes along when you click a normal link to us |
| `Max-Age` / `Expires` | 7 days | Forgotten sessions: the browser deletes the cookie after 7 days |
| `Path=/` | default | Nothing; it makes the cookie go with every path, including `/api` |

Check HttpOnly yourself: in the Console type `document.cookie`. The `token` does not appear, although the
Application tab shows it. The browser still sends it on every `/api` request (look at the **Cookie**
request header in the Network tab), and `api.js` never touches it.

| | HttpOnly cookie | localStorage |
| --- | --- | --- |
| Readable by page JavaScript | No | Yes, by any script on the page |
| Sent to the server | Automatically, on every request | Only if code adds it (e.g. an `Authorization` header) |
| Main risk | CSRF (reduced by SameSite) | XSS steals the token and uses it from anywhere |
| Right for | Login tokens | Harmless preferences |

That is exactly how the sample splits it: the token lives in the cookie, while `localStorage` holds only
`todo:lastEmail` (to pre-fill the login form; the password is never saved) and `todo:filter` (all / active / done).

---

## 8. Staying logged in, protected routes and logging out

**After a refresh**, React starts with `user = null`. `App.jsx` immediately asks the server who you are:

```jsx
// On first load, ask the server "is my cookie still valid?".
// That is what keeps you logged in after a page refresh.
useEffect(() => {
  api('GET', '/auth/me')
    .then((data) => setUser(data.user))
    .catch(() => setUser(null))
    .finally(() => setChecking(false));
}, []);
```

While it waits, the screen shows "Loading…". 200 → the to-do list; 401 → the login form.

**Protected routes**: `requireAuth` runs before every `/api/todos` route and before `/api/auth/me`:

```js
if (!token) return res.status(401).json({ error: 'Please log in first.' });

try {
  const payload = verifyToken(token);
  req.userId = payload.sub;
} catch {
  return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
}
```

No cookie → `Please log in first.` A tampered or expired token → `Your session has expired. Please log in
again.` On the frontend, `TodoPage` treats **any 401** the same way: `handleError` calls `onSessionExpired()`,
`App` sets `user` to `null`, and the login form appears. No message is shown, and whatever you were typing
is lost.

**Logging out** calls `POST /api/auth/logout`; the server answers **204** with an already-expired cookie:

```http
Set-Cookie: token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax
```

The browser deletes the cookie and `App` shows the login form. But this is the stateless trade-off from
section 2: **the server keeps no list of tokens, so it cannot cancel one.** In the test run, a token copied
before logout still returned `200` from `/api/auth/me` afterwards, and would keep working until its `exp`
seven days later. Real apps add a server-side session or deny list, or use a short-lived access token
(e.g. 15 minutes) plus a refresh token that the server can revoke.

**So what for a BA?** "After logout, the old session cannot be used" is a real requirement with a real
cost. Ask the team which one the product needs.

---

## 9. From demo to production: missing pieces and acceptance criteria

The sample leaves these out on purpose. Each one is a user story a BA writes before go-live:

| Missing piece | User story |
| --- | --- |
| Rate limiting / lockout | As the product owner, I want repeated failed logins slowed down or locked, so that nobody can guess passwords at scale. |
| Email verification | As the business, I want new accounts to confirm their email, so that we do not create accounts for addresses people do not own. |
| Password reset | As a user who forgot my password, I want a one-time, short-lived reset link by email, so that I can set a new password safely. |
| MFA | As a security-conscious user, I want a second factor (an authenticator app code), so that a stolen password alone is not enough. |
| OAuth sign-in | As a new user, I want "Sign in with Google", so that I do not have to create another password. |
| Password rules | As the business, I want weak or breached passwords rejected, so that accounts are harder to take over. |
| HTTPS | As any user, I want every page served over HTTPS, so that my password and cookie cannot be sniffed. |

> **BA corner:** Here is a complete acceptance-criteria set for the current sample, ready to hand to QA.
>
> - **Sign-up.** Given no account for `an@example.com`, when I sign up with name "An", that email and an
>   8+ character password, then I see my (empty) to-do list, the response is 201, and a `token` cookie
>   marked HttpOnly is set.
> - Given the email exists in any letter case, when I sign up with it, then I see "This email is already registered." (409).
> - Given a password of 7 characters, when I sign up, then I see "Password must be at least 8 characters." and no account is created.
> - **Log in.** Given a wrong password **or** an unknown email, when I log in, then I see exactly
>   "Email or password is incorrect." (401) in both cases.
> - **Session.** Given I am logged in, when I refresh the page, then I stay on my to-do list.
> - **Log out.** Given I am logged in, when I click Log out, then I see the login form, the `token` cookie is
>   gone, and my email is pre-filled next time.

Edge cases worth a test each (results verified against the sample):

| Case | Expected in the sample |
| --- | --- |
| Duplicate email in different case (`AN@Example.com`) | 409, email is lowercased before the check |
| Spaces around the email | trimmed, works |
| Name of only spaces | 400 `Name is required.` (the form says "Please enter your name.") |
| Password with a trailing space | not trimmed: it is part of the password |
| Password of exactly 8 characters | accepted (201); 7 is rejected |
| Session expires while adding a to-do | 401 → login form, typed text lost, no message |
| Two tabs, log out in one | the other tab keeps showing the list until its next request gets 401 |
| Back button after logout | no to-dos shown; any request returns 401 |

---

## 10. Summary

Authentication answers "who are you?", authorization answers "what may you do?", and they are tested
separately. The sample keeps login state in a signed JWT inside an HttpOnly, SameSite=Lax cookie, stores
passwords only as salted bcrypt hashes, and restores the session with `GET /api/auth/me` on every page load.

You can now:

- [ ] Tell authentication and authorization apart, using the sample's own examples.
- [ ] Compare server-side sessions with JWTs, including why logout cannot revoke a stateless token.
- [ ] Read a bcrypt hash (`$2b$10$` + salt + hash) and explain why identical passwords hash differently.
- [ ] Decode a JWT payload and explain why it is readable but cannot be forged without the secret.
- [ ] Say which attack each cookie attribute blocks, and why tokens do not belong in localStorage.
- [ ] Write acceptance criteria and edge-case tests for sign-up, login and logout, including the missing production features.

Next: **Chrome DevTools (1): Testing the UI with Elements & Console** (fs-09). The three DevTools topics build on everything you made, including this login, so keep your test account handy.
