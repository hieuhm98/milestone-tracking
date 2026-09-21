# React: Forms & Calling the Backend API

## 1. Forms in React: controlled inputs

This topic follows one login from the keyboard to the server and back, using files from [todo-auth-app.zip](/downloads/todo-auth-app.zip): `AuthForm.jsx`, `api.js`, `App.jsx` and `TodoPage.jsx` in `client/src/`.

In plain HTML, an `<input>` remembers its own text. In React we usually let **state** hold the text, and the input only displays it. This is a **controlled input**. The email field in `AuthForm.jsx`:

```jsx
const [email, setEmail] = useState(readLastEmail);

<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
```

- `value={email}` (state → screen): the box always shows what is in state.
- `onChange` (screen → state): every keystroke copies the new text into state, React re-renders, and the box shows it.

The benefit: the current text is always in a normal variable, ready to validate, send or pre-fill. `useState(readLastEmail)` starts the field with the email saved in `localStorage` under `todo:lastEmail`. Only the email is remembered, never the password.

**So what for a BA?** Because every field lives in state, showing a message the moment a rule is broken or pre-filling a field is cheap to build. A requirement like "remember the last email" costs a few lines.

---

## 2. Submitting: preventDefault and client-side validation

The form has one handler: `<form className="card" onSubmit={handleSubmit} noValidate>`. Enter or the submit button fires it:

```jsx
async function handleSubmit(event) {
  event.preventDefault(); // stop the browser's default full-page form submit
  setError('');

  // Quick checks in the browser give instant feedback.
  // The server checks again: this is for convenience, not security.
  if (isSignup && !name.trim()) return setError('Please enter your name.');
  if (isSignup && password.length < 8) return setError('Password must be at least 8 characters.');
```

**Why `preventDefault()`?** By default a browser submits a form by loading a whole new page, which throws away everything in memory, including React state. The call cancels that, and JavaScript sends the data in the background instead.

**Why `noValidate`?** It switches off the browser's built-in validation bubbles for email fields. That way every message comes from the app in one consistent style.

The two `if` lines are **client-side validation**. They give instant feedback without a trip to the server. But the comment is honest: *convenience, not security*. Anyone can skip the form and call the API directly. So the server repeats every rule and answers `400` with `Name is required.`, `Email is not valid.` or `Password must be at least 8 characters.`

Try it (both servers running, as in fs-03):

1. Open http://localhost:5173, press **F12** and choose the **Console** tab.
2. Paste this and press Enter. It bypasses the form and sends an empty name:

```js
fetch('/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: '', email: 'test@example.com', password: '123' }),
}).then((r) => r.json()).then(console.log);
```

3. The Console prints `{error: 'Name is required.'}` and the backend terminal logs:

```text
POST /api/auth/signup → 400 (2 ms)
```

**So what for a BA?** Write each validation rule once as a business rule and note that the server must enforce it. Testers check both: the message in the form, and the `400` when the API is called directly.

---

## 3. Talking to the backend with fetch

`fetch` is the browser's built-in function for sending an HTTP request. For login it sends method `POST`, URL `/api/auth/login`, the header `Content-Type: application/json` (telling the server the body is JSON) and a body made with `JSON.stringify({ email, password })`. The answer is a response object:

- `response.status`: the number, such as `200` or `401`.
- `response.ok`: `true` for 200–299, otherwise `false`.
- `response.json()`: reads the body and turns the JSON text back into an object.

Careful: the fetch function does not treat an error status such as 401 or 500 as a failure. It only fails when there is no answer at all. Checking `response.ok` is your job. The sample does it once, in `client/src/api.js`, and every component calls this helper. Keeping this logic in one helper means every screen behaves the same way.

```js
export async function api(method, path, body) {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  // 204 No Content has no body to read.
  const data = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.error ?? `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return data;
}
```

1. `` `/api${path}` `` adds the prefix: `api('POST', '/auth/login', …)` calls `/api/auth/login`.
2. The JSON header and `JSON.stringify` are added only when there is a body. A `GET` sends neither.
3. Logout and delete answer `204 No Content`, which has no body, so `.json()` is skipped.
4. `.catch(() => null)` is a safety net. A body that is not valid JSON gives null instead of a crash.
5. Any non-2xx status becomes a thrown `Error`. Its message is the server's own text (such as `Email or password is incorrect.`) or, if there is none, `Request failed (500)`.
6. `error.status = response.status` keeps the number. The status is attached to the error, so the screen can react to a 401 in its own way.
7. On success the caller gets the object, such as `{ user }` or `{ todos }`.

What if someone forgets the `Content-Type` header? The server's JSON middleware only reads bodies that are labelled as JSON. That middleware is `express.json()`, so the body looks empty and signup answers `400 Name is required.` even though a name was typed.

**So what for a BA?** Every error the user sees is either the server's exact text or `Request failed (N)`. When you review error wording, talk to the backend team: that is where the words live.

---

## 4. async/await, try/catch/finally and the submitting flag

A request takes time: milliseconds locally, maybe seconds on a phone. `async`/`await` is the answer. It lets us wait for the reply without freezing the page. `await api(...)` pauses only this function. Meanwhile, the browser keeps scrolling and redrawing. The rest of `handleSubmit`:

```jsx
setSubmitting(true);

