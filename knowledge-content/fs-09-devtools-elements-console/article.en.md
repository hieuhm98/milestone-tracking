# Chrome DevTools (1): Testing the UI with Elements & Console

## 1. Why DevTools matters for a BA or tester

Every copy of Chrome ships with a full inspection kit called **DevTools**. Developers live in it, but it is just as useful for anyone who tests or accepts a feature. You do not need to write code: most of what you do here is look, click and read.

- **Your bug reports carry evidence.** Instead of "the list looks broken", you attach a screenshot, the exact CSS rule and the red error line from the Console. A developer can often fix the bug without a single follow-up question.
- **You can tell a frontend bug from a backend bug.** If the server returned the right data but the screen shows it wrong, the bug is in the frontend. If the data itself is wrong, it is in the backend. Routing the ticket to the right person saves a day.
- **You can check requirements without asking a developer.** Is the error inside a box with `role="alert"`? Is a done item struck through? Does the layout survive a 320-pixel phone? You can answer these yourself in seconds.

This is the first of three DevTools topics and covers **what the user sees**: Elements, Console, the Device Toolbar, a taste of Sources and a quick accessibility check. **Network** comes in fs-10, and **Application** (cookies, `localStorage`) in fs-11.

Start the to-do app (`npm run dev` in `server/` and in `client/`), open **http://localhost:5173**, log in, add three or four to-dos and tick one.

---

## 2. Opening DevTools and finding your way around

| How | Windows / Linux | macOS |
|---|---|---|
| Open DevTools | **F12** or **Ctrl+Shift+I** | **Cmd+Option+I** |
| Open straight to the Console | **Ctrl+Shift+J** | **Cmd+Option+J** |
| Open on one element | Right-click it → **Inspect** | Same |
| Element picker | **Ctrl+Shift+C** | **Cmd+Shift+C** |

**Docking.** Open the **⋮** menu in the top-right corner of DevTools and pick a **Dock side**: left, bottom, right, or a separate window. Undocking is handy on a laptop, because the page keeps its real width while you test.

**The panel map.** The tabs along the top are called panels:

| Panel | What it is for | Covered in |
|---|---|---|
| **Elements** | The live HTML of the page and the CSS applied to each element | This topic |
| **Console** | Messages, errors and warnings; a prompt to type JavaScript | This topic |
| **Sources** | The code files the page loaded; pause code with breakpoints | This topic (a taste) |
| **Network** | Every request the page sends and every response | fs-10 |
| **Application** | Cookies, `localStorage` and other storage | fs-11 |
| **Lighthouse** | An automated audit: accessibility, performance, best practices, SEO | This topic |

Panels that do not fit hide behind the **»** arrow. The **Command Menu** (**Ctrl+Shift+P**, Cmd+Shift+P) is a search box for every command: type "screenshot" or "dock" and press Enter.

**So what for a BA?** Learn two shortcuts today, **F12** and **Ctrl+Shift+C**. They cover half of your daily use.

---

## 3. Elements: reading the page's structure and styles

Press **Ctrl+Shift+C** and hover over the to-do list. Each element lights up with an overlay showing its tag, class and size. Click one and the **Elements** panel jumps to it. The left side is the **DOM tree**, the HTML the browser shows *right now* (simplified):

```html
<main class="container">
  <section class="card">
    <header class="row"> <h1>Hi, Lan</h1> <button class="secondary">Log out</button> </header>
    <form class="row">
      <input placeholder="What needs doing?" aria-label="New to-do">
      <button type="submit">Add</button>
    </form>
    <div class="row filters">
      <button class="chip active">all</button> <button class="chip">active</button>
      <button class="chip">done</button> <span class="muted">2 left</span>
    </div>
    <ul class="todos">
      <li class=""> <label><input type="checkbox"><span>Buy milk</span></label>
        <button class="link" aria-label="Delete Buy milk">Delete</button> </li>
      <li class="done">…</li>
    </ul>
  </section>
</main>
```

- You see **HTML, not React code**. The `TodoPage` component does not appear as a tag; only the HTML it produced does, and JSX `className` has become `class`.
- The chip says `all` in the tree but **All** on screen. That is not a bug: the rule `.chip { text-transform: capitalize; }` changes how it looks. The Elements panel tells you a requirement like "the chip reads All" is met by CSS.
- A ticked item has `class="done"`. That class is how the styles know to strike it through.

