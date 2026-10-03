# Software Testing

## 1. What is testing?

**Software Testing** is the process of evaluating software to detect defects (bugs) and ensure it meets requirements.

**Goal**: detect defects early — the sooner you fix them, the cheaper it is.

### An everyday picture

Before a new restaurant opens, the owner invites friends for a "soft opening". They order unusual combinations, ask for the bill split five ways, complain the soup is cold, and try to pay with a card the machine doesn't accept. Every problem found that night is one that real customers will never see. A software tester does the same job for an app: use it the way real people will — including the strange ways — and report what goes wrong before launch.

A **defect** (or **bug**) is any place where the software does not behave as it should: a wrong total, a button that does nothing, a crash, a page that takes 30 seconds to load.

### What testers actually do

A tester (also called **QA**, short for Quality Assurance) typically:

1. **Reads the requirements** and acceptance criteria and asks questions when something is unclear or untestable.
2. **Designs tests**: writes test cases describing what to check and what result to expect.
3. **Prepares test data and environments**: test accounts, sample products, a safe copy of the system.
4. **Executes tests**: runs them by hand or with automation tools, and records pass/fail.
5. **Reports bugs** clearly so developers can reproduce and fix them.
6. **Retests fixes** and runs regression checks before a release.

### Why early matters

**Rule of 10**: the cost of fixing a bug grows exponentially across phases:
- Requirements: 1x
- Design: 10x
- Development: 100x
- Production: 1000x

This is a rule of thumb, not an exact law, but the direction is real. A wrong VAT rate caught while reading the requirements costs one email. The same mistake found after launch means fixing code, retesting, redeploying, correcting thousands of invoices and apologising to customers.

> **Common misconception:** testing cannot prove software has *no* bugs — it can only show that bugs are present. Testing every possible input is impossible, so testers choose the checks that matter most.

---

## 2. Levels of testing

Testing happens at different **levels**, from the smallest piece to the whole system. Think of building a car: you test each bolt and spark plug, then the assembled engine, then the whole car on a test track, and finally the buyer takes a test drive.

### Unit Test
- Tests each **smallest** function/module in isolation.
- Written by developers.
- Fast, run many times.
- Example: testing a function that calculates VAT.

A **function** is a small named piece of code that does one job. "In isolation" means the function is tested alone; anything it depends on (a database, another service) is replaced by a fake stand-in called a **mock**.

### Integration Test
- Tests the **combination** of multiple modules/services.
- Checks the interfaces and data flow between the parts.
- Example: testing whether the order API connects correctly to the database.

An **interface** is the agreed way two parts talk to each other. Each part may work alone yet fail together — for example, one sends a date as "02/10/2026" and the other expects "2026-10-02".

### System Test
- Tests the **entire system** as a single unit.
- End-to-end scenarios.
- Close to the production environment.

Testers treat the system as a **black box**: they use it from the outside like a user, without looking at the code. It usually runs in a **staging** environment — a copy of the real system. **Production** is the live system real users use.

### UAT (User Acceptance Testing)
- Real users or the customer test it.
- Confirms the system meets the business requirements.
- The final step before go-live.

UAT is not a technical test. A BA typically prepares UAT scenarios from the requirements and acceptance criteria, supports users while they test, and logs the issues they find — but the users decide whether they accept the system.

### Regression Test
- After every change, retest everything to ensure nothing that was working is broken.
- Usually automated.

Strictly, regression is a **type** of testing that can be done at any level, but it is so central that it is listed here. Analogy: an electrician fixes your kitchen light, and you check that the bathroom fan still works too.

```text
Unit  →  Integration  →  System  →  UAT  →  Go-live
(parts)  (parts together) (whole app) (real users)
          ↑ regression tests re-run after every change ↑
```

---

## 3. Types of testing

**Levels** say *how big* a piece you test. **Types** say *what quality* you are checking. Any type can be done at several levels.

### Functional vs non-functional