try {
  const path = isSignup ? '/auth/signup' : '/auth/login';
  const body = isSignup ? { name, email, password } : { email, password };
  const data = await api('POST', path, body);

  // Remember the email (NOT the password) to pre-fill the form next time.
  localStorage.setItem(LAST_EMAIL_KEY, email);
  onLoggedIn(data.user);
} catch (err) {
  setError(err.message);
} finally {
  setSubmitting(false);
}
```

| Block | Runs when | Here it… |
| --- | --- | --- |
| `try` | first | sends the request; on success saves the email and tells `App` who logged in |
| `catch` | something in `try` threw | shows the message, such as `Email or password is incorrect.` |
| `finally` | always, last | switches `submitting` back off |

The `submitting` flag drives the button: `<button type="submit" disabled={submitting}>`, labelled "Please wait…" while the request is in flight. That gives feedback and prevents double submits. Without `finally`, a failed request would leave the button disabled forever.

Not every form has this guard. The **Add** button in `TodoPage.jsx` is never disabled, so a fast double-click can create the same to-do twice.

**So what for a BA?** "Button disabled while submitting" and "no duplicate on double-click" are two acceptance criteria. Both are testable for every form that creates something: orders, payments, sign-ups.

---

## 5. Loading data on first render: useEffect(…, [])

Some data must load as soon as a screen appears. React's tool for that is `useEffect`; with an empty list `[]` as the second argument it runs once, when the component first appears. `App.jsx` asks "is my cookie still valid?":

```jsx
useEffect(() => {
  api('GET', '/auth/me')
    .then((data) => setUser(data.user))
    .catch(() => setUser(null))
    .finally(() => setChecking(false));
}, []);
```

`.then / .catch / .finally` are the same three ideas as `try / catch / finally`, written as a chain. The browser sends the `token` cookie, the server answers `200 {user}` or `401`, and `App` shows the to-do page or the login form. Until then the page shows `Loading…`. That is what keeps you logged in after a refresh. `TodoPage.jsx` does the same with `api('GET', '/todos')`.

**StrictMode note.** `main.jsx` wraps the app in `<StrictMode>`. In development React runs each effect twice on purpose, to expose cleanup bugs. In DevTools → **Network** you will see **two** `me` requests (and two `todos` requests after login), and the terminal agrees:

```text
GET /api/auth/me → 200 (3 ms)
GET /api/auth/me → 200 (1 ms)
```

That is expected in development and does not happen in a production build. It is not a bug.

**So what for a BA?** "What does the user see while this loads?" is a requirement question. Ask for a loading state, an empty state ("Nothing here yet.") and an error state for every screen that loads data.

---

## 6. UI states of a request and handling errors by status

Every request moves a screen through the same lifecycle:

```text
 idle ──► loading ──┬──► success  (show the data)
                    └──► error    (show a message, or go back to login)

 click "Log in" ─► button disabled, "Please wait…" ─► 200: to-do page
                                                   ─► 401: "Email or password is incorrect."
                                                   ─► no network: "Failed to fetch"
```

Each state is a piece of state: `submitting` or `loading`, `error` for the message, and the data (`user`, `todos`) for success. `TodoPage.jsx` handles errors **by status** in one function:

```jsx
// A 401 means the cookie is missing or expired: send the user back to login.
function handleError(err) {
  if (err.status === 401) return onSessionExpired();

  setError(err.message);
}
```

| Status | Meaning | The user sees |
| --- | --- | --- |
| `401` | Not logged in or session expired | The login form (`onSessionExpired` sets `user` to `null` in `App`) |
| `400` | Invalid input, such as an empty title | `Title is required.` |
| `404` | No such to-do for this user | `To-do not found.` |
| none | Server or network unreachable | `fetch` itself throws, for example `Failed to fetch` |

This is why `api.js` attaches `error.status`: the screen needs the number to choose between "show the text" and "go to login".

**So what for a BA?** Write one acceptance criterion per status. A session that expires while the user is on the list is a scenario testers often forget.

---

## 7. Same origin, CORS and the Vite proxy

`api.js` calls `/api/...`, not `http://localhost:4000/api/...`. That is deliberate.

An **origin** is scheme + host + port. `http://localhost:5173` and `http://localhost:4000` differ in port, so they are different origins. By default a browser does not let a page read responses from another origin; this stops a website you visit from reading data from another site where you are logged in. A server can allow it with **CORS** headers (Cross-Origin Resource Sharing), such as `Access-Control-Allow-Origin`. Without them, the Console shows the error you will meet in real projects:

```text
Access to fetch at 'http://localhost:4000/api/todos' from origin 'http://localhost:5173'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
on the requested resource.
```

Cookies add another hurdle. A cross-origin `fetch` does not send them unless the code sets `credentials: 'include'` and the server answers `Access-Control-Allow-Credentials: true`.