**Styles and Computed.** The right side shows the CSS of the selected element. **Styles** lists every matching rule, most specific first; a declaration with a line through it has been **overridden** by a stronger rule. Select a **Delete** button: the background in `button { background: #2f6feb; }` is crossed out because `button.link { background: none; }` wins. **Computed** shows only the final value of each property. Use it when you want the answer ("what colour is this text, really?"), not the history.

**The box model.** At the top of Computed is a set of nested boxes: **margin**, **border**, **padding** and the **content** size. Hovering over a layer highlights it on the page. Select `section.card` and you read a padding of 24 on each side. When a design says "24 px inside the card", this is where you measure it instead of guessing from a screenshot.

**Search the tree.** With Elements focused, **Ctrl+F** searches by text or CSS selector, for example `.todos li`.

---

## 4. Elements: editing live to mock a change

Everything in Elements is editable and the page updates instantly. Nothing is saved: **a refresh brings the original back**, so it is a safe sandbox.

**Change a text.** Choose the **done** filter with nothing ticked, so the page shows `Nothing here yet.` Double-click that text in the tree, type `No finished to-dos yet.` and press Enter. Screenshot it, and you have a mock-up of new empty-state copy for a stakeholder review.

**Change a colour.** Select the **Add** button. In Styles, find `background: #2f6feb;` in the `button` rule, click the small colour square and pick green. Every button relying on that rule turns green; Log out and the chips keep their colours because `button.secondary` and `.chip` override it. To change only the selected element, type the declaration into the `element.style` block at the top of Styles.

**Force a state.** Hover and focus styles vanish when you move the mouse into DevTools. Click **:hov** in the Styles toolbar and tick **:hover**, **:focus** or **:focus-visible** to freeze the element in that state (or right-click the node → **Force state**).

**Check the error box.** Click **Add** with an empty input. The server answers `Title is required.` and Elements shows:

```html
<p class="error" role="alert">Title is required.</p>
```

`role="alert"` makes screen readers announce the message as soon as it appears. If your acceptance criteria say "errors are announced to assistive technology", this attribute is the evidence.

**Hide or delete.** Select a node and press **H** to hide it, or **Delete** to remove it, to see how the layout looks without it.

React owns this page: when state changes (you tick or add an item) it re-renders and may overwrite your edits. Edit, screenshot, then refresh.

**So what for a BA?** A live edit turns "could we make it a bit bigger?" into a concrete, screenshotted proposal with exact values.

---

## 5. Device Toolbar: testing on phone sizes

Press **Ctrl+Shift+M** (Cmd+Shift+M), or click the phone-and-tablet icon at the top-left of DevTools, to toggle the **Device Toolbar**. The page is now drawn inside a resizable viewport:

1. **Dimensions**: **Responsive** (drag the edges or type a width) or a preset phone or tablet. The presets change between Chrome versions; **Edit…** adds your own.
2. **Rotate** between portrait and landscape with the rotate icon.
3. **Zoom** so a tall phone fits your screen. It only changes the preview.
4. The toolbar's **⋮** menu adds **Show device frame**, **Show media queries** and **Capture screenshot**.

**The 320 px check.** In Responsive mode, type `320` as the width, the narrowest common phone width and a classic place for layouts to break. Does **Add** stay next to the input? Do the three chips and "2 left" fit on one line? Does a long title wrap inside the card? Then try about 400 px, a tablet (768 px) and a desktop width. The card has `max-width: 520px`, so on wide screens it should stay centred.

Device mode simulates touch and a mobile user agent, but not a slow phone or the real mobile browser, so a final check on a real device still belongs before release.

**So what for a BA?** Put widths in your acceptance criteria ("usable from 320 px to 1440 px"). This toolbar is how you test them.

---

## 6. Console: reading errors and asking the page questions

Open the **Console** (**Ctrl+Shift+J**). It shows messages from the page and the browser, and has a prompt (`>`) where you can type.

| Looks like | Level | Meaning |
|---|---|---|
| Red, ✖ icon | Error | Something failed: a crash, a failed request, a React error |
| Yellow, ⚠ icon | Warning | Suspicious or deprecated, but still works |
| Plain | Info / log | Normal messages from the code |
| Hidden by default | Verbose | Debug detail |

The **Default levels** dropdown shows or hides each level, and the **Filter** box keeps only lines containing a word. The link on the right of a message (like `api.js:6`) is the file and line that produced it.