| Group | Question it answers | Examples |
|-------|---------------------|----------|
| **Functional** | Does it do the right thing? | Login works, discount is applied, email is sent |
| **Non-functional** | How well does it do it? | Speed, security, usability, compatibility |

Common non-functional types:

- **Performance / load testing** — does the shop still respond in 2 seconds when 5,000 people shop at once?
- **Security testing** — can someone see another customer's orders by changing a number in the address bar?
- **Usability testing** — can a first-time user find the "checkout" button without help?
- **Compatibility testing** — does it work on Chrome, Safari, an old Android phone, a small screen?
- **Accessibility testing** — can people using a screen reader or keyboard only use it?

### Other terms you will hear

| Term | Meaning |
|------|---------|
| **Black-box** testing | Testing from the outside, using only inputs and outputs, without seeing the code |
| **White-box** testing | Testing with knowledge of the code inside (mostly developers) |
| **Smoke test** | A quick check that the most basic functions work after a new build — "does it even turn on?" |
| **Exploratory testing** | Learning and testing at the same time, without a script, guided by experience and curiosity |
| **Retesting** | Checking that one specific reported bug is now fixed |
| **Regression testing** | Checking that the fix (or any change) did not break something else |

> **Common misconception:** retesting and regression testing are not the same. Retesting asks "is *this* bug gone?"; regression asks "did anything *else* break?"

---

## 4. Test Pyramid

```text
         ┌─────────────┐
         │     E2E     │ ← Few, slow, expensive
         ├─────────────┤
         │ Integration │
         ├─────────────┤
         │  Unit Test  │ ← Many, fast, cheap
         └─────────────┘
```

Principle: many unit tests (fast, cheap) + few E2E tests (slow, expensive).

**E2E** (end-to-end) tests drive the whole app the way a user does — open the browser, log in, add to cart, pay. They give great confidence but are slow (minutes each), break when a button moves, and when they fail they don't tell you *which* part is wrong. Unit tests run in milliseconds and point straight at the broken function.

Analogy: checking a car's brakes on a test bench is quick and precise; taking the whole car on a 100 km road trip to find out the same thing is slow and expensive. You still do the road trip — just less often, for the most critical journeys.

The opposite shape — lots of E2E tests and few unit tests — is called the **ice-cream-cone anti-pattern**: slow, brittle and costly to maintain.

---

## 5. Bug Lifecycle

A bug moves through a series of statuses in a tracking tool such as Jira, from the moment it is reported until it is closed.

```text
New → Assigned → In Progress → Fixed → Testing → Verified → Closed
                                  ↑                ↓
                              Re-opened ←── Failed
```

| Status | Meaning |
|-----------|---------|
| New | The bug was just reported |
| Assigned | Assigned to a developer |
| In Progress | The developer is fixing it |
| Fixed | The developer has fixed it, awaiting verification |
| Testing | QA is retesting |
| Verified | QA has confirmed it is fixed |
| Closed | The bug is closed |
| Re-opened | QA finds the bug still exists → reopen |
| Won't Fix | A decision not to fix it (low impact) |

### Who moves the bug

- The **developer** can move it up to *Fixed*, but does **not** close it. QA must verify the fix first — this is an important quality gate.
- If the retest fails, QA sets it to *Re-opened* and writes a comment explaining what still goes wrong.
- *Won't Fix* is a **business decision**, usually made by the PO or PM, not the developer: the fix costs more than the benefit (few users affected, easy workaround, feature about to be retired).

Other statuses you may meet: **Duplicate** (already reported), **Cannot Reproduce** (the developer could not make it happen), **Not a Bug / Works as Designed** (the software behaves as specified — sometimes this reveals an unclear requirement for the BA to resolve).

---

## 6. Writing a Test Case

A **test case** is a written recipe for one check: what to set up, what to do, and what should happen. Like a recipe, anyone following it should get the same result — so a new tester can run it next year without asking questions.

Test cases come from the **requirements and acceptance criteria**, not from the code. Tests written by reading code only confirm that the code does what it already does; they can never reveal a feature that is missing entirely.

