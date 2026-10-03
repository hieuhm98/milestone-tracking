# Frontend & Backend Architecture

## 1. Overview

Every modern web application is divided into two main parts:

```text
User → [FRONTEND] ←→ [BACKEND] ←→ [DATABASE]
        Browser        Server        Data
```

- **Frontend (FE)**: What the user sees and interacts with
- **Backend (BE)**: Processing logic, security, data storage
- **Database**: Where data is stored long-term

**Analogy:** think of a bank branch. The **frontend** is the front counter: the forms, the queue screen, the friendly teller. The **backend** is the back office, where staff check your identity, apply the bank's rules and approve transactions. The **database** is the vault and the ledger books. Customers only deal with the counter, but nothing real happens until the back office says yes.

Three words you will hear constantly:

- **Server** — a computer that is always on, somewhere in a data centre or the cloud, waiting for requests.
- **Database** — organised long-term storage, like a set of giant spreadsheets (customers, orders, products) that the backend reads and writes.
- **API** — the "counter window" through which the frontend asks the backend for things (section 4).

### The three-layer view

Developers often describe the same picture as three layers:

| Layer | Also called | Holds | Bank analogy |
|---|---|---|---|
| Presentation | UI, frontend | Screens, buttons, forms | The counter |
| Business / logic | Application, backend | The **business rules** | The back office |
| Data | Persistence, database | The stored records | The vault and ledgers |

**Business rules** are the company's rules written as code: "orders over 500,000 VND get free shipping", "only a manager can approve a refund". They belong in the business/logic layer, not on the screen.

---

## 2. What does the Frontend do?

The frontend is the interface layer — it runs **in the user's browser**.

That means the frontend code is downloaded to *your* device and runs there. A phone app plays the same role on mobile.

**FE responsibilities:**
- Displaying the interface (HTML, CSS)
- Handling user interactions (click, input, scroll)
- Client-side form validation
- Calling APIs to fetch / send data
- Managing screen states (loading, error, empty)
- Routing (switching pages without a reload)
- Handling caching, optimizing load speed

### A few of these in plain words

- **Client-side form validation** — instant checks in the browser, like a red "Invalid email" message as you type. It gives fast feedback but is not real protection (see below).
- **Screen states** — every screen that loads data can be in one of four situations, and each needs a design: **Loading** (spinner while waiting), **Success** (the data), **Error** (something failed, with a message and maybe a "Try again" button), and **Empty** (it worked, but there is nothing to show, e.g. "You have no orders yet").
- **Routing without a reload** — in a **Single Page Application (SPA)**, the browser loads the app once. When you go to another page, JavaScript swaps the content on screen and only calls an API for the new data, instead of downloading a whole new page. That is why apps like Gmail feel smooth.

**Typical FE technologies:**
- HTML, CSS, JavaScript
- React / Vue / Angular
- Next.js, Nuxt.js
- Tailwind CSS, Bootstrap

HTML is the structure, CSS the looks, JavaScript the behaviour. React, Vue and Angular are **frameworks**: ready-made toolkits that make building complex screens faster.

**What the FE does NOT do:**
- Handle critical business logic (easily bypassed by users)
- Store sensitive data
- Perform final access authorization

Why? Because everything in the browser is under the user's control. Anyone can open the browser's developer tools, change the page, or skip the screen entirely and send requests directly with tools like **Postman** or **curl**.

> **Common misconception:** "We hid the Delete button for normal users, so they cannot delete." Hiding a button is only cosmetic. If the backend does not also check the user's permission, a curious user can still call the delete API directly.

---

## 3. What does the Backend do?

The backend runs **on the server** — users do not see it and do not interact with it directly.

**Analogy:** the restaurant kitchen. Customers never enter it, but it decides what is actually cooked, checks the stock, and refuses an order that breaks the rules.

**BE responsibilities:**
- Handling business logic
- Authentication & authorization
- Connecting to and querying the database
- Sending emails and notifications
- Integrating with third parties (payment gateway, SMS, AI...)
- Handling file uploads
- Server-side caching
- Logging, monitoring

A few terms:

- **Third party** — an outside company's service the backend talks to, such as a **payment gateway** (VNPay, Stripe) that actually moves the money.
- **Caching** — keeping a ready copy of frequently requested data so the backend does not rebuild it every time.
- **Logging, monitoring** — writing down what happened (logs) and watching health dashboards, so the team can investigate when something breaks.
- **Background jobs** — work that does not wait for a user click. A **cron job** is a task that runs automatically on a schedule, e.g. "every night at 2:00, send overdue-invoice reminders" or "every hour, sync stock with the warehouse".