**Not every red line is a bug.** Log out, reload, and you will see two red errors:

```text
Failed to load resource: the server responded with a status of 401 (Unauthorized)
Failed to load resource: the server responded with a status of 401 (Unauthorized)
```

Both come from `GET /api/auth/me`: the app asks "is anyone logged in?" and the server says "no". This is expected behaviour: the app catches it and shows the login form. It appears twice because React's `StrictMode` (in `main.jsx`) deliberately runs start-up effects twice in development. Chrome prints every failed request in red, handled or not; a wrong password produces a similar line while the page correctly shows `Email or password is incorrect.` The test for "bug or not" is simple: **did the user see the right thing?**

**A React warning, explained.** If a developer renders a list without a `key` on each item (say `key={todo.id}` were removed from the `<li>`), React prints:

```text
Each child in a list should have a unique "key" prop.
Check the render method of `TodoPage`.
```

React uses keys to tell list items apart when the list changes; without them, ticking or deleting one item can leave the wrong row with the wrong state. React logs it with `console.error`, so it is **red** although the page still works, and it only appears in the development build. Report it: it is a cheap fix before it becomes a strange bug.

**The Console as a scratchpad.** Type any expression and press Enter:

```js
24 * 2 + 8                                       // a calculator
document.title                                   // 'My To-dos'
document.querySelectorAll('.todos li').length    // to-dos on screen now
document.querySelector('[role="alert"]')         // null = no error box
$0.textContent                                   // text of the element selected in Elements
copy('x'.repeat(201))                            // put 201 characters on the clipboard
```

`$0` always means the element you last selected in Elements. Paste the 201 characters into the input and click **Add**: the red box should say `Title must be 200 characters or fewer.`

**Count versus label.** The list shows only items matching the current filter, while "N left" counts **every** unfinished to-do. With the **active** filter selected the two numbers must match; if they do not, you have a bug and the numbers to prove it.

**Preserve log.** The Console is cleared on reload. Open the Console settings (gear icon) and tick **Preserve log** before reproducing a bug that involves a refresh or a login.

---

## 7. Sources and a quick accessibility check

**Sources: a taste.** Vite serves **source maps** in development, so Sources shows your original files. Press **Ctrl+P** inside Sources, type `TodoPage` and open `TodoPage.jsx`.

1. In `addTodo`, click the line number of `const data = await api('POST', '/todos', { title: newTitle });`. A blue marker appears.
2. Type a to-do and click **Add**. The page freezes with a "Paused in debugger" banner.
3. Hover over `newTitle` to see your text; the **Scope** section lists other values.
4. Press **F8** to resume, then click the marker again to remove it.

Seeing the code pause on *your* click makes "the frontend calls the API here" concrete.

**Lighthouse.** Open the **Lighthouse** panel, keep **Navigation** mode, tick **Accessibility**, choose Mobile or Desktop and click **Analyze page load**. You get a 0–100 score per category and a list of failed checks. Run it in an Incognito window so extensions do not skew it, and ignore Performance on the dev server, which is deliberately unoptimised. On our app it may flag the grey text of done items (`#8c959f` on white) for low contrast: a real question for the designer.

**The Accessibility pane.** In Elements, open the **Accessibility** tab beside Styles. It shows the **role** and **name** a screen reader announces. A **Delete** button's name is `Delete Buy milk` (from `aria-label`); the new to-do input is named `New to-do` although it has no visible label.

**Keyboard-only test.** Click the address bar and press **Tab** repeatedly. Every control should get a visible focus ring in a sensible order: Log out, input, Add, chips, checkboxes, Delete. **Enter** in the input adds; **Space** ticks a checkbox.

---

## 8. A UI test checklist for the to-do app