The sample avoids all of this with a proxy. It lives in `client/vite.config.js`:

```js
proxy: {
  '/api': 'http://localhost:4000',
},
```

```text
 Browser ──► http://localhost:5173/api/todos ──► Vite (5173) ──forwards──► Express (4000)
```

The browser only ever talks to port 5173, and Vite quietly forwards each API call to Express. Only paths under `/api` are forwarded. To the browser it is one origin: no CORS check, and the `token` cookie is sent automatically. In the Network tab the URL shows port 5173 even though Express answered. If Express is stopped, the Vite terminal prints a proxy error mentioning `ECONNREFUSED` and the app shows `Request failed (…)`.

**So what for a BA?** "It's a CORS issue" means the browser blocked a call between two origins. The fix is configuration (CORS headers or a proxy), not business logic. In production, serving the frontend and the API under one domain is the usual answer; confirm it in the deployment requirements.

---

## 8. Optimistic vs pessimistic updates

When the user ticks a to-do, the screen can be updated in two ways:

| Style | How | Feels | Risk |
| --- | --- | --- | --- |
| **Pessimistic** (the sample) | Wait for the server, then update | A short delay | Low: the screen never shows what the server refused |
| **Optimistic** | Update at once, undo if the request fails | Instant | The screen can briefly lie; rollback code needed |

In `toggleTodo` the list changes only after the `PATCH` succeeds, using the to-do the server sends back:

```jsx
const data = await api('PATCH', `/todos/${todo.id}`, { done: !todo.done });
setTodos(todos.map((t) => (t.id === todo.id ? data.todo : t)));
```

Because the checkbox is controlled (`checked={todo.done}`), it does not tick until the answer arrives. Locally you never notice; on a slow network you would. An optimistic version (a sketch, **not** in the sample):

```jsx
async function toggleTodoOptimistic(todo) {
  const before = todos;

  setTodos(todos.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)));

  try {
    await api('PATCH', `/todos/${todo.id}`, { done: !todo.done });
  } catch (err) {
    setTodos(before); // undo the change on screen
    handleError(err);
  }
}
```

The choice is a product decision: optimistic for cheap, reversible actions (a like, a checkbox), pessimistic for anything involving money, stock or legal weight.

**So what for a BA?** Specify it. "The checkbox changes immediately and reverts with an error if saving fails" is a different story from "the checkbox changes once it is saved".

---

## 9. BA corner: acceptance criteria for forms and the API contract

> **BA corner:** forms hide many defects because they have many paths besides the happy one. Use the list below as acceptance criteria and verify each item in the Network tab.

1. **Validation:** Given sign-up mode, when the name is empty, then "Please enter your name." appears and **no request** is sent.
2. **Server rule:** Given the API is called directly with a 5-character password, then it answers `400` with `Password must be at least 8 characters.`
3. **Submitting:** When the user clicks "Sign up", the button is disabled and reads "Please wait…" until the answer arrives.
4. **Double-click:** A double-click produces exactly **one** `POST /api/auth/signup`.
5. **Duplicate email:** Given the email already exists, then `409` and `This email is already registered.`
6. **Network failure:** Given the backend is stopped, when the user submits, then an error appears, the button is enabled again and the typed values are kept.
7. **Privacy:** After login the email is pre-filled next time; the password is never stored.

The API contract is the FE–BE handshake. The table in the sample's `README.md` (method, path, body, success, errors) is a contract. The frontend promises to send `{ email, password }` as JSON; the backend promises `200 {user}` or `401` with an `error` message. While both sides keep it, they can be built and tested separately. Your job is to make the contract complete before coding starts: required fields and limits, the success status and body, every error status, whether the login cookie is needed, and the exact message text, because those strings end up on screen.

---

## 10. Summary

You followed one login from the keyboard to the server and back. These ideas apply to almost every web app you will work on.

- Controlled inputs keep every field in state through `value` and `onChange`.
- `preventDefault()` stops the full-page submit so the data goes in the background.
- Client-side validation is a convenience; the server repeats every rule because anyone can call the API directly.
- `api.js` sends JSON, skips the body on `204`, and turns every non-2xx status into an error carrying the status and the server's message.
- `async`/`await` waits without freezing the page, and `finally` always resets the `submitting` flag.
- `useEffect(…, [])` loads data when a screen appears; in development StrictMode runs it twice.
- A `401` sends the user back to login; other errors show the server's message.
- The Vite proxy makes the frontend and the API one origin, so there is no CORS problem and the cookie is sent automatically.

Checklist, you can now:

- [ ] Explain a controlled input and why the form calls `preventDefault()`.
- [ ] Prove from the Console that the server re-checks validation.
- [ ] Predict the message the API helper produces for any status.
- [ ] Explain the duplicate requests you see in development.
- [ ] Recognise a CORS error and explain what the proxy does about it.
- [ ] Write acceptance criteria covering loading, errors, network failure and double-clicks.

**Next:** fs-06 crosses to the other side and builds the Express backend that answers these requests.