**Typical BE technologies:**
- Node.js, Python, Java, Go, .NET
- Express, FastAPI, Spring Boot, Laravel
- PostgreSQL, MySQL, MongoDB (database)
- Redis (cache)
- AWS, Google Cloud, Azure (cloud)

You do not need to know these tools, but recognising the names helps you follow a technical meeting.

---

## 4. FE ↔ BE communication via API

The FE and BE talk to each other through an **API** (Application Programming Interface). The most common type is the **REST API**.

**Analogy:** an API is the menu plus the order window between the dining room and the kitchen. The menu lists exactly what you may ask for and how; the window is where orders go in and plates come out. The customer does not need to know how the kitchen works.

```text
FE sends an HTTP Request:
GET  /api/products          → get the product list
POST /api/orders            → create a new order
PUT  /api/orders/123        → update order 123
DELETE /api/orders/123      → delete order 123

BE returns an HTTP Response:
{
  "status": "success",
  "data": { "id": 123, "total": 500000 }
}
```

The word at the start is the **HTTP method** — the verb of the request:

| Method | Meaning | Everyday equivalent |
|---|---|---|
| `GET` | Read data | "Show me the menu" |
| `POST` | Create something new | "Place a new order" |
| `PUT` / `PATCH` | Update something | "Change my order" |
| `DELETE` | Remove something | "Cancel my order" |

The data travels as **JSON**, a simple text format of names and values, as in the response above.

### Status codes: the result in three digits

Every response carries a **status code**: `200` OK, `201` Created, `400` bad request, `401` not logged in, `403` not allowed, `404` the requested resource was not found, `422` the data failed validation, `500` the server broke. When the BE returns `422`, it usually lists which fields are wrong, and the FE should show a specific message next to each field instead of a vague "Something went wrong".

**A complete request:**
1. The user clicks "Place Order"
2. The FE validates the form (is the email formatted correctly? is the quantity > 0?)
3. The FE sends `POST /api/orders` with the JSON data
4. The BE receives the request and checks the authentication token
5. The BE re-validates the data (never trust the FE)
6. The BE checks the inventory in the database
7. The BE creates the order, deducts inventory, and sends a confirmation email
8. The BE returns `{ "orderId": 456, "status": "confirmed" }`
9. The FE receives the response and shows the "Order placed successfully" screen

Notice that validation happens **twice**: on the FE for speed and comfort, on the BE because that is the real protection.

### The API contract

Before building, the FE and BE teams agree on an **API contract**: the exact address, method, request fields and response format of each API. Once it is agreed, both teams can work **in parallel** — the FE can even use fake data shaped like the contract until the real API is ready.

This is also why, when estimating, it matters whether a change is FE, BE or both: it decides which team does the work, what depends on what, and whether the data model must change.

> **Real-life work example:** a user reports "the order total shows 0". The first question is: *is the API response correct?* Open the browser's Network tab and look at the response. If it says `"total": 500000`, the bug is in how the FE displays it. If it says `"total": 0`, the bug is in the BE's processing.

---

## 5. Authentication & Authorization

| Concept | Meaning | Example |
|---|---|---|
| **Authentication** | Verifies *who you are* | Logging in with email/password |
| **Authorization** | Determines *what you are allowed to do* | Only an admin can delete a user |

**Analogy:** at an office building, showing your ID card at reception is **authentication** (proving who you are). Whether your card opens the server room door is **authorization** (what you are allowed to do). You can be fully identified and still not allowed in.

**Login flow:**
1. The user enters their email + password → the FE sends it to the BE
2. The BE checks the database → correct → creates a **JWT token**
3. The BE returns the token to the FE
4. The FE stores the token (localStorage or cookie)
5. On every subsequent request, the FE includes the token in the header
6. The BE verifies the token before processing each request

A **token** works like the wristband you get at an event: after checking your ticket once, staff just look at the wristband. A **JWT** (JSON Web Token) is a common token format, digitally signed by the server so it cannot be forged. The **header** is the hidden "envelope" part of each request where the token travels.

Tokens usually **expire** (after minutes or hours) for safety. That creates real requirements, for example: if a token expires while a user is filling in a long form, what happens to the half-entered data, and how does the user log in again without losing their work?

> **Common misconception:** "Logged in means allowed." Authentication only answers *who*; the BE must still check *what* this person may do on every request.

---

## 6. Common architecture layers

### Monolith
The FE and BE are in the same project. Common for small startups.

```text
[Browser] → [Monolith App: FE + BE + DB]
```