| # | Check | Expected | How to check in DevTools |
|---|---|---|---|
| 1 | Layout at 320 px, ~400 px, desktop | No sideways scroll; Add next to the input | Device Toolbar → Responsive, type the width |
| 2 | Loading state | "Loading…" before the list | Throttle the network (fs-10) or pause in Sources |
| 3 | Empty state | `Nothing here yet.` | Filter **done** with nothing ticked |
| 4 | Error state | `Title is required.` in a red box | Add with empty input; inspect `p.error[role="alert"]` |
| 5 | Length limit | 201 characters rejected | `copy('x'.repeat(201))`, paste, Add |
| 6 | Long title wraps | Stays inside the card | Paste a long title at 320 px, also one with no spaces |
| 7 | Done style | Struck through and grey | Computed on the `span`: `text-decoration-line: line-through` |
| 8 | Filter chips | Only the selected chip is blue | Watch the `active` class move in Elements |
| 9 | Count label | With **active**, `li` count equals "N left" | `document.querySelectorAll('.todos li').length` |
| 10 | Focus visible | A ring on every control | Tab through; force `:focus-visible` to screenshot |
| 11 | Accessible names | Input and Delete named clearly | Elements → Accessibility tab |
| 12 | Clean Console | No unexpected red lines | **Preserve log** on; the `/auth/me` 401s when logged out are expected |

Row 6 deserves attention. A sentence wraps between words, but an unbroken string (a pasted URL) has nowhere to wrap, and the stylesheet has no rule telling long words to break. On a narrow screen such a title really does push past the card and makes the whole page scroll sideways. The sample keeps this bug on purpose, so you can practise finding and reporting it: the kind of edge case users find in week one.

> **BA corner:** Turn this table into acceptance criteria before development starts. "Given a 200-character title with no spaces, when it is shown at 320 px, then it wraps inside the card" is testable, and tells the developer to add the CSS on day one.

---

## 9. Taking evidence and writing a good UI bug report

**Screenshots.** Open the Command Menu (**Ctrl+Shift+P**) and type "screenshot":

- **Capture screenshot**: the visible part of the page.
- **Capture full size screenshot**: the whole page, including what you would scroll to.
- **Capture node screenshot**: only the element selected in Elements (select `ul.todos` to capture just the list).
- **Capture area screenshot**: drag a rectangle.

The PNG lands in your Downloads folder. In Device mode it has the phone's size, which is what a mobile bug needs.

**Console errors.** Select the error text and press **Ctrl+C**, or right-click the Console and choose **Save as…** for the whole log. Paste it as text, not only as an image, so developers can search for it, and include the file and line link. Some Chrome versions offer an AI helper to explain an error; the original text still goes in the report.

**A UI bug report template:**

```text
Title:    [To-do list] Long title with no spaces overflows the card at 320 px
Env:      http://localhost:5173 (dev), Chrome, Windows 11, Device Toolbar 320 x 640
Steps:    1. Log in  2. Add a to-do of 60 "x" characters  3. Set width to 320
Expected: The title wraps inside the card; no horizontal scrollbar.
Actual:   The title runs past the right edge; the page scrolls sideways.
Evidence: overflow-320.png (node screenshot of ul.todos)
          Console: no errors. Elements: no overflow-wrap rule on the span.
Severity: Minor (cosmetic, but any user can reach it)
```

A good title names the **area**, the **symptom** and the **condition**. Expected and actual should quote exact text or values rather than vague impressions. "Console: no errors" is information too: it points the developer at CSS, not logic. Severity describes how badly the bug hurts users, while priority describes how soon the team will fix it. A cosmetic bug blocks nobody, but it still deserves a ticket.

---

## 10. Summary

The screen is only the surface. DevTools shows the structure, styles and messages underneath, so your findings become precise and reproducible.

You can now:

- [ ] Open DevTools with **F12**, pick an element with **Ctrl+Shift+C** and dock the panel where it suits you.
- [ ] Read the DOM tree, see which rule wins in **Styles** and read the final value in **Computed**.
- [ ] Measure margin and padding with the box model instead of guessing.
- [ ] Edit text and CSS live to mock a change, knowing it disappears on refresh.
- [ ] Force `:hover` or `:focus` and confirm the error box has `role="alert"`.
- [ ] Test the layout at 320 px and other widths with the **Device Toolbar**.
- [ ] Distinguish an expected red line (the 401 from `/auth/me` when logged out) from a genuine defect, and explain the React `key` warning.
- [ ] Use the Console as a scratchpad: `document.title`, `$0`, counting items, `copy()` for long test data.
- [ ] Run Lighthouse, read names in the Accessibility pane and test with the keyboard only.
- [ ] Capture screenshots from the Command Menu and write a bug report a developer can act on immediately.

Practise on any website you use daily: inspect a button, count the items in a list, resize to 320 px. The habit matters more than memorising every shortcut.

**Next:** fs-10 opens the **Network** panel, where you watch each request travel to the server and read the status codes behind most "it doesn't work" reports.
