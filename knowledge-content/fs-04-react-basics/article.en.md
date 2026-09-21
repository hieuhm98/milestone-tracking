# Frontend with React: Components, Props & State

## 1. Why a library like React?

In fs-03 you ran the app and watched the to-do list change instantly: tick a box and the item is crossed out, add a to-do and it appears at the top, and the "N left" counter follows along. The page never reloads. This topic explains how the frontend does that, using the real files in `client/src/`.

With plain HTML and JavaScript you change the page **step by step yourself**. Every time the data changes, your code has to find the right elements and patch them:

```js
// Plain JavaScript (illustration, not from the sample)
const li = document.createElement('li');
li.textContent = title;
document.querySelector('.todos').prepend(li);
document.querySelector('#left').textContent = `${remaining} left`; // easy to forget!
```

That works for one button. With ten buttons, three filters and a login screen, somebody forgets one update, and the counter says "3 left" while the list shows two items. That is a classic UI bug.

**React** flips the job around. You describe **what the screen should look like for the current data**, and React works out which parts of the page (the **DOM**, the browser's live tree of elements) actually need to change:

```text
      data (state)                what the screen should be            real page
 todos = [milk, bank]   ──►   <ul><li>milk</li><li>bank</li></ul>   ──►  React patches
 filter = 'all'               <span>2 left</span>                        only what changed
```

A handy way to remember it: **UI = f(data)**. You never write "add an `<li>` now"; you change the data and React redraws the parts that differ.

**So what for a BA?** When a developer says "it's just a state change" or "that component re-renders", they mean this model. It also explains why many UI bugs are really data bugs: the screen faithfully shows the wrong data.

## 2. How a Vite + React app boots

Open `client/` in your editor (VS Code: `code .` inside the folder). Three files start everything, in this order:

```text
 index.html  ──loads──►  src/main.jsx  ──renders──►  <App />
 div#root                createRoot(#root)           picks the screen
```

1. The browser loads `index.html`. Its body is almost empty: one `<div id="root"></div>` and one script tag.
2. The script is `src/main.jsx`, the **entry point**:

```jsx
// Entry point: mount the <App /> component into <div id="root"> in index.html.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

3. `createRoot` hands the empty `div` to React, and `render(<App />)` tells React to draw the `App` component inside it. From then on, React owns everything inside `#root`.

`StrictMode` adds extra checks during development only. One visible side effect: in dev mode you may see requests such as `GET /api/auth/me` twice in the server terminal. That is normal and does not happen in the production build.

**What Vite does.** Browsers do not understand `.jsx` files. **Vite** is the build tool that sits in between:

| Command (in `client/`) | What Vite does |
|---|---|
| `npm run dev` | Starts a **dev server** on port 5173, converts JSX on the fly, forwards `/api` to port 4000 (the proxy in `vite.config.js`) |
| (saving a file) | **Hot reload** (HMR, Hot Module Replacement): the change appears in the browser in a split second, usually without losing what you typed |
| `npm run build` | Bundles and minifies everything into a `dist/` folder of plain HTML, CSS and JS that any web server can host |

Expected output of `npm run build` (numbers and hashes will differ):

```text
vite v7.x.x building for production...
✓ 30 modules transformed.
dist/index.html                   0.40 kB
dist/assets/index-a1b2c3d4.css    1.60 kB
dist/assets/index-e5f6g7h8.js   195.00 kB
✓ built in 900ms
```

**So what for a BA?** "It works on my machine (dev)" and "it works in the build" are two different things. What gets deployed is the `dist/` folder, not your dev server.

## 3. Components and JSX: the screen as a tree

A **component** is a reusable piece of UI written as a JavaScript function that returns what to show. Its name starts with a capital letter. The sample has exactly three:

| Component | File | Job |
|---|---|---|
| `App` | `src/App.jsx` | Checks whether you are logged in and picks a screen |
| `AuthForm` | `src/components/AuthForm.jsx` | The "Log in" / "Create an account" form |
| `TodoPage` | `src/components/TodoPage.jsx` | The logged-in screen: add, tick, delete, filter |

Components nest inside each other, forming a **component tree**:

```text
<App>                    state: user, checking
 ├── checking?  <p>Loading…</p>
 ├── no user?   <AuthForm onLoggedIn />
 └── user?      <TodoPage user onLogout onSessionExpired />
```

And here is the logged-in screen split into boxes, with the class names you will find in `TodoPage.jsx`:

```text
┌─ TodoPage  <section class="card"> ─────────────────┐
│ Hi, An                              [Log out]      │ ◄ header.row
│ [What needs doing?_______________]  [Add]          │ ◄ form.row
│ (error message, only when there is one)            │ ◄ p.error
│ (All) (Active) (Done)    2 left                    │ ◄ div.row.filters
│ ☐ Buy milk                              Delete     │ ◄ ul.todos > li
│ ☑ Call the bank                         Delete     │ ◄ li.done
└────────────────────────────────────────────────────┘
```

The HTML-like code inside the functions is **JSX**: HTML-style tags written inside JavaScript. It looks like HTML with a few rules:

| JSX rule | Example from the sample |
|---|---|
| `className` instead of `class` (because `class` is a JavaScript keyword) | `<section className="card">` |
| `{ }` puts a JavaScript expression into the markup | `<h1>Hi, {user.name}</h1>` |
| A component returns **one** parent element (wrap siblings in a `<div>`, `<section>` or `<>…</>`) | everything in `TodoPage` sits inside `<section>` |
| Every tag must be closed, even empty ones | `<input ... />` |
| Events are camelCase props that take a function | `onClick={onLogout}` |

**So what for a BA?** A component tree is a free checklist for a mockup review: each box is a component, and each component has its own states to specify (see section 9).

## 4. Props: passing data down

**Props** (short for properties) are the inputs of a component, passed from the parent like attributes. Think of a component as a function and props as its **arguments**: `TodoPage(user, onLogout)` in spirit.

In `App.jsx`, the parent passes three props to `TodoPage`:

```jsx
<TodoPage user={user} onLogout={handleLogout} onSessionExpired={() => setUser(null)} />
```

`TodoPage` receives them by name in its first line:

```jsx
export default function TodoPage({ user, onLogout, onSessionExpired }) {
```

and uses them in its JSX:

```jsx
<header className="row">
  <h1>Hi, {user.name}</h1>
  <button type="button" className="secondary" onClick={onLogout}>
    Log out
  </button>
</header>
```

Two kinds of props appear here:

- **Data props**, such as `user`: `TodoPage` only reads them to show "Hi, An". A component never changes its own props.
- **Callback props**, such as `onLogout` and `onSessionExpired`: functions the parent hands down so the child can say "something happened". `TodoPage` does not know how to log out; it just calls `onLogout`, and `App` does the work (`POST /api/auth/logout`, then `setUser(null)`).

The same pattern is used by the login form: `<AuthForm onLoggedIn={setUser} />`. When login succeeds, `AuthForm` calls `onLoggedIn(data.user)`, which sets `user` in `App`, which switches the screen.

```text
            App  (owns user)
   data ↓ user              ↑ events  onLogout(), onLoggedIn(user)
         TodoPage / AuthForm
```

**Data flows down, events flow up.** **So what for a BA?** When a bug says "the name in the header is wrong", a developer looks at where the prop comes from (the parent), not only at the header.

## 5. State and events: making the screen react

**State** is data a component remembers between renders and that can change while the page is open. You create it with the `useState` **hook** (a special React function whose name starts with `use`). Start with a tiny counter (an illustration, not in the sample):

```jsx
import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button type="button" onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}
```

`useState(0)` returns a pair: the current value (`count`, starting at 0) and a **setter** (`setCount`). Each click calls the setter, and here is the cycle that makes React feel "live":

```text
 click ──► setCount(1) ──► React calls Counter() again ──► new JSX "Clicked 1 times" ──► DOM updated
```

That second call of the function is a **re-render**. Rule of thumb: **change state only through the setter**. Assigning `count = 5` directly changes nothing on screen, because React is never told.

Now the real thing. The top of `TodoPage.jsx` declares five pieces of state:

```jsx
const [todos, setTodos] = useState([]);
const [newTitle, setNewTitle] = useState('');
const [filter, setFilter] = useState(readFilter);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
```

| State | Holds |
|---|---|
| `todos` | The list of to-dos |
| `newTitle` | What is typed in the input |
| `filter` | `'all'`, `'active'` or `'done'` (also saved in `localStorage` as `todo:filter`) |
| `loading` | `true` until the list has arrived |
| `error` | The message to show, or `''` |

**Events** connect the user to the setters. The three you meet everywhere:

| Event | Fires when | In `TodoPage.jsx` |
|---|---|---|
| `onClick` | A button is clicked | `onClick={() => changeFilter(f)}` on each filter chip |
| `onChange` | An input's value changes | `onChange={(e) => setNewTitle(e.target.value)}` |
| `onSubmit` | A form is submitted (button or Enter) | `<form className="row" onSubmit={addTodo}>` |

The input is a **controlled input**: its `value={newTitle}` comes from state, and every keystroke updates that state. That is why `setNewTitle('')` after adding a to-do empties the box.

Here is a **simplified first version** of `TodoPage`, written only for learning (it is not a file in the sample). It uses the same state and events, but there is no server yet, so to-dos live in memory and vanish on refresh. Wiring it to the API is the next topic, fs-05.

```jsx
// SIMPLIFIED first version for learning: local state only, no API calls.
import { useState } from 'react';

export default function TodoPage({ user, onLogout }) {
  const [todos, setTodos] = useState([]);
  const [newTitle, setNewTitle] = useState('');

  function addTodo(event) {
    event.preventDefault(); // stop the browser's full-page form submit

    if (!newTitle.trim()) return;

    const todo = { id: Date.now(), title: newTitle.trim(), done: false };
    setTodos([todo, ...todos]); // a NEW array: newest first
    setNewTitle('');
  }

  function toggleTodo(todo) {
    setTodos(todos.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)));
  }

  return (
    <section className="card">
      <h1>Hi, {user.name}</h1>
      <form className="row" onSubmit={addTodo}>
        <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
        <button type="submit">Add</button>
      </form>
      <ul className="todos">
        {todos.map((todo) => (
          <li key={todo.id} className={todo.done ? 'done' : ''}>
            <input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo)} />
            {todo.title}
          </li>
        ))}
      </ul>
      <button type="button" className="secondary" onClick={onLogout}>Log out</button>
    </section>
  );
}
```

Notice that the code never does `todos.push(...)`. It builds a **new array** (`[todo, ...todos]`, `todos.map(...)`) and passes it to the setter. React compares old and new values; if you change the old array in place, React may not notice and the screen does not update.

**So what for a BA?** "State" is the answer to "what does this screen remember, and until when?". Here `todos` is gone on refresh unless it is reloaded from the server; `filter` survives because it is also saved in `localStorage`. That is a requirement question, not only a technical one.

## 6. Lists and conditional rendering

**Rendering a list.** JSX has no `for` loop; you turn an array of data into an array of elements with `.map`. From `TodoPage.jsx`:

```jsx
<ul className="todos">
  {visible.map((todo) => (
    <li key={todo.id} className={todo.done ? 'done' : ''}>
      <label>
        <input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo)} />
        <span>{todo.title}</span>
      </label>
      <button type="button" className="link" onClick={() => deleteTodo(todo)} aria-label={`Delete ${todo.title}`}>
        Delete
      </button>
    </li>
  ))}
</ul>
```

**Why `key={todo.id}`?** When the list re-renders, React matches each new `<li>` with the old one by its `key`, so it can move, add or remove just the rows that changed. The key must be **stable and unique**: the database id is perfect. Using the position in the array (0, 1, 2…) breaks down when you delete or filter, because "row 1" suddenly means a different to-do and React may reuse the wrong row. Forget the key and React prints a warning in the Console: `Each child in a list should have a unique "key" prop.` The filter chips use `key={f}` because `'all'`, `'active'` and `'done'` are unique too.

**Conditional rendering** means showing different JSX depending on the data. The sample uses three forms:

| Form | Meaning | Real code |
|---|---|---|
| Early `return` | Stop here and show only this | `if (checking) return <p className="center">Loading…</p>;` (in `App`) |
| `a ? b : c` | Either this or that | `{user ? <TodoPage … /> : <AuthForm … />}` (in `App`) |
| `a && b` | Show `b` only if `a` is truthy | `{error && <p className="error" role="alert">{error}</p>}` |

`TodoPage` chains two ternaries to pick one of three states for the list area:

```jsx
{loading ? (
  <p className="muted">Loading…</p>
) : visible.length === 0 ? (
  <p className="muted">Nothing here yet.</p>
) : (
  <ul className="todos">…</ul>
)}
```

Read it as: if loading, show "Loading…"; otherwise, if there is nothing to show, show "Nothing here yet."; otherwise show the list.

**So what for a BA?** Every `?` and `&&` in a component is a screen state someone should have specified. Notice that "Nothing here yet." appears both for a brand-new user and for a user whose "Done" filter matches nothing. Is one message right for both? That is exactly the kind of question a BA should raise before build, not after.

## 7. Derived values: don't store what you can compute

Look at what `TodoPage` does **not** keep in state: the filtered list and the "N left" count. They are **calculated on every render** from `todos` and `filter`:

```jsx
const visible = todos.filter((t) => {
  if (filter === 'active') return !t.done;
  if (filter === 'done') return t.done;

  return true;
});
const remaining = todos.filter((t) => !t.done).length;
```

`visible` feeds the list and `remaining` feeds `<span className="muted">{remaining} left</span>`. These are **derived values**: anything you can compute from existing state.

Why not add `const [remaining, setRemaining] = useState(0)`? Because then every action (add, tick, delete, load) must remember to update it too, which is exactly the "counter says 3, list shows 2" bug from section 1. With a derived value, the count **cannot** disagree with the list; it is recalculated from the single source of truth, `todos`.

Note the business rule hidden in this line: "N left" counts **all** unfinished to-dos, whatever filter is selected. On the "Done" filter you may see no items and still "2 left".

**So what for a BA?** Derived values are where business rules live in the UI ("left" means not done; "active" means not done). Write them down in plain words in the requirements, so the developer and the tester implement and check the same rule.

## 8. Hands-on: three safe edits

Start both servers as in fs-03 (`npm run dev` in `server/`, then `npm run dev` in `client/`), open http://localhost:5173 and log in. Keep the browser and your editor side by side. Each edit is saved with **Ctrl + S** (macOS: **Cmd + S**) and appears through hot reload, without refreshing.

1. **Change the heading.** In `client/src/components/TodoPage.jsx`, find `<h1>Hi, {user.name}</h1>` and change it to:

   ```jsx
   <h1>{user.name}'s to-dos</h1>
   ```

   Expected: the heading becomes "An's to-dos" (with your name). Whatever you had typed in the input is still there: hot reload kept the state.

2. **Show the number of done items.** Right under the `remaining` line, add a derived value, then show it next to "N left":

   ```jsx
   const remaining = todos.filter((t) => !t.done).length;
   const doneCount = todos.filter((t) => t.done).length;
   ```

   ```jsx
   <span className="muted">{remaining} left</span>
   <span className="muted">{doneCount} done</span>
   ```

   Expected: "2 left 1 done". Tick a box: both numbers change together, because both are computed from `todos`. (Optional: add a placeholder button `<button type="button" className="secondary" onClick={() => alert('Coming soon')}>Clear done</button>`. It only shows an alert; there is no API for it.)

3. **Change a color.** In `client/src/styles.css`, find the `.chip.active` rule and change its background:

   ```css
   .chip.active {
     background: #1a7f37;
     color: #fff;
   }
   ```

   Expected: the selected filter chip turns green, while the "Add" button stays blue, because it uses the separate `button` rule.

If something breaks, Vite shows a red error overlay in the browser and the terminal prints the file and line. Undo with **Ctrl + Z** and save again, or re-extract the file from [todo-auth-app.zip](/downloads/todo-auth-app.zip).

**React DevTools.** Install the free **React Developer Tools** extension for Chrome or Edge. Press **F12**: two new tabs appear, **Components** and **Profiler**. In **Components**, click `TodoPage` in the tree: the right-hand panel shows its **props** (`user`, `onLogout`, `onSessionExpired`) and its **hooks**, listed in order as `State` values (`todos`, the typed text, the filter…). Type in the input and watch the second `State` change. You can even edit a value there to try a state without clicking through the app.

**So what for a BA?** You just changed a label, a rule and a style in three different places. Now "that's a one-line change" from a developer is something you can picture, and you can check a bug report's claim ("the count is wrong") directly in the Components tab.

## 9. UI states and reuse: what a BA should specify

Section 6 showed that a single screen is really several screens. For every screen or component that loads data, expect at least four states:

| State | In the to-do app | What to specify |
|---|---|---|
| **Loading** | "Loading…" (App and TodoPage) | What shows, and whether buttons are disabled (`Please wait…` on the login button) |
| **Empty** | "Nothing here yet." | The message, and any call to action ("Add your first to-do") |
| **Error** | Red `p.error` box, e.g. `Title is required.` | Exact wording, where it appears, when it disappears |
| **Success** | The list, "Hi, An", "2 left" | The normal view, including long titles and many items |

> **BA corner:** For every screen in a user story, list the loading, empty, error and success states in the acceptance criteria and draw each one in the mockup. Example: "Given I have no to-dos, when the list loads, then I see 'Nothing here yet.'" and "Given the server rejects an empty title, when I click Add, then I see 'Title is required.' in a red box above the filters." Developers will build a `?` or `&&` for each one anyway; if you have not specified it, they will guess, and the tester will have nothing to test against.

**Component reuse means consistency.** The sample styles every button through one `button` rule and every error through `.error`, and `AuthForm` shows errors with the same `p.error` pattern as `TodoPage`. In a real project, a shared `<ErrorMessage>` or `<Button>` component means one fix corrects every screen. When you write requirements, reuse names too: say "the standard error message" or "the same empty state as the Orders list", and a developer can map it to an existing component instead of building a slightly different copy.

**So what for a BA?** Ask in refinement: "Is there already a component for this?" A yes usually means a smaller estimate and fewer UI inconsistencies to test.

## 10. Summary

- React lets you describe what the screen should look like for the current data; it updates the DOM for you (UI = f(data)).
- The app boots from `index.html` (`div#root`) → `main.jsx` (`createRoot(...).render(<App />)`) → `App.jsx`. Vite provides the dev server, hot reload and `npm run build` → `dist/`.
- Components are reusable functions that return JSX; the to-do app is a tree: `App` → `AuthForm` or `TodoPage`.
- Props pass data and callbacks down (`user`, `onLogout`); data flows down, events flow up.
- State from `useState` (`todos`, `newTitle`, `filter`) is changed only through its setter, and each change triggers a re-render.
- `onClick`, `onChange` and `onSubmit` connect the user to state; lists use `.map` with a stable `key={todo.id}`.
- Conditional rendering covers loading, empty (`Nothing here yet.`) and error (`&&`) states, and derived values (`visible`, `remaining`) are computed, not stored.

**You can now:**
- [ ] Point to the file that starts the app and the component that picks the screen
- [ ] Sketch a screen as a component tree and name its props and state
- [ ] Make a small text, logic or style change and see it hot-reload
- [ ] Inspect props and state with React DevTools
- [ ] Write acceptance criteria that cover loading, empty, error and success states

**Next:** fs-05 connects this screen to the backend: forms, `fetch` through `api.js`, and showing the server's error messages.