**Analogy:** a family restaurant where one team cooks, serves and does the accounts in one building. Simple and fast to start, but harder to grow.

### Separated FE/BE
The FE is its own app (React), the BE is a separate API. The most common approach today.

```text
[React App]  →  [REST API Server]  →  [Database]
```

The same backend API can then serve the website, the mobile app and partners at once.

### Microservices
The BE is split into many small services. More complex, meant for large systems.

```text
[FE] → [API Gateway] → [User Service]
                     → [Order Service]
                     → [Payment Service]
```

**Analogy:** a food court with separate stalls, each with its own staff and kitchen. If the drinks stall closes, the noodle stall keeps serving. The **API Gateway** is the single entrance that directs each request to the right service.

| | Monolith | Separated FE/BE | Microservices |
|---|---|---|---|
| Size of team | Small | Small to large | Large, many teams |
| Start-up effort | Lowest | Medium | Highest |
| One part fails | Whole app may go down | FE or BE affected | Often only one service |

---

## 7. Development environments

| Environment | Purpose |
|---|---|
| **Local / Dev** | Developers write code and test freely |
| **Staging / UAT** | Acceptance testing, QA and BA testing |
| **Production** | The real environment used by users |

**Analogy:** a theatre. **Local** is an actor rehearsing at home, **Staging** is the full dress rehearsal on the real stage with no audience, **Production** is opening night with paying customers. Staging should be set up as close to Production as possible, so surprises appear at the rehearsal, not on opening night.

Each environment usually has its own address, e.g. `dev.shop.com`, `staging.shop.com` and `shop.com`, and its own database.

Things a BA should keep in mind:
- Never test a new feature directly on Production
- UAT (User Acceptance Testing) always takes place on Staging
- Data on Staging is usually fake data — do not use real customer data

> **Real-life work example:** a bug report should always say *which environment* it happened on. "Checkout fails on Staging with test card 4111..." is actionable; "checkout is broken" makes the team guess.

---

## 8. What does a BA need to understand about FE/BE to work effectively?

### When writing User Stories:
- **FE concerns**: loading state, empty state, error message, responsive breakpoint, form validation message
- **BE concerns**: business rules, permissions, performance SLA, data retention

A **responsive breakpoint** is the screen width at which the layout changes (for example from phone to tablet). A **performance SLA** is an agreed speed target ("search returns within 2 seconds"). **Data retention** is how long data is kept before deletion.

### When splitting tasks:
- FE tasks: UI components, form validation, routing, displaying data
- BE tasks: API endpoints, database schema, business logic, authentication
- Shared tasks: the API contract (define the request/response format first)

### Questions a BA should ask developers:
- "Is this handled by the FE or BE?" → understand who is responsible
- "Does this API already exist or does it need to be created?" → affects the estimate
- "Does this affect other systems?" → dependencies
- "How long does deployment take? Is there downtime?" → affects the release plan

Knowing whether a change is FE or BE matters for estimates: it decides which team does the work, what depends on what, and whether the data model must change. A text change on a button is quick; a change to what the database stores ripples through APIs, screens and reports.

---

## 9. Summary

- A web app = **frontend** (in the browser) + **backend** (on the server) + **database** (long-term data).
- The three layers: presentation, business/logic (holds the business rules), data.
- The FE shows screens, handles clicks, validates for comfort and manages the four states: loading, success, error, empty.
- The BE applies business rules, checks permissions, talks to the database and third parties, and runs scheduled jobs (cron).
- FE and BE talk through an **API**: method + address + JSON, answered with a status code. Agree the **API contract** first.
- **Authentication** = who you are; **authorization** = what you may do. Always enforce both on the BE.
- Architectures: monolith → separated FE/BE → microservices, in growing complexity.
- Test on **Staging**, never on **Production**, with fake data.

### Key terms

| Term | Plain-language meaning |
|---|---|
| Frontend (FE) | The part of the app running on the user's device |
| Backend (BE) | The part running on the server, out of sight |
| Database | Organised long-term storage of the app's data |
| Business rules | The company's rules written as code |
| API | The agreed "order window" between FE and BE |
| HTTP method | The verb of a request: GET, POST, PUT, DELETE |
| Status code | A 3-digit result: 200, 404, 422, 500... |
| API contract | The agreed request/response format of each API |
| SPA | An app that swaps content without reloading the page |
| Token / JWT | A signed "wristband" proving you are logged in |
| Cron job | A task that runs automatically on a schedule |
| Microservices | A backend split into many small independent services |
| Staging / Production | The rehearsal environment / the real one |