### A complete example

Requirement (user story): *"As a customer, I want to apply a discount code at checkout so that I pay less."* One acceptance criterion: *"Code SAVE10 gives 10% off orders of 200,000 VND or more."*

| Field | Content |
|-------|---------|
| **ID** | TC-CHK-012 |
| **Title** | Valid discount code SAVE10 applies 10% off an eligible order |
| **Requirement** | US-145 "Apply discount code", AC #2 |
| **Preconditions** | Logged in as test user `buyer01`; cart contains 1 × "Desk lamp" at 250,000 VND; code SAVE10 is active |
| **Test data** | Discount code: `SAVE10` |
| **Steps** | 1. Open the cart page. 2. Click "Checkout". 3. Type `SAVE10` in the "Discount code" box. 4. Click "Apply". |
| **Expected result** | Message "Code applied" appears; discount line shows −25,000 VND; total changes from 250,000 to 225,000 VND |
| **Actual result** | *(filled in during execution)* |
| **Status** | Pass / Fail / Blocked |

### Covering more than the "happy path"

The **happy path** is the normal, everything-goes-right scenario. Good testers also write cases for the edges:

- Order of exactly 200,000 VND (the boundary) → discount applies.
- Order of 199,999 VND → message "Minimum order 200,000 VND".
- Code typed in lower case `save10` → per the requirement (ask the BA if unclear!).
- Expired code → message "This code has expired".
- Empty box, then "Apply" → button disabled or a clear message.

> **Common misconception:** a test case is not "check that discounts work". It must have exact steps, exact data and one exact expected result, otherwise two testers will check two different things.

---

## 7. A good Bug Report

When a test fails, the tester writes a **bug report** (also called a defect report or ticket). Its job is to let a developer who has never seen the problem **reproduce** it — make it happen again on their own machine. If it cannot be reproduced, it is very hard to fix.

A bug report needs:
1. **Title**: concise, clearly describing the problem.
2. **Environment**: the environment (browser, OS, version).
3. **Steps to Reproduce**: the steps to reproduce it.
4. **Expected Result**: the expected outcome.
5. **Actual Result**: the actual outcome.
6. **Severity**: the level of severity.
7. **Priority**: the priority for handling it.
8. **Attachment**: screenshot, video, log.

### A complete example

```text
ID:          BUG-2318
Title:       Checkout total not reduced after applying valid code SAVE10
Reporter:    Lan (QA)            Date: 2026-10-02
Environment: Staging, web build 3.4.1
             Chrome 129 on Windows 11; also seen on Safari 18 / macOS 15
Test case:   TC-CHK-012
Preconditions:
  Logged in as buyer01; cart = 1 × "Desk lamp" (250,000 VND)
Steps to reproduce:
  1. Open the cart page and click "Checkout"
  2. Enter SAVE10 in "Discount code"
  3. Click "Apply"
Expected result:
  "Code applied" message; discount −25,000 VND; total 225,000 VND
Actual result:
  "Code applied" message is shown, but no discount line appears
  and the total stays 250,000 VND. Happens 5 out of 5 tries.
Severity:    High (core checkout function gives the wrong amount)
Priority:    High (promotion campaign starts Monday)
Attachments: screenshot-total.png, screen-recording.mp4,
             console-error.txt ("TypeError: discount is undefined")
```

Notice what it does **not** contain: guesses about whose code is wrong or words like "obviously broken again". A bug report evaluates the **product**, never the person.

> **Try it yourself:** practise collecting evidence on any website.
> - **Screenshot:** Windows `Win + Shift + S`; macOS `Cmd + Shift + 4`. **Screen recording:** Windows `Win + Alt + R` (Xbox Game Bar); macOS `Cmd + Shift + 5`.
> - **Browser version:** in Chrome, type `chrome://version` in the address bar — the first line shows the version number.
> - **OS version:** Windows — press `Win + R`, type `winver`, press Enter; macOS — Apple menu → *About This Mac*.
> - **Console errors:** press `F12` (Windows) or `Cmd + Option + I` (macOS), open the **Console** tab. Red lines are errors developers love to see in a bug report. On a healthy page there may be none — that is fine.

---

## 8. Severity vs Priority

| | Severity (Technical severity) | Priority (Handling priority) |
|--|-------------------------------------|--------------------------|
| **Critical** | App crash, data loss | Fix immediately |
| **High** | A core function doesn't work | Fix in this sprint |
| **Medium** | A workaround is available | Fix next sprint |
| **Low** | UI off by a pixel | Fix when there's time |

Severity ≠ Priority. Example: a small bug (low severity) that the CEO just saw → critical priority.

### Two different questions

- **Severity** asks: *how badly is the system broken?* It is a technical judgement, usually set by the tester. A **workaround** is another way for users to get the job done while the bug exists.
- **Priority** asks: *how soon must we fix it?* It is a business decision, usually set or confirmed by the PO or PM.

Analogy: in a hospital, a broken leg is more serious than a cut finger (severity), but a cut finger on the surgeon who operates in ten minutes gets treated first (priority).

### The four combinations

| | Low priority | High priority |
|--|--------------|---------------|
| **High severity** | App crashes, but only for one small customer on a rare configuration | Payment fails for all users |
| **Low severity** | Typo on a page almost nobody visits | Company name misspelled on the homepage |

---

## 9. Manual vs Automated Testing

**Manual testing** means a person clicks through the app and judges the result. **Automated testing** means writing a program (a **test script**) that performs the steps and checks the results by itself, using tools such as Selenium, Playwright or Cypress.

| | Manual | Automated |
|--|--------|-----------|
| **Best for** | Exploratory, UAT, UI/UX | Regression, unit, performance |
| **Initial cost** | Low | High (you must write scripts) |
| **Speed** | Slow | Fast |
| **Accuracy** | Can make mistakes | Consistent |

### Choosing between them

Analogy: a dishwasher is great for the same plates every night (automation for repetitive regression checks), but you taste the sauce yourself (a human judging whether a screen *feels* right).

- **Automate** tests that run often and rarely change: regression suites after every deploy, unit tests on every code commit, performance tests with thousands of simulated users.
- **Keep manual** what needs human judgement or happens once: exploratory testing, usability and look-and-feel, UAT, brand-new features whose design is still changing.

> **Common misconception:** automation does not replace testers. Someone must decide what to test, write and maintain the scripts, and investigate failures. Scripts also only check what they were told to check — a human notices that the page "looks wrong".

---

## 10. Summary

- **Unit Test**: the smallest module, written by developers.
- **Integration Test**: combining modules together.
- **System Test**: the whole system end-to-end, close to production.
- **UAT**: real users confirm it.
- **Regression**: retest after every change.
- **Types** (functional, performance, security, usability…) describe *what quality* you check; **levels** describe *how big* a piece.
- Follow the **test pyramid**: many unit tests, few E2E tests.
- A **test case** has exact preconditions, steps, data and an expected result, and comes from the requirements.
- A good **bug report** = has clear steps to reproduce.
- Only QA closes a bug after verifying the fix; Won't Fix is a business decision.
- **Severity** ≠ **Priority** — distinguish them to prioritize correctly.

### Key terms

| Term | Plain-language meaning |
|------|------------------------|
| Defect / Bug | A place where software doesn't behave as required |
| QA | Quality Assurance — the people and practices that keep quality high |
| Test case | A written recipe for one check, with an expected result |
| Bug report | A ticket that lets a developer reproduce and fix a problem |
| Steps to reproduce | The exact actions that make the bug happen again |
| UAT | Real users confirming the system meets the business need |
| Regression | Something that used to work and is now broken by a change |
| Severity | How badly the system is broken (technical) |
| Priority | How soon it must be fixed (business) |
| Staging / Production | A test copy of the system / the live system real users use |
